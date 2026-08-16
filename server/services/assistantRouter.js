const { parseNaturalTask, parseTimeToken, parseWhen, parsePriorityLabel } = require("./taskParser");
const { prepareMessage } = require("./assistant/normalizer");

const ROUTE = {
  DETERMINISTIC: "DETERMINISTIC",
  AI_REQUIRED: "UNSUPPORTED",
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

const TASK_SCOPE =
  /\b(task|tasks|todo|todos|to-do|appointment|appointments|meeting|meetings|reminder|reminders|notification|notifications|overdue|daily plan|my day|my list)\b/i;

const PRONOUN = /\b(it|that|this)\b/i;

function classified(partial) {
  const mode = partial.mode || MODE.TASK_ACTION;
  const unsupported = partial.route === ROUTE.UNSUPPORTED || mode === MODE.UNSUPPORTED;
  return {
    tool: null,
    toolArguments: {},
    allowTaskTool: !unsupported && !GENERAL_MODES.has(mode) && mode !== MODE.CLARIFICATION,
    ...partial,
    mode,
  };
}

function cleanTitle(value) {
  return String(value || "")
    .replace(/\b(the|a|an|my|please|task|todo|to-do|it|that|this)\b/gi, " ")
    .replace(/\s+/g, " ")
    .replace(/^[-:,\s]+|[-:,\s]+$/g, "")
    .trim();
}

function strip(text, patterns) {
  let next = String(text || "");
  patterns.forEach((pattern) => {
    next = next.replace(pattern, " ");
  });
  return next.replace(/\s+/g, " ").trim();
}

function taskIdFrom(text) {
  const match = String(text || "").match(/\b(?:task\s+)?#?(\d{2,})\b/i);
  return match ? Number(match[1]) : null;
}

function isTimeOnly(text) {
  const q = String(text || "").trim();
  if (!q) return false;
  if (/^(morning|afternoon|evening|noon|midnight|tonight)$/i.test(q)) return true;
  return /^(at\s+)?\d{1,2}(:\d{2})?\s*(am|pm)?$/i.test(q);
}

function isHypothetical(text) {
  return /\b(what would happen if|what happens if|if i (were to )?(delete|deleted|remove|removed)|explain how|how (do|does|would) .+\bwork)\b/i.test(
    text
  );
}

function isTaskQuestion(text) {
  if (/^(what is|who is|explain|define|can you explain|help me understand|difference between)\b/i.test(text)) {
    return /\b(overdue|my tasks|today'?s tasks|plan my day|my notifications|do i need to do)\b/i.test(text);
  }
  return (
    TASK_SCOPE.test(text) ||
    /\bwhat (do i|should i) (need to )?(do|work on|focus|prioritize)\b/i.test(text) ||
    /\b(overdue|plan my day|daily plan|productivity)\b/i.test(text)
  );
}

function isNarrative(text) {
  return (
    /\b(i was thinking|i have been thinking|was cancelled|were cancelled|thinking about)\b/i.test(text) &&
    !/^(please\s+)?(delete|remove|create|add|complete|finish)\b/i.test(text)
  );
}

function isVague(text) {
  return /\b(that thing|this thing|handle that|do the thing|the thing|stuff)\b/i.test(text);
}

function isOutOfScope(text) {
  if (isTaskQuestion(text)) return false;
  if (isNarrative(text) || isVague(text)) return true;
  if (isHypothetical(text) && !/^(please\s+)?(delete|remove|complete)\b/i.test(text)) return true;
  if (/\b(tell me a joke|write (a |an )?(essay|poem|story|email|letter)|who is the president|quantum physics|machine learning)\b/i.test(text)) {
    return true;
  }
  if (/^(what is|who is|explain|define|difference between|help me understand)\b/i.test(text) && !isTaskQuestion(text)) {
    return true;
  }
  if (/\?$/.test(text) && !isTaskQuestion(text) && !/\b(create|add|complete|delete|remind|schedule|show)\b/i.test(text)) {
    return true;
  }
  return false;
}

function looksConversational(text) {
  const raw = String(text || "");
  if (raw.length > 90) return true;
  return /\b(i have|i think|can you help|could you|would you|maybe)\b/i.test(raw) && raw.split(/\s+/).length >= 8;
}

function inferGeneralMode(text) {
  if (isOutOfScope(text) && /\b(write|draft|compose)\b/.test(text)) return MODE.GENERAL_WRITING;
  if (isOutOfScope(text) && /^(what is|explain|define|help me understand|difference between)\b/.test(text)) {
    return MODE.GENERAL_EXPLANATION;
  }
  if (isOutOfScope(text)) return MODE.GENERAL_QA;
  return null;
}

function extractQuery(text, extra = []) {
  return cleanTitle(
    strip(text, [
      /^(please\s+)?(can you|could you|would you)\s+/i,
      ...extra,
      /\b(the\s+)?(task|todo|to-do)\b/gi,
    ])
  );
}

function entitiesFrom(text, now) {
  const parsed = parseNaturalTask(text, now);
  const when = parseWhen(text, now);
  return {
    id: taskIdFrom(text),
    title: cleanTitle(parsed.title),
    Date: when.dueDate || parsed.dueDate || null,
    Priority: parsePriorityLabel(text) || parsed.priority,
    query: cleanTitle(parsed.title),
  };
}

function createTitle(text, now) {
  const rest = strip(text, [
    /^(please\s+)?(can you|could you|would you)\s+/i,
    /^(create|add|make|new|set|put|plan|schedule|remember|assign|note)\s+(a\s+)?(task|todo|to-do|appointment|meeting|reminder|note)?\s*(?:\b(to|for|about|of)\b)?\s*/i,
    /^(write down|keep a note|add this|add something|put this on my list|put this in my tasks|remember this|do not let me forget)\s*(to|about)?\s*/i,
    /^remind me to\s+/i,
    /^i need to\s+/i,
  ]);
  const parsed = parseNaturalTask(rest, now);
  let title = cleanTitle(parsed.title);
  const weakTitle = !title || title.length < 3 || /^(tomorrow|today|tonight|yesterday|monday|tuesday|wednesday|thursday|friday|saturday|sunday)(\s+at\s+.+)?$/i.test(title);
  if (weakTitle) {
    if (/\bmeeting\b/i.test(text)) title = "Meeting";
    else if (/\bappointment\b/i.test(text)) title = "Appointment";
    else if (/\bcall\b/i.test(text)) title = "Call";
  }
  return {
    title,
    Date: parsed.dueDate,
    Priority: parsed.priority,
    category: parsed.category,
    text: rest || title,
  };
}

function commandCreate(text) {
  return (
    /^(please\s+)?(can you|could you)?\s*(create|add|make|new|schedule|remember|write down)\b/i.test(text) ||
    /\b(create|add)\s+(a\s+)?(task|todo|to-do|appointment|meeting|reminder)\b/i.test(text) ||
    /\b(put this on my list|put this in my tasks|remember this|do not let me forget|keep a note)\b/i.test(text) ||
    /^remind me to\b/i.test(text)
  );
}

function classifiedCreate(text, now, confidence) {
  const created = createTitle(text, now);
  if (!created.title || created.title.length < 3) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: Math.max(0.72, confidence - 0.1),
      intent: "create_task",
      reason: "missing_title",
    });
  }
  return classified({
    route: ROUTE.DETERMINISTIC,
    mode: MODE.TASK_ACTION,
    confidence,
    intent: "create_task",
    tool: "createTask",
    toolArguments: {
      text: created.text,
      Title: created.title,
      Date: created.Date,
      Priority: created.Priority,
      category: created.category,
    },
    reason: "create_command",
  });
}

function detectView(text) {
  if (/\b(open|show|view|see|check|list)\s+(my\s+)?notifications?\b/i.test(text) || /^notifications?\s*$/i.test(text)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ANALYSIS,
      confidence: 0.96,
      intent: "open_notifications",
      reason: "notifications",
    });
  }
  if (/\b(mark|read).*\bnotification/i.test(text)) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.7,
      intent: "mark_notification_read",
      reason: "notification_id",
    });
  }
  if (/\b(productivity|how (was|is) my (week|month)|my stats|progress|streak)\b/i.test(text)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ANALYSIS,
      confidence: 0.93,
      intent: "get_productivity",
      tool: "getProductivityStats",
      reason: "stats",
    });
  }
  if (
    /^(plan my day|daily plan)\b/i.test(text) ||
    /\b(plan my day|daily plan|what should i (do|focus|work on|prioritize)|organize my (day|tasks)|too much work)\b/i.test(text)
  ) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_PLANNING,
      confidence: 0.92,
      intent: "get_daily_summary",
      tool: "getDailySummary",
      reason: "plan",
    });
  }
  if (
    /^(show\s+)?(what is|whats|what's)?\s*overdue\b/i.test(text) ||
    (/\b(show (me )?overdue|overdue tasks)\b/i.test(text) && !/\b(delete|remove|clear)\b/i.test(text))
  ) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ANALYSIS,
      confidence: 0.96,
      intent: "get_overdue_tasks",
      tool: "getOverdueTasks",
      reason: "overdue",
    });
  }
  if (/\b(what do i need to do today|what should i do today|today'?s tasks|show (me )?today|tasks? today)\b/i.test(text)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ANALYSIS,
      confidence: 0.95,
      intent: "get_today_tasks",
      tool: "getTodayTasks",
      reason: "today",
    });
  }
  if (/\b(upcoming|later this week|coming up)\b/i.test(text)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ANALYSIS,
      confidence: 0.94,
      intent: "get_upcoming_tasks",
      tool: "getUpcomingTasks",
      reason: "upcoming",
    });
  }
  if (/\b(completed|done) tasks\b/i.test(text) || /\bshow (me )?(my )?completed\b/i.test(text)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ANALYSIS,
      confidence: 0.93,
      intent: "get_tasks",
      tool: "getTasks",
      toolArguments: { completed: true },
      reason: "completed_list",
    });
  }
  if (
    /\b(show|list|view|see|display)\s+(me\s+)?(my\s+)?(tasks|todos|task list|appointments)\b/i.test(text) ||
    /^(my tasks|task list|todo list)\s*$/i.test(text)
  ) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ANALYSIS,
      confidence: 0.93,
      intent: "get_tasks",
      tool: "getTasks",
      reason: "list",
    });
  }
  if (/^(find|search)\b/i.test(text) || /\bsearch\s+(for\s+)?(my\s+)?tasks?\b/i.test(text)) {
    const query = extractQuery(text, [/^(find|search|show me|show)\s+(for\s+)?/i]);
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ANALYSIS,
      confidence: query ? 0.88 : 0.7,
      intent: "search_tasks",
      tool: "searchTasks",
      toolArguments: { search: query },
      reason: "search",
    });
  }
  return null;
}

function detectMutation(text, now, lastReferent, selectedTaskId) {
  const id = taskIdFrom(text) || selectedTaskId || lastReferent?.id || null;
  const pronoun = PRONOUN.test(text);
  const referentQuery = pronoun ? lastReferent?.query || lastReferent?.title : null;

  if (/\b(delete|remove).+\b(all|every)\b/i.test(text)) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.72,
      intent: "delete_task",
      reason: "bulk_delete",
    });
  }

  if (/^(please\s+)?(complete|finish|mark|check off|tick|wrap up)\b/i.test(text)) {
    const query =
      referentQuery ||
      extractQuery(text, [
        /^(please\s+)?(complete|finish|mark|check off|tick|wrap up)\s+(as\s+)?(done|complete|completed)?/i,
        /\b(done|complete|completed)\b/gi,
      ]);
    if (!id && !query) {
      return classified({
        route: ROUTE.CLARIFICATION_REQUIRED,
        mode: MODE.CLARIFICATION,
        confidence: 0.68,
        intent: "complete_task",
        reason: "missing_target",
      });
    }
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ACTION,
      confidence: id ? 0.98 : 0.9,
      intent: "complete_task",
      tool: "completeTask",
      toolArguments: { id, query },
      reason: "complete_command",
    });
  }

  if (
    /^(please\s+)?(delete|remove|erase|discard|drop|cancel)\b/i.test(text) ||
    /\b(get rid of|remove from list|take off my list)\b/i.test(text)
  ) {
    if (/\bcancel\b/i.test(text) && !/\b(task|todo|appointment|meeting)\b/i.test(text) && !id && !pronoun) {
      return null;
    }
    const query =
      referentQuery ||
      extractQuery(text, [
        /^(please\s+)?(delete|remove|erase|clear|discard|drop|cancel|get rid of)\s+/i,
        /\b(from list|off my list)\b/gi,
      ]);
    if (pronoun && !referentQuery && !id) {
      return classified({
        route: ROUTE.CLARIFICATION_REQUIRED,
        mode: MODE.CLARIFICATION,
        confidence: 0.42,
        intent: "delete_task",
        reason: "ambiguous_reference",
      });
    }
    if (!id && !query) {
      return classified({
        route: ROUTE.CLARIFICATION_REQUIRED,
        mode: MODE.CLARIFICATION,
        confidence: pronoun ? 0.42 : 0.7,
        intent: "delete_task",
        reason: "ambiguous_reference",
      });
    }
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ACTION,
      confidence: id ? 0.98 : 0.9,
      intent: "delete_task",
      tool: "deleteTask",
      toolArguments: { id, query },
      reason: "delete_command",
    });
  }

  if (/\b(make|set|mark|change)\b/i.test(text) && /\b(high|low|medium|urgent|important|priority)\b/i.test(text)) {
    const priority =
      parsePriorityLabel(text) || (/\b(urgent|important|high)\b/i.test(text) ? "High" : /\blow\b/i.test(text) ? "Low" : "Medium");
    const query =
      referentQuery ||
      extractQuery(text, [
        /^(please\s+)?(make|set|mark|change)\s+/i,
        /\b(high|low|medium|urgent|important)?\s*priority\b/gi,
        /\b(high|low|medium|urgent|important)\b/gi,
      ]);
    if (!id && !query) {
      return classified({
        route: ROUTE.CLARIFICATION_REQUIRED,
        mode: MODE.CLARIFICATION,
        confidence: 0.66,
        intent: "set_priority",
        reason: "missing_target",
      });
    }
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ACTION,
      confidence: 0.9,
      intent: "set_priority",
      tool: "setPriority",
      toolArguments: { id, query, Priority: priority },
      reason: "priority_command",
    });
  }

  if (/^(please\s+)?(move|reschedule|postpone|delay|shift|bring forward)\b/i.test(text) || /\bmove (my|the|it|that)\b/i.test(text)) {
    const when = parseWhen(text, now);
    const query =
      referentQuery ||
      extractQuery(text, [
        /^(please\s+)?(move|reschedule|postpone|delay|shift|bring forward)\s+(my|the)?\s*/i,
        /\bto\b.+$/i,
      ]);
    if (!when.dueDate) {
      return classified({
        route: ROUTE.CLARIFICATION_REQUIRED,
        mode: MODE.CLARIFICATION,
        confidence: 0.68,
        intent: "reschedule_task",
        reason: "missing_date",
      });
    }
    if (!id && !query) {
      return classified({
        route: ROUTE.CLARIFICATION_REQUIRED,
        mode: MODE.CLARIFICATION,
        confidence: pronoun ? 0.42 : 0.65,
        intent: "reschedule_task",
        reason: "ambiguous_reference",
      });
    }
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ACTION,
      confidence: 0.9,
      intent: "reschedule_task",
      tool: "rescheduleTask",
      toolArguments: { id, query, Date: when.dueDate },
      reason: "reschedule_command",
    });
  }

  return null;
}

function detectReminder(text, now) {
  if (!/\b(remind|reminder|alert me|notify me|let me know|do not forget)\b/i.test(text)) return null;
  if (/^(what is|explain)\b/.test(text)) return null;
  if (/^remind me later\s*$/i.test(text) || /^remind me\s*$/i.test(text)) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.7,
      intent: "schedule_reminder",
      reason: "remind_later",
    });
  }
  if (/\bremind me to\b/i.test(text)) return classifiedCreate(text, now, 0.92);
  if (/\b(remind me|alert me|notify me)\b.+\bbefore\b/i.test(text)) {
    let minutes = 30;
    if (/\bone day|1 day|24 hours\b/i.test(text)) minutes = 1440;
    else if (/\b(an |one )?hour\b/i.test(text)) minutes = 60;
    else {
      const match = text.match(/(\d+)\s*(minute|hour|day)/i);
      if (match) {
        const n = Number(match[1]);
        minutes = match[2].startsWith("day") ? n * 1440 : match[2].startsWith("hour") ? n * 60 : n;
      }
    }
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ACTION,
      confidence: 0.9,
      intent: "schedule_reminder",
      tool: "scheduleReminder",
      toolArguments: { minutes },
      reason: "reminder_lead",
    });
  }
  if (/\b(show|list|view)\s+(my\s+)?reminders\b/i.test(text)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ANALYSIS,
      confidence: 0.9,
      intent: "get_upcoming_tasks",
      tool: "getUpcomingTasks",
      reason: "view_reminders",
    });
  }
  if (/\bremind me\b/i.test(text) && !/\bto\b/i.test(text)) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.68,
      intent: "schedule_reminder",
      reason: "missing_title",
    });
  }
  return null;
}

function classifyRequest(text, options = {}) {
  const prepared = prepareMessage(text);
  const raw = prepared.text;
  const now = options.now || new Date();
  const pending = options.pending || null;
  const lastReferent = options.lastReferent || pending || null;
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

  if (/^(hi|hello|hey|yo|thanks|thank you|thx)\b/i.test(raw)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ACTION,
      confidence: 0.97,
      intent: "chat",
      allowTaskTool: false,
      reason: "smalltalk",
    });
  }

  if (/^(help|what can you do|how does this work)(\s*[?.!]*)?$/i.test(raw)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_ACTION,
      confidence: 0.97,
      intent: "help",
      allowTaskTool: false,
      reason: "help",
    });
  }

  if (/^(log\s*out|sign\s*out)\s*$/i.test(raw)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      confidence: 0.95,
      intent: "logout",
      reason: "logout",
    });
  }

  if (/\b(delete|remove).+\b(all|every)\b/i.test(raw)) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.72,
      intent: "delete_task",
      reason: "bulk_delete",
    });
  }

  if (isOutOfScope(raw)) {
    const generalMode = inferGeneralMode(raw) || MODE.GENERAL_QA;
    return classified({
      route: ROUTE.UNSUPPORTED,
      mode: generalMode,
      confidence: 0.9,
      intent: "unknown",
      allowTaskTool: false,
      reason: isVague(raw) ? "vague" : isNarrative(raw) ? "narrative" : "open_domain",
      draft: isVague(raw) || isNarrative(raw) ? entitiesFrom(raw, now) : {},
    });
  }

  if (pending?.intent === "create_task" && isTimeOnly(raw)) {
    const time = parseTimeToken(raw);
    const base = pending.toolArguments?.Date ? new Date(pending.toolArguments.Date) : new Date(now);
    if (Number.isFinite(time.hours)) base.setHours(time.hours, time.minutes || 0, 0, 0);
    return classified({
      route: ROUTE.DETERMINISTIC,
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

  const viewed = detectView(raw);
  if (viewed) return viewed;

  const reminder = detectReminder(raw, now);
  if (reminder) return reminder;

  const mutated = detectMutation(raw, now, lastReferent, selectedTaskId);
  if (mutated) return mutated;

  if (/^(please\s+)?(create|add|new)\s+(a\s+)?(task|todo)?\s*$/i.test(raw)) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.9,
      intent: "create_task",
      reason: "missing_title",
    });
  }

  if (commandCreate(raw) || /^(please\s+)?(add|create)\b/i.test(raw)) {
    return classifiedCreate(raw, now, commandCreate(raw) ? 0.94 : 0.86);
  }

  if (PRONOUN.test(raw) && /\b(move|delete|complete|make)\b/i.test(raw) && !lastReferent?.id && !lastReferent?.query && !selectedTaskId) {
    return classified({
      route: ROUTE.CLARIFICATION_REQUIRED,
      mode: MODE.CLARIFICATION,
      confidence: 0.42,
      intent: "reschedule_task",
      reason: "ambiguous_reference",
    });
  }

  if (looksConversational(raw) && TASK_SCOPE.test(raw)) {
    return classified({
      route: ROUTE.DETERMINISTIC,
      mode: MODE.TASK_PLANNING,
      confidence: 0.82,
      intent: "get_daily_summary",
      tool: "getDailySummary",
      reason: "planning_language",
    });
  }

  return classified({
    route: ROUTE.UNSUPPORTED,
    mode: MODE.UNSUPPORTED,
    confidence: 0.35,
    intent: "unknown",
    allowTaskTool: false,
    reason: "unmatched",
    draft: entitiesFrom(raw, now),
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
