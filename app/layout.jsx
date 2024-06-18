import { Outfit } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner"
import {ClerkProvider} from '@clerk/nextjs'

const outfit = Outfit({ subsets: ["latin"] });

export const metadata = {
  title: "Mint Mind",
  description: "Ease your finanial management with Mint Mind",
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={outfit.className}>
          <Toaster />
          {children}</body>
      </html>
    </ClerkProvider>
  );
}
