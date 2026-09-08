"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Shield,
  User,
  KeyRound,
  Bell,
  Terminal,
  ArrowLeft,
  Check,
  Loader2,
  Copy,
  LogOut,
  ExternalLink,
  Trash2,
  Upload,
  Link2,
  Send,
  Eye,
  EyeOff,
  Building,
  CheckCircle2,
  ShieldCheck,
  Download,
  Layers,
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
  fetchWorkspaceSettings,
  updateWorkspaceSettings,
  sendTestAlert,
  fetchCliAuthToken,
  CliTokenResponse,
} from "@/lib/api";

type SettingsTab = "profile" | "security" | "alerts" | "cli";
type TargetOS = "macos" | "linux" | "windows" | "wsl";

const AVATAR_PRESETS = [
  { id: "sentinel", label: "Sentinel", url: "https://api.dicebear.com/7.x/bottts/svg?seed=AegisSentinel&backgroundColor=b6e3f4,c0aede,d1d4f9" },
  { id: "operator", label: "Cyber", url: "https://api.dicebear.com/7.x/bottts/svg?seed=CyberOperator&backgroundColor=b6e3f4,ffd5dc,ffdfbf" },
  { id: "matrix", label: "Matrix", url: "https://api.dicebear.com/7.x/identicon/svg?seed=MatrixCore&backgroundColor=c0aede,d1d4f9" },
  { id: "shield", label: "Shield", url: "https://api.dicebear.com/7.x/shapes/svg?seed=ShieldDefense&backgroundColor=b6e3f4" },
  { id: "quantum", label: "Quantum", url: "https://api.dicebear.com/7.x/bottts/svg?seed=QuantumDev&backgroundColor=ffd5dc,ffdfbf" },
];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading, refreshUser, logout } = useAuth();
  const { toast } = useToast();

  const tabParam = searchParams.get("tab") as SettingsTab | null;
  const [activeTab, setActiveTab] = useState<SettingsTab>(
    tabParam && ["profile", "security", "alerts", "cli"].includes(tabParam)
      ? tabParam
      : "profile"
  );

  // Sync tab with URL parameter
  const handleTabChange = (tab: SettingsTab) => {
    setActiveTab(tab);
    router.replace(`/settings?tab=${tab}`);
  };

  // --- Profile State ---
  const [fullName, setFullName] = useState("");
  const [githubUsername, setGithubUsername] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [unlinkingGithub, setUnlinkingGithub] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [customUrlMode, setCustomUrlMode] = useState(false);
  const [processingImage, setProcessingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Security State ---
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [revokingSessions, setRevokingSessions] = useState(false);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState("");
  const [deletingAccount, setDeletingAccount] = useState(false);

  // --- Alerts State ---
  const [loadingAlerts, setLoadingAlerts] = useState(false);
  const [savingAlerts, setSavingAlerts] = useState(false);
  const [testingSlack, setTestingSlack] = useState(false);
  const [slackUrl, setSlackUrl] = useState("");

  // --- CLI Token State ---
  const [cliTokenData, setCliTokenData] = useState<CliTokenResponse | null>(null);
  const [loadingCliToken, setLoadingCliToken] = useState(false);
  const [copiedCliToken, setCopiedCliToken] = useState(false);
  const [selectedOS, setSelectedOS] = useState<TargetOS>("macos");
  const [showCliToken, setShowCliToken] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  // Initialize profile data
  useEffect(() => {
    if (user) {
      setFullName(user.full_name || "");
      setGithubUsername(user.github_username || "");
      setAvatarUrl(user.avatar_url || "");
    }
  }, [user]);

  // Load alert settings when alerts tab is active
  useEffect(() => {
    if (activeTab === "alerts" && user) {
      setLoadingAlerts(true);
      fetchWorkspaceSettings()
        .then((settings) => {
          setSlackUrl(settings.slack_webhook_url || "");
        })
        .catch((err) => {
          console.error("Failed to load alert settings:", err);
        })
        .finally(() => {
          setLoadingAlerts(false);
        });
    }
  }, [activeTab, user]);

  // Load CLI token when CLI tab is active
  useEffect(() => {
    if (activeTab === "cli" && user) {
      setLoadingCliToken(true);
      fetchCliAuthToken()
        .then(setCliTokenData)
        .catch((err) => {
          console.error("Failed to load CLI auth token:", err);
        })
        .finally(() => {
          setLoadingCliToken(false);
        });
    }
  }, [activeTab, user]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-canvas flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    router.replace("/login");
    return null;
  }

  // Password criteria check
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

  // --- Handlers ---
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
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
        description: "Your workspace profile information has been saved.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      toast({
        type: "error",
        title: "Update Failed",
        description: msg,
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const saveAvatar = async (newAvatarUrl: string | null) => {
    setProcessingImage(true);
    try {
      await updateUserProfile({
        full_name: fullName.trim() || null,
        github_username: githubUsername.trim() || null,
        avatar_url: newAvatarUrl && newAvatarUrl.trim() ? newAvatarUrl.trim() : null,
      });
      setAvatarUrl(newAvatarUrl || "");
      await refreshUser();
      toast({
        type: "success",
        title: newAvatarUrl ? "Avatar Saved" : "Avatar Removed",
        description: newAvatarUrl
          ? "Your profile photo has been updated."
          : "Your custom photo was removed; default avatar restored.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update avatar";
      toast({
        type: "error",
        title: "Update Failed",
        description: msg,
      });
    } finally {
      setProcessingImage(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast({
        type: "error",
        title: "Invalid File Type",
        description: "Please select an image file (PNG, JPG, WebP).",
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
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      if (base64) {
        await saveAvatar(base64);
      }
    };
    reader.onerror = () => {
      setProcessingImage(false);
      toast({
        type: "error",
        title: "Read Error",
        description: "Failed to read image file.",
      });
    };
    reader.readAsDataURL(file);
  };

  const handleUnlinkGitHub = async () => {
    setUnlinkingGithub(true);
    try {
      await unlinkGitHub();
      await refreshUser();
      setGithubUsername("");
      toast({
        type: "success",
        title: "GitHub Unlinked",
        description: "Your GitHub account connection has been removed.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to unlink GitHub";
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
    if (newPassword !== confirmPassword) {
      toast({
        type: "error",
        title: "Passwords Do Not Match",
        description: "New password and confirmation password must match exactly.",
      });
      return;
    }
    if (newPassword.length < 8) {
      toast({
        type: "error",
        title: "Password Too Short",
        description: "Password must be at least 8 characters long.",
      });
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast({
        type: "success",
        title: "Password Changed",
        description: "Your password has been securely updated.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to change password";
      toast({
        type: "error",
        title: "Update Failed",
        description: msg,
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleRevokeSessions = async () => {
    setRevokingSessions(true);
    try {
      await revokeAllSessions();
      toast({
        type: "success",
        title: "Sessions Revoked",
        description: "All active sessions have been terminated. Redirecting to sign in...",
      });
      setTimeout(() => {
        logout();
      }, 1200);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to revoke sessions";
      toast({
        type: "error",
        title: "Revocation Failed",
        description: msg,
      });
      setRevokingSessions(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmInput !== user.email) {
      toast({
        type: "error",
        title: "Confirmation Mismatch",
        description: "Please type your exact email address to confirm deletion.",
      });
      return;
    }

    setDeletingAccount(true);
    try {
      await deleteUserAccount();
      toast({
        type: "info",
        title: "Account Deleted",
        description: "Your workspace and account data have been permanently removed.",
      });
      setTimeout(() => {
        logout();
      }, 1000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete account";
      toast({
        type: "error",
        title: "Deletion Failed",
        description: msg,
      });
      setDeletingAccount(false);
    }
  };

  const handleSaveAlerts = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingAlerts(true);
    try {
      await updateWorkspaceSettings({
        slack_webhook_url: slackUrl.trim() || null,
      });
      toast({
        type: "success",
        title: "Alert Settings Saved",
        description: "Workspace Slack notifications have been updated.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save alert settings";
      toast({
        type: "error",
        title: "Update Failed",
        description: msg,
      });
    } finally {
      setSavingAlerts(false);
    }
  };

  const handleTestSlackAlert = async () => {
    if (!slackUrl.trim()) {
      toast({
        type: "info",
        title: "Slack URL Required",
        description: "Please enter a Slack incoming webhook URL first.",
      });
      return;
    }

    setTestingSlack(true);
    try {
      await updateWorkspaceSettings({
        slack_webhook_url: slackUrl.trim(),
      });
      const res = await sendTestAlert("slack");
      toast({
        type: "success",
        title: "Test Alert Delivered",
        description: res.message || "Test security notification dispatched to Slack channel.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch test notification";
      toast({
        type: "error",
        title: "Dispatch Failed",
        description: msg,
      });
    } finally {
      setTestingSlack(false);
    }
  };

  const handleCopyCliToken = () => {
    if (cliTokenData?.cli_token) {
      navigator.clipboard.writeText(cliTokenData.cli_token);
      setCopiedCliToken(true);
      toast({
        type: "success",
        title: "Token Copied",
        description: "Personal CLI authentication token copied to clipboard.",
        duration: 2000,
      });
      setTimeout(() => setCopiedCliToken(false), 2000);
    }
  };

  const copySectionText = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    toast({
      type: "success",
      title: "Copied to clipboard",
      description: `${section} copied to clipboard.`,
      duration: 2000,
    });
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const getInstallCommand = (os: TargetOS) => {
    switch (os) {
      case "windows":
        return "irm https://aegis.ilyankhan.tech/install.ps1 | iex";
      case "macos":
      case "linux":
      case "wsl":
      default:
        return "curl -fsSL https://aegis.ilyankhan.tech/install.sh | bash";
    }
  };

  const navTabs = [
    {
      id: "profile" as SettingsTab,
      label: "Profile",
      description: "Personal handle, avatar, and workspace credentials",
      icon: User,
    },
    {
      id: "security" as SettingsTab,
      label: "Security & Auth",
      description: "Password policy, active sessions, and data deletion",
      icon: KeyRound,
    },
    {
      id: "alerts" as SettingsTab,
      label: "Alerts & Integrations",
      description: "Slack webhook routing and incident notifications",
      icon: Bell,
    },
    {
      id: "cli" as SettingsTab,
      label: "API & CLI Access",
      description: "Personal access tokens and terminal workstation keys",
      icon: Terminal,
    },
  ];

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Top Navigation Header */}
      <header className="bg-surface border-b border-subtle sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="w-9 h-9 rounded-xl bg-canvas border border-subtle flex items-center justify-center text-primary hover:text-heading transition-colors"
              title="Return to Dashboard"
            >
              <Shield className="w-5 h-5" />
            </Link>
            <div className="flex items-center space-x-2">
              <span className="font-semibold text-sm text-heading tracking-tight">Aegis Control Plane</span>
              <span className="text-muted/40">/</span>
              <span className="text-xs font-medium text-muted">Workspace Settings</span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link
              href="/"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-heading bg-canvas hover:bg-subtle border border-subtle transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Dashboard</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Main Settings Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-heading">Workspace Settings</h1>
          <p className="text-xs text-muted mt-1">
            Manage account authentication, incident alerting channels, and command-line workstation credentials.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar Navigation */}
          <aside className="lg:col-span-3 space-y-1 bg-surface border border-subtle rounded-2xl p-2 shadow-subtle">
            {navTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTabChange(tab.id)}
                  className={`w-full text-left flex items-start space-x-3 px-3.5 py-3 rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? "bg-primary text-surface shadow-xs"
                      : "text-muted hover:text-heading hover:bg-canvas"
                  }`}
                >
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isActive ? "text-surface" : "text-primary"}`} />
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${isActive ? "text-surface" : "text-heading"}`}>
                      {tab.label}
                    </p>
                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? "text-surface/80" : "text-muted"}`}>
                      {tab.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </aside>

          {/* Right Main Content Area */}
          <div className="lg:col-span-9 space-y-6">
            {/* TAB 1: PROFILE */}
            {activeTab === "profile" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Profile Information Card */}
                <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle space-y-6">
                  <div className="border-b border-subtle pb-4">
                    <h2 className="text-base font-semibold text-heading">Profile Information</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Your identity and public credentials within the Aegis security control plane.
                    </p>
                  </div>

                  {/* Avatar Section */}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-4 sm:space-y-0 sm:space-x-5">
                    <div className="relative group">
                      <div className="w-16 h-16 rounded-2xl bg-canvas border border-subtle flex items-center justify-center text-primary font-semibold text-xl overflow-hidden shadow-xs">
                        {avatarUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          (fullName || user.email || "U").slice(0, 2).toUpperCase()
                        )}
                      </div>
                      {processingImage && (
                        <div className="absolute inset-0 bg-heading/40 rounded-2xl flex items-center justify-center">
                          <Loader2 className="w-5 h-5 animate-spin text-surface" />
                        </div>
                      )}
                    </div>

                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={processingImage}
                          className="px-3 py-1.5 text-xs font-medium bg-canvas hover:bg-subtle text-heading border border-subtle rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Photo</span>
                        </button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="image/*"
                          onChange={handleFileSelect}
                          className="hidden"
                        />

                        <button
                          type="button"
                          onClick={() => setCustomUrlMode(!customUrlMode)}
                          className="px-3 py-1.5 text-xs font-medium bg-canvas hover:bg-subtle text-muted hover:text-heading border border-subtle rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
                        >
                          <Link2 className="w-3.5 h-3.5" />
                          <span>Custom URL</span>
                        </button>

                        {avatarUrl && (
                          <button
                            type="button"
                            onClick={() => saveAvatar(null)}
                            disabled={processingImage}
                            className="px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-200 rounded-lg transition-colors cursor-pointer disabled:opacity-50 flex items-center space-x-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Remove Photo</span>
                          </button>
                        )}
                      </div>

                      {/* Avatar Presets */}
                      <div className="flex items-center space-x-2 pt-1">
                        <span className="text-[11px] text-muted font-medium">Presets:</span>
                        <div className="flex items-center space-x-1.5">
                          {AVATAR_PRESETS.map((p) => (
                            <button
                              key={p.id}
                              type="button"
                              onClick={() => saveAvatar(p.url)}
                              className="w-6 h-6 rounded-lg bg-canvas border border-subtle hover:border-interactive overflow-hidden transition-all cursor-pointer"
                              title={p.label}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={p.url} alt={p.label} className="w-full h-full object-cover" />
                            </button>
                          ))}
                        </div>
                      </div>

                      {customUrlMode && (
                        <div className="flex items-center space-x-2 pt-2 animate-in fade-in duration-100">
                          <input
                            type="url"
                            placeholder="https://example.com/avatar.png"
                            value={avatarUrl}
                            onChange={(e) => setAvatarUrl(e.target.value)}
                            className="flex-1 text-xs px-3 py-1.5 rounded-lg bg-canvas border border-subtle text-heading focus:outline-none focus:ring-2 focus:ring-interactive"
                          />
                          <button
                            type="button"
                            onClick={() => saveAvatar(avatarUrl)}
                            disabled={processingImage || !avatarUrl.trim()}
                            className="px-3 py-1.5 text-xs font-semibold bg-primary hover:bg-heading text-surface rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Save
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Profile Edit Form */}
                  <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-heading">Full Name</label>
                        <input
                          type="text"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Alex Thorne"
                          className="w-full text-xs px-3 py-2 rounded-xl bg-canvas border border-subtle text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-heading">Email Address</label>
                        <div className="relative">
                          <input
                            type="email"
                            value={user.email}
                            disabled
                            className="w-full text-xs px-3 py-2 rounded-xl bg-canvas/60 border border-subtle text-muted cursor-not-allowed"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-semibold bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
                            {user.is_verified ? "Verified" : "Unverified"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={savingProfile}
                        className="px-5 py-2 text-xs font-semibold bg-primary hover:bg-heading text-surface rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1.5 shadow-xs"
                      >
                        {savingProfile ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Changes...</span>
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
                </div>

                {/* Workspace & GitHub Connection Card */}
                <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle space-y-5">
                  <div className="border-b border-subtle pb-4">
                    <h2 className="text-base font-semibold text-heading">Connected Accounts & Workspace</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Manage external OAuth integrations and multi-tenant identifier scopes.
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* GitHub Connection Box */}
                    <div className="flex items-center justify-between p-4 bg-canvas border border-subtle rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-heading">
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path
                              fillRule="evenodd"
                              clipRule="evenodd"
                              d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                            />
                          </svg>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-heading">GitHub Integration</p>
                          <p className="text-[11px] text-muted">
                            {user.github_username ? (
                              <span>Connected as <span className="font-mono font-medium text-heading">@{user.github_username}</span></span>
                            ) : (
                              "Connect your GitHub account to sync private repositories"
                            )}
                          </p>
                        </div>
                      </div>

                      <div>
                        {user.github_username ? (
                          <button
                            type="button"
                            onClick={handleUnlinkGitHub}
                            disabled={unlinkingGithub}
                            className="px-3 py-1.5 text-xs font-medium text-muted hover:text-rose-600 hover:bg-surface border border-subtle rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                          >
                            {unlinkingGithub ? "Disconnecting..." : "Disconnect"}
                          </button>
                        ) : (
                          <a
                            href={getOAuthUrl("github", "login")}
                            className="px-3.5 py-1.5 text-xs font-semibold bg-heading text-surface rounded-lg hover:opacity-90 transition-opacity cursor-pointer inline-flex items-center space-x-1.5"
                          >
                            <span>Link GitHub</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Organization Scope Box */}
                    <div className="flex items-center justify-between p-4 bg-canvas border border-subtle rounded-xl">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-lg bg-surface border border-subtle flex items-center justify-center text-primary">
                          <Building className="w-4 h-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-heading">Organization Scope</p>
                          <p className="text-[11px] font-mono text-muted truncate max-w-xs">
                            {user.organization_id || "default-org"}
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(user.organization_id || "default-org");
                          setCopiedId(true);
                          toast({
                            type: "info",
                            title: "Organization ID Copied",
                            description: "Tenant identifier copied to clipboard.",
                            duration: 2000,
                          });
                          setTimeout(() => setCopiedId(false), 2000);
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-heading bg-surface hover:bg-subtle border border-subtle rounded-lg transition-colors inline-flex items-center space-x-1 cursor-pointer"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5 text-muted" />}
                        <span>{copiedId ? "Copied" : "Copy ID"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: SECURITY */}
            {activeTab === "security" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Change Password Card */}
                {user.provider === "local" ? (
                  <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle space-y-6">
                    <div className="border-b border-subtle pb-4">
                      <h2 className="text-base font-semibold text-heading">Change Password</h2>
                      <p className="text-xs text-muted mt-0.5">
                        Ensure your password contains at least 8 characters with numbers and special symbols.
                      </p>
                    </div>

                    <form onSubmit={handleChangePassword} className="space-y-4 max-w-lg">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-heading">Current Password</label>
                        <div className="relative">
                          <input
                            type={showCurrentPass ? "text" : "password"}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            placeholder="Enter current password"
                            required
                            className="w-full text-xs px-3 py-2 pr-10 rounded-xl bg-canvas border border-subtle text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive"
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPass(!showCurrentPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading cursor-pointer"
                          >
                            {showCurrentPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-heading">New Password</label>
                        <div className="relative">
                          <input
                            type={showNewPass ? "text" : "password"}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Minimum 8 characters"
                            required
                            className="w-full text-xs px-3 py-2 pr-10 rounded-xl bg-canvas border border-subtle text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPass(!showNewPass)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-heading cursor-pointer"
                          >
                            {showNewPass ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {/* Strength Indicator */}
                        {newPassword && (
                          <div className="pt-2 space-y-2">
                            <div className="flex items-center justify-between text-[11px]">
                              <span className="text-muted">Password Strength</span>
                              <span className="font-semibold text-heading">
                                {strengthLabels[passedCriteria - 1] || "Weak"}
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-canvas rounded-full overflow-hidden border border-subtle">
                              <div
                                className={`h-full ${strengthColor} transition-all duration-300`}
                                style={{ width: `${(passedCriteria / 4) * 100}%` }}
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] text-muted">
                              <div className={`flex items-center space-x-1.5 ${hasMinLength ? "text-primary font-medium" : ""}`}>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>8+ characters</span>
                              </div>
                              <div className={`flex items-center space-x-1.5 ${hasMixedCase ? "text-primary font-medium" : ""}`}>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Upper & lowercase</span>
                              </div>
                              <div className={`flex items-center space-x-1.5 ${hasNumber ? "text-primary font-medium" : ""}`}>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>At least 1 number</span>
                              </div>
                              <div className={`flex items-center space-x-1.5 ${hasSpecial ? "text-primary font-medium" : ""}`}>
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Special symbol</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-heading">Confirm New Password</label>
                        <input
                          type="password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Re-enter new password"
                          required
                          className="w-full text-xs px-3 py-2 rounded-xl bg-canvas border border-subtle text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive"
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="submit"
                          disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                          className="px-5 py-2 text-xs font-semibold bg-primary hover:bg-heading text-surface rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1.5 shadow-xs"
                        >
                          {changingPassword ? (
                            <>
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Updating Password...</span>
                            </>
                          ) : (
                            <span>Update Password</span>
                          )}
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle">
                    <p className="text-xs text-muted">
                      Your account uses GitHub OAuth authentication. Passwords are managed directly via GitHub.
                    </p>
                  </div>
                )}

                {/* Session Revocation Card */}
                <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle space-y-4">
                  <div className="border-b border-subtle pb-4">
                    <h2 className="text-base font-semibold text-heading">Active Sessions & JWT Blacklisting</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Invalidate all active access tokens and refresh cookies across browsers and devices.
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 bg-canvas border border-subtle rounded-xl">
                    <div>
                      <p className="text-xs font-semibold text-heading">Global Session Termination</p>
                      <p className="text-[11px] text-muted mt-0.5">
                        Forces a cryptographic token refresh rotation across all concurrent logins.
                      </p>
                    </div>

                    {confirmRevoke ? (
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => setConfirmRevoke(false)}
                          disabled={revokingSessions}
                          className="px-3 py-1.5 text-xs font-medium text-muted hover:text-heading rounded-lg bg-surface border border-subtle transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleRevokeSessions}
                          disabled={revokingSessions}
                          className="px-3.5 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs disabled:opacity-50"
                        >
                          {revokingSessions ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                          <span>Confirm Revoke All</span>
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmRevoke(true)}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-surface hover:bg-subtle text-heading border border-subtle rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5"
                      >
                        <LogOut className="w-3.5 h-3.5 text-muted" />
                        <span>Revoke All Sessions</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Danger Zone: Account Deletion */}
                <div className="bg-surface border border-rose-200 rounded-2xl p-6 shadow-subtle space-y-4">
                  <div className="border-b border-rose-100 pb-4">
                    <h2 className="text-base font-semibold text-rose-700">Danger Zone</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Permanently remove your operator profile, repositories, and incident forensics.
                    </p>
                  </div>

                  <div className="p-4 bg-rose-50/50 border border-rose-200 rounded-xl space-y-3">
                    <div>
                      <p className="text-xs font-semibold text-rose-900">Delete Account & Workspace</p>
                      <p className="text-[11px] text-rose-700 mt-0.5">
                        This action is irreversible. All recorded findings and scan histories will be permanently destroyed.
                      </p>
                    </div>

                    {confirmDelete ? (
                      <div className="space-y-3 pt-2">
                        <div className="space-y-1">
                          <label className="text-[11px] font-semibold text-rose-900">
                            Type <span className="font-mono font-bold text-heading">{user.email}</span> to confirm:
                          </label>
                          <input
                            type="text"
                            value={deleteConfirmInput}
                            onChange={(e) => setDeleteConfirmInput(e.target.value)}
                            placeholder="Enter your email to verify"
                            className="w-full text-xs px-3 py-2 rounded-xl bg-surface border border-rose-300 text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-rose-500"
                          />
                        </div>

                        <div className="flex items-center space-x-2">
                          <button
                            type="button"
                            onClick={() => {
                              setConfirmDelete(false);
                              setDeleteConfirmInput("");
                            }}
                            disabled={deletingAccount}
                            className="px-3 py-1.5 text-xs font-medium text-muted hover:text-heading bg-surface border border-subtle rounded-lg transition-colors cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleDeleteAccount}
                            disabled={deletingAccount || deleteConfirmInput !== user.email}
                            className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5 shadow-xs disabled:opacity-40"
                          >
                            {deletingAccount ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            <span>Permanently Delete Account</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDelete(true)}
                        className="px-3.5 py-1.5 text-xs font-semibold bg-surface hover:bg-rose-50 text-rose-700 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center space-x-1.5"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete Account</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: ALERTS & INTEGRATIONS */}
            {activeTab === "alerts" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Slack Webhook Card */}
                <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle space-y-6">
                  <div className="border-b border-subtle pb-4 flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-semibold text-heading">Slack Incident Channel</h2>
                      <p className="text-xs text-muted mt-0.5">
                        Route real-time secret leaks and regressions to your team channels via incoming webhook.
                      </p>
                    </div>
                    <a
                      href="https://api.slack.com/messaging/webhooks"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:text-heading transition-colors inline-flex items-center space-x-1"
                    >
                      <span>Slack Webhook Docs</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  {loadingAlerts ? (
                    <div className="py-10 text-center space-y-2">
                      <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                      <p className="text-xs text-muted">Loading alert configuration...</p>
                    </div>
                  ) : (
                    <form onSubmit={handleSaveAlerts} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-heading flex items-center space-x-2">
                          <span className="w-2 h-2 rounded-full bg-[#4A154B]" />
                          <span>Slack Incoming Webhook URL</span>
                        </label>
                        <input
                          type="url"
                          placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
                          value={slackUrl}
                          onChange={(e) => setSlackUrl(e.target.value)}
                          className="w-full text-xs px-3.5 py-2.5 rounded-xl bg-canvas border border-subtle text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive font-mono"
                        />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleTestSlackAlert}
                          disabled={testingSlack || !slackUrl.trim()}
                          className="px-4 py-2 text-xs font-medium text-heading bg-canvas hover:bg-subtle border border-subtle rounded-xl transition-colors cursor-pointer flex items-center space-x-1.5 disabled:opacity-50"
                        >
                          {testingSlack ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                          ) : (
                            <Send className="w-3.5 h-3.5 text-primary" />
                          )}
                          <span>Send Test Notification</span>
                        </button>

                        <button
                          type="submit"
                          disabled={savingAlerts}
                          className="px-5 py-2 text-xs font-semibold bg-primary hover:bg-heading text-surface rounded-xl transition-all disabled:opacity-50 cursor-pointer flex items-center space-x-1.5 shadow-xs"
                        >
                          {savingAlerts ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                          <span>Save Settings</span>
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Event Dispatch Triggers Card */}
                <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle space-y-4">
                  <div className="border-b border-subtle pb-4">
                    <h2 className="text-base font-semibold text-heading">Event Dispatch Triggers</h2>
                    <p className="text-xs text-muted mt-0.5">
                      Security signals automatically streamed to configured channels upon ingestion.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start space-x-3 p-3.5 bg-canvas border border-subtle rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-heading">Critical Secret Leaks</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          Instant dispatch when AWS keys, Private RSA/SSH keys, or verified credentials are leaked.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3.5 bg-canvas border border-subtle rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-heading">Regression Detection</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          High-priority notification when a previously resolved secret is reintroduced into source control.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start space-x-3 p-3.5 bg-canvas border border-subtle rounded-xl">
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="text-xs">
                        <p className="font-semibold text-heading">Pre-Commit Intercepts</p>
                        <p className="text-[11px] text-muted mt-0.5">
                          Cloud synchronization of local workstation findings via <code className="font-mono text-primary">aegis scan --sync</code>.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: API & CLI ACCESS */}
            {activeTab === "cli" && (
              <div className="space-y-6 animate-in fade-in duration-150">
                {/* Header Intro Banner */}
                <div className="p-6 bg-surface border border-subtle rounded-2xl space-y-2 shadow-subtle">
                  <h2 className="text-lg font-bold tracking-tight text-heading">
                    Aegis CLI Workstation Setup & API Access
                  </h2>
                  <p className="text-xs text-muted leading-relaxed max-w-3xl">
                    Install the Aegis binary to intercept secrets on developer workstations, block leaks before git commits complete, and stream security telemetry directly into your cloud control plane.
                  </p>
                </div>

                {/* OS Platform Selector */}
                <div className="flex flex-wrap items-center gap-1.5 bg-surface border border-subtle p-1.5 rounded-2xl w-fit">
                  <button
                    type="button"
                    onClick={() => setSelectedOS("macos")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      selectedOS === "macos"
                        ? "bg-primary text-surface font-semibold shadow-xs"
                        : "text-muted hover:text-heading hover:bg-canvas"
                    }`}
                  >
                    macOS (Apple Silicon & Intel)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOS("linux")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      selectedOS === "linux"
                        ? "bg-primary text-surface font-semibold shadow-xs"
                        : "text-muted hover:text-heading hover:bg-canvas"
                    }`}
                  >
                    Linux (x86_64 / ARM64)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOS("windows")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      selectedOS === "windows"
                        ? "bg-primary text-surface font-semibold shadow-xs"
                        : "text-muted hover:text-heading hover:bg-canvas"
                    }`}
                  >
                    Windows (PowerShell)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedOS("wsl")}
                    className={`px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      selectedOS === "wsl"
                        ? "bg-primary text-surface font-semibold shadow-xs"
                        : "text-muted hover:text-heading hover:bg-canvas"
                    }`}
                  >
                    WSL (Ubuntu / Debian)
                  </button>
                </div>

                {/* 4-Step Setup Workflow */}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
                  {/* Left Workflow Column */}
                  <div className="xl:col-span-7 space-y-6">
                    {/* Step 1: Download & Install */}
                    <section className="p-6 bg-surface border border-subtle rounded-2xl space-y-3.5 shadow-subtle">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            1
                          </div>
                          <h3 className="text-sm font-semibold text-heading">Download & Install Aegis Binary</h3>
                        </div>
                        <span className="text-[11px] font-mono text-muted uppercase tracking-wider">
                          {selectedOS === "windows" ? "PowerShell" : "Shell Script"}
                        </span>
                      </div>

                      <p className="text-xs text-muted leading-relaxed">
                        {selectedOS === "windows"
                          ? "Runs the PowerShell installer, installs to %LOCALAPPDATA%\\Programs\\Aegis\\aegis.exe, and adds to user PATH."
                          : "Auto-detects CPU architecture (ARM64 / x86_64), downloads the latest binary, and installs to /usr/local/bin/aegis."}
                      </p>

                      <div className="bg-canvas border border-subtle rounded-xl p-3.5 font-mono text-xs text-heading flex items-center justify-between group">
                        <span className="truncate flex-1 pr-3 text-primary font-semibold text-[11px] sm:text-xs">
                          {getInstallCommand(selectedOS)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copySectionText(getInstallCommand(selectedOS), "Install command")}
                          className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer shadow-xs"
                          title="Copy install command"
                        >
                          {copiedSection === "Install command" ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>

                      {selectedOS === "windows" && (
                        <div className="pt-1 text-[11px] text-muted flex items-center space-x-2">
                          <span>Manual download:</span>
                          <a
                            href="https://github.com/Ilyan321/aegis-platform/releases/latest/download/aegis-windows-amd64.exe"
                            className="text-primary hover:underline inline-flex items-center space-x-1 font-mono font-medium"
                          >
                            <span>aegis-windows-amd64.exe</span>
                            <Download className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                    </section>

                    {/* Step 2: Sign In & Authenticate */}
                    <section className="p-6 bg-surface border border-subtle rounded-2xl space-y-3.5 shadow-subtle">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            2
                          </div>
                          <h3 className="text-sm font-semibold text-heading">Sign In to Your Workspace</h3>
                        </div>
                        <span className="text-[11px] text-muted">Valid for 30 days</span>
                      </div>

                      <p className="text-xs text-muted leading-relaxed">
                        Authorize your workstation to sync scans and enforce organization-wide pre-commit security policies.
                      </p>

                      {loadingCliToken ? (
                        <div className="p-4 bg-canvas border border-subtle rounded-xl flex items-center justify-center space-x-2 text-xs text-muted">
                          <Loader2 className="w-4 h-4 animate-spin text-primary" />
                          <span>Generating personal CLI token...</span>
                        </div>
                      ) : cliTokenData ? (
                        <div className="space-y-3">
                          <div className="bg-canvas border border-subtle rounded-xl p-3.5 font-mono text-xs text-heading flex items-center justify-between group">
                            <span className="truncate flex-1 pr-3 text-[11px] sm:text-xs">
                              aegis login --token {cliTokenData.cli_token}
                            </span>
                            <button
                              type="button"
                              onClick={() => copySectionText(`aegis login --token ${cliTokenData.cli_token}`, "Login command")}
                              className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer shadow-xs"
                              title="Copy login command"
                            >
                              {copiedSection === "Login command" ? (
                                <Check className="w-4 h-4 text-primary" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </button>
                          </div>

                          {/* Raw Token Reveal */}
                          <div className="pt-1 flex items-center justify-between text-[11px] text-muted">
                            <span>Personal Bearer Token:</span>
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-xs">
                                {showCliToken ? cliTokenData.cli_token : "••••••••••••••••••••••••"}
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowCliToken(!showCliToken)}
                                className="text-primary hover:text-heading transition-colors cursor-pointer"
                                title={showCliToken ? "Hide token" : "Show token"}
                              >
                                {showCliToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              </button>
                              <button
                                type="button"
                                onClick={handleCopyCliToken}
                                className="text-primary hover:text-heading transition-colors cursor-pointer ml-1"
                                title="Copy raw token"
                              >
                                {copiedCliToken ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      ) : null}
                    </section>

                    {/* Step 3: Initialize Repository Pre-Commit Hook */}
                    <section className="p-6 bg-surface border border-subtle rounded-2xl space-y-3.5 shadow-subtle">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            3
                          </div>
                          <h3 className="text-sm font-semibold text-heading">Initialize Repository Guardrail</h3>
                        </div>
                        <span className="text-[11px] text-muted">Git Hook</span>
                      </div>

                      <p className="text-xs text-muted leading-relaxed">
                        Run inside any local Git repository. Installs the zero-trust pre-commit hook in <code className="bg-canvas px-1 py-0.2 rounded border border-subtle font-mono text-[11px]">.git/hooks/pre-commit</code>. Any attempt to commit AWS keys, GitHub tokens, or private keys will be instantly intercepted and blocked.
                      </p>

                      <div className="bg-canvas border border-subtle rounded-xl p-3.5 font-mono text-xs text-heading flex items-center justify-between group">
                        <span className="truncate flex-1 pr-3 text-primary font-semibold text-xs">
                          aegis init
                        </span>
                        <button
                          type="button"
                          onClick={() => copySectionText("aegis init", "Init command")}
                          className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer shadow-xs"
                          title="Copy init command"
                        >
                          {copiedSection === "Init command" ? (
                            <Check className="w-4 h-4 text-primary" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </section>

                    {/* Step 4: Run Scans & Telemetry */}
                    <section className="p-6 bg-surface border border-subtle rounded-2xl space-y-3.5 shadow-subtle">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                            4
                          </div>
                          <h3 className="text-sm font-semibold text-heading">Scan Repository & Stream Telemetry</h3>
                        </div>
                        <span className="text-[11px] text-muted">Cloud Telemetry</span>
                      </div>

                      <p className="text-xs text-muted leading-relaxed">
                        Inspect codebases recursively or audit uncommitted changes with live provider verification and cloud synchronization.
                      </p>

                      <div className="space-y-2">
                        <div className="bg-canvas border border-subtle rounded-xl p-3 font-mono text-xs text-heading flex items-center justify-between group">
                          <span className="truncate flex-1 pr-3 text-[11px] sm:text-xs">
                            aegis scan --sync
                          </span>
                          <button
                            type="button"
                            onClick={() => copySectionText("aegis scan --sync", "Sync command")}
                            className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer shadow-xs"
                            title="Copy sync command"
                          >
                            {copiedSection === "Sync command" ? (
                              <Check className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>

                        <div className="bg-canvas border border-subtle rounded-xl p-3 font-mono text-xs text-heading flex items-center justify-between group">
                          <span className="truncate flex-1 pr-3 text-[11px] sm:text-xs">
                            aegis scan --verify --history
                          </span>
                          <button
                            type="button"
                            onClick={() => copySectionText("aegis scan --verify --history", "History scan command")}
                            className="p-1.5 rounded-lg bg-surface hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors shrink-0 cursor-pointer shadow-xs"
                            title="Copy history scan command"
                          >
                            {copiedSection === "History scan command" ? (
                              <Check className="w-3.5 h-3.5 text-primary" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    </section>
                  </div>

                  {/* Right Column: Terminal Emulation, Privacy Guarantees, and Cheat Sheet */}
                  <div className="xl:col-span-5 space-y-6">
                    {/* Terminal Window Emulator */}
                    <div className="bg-surface border border-subtle rounded-2xl overflow-hidden shadow-subtle">
                      <div className="flex items-center px-4 py-3 bg-canvas border-b border-subtle space-x-2">
                        <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                        <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                        <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                        <span className="text-[11px] font-mono text-muted pl-2">terminal — aegis scan</span>
                      </div>
                      <div className="p-4 font-mono text-[11px] leading-relaxed space-y-2 bg-canvas/60 text-muted overflow-x-auto">
                        <p className="text-heading">$ aegis scan</p>
                        <p className="text-primary font-bold">[AEGIS] DETECTED 1 SECRET LEAK(S)</p>
                        <p className="border-t border-subtle pt-1 text-rose-400 font-semibold">
                          #1 [CRITICAL] AEGIS-AWS-001: AWS Access Key
                        </p>
                        <p className="text-muted">
                          &nbsp;&nbsp;Location: src/config/aws.ts:14<br />
                          &nbsp;&nbsp;Detected: AKIA****************<br />
                          &nbsp;&nbsp;Entropy:&nbsp;&nbsp;3.84 (High Confidence)
                        </p>
                        <p className="border-t border-subtle pt-1 text-amber-400">
                          ==&gt; Pre-commit hook blocked git commit (Exit Code 1)
                        </p>
                        <p className="text-muted pt-1">Scanned 142 files (12,410 lines) in 18ms</p>
                      </div>
                    </div>

                    {/* Privacy & Zero-Exfiltration Guarantee */}
                    <div className="p-6 bg-surface border border-subtle rounded-2xl space-y-3 shadow-subtle">
                      <div className="flex items-center space-x-2 text-primary font-semibold text-xs">
                        <ShieldCheck className="w-4 h-4" />
                        <span>Zero Secret Exfiltration Guarantee</span>
                      </div>
                      <p className="text-xs text-muted leading-relaxed">
                        Aegis operates on a strict zero-knowledge model. Plaintext credentials are never saved to disk, logged to terminals, or sent across the network. Only masked values (e.g. <code className="bg-canvas px-1 py-0.2 rounded border border-subtle font-mono text-[10px]">AKIA****</code>) and blind-index HMAC-SHA256 hashes are communicated to the cloud platform.
                      </p>
                    </div>

                    {/* CLI Command Quick Reference Card */}
                    <div className="p-6 bg-surface border border-subtle rounded-2xl space-y-3 shadow-subtle text-xs">
                      <div className="flex items-center space-x-2 text-heading font-semibold">
                        <Layers className="w-4 h-4 text-primary" />
                        <span>CLI Command Quick Reference</span>
                      </div>
                      <div className="space-y-2.5 font-mono text-[11px] pt-1">
                        <div className="flex justify-between items-center border-b border-subtle pb-2">
                          <span className="text-primary font-semibold">aegis init</span>
                          <span className="text-muted font-sans text-right">Install git pre-commit hook</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-subtle pb-2">
                          <span className="text-primary font-semibold">aegis login</span>
                          <span className="text-muted font-sans text-right">Link workspace token</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-subtle pb-2">
                          <span className="text-primary font-semibold">aegis scan</span>
                          <span className="text-muted font-sans text-right">Scan working tree</span>
                        </div>
                        <div className="flex justify-between items-center border-b border-subtle pb-2">
                          <span className="text-primary font-semibold">aegis scan --sync</span>
                          <span className="text-muted font-sans text-right">Stream telemetry to cloud</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-primary font-semibold">aegis status</span>
                          <span className="text-muted font-sans text-right">Inspect pre-commit status</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface border-t border-subtle py-4 px-6 text-center text-xs text-muted">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="font-mono text-[11px]">Aegis Platform v1.0.0</span>
          <span>Zero-Dependency DevSecOps Intercept Platform</span>
        </div>
      </footer>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-canvas flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
