const hits = new Map();

function prune(bucket, windowMs, now) {
  return bucket.filter((ts) => now - ts < windowMs);
}

function allow(key, limit, windowMs) {
  const now = Date.now();
  const bucket = prune(hits.get(key) || [], windowMs, now);
  if (bucket.length >= limit) {
    hits.set(key, bucket);
    const retryAfterMs = windowMs - (now - bucket[0]);
    return { ok: false, retryAfterMs: Math.max(retryAfterMs, 1000) };
  }
  bucket.push(now);
  hits.set(key, bucket);
  return { ok: true, retryAfterMs: 0 };
}

function clientKey(req) {
  return req.ip || req.headers["x-forwarded-for"] || "unknown";
}

function rateLimit({ windowMs, max, keyGenerator, message }) {
  return (req, res, next) => {
    const key = keyGenerator ? keyGenerator(req) : clientKey(req);
    const result = allow(key, max, windowMs);
    if (!result.ok) {
      res.set("Retry-After", String(Math.ceil(result.retryAfterMs / 1000)));
      return res.status(429).json({
        message: message || "Too many attempts. Please wait before trying again.",
      });
    }
    next();
  };
}

module.exports = { allow, rateLimit, clientKey };
