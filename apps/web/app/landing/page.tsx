import type { Metadata } from "next";
import { LandingView } from "@/components/LandingView";

const SITE_URL = "https://aegis-platform.ilyankhan.tech";

export const metadata: Metadata = {
  title: "Aegis — Unified DevSecOps Control Plane & Secret Intercept Platform",
  description:
    "Zero-trust credential lifecycle orchestration and real-time Git push secret interception for modern engineering teams. Sub-35ms webhook throughput, cryptographic blind indexing, and automated incident reconciliation.",
  alternates: {
    canonical: `${SITE_URL}/landing`,
  },
  openGraph: {
    title: "Aegis — Unified DevSecOps Control Plane & Secret Intercept Platform",
    description:
      "Zero-trust credential lifecycle orchestration and real-time Git push secret interception. Sub-35ms webhook throughput with zero plaintext secret storage.",
    url: `${SITE_URL}/landing`,
    images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: "Aegis Platform" }],
  },
};

export default function LandingPage() {
  return <LandingView />;
}
