# Marketplace Resubmission — Design Spec

**Date:** 2026-04-12
**Status:** Approved
**Goal:** Fix all 6 rejection issues and resubmit Phishing Checker to Google Workspace Marketplace.

---

## Context

The Phishing Checker add-on (App ID: 250041239639) was rejected by the Google Workspace Marketplace Review Team. The rejection cited trademark attribution issues explicitly, and 5 additional issues were identified from the review feedback.

## Issues to Fix

### Issue 1: Google Trademark Attribution
**Where:** Marketplace SDK Store Listing (short + detailed descriptions)
**Fix:** Add ™ symbol to all Google product references (Gmail™, Google Gemini™, Google Vertex AI™). Add footnote: "Gmail is a trademark of Google LLC."
**Already done in:** `docs/MARKETPLACE_LISTING.md`, `docs/PRIVACY.md`, `docs/TERMS.md`

### Issue 2: Short ≠ Detailed Description
**Where:** Marketplace SDK Store Listing
**Fix:** Short and detailed descriptions must be meaningfully different. Already addressed — `MARKETPLACE_LISTING.md` has a ~220 char short description and a multi-section detailed description.

### Issue 3: Extended Detailed Description
**Where:** Marketplace SDK Store Listing
**Fix:** Detailed description must explain what the app does and how to use it. Already addressed in `MARKETPLACE_LISTING.md` with "How it works" steps, "Key features", "Who it is for", and "Setup" sections.

### Issue 4: Developer Website (No GitHub Repo URLs)
**Where:** Marketplace SDK Store Listing (Developer website, Privacy Policy URL, Terms URL)
**Fix:** Set up GitHub Pages on `TilanTAB/AI-Phishing-Detector` repo serving from `main` branch `/docs` folder.

**New files to create:**
- `docs/index.html` — Landing/developer site page
- `docs/privacy.html` — Privacy Policy (HTML version of PRIVACY.md)
- `docs/terms.html` — Terms of Service (HTML version of TERMS.md)
- `docs/style.css` — Shared minimal responsive stylesheet
- `docs/.nojekyll` — Disable Jekyll processing

**URLs:**
- Developer website: `https://tilantab.github.io/AI-Phishing-Detector/`
- Privacy: `https://tilantab.github.io/AI-Phishing-Detector/privacy.html`
- Terms: `https://tilantab.github.io/AI-Phishing-Detector/terms.html`

### Issue 5: OAuth Scopes on Permissions Tab
**Where:** Google Cloud Console (OAuth consent screen + Marketplace SDK App Configuration)
**Fix:** Register all scopes from `appsscript.json` in both:
1. APIs & Services → OAuth consent screen → Edit App → Scopes
2. Marketplace SDK → App Configuration → OAuth scopes

**Scopes (7 total — spreadsheets.readonly removed, see Issue 7):**
```
https://www.googleapis.com/auth/gmail.addons.execute
https://www.googleapis.com/auth/gmail.addons.current.message.readonly
https://www.googleapis.com/auth/gmail.addons.current.message.action
https://www.googleapis.com/auth/gmail.labels
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/script.external_request
https://www.googleapis.com/auth/userinfo.email
```

### Issue 6: Publishing Status
**Where:** Marketplace SDK → Store Listing → Visibility
**Fix:** Switch from "Testing" to "In production" (keep visibility as Unlisted). "Testing" causes 403 for reviewers.

### Issue 7: Remove Unused spreadsheets.readonly Scope (New)
**Where:** `addon/Config.gs`, `addon/appsscript.json`
**Fix:** Remove the Google Sheet-based allowlist (`_isUserInSheet()` function, Sheet priority block in `isAllowedUser()`) and drop the `spreadsheets.readonly` scope. The comma-separated `ALLOWED_USERS` Script Property is sufficient and requires no extra scope.

**Code changes:**
- `Config.gs`: Remove `_isUserInSheet()` function and Sheet priority block in `isAllowedUser()`
- `appsscript.json`: Remove `spreadsheets.readonly` from `oauthScopes`

## Out of Scope

- Outlook add-on porting (separate project)
- Any changes to the AI analysis logic (Prompt.gs)
- Any changes to the card UI (Card.gs, Code.gs) beyond what's needed for the allowlist simplification

## Console Settings Checklist (Manual Steps)

After code changes are pushed:

1. **GitHub Pages:** Repo Settings → Pages → Source: "Deploy from a branch" → Branch: `main`, folder: `/docs`
2. **OAuth Consent Screen:** Google Cloud Console → APIs & Services → OAuth consent screen → Edit App → Scopes → Add all 7 scopes listed above
3. **Marketplace SDK — App Configuration:** Paste the same 7 scope URLs in OAuth scopes section
4. **Marketplace SDK — Store Listing:**
   - Paste new short description (from MARKETPLACE_LISTING.md)
   - Paste new detailed description (from MARKETPLACE_LISTING.md)
   - Developer website: `https://tilantab.github.io/AI-Phishing-Detector/`
   - Privacy Policy: `https://tilantab.github.io/AI-Phishing-Detector/privacy.html`
   - Terms of Service: `https://tilantab.github.io/AI-Phishing-Detector/terms.html`
5. **Publishing Status:** Switch from "Testing" → "In production", keep Unlisted
6. **Resubmit** for review
