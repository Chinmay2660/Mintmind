'use client'

import { useBackToClose } from '@/lib/hooks/useBackToClose'
import { toastProblem } from '@/lib/notify'
import { FootNote, InfoTip } from '@/components/wealth/kit'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { ArrowRight, ChevronDown, ChevronLeft, Delete, Loader2, Tags, X } from 'lucide-react'
import { useWealth } from '@/lib/wealth/WealthContext'
import { addExpense, addIncome, addTransfer, updateExpense } from '@/lib/wealth/actions'
import { availableBalance, toISO } from '@/lib/wealth/calc'
import { PAYMENT_MODES } from '@/lib/wealth/labels'
import { useCategories } from '@/lib/wealth/useCategories'
import { formatDate, formatINR } from '@/lib/wealth/format'
import { displayExpr, evalAmount, hasOperator, pressKey } from '@/lib/wealth/amountExpr'
import { findDuplicates, learnCorrection, suggestCategory } from '@/lib/ai/budgetAI'
import { DateInput, Select } from '@/components/ui/pickers'
import { cn } from '@/lib/utils'
import { matchRule } from '@/lib/wealth/rules'
import { useRules } from './RulesDialog'
import { shortAccountName, shortBank } from '@/lib/wealth/accountName'
import { addMonths, spreadMonths } from '@/lib/wealth/spread'
import { monthLabel } from '@/lib/wealth/selectors'
import { SEP, childOf, groupCategories, parentOf } from '@/lib/wealth/subcategories'

export type TxnType = 'expense' | 'income' | 'transfer'
const TYPES: { v: TxnType; l: string; verb: string }[] = [
  { v: 'income', l: 'Income', verb: 'Received' },
  { v: 'expense', l: 'Expense', verb: 'Spent' }, // in the middle, and the default
  { v: 'transfer', l: 'Transfer', verb: 'Moving' },
]
const TONE: Record<TxnType, { text: string; bg: string; ring: string }> = {
  expense: { text: 'text-expense', bg: 'bg-expense text-white', ring: 'border-expense bg-expense/10 text-expense' },
  income: { text: 'text-income', bg: 'bg-income text-white', ring: 'border-income bg-income/10 text-income' },
  transfer: { text: 'text-primary', bg: 'bg-primary text-primary-foreground', ring: 'border-primary bg-primary/10 text-primary' },
}
// "Nickname - Bank Name" so two accounts at one bank are easy to tell apart (cash is just "Cash")
const label = (a: any) => (a.type === 'cash' ? 'Cash' : !a.nickname || !a.bankName || a.nickname === a.bankName ? a.nickname || a.bankName : `${a.nickname} - ${a.bankName}`)
const shortLabel = shortAccountName // the one short account name used across the app
const cardLabel =(c: any) => `${c.bank} ${c.cardName}`

const KEYS: { k: string; l: string }[][] = [
  [{ k: '*', l: '×' }, { k: '7', l: '7' }, { k: '8', l: '8' }, { k: '9', l: '9' }],
  [{ k: '/', l: '÷' }, { k: '4', l: '4' }, { k: '5', l: '5' }, { k: '6', l: '6' }],
  [{ k: '-', l: '−' }, { k: '1', l: '1' }, { k: '2', l: '2' }, { k: '3', l: '3' }],
  [{ k: '+', l: '+' }, { k: '.', l: '.' }, { k: '0', l: '0' }, { k: 'back', l: '⌫' }],
]

/** One-tap choice grid (Money Manager style) used on phones in place of a dropdown. */
function TileGrid({ label: aria, value, options, onPick }: { label: string; value: string; options: { v: string; l: string; more?: boolean }[]; onPick: (v: string) => void }) {
  return (
    <div role="radiogroup" aria-label={aria} className="grid min-h-0 flex-1 grid-cols-3 content-start gap-1.5 overflow-y-auto overscroll-contain">
      {options.map((o, i) => (
        <button key={`${o.v}-${i}`} type="button" role="radio" aria-checked={value === o.v} onClick={() => onPick(o.v)}
          className={cn('min-h-11 rounded-xl border px-1 py-1.5 text-center text-[13px] font-medium leading-tight [overflow-wrap:anywhere] outline-none focus-visible:ring-2 focus-visible:ring-ring', value === o.v ? 'border-primary bg-accent text-accent-foreground' : 'border-border text-muted-foreground active:bg-muted')}>
          <span className="line-clamp-2">{o.l}</span>{o.more && <ChevronDown className="mx-auto h-3 w-3 opacity-60" aria-hidden />}
        </button>
      ))}
    </div>
  )
}

/** A form row that looks like a field; tapping it swaps the keypad for that field's choices. */
function PickerField({ label: aria, value, active, onClick }: { label: string; value: string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" aria-label={`${aria}: ${value}. Change`} aria-expanded={active} onClick={onClick}
      className={cn('flex h-10 w-full items-center justify-between rounded-lg border px-3 text-left text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring', active ? 'border-primary bg-accent' : 'border-input bg-background')}>
      <span className="truncate">{value}</span><ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  )
}

function Row({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[5.5rem_1fr] items-center gap-3">
      <span className="text-sm text-muted-foreground">{name}</span>
      <div className="min-w-0">{children}</div>
    </div>
  )
}

/** Money Manager-style entry: tone-coloured amount on a calculator keypad, category tiles, then the details. */
export function TxnEntryDialog({ initialType = 'expense', row, draft, defaultMonth, accountId, onClose }: { initialType?: TxnType; row?: any; draft?: any; defaultMonth: string; accountId?: string; onClose: () => void }) {
  useBackToClose(true, onClose) // Back closes the sheet instead of leaving the page and losing what was typed
  const { data, db } = useWealth()
  const router = useRouter()
  const cats = useCategories()
  const [type, setType] = useState<TxnType>(row ? 'expense' : initialType)
  const seed = row ?? draft
  const todayIso = toISO(new Date())
  const startDate = seed?.date || (defaultMonth === todayIso.slice(0, 7) ? todayIso : `${defaultMonth}-01`)

  const accounts: any[] = data.bankAccounts
  const bankAccs = accounts.filter((a) => a.type !== 'cash')
  const cashAcc = accounts.find((a) => a.type === 'cash')
  const [expr, setExpr] = useState(seed?.amount ? String(seed.amount) : '')
  const [busy, setBusy] = useState(false)
  const [typing, setTyping] = useState(false)
  // count the payment towards the budget of several months (see lib/wealth/spread.js)
  const [spreadN, setSpreadN] = useState<number>(seed?.budgetMonths?.length > 1 ? seed.budgetMonths.length : 1)
  const [spreadFrom, setSpreadFrom] = useState<string>(seed?.budgetMonths?.length > 1 ? seed.budgetMonths[0].ym : '') // '' follows the date
  // the spread must still cover the month of the payment: it can start up to (months - 1) before it, and no later than it
  const startFor = (n: number, dateYm: string) => (spreadFrom && spreadFrom <= dateYm && spreadFrom >= addMonths(dateYm, -(n - 1)) ? spreadFrom : dateYm)
  const [subOf, setSubOf] = useState<string | null>(null) // a parent category whose sub-categories are showing
  const [panel, setPanel] = useState<null | string>(null) // which choice list replaces the keypad (phones)
  const [f, setF] = useState({
    date: startDate, note: seed?.note || '',
    category: seed?.category || cats.expense[0] || 'Other', incomeCategory: cats.income[0] || 'Other',
    mode: seed?.mode || 'upi', cardId: seed?.cardId || data.cards[0]?.id || '', debitCardId: seed?.debitCardId || data.debitCards[0]?.id || '', accountId: seed?.accountId || bankAccs[0]?.id || '',
    receiveId: accountId || accounts[0]?.id || '',
    from: accountId ? `account:${accountId}` : bankAccs[0] ? `account:${bankAccs[0].id}` : cashAcc ? `account:${cashAcc.id}` : '',
    to: (() => { const other = accounts.find((a) => a.id !== accountId); return cashAcc && cashAcc.id !== accountId ? `account:${cashAcc.id}` : other ? `account:${other.id}` : '' })(),
  })
  const set = (k: string) => (e: any) => setF((p) => ({ ...p, [k]: e.target.value }))
  const ruleList = useRules()
  const [pickedByHand, setPickedByHand] = useState(!!row)
  const ruleHit = type === 'transfer' ? null : matchRule(ruleList, f.note, type === 'income' ? 'income' : 'expense')
  useEffect(() => {
    if (!ruleHit || pickedByHand) return
    setF((p) => (type === 'income' ? (p.incomeCategory === ruleHit.category ? p : { ...p, incomeCategory: ruleHit.category }) : (p.category === ruleHit.category ? p : { ...p, category: ruleHit.category })))
  }, [ruleHit, pickedByHand, type])

  const pending = hasOperator(expr)
  const amount = evalAmount(expr) ?? 0
  const debit = data.debitCards.find((d: any) => d.id === f.debitCardId)
  const target = f.mode === 'cash' ? cashAcc : f.mode === 'debit' ? accounts.find((a) => a.id === debit?.accountId) : f.mode === 'card' ? null : accounts.find((a) => a.id === f.accountId)
  const parse = (v: string) => { const [t, ...r] = v.split(':'); return { type: t as 'account' | 'card', id: r.join(':') } }

  // Transfer endpoints. A debit card is a way to reach its linked account, so it resolves to that account.
  // From and To offer the same places; whatever is chosen on one side is left out of the other
  const fromOptions = [
    ...accounts.map((a) => ({ v: `account:${a.id}`, l: `${a.type === 'cash' ? 'Cash' : 'Bank'}: ${label(a)} (${formatINR(a.currentBalance)})` })),
    ...data.debitCards.map((d: any) => ({ v: `account:${d.accountId}`, l: `Debit card: ${cardLabel(d)}` })),
    ...data.cards.map((c: any) => ({ v: `card:${c.id}`, l: `Credit card: ${cardLabel(c)} (cash advance)` })),
  ].filter((o) => o.v !== f.to)
  const toOptions = [
    ...accounts.map((a) => ({ v: `account:${a.id}`, l: `${a.type === 'cash' ? 'Cash' : 'Bank'}: ${label(a)}` })),
    ...data.cards.map((c: any) => ({ v: `card:${c.id}`, l: `Pay credit card: ${cardLabel(c)} (${c.outstanding > 0 ? `due ${formatINR(c.outstanding)}` : 'nothing due'})` })),
  ].filter((o) => o.v !== f.from)

  // AI category suggestion: shown as a hint the user can accept; never changes anything by itself
  const rules = data.meta.find((m: any) => m.key === 'categoryRules')?.value ?? {}
  const suggestion = type === 'expense' ? suggestCategory(f.note, cats.expense, rules) : null
  const dupes = type === 'expense' && amount > 0 ? findDuplicates({ id: row?.id, amount, date: f.date, category: f.category, note: f.note }, data.expenses) : []
  const verb = TYPES.find((t) => t.v === type)!
  const tone = TONE[type]

  // keepOpen = "Continue": save, then clear amount and note but keep date, category and account for the next entry.
  const save = async (keepOpen = false) => {
    if (busy) return
    setBusy(true)
    try {
      if (!(amount > 0)) throw new Error('Enter an amount greater than zero')
      if (!f.date) throw new Error('Choose a date')
      if (f.date > todayIso) throw new Error('Date cannot be in the future')
      if (type === 'expense') {
        if (f.mode === 'card' && !f.cardId) throw new Error('Choose a credit card')
        if (f.mode === 'cash' && !cashAcc) throw new Error('Add a Cash account in Bank Accounts first')
        if (f.mode === 'debit' && !debit) throw new Error('Add a debit card under Cards first')
        if ((f.mode === 'upi' || f.mode === 'bank') && !f.accountId) throw new Error('Choose a bank account')
        const dateYm = f.date.slice(0, 7)
        const budgetMonths = spreadN > 1 ? spreadMonths(amount, startFor(spreadN, dateYm), spreadN) : null
        const rec = { budgetMonths, amount, date: f.date, category: f.category, mode: f.mode, cardId: f.mode === 'card' ? f.cardId : null, debitCardId: f.mode === 'debit' ? f.debitCardId : null, accountId: f.mode === 'cash' ? cashAcc!.id : f.mode === 'debit' ? debit!.accountId : f.mode === 'card' ? null : f.accountId, note: f.note }
        row ? await updateExpense(db, row.id, rec) : await addExpense(db, rec)
        // learn from the category the user finally chose, so the next suggestion matches
        if (f.note.trim()) await db.meta.put({ key: 'categoryRules', value: learnCorrection(rules, f.note, f.category) })
      } else if (type === 'income') {
        if (!f.receiveId) throw new Error('Choose an account')
        await addIncome(db, { accountId: f.receiveId, amount, date: f.date, category: f.incomeCategory, description: f.note })
      } else {
        await addTransfer(db, { from: parse(f.from), to: parse(f.to), amount, date: f.date, note: f.note })
      }
      toast.success(row ? 'Expense updated' : `${verb.l} added`)
      if (keepOpen) { setExpr(''); setF((p) => ({ ...p, note: '' })); setBusy(false); return }
      onClose()
    } catch (err) {
      toastProblem(err, 'Something went wrong')
      setBusy(false)
    }
  }

  // The primary key behaves like a calculator "=" while an operation is pending, then saves.
  const primary = () => {
    if (pending) { const v = evalAmount(expr); if (v === null) return toast.warning('Finish the calculation first'); setExpr(String(v)); return }
    save()
  }

  // Physical keyboard: digits and operators go to the amount unless a field is focused.
  const sheetRef = useRef<HTMLDivElement>(null)
  const keyRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyRef.current = (e) => {
    if (window.innerWidth >= 768) return
    const t = e.target as HTMLElement
    // Ignore keys typed into a field, or into a picker (those render outside this sheet).
    if (t.closest('input, textarea, [role="combobox"]') || !(sheetRef.current?.contains(t) || t === document.body)) return
    if (e.ctrlKey || e.metaKey || e.altKey) return
    if (/^[0-9.+\-*/]$/.test(e.key)) { e.preventDefault(); setExpr((p) => pressKey(p, e.key)) }
    else if (e.key === 'Backspace') { e.preventDefault(); setExpr((p) => pressKey(p, 'back')) }
    else if (e.key === 'Enter' && t.tagName !== 'BUTTON') { e.preventDefault(); primary() }
  }
  useEffect(() => { const h = (e: KeyboardEvent) => keyRef.current(e); window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h) }, [])

  const catList = type === 'income' ? cats.income : cats.expense
  const catValue = type === 'income' ? f.incomeCategory : f.category
  const catKey = type === 'income' ? 'incomeCategory' : 'category'

  // short names for the phone tiles: "HDFC Savings", "HDFC Regalia Gold", "Pay HDFC Regalia Gold"
  const tileName = (v: string, o: { l: string }) => {
    const [kind, ...r] = v.split(':'); const id = r.join(':')
    if (kind === 'card') { const c = data.cards.find((x: any) => x.id === id); return c ? shortBank(c.bank) + ' ' + c.cardName : o.l }
    const a = accounts.find((x: any) => x.id === id); if (a) return shortLabel(a, accounts)
    const d = data.debitCards.find((x: any) => x.accountId === id && o.l.includes(x.cardName)); return d ? shortBank(d.bank) + ' debit' : o.l
  }
  useEffect(() => { if (panel !== 'category') setSubOf(null) }, [panel])
  const field = (k: string) => (v: string) => setF((p) => ({ ...p, [k]: v }))
  const catGroups = groupCategories(catList) as { name: string; children: string[] }[]
  const PANELS: Record<string, { title: string; options: { v: string; l: string; more?: boolean }[]; value: string; pick: (v: string) => void | boolean }> = {
    category: {
      title: subOf ?? 'Category',
      options: subOf ? [{ v: subOf, l: `${subOf} (general)` }, ...(catGroups.find((g) => g.name === subOf)?.children ?? []).map((c) => ({ v: c, l: childOf(c) || c }))] : catGroups.map((g) => ({ v: g.name, l: g.name, more: g.children.length > 0 })),
      value: subOf ? catValue : parentOf(catValue),
      pick: (v) => { if (!subOf && (catGroups.find((g) => g.name === v)?.children.length ?? 0) > 0) { setSubOf(v); return true } setPickedByHand(true); setF((p) => ({ ...p, [catKey]: v })) },
    },
    account: { title: 'Account', options: bankAccs.map((a) => ({ v: a.id, l: shortLabel(a, accounts) })), value: f.accountId, pick: field('accountId') },
    mode: { title: 'Paid via', options: PAYMENT_MODES.map((m) => ({ v: m.value, l: m.label })), value: f.mode, pick: field('mode') },
    card: { title: 'Credit card', options: data.cards.map((c: any) => ({ v: c.id, l: cardLabel(c) })), value: f.cardId, pick: field('cardId') },
    debitCard: { title: 'Debit card', options: data.debitCards.map((d: any) => ({ v: d.id, l: cardLabel(d) })), value: f.debitCardId, pick: field('debitCardId') },
    receive: { title: 'Into', options: accounts.map((a) => ({ v: a.id, l: shortLabel(a, accounts) })), value: f.receiveId, pick: field('receiveId') },
    // a debit card reaches the same account as its bank account, so it is one tile, not two
    from: { title: 'From', options: fromOptions.filter((o, i, all) => all.findIndex((x) => x.v === o.v) === i).map((o) => ({ v: o.v, l: tileName(o.v, o) })), value: f.from, pick: field('from') },
    to: { title: 'To', options: toOptions.map((o) => ({ v: o.v, l: tileName(o.v, o) })), value: f.to, pick: field('to') },
  }
  const labelOf = (id: string) => {
    if (id === 'category') return catValue.split(SEP).join(' › ')
    const d = PANELS[id]; return d.options.find((o) => o.v === d.value)?.l ?? ''
  }
  const fieldBtn = (id: string, name: string) => <div className="md:hidden"><Row name={name}><PickerField label={name} value={labelOf(id) || 'Choose'} active={panel === id} onClick={() => setPanel(panel === id ? null : id)} /></Row></div>

  return (
    <DialogPrimitive.Root open onOpenChange={(o) => !o && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-foreground/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          ref={sheetRef}
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => e.preventDefault()}
          className="fixed z-50 flex flex-col overflow-hidden bg-background text-foreground outline-none max-sm:inset-0 sm:inset-0 sm:m-auto sm:h-[min(46rem,94dvh)] sm:w-[26rem] md:h-auto md:max-h-[92dvh] md:w-[34rem] sm:rounded-3xl sm:border sm:border-border sm:shadow-elevated data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 max-sm:data-[state=open]:slide-in-from-bottom-8"
        >
          <DialogPrimitive.Title className="sr-only">{row ? 'Edit expense' : 'Add transaction'}</DialogPrimitive.Title>

          {/* Header: close + type switch */}
          <header className="flex shrink-0 items-center gap-2 px-3 pb-1 pt-[max(0.75rem,env(safe-area-inset-top))]">
            <DialogPrimitive.Close className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Close"><X className="h-5 w-5" /></DialogPrimitive.Close>
            {row ? (
              <p className="flex-1 text-center text-sm font-semibold">Edit expense</p>
            ) : (
              <div role="tablist" aria-label="Transaction type" className="flex flex-1 justify-center gap-1 md:rounded-xl md:bg-muted md:p-1">
                {TYPES.map((t) => (
                  <button key={t.v} type="button" role="tab" aria-selected={type === t.v} onClick={() => setType(t.v)}
                    className={cn('relative rounded-full px-3.5 py-1.5 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring md:flex-1 md:rounded-lg md:border-transparent', type === t.v ? cn(TONE[t.v].ring, 'border md:bg-card md:shadow-card') : 'border border-transparent text-muted-foreground hover:text-foreground')}>
                    {t.l}
                  </button>
                ))}
              </div>
            )}
            <span className="w-9" aria-hidden />
          </header>

          {/* Amount */}
          <section className="hidden shrink-0 border-t border-border px-5 pt-4 md:block">
            <label htmlFor="txn-amount" className="text-sm font-medium">Amount</label>
            <div className="relative mt-1.5"><span className={cn('pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-lg font-medium', tone.text)}>₹</span>
              <input id="txn-amount" inputMode="decimal" autoComplete="off" placeholder="0" value={expr} onChange={(e) => { const v = e.target.value.replace(/[^0-9.]/g, ''); const i = v.indexOf('.'); setExpr(i < 0 ? v : v.slice(0, i + 1) + v.slice(i + 1).replace(/[^0-9]/g, '').slice(0, 2)) }} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); save() } }}
                className={cn('h-12 w-full rounded-xl border border-input bg-background pl-8 pr-3 text-2xl font-semibold tabular-nums outline-none placeholder:text-muted-foreground/50 focus-visible:ring-2 focus-visible:ring-ring/40', tone.text)} /></div>
          </section>
          <section className="shrink-0 px-6 pb-3 pt-2 text-center md:hidden">
            <p className="text-xs font-medium tracking-[0.14em] text-muted-foreground">{verb.verb}</p>
            <p role="button" tabIndex={0} aria-label="Amount, show keypad" onClick={() => { setPanel(null); (document.activeElement as HTMLElement | null)?.blur() }} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPanel(null) } }} className={cn('mt-1 flex cursor-pointer items-baseline justify-center gap-1 tabular-nums outline-none focus-visible:ring-2 focus-visible:ring-ring', tone.text)}>
              <span className="text-2xl font-medium opacity-70">₹</span>
              <span className={cn('font-semibold tracking-tight', (expr.length > 11 ? 'text-3xl' : expr.length > 8 ? 'text-4xl' : 'text-5xl'), !expr && 'opacity-30')}>{expr ? displayExpr(expr) : '0'}</span>
            </p>
            <p className="mt-1 h-5 text-sm text-muted-foreground tabular-nums">{pending ? (evalAmount(expr) !== null ? `= ${formatINR(amount)}` : '') : ''}</p>
          </section>

          {/* Details */}
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain border-t border-border px-5 py-4 md:border-t-0">
            {type !== 'transfer' && (
              <>
              <div className="md:hidden"><Row name="Category"><PickerField label="Category" value={catValue.split(SEP).join(' › ')} active={panel === 'category'} onClick={() => setPanel(panel === 'category' ? null : 'category')} /></Row></div>
              <div className="hidden md:block"><Row name="Category"><Select aria-label="Category" value={catValue} onChange={(e) => { setPickedByHand(true); setF((p) => ({ ...p, [catKey]: e.target.value })) }}>{catList.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Row></div>
              <button type="button" onClick={() => { onClose(); router.push('/dashboard/settings?tab=budget') }} className="-mt-1 inline-flex items-center gap-1 self-start rounded text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"><Tags className="h-3.5 w-3.5" />Categories are set up in Settings</button>
              </>
            )}
            {type === 'expense' && suggestion && suggestion.category !== f.category && (
              <p className="flex flex-wrap items-center gap-2 rounded-xl bg-muted px-3 py-2 text-xs">
                Looks like <strong>{suggestion.category}</strong> for {suggestion.merchant}{suggestion.subscription ? ' (a subscription)' : ''}.
                <button type="button" className="rounded-full border border-border bg-card px-2.5 py-0.5 font-medium hover:bg-muted" onClick={() => setF((p) => ({ ...p, category: suggestion.category }))}>Use it</button>
              </p>
            )}

            <div className="space-y-3">
              <Row name="Date"><DateInput aria-label="Date" required max={todayIso} value={f.date} onChange={set('date')} /></Row>

              {type === 'expense' && <div className="hidden md:block"><Row name="Paid via"><Select aria-label="Paid via" value={f.mode} onChange={set('mode')}>{PAYMENT_MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</Select></Row></div>}
              {type === 'expense' && <>
                {f.mode === 'card' && <>{fieldBtn('card', 'Card')}<div className="hidden md:block"><Row name="Card"><Select aria-label="Credit card" value={f.cardId} onChange={set('cardId')}>{data.cards.length === 0 && <option value="">No credit cards</option>}{data.cards.map((c: any) => <option key={c.id} value={c.id}>{cardLabel(c)}</option>)}</Select></Row></div></>}
                {f.mode === 'debit' && <>{fieldBtn('debitCard', 'Card')}<div className="hidden md:block"><Row name="Card"><Select aria-label="Debit card" value={f.debitCardId} onChange={set('debitCardId')}>{data.debitCards.length === 0 && <option value="">No debit cards</option>}{data.debitCards.map((d: any) => <option key={d.id} value={d.id}>{cardLabel(d)}</option>)}</Select></Row></div></>}
                {(f.mode === 'upi' || f.mode === 'bank') && bankAccs.length > 1 && <div className="md:hidden"><Row name="Account"><PickerField label="Account" value={shortLabel(bankAccs.find((a) => a.id === f.accountId) || bankAccs[0], accounts)} active={panel === 'account'} onClick={() => setPanel(panel === 'account' ? null : 'account')} /></Row></div>}
                {(f.mode === 'upi' || f.mode === 'bank') && <div className={bankAccs.length > 1 ? 'hidden md:block' : ''}><Row name="Account"><Select aria-label="From account" value={f.accountId} onChange={set('accountId')}>{bankAccs.length === 0 && <option value="">No bank accounts</option>}{bankAccs.map((a) => <option key={a.id} value={a.id}>{label(a)} ({formatINR(a.currentBalance)})</option>)}</Select></Row></div>}
              </>}

              {type === 'income' && <>{fieldBtn('receive', 'Into')}<div className="hidden md:block"><Row name="Into"><Select aria-label="Received in" required value={f.receiveId} onChange={set('receiveId')}>{accounts.length === 0 && <option value="">No accounts</option>}{accounts.map((a) => <option key={a.id} value={a.id}>{a.type === 'cash' ? 'Cash' : 'Bank'}: {label(a)}</option>)}</Select></Row></div></>}

              {type === 'transfer' && <>
                {fieldBtn('from', 'From')}<div className="hidden md:block"><Row name="From"><Select aria-label="From" value={f.from} onChange={set('from')}>{fromOptions.length === 0 && <option value="">Nothing to transfer from</option>}{fromOptions.map((o, i) => <option key={`${o.v}-${i}`} value={o.v}>{o.l}</option>)}</Select></Row></div>
                <div className="flex items-center gap-3 pl-[6.5rem] text-muted-foreground"><ArrowRight className="h-4 w-4 rotate-90" /></div>
                {fieldBtn('to', 'To')}<div className="hidden md:block"><Row name="To"><Select aria-label="To" value={f.to} onChange={set('to')}>{toOptions.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</Select></Row></div>
              </>}

              <Row name="Note">
                <input value={f.note} onChange={set('note')} onFocus={() => setTyping(true)} onBlur={() => setTyping(false)} enterKeyHint="done" aria-label="Note"
                  placeholder={type === 'transfer' ? 'e.g. ATM withdrawal' : type === 'expense' ? 'e.g. Swiggy' : 'Optional'}
                  className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring/40" />
              </Row>
              {type === 'expense' && (() => {
                const dateYm = f.date.slice(0, 7), start = startFor(spreadN, dateYm)
                const parts = spreadN > 1 && amount > 0 ? spreadMonths(amount, start, spreadN) : []
                return (
                  <>
                    <Row name="Budget"><Select aria-label="Count in the budget over" value={String(spreadN)} onChange={(e) => setSpreadN(Number(e.target.value))}>{[1, 2, 3, 4, 6, 12].map((n) => <option key={n} value={n}>{n === 1 ? 'This month only' : `Spread over ${n} months`}</option>)}</Select></Row>
                    {spreadN > 1 && <Row name="Starting"><Select aria-label="First month of the spread" value={start} onChange={(e) => setSpreadFrom(e.target.value)}>{Array.from({ length: spreadN }, (_, i) => addMonths(dateYm, i - (spreadN - 1))).map((m) => <option key={m} value={m}>{monthLabel(m)}</option>)}</Select></Row>}
                    {parts.length > 1 && <p className="text-xs text-muted-foreground">{parts.map((x) => `${monthLabel(x.ym)} ${formatINR(x.amount)}`).join(', ')}. The payment itself still leaves your account on {formatDate(f.date)}.</p>}
                  </>
                )
              })()}
              {ruleHit && !pickedByHand && <p className="text-xs text-muted-foreground">Rule: description contains <strong className="text-foreground">{ruleHit.contains}</strong>, so the category is <strong className="text-foreground">{ruleHit.category}</strong>. Pick another to override.</p>}
            </div>

            {type === 'expense' && (f.mode === 'card' || target || f.mode === 'cash') && (
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>{f.mode === 'card' ? 'Added to card dues' : target ? `Paid from ${label(target)}` : 'No cash account yet'}</span>
                <InfoTip label="Account details">{f.mode === 'card' ? 'Adds to the credit card outstanding. Paying the card bill later is a transfer, not another expense.' : target ? `Balance ${formatINR(target.currentBalance)}, available ${formatINR(availableBalance(target))}.` : 'Add a cash account in Bank Accounts.'}</InfoTip>
              </div>
            )}
            {type === 'expense' && target && target.mab && target.currentBalance - amount < target.mab && <p role="status" className="text-xs text-warning">This takes the account below its {formatINR(target.mab)} minimum balance; the bank may charge a penalty.</p>}
            {type === 'transfer' && <FootNote>Moves money between your own accounts. Withdrawing cash is Bank → Cash; paying a card bill is → Pay credit card. Transfers never count as income or spending.</FootNote>}
            {dupes.length > 0 && <p role="status" className="rounded-xl border border-warning/40 bg-warning/10 px-3 py-2 text-xs">Possible duplicate: you already have a {formatINR(dupes[0].amount)} {dupes[0].category} expense on {dupes[0].date}. Save only if this is a separate payment.</p>}
          </div>

          {/* Keypad */}
          <footer className="shrink-0 border-t border-border bg-card px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2">
            {!typing && type === 'expense' && (
              <div className="flex items-center justify-between gap-3 px-2 pb-2 md:hidden">
                <span className="text-sm text-muted-foreground">Paid via</span>
                <button type="button" aria-expanded={panel === 'mode'} onClick={() => setPanel(panel === 'mode' ? null : 'mode')} className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring">{labelOf('mode')}<ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden /></button>
              </div>
            )}
            {!typing && panel && PANELS[panel] && (
              <div className="flex h-[16.625rem] flex-col md:hidden [@media(max-height:720px)]:h-[14.625rem]">
                {/* the Paid via row above already names this list, so it gets no second heading */}
                {panel !== 'mode' && <div className="flex shrink-0 items-center px-1 pb-1"><span className="flex items-center gap-1 text-sm font-medium">{panel === 'category' && subOf && <button type="button" onClick={() => setSubOf(null)} aria-label="Back to all categories" className="-ml-1 rounded-full p-1 text-muted-foreground hover:bg-muted"><ChevronLeft className="h-4 w-4" /></button>}{PANELS[panel].title}</span></div>}
                <TileGrid label={PANELS[panel].title} value="" options={PANELS[panel].options} onPick={(v) => { if (PANELS[panel].pick(v) !== true) setPanel(null) }} />
              </div>
            )}
            {!typing && !(panel && PANELS[panel]) && (
              <div className="grid grid-cols-4 gap-1.5 md:hidden">
                {KEYS.flat().map(({ k, l }) => {
                  const op = ['/', '*', '-', '+'].includes(k)
                  return (
                    <button key={k} type="button" onClick={() => setExpr((p) => pressKey(p, k))} onDoubleClick={k === 'back' ? () => setExpr('') : undefined}
                      aria-label={k === 'back' ? 'Backspace' : k === '/' ? 'Divide' : k === '*' ? 'Multiply' : k === '-' ? 'Subtract' : k === '+' ? 'Add' : k === '.' ? 'Decimal point' : l}
                      className={cn('flex h-12 items-center justify-center rounded-full bg-muted/70 text-xl [@media(max-height:720px)]:h-10 [@media(max-height:720px)]:text-lg tabular-nums outline-none transition-colors active:scale-95 active:bg-muted focus-visible:ring-2 focus-visible:ring-ring hover:bg-muted', op ? cn('font-medium', tone.text) : 'font-medium')}>
                      {k === 'back' ? <Delete className="h-5 w-5" /> : l}
                    </button>
                  )
                })}
              </div>
            )}
            <div className={cn('mt-2 flex gap-2', !typing && panel && PANELS[panel] && 'max-md:hidden')}>
                          <button type="button" onClick={typing ? () => { (document.activeElement as HTMLElement | null)?.blur(); save(false) } : primary} disabled={busy}
              className={cn('flex h-12 min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl text-base font-semibold outline-none transition-opacity focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60', tone.bg)}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending && !typing ? `Calculate = ${evalAmount(expr) !== null ? formatINR(amount) : ''}` : row ? 'Save changes' : 'Done'}
            </button>
            </div>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
