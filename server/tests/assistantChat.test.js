const { describe, it, beforeEach } = require("node:test");
const assert = require("node:assert/strict");
const { handleAssistantChat, UNKNOWN_TEXT } = require("../services/assistantChat");
const { resetMemory } = require("../services/assistantMemory");
const { resetMetrics, snapshot } = require("../services/ai/aiMetrics");
const { allow } = require("../middleware/rateLimiter");
const { requireConfirm } = require("../services/assistantTools");

const user = { UserId: "user-1", UserName: "Ada" };

describe("deterministic assistant chat", () => {
  beforeEach(() => {
    resetMemory();
    resetMetrics();
  });

  it("completes an explicit task id without calling an external model", async () => {
    let called = null;
    const result = await handleAssistantChat(
      { user, message: "complete task 123" },
      {
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

  it("plans the day locally instead of calling an AI provider", async () => {
    let called = null;
    const result = await handleAssistantChat(
      { user, message: "Help me plan my day around my 2 PM meeting." },
      {
        runTool: async (_user, tool) => {
          called = tool;
          return { ok: true, message: "Here is your plan." };
        },
      }
    );
    assert.equal(result.usedAi, false);
    assert.equal(called, "getDailySummary");
    assert.equal(snapshot().aiRequests, 0);
  });

  it("never trusts an unknown tool name from the parser", async () => {
    let ran = false;
    const result = await handleAssistantChat(
      { user, message: "tell me a joke" },
      {
        runTool: async () => {
          ran = true;
          return { ok: true };
        },
      }
    );
    assert.equal(ran, false);
    assert.equal(result.text, UNKNOWN_TEXT);
    assert.ok(result.actions.some((item) => item.id === "try-again"));
    assert.ok(result.actions.some((item) => item.id === "add-manually"));
  });

  it("does not treat an unauthorized task id as owned", async () => {
    const result = await handleAssistantChat(
      { user, message: "complete task 999" },
      {
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

  it("does not answer open-domain questions or run tools for them", async () => {
    let ran = false;
    for (const message of ["What is React?", "explain React", "what is quantum physics?"]) {
      const result = await handleAssistantChat(
        { user, message },
        {
          runTool: async () => {
            ran = true;
            return { ok: true };
          },
        }
      );
      assert.equal(ran, false, message);
      assert.equal(result.tool, null, message);
      assert.equal(result.mood, "confused", message);
      assert.ok(result.actions.some((item) => item.id === "add-manually"), message);
    }
  });

  it("does not delete a task when the user asks a hypothetical", async () => {
    let ran = false;
    const result = await handleAssistantChat(
      { user, message: "What would happen if I deleted my task?" },
      {
        runTool: async () => {
          ran = true;
          return { ok: true };
        },
      }
    );
    assert.equal(ran, false);
    assert.equal(result.tool, null);
    assert.equal(result.mood, "confused");
  });

  it("remembers the previous task for it/that follow-ups", async () => {
    await handleAssistantChat(
      { user, message: "Add a task to finish the presentation." },
      {
        runTool: async () => ({ ok: true }),
      }
    );
    const moved = await handleAssistantChat(
      { user, message: "Move it to tomorrow." },
      {
        now: new Date("2026-08-16T09:00:00"),
        runTool: async () => ({ ok: true }),
      }
    );
    assert.equal(moved.tool?.name, "rescheduleTask");
    assert.equal(moved.tool.needsConfirm, true);
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
