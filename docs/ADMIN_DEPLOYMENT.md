# Admin Deployment Guide — Org-wide Install

This add-on is **self-hosted per organisation**. Your Workspace admin deploys a private
copy into your own Google Cloud + Apps Script project and installs it domain-wide. Nothing
is hosted by the project author; your org owns the deployment, the AI provider billing, and
the data path.

## Prerequisites

- A Google Workspace (or Cloud Identity) organisation — **a personal @gmail.com account
  cannot do this** (the Internal OAuth user type requires an org-owned GCP project).
- A GCP project owned by your organisation.
- One AI provider credential (see the main [README](../README.md)).
- The add-on code pushed to an Apps Script project via `clasp` (see the README setup steps).

## "Org only" is enforced by three independent layers

### Layer 1 — OAuth consent screen = Internal

In the GCP project: **APIs & Services → OAuth consent screen → User type = Internal**.
Only accounts in the same Workspace org can authorise the add-on; external accounts get
`access_denied`. Internal apps also skip Google's verification review.

### Layer 2 — Marketplace SDK → App Configuration → Visibility = Private

Enable the **Google Workspace Marketplace SDK** (not the API) in the GCP project, then in
**App Configuration** set:

- **App Visibility = Private** — "only people within your domain can find and install your
  app"; it appears only in the **Internal apps** section of the Marketplace.
- **Installation Settings = Admin Only Install** — for an admin-pushed rollout (users can't
  self-install).

> ⚠️ **Irreversible:** once you save the App Configuration page, the Public ↔ Private choice
> cannot be changed. Choose Private deliberately.

### Layer 3 — Admin console domain install

A super admin installs it for the org:

1. **Apps → Google Workspace Marketplace apps → Apps list → Install app**
2. Select the app → **Admin install → Continue**
3. Review the data-access requirements and developer terms
4. **Everyone at your organisation → Finish**

To scope to a subset instead, choose **"Certain groups or organisational units"**, pick the
target OUs/access groups, then **Select → Finish**. Propagation can take up to 24 hours.

## Configure Script Properties

In the Apps Script editor: **Project Settings → Script Properties**.

| Property | Value |
|---|---|
| `AI_PROVIDER` + provider keys | see the main [README](../README.md) |
| `ALLOWED_DOMAINS` | your domain(s), comma-separated, e.g. `acme.com,acme.co.uk` |
| `RATE_LIMIT_PER_HOUR` | per-user hourly analysis cap (default `20` if unset) |

> ⚠️ **Never** set `ALLOWED_DOMAINS` to a public domain (`gmail.com`, `outlook.com`, …) —
> that would allow every consumer account that can reach the add-on. Access is fail-closed:
> if `ALLOWED_DOMAINS` is unset, the add-on denies everyone.

## Testing before rollout

- **Logic** can be tested on a personal account via **Deploy → Test deployments → Install**
  (installs for just your account): domain match, rate limit, and end-to-end analysis.
- **Distribution** (the three layers above + multi-user behaviour) requires a Google
  Workspace **trial** domain with at least a second test user. "Works for me on Gmail" is
  **not** the same as "works for the org."

## Official references

- [Configure your app in the Google Workspace Marketplace SDK](https://developers.google.com/workspace/marketplace/enable-configure-sdk)
- [Configure OAuth consent — Google Workspace Marketplace](https://developers.google.com/workspace/marketplace/configure-oauth-consent-screen)
- [Install Marketplace apps for your organization — Admin Help](https://support.google.com/a/answer/172482)
