'use client'

import { Suspense, useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { openEmergencyBundle } from '@/lib/vault/crypto'
import { STATE_LABELS } from '@/lib/legacy/stateMachine'

const call = (body: object) => axios.post('/api/legacy-access', body)
const msg = (e: unknown, d: string) => (axios.isAxiosError(e) && e.response?.data?.error ? String(e.response.data.error) : d)

function Access() {
  const token = useSearchParams().get('token') || ''
  const [info, setInfo] = useState<any>(null)
  const [err, setErr] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState<null | { devCode?: string; smsSent: boolean }>(null)
  const [result, setResult] = useState<any>(null)
  const [eak, setEak] = useState('')
  const [items, setItems] = useState<any[] | null>(null)

  useEffect(() => { if (token) call({ action: 'info', token }).then((r) => setInfo(r.data)).catch((e) => setErr(msg(e, 'This link is invalid.'))) }, [token])

  const sendCode = async () => { setErr(''); try { const r = await call({ action: 'send-code', token }); setSent(r.data) } catch (e) { setErr(msg(e, 'Could not send a code')) } }
  const verify = async () => { setErr(''); try { const r = await call({ action: 'verify', token, code }); setResult(r.data) } catch (e) { setErr(msg(e, 'Verification failed')) } }
  const openVault = async () => { setErr(''); try { setItems(await openEmergencyBundle(result.vaultBundle, eak)) } catch { setErr('That Emergency Access Key is not correct.') } }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-10 text-foreground">
      <div className="surface-card w-full max-w-xl space-y-4 p-6">
        <h1 className="text-xl font-semibold">Digital Legacy: trusted contact</h1>
        {err && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">{err}</p>}
        {!token && <p className="text-sm">This link is incomplete.</p>}
        {info && !result && (
          <>
            <p className="text-sm"><strong>{info.contactName}</strong>, {info.ownerName} named you as a trusted contact. {info.accepted ? `Current stage: ${STATE_LABELS[info.state as keyof typeof STATE_LABELS] ?? info.state}.` : 'Verify your identity to accept.'}</p>
            <p className="text-xs text-muted-foreground">Inactivity is not confirmation of death or incapacity. Access to information is only possible after the owner&apos;s confirmation checks and waiting period complete, and after you verify with a one-time code.</p>
            {!sent ? <Button onClick={sendCode}>Send me a verification code</Button> : (
              <div className="space-y-3">
                <p className="text-sm">We sent a 6-digit code to your email{sent.smsSent ? ' and phone' : ''}.</p>
                {sent.devCode && <p className="rounded bg-muted px-3 py-2 text-xs">Development only (no email provider configured): code {sent.devCode}</p>}
                <div className="flex gap-2"><Input aria-label="Verification code" inputMode="numeric" maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} placeholder="123456" autoComplete="one-time-code" /><Button onClick={verify} disabled={code.length !== 6}>Verify</Button></div>
              </div>
            )}
          </>
        )}
        {result && !result.released && <p className="text-sm">You are verified and have accepted. Nothing is available to you now. If the plan&apos;s checks complete you will be notified by email, and you&apos;ll need to verify again before anything is shown.</p>}
        {result?.released && (
          <div className="space-y-4">
            <p className="text-sm">Information {result.ownerName} prepared for you:</p>
            {result.package.notes && <p className="whitespace-pre-wrap rounded-lg bg-muted p-3 text-sm">{result.package.notes}</p>}
            {result.package.snapshot && (
              <dl className="grid gap-2 text-sm sm:grid-cols-3">
                {result.package.include?.netWorth && <><div><dt className="text-xs text-muted-foreground">Net worth</dt><dd>₹{Number(result.package.snapshot.netWorth).toLocaleString('en-IN')}</dd></div></>}
              </dl>
            )}
            {result.package.include?.accounts && result.package.snapshot?.banks?.length > 0 && <div><h2 className="text-sm font-semibold">Bank accounts</h2><ul className="text-sm">{result.package.snapshot.banks.map((b: any, i: number) => <li key={i}>{b.bank} {b.nickname ? `(${b.nickname})` : ''} · {b.accountNumber}</li>)}</ul></div>}
            {result.package.include?.insurance && result.package.snapshot?.policies?.length > 0 && <div><h2 className="text-sm font-semibold">Insurance policies</h2><ul className="text-sm">{result.package.snapshot.policies.map((p: any, i: number) => <li key={i}>{p.company} · {p.name} · {p.number}{p.nominee ? ` · nominee ${p.nominee}` : ''}</li>)}</ul></div>}
            {result.vaultBundle ? (
              <div className="space-y-2 border-t border-border pt-4"><h2 className="text-sm font-semibold">Authorised vault items ({result.vaultBundle.itemCount})</h2>
                {!items ? <div className="flex gap-2"><Input aria-label="Emergency Access Key" value={eak} onChange={(e) => setEak(e.target.value)} placeholder="Emergency Access Key" autoComplete="off" /><Button onClick={openVault} disabled={!eak}>Decrypt</Button></div> : (
                  <ul className="space-y-2">{items.map((i, n) => <li key={n} className="rounded-lg border border-border p-3 text-sm"><p className="font-medium">{i.name}</p>{i.url && <p className="text-xs text-muted-foreground">{i.url}</p>}{i.username && <p>User: {i.username}</p>}{i.password && <p className="font-mono">Password: {i.password}</p>}{i.notes && <p className="whitespace-pre-wrap text-muted-foreground">{i.notes}</p>}</li>)}</ul>)}
                <p className="text-xs text-muted-foreground">Decrypted only in this browser. Every access is logged for the owner&apos;s records.</p></div>
            ) : <p className="text-xs text-muted-foreground">No vault items were authorised for you.</p>}
          </div>
        )}
      </div>
    </div>
  )
}

export default function Page() {
  return <Suspense fallback={null}><Access /></Suspense>
}
