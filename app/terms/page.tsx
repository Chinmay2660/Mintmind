import type { Metadata } from 'next'
import { LegalPage } from '@/components/landing/LegalPage'

export const metadata: Metadata = { title: 'Terms of use' }

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="November 2026">
      <p>These terms describe how Mintmind is meant to be used. They are written in plain language. If you plan to rely on them for anything formal, have them reviewed by a qualified professional first.</p>

      <h2>What Mintmind is</h2>
      <p>Mintmind is a personal record-keeping and planning tool. You enter balances, holdings, spending and goals, and it calculates totals, trends and simple measures from what you entered. It does not connect to your bank, and nothing refreshes by itself unless you choose to sync it.</p>

      <h2>Not advice</h2>
      <p>Nothing in the app is financial, investment, tax, insurance or legal advice. Figures describe your own entries. Returns shown describe the past and do not predict the future. The AI assistant explains figures the app has calculated and can be wrong, so check anything that matters.</p>

      <h2>Your data</h2>
      <ul>
        <li>Your records are stored on your own device, in your browser. Clearing site data or switching devices without exporting a backup can remove them.</li>
        <li>Keep your own backups using the export options in Settings.</li>
        <li>You are responsible for the accuracy of what you enter and for keeping your master password and sign-in details safe.</li>
      </ul>

      <h2>Digital Legacy</h2>
      <p>The legacy feature notifies people you choose. It does not replace a will, nominations or inheritance law, and a period of inactivity is not proof of death or incapacity.</p>

      <h2>Acceptable use</h2>
      <p>Use Mintmind for your own finances or those of your family with their knowledge. Do not use it to store information you have no right to hold, or to try to break or overload the service.</p>

      <h2>No guarantee</h2>
      <p>The app is provided as it is. It may contain mistakes, and it can change or stop. To the extent the law allows, the people who make it are not liable for losses that come from relying on it.</p>

      <h2>Questions</h2>
      <p>See the contact page for how to reach us.</p>
    </LegalPage>
  )
}
