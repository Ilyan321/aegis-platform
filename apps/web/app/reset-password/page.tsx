"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, KeyRound, Eye, EyeOff, CheckCircle2, ShieldAlert } from "lucide-react";
import { forgotPassword, resetPassword } from "@/lib/api";

function ResetPasswordForm() {
  const searchParams = useSearchParams();

  const [token, setToken] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isResetComplete, setIsResetComplete] = useState(false);

  useEffect(() => {
    const t = searchParams.get("token");
    if (t) {
      setToken(t);
    }
  }, [searchParams]);

  // Request Reset Link Mode
  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setError("Please enter your work email address.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await forgotPassword(email.trim());
      setSuccessMessage(
        res.message ||
          "If an account exists with this email, a password reset link has been dispatched."
      );
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to request password reset. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Perform Password Reset Mode
  const handlePerformReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter your password.");
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await resetPassword(token, newPassword);
      setSuccessMessage(
        res.message || "Password successfully updated. You may now log in."
      );
      setIsResetComplete(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Invalid or expired reset token. Please request a new link.");
      }
    } finally {
      setLoading(false);
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
            <KeyRound className="w-5 h-5 text-heading" />
          </div>
          <h1 className="text-xl font-semibold text-heading tracking-tight">
            {token ? "Set new password" : "Reset your password"}
          </h1>
          <p className="text-xs text-muted mt-1.5 max-w-xs leading-relaxed">
            {token
              ? "Choose a strong password with at least 8 characters to secure your account."
              : "Enter your verified work email and we'll send you a single-use recovery link."}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 bg-canvas border border-red-500/30 text-red-500 text-xs rounded-xl p-3.5 text-center flex items-center justify-center space-x-2">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Success / Completed State */}
        {isResetComplete ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-muted leading-relaxed">
              Your password has been securely updated. All active sessions have been invalidated.
            </p>
            <Link
              href="/login"
              className="w-full inline-flex justify-center py-2.5 px-4 bg-primary text-primary-fg hover:opacity-90 rounded-xl text-xs font-medium transition-all shadow-sm"
            >
              Sign In with New Password
            </Link>
          </div>
        ) : successMessage && !token ? (
          <div className="text-center space-y-4">
            <div className="w-12 h-12 mx-auto rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-xs text-muted leading-relaxed">{successMessage}</p>
            <Link
              href="/login"
              className="w-full inline-flex justify-center py-2.5 px-4 bg-primary text-primary-fg hover:opacity-90 rounded-xl text-xs font-medium transition-all shadow-sm"
            >
              Return to Sign In
            </Link>
          </div>
        ) : token ? (
          /* Form: Set New Password */
          <form onSubmit={handlePerformReset} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-heading block mb-1.5">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-canvas/40 border border-subtle rounded-xl text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive transition-all pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-heading block mb-1.5">
                Confirm New Password
              </label>
              <input
                type={showPassword ? "text" : "password"}
                required
                autoComplete="new-password"
                placeholder="Repeat new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-canvas/40 border border-subtle rounded-xl text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary text-primary-fg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-medium transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-fg/20 border-t-primary-fg rounded-full animate-spin" />
              ) : (
                <span>Update Password</span>
              )}
            </button>
          </form>
        ) : (
          /* Form: Request Reset Link */
          <form onSubmit={handleRequestReset} className="space-y-4">
            <div>
              <label className="text-xs font-medium text-heading block mb-1.5">
                Work Email
              </label>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="operator@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-canvas/40 border border-subtle rounded-xl text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-primary text-primary-fg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl text-xs font-medium transition-all shadow-sm flex items-center justify-center space-x-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-primary-fg/20 border-t-primary-fg rounded-full animate-spin" />
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-subtle border-t-heading rounded-full animate-spin" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
