"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, RefreshCw, Mail } from "lucide-react";
import { verifyEmail, resendOtp } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const [email, setEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(60);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    const qEmail = searchParams.get("email");
    if (qEmail) {
      setEmail(qEmail);
    }
  }, [searchParams]);

  // Focus first input on mount
  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  // 60-second countdown for resend button
  useEffect(() => {
    if (cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleDigitChange = (index: number, val: string) => {
    const clean = val.replace(/\D/g, "");
    if (!clean) {
      const updated = [...digits];
      updated[index] = "";
      setDigits(updated);
      return;
    }

    // Handle single digit
    const char = clean.slice(-1);
    const updated = [...digits];
    updated[index] = char;
    setDigits(updated);
    setError(null);

    // Auto-advance
    if (index < 5) {
      inputRefs.current[index + 1]?.focus();
    } else {
      // All filled
      const fullOtp = updated.join("");
      if (fullOtp.length === 6) {
        submitOtp(fullOtp);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const updated = [...digits];
    for (let i = 0; i < pastedData.length; i++) {
      updated[i] = pastedData[i];
    }
    setDigits(updated);
    setError(null);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    if (pastedData.length === 6) {
      submitOtp(pastedData);
    }
  };

  const submitOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || digits.join("");
    if (code.length !== 6) {
      setError("Please enter all 6 digits of your verification code.");
      return;
    }
    if (!email.trim()) {
      setError("Email address is required for verification.");
      return;
    }

    setError(null);
    setInfoMessage(null);
    setLoading(true);

    try {
      await verifyEmail(email.trim(), code);
      await refreshUser();
      setInfoMessage("Email verified successfully. Accessing your workspace...");
      setTimeout(() => {
        router.push("/");
      }, 800);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid or expired verification code.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    if (!email.trim()) {
      setError("Please specify your email address to resend the code.");
      return;
    }

    setError(null);
    setResending(true);

    try {
      const res = await resendOtp(email.trim());
      setInfoMessage(res.message || "A new 6-digit verification code has been dispatched.");
      setCooldown(60);
      setDigits(["", "", "", "", "", ""]);
      inputRefs.current[0]?.focus();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to resend code. Please try again later.");
      }
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-canvas flex flex-col justify-center items-center p-4 selection:bg-subtle selection:text-heading">
      {/* Back Link */}
      <div className="w-full max-w-md mb-6">
        <Link
          href="/login"
          className="inline-flex items-center space-x-1.5 text-xs text-muted hover:text-heading transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Sign In</span>
        </Link>
      </div>

      {/* Solid Apple-Crafted Auth Card */}
      <div className="w-full max-w-md bg-surface border border-subtle rounded-2xl p-8 sm:p-10 shadow-sm">
        {/* Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-10 h-10 rounded-xl bg-canvas border border-subtle flex items-center justify-center text-primary mb-3">
            <Mail className="w-5 h-5 text-heading" />
          </div>
          <h1 className="text-xl font-semibold text-heading tracking-tight">
            Check your inbox
          </h1>
          <p className="text-xs text-muted mt-1.5 max-w-xs leading-relaxed">
            We sent a 6-digit confirmation code to{" "}
            <span className="text-heading font-medium">{email || "your email address"}</span>. Enter the code below to confirm your account.
          </p>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mb-6 bg-canvas border border-red-500/30 text-red-500 text-xs rounded-xl p-3.5 text-center">
            {error}
          </div>
        )}

        {infoMessage && (
          <div className="mb-6 bg-canvas border border-emerald-500/30 text-emerald-500 text-xs rounded-xl p-3.5 text-center">
            {infoMessage}
          </div>
        )}

        {/* 6-box Segmented OTP Input */}
        <div className="mb-8">
          <div className="flex justify-between items-center gap-2">
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => {
                  inputRefs.current[idx] = el;
                }}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={idx === 0 ? handlePaste : undefined}
                className="w-12 h-14 text-center text-2xl font-semibold font-mono bg-canvas/60 border border-subtle rounded-xl text-heading focus:outline-none focus:ring-2 focus:ring-interactive focus:border-interactive transition-all"
                disabled={loading}
              />
            ))}
          </div>
        </div>

        {/* Submit Button */}
        <button
          onClick={() => submitOtp()}
          disabled={loading || digits.join("").length !== 6}
          className="w-full py-2.5 px-4 bg-primary text-primary-fg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-medium transition-all shadow-sm flex items-center justify-center space-x-2"
        >
          {loading ? (
            <div className="w-4 h-4 border-2 border-primary-fg/20 border-t-primary-fg rounded-full animate-spin" />
          ) : (
            <span>Verify & Continue</span>
          )}
        </button>

        {/* Resend Cooldown Footer */}
        <div className="mt-6 pt-6 border-t border-subtle flex items-center justify-between text-xs">
          <span className="text-muted">Didn&apos;t receive the email?</span>
          {cooldown > 0 ? (
            <span className="text-muted font-mono text-[11px]">
              Resend code in {cooldown}s
            </span>
          ) : (
            <button
              type="button"
              onClick={handleResend}
              disabled={resending}
              className="inline-flex items-center space-x-1 text-heading hover:text-interactive font-medium transition-colors"
            >
              {resending ? (
                <RefreshCw className="w-3 h-3 animate-spin" />
              ) : (
                <span>Resend Code</span>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-subtle border-t-heading rounded-full animate-spin" />
        </div>
      }
    >
      <VerifyEmailForm />
    </Suspense>
  );
}
