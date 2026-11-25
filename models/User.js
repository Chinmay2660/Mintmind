import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  googleId: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
  },
  email: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
  },
  phoneNumber: {
    type: String,
    unique: true,
    sparse: true, // Allows null values but ensures uniqueness when present
  },
  name: {
    type: String,
  },
  firstName: {
    type: String,
  },
  lastName: {
    type: String,
  },
  image: {
    type: String,
  },
  passwordHash: { type: String, select: false },
  // Sign-in tokens carry this number. Changing a password raises it, which ends every older session.
  tokenVersion: { type: Number, default: 0 },
  // A pending password reset: only a hash of the emailed token is kept, and it expires.
  passwordReset: { type: { hash: String, expiresAt: Date }, select: false },
  mfa: {
    enabled: { type: Boolean, default: false },
    secretEnc: { type: String, select: false },
    pendingSecretEnc: { type: String, select: false },
  },
}, {
  timestamps: true,
});

// Ensure at least email or phoneNumber is provided
// (Mongoose 9 hooks no longer receive a `next` callback: throw to fail, return to continue.)
UserSchema.pre('validate', function() {
  if (!this.email && !this.phoneNumber) {
    throw new Error('Either email or phoneNumber must be provided');
  }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);

