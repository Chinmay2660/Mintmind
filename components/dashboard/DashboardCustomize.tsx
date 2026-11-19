'use client'

import { InfoTip } from '@/components/wealth/kit'
import { useState } from 'react'
import { Reorder, useDragControls } from 'framer-motion'
import { ArrowDown, ArrowUp, GripVertical, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { DashboardBlock } from './useDashboardLayout'

function Item({ block, shown, half, first, last, onToggle, onSize, onMove }: { block: DashboardBlock; shown: boolean; half: boolean; first: boolean; last: boolean; onToggle: () => void; onSize: () => void; onMove: (d: -1 | 1) => void }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={block.id} dragListener={false} dragControls={controls} className="flex items-center gap-2 rounded-xl border border-border bg-card px-2 py-1.5">
      <button type="button" aria-label={`Drag ${block.label}`} onPointerDown={(e) => controls.start(e)} className="flex h-9 w-8 shrink-0 cursor-grab touch-none items-center justify-center rounded-lg text-muted-foreground hover:bg-muted active:cursor-grabbing"><GripVertical className="h-4 w-4" /></button>
      <label className="flex min-w-0 flex-1 items-center gap-2.5 py-1 text-sm">
        <Checkbox checked={shown} onChange={onToggle} aria-label={`Show ${block.label}`} />
        <span className={cn('min-w-0 truncate', !shown && 'text-muted-foreground line-through')}>{block.label}</span>
      </label>
      <button type="button" onClick={onSize} aria-pressed={half} aria-label={`${block.label}: ${half ? 'half width, switch to full width' : 'full width, switch to half width'}`} className="h-8 shrink-0 rounded-md border border-border px-2 text-[11px] font-medium outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring">{half ? 'Half' : 'Full'}</button>
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label={`Move ${block.label} up`} disabled={first} onClick={() => onMove(-1)}><ArrowUp className="h-4 w-4" /></Button>
      <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label={`Move ${block.label} down`} disabled={last} onClick={() => onMove(1)}><ArrowDown className="h-4 w-4" /></Button>
    </Reorder.Item>
  )
}

/** Choose which dashboard sections show and in what order. Drag the handle, or use the arrows from a keyboard. Saved as you go. */
export function DashboardCustomize({ blocks, order, hidden, half, isCustom, onOrder, onToggle, onSize, onReset }: {
  blocks: DashboardBlock[]; order: string[]; hidden: string[]; half: string[]; isCustom: boolean
  onOrder: (order: string[]) => void; onToggle: (id: string) => void; onSize: (id: string) => void; onReset: () => void
}) {
  const [open, setOpen] = useState(false)
  const byId = new Map(blocks.map((b) => [b.id, b]))
  const move = (id: string, d: -1 | 1) => {
    const i = order.indexOf(id); const j = i + d
    if (j < 0 || j >= order.length) return
    const next = [...order]; [next[i], next[j]] = [next[j], next[i]]; onOrder(next)
  }
  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}><SlidersHorizontal className="mr-1.5 h-4 w-4" />Customize</Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl grid-cols-[minmax(0,1fr)]">
          <DialogHeader>
            <div className="flex items-center gap-2"><DialogTitle>Customize dashboard</DialogTitle><InfoTip label="Details">Show or hide sections, switch them between full and half width, and drag them into the order you like. Half width sections sit side by side on large screens. Your choice is saved on this device for this profile.</InfoTip></div><DialogDescription className="sr-only">Show or hide sections, switch them between full and half width, and drag them into the order you like. Half width sections sit side by side on large screens. Your choice is saved on this device for this profile.</DialogDescription>
          </DialogHeader>
          <Reorder.Group axis="y" values={order} onReorder={onOrder} className="space-y-2">
            {order.map((id, i) => byId.get(id) && <Item key={id} block={byId.get(id)!} shown={!hidden.includes(id)} half={half.includes(id)} onSize={() => onSize(id)} first={i === 0} last={i === order.length - 1} onToggle={() => onToggle(id)} onMove={(d) => move(id, d)} />)}
          </Reorder.Group>
          <div className="flex items-center justify-between gap-2">
            <Button type="button" variant="ghost" size="sm" disabled={!isCustom} onClick={onReset}><RotateCcw className="mr-1.5 h-4 w-4" />Reset layout</Button>
            <Button type="button" onClick={() => setOpen(false)}>Done</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
