'use client'

import { Suspense } from 'react'
import { useParams } from 'next/navigation'
import { PageHeader } from '@/components/ui/PageHeader'
import { RuleForm } from '../_components/RuleForm'

function EditRuleContent() {
  const params = useParams()
  const id = params.id as string

  return (
    <div className="space-y-4">
      <PageHeader
        title="Edit Rule"
        subtitle="Update rule conditions and actions"
        showBack
        backHref="/dashboard/rules"
      />
      <RuleForm ruleId={id} />
    </div>
  )
}

export default function EditRulePage() {
  return (
    <Suspense fallback={null}>
      <EditRuleContent />
    </Suspense>
  )
}
