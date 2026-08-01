'use client'
import React, { createContext, useCallback, useContext, useState } from 'react'
import { Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export const CONTACT_EMAIL = 'chinmaybhoir.dev@gmail.com'

const ContactDialogContext = createContext<{ openContact: () => void } | null>(null)

export function useContactDialog() {
  return useContext(ContactDialogContext)
}

export function ContactDialogProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openContact = useCallback(() => setOpen(true), [])

  return (
    <ContactDialogContext.Provider value={{ openContact }}>
      {children}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg gap-6">
          <DialogHeader>
            <DialogTitle>Get in touch</DialogTitle>
            <DialogDescription>
              Have feedback or questions? Send us a message.
            </DialogDescription>
          </DialogHeader>
          <ContactForm onSuccess={() => setOpen(false)} idPrefix="dialog-contact" />
        </DialogContent>
      </Dialog>
    </ContactDialogContext.Provider>
  )
}

export function ContactLink({
  className,
  children,
  onClick,
}: {
  className?: string
  children: React.ReactNode
  onClick?: () => void
}) {
  const contactDialog = useContactDialog()

  if (contactDialog) {
    return (
      <button
        type="button"
        onClick={() => {
          contactDialog.openContact()
          onClick?.()
        }}
        className={className}
      >
        {children}
      </button>
    )
  }

  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className={className} onClick={onClick}>
      {children}
    </a>
  )
}

function ContactForm({
  onSuccess,
  idPrefix = 'contact',
}: {
  onSuccess?: () => void
  idPrefix?: string
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const body = [
      `Name: ${name}`,
      `Email: ${email}`,
      '',
      message,
    ].join('\n')

    const mailto = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`
    window.location.href = mailto
    onSuccess?.()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-name`} className="text-sm font-medium">
            Name
          </label>
          <Input
            id={`${idPrefix}-name`}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            className="bg-muted/50 dark:bg-muted border-border"
          />
        </div>
        <div className="space-y-2">
          <label htmlFor={`${idPrefix}-email`} className="text-sm font-medium">
            Email
          </label>
          <Input
            id={`${idPrefix}-email`}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="bg-muted/50 dark:bg-muted border-border"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-subject`} className="text-sm font-medium">
          Subject
        </label>
        <Input
          id={`${idPrefix}-subject`}
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What's this about?"
          required
          className="bg-muted/50 dark:bg-muted border-border"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={`${idPrefix}-message`} className="text-sm font-medium">
          Message
        </label>
        <textarea
          id={`${idPrefix}-message`}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Tell us what's on your mind..."
          required
          rows={4}
          className="flex w-full rounded-xl border border-border bg-muted/50 dark:bg-muted px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      <Button
        type="submit"
        className="w-full rounded-full gap-2"
      >
        <Send className="w-4 h-4" />
        Send message
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Or email us directly at{' '}
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="text-primary font-medium hover:underline"
        >
          {CONTACT_EMAIL}
        </a>
      </p>
    </form>
  )
}
