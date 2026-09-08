import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ToastProvider } from "@/context/ToastContext";

const SITE_URL = "https://aegis-platform.ilyankhan.tech";
const SITE_NAME = "Aegis";
const TITLE = "Aegis — Secret Detection & DevSecOps Security Platform";
const DESCRIPTION =
  "Aegis is the open-source DevSecOps control plane that detects leaked secrets in your Git repos, triages incidents in real-time, and auto-remediates before attackers can act. Connect GitHub in 60 seconds.";

export const viewport: Viewport = {
  themeColor: "#0D3B39",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: DESCRIPTION,
  keywords: [
    "aegis",
    "aegis platform",
    "secret detection",
    "secret scanning",
    "leaked secrets",
    "DevSecOps",
    "git secret scanner",
    "API key leak detection",
    "credential security",
    "GitHub secret scanning",
    "open source security",
    "incident response",
    "security dashboard",
    "devsecops platform",
    "SAST",
    "security automation",
  ],
  authors: [{ name: "Aegis Engineering", url: SITE_URL }],
  creator: "Aegis",
  publisher: "Aegis",
  category: "Technology",
  applicationName: SITE_NAME,
  referrer: "origin-when-cross-origin",
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: {
      index: true,
      follow: true,
      noimageindex: false,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: TITLE,
    description: DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Aegis — Secret Detection & DevSecOps Security Platform",
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
    creator: "@aegis_security",
    site: "@aegis_security",
  },
  alternates: {
    canonical: SITE_URL,
  },
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.svg",
  },
  manifest: "/manifest.json",
  verification: {
    // Add your Google Search Console verification token here after claiming the property
    // google: "YOUR_GOOGLE_VERIFICATION_TOKEN",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-heading font-sans antialiased">
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
