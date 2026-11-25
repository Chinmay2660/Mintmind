# Mintmind: personal and family wealth

Mintmind is a web app (also installable as a PWA) for keeping one clear picture of your money: net worth, bank accounts,
investments, cards, insurance, budgets and goals, with selective sharing for a family, a zero-knowledge password vault,
documents in your own Google Drive, and a Digital Legacy plan.

Everything described below was checked against the code. Where something needs a service you must set up, or has not been
tested end to end, it says so. The audit behind this is in [docs/PRODUCT_AUDIT.md](docs/PRODUCT_AUDIT.md).

## Vision

One unified financial picture instead of disconnected tools: every record feeds the net worth, the dashboard and the
reminders. The app is calm about money (missing months stay empty, no streaks, no rewards) and honest about what is
**entered by you, imported from a file, estimated by a formula, or fetched from a public source**.

## Try it

Open the app and choose **Explore Demo Account**: no sign-up, sample family data stored only in your browser. The demo
never syncs to a server.

## Modules

| Module | What it does | Notes |
| --- | --- | --- |
| **Dashboard** | Net worth with change over a month, quarter or year; assets and liabilities; bank, fund, card and insurance cards; allocation; health score; upcoming dues; recent activity; shortcut tiles | Sections can be reordered or hidden |
| **Net Worth** | Overview, Goals and Forecast tabs; history chart with Monthly/Yearly and a date range (presets or custom); milestones; yearly PPF and NPS limits; printable statement; CSV and Excel export | Net worth is assets minus loans |
| **Bank Accounts** | Accounts, cash, balance updates with history, per-account detail | Balances change when transactions are recorded |
| **Investments** | Portfolio, mutual funds (units, NAV, SIPs, XIRR), fixed and recurring deposits, EPF/PPF/NPS, stocks and ETFs, gold, and **Property & other** (real estate, vehicles, other assets) | Renew a matured FD; add PPF/NPS contributions from the account page |
| **Cards** | Credit and debit cards, limits, utilisation, due dates | |
| **Insurance** | Policies by type (one at a time), cover, premiums and renewal dates, an attached document | The only record type with a document link today |
| **Budget & Expenses** | Five sections: Overview, Budgets, Transactions (list, calendar, to review), Insights (monthly, summary, stats, cash flow), Recurring | Categories and rules are set up in Settings > Budget |
| **Ledger** | Account movements with running balances | |
| **Family Circle** | Members as cards, each with a role and the figures they chose to share; "what others see of you" preview | One set of sharing choices for the whole circle |
| **My Vault** | Passwords and secure notes, encrypted in the browser | Auto-locks after 5 minutes by default |
| **Documents** | Files in your own Google Drive, by category | Needs a Google connection; files are **not** encrypted by Mintmind |
| **Digital Legacy** | Trusted contacts and a handover workflow | Delivery needs email, SMS or push to be configured |
| **My Wealth AI** | Questions, quick add, health score, report | Optional; needs an AI provider key |
| **Planning tools** | Plan ahead, money check-up, emergency fund, loan payoff, insurance cover, retirement | Also public at `/tools` |
| **Settings** | Account, features, appearance (ten looks, light/dark/system), preferences, **budget (categories and rules)**, automation, AI, integrations, data (sync status, export, restore) | |

### Budget and expenses

Budgets are monthly by default and copy forward each month. A category can instead be quarterly, yearly or a custom
range, and monthly categories can roll over what is unspent. Sub-categories are written `Parent > Child`. Each category
shows its limit, what is spent, what is left, and a **today marker** for the pace.

**CSV import** (Transactions > Import CSV): column mapping, rules fill categories, entries wait in Review. Every row gets
an exact fingerprint, so importing the same file again leaves them out; likely duplicates of existing entries are left
out by default; the success message offers Undo. Review has select-all, set-category and mark-reviewed. Statement PDFs
(CAMS/KFintech CAS, NSDL/CDSL, NPS, EPF) can be imported from Investments, with a preview before saving.

### Investments: what is what

- **Mutual funds:** units, invested amount and transactions are yours; **NAV** comes from AMFI's public daily file, shown
  with its date and when it was last refreshed, flagged "may be out of date" after four business days. A refresh changes
  only NAV and derived value, never units, invested amount or history (unit-tested).
- **FD and RD values** are formulas (quarterly compounding) from the rate and dates you enter. **EPF, PPF, NPS** balances are
  what you enter. Neither is fetched from any provider.
- Zerodha Kite can supply prices but is **off by default** (`KITE_ENABLED`) because its terms limit redistributing data.

### Keyboard and touch

`/` or `Ctrl/Cmd+K` search, `G` then a letter to go to a page, `A` add a transaction, `1` to `5` switch Budget sections,
`P` hide balances, `?` lists them all. On a phone: swipe sideways for months, long-press to select rows, drag a sheet down
to close it, swipe right from the left edge to go back. Search finds pages, transactions, accounts, funds, assets, goals,
policies, documents, and Vault item names while the vault is unlocked.

## Responsive design

Measured in the demo account: no horizontal scroll from 320px to 600px on the main pages, a bottom bar with a **More**
sheet as the only phone menu, the sidebar from 768px, tables with card layouts on phones (Ledger, funds, import preview),
content capped at 1408px (1920px from 2200px wide). Known issues: three percentage labels clip at 768px on the dashboard,
and a card stretches very wide at 2560px. Not tested on physical devices.

## PWA and offline

`public/manifest.json` and `public/sw.js` make the app installable and cache the app shell. Signed-in data is read from a
local IndexedDB copy, so previously loaded pages and data open offline; changes made offline are sent when the
connection returns. Documents (Google Drive) need a connection. The tab icon follows the chosen look; an installed app's
home-screen icon is fixed when installed.

## Where data lives

Signed-in data lives **on the server** (MongoDB, the `SyncDoc` collection behind `/api/sync`) so the same account works on
every device, with a local copy on each device (Dexie, `lib/wealth/sync.js`). Changes are pushed shortly after they are made
and pulled when the app opens, regains focus or comes back online. Conflicts are per record: an edit not yet sent from
this device is kept, otherwise the server's copy wins. **Vault items are encrypted in the browser and stored as
ciphertext. Other records (accounts, transactions, funds, goals) are not end-to-end encrypted**; the server does not read
inside them, but they are not hidden from someone with database access. Settings > Data shows sync status and offers export
and restore. Demo data stays in the browser.

## Security and privacy

- Passwords are hashed with scrypt; sign-in supports TOTP and Google; attempts are rate-limited (per server instance);
  cookies are httpOnly.
- **Forgot password:** `/auth/forgot` emails a one-hour single-use link (needs `RESEND_API_KEY` and `RESEND_FROM`; without
  them nothing is sent, and in development the link is printed in the server log). Only a hash of the token is stored, the
  answer never reveals whether an address has an account, and a reset or password change signs out other devices.
  Signing out ends that token on the server. **These server paths have unit tests for the rules but have not been run
  against a database in this audit.**
- The vault uses PBKDF2-SHA256 (600,000 iterations) and AES-256-GCM, with a recovery key; a lost master password and
  recovery key cannot be reset. Biometric unlock is per device.
- Stored tokens and shared family figures are encrypted at rest with `ENCRYPTION_KEY`. In production `ENCRYPTION_KEY` and
  `JWT_SECRET` must be set or the app refuses to run.
- Requests that change data are refused when their `Origin` is another site. Security headers are set in `middleware.ts`.
- "Hide balances" masks every amount drawn as text and in charts; the AI assistant works from real figures.
- Not done: email verification at sign-up, an app-wide PIN, restricting script sources in the CSP, a shared rate-limit store.

## Technology stack

Next.js 16 (App Router), React 19, Tailwind CSS (CSS-variable tokens, ten selectable looks), Recharts, Dexie (IndexedDB),
MongoDB with Mongoose, WebCrypto, Radix UI primitives, `pdfjs-dist` and `xlsx` for imports and exports.

## Architecture

- **Client:** pages under `app/(routes)/dashboard`, read from IndexedDB through `WealthContext` (`lib/wealth/WealthContext.tsx`).
  Pure calculation modules in `lib/wealth` (net worth, XIRR, budgets, holdings, import) with unit tests.
- **Sync:** `lib/wealth/sync.js` to `/api/sync` (one `SyncDoc` per record per user).
- **Server:** route handlers in `app/api`, Mongoose models in `models/`, `middleware.ts` for origin checks, rate limits and headers.
- **Market data:** a daily job (`/api/internal/market-sync`) fills a shared price cache from AMFI; the app reads it once a day.
- **Documents:** Google Drive through `lib/google/drive.js` with the `drive.file` scope; metadata in MongoDB, bytes in Drive.
- **Offline/PWA:** `public/sw.js`, `public/manifest.json`.

## Project structure

```
app/                 pages and API routes (dashboard in app/(routes)/dashboard, API in app/api)
components/          ui (shared), shell (navigation), wealth (records and budget), vault, family, landing, ai
contexts/            privacy, search
lib/                 wealth (calculations, import, sync), family, legacy, vault, market, ai, google, middleware, sync
models/              Mongoose models
public/              service worker, manifest, icons, fonts
docs/                audits, integrations, design system
```

## Installation and development

Requirements: Node.js 20 or newer and a MongoDB database (local or Atlas). The app does not start without `MONGODB_URI`.

```bash
cp .env.example .env.local   # then replace every dummy value
npm install
npm run dev                  # http://localhost:3000
```

| Command | Does |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build` / `npm start` | Production build and server |
| `npm test` | Unit tests (`node --test`, 280+ tests) |
| `npm run lint` | ESLint (has existing errors, mostly one React rule; see the audit) |

### Environment variables

`.env.example` lists every variable with a **dummy** value that only shows the format. Replace each one; leave an optional
integration blank to switch it off.

| Variable | Needed | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | Accounts and synced data |
| `JWT_SECRET` | Production | Signs session cookies |
| `ENCRYPTION_KEY` | Production, 32+ chars | Encrypts stored tokens and shared family figures |
| `APP_URL`, `NEXT_PUBLIC_APP_URL` | Yes | Public URL for OAuth callbacks and emailed links |
| `NEXT_PUBLIC_DEMO_MODE` | No | Shows the sample-family demo |
| `CRON_SECRET` | For scheduled jobs | Protects `/api/internal/*` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | No | Google sign-in and Drive |
| `KITE_ENABLED`, `KITE_API_KEY`, `KITE_API_SECRET`, `MARKET_EQUITY_SYMBOLS` | No | Zerodha prices; off unless `KITE_ENABLED=1` |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`, `AI_DAILY_LIMIT` | No | AI assistant (`none`, `anthropic`, `openai`) |
| `RESEND_API_KEY`, `RESEND_FROM` | No | Password-reset, invitation and legacy emails |
| `SMS_PROVIDER`, `TWILIO_*`, `LEGACY_NOTIFY_WEBHOOK` | No | Legacy SMS and webhook |
| `UPLOAD_DIR`, `UPLOAD_MAX_BYTES` | No | Local uploads |

Google Drive, SMS, push and Kite setup: [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).

## Testing

`npm test` runs unit tests for calculations (net worth, XIRR, budgets, holdings, FD renewal), import and duplicate
detection, NAV freshness and matching, family visibility, legacy workflow, vault crypto, TOTP, auth token rules, and a
contrast check of the accent colour in every look. Browser behaviour was checked by hand in the demo account; there is no
automated browser test suite.

## Deployment

Any Node host works; the live app runs on Vercel. Set the production variables, point `MONGODB_URI` at a backed-up
database, and schedule `GET {APP_URL}/api/internal/market-sync` daily in the evening IST with
`Authorization: Bearer $CRON_SECRET` for fresh NAVs. Serverless hosts limit request body size, which can affect large
document uploads that go through the server.

## Current limitations

- Documents are not attachable to funds, FDs, loans or accounts (only insurance); no Drive picker or direct upload.
- Family sharing is one set of choices for the whole circle, not per member.
- No email verification at sign-up; no app-wide PIN.
- No bank feeds and no live market data beyond the daily AMFI NAV file; stocks and gold are entered by hand.
- Multi-currency is not built. FD maturity uses a 365-day year, which differs by about ₹20 per ₹1 lakh on a leap-year term.
- Mutual fund realised gains are not calculated.
- Screen-reader, real-device and load testing have not been done.

## Planned

Attach documents to records with direct Drive upload and the Google Picker; per-member family permissions; an
attention strip on the dashboard; goal required-contribution text; realised gains; account-aggregator feasibility.
Planned items are not available today.
