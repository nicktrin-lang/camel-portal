/**
 * Simple in-memory rate limiter for Next.js API routes.
 * Allows `maxRequests` per `windowMs` per IP.
 * In-memory is intentional — no dependencies, zero cost.
 * Resets naturally when the serverless function cold-starts.
 */

interface Entry {
  count: number;
  resetAt: number;
}

const store = new Map<string, Entry>();

// Clean up expired entries every 5 minutes to avoid memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

export interface RateLimitOptions {
  /** Max requests allowed in the window */
  maxRequests?: number;
  /** Window size in milliseconds */
  windowMs?: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  ip: string,
  key: string,
  { maxRequests = 3, windowMs = 15 * 60 * 1000 }: RateLimitOptions = {}
): RateLimitResult {
  const storeKey = `${key}:${ip}`;
  const now = Date.now();

  let entry = store.get(storeKey);

  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + windowMs };
    store.set(storeKey, entry);
  }

  entry.count += 1;

  return {
    allowed: entry.count <= maxRequests,
    remaining: Math.max(0, maxRequests - entry.count),
    resetAt: entry.resetAt,
  };
}

/** Extract the real client IP from a Next.js Request */
export function getIp(req: Request): string {
  const headers = (req as any).headers as Headers;
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "unknown"
  );
}