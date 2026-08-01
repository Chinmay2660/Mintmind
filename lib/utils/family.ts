import type { Family, FamilyUser } from '@/types/family'

/** Normalize Mongo ObjectId or populated user to a string id. */
export function normalizeId(value: unknown): string | null {
  if (!value) return null
  if (typeof value === 'string') return value
  if (typeof value === 'object' && value !== null) {
    const obj = value as Record<string, unknown>
    if (obj._id != null) return String(obj._id)
    if (obj.id != null) return String(obj.id)
  }
  return String(value)
}

export function isFamilyHead(family: Family | null, userId: string | undefined): boolean {
  if (!family || !userId) return false
  return normalizeId(family.familyHead) === userId
}

export function getActiveMembers(family: Family): Family['members'] {
  return family.members.filter((m) => m.status === 'active')
}

export function getMemberCount(family: Family): number {
  return getActiveMembers(family).length
}
