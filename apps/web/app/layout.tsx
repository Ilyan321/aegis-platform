import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aegis Platform — Unified Credential Security Mesh",
  description: "Enterprise control plane and automated secret lifecycle orchestration for the Aegis ecosystem.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-canvas text-heading font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
