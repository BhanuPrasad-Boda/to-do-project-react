const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const PRIORITY_HIGH = /\b(urgent|asap|important|high priority|critical)\b/i;
const PRIORITY_LOW = /\b(low priority|someday|whenever)\b/i;

const CATEGORY_RULES = [
  { category: "Work", pattern: /\b(report|meeting|client|presentation|project|deadline|office|email|call)\b/i },
  { category: "Health", pattern: /\b(gym|workout|exercise|doctor|medicine|water|run|yoga|health)\b/i },
  { category: "Personal", pattern: /\b(family|birthday|home|personal|friend)\b/i },
  { category: "Shopping", pattern: /\b(buy|shop|grocer|purchase|order|store)\b/i },
  { category: "Finance", pattern: /\b(invoice|pay|bill|tax|budget|bank)\b/i },
  { category: "Learning", pattern: /\b(study|read|course|homework|learn|class)\b/i },
];

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function applyTime(date, hours, minutes) {
  const d = new Date(date);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function nextWeekday(from, targetDow, allowToday) {
  const d = startOfDay(from);
  let diff = (targetDow + 7 - d.getDay()) % 7;
  if (diff === 0 && !allowToday) diff = 7;
  d.setDate(d.getDate() + diff);
  return d;
}

export function parseTimeToken(text) {
  const match =
    text.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/i) ||
    text.match(/\b(\d{1,2})(?::(\d{2}))\s*(a\.?m\.?|p\.?m\.?)\b/i) ||
    text.match(/\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b/i);
  if (!match) return { hours: null, minutes: null, matched: "" };
  let hours = Number(match[1]);
  const minutes = match[2] ? Number(match[2]) : 0;
  const meridiem = (match[3] || "").toLowerCase().replace(/\./g, "");
  if (meridiem === "pm" && hours < 12) hours += 12;
  if (meridiem === "am" && hours === 12) hours = 0;
  if (!meridiem && hours <= 7) hours += 12;
  if (hours > 23 || minutes > 59) return { hours: null, minutes: null, matched: "" };
  return { hours, minutes, matched: match[0] };
}

export function parseNaturalTask(input, now = new Date()) {
  let text = String(input || "").trim();
  const original = text;

  let priority = "Medium";
  if (PRIORITY_HIGH.test(text) || /\b(report|deadline|presentation|client)\b/i.test(text)) {
    priority = "High";
  } else if (PRIORITY_LOW.test(text)) {
    priority = "Low";
  }
  text = text.replace(PRIORITY_HIGH, " ").replace(PRIORITY_LOW, " ");

  let recurrence = "none";
  if (/\bevery\s+day\b|\bdaily\b/i.test(text)) recurrence = "daily";
  else if (/\bevery\s+weekday|\bweekdays\b/i.test(text)) recurrence = "weekdays";
  else if (/\bevery\s+week|\bweekly\b/i.test(text)) recurrence = "weekly";
  else if (/\bevery\s+month|\bmonthly\b/i.test(text)) recurrence = "monthly";
  text = text.replace(/\b(every\s+day|daily|every\s+weekday|weekdays|every\s+week|weekly|every\s+month|monthly)\b/gi, " ");

  let category = "General";
  for (const rule of CATEGORY_RULES) {
    if (rule.pattern.test(original)) {
      category = rule.category;
      break;
    }
  }

  const timeInfo = parseTimeToken(text);
  if (timeInfo.matched) {
    text = text.replace(timeInfo.matched, " ");
  }

  let due = null;
  const lower = text.toLowerCase();

  if (/\btoday\b/.test(lower)) {
    due = startOfDay(now);
    text = text.replace(/\btoday\b/gi, " ");
  } else if (/\btomorrow\b/.test(lower)) {
    due = startOfDay(now);
    due.setDate(due.getDate() + 1);
    text = text.replace(/\btomorrow\b/gi, " ");
  } else {
    const inDays = text.match(/\bin\s+(\d+)\s+days?\b/i);
    if (inDays) {
      due = startOfDay(now);
      due.setDate(due.getDate() + Number(inDays[1]));
      text = text.replace(inDays[0], " ");
    } else {
      const nextDay = text.match(/\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
      const onDay = text.match(/\b(this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i);
      if (nextDay) {
        due = nextWeekday(now, WEEKDAYS[nextDay[1].toLowerCase()], false);
        text = text.replace(nextDay[0], " ");
      } else if (onDay) {
        due = nextWeekday(now, WEEKDAYS[onDay[2].toLowerCase()], true);
        text = text.replace(onDay[0], " ");
      }
    }
  }

  if (due && timeInfo.hours !== null) {
    due = applyTime(due, timeInfo.hours, timeInfo.minutes);
  } else if (!due && timeInfo.hours !== null) {
    due = applyTime(now, timeInfo.hours, timeInfo.minutes);
    if (due <= now) due.setDate(due.getDate() + 1);
  }

  const title = text.replace(/\s+/g, " ").replace(/^[-:,\s]+|[-:,\s]+$/g, "").trim() || original;

  let dueTime = null;
  if (due && timeInfo.hours !== null) {
    dueTime = due.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  return {
    title,
    dueDate: due,
    dueTime,
    priority,
    category,
    recurrence,
    reminderOffsetMinutes: due ? 30 : null,
  };
}

export function hasSmartInsight(preview, raw = "") {
  if (!preview?.title) return false;
  if (preview.dueDate) return true;
  if (preview.priority && preview.priority !== "Medium") return true;
  if (preview.category && preview.category !== "General") return true;
  if (preview.recurrence && preview.recurrence !== "none") return true;
  return preview.title.trim() !== String(raw || "").trim();
}
