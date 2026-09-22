import fs from 'fs/promises'
import path from 'path'
import { ensureUploadDir } from '@/lib/storage'

// ponytail: minimal valid PDF stub for demo downloads
const DEMO_PDF = Buffer.from(
  '%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/MediaBox[0 0 3 3]>>endobj\nxref\n0 4\ntrailer<</Size 4/Root 1 0 R>>\nstartxref\n0\n%%EOF\n'
)

const DEMO_FILES = [
  { key: 'demo-aadhar.pdf', name: 'aadhar-card.pdf', size: 95000 },
  { key: 'demo-pan.pdf', name: 'pan-card.pdf', size: 72000 },
  { key: 'demo-health-policy.pdf', name: 'health-policy-2024.pdf', size: 245000 },
  { key: 'demo-itr-ack.pdf', name: 'itr-ack-2025.pdf', size: 128000 },
  { key: 'demo-loan-agreement.pdf', name: 'home-loan-agreement.pdf', size: 890000 },
  { key: 'demo-sip-statement.pdf', name: 'sip-statement-q1.pdf', size: 156000 },
  { key: 'demo-receipt.pdf', name: 'laptop-receipt.pdf', size: 84000 },
]

export async function writeDemoDocumentFiles(userId) {
  const dir = await ensureUploadDir(userId)
  await Promise.all(
    DEMO_FILES.map(({ key }) => fs.writeFile(path.join(dir, key), DEMO_PDF))
  )
  return DEMO_FILES
}

export function buildDemoDocuments(userId, tagRefs, files) {
  const byKey = Object.fromEntries(files.map((f) => [f.key, f]))

  return [
    {
      userId,
      name: 'Aadhar Card',
      category: 'identity',
      tagIds: [tagRefs.family],
      fileName: byKey['demo-aadhar.pdf'].name,
      fileSize: byKey['demo-aadhar.pdf'].size,
      mimeType: 'application/pdf',
      storageKey: 'demo-aadhar.pdf',
      fileUrl: '/api/documents/file/demo-aadhar.pdf',
      notes: 'Identity proof',
    },
    {
      userId,
      name: 'PAN Card',
      category: 'identity',
      tagIds: [tagRefs.family],
      fileName: byKey['demo-pan.pdf'].name,
      fileSize: byKey['demo-pan.pdf'].size,
      mimeType: 'application/pdf',
      storageKey: 'demo-pan.pdf',
      fileUrl: '/api/documents/file/demo-pan.pdf',
    },
    {
      userId,
      name: 'Health Insurance Policy',
      category: 'insurance',
      tagIds: [tagRefs.family],
      fileName: byKey['demo-health-policy.pdf'].name,
      fileSize: byKey['demo-health-policy.pdf'].size,
      mimeType: 'application/pdf',
      storageKey: 'demo-health-policy.pdf',
      fileUrl: '/api/documents/file/demo-health-policy.pdf',
      notes: 'Family floater plan',
    },
    {
      userId,
      name: 'FY24-25 ITR Acknowledgement',
      category: 'tax',
      tagIds: [tagRefs.tax],
      fileName: byKey['demo-itr-ack.pdf'].name,
      fileSize: byKey['demo-itr-ack.pdf'].size,
      mimeType: 'application/pdf',
      storageKey: 'demo-itr-ack.pdf',
      fileUrl: '/api/documents/file/demo-itr-ack.pdf',
    },
    {
      userId,
      name: 'Home Loan Agreement',
      category: 'loan',
      fileName: byKey['demo-loan-agreement.pdf'].name,
      fileSize: byKey['demo-loan-agreement.pdf'].size,
      mimeType: 'application/pdf',
      storageKey: 'demo-loan-agreement.pdf',
      fileUrl: '/api/documents/file/demo-loan-agreement.pdf',
      notes: 'Signed copy',
    },
    {
      userId,
      name: 'Nifty 50 SIP Statement',
      category: 'investment',
      fileName: byKey['demo-sip-statement.pdf'].name,
      fileSize: byKey['demo-sip-statement.pdf'].size,
      mimeType: 'application/pdf',
      storageKey: 'demo-sip-statement.pdf',
      fileUrl: '/api/documents/file/demo-sip-statement.pdf',
    },
    {
      userId,
      name: 'Laptop Purchase Receipt',
      category: 'receipt',
      tagIds: [tagRefs.discretionary],
      fileName: byKey['demo-receipt.pdf'].name,
      fileSize: byKey['demo-receipt.pdf'].size,
      mimeType: 'application/pdf',
      storageKey: 'demo-receipt.pdf',
      fileUrl: '/api/documents/file/demo-receipt.pdf',
      notes: 'Work laptop — tax deductible',
    },
  ]
}
