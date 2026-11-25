import mongoose from 'mongoose'

// A sign-in token that was ended by signing out. Rows delete themselves once the token would have expired anyway.
const RevokedTokenSchema = new mongoose.Schema({
  jti: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
})

export default mongoose.models.RevokedToken || mongoose.model('RevokedToken', RevokedTokenSchema)
