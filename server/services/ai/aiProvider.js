const { createGeminiProvider } = require("./geminiProvider");
const { TOOLS } = require("../assistantTools");

function createUnavailableProvider(name = "none") {
  return {
    name,
    model: "",
    isAvailable() {
      return false;
    },
    async interpret() {
      const error = new Error("AI_NOT_CONFIGURED");
      error.status = 503;
      throw error;
    },
  };
}

function getAiProvider(env = process.env) {
  const name = String(env.AI_PROVIDER || "gemini").trim().toLowerCase();
  if (name === "none" || name === "off") return createUnavailableProvider(name);
  if (name === "gemini") return createGeminiProvider(env);
  return createUnavailableProvider(name);
}

function providerMeta(env = process.env) {
  const provider = getAiProvider(env);
  return {
    name: provider.name,
    model: provider.model || env.AI_MODEL || "",
    available: provider.isAvailable(),
    allowedTools: [...TOOLS],
  };
}

module.exports = { getAiProvider, providerMeta, createUnavailableProvider };
