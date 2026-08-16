function levenshtein(a, b) {
  const left = String(a || "");
  const right = String(b || "");
  if (left === right) return 0;
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const rows = Array.from({ length: right.length + 1 }, (_, index) => {
    const row = new Array(left.length + 1);
    row[0] = index;
    return row;
  });
  for (let col = 0; col <= left.length; col += 1) rows[0][col] = col;
  for (let i = 1; i <= right.length; i += 1) {
    for (let j = 1; j <= left.length; j += 1) {
      const cost = right[i - 1] === left[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
    }
  }
  return rows[right.length][left.length];
}

const DICTIONARY = [
  "tomorrow",
  "yesterday",
  "today",
  "tonight",
  "morning",
  "afternoon",
  "evening",
  "complete",
  "completed",
  "appointment",
  "appointments",
  "reminder",
  "reminders",
  "schedule",
  "notification",
  "notifications",
  "priority",
  "calendar",
  "overdue",
  "meeting",
  "meetings",
  "important",
  "urgent",
  "delete",
  "remove",
  "reschedule",
  "please",
  "create",
  "finish",
  "finished",
  "presentation",
  "report",
  "client",
];

function maxDistance(word) {
  if (word.length < 5) return 0;
  if (word.length < 8) return 1;
  return 2;
}

function correctWord(word) {
  const clean = String(word || "").toLowerCase().replace(/[^a-z]/g, "");
  if (!clean || DICTIONARY.includes(clean)) return word;
  const limit = maxDistance(clean);
  if (!limit) return word;
  let best = null;
  let bestDistance = limit + 1;
  DICTIONARY.forEach((item) => {
    if (Math.abs(item.length - clean.length) > limit) return;
    const distance = levenshtein(clean, item);
    if (distance > 0 && distance < bestDistance && distance <= limit) {
      best = item;
      bestDistance = distance;
    }
  });
  return best || word;
}

function correctTypos(text) {
  return String(text || "")
    .split(/\s+/)
    .filter(Boolean)
    .map(correctWord)
    .join(" ");
}

module.exports = {
  levenshtein,
  correctTypos,
  correctWord,
  DICTIONARY,
};
