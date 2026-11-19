# Mintmind – Personal & Family Wealth

Track net worth, bank accounts, investments (mutual funds with XIRR, FDs, RDs, EPF, PPF, NPS, ETFs, gold), credit and
debit cards, insurance, goals and budgets. Share selectively with family, keep passwords in a zero-knowledge vault,
documents in your own Google Drive, and set up a Digital Legacy plan. Light, Dark and System themes; installable as a PWA.

## Modules

Dashboard · Net Worth (with goals and yearly PPF / NPS limits) · Bank Accounts · Investments · Cards · Insurance ·
Budget & Expenses · Ledger · Family Circle · My Vault · Documents · Digital Legacy · AI assistant · Settings.

### Budget & Expenses

| Tab | What it does |
| --- | --- |
| Overview | Month totals, daily pacing, projection |
| Budgets | Every category with its limit, spent, left and a **today marker** showing how much you could have spent by now; change vs last month; sub categories roll up into their parent |
| Transactions | Search, filters (including tags), pagination, multi-select |
| Calendar, Monthly, Summary, Stats | Other views of the same data |
| Recurring | Subscriptions and fixed payments you add, plus payments detected from your history |
| Cash flow | Money in against money out for 6 or 12 months, with sources and uses |
| Review | Imported entries wait here until marked reviewed |

Budgets are monthly by default and copy forward each month. Each category can instead be **quarterly**, **yearly** or a
**custom date range** (a trip, say), and monthly categories can **roll over** what is unspent. Sub categories are
categories named `Parent > Child`. Categories can be given rules (description contains X, use category Y), and past
transactions can be imported from a CSV on the device.

### Keyboard and touch

`/` search, `G` then a letter to go to a page, `A` add a transaction, `1` to `9` and `0` switch Budget tabs, `?` lists them
all. On a phone: swipe sideways for months, long-press to select rows, drag a bottom sheet down to close it, swipe right
from the left edge to go back.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # unit tests for calculations, budgets, import, crypto, TOTP, family visibility, legacy workflow
npm run build
```

Open the app and choose **Explore Demo Account**: no sign-up, sample data stored only in your browser.

## Where data lives

Money data lives **on the server** (MongoDB, the `SyncDoc` collection behind `/api/sync`), so the same account works on
every phone and laptop. Each signed-in device keeps a local copy (IndexedDB through Dexie, `lib/wealth/sync.js`) so the
app is fast and keeps working offline; changes are pushed shortly after they are made and pulled when the app opens,
regains focus or comes back online. The first time a device syncs, any data it already holds is uploaded. Vault items
are encrypted in the browser before they are sent, so the server only stores ciphertext. Demo Mode is the exception:
its sample data stays in the browser and never syncs. Settings, Data still offers an export and restore.

## Security

- Passwords are hashed, sign-in supports TOTP, attempts are throttled per address and per account, cookies are httpOnly.
- The vault is encrypted on the device. Stored tokens and shared family figures are encrypted at rest with `ENCRYPTION_KEY`.
  **In production `ENCRYPTION_KEY` must be set (32+ characters) and `JWT_SECRET` must be set**, or the app refuses to run.
- Legacy-access links are stored as a one-way hash.
- Requests that change data are refused when their `Origin` is another site. Headers include HSTS, nosniff,
  no framing, and a Content-Security-Policy for objects, base, forms and frame ancestors.
- The old server routes that stored financial records in plain form (bank accounts, transactions, loans, passwords and
  similar) are switched off. `ALLOW_LEGACY_API=1` turns them back on.
- Not yet done: restricting script sources in the policy, revoking sign-in tokens on logout, a shared rate-limit store.

## Configuration

Copy `.env.example` to `.env.local`. The main settings are `MONGODB_URI`, `JWT_SECRET`, `ENCRYPTION_KEY`, `APP_URL`,
`CRON_SECRET`, Google OAuth, and optional AI, email, SMS and Kite keys. Details, Google Drive / SMS / push / Kite setup and
architecture notes: [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md). Audit and phased plan: [docs/REVAMP_PLAN.md](docs/REVAMP_PLAN.md).

## Not built yet

Split transactions, multi-currency (needs an exchange-rate source), multi-step debit card, goal and loan forms, and real
in-wizard setup forms for accounts, assets and liabilities.

Stack: Next.js (App Router), React 19, Tailwind, Recharts, Dexie (IndexedDB), MongoDB/Mongoose, WebCrypto.
