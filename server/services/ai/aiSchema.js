const { TOOLS } = require("../assistantTools");

const ALLOWED_INTENTS = new Set([
  "create_task",
  "complete_task",
  "delete_task",
  "update_task",
  "reschedule_task",
  "set_priority",
  "get_tasks",
  "get_today_tasks",
  "get_overdue_tasks",
  "get_upcoming_tasks",
  "search_tasks",
  "get_productivity",
  "schedule_reminder",
  "create_subtasks",
  "catch_up_overdue",
  "apply_plan",
  "get_daily_summary",
  "get_notifications",
  "mark_notification_read",
  "clarify",
  "chat",
  "open_notifications",
  "logout",
  "general_qa",
  "general_writing",
  "general_explanation",
  "current_information",
]);

const INTENT_TO_TOOL = {
  create_task: "createTask",
  complete_task: "completeTask",
  delete_task: "deleteTask",
  update_task: "updateTask",
  reschedule_task: "rescheduleTask",
  set_priority: "setPriority",
  get_tasks: "getTasks",
  get_today_tasks: "getTodayTasks",
  get_overdue_tasks: "getOverdueTasks",
  get_upcoming_tasks: "getUpcomingTasks",
  search_tasks: "searchTasks",
  get_productivity: "getProductivityStats",
  schedule_reminder: "scheduleReminder",
  create_subtasks: "createSubtasks",
  catch_up_overdue: "catchUpOverdue",
  apply_plan: "applyPlan",
  get_daily_summary: "getDailySummary",
  get_notifications: "getNotifications",
  mark_notification_read: "markNotificationRead",
};

const UI_INTENTS = new Set([
  "clarify",
  "chat",
  "open_notifications",
  "logout",
  "general_qa",
  "general_writing",
  "general_explanation",
  "current_information",
]);

const SEARCH_TOOL = "searchWeb";
const GENERAL_INTENTS = new Set([
  "general_qa",
  "general_writing",
  "general_explanation",
  "current_information",
]);

const ALLOWED_ARG_KEYS = new Set([
  "id",
  "query",
  "text",
  "Title",
  "Date",
  "Priority",
  "category",
  "completed",
  "priority",
  "search",
  "minutes",
  "tasks",
  "unreadOnly",
]);

const DESTRUCTIVE_TOOLS = new Set([
  "deleteTask",
  "catchUpOverdue",
  "applyPlan",
  "createSubtasks",
  "updateTask",
  "rescheduleTask",
  "setPriority",
  "createTask",
  "scheduleReminder",
]);

function parseJsonObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end + 1));
  } catch {
    return null;
  }
}

function sanitizeToolArguments(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const out = {};
  for (const key of Object.keys(source)) {
    if (!ALLOWED_ARG_KEYS.has(key)) continue;
    const value = source[key];
    if (value == null) continue;
    if (key === "id") {
      const id = Number(value);
      if (Number.isFinite(id)) out.id = id;
      continue;
    }
    if (key === "minutes") {
      const minutes = Number(value);
      if (Number.isFinite(minutes)) out.minutes = minutes;
      continue;
    }
    if (key === "completed" || key === "unreadOnly") {
      out[key] = Boolean(value);
      continue;
    }
    if (key === "tasks" && Array.isArray(value)) {
      out.tasks = value
        .map((item) => (typeof item === "string" ? { title: item } : { title: String(item?.title || "").trim() }))
        .filter((item) => item.title)
        .slice(0, 8);
      continue;
    }
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      out[key] = value;
    }
  }
  return out;
}

function validateAiOutput(raw, options = {}) {
  const allowTaskTools = options.allowTaskTools !== false;
  const parsed = parseJsonObject(raw);
  if (!parsed) return { ok: false, reason: "malformed" };

  const intent = String(parsed.intent || "").trim();
  if (!ALLOWED_INTENTS.has(intent)) return { ok: false, reason: "unknown_intent" };

  const confidence = Number(parsed.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    return { ok: false, reason: "bad_confidence" };
  }

  let tool = parsed.tool || INTENT_TO_TOOL[intent] || null;
  if (tool === SEARCH_TOOL) {
    tool = SEARCH_TOOL;
  } else if (tool && !TOOLS.includes(tool)) {
    return { ok: false, reason: "unknown_tool" };
  }

  if (!allowTaskTools && tool && tool !== SEARCH_TOOL) {
    tool = null;
  }
  if (GENERAL_INTENTS.has(intent) && tool && tool !== SEARCH_TOOL) {
    tool = null;
  }

  const response = String(parsed.response || parsed.message || "").trim();
  if (!response && tool !== SEARCH_TOOL) return { ok: false, reason: "empty_response" };

  return {
    ok: true,
    value: {
      intent,
      confidence,
      requiresConfirmation: parsed.requires_confirmation === true || parsed.requiresConfirmation === true,
      entities: parsed.entities && typeof parsed.entities === "object" ? parsed.entities : {},
      tool: UI_INTENTS.has(intent) && tool !== SEARCH_TOOL ? null : tool,
      toolArguments: sanitizeToolArguments(parsed.toolArguments || parsed.entities),
      response: response || "I need current sources before I can answer that.",
    },
  };
}

module.exports = {
  ALLOWED_INTENTS,
  INTENT_TO_TOOL,
  UI_INTENTS,
  DESTRUCTIVE_TOOLS,
  SEARCH_TOOL,
  GENERAL_INTENTS,
  sanitizeToolArguments,
  parseJsonObject,
  validateAiOutput,
};
