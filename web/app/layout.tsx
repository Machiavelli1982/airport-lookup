import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
  "https://www.airportlookup.com";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Airport Lookup",
    template: "%s | Airport Lookup",
  },
  description:
    "Fast airport reference for MSFS 2020/2024: runways (incl. lighting), frequencies, and navaids. Reference only — not for real-world navigation.",
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`
          ${geistSans.variable}
          ${geistMono.variable}
          antialiased
          overflow-x-hidden
        `}
      >
        <Script
          data-domain="airportlookup.com"
          src="https://plausible.io/js/script.js"
          strategy="afterInteractive"
        />

        {children}

        <footer className="mt-12 border-t border-neutral-200 dark:border-neutral-800 py-6 text-center text-xs text-neutral-600 dark:text-neutral-400">
          <a
            href="mailto:contact@airportlookup.com"
            className="underline underline-offset-2 hover:text-neutral-900 dark:hover:text-neutral-200"
          >
            Contact
          </a>
        </footer>
      </body>
    </html>
  );
}
