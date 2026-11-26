'use client'

import { TabBar } from '@/components/ui/tab-bar'

/** A tab for each one of its kind (each bank, policy or holding), so you can move between them from a detail page. The page itself is the whole screen. */
export function CategoryHeader({ items, active, onPick, tabsLabel }: { items: { key: string; label: string }[]; active: string; onPick: (key: string) => void; tabsLabel: string }) {
  if (items.length < 2) return null
  return <TabBar label={tabsLabel} value={active} onChange={onPick} tabs={items} />
}
