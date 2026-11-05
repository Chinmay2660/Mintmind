import mongoose from 'mongoose'

// Metadata only. File bytes live in the user's own Google Drive.
const DriveDocumentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    driveFileId: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    fileName: { type: String },
    category: { type: String, required: true },
    mimeType: { type: String },
    size: { type: Number },
    notes: { type: String },
  },
  { timestamps: true }
)

DriveDocumentSchema.index({ userId: 1, createdAt: -1 })

export default mongoose.models.DriveDocument || mongoose.model('DriveDocument', DriveDocumentSchema)
