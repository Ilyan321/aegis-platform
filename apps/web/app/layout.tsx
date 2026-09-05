import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Aegis Platform — Unified Credential Security Control Plane",
  description: "Cloud-native control plane and orchestration fabric for the Aegis security ecosystem",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-[#09090b] text-[#f4f4f5] font-sans antialiased selection:bg-rose-500/20 selection:text-rose-200">
        {children}
      </body>
    </html>
  );
}
