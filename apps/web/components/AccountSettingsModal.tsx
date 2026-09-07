"use client";

import React, { useState, useEffect, useRef } from "react";
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
  ExternalLink,
  Trash2,
  Camera,
  Upload,
  Sparkles,
  Link2,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import {
  updateUserProfile,
  changePassword,
  revokeAllSessions,
  deleteUserAccount,
  unlinkGitHub,
  getOAuthUrl,
} from "@/lib/api";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";

const AVATAR_PRESETS = [
  { id: "sentinel", label: "Sentinel", url: "https://api.dicebear.com/7.x/bottts/svg?seed=AegisSentinel&backgroundColor=b6e3f4,c0aede,d1d4f9" },
  { id: "operator", label: "Cyber", url: "https://api.dicebear.com/7.x/bottts/svg?seed=CyberOperator&backgroundColor=b6e3f4,ffd5dc,ffdfbf" },
  { id: "matrix", label: "Matrix", url: "https://api.dicebear.com/7.x/identicon/svg?seed=MatrixCore&backgroundColor=c0aede,d1d4f9" },
  { id: "shield", label: "Shield", url: "https://api.dicebear.com/7.x/shapes/svg?seed=ShieldDefense&backgroundColor=b6e3f4" },
  { id: "quantum", label: "Quantum", url: "https://api.dicebear.com/7.x/bottts/svg?seed=QuantumDev&backgroundColor=ffd5dc,ffdfbf" },
];

function GitHubIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

interface AccountSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountSettingsModal({ isOpen, onClose }: AccountSettingsModalProps) {
  useBodyScrollLock(isOpen);
  const { user, refreshUser, logout } = useAuth();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"profile" | "security">("profile");

  // Profile State
  const [fullName, setFullName] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [unlinkingGithub, setUnlinkingGithub] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [customUrlMode, setCustomUrlMode] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Account Deletion State
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // Status feedback
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize data on open
  useEffect(() => {
    if (isOpen && user) {
      setFullName(user.full_name || "");
      setGithubUsername(user.github_username || "");
      setAvatarUrl(user.avatar_url || "");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setErrorMessage(null);
      setConfirmRevoke(false);
      setConfirmDelete(false);
      setDeleteConfirmInput("");
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        type: "error",
        title: "Invalid File Type",
        description: "Please select an image file (PNG, JPG, WebP, GIF).",
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        type: "error",
        title: "File Too Large",
        description: "Avatar images must be smaller than 5MB.",
      });
      return;
    }

    setProcessingImage(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          const size = 256;
          canvas.width = size;
          canvas.height = size;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            const minDim = Math.min(img.width, img.height);
            const sx = (img.width - minDim) / 2;
            const sy = (img.height - minDim) / 2;
            ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
            const dataUrl = canvas.toDataURL("image/webp", 0.88);
            setAvatarUrl(dataUrl);
            toast({
              type: "success",
              title: "Photo Loaded",
              description: "Click 'Save Changes' to update your account avatar.",
            });
          }
        } catch {
          // Fallback to raw data url if canvas security or context fails
          const rawUrl = event.target?.result as string;
          if (rawUrl) setAvatarUrl(rawUrl);
        } finally {
          setProcessingImage(false);
        }
      };
      img.onerror = () => {
        setProcessingImage(false);
        toast({
          type: "error",
          title: "Image Error",
          description: "Could not decode the selected image.",
        });
      };
      img.src = event.target?.result as string;
    };
    reader.onerror = () => {
      setProcessingImage(false);
      toast({
        type: "error",
        title: "Read Error",
        description: "Could not read the selected image file.",
      });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl("");
    toast({
      type: "info",
      title: "Avatar Reset",
      description: "Reverted to vector initials badge. Click 'Save Changes' to apply.",
    });
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setErrorMessage(null);

    try {
      await updateUserProfile({
        full_name: fullName.trim() || null,
        github_username: githubUsername.trim() || null,
        avatar_url: avatarUrl.trim() || null,
      });
      await refreshUser();
      toast({
        type: "success",
        title: "Profile Updated",
        description: "Your display identity and developer handle have been refreshed.",
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

  const handleUnlinkGithub = async () => {
    setUnlinkingGithub(true);
    setErrorMessage(null);
    try {
      await unlinkGitHub();
      await refreshUser();
      setGithubUsername("");
      toast({
        type: "info",
        title: "GitHub Unlinked",
        description: "GitHub connection has been cleared from your profile.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unlink GitHub";
      setErrorMessage(msg);
      toast({
        type: "error",
        title: "Unlink Failed",
        description: msg,
      });
    } finally {
      setUnlinkingGithub(false);
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

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput.trim() !== "DELETE") {
      setErrorMessage("Please type DELETE in uppercase to confirm permanent account removal.");
      return;
    }
    setDeletingAccount(true);
    setErrorMessage(null);
    try {
      await deleteUserAccount();
      toast({
        type: "info",
        title: "Account Purged",
        description: "Your account and all workspace data have been permanently removed.",
      });
      setTimeout(() => {
        logout();
        window.location.href = "/signup";
      }, 800);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      setErrorMessage(msg);
      toast({
        type: "error",
        title: "Deletion Failed",
        description: msg,
      });
      setDeletingAccount(false);
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/50 backdrop-blur-xs cursor-pointer animate-in fade-in duration-150 overscroll-contain"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-settings-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-modal flex flex-col cursor-default overscroll-contain"
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
        <div className="px-6 pt-4 bg-surface shrink-0">
          <div className="grid grid-cols-2 p-1 bg-canvas border border-subtle rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => {
                setActiveTab("profile");
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === "profile"
                  ? "bg-surface text-heading shadow-xs font-semibold"
                  : "text-muted hover:text-heading"
              }`}
            >
              <User className="w-3.5 h-3.5 text-primary" />
              <span>Profile & Identity</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab("security");
                setErrorMessage(null);
              }}
              className={`flex items-center justify-center space-x-2 py-2 rounded-lg transition-all cursor-pointer ${
                activeTab === "security"
                  ? "bg-surface text-heading shadow-xs font-semibold"
                  : "text-muted hover:text-heading"
              }`}
            >
              <KeyRound className="w-3.5 h-3.5 text-primary" />
              <span>Credentials & Security</span>
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto overscroll-contain space-y-5 flex-1">
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl p-3.5 flex items-start space-x-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* TAB 1: PROFILE & IDENTITY */}
          {activeTab === "profile" && (
            <div className="space-y-5">
              {/* Profile Photo & Identity Card */}
              <div className="p-4 rounded-xl bg-canvas border border-subtle space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  {/* Interactive Avatar Circle with Hover Overlay */}
                  <div className="relative group shrink-0 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={processingImage}
                      className="w-16 h-16 rounded-full bg-surface border-2 border-subtle text-primary font-bold text-lg flex items-center justify-center shadow-xs overflow-hidden cursor-pointer relative focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 transition-all hover:border-interactive group"
                      title="Click to upload profile picture"
                    >
                      {processingImage ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      ) : avatarUrl.trim() || user.avatar_url ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={avatarUrl.trim() || user.avatar_url || ""}
                          alt={fullName || user.full_name || user.email}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        initials
                      )}
                      {/* Hover Overlay */}
                      <div className="absolute inset-0 bg-heading/65 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white">
                        <Camera className="w-4 h-4" />
                        <span className="text-[9px] font-medium mt-0.5">Upload</span>
                      </div>
                    </button>
                    <span
                      className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-surface ${
                        user.is_verified ? "bg-emerald-500" : "bg-amber-500"
                      }`}
                      title={user.is_verified ? "Verified Account" : "Unverified Email"}
                    />
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {/* Photo Actions & User Info */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-heading text-sm truncate">
                        {user.full_name || "Operator"}
                      </h4>
                      <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-surface border border-subtle text-muted">
                        {user.provider}
                      </span>
                      {user.is_verified && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300">
                          Verified
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={processingImage}
                        className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-surface border border-subtle hover:border-interactive text-heading hover:bg-canvas shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5 text-primary" />
                        <span>Upload Photo</span>
                      </button>

                      {(avatarUrl || user.avatar_url) && (
                        <button
                          type="button"
                          onClick={handleRemoveAvatar}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:text-rose-700 bg-surface border border-rose-200 hover:bg-rose-50 transition-colors flex items-center space-x-1 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Remove</span>
                        </button>
                      )}

                      {user.github_username && (
                        <button
                          type="button"
                          onClick={() => {
                            setAvatarUrl(`https://github.com/${user.github_username}.png`);
                            toast({
                              type: "info",
                              title: "GitHub Photo Selected",
                              description: "Click 'Save Changes' to apply your GitHub avatar.",
                            });
                          }}
                          className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-heading bg-surface border border-subtle hover:bg-canvas transition-colors flex items-center space-x-1.5 cursor-pointer"
                        >
                          <GitHubIcon className="w-3.5 h-3.5" />
                          <span>Use GitHub Photo</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Avatar Presets & Custom URL Toggle */}
                <div className="pt-3 border-t border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-[11px] font-medium text-muted flex items-center space-x-1">
                      <Sparkles className="w-3 h-3 text-primary" />
                      <span>Presets:</span>
                    </span>
                    <div className="flex items-center space-x-1.5">
                      {AVATAR_PRESETS.map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => {
                            setAvatarUrl(preset.url);
                            toast({
                              type: "info",
                              title: `${preset.label} Avatar Selected`,
                              description: "Click 'Save Changes' to update your profile.",
                            });
                          }}
                          className="w-6 h-6 rounded-full border border-subtle hover:border-interactive overflow-hidden bg-surface transition-transform hover:scale-110 cursor-pointer shadow-2xs"
                          title={`Use ${preset.label} avatar`}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={preset.url} alt={preset.label} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setCustomUrlMode(!customUrlMode)}
                    className="text-[11px] text-primary hover:underline flex items-center space-x-1 self-start sm:self-auto cursor-pointer"
                  >
                    <Link2 className="w-3 h-3" />
                    <span>{customUrlMode ? "Hide image link" : "Or use image link"}</span>
                  </button>
                </div>

                {/* Collapsible Custom URL Input */}
                {customUrlMode && (
                  <div className="pt-2 animate-in fade-in duration-150 space-y-1">
                    <label htmlFor="avatar-url" className="text-[11px] font-medium text-heading">
                      Custom Image URL
                    </label>
                    <input
                      id="avatar-url"
                      type="url"
                      value={avatarUrl}
                      onChange={(e) => setAvatarUrl(e.target.value)}
                      placeholder="https://example.com/avatar.png"
                      className="w-full text-xs bg-surface border border-subtle rounded-xl px-3 py-2 text-heading placeholder:text-muted focus:outline-none focus:border-primary transition-colors font-mono"
                    />
                  </div>
                )}
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
                    className="w-full text-xs bg-canvas border border-subtle rounded-xl px-3.5 py-2.5 text-heading placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                  />
                  <p className="text-[11px] text-muted">
                    This name is shown across security incident reports, scan logs, and workspace activities.
                  </p>
                </div>

                {/* GitHub & VCS Handle Verification */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-medium text-heading flex items-center justify-between">
                    <span className="flex items-center space-x-1.5">
                      <GitHubIcon className="w-3.5 h-3.5" />
                      <span>GitHub Identity & Committer Handle</span>
                    </span>
                    {user.github_username ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-300 flex items-center space-x-1">
                        <Check className="w-3 h-3" />
                        <span>Verified Handle</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-muted">Unlinked</span>
                    )}
                  </label>

                  {user.github_username ? (
                    <div className="p-3.5 bg-canvas border border-subtle rounded-xl flex items-center justify-between gap-3">
                      <div className="flex items-center space-x-2.5 min-w-0">
                        <GitHubIcon className="w-4 h-4 text-heading shrink-0" />
                        <div className="min-w-0">
                          <a
                            href={`https://github.com/${user.github_username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-mono text-xs font-semibold text-primary hover:underline flex items-center space-x-1"
                          >
                            <span>@{user.github_username}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                          <span className="text-[10px] text-muted block truncate">
                            Cryptographically linked and verified via GitHub
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={unlinkingGithub}
                        onClick={handleUnlinkGithub}
                        className="text-xs font-medium text-rose-700 hover:text-rose-800 px-3 py-1.5 rounded-lg border border-rose-200 hover:border-rose-300 bg-surface hover:bg-rose-50 transition-colors cursor-pointer shrink-0"
                        title="Unlink GitHub handle"
                      >
                        {unlinkingGithub ? "Unlinking..." : "Unlink"}
                      </button>
                    </div>
                  ) : (
                    <div className="p-4 bg-canvas border border-subtle rounded-xl space-y-3">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-heading shrink-0 mt-0.5">
                          <GitHubIcon className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-semibold text-heading block">
                            Cryptographic GitHub Proof-of-Ownership
                          </span>
                          <span className="text-[11px] text-muted leading-relaxed block">
                            Authenticate with GitHub to verify repository ownership, enable live commit attribution, and sync your developer identity.
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1 border-t border-subtle">
                        <span className="text-[10px] text-muted font-mono">
                          OAuth2 Zero-Trust Challenge
                        </span>
                        <a
                          href={getOAuthUrl("github", "login")}
                          className="inline-flex items-center justify-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold bg-heading text-surface hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                        >
                          <GitHubIcon className="w-3.5 h-3.5" />
                          <span>Verify & Link GitHub</span>
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="text-xs font-medium text-heading flex items-center justify-between">
                    <span>Email Address</span>
                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                        user.is_verified
                          ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                          : "bg-amber-50 text-amber-800 border-amber-300"
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
                    className="flex items-center space-x-2 text-xs font-semibold bg-primary hover:bg-heading text-surface px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
                    <Building className="w-3.5 h-3.5 text-primary" />
                    <span>Workspace Organization</span>
                  </span>
                  <span className="font-medium text-heading">
                    {user.organization_id ? user.organization_id.slice(0, 8) + "..." : "Default Workspace"}
                  </span>
                </div>

                <div className="flex items-center justify-between text-muted">
                  <span className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    <span>Member Since</span>
                  </span>
                  <span className="font-medium text-heading">{createdDate}</span>
                </div>

                <div className="flex items-center justify-between text-muted">
                  <span className="flex items-center space-x-2">
                    <Shield className="w-3.5 h-3.5 text-primary" />
                    <span>User Identifier</span>
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyId}
                    className="flex items-center space-x-1.5 font-mono text-[11px] text-primary hover:text-heading bg-canvas border border-subtle px-2 py-0.5 rounded-lg transition-colors cursor-pointer"
                    title="Click to copy ID"
                  >
                    <span>{user.id.slice(0, 12)}...</span>
                    {copiedId ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CREDENTIALS & SECURITY */}
          {activeTab === "security" && (
            <div className="space-y-6">
              {/* Master Password Section or SSO Banner */}
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
                        className="w-full text-xs bg-canvas border border-subtle rounded-xl pl-3.5 pr-10 py-2.5 text-heading placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPass(!showCurrentPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading cursor-pointer"
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
                        className="w-full text-xs bg-canvas border border-subtle rounded-xl pl-3.5 pr-10 py-2.5 text-heading placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading cursor-pointer"
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
                          <span className={hasMinLength ? "text-emerald-700 font-medium" : ""}>
                            {hasMinLength ? "✓" : "•"} 8+ characters
                          </span>
                          <span className={hasMixedCase ? "text-emerald-700 font-medium" : ""}>
                            {hasMixedCase ? "✓" : "•"} Upper & lower case
                          </span>
                          <span className={hasNumber ? "text-emerald-700 font-medium" : ""}>
                            {hasNumber ? "✓" : "•"} Numbers included
                          </span>
                          <span className={hasSpecial ? "text-emerald-700 font-medium" : ""}>
                            {hasSpecial ? "✓" : "•"} Symbols included
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
                      className="w-full text-xs bg-canvas border border-subtle rounded-xl px-3.5 py-2.5 text-heading placeholder:text-muted focus:outline-none focus:border-primary transition-colors"
                    />
                  </div>

                  <div className="pt-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={changingPassword || !currentPassword || !newPassword}
                      className="flex items-center space-x-2 text-xs font-semibold bg-primary hover:bg-heading text-surface px-4 py-2.5 rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50"
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
                <div className="p-4 rounded-xl bg-canvas border border-subtle space-y-2 text-xs">
                  <div className="flex items-center space-x-2 text-heading font-medium">
                    <Shield className="w-4 h-4 text-primary" />
                    <span>Single Sign-On Managed Account</span>
                  </div>
                  <p className="text-muted leading-relaxed">
                    This account authenticated via{" "}
                    <strong className="text-heading capitalize">{user.provider}</strong>. Password
                    updates are managed directly through your identity provider.
                  </p>
                </div>
              )}

              {/* Global Session Revocation */}
              <div className="border-t border-subtle pt-5 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-rose-700 flex items-center space-x-1.5">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Session Termination Kill-Switch</span>
                  </h4>
                  <p className="text-[11px] text-muted mt-0.5">
                    Revoke all active access tokens and refresh tokens across all browsers and devices.
                  </p>
                </div>

                {!confirmRevoke ? (
                  <button
                    type="button"
                    onClick={() => setConfirmRevoke(true)}
                    className="text-xs font-semibold text-rose-700 bg-surface hover:bg-rose-50 border border-rose-200 hover:border-rose-300 px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center space-x-2 shadow-xs"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Revoke All Active Sessions</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200 space-y-3 animate-in fade-in duration-150">
                    <p className="text-xs text-rose-900 font-semibold">
                      Are you sure? You will be immediately logged out on all devices.
                    </p>
                    <div className="flex items-center space-x-2">
                      <button
                        type="button"
                        disabled={revokingSessions}
                        onClick={handleRevokeAllSessions}
                        className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1.5 shadow-xs"
                      >
                        {revokingSessions ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Revoking...</span>
                          </>
                        ) : (
                          <span>Yes, Revoke Everything</span>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={revokingSessions}
                        onClick={() => setConfirmRevoke(false)}
                        className="text-xs font-medium bg-surface hover:bg-subtle text-muted hover:text-heading border border-subtle px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Danger Zone: Permanent Account & Workspace Deletion */}
              <div className="border-t border-rose-200 pt-5 space-y-3">
                <div>
                  <h4 className="text-xs font-semibold text-rose-700 flex items-center space-x-1.5">
                    <Trash2 className="w-4 h-4" />
                    <span>Danger Zone: Delete Account & Workspace</span>
                  </h4>
                  <p className="text-[11px] text-muted mt-0.5">
                    Permanently purges your account, credentials, all connected repositories, scan runs, incidents, and audit trails from the database.
                  </p>
                </div>

                {!confirmDelete ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(true)}
                    className="text-xs font-semibold text-rose-700 bg-surface hover:bg-rose-50 border border-rose-200 hover:border-rose-300 px-4 py-2 rounded-xl transition-colors cursor-pointer flex items-center space-x-2 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Account & Purge All Data</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-300 space-y-3 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <p className="text-xs text-rose-900 font-semibold">
                        This action cannot be undone. All your data will be permanently wiped.
                      </p>
                      <p className="text-[11px] text-rose-800">
                        Please type <code className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-rose-300 text-rose-800">DELETE</code> to confirm:
                      </p>
                    </div>

                    <input
                      type="text"
                      value={deleteConfirmInput}
                      onChange={(e) => setDeleteConfirmInput(e.target.value)}
                      placeholder="Type DELETE"
                      className="w-full text-xs font-mono bg-white border border-rose-300 rounded-lg px-3.5 py-2 text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 shadow-xs"
                    />

                    <div className="flex items-center space-x-2 pt-1">
                      <button
                        type="button"
                        disabled={deletingAccount || deleteConfirmInput.trim() !== "DELETE"}
                        onClick={handleDeleteAccount}
                        className="text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed flex items-center space-x-1.5 shadow-xs"
                      >
                        {deletingAccount ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Purging Account...</span>
                          </>
                        ) : (
                          <>
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Permanently Purge Everything</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        disabled={deletingAccount}
                        onClick={() => {
                          setConfirmDelete(false);
                          setDeleteConfirmInput("");
                        }}
                        className="text-xs font-medium bg-surface hover:bg-subtle text-muted hover:text-heading border border-subtle px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
