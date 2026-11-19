'use client'

import { useEffect, useState } from 'react'
import { Copy, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface InviteInfo { memberId: string; name: string; otp: string; link: string; expiresAt: string; /** the demo account has no server, so its code is only a sample */ demo?: boolean }

/** A sample code and link for the demo account. They look and count down like real ones but cannot be redeemed. */
export function demoInvite(memberId: string, name: string): InviteInfo {
  const n = new Uint32Array(1); crypto.getRandomValues(n)
  const t = new Uint8Array(12); crypto.getRandomValues(t)
  return { memberId, name, demo: true, otp: String(n[0] % 1000000).padStart(6, '0'), link: `${window.location.origin}/family/accept?token=demo-${Array.from(t, (b) => b.toString(16).padStart(2, '0')).join('')}`, expiresAt: new Date(Date.now() + 120000).toISOString() }
}

const clock = (ms: number) => `${Math.floor(ms / 60000)}:${String(Math.floor((ms % 60000) / 1000)).padStart(2, '0')}`

/** The code and the link for a pending invitation, with the time left. Both stop working after two minutes. */
export function InviteReady({ info, onClose, onRefresh }: { info: InviteInfo; onClose: () => void; onRefresh: () => Promise<void> }) {
  const [left, setLeft] = useState(() => Math.max(0, new Date(info.expiresAt).getTime() - Date.now()))
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const end = new Date(info.expiresAt).getTime()
    const tick = () => setLeft(Math.max(0, end - Date.now()))
    const t = setInterval(tick, 500)
    return () => clearInterval(t)
  }, [info.expiresAt])
  const expired = left <= 0
  const copy = (text: string, what: string) => { navigator.clipboard?.writeText(text).then(() => toast.success(`${what} copied`), () => toast.error('Could not copy')) }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invitation for {info.name}</DialogTitle>
          <DialogDescription>Give them the code to type in the app, or send the link. They need to be signed in to Mintmind. Either works for 2 minutes, and anyone who has it can join in that time, so share it only with them.</DialogDescription>
        </DialogHeader>

        {info.demo && <p role="note" className="rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-xs">Demo account: this is a sample code and link. They count down like real ones, but they cannot be used to join, because the demo has no server.</p>}
        <div className="rounded-xl border border-border p-4 text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">Code</p>
          <p className={`mt-1 text-4xl font-bold tabular-nums tracking-[0.2em] ${expired ? 'text-muted-foreground line-through' : ''}`} aria-label={`Code ${info.otp.split('').join(' ')}`}>{info.otp.slice(0, 3)} {info.otp.slice(3)}</p>
          <p className={`mt-2 text-sm tabular-nums ${expired ? 'font-semibold text-destructive' : 'text-muted-foreground'}`} role="timer" aria-live="off">{expired ? 'Expired' : `Valid for ${clock(left)}`}</p>
        </div>

        <div>
          <label htmlFor="invite-link" className="text-xs text-muted-foreground">Link</label>
          <div className="mt-1 flex gap-2">
            <Input id="invite-link" readOnly value={info.link} className={expired ? 'text-muted-foreground line-through' : ''} onFocus={(e) => e.currentTarget.select()} />
            <Button type="button" variant="outline" size="icon" aria-label="Copy link" disabled={expired} onClick={() => copy(info.link, 'Link')}><Copy className="h-4 w-4" /></Button>
          </div>
        </div>

        <div className="flex flex-wrap justify-between gap-2">
          <Button type="button" variant="outline" disabled={expired} onClick={() => copy(info.otp, 'Code')}><Copy className="mr-1.5 h-4 w-4" />Copy code</Button>
          <Button type="button" variant={expired ? 'default' : 'outline'} disabled={busy} onClick={async () => { setBusy(true); try { await onRefresh() } finally { setBusy(false) } }}><RefreshCw className="mr-1.5 h-4 w-4" />New code and link</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** For the person invited: type the six digit code. */
export function JoinWithCode({ onJoin }: { onJoin: (otp: string) => Promise<boolean> }) {
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const digits = code.replace(/\D/g, '').slice(0, 6)
  return (
    <form className="mt-4 border-t border-border pt-4" onSubmit={async (e) => { e.preventDefault(); if (digits.length !== 6) return; setBusy(true); try { if (await onJoin(digits)) setCode('') } finally { setBusy(false) } }}>
      <label htmlFor="join-code" className="text-sm font-medium">Got an invitation code?</label>
      <p className="text-xs text-muted-foreground">Type the 6 digits you were given. A code works for 2 minutes.</p>
      <div className="mt-2 flex gap-2">
        <Input id="join-code" inputMode="numeric" autoComplete="one-time-code" pattern="\d{6}" maxLength={7} placeholder="123 456" value={digits.length > 3 ? `${digits.slice(0, 3)} ${digits.slice(3)}` : digits} onChange={(e) => setCode(e.target.value)} className="tracking-[0.2em]" />
        <Button type="submit" disabled={busy || digits.length !== 6}>{busy ? 'Joining…' : 'Join'}</Button>
      </div>
    </form>
  )
}
