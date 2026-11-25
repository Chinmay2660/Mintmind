# Mintmind: complete product audit

**Date:** 2026-11-25. **Branch:** `feat` (uncommitted working tree). **Scope:** the repository and the running app in the **demo account**, on a local dev server.

**How to read this.** Every statement is tagged by how it was established.
- **[Verified]** run, measured or read in code during this audit or in the earlier rounds of this work (see [UX_AUDIT.md](UX_AUDIT.md), [UX_AUDIT_FOLLOWUP.md](UX_AUDIT_FOLLOWUP.md), [UX_RESCORE.md](UX_RESCORE.md)).
- **[Inferred]** follows from code but was not run.
- **[Not tested]** could not be checked here: the live site (https://mintmind-rose.vercel.app/, never opened), any real MongoDB (there is none in this environment), real devices, screen readers, real statements.

**Disclosure.** This brief says not to modify application code during the audit. Before this brief arrived, the same session had already changed code at the user's direct request (see UX_RESCORE.md). The audit steps below, including the responsive sweep and the calculation checks, changed no code. Fixes made after the audit are listed in section 16.

---

## 1. Verdict in short

1. **Complete wealth management experience?** Broad and mostly real, but not complete. The records, calculations, budgeting, imports, family sharing preview, vault and legacy flow all exist in code. Automatic bank or market data does not.
2. **Incomplete modules:** documents are not linked to records (only insurance), Family has one permission set for everyone, Digital Legacy delivery depends on email/SMS configuration, no email verification at sign-up, no real-money tests of the sync/auth server paths.
3. **Missing:** goal-linked automation, historical net-worth reports as documents, per-member family permissions, Drive picker and direct upload, mutual fund realised gains, bank feeds.
4. **Mobile genuinely good?** Good structure, not yet proven. No overflow at 320 to 600px on the pages measured, tap targets measured, one phone menu. Untested on a physical phone.
5. **Desktop uses space well?** Yes up to 1536px (about 99% of the area). At 1920 and 2560 the content is capped (1408px, 1920px) and a hero card stretches to 1856px, which is oversized.
6. **Polished at 1920px?** Tidy and balanced, but not designed for it: the same two-column grid, wide margins.
7. **Important actions within one or two clicks?** Mostly. Add transaction, search, and privacy are one click or key. Attaching a document to a record is not possible.
8. **Calculations reliable?** The tested ones are. 286 unit tests pass; independent checks match (section 9). One small day-count difference on leap-year FD terms.
9. **Dashboard too crowded?** Moderately. About nine cards in the first 1080px on a monitor, and the order is user-customisable.
10. **Biggest UX problems:** the product still reads as many modules (13+); documents are disconnected from records; the dashboard has no single "what needs my attention" strip; sign-in, sync and recovery paths are unproven against a real database.
11. **Fix immediately:** see P0/P1 below.
12. **Build next:** document attach and direct Drive upload; per-member family permissions; goal-linked reminders; a real-device and screen-reader test pass.

---

## 2. A. Feature inventory

Status key: **Full** = implemented and exercised; **Partial** = works, with a stated gap; **UI only** = no working back end; **Missing**.

| Module | Status | Issues | Recommendation | Priority |
|---|---|---|---|---|
| Dashboard (`app/(routes)/dashboard/page.tsx`) | Full | Nine cards above the fold on a monitor; no combined "needs attention" strip; income/expense/savings shown in several places | Add one attention strip (due bills, expiring documents, pending review); keep order customisable | P1 |
| Net Worth (`net-worth/page.tsx`) | Full | History range now presets plus custom dates [Verified]; milestones are factual events | None blocking | P3 |
| Assets | Full, **merged** into Investments > "Property & other" this round [Verified] | Old route redirects (`net-worth/manage`) | Done | - |
| Liabilities / Loans (`net-worth/loans`) | Full | None blocking | None | P3 |
| Goals | Partial [Inferred] | Linked-money progress exists; required monthly contribution and completion date not verified on screen | Verify, then add "needs ₹X/month" text | P2 |
| PPF / NPS limits | Full | Logged from Net Worth and now from the account page [Verified] | None | P3 |
| Bank accounts | Full | Balance updates and ledger integration present [Inferred]; transaction balance integration unit-tested | None | P3 |
| Investments: mutual funds, SIP, XIRR | Full | NAV daily from AMFI, freshness label [Verified]; realised P&L not verified | Add realised gains | P2 |
| FD / RD / EPF / PPF / NPS / ETF / gold | Full | FD renew and PPF/NPS contribution added [Verified]; leap-year FD day count fixed after this audit | None | P3 |
| Cards (credit/debit) | Full [Inferred] | Utilisation, due dates | None | P3 |
| Insurance | Full | Premium history, document link (only module with one) | Same attach control as other records | P2 |
| Budget & expenses | Full | 5 sections, categories and rules moved to Settings, CSV import with exact re-import protection and undo [Verified] | None blocking | P3 |
| Ledger | Full | Responsive table has a card layout [Verified] | None | P3 |
| Family Circle | Partial | One permission set for the whole circle; member cards redesigned; "what others see" preview [Verified]; invites need email or manual link | Per-member permissions | P1 |
| My Vault | Full | AES-256-GCM, PBKDF2 600k, recovery key, auto-lock [Verified in code]; search by item name while unlocked [Verified] | None blocking | P3 |
| Documents | Partial | Drive files not encrypted by Mintmind (now stated); server-proxied upload limited by host body size [Inferred]; no attach to records | Direct resumable upload; attach control | P1 |
| Digital Legacy | Partial [Inferred] | Workflow code and tests exist; delivery needs email/SMS/push configuration | Verify end to end with a configured provider | P2 |
| My Wealth AI | Partial | Optional; needs a provider key; amounts shown from real figures; assistant labelling of assumptions not verified | Audit prompts for labelling | P2 |
| Calculators | Full | 6 planning tools, tested [Inferred from tests] | None | P3 |
| Settings | Full | Budget section added; 9 sections | None | P3 |
| Auth | Partial | Email+password, Google, TOTP; password reset and sign-out revocation added but **not run against a database**; no email verification | Run against Mongo; add verification | P0 |
| Onboarding | Partial | Two steps, first-value card; no per-goal focused form | One focused first item per goal | P2 |
| PWA / offline | Partial | Service worker caches shell; data from IndexedDB; offline documents unavailable (disclosed) | Show an offline banner | P2 |

---

## 3. B. Responsive design audit [Verified unless noted]

Measured in the demo account, dashboard unless stated: horizontal overflow, whether the sidebar or bottom nav shows, content width, clipped text outside scroll containers. "Not run" means the width was not measured.

| Width | Mobile/tablet/laptop/monitor | Result |
|---|---|---|
| 320 | phone | no overflow, bottom nav, 0 clipped, 0 text under 11px |
| 360 | phone | no overflow, 0 clipped |
| 375 | phone | no overflow on 10 pages; 0 unmasked amounts with hide-balances; 0 small tap targets on 8 of 9 pages (Overview has 5 small inline text links) |
| 390, 414 | phone | not run (between measured widths; no breakpoint falls between 375 and 430) |
| 430 | phone | no overflow, 0 clipped |
| 600 | large phone / small tablet | no overflow, bottom nav, 0 clipped |
| 768 | tablet portrait | no overflow, **sidebar appears** and leaves 502px for content; **3 percentage labels clipped by 14 to 27px** (`2.3%`, `10%`, `87.8%`) |
| 820 | tablet | not run |
| 1024 | tablet landscape | no overflow, sidebar, content 758px |
| 1280 / 1366 / 1440 | laptop | 1280 and 1366: no overflow, 99% of area used, 7 cards in view; 1440 not run |
| 1536 | laptop | no overflow, 99% used |
| 1600 | monitor | not run |
| 1920 | monitor | no overflow; content capped 1408px, gutters about 125px; 9 cards in view |
| 2560 | ultrawide | no overflow; content 1920px, gutters about 190px; **a card is 1856px wide** |

Other pages: Budget, Accounts, Investments, Cards, Insurance, Ledger, Family: no overflow at 375px. Tables: Ledger, Funds, Cookies, CSV preview have phone card layouts. Charts, modals, keyboard and safe-area behaviour were **not tested on a device**.

---

## 4. C. UI/UX audit

| Screen | Current problem | Proposed improvement | Benefit |
|---|---|---|---|
| Dashboard 768px | Three allocation percentage labels extend past the card edge | Clip-safe labels (wrap or inset) | No cut-off numbers |
| Dashboard 1920+ | Hero card stretches to 1856px; same two-column grid as a laptop | A 12-column grid: hero capped around 1100px beside a 3-card column; 3 blocks per row | Less stretching, denser use of space |
| Dashboard (all) | Many competing cards, no single place for "what needs me" | One attention strip: bills due, premiums, expiring documents, review count | Faster decisions |
| Budget (phone) | Previously stacked tool tiles and two tab rows | Done: only the month at top; categories and rules in Settings; sections as text tabs | More room for the figures |
| Assets (before) | Duplicate of Investments, nearly empty after dedupe | Done: merged into Investments as "Property & other" | One place for each record |
| Family (phone) | Ragged list: email, role dropdown, delete and figures competing | Done: cards with avatar, role badge, key figure, one actions menu | Scannable members |
| Settings | Configuration scattered (categories, rules) | Done for Budget; dashboard layout "Customize" and family sharing switches still live on their pages | One home for configuration |
| Documents | Not linked to records | Attach control on every record | Complete picture per asset |

---

## 5. D. Button placement audit

| Action | Current location | Recommended location | Reason |
|---|---|---|---|
| Add transaction | Floating button (phone), top bar Add (desktop), `A` key | Same; keep on Spend | Already one tap |
| Add expense (Overview) | Right end of the shortcut row [Verified] | Keep | Main action apart from the three destinations |
| Import CSV | Transactions toolbar, next to CSV download [Verified] | Keep | Where the data goes |
| Categories, Rules | Settings > Budget [Verified] | Keep | Configuration lives in Settings |
| Add asset | Investments > Property & other; quick-add menu; `N` key | Keep | One home |
| Customize dashboard | Overview, under the shortcuts | Move to Settings > Appearance (not done) | Configuration rule |
| Family sharing switches | Family page, "My sharing" | Move to Settings > Family (not done) | Configuration rule |
| Invite member | Family header | Keep | Contextual |
| Attach document | none (insurance only) | On each record's detail view | Missing |

---

## 6. E. Click-reduction audit

| Workflow | Current steps | Proposed | Improvement |
|---|---|---|---|
| Open Spend on phone | 0 (signed-in phones open on Spend) [Verified] | - | Already minimal |
| Add expense | 2 to 3 taps (button, amount, save) | Keep; amount focus and decimal keypad [Verified] | At target |
| Find a document by name | Search (2) | Done: documents in search | 3 clicks fewer than browsing |
| Add PPF contribution | Net Worth > limits > dialog; now also from the account page [Verified] | - | 2 fewer steps |
| Renew a matured FD | Edit and retype terms | **Renew** button prefilled [Verified] | About 6 fields saved |
| Reach Investments from Overview | 2 (More > Investments) | Shortcut tile: 1 [Verified] | 1 fewer |
| Attach a document to a fund or FD | Not possible | Attach control: 3 clicks | New capability |
| Set category rule | Budget > Rules (2) | Settings > Budget > Rules (3) | +1, accepted for a cleaner Budget page |

---

## 7. F. Missing feature audit

| Feature | User problem | Proposed solution | Priority |
|---|---|---|---|
| Attach documents to records | Policy PDFs, FD receipts and CAS statements are not tied to what they describe | `documentIds` on records, Drive upload, picker | P1 |
| Per-member family permissions | One set of sharing choices for everyone | Permissions per member plus preview per member | P1 |
| Realised gains (mutual funds) | Returns only unrealised | FIFO lots from transaction history | P2 |
| Goal required monthly contribution | Progress without a plan | Text under each goal: needs ₹X/month to finish by date | P2 |
| Net worth reports | History is chart-only | Monthly and yearly report export | P2 |
| Unusual-spending alerts | Exists in `lib/ai/budgetAI.js` [Inferred]; surfaced where? | Show on Overview and in reminders | P2 |
| Email verification | Anyone can sign up with any address | Verification link | P0 |
| Offline banner | Offline state is silent | Banner plus sync status | P2 |
| Bank feeds | Manual entry burden | Separate feasibility study (Account Aggregator) | P3 |

Not invented: live market data (only AMFI NAV file; Kite optional and off by default).

---

## 8. Data distinction (manual, imported, estimated, external)

- **Manual:** records typed in (accounts, assets, transactions).
- **Imported:** CSV and statement PDF rows (flagged for review; exact fingerprint on CSV).
- **Estimated:** FD and RD values (formula from rate and dates), PPF/EPF balances you enter, projections.
- **External:** mutual fund NAV from AMFI with its date and refresh time shown.
The estimated/entered distinction is labelled on FD values and NAV; it is **not yet labelled consistently** on every figure (P2).

---

## 9. G. Financial accuracy audit

Independent checks run with the app's own functions [Verified]:

| Case | Independent value | App | Result |
|---|---|---|---|
| FD ₹1,00,000, 7%, exactly 1 year, quarterly compounding | 1,00,000 × 1.0175⁴ = **₹1,07,186** | ₹1,07,186 (term 2025-01-01 to 2026-01-01) | matches |
| Same FD, term 2024-01-01 to 2025-01-01 (leap year) | ₹1,07,186 | **₹1,07,206** | **+₹20 (0.02%)**: 366 days ÷ 365 counts as 1.0027 years. Source: `lib/wealth/holdings.js` `fdValue`/`fdDetails` |
| XIRR: −10,000 then +11,000, 365 days apart | 10.00% | 10.00% | matches |
| XIRR doubling over 731 days | 2^(365/731) − 1 = 41.35% | 41.35% | matches (actual/365, Excel convention) |
| Indian grouping | ₹90,32,418; ₹1.77 Cr | same | matches |

Coverage: 286 unit tests across calculations, budgets, import, goals, family visibility, legacy workflow, crypto, TOTP, NAV, freshness, contrast. **Not tested:** sync conflicts across two devices, timezone edge cases, rounding of large mixed-currency data (multi-currency is not built).

Known approximations: FD day count (above); EPF/PPF balances are user-entered; family totals deduplicate jointly owned assets by key (`lib/family/visibility.js`).

---

## 10. H. Accessibility audit

| Area | State | Evidence | Fix |
|---|---|---|---|
| Colour contrast (accent text) | Pass in all 10 looks, light and dark | `lib/themeContrast.test.mjs`, 21 checks | Extend to other text colours |
| Touch targets | 0 under 38px on 8 of 9 phone pages | scan | 5 inline links on Overview |
| Focus indicators | present on buttons and tabs [Inferred] | classes `focus-visible:ring-2` | Verify on every custom control |
| Tabs and carousels | `role=tablist`, arrow keys | code | Screen-reader pass |
| Hidden balances | Aria label "Hidden amount" | `Money.tsx` | Chart alternative text |
| Charts | no text alternative [Inferred] | Recharts | Data table fallback |
| Reduced motion | respected in scroll code; other animations not audited | - | Audit |
| Forms | labelled via `Field` [Inferred] | `kit.tsx` | Error announcements |
| Screen reader, 200% text | **Not tested** | - | Run VoiceOver/TalkBack/NVDA |

---

## 11. Navigation, interaction, security notes

- **Navigation [Verified]:** one phone menu (bottom bar plus More); sidebar from 768px; keys `G` then letter, `A`, `1`-`5`, `/`, `?`, `Ctrl/Cmd+K`; search finds pages, transactions, accounts, funds, assets, goals, policies, documents, and Vault names while unlocked. No breadcrumb trail beyond the page title; no "recently visited".
- **Interaction:** undo exists for CSV import; confirmation dialogs exist for several deletions (accounts, vault items and recovery codes not verified). Offline start works from the service worker for the shell; data from IndexedDB. Network-loss behaviour, sync conflicts (last write wins per record), and double-submit protection were **not** tested.
- **Security [Verified in code]:** vault zero-knowledge crypto, password reset with hashed single-use token, sign-out revocation, origin check on writes, rate limits per instance. **Not verified:** these server paths against a database; Drive tokens encrypted at rest with `ENCRYPTION_KEY`; no app-wide PIN; no email verification.

---

## 12. Performance [Not measured]

No bundle analysis, Lighthouse run, or profile was done. Observations only: pages are client-rendered from IndexedDB; Recharts is used on several pages; lists use pagination (12 to 50 per page). Recommend measuring first load, large-ledger rendering (10,000 rows), and memory on a mid-range phone before optimising.

---

## 13. Competitive patterns worth adopting (not copying)

- Monarch / Empower: one net worth header with a time-range switch and an attention list under it. **Adopt:** the attention strip.
- YNAB: every category shows "available", not just "spent". **Already close:** category budgets with left amount.
- Wealthfolio: holdings with accounts and activity in one place. **Adopt:** attach statements and receipts to the holding.
- Linear / Notion: one command bar. **Already present:** `Ctrl/Cmd+K`.
- Money Manager: calendar view of spending. **Present.**

---

## 14. Priorities

- **P0:** run auth, reset, revocation and sync against a real MongoDB; email verification.
- **P1:** attach documents and direct Drive upload; per-member family permissions; attention strip on Overview; 768px clipped labels; wide-screen (1920+) dashboard grid.
- **P2:** FD leap-year day count; realised gains; goal required-contribution text; consistent "entered / estimated / external" labels; offline banner; accessibility pass on real tools; performance measurement; move Dashboard "Customize" and Family sharing into Settings.
- **P3:** bank feeds study; reports export; competitive polish.

---

## 15. Final product scores (out of 10)

These reflect what was verified. Nothing below 6 because the core is real; nothing above 8 because real-device, real-user, real-database and screen-reader testing has not happened.

| Category | Score | Why |
|---|---|---|
| Product completeness | 7.5 | Wide and mostly real; documents-to-records and family permissions missing |
| Dashboard experience | 7 | Rich and customisable, but dense and no attention strip |
| Financial accuracy | 7.5 | Tested calculations match independent checks; small FD day-count gap; sync/multi-device unproven |
| UI/UX design | 7.5 | Consistent system, many recent simplifications; some configuration still scattered |
| Mobile experience | 7.5 | Measured: no overflow, targets, one menu; no physical-device test |
| Tablet experience | 6.5 | Sidebar at 768 leaves 502px and clips three labels |
| Desktop experience | 8 | Clean fit to 1536px |
| Large monitor experience | 7 | Capped and balanced, but a 1856px card at 2560 and wide gutters |
| Navigation | 7.5 | One phone menu, search, shortcuts; no recents |
| Interaction design | 7 | Undo and confirmations where built; offline, conflict and double-submit unverified |
| Accessibility | 6.5 | Contrast and touch targets measured; no assistive-technology test |
| Performance | 6 (unmeasured) | No measurements |
| Privacy and security | 7 | Strong vault design and honest copy; server paths unproven; no email verification |
| **Overall product quality** | **7.1** | |

---

## 16. Fixes made after the audit

Made after the audit above, each re-measured or tested:

| Fix | Evidence |
|---|---|
| FD term day count: a whole-year term is exactly one year (leap year or not); part years still count leftover days over 365 (`lib/wealth/holdings.js`) | New unit test; the leap-year case now gives ₹1,07,186 (was ₹1,07,206) |
| Allocation card stacks below 1024px so its percentage labels no longer clip at 768px (`app/(routes)/dashboard/page.tsx`) | 768px scan: 0 clipped elements (was 3) |
| Small inline text links get a 40px tap area on phones (`app/globals.css`) | Phone Overview small targets: 1 (was 5) |
| Assets merged into Investments > Property & other; the Assets page redirects; menu item removed | Redirect with `?add=asset` opened the add dialog on the new tab |
| Categories and Rules moved to Settings > Budget; Budget header is just the month; Import CSV next to the CSV download | Settings dialogs open; Budget header 43px tall |
| Family members redesigned as cards with one actions menu | Four cards, four menus, no overflow at 375px |
| Achievements (streak badges) removed | Code and tests deleted |

**Still open from the audit:** email verification; running auth/sync against a real database; attach-document control and direct Drive upload; per-member family permissions; the dashboard attention strip; a 1920px+ dashboard grid (a card still reaches 1856px at 2560px); moving dashboard "Customize" and family sharing switches into Settings; realised gains; assistive-technology and real-device testing; performance measurement.

## 17. README changes

README.md was rewritten from verified facts; see its "Current limitations" section.
