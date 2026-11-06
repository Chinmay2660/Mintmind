'use client'

import { Download, Eye, FileImage, FileText, MoreVertical, Pencil, RefreshCw, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/wealth/format'

export interface DocumentCardProps {
  doc: { id: string; name: string; category: string; size?: number; uploaded?: string; mimeType?: string; notes?: string }
  sizeLabel: string
  replaceDisabled?: boolean
  onPreview: () => void
  onDownload: () => void
  onReplace: () => void
  onEdit: () => void
  onDelete: () => void
}

/** One document: identity and meta on top, the two everyday actions at the bottom, the rest in a menu. */
export function DocumentCard({ doc, sizeLabel, replaceDisabled, onPreview, onDownload, onReplace, onEdit, onDelete }: DocumentCardProps) {
  const Icon = doc.mimeType?.startsWith('image/') ? FileImage : FileText
  return (
    <div className="surface-card flex min-w-0 flex-col p-4 transition-colors hover:border-primary/40 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight" title={doc.name}>{doc.name}</p>
          <p className="mt-1 truncate text-xs text-muted-foreground">{sizeLabel}{doc.uploaded ? ` · ${formatDate(doc.uploaded.slice(0, 10))}` : ''}</p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="-mr-2 -mt-1 h-8 w-8 shrink-0" aria-label={`More actions for ${doc.name}`}><MoreVertical className="h-4 w-4" /></Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onEdit} className="cursor-pointer"><Pencil className="mr-2 h-4 w-4" />Edit details</DropdownMenuItem>
            <DropdownMenuItem onClick={onReplace} disabled={replaceDisabled} className="cursor-pointer"><RefreshCw className="mr-2 h-4 w-4" />Replace file</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">{doc.category}</span>
      </div>
      {doc.notes ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{doc.notes}</p> : <div className="flex-1" />}

      <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
        <Button size="sm" onClick={onPreview}><Eye className="mr-1.5 h-4 w-4" />Preview</Button>
        <Button size="sm" variant="outline" onClick={onDownload}><Download className="mr-1.5 h-4 w-4" />Download</Button>
      </div>
    </div>
  )
}
