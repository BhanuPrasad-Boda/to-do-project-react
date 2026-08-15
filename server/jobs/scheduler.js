const { runScheduledJobs } = require("../services/automationEngine");

const INTERVAL_MS = Number(process.env.JOB_INTERVAL_MS) || 60 * 1000;

let timer = null;

function startScheduler() {
  if (timer || process.env.NODE_ENV === "test") return;
  timer = setInterval(async () => {
    try {
      await runScheduledJobs();
    } catch (err) {
      console.error("Scheduled job failed");
    }
  }, INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
}

function stopScheduler() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startScheduler, stopScheduler };
