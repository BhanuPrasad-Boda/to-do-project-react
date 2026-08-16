const { runAssistantTool, TOOLS, CONFIRM_TOOLS } = require("./assistantTools");
const { classifyRequest, ROUTE, MODE, GENERAL_MODES } = require("./assistantRouter");
const { addTurn, getSession, setPending, clearSession } = require("./assistantMemory");
const { getAiProvider } = require("./ai/aiProvider");
const { getSearchProvider } = require("./ai/searchProvider");
const { validateAiOutput, DESTRUCTIVE_TOOLS, INTENT_TO_TOOL, SEARCH_TOOL, GENERAL_INTENTS } = require("./ai/aiSchema");
const metrics = require("./ai/aiMetrics");

const READ_TOOLS = new Set([
  "getTasks",
  "searchTasks",
  "getOverdueTasks",
  "getTodayTasks",
  "getUpcomingTasks",
  "getProductivityStats",
  "getDailySummary",
  "getNotifications",
]);

const FALLBACK_TEXT =
  "I'm having trouble understanding that request right now. You can try something like 'create a task for tomorrow at 10 AM'.";

const GENERAL_FALLBACK =
  "I can help with that once the AI service is available. I can still manage your TaskFlow tasks in the meantime.";

const NO_LIVE_DATA =
  "I don't have live web access configured, so I won't guess at current news, prices, weather, or scores.";

function slimTasks(tasks = []) {
  return (tasks || []).slice(0, 16).map((task) => ({
    id: task.Appointment_Id,
    title: task.Title,
    date: task.Date,
    priority: task.Priority,
    completed: Boolean(task.completed),
    status: task.status || null,
  }));
}

function formatDue(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function taskItems(tasks = []) {
  return tasks.slice(0, 6).map((task) => ({
    title: `${task.Title || task.title || ""}${task.Date || task.date ? ` · ${formatDue(task.Date || task.date)}` : ""}`,
  }));
}

function confirmLabels(tool) {
  if (tool === "deleteTask") return { confirmLabel: "Delete task", cancelLabel: "Cancel", variant: "danger", mood: "asking_confirmation" };
  if (tool === "createTask") return { confirmLabel: "Create task", cancelLabel: "Cancel", variant: "primary", mood: "asking_confirmation" };
  if (tool === "createSubtasks") return { confirmLabel: "Create tasks", cancelLabel: "Cancel", variant: "primary", mood: "asking_confirmation" };
  if (tool === "catchUpOverdue" || tool === "rescheduleTask") {
    return { confirmLabel: "Reschedule", cancelLabel: "Not now", variant: "primary", mood: "asking_confirmation" };
  }
  if (tool === "applyPlan") return { confirmLabel: "Apply plan", cancelLabel: "Not now", variant: "primary", mood: "asking_confirmation" };
  return { confirmLabel: "Confirm", cancelLabel: "Cancel", variant: "primary", mood: "asking_confirmation" };
}

function reply({ text, mood = "helping", actions = [], items = [], tool = null, taskId = null, extra = {} }) {
  return {
    ok: true,
    text,
    mood,
    actions,
    items,
    tool,
    taskId,
    ...extra,
  };
}

function smalltalk(text) {
  const q = String(text || "").toLowerCase();
  if (/^(thanks|thank you|thx)\b/.test(q)) {
    return reply({ text: "You're welcome. I'll be here when the next decision comes up.", mood: "happy" });
  }
  if (/^help\b/.test(q)) {
    return reply({
      text: "I can manage your TaskFlow tasks, plan your day, and also answer general questions, explain topics, or help you write something.",
      actions: [
        { id: "plan", label: "Plan my day" },
        { id: "today-tasks", label: "What should I do?" },
        { id: "create", label: "New task" },
      ],
    });
  }
  return reply({
    text: "Hello. I'm TaskFlow AI. Ask me to manage your tasks, or ask a general question — I'll figure out which you mean.",
  });
}

function clarificationFor(classified) {
  if (classified.intent === "delete_task") {
    if (classified.reason === "bulk_delete") {
      return reply({
        text: "I can remove tasks, but I won't delete a whole group at once. Tell me the exact title or task number.",
        mood: "asking_confirmation",
        actions: [{ id: "show-overdue", label: "Show overdue" }],
      });
    }
    return reply({
      text: "I can remove the task, but which task do you mean? Include the title or task number.",
      mood: "asking_confirmation",
    });
  }
  if (classified.intent === "complete_task") {
    return reply({ text: "Which task should I mark complete? Include the title or task number." });
  }
  if (classified.intent === "reschedule_task") {
    return reply({ text: "Tell me which task to move and when — for example, “Move report to Monday”." });
  }
  if (classified.intent === "schedule_reminder") {
    return reply({ text: "When should I remind you? For example, “Remind me 1 hour before”." });
  }
  if (classified.intent === "create_task") {
    return reply({
      text: "Tell me what to add — for example, “Submit the report tomorrow at 5 PM”.",
      actions: [{ id: "create", label: "Create a task" }],
    });
  }
  return reply({ text: "I need a bit more detail before I change anything." });
}

function uiIntentReply(intent) {
  if (intent === "open_notifications") {
    return reply({
      text: "Opening your notifications.",
      actions: [{ id: "show-notifications", label: "Open notifications", variant: "primary" }],
    });
  }
  if (intent === "logout") {
    return reply({
      text: "I can't sign you out from chat. Use Settings to log out.",
      actions: [{ id: "view-tasks", label: "Back to tasks" }],
    });
  }
  return reply({ text: FALLBACK_TEXT });
}

function confirmationReply(tool, payload, text) {
  const labels = confirmLabels(tool);
  return reply({
    text,
    mood: labels.mood,
    tool: {
      name: tool,
      payload,
      needsConfirm: true,
      confirmLabel: labels.confirmLabel,
      cancelLabel: labels.cancelLabel,
    },
    taskId: payload.id || null,
    actions: [
      { id: "confirm-tool", label: labels.confirmLabel, variant: labels.variant },
      { id: "dismiss", label: labels.cancelLabel },
    ],
  });
}

function fromToolResult(result, tool) {
  if (result.ambiguous) {
    return reply({
      text: result.message || "I found more than one match. Which task do you mean?",
      mood: "asking_confirmation",
      items: result.ambiguous.map((task) => ({ title: task.Title })),
    });
  }
  if (result.requiresConfirm) {
    return confirmationReply(tool, {}, result.message);
  }
  if (result.ok === false) {
    return reply({
      text: result.message || "Sorry, I couldn't complete that action. Please try again.",
      mood: "error",
    });
  }
  return reply({
    text: result.message || "Done.",
    mood: "success",
    items: taskItems(result.tasks || (result.task ? [result.task] : [])),
    actions: READ_TOOLS.has(tool)
      ? tool === "getOverdueTasks"
        ? [
            { id: "show-overdue", label: "View tasks" },
            { id: "catch-up", label: "Reschedule", variant: "primary" },
          ]
        : [{ id: "view-tasks", label: "View tasks" }]
      : [{ id: "view-tasks", label: "View tasks" }],
  });
}

async function executeOrConfirm({ user, tool, toolArguments, now, runTool, spoken }) {
  if (!tool || !TOOLS.includes(tool)) {
    return reply({ text: spoken || FALLBACK_TEXT });
  }

  if (CONFIRM_TOOLS.has(tool) || DESTRUCTIVE_TOOLS.has(tool)) {
    if (tool === "deleteTask" && !toolArguments.id && !toolArguments.query) {
      return clarificationFor({ intent: "delete_task" });
    }
    const preview = spoken || "I can do that, but I need your confirmation before I change your tasks.";
    return confirmationReply(tool, toolArguments, preview);
  }

  const result = await runTool(user, tool, toolArguments, now);
  return fromToolResult(result, tool);
}

function buildAiContext(clientContext = {}) {
  return {
    now: clientContext.now || new Date().toISOString(),
    route: clientContext.route || "dashboard",
    selectedTaskId: clientContext.selectedTaskId || null,
    counts: clientContext.counts || {},
    tasks: slimTasks(clientContext.tasks || clientContext.todos || []),
  };
}

async function interpretWithAi({ provider, message, context, history, allowTaskTools = true, mode, searchResults }) {
  const started = Date.now();
  const raw = await provider.interpret({
    message,
    context,
    history,
    allowedTools: TOOLS,
    allowTaskTools,
    mode,
    searchResults,
  });
  metrics.recordAi(Date.now() - started);
  const validated = validateAiOutput(raw, { allowTaskTools });
  if (!validated.ok) {
    const error = new Error("AI_MALFORMED");
    error.reason = validated.reason;
    throw error;
  }
  return validated.value;
}

function noLiveDataReply() {
  return reply({ text: NO_LIVE_DATA, mood: "helping" });
}

async function answerFromSearch({ provider, message, history, now, search, userId, query }) {
  const found = await search.search(query || message, { userId });
  if (!found.available) return noLiveDataReply();
  if (!found.results.length) {
    return reply({
      text: "I couldn't find reliable live sources for that, so I won't invent an answer.",
      mood: "helping",
    });
  }
  if (!provider.isAvailable()) {
    return reply({
      text: found.results
        .slice(0, 3)
        .map((item) => item.snippet || item.title)
        .filter(Boolean)
        .join("\n\n") || NO_LIVE_DATA,
      mood: "helping",
      items: found.results.map((item) => ({ title: item.title })),
    });
  }
  const ai = await interpretWithAi({
    provider,
    message,
    context: { now: now.toISOString(), mode: MODE.CURRENT_INFORMATION },
    history,
    allowTaskTools: false,
    mode: MODE.CURRENT_INFORMATION,
    searchResults: found.results,
  });
  return reply({
    text: ai.response,
    mood: "helping",
    items: found.results.map((item) => ({ title: item.title })),
  });
}

async function handleOpenDomain({ user, message, classified, provider, search, history, now }) {
  if (!provider.isAvailable() && classified.mode !== MODE.CURRENT_INFORMATION) {
    return reply({ text: GENERAL_FALLBACK, mood: "helping" });
  }

  if (classified.mode === MODE.CURRENT_INFORMATION) {
    return answerFromSearch({
      provider,
      message,
      history,
      now,
      search,
      userId: user.UserId,
      query: message,
    });
  }

  const ai = await interpretWithAi({
    provider,
    message,
    context: { now: now.toISOString(), mode: classified.mode },
    history,
    allowTaskTools: false,
    mode: classified.mode,
  });

  if (ai.tool === SEARCH_TOOL) {
    return answerFromSearch({
      provider,
      message,
      history,
      now,
      search,
      userId: user.UserId,
      query: ai.toolArguments.query || message,
    });
  }

  return reply({ text: ai.response, mood: "helping" });
}

async function handleAssistantChat(input, deps = {}) {
  const user = input.user;
  const message = String(input.message || "").trim().slice(0, 2000);
  const now = input.now || new Date();
  const clientContext = input.context || {};
  const runTool = deps.runTool || runAssistantTool;
  const provider = deps.provider || getAiProvider();
  const search = deps.search || getSearchProvider();

  metrics.recordTotal();

  if (input.reset) {
    clearSession(user.UserId);
    return reply({ text: "New chat started. What should we work on?" });
  }

  if (!message) {
    metrics.recordDeterministic();
    return clarificationFor({ intent: "chat" });
  }

  const session = getSession(user.UserId);
  addTurn(user.UserId, "user", message);

  const classified = classifyRequest(message, {
    now,
    pending: session.pending,
    selectedTaskId: clientContext.selectedTaskId,
  });

  let outcome;
  let usedAi = false;

  if (classified.intent === "chat" && classified.reason === "smalltalk") {
    metrics.recordDeterministic();
    outcome = smalltalk(message);
  } else if (classified.route === ROUTE.CLARIFICATION_REQUIRED) {
    metrics.recordDeterministic();
    outcome = clarificationFor(classified);
  } else if (classified.intent === "open_notifications" || classified.intent === "logout") {
    metrics.recordDeterministic();
    outcome = uiIntentReply(classified.intent);
  } else if (classified.allowTaskTool === false || GENERAL_MODES.has(classified.mode)) {
    try {
      outcome = await handleOpenDomain({
        user,
        message,
        classified,
        provider,
        search,
        history: session.turns,
        now,
      });
      usedAi = provider.isAvailable() && classified.mode !== MODE.CURRENT_INFORMATION
        ? outcome.text !== GENERAL_FALLBACK
        : Boolean(search.isAvailable?.() && outcome.text !== NO_LIVE_DATA);
      if (!provider.isAvailable() && classified.mode !== MODE.CURRENT_INFORMATION) {
        metrics.recordDeterministic();
        usedAi = false;
      }
    } catch (error) {
      metrics.recordAiFailure();
      console.error("assistant.ai_failed", { reason: error.reason || error.message, status: error.status || 0 });
      outcome = reply({ text: GENERAL_FALLBACK, mood: "error" });
    }
  } else if (classified.route === ROUTE.DETERMINISTIC && classified.confidence >= 0.9) {
    metrics.recordDeterministic();
    if (classified.intent === "create_task" && !classified.toolArguments?.Date && /tomorrow|today|monday|at\s+\d/i.test(message) === false) {
      setPending(user.UserId, {
        intent: "create_task",
        tool: "createTask",
        toolArguments: classified.toolArguments,
      });
    } else {
      setPending(user.UserId, classified.tool ? { intent: classified.intent, tool: classified.tool, toolArguments: classified.toolArguments } : null);
    }
    outcome = await executeOrConfirm({
      user,
      tool: classified.tool,
      toolArguments: classified.toolArguments,
      now,
      runTool,
      spoken: classified.intent === "create_task"
        ? `I drafted “${classified.toolArguments.Title || classified.toolArguments.text}”. I’ll create it once you confirm.`
        : classified.intent === "delete_task"
          ? "This will permanently delete that task. Confirm if I have the right one."
          : null,
    });
  } else if (classified.route === ROUTE.AI_REQUIRED && provider.isAvailable()) {
    try {
      const ai = await interpretWithAi({
        provider,
        message,
        context: buildAiContext({ ...clientContext, now: now.toISOString() }),
        history: session.turns,
      });
      usedAi = true;
      if (GENERAL_INTENTS.has(ai.intent) || ai.tool === SEARCH_TOOL) {
        if (ai.tool === SEARCH_TOOL) {
          outcome = await answerFromSearch({
            provider,
            message,
            history: session.turns,
            now,
            search,
            userId: user.UserId,
            query: ai.toolArguments.query || message,
          });
        } else {
          outcome = reply({ text: ai.response, mood: "helping" });
        }
      } else if (ai.intent === "clarify" || (!ai.tool && ai.confidence < 0.6)) {
        outcome = reply({ text: ai.response, mood: "asking_confirmation" });
      } else if (ai.intent === "open_notifications" || ai.intent === "logout") {
        outcome = uiIntentReply(ai.intent);
      } else {
        const tool = ai.tool || INTENT_TO_TOOL[ai.intent] || null;
        if (!classified.allowTaskTool || !tool) {
          outcome = reply({ text: ai.response, mood: "helping" });
        } else {
          setPending(user.UserId, { intent: ai.intent, tool, toolArguments: ai.toolArguments });
          outcome = await executeOrConfirm({
            user,
            tool,
            toolArguments: ai.toolArguments,
            now,
            runTool,
            spoken: ai.response,
          });
        }
      }
    } catch (error) {
      metrics.recordAiFailure();
      console.error("assistant.ai_failed", { reason: error.reason || error.message, status: error.status || 0 });
      if (classified.tool && classified.confidence >= 0.6) {
        outcome = await executeOrConfirm({
          user,
          tool: classified.tool,
          toolArguments: classified.toolArguments,
          now,
          runTool,
        });
      } else {
        outcome = reply({ text: FALLBACK_TEXT, mood: "error" });
      }
    }
  } else if (classified.tool && classified.confidence >= 0.6) {
    metrics.recordDeterministic();
    outcome = await executeOrConfirm({
      user,
      tool: classified.tool,
      toolArguments: classified.toolArguments,
      now,
      runTool,
    });
  } else {
    metrics.recordDeterministic();
    outcome = reply({
      text: FALLBACK_TEXT,
      mood: "helping",
      actions: [
        { id: "plan", label: "Plan my day" },
        { id: "show-overdue", label: "Show overdue" },
        { id: "create", label: "New task" },
      ],
    });
  }

  addTurn(user.UserId, "assistant", outcome?.text || FALLBACK_TEXT);
  return {
    ...(outcome || reply({ text: FALLBACK_TEXT, mood: "error" })),
    route: classified.route,
    mode: classified.mode || outcome.mode,
    usedAi,
    confidence: classified.confidence,
  };
}

module.exports = {
  handleAssistantChat,
  buildAiContext,
  slimTasks,
  FALLBACK_TEXT,
  GENERAL_FALLBACK,
  NO_LIVE_DATA,
};
