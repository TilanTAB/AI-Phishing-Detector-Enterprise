# Org-wide Deployment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a Google Workspace admin self-host this add-on and enable it for an entire domain — via domain-based access control, per-user rate limiting on the shared provider key, and an admin deployment guide.

**Architecture:** Stay 100% inside Apps Script (no backend). Replace the per-email `ALLOWED_USERS` allowlist with a domain allowlist (`ALLOWED_DOMAINS`). Add a per-user hourly rate limiter backed by `CacheService.getUserCache()`. Split each new behavior into a **pure decision function** (editor-unit-testable, matching the existing `test_injectionFloor` convention) and a thin Apps Script wrapper. Document the 3-layer Marketplace distribution flow.

**Tech Stack:** Google Apps Script (V8 runtime, but ES5 source style — `var`, `function () {}`, string concatenation), `clasp`, `CacheService`, `PropertiesService`.

**Spec:** [docs/specs/2026-06-17-org-wide-deployment-design.md](../specs/2026-06-17-org-wide-deployment-design.md)

---

## ⚠️ Execution constraints (read before starting)

These differ from a typical CLI project — do not assume `pytest`/`npm test`:

1. **Tests are editor-runnable functions, not a CLI suite.** "Run the test" means: `clasp push` to a **dev/test** Apps Script project, `clasp open`, select the function, click **Run**, read the **Execution log**. An autonomous agent cannot click Run — **the developer executes every test-run and deploy step.** Steps that require this are tagged **[DEVELOPER-RUN]**.
2. **`clasp push` targets the LIVE project** (`addon/.clasp.json`). Treat it as production. For testing, push to a throwaway dev scriptId or use Test Deployments — never an unattended push to prod. Tagged **[DEVELOPER-RUN]**.
3. **Commits require explicit user approval** (project hard rule, applies to subagents too). Every commit step is tagged **[ASK-FIRST]** — pause and get a yes before running it.
4. **ES5 only.** `var`, `function () {}`, string concatenation. Do not introduce `const`/`let`/arrow functions/template literals — match the surrounding files.

---

## File Structure

**New files**

- `addon/RateLimit.gs` — per-user rate limiting. `rateLimitDecision()` (pure) + `getRateLimitPerHour()` + `checkAndConsumeRateLimit()` (CacheService wrapper) + `test_rateLimit()` (editor test).
- `docs/ADMIN_DEPLOYMENT.md` — org admin deployment guide (3-layer private Marketplace flow).

**Modified files**

- `addon/Config.gs` — replace `ALLOWED_USERS` logic with `ALLOWED_DOMAINS`; add pure `isDomainAllowed()` + `test_domainAllowlist()`; surface new keys in `getSafeDisplayConfig()`.
- `addon/Code.gs` — add rate-limit gate inside `analyzeEmailAction`.
- `addon/Card.gs` — update `buildAccessDeniedCard()` and the settings "About" copy for the org model.
- `README.md`, `docs/MARKETPLACE_LISTING.md`, `docs/PRIVACY.md`, `docs/privacy.html` — doc sync.

---

## Task 1: Domain allowlist (replace ALLOWED_USERS)

**Files:**
- Modify: `addon/Config.gs` (add `isDomainAllowed`, rewrite `isAllowedUser`, add `test_domainAllowlist`)

- [ ] **Step 1: Add the pure decision function + editor test to `addon/Config.gs`**

Add directly above the existing `isAllowedUser` function:

```javascript
/**
 * Pure domain-allowlist check. No Session/Properties calls — unit-testable.
 * Matches the email's domain (substring after the LAST '@') against a
 * comma-separated allowlist, case-insensitive, exact match (no subdomain wildcard).
 * Fail-closed: empty/missing inputs return false.
 *
 * @param {string} email
 * @param {string} allowedDomainsCsv  e.g. "acme.com,acme.co.uk"
 * @returns {boolean}
 */
function isDomainAllowed(email, allowedDomainsCsv) {
  if (!email || !allowedDomainsCsv) return false;
  var at = email.lastIndexOf('@');
  if (at === -1) return false;
  var domain = email.slice(at + 1).toLowerCase().trim();
  if (!domain) return false;
  return allowedDomainsCsv.split(',').some(function (d) {
    return d.toLowerCase().trim() === domain;
  });
}

/**
 * Editor-runnable test for isDomainAllowed. No network.
 * Run in the Apps Script editor; expect "test_domainAllowlist: ALL PASSED".
 */
function test_domainAllowlist() {
  var cases = [
    ['alice@acme.com',     'acme.com',            true],
    ['alice@acme.com',     'acme.com,acme.co.uk', true],
    ['bob@acme.co.uk',     'acme.com,acme.co.uk', true],
    ['ALICE@ACME.COM',     'acme.com',            true],   // case-insensitive
    ['alice@acme.com',     ' acme.com ',          true],   // trims config entry
    ['alice@sub.acme.com', 'acme.com',            false],  // exact match only
    ['alice@evil.com',     'acme.com',            false],
    ['alice@acme.com',     '',                    false],  // fail-closed: empty
    ['alice@acme.com',     null,                  false],  // fail-closed: unset
    ['',                   'acme.com',            false],  // no email
    ['notanemail',         'acme.com',            false]   // no '@'
  ];
  var failed = 0;
  cases.forEach(function (c, i) {
    var got = isDomainAllowed(c[0], c[1]);
    if (got !== c[2]) {
      failed++;
      console.error('Case ' + i + ' FAILED: isDomainAllowed(' +
        JSON.stringify(c[0]) + ', ' + JSON.stringify(c[1]) + ') = ' + got +
        ', expected ' + c[2]);
    }
  });
  if (failed === 0) console.log('test_domainAllowlist: ALL PASSED (' + cases.length + ' cases)');
  else console.error('test_domainAllowlist: ' + failed + ' case(s) FAILED');
}
```

- [ ] **Step 2: Rewrite `isAllowedUser` to use the domain allowlist**

Replace the existing `isAllowedUser` body (currently reads `ALLOWED_USERS`):

```javascript
/**
 * Returns true if the current user's email domain is in ALLOWED_DOMAINS.
 *
 * Reads ALLOWED_DOMAINS from Script Properties (comma-separated domains,
 * e.g. "acme.com,acme.co.uk"). Fail-closed: if unset/empty, denies all users.
 *
 * NOTE: never set ALLOWED_DOMAINS to a public domain (gmail.com, outlook.com) —
 * that would allow every consumer account that can reach the add-on.
 *
 * @returns {boolean}
 */
function isAllowedUser() {
  var currentUser = getCurrentUserEmail();
  if (!currentUser) return false;
  return isDomainAllowed(currentUser, getProp('ALLOWED_DOMAINS'));
}
```

- [ ] **Step 3: [DEVELOPER-RUN] Run the test in the Apps Script editor**

`clasp push` (to a dev project) → `clasp open` → select `test_domainAllowlist` → **Run**.
Expected Execution log: `test_domainAllowlist: ALL PASSED (11 cases)`

- [ ] **Step 4: [ASK-FIRST] Commit**

```bash
git add addon/Config.gs
git commit -m "feat: replace ALLOWED_USERS allowlist with ALLOWED_DOMAINS domain gating"
```

---

## Task 2: Surface new config + update access-denied / settings copy

**Files:**
- Modify: `addon/Config.gs` (`getSafeDisplayConfig`)
- Modify: `addon/Card.gs` (`buildAccessDeniedCard`, settings "About" copy)

- [ ] **Step 1: Surface `ALLOWED_DOMAINS` and `RATE_LIMIT_PER_HOUR` in `getSafeDisplayConfig`**

In `addon/Config.gs`, replace the body of `getSafeDisplayConfig` so admins can verify org config from the Settings card:

```javascript
function getSafeDisplayConfig() {
  var provider = getProvider();
  var safeKeys = PROVIDER_DISPLAY_KEYS[provider] || [];
  var result = { AI_PROVIDER: provider };
  safeKeys.forEach(function (key) {
    result[key] = getProp(key) || '(not set)';
  });
  // Org-deployment settings (non-secret)
  result.ALLOWED_DOMAINS = getProp('ALLOWED_DOMAINS') || '(not set — add-on denies everyone)';
  result.RATE_LIMIT_PER_HOUR = String(getRateLimitPerHour());
  return result;
}
```

> `getRateLimitPerHour()` is defined in Task 3. If implementing Task 2 before Task 3, this line will be undefined at runtime — do Task 3 first, or temporarily inline `getProp('RATE_LIMIT_PER_HOUR') || '20'`. Recommended: implement Task 3 before this step.

- [ ] **Step 2: Update `buildAccessDeniedCard` copy in `addon/Card.gs`**

Replace the `setText(...)` argument inside `buildAccessDeniedCard` (currently "is not authorised to use this add-on… Contact the owner"):

```javascript
            .setText(
              'Your account (<b>' + _escape(userEmail) + '</b>) ' +
              'is not in a domain authorised for this add-on.\n\n' +
              'If you believe this is an error, contact your Google Workspace administrator.'
            )
```

- [ ] **Step 3: Update the settings "About" copy in `addon/Card.gs`**

Replace the `aboutSection` paragraph `setText(...)` inside `buildSettingsCard` (currently references "allowlisted users" / "developer-administered"):

```javascript
      .setText(
        'This add-on is administered by your organisation. The AI provider, model, ' +
        'credentials, allowed domains, and rate limit are configured by your Workspace ' +
        'administrator in Apps Script Script Properties — they are shared by everyone in ' +
        'the organisation and are not user-editable.\n\n' +
        'To request a change, contact your administrator.\n\n' +
        'Self-hosting your own instance? See the deployment guide: ' +
        '<a href="https://github.com/TilanTAB/AI-Phishing-Detector/blob/main/docs/ADMIN_DEPLOYMENT.md">ADMIN_DEPLOYMENT.md</a>.'
      )
```

- [ ] **Step 4: [DEVELOPER-RUN] Verify in a Test Deployment**

`clasp push` (dev) → Gmail → open the add-on → **Settings** universal action. Confirm `ALLOWED_DOMAINS` and `RATE_LIMIT_PER_HOUR` appear under "Current Configuration". Set `ALLOWED_DOMAINS` to a non-matching value and reopen an email — confirm the updated Access Restricted card text.

- [ ] **Step 5: [ASK-FIRST] Commit**

```bash
git add addon/Config.gs addon/Card.gs
git commit -m "feat: surface org config in settings; update access-denied copy"
```

---

## Task 3: Rate-limit decision function (pure) + config reader

**Files:**
- Create: `addon/RateLimit.gs`

- [ ] **Step 1: Create `addon/RateLimit.gs` with the pure decision fn, config reader, and editor test**

```javascript
/**
 * RateLimit.gs
 * Per-user hourly rate limiting to protect the org's shared AI provider key
 * from runaway loops and abusive bursts. Backed by CacheService (per-user cache),
 * so there is no shared state and no LockService is needed.
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
  cases.forEach(function (c, i) {
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
```

- [ ] **Step 2: [DEVELOPER-RUN] Run the test in the editor**

`clasp push` (dev) → `clasp open` → select `test_rateLimit` → **Run**.
Expected Execution log: `test_rateLimit: ALL PASSED (6 cases)`

- [ ] **Step 3: [ASK-FIRST] Commit**

```bash
git add addon/RateLimit.gs
git commit -m "feat: add pure rate-limit decision function and config reader"
```

---

## Task 4: Rate-limit storage wrapper (CacheService)

**Files:**
- Modify: `addon/RateLimit.gs` (add `checkAndConsumeRateLimit`)

- [ ] **Step 1: Add the CacheService-backed wrapper to `addon/RateLimit.gs`**

Append below `rateLimitDecision`:

```javascript
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
    var key = 'rl_' + now.getUTCFullYear() + '-' + now.getUTCMonth() + '-' +
              now.getUTCDate() + '-' + now.getUTCHours();

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
```

- [ ] **Step 2: [DEVELOPER-RUN] Manual smoke test in a Test Deployment**

CacheService can't be unit-tested in the editor without state. After wiring Task 5, set `RATE_LIMIT_PER_HOUR=2` in Script Properties, click **Analyze** 3× on the same email, and confirm the 3rd attempt shows the "Hourly analysis limit reached" notification. Reset `RATE_LIMIT_PER_HOUR` afterward.

- [ ] **Step 3: [ASK-FIRST] Commit**

```bash
git add addon/RateLimit.gs
git commit -m "feat: add CacheService-backed per-user hourly rate limiter"
```

---

## Task 5: Wire rate limiting into `analyzeEmailAction`

**Files:**
- Modify: `addon/Code.gs` (`analyzeEmailAction`, inside the `try` block before `getEmailData`)

- [ ] **Step 1: Insert the rate-limit gate**

In `addon/Code.gs`, inside `analyzeEmailAction`, at the **top of the `try` block** (immediately before `// Fetch email data` / `var accessToken = ...`), add:

```javascript
    // Per-user hourly rate limit — protects the org's shared provider key.
    // Placed after the messageId check so failed lookups don't consume quota.
    var rl = checkAndConsumeRateLimit(getCurrentUserEmail());
    if (!rl.allowed) {
      console.log('Rate limit hit | id=' + messageId);
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText(
            'Hourly analysis limit reached. Try again in ' + rl.resetMinutes + ' min.'
          )
        )
        .build();
    }
```

Resulting top of the `try` block, for reference:

```javascript
  try {
    // Per-user hourly rate limit — protects the org's shared provider key.
    var rl = checkAndConsumeRateLimit(getCurrentUserEmail());
    if (!rl.allowed) {
      console.log('Rate limit hit | id=' + messageId);
      return CardService.newActionResponseBuilder()
        .setNotification(
          CardService.newNotification().setText(
            'Hourly analysis limit reached. Try again in ' + rl.resetMinutes + ' min.'
          )
        )
        .build();
    }

    // Fetch email data — pass access token for addon-scoped getMessageById
    var accessToken = e && e.gmail && e.gmail.accessToken;
    var emailData = getEmailData(messageId, accessToken);
    ...
```

- [ ] **Step 2: [DEVELOPER-RUN] End-to-end check in a Test Deployment**

`clasp push` (dev). With `RATE_LIMIT_PER_HOUR=2`, Analyze the same email 3×: first two return verdict cards, the third returns the limit notification with no AI call (confirm no provider request in the Execution log). Restore `RATE_LIMIT_PER_HOUR`.

- [ ] **Step 3: [ASK-FIRST] Commit**

```bash
git add addon/Code.gs
git commit -m "feat: gate analyzeEmailAction behind per-user hourly rate limit"
```

---

## Task 6: Admin deployment guide + doc sync

**Files:**
- Create: `docs/ADMIN_DEPLOYMENT.md`
- Modify: `README.md`, `docs/MARKETPLACE_LISTING.md`, `docs/PRIVACY.md`, `docs/privacy.html`

- [ ] **Step 1: Write `docs/ADMIN_DEPLOYMENT.md`**

Create the guide with these sections (content drawn from spec §4 — use the verified 3-layer flow and the official source links):

```markdown
# Admin Deployment Guide — Org-wide Install

This add-on is **self-hosted per organisation**. Your Workspace admin deploys a private
copy into your own Google Cloud + Apps Script project and installs it domain-wide. Nothing
is hosted by the project author; your org owns the deployment, the AI provider billing, and
the data path.

## Prerequisites
- A Google Workspace (or Cloud Identity) organisation — **a personal @gmail.com account
  cannot do this** (the Internal OAuth user type requires an org-owned GCP project).
- A GCP project owned by your organisation.
- One AI provider credential (see the main README).

## "Org only" is enforced by three independent layers
1. **OAuth consent screen = Internal.** GCP → APIs & Services → OAuth consent screen →
   User type **Internal**. Only org accounts can authorise; externals get `access_denied`.
   Internal apps skip Google's verification review.
2. **Marketplace SDK → App Configuration → Visibility = Private.** Enable the *Google
   Workspace Marketplace SDK* (not the API) in the GCP project, then in App Configuration set
   **Private** ("only people within your domain can find and install"). Set **Installation
   Settings = Admin Only Install** for an admin-pushed rollout.
   ⚠️ **Irreversible:** once App Configuration is saved, Public↔Private cannot be changed.
3. **Admin console domain install.** Super admin → **Apps → Google Workspace Marketplace
   apps → Apps list → Install app →** select the app **→ Admin install → Continue →** review
   access **→ "Everyone at your organisation" → Finish**. To scope to a subset, choose
   **"Certain groups or organisational units"**. Propagation can take up to 24h.

## Configure Script Properties (Apps Script → Project Settings)
| Property | Value |
|---|---|
| `AI_PROVIDER` + provider keys | see main README |
| `ALLOWED_DOMAINS` | your domain(s), comma-separated, e.g. `acme.com,acme.co.uk` |
| `RATE_LIMIT_PER_HOUR` | per-user hourly cap (default 20 if unset) |

> ⚠️ **Never** set `ALLOWED_DOMAINS` to a public domain (`gmail.com`, `outlook.com`, …) —
> that would allow every consumer account that can reach the add-on.

## Testing before rollout
- **Logic** can be tested on a personal account via **Deploy → Test deployments → Install**
  (just your account): domain match, rate limit, analysis.
- **Distribution** (the three layers + multi-user behaviour) requires a Workspace **trial**
  domain with a second test user. "Works for me on Gmail" ≠ "works for the org."

## Official references
- https://developers.google.com/workspace/marketplace/enable-configure-sdk
- https://developers.google.com/workspace/marketplace/configure-oauth-consent-screen
- https://support.google.com/a/answer/172482
```

- [ ] **Step 2: Update `README.md`**

In the "Required Properties" table, **replace the `ALLOWED_USERS` row** with:

```markdown
| `ALLOWED_DOMAINS` | `acme.com` | Comma-separated domain allowlist. Required — users outside these domains get an access-denied card. Never use a public domain like `gmail.com`. |
```

Add a row to the "Optional Properties" table:

```markdown
| `RATE_LIMIT_PER_HOUR` | `20` | Max analyses per user per hour. Protects the shared provider key from runaway/abusive usage. |
```

Update the Setup Guide intro line (currently "added to `ALLOWED_USERS`") and the Troubleshooting "Access denied" row to reference `ALLOWED_DOMAINS`. Add a link near Setup: "For org-wide rollout, see [docs/ADMIN_DEPLOYMENT.md](docs/ADMIN_DEPLOYMENT.md)."

- [ ] **Step 3: Update `docs/MARKETPLACE_LISTING.md`**

Reframe the "Setup" and "Privacy" sections from "private experimental / developer-administered / allowlisted users" to org self-host: configuration is administered by the **org's Workspace admin**; access is restricted to the org's **domains** via `ALLOWED_DOMAINS`; per-user rate limiting protects the shared key. Replace "allowlist of authorized Google accounts" wording with "authorised domains."

- [ ] **Step 4: Update `docs/PRIVACY.md` and `docs/privacy.html`**

Find the allowlist-gating wording (the `ALLOWED_USERS` / "allowlist of authorized Google accounts" sentences) and change to domain-based gating administered by the org's Workspace admin. Keep both files in sync (same wording).

- [ ] **Step 5: [DEVELOPER-RUN] Sanity-check the docs**

Confirm no remaining references to `ALLOWED_USERS` in `README.md`, `docs/MARKETPLACE_LISTING.md`, `docs/PRIVACY.md`, `docs/privacy.html`:
`grep -rn "ALLOWED_USERS" README.md docs/` should return nothing.

- [ ] **Step 6: [ASK-FIRST] Commit**

```bash
git add docs/ADMIN_DEPLOYMENT.md README.md docs/MARKETPLACE_LISTING.md docs/PRIVACY.md docs/privacy.html
git commit -m "docs: add org admin deployment guide; switch allowlist docs to ALLOWED_DOMAINS"
```

---

## Task 7: Final verification (Tier A) + Tier B note

**Files:** none (verification only)

- [ ] **Step 1: [DEVELOPER-RUN] Tier A — consumer Gmail Test Deployment checklist**
  - [ ] `test_domainAllowlist` → ALL PASSED, `test_rateLimit` → ALL PASSED (editor).
  - [ ] `ALLOWED_DOMAINS=gmail.com` → your account is allowed; Analyze returns a verdict.
  - [ ] `ALLOWED_DOMAINS=nope.com` → Access Restricted card with the new copy.
  - [ ] `RATE_LIMIT_PER_HOUR=2` → 3rd analysis in an hour returns the limit notification, no AI call.
  - [ ] Settings card shows `ALLOWED_DOMAINS` and `RATE_LIMIT_PER_HOUR`.
  - [ ] Restore `ALLOWED_DOMAINS`/`RATE_LIMIT_PER_HOUR` to intended values.

- [ ] **Step 2: [DEVELOPER-RUN] Tier B — Workspace trial (distribution)**

On a Workspace trial domain with a second test user, validate the 3-layer install
(`docs/ADMIN_DEPLOYMENT.md`) and confirm `Session.getActiveUser().getEmail()` resolves the
**second** user's corporate email (the §1 assumption). This is the only tier that proves the
add-on works for an org, not just for you.

- [ ] **Step 3: [ASK-FIRST] Finalize**

Use the superpowers:finishing-a-development-branch skill to decide merge/PR for
`feature/org-wide-deployment`.

---

## Self-Review (completed by plan author)

- **Spec coverage:** §1 access control → Task 1; §2 rate limiting → Tasks 3–5; §3 settings/denied copy → Task 2; §4 admin guide + doc sync → Task 6; §5 testing strategy → Tasks 7 (Tier A/B) and per-task DEVELOPER-RUN steps. All sections mapped.
- **Placeholder scan:** no TBD/TODO; all code blocks complete; "handle edge cases" phrasing avoided.
- **Type consistency:** `isDomainAllowed(email, csv)`, `rateLimitDecision(count, limit)→{allowed,remaining}`, `getRateLimitPerHour()→number`, `checkAndConsumeRateLimit(userEmail)→{allowed,remaining,resetMinutes}` used consistently across Tasks 1–5. Cross-task dependency noted (Task 2 Step 1 needs Task 3's `getRateLimitPerHour`).
```
