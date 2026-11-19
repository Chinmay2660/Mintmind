import type { Metadata } from 'next'
import { LegalPage } from '@/components/landing/LegalPage'
import { CookieSettingsButton } from '@/components/landing/CookieSettingsButton'

export const metadata: Metadata = { title: 'Cookies and local storage' }

const Row = ({ name, kind, what, how }: { name: string; kind: string; what: string; how: string }) => (
  <tr className="border-t border-border align-top">
    <td className="py-2 pr-3 font-mono text-xs text-foreground">{name}</td><td className="py-2 pr-3">{kind}</td><td className="py-2 pr-3">{what}</td><td className="py-2">{how}</td>
  </tr>
)
const Table = ({ children }: { children: React.ReactNode }) => (
  <div className="overflow-x-auto"><table className="w-full min-w-[34rem] text-left text-xs"><thead className="text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="pb-2 pr-3 font-bold">Name</th><th className="pb-2 pr-3 font-bold">Type</th><th className="pb-2 pr-3 font-bold">What it is for</th><th className="pb-2 font-bold">How long</th></tr></thead><tbody>{children}</tbody></table></div>
)

export default function CookiesPage() {
  return (
    <LegalPage title="Cookies and local storage" updated="November 2026">
      <p>Mintmind keeps a small amount of information in your browser. This page lists all of it. There are no advertising cookies, no analytics cookies and nothing here is shared with a third party.</p>
      <p><CookieSettingsButton /></p>

      <h2>Essential (always on)</h2>
      <p>The app cannot work without these, so they are not optional.</p>
      <Table>
        <Row name="auth-token" kind="Cookie, HTTP only" what="Keeps you signed in. It cannot be read by scripts on the page." how="Up to 30 days, or until you sign out" />
        <Row name="mm-demo" kind="Cookie, HTTP only" what="Remembers that you are exploring the sample family." how="12 hours, or until you exit the demo" />
        <Row name="Your records" kind="Browser database (IndexedDB)" what="A local copy of your accounts, transactions, funds and goals, kept in step with your account on our server so it works on every device." how="Until you erase them or clear site data" />
        <Row name="mm-vault-fails" kind="Local storage" what="Counts failed vault unlock attempts so guessing slows down." how="Until the lock clears" />
        <Row name="App files cache" kind="Service worker cache" what="Lets the app open offline." how="Replaced on each update" />
      </Table>

      <h2>Preferences (only with your OK)</h2>
      <p>These only remember how you like the app to look. If you decline, the app works the same and simply forgets them when you leave.</p>
      <Table>
        <Row name="mm-theme" kind="Local storage" what="Light, dark or system mode." how="Until you clear it" />
        <Row name="mm-sidebar-collapsed, mm-sidebar-open" kind="Local storage" what="Whether the sidebar is collapsed and which folders are open." how="Until you clear it" />
        <Row name="mm-device-notify, mm-device-notify-seen" kind="Local storage" what="Your choice about device notifications and which ones you have seen." how="Until you clear it" />
      </Table>

      <h2>Your choice</h2>
      <p>Your answer is saved as <span className="font-mono text-xs">mm-consent</span> on this device. You can change it at any time with the button above, or from Settings. Clearing your browser&apos;s site data resets it and the banner returns.</p>
    </LegalPage>
  )
}
