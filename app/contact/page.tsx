import type { Metadata } from 'next'
import { Mail } from 'lucide-react'
import { LegalPage } from '@/components/landing/LegalPage'

export const metadata: Metadata = { title: 'Contact' }

// The address is set by whoever deploys the app (NEXT_PUBLIC_CONTACT_EMAIL). Until then the page says so instead of showing a made-up one.
const EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL

export default function ContactPage() {
  return (
    <LegalPage title="Contact">
      <p>For questions about the app, a problem you ran into, or a request about your data, write to us.</p>
      {EMAIL ? (
        <p><a className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-4 py-2.5 font-medium text-foreground hover:bg-muted" href={`mailto:${EMAIL}`}><Mail className="h-4 w-4" aria-hidden />{EMAIL}</a></p>
      ) : (
        <p className="rounded-lg border border-border bg-card px-4 py-3">A contact address has not been set up for this copy of the app yet. The person who runs it can add one by setting <strong>NEXT_PUBLIC_CONTACT_EMAIL</strong>.</p>
      )}
      <h2>Before you write</h2>
      <ul>
        <li>Your records live on your own device, so we cannot see or recover them for you. Use the export in Settings to keep a backup.</li>
        <li>Never send passwords, one-time codes or full account numbers by email.</li>
      </ul>
    </LegalPage>
  )
}
