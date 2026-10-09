import { timingSafeEqual } from "node:crypto";

function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}

export function extractApiKey(req) {
  const header = req.get("authorization");
  if (header?.startsWith("Bearer ")) {
    return header.slice(7).trim();
  }
  if (req.get("x-api-key")) {
    return req.get("x-api-key").trim();
  }
  if (typeof req.query?.apiKey === "string") {
    return req.query.apiKey;
  }
  return null;
}

export function requireApiKey(req, res, next) {
  const required = process.env.API_KEY;
  if (!required) {
    return next();
  }
  const provided = extractApiKey(req);
  if (provided && safeEqual(provided, required)) {
    return next();
  }
  res.status(401).json({ error: "unauthorized" });
}
