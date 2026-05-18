# Google Workspace Marketplace Listing Copy

Paste these into the Marketplace SDK → Store Listing tab.

---

## Short Description (max ~220 chars)

AI-powered phishing detection for Gmail™. Click "Analyze for Phishing" on any open email and get an instant verdict (Safe / Suspicious / Phishing) with a risk score, red-flag breakdown, and detailed assessment.

---

## Detailed Description

Phishing Checker is an open-source Gmail™ add-on that helps you decide whether an email you are looking at is a phishing attempt — without ever leaving your inbox.

Click "Analyze for Phishing" on any open email and within seconds you get a clear verdict — SAFE, SUSPICIOUS, or PHISHING DETECTED — together with a 0–100 risk score, a plain-English assessment of why, and a red-flag breakdown by severity.

### How it works

1. Open any email in Gmail™ on web or mobile. The Phishing Checker side panel appears with a summary of the sender, subject, authentication headers (SPF, DKIM, DMARC), URLs, and attachment names.

2. Click "Analyze for Phishing". The add-on sends the email content to the AI provider configured by the developer (Amazon Bedrock Claude, Google Gemini™, Google Vertex AI™, or Azure OpenAI).

3. Within seconds you get a verdict card showing:
   - A risk score from 0 to 100
   - A verdict badge: SAFE, SUSPICIOUS, or PHISHING DETECTED
   - A plain-English explanation of why
   - A red-flag list with severity (high / medium / low)

4. Use the verdict and red-flag breakdown to decide how to handle the email — delete it, report it as phishing to Gmail™, or trust it.

### What it analyzes

The add-on examines every email along six dimensions:

- Sender authentication — SPF, DKIM, and DMARC results from the email's Authentication-Results header. Failures here are a strong signal of sender spoofing.
- URL safety — distinguishes legitimate marketing redirects (e.g. unsubscribe trackers) from credential-harvest landing pages by checking destination domains against the visible link text.
- Sender legitimacy — checks the From and Reply-To header pair for mismatches, lookalike domains, and impersonation of well-known brands.
- Urgency and pressure tactics — flags language patterns used in social-engineering attacks: account suspension threats, payment failures, fake security alerts.
- Credential-harvest patterns — detects asks for passwords, security codes, banking info, or one-time codes that should never be shared via email.
- Grammar and language anomalies — picks up the linguistic inconsistencies typical of mass-produced phishing campaigns.

### Setup

The add-on is configured per-installation by the developer (the owner of the Apps Script project). The developer sets up an AI provider in Apps Script Script Properties — choosing one of:

- Amazon Bedrock Claude (Bedrock API key or AWS IAM credentials)
- Google Gemini™
- Google Vertex AI™
- Azure OpenAI

All allowlisted users share this single configuration. Per-user keys are not supported — to change provider or model, allowlisted users contact the developer. See the project README for the full setup walkthrough.

### Privacy

- **Developer-administered AI provider** — the developer configures one AI provider in Apps Script Script Properties. All allowlisted users share this configuration. Email content goes directly from your Gmail to the configured provider — no middle-man server is in the data path.
- **No data is stored anywhere we control.** The add-on processes email content in-memory and forwards it only to the AI provider the developer chose.
- **Allowlist gating.** This is a private experimental add-on. Access is restricted to a specific allowlist of authorized Google accounts maintained by the developer. If your account is not on the allowlist, the add-on displays an "Access Restricted" message and processes nothing.
- **Open source.** Every line of code is publicly auditable.

### Who it is for

This add-on is suitable for individuals and small teams who:

- Want a second opinion on suspicious emails without forwarding them to a security team
- Prefer AI-powered analysis over hand-crafted rules
- Are happy to share a single AI provider configuration administered by the developer
- Need transparency about exactly what the analysis software is doing (open source)

### Privacy & Terms

- Privacy Policy: https://tilantab.github.io/AI-Phishing-Detector/privacy.html
- Terms of Service: https://tilantab.github.io/AI-Phishing-Detector/terms.html

Gmail™, Google Gemini™, and Google Vertex AI™ are trademarks of Google LLC.
