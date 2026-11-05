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
  mfa: {
    enabled: { type: Boolean, default: false },
    secretEnc: { type: String, select: false },
    pendingSecretEnc: { type: String, select: false },
  },
}, {
  timestamps: true,
});

// Ensure at least email or phoneNumber is provided
UserSchema.pre('validate', function(next) {
  if (!this.email && !this.phoneNumber) {
    next(new Error('Either email or phoneNumber must be provided'));
  } else {
    next();
  }
});

export default mongoose.models.User || mongoose.model('User', UserSchema);

