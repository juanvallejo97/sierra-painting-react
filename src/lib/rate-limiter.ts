/**
 * Rate limiting utility to prevent brute force attacks
 * Uses in-memory storage with automatic cleanup
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
  firstAttemptAt: number;
}

// In-memory store for rate limit tracking
const attemptStore = new Map<string, RateLimitRecord>();

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of attemptStore.entries()) {
    if (now > record.resetAt) {
      attemptStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check if an identifier (email/IP) has exceeded rate limit
 * @param identifier - Unique identifier (typically email address)
 * @param maxAttempts - Maximum attempts allowed (default: 5)
 * @param windowMs - Time window in milliseconds (default: 15 minutes)
 * @returns true if request is allowed, false if rate limited
 */
export function checkRateLimit(
  identifier: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes
): boolean {
  const now = Date.now();
  const record = attemptStore.get(identifier);

  // No previous attempts or window expired
  if (!record || now > record.resetAt) {
    attemptStore.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
      firstAttemptAt: now,
    });
    return true;
  }

  // Rate limit exceeded
  if (record.count >= maxAttempts) {
    return false;
  }

  // Increment counter
  record.count++;
  attemptStore.set(identifier, record);
  return true;
}

/**
 * Get remaining time until rate limit resets
 * @param identifier - Unique identifier
 * @returns milliseconds until reset, or 0 if not rate limited
 */
export function getRateLimitResetTime(identifier: string): number {
  const record = attemptStore.get(identifier);
  if (!record) return 0;

  const now = Date.now();
  const remaining = record.resetAt - now;
  return Math.max(0, remaining);
}

/**
 * Format remaining time for user display
 * @param ms - Milliseconds
 * @returns Human-readable string (e.g., "5 minutes" or "30 seconds")
 */
export function formatRateLimitResetTime(ms: number): string {
  const seconds = Math.ceil(ms / 1000);
  const minutes = Math.ceil(seconds / 60);

  if (minutes > 1) {
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
  return `${seconds} second${seconds > 1 ? 's' : ''}`;
}

/**
 * Manually reset rate limit for an identifier (e.g., after successful login)
 * @param identifier - Unique identifier
 */
export function resetRateLimit(identifier: string): void {
  attemptStore.delete(identifier);
}

/**
 * Get attempt count for an identifier
 * @param identifier - Unique identifier
 * @returns number of attempts made
 */
export function getAttemptCount(identifier: string): number {
  const record = attemptStore.get(identifier);
  return record?.count || 0;
}
