const WEEKDAYS = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

const NUMBER_WORDS = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  twelve: 12,
};

const PRIORITY_HIGH = /\b(urgent|asap|important|critical|high priority|highest|urgent task|important task)\b/i;
const PRIORITY_LOW = /\b(low priority|lowest|someday|whenever)\b/i;
const PRIORITY_MEDIUM = /\b(medium priority|normal priority)\b/i;

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

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function nextWeekday(from, targetDow, allowToday) {
  const d = startOfDay(from);
  let diff = (targetDow + 7 - d.getDay()) % 7;
  if (diff === 0 && !allowToday) diff = 7;
  d.setDate(d.getDate() + diff);
  return d;
}

function parseCount(raw) {
  if (raw == null) return null;
  const key = String(raw).toLowerCase();
  if (NUMBER_WORDS[key] != null) return NUMBER_WORDS[key];
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function parseTimeToken(text) {
  const source = String(text || "");
  const spoken =
    source.match(/\b(\d{1,2})\s+in the (morning|afternoon|evening|night)\b/i) ||
    source.match(/\bat\s+(\d{1,2})(?::(\d{2}))?\s*(a\.?m\.?|p\.?m\.?)?\b/i) ||
    source.match(/\b(\d{1,2})(?::(\d{2}))\s*(a\.?m\.?|p\.?m\.?)\b/i) ||
    source.match(/\b(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)\b/i) ||
    source.match(/\b([01]?\d|2[0-3]):([0-5]\d)\b/);
  if (!spoken) return { hours: null, minutes: null, matched: "" };

  let hours = Number(spoken[1]);
  const minutes = spoken[2] && /^\d+$/.test(spoken[2]) ? Number(spoken[2]) : 0;
  const third = String(spoken[3] || spoken[2] || "").toLowerCase();
  const meridiem = third.replace(/\./g, "");
  const period = /morning|afternoon|evening|night/.test(meridiem) ? meridiem : "";
  const ampm = /^(am|pm)$/.test(meridiem) ? meridiem : "";

  if (period === "morning" && hours === 12) hours = 0;
  if (period === "afternoon" || period === "evening" || period === "night") {
    if (hours < 12) hours += 12;
  }
  if (ampm === "pm" && hours < 12) hours += 12;
  if (ampm === "am" && hours === 12) hours = 0;
  if (!ampm && !period && spoken[0].includes(":") === false && hours <= 7) hours += 12;
  if (hours > 23 || minutes > 59) return { hours: null, minutes: null, matched: "" };
  return { hours, minutes, matched: spoken[0] };
}

function namedClock(label) {
  if (label === "early morning") return { hours: 7, minutes: 0 };
  if (label === "late morning") return { hours: 11, minutes: 0 };
  if (label === "morning") return { hours: 9, minutes: 0 };
  if (label === "noon") return { hours: 12, minutes: 0 };
  if (label === "afternoon") return { hours: 15, minutes: 0 };
  if (label === "evening") return { hours: 18, minutes: 0 };
  if (label === "late evening") return { hours: 21, minutes: 0 };
  if (label === "night" || label === "tonight") return { hours: 20, minutes: 0 };
  if (label === "midnight") return { hours: 0, minutes: 0 };
  return null;
}

function endOfMonth(from) {
  const d = new Date(from);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(17, 0, 0, 0);
  return d;
}

function parseWhen(input, now = new Date()) {
  let text = String(input || "");
  let due = null;
  let clock = { hours: null, minutes: null };
  const timeInfo = parseTimeToken(text);
  if (timeInfo.matched) {
    clock = { hours: timeInfo.hours, minutes: timeInfo.minutes };
    text = text.replace(timeInfo.matched, " ");
  }

  const relative =
    text.match(/\b(?:in|after)\s+(\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten)\s+(minutes?|hours?|days?|weeks?|months?)\b/i) ||
    text.match(/\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s+(minutes?|hours?|days?|weeks?)\s+from now\b/i);
  if (relative) {
    const amount = parseCount(relative[1]) || 1;
    const unit = relative[2].toLowerCase();
    due = new Date(now);
    if (unit.startsWith("minute")) due.setMinutes(due.getMinutes() + amount);
    else if (unit.startsWith("hour")) due.setHours(due.getHours() + amount);
    else if (unit.startsWith("day")) due = addDays(startOfDay(now), amount);
    else if (unit.startsWith("week")) due = addDays(startOfDay(now), amount * 7);
    else due.setMonth(due.getMonth() + amount);
    text = text.replace(relative[0], " ");
  }

  const dateRules = [
    { re: /\bday after tomorrow\b/i, apply: () => addDays(startOfDay(now), 2) },
    { re: /\btomorrow morning\b/i, apply: () => applyTime(addDays(startOfDay(now), 1), 9, 0) },
    { re: /\btomorrow afternoon\b/i, apply: () => applyTime(addDays(startOfDay(now), 1), 15, 0) },
    { re: /\btomorrow evening\b/i, apply: () => applyTime(addDays(startOfDay(now), 1), 18, 0) },
    { re: /\bthis morning\b/i, apply: () => applyTime(startOfDay(now), 9, 0) },
    { re: /\bthis afternoon\b/i, apply: () => applyTime(startOfDay(now), 15, 0) },
    { re: /\bthis evening\b|\btonight\b/i, apply: () => applyTime(startOfDay(now), 20, 0) },
    { re: /\btomorrow\b/i, apply: () => addDays(startOfDay(now), 1) },
    { re: /\byesterday\b/i, apply: () => addDays(startOfDay(now), -1) },
    { re: /\btoday\b/i, apply: () => startOfDay(now) },
    {
      re: /\bcoming\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
      apply: (match) => nextWeekday(now, WEEKDAYS[match[1].toLowerCase()], false),
    },
    {
      re: /\bnext\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
      apply: (match) => nextWeekday(now, WEEKDAYS[match[1].toLowerCase()], false),
    },
    {
      re: /\b(this\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/i,
      apply: (match) => nextWeekday(now, WEEKDAYS[match[2].toLowerCase()], true),
    },
    { re: /\bstart of (the )?week\b/i, apply: () => nextWeekday(now, 1, true) },
    { re: /\bend of (the )?week\b/i, apply: () => applyTime(nextWeekday(now, 5, true), 17, 0) },
    { re: /\bweekend\b/i, apply: () => applyTime(nextWeekday(now, 6, true), 10, 0) },
    { re: /\bnext week\b/i, apply: () => applyTime(nextWeekday(now, 1, false), 9, 0) },
    { re: /\bthis week\b/i, apply: () => applyTime(nextWeekday(now, 5, true), 17, 0) },
    {
      re: /\bnext month\b/i,
      apply: () => {
        const d = startOfDay(now);
        d.setMonth(d.getMonth() + 1, 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
    { re: /\bthis month\b|\bend of (the )?month\b/i, apply: () => endOfMonth(now) },
    {
      re: /\bnext year\b/i,
      apply: () => {
        const d = startOfDay(now);
        d.setFullYear(d.getFullYear() + 1, 0, 1);
        d.setHours(9, 0, 0, 0);
        return d;
      },
    },
  ];

  if (!due) {
    for (const rule of dateRules) {
      const match = text.match(rule.re);
      if (!match) continue;
      due = rule.apply(match);
      text = text.replace(match[0], " ");
      break;
    }
  }

  if (clock.hours == null) {
    const named = text.match(
      /\b(early morning|late morning|late evening|morning|noon|afternoon|evening|night|midnight)\b/i
    );
    if (named) {
      const clockNamed = namedClock(named[1].toLowerCase());
      if (clockNamed) {
        clock = clockNamed;
        text = text.replace(named[0], " ");
      }
    }
  }

  if (due && clock.hours != null) due = applyTime(due, clock.hours, clock.minutes);
  else if (!due && clock.hours != null) {
    due = applyTime(now, clock.hours, clock.minutes);
    if (due <= now) due = addDays(due, 1);
  }

  return {
    dueDate: due,
    hours: clock.hours,
    minutes: clock.minutes,
    remainder: text.replace(/\s+/g, " ").trim(),
  };
}

function parsePriorityLabel(text) {
  const source = String(text || "");
  if (PRIORITY_HIGH.test(source) || /\b(high|highest)\s+priority\b/i.test(source) || /\bpriority\s+(high|highest)\b/i.test(source)) {
    return "High";
  }
  if (PRIORITY_LOW.test(source) || /\b(low|lowest)\s+priority\b/i.test(source)) return "Low";
  if (PRIORITY_MEDIUM.test(source)) return "Medium";
  return null;
}

function parseNaturalTask(input, now = new Date()) {
  let text = String(input || "").trim();
  const original = text;

  let priority = parsePriorityLabel(text) || "Medium";
  if (priority === "Medium" && /\b(report|deadline|presentation|client)\b/i.test(text)) {
    priority = "High";
  }
  text = text.replace(PRIORITY_HIGH, " ").replace(PRIORITY_LOW, " ").replace(PRIORITY_MEDIUM, " ");
  text = text.replace(/\b(high|low|medium)\s+priority\b/gi, " ");

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

  const when = parseWhen(text, now);
  text = when.remainder;

  const title = text.replace(/\s+/g, " ").replace(/^[-:,\s]+|[-:,\s]+$/g, "").trim() || original;

  let dueTime = null;
  if (when.dueDate && when.hours != null) {
    dueTime = when.dueDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  return {
    title,
    dueDate: when.dueDate,
    dueTime,
    priority,
    category,
    recurrence,
    reminderOffsetMinutes: when.dueDate ? 30 : null,
  };
}

function suggestReschedule(date, now = new Date()) {
  const base = date ? new Date(date) : new Date(now);
  const suggestions = [];
  const laterToday = new Date(now);
  laterToday.setHours(now.getHours() + 2, 0, 0, 0);
  if (laterToday.getHours() < 21) {
    suggestions.push({ label: "Later today", date: laterToday });
  }
  const tomorrowMorning = startOfDay(now);
  tomorrowMorning.setDate(tomorrowMorning.getDate() + 1);
  tomorrowMorning.setHours(9, 0, 0, 0);
  suggestions.push({ label: "Tomorrow morning", date: tomorrowMorning });
  const nextWeek = startOfDay(base);
  nextWeek.setDate(nextWeek.getDate() + 7);
  nextWeek.setHours(9, 0, 0, 0);
  suggestions.push({ label: "Same time next week", date: nextWeek });
  return suggestions;
}

module.exports = {
  parseNaturalTask,
  suggestReschedule,
  parseTimeToken,
  parseWhen,
  parsePriorityLabel,
  startOfDay,
};
