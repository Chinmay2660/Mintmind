// Notification providers for Digital Legacy. Each returns { sent, reason? } and never throws for "not configured".
import { sendEmail } from '@/lib/email/resend'

export const email = sendEmail

/**
 * SMS: choose a provider with SMS_PROVIDER=twilio (default none).
 *   TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
 * To add another provider (MSG91, Gupshup, Vonage) implement `send({to, body})` below and register it.
 */
const smsProviders = {
  async twilio({ to, body }) {
    const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: token, TWILIO_FROM: from } = process.env
    if (!sid || !token || !from) return { sent: false, reason: 'not_configured' }
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: { Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    })
    return res.ok ? { sent: true } : { sent: false, reason: `twilio_${res.status}` }
  },
}

export async function sendSms({ to, body }) {
  const p = smsProviders[process.env.SMS_PROVIDER || '']
  if (!p || !to) return { sent: false, reason: 'not_configured' }
  try {
    return await p({ to, body })
  } catch {
    return { sent: false, reason: 'error' }
  }
}

/**
 * Web push: requires VAPID keys (NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY) and the `web-push`
 * package (not installed by default). Until then push is reported as not configured and the workflow
 * falls back to email, so the confirmation step is never skipped silently.
 */
export async function sendPush(subscription, payload) {
  if (!subscription || !process.env.VAPID_PRIVATE_KEY) return { sent: false, reason: 'not_configured' }
  try {
    const mod = 'web-push'
    const webpush = (await import(/* webpackIgnore: true */ mod)).default
    webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:admin@example.com', process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY)
    await webpush.sendNotification(subscription, JSON.stringify(payload))
    return { sent: true }
  } catch {
    return { sent: false, reason: 'error' }
  }
}
