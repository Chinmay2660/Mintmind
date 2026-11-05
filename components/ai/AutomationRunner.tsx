'use client'

import { useEffect, useRef } from 'react'
import axios from 'axios'
import { useWealth } from '@/lib/wealth/WealthContext'
import { newRule, runDueRules } from '@/lib/ai/automation'
import { useAi } from './useAi'
import { useFeatures } from '@/lib/features/FeaturesContext'

const SAMPLE = ['card-due', 'budget-pace', 'ins-premium']

/** Evaluates due automations while the app is open (on load and every 30 minutes) and stores their history. Renders nothing. */
export function AutomationRunner() {
  const { ready, isDemo, db, data } = useWealth()
  const { facts } = useAi()
  const { isEnabled } = useFeatures()
  const on = isEnabled('automation')
  const latest = useRef({ facts, data, isDemo })
  latest.current = { facts, data, isDemo }
  const started = useRef(false)

  useEffect(() => {
    if (!on || !ready || !facts || !db || started.current) return
    started.current = true
    const run = async () => {
      const { facts: f, data: d, isDemo: demo } = latest.current
      if (!f) return
      let rules: any[] = d.automations
      if (demo && rules.length === 0 && !(await db.meta.get('automationsSeeded'))) {
        // Demo only: sample automations so the history is populated. These are labelled as demo data.
        rules = SAMPLE.map((id) => ({ ...newRule(id), nextRunAt: '0000-00-00' }))
        await db.meta.put({ key: 'automationsSeeded', value: true })
      }
      if (!rules.length) return
      const { runs, rules: next } = runDueRules(rules, f, d, new Date())
      if (!runs.length) return
      const profile = d.meta.find((m: any) => m.key === 'profile')?.value
      for (const r0 of runs) {
        const r: any = r0
        const rule = next.find((x: any) => x.id === r.ruleId)
        if (r.fired && rule && !demo) {
          const external = Object.keys(rule.channels).filter((c) => rule.channels[c] && (c === 'email' || c === 'sms'))
          if (external.length) {
            try { const res = await axios.post('/api/automation/notify', { title: r.title, body: r.body, channels: external, mobile: profile?.phone }); r.deliveries = res.data.deliveries } catch { r.deliveries = { email: 'failed' } }
          }
        }
        await db.automationRuns.put(r)
      }
      for (const r of next) await db.automations.put(r)
    }
    run()
    const t = setInterval(run, 30 * 60_000)
    return () => { clearInterval(t); started.current = false }
  }, [ready, !!facts, db, on])

  return null
}
