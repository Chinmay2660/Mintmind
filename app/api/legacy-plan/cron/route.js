import crypto from 'crypto'
import { NextResponse } from 'next/server'
import connectDB from '@/lib/mongodb'
import LegacyConfig from '@/models/LegacyConfig'
import User from '@/models/User'
import { advance, DEFAULTS } from '@/lib/legacy/stateMachine'
import { email, sendPush, sendSms } from '@/lib/legacy/providers'

const appUrl = () => (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '')
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex')

/**
 * Run daily by a scheduler (Vercel Cron, GitHub Actions, cron-job.org):
 *   GET /api/legacy-plan/cron   with   Authorization: Bearer $CRON_SECRET
 * Advances each enabled plan by one workflow step and sends the matching notifications.
 */
export async function GET(request) {
  const secret = process.env.CRON_SECRET
  const given = request.headers.get('authorization') || ''
  const ok = secret && given.length === `Bearer ${secret}`.length && crypto.timingSafeEqual(Buffer.from(given), Buffer.from(`Bearer ${secret}`))
  if (!ok) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  await connectDB()
  const plans = await LegacyConfig.find({ enabled: true }).select('+pushSubscription +contacts.tokenHash')
  const summary = { checked: plans.length, advanced: 0, errors: 0 }

  for (const plan of plans) {
    try {
      const { patch, actions } = advance(plan.toObject(), new Date())
      if (!actions.length) continue
      Object.assign(plan, patch)
      const owner = await User.findById(plan.userId)
      const name = owner?.name || 'the account owner'
      const confirmLink = `${appUrl()}/dashboard` // opening the app sends a heartbeat = confirms safety

      for (const a of actions) {
        if (a.startsWith('log:')) plan.accessLog.push({ action: a.slice(4), by: 'system' })
        if (a === 'email_owner_reminder' && plan.channels.email && owner?.email)
          await email({ to: owner.email, subject: 'Mintmind: are you still there?', text: `We haven't seen you on Mintmind for a while. Open the app to confirm you're safe: ${confirmLink}`, html: `<p>We haven't seen you on Mintmind for a while.</p><p><a href="${confirmLink}">Open Mintmind to confirm you're safe</a></p>` }).catch(() => {})
        if (a === 'push_owner') {
          const r = plan.channels.push ? await sendPush(plan.pushSubscription, { title: 'Are you safe?', body: 'Open Mintmind to confirm. Your trusted contacts will be notified otherwise.', url: confirmLink }) : { sent: false }
          if (!r.sent && !plan.channels.email) plan.accessLog.push({ action: 'push_unavailable', by: 'system' })
        }
        if (a === 'email_owner_confirm' && owner?.email)
          await email({ to: owner.email, subject: 'Action needed: confirm you are safe', text: `If you don't confirm by ${plan.confirmDeadline?.toDateString()}, your trusted contacts will be notified. Confirm: ${confirmLink}`, html: `<p>If you don't confirm by ${plan.confirmDeadline?.toDateString()}, your trusted contacts will be notified.</p><p><a href="${confirmLink}">I'm safe</a></p>` }).catch(() => {})
        if (a === 'notify_contacts') {
          const ordered = [...plan.contacts].sort((x, y) => x.priority - y.priority)
          for (const c of ordered) {
            if (!c.accepted) continue
            const token = crypto.randomBytes(32).toString('base64url')
            c.tokenHash = sha(token); c.notifiedAt = new Date()
            const link = `${appUrl()}/legacy/access?token=${token}`
            const text = `${name} has not been active on Mintmind for ${plan.inactivityDays} days and did not confirm they are safe. This is not confirmation of anything serious. After a ${plan.graceDays}-day waiting period you may verify your identity and view the information ${name} prepared for you: ${link}`
            if (plan.channels.email) await email({ to: c.email, subject: `${name}: inactivity notice (Digital Legacy)`, text, html: `<p>${text.replace(link, `<a href="${link}">${link}</a>`)}</p>` }).catch(() => {})
            if (plan.channels.sms && c.mobile) await sendSms({ to: c.mobile, body: `${name} has been inactive on Mintmind. Check your email for details. This is not confirmation of any emergency.` })
            plan.accessLog.push({ action: 'contact_notified', by: 'system', note: c.name })
          }
        }
      }
      await plan.save()
      summary.advanced += 1
    } catch (e) {
      console.error('legacy cron', e)
      summary.errors += 1
    }
  }
  return NextResponse.json({ ...summary, defaults: DEFAULTS })
}
