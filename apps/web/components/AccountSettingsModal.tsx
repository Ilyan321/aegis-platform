"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  User,
  KeyRound,
  Shield,
  Check,
  AlertCircle,
  Loader2,
  Copy,
  LogOut,
  ShieldAlert,
  Eye,
  EyeOff,
  Building,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { updateUserProfile, changePassword, revokeAllSessions } from "@/lib/api";

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  const { user, refreshUser, logout } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // Profile State
  const [fullName, setFullName] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Security State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Session Revocation State
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize data on open
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMessage(null);
      setConfirmRevoke(false);
    }
  }, [isOpen, user]);

  // Keyboard dismiss (Escape)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  // Password strength calculation
  const hasMinLength = newPassword.length >= 8;
  const hasMixedCase = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword);
  const hasNumber = /[0-9]/.test(newPassword);
  const hasSpecial = /[^a-zA-Z0-9]/.test(newPassword);
  const passedCriteria = [hasMinLength, hasMixedCase, hasNumber, hasSpecial].filter(Boolean).length;

  const strengthLabels = ["Weak", "Fair", "Good", "Strong"];
  const strengthColor =
    passedCriteria <= 1
      ? "bg-rose-500"
      : passedCriteria === 2
      ? "bg-amber-500"
      : passedCriteria === 3
      ? "bg-teal-500"
      : "bg-emerald-600";

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMessage(null);

    try {
      await updateUserProfile({ full_name: fullName.trim() || undefined });
      await refreshUser();
      toast({
        type: "success",
        title: "Profile Updated",
        description: "Your display identity has been successfully refreshed.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setErrorMessage(msg);
      toast({
        type: "error",
        title: "Update Failed",
        description: msg,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (newPassword.length < 8) {
      setErrorMessage("New password must be at least 8 characters long.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage("New password and confirmation do not match.");
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      await refreshUser();
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        type: "success",
        title: "Password Updated",
        description: "Your master password has been changed and all other sessions invalidated.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update password";
      setErrorMessage(msg);
      toast({
        type: "error",
        title: "Password Change Failed",
        description: msg,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeAllSessions = async () => {
    setRevokingSessions(true);
    setErrorMessage(null);
    try {
      await revokeAllSessions();
      toast({
        type: "success",
        title: "Sessions Revoked",
        description: "All active sessions terminated globally. Signing out of this device...",
      });
      setTimeout(() => {
        logout();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke active sessions";
      setErrorMessage(msg);
      toast({
        type: "error",
        title: "Revocation Failed",
        description: msg,
      });
      setRevokingSessions(false);
    }
  };

  const initials = (user.full_name?.[0] || user.email[0] || "U").toUpperCase();
  const createdDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : "Active";

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/40 backdrop-blur-xs cursor-pointer animate-in fade-in duration-150"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-settings-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden shadow-modal flex flex-col cursor-default"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-subtle bg-canvas shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary shadow-xs">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 id="account-settings-title" className="font-semibold text-heading text-base">
                Account & Security
              </h3>
              <p className="text-xs text-muted">Manage your profile, credentials, and active sessions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-surface hover:bg-subtle border border-subtle flex items-center justify-center text-muted hover:text-heading transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Apple Segmented Switcher */}
        <div className="px-5 pt-4 bg-surface shrink-0">
          <div className="grid grid-cols-2 p-1 bg-canvas border border-subtle rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setActiveTab("profile");
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center space-x-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-surface text-heading shadow-xs font-semibold"
                  : "text-muted hover:text-heading"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Profile & Identity</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("security");
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center space-x-2 py-1.5 rounded-lg transition-all cursor-pointer ${
                activeTab === "security"
                  ? "bg-surface text-heading shadow-xs font-semibold"
                  : "text-muted hover:text-heading"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Credentials & Security</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {errorMessage && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl p-3 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: PROFILE & IDENTITY */}
          {activeTab === "profile" && (
            <div className="space-y-5">
              {/* Identity Banner */}
              <div className="flex items-center space-x-4 p-4 rounded-xl bg-canvas border border-subtle">
                <div className="relative">
                  <div className="w-12 h-12 rounded-full bg-surface border border-subtle text-primary font-bold text-base flex items-center justify-center shadow-xs">
                    {initials}
                  </div>
                  <span
                    className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-surface ${
                      user.is_verified ? "bg-emerald-500" : "bg-amber-500"
                    }`}
                    title={user.is_verified ? "Verified Account" : "Unverified Email"}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-semibold text-heading text-sm truncate">
                      {user.full_name || "Operator"}
                    </h4>
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface border border-subtle text-muted">
                      {user.provider}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate">{user.email}</p>
                </div>
              </div>

              {/* Edit Display Name Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="space-y-1.5">
                  <label htmlFor="display-name" className="text-xs font-medium text-heading">
                    Display Name
                  </label>
                  <input
                    id="display-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Satoshi Nakamoto"
                    className="w-full text-xs bg-canvas border border-subtle rounded-xl px-3.5 py-2.5 text-heading placeholder:text-muted focus:outline-none focus:border-interactive transition-colors"
                  />
                  <p className="text-[11px] text-muted">
                    This name is shown across security incident reports, scan logs, and workspace activities.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-heading flex items-center justify-between">
                    <span>Email Address</span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                        user.is_verified
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/50"
                          : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/50"
                      }`}
                    >
                      {user.is_verified ? "Verified" : "Verification Pending"}
                    </span>
                  </label>
                  <input
                    type="email"
                    readOnly
                    value={user.email}
                    className="w-full text-xs bg-canvas/50 border border-subtle rounded-xl px-3.5 py-2.5 text-muted cursor-not-allowed select-all"
                  />
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingProfile}
                    className="flex items-center space-x-2 text-xs font-medium bg-primary hover:bg-heading text-white px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {savingProfile ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Save Profile</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Account Metadata List */}
              <div className="border-t border-subtle pt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-muted">
                  <span className="flex items-center space-x-2">
                    <Building className="w-3.5 h-3.5" />
                    <span>Workspace Organization</span>
                  </span>
                  <span className="font-medium text-heading">
                    {user.organization_id ? user.organization_id.slice(0, 8) + "..." : "Default Workspace"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted">
                  <span className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Member Since</span>
                  </span>
                  <span className="font-medium text-heading">{createdDate}</span>
                </div>

                <div className="flex items-center justify-between text-muted">
                  <span className="flex items-center space-x-2">
                    <Shield className="w-3.5 h-3.5" />
                    <span>User Identifier</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="flex items-center space-x-1.5 font-mono text-[11px] text-primary hover:text-heading bg-canvas border border-subtle px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    title="Click to copy ID"
                  >
                    <span>{user.id.slice(0, 12)}...</span>
                    {copiedId ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREDENTIALS & SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Master Password Section */}
              {user.provider === "local" ? (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div>
                    <h4 className="text-xs font-semibold text-heading">Change Password</h4>
                    <p className="text-[11px] text-muted">
                      Update your password. Other active sessions will be revoked automatically.
                    </p>
                  </div>

                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="current-pass" className="text-xs font-medium text-heading">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        id="current-pass"
                        type={showCurrentPass ? "text" : "password"}
                        required
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full text-xs bg-canvas border border-subtle rounded-xl pl-3.5 pr-10 py-2.5 text-heading placeholder:text-muted focus:outline-none focus:border-interactive transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading"
                        aria-label={showCurrentPass ? "Hide password" : "Show password"}
                      >
                        {showCurrentPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="new-pass" className="text-xs font-medium text-heading">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        id="new-pass"
                        type={showNewPass ? "text" : "password"}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="w-full text-xs bg-canvas border border-subtle rounded-xl pl-3.5 pr-10 py-2.5 text-heading placeholder:text-muted focus:outline-none focus:border-interactive transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading"
                        aria-label={showNewPass ? "Hide password" : "Show password"}
                      >
                        {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    {newPassword && (
                      <div className="pt-2 space-y-1.5 animate-in fade-in duration-150">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-muted">Strength:</span>
                          <span className="font-semibold text-heading">
                            {strengthLabels[passedCriteria - 1] || "Very Weak"}
                          </span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5 h-1">
                          {[0, 1, 2, 3].map((idx) => (
                            <div
                              key={idx}
                              className={`h-full rounded-full transition-colors ${
                                idx < passedCriteria ? strengthColor : "bg-subtle"
                              }`}
                            />
                          ))}
                        </div>
                        <div className="grid grid-cols-2 gap-1 text-[10px] text-muted pt-1">
                          <span className={hasMinLength ? "text-emerald-600 dark:text-emerald-400" : ""}>
                            {hasMinLength ? "✓" : "•"} 8+ characters
                          </span>
                          <span className={hasMixedCase ? "text-emerald-600 dark:text-emerald-400" : ""}>
                            {hasMixedCase ? "✓" : "•"} Upper & lower case
                          </span>
                          <span className={hasNumber ? "text-emerald-600 dark:text-emerald-400" : ""}>
                            {hasNumber ? "✓" : "•"} Includes number
                          </span>
                          <span className={hasSpecial ? "text-emerald-600 dark:text-emerald-400" : ""}>
                            {hasSpecial ? "✓" : "•"} Special character
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Confirm Password */}
                  <div className="space-y-1.5">
                    <label htmlFor="confirm-pass" className="text-xs font-medium text-heading">
                      Confirm New Password
                    </label>
                    <input
                      id="confirm-pass"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                      className="w-full text-xs bg-canvas border border-subtle rounded-xl px-3.5 py-2.5 text-heading placeholder:text-muted focus:outline-none focus:border-interactive transition-colors"
                    />
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[11px] text-rose-600">Passwords do not match</p>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={changingPassword || !currentPassword || !newPassword || newPassword !== confirmPassword}
                      className="flex items-center space-x-2 text-xs font-medium bg-primary hover:bg-heading text-white px-4 py-2 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {changingPassword ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="p-4 rounded-xl bg-canvas border border-subtle text-xs space-y-1.5">
                  <h4 className="font-semibold text-heading">OAuth Single Sign-On</h4>
                  <p className="text-muted">
                    Your account is authenticated via GitHub OAuth. Master password updates are managed directly within your GitHub security settings.
                  </p>
                </div>
              )}

              {/* Global Session Revocation Kill-Switch */}
              <div className="border-t border-subtle pt-5 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-heading flex items-center space-x-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                    <span>Session Security & Kill-Switch</span>
                  </h4>
                  <p className="text-[11px] text-muted mt-0.5">
                    Terminate all active sessions, refresh tokens, and authorized browsers immediately across all devices.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/50 dark:bg-rose-950/20 space-y-3">
                  <div className="text-xs text-rose-800 dark:text-rose-200 leading-relaxed">
                    If you suspect unauthorized activity or misplaced an active device, this action revokes all cryptographic tokens issued to your account. You will need to log in again on all devices.
                  </div>

                  {confirmRevoke ? (
                    <div className="space-y-2 pt-1">
                      <p className="text-xs font-semibold text-rose-700 dark:text-rose-300">
                        Are you sure? You will be signed out everywhere immediately.
                      </p>
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={handleRevokeAllSessions}
                          disabled={revokingSessions}
                          className="flex items-center space-x-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white px-3.5 py-1.5 rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                        >
                          {revokingSessions ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Revoking...</span>
                            </>
                          ) : (
                            <>
                              <LogOut className="w-3.5 h-3.5" />
                              <span>Confirm & Revoke All</span>
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRevoke(false)}
                          disabled={revokingSessions}
                          className="text-xs text-muted hover:text-heading px-3 py-1.5 rounded-lg bg-surface border border-subtle transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmRevoke(true)}
                      className="flex items-center space-x-2 text-xs font-medium text-rose-700 dark:text-rose-300 bg-surface hover:bg-rose-100/50 dark:hover:bg-rose-900/40 border border-rose-300 dark:border-rose-800/80 px-3.5 py-2 rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Revoke All Sessions & Sign Out Everywhere</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
