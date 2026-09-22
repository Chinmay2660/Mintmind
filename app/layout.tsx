import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import Providers from "@/components/Providers"

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
  fallback: ["system-ui", "sans-serif"],
});

export const metadata = {
  title: {
    template: "%s | Mintmind",
    default: "Mintmind — Net Worth, Vault & Legacy Handoff",
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
  themeColor: "#2563eb",
  viewportFit: "cover",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${plusJakarta.variable} font-sans antialiased`}>
        <Providers>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}
