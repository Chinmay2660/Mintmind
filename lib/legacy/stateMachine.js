// Digital Legacy inactivity workflow (pure, unit-tested).
//
//   monitoring --(inactive >= days - reminderLead)--> reminded          action: email reminder to owner
//   reminded   --(inactive >= days)------------------> awaiting_confirmation  action: push + email "confirm you're safe"
//   awaiting_confirmation --(confirmDeadline passed)-> contacts_notified      action: notify contacts (priority order)
//   contacts_notified --(graceEndsAt passed)---------> released               action: contacts may complete verification
//   any state except released: owner activity / "I'm safe" -> monitoring
//
// Inactivity is NOT proof of death; each step only asks for confirmation and waits.

const DAY = 86400000

export const DEFAULTS = { inactivityDays: 90, reminderLeadDays: 7, confirmDays: 7, graceDays: 14 }

export const daysBetween = (a, b) => (new Date(b) - new Date(a)) / DAY

/** Returns { state, patch, actions } for one evaluation step. Call repeatedly (each run advances at most one step). */
export function advance(cfg, now = new Date()) {
  const n = new Date(now)
  const inactiveDays = daysBetween(cfg.lastActiveAt, n)
  const days = cfg.inactivityDays ?? DEFAULTS.inactivityDays
  const lead = Math.min(cfg.reminderLeadDays ?? DEFAULTS.reminderLeadDays, days - 1)
  const state = cfg.state || 'monitoring'

  if (!cfg.enabled) return { state, patch: {}, actions: [] }

  // Fresh activity cancels the process before release
  if (state !== 'monitoring' && state !== 'released' && inactiveDays < days - lead) {
    return { state: 'monitoring', patch: { state: 'monitoring', confirmDeadline: null, graceEndsAt: null }, actions: ['log:activity_reset'] }
  }

  switch (state) {
    case 'monitoring':
      if (inactiveDays >= days - lead) return { state: 'reminded', patch: { state: 'reminded', lastReminderAt: n }, actions: ['email_owner_reminder'] }
      break
    case 'reminded':
      if (inactiveDays >= days) {
        const confirmDeadline = new Date(n.getTime() + (cfg.confirmDays ?? DEFAULTS.confirmDays) * DAY)
        return { state: 'awaiting_confirmation', patch: { state: 'awaiting_confirmation', confirmDeadline }, actions: ['push_owner', 'email_owner_confirm'] }
      }
      break
    case 'awaiting_confirmation':
      if (cfg.confirmDeadline && n >= new Date(cfg.confirmDeadline)) {
        const graceEndsAt = new Date(n.getTime() + (cfg.graceDays ?? DEFAULTS.graceDays) * DAY)
        return { state: 'contacts_notified', patch: { state: 'contacts_notified', graceEndsAt, notifiedAt: n }, actions: ['notify_contacts'] }
      }
      break
    case 'contacts_notified':
      if (cfg.graceEndsAt && n >= new Date(cfg.graceEndsAt)) return { state: 'released', patch: { state: 'released', releasedAt: n }, actions: ['log:released'] }
      break
  }
  return { state, patch: {}, actions: [] }
}

/** Owner confirms they're safe / is active again. */
export function confirmSafe(now = new Date()) {
  return { state: 'monitoring', lastActiveAt: new Date(now), confirmDeadline: null, graceEndsAt: null, releasedAt: null }
}

export const STATE_LABELS = {
  monitoring: 'Monitoring',
  reminded: 'Reminder sent',
  awaiting_confirmation: 'Waiting for your confirmation',
  contacts_notified: 'Contacts notified (grace period)',
  released: 'Released to verified contacts',
}
