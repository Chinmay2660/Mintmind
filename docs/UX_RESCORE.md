# Mintmind audit: rescore and what is still pending

Rescored on 2026-11-25 after the fixes made since [UX_AUDIT.md](UX_AUDIT.md) and [UX_AUDIT_FOLLOWUP.md](UX_AUDIT_FOLLOWUP.md). The method is the same as before: **code and unit tests, plus checks in the demo account in a browser**. It is not a live walkthrough of the deployed site and not a test on a real phone, so scores are capped where that matters. Scores are not rounded up for effort.

## 1. Eight-pillar scorecard

| # | Pillar | Before | Now | Why it moved (or did not) |
|---|---|---|---|---|
| 1 | First-impression clarity | 6 | 6 | Only the storage FAQ changed. The landing page itself (widget load, CTA hierarchy) is untouched and was never viewed live. |
| 2 | Information architecture | 5 | 6 | Overview now has four shortcut chips, and documents are in global search. Still 13+ modules and **10 Budget tabs**. |
| 3 | Habit loop and data entry | 6 | 7 | CSV re-import is recognised exactly, income is checked, imports can be undone, Review has bulk category and select, number fields open the right keypad, NAVs refresh daily, onboarding is 2 steps. Not yet: one focused first-item form, per-step timing, PPF/FD quick actions. |
| 4 | Financial psychology | 7 | 7 | Stale NAVs use neutral amber, not red. No other change; overspend red usage was not reviewed. |
| 5 | Ergonomics and thumb zone | 6 | 6.5 | Add buttons stay visible, tap targets enlarged, keypads fixed. **Dense tables are still not card layouts on phones**, and nothing was tested on a physical device. |
| 6 | Trust, privacy, sync transparency | 3 | 5.5 | The false "your own browser" claim is replaced, Settings shows sync state, Kite is off by default, clipboard wording is honest. Still missing: **password reset, token revocation, a Drive "not encrypted by Mintmind" notice, per-document sharing rules**. |
| 7 | Multi-user mental models | 6 | 7 | "What others in the circle see of you" is live and built on the server's own visibility function. Sharing is still one set of permissions for everyone, not per member. |
| 8 | Visual hierarchy and accessibility | 6 | 6.5 | Violet (16px, AA contrast) is the default, tap targets and keypads improved. Chart/tooltip masking, colour-only status elsewhere, screen-reader and 200% text scaling are **untested**. |

**Average: 5.5 before, 6.4 now.** Pillar 6 moved most because it started lowest and had a plainly false claim.

## 2. Ease-of-access scorecard

| Area | Before | Now | Note |
|---|---|---|---|
| Daily actions | 8 | 8 | Already good; an Add chip was added on Overview. |
| Net worth and balances at a glance | 7 | 7.5 | |
| Investments and NAV | 5 | 6 | Chip on Overview, NAV date and "may be out of date" marker. Still under More on phones. |
| Documents and Vault | 4 | 5.5 | Documents chip and search. **Vault titles are not searchable.** |
| Family-shared information | 4 | 5 | Preview added; still under More and no "what changed" on Overview. |
| Global search | 5 | 6.5 | Documents added. No vault titles, budgets, recurring items or Drive-only files. |
| Back without losing input | 5 | 5 | No change; draft saving was not built. |
| Cross-device consistency | 6 | 6 | |

## 3. Done since the first audit

UX-01 storage copy, UX-02 CSV duplicates and undo, UX-08 Review bulk actions, UX-09 keypads, UX-14/15 clipboard, UX-20 sync status, tap targets, FAB visible by choice, NAV daily/priority/freshness/invariant test (I1 to I4), Kite owner-only gate and corrected `docs/INTEGRATIONS.md`, documents in search and Overview chips (part of I5), onboarding reduced to two steps (part of UX-04/06), Family preview (UX-17), Violet default look.

Two corrections to my own earlier claims: the first audit said bank CSV import had no duplicate check (it had a fuzzy one for expenses only), and `UX-13` needed no change because the main indicator already had arrows.

## 4. Still pending

**Trust and security (largest remaining gap)**
- **UX-03 Password reset and email verification.** A forgotten password locks the user out of server data. Needs an email provider.
- **Token revocation on logout.** Sign-in tokens stay valid until they expire.
- **S1 Drive disclosure.** The Documents page does not yet say files are not encrypted by Mintmind.
- **UX-16 Destructive-action coverage.** Confirm dialogs exist for several areas; accounts, vault items and recovery codes were not verified.

**Flows**
- **UX-05 Budget tabs 10 to 5.**
- **UX-07 / first value.** Picking a starting point does not yet open one focused form or show a first result.
- **UX-11/12 PPF and FD** record-contribution, mark-matured, renew.
- **UX-10 Import parse report** for partly read statements.
- **UX-18 Table to card layouts** (holdings, ledger, statement, CSV preview) below 768px.
- **A2 Vault title search, A3/A5/A6/A7/A8** (Quick Add parity, mobile search entry, More ordering, draft saving, button alternatives to gestures).

**Integrations (I6 to I14)**
- Attach-document control on funds, FDs, loans, accounts (I6); direct resumable Drive upload (I7, uploads above a few MB may fail on serverless hosting); Google Picker (I8); missing-file and duplicate detection (I9); encrypted-document option (I10); scheme link/repair (I11); NPS NAV and EPF/PPF rate config (I12); per-user Zerodha (I13); Account Aggregator study (I14).
- Document-sharing model for Family (D6) is undecided.

**Verification not yet done** (these can change scores)
- Live check of the deployed landing page and first-impression timing.
- Real HDFC/ICICI 120-row imports, CAS parsing with real files.
- Privacy mode on charts, tooltips, AI replies and notifications.
- Screen reader, keyboard-only and 200% text scaling passes; contrast of every Look.
- Physical-phone keyboard behaviour for each sheet.
- Official provider terms: AMFI automated use, mfapi.in, Kite redistribution, Frankfurter/ECB, IBJA, PPF rate source.

**Housekeeping**
- 48 files are changed and **nothing is committed**.
- The README and `docs/INTEGRATIONS.md` were updated, but `README` still lists Budget tab overlap and no password reset as limitations (correct).

## 5. Suggested order

1. **Drive disclosure (S1)**: small, closes a trust gap.
2. **Budget tabs (UX-05)** and **table to card reflows (UX-18)**: the two largest comfort issues.
3. **Password reset and token revocation (UX-03)**: biggest trust gap, needs an email service decision.
4. **FD/PPF actions (UX-11/12)** and **attach-document (I6)**: the main daily-use gaps for investors.
5. A live verification pass before the next rescore.

---

## 6. Update: Drive notice, password reset, sign-out revocation

Done after the first rescore:
- **S1**: the Documents page now says Drive files are not encrypted by Mintmind and that passwords and recovery codes belong in the Vault; the connect prompt says the same.
- **Password reset** (`/auth/forgot`, `/auth/reset`): one-hour single-use link, only a hash stored, same answer whether or not the address exists, per-address and per-IP limits, a reset signs out every other device. Needs an email service (`RESEND_API_KEY`, `RESEND_FROM`) to send mail.
- **Sign-out revocation**: signing out ends that token on the server; changing or resetting a password ends every older token and keeps the current device signed in.
- A broken CSS selector for the dark Violet look was fixed.

**Not verified end to end.** There is no MongoDB in this environment, so the new routes were only exercised for input validation (a bad email returns 400) and through unit tests of the token and reset rules. The database paths (saving the reset hash, the revoked-token list, the token-version check) have **not** been run. Test them against a real database before relying on them.

| Pillar | Now | Target 9: what is still missing |
|---|---|---|
| 1 First impression | 6 | Landing page trimmed and one CTA path; needs a live 5-second test with real people |
| 2 Information architecture | 6.5 (Budget tabs now 5 sections) | Vault titles in search; More ordering; a live check that people find things faster |
| 3 Habit loop | 7 | First-item form with immediate result; FD/PPF quick actions; import parse report; measured time-to-first-expense |
| 4 Financial psychology | 7 | Audit all overspend and loss colouring; missing-month wording check; reminders design |
| 5 Ergonomics | 6.5 | Card layouts for dense tables; on-device keyboard and thumb-reach tests |
| 6 Trust | 7 (was 5.5) | Email verification; per-document sharing rules; Drive attach and direct upload; verify auth paths on a real database |
| 7 Multi-user | 7 | Per-member permissions; document sharing; shared-item activity |
| 8 Visual and accessibility | 6.5 | Screen reader and 200% scaling pass; privacy mask on charts; AA check of every Look; colour-independent status everywhere |

A score of 9 on every pillar is not reachable by code changes alone: pillars 1, 5 and 8 depend on testing with real users and devices, which has not been done and is not claimed here.

---

## 7. Update: one phone menu, touch targets, privacy masking, look-matched icon, laptop and monitor checks

**Changed**
- **One phone menu.** The top-left hamburger duplicated the bottom More sheet, so it is gone. The More sheet is now the complete secondary menu (Assets, Loans, Investments, Cards, Insurance, Family Circle, Vault, Ledger, Settings, **Wealth AI**, plus notifications). Tablet and desktop keep the sidebar. The logo link shows on every phone width.
- **Touch targets.** On phones every small button, tab and switch gets an invisible hit area of at least 40px (one CSS rule). Carousel dots and range tabs were also made physically larger. A scan of the dashboard at 375px found 0 controls under 38px effective size (before: 35 small controls).
- **Hide balances now hides everything written as text.** A scan of the Budget page in hide-balances mode found 19 visible amounts that were not masked; the dashboard had 1. After the change both show 0 (the Investments, Accounts and Net worth pages show 0 too, apart from a fixed tax-limit label that is not personal data). The AI assistant keeps working from real figures. Twelve pages now re-draw when you toggle it.
- **The tab icon follows the look.** Switching Look recolours the browser tab icon (Violet purple, Ocean blue, Rose, Paper sage and so on); tested in the browser. The default icon files and the install colours are now Violet to match the default look. An installed app's home-screen icon is fixed when it is installed, so it cannot change with the look.
- Fixed a broken CSS selector in the dark Violet look.

**Layout checks (measured in the demo account, not seen by real users)**

| Screen | Width | Result |
|---|---|---|
| Phone | 375 | No sideways scroll on Overview, Budget, Investments, Ledger, Cookies; Cookies table now stacks as cards; the five Budget tabs scroll sideways (the last, Recurring, is off-screen until you swipe). |
| Laptop | 1366 | No sideways scroll; 16px text; sidebar 256px, content 1100px; 7 cards in view; 15 small controls under 28px high (mouse-only icons and chips, above the 24px WCAG minimum). |
| Monitor | 1920 | No sideways scroll; content is capped at 1408px, leaving about 125px each side; 9 cards in view. |
| Ultrawide | 2560 | No sideways scroll, but content is the same 1408px, so about 61% of the width is used and ~445px sits empty on each side. A third dashboard column or a wider cap at this size is not built. |

**Device-class scores (layout and ergonomics only, my estimate)**

| Device | Score | Why |
|---|---|---|
| Phone | 7 | One menu, bigger targets, cards instead of tables; not tested on a physical phone, Budget tabs still scroll. |
| Laptop (1366) | 8 | Clean fit, readable text, shortcuts work; small mouse controls are acceptable. |
| Monitor (1920) | 7.5 | Correct and tidy; a lot of unused margin and no extra column. |
| Ultrawide (2560) | 6 | Works but wastes about 40% of the width. |

None of these is a 9. A 9 needs real-device and real-user testing that has not been done, plus the ultrawide layout work and the remaining items listed above.

---

## 8. Update: a layout bug I introduced, and contrast fixes

- **Empty space under the page title on phones (found from a screenshot).** My touch-target CSS sat outside Tailwind's layers, so it overrode `fixed` and `absolute` on buttons. The floating buttons and the edge tab fell back into the page flow and pushed content down by about 43px. The rule now lives in the base layer. Measured after the fix: content starts directly under the top bar, floating buttons are `fixed` again, and 0 controls on the Budget page are under 38px effective size.
- **Dark Violet accent text was too dark** (3.4 : 1 on the bottom bar). The lighter dark-mode text colour I had written never applied, for the same layer reason. Text and icons now use a lighter purple (7.4 : 1); buttons keep the full accent with white text (5.4 : 1).
- **Contrast is now tested.** `lib/themeContrast.test.mjs` reads `app/globals.css` and requires the accent used as text to reach 4.5 : 1 on the page and card surfaces for all ten looks in light and dark. It found two more failures, Ember (4.40) and Sunset (4.45) in light mode; both accents were darkened slightly. All 21 checks pass. This checks the accent colour only, not every text colour.
- **The floating-buttons tab** on the right edge is now a solid accent-coloured tab with a larger arrow, so it can be seen on dark surfaces.
- **Search also finds Vault item names** while the vault is unlocked (names and categories only; nothing else is read, nothing is stored). Built and type-checked, but not exercised in a browser.
- **Ultrawide:** the content cap rises to 1920px on screens 2200px or wider, so a 2560 screen now uses 83% of the width (was 61%).

---

## 9. Update: one category at a time, as an icon carousel

The wrapped rows of filter chips are replaced by one shared component, `components/ui/category-carousel.tsx`, with one icon per category (`lib/categoryIcons.ts`). On a phone it is a swipeable strip of icon tiles with the name underneath, a count badge, the selected tile filled and the next tile peeking in; from tablet width up it is a row of pills with icon, name and count. **There is no "All": exactly one category is selected at a time**, and it opens on the first category that has something in it.

Converted: Assets (kind of asset), Insurance (policy type), Vault documents (category), Vault passwords (category), Investments (sections) and the views inside a Budget section. A search still looks in every category, so removing "All" does not hide anything from a search. Checked in the demo account at phone and desktop width. The page-level tab rows are converted too: Budget sections, Net Worth (Overview, Goals, Forecast), Settings (phone), Vault sections, Wealth AI, Planning tools and Cards (Credit/Debit). Left as plain tabs: the two-option detail toggles (policy details, goal details). On desktop, Settings keeps its side menu.

Also confirmed in the browser: searching for a Vault item name while the vault is unlocked lists it under "Vault (unlocked)".

---

## 10. Re-audit (third rescore) and what is still pending

**Design decision.** Icon-with-label carousels are used only where you browse categories of data: asset kinds, document categories, password categories, insurance types, and the shortcut rows on Overview and Net Worth and the Budget tools row. Page navigation is back to plain text tabs (Budget sections, Net Worth, Settings, Vault, Wealth AI, Planning tools, Cards, Investments), and the views inside a Budget section are small text pills. The Overview "Add expense" tile was removed because the floating Add button and the Spend button already do that.

**Evidence gathered this round**
- 286 unit tests pass; the typecheck has 0 errors. Lint still reports 60 errors and 16 warnings repo-wide (mostly one rule about setting state inside an effect, in code that was already there).
- Phone (375px, demo account, hide-balances on): no sideways scroll on Overview, Budget, Accounts, Investments, Cards, Insurance, Ledger or Family; 0 amounts left unmasked on all of them; 0 small tap targets on 8 of 9 pages (Overview still has 5 small inline text links); no hamburger; no stray gap under the top bar.
- Laptop (1366px): no sideways scroll on Overview, Budget, Assets and Settings; sidebar present.
- Contrast: 21 automated checks pass for the accent colour in every look, light and dark.

### Scorecard

| Pillar | Start | Last | Now | Why |
|---|---|---|---|---|
| 1 First impression | 6 | 6 | 6 | Landing page unchanged apart from the storage FAQ; never viewed live. |
| 2 Information architecture | 5 | 6.5 | 7 | Five Budget sections, one phone menu, shortcuts, search finds documents and Vault names, one category at a time. Still 13+ modules. |
| 3 Habit loop and data entry | 6 | 7 | 7.5 | CSV re-import safe with undo, bulk review, two-step onboarding, daily NAV, number keypads. No first-item form yet; no FD/PPF quick actions. |
| 4 Financial psychology | 7 | 7 | 7 | Unchanged; overspend colouring and reminders not reviewed. |
| 5 Ergonomics | 6 | 6.5 | 7.5 | Measured tap targets, one menu, card layouts, layout bug fixed. Not tested on a physical phone. |
| 6 Trust and sync | 3 | 7 | 7 | Reset, sign-out revocation, honest FAQ, Drive notice, sync panel. Database paths untested; no email verification. |
| 7 Multi-user | 6 | 7 | 7 | "What others see" preview. Still one permission set for everyone. |
| 8 Visual and accessibility | 6 | 6.5 | 7.5 | Contrast tested for accent colour, dark Violet fixed, hide-balances complete, 16px default. No screen-reader or 200% text test. |
| **Average** | 5.5 | 6.4 | **7.1** | |

Device classes (layout and ergonomics, my estimate): phone 7.5, laptop 8, monitor 7.5, ultrawide 7.5 (about 83% of the width used now).

**No pillar is at 9.** Pillars 1, 5 and 8 cannot honestly reach 9 without testing on real devices, a screen reader and real people, none of which has happened.

### Still pending

**Trust and security**
- Email verification at sign-up.
- Run the password reset, sign-out revocation and token-version code against a real MongoDB (only unit-tested so far).
- Per-document sharing rules; whether confirm dialogs cover deleting accounts, Vault items and recovery codes (UX-16).

**Flows**
- First-item form and a first-value screen after onboarding (UX-07).
- FD and PPF: record a contribution, mark matured, renew (a "Matured" list exists, but no actions) (UX-11/12).
- Import parse report for partly read statements (UX-10).
- Quick Add parity, saving drafts when you go back, buttons as alternatives to long-press, More-sheet ordering (A3, A6, A7, A8).
- Five small inline text links on the phone Overview.

**Integrations (I6 to I14)**
- Attach-document control on funds, FDs, loans and accounts; direct resumable Drive upload; Google Picker; missing-file and duplicate detection; encrypted-document option; scheme link and repair; NPS/EPF/PPF rate config; per-user Zerodha; Account Aggregator study.

**Family:** per-member permissions and document sharing.

**Verification not done:** live landing page; real HDFC/ICICI and CAS files; screen reader, keyboard-only and 200% text scaling; physical phone keyboards; contrast of text colours other than the accent; provider terms (AMFI, mfapi.in, Kite, Frankfurter, IBJA).

**Housekeeping:** about 100 files changed and not committed; the lint backlog above.

---

## 11. Update: first value, FD renewal, PPF/NPS contributions, no gamification

- **Gamification removed.** The Achievements panel (tiered badges for "months in a row" streaks, on by default on the dashboard), its Settings switch, and its code and tests are deleted. This matches the product's own rule on the landing page: missing months stay empty and there is no streak to keep up. Net worth chart milestones stay, because they are factual events, not rewards.
- **First value in onboarding.** As soon as one asset, loan or account is added in Quick setup, a card shows what it adds up to: "Your net worth so far", assets minus loans.
- **FD renewal.** A matured fixed deposit has a Renew button: the same deposit starts again on its maturity date with the maturity amount as the new principal, the rate kept, the new maturity date left for you to fill in, and the old terms kept in a renewals list. Unit-tested; checked in the browser.
- **PPF and NPS contributions** can be added from the account's own page in Investments (Add contribution), using the same dialog as the Net Worth limits panel; it also raises the balance if you tick that box. Checked in the browser: the total rose by the amount entered.
- **Overview shortcuts:** Budget, Investments and Documents on the left, Add expense pinned to the right end of the row.
- **Net Worth shortcuts** are labelled Export CSV and Export Excel, and tile labels wrap to two lines.
- `.env.example` now holds obviously fake placeholder values for every setting, plus the new email and Kite settings.
