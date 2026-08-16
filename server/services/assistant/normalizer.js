const { correctTypos } = require("./fuzzy");

const REPLACEMENTS = [
  [/\bplz\b/g, "please"],
  [/\bpls\b/g, "please"],
  [/\btmrw?\b/g, "tomorrow"],
  [/\btomorow\b/g, "tomorrow"],
  [/\bappt\b/g, "appointment"],
  [/\btodos\b/g, "tasks"],
  [/\btodo\b/g, "task"],
  [/\bto-dos\b/g, "tasks"],
  [/\bto-do\b/g, "task"],
  [/\bwhat's\b/g, "what is"],
  [/\bwhats\b/g, "what is"],
  [/\bwho's\b/g, "who is"],
  [/\bwhos\b/g, "who is"],
  [/\bdon't\b/g, "do not"],
  [/\bdont\b/g, "do not"],
  [/\bcan't\b/g, "cannot"],
  [/\bcant\b/g, "cannot"],
  [/\bwon't\b/g, "will not"],
  [/\bwont\b/g, "will not"],
  [/\bi'm\b/g, "i am"],
  [/\blet's\b/g, "let us"],
  [/\bhigh-priority\b/g, "high priority"],
  [/\blow-priority\b/g, "low priority"],
];

function normalizeText(input) {
  let text = String(input || "").toLowerCase();
  text = text.replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"');
  text = text.replace(/[_*#]+/g, " ");
  text = text.replace(/[!,.;]+/g, " ");
  text = text.replace(/\s+/g, " ").trim();
  REPLACEMENTS.forEach(([pattern, value]) => {
    text = text.replace(pattern, value);
  });
  return text.replace(/\s+/g, " ").trim();
}

function prepareMessage(input) {
  const original = String(input || "").trim();
  const normalized = normalizeText(original);
  const corrected = correctTypos(normalized);
  return {
    original,
    normalized,
    corrected,
    text: corrected || normalized,
  };
}

module.exports = {
  normalizeText,
  prepareMessage,
};
