import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import Providers from "@/components/Providers"

export const metadata = {
  title: {
    template: "%s | Mintmind",
    default: "Mintmind - Net Worth, Vault & Legacy Handoff",
  },
  description: "Track net worth, store passwords and identity documents, and give your nominee a secure handoff when it matters.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mintmind",
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
    shortcut: "/icon.svg",
  },
  applicationName: "Mintmind",
  other: {
    "mobile-web-app-capable": "yes",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [{ media: "(prefers-color-scheme: light)", color: "#F6F0E9" }, { media: "(prefers-color-scheme: dark)", color: "#25231F" }],
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning data-style="paper" data-retro="true">
      <head suppressHydrationWarning>
        <link rel="preload" href="/fonts/jetbrains-mono-400.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
        <link rel="preload" href="/fonts/jetbrains-mono-800.woff2" as="font" type="font/woff2" crossOrigin="anonymous" />
      </head>
      <body suppressHydrationWarning className="font-sans antialiased">
        <Providers>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}
