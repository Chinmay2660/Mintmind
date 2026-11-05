# Mintmind – Personal & Family Wealth

Track net worth, bank accounts, mutual funds (XIRR), credit cards, insurance and budgets; share selectively with
family; keep passwords in a zero-knowledge vault, documents in your own Google Drive, and set up a Digital Legacy plan.

Modules: Dashboard · Net Worth · Bank Accounts · Mutual Funds · Credit Cards · Insurance · Budget & Expenses ·
Family Circle · My Vault · Documents · Digital Legacy · Settings. Light / Dark / System themes.

## Run

```bash
npm install
npm run dev      # http://localhost:3000
npm test         # calculation, crypto, TOTP, family-visibility and legacy-workflow tests
```

Open the app and choose **Explore Demo Account** – no sign-up, sample data stored only in your browser.

Configuration, Google Drive / SMS / push / Kite setup and architecture notes: [docs/INTEGRATIONS.md](docs/INTEGRATIONS.md).
Audit and phased plan: [docs/REVAMP_PLAN.md](docs/REVAMP_PLAN.md).

Stack: Next.js (App Router), Tailwind, Recharts, Dexie (IndexedDB), MongoDB/Mongoose, WebCrypto.
