# Mintmind → Wealth Platform: Audit & Phased Plan

## 1. Current state (inspected)
- **Stack**: Next.js 16 App Router (JS/TS mix), Tailwind 3, framer-motion, recharts, next-themes, Dexie (offline), Mongoose/MongoDB, JWT cookie (`auth-token`), Resend email.
- **Auth**: Google OAuth only (`/api/auth/google`), no email/password, no MFA, no sign-up. User model: googleId/email/phone/name/image.
- **Dashboard**: ~25 sidebar entries (transactions, categories, tags, rules, reminders, goals, planners, subscriptions, salary-recurring, emergency-fund, rebalancing, performance, import-export, loans, nominee, vault, passwords, documents, family…). Spec allows only 12 modules.
- **API**: ~60 Mongo routes (`app/api/*`) + client Dexie offline layer (`lib/offline/*`) with sync and a demo seeder (`lib/seed/*`, `/api/seed`, `DemoDataModal`).
- **Vault** (`passwords`): passwords encrypted *server-side* with AES-256-GCM (`lib/utils/crypto.js`) → server can read them. Not zero-knowledge.
- **Documents**: file saved via `lib/storage.js` (app-owned storage), not per-user Drive.
- **Legacy**: `LegacyPlan` + `Nominee` + token release; single nominee, 30–365 days, no grace/verification/logs of vault access.
- **Family**: head/member only, boolean share settings, pair-code join (no invite/accept, no per-member permissions).
- **Credit cards, insurance, MF/SIP (`Investment`, `SipPlan`, `MFTransaction`)**: exist; need audit for unmasked numbers, XIRR, utilisation, coverage-not-asset.
- **Theme**: next-themes present; globals.css is 693 lines with "finance-shell aurora-bg" gradients → conflicts with "simple, uncluttered, no gradients".
- **Uncommitted** (from prior session): Capacitor/native removal. `next build` unverified (Google Fonts fetch).

## 2. Audit issues to fix
1. 25-item nav vs 12 modules; duplicate Vault/Passwords/Nominee entries.
2. Aurora/gradient/animation-heavy styling; theme tokens not matching spec palette; no pre-render theme script verified.
3. No Net Worth snapshot module; dashboard is expense-centric, not net-worth centric.
4. Vault encryption server-side; no master password/WebAuthn/MFA.
5. Docs not on user's Drive; no folder tree.
6. Family lacks roles/permissions/invites.
7. Legacy lacks multi-contact, verification, grace period, access logs, disclaimer.
8. No email/password auth or MFA; demo mode is a data seeder in a real account (must be isolated).
9. README stale (mentions Clerk/Drizzle/Neon).

## 3. Removal candidates (fold or delete)
Tags, Rules, Reminders (→ bill/premium reminders inside modules), Goals, Planners (savings/retirement/FIRE), Rebalancing, Performance, Emergency Fund, Subscriptions, Salary-Recurring, Import/Export (→ Settings › Data), Stats, Categories (→ Budget categories), Transactions (→ per-module transactions), Loans (→ liabilities in Net Worth), Nominee/Legacy page (→ Digital Legacy), Marketing landing components if replaced by login screen.

## 4. Phases (each = logical commit)
0. Build baseline fix (font), plan doc. 
1. Design system: tokens (light/dark/system), no-flash theme script, chart theme hook, shared UI primitives.
2. Shell: 12-module nav, collapsible sidebar, top bar, mobile bottom nav + More.
3. Data layer: `lib/finance/*` pure calc modules with unit tests (net worth, XIRR, utilisation, pacing by calendar days).
4. Dashboard + Net Worth (snapshots) + Bank Accounts + Mutual Funds/SIP.
5. Credit Cards + Insurance + Budget & Expenses.
6. Family Circle (invites, roles, permissions).
7. Vault (client-side zero-knowledge: WebCrypto PBKDF2/Argon2 + AES-GCM, WebAuthn).
8. Documents + Google Drive OAuth.
9. Digital Legacy.
10. Auth (email/password + MFA TOTP) + Demo Mode (isolated, local-only dataset with the specified totals).
11. Settings; cross-module QA; both themes; responsive; final summary.

## 5. Blocking decisions
See questions in the session report.
