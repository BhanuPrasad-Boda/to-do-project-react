const { runScheduledJobs } = require("../services/automationEngine");

const INTERVAL_MS = Number(process.env.JOB_INTERVAL_MS) || 60 * 1000;

let timer = null;

async function tick() {
  try {
    await runScheduledJobs();
  } catch (err) {
    console.error("Scheduled job failed", err?.message || err);
  }
}

function startScheduler() {
  if (timer || process.env.NODE_ENV === "test") return;
  tick();
  timer = setInterval(tick, INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
}

function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startScheduler, stopScheduler };
