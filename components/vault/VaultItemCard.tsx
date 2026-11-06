'use client'

import { Copy, Eye, EyeOff, ExternalLink, KeyRound, MoreVertical, Pencil, ShieldCheck, Star, StickyNote, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { formatDate } from '@/lib/wealth/format'
import { cn } from '@/lib/utils'

export interface VaultItemView {
  id: string; type: 'login' | 'note'; name: string; url: string; username: string; password: string
  authMethod?: string; authPhone?: string; authNote?: string
  category: string; notes: string; member: string; favourite: boolean; updatedAt: string
}

/** A field row: label, value, and its own small actions. Keeps every item's secrets in the same place. */
function Row({ label, children, actions }: { label: string; children: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-lg bg-muted/50 px-3 py-1.5">
      <div className="min-w-0 flex-1"><p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p><div className="truncate text-sm">{children}</div></div>
      {actions && <div className="flex shrink-0 items-center">{actions}</div>}
    </div>
  )
}
const IconBtn = ({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) => (
  <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={label} onClick={onClick}>{children}</Button>
)

export function VaultItemCard({ item: i, revealed, onReveal, onCopy, onFavourite, onEdit, onDelete }: {
  item: VaultItemView; revealed: boolean; onReveal: () => void; onCopy: (text: string, what: string) => void
  onFavourite: () => void; onEdit: () => void; onDelete: () => void
}) {
  const Icon = i.type === 'note' ? StickyNote : KeyRound
  const safeUrl = /^https?:\/\//.test(i.url) ? i.url : undefined
  const hasAuth = i.authMethod && i.authMethod !== 'None'
  return (
    <li className="surface-card flex min-w-0 flex-col p-4 transition-colors hover:border-primary/40 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold leading-tight" title={i.name}>{i.name}</p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{i.category}</span>
            {i.member && <span className="text-xs text-muted-foreground">{i.member}</span>}
          </div>
        </div>
        <div className="-mr-2 -mt-1 flex shrink-0 items-center">
          <Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={i.favourite ? 'Remove favourite' : 'Mark favourite'} aria-pressed={i.favourite} onClick={onFavourite}><Star className={cn('h-4 w-4', i.favourite && 'fill-warning text-warning')} /></Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button type="button" size="icon" variant="ghost" className="h-8 w-8" aria-label={`More actions for ${i.name}`}><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onClick={onEdit} className="cursor-pointer"><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive focus:text-destructive"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {i.type === 'login' ? (
          <>
            {i.url && <Row label="Website" actions={safeUrl && <a href={safeUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${i.name}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground"><ExternalLink className="h-4 w-4" /></a>}><span className="text-primary">{i.url.replace(/^https?:\/\//, '')}</span></Row>}
            <Row label="Username" actions={i.username && <IconBtn label="Copy username" onClick={() => onCopy(i.username, 'Username')}><Copy className="h-4 w-4" /></IconBtn>}>{i.username || '—'}</Row>
            <Row label="Password" actions={<><IconBtn label={revealed ? 'Hide password' : 'Show password'} onClick={onReveal}>{revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</IconBtn><IconBtn label="Copy password" onClick={() => onCopy(i.password, 'Password')}><Copy className="h-4 w-4" /></IconBtn></>}><span className="font-mono">{revealed ? i.password : '••••••••••'}</span></Row>
            {hasAuth && (
              <div className="flex items-start gap-2 rounded-lg border border-border px-3 py-2">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <div className="min-w-0 text-sm"><p className="font-medium">{i.authMethod}{i.authPhone ? <span className="font-normal text-muted-foreground"> · {i.authPhone}</span> : null}</p>{i.authNote && <p className="text-xs text-muted-foreground">{i.authNote}</p>}</div>
              </div>
            )}
            {i.notes && <p className="line-clamp-2 px-1 text-xs text-muted-foreground">{i.notes}</p>}
          </>
        ) : (
          <Row label="Secure note" actions={<IconBtn label={revealed ? 'Hide note' : 'Show note'} onClick={onReveal}>{revealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</IconBtn>}>
            <span className={cn('block whitespace-pre-wrap', !revealed && 'select-none tracking-widest')}>{revealed ? i.notes : '••••••••'}</span>
          </Row>
        )}
      </div>
      <p className="mt-auto pt-4 text-xs text-muted-foreground">Updated {formatDate(i.updatedAt.slice(0, 10))}</p>
    </li>
  )
}
