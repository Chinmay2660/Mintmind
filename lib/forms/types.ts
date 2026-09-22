import type { FormVariant } from '@/components/ui/form-buttons'

export interface EntityFormProps {
  variant?: FormVariant
  onSuccess?: () => void
  onCancel?: () => void
}
