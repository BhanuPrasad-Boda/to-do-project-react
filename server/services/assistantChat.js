const { runAssistantTool, TOOLS, CONFIRM_TOOLS } = require("./assistantTools");
const { classifyRequest, ROUTE, MODE } = require("./assistantRouter");
const { addTurn, getSession, setPending, setLastReferent, clearSession } = require("./assistantMemory");
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

const UNKNOWN_TEXT =
  "I'm sorry, I couldn't understand your request.\n\nI can help with the areas below. Would you like to try again or add it manually?";

const UNKNOWN_ITEMS = [
  { title: "Tasks" },
  { title: "Reminders" },
  { title: "Appointments" },
  { title: "Notifications" },
  { title: "Priorities" },
  { title: "Daily planning" },
];

const FALLBACK_TEXT = UNKNOWN_TEXT;

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
  if (tool === "setPriority") return { confirmLabel: "Change priority", cancelLabel: "Keep current", variant: "primary", mood: "asking_confirmation" };
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

function safeDraft(classified) {
  const draft = classified.draft || {};
  const args = classified.toolArguments || {};
  const title = String(draft.title || args.Title || args.query || "").trim();
  const DateValue = draft.Date || args.Date || null;
  const Priority = draft.Priority || args.Priority || null;
  if (classified.reason === "open_domain") return {};
  const out = {};
  if (title && title.length >= 3 && !/^(what is|explain|tell me|who is)/i.test(title)) out.Title = title;
  if (DateValue) out.Date = DateValue;
  if (Priority && Priority !== "Medium") out.Priority = Priority;
  return out;
}

function unknownReply(classified = {}) {
  return reply({
    text: UNKNOWN_TEXT,
    mood: "confused",
    items: UNKNOWN_ITEMS,
    actions: [
      { id: "try-again", label: "Try again", variant: "primary" },
      { id: "add-manually", label: "Add manually" },
    ],
    extra: { draft: safeDraft(classified), unknown: true },
  });
}

function smalltalk(text) {
  const q = String(text || "").toLowerCase();
  if (/^(thanks|thank you|thx)\b/.test(q)) {
    return reply({ text: "You're welcome. I'll be here when the next decision comes up.", mood: "happy" });
  }
  if (/^(help|what can you do)/.test(q) || q === "help") {
    return reply({
      text: "I can help you manage tasks, reminders, appointments, notifications, priorities, and your daily plan. Tell me what you need in plain language.",
      mood: "guiding",
      actions: [
        { id: "plan", label: "Plan my day" },
        { id: "today-tasks", label: "What should I do?" },
        { id: "create", label: "New task" },
      ],
    });
  }
  return reply({
    text: "Hello. I'm TaskFlow Assistant. I can manage your tasks, reminders, and daily plan — I won't guess if I'm unsure.",
    mood: "helping",
  });
}

function clarificationFor(classified) {
  if (classified.intent === "delete_task") {
    if (classified.reason === "bulk_delete") {
      return reply({
        text: "I can remove tasks, but I won't delete a whole group at once. Tell me the exact title or task number.",
        mood: "asking_confirmation",
        actions: [{ id: "show-overdue", label: "Show overdue" }, { id: "add-manually", label: "Add manually" }],
      });
    }
    return reply({
      text: "Which task would you like me to delete?",
      mood: "asking_confirmation",
    });
  }
  if (classified.intent === "complete_task") {
    return reply({ text: "Which task should I mark complete? Include the title or task number.", mood: "asking_confirmation" });
  }
  if (classified.intent === "reschedule_task") {
    return reply({
      text: "Tell me which task to move and when — for example, “Move report to Monday”.",
      mood: "asking_confirmation",
    });
  }
  if (classified.intent === "schedule_reminder") {
    return reply({
      text: classified.reason === "missing_title"
        ? "What would you like me to remind you about?"
        : "When should I remind you? For example, “Remind me 1 hour before”.",
      mood: "asking_confirmation",
    });
  }
  if (classified.intent === "set_priority") {
    return reply({ text: "Which task should I change the priority for?", mood: "asking_confirmation" });
  }
  if (classified.intent === "create_task") {
    return reply({
      text: "What task would you like me to add?",
      mood: "asking_confirmation",
      actions: [
        { id: "try-again", label: "Try again" },
        { id: "add-manually", label: "Add manually", variant: "primary" },
      ],
    });
  }
  if (classified.intent === "mark_notification_read") {
    return reply({ text: "Which notification should I mark as read?", mood: "asking_confirmation" });
  }
  return reply({
    text: "I need a bit more detail before I change anything.",
    mood: "asking_confirmation",
    actions: [
      { id: "try-again", label: "Try again" },
      { id: "add-manually", label: "Add manually" },
    ],
  });
}

function uiIntentReply(intent) {
  if (intent === "open_notifications") {
    return reply({
      text: "Opening your notifications.",
      mood: "guiding",
      actions: [{ id: "show-notifications", label: "Open notifications", variant: "primary" }],
    });
  }
  if (intent === "logout") {
    return reply({
      text: "I can't sign you out from chat. Use Settings to log out.",
      actions: [{ id: "view-tasks", label: "Back to tasks" }],
    });
  }
  return unknownReply();
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
  const mood = READ_TOOLS.has(tool) ? "helping" : "success";
  return reply({
    text: result.message || "Done.",
    mood,
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
    return unknownReply();
  }

  if (CONFIRM_TOOLS.has(tool)) {
    if (tool === "deleteTask" && !toolArguments.id && !toolArguments.query) {
      return clarificationFor({ intent: "delete_task" });
    }
    const preview = spoken || "I can do that, but I need your confirmation before I change your tasks.";
    return confirmationReply(tool, toolArguments, preview);
  }

  const result = await runTool(user, tool, toolArguments, now);
  return fromToolResult(result, tool);
}

function spokenFor(classified) {
  const args = classified.toolArguments || {};
  if (classified.intent === "create_task") {
    return `I drafted “${args.Title || args.text}”. I’ll create it once you confirm.`;
  }
  if (classified.intent === "delete_task") {
    return "This will permanently delete that task. Confirm if I have the right one.";
  }
  if (classified.intent === "reschedule_task") {
    return args.Date
      ? `I’ll move that task to ${formatDue(args.Date)}. Confirm if that date is correct.`
      : "I’ll reschedule that task once you confirm.";
  }
  if (classified.intent === "set_priority") {
    return `I’ll set that task to ${args.Priority} priority. Confirm if that’s right.`;
  }
  return null;
}

function remember(userId, classified) {
  const args = classified.toolArguments || {};
  if (!args.id && !args.query && !args.Title) return;
  setLastReferent(userId, {
    id: args.id || null,
    query: args.query || args.Title || null,
    title: args.Title || args.query || null,
    intent: classified.intent,
    tool: classified.tool,
  });
}

async function handleAssistantChat(input, deps = {}) {
  const user = input.user;
  const message = String(input.message || "").trim().slice(0, 2000);
  const now = input.now || new Date();
  const clientContext = input.context || {};
  const runTool = deps.runTool || runAssistantTool;

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
    lastReferent: session.lastReferent,
    selectedTaskId: clientContext.selectedTaskId,
  });

  metrics.recordDeterministic();
  remember(user.UserId, classified);

  let outcome;

  if ((classified.intent === "chat" && classified.reason === "smalltalk") || classified.intent === "help") {
    outcome = smalltalk(classified.intent === "help" ? "help" : message);
  } else if (classified.intent === "unknown" || classified.route === ROUTE.UNSUPPORTED || classified.confidence < 0.6) {
    if (classified.route === ROUTE.CLARIFICATION_REQUIRED) {
      outcome = clarificationFor(classified);
    } else {
      outcome = unknownReply(classified);
    }
  } else if (classified.route === ROUTE.CLARIFICATION_REQUIRED) {
    outcome = clarificationFor(classified);
  } else if (classified.intent === "open_notifications" || classified.intent === "logout") {
    outcome = uiIntentReply(classified.intent);
  } else if (classified.tool && classified.confidence >= 0.8) {
    if (classified.intent === "create_task") {
      setPending(user.UserId, {
        intent: "create_task",
        tool: "createTask",
        toolArguments: classified.toolArguments,
      });
    } else {
      setPending(user.UserId, classified.tool
        ? { intent: classified.intent, tool: classified.tool, toolArguments: classified.toolArguments }
        : null);
    }
    outcome = await executeOrConfirm({
      user,
      tool: classified.tool,
      toolArguments: classified.toolArguments,
      now,
      runTool,
      spoken: spokenFor(classified),
    });
  } else {
    outcome = unknownReply(classified);
  }

  addTurn(user.UserId, "assistant", outcome?.text || UNKNOWN_TEXT);
  return {
    ...(outcome || unknownReply(classified)),
    route: classified.route,
    mode: classified.mode || outcome.mode,
    usedAi: false,
    confidence: classified.confidence,
  };
}

module.exports = {
  handleAssistantChat,
  slimTasks,
  FALLBACK_TEXT,
  UNKNOWN_TEXT,
  MODE,
};
