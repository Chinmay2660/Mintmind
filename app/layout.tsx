import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import Providers from "@/components/Providers"

const outfit = Outfit({ 
  subsets: ["latin"],
  display: 'swap',
  fallback: ['system-ui', 'arial'],
});

export const metadata = {
  title: {
    template: "%s | Mintmind",
    default: "Mintmind - Personal Finance Tracker",
  },
  description: "Track your expenses, income, investments, and manage your finances",
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
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>
        <Providers>
          <Toaster />
          {children}
        </Providers>
      </body>
    </html>
  );
}
