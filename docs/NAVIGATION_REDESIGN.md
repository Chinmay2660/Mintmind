# Navigation redesign: drill-down instead of tab-heavy screens

Status: design proposal. Nothing here is implemented yet. Tap counts are estimates from the current routes, not measurements.

Model: **Overview → Category → Item → Detail → Action.** Tabs stay only where people flip between sibling views of the same data many times a session.

## 1. Current vs proposed architecture

| Module (route) | Today | Proposed |
|---|---|---|
| Overview `/dashboard` | Blocks + attention strip + shortcut tiles | Keep. Each block header becomes a link into its category (Net worth → Net Worth, Spending → Budget). |
| Budget `/dashboard/budget` | 5 section tabs + 1–3 sub-pills each (up to 12 views) | 3 top tabs (Month, Transactions, Insights). Recurring and Review move to list rows with badges. Calendar, Summary, Stats, Cash flow become Insights cards that drill to a full report. |
| Net Worth `/dashboard/net-worth` | Tabs Overview / Goals / Forecast + tiles + History | Overview as drill list (Assets, Liabilities rows with totals). Goals and Forecast become rows under "Plan". |
| Investments `/dashboard/mutual-funds` | 8 tab sections | Summary card + category list (Mutual funds, Stocks, FD/RD, Gold, Retirement, Property, Other). Tap a row to see that category's holdings; tap a holding for its detail page. |
| Settings | 10 tabs | iOS/Money Manager style: a list of groups; each opens a full page. No tab bar. |
| Vault | 3 sections | Keep 3 tabs (Documents, Passwords, Notes): used interchangeably. |
| Credit cards | 2 tabs | Keep. |
| Insurance | Type filters | Category list by type, drill to policy detail. |
| Family | Member cards + dropdown | Member list → member detail page (what they share, actions). |
| AI / Tools | Tabs | Tool list (like Groww Explore) → full-screen tool. |

## 2. Tab reduction by module

| Module | Tabs/pills today | Proposed | Notes |
|---|---|---|---|
| Budget | 5 + up to 4 sub | 3 | Review count becomes a badge on Transactions. |
| Investments | 8 | 0 (list) | Replaced by category drill-down. |
| Settings | 10 | 0 (list) | Group headers: Account, Look, Budget, Family, Data, Integrations. |
| Net Worth | 3 | 0–2 | Goals/Forecast reachable from the list. |
| Vault | 3 | 3 | Retained. |
| Cards | 2 | 2 | Retained. |

## 3. Drill-down hierarchy per module

- **Investments:** Portfolio summary → category (Mutual funds) → fund row → fund detail (NAV, units, realised gain, SIP) → actions (Add purchase, Record sale, Start SIP) in a bottom sheet.
- **Budget:** Month summary → category row (Food) → transaction list for that category → transaction detail → Edit / Split / Delete.
- **Net Worth:** Total → Assets or Liabilities → item (a loan, a property) → detail → Edit / Renew / Add contribution.
- **Insurance:** Total cover → type → policy → detail (premium, nominee, documents) → Renew / Attach document.
- **Documents:** Folders by type → document → preview → Share / Replace.
- **Family:** Circle → member → what they share with you, what you share with them → Change sharing (opens Settings > Family sharing for that person).

## 4. Mobile navigation

- Bottom bar (5): Home, Budget, Wealth, Vault, More. Already in `components/shell/MobileNav.tsx`.
- No hamburger on phones; More holds everything else (already done).
- Detail pages are full screen with a back arrow; the back gesture returns to the same scroll position.
- Quick actions (Add expense, Add holding) are bottom sheets from a single primary button.
- Unsaved forms: keep drafts in memory (sessionStorage) so leaving and returning does not lose input.

## 5. Desktop and tablet

- Persistent sidebar, as today.
- Tablet and desktop: master-detail split (list on the left, detail on the right) for Investments, Insurance, Documents, Family. On phones the same routes are two full screens.
- Tab bars allowed on desktop only when they fit without scrolling.

## 6. Screens that keep tabs, and why

| Screen | Why |
|---|---|
| Budget: Month / Transactions / Insights | Users move between these constantly within a month. |
| Vault: Documents / Passwords / Notes | Peer collections, frequent switching. |
| Cards: Cards / Statements | Two views of the same card. |
| Fund detail: Overview / Transactions | Short, peer sub-views. |

Rule: 2 to 4 tabs, text only, never a horizontally scrolling tab bar. Category browsing with icons stays a carousel only on Overview and Explore-like tool lists.

## 7. Pattern per screen

| Pattern | Use for |
|---|---|
| Cards | Summaries and Overview blocks. |
| Lists | Categories, holdings, transactions, members, settings groups. |
| Accordions | Long help text, advanced filters, FAQ-like settings. |
| Detail pages | Fund, policy, loan, member, document. |
| Bottom sheets | Quick add, filters, sort, confirmations, pickers, setup progress. |
| Amount keypad | Add expense and Record sale (calculator-style as in Money Manager). |

## 8. Before and after journeys (estimated taps from Overview)

| Journey | Today | Proposed |
|---|---|---|
| Review uncategorised transactions | Budget → Transactions → Review (3) | Attention strip → Review list (2) |
| Check a fund's realised gain | Investments → Mutual funds tab → fund (3) | Net worth block → Mutual funds → fund (3) |
| Change what one relative sees | Family → Settings link → Family sharing → person (4) | Family → member → Change sharing (3) |
| Add a property | Net Worth → Property tile → Add (3) | Investments → Property → Add (3) |
| View monthly cash flow | Budget → Insights → Cash flow (3) | Budget → Insights card (2) |

Honest note: tap savings are small for journeys that are already short; the larger gain is fewer visible choices per screen (Settings 10 → 6 groups, Investments 8 tabs → 1 list), which is a clarity improvement that tap counts do not capture.

## 9. Priorities and acceptance criteria

| # | Change | Complexity | Acceptance |
|---|---|---|---|
| 1 | Settings as a grouped list with sub-pages (`app/(routes)/dashboard/settings/page.tsx`) | Medium | No tab bar on phones; deep links `?tab=` still work; each group fits one screen. |
| 2 | Investments category list replacing 8 tabs (`app/(routes)/dashboard/mutual-funds/page.tsx`, `HoldingsTab.tsx`) | Medium | Every current tab's content reachable in 2 taps; `?tab=` links redirect. |
| 3 | Budget to 3 tabs (`lib/wealth/budgetTabs.js`) | Low | Existing tests updated; review badge retained. |
| 4 | Detail pages + bottom-sheet actions for funds, policies, loans | Medium | Back returns to the same scroll position; no data lost. |
| 5 | Master-detail on tablet/desktop | High | Works from 768px; falls back to full-screen on phones. |
| 6 | Amount keypad sheet | Medium | Add expense in 3 taps or fewer. |

Order: 1, 3, 2, 4, then 6 and 5.

## 10. Preserved features

Nothing is removed: Review, Rules, Categories, Calendar, Summary, Stats, Cash flow, Goals, Forecast, History, Export and sharing controls all stay, only reached by a list row or card instead of a tab.
