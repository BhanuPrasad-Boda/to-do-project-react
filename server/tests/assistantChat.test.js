const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { handleAssistantChat, FALLBACK_TEXT, GENERAL_FALLBACK, NO_LIVE_DATA } = require("../services/assistantChat");
const { resetMemory } = require("../services/assistantMemory");
const { resetMetrics, snapshot } = require("../services/ai/aiMetrics");
const { allow } = require("../middleware/rateLimiter");
const { requireConfirm } = require("../services/assistantTools");

const user = { UserId: "user-1", UserName: "Ada" };

function unavailableProvider() {
  return {
    name: "none",
    isAvailable() {
      return false;
    },
    async interpret() {
      throw new Error("AI_NOT_CONFIGURED");
    },
  };
}

function scriptedProvider(payload) {
  return {
    name: "gemini",
    isAvailable() {
      return true;
    },
    async interpret() {
      return payload;
    },
  };
}

describe("hybrid assistant chat", () => {
  beforeEach(() => {
    resetMemory();
    resetMetrics();
  });

  it("completes an explicit task id without calling AI", async () => {
    let called = null;
    const result = await handleAssistantChat(
      { user, message: "complete task 123" },
      {
        provider: unavailableProvider(),
        runTool: async (_user, tool, payload) => {
          called = { tool, payload };
          return { ok: true, message: "Nice work. “Report” is completed." };
        },
      }
    );
    assert.equal(result.usedAi, false);
    assert.equal(called.tool, "completeTask");
    assert.equal(called.payload.id, 123);
    assert.match(result.text, /completed/i);
    assert.equal(snapshot().deterministicRequests, 1);
    assert.equal(snapshot().aiRequests, 0);
  });

  it("requires confirmation before deleting", async () => {
    let ran = false;
    const result = await handleAssistantChat(
      { user, message: "delete task 123" },
      {
        provider: unavailableProvider(),
        runTool: async () => {
          ran = true;
          return { ok: true };
        },
      }
    );
    assert.equal(ran, false);
    assert.equal(result.tool.name, "deleteTask");
    assert.equal(result.tool.needsConfirm, true);
    assert.ok(result.actions.some((item) => item.id === "confirm-tool"));
    assert.equal(requireConfirm("deleteTask", result.tool.payload).requiresConfirm, true);
  });

  it("does not execute a low-confidence delete", async () => {
    let ran = false;
    const result = await handleAssistantChat(
      { user, message: "delete that" },
      {
        provider: unavailableProvider(),
        runTool: async () => {
          ran = true;
          return { ok: true };
        },
      }
    );
    assert.equal(ran, false);
    assert.match(result.text, /which task/i);
    assert.equal(result.tool, null);
  });

  it("falls back when the AI provider fails", async () => {
    const result = await handleAssistantChat(
      { user, message: "Help me plan my day around my 2 PM meeting." },
      {
        provider: {
          name: "gemini",
          isAvailable() {
            return true;
          },
          async interpret() {
            throw Object.assign(new Error("AI_PROVIDER_ERROR"), { status: 503, retryable: true });
          },
        },
        runTool: async () => ({ ok: true, message: "unused" }),
      }
    );
    assert.equal(result.usedAi, false);
    assert.equal(result.text, FALLBACK_TEXT);
    assert.equal(snapshot().aiFailures, 1);
  });

  it("rejects malformed AI output and keeps TaskFlow working", async () => {
    const result = await handleAssistantChat(
      { user, message: "Which task should I focus on first?" },
      {
        provider: scriptedProvider("<<<not json>>>"),
        runTool: async () => ({ ok: true }),
      }
    );
    assert.equal(result.usedAi, false);
    assert.equal(result.text, FALLBACK_TEXT);
  });

  it("never trusts an AI-selected unknown tool", async () => {
    let ran = false;
    const result = await handleAssistantChat(
      { user, message: "Help me organize tomorrow around my meeting." },
      {
        provider: scriptedProvider({
          intent: "create_task",
          confidence: 0.9,
          tool: "dropDatabase",
          response: "Deleted everything",
        }),
        runTool: async () => {
          ran = true;
          return { ok: true };
        },
      }
    );
    assert.equal(ran, false);
    assert.equal(result.text, FALLBACK_TEXT);
  });

  it("does not treat an unauthorized task id as owned", async () => {
    const result = await handleAssistantChat(
      { user, message: "complete task 999" },
      {
        provider: unavailableProvider(),
        runTool: async (owner, tool, payload) => {
          assert.equal(owner.UserId, "user-1");
          assert.equal(tool, "completeTask");
          if (payload.id === 999) {
            return { ok: false, status: 404, message: "I could not find a task you own with that name." };
          }
          return { ok: true, message: "unexpected" };
        },
      }
    );
    assert.match(result.text, /could not find/i);
    assert.equal(result.mood, "error");
  });

  it("answers general questions without executing TaskFlow tools", async () => {
    let ran = false;
    const result = await handleAssistantChat(
      { user, message: "What is React?" },
      {
        provider: scriptedProvider({
          intent: "create_task",
          confidence: 0.99,
          tool: "createTask",
          toolArguments: { Title: "Learn React" },
          response: "React is a JavaScript library for building user interfaces.",
        }),
        runTool: async () => {
          ran = true;
          return { ok: true };
        },
      }
    );
    assert.equal(ran, false);
    assert.equal(result.tool, null);
    assert.match(result.text, /React is a JavaScript library/i);
    assert.equal(result.mode, "GENERAL_EXPLANATION");
  });

  it("does not delete a task when the user asks a hypothetical", async () => {
    let ran = false;
    const result = await handleAssistantChat(
      { user, message: "What would happen if I deleted my task?" },
      {
        provider: scriptedProvider({
          intent: "delete_task",
          confidence: 0.95,
          tool: "deleteTask",
          toolArguments: { query: "my task" },
          response: "Deleting a task removes it from your list after you confirm.",
        }),
        runTool: async () => {
          ran = true;
          return { ok: true };
        },
      }
    );
    assert.equal(ran, false);
    assert.equal(result.tool, null);
    assert.match(result.text, /Deleting a task/i);
  });

  it("does not invent current information without a search provider", async () => {
    let ran = false;
    const result = await handleAssistantChat(
      { user, message: "What's the latest information about React 19?" },
      {
        provider: scriptedProvider({
          intent: "current_information",
          confidence: 0.9,
          response: "React 19 launched yesterday with secret APIs.",
        }),
        search: {
          name: "none",
          isAvailable() {
            return false;
          },
          async search() {
            return { available: false, reason: "not_configured", results: [] };
          },
        },
        runTool: async () => {
          ran = true;
          return { ok: true };
        },
      }
    );
    assert.equal(ran, false);
    assert.equal(result.text, NO_LIVE_DATA);
  });

  it("answers current questions from search results only", async () => {
    let ran = false;
    const result = await handleAssistantChat(
      { user, message: "What's the latest information about React 19?" },
      {
        provider: scriptedProvider({
          intent: "current_information",
          confidence: 0.9,
          tool: null,
          response: "According to sources, React 19 is generally available.",
        }),
        search: {
          name: "stub",
          isAvailable() {
            return true;
          },
          async search() {
            return {
              available: true,
              reason: "ok",
              results: [{ title: "React 19", url: "https://example.com", snippet: "React 19 is generally available." }],
            };
          },
        },
        runTool: async () => {
          ran = true;
          return { ok: true };
        },
      }
    );
    assert.equal(ran, false);
    assert.match(result.text, /generally available/i);
    assert.equal(result.mode, "CURRENT_INFORMATION");
  });

  it("uses a general fallback when AI is down for open-domain questions", async () => {
    const result = await handleAssistantChat(
      { user, message: "Write a professional email." },
      {
        provider: unavailableProvider(),
        runTool: async () => ({ ok: true }),
      }
    );
    assert.equal(result.text, GENERAL_FALLBACK);
    assert.notEqual(result.text, FALLBACK_TEXT);
  });

  it("rate-limits assistant chat keys", () => {
    const key = `assistant-chat:${user.UserId}-test`;
    let blocked = false;
    for (let i = 0; i < 21; i += 1) {
      const result = allow(key, 20, 60 * 1000);
      if (!result.ok) blocked = true;
    }
    assert.equal(blocked, true);
  });
});
