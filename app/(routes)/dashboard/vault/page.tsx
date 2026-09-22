'use client'

import Link from 'next/link'
import { FileText, Lock, Shield, Upload } from 'lucide-react'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useApiList } from '@/lib/hooks/useApiList'
import { withFromHome } from '@/lib/utils/navigation'

export default function VaultPage() {
  const { data: passwords, loading: passwordsLoading } = useApiList('/api/passwords')
  const { data: documents, loading: documentsLoading } = useApiList('/api/documents')

  const identityDocs = documents.filter((d) => d.category === 'identity')
  const policyDocs = documents.filter((d) => d.category === 'insurance')

  return (
    <div className="space-y-6">
      <PageHeader
        title="Secure Vault"
        subtitle="Passwords and identity documents in one protected place"
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
                <Lock className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">Passwords</h2>
                <p className="text-sm text-muted-foreground">Banking, investment, and app logins</p>
              </div>
            </div>
            <Badge variant="outline">{passwordsLoading ? '—' : passwords.length}</Badge>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={withFromHome('/dashboard/passwords')} className="mm-pill mm-pill-active">
              Manage passwords
            </Link>
            <Link href={withFromHome('/dashboard/passwords/new')} className="mm-pill">
              Add entry
            </Link>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-success/10">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <h2 className="font-semibold">Documents</h2>
                <p className="text-sm text-muted-foreground">Aadhar, PAN, policies, and certificates</p>
              </div>
            </div>
            <Badge variant="outline">{documentsLoading ? '—' : documents.length}</Badge>
          </div>
          <div className="mt-4 space-y-1 text-sm text-muted-foreground">
            <p>Identity: {documentsLoading ? '—' : identityDocs.length}</p>
            <p>Insurance: {documentsLoading ? '—' : policyDocs.length}</p>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link href={withFromHome('/dashboard/documents')} className="mm-pill mm-pill-active">
              Manage documents
            </Link>
            <Link href={withFromHome('/dashboard/documents/new')} className="mm-pill">
              Upload file
            </Link>
          </div>
        </Card>
      </div>

      <Card className="p-6">
        <div className="flex items-start gap-3">
          <Shield className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">Vault security</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Passwords are encrypted at rest. Documents are stored privately and only accessible to you
              until you release the vault to your nominee.
            </p>
            <Link
              href={withFromHome('/dashboard/nominee')}
              className="mt-3 inline-flex items-center text-sm font-medium text-primary hover:underline"
            >
              Configure nominee access →
            </Link>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3">
          <Upload className="h-5 w-5 text-muted-foreground" />
          <div>
            <h3 className="font-medium">Quick upload</h3>
            <p className="text-sm text-muted-foreground">
              Upload Aadhar, PAN, insurance policies, and loan documents with file attachments.
            </p>
          </div>
        </div>
        <Link
          href={withFromHome('/dashboard/documents/new')}
          className="mt-4 inline-flex items-center text-sm font-medium text-primary hover:underline"
        >
          Upload a document →
        </Link>
      </Card>
    </div>
  )
}
