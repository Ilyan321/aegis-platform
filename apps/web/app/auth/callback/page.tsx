"use client";

import React, { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { setStoredToken } from "@/lib/api";

function CallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");
    const refreshToken = searchParams.get("refresh_token");
    const error = searchParams.get("error");

    if (error) {
      router.replace(`/login?error=${encodeURIComponent(error)}`);
      return;
    }

    if (token) {
      setStoredToken(token, refreshToken || undefined);
      // Remove tokens from browser navigation history to prevent leakage
      if (typeof window !== "undefined" && window.history?.replaceState) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      // Hard reload to root so all telemetry and AuthContext immediately re-evaluate with the new bearer token
      window.location.href = "/";
    } else {
      router.replace("/login");
    }
  }, [searchParams, router]);

  return (
    <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm bg-surface border border-subtle rounded-2xl p-8 text-center flex flex-col items-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-canvas border border-subtle flex items-center justify-center text-primary mb-4 animate-pulse">
          <svg
            className="w-6 h-6 text-primary"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
        </div>
        <h2 className="text-sm font-semibold text-heading tracking-tight mb-1">
          Authenticating Operator
        </h2>
        <p className="text-xs text-muted">
          Establishing encrypted session with Aegis control plane...
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <CallbackHandler />
    </Suspense>
  );
}
