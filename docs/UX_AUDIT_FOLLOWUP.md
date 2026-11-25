# Mintmind follow-up audit: ease of access, market-data APIs, Google Drive

Continues [UX_AUDIT.md](UX_AUDIT.md). Section numbers continue from there (15 onward). Its roadmap items are numbered I1–I14 below and extend its Phases 1–4.

**Scope and evidence.** Code read in this repo, plus web searches on 2026-11-25. The web results were search summaries, not a read of each official page, so every external fact carries a status:
- **Confirmed**: a primary or official page was the source.
- **Reported**: a secondary source said so.
- **Verify**: not established; check before building.

Nothing here has been implemented. Provider pricing and terms change; re-check before building.

---

## 15. Ease-of-access scorecard

| Area | Score | Evidence |
|---|---|---|
| Daily actions (add expense, recent, budget) | 8 | Spend is the centre of the phone bar; Add pill and `A` shortcut; signed-in phones open on Spend |
| Net worth and balances at a glance | 7 | Overview and Net Worth are bar items 1 and 2; privacy toggle `P` |
| Investments and NAV | 5 | Investments is under More on phones; NAV date shows in the fund table but no freshness label (Verify in the UI) |
| Documents and Vault | 4 | Reachable only from the Vault page tabs or by search for the page; not in the bar or Quick Add |
| Family-shared information | 4 | Family Circle is under More; nothing on Overview says what changed |
| Global search | 5 | See section 16 |
| Back without losing input | 5 | Edge-swipe back exists; unsaved-form protection is unverified |
| Cross-device consistency | 6 | Shared nav constants (`lib/constants/dashboardNav.ts`); the phone bar and desktop sidebar differ by design |

## 16. Navigation and quick-access recommendations

**Search today (verified, `components/AppSearch.tsx`).** Opens with `Ctrl/Cmd+K` or `/`. It searches pages, quick actions, expenses, bank transactions, accounts and cards, funds, assets, liabilities, goals and insurance policies. It does **not** search documents, vault entries, budgets, recurring items, family data or Drive files.

**Reachability target**
- One interaction: add transaction, this month's spend, privacy toggle.
- Two interactions: recent transactions, account balances, net worth, investments, documents.
- Secondary navigation: settings, imports, family permissions, legacy.

| ID | Problem | Proposed experience and approach | Priority | Acceptance |
|---|---|---|---|---|
| A1 | Finding a policy PDF takes 3+ taps | Add documents to search. Query the paged `/api/drive/files?q=` (already server-side) when the palette is open, debounced | High | Typing a document name lists it and opens its preview |
| A2 | Passwords are hard to reach | Search vault item **titles** in memory only while unlocked; never persist the index or index secrets; locked shows "Unlock the vault to search" | Medium | Locked vault returns no vault results; no titles in logs or storage |
| A3 | Quick Add covers transaction, account, asset, investment, liability, goal but not documents | Add "Attach document" and "Record NAV or contribution" | Medium | Upload dialog opens in two interactions or fewer from anywhere |
| A4 | Daily destinations are 2+ taps from Overview | A row of four chips under the summary cards: Add expense, This month's budget, Investments, Documents | High | Each reachable in one tap from Overview |
| A5 | Search is keyboard-led | Search icon in the phone Spend header or More sheet opening the same palette as a full-screen sheet | Medium | Search reachable in two taps on a phone |
| A6 | Investments sit low in More | Order the More sheet: Investments, Documents, Vault, Family first | Low | Order verified in `MobileNav` |
| A7 | Losing entered data on back | Draft autosave for long forms (statement mapping, asset form) in `sessionStorage`; confirm on leave for dirty dialogs | Medium | Back then forward restores fields |
| A8 | Long-press selection is gesture-only | Visible "Select" button in list headers (partly present) | Medium | Every gesture has a button |

Keep the phone bar at four items plus More. Do not add a fifth.

---

## 17. Kite API feasibility assessment

**What the app does today (verified).**
- `lib/kite/client.js` calls Kite Connect v3 from the server only.
- `lib/market/sync.js` fetches `/mf/instruments` (CSV; `parseKiteMfCsv` reads `tradingsymbol`, `name`, `last_price`, `last_price_date`) and `/quote/ltp` for symbols in `MARKET_EQUITY_SYMBOLS`.
- There is one app-level access token. The owner logs in through `/api/internal/kite/login`, and tokens expire around 6 AM IST.
- Results are cached in `MarketPrice`; users read them through `POST /api/market/prices`.

**What Kite supports**
- `GET /mf/instruments` is the master list of mutual funds on the platform; dividend-reinvestment schemes are not supported. **Confirmed**: [Kite Connect, Mutual funds](https://kite.trade/docs/connect/v3/mutual-funds).
- Client libraries define `last_price` and `last_price_date` on MF instruments, but the official prose does not say `last_price` is NAV. **Verify** by comparing a few schemes against AMFI before trusting it.
- Kite's MF orders, SIPs and holdings belong to the authenticated Zerodha account (the app owner's), not to each Mintmind user. They cannot serve other users unless each connects their own Zerodha account. **Reported**; read the page before designing.

**Cost and terms**
- The free personal API covers orders, positions, holdings and funds, with **no live or historical market data**. Paid Connect is ₹500 per month per API key and includes historical data. **Reported**: [Zerodha support, charges for Kite APIs](https://support.zerodha.com/category/trading-and-markets/general-kite/kite-api/articles/what-are-the-charges-for-kite-apis). Summaries disagreed on details and dates, so **Verify** current wording.
- Displaying or redistributing Kite Connect data on external platforms is reported to breach exchange data-vending policy; Kite Connect is an execution platform, not a data distributor. **Reported; Verify** before relying on it either way.

**Conclusion**
1. Kite is not needed for mutual fund NAV. AMFI's public file already covers every scheme, and the weekly sync fetches it first.
2. `/quote/ltp` is market data, so it likely needs the paid tier. A cache fed by one person's Kite session and shown to many users is the pattern most likely to breach data-vending terms.
3. Recommendation: **AMFI is the default NAV source.** Keep Kite optional and **owner-only** (self-hosted single user). Do not show Kite-sourced prices to other users until Zerodha confirms permitted use in writing.
4. If a user wants Kite for their own holdings (not market data), build a separate per-user connection that reads their Coin MF holdings, with the daily re-login handled in the UX.

| | |
|---|---|
| Priority | High (compliance); Medium (per-user connection) |
| Complexity | S to gate Kite off by default; L for a per-user connection |
| Acceptance | With no Kite keys, NAVs update fully from AMFI. The Kite path is off by default in production. Docs state the licensing limit. |

---

## 18. Mutual fund NAV data provider comparison

| Provider | Coverage | Access and cost | History | Latency | Terms | Verdict |
|---|---|---|---|---|---|---|
| AMFI [NAVAll.txt](https://www.amfiindia.com/spages/NAVAll.txt) | All Indian MF schemes (code, ISINs, name, NAV, date) | None; free | Separate AMFI download page, max 90 days per request (Reported); not in this file | Daily, after market close | AMFI terms bar misrepresentation and logo use; no explicit rule on automated retrieval found (Verify, ask AMFI) | **Primary** (already used) |
| mfapi.in | Schemes by AMFI code; search, latest, full history | None; free, community-run | Full history per scheme | Mirrors AMFI | No official terms found; asks for responsible use | **Optional** for history and search (used by `lib/services/mfapi.js`, `/api/mfapi/*`); never a hard dependency |
| Kite `/mf/instruments` | Platform MFs only, no DRIP | Kite app plus daily login | None | Unknown | See section 17 | **Unsuitable as a shared source** |
| Paid data vendors | Broad | Paid | Yes | Varies | Per contract | **Later**, only if AMFI reliability proves a problem; assess cost and licence then |

**Matching (verified, `lib/market/parsers.js`).** The match order is ISIN or symbol, then scheme code, then an exact normalised name. Ambiguous names are skipped, never guessed. `refreshNavs` never replaces a newer NAV with an older one, and skips funds marked `manual-locked`.

| ID | Gap | Fix | Priority / effort |
|---|---|---|---|
| N1 | `matchFund` returns the first matching row, and both AMFI and Kite rows live in `MarketPrice`, so precedence is undefined | Prefer AMFI, then the row with the latest `priceDate` | High / S |
| N2 | NAVs change daily but the cron and `PriceRefresher` are weekly | Schedule the sync daily after AMFI publishes (time: Verify), keep the manual **Refresh NAVs** button, rate limit already 20/min | High / S |
| N3 | No freshness cue | Per fund: "NAV ₹X · as of 21 Nov · refreshed 2 h ago". Portfolio line: "Values as of ...". Mark NAVs older than 4 business days "may be out of date" in neutral amber, not red | High / S |
| N4 | Mergers, renames and discontinued schemes break name matching | Store `isin` and `schemeCode` on the fund at first match; if a scheme is missing from the latest file, show "Not found in latest NAV file" instead of silently keeping an old value | Medium / M |
| N5 | `nameKey` strips "plan" and "option" words, so Direct vs Regular and Growth vs IDCW could merge | Require an ISIN or code when two candidates share a name key (current code skips them, which is correct). Add a visible **Link scheme** action for skipped funds | Medium / M |
| N6 | Failure visibility | `syncMarket` already isolates sources and stores `lastResult` in `MarketMeta`. Add one retry with backoff, `lastSuccessAt` per source, and show "last successful refresh" in the app (the API returns `lastSyncAt`; confirm the UI shows it) | Medium / S |
| N7 | Invariant is only a code comment | Unit test that a NAV refresh changes only `currentNav`, `navDate`, `navSource` and derived value, never units, invested amount or transactions | Medium / S |

**Portfolio calculations.** Invested amount, current value, unrealised gain and XIRR exist in `lib/wealth/calc.js` (actual/365). Realised profit and loss on redemptions was **not verified**; inspect it before promising it. Acceptance: changing a NAV changes value, unrealised gain, absolute return, XIRR and allocation, and nothing else.

**Proposed data-model additions**
- `MarketPrice`: `fetchedAt`, `sourceRef`, `status`.
- Fund record: `isin`, `schemeCode`, `navSource`, `navDate`, `navFetchedAt` (some already exist).
- A small `MarketSyncLog` (source, start, end, counts, error) for audit, holding no personal data.

---

## 19. Other financial API integration matrix

| Product | User problem | Candidate source | Status | Recommendation |
|---|---|---|---|---|
| Mutual funds | Stale NAV | AMFI file, mfapi.in for history | File confirmed; terms Verify | **First** |
| Stocks and ETFs | Stale prices | Kite `/quote/ltp` (paid); exchange data vendors (paid). No free official feed with redistribution rights was found | Restricted | **Later or optional**. Manual price stays the default. No scraping |
| Fixed deposits | Maturity and interest estimates | Calculation only (`fdValue`). No bank API for personal FD data was found; do not assume one | n/a | **No API**. Optionally a manually maintained, dated "indicative rates" list |
| EPF | Annual rate | Official EPFO / Finance Ministry notification once a year (Reported: 8.25% for FY 2025-26, from news) | Reported, no API | **Manual yearly config value** with source link and date. No balance sync |
| PPF | Quarterly rate | Government notification (not found in search) | Verify | **Manual config**. No balance sync |
| NPS | Scheme NAV | PFRDA scheme-wise NAV downloads; NPS CRA daily NAV page (Reported) | Reported | **Optional later**, NAV only; check terms first |
| Gold | Valuation | No official free API confirmed; IBJA not checked | Verify | **Later**. Label "indicative"; keep the user's purchase value separate |
| Currency | Foreign assets | RBI reference rate is now computed by FBIL; the RBI archive is a download form with no documented API; the MSEI copy says "for viewing only" (Reported). ECB-based public APIs not verified | Restricted / Verify | **Defer** (multi-currency is not built). If added, store the rate, date and source on each record |
| Insurance | Policy details | No public API for personal policies | n/a | **Not suitable**. Use document upload (section 20) |
| Bank transactions | Manual entry burden | Account Aggregator providers (RBI framework) | **Not researched** | Separate feasibility study; consent and legal flows apply |

**Order of work:** (1) AMFI daily NAV plus freshness UI, (2) Kite owner-only, (3) Drive attach and Picker, (4) NPS NAV (optional), (5) everything else only on demonstrated demand.

---

## 20. Google Drive integration assessment

**What exists (verified)**
- OAuth 2.0 with scope `drive.file` plus `openid email` (`lib/google/drive.js`). Each user connects their own Drive.
- The refresh token is stored encrypted (AES-256-GCM, `ENCRYPTION_KEY`); access tokens are minted per request and never reach the browser. `invalid_grant` is detected and the UI asks to reconnect; disconnect revokes at Google.
- Uploads go **through the server** into `My Wealth App/<Category>` folders (`ensureFolders`). Metadata lives in `DriveDocument` (userId, `driveFileId`, name, fileName, category, mimeType, size, notes).
- Open, replace, move and delete by id, with a `userId` ownership check (`app/api/drive/files/[id]/route.js`).
- Listing is paged on the server with a word search over name, file name, category and notes.
- Linking exists for **insurance only**: `documentId` on the policy. A search of the code finds no link field for funds, FDs, loans, property or accounts.
- Demo documents are blobs in IndexedDB; real documents live in Drive.

**Is `drive.file` enough?** Yes, for uploading, opening, replacing and organising files Mintmind created. Per [Google's Drive scope guide](https://developers.google.com/workspace/drive/api/guides/api-specific-auth), `drive.file` is the recommended non-sensitive scope with per-file access, and full-Drive access is restricted. To "select existing Drive files", use the **Google Picker**, which grants `drive.file` access only to the files the user picks. The Picker cannot move or organise files, so organising stays inside Mintmind's folders. Do not request `drive` or `drive.readonly`.

| ID | Gap | Proposed fix | Priority / effort | Acceptance |
|---|---|---|---|---|
| D1 | The route accepts 25 MB (`MAX_BYTES`) but passes the whole file through a server function. Serverless hosts cap request bodies at a few MB (Vercel documents about 4.5 MB; Verify) | Browser uploads straight to Drive with a **resumable upload session** that the server creates with its token. The browser sends bytes to Google; the access and refresh tokens never reach the browser. Add progress and retry | High / M | A 25 MB file uploads on the deployed host; an interrupted upload resumes |
| D2 | Attachments exist only for insurance | A reusable `AttachDocument` control with three choices: upload from device, pick from Drive, choose an existing Mintmind document. Store `documentIds` on funds (per folio), FDs and assets, loans, accounts, policies | High / M | Attach, preview and detach from each record type |
| D3 | A file deleted, moved or trashed in Drive leaves a dangling row | Detect 404 or trashed on open and mark `status: 'missing'`; offer relink or remove; never auto-delete the row. Add a "Check files" action | Medium / M | A file deleted in Drive shows "missing" with no data loss |
| D4 | No duplicate check | Hash (SHA-256) in the browser before upload, store `contentHash`, warn "This looks like a file you already added" with use existing / add anyway. Cross-check with Drive's `md5Checksum` | Medium / M | The same file is warned about, not silently added twice |
| D5 | Documents are searchable only on their own page | Add to global search (A1). No full-text content search; do not claim it | Medium / S | See A1 |
| D6 | Family members cannot see each other's documents (`userId` check) | Keep it that way until per-document sharing is designed after the family preview. Never use Drive "anyone with the link" | Medium / M | Sharing is explicit and revocable |
| D7 | One-at-a-time upload | Multi-file upload with per-file category, defaulting from context (attaching to a policy defaults to Insurance) | Low / S | Several files upload in one action |
| D8 | Offline | Drive files and their metadata need a connection. Say so: "Documents need an internet connection". Optionally cache recently opened previews | Medium / S | Offline state is disclosed |

**Proposed workflow.** Open a record, then Attach document, then Upload from device or Select from Google Drive. Preview, confirm, and the document appears on the record and in the Documents library. If Drive is unavailable, the rest of Mintmind keeps working and the Attach control shows the reason.

**Document data structure (proposed addition to `DriveDocument`):** `contentHash`, `status` (`ok | missing | no_access`), `checkedAt`, `links: [{ kind, recordId }]`, and optional `encrypted: true` with the key id.

---

## 21. Drive versus Vault: responsibilities and security boundary

| | **Documents (Google Drive)** | **Vault** |
|---|---|---|
| Stored | The file in the user's own Drive; Mintmind keeps metadata and the file id | Encrypted items (passwords, notes, secrets), synced as ciphertext |
| Encryption | **Not encrypted by Mintmind.** Protected by Google account security and Drive permissions | AES-256-GCM, key from the master password (PBKDF2 600k); Mintmind cannot read it |
| Who can read | The Google account owner; the Mintmind server with the stored refresh token, limited to files it created or was granted | Only someone with the master password or recovery key |
| Delete | Deleting in Mintmind deletes the Drive file (Verify that it asks first); deleting in Drive leaves a dangling row (D3) | Deleting removes the item everywhere it syncs |
| Offline | No | Yes, once unlocked on the device |
| Family | Not shared today | Not shared |

| ID | Recommendation | Priority / effort |
|---|---|---|
| S1 | State the boundary in the UI: "Files are stored in your Google Drive and are not encrypted by Mintmind. Anyone with access to your Google account can open them. For highly sensitive files, use encrypted storage." Show it before connecting | High / S |
| S2 | Optional **encrypted document** mode: encrypt in the browser with a key derived from the vault key and upload the ciphertext. Trade-offs: no Drive preview or search, more complexity, recovery depends on the vault. Offer for Identity, Legacy and Property only | Medium / L |
| S3 | Never create public or "anyone with the link" permissions. The proxy model already avoids this. Add a test that no code path sets Drive permissions | High / S |
| S4 | Explain the scope in plain words: "Mintmind can only see files it creates or that you pick" | Medium / S |

---

## 22. Unified data flow and source of truth

```
Browser (React)
  |- reads and writes -> IndexedDB (Dexie, per user)   offline copy, instant UI
  |                         |  outbox of changes
  |                         v
  |- /api/sync ---------> MongoDB SyncDoc  (user records; vault items are ciphertext)
  |
  |- /api/market/prices <- MongoDB MarketPrice / MarketMeta  (shared, read only to users)
  |                         ^
  |            scheduled job /api/internal/market-sync  (CRON_SECRET)
  |               |- AMFI NAVAll.txt   primary
  |               |- mfapi.in          optional, history and search
  |               '- Kite              owner only, optional
  |
  '- /api/documents, /api/drive/* -> Google OAuth + Drive API (the user's own Drive)
                                     metadata in MongoDB DriveDocument
```

| Data | Source of truth | May an external refresh overwrite it? |
|---|---|---|
| Transactions, accounts, budgets, goals | User records (local, synced) | **Never** |
| Fund units, folios, transaction history | User entries or verified statement imports | **Never** |
| NAV and NAV date | External provider via the shared cache | Only `currentNav`, `navDate`, derived value; never when `navSource` is `manual-locked` (verified) |
| Portfolio value, returns, XIRR | Computed from holdings plus NAV | Derived, never stored as truth |
| FD maturity, EPF and PPF estimates | Calculated from user inputs and a dated rate config | Not auto-synced |
| Document files | The user's Google Drive (or an encrypted copy if S2) | Metadata only |
| Vault | Encrypted items, user-held key | **Never** |

**Rules to add**
- Every external value carries its value, as-of date, fetched-at time and source name.
- Manual refresh exists; show a cool-down message instead of failing.
- Imports are idempotent (fingerprint check; see UX-02 in the main audit).
- Per-source partial-failure reporting in `lastResult`.
- A small audit log of sync and import runs (timestamps, counts, source; no personal contents).
- Never silently substitute another provider's figure; show the source name.

**Offline.** Prices show the last cached value with its date. Documents and Drive are unavailable offline, and that is disclosed. Everything else works from IndexedDB and syncs on reconnect. Sync conflicts are whole-record last-writer-wins by server revision; document this, and consider field-level merges only for contested tables.

---

## 23. Security, privacy, permissions and compliance risks

| ID | Risk | Severity | Mitigation |
|---|---|---|---|
| R1 | Kite-sourced prices served to many users may breach Zerodha's data terms | High | AMFI primary; Kite owner-only; written confirmation before any multi-user use |
| R2 | AMFI and mfapi.in terms on automated retrieval are unclear | Medium | Fetch once daily on the server (not per user), identify the client in `User-Agent`, contact AMFI, keep a fallback |
| R3 | Drive files are not end-to-end encrypted; a Google account compromise exposes them | High (disclosure) | S1 copy; S2 encrypted mode |
| R4 | The server holds Drive refresh tokens (encrypted with `ENCRYPTION_KEY`) | Medium | Key rotation plan; revoke on disconnect (exists); notify on `invalid_grant` |
| R5 | Server-proxied uploads hit size limits and hold file bytes in memory | Medium | D1 resumable direct upload |
| R6 | Search could leak vault or document names | Medium | A2: only while unlocked, never persisted, no secrets |
| R7 | Stale market data shown as current | Medium | N3 freshness labels |
| R8 | Third-party prices read as advice | Low | "Indicative, not advice" wording on prices and rates |
| R9 | The "Architecture notes" section of `docs/INTEGRATIONS.md` is out of date: it says there is no server sync for wealth data and that vault data never leaves the device, both contradicting the code and README | Medium (trust) | Rewrite it to match the README |
| R10 | Production Drive consent and verification | Low | `drive.file` is non-sensitive (Reported), so verification is lighter; a consent screen and privacy policy are still required |

---

## 24. Integration roadmap

Dependencies are on other rows unless a system is named. Effort: S about a day, M one to two weeks, L more than two weeks.

| # | Item | Priority | Effort | Depends on | Acceptance criteria |
|---|---|---|---|---|---|
| I1 | AMFI as default NAV source, latest-date precedence, daily schedule (N1, N2) | High | S | a cron host | A fund's NAV date advances daily; AMFI wins ties |
| I2 | NAV freshness UI, stale marker, last refreshed (N3, N6) | High | S | I1 | Each fund shows NAV, date and refresh time; stale NAVs flagged without red |
| I3 | Kite owner-only; correct `docs/INTEGRATIONS.md` (R1, R9) | High | S | none | Production has Kite off unless a flag is set; the doc matches the code |
| I4 | NAV invariant test (N7) | Medium | S | none | Test proves units, invested amount and transactions are unchanged by a refresh |
| I5 | Documents and vault titles in search; Overview shortcut chips (A1, A2, A4). **Done: documents in search (names, file names, categories, notes only) and four Overview chips. Vault titles not done.** | High | M | none | A document name is found in two interactions or fewer |
| I6 | `AttachDocument` and `documentIds` on funds, FDs, loans, accounts (D2) | High | M | metadata sync design | Attach, preview and detach on each record type |
| I7 | Direct resumable upload with progress and retry (D1) | High | M | server endpoint for upload sessions | A 25 MB file uploads on the deployed host; an interrupted upload resumes |
| I8 | Google Picker for existing files under `drive.file` (D2) | Medium | M | I7 | A picked file attaches; no broader scope requested |
| I9 | Missing-file detection and duplicate hash warning (D3, D4) | Medium | M | I6 | Deleted-in-Drive shows "missing" without data loss; duplicates are warned |
| I10 | Drive vs Vault copy (S1) now; optional encrypted-document mode (S2) later | High / Medium | S / L | S2 needs vault key access | Disclosure visible before connecting; encrypted files round-trip |
| I11 | Scheme link and repair for unmatched or renamed funds (N4, N5) | Medium | M | I1 | Unmatched funds show **Link scheme**; ISIN stored after linking |
| I12 | NPS NAV (optional); EPF and PPF dated rate config | Low | M | terms check | Rate shown with source and date |
| I13 | Per-user Zerodha / Coin holdings connection | Low | L | Kite plan, legal review | Separate feasibility; not started |
| I14 | Account Aggregator feasibility study | Low | L | legal advice | Written study only |

**Where they fit.** I1–I4 and the disclosure copy in I10 belong in Phases 1–2 of the main roadmap; I5–I9 in Phases 2–3; I11–I14 in Phase 4.

---

## 25. Not verified in this follow-up

Official pages were not opened for: Kite pricing and redistribution wording, AMFI automated-use terms, mfapi.in terms, Frankfurter / ECB, IBJA gold, FBIL API availability, and the PPF rate notification. Also untested: what Kite's `last_price` means in its MF instruments file, the request-body limit on this deployment, whether Mintmind asks before deleting the Drive file, realised profit and loss, and the NAV freshness UI. Treat every "Verify" above as a checklist item before implementation.
