# Mintmind – Product, UX and Trust Audit

**Method and limits.** This is a *code-level* audit of the repository at the `feat` branch (commit `6683c36` plus working-tree icon changes). It was **not** a live walkthrough of https://mintmind-rose.vercel.app/, and no 120-row HDFC/ICICI file was run through the importer. Everything marked **Verified** was read in code or tests. Everything marked **Unverified** needs a hands-on pass (listed in §14). No application behaviour was changed during the audit.

`docs/REVAMP_PLAN.md`, linked from the old README, **does not exist** in the repo.


> **Follow-up:** ease of access, market-data APIs (Kite, AMFI) and Google Drive are covered in [UX_AUDIT_FOLLOWUP.md](UX_AUDIT_FOLLOWUP.md), with roadmap items I1-I14. Updated scores and the list of what is still pending: [UX_RESCORE.md](UX_RESCORE.md).

---

## 1. Executive summary and scorecard

Mintmind is functionally broad and unusually careful in places (vault crypto, family visibility rules, tone rules, 60+ unit-test files). Its problems are mostly **coherence and honesty of messaging**, not missing features.

| # | Pillar | Score | Why |
|---|---|---|---|
| 1 | First-impression clarity | 6 | Hero, demo button and "Get started" exist, but the landing page also carries a simulator, mockups, bento grid and calculators (`app/page.tsx`, ~1,000 lines of landing components). Not browsed live. |
| 2 | IA and progressive disclosure | 5 | 13 nav items + hidden Documents/Legacy/AI (`lib/constants/dashboardNav.ts`); Budget has 10 tabs with overlaps. Mobile bar was recently reduced to 4 + More. |
| 3 | Habit loop and data entry | 6 | Quick add, `A` shortcut, decimal keypad on the transaction amount, rules, CSV and PDF imports, review inbox. Bank CSV import flagged likely duplicates of expenses only (fuzzy); exact re-import protection and undo were added later (UX-02). |
| 4 | Financial psychology | 7 | Dedicated `lib/wealth/tone.js` with tests, "missing months stay empty", today marker. Needs a pass on red usage for ordinary overspend. |
| 5 | Ergonomics / thumb zone | 6 | Strong recent work (raised Spend button, FAB pills, keyboard inset, edge-swipe). Most other amount fields are `type="number"` without `inputMode="decimal"`. |
| 6 | Trust, privacy, sync transparency | 3 | The landing FAQ says records live "in your own browser", but the README and `/api/sync` show financial data is stored **unencrypted-by-the-app on the server**. See UX-01. |
| 7 | Multi-user mental models | 6 | Permission model is enforced server-side and tested (`lib/family/visibility.js`). **No "preview what they see".** |
| 8 | Visual hierarchy / accessibility | 6 | `Money` component centralises Indian grouping, `tabular-nums` and privacy masking; Look system and AA-minded tokens. Chart/tooltip masking and colour-only status unverified. |

**Strongest:** vault cryptography, the single `Money` renderer, family visibility logic, tone rules, test coverage, local-first sync design.
**Weakest:** privacy messaging, import safety, onboarding that front-loads a five-step wizard, no password reset.

---

## 2. Top 5 critical bottlenecks

1. **UX-01 – Storage claim contradicts architecture (Trust).** The landing FAQ (`app/page.tsx:64`) says records live in the browser. In fact every signed-in device syncs rows to MongoDB through `/api/sync`; only vault items are encrypted client-side.
2. **UX-02 – Bank CSV import could double-count (Accuracy). RESOLVED.** *Correction to the first draft: it said no duplicate check existed. In fact the dialog already flagged fuzzy duplicates of expenses (same amount within a day and same category or merchant) and left them out by default. The real gaps were: no exact re-import detection, income rows never checked, no undo. All three are now handled (see below).*
3. **UX-03 – No password recovery (Retention/Trust).** There is no forgot-password route or page. A forgotten password locks the user out of server-side data.
4. **UX-04 – Onboarding asks for five steps before value (Activation).** `app/onboarding/page.tsx` has Welcome → age/mobile → features → package → confirm → QuickSetup. Value arrives at step 6.
5. **UX-05 – Navigation and Budget tab overload (Comfort).** 10 Budget tabs, 13+ modules, three overlapping stats views.

---

## 3. Feature inventory (verified in code)

| Area | Status | Evidence / gap |
|---|---|---|
| Net Worth, assets, loans, goals, yearly PPF/NPS limits | Implemented | `net-worth/*`, `GoalsPanel`, `LimitsPanel` |
| Bank accounts, debit and credit cards | Implemented | `bank-accounts`, `credit-cards`, `DebitCards` |
| Mutual funds, XIRR, SIP, NAV refresh | Implemented | `calc.js xirr`, `mutual-funds`, AMFI/Kite sync (`docs/INTEGRATIONS.md`) |
| CAS import (CAMS/KFintech), NSDL/CDSL, NPS, EPF PDFs | Implemented | `lib/wealth/pdfStatements.js`, password prompt in `PdfStatementImport.tsx`; fund txns de-duplicated (`actions.js:427`) |
| FD / RD / PPF | Implemented as **assets** with kind-specific fields, not dedicated modules | `AssetForm.tsx` (FD rate/dates, maturity validation) |
| Budgets, rules, rollover, recurring, review inbox, cash flow | Implemented | `components/wealth/budget/*` |
| Bank CSV import | Implemented; exact re-import detection, income check and undo added | see UX-02 |
| Vault (AES-256-GCM, PBKDF2 600k, recovery key, biometric per device, 5-min auto-lock) | Implemented | `lib/vault/crypto.js`, `vault/page.tsx:69` |
| Documents (Google Drive `drive.file`) | Implemented, needs Google connect | `/api/drive/*` |
| Family Circle with granular permissions | Implemented; **no preview** | `lib/family/visibility.js` |
| Digital Legacy | Implemented | `LegacyView.tsx`, `lib/legacy/stateMachine` |
| AI assistant | Implemented, optional | `AI_PROVIDER` env |
| Calculators | Implemented (`/dashboard/tools`, `/tools`) | |
| Tags | **Removed** from the UI; backend `app/api/tags` still present (retired via `legacyApi`) | duplicate/dead code |
| Split transactions, multi-currency | **Planned, not built** (README says "split" not built, but `SplitDialog.tsx` and `splits.js` exist – README is out of date) | |
| Forgot password / email verification | **Not present** | `app/api/auth` has no such route |
| Revoking tokens on logout | **Not done** (README admits) | |
| Legacy server routes (bank-accounts, transactions…) | Present but switched off by default | `ALLOW_LEGACY_API` |

---

## 4. Landing page and trust copy

**UX-01 (Critical) – Storage claim.**
Current (`app/page.tsx:64`): *"Your records live in your own browser on your own device. Your sign-in lives on the server…"*
Verified reality: signed-in data is pushed to MongoDB (`SyncDoc`, `app/api/sync/route.js`); the server "never looks inside a record" but records are **not end-to-end encrypted** except vault items. README: shared family figures and tokens are encrypted at rest with `ENCRYPTION_KEY`. Demo data is browser-only and never syncs (`lib/wealth/sync.js`).
Recommended copy:
> **Where is my data?** Signed in: your records are saved on Mintmind's server so every device you sign in on stays in step, and a copy is kept on each device so the app works offline. Your Vault (passwords and secrets) is encrypted on your device before it is sent, so we cannot read it; if you lose both your master password and recovery key, it cannot be recovered. Other financial records are not end-to-end encrypted. Sample data never leaves your browser. Documents go to your own Google Drive only if you connect it.

**Widget overload (Unverified live, structural from code).** Keep: hero, one product mockup, one interactive widget (simulator). Move below fold or collapse into "See calculators": bento grid, remaining calculators. Remove the claim-heavy duplicates.
**Demo expectations.** Label sample data "Sample family – not your data" persistently on demo dashboards; verify a banner exists.

---

## 5. Onboarding and activation

Verified: `app/onboarding/page.tsx` (238 lines) is a 6-step wizard with Skip on steps 0, 1, 4 and a "Use the full demo" link. The final step is `QuickSetup`.
Findings:
- **UX-04 (High)** value is last. Reorder: pick one starting point → add one item → see result; defer age/mobile/package.
- **UX-06 (Medium)** "Mobile" and "age" are asked up front. Move to Settings, ask in context.
- **UX-07 (High)** README admits "real in-wizard setup forms for accounts, assets and liabilities" are not built, so setup hands off to other pages.
- Tap targets on the "?" info buttons (≈18px) and the "Use the full demo" link (≈14px) are below 44px.
- **UX-03 (High)** No forgot-password path; no email verification (`register/route.js:25` comment confirms).

Proposed three-minute flow: (1) *"What do you want to start with?"* — Track spending / See net worth / Add investments / Keep documents safe / Plan a goal. (2) One focused form (account, expense, asset, fund, or goal). (3) Result screen: first transaction in Spend with budget pace, or first net-worth figure. (4) "Next: add another account · Import a statement · Set a budget". (5) *Enter dashboard* always available. Show a quiet "Setup 2 of 5" chip, dismissible. Never re-show for completed users.

Copy: "Start with one thing. You can add the rest whenever you like."

---

## 6. Information architecture

Recommendation: **frequency-based groups on mobile and desktop, with Vault and Documents top-level**, not five workspaces (workspaces hide the daily path behind an extra layer).

```
Daily      Overview · Spend (Transactions & Budgets) · Accounts
Wealth     Net Worth (Assets, Loans, Goals) · Investments · Cards · Insurance
Protect    Family Circle · Vault (Passwords · Documents · Legacy)
Tools      Calculators · Wealth AI · Import/Export · Settings
```
Mobile: Overview · Net Worth · **Spend** · Accounts · More (current, verified). Quick-add always one tap away.

**Budget tabs (UX-05):** consolidate ten into five: **Overview** (month + pacing), **Budgets**, **Transactions** (list + calendar toggle), **Insights** (Monthly + Summary + Stats + Cash flow as sections), **Recurring & Review**. Review should also surface as a count badge on Transactions rather than a tab.

---

## 7. Expense and transaction workflow

Verified: `A` opens quick add; transaction amount uses `inputMode="decimal"`; categories are a dropdown; account label is "Nickname - Bank"; Cash is "Cash".
- **UX-02 (resolved)** Every imported row now carries an exact fingerprint (account, direction, date, amount, normalised description, with #n for identical rows in one file) and an import batch id. A row already imported is marked "Already imported" and always left out; income is checked against existing bank entries; the fuzzy expense check stays as an optional skip; the import itself re-checks fingerprints before saving. The success message has an **Undo** that removes that batch, except rows you have already reviewed. Not covered: files imported before this change have no fingerprint, so only the fuzzy check protects against re-importing them; Undo is only offered right after the import (about 20 seconds).
- **UX-08 (High)** Review inbox is row-by-row. Add "Mark all reviewed", "Apply category to similar" using rules.
- **UX-09 (Medium)** Other amount fields (`AssetForm`, `Subscriptions`, `DebitCards`, `LimitsPanel`, credit-cards) use `type="number"`; add `inputMode="decimal"` and `step="0.01"` consistently.
- Five-second goal: amount focus on open (verify on device), last-used account and category as defaults.
- Unverified: bank-specific formats (HDFC/ICICI), debit/credit column handling, transfer detection, date-format variants. Run real files.

---

## 8. Investments

- **Mutual funds / CAS (strong).** PDF parser covers CAMS/KFintech with password prompt and wrong-password message; preview groups by fund; already-present transactions are skipped; stock/NPS/EPF are written as assets and re-import updates them (`PdfStatementImport.tsx:144`).
- **UX-10 (Medium)** Partial parse reporting: show which pages/lines failed and what *did* import; keep a "download parse report (no personal data)" option. Avoid logging statement text (none observed, confirm in code review).
- **UX-11 (Medium)** FD/PPF are assets, so "add PPF contribution" means editing the asset. Add a *Record contribution* action that appends to a dated list and recomputes balance; label values "entered" vs "estimated" (FD maturity is computed, `fdValue`).
- **UX-12 (Polish)** Provide "Mark FD matured / Renew" actions.
- Calculations: XIRR is Excel-style actual/365 and unit-tested. Show invested vs current vs return side by side with plain-English tooltips.

---

## 9. Dashboard and visualisation

- Top row recommendation: **Net worth** (with period change, privacy), **Cash flow this month**, **Vault health** — show Vault health only for what can really be measured (item count, weak-password count via `passwordStrength`, expiring documents). Do not add breach checks that don't exist.
- Indian numbering and `tabular-nums` are centralised in `components/wealth/Money.tsx` (verified). Audit remaining raw `toLocaleString` uses. Rule: exact (₹90,32,418) in tables and forms, compact (₹90.3 L) in cards and chart axes.
- **UX-13 (High)** Privacy mode: `Money` masks and has `aria-label="Hidden amount"`, and `P` toggles it. Charts, tooltips, AI responses and notifications are **unverified**; test each. Add a visible toggle on mobile (the top-bar control was moved off mobile in the recent change).
- Colour: `signed` uses green/red only. Add ▲/▼ or +/− so status is not colour-only.

---

## 10. Security, vault and family

- Vault crypto (verified): PBKDF2-SHA256 600k, AES-256-GCM, recovery key wraps master key, biometric credential stays on-device, auto-lock default 5 min.
- Clipboard (verified): `vault/page.tsx:212` copies, toasts "Clipboard clears in 20s", and clears only if the clipboard still holds the same text. The spec said 30s; copy also silently fails to clear where `readText` is not permitted. Reword to "Clipboard clears in 20s where your browser allows it." **UX-14 (Polish)**. The recovery-key copy (`vault/page.tsx:165`) does not clear the clipboard — **UX-15 (Medium)**.
- Destructive actions: `ConfirmDialog` is used for assets/loans, documents, legacy, subscriptions, automation. Confirm it covers accounts, vault items and recovery codes, and add typed confirmation for vault wipe. **UX-16 (Medium)**.
- Family: permissions enforced server-side (`visibleSummary`). **UX-17 (High)** build "Preview as [member]" by running `visibleSummary` on the owner's own summary with the member's permission object, so it cannot drift from enforcement.
- Auth: tokens are not revoked on logout (README). Plan token versioning on the user document. App-level PIN/biometric for the whole app is not implemented; do not imply it. The web app is a PWA; WebAuthn biometrics are device-bound and only used for vault unlock.
- Legacy: confirm the recovery kit never prints the unencrypted master key (not verified here).

---

## 11. Mobile, desktop, accessibility

- Verified mobile: bottom bar, raised Spend, FAB pills (now always visible, hide-by-choice), edge-swipe back, `--kb-inset` keyboard handling, long-press row selection with a visible row menu.
- **UX-18 (Medium)** Dense tables (fund holdings, ledger, statement, CSV preview) need card layouts below 768px; not yet audited.
- **UX-19 (Polish)** Shortcut discoverability: `?` lists them; `P` privacy, `A/C/N/I/L/O/W` quick actions exist (`Shortcuts.tsx`). The prompt's `Cmd/Ctrl+K` is handled elsewhere (search); verify.
- Accessibility to test: focus order in dialogs, `aria-live` for errors, text scaling to 200%, `prefers-reduced-motion` (splash and sheet animations), chart alternatives.

---

## 12. Performance, PWA, sync

Verified: service worker caches shell and static assets, never intercepts `/api`; pages network-first (3.5s timeout) then cache then `/offline.html`; local Dexie database; push every 0.6s after change, pull on open/focus/online/30s; unsynced local edits are never overwritten by a pull; server copy otherwise wins (last-writer-wins by server `rev`); first sync uploads local rows.
- **UX-20 (High)** Surface sync state: show "Saved on this device · Synced 2 min ago" / "Not synced – will retry" in Settings and a subtle header dot. The store exposes `{pending, error, lastSyncedAt}` already.
- **UX-21 (Medium)** Clearing browser storage on a signed-in device is recoverable from the server; on **demo** it is not. Say so.
- Conflict policy is whole-row last-write-wins; two devices editing the same row offline lose one edit. Document it.
- Splash: runtime-only, no artificial delay beyond its fade; keep it short on cached loads.

---

## 13. Roadmap

| Phase | Item | Impact | Effort | Depends | Success metric |
|---|---|---|---|---|---|
| 1 (1–3 days) | Rewrite storage FAQ and add sync status line (UX-01, 20) | High | S | none | Copy matches architecture; reviewed against README |
| 1 | `inputMode="decimal"` on all amount fields (UX-09) | Med | S | none | No amount field lacks it (grep) |
| 1 | ▲/▼ with colour for gains/losses (UX-13) | Med | S | none | Status readable in greyscale |
| 1 | Fix tiny tap targets on onboarding | Med | S | none | All targets ≥ 44px |
| 1 | Clipboard wording; clear recovery key copy (UX-14, 15) | Low | S | none | Wording accurate |
| 2 (1–2 wks) | CSV duplicate detection + undo batch (UX-02) **done** | Critical | M | batch id on rows | Re-importing same file adds 0 rows (unit-tested key logic; end-to-end not run in a browser) |
| 2 | Review inbox bulk actions (UX-08) **done: select rows, set one category, mark selected reviewed; "Mark all reviewed" already existed** | High | M | none | 120 rows reviewed in < 3 min |
| 2 | Onboarding reorder (UX-04, 06) **partly done: the wizard is now Start then Quick setup (2 steps); Package, Features and Preferences moved behind "Choose features myself"; phone and age are an optional detour. Still open: one focused form per starting point (UX-07) and first-value screen** | High | M | in-wizard forms | Median time-to-first-value < 3 min |
| 2 | PPF/FD record-contribution and mark-matured (UX-11, 12) | Med | M | asset schema | Add contribution in ≤ 3 taps |
| 3 (2–4 wks) | Budget tabs 10→5 (UX-05) **done: Overview, Budgets, Transactions (list, calendar, to review), Insights (monthly, summary, stats, cash flow), Recurring; all ten views kept; the review count shows on Transactions; keys 1-5** | High | M | none | Tab count ≤ 5, no lost feature |
| 3 | Family preview (UX-17) **done as "What others in the circle see of you"**: sharing is one set of permissions for the whole circle (not per member), so the preview is the same for every member; it is built on `visibleSummary`, the function the server uses | High | M | visibility.js | Preview equals API output (test) |
| 3 | Table → card reflows (UX-18) | Med | M | audit | No horizontal scroll at 375px |
| 4 | Forgot-password + email verification (UX-03) | High | L | email provider | Reset flow works end to end |
| 4 | Token revocation on logout | Med | M | user token version | Old token rejected |
| 4 | Conflict handling UI, optional E2E encryption for all records | Med | L | design decision | Documented model |

---

## 14. Not verified (needs a live pass)

Live landing page first-impression timing; real HDFC/ICICI imports; chart and tooltip masking in privacy mode; on-device keyboard behaviour for every sheet; screen-reader pass; contrast of every Look; ultrawide layout; Legacy recovery kit contents; whether demo banners are persistent; email delivery.
