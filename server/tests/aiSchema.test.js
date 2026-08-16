const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { validateAiOutput, sanitizeToolArguments } = require("../services/ai/aiSchema");

describe("AI output validation", () => {
  it("accepts a structured create-task payload", () => {
    const result = validateAiOutput({
      intent: "create_task",
      confidence: 0.96,
      requires_confirmation: true,
      entities: { title: "Finish client proposal" },
      tool: "createTask",
      toolArguments: { Title: "Finish client proposal", Date: "2026-08-17", text: "Finish client proposal" },
      response: "I've prepared the task for tomorrow at 10 AM.",
    });
    assert.equal(result.ok, true);
    assert.equal(result.value.tool, "createTask");
    assert.equal(result.value.toolArguments.Title, "Finish client proposal");
  });

  it("rejects malformed or unknown tools", () => {
    assert.equal(validateAiOutput("not json").ok, false);
    assert.equal(validateAiOutput({ intent: "hack_db", confidence: 1, response: "ok" }).ok, false);
    assert.equal(
      validateAiOutput({
        intent: "create_task",
        confidence: 0.9,
        tool: "dropDatabase",
        response: "done",
      }).ok,
      false
    );
    assert.equal(validateAiOutput({ intent: "create_task", confidence: 4, response: "ok" }).ok, false);
    assert.equal(validateAiOutput({ intent: "create_task", confidence: 0.9 }).ok, false);
  });

  it("strips TaskFlow tools from general answers", () => {
    const result = validateAiOutput(
      {
        intent: "general_qa",
        confidence: 0.9,
        tool: "createTask",
        toolArguments: { Title: "Learn React" },
        response: "React is a library for building user interfaces.",
      },
      { allowTaskTools: false }
    );
    assert.equal(result.ok, true);
    assert.equal(result.value.tool, null);
    assert.match(result.value.response, /React/);
  });

  it("allows searchWeb for current information", () => {
    const result = validateAiOutput(
      {
        intent: "current_information",
        confidence: 0.8,
        tool: "searchWeb",
        toolArguments: { query: "latest react release" },
        response: "I need live sources for that.",
      },
      { allowTaskTools: false }
    );
    assert.equal(result.ok, true);
    assert.equal(result.value.tool, "searchWeb");
    assert.equal(result.value.toolArguments.query, "latest react release");
  });

  it("strips untrusted fields from tool arguments", () => {
    const clean = sanitizeToolArguments({
      id: "42",
      UserId: "someone-else",
      confirm: true,
      eval: "process.exit()",
      Title: "Owned task",
    });
    assert.equal(clean.id, 42);
    assert.equal(clean.Title, "Owned task");
    assert.equal(clean.UserId, undefined);
    assert.equal(clean.confirm, undefined);
    assert.equal(clean.eval, undefined);
  });
});
