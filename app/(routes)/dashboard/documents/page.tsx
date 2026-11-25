import { redirect } from 'next/navigation'

/** Documents and Digital Legacy now live inside the Vault. This keeps old links and bookmarks working. */
export default function Page() {
  redirect('/dashboard/vault?tab=documents')
}
