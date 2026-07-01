# AI Phishing Detector — Gmail Add-on

A Gmail sidebar add-on that uses AI to analyze any open email for phishing indicators and shows a verdict (SAFE / SUSPICIOUS / PHISHING) with a score, confidence, and a list of red flags.

The add-on runs entirely inside Google Apps Script — no server, no Python, no cloud infrastructure to host.

Supports **4 AI providers** switchable by config: Google Gemini, Google Vertex AI, Amazon Bedrock Claude, and Azure OpenAI.

---

## Table of Contents

1. [How It Works](#how-it-works)
2. [Setup Guide](#setup-guide)
3. [AI Provider Configuration](#ai-provider-configuration)
4. [Phishing Score Reference](#phishing-score-reference)
5. [Project Structure](#project-structure)
6. [Security Notes](#security-notes)
7. [Troubleshooting](#troubleshooting)

---

## How It Works

```
Open Email in Gmail
  → Click "Phishing Checker" sidebar icon
  → Click "Analyze for Phishing"
  → AI analyzes sender / URLs / content / auth headers
  → Results card: Verdict · Score · Red Flags · Confidence
```

The add-on inspects:

- Sender legitimacy (domain reputation, spoofing indicators)
- SPF / DKIM / DMARC authentication headers
- URLs (redirects, lookalike domains, suspicious TLDs)
- Urgency and manipulation tactics
- Grammar and language anomalies
- Impersonation indicators (brand or executive spoofing)
- Attachment risk signals

---

## Screenshots

![Phishing Checker Results Card](docs/screenshots/phishing.png)

> The sidebar shows the verdict, score, confidence, assessment summary, and a list of detected red flags grouped by severity.

---

## Setup Guide

The add-on is meant to be deployed once by a developer (single user / small team) or by a
Workspace admin (whole org). End users do not install or configure anything — they just need
an email in one of the `ALLOWED_DOMAINS`.

> **Rolling it out to an entire organisation?** See the
> [Admin Deployment Guide](docs/ADMIN_DEPLOYMENT.md) for the domain-wide private Marketplace
> install flow.

### Prerequisites

- A Google account (Gmail)
- [Node.js](https://nodejs.org) (for the `clasp` CLI)
- One AI provider credential (see [AI Provider Configuration](#ai-provider-configuration))

### Step 1: Install clasp

[clasp](https://github.com/google/clasp) is Google's CLI for managing Apps Script projects locally.

```bash
npm install -g @google/clasp
clasp login
```

`clasp login` opens a browser — sign in with your Google account.

### Step 2: Clone This Repo

```bash
git clone https://github.com/TilanTAB/AI-Phishing-Detector-Enterprise.git
cd AI-Phishing-Detector-Enterprise
```

### Step 3: Create an Apps Script Project

1. Go to [script.google.com](https://script.google.com)
2. Click **New Project**
3. Rename the project to **Phishing Checker**
4. Copy the **Script ID** from the URL: `https://script.google.com/home/projects/SCRIPT_ID_HERE/edit`

Link your local clone to that project:

```bash
cd addon
```

Edit `addon/.clasp.json` and set the `scriptId`:

```json
{
  "scriptId": "YOUR_SCRIPT_ID_HERE",
  "rootDir": "."
}
```

### Step 4: Push Code to Apps Script

```bash
cd addon
npx clasp push
```

You should see all source files uploaded:

```
AIProvider.gs   AzureOpenAI.gs   BedrockClaude.gs
Card.gs         Code.gs          Config.gs
GeminiAI.gs     GmailHelper.gs   Models.gs
Prompt.gs       Utils.gs         VertexAI.gs
appsscript.json
```

### Step 5: Configure Script Properties

Script Properties are the add-on's environment variables — they hold your API keys, the active provider, and the domain allowlist. **Never hardcode secrets in the source files.**

1. In the Apps Script Editor, click the gear icon (**Project Settings**)
2. Scroll down to **Script Properties**
3. Click **Add script property** for each key below

#### Required Properties (All Providers)

| Property | Value | Description |
|---|---|---|
| `AI_PROVIDER` | `gemini` | Active AI provider. Options: `azure_openai`, `bedrock_claude`, `gemini`, `vertex_ai` |
| `ALLOWED_DOMAINS` | `acme.com` | Comma-separated domain allowlist. Required — users outside these domains get an access-denied card. Never use a public domain like `gmail.com`. |

#### Google Gemini API Provider

| Property | Example Value | Description |
|---|---|---|
| `GEMINI_API_KEY` | `AIza...` | API key from [Google AI Studio](https://aistudio.google.com) |
| `GEMINI_MODEL` | `gemini-1.5-pro` | Model name |

#### Google Vertex AI Provider

| Property | Example Value | Description |
|---|---|---|
| `VERTEX_PROJECT_ID` | `my-gcp-project` | GCP project ID |
| `VERTEX_LOCATION` | `us-central1` | Region |
| `VERTEX_MODEL` | `gemini-1.5-pro` | Model name |

> **Note:** Vertex AI uses `ScriptApp.getOAuthToken()` for authentication — no service-account key is stored. The OAuth scope is restricted to what Apps Script grants by default.

#### Amazon Bedrock Claude Provider

Two auth modes are supported. **Bedrock API key takes precedence** if both are set.

**Mode A — Bedrock API key (recommended):**

| Property | Example Value | Description |
|---|---|---|
| `BEDROCK_API_KEY` | `bedrock-...` | Bedrock API key from AWS Console → Bedrock → API keys |
| `AWS_REGION` | `us-east-1` | AWS region where Bedrock is enabled |
| `BEDROCK_MODEL_ID` | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Inference profile ID |

**Mode B — IAM SigV4 (legacy):**

| Property | Example Value | Description |
|---|---|---|
| `AWS_ACCESS_KEY_ID` | `AKIA...` | IAM user access key |
| `AWS_SECRET_ACCESS_KEY` | `abc123...` | IAM user secret key |
| `AWS_REGION` | `us-east-1` | AWS region |
| `BEDROCK_MODEL_ID` | `us.anthropic.claude-haiku-4-5-20251001-v1:0` | Inference profile ID |

> **Important:** Claude 4.x models on Bedrock require an **inference profile ID**, not the bare model ID. Use the `us.anthropic.claude-...` format.

#### Azure OpenAI Provider

| Property | Example Value | Description |
|---|---|---|
| `AZURE_ENDPOINT` | `https://my-resource.openai.azure.com/` | Your Azure OpenAI resource endpoint |
| `AZURE_API_KEY` | `abc123...` | API key from Azure Portal |
| `AZURE_DEPLOYMENT` | `gpt-4o` | Deployed model name |
| `AZURE_API_VERSION` | `2024-10-21` | API version |

#### Optional Properties

| Property | Default | Description |
|---|---|---|
| `TEST_MODE` | `false` | Set to `true` to return a mock result without calling any AI API (useful for UI testing) |
| `RATE_LIMIT_PER_HOUR` | `20` | Max analyses per user per hour. Protects the shared provider key from runaway/abusive usage. |

### Step 6: Deploy as Gmail Add-on

1. In the Apps Script Editor, click **Deploy → Test deployments**
2. Under **Gmail Add-on**, click **Install**
3. Authorize the requested permissions (Gmail current-message read, message action, message metadata, external requests, and user email)
4. Open Gmail — the **Phishing Checker** shield icon appears in the right sidebar

### Step 7: Analyze Your First Email

1. Open any email in Gmail
2. Click the **Phishing Checker** icon in the right sidebar
3. Click **Analyze for Phishing**
4. Wait a few seconds — the results card appears with verdict, score, confidence, and red flags

---

## AI Provider Configuration

### Switching Providers

Change the `AI_PROVIDER` Script Property in Apps Script → Project Settings → Script Properties. No code change required.

### Provider Comparison

| Provider | Best For | Notes |
|---|---|---|
| **Gemini API** | Quick start, free tier | Get key at [aistudio.google.com](https://aistudio.google.com). |
| **Vertex AI** | GCP-native, no API key mgmt | Requires GCP project with Vertex AI enabled. Uses Apps Script OAuth token. |
| **Bedrock Claude** | Claude-quality output, AWS-native | Bearer-token Bedrock API key OR legacy IAM SigV4. Use inference profile IDs for Claude 4.x. |
| **Azure OpenAI** | GPT-4o quality | Requires Azure subscription + deployed model. |

### Bedrock Model IDs (Claude 4.x Inference Profiles)

| Model | Inference Profile ID |
|---|---|
| Claude Haiku 4.5 | `us.anthropic.claude-haiku-4-5-20251001-v1:0` |
| Claude Sonnet 4.5 | `us.anthropic.claude-sonnet-4-5-20251001-v1:0` |
| Claude 3.5 Sonnet v2 | `us.anthropic.claude-3-5-sonnet-20241022-v2:0` |

> Claude 4.x requires inference profile IDs (with `us.` prefix). Direct model IDs return HTTP 400.

---

## Phishing Score Reference

The AI scores every email 0–100 across 6 dimensions (sender, URLs, urgency, grammar, impersonation, attachments).

| Score | Verdict | Display |
|---|---|---|
| 0–30 | ✅ SAFE | Green badge, "No action needed" |
| 31–65 | ⚠️ SUSPICIOUS | Orange badge, red-flags list |
| 66–100 | 🚨 PHISHING | Red badge, red-flags list |

---

## Project Structure

```
AI-Phishing-Detector/
│
├── addon/                          # Gmail Add-on (Google Apps Script source)
│   ├── appsscript.json             # Manifest: scopes, triggers, add-on metadata
│   ├── Code.gs                     # Entry points: onGmailMessage, analyzeEmailAction, buildAddOn
│   ├── Card.gs                     # UI cards: Home, Results, Error, Settings, AccessDenied
│   ├── Config.gs                   # Script Properties + domain allowlist + validation
│   ├── AIProvider.gs               # Provider factory + TEST_MODE mock
│   ├── AzureOpenAI.gs              # Azure OpenAI REST implementation
│   ├── BedrockClaude.gs            # Bedrock (Bearer + SigV4) implementation
│   ├── GeminiAI.gs                 # Gemini API REST implementation
│   ├── VertexAI.gs                 # Vertex AI (Apps Script OAuth token)
│   ├── GmailHelper.gs              # Email fetch, header parsing, URL extraction
│   ├── Models.gs                   # JSON response parsing + PhishingAnalysis model
│   ├── Prompt.gs                   # System prompt + user prompt builder
│   ├── Utils.gs                    # HMAC-SHA256, HTTP fetch, sanitizers
│   └── .clasp.json                 # clasp project link (set your scriptId here)
│
├── docs/                           # GitHub Pages site (homepage, privacy, terms)
│   ├── index.html
│   ├── privacy.html
│   ├── terms.html
│   ├── style.css
│   ├── PRIVACY.md
│   ├── TERMS.md
│   ├── MARKETPLACE_LISTING.md
│   └── screenshots/                # UI screenshots
│
├── demo-emails/                    # Demo emails for testing the add-on
│   ├── 01-phishing.html
│   ├── 02-suspicious.html
│   ├── 03-legitimate.html
│   ├── SendDemoEmails.gs           # Apps Script helper to send the demo emails to yourself
│   └── icon.svg                    # Add-on icon source
│
├── README.md
└── .gitignore
```

---

## Security Notes

- Script Properties in Apps Script are encrypted at rest by Google — safe for API keys
- The add-on requests the minimum Gmail scopes needed: `gmail.addons.current.message.readonly`, `message.action`, `message.metadata`
- Access is restricted by domain via `ALLOWED_DOMAINS` (fail-closed — denies everyone if unset); users outside the allowed domains get an access-denied card
- Per-user hourly rate limiting (`RATE_LIMIT_PER_HOUR`) protects the shared provider key from runaway or abusive usage
- The Vertex AI provider uses `ScriptApp.getOAuthToken()` (short-lived) — no long-lived service-account key is stored
- All AI provider URLs are pinned in `appsscript.json → urlFetchWhitelist` — the add-on cannot make outbound requests to unexpected hosts

---

## Troubleshooting

| Symptom | Fix |
|---|---|
| "Access denied" card | Add your email's domain to the `ALLOWED_DOMAINS` Script Property (comma-separated). |
| "Hourly analysis limit reached" | You hit the per-user cap. Wait for the next hour, or raise `RATE_LIMIT_PER_HOUR`. |
| "Missing Script Properties" error | Go to Project Settings → Script Properties, add all required keys for your active provider. |
| Analysis times out | Switch to a faster model (Haiku, Gemini Flash). Apps Script controls the card-action runtime limit. |
| Bedrock HTTP 400 "inference profile" error | Use inference profile ID format: `us.anthropic.claude-...` instead of the bare model ID. |
| Add-on not appearing in Gmail | In Apps Script Editor → Deploy → Test deployments → Install the Gmail Add-on. Reload Gmail. |

---

## License

MIT
