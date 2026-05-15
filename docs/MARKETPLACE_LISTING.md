# Google Workspace Marketplace Listing Copy

Paste these into the Marketplace SDK → Store Listing tab.

---

## Short Description (max ~220 chars)

AI-powered phishing detection for Gmail™. Click "Analyze for Phishing" on any open email and get an instant verdict (Safe / Suspicious / Phishing) with a risk score, red-flag breakdown, and detailed assessment.

---

## Detailed Description

**Phishing Checker** is an open-source Gmail™ add-on that helps you decide whether an email you're looking at is a phishing attempt — without ever leaving your inbox.

### How it works

1. Open any email in Gmail™ on web or mobile.
2. The Phishing Checker side panel appears with a summary of the sender, subject, authentication headers (SPF, DKIM, DMARC), URLs, and attachments.
3. Click **Analyze for Phishing**. The add-on sends the email content to the AI provider you have configured (Google Gemini™, Google Vertex AI™, Amazon Bedrock Claude, or Azure OpenAI).
4. Within seconds you get a verdict card showing:
   - A **risk score** from 0 to 100
   - A **verdict badge**: SAFE, SUSPICIOUS, or PHISHING DETECTED
   - A **plain-English assessment** of why
   - A **red-flag list** with severity (high / medium / low) covering URL spoofing, sender spoofing, urgency tactics, credential-harvest patterns, grammar anomalies, and authentication failures
5. Use the verdict and red-flag breakdown to decide how to handle the email.

### Key features

- **Bring your own AI key** — you choose the AI provider and pay only that provider directly. No middle-man server.
- **No data stored anywhere** — the add-on processes email content in-memory and forwards it only to the AI provider you chose. Nothing is logged or saved on any server we control.
- **Authentication-aware** — checks SPF, DKIM and DMARC headers as part of the verdict.
- **Context-sensitive URL scoring** — distinguishes legitimate marketing redirects (e.g. unsubscribe trackers) from credential-harvest landing pages.
- **Open source** — every line of code is auditable.

### Who it is for

This is a private experimental add-on. Access is restricted to a specific allowlist of authorized Google accounts maintained by the developer. If your account is not on the allowlist, the add-on will display an "Access Restricted" message and will not process any email content. Contact the developer to request access.

### Setup

After installing, the add-on owner must configure the AI provider credentials in Google Apps Script Script Properties. See the project README for the full setup walkthrough.

### Privacy & Terms

- Privacy Policy: https://tilantab.github.io/AI-Phishing-Detector/privacy.html
- Terms of Service: https://tilantab.github.io/AI-Phishing-Detector/terms.html

Gmail™, Google Gemini™, and Google Vertex AI™ are trademarks of Google LLC.
