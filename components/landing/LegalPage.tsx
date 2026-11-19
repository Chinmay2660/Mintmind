import Link from 'next/link'
import { ArrowLeft, Wallet } from 'lucide-react'
import type { ReactNode } from 'react'

/** Shared frame for the plain text pages (terms, contact): a small header, a readable column and a way back. */
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold" aria-label="Mintmind home"><span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground"><Wallet className="h-4 w-4" /></span>Mintmind</Link>
          <Link href="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Back</Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        {updated && <p className="mt-1 text-xs text-muted-foreground">Last updated {updated}</p>}
        <div className="mt-6 space-y-5 text-sm leading-relaxed text-muted-foreground [&_h2]:mt-8 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:ml-4 [&_li]:list-disc [&_strong]:text-foreground">{children}</div>
      </main>
    </div>
  )
}
