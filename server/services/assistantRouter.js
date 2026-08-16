const { parseNaturalTask, parseTimeToken } = require("./taskParser");

const ROUTE = {
  DETERMINISTIC: "DETERMINISTIC",
  AI_REQUIRED: "AI_REQUIRED",
  CLARIFICATION_REQUIRED: "CLARIFICATION_REQUIRED",
  UNSUPPORTED: "UNSUPPORTED",
};

const MODE = {
  TASK_ACTION: "TASK_ACTION",
  TASK_PLANNING: "TASK_PLANNING",
  TASK_ANALYSIS: "TASK_ANALYSIS",
  GENERAL_QA: "GENERAL_QA",
  GENERAL_WRITING: "GENERAL_WRITING",
  GENERAL_EXPLANATION: "GENERAL_EXPLANATION",
  CURRENT_INFORMATION: "CURRENT_INFORMATION",
  CLARIFICATION: "CLARIFICATION",
  UNSUPPORTED: "UNSUPPORTED",
};

const GENERAL_MODES = new Set([
  MODE.GENERAL_QA,
  MODE.GENERAL_WRITING,
  MODE.GENERAL_EXPLANATION,
  MODE.CURRENT_INFORMATION,
]);

const AI_SIGNALS =
  /\b(organize|around my|too much work|focus on first|less important|before my meeting|help me plan|what should i (do|focus|prioritize|work on)|i think i should|probably move|haven't finished|have not finished|summarize my tasks)\b/i;

const AMBIGUOUS_REF = /\b(that|it|this|the old one|the old task)\b/i;
const MUTATION = /\b(delete|remove|complete|finish|move|reschedule|remind)\b/i;

const COMMANDS = [
  {
    id: "complete_id",
    pattern: /^(?:please\s+)?(?:complete|finish|mark(?:\s+as)?\s+(?:done|complete)(?:d)?)\s+(?:task\s+)?#?(\d+)\s*$/i,
    confidence: 0.98,
    intent: "complete_task",
    tool: "completeTask",
    extract: (match) => ({ id: Number(match[1]) }),
  },
  {
    id: "delete_id",
    pattern: /^(?:please\s+)?(?:delete|remove)\s+(?:task\s+)?#?(\d+)\s*$/i,
    confidence: 0.98,
    intent: "delete_task",
    tool: "deleteTask",
    extract: (match) => ({ id: Number(match[1]) }),
  },
  {
    id: "today",
    pattern: /^(?:show\s+)?(?:my\s+)?today(?:'s)?(?:\s+tasks)?\s*$/i,
    confidence: 0.96,
    intent: "get_today_tasks",
    tool: "getTodayTasks",
  },
  {
    id: "overdue",
    pattern: /^(?:show\s+)?(?:what's|whats|what is)?\s*overdue(?:\s+tasks)?\s*$/i,
    confidence: 0.96,
    intent: "get_overdue_tasks",
    tool: "getOverdueTasks",
  },
  {
    id: "upcoming",
    pattern: /^(?:show\s+)?(?:my\s+)?upcoming(?:\s+tasks)?\s*$/i,
    confidence: 0.94,
    intent: "get_upcoming_tasks",
    tool: "getUpcomingTasks",
  },
  {
    id: "plan_short",
    pattern: /^(?:plan my day|what should i do(?: today)?|daily plan)\.?\s*$/i,
    confidence: 0.93,
    intent: "get_daily_summary",
    tool: "getDailySummary",
  },
  {
    id: "summarize_today",
    pattern: /^summarize (?:my )?(?:tasks? )?(?:for )?today\.?\s*$/i,
    confidence: 0.94,
    intent: "get_today_tasks",
    tool: "getTodayTasks",
  },
  {
    id: "stats",
    pattern: /^(?:how (?:was|is) my (?:week|month)|show (?:my )?productivity|my stats)\.?\s*$/i,
    confidence: 0.92,
    intent: "get_productivity",
    tool: "getProductivityStats",
  },
  {
    id: "notifications",
    pattern: /^(?:open|show|view)\s+notifications\s*$/i,
    confidence: 0.95,
    intent: "open_notifications",
    tool: null,
  },
  {
    id: "logout",
    pattern: /^(?:log\s*out|sign\s*out)\s*$/i,
    confidence: 0.95,
    intent: "logout",
    tool: null,
  },
  {
    id: "create_bare",
    pattern: /^(?:create|add|new)\s+(?:a\s+)?(?:task|todo)?\s*$/i,
    confidence: 0.9,
    intent: "create_task",
    tool: null,
    clarify: true,
  },
];

const ANALYSIS_INTENTS = new Set([
  "get_today_tasks",
  "get_overdue_tasks",
  "get_upcoming_tasks",
  "get_productivity",
  "get_daily_summary",
]);

function classified(partial) {
  const mode = partial.mode || MODE.TASK_ACTION;
  return {
    tool: null,
    toolArguments: {},
    allowTaskTool: !GENERAL_MODES.has(mode) && mode !== MODE.CLARIFICATION && mode !== MODE.UNSUPPORTED,
    ...partial,
    mode,
  };
}

function isHypothetical(text) {
  return /\b(what would happen if|what happens if|if i (were to )?(delete|deleted|remove|removed)|explain how|how (do|does|would) .+\bwork)\b/i.test(
    text
  );
}

function isTaskScoped(text) {
  return (
    AI_SIGNALS.test(text) ||
    /\b(my (tasks?|todos?|day|overdue|plan|list|productivity|notifications)|today'?s tasks|create (a )?(task|todo)|complete task|delete task|plan my day|remind me to|summarize my)\b/i.test(
      text
    )
  );
}

function isCurrentInformation(text) {
  return /\b((latest|current|live|today'?s)\s+(news|weather|stock|crypto|price|prices|score|scores|events|release|releases|version)|weather (now|today|in)|stock price|crypto price|breaking news|what'?s the latest|whats the latest)\b/i.test(
    text
  );
}

function isGeneralWriting(text) {
  return /\b(write|draft|compose|rewrite|proofread)\b.+\b(email|letter|message|paragraph|essay|bio|resume)\b/i.test(text);
}

function isGeneralExplanation(text) {
  return /^(what is|what's|whats|explain|define|difference between|how does|how do|help me understand)\b/i.test(text);
}

function inferGeneralMode(text) {
  if (isCurrentInformation(text) && !isTaskScoped(text)) return MODE.CURRENT_INFORMATION;
  if (isGeneralWriting(text)) return MODE.GENERAL_WRITING;
  if (isHypothetical(text) || (isGeneralExplanation(text) && !isTaskScoped(text))) return MODE.GENERAL_EXPLANATION;
  if (/\?$/.test(text) && !isTaskScoped(text)) return MODE.GENERAL_QA;
  if (isGeneralExplanation(text)) return MODE.GENERAL_QA;
  return null;
}

function modeForCommand(intent) {
  if (ANALYSIS_INTENTS.has(intent)) return MODE.TASK_ANALYSIS;
  if (intent === "get_daily_summary") return MODE.TASK_PLANNING;
  return MODE.TASK_ACTION;
}

function isTimeOnly(text) {
  const q = String(text || "").trim();
  if (!q) return false;
  if (/^(morning|afternoon|evening|noon|midnight)$/i.test(q)) return true;
  return /^(at\s+)?\d{1,2}(:\d{2})?\s*(am|pm)?$/i.test(q);
}

function looksConversational(text) {
  const raw = String(text || "");
  if (raw.length > 90) return true;
  if (AI_SIGNALS.test(raw)) return true;
  if (/\b(i have|i think|can you help|could you|would you|maybe)\b/i.test(raw) && raw.split(/\s+/).length >= 8) {
    return true;
  }
  return false;
}

function matchCommand(text) {
  const raw = String(text || "").trim();
  for (const command of COMMANDS) {
    const match = raw.match(command.pattern);
    if (!match) continue;
    return {
      id: command.id,
      confidence: command.confidence,
      intent: command.intent,
      tool: command.tool,
      toolArguments: command.extract ? command.extract(match) : {},
      clarify: Boolean(command.clarify),
    };
  }
  return null;
}

function classifyCreate(text, now) {
  const raw = String(text || "").trim();
  if (isHypothetical(raw) || inferGeneralMode(raw)) return null;
  const explicitTask = /\b((create|add|make)\s+(a\s+)?(task|todo|to-do)|new task|remind me to)\b/i.test(raw);
  const startsCreate = /^(please\s+)?(create|add)\s+/i.test(raw);
  if (!explicitTask && !startsCreate) return null;
  if (!explicitTask && isGeneralExplanation(raw)) return null;
  const rest = raw
    .replace(/^(please\s+)?(create|add|make)\s+(a\s+)?(task|todo|to-do)?\s*(to|for)?\s*/i, "")
    .replace(/^remind me to\s+/i, "")
    .trim();
  if (!rest || rest.length < 3) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.88,
      intent: "create_task",
      reason: "missing_title",
    });
  }
  const parsed = parseNaturalTask(rest, now);
  return classified({
    route: ROUTE.DETERMINISTIC,
    mode: MODE.TASK_ACTION,
    confidence: parsed?.title ? 0.92 : 0.7,
    intent: "create_task",
    tool: "createTask",
    toolArguments: {
      text: rest,
      Title: parsed.title,
      Date: parsed.dueDate,
      Priority: parsed.priority,
      category: parsed.category,
    },
    reason: "create_command",
  });
}

function classifyRequest(text, options = {}) {
  const raw = String(text || "").trim();
  const now = options.now || new Date();
  const pending = options.pending || null;
  const selectedTaskId = options.selectedTaskId;

  if (!raw) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0,
      intent: "clarify",
      reason: "empty",
    });
  }

  if (pending?.intent === "create_task" && isTimeOnly(raw)) {
    const time = parseTimeToken(raw);
    const base = pending.toolArguments?.Date ? new Date(pending.toolArguments.Date) : new Date(now);
    if (Number.isFinite(time.hours)) {
      base.setHours(time.hours, time.minutes || 0, 0, 0);
    }
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ACTION,
      confidence: 0.93,
      intent: "create_task",
      tool: "createTask",
      toolArguments: {
        ...(pending.toolArguments || {}),
        Date: base.toISOString(),
        text: pending.toolArguments?.text || pending.toolArguments?.Title,
      },
      reason: "slot_fill_time",
    });
  }

  if (pending && AMBIGUOUS_REF.test(raw) && MUTATION.test(raw) && pending.toolArguments?.id && !isHypothetical(raw)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ACTION,
      confidence: 0.91,
      intent: pending.intent,
      tool: pending.tool,
      toolArguments: { ...pending.toolArguments },
      reason: "pending_referent",
    });
  }

  const command = matchCommand(raw);
  if (command?.clarify) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: command.confidence,
      intent: command.intent,
      reason: command.id,
    });
  }
  if (command && command.confidence >= 0.9) {
    const ui = command.intent === "logout" || command.intent === "open_notifications";
    return classified({
      route: command.tool || ui ? ROUTE.DETERMINISTIC : ROUTE.UNSUPPORTED,
      mode: ui ? MODE.TASK_ACTION : command.tool ? modeForCommand(command.intent) : MODE.UNSUPPORTED,
      confidence: command.confidence,
      intent: command.intent,
      tool: command.tool,
      toolArguments: command.toolArguments || {},
      reason: command.id,
    });
  }

  if (isHypothetical(raw)) {
    return classified({
      route: ROUTE.AI_REQUIRED,
      mode: MODE.GENERAL_EXPLANATION,
      confidence: 0.86,
      intent: "general_explanation",
      allowTaskTool: false,
      reason: "hypothetical",
    });
  }

  const generalMode = inferGeneralMode(raw);
  if (generalMode) {
    return classified({
      route: ROUTE.AI_REQUIRED,
      mode: generalMode,
      confidence: 0.84,
      intent:
        generalMode === MODE.CURRENT_INFORMATION
          ? "current_information"
          : generalMode === MODE.GENERAL_WRITING
            ? "general_writing"
            : generalMode === MODE.GENERAL_EXPLANATION
              ? "general_explanation"
              : "general_qa",
      allowTaskTool: false,
      reason: "open_domain",
    });
  }

  if (/\b(delete|remove)\b.+\b(all|every)\b/i.test(raw)) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.72,
      intent: "delete_task",
      reason: "bulk_delete",
    });
  }

  if (/^remind me later\s*$/i.test(raw)) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.7,
      intent: "schedule_reminder",
      reason: "remind_later",
    });
  }

  if (MUTATION.test(raw) && AMBIGUOUS_REF.test(raw) && !selectedTaskId && !pending?.toolArguments?.id) {
    const intent = /\b(delete|remove)\b/i.test(raw)
      ? "delete_task"
      : /\b(complete|finish)\b/i.test(raw)
        ? "complete_task"
        : /\bremind\b/i.test(raw)
          ? "schedule_reminder"
          : "reschedule_task";
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.42,
      intent,
      reason: "ambiguous_reference",
    });
  }

  if (looksConversational(raw)) {
    return classified({
      route: ROUTE.AI_REQUIRED,
      mode: isTaskScoped(raw) ? MODE.TASK_PLANNING : MODE.GENERAL_QA,
      confidence: 0.38,
      intent: isTaskScoped(raw) ? "chat" : "general_qa",
      allowTaskTool: isTaskScoped(raw),
      reason: "natural_language",
    });
  }

  const created = classifyCreate(raw, now);
  if (created) {
    if (created.confidence >= 0.9) return created;
    return classified({ ...created, route: ROUTE.AI_REQUIRED, reason: "medium_create" });
  }

  if (command && command.confidence >= 0.6) {
    return classified({
      route: ROUTE.AI_REQUIRED,
      mode: modeForCommand(command.intent),
      confidence: command.confidence,
      intent: command.intent,
      tool: command.tool,
      toolArguments: command.toolArguments || {},
      reason: "medium_confidence",
    });
  }

  if (/^(hi|hello|hey|yo|thanks|thank you|thx|help)\b/i.test(raw)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.GENERAL_QA,
      confidence: 0.97,
      intent: "chat",
      allowTaskTool: false,
      reason: "smalltalk",
    });
  }

  if (/summarize (my )?(tasks? )?(for )?today/i.test(raw)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ANALYSIS,
      confidence: 0.93,
      intent: "get_today_tasks",
      tool: "getTodayTasks",
      reason: "summarize_today",
    });
  }

  return classified({
    route: ROUTE.AI_REQUIRED,
    mode: isTaskScoped(raw) ? MODE.TASK_PLANNING : MODE.GENERAL_QA,
    confidence: 0.45,
    intent: isTaskScoped(raw) ? "chat" : "general_qa",
    allowTaskTool: isTaskScoped(raw),
    reason: "unmatched",
  });
}

module.exports = {
  ROUTE,
  MODE,
  GENERAL_MODES,
  classifyRequest,
  isTimeOnly,
  looksConversational,
  isHypothetical,
  inferGeneralMode,
};
