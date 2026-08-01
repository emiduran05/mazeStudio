const buckets = new Map();
const WINDOW_MS = 60_000;
const MAX_REQUESTS = 30;

module.exports = function publicRateLimit(req, res, next) {
  const now = Date.now();
  const key = req.ip || req.socket.remoteAddress || "unknown";
  const current = buckets.get(key);
  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return next();
  }
  current.count += 1;
  if (current.count > MAX_REQUESTS) {
    res.set("Retry-After", String(Math.ceil((current.resetAt - now) / 1000)));
    return res.status(429).json({ message: "Too many requests" });
  }
  return next();
};
