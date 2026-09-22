'use client'

import { Suspense } from 'react'
import { PageHeader } from '@/components/ui/PageHeader'
import { RuleForm } from '../_components/RuleForm'

function NewRuleContent() {
  return (
    <div className="space-y-4">
      <PageHeader
        title="Add Rule"
        subtitle="Create a transaction auto-categorization rule"
        showBack
        backHref="/dashboard/rules"
      />
      <RuleForm />
    </div>
  )
}

export default function NewRulePage() {
  return (
    <Suspense fallback={null}>
      <NewRuleContent />
    </Suspense>
  )
}
