# Setup & integrations

Everything below is optional until you need the feature. Without credentials the app still runs; the
related screens show a clear "not configured" state instead of failing.

## Required environment (`.env.local`)

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB (users, Drive metadata, family circles, legacy plans) |
| `JWT_SECRET` | Session signing. **Required in production.** |
| `ENCRYPTION_KEY` | AES-256-GCM key for server-held secrets (Drive refresh tokens, TOTP secrets). **Set a long random value in production.** |
| `APP_URL` | Public origin, e.g. `https://app.example.com` (used in invite links and OAuth redirects) |

## Google sign-in (existing)
`NEXT_PUBLIC_GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_ID` – OAuth client used by "Continue with Google".

## Google Drive (Documents)
1. Google Cloud Console → APIs & Services → enable **Google Drive API**.
2. OAuth consent screen: add scope `https://www.googleapis.com/auth/drive.file` (non-sensitive; only files this app creates).
3. Credentials → OAuth client (Web). Authorised redirect URI: `${APP_URL}/api/drive/callback`.
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`.

Design: each user connects their own Drive. Only the refresh token is stored (encrypted); access tokens are
minted per request and never sent to the browser. Files are proxied through the server, which checks ownership.
Expired/revoked grants are detected (`invalid_grant`) and the UI asks the user to reconnect. Disconnect revokes
the grant at Google. A folder tree `My Wealth App/{Personal,Identity,Bank,Investment,Insurance,Property,Family}`
is created lazily on first upload.

## Email (invites, legacy reminders, OTPs)
`RESEND_API_KEY`, `RESEND_FROM`. Without them, invite links are shown to the inviter to share manually, and
in development OTPs are displayed on screen.

## SMS (legacy verification) – configurable provider
`SMS_PROVIDER=twilio`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`.
Add another provider by registering a `send({to, body})` function in `lib/legacy/providers.js`.

## Push notifications (legacy "are you safe?")
Install `web-push`, generate VAPID keys, set `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`,
and register a service worker that stores its subscription via `POST /api/legacy-plan {action:'push-subscription'}`.
Until then the workflow falls back to email, so the confirmation step is never silently skipped.

## Digital Legacy scheduler
Call once a day: `GET /api/legacy-plan/cron` with header `Authorization: Bearer $CRON_SECRET`
(Vercel Cron, GitHub Actions, cron-job.org…). Set `CRON_SECRET` to a long random string.

## Mutual fund search and NAVs (mfapi.in)
No setup and no key. The server calls the free public API https://api.mfapi.in:
* `GET /mf/search?q=` when someone types a fund name in Add fund (typing waits 400 ms, needs three letters, answers are cached for an hour, and this app allows 30 searches a minute per person).
* `GET /mf/{schemeCode}/latest` for a linked fund's current NAV (cached for six hours). Each fund is looked up at most once a day, from the daily automatic refresh or the Refresh NAVs button.

mfapi.in asks to be called sparingly and does not publish its limits, so the app caches and never polls. If it is down, funds keep their last NAV and the screen says how old it is.

---

# Architecture notes

* **Wealth data** (banks, funds, cards, policies, budget, expenses, net-worth snapshots, goals) lives in a per-user IndexedDB
  (Dexie) on each device and is synced to MongoDB through `/api/sync` (`lib/wealth/sync.js`), so every signed-in device
  stays in step. Records other than the vault are **not end-to-end encrypted**; the server does not read inside them.
  Demo Mode uses `mm-wealth-demo` and a cookie-only session (`mm-demo`), never syncs, and can never read or write a real
  account. Settings, Data still has export and restore.
* **Calculations** are pure and tested: `lib/wealth/calc.js` (net worth, XIRR, utilisation, budget pacing, SIP dates),
  `lib/family/visibility.js`, `lib/legacy/stateMachine.js`, `lib/vault/crypto.js`, `lib/totp.js`. Run `npm test`.
* **Vault** is zero-knowledge: PBKDF2-SHA256 (600k) → AES-256-GCM via WebCrypto, recovery key, optional WebAuthn-PRF biometrics.
  Vault items are encrypted in the browser and synced only as ciphertext, so the server cannot read them. The old server-side `PasswordEntry` data is **not** migrated (it was readable by the server).
* **Family Circle**: members control what *they* share; admins manage membership only. Server enforces visibility.
* **Auth**: email+password (scrypt), TOTP MFA, Google, rate limiting (IP + per-account), Demo.
  Known gap: no email verification or password-reset-by-email yet.

## Demo totals
Assets ₹1,05,45,000 · Liabilities ₹20,00,000 · Net worth ₹85,45,000. To keep liabilities at exactly ₹20L while
including a ₹45,000 card balance, the demo home loan is ₹17,55,000 (spec listed ₹18L).

## Legacy code still in the repo (candidates for deletion)
The previous app's API routes and Mongoose models (`app/api/{transactions,budgets,goals,...}`, `models/*`) are no longer
used by any screen. They were left in place so nothing is removed from the database layer without review.
