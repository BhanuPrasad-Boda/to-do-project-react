function polishTitle(title) {
  const text = String(title || "").replace(/\s+/g, " ").trim();
  if (!text) return text;
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function cloneDate(value, hours, minutes) {
  const next = value ? new Date(value) : new Date();
  next.setHours(hours, minutes, 0, 0);
  return next;
}

function tomorrowAt(hours, minutes) {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function naturalizeTitle(title) {
  let next = polishTitle(title);
  if (/^(call|email|text|message|contact|phone)\s+(?!the\b|a\b|an\b)/i.test(next)) {
    next = next.replace(
      /^(call|email|text|message|contact|phone)\s+/i,
      (match, verb) => `${polishTitle(verb)} the `
    );
  }
  if (/^meet\s+(?!with\b)/i.test(next)) {
    next = next.replace(/^meet\s+/i, "Meet with ");
  }
  return next;
}

function rewriteTitles(title) {
  const base = naturalizeTitle(title);
  const titles = [base];
  if (/^buy\s+/i.test(base)) titles.push(base.replace(/^buy\s+/i, "Pick up "));
  if (/^meeting\b/i.test(base) && !/^attend\b/i.test(base)) titles.push(`Attend ${base}`);
  return [...new Set(titles.filter(Boolean))];
}

function suggestionId(item) {
  const due = item.dueDate ? new Date(item.dueDate).toISOString() : "none";
  return `${item.title}|${due}|${item.priority}|${item.category}`;
}

export function toDatetimeLocal(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const offset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - offset).toISOString().slice(0, 16);
}

export function ghostSuffix(typed, suggestionTitle) {
  const a = String(typed || "");
  const b = String(suggestionTitle || "");
  if (a.length < 2 || b.length <= a.length) return "";
  if (b.toLowerCase().startsWith(a.toLowerCase())) return b.slice(a.length);
  return "";
}

export function formatSuggestionMeta(item) {
  const parts = [];
  if (item.dueDate) {
    const d = new Date(item.dueDate);
    const now = new Date();
    const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startDue = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diff = Math.round((startDue - startToday) / 86400000);
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    const hasTime = d.getHours() !== 0 || d.getMinutes() !== 0;
    let day = d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
    if (diff === 0) day = "Today";
    else if (diff === 1) day = "Tomorrow";
    parts.push(hasTime ? `${day} at ${time}` : day);
  }
  if (item.priority && item.priority !== "Medium") parts.push(`${item.priority} priority`);
  if (item.category && item.category !== "General") parts.push(item.category);
  if (item.recurrence && item.recurrence !== "none") parts.push(`Repeats ${item.recurrence}`);
  return parts.join(" · ");
}

export function generateAiSuggestions(parsed) {
  if (!parsed?.title) return [];

  const titles = rewriteTitles(parsed.title);
  const due = parsed.dueDate ? new Date(parsed.dueDate) : null;
  const datedWithoutTime = Boolean(due && due.getHours() === 0 && due.getMinutes() === 0);
  const items = [];

  const make = (title, dueDate, extra = {}) => ({
    title,
    dueDate: dueDate || null,
    dueTime: dueDate
      ? new Date(dueDate).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
      : null,
    priority: extra.priority || parsed.priority || "Medium",
    category: extra.category || parsed.category || "General",
    recurrence: parsed.recurrence || "none",
    reminderOffsetMinutes: dueDate ? parsed.reminderOffsetMinutes || 30 : null,
  });

  items.push(make(titles[0], due));

  if (titles[1] && titles[1] !== titles[0]) {
    items.push(make(titles[1], due));
  }

  if (!due) {
    items.push(make(titles[0], tomorrowAt(9, 0)));
  } else if (datedWithoutTime) {
    items.push(make(titles[0], cloneDate(due, 9, 0)));
  }

  const seen = new Set();
  return items
    .filter((item) => {
      const id = suggestionId(item);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    })
    .slice(0, 3);
}
