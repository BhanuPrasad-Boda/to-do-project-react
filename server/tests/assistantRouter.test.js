const { describe, it } = require("node:test");
const assert = require("node:assert/strict");
const { classifyRequest, ROUTE, MODE, isTimeOnly } = require("../services/assistantRouter");
const { parseWhen, parseTimeToken, parseNaturalTask } = require("../services/taskParser");
const { correctTypos } = require("../services/assistant/fuzzy");
const { prepareMessage } = require("../services/assistant/normalizer");

const NOW = new Date("2026-08-16T09:00:00");

describe("deterministic assistant router", () => {
  it("routes exact complete/delete commands without an external model", () => {
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

  it("creates tasks from natural language", () => {
    const simple = classifyRequest("add finish report tomorrow", { now: NOW });
    assert.equal(simple.intent, "create_task");
    assert.equal(simple.tool, "createTask");
    assert.match(simple.toolArguments.Title, /finish report/i);
    assert.ok(simple.confidence >= 0.8);

    const full = classifyRequest("please create a task to call the client tomorrow at 10am", { now: NOW });
    assert.equal(full.intent, "create_task");
    assert.match(full.toolArguments.Title, /call/i);
    assert.equal(new Date(full.toolArguments.Date).getHours(), 10);
  });

  it("completes, deletes, reschedules, and sets priority from titles", () => {
    assert.equal(classifyRequest("mark the report done").tool, "completeTask");
    assert.match(classifyRequest("complete my presentation task").toolArguments.query, /presentation/i);
    assert.equal(classifyRequest("delete the shopping task").tool, "deleteTask");
    const moved = classifyRequest("move my meeting to Friday", { now: NOW });
    assert.equal(moved.tool, "rescheduleTask");
    assert.equal(new Date(moved.toolArguments.Date).getDay(), 5);
    const priority = classifyRequest("make the presentation high priority");
    assert.equal(priority.tool, "setPriority");
    assert.equal(priority.toolArguments.Priority, "High");
  });

  it("routes list and planning commands deterministically", () => {
    assert.equal(classifyRequest("show my overdue tasks").tool, "getOverdueTasks");
    assert.equal(classifyRequest("what do I need to do today?").tool, "getTodayTasks");
    assert.equal(classifyRequest("plan my day").tool, "getDailySummary");
    assert.equal(classifyRequest("show my notifications").intent, "open_notifications");
    assert.equal(classifyRequest("Help me plan my day around my 2 PM meeting.").tool, "getDailySummary");
  });

  it("creates a reminder task and a meeting from aliases", () => {
    const remind = classifyRequest("remind me to call John in 2 hours", { now: NOW });
    assert.equal(remind.intent, "create_task");
    assert.match(remind.toolArguments.Title, /call john/i);
    const meeting = classifyRequest("schedule a meeting tomorrow at 3pm", { now: NOW });
    assert.equal(meeting.intent, "create_task");
    assert.match(meeting.toolArguments.Title, /meeting/i);
    assert.equal(new Date(meeting.toolArguments.Date).getHours(), 15);
  });

  it("tolerates typos and abbreviations", () => {
    assert.match(correctTypos("tommorow"), /tomorrow/);
    assert.match(correctTypos("complet"), /complete/);
    const typo = classifyRequest("tommorow add a task to call client", { now: NOW });
    assert.equal(typo.intent, "create_task");
    const slang = classifyRequest("plz complet my report");
    assert.equal(slang.intent, "complete_task");
  });

  it("asks for clarification on ambiguous mutations", () => {
    assert.equal(classifyRequest("delete that").route, ROUTE.CLARIFICATION_REQUIRED);
    assert.equal(classifyRequest("move it").route, ROUTE.CLARIFICATION_REQUIRED);
    assert.equal(classifyRequest("remind me later").route, ROUTE.CLARIFICATION_REQUIRED);
    assert.equal(classifyRequest("delete all my overdue tasks").reason, "bulk_delete");
    assert.equal(classifyRequest("Create a task").route, ROUTE.CLARIFICATION_REQUIRED);
  });

  it("does not treat unknown or educational text as a command", () => {
    ["handle that thing tomorrow", "what is quantum physics?", "tell me a joke", "explain React"].forEach((text) => {
      const result = classifyRequest(text, { now: NOW });
      assert.equal(result.intent, "unknown", text);
      assert.equal(result.allowTaskTool, false, text);
      assert.equal(result.tool, null, text);
    });
    const files = classifyRequest("I was thinking about deleting my old files.");
    assert.equal(files.intent, "unknown");
    const reminder = classifyRequest("Can you explain what a reminder is?");
    assert.equal(reminder.intent, "unknown");
    const cancelled = classifyRequest("My meeting was cancelled yesterday.");
    assert.equal(cancelled.intent, "unknown");
    const hypothetical = classifyRequest("What would happen if I deleted my task?");
    assert.equal(hypothetical.allowTaskTool, false);
    assert.notEqual(hypothetical.intent, "delete_task");
  });

  it("resolves it/that from conversation context", () => {
    const moved = classifyRequest("Move it to tomorrow.", {
      now: NOW,
      lastReferent: { id: 44, query: "presentation", title: "Finish the presentation", intent: "create_task" },
    });
    assert.equal(moved.tool, "rescheduleTask");
    assert.equal(moved.toolArguments.id, 44);
    const priority = classifyRequest("Make it high priority.", {
      lastReferent: { id: 44, query: "presentation", title: "Finish the presentation" },
    });
    assert.equal(priority.tool, "setPriority");
    assert.equal(priority.toolArguments.id, 44);
  });

  it("fills a pending create-task time slot", () => {
    const result = classifyRequest("10 AM", {
      now: NOW,
      pending: {
        intent: "create_task",
        tool: "createTask",
        toolArguments: { text: "Finish the proposal", Title: "Finish the proposal", Date: "2026-08-16T09:00:00" },
      },
    });
    assert.equal(result.route, ROUTE.DETERMINISTIC);
    assert.equal(result.reason, "slot_fill_time");
  });

  it("recognizes time-only follow-ups", () => {
    assert.equal(isTimeOnly("10 AM"), true);
    assert.equal(isTimeOnly("at 2:30 pm"), true);
    assert.equal(isTimeOnly("organize tomorrow"), false);
  });

  it("keeps summarize-today as task analysis", () => {
    const result = classifyRequest("what do I need to do today?");
    assert.equal(result.mode, MODE.TASK_ANALYSIS);
    assert.equal(result.tool, "getTodayTasks");
  });
});

describe("date and time parsing", () => {
  it("understands relative dates and named times", () => {
    const tomorrow = parseWhen("tomorrow at 10am", NOW);
    assert.equal(tomorrow.dueDate.getDate(), 17);
    assert.equal(tomorrow.hours, 10);
    const hours = parseWhen("in 2 hours", NOW);
    assert.equal(hours.dueDate.getHours(), 11);
    const spoken = parseTimeToken("6 in the evening");
    assert.equal(spoken.hours, 18);
    const clock = parseTimeToken("18:00");
    assert.equal(clock.hours, 18);
    const parsed = parseNaturalTask("finish the client presentation tomorrow at 10 AM", NOW);
    assert.match(parsed.title, /finish the client presentation/i);
    assert.equal(parsed.priority, "High");
    assert.equal(parsed.dueDate.getHours(), 10);
  });
});

describe("normalizer", () => {
  it("normalizes abbreviations and casing", () => {
    const prepared = prepareMessage("Plz ADD a TASK");
    assert.match(prepared.text, /please add a task/);
  });
});
