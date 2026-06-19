/**
 * RateLimit.gs
 * Per-user hourly rate limiting to protect the org's shared AI provider key
 * from runaway loops and abusive bursts. Backed by CacheService.getUserCache()
 * (per-user scope — no cross-user contention, no LockService).
 *
 * BEST-EFFORT (soft) cap, not a hard ceiling: the get / increment / put on the
 * cache entry is NOT atomic, so two concurrent card actions from the same user
 * can both read the same count and lose one increment. That is acceptable — the
 * goal is to stop sequential runaway loops and accidental hammering, and the
 * upstream domain gate (isAllowedUser) already bounds abuse to authorised org
 * users. A hard ceiling would need LockService on the hot path; not worth it.
 *
 * Split into a pure decision function (rateLimitDecision — unit-testable) and a
 * thin CacheService wrapper (checkAndConsumeRateLimit), matching the project's
 * pure-logic-test convention (see test_injectionFloor in Models.gs).
 */

var DEFAULT_RATE_LIMIT_PER_HOUR = 20;

/**
 * Reads RATE_LIMIT_PER_HOUR from Script Properties; falls back to the default
 * for unset/invalid/<1 values.
 * @returns {number}
 */
function getRateLimitPerHour() {
  var raw = getProp('RATE_LIMIT_PER_HOUR');
  var n = raw ? parseInt(raw, 10) : NaN;
  return (isNaN(n) || n < 1) ? DEFAULT_RATE_LIMIT_PER_HOUR : n;
}

/**
 * Pure rate-limit decision. No CacheService/Properties calls — unit-testable.
 * @param {number} count  analyses already consumed in the current window
 * @param {number} limit  max analyses allowed per window
 * @returns {{allowed: boolean, remaining: number}}
 */
function rateLimitDecision(count, limit) {
  var allowed = count < limit;
  return {
    allowed: allowed,
    remaining: allowed ? (limit - count - 1) : 0
  };
}

/**
 * Checks and (if allowed) consumes one unit of the current user's hourly quota.
 * Uses CacheService.getUserCache() — already scoped to the active user, so the
 * key only needs the hour bucket. TTL is 3600s, safely within CacheService's
 * ~6h maximum.
 *
 * Fails OPEN (allows) when the user can't be identified or the cache misbehaves:
 * access is already gated by isAllowedUser(), so a rate-limiter hiccup must not
 * block a legitimately authorised user.
 *
 * @param {string} userEmail  current user's email (for the fail-open guard)
 * @returns {{allowed: boolean, remaining: number, resetMinutes: number}}
 */
function checkAndConsumeRateLimit(userEmail) {
  var limit = getRateLimitPerHour();
  var now = new Date();
  var resetMinutes = 60 - now.getUTCMinutes();

  if (!userEmail) {
    return { allowed: true, remaining: limit - 1, resetMinutes: resetMinutes };
  }

  try {
    var cache = CacheService.getUserCache();
    // Fixed UTC hour bucket (yyyyMMddHH) — fixed-width fields, unambiguous key.
    // Window is UTC-anchored, not the user's local hour. This is a FIXED window,
    // not sliding: a burst straddling the :59->:00 rollover can span two buckets
    // (~2x for that minute). Intended/acceptable for a soft cap — not a bug.
    var key = 'rl_' + Utilities.formatDate(now, 'UTC', 'yyyyMMddHH');

    var current = parseInt(cache.get(key) || '0', 10);
    if (isNaN(current) || current < 0) current = 0;

    var decision = rateLimitDecision(current, limit);
    if (decision.allowed) {
      cache.put(key, String(current + 1), 3600); // fixed 1-hour window
    }
    decision.resetMinutes = resetMinutes;
    return decision;
  } catch (e) {
    console.warn('Rate limit cache unavailable, failing open: ' + sanitizeLogValue(e.message));
    return { allowed: true, remaining: limit - 1, resetMinutes: resetMinutes };
  }
}

/**
 * Editor-runnable test for rateLimitDecision. No network.
 * Run in the Apps Script editor; expect "test_rateLimit: ALL PASSED".
 */
function test_rateLimit() {
  // [count, limit, expectedAllowed, expectedRemaining]
  var cases = [
    [0,  20, true,  19],
    [19, 20, true,  0],
    [20, 20, false, 0],
    [25, 20, false, 0],
    [0,  1,  true,  0],
    [1,  1,  false, 0]
  ];
  var failed = 0;
  cases.forEach(function(c, i) {
    var r = rateLimitDecision(c[0], c[1]);
    if (r.allowed !== c[2] || r.remaining !== c[3]) {
      failed++;
      console.error('Case ' + i + ' FAILED: rateLimitDecision(' + c[0] + ', ' + c[1] +
        ') = ' + JSON.stringify(r) + ', expected {allowed:' + c[2] + ', remaining:' + c[3] + '}');
    }
  });
  if (failed === 0) console.log('test_rateLimit: ALL PASSED (' + cases.length + ' cases)');
  else console.error('test_rateLimit: ' + failed + ' case(s) FAILED');
}
