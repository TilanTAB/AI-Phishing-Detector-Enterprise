# Org-wide Deployment — Design Spec

**Date:** 2026-06-17
**Branch:** `feature/org-wide-deployment`
**Status:** Approved — 2026-06-17

## Goal

Make Phishing Checker deployable by an organization so a Google Workspace admin can
turn it on for **all users in their domain**, instead of the current single-developer /
per-email-allowlist model.

## Deployment model (decided)

**Self-hosted per org.** Each organization's own Workspace admin clones the project,
deploys it into the org's own Apps Script + GCP project, configures the org's own AI
provider key, and installs it domain-wide. Each org owns its deployment, its billing,
and its data path.

Rejected alternatives:

- **You publish, orgs share your key** — every org's analyses hit the developer's single
  provider key. Billing and abuse make it unviable past a pilot.
- **You publish, per-org keys** — one Marketplace listing with per-org config. Apps Script
  Script Properties are global to a single script, so per-org config requires a backend.
  This breaks the project's defining "no server, no cloud infra" constraint.

This model keeps the project fully inside Apps Script: **no backend, no multi-tenant
infrastructure.**

## Scope

### In scope (v1)

1. Domain-based access control (`ALLOWED_DOMAINS`), replacing `ALLOWED_USERS`.
2. Per-user rate limiting to protect the org's shared key from runaway/abusive usage.
3. Light settings + access-denied copy updates to match the new model.
4. Admin deployment guide + doc updates so an org admin can actually deploy it.

### Out of scope (flagged, not built)

- Admin usage dashboard / per-user usage reporting.
- Audit-log export.
- Response caching for repeated analyses.
- Org-wide global quota (single shared counter).

These are deliberately deferred; revisit if real usage shows they're needed.

---

## Design

### 1. Access control — domain gating

Rewrite the **body** of `isAllowedUser()` in `addon/Config.gs`. The three call sites in
`addon/Code.gs` (lines 20, 46, 85) are unchanged — they keep calling `isAllowedUser()`.

- Read `ALLOWED_DOMAINS` Script Property: comma-separated domains, e.g.
  `acme.com,acme.co.uk`.
- Resolve the current user via existing `getCurrentUserEmail()`, take the substring after
  the **last** `@`, and exact-match (case-insensitive, trimmed) against the list.
- **Fail-closed:** if `ALLOWED_DOMAINS` is unset or empty, deny everyone. Preserves the
  current security posture exactly.
- `ALLOWED_USERS` is **removed** (per-email allowlist no longer supported).

**Footgun guard:** the deployment doc must warn loudly never to set a public domain
(`gmail.com`, `outlook.com`, etc.), which would allow every consumer account that can
reach the add-on.

**Assumption [Inferred — verify in a real org install]:** in a domain-internal Marketplace
install, `Session.getActiveUser().getEmail()` returns the full corporate email. The manifest
already requests `userinfo.email` (`appsscript.json:25`), which is the precondition. If it
ever returns empty, fail-closed denies the user (safe failure, not a leak).

### 2. Per-user rate limiting

New file `addon/RateLimit.gs`. Gates **only** `analyzeEmailAction` (the paid path that calls
the AI) — not `onGmailMessage` / `buildAddOn`, which only render cards and cost nothing.

Split into two units for testability, matching the existing pure-logic-test convention
(`test_injectionFloor` in `Models.gs`):

- **Pure decision function** `rateLimitDecision(count, limit)` → `{ allowed, remaining }`.
  No network, no service calls. Covered by a new editor-runnable `test_rateLimit()` that
  logs `ALL PASSED`.
- **Storage wrapper** using `CacheService.getUserCache()` with a fixed time window. Per-user
  cache means **no shared-state races** and no `LockService`.

**Window = per hour (decided).** Constraint [Inferred — confirm against Apps Script docs
in implementation]: `CacheService` maximum TTL is ~6 hours, so a 24h counter cannot live in a
single cache entry; a daily window would require `UserProperties`. An hourly cap kills the
real risk (mashing "Analyze" hundreds of times, runaway loops) with the simplest robust
mechanism.

- Config: `RATE_LIMIT_PER_HOUR` Script Property, **default `20`** (decided).
- On limit hit: return a friendly card / notification — "Hourly analysis limit reached, try
  again in N minutes." No AI call is made.
- Counter increments when an analysis is **allowed**, before the AI call.

**Alternative (not chosen for v1):** daily cap via `UserProperties` with a date-stamped
counter, if budget-style daily semantics are preferred over burst protection. Swappable
later without touching the gate site.

### 3. Settings & access-denied copy

- `getSafeDisplayConfig()` (`addon/Config.gs`) surfaces `ALLOWED_DOMAINS` and
  `RATE_LIMIT_PER_HOUR` so an admin can verify config from the Settings card.
- `buildAccessDeniedCard()` (`addon/Card.gs:207`) copy shifts from "not on the allowlist" to
  "your account's domain isn't authorized for this add-on."

### 4. Admin deployment guide (docs)

New `docs/ADMIN_DEPLOYMENT.md` covering the end-to-end org install. "Org only" is enforced
by **three independent layers**, all inside the org's own GCP/Workspace tenant — there is no
central listing the project author publishes; each org clones the repo and publishes its own
internal app.

**Prerequisite:** the GCP project must be owned by the org's Workspace/Cloud Identity
organization. A project under a personal Google account cannot use the Internal user type.
`[Verified]`

1. **Layer 1 — OAuth consent screen = Internal.** Only accounts in the same Workspace org
   can authorize the add-on; external accounts get `access_denied`. Internal apps also skip
   Google's verification review. `[Verified]`
2. **Layer 2 — Marketplace SDK → App Configuration → Visibility = Private.** "Only people
   within your domain can find and install your app"; it appears only in the Internal apps
   section. Set **Installation Settings = Admin Only Install** for an admin-pushed rollout.
   ⚠️ **Irreversible:** once the App Configuration is saved, Public↔Private cannot be changed.
   `[Verified]`
3. **Layer 3 — Admin console domain install.** Super admin: **Apps → Google Workspace
   Marketplace apps → Apps list → Install app →** select app **→ Admin install → Continue →**
   review access **→ "Everyone at your organization" → Finish**. To scope to a subset, choose
   **"Certain groups or organizational units"** and pick OUs/access groups. Propagation can
   take up to 24h. `[Verified]`
4. Set Script Properties: provider key + `ALLOWED_DOMAINS` + `RATE_LIMIT_PER_HOUR`.
5. **Footgun warning:** never set `ALLOWED_DOMAINS` to a public domain (`gmail.com`,
   `outlook.com`, …).

The doc links to the official Google pages rather than freezing console screenshots, which
drift. `ALLOWED_DOMAINS` (spec §1) sits **underneath** these three layers as defense-in-depth:
in the happy path it is redundant with the Marketplace gate, but it is the only thing standing
between a leaked/test-deployed script and open access.

Sources:
- https://developers.google.com/workspace/marketplace/enable-configure-sdk
- https://developers.google.com/workspace/marketplace/configure-oauth-consent-screen
- https://support.google.com/a/answer/172482

Doc updates:

- `README.md` — replace the `ALLOWED_USERS` row/walkthrough with `ALLOWED_DOMAINS` +
  rate-limit, link to the admin guide.
- `docs/MARKETPLACE_LISTING.md` — reframe from "private experimental / developer-administered"
  to org self-host.
- `docs/PRIVACY.md` + `docs/privacy.html` — update allowlist wording to domain gating.

### 5. Testing strategy (two tiers)

The distribution layers cannot be exercised on a consumer `@gmail.com` account, so testing
splits in two:

**Tier A — consumer Gmail (Test deployment).** `Deploy → Test deployments → Install` installs
the add-on for the developer's own account only — no Marketplace, no domain. Validates the
*logic*:

- Add-on functionality end-to-end (open email → Analyze → verdict card).
- `ALLOWED_DOMAINS` allow path (`ALLOWED_DOMAINS=gmail.com`) and deny path (any other value →
  access-denied card). Safe because only the developer's account has the test deployment.
- Per-user rate limiting (repeat Analyze → limit card).
- Editor pure-logic tests: `test_rateLimit()`, plus existing `test_injectionFloor()` /
  `test_buildUserPromptEnvelope()`.

**Tier B — Workspace trial domain (required for distribution).** A consumer account cannot
select the Internal OAuth user type `[Verified]`, publish a Private Marketplace app, or use
the Admin console. A Google Workspace trial domain (with at least a second test user) is
required to validate:

- Layers 1–3 of the distribution flow.
- The §1 assumption that `Session.getActiveUser().getEmail()` returns *other* users' corporate
  emails across the domain — unverifiable with a single account.

"Works for me on Gmail" (Tier A) must not be treated as "works for an org" (Tier B).

---

## Files touched

**New**

- `addon/RateLimit.gs`
- `docs/ADMIN_DEPLOYMENT.md`

**Edit**

- `addon/Config.gs` — `isAllowedUser()` body, `getSafeDisplayConfig()`
- `addon/Code.gs` — rate-limit gate inside `analyzeEmailAction`
- `addon/Card.gs` — `buildAccessDeniedCard()` copy
- `README.md`, `docs/MARKETPLACE_LISTING.md`, `docs/PRIVACY.md`, `docs/privacy.html`

## Blast radius

Access-control change is localized to one function body; the three gate call sites are
untouched. No existing `CacheService` / `LockService` / `UserProperties` usage anywhere in
the codebase, so the rate limiter starts from a clean slate. No existing test references
`ALLOWED_USERS` (`test_injectionFloor`, `test_buildUserPromptEnvelope`, and the Bedrock auth
tests are unaffected).

## Risks / assumptions

1. `getActiveUser().getEmail()` could return empty in some Marketplace edge cases →
   fail-closed denies those users rather than leaking access. **Safe failure.**
2. `CacheService` eviction under memory pressure could reset a counter early → at worst a
   user gets a few extra analyses in a window. Acceptable.
3. Removing `ALLOWED_USERS` is a breaking config change for any existing single-user/
   small-team install. Accepted.

## Resolved decisions

- **Rate-limit window:** hourly via `CacheService` (daily/`UserProperties` deferred).
- **Default `RATE_LIMIT_PER_HOUR`:** `20`.
- **Testing path:** Tier A on consumer Gmail (logic) + Tier B on a Workspace trial domain
  (distribution + cross-user email assumption).
