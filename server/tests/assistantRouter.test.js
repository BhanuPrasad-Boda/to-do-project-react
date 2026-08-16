const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { classifyRequest, ROUTE, MODE, isTimeOnly } = require("../services/assistantRouter");

describe("hybrid assistant router", () => {
  it("routes exact complete/delete commands without AI", () => {
    const complete = classifyRequest("complete task 123");
    assert.equal(complete.route, ROUTE.DETERMINISTIC);
    assert.ok(complete.confidence >= 0.9);
    assert.equal(complete.tool, "completeTask");
    assert.equal(complete.toolArguments.id, 123);

    const remove = classifyRequest("Delete task 123");
    assert.equal(remove.route, ROUTE.DETERMINISTIC);
    assert.equal(remove.tool, "deleteTask");
    assert.equal(remove.toolArguments.id, 123);
  });

  it("routes simple list commands deterministically", () => {
    assert.equal(classifyRequest("show today's tasks").tool, "getTodayTasks");
    assert.equal(classifyRequest("show overdue tasks").tool, "getOverdueTasks");
    assert.equal(classifyRequest("What's overdue").route, ROUTE.DETERMINISTIC);
    assert.equal(classifyRequest("plan my day").tool, "getDailySummary");
  });

  it("sends planning and conversational requests to AI", () => {
    const samples = [
      "I have too much work tomorrow. Organize my important tasks in the afternoon.",
      "Help me plan my day around my 2 PM meeting.",
      "Which task should I focus on first?",
      "Move the less important things to tomorrow.",
      "Remind me about everything important before my meeting.",
    ];
    samples.forEach((text) => {
      const result = classifyRequest(text);
      assert.equal(result.route, ROUTE.AI_REQUIRED, text);
    });
  });

  it("asks for clarification on ambiguous mutations", () => {
    assert.equal(classifyRequest("delete that").route, ROUTE.CLARIFICATION_REQUIRED);
    assert.equal(classifyRequest("move it").route, ROUTE.CLARIFICATION_REQUIRED);
    assert.equal(classifyRequest("remind me later").route, ROUTE.CLARIFICATION_REQUIRED);
    assert.equal(classifyRequest("delete all my overdue tasks").reason, "bulk_delete");
  });

  it("fills a pending create-task time slot", () => {
    const result = classifyRequest("10 AM", {
      now: new Date("2026-08-17T09:00:00"),
      pending: {
        intent: "create_task",
        tool: "createTask",
        toolArguments: { text: "Finish the proposal", Title: "Finish the proposal", Date: "2026-08-17T09:00:00" },
      },
    });
    assert.equal(result.route, ROUTE.DETERMINISTIC);
    assert.equal(result.reason, "slot_fill_time");
    assert.ok(String(result.toolArguments.Date).includes("2026-08-17"));
  });

  it("routes open-domain questions away from TaskFlow tools", () => {
    const samples = [
      ["What is React?", MODE.GENERAL_EXPLANATION],
      ["Explain machine learning.", MODE.GENERAL_EXPLANATION],
      ["Write a professional email.", MODE.GENERAL_WRITING],
      ["Help me understand this code.", MODE.GENERAL_EXPLANATION],
      ["What is the difference between JavaScript and TypeScript?", MODE.GENERAL_EXPLANATION],
    ];
    samples.forEach(([text, mode]) => {
      const result = classifyRequest(text);
      assert.equal(result.allowTaskTool, false, text);
      assert.equal(result.tool, null, text);
      assert.equal(result.mode, mode, text);
      assert.equal(result.route, ROUTE.AI_REQUIRED, text);
    });
  });

  it("does not treat hypothetical task talk as an action", () => {
    const explain = classifyRequest("Explain how task management applications work.");
    assert.equal(explain.allowTaskTool, false);
    assert.equal(explain.tool, null);
    assert.notEqual(explain.intent, "create_task");

    const deleted = classifyRequest("What would happen if I deleted my task?");
    assert.equal(deleted.allowTaskTool, false);
    assert.equal(deleted.mode, MODE.GENERAL_EXPLANATION);
    assert.notEqual(deleted.intent, "delete_task");
  });

  it("flags current-information questions", () => {
    const result = classifyRequest("What's the latest information about React 19?");
    assert.equal(result.mode, MODE.CURRENT_INFORMATION);
    assert.equal(result.allowTaskTool, false);
  });

  it("keeps summarize-today as task analysis", () => {
    const result = classifyRequest("Summarize my tasks for today");
    assert.equal(result.mode, MODE.TASK_ANALYSIS);
    assert.equal(result.tool, "getTodayTasks");
  });

  it("recognizes time-only follow-ups", () => {
    assert.equal(isTimeOnly("10 AM"), true);
    assert.equal(isTimeOnly("at 2:30 pm"), true);
    assert.equal(isTimeOnly("organize tomorrow"), false);
  });
});
