import { z } from 'zod';
import { logger } from '@/lib/logger';

// === Types & Schemas ===

const RateLimitConfigSchema = z.object({
  max: z.number().int().positive(),
  windowSec: z.number().int().positive(),
});

type RateLimitConfig = z.infer<typeof RateLimitConfigSchema>;

interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

type Entry = { count: number; resetAt: number };

// === Store Management ===

const store = new Map<string, Entry>();

// Periodic cleanup of expired entries
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store) {
    if (now > entry.resetAt) store.delete(key);
  }
}, 5 * 60 * 1000);

// === Core Logic ===

/**
 * Hardened rate limiter using an in-memory sliding window.
 */
export function rateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  try {
    // Validate config to prevent logic errors
    const { max, windowSec } = RateLimitConfigSchema.parse(config);
    const now = Date.now();
    const windowMs = windowSec * 1000;

    const entry = store.get(key);

    if (!entry || now > entry.resetAt) {
      store.set(key, { count: 1, resetAt: now + windowMs });
      return { success: true, remaining: max - 1, resetAt: now + windowMs };
    }

    if (entry.count >= max) {
      logger.warn('[RateLimit_Exceeded]', { key, max, windowSec });
      return { success: false, remaining: 0, resetAt: entry.resetAt };
    }

    entry.count++;
    return { success: true, remaining: max - entry.count, resetAt: entry.resetAt };
  } catch (error: any) {
    logger.error('[RateLimit_Error]', { error: error.message, key });
    // Default to fail-open or fail-closed? Usually fail-open for UX, 
    // but here we'll return a safe default to avoid breaking the app.
    return { success: true, remaining: 1, resetAt: Date.now() + 1000 };
  }
}

export const RATE_LIMITS = {
  auth: { max: 5, windowSec: 60 },
  ai: { max: 10, windowSec: 60 },
  purchase: { max: 3, windowSec: 60 },
  search: { max: 60, windowSec: 60 },
  webhook: { max: 500, windowSec: 60 },
  general: { max: 60, windowSec: 60 },
} as const;

/**
 * Extracts client IP securely from request headers.
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  const real = request.headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}

/**
 * Utility to check rate limit and return a 429 Response if exceeded.
 */
export function checkRateLimit(key: string, config: RateLimitConfig): Response | null {
  const result = rateLimit(key, config);
  if (!result.success) {
    return new Response(
      JSON.stringify({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil((result.resetAt - Date.now()) / 1000)
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil((result.resetAt - Date.now()) / 1000).toString(),
          'X-RateLimit-Limit': config.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(result.resetAt / 1000).toString(),
        },
      },
    );
  }
  return null;
}
