import { usePrivacyMode } from '@/contexts/PrivacyContext'
import { redirect } from 'next/navigation'

/** Documents and Digital Legacy now live inside the Vault. This keeps old links and bookmarks working. */
export default function Page() {
  usePrivacyMode() // draws amounts again when balances are hidden or shown
  redirect('/dashboard/vault?tab=documents')
}
