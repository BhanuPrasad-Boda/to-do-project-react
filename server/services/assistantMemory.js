const sessions = new Map();
const MAX_TURNS = 8;
const TTL_MS = 30 * 60 * 1000;

function pruneExpired(now = Date.now()) {
  for (const [key, session] of sessions) {
    if (now - session.updatedAt > TTL_MS) sessions.delete(key);
  }
}

function emptySession() {
  return {
    turns: [],
    pending: null,
    updatedAt: Date.now(),
  };
}

function getSession(userId) {
  pruneExpired();
  const key = String(userId || "");
  if (!key) return emptySession();
  const current = sessions.get(key) || emptySession();
  sessions.set(key, current);
  return current;
}

function addTurn(userId, role, text) {
  const session = getSession(userId);
  session.turns.push({ role, text: String(text || "").slice(0, 400) });
  if (session.turns.length > MAX_TURNS) {
    session.turns = session.turns.slice(-MAX_TURNS);
  }
  session.updatedAt = Date.now();
  return session;
}

function setPending(userId, pending) {
  const session = getSession(userId);
  session.pending = pending || null;
  session.updatedAt = Date.now();
  return session;
}

function clearSession(userId) {
  sessions.delete(String(userId || ""));
}

function resetMemory() {
  sessions.clear();
}

module.exports = {
  MAX_TURNS,
  getSession,
  addTurn,
  setPending,
  clearSession,
  resetMemory,
};
