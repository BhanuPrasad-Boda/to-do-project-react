import { parseNaturalTask } from "../utils/taskParser";
import { breakdownTask } from "./taskBreakdown";
import { formatTaskPreview } from "./assistantVoice";

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

export function matchTasks(todos = [], query = "") {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return [];
  return todos.filter((task) => String(task.Title || "").toLowerCase().includes(q));
}

function strip(text, patterns) {
  let next = String(text || "");
  patterns.forEach((pattern) => {
    next = next.replace(pattern, " ");
  });
  return next.replace(/\s+/g, " ").trim();
}

function taskLine(task) {
  const due = formatDue(task.Date);
  return `${task.Title}${due ? ` · ${due}` : ""}${task.Priority ? ` · ${task.Priority}` : ""}`;
}

function recommendToday(ctx) {
  const pool = [...(ctx.overdue || []), ...(ctx.today || [])];
  return (
    pool.find((task) => task.Priority === "High") ||
    ctx.firstOverdue ||
    ctx.nextDueSoon ||
    ctx.today?.[0] ||
    null
  );
}

function lowPrioritySoon(ctx) {
  const limit = ctx.now.getTime() + 36 * 60 * 60 * 1000;
  return (ctx.todos || []).filter((task) => {
    if (task.completed || task.Priority !== "Low" || !task.Date) return false;
    const due = new Date(task.Date).getTime();
    return due <= limit;
  });
}

const CREATE_STRIP = [
  /^(please\s+)?(create|add|make)\s+(a\s+)?(task|todo|to-do)?\s*(to|for)?\s*/i,
  /^remind me to\s+/i,
  /^i need to\s+/i,
];

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

function unknownReply(draft = {}) {
  return {
    text: UNKNOWN_TEXT,
    mood: "confused",
    items: UNKNOWN_ITEMS,
    draft,
    actions: [
      { id: "try-again", label: "Try again", variant: "primary" },
      { id: "add-manually", label: "Add manually" },
    ],
  };
}

function isOutOfScope(q) {
  if (/\b(task|tasks|todo|overdue|today|plan my day|reminder|appointment|notification|priority)\b/.test(q)) {
    if (!/^(what is|who is|explain|define|tell me a joke|write (a |an )?(essay|poem|story))/.test(q)) return false;
  }
  if (/\b(that thing|this thing|handle that|i was thinking|was cancelled|tell me a joke|quantum physics|machine learning)\b/.test(q)) {
    return true;
  }
  return /^(what is|who is|explain|define|tell me a joke|write (a |an )?(essay|poem|story|email))/.test(q);
}

export function interpretCompanionQuery(text, ctx = {}) {
  const raw = String(text || "").trim();
  const q = raw.toLowerCase();

  if (isOutOfScope(q)) {
    return unknownReply();
  }

  if (!q || /^(hi|hello|hey|yo)\b/.test(q)) {
    return {
      text: "Hello. I'm TaskFlow Assistant. I work from your live tasks. Tell me what you need in plain language.",
      mood: "helping",
    };
  }

  if (/^(thanks|thank you|thx)\b/.test(q)) {
    return {
      text: "You're welcome. I'll be here when the next decision comes up.",
      mood: "happy",
    };
  }

  if (/^(help|what can you do|how does this work)\b/.test(q) || /\b(explain this feature|companion)\b/.test(q)) {
    const map = {
      create: "Describe the work in one sentence. I'll extract the title, due time, priority, and category before I create anything.",
      plan: "Daily plan is your schedule. I can sequence today's work from deadlines and priority.",
      overdue: "Overdue items stay in your list until you complete or move them. I won't change dates unless you confirm.",
      settings: "You can mute proactive tips or replay the product tour without resetting your tasks.",
      notifications: "Reminders fire from each deadline and your reminder lead time. I can explain a ping or change that window.",
      dashboard: "This is your workspace. I can capture tasks, surface overdue work, and recommend what to do next.",
    };
    return {
      text:
        map[ctx.route] ||
        "I can plan your day, break a project into tasks, complete or reschedule work, and explain your productivity — always from your TaskFlow data.",
      mood: "helping",
      actions: [
        { id: "plan", label: "Plan my day" },
        { id: "today-tasks", label: "What should I do?" },
        { id: "create", label: "New task" },
      ],
    };
  }

  if (/\b(break|split|smaller tasks|subtasks?)\b/.test(q) || (/^i need to\b/.test(q) && q.length > 18)) {
    const topic = strip(raw, [/^i need to\s+/i, /^(please\s+)?(break|split)\s+(this|it|that)?\s*(into|down)?\s*/i]);
    const plan = breakdownTask(topic || raw);
    return {
      text: `I can break this into a sequence for “${plan.title}”. Review the steps, then I’ll create them as separate tasks.`,
      mood: "helping",
      items: plan.items,
      tool: {
        name: "createSubtasks",
        payload: { tasks: plan.items },
        needsConfirm: true,
        confirmLabel: `Create ${plan.items.length} tasks`,
        cancelLabel: "Cancel",
      },
      actions: [
        { id: "confirm-tool", label: `Create ${plan.items.length} tasks`, variant: "primary" },
        { id: "dismiss", label: "Cancel" },
      ],
    };
  }

  if (/\b(delete|remove)\b/.test(q)) {
    const query = strip(raw, [/\b(please\s+)?(delete|remove)\b/gi, /\b(the\s+)?(task|todo)\b/gi]);
    const matches = matchTasks(ctx.todos, query);
    if (matches.length > 1) {
      return {
        text: "I found more than one match. Tell me the exact title so I don’t delete the wrong task.",
        mood: "warning",
        items: matches.slice(0, 5).map((task) => ({ title: task.Title })),
      };
    }
    const task = matches[0];
    if (!task) {
      return {
        text: query
          ? `I don’t see a task you own named “${query}”. Check the title and try again.`
          : "Which task should I delete? Include the title so I can verify ownership.",
        mood: "helping",
      };
    }
    return {
      text: `This will permanently delete “${task.Title}”. I’ll only proceed if you confirm.`,
      mood: "warning",
      taskId: task.Appointment_Id,
      tool: {
        name: "deleteTask",
        payload: { id: task.Appointment_Id },
        needsConfirm: true,
        confirmLabel: "Delete task",
        cancelLabel: "Cancel",
      },
      actions: [
        { id: "confirm-tool", label: "Delete task", variant: "danger" },
        { id: "dismiss", label: "Cancel" },
      ],
    };
  }

  if (/\b(complete|completed|mark .* done|finish)\b/.test(q) && !/\bhow many\b/.test(q)) {
    const query = strip(raw, [
      /\b(please\s+)?(mark|complete|finish)\b/gi,
      /\b(the|as|completed|done|task)\b/gi,
    ]);
    const matches = matchTasks(ctx.todos.filter((task) => !task.completed), query);
    const task = matches[0] || recommendToday(ctx);
    if (!task) {
      return { text: "You're clear — nothing left to complete.", mood: "happy", actions: [{ id: "create", label: "New task" }] };
    }
    if (matches.length > 1) {
      return {
        text: "I found more than one match. Tell me the exact title to mark complete.",
        mood: "helping",
        items: matches.slice(0, 5).map((item) => ({ title: item.Title })),
      };
    }
    return {
      text: `I’ll mark “${task.Title}” complete. Confirm and I’ll update it.`,
      mood: "helping",
      taskId: task.Appointment_Id,
      tool: {
        name: "completeTask",
        payload: { id: task.Appointment_Id, confirm: true },
        needsConfirm: false,
      },
      actions: [
        { id: "confirm-tool", label: "Complete", variant: "primary" },
        { id: "dismiss", label: "Not now" },
      ],
    };
  }

  if (/\b(create|add|new task|make a task|remind me to)\b/.test(q)) {
    const rest = strip(raw, CREATE_STRIP);
    if (!rest || rest.length < 3) {
      return {
        text: "Tell me what to add — for example, “Submit the report tomorrow at 5 PM”. I’ll draft it before creating anything.",
        mood: "helping",
        actions: [{ id: "create", label: "Create a task" }],
      };
    }
    const parsed = parseNaturalTask(rest, ctx.now);
    return {
      text: `I drafted this from what you said:\n\n${formatTaskPreview(parsed, formatDue)}\n\nI’ll create it once you confirm.`,
      mood: "helping",
      tool: {
        name: "createTask",
        payload: {
          text: rest,
          Title: parsed.title,
          Date: parsed.dueDate,
          Priority: parsed.priority,
          category: parsed.category,
        },
        needsConfirm: true,
        confirmLabel: "Create task",
        cancelLabel: "Cancel",
      },
      actions: [
        { id: "confirm-tool", label: "Create task", variant: "primary" },
        { id: "create", label: "Edit details" },
        { id: "dismiss", label: "Cancel" },
      ],
    };
  }

  if (/overdue|late|past due|what's overdue|whats overdue/.test(q)) {
    return {
      text: ctx.counts.overdue
        ? `I reviewed your list. ${ctx.counts.overdue} overdue task${
            ctx.counts.overdue === 1 ? " is" : "s are"
          } past ${ctx.counts.overdue === 1 ? "its" : "their"} deadline. I can open them or move them into the next open slot.`
        : "Nothing is overdue. Your dated work is still on track.",
      mood: ctx.counts.overdue ? "warning" : "happy",
      items: (ctx.overdue || []).slice(0, 5).map((task) => ({ title: taskLine(task) })),
      actions: ctx.counts.overdue
        ? [
            { id: "show-overdue", label: "View tasks" },
            { id: "catch-up", label: "Line up leftovers", variant: "primary" },
            { id: "dismiss", label: "Not now" },
          ]
        : [{ id: "dismiss", label: "Thanks" }],
    };
  }

  if (/\b(today|finish today|need to finish|work on today)\b/.test(q) && !/\bmost productive\b/.test(q)) {
    const next = recommendToday(ctx);
    const reason = next
      ? next.Priority === "High" || ctx.firstOverdue === next
        ? `I'd start with “${next.Title}” — highest urgency${
            next.Date ? `, due ${formatDue(next.Date)}` : ""
          }.`
        : `I'd start with “${next.Title}”.`
      : "Your day looks clear. We can add work or look ahead.";
    return {
      text: ctx.counts.today
        ? `You have ${ctx.counts.today} task${ctx.counts.today === 1 ? "" : "s"} today. ${reason}`
        : reason,
      mood: next ? "helping" : "happy",
      taskId: next?.Appointment_Id,
      items: (ctx.today || []).slice(0, 6).map((task) => ({ title: taskLine(task) })),
      actions: next
        ? [
            { id: "view-soon", label: "Start task", variant: "primary" },
            { id: "plan", label: "Plan my day" },
            { id: "view-tasks", label: "View tasks" },
          ]
        : [{ id: "create", label: "Create a task" }],
    };
  }

  if (/\b(upcoming|next up|later this week)\b/.test(q)) {
    const upcoming = (ctx.todos || [])
      .filter((task) => !task.completed && task.Date && new Date(task.Date) >= ctx.now)
      .sort((a, b) => new Date(a.Date) - new Date(b.Date))
      .slice(0, 6);
    return {
      text: upcoming.length
        ? "Here’s what comes next on your calendar, ordered by deadline."
        : "No upcoming dated tasks. I can add one if you tell me the work and when it’s due.",
      mood: "helping",
      items: upcoming.map((task) => ({ title: taskLine(task) })),
      actions: [{ id: "plan", label: "Plan my day" }],
    };
  }

  if (/\bhigh[- ]priority\b|\burgent\b/.test(q)) {
    const high = (ctx.todos || []).filter((task) => !task.completed && task.Priority === "High");
    return {
      text: high.length
        ? `You have ${high.length} high-priority task${high.length === 1 ? "" : "s"} still open. These should not wait.`
        : "No high-priority work is open right now.",
      mood: high.length ? "reminder" : "happy",
      items: high.slice(0, 6).map((task) => ({ title: taskLine(task) })),
      actions: [{ id: "view-tasks", label: "View tasks" }, { id: "filter-high", label: "Show high priority" }],
    };
  }

  if (/\b(move|reschedule|catch up)\b/.test(q) || /\bto monday\b/.test(q)) {
    if (/\b(overdue|leftover|all)\b/.test(q) || (!matchTasks(ctx.todos, strip(raw, [/\b(move|reschedule)\b/gi])).length && ctx.counts.overdue)) {
      return {
        text: ctx.counts.overdue
          ? `You have leftover work from earlier days. I’ll line ${ctx.counts.overdue === 1 ? "it" : "them"} into the next open slot only if you confirm.`
          : "Nothing needs rescheduling. Your dates still look current.",
        mood: "helping",
        tool: ctx.counts.overdue
          ? {
              name: "catchUpOverdue",
              payload: {},
              needsConfirm: true,
              confirmLabel: "Line up",
            }
          : null,
        actions: ctx.counts.overdue
          ? [
              { id: "confirm-tool", label: "Line up", variant: "primary" },
              { id: "show-overdue", label: "View tasks" },
              { id: "dismiss", label: "Not now" },
            ]
          : [{ id: "dismiss", label: "Okay" }],
      };
    }
    const query = strip(raw, [/\b(please\s+)?(move|reschedule)\b/gi, /\bmy\b/gi, /\bto\b.+$/i]);
    const parsed = parseNaturalTask(raw, ctx.now);
    const matches = matchTasks(ctx.todos, query);
    const task = matches[0];
    if (!task || !parsed.dueDate) {
      return {
        text: "Tell me which task to move and when — for example, “Move report to Monday”. I’ll confirm before changing the deadline.",
        mood: "helping",
      };
    }
    return {
      text: `I’ll move “${task.Title}” to ${formatDue(parsed.dueDate)}. Confirm if that date is correct.`,
      mood: "helping",
      taskId: task.Appointment_Id,
      tool: {
        name: "rescheduleTask",
        payload: { id: task.Appointment_Id, Date: parsed.dueDate },
        needsConfirm: true,
        confirmLabel: "Reschedule",
      },
      actions: [
        { id: "confirm-tool", label: "Reschedule", variant: "primary" },
        { id: "dismiss", label: "Keep current" },
      ],
    };
  }

  if (/why did i get this reminder|why .* reminder/.test(q)) {
    const minutes = Number(ctx.prefs?.defaultReminderMinutes ?? 30);
    const label = minutes === 1440 ? "one day" : minutes >= 60 ? `${minutes / 60} hours` : `${minutes} minutes`;
    const task = ctx.nextDueSoon || ctx.today?.[0];
    return {
      text: task
        ? `That reminder was scheduled ${label} before “${task.Title}”${task.Date ? ` (${formatDue(task.Date)})` : ""}. I use your notification lead time, not a guess.`
        : `Reminders fire ${label} before a task deadline, based on your settings.`,
      mood: "helping",
    };
  }

  if (/remind me/.test(q)) {
    let minutes = 30;
    if (/\bone day|1 day|24 hours\b/.test(q)) minutes = 1440;
    else if (/\b(an |one )?hour\b/.test(q)) minutes = 60;
    else {
      const match = q.match(/(\d+)\s*(minute|hour|day)/);
      if (match) {
        const n = Number(match[1]);
        minutes = match[2].startsWith("day") ? n * 1440 : match[2].startsWith("hour") ? n * 60 : n;
      }
    }
    const label = minutes === 1440 ? "one day" : minutes >= 60 ? `${minutes / 60} hour${minutes === 60 ? "" : "s"}` : `${minutes} minutes`;
    return {
      text: `I’ll use a ${label} reminder for important tasks. Confirm and I’ll save that as your default.`,
      mood: "helping",
      tool: {
        name: "scheduleReminder",
        payload: { minutes, confirm: true },
        needsConfirm: false,
      },
      actions: [
        { id: "confirm-tool", label: "Save reminder", variant: "primary" },
        { id: "dismiss", label: "Keep current" },
      ],
    };
  }

  if (/plan|priorit|schedule|what should i|organize/.test(q)) {
    const next = recommendToday(ctx);
    const risky = lowPrioritySoon(ctx)[0];
    if (risky) {
      return {
        text: `“${risky.Title}” is due ${formatDue(risky.Date)} but still marked Low. I’d raise it to High so it doesn’t get buried. Confirm if you want that change.`,
        mood: "reminder",
        taskId: risky.Appointment_Id,
        tool: {
          name: "setPriority",
          payload: { id: risky.Appointment_Id, Priority: "High" },
          needsConfirm: true,
          confirmLabel: "Change priority",
        },
        actions: [
          { id: "confirm-tool", label: "Change priority", variant: "primary" },
          { id: "dismiss", label: "Keep current" },
          { id: "plan", label: "Plan my day" },
        ],
      };
    }
    return {
      text: ctx.counts.today
        ? `You have ${ctx.counts.today} task${ctx.counts.today === 1 ? "" : "s"} today.${
            next ? ` I’d start with “${next.Title}”.` : ""
          }`
        : "No dated work for today. Tell me what to add and I’ll draft a task.",
      mood: "helping",
      taskId: next?.Appointment_Id,
      actions: [
        { id: "plan", label: "Plan my day" },
        { id: "create", label: "Create a task" },
        ...(next ? [{ id: "view-soon", label: "Start task" }] : []),
      ],
    };
  }

  if (/productiv|stats|progress|this week|this month|which days|streak/.test(q)) {
    const weekly = ctx.weekly || 0;
    const monthly = Number(ctx.stats?.progress?.monthly || 0);
    const streak = ctx.stats?.productivity?.streak || 0;
    const day = ctx.stats?.productivity?.mostProductiveDay;
    const completed = ctx.stats?.productivity?.completedTotal;
    return {
      text: [
        `Based on your data, this week is ${weekly}% complete`,
        Number.isFinite(completed) ? `you've closed ${completed} task${completed === 1 ? "" : "s"} in total` : null,
        day ? `${day} is your strongest day` : null,
        streak ? `current streak is ${streak} day${streak === 1 ? "" : "s"}` : null,
        Number.isFinite(monthly) ? `this month sits at ${monthly}%` : null,
      ]
        .filter(Boolean)
        .join(". ") + ".",
      mood: weekly >= 50 ? "happy" : "helping",
      actions: [{ id: "view-productivity", label: "View productivity" }],
    };
  }

  if (/^find\b|\bsearch\b|\bshow .*task/.test(q)) {
    const query = strip(raw, [/\b(find|search|show me|show)\b/gi, /\b(the\s+)?(task|tasks)\b/gi]);
    const matches = matchTasks(ctx.todos, query);
    return {
      text: matches.length
        ? `I found ${matches.length} matching task${matches.length === 1 ? "" : "s"} in your list.`
        : `No tasks you own match “${query}”.`,
      mood: "helping",
      items: matches.slice(0, 6).map((task) => ({ title: taskLine(task) })),
      actions: [{ id: "view-tasks", label: "View tasks" }],
    };
  }

  const parsed = parseNaturalTask(raw, ctx.now);
  const looksLikeTask =
    parsed?.title &&
    raw.length >= 8 &&
    !/\?$/.test(raw) &&
    !isOutOfScope(q) &&
    /^(please\s+)?(create|add|make|schedule|remind me|remember)\b/.test(q);
  if (looksLikeTask) {
    return {
      text: `I can add this as a task:\n\n${formatTaskPreview(parsed, formatDue)}\n\nConfirm and I’ll create it in your list.`,
      mood: "helping",
      tool: {
        name: "createTask",
        payload: {
          text: raw,
          Title: parsed.title,
          Date: parsed.dueDate,
          Priority: parsed.priority,
          category: parsed.category,
        },
        needsConfirm: true,
        confirmLabel: "Create task",
      },
      actions: [
        { id: "confirm-tool", label: "Create task", variant: "primary" },
        { id: "create", label: "Edit details" },
        { id: "dismiss", label: "Not a task" },
      ],
    };
  }

  return unknownReply();
}

export const ASSISTANT_SHORTCUTS = [
  { id: "today-tasks", label: "What should I do today?" },
  { id: "plan", label: "Plan my day" },
  { id: "show-overdue", label: "What's overdue?" },
  { id: "create", label: "Create a task" },
  { id: "productivity", label: "How was my week?" },
];
