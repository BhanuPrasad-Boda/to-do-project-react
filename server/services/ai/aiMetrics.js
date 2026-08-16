const stats = {
  totalRequests: 0,
  deterministicRequests: 0,
  aiRequests: 0,
  aiFailures: 0,
  latencyTotalMs: 0,
  latencyCount: 0,
};

function recordTotal() {
  stats.totalRequests += 1;
}

function recordDeterministic() {
  stats.deterministicRequests += 1;
}

function recordAi(latencyMs) {
  stats.aiRequests += 1;
  if (Number.isFinite(latencyMs) && latencyMs >= 0) {
    stats.latencyTotalMs += latencyMs;
    stats.latencyCount += 1;
  }
}

function recordAiFailure() {
  stats.aiFailures += 1;
}

function snapshot() {
  return {
    totalRequests: stats.totalRequests,
    deterministicRequests: stats.deterministicRequests,
    aiRequests: stats.aiRequests,
    aiFailures: stats.aiFailures,
    averageAiLatencyMs: stats.latencyCount
      ? Math.round(stats.latencyTotalMs / stats.latencyCount)
      : 0,
  };
}

function resetMetrics() {
  stats.totalRequests = 0;
  stats.deterministicRequests = 0;
  stats.aiRequests = 0;
  stats.aiFailures = 0;
  stats.latencyTotalMs = 0;
  stats.latencyCount = 0;
}

module.exports = {
  recordTotal,
  recordDeterministic,
  recordAi,
  recordAiFailure,
  snapshot,
  resetMetrics,
};
