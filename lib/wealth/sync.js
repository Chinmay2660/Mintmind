import Dexie from 'dexie'
import { TABLES } from './db'
import { LOCAL_ONLY_META } from '@/lib/sync/validate'

/**
 * Keeps the local copy of a signed-in user's data in step with the server, which is the source of truth.
 *
 *  - Every local write (create, update, delete) leaves a note in the `outbox` table. Notes are only "this row changed";
 *    the current row is read when it is sent, so many quick edits become one request.
 *  - Changes are pushed soon after they happen, and pulled when the app opens, regains focus or comes back online,
 *    and every 30 seconds while it is on screen.
 *  - A record changed on this device and not yet sent is never overwritten by a pull. Otherwise the server's copy wins.
 *  - The first time a device syncs, local rows the server does not have are uploaded, so existing data is not lost.
 * Demo Mode never syncs.
 */

const PUSH_DELAY_MS = 600
const PULL_EVERY_MS = 30_000
const OVERLAP_MS = 10_000 // re-read a little before the last point, in case two servers saved out of order
const BATCH = 100

const k = (table, key) => `${table}\u0000${key}`
const sameJson = (a, b) => { try { return JSON.stringify(a) === JSON.stringify(b) } catch { return false } }
const keyPathOf = (table) => table.schema.primKey.keyPath

// Biometric unlock is tied to one device's WebAuthn credential, so it stays on that device.
// The rest of the vault record (salt, verifier, recovery blob, and every item) is already encrypted in the browser.
const isVaultMeta = (table, row) => table === 'meta' && row?.key === 'vault'
function outbound(table, row) {
  if (!isVaultMeta(table, row) || !row.value || !row.value.biometric) return row
  const { biometric, ...value } = row.value
  return { ...row, value }
}
function inbound(table, row, current) {
  if (!isVaultMeta(table, row) || !row.value) return row
  const keep = current?.value?.biometric && current.value.salt === row.value.salt // a new master password makes the old biometric key useless
  return keep ? { ...row, value: { ...row.value, biometric: current.value.biometric } } : row
}

const sessions = new Map() // db name -> session

export function startSync(db) {
  if (sessions.has(db.name)) return sessions.get(db.name).ready
  const s = createSession(db)
  sessions.set(db.name, s)
  return s.ready
}

export function stopSync(db) {
  const s = sessions.get(db.name)
  if (!s) return
  s.stop()
  sessions.delete(db.name)
}

export function syncNow(db) {
  return sessions.get(db.name)?.syncNow()
}

/** { pending, error, lastSyncedAt } and a way to listen for changes. */
export function getSyncStatus(db) {
  return sessions.get(db.name)?.status ?? { pending: 0, error: null, lastSyncedAt: null }
}
export function subscribeSync(db, fn) {
  const s = sessions.get(db.name)
  if (!s) return () => {}
  s.listeners.add(fn)
  return () => s.listeners.delete(fn)
}

function createSession(db) {
  let seq = Date.now()
  let stopped = false
  let timer = null
  let poll = null
  let chain = Promise.resolve()
  const listeners = new Set()
  const session = { listeners, status: { pending: 0, error: null, lastSyncedAt: null } }
  const setStatus = (patch) => { session.status = { ...session.status, ...patch }; listeners.forEach((f) => { try { f(session.status) } catch { /* ignore */ } }) }
  const refreshPending = async () => setStatus({ pending: await db.outbox.count().catch(() => 0) })

  const mark = (tableName, key) => {
    if (stopped || key === undefined || key === null) return
    if (tableName === 'meta' && LOCAL_ONLY_META.has(String(key))) return
    Dexie.ignoreTransaction(() => db.outbox.put({ k: k(tableName, key), table: tableName, key: String(key), at: ++seq }))
      .then(() => { refreshPending(); schedulePush() })
      .catch(() => {})
  }

  // 1. notice every local write
  for (const name of TABLES) {
    const table = db[name]
    table.hook('creating', function (primKey, obj, trans) {
      if (trans && trans.__remote) return
      const key = primKey ?? obj?.[keyPathOf(table)]
      this.onsuccess = (pk) => mark(name, pk ?? key)
    })
    table.hook('updating', function (mods, primKey, obj, trans) {
      if (trans && trans.__remote) return
      this.onsuccess = () => mark(name, primKey)
    })
    table.hook('deleting', function (primKey, obj, trans) {
      if (trans && trans.__remote) return
      this.onsuccess = () => mark(name, primKey)
    })
    // clear() skips the delete hook, so note every row it removes
    const clear = table.clear.bind(table)
    table.clear = async () => {
      const keys = await table.toCollection().primaryKeys()
      const res = await clear()
      if (keys.length) await db.outbox.bulkPut(keys.filter((x) => !(name === 'meta' && LOCAL_ONLY_META.has(String(x)))).map((x) => ({ k: k(name, x), table: name, key: String(x), at: ++seq })))
      refreshPending(); schedulePush()
      return res
    }
  }

  const schedulePush = () => {
    if (stopped) return
    clearTimeout(timer)
    timer = setTimeout(() => { run(push) }, PUSH_DELAY_MS)
  }

  // one thing at a time, so a pull never interleaves with a push
  const run = (fn) => { chain = chain.then(() => (stopped ? undefined : fn())).catch((e) => { setStatus({ error: e?.message || 'Sync failed' }) }); return chain }

  const request = async (url, init) => {
    const res = await fetch(url, { credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, ...init })
    if (res.status === 401) { const e = new Error('Signed out'); e.code = 401; throw e }
    if (!res.ok) throw new Error(`Sync failed (${res.status})`)
    return res.json()
  }

  async function push() {
    for (;;) {
      const entries = await db.outbox.limit(BATCH).toArray()
      if (!entries.length) break
      const ops = []
      for (const e of entries) {
        const row = await db[e.table].get(e.key)
        ops.push(row ? { table: e.table, key: e.key, data: outbound(e.table, row) } :{ table: e.table, key: e.key, deleted: true })
      }
      await request('/api/sync', { method: 'POST', body: JSON.stringify({ ops }) })
      // forget a note only if the row has not changed again since it was read
      await db.transaction('rw', db.outbox, async () => {
        for (const e of entries) {
          const cur = await db.outbox.get(e.k)
          if (cur && cur.at === e.at) await db.outbox.delete(e.k)
        }
      })
    }
    await refreshPending()
    setStatus({ error: null, lastSyncedAt: Date.now() })
  }

  async function applyChanges(changes) {
    const byTable = new Map()
    for (const c of changes) { if (TABLES.includes(c.table)) (byTable.get(c.table) || byTable.set(c.table, []).get(c.table)).push(c) }
    for (const [name, list] of byTable) {
      const table = db[name]
      const path = keyPathOf(table)
      await db.transaction('rw', table, db.outbox, async (trans) => {
        trans.__remote = true
        for (const c of list) {
          if (await db.outbox.get(k(name, c.key))) continue // changed here and not sent yet: this device's version wins
          if (c.deleted) { await table.delete(c.key); continue }
          const cur = await table.get(c.key)
          const row = inbound(name, { ...c.data, [path]: c.data?.[path] ?? c.key }, cur)
          if (!cur || !sameJson(cur, row)) await table.put(row)
        }
      })
    }
  }

  async function pull() {
    const state = await db.syncState.get('cursor')
    const first = !state
    let since = first ? 0 : Math.max(0, state.value - OVERLAP_MS)
    let afterId = null
    let top = state ? state.value : 0
    const seen = first ? new Set() : null
    for (;;) {
      const q = new URLSearchParams({ since: String(since) })
      if (afterId) q.set('afterId', afterId)
      const res = await request(`/api/sync?${q}`)
      if (seen) for (const c of res.changes) seen.add(k(c.table, c.key))
      await applyChanges(res.changes)
      for (const c of res.changes) if (c.rev > top) top = c.rev
      if (!res.more || !res.next) break
      since = res.next.since
      afterId = res.next.afterId
    }
    if (first) {
      // this device has not synced before: upload what it has that the server does not
      for (const name of TABLES) {
        const keys = await db[name].toCollection().primaryKeys()
        const notes = keys.filter((x) => !seen.has(k(name, x)) && !(name === 'meta' && LOCAL_ONLY_META.has(String(x)))).map((x) => ({ k: k(name, x), table: name, key: String(x), at: ++seq }))
        if (notes.length) await db.outbox.bulkPut(notes)
      }
      await refreshPending()
    }
    await db.syncState.put({ key: 'cursor', value: top || Date.now() })
    setStatus({ error: null, lastSyncedAt: Date.now() })
  }

  const syncNow = () => run(async () => { await pull(); await push() })

  const onVisible = () => { if (document.visibilityState === 'visible') syncNow(); else run(push) }
  const onOnline = () => syncNow()
  session.stop = () => {
    stopped = true
    clearTimeout(timer); clearInterval(poll)
    window.removeEventListener('online', onOnline)
    document.removeEventListener('visibilitychange', onVisible)
  }
  session.syncNow = syncNow
  window.addEventListener('online', onOnline)
  document.addEventListener('visibilitychange', onVisible)
  poll = setInterval(() => { if (document.visibilityState === 'visible' && navigator.onLine !== false) run(pull) }, PULL_EVERY_MS)

  // resolves once the first pull is done (or has failed, for example when offline), so the app can start from the local copy
  session.ready = run(async () => { await pull(); await push() }).then(() => refreshPending())
  return session
}
