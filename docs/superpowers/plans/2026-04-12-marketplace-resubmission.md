# Marketplace Resubmission Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix all 7 issues from the Marketplace rejection and prepare for resubmission.

**Architecture:** Code changes to remove unused Sheet-based allowlist and its scope, new static HTML files for GitHub Pages developer site, and updated Marketplace listing copy with trademark attribution. Console settings are documented as a manual checklist.

**Tech Stack:** Google Apps Script, HTML/CSS (static GitHub Pages), Google Cloud Console (manual)

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `addon/Config.gs` | Remove Sheet-based allowlist code |
| Modify | `addon/appsscript.json` | Drop `spreadsheets.readonly` scope |
| Modify | `docs/MARKETPLACE_LISTING.md` | Replace placeholder URLs with GitHub Pages URLs |
| Create | `docs/.nojekyll` | Disable Jekyll on GitHub Pages |
| Create | `docs/style.css` | Shared minimal responsive stylesheet |
| Create | `docs/index.html` | Developer landing page |
| Create | `docs/privacy.html` | Privacy Policy (HTML) |
| Create | `docs/terms.html` | Terms of Service (HTML) |

---

### Task 1: Remove Sheet-Based Allowlist from Config.gs

**Files:**
- Modify: `addon/Config.gs:58-130`

- [ ] **Step 1: Remove the Sheet priority block from `isAllowedUser()`**

Replace the entire `isAllowedUser()` function (lines 58-89) with this simplified version that only uses the comma-separated `ALLOWED_USERS` property:

```javascript
/**
 * Returns true if the current user is permitted to use the add-on.
 *
 * Reads ALLOWED_USERS from Script Properties (comma-separated emails).
 * If not set or empty, allows all users (default).
 *
 * @returns {boolean}
 */
function isAllowedUser() {
  var currentUser = Session.getActiveUser().getEmail().toLowerCase().trim();
  if (!currentUser) return true; // Can't determine user (e.g. time-based trigger)

  var allowedList = getProp('ALLOWED_USERS');
  if (allowedList && allowedList.trim() !== '') {
    return allowedList.split(',').some(function(email) {
      return email.toLowerCase().trim() === currentUser;
    });
  }

  // Not configured: allow all
  return true;
}
```

- [ ] **Step 2: Delete the `_isUserInSheet()` function**

Remove the entire `_isUserInSheet()` function (lines 100-130) from `Config.gs`. It is no longer called by anything.

- [ ] **Step 3: Commit**

```bash
git add addon/Config.gs
git commit -m "Remove Sheet-based allowlist from Config.gs"
```

---

### Task 2: Drop spreadsheets.readonly Scope from appsscript.json

**Files:**
- Modify: `addon/appsscript.json:26`

- [ ] **Step 1: Remove the scope line**

In `addon/appsscript.json`, remove this line from the `oauthScopes` array:

```
"https://www.googleapis.com/auth/spreadsheets.readonly",
```

The resulting `oauthScopes` array should be:

```json
"oauthScopes": [
  "https://www.googleapis.com/auth/gmail.addons.execute",
  "https://www.googleapis.com/auth/gmail.addons.current.message.readonly",
  "https://www.googleapis.com/auth/gmail.addons.current.message.action",
  "https://www.googleapis.com/auth/gmail.labels",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/script.external_request",
  "https://www.googleapis.com/auth/userinfo.email"
]
```

- [ ] **Step 2: Commit**

```bash
git add addon/appsscript.json
git commit -m "Remove spreadsheets.readonly scope — Sheet allowlist removed"
```

---

### Task 3: Create GitHub Pages Stylesheet

**Files:**
- Create: `docs/style.css`

- [ ] **Step 1: Create `docs/style.css`**

```css
/* Minimal responsive stylesheet for GitHub Pages site */
*,
*::before,
*::after {
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  line-height: 1.6;
  color: #24292e;
  max-width: 720px;
  margin: 0 auto;
  padding: 2rem 1rem;
  background: #fff;
}

h1 {
  border-bottom: 1px solid #e1e4e8;
  padding-bottom: 0.3em;
  font-size: 1.8em;
}

h2 {
  border-bottom: 1px solid #e1e4e8;
  padding-bottom: 0.3em;
  font-size: 1.4em;
  margin-top: 1.5em;
}

h3 {
  font-size: 1.15em;
  margin-top: 1.3em;
}

a {
  color: #0366d6;
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

table {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

th, td {
  border: 1px solid #e1e4e8;
  padding: 0.5em 0.75em;
  text-align: left;
}

th {
  background: #f6f8fa;
}

code {
  background: #f6f8fa;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-size: 0.9em;
}

ul, ol {
  padding-left: 1.5em;
}

li {
  margin-bottom: 0.25em;
}

.nav {
  margin-bottom: 2rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid #e1e4e8;
}

.nav a {
  margin-right: 1.5rem;
}

footer {
  margin-top: 3rem;
  padding-top: 1rem;
  border-top: 1px solid #e1e4e8;
  font-size: 0.85em;
  color: #6a737d;
}
```

- [ ] **Step 2: Commit**

```bash
git add docs/style.css
git commit -m "Add GitHub Pages stylesheet"
```

---

### Task 4: Create GitHub Pages Landing Page

**Files:**
- Create: `docs/index.html`
- Create: `docs/.nojekyll`

- [ ] **Step 1: Create `docs/.nojekyll`**

Create an empty file at `docs/.nojekyll`. This tells GitHub Pages not to process the site with Jekyll.

- [ ] **Step 2: Create `docs/index.html`**

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Phishing Checker — AI Phishing Detector for Gmail™</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="nav">
    <a href="index.html"><strong>Phishing Checker</strong></a>
    <a href="privacy.html">Privacy Policy</a>
    <a href="terms.html">Terms of Service</a>
  </nav>

  <h1>Phishing Checker</h1>
  <p>AI-powered phishing detection for Gmail™. Analyze any email for phishing indicators with a single click.</p>

  <h2>What It Does</h2>
  <p>Phishing Checker is a Gmail™ add-on that uses AI to analyze emails you open for phishing indicators — suspicious URLs, sender spoofing, urgency tactics, credential-harvest patterns, grammar anomalies, and authentication failures (SPF, DKIM, DMARC).</p>

  <h2>How It Works</h2>
  <ol>
    <li>Open any email in Gmail™.</li>
    <li>The Phishing Checker side panel shows a summary of the sender, subject, authentication headers, URLs, and attachments.</li>
    <li>Click <strong>Analyze for Phishing</strong>. The add-on sends email content to the AI provider you configured.</li>
    <li>You get a verdict: <strong>SAFE</strong>, <strong>SUSPICIOUS</strong>, or <strong>PHISHING DETECTED</strong> — with a risk score, plain-English assessment, and red-flag breakdown.</li>
    <li>One-click labeling to triage suspicious emails.</li>
  </ol>

  <h2>Supported AI Providers</h2>
  <ul>
    <li>Google Gemini™</li>
    <li>Google Vertex AI™</li>
    <li>Amazon Bedrock (Claude)</li>
    <li>Azure OpenAI</li>
  </ul>

  <h2>Access</h2>
  <p>This is a private experimental add-on. Access is restricted to authorized Google accounts only. Contact the developer to request access.</p>

  <h2>Source Code</h2>
  <p><a href="https://github.com/TilanTAB/AI-Phishing-Detector">github.com/TilanTAB/AI-Phishing-Detector</a></p>

  <footer>
    <p><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a></p>
    <p>Gmail™, Google Gemini™, and Google Vertex AI™ are trademarks of Google LLC.</p>
  </footer>
</body>
</html>
```

- [ ] **Step 3: Commit**

```bash
git add docs/.nojekyll docs/index.html
git commit -m "Add GitHub Pages landing page"
```

---

### Task 5: Create Privacy Policy HTML Page

**Files:**
- Create: `docs/privacy.html`

- [ ] **Step 1: Create `docs/privacy.html`**

This is the HTML rendering of `docs/PRIVACY.md`. Content is identical; only the format changes.

```html
<!-- Source of truth: docs/PRIVACY.md — keep in sync when editing -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Privacy Policy — AI Phishing Detector</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="nav">
    <a href="index.html"><strong>Phishing Checker</strong></a>
    <a href="privacy.html">Privacy Policy</a>
    <a href="terms.html">Terms of Service</a>
  </nav>

  <h1>Privacy Policy — AI Phishing Detector</h1>
  <p><em>Last updated: April 13, 2026</em></p>

  <h2>Access Restriction</h2>
  <p>This add-on is <strong>private and restricted to authorized users only</strong>. Access is controlled via an allowlist. If your Google account is not on the allowlist, the add-on will display an "Access Restricted" message and will not process any email data. To request access, contact the developer at the support link below.</p>

  <h2>What This Add-on Does</h2>
  <p>AI Phishing Detector is a Gmail™ add-on that analyzes emails you explicitly open and trigger for analysis. It checks for phishing indicators such as suspicious URLs, sender spoofing, urgency tactics, and grammar anomalies.</p>

  <h2>Data We Access</h2>
  <p>When you click <strong>Analyze for Phishing</strong>, the add-on reads the following from the currently open email:</p>
  <ul>
    <li>Sender name and email address</li>
    <li>Email subject</li>
    <li>Email body text (plain text only, up to 5,000 characters)</li>
    <li>URLs found in the email body</li>
    <li>SPF, DKIM, and DMARC authentication headers</li>
    <li>Attachment filenames (not attachment contents)</li>
  </ul>

  <h2>Data We Do NOT Collect</h2>
  <ul>
    <li>We do <strong>not</strong> store, log, or transmit your email content to any server we operate.</li>
    <li>We do <strong>not</strong> read emails you have not opened and triggered for analysis.</li>
    <li>We do <strong>not</strong> share your data with third parties beyond the AI provider you configure.</li>
  </ul>

  <h2>Third-Party AI Providers</h2>
  <p>Email content is sent to the AI provider you configure in Script Properties. You control which provider is used:</p>
  <table>
    <thead>
      <tr><th>Provider</th><th>Privacy Policy</th></tr>
    </thead>
    <tbody>
      <tr><td>Google Gemini™</td><td><a href="https://policies.google.com/privacy">policies.google.com/privacy</a></td></tr>
      <tr><td>Google Vertex AI™</td><td><a href="https://cloud.google.com/terms/cloud-privacy-notice">cloud.google.com/terms/cloud-privacy-notice</a></td></tr>
      <tr><td>Amazon Bedrock (Claude)</td><td><a href="https://aws.amazon.com/privacy/">aws.amazon.com/privacy</a></td></tr>
      <tr><td>Azure OpenAI</td><td><a href="https://privacy.microsoft.com/privacystatement">privacy.microsoft.com/privacystatement</a></td></tr>
    </tbody>
  </table>
  <p>You are responsible for reviewing the privacy policy of your chosen AI provider. Email data sent for analysis is subject to that provider's terms.</p>

  <h2>API Keys and Credentials</h2>
  <p>API keys are stored in Google Apps Script Script Properties, which are encrypted at rest by Google. Keys are never exposed in the add-on UI or logs.</p>

  <h2>No Analytics or Tracking</h2>
  <p>This add-on does not use any analytics, tracking pixels, or telemetry of any kind.</p>

  <h2>Contact</h2>
  <p>For questions or concerns, open an issue at:<br>
  <a href="https://github.com/TilanTAB/AI-Phishing-Detector/issues">github.com/TilanTAB/AI-Phishing-Detector/issues</a></p>

  <footer>
    <p><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a></p>
    <p>Gmail™, Google Gemini™, and Google Vertex AI™ are trademarks of Google LLC.</p>
  </footer>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add docs/privacy.html
git commit -m "Add Privacy Policy HTML page for GitHub Pages"
```

---

### Task 6: Create Terms of Service HTML Page

**Files:**
- Create: `docs/terms.html`

- [ ] **Step 1: Create `docs/terms.html`**

```html
<!-- Source of truth: docs/TERMS.md — keep in sync when editing -->
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Terms of Service — AI Phishing Detector</title>
  <link rel="stylesheet" href="style.css">
</head>
<body>
  <nav class="nav">
    <a href="index.html"><strong>Phishing Checker</strong></a>
    <a href="privacy.html">Privacy Policy</a>
    <a href="terms.html">Terms of Service</a>
  </nav>

  <h1>Terms of Service — AI Phishing Detector</h1>
  <p><em>Last updated: April 13, 2026</em></p>

  <h2>Acceptance</h2>
  <p>By installing and using the AI Phishing Detector Gmail™ add-on, you agree to these terms.</p>

  <h2>Description</h2>
  <p>AI Phishing Detector is an open-source Gmail™ add-on that uses AI to analyze emails for phishing indicators. The source code is available at <a href="https://github.com/TilanTAB/AI-Phishing-Detector">github.com/TilanTAB/AI-Phishing-Detector</a>.</p>

  <h2>Access Restriction</h2>
  <p>This add-on is <strong>private and restricted to specifically authorized Google accounts</strong>. Unauthorized accounts will be denied access and no email data will be processed. The developer reserves the right to grant or revoke access at any time without notice.</p>

  <h2>Your Responsibilities</h2>
  <ul>
    <li>You must provide your own API credentials for the AI provider you choose (Google Gemini™, Amazon Bedrock, Azure OpenAI, or Google Vertex AI™).</li>
    <li>You are responsible for any costs incurred with your chosen AI provider.</li>
    <li>You must comply with the terms of service of your chosen AI provider.</li>
    <li>You must not use this add-on for any unlawful purpose.</li>
  </ul>

  <h2>No Warranty</h2>
  <p>This add-on is provided <strong>as-is</strong>, without warranty of any kind. Phishing detection is probabilistic — results may be incorrect. Do not rely solely on this add-on to determine whether an email is safe. Always apply your own judgment.</p>
  <p>The developer makes no guarantee that:</p>
  <ul>
    <li>The add-on will detect all phishing emails</li>
    <li>The add-on will not produce false positives on legitimate emails</li>
    <li>The add-on will be available without interruption</li>
  </ul>

  <h2>Limitation of Liability</h2>
  <p>The developer shall not be liable for any damages arising from your use of this add-on, including but not limited to acting on incorrect phishing analysis results.</p>

  <h2>Changes</h2>
  <p>These terms may be updated at any time. Continued use of the add-on constitutes acceptance of the updated terms.</p>

  <h2>Contact</h2>
  <p><a href="https://github.com/TilanTAB/AI-Phishing-Detector/issues">github.com/TilanTAB/AI-Phishing-Detector/issues</a></p>

  <footer>
    <p><a href="privacy.html">Privacy Policy</a> · <a href="terms.html">Terms of Service</a></p>
    <p>Gmail™, Google Gemini™, and Google Vertex AI™ are trademarks of Google LLC.</p>
  </footer>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add docs/terms.html
git commit -m "Add Terms of Service HTML page for GitHub Pages"
```

---

### Task 7: Update MARKETPLACE_LISTING.md — Fix ™ and URLs

**Files:**
- Modify: `docs/MARKETPLACE_LISTING.md:21,47-48,50`

- [ ] **Step 1: Fix missing ™ on Google product names**

In `docs/MARKETPLACE_LISTING.md` line 21, replace:

```
(Google Gemini, Google Vertex AI, Amazon Bedrock Claude, or Azure OpenAI)
```

With:

```
(Google Gemini™, Google Vertex AI™, Amazon Bedrock Claude, or Azure OpenAI)
```

- [ ] **Step 2: Replace placeholder URLs**

In `docs/MARKETPLACE_LISTING.md`, replace:

```
- Privacy Policy: <your developer website URL>/privacy
- Terms of Service: <your developer website URL>/terms
```

With:

```
- Privacy Policy: https://tilantab.github.io/AI-Phishing-Detector/privacy.html
- Terms of Service: https://tilantab.github.io/AI-Phishing-Detector/terms.html
```

- [ ] **Step 3: Update trademark footnote**

In `docs/MARKETPLACE_LISTING.md` line 50, replace:

```
Gmail is a trademark of Google LLC.
```

With:

```
Gmail™, Google Gemini™, and Google Vertex AI™ are trademarks of Google LLC.
```

- [ ] **Step 4: Commit**

```bash
git add docs/MARKETPLACE_LISTING.md
git commit -m "Fix ™ attribution and update URLs in MARKETPLACE_LISTING.md"
```

---

### Task 8: Deploy to Apps Script, Merge to Main, and Push

- [ ] **Step 1: Push add-on changes via clasp**

```bash
cd D:/AIProjects/PhishingChecker/addon
clasp push --force
```

Expected: `Pushed N files.`

- [ ] **Step 2: Push feature branch to remote**

```bash
cd D:/AIProjects/PhishingChecker
git push origin feature/outlook-addin
```

- [ ] **Step 3: Merge into main so GitHub Pages can deploy**

GitHub Pages deploys from `main` branch `/docs` folder. The HTML files won't be visible until merged.

```bash
cd D:/AIProjects/PhishingChecker
git checkout main
git merge feature/outlook-addin
git push origin main
git checkout feature/outlook-addin
```

---

### Task 9: Console Settings (Manual — User Performs)

These steps are performed by the user in the browser. Not automatable.

- [ ] **Step 1: Enable GitHub Pages**

Go to: `https://github.com/TilanTAB/AI-Phishing-Detector/settings/pages`
- Source: "Deploy from a branch"
- Branch: `main`
- Folder: `/docs`
- Click Save

Verify: Visit `https://tilantab.github.io/AI-Phishing-Detector/` — should show landing page.

- [ ] **Step 2: Register OAuth scopes on consent screen**

Go to: Google Cloud Console → APIs & Services → OAuth consent screen → Edit App → Scopes → Add or Remove Scopes

Add these 7 scopes (search and check each one):

```
https://www.googleapis.com/auth/gmail.addons.execute
https://www.googleapis.com/auth/gmail.addons.current.message.readonly
https://www.googleapis.com/auth/gmail.addons.current.message.action
https://www.googleapis.com/auth/gmail.labels
https://www.googleapis.com/auth/gmail.readonly
https://www.googleapis.com/auth/script.external_request
https://www.googleapis.com/auth/userinfo.email
```

Click Update → Save and Continue.

- [ ] **Step 3: Register OAuth scopes in Marketplace SDK**

Go to: Google Cloud Console → Marketplace SDK → App Configuration → OAuth scopes

Paste the same 7 scope URLs listed above.

Save.

- [ ] **Step 4: Update Store Listing descriptions**

Go to: Marketplace SDK → Store Listing

**Important:** The Marketplace SDK description fields may not render Markdown. When pasting, strip Markdown syntax: remove `**bold**` markers, `###` headers, and `- ` list prefixes. Convert to plain text or use the field's own formatting tools if available.

**Short description** — paste from `MARKETPLACE_LISTING.md` "Short Description" section:

```
AI-powered phishing detection for Gmail™. Click "Analyze for Phishing" on any open email and get an instant verdict (Safe / Suspicious / Phishing) with a risk score, red-flag breakdown, and one-click labeling.
```

**Detailed description** — paste the entire "Detailed Description" section from `MARKETPLACE_LISTING.md` (from "Phishing Checker is an open-source..." through "Gmail™, Google Gemini™, and Google Vertex AI™ are trademarks of Google LLC."). Strip Markdown formatting before pasting.

- [ ] **Step 5: Update developer URLs**

In the same Store Listing page:
- Developer website: `https://tilantab.github.io/AI-Phishing-Detector/`
- Privacy Policy URL: `https://tilantab.github.io/AI-Phishing-Detector/privacy.html`
- Terms of Service URL: `https://tilantab.github.io/AI-Phishing-Detector/terms.html`

- [ ] **Step 6: Switch publishing status**

Go to: Marketplace SDK → Store Listing → Visibility
- Change from "Testing" to "In production"
- Keep visibility as "Unlisted"

- [ ] **Step 7: Resubmit for review**

Click "Submit" / "Publish" to resubmit the listing for review.
