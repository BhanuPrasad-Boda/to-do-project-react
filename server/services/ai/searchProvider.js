const { allow } = require("../../middleware/rateLimiter");

const SEARCH_WINDOW_MS = 60 * 1000;
const SEARCH_MAX = 10;

function unavailable(reason = "not_configured") {
  return {
    available: false,
    reason,
    results: [],
  };
}

function sanitizeResults(items = []) {
  return items
    .map((item) => ({
      title: String(item.title || "").slice(0, 180),
      url: String(item.url || "").slice(0, 300),
      snippet: String(item.snippet || item.content || "").slice(0, 400),
    }))
    .filter((item) => item.title || item.snippet)
    .slice(0, 5);
}

function createUnavailableSearch(name = "none") {
  return {
    name,
    isAvailable() {
      return false;
    },
    async search() {
      return unavailable("not_configured");
    },
  };
}

function createTavilySearch(env = process.env) {
  const key = String(env.SEARCH_API_KEY || "").trim();
  return {
    name: "tavily",
    isAvailable() {
      return Boolean(key);
    },
    async search(query, { userId } = {}) {
      if (!key) return unavailable("not_configured");
      const limited = allow(`assistant-search:${userId || "anon"}`, SEARCH_MAX, SEARCH_WINDOW_MS);
      if (!limited.ok) return unavailable("rate_limited");

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch("https://api.tavily.com/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: key,
            query: String(query || "").slice(0, 200),
            max_results: 5,
            search_depth: "basic",
          }),
          signal: controller.signal,
        });
        if (!res.ok) return unavailable("provider_error");
        const data = await res.json().catch(() => ({}));
        return {
          available: true,
          reason: "ok",
          results: sanitizeResults(data.results || []),
        };
      } catch {
        return unavailable("provider_error");
      } finally {
        clearTimeout(timer);
      }
    },
  };
}

function getSearchProvider(env = process.env) {
  const name = String(env.SEARCH_PROVIDER || "none").trim().toLowerCase();
  if (name === "tavily") return createTavilySearch(env);
  return createUnavailableSearch(name || "none");
}

module.exports = {
  getSearchProvider,
  createUnavailableSearch,
  createTavilySearch,
  sanitizeResults,
  unavailable,
};
