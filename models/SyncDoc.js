import mongoose from 'mongoose'

/**
 * One row of one of the user's wealth tables (bank account, expense, goal, a vault ciphertext, ...).
 * The server is the source of truth, and every signed-in device keeps a local copy that it syncs with.
 * `rev` goes up on every write, so a device can ask for "everything after the last rev I saw".
 * Deleted rows stay as tombstones so other devices learn about the delete.
 */
const SyncDocSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  table: { type: String, required: true },
  key: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed },
  deleted: { type: Boolean, default: false },
  rev: { type: Number, required: true },
}, { minimize: false })

SyncDocSchema.index({ userId: 1, table: 1, key: 1 }, { unique: true })
SyncDocSchema.index({ userId: 1, rev: 1 })

export default mongoose.models.SyncDoc || mongoose.model('SyncDoc', SyncDocSchema)
