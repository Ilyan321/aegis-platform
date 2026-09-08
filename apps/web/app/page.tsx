"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { Navbar, DashboardView } from "@/components/Navbar";
import { TelemetryCards } from "@/components/TelemetryCards";
import { IncidentToolbar } from "@/components/IncidentToolbar";
import { IncidentTable } from "@/components/IncidentTable";
import { IncidentDetailModal } from "@/components/IncidentDetailModal";
import { OnboardModal } from "@/components/OnboardModal";
import { CommandMenu } from "@/components/CommandMenu";
import { RepositoriesView } from "@/components/RepositoriesView";
import { ScansView } from "@/components/ScansView";
import { DashboardSkeleton } from "@/components/DashboardSkeleton";
import { Shield, GitFork, Activity, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { OnboardingHero } from "@/components/OnboardingHero";
import { LandingView } from "@/components/LandingView";
import { SAMPLE_INCIDENTS, SAMPLE_REPOSITORIES, SAMPLE_TELEMETRY } from "@/lib/sampleData";
import {
  Incident,
  Repository,
  TelemetryData,
  fetchIncidents,
  fetchRepositories,
  fetchTelemetry,
  fetchOrganizations,
  updateIncidentStatus,
  bulkUpdateIncidentStatus,
  deleteIncident,
  bulkDeleteIncidents,
  cleanDuplicateIncidents,
  triggerScanAllRepositories,
  resendOtp,
  getOAuthUrl,
} from "@/lib/api";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [defaultOrgId, setDefaultOrgId] = useState<string>("");
  const [activeOrgName, setActiveOrgName] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isScanningAll, setIsScanningAll] = useState(false);
  const [isCleaningDuplicates, setIsCleaningDuplicates] = useState(false);
  const [resendingOtp, setResendingOtp] = useState(false);

  const handleResendVerification = async () => {
    if (!user?.email) return;
    setResendingOtp(true);
    try {
      const res = await resendOtp(user.email);
      toast({
        type: "success",
        title: "Verification code sent",
        description: res.message || "A new 6-digit code has been dispatched to your email.",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to dispatch verification code";
      toast({
        type: "error",
        title: "Dispatch failed",
        description: msg,
      });
    } finally {
      setResendingOtp(false);
    }
  };

  // Active View Tab: 'incidents' | 'repositories' | 'scans'
  const [currentView, setCurrentView] = useState<DashboardView>("incidents");
  const [isSimulated, setIsSimulated] = useState(false);

  // Filters & State
  const [currentTab, setCurrentTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Load Dashboard Data scoped to active user
  const loadDashboardData = useCallback(async (orgId?: string | null) => {
    try {
      const targetOrg = orgId || undefined;
      const [tData, rData, iData, oData] = await Promise.all([
        fetchTelemetry(targetOrg).catch(() => null),
        fetchRepositories(targetOrg).catch(() => []),
        fetchIncidents({ organization_id: targetOrg }).catch(() => []),
        fetchOrganizations().catch(() => []),
      ]);

      if (tData) setTelemetry(tData);
      setRepositories(rData);
      setIncidents(iData);
      if (orgId) {
        setDefaultOrgId(orgId);
        const match = oData.find((o) => o.id === orgId);
        if (match) setActiveOrgName(match.name);
      } else if (oData.length > 0) {
        setDefaultOrgId(oData[0].id);
        setActiveOrgName(oData[0].name);
      } else if (user?.full_name) {
        setActiveOrgName(`${user.full_name}'s Workspace`);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.full_name]);

  useEffect(() => {
    if (!authLoading && user) {
      loadDashboardData(user.organization_id);

      // Auto-refresh telemetry every 30s when tab is active
      const interval = setInterval(() => {
        if (!isSimulated && document.visibilityState === "visible") {
          loadDashboardData(user.organization_id);
        }
      }, 30000);

      const handleFocus = () => {
        if (!isSimulated) {
          loadDashboardData(user.organization_id);
        }
      };

      window.addEventListener("focus", handleFocus);
      return () => {
        clearInterval(interval);
        window.removeEventListener("focus", handleFocus);
      };
    }
  }, [authLoading, user, loadDashboardData, isSimulated]);

  const handleLoadSampleData = () => {
    setIsSimulated(true);
    setTelemetry(SAMPLE_TELEMETRY);
    setRepositories(SAMPLE_REPOSITORIES);
    setIncidents(SAMPLE_INCIDENTS);
    toast({
      type: "info",
      title: "Simulation active",
      description: "Loaded 3 sample repositories and 4 findings for preview.",
    });
  };

  const handleResetData = () => {
    setIsSimulated(false);
    loadDashboardData(user?.organization_id);
    toast({
      type: "info",
      title: "Simulation cleared",
      description: "Returned to verified workspace state.",
    });
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData(user?.organization_id);
    toast({
      type: "info",
      title: "Telemetry refreshed",
      description: "Workspace statistics synchronized with control plane.",
    });
  };


  // Optimistic Triage Status Handler
  const handleTriageStatus = async (id: string, newStatus: "RESOLVED" | "DISMISSED") => {
    // 1. Optimistic local update
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: newStatus } : inc))
    );

    try {
      await updateIncidentStatus(id, newStatus, undefined, user?.email);
      // Soft refresh telemetry in background
      fetchTelemetry(user?.organization_id || undefined).then((t) => t && setTelemetry(t)).catch(() => {});
      toast({
        type: newStatus === "RESOLVED" ? "success" : "info",
        title: newStatus === "RESOLVED" ? "Incident resolved" : "Incident dismissed",
        description: newStatus === "RESOLVED" ? "Marked resolved in forensic audit ledger." : "Flagged as false positive.",
      });
    } catch (err) {
      console.error("Failed to update status, reverting:", err);
      // Revert on error
      loadDashboardData(user?.organization_id);
      toast({
        type: "error",
        title: "Triage update failed",
        description: "Could not reach control plane. Reverting state.",
      });
    }
  };

  // Bulk Triage Status Handler
  const handleBulkStatus = async (ids: string[], newStatus: "RESOLVED" | "DISMISSED") => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);

    // 1. Optimistic local update
    setIncidents((prev) =>
      prev.map((inc) => (idSet.has(inc.id) ? { ...inc, status: newStatus } : inc))
    );

    try {
      await bulkUpdateIncidentStatus(ids, newStatus);
      fetchTelemetry(user?.organization_id || undefined).then((t) => t && setTelemetry(t)).catch(() => {});
      toast({
        type: newStatus === "RESOLVED" ? "success" : "info",
        title: `Bulk triage: ${ids.length} incidents ${newStatus.toLowerCase()}`,
        description: `Successfully updated ${ids.length} findings in forensic audit trail.`,
      });
    } catch (err) {
      console.error("Bulk status update failed, reverting:", err);
      loadDashboardData(user?.organization_id);
      toast({
        type: "error",
        title: "Bulk update failed",
        description: "Could not synchronize bulk triage with control plane.",
      });
    }
  };

  // Delete Single Incident Handler
  const handleDeleteIncident = async (id: string) => {
    // Optimistic local removal
    setIncidents((prev) => prev.filter((inc) => inc.id !== id));
    if (selectedIncident?.id === id) {
      setSelectedIncident(null);
    }

    try {
      await deleteIncident(id);
      fetchTelemetry(user?.organization_id || undefined).then((t) => t && setTelemetry(t)).catch(() => {});
      toast({
        type: "info",
        title: "Incident deleted",
        description: "Incident record has been purged from workspace.",
      });
    } catch (err) {
      console.error("Failed to delete incident, reverting:", err);
      loadDashboardData(user?.organization_id);
      toast({
        type: "error",
        title: "Delete failed",
        description: "Could not remove incident from control plane.",
      });
    }
  };

  // Bulk Delete Incidents Handler
  const handleBulkDelete = async (ids: string[]) => {
    if (ids.length === 0) return;
    const idSet = new Set(ids);

    // Optimistic local removal
    setIncidents((prev) => prev.filter((inc) => !idSet.has(inc.id)));
    if (selectedIncident && idSet.has(selectedIncident.id)) {
      setSelectedIncident(null);
    }

    try {
      await bulkDeleteIncidents(ids);
      fetchTelemetry(user?.organization_id || undefined).then((t) => t && setTelemetry(t)).catch(() => {});
      toast({
        type: "info",
        title: `Deleted ${ids.length} incidents`,
        description: `Successfully purged ${ids.length} findings from audit trail.`,
      });
    } catch (err) {
      console.error("Bulk delete failed, reverting:", err);
      loadDashboardData(user?.organization_id);
      toast({
        type: "error",
        title: "Bulk delete failed",
        description: "Could not synchronize deletion with control plane.",
      });
    }
  };

  // One-Click Workspace Duplicate Cleaner Handler
  const handleCleanDuplicates = async () => {
    setIsCleaningDuplicates(true);
    try {
      const res = await cleanDuplicateIncidents();
      await loadDashboardData(user?.organization_id);
      if (res.duplicates_removed > 0) {
        toast({
          type: "success",
          title: "Duplicates purged",
          description: `Successfully pruned ${res.duplicates_removed} duplicate findings. Workspace now has ${res.remaining_incidents} unique incidents.`,
        });
      } else {
        toast({
          type: "info",
          title: "No duplicates found",
          description: "All incidents in your workspace are unique.",
        });
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to clean duplicates";
      toast({
        type: "error",
        title: "Deduplication failed",
        description: message,
      });
    } finally {
      setIsCleaningDuplicates(false);
    }
  };

  const handleTriggerCloudScan = async () => {
    if (repositories.length === 0) {
      toast({
        type: "info",
        title: "No repositories connected",
        description: "Connect a repository first to run cloud secret scanning.",
      });
      setIsOnboardOpen(true);
      return;
    }

    setIsScanningAll(true);
    try {
      const scans = await triggerScanAllRepositories();
      toast({
        type: "success",
        title: "Cloud scan initiated",
        description: `Queued deep inspection across ${scans.length} active repositories.`,
      });
      setTimeout(() => {
        loadDashboardData(user?.organization_id);
      }, 1500);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to initiate cloud scan";
      toast({
        type: "error",
        title: "Scan failed",
        description: message,
      });
    } finally {
      setIsScanningAll(false);
    }
  };

  // Filtered incidents based on active tab and search query
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Tab filtering
      if (currentTab === "CRITICAL" && inc.severity !== "CRITICAL") return false;
      if (currentTab === "ACTIVE" && inc.verification_status !== "ACTIVE") return false;
      if (currentTab === "RESOLVED" && !["RESOLVED", "DISMISSED"].includes(inc.status)) return false;

      // Search filtering
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchRule = inc.rule_name.toLowerCase().includes(q) || inc.rule_id.toLowerCase().includes(q);
        const matchPath = inc.file_path.toLowerCase().includes(q);
        const matchCommit = inc.commit_sha.toLowerCase().includes(q);
        const matchAuthor = inc.committer_handle?.toLowerCase().includes(q);
        if (!matchRule && !matchPath && !matchCommit && !matchAuthor) return false;
      }

      return true;
    });
  }, [incidents, currentTab, searchQuery]);

  if (authLoading) {
    return <DashboardSkeleton />;
  }

  if (!user) {
    return <LandingView />;
  }

  if (loading) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-canvas flex flex-col">

      {/* Top Navbar */}
      <Navbar
        currentView={currentView}
        onViewChange={(view) => setCurrentView(view)}
        onOpenCommand={() => setIsCommandOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
        activeOrgName={activeOrgName}
      />

      {/* Main Content Container with Breathable 8pt Spacing */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 space-y-6 flex-1">
        {/* Unverified Email Workspace Banner */}
        {user && user.is_verified === false && !isSimulated && (
          <aside
            aria-label="Email verification notice"
            className="bg-surface border border-interactive/40 rounded-2xl p-4 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-canvas border border-subtle flex items-center justify-center text-primary shrink-0">
                <Mail className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-xs font-semibold text-heading">
                    Email verification required
                  </p>
                  <span className="text-[10px] font-semibold bg-canvas border border-subtle text-muted px-2 py-0.2 rounded-full">
                    Action Needed
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  A 6-digit confirmation code was sent to <span className="font-mono font-medium text-heading">{user.email}</span>. Confirm your email to secure your workspace.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
              <button
                type="button"
                onClick={handleResendVerification}
                disabled={resendingOtp}
                className="text-xs font-medium text-muted hover:text-heading px-3 py-1.5 rounded-lg border border-subtle bg-canvas hover:bg-subtle/50 transition-colors cursor-pointer disabled:opacity-50"
              >
                {resendingOtp ? "Sending..." : "Resend Code"}
              </button>
              <Link
                href={`/verify-email?email=${encodeURIComponent(user.email)}`}
                className="text-xs font-semibold text-surface bg-primary hover:bg-heading px-3.5 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Verify Now →
              </Link>
            </div>
          </aside>
        )}

        {/* Unlinked GitHub Workspace Reminder Banner */}
        {user && !user.github_username && user.provider === "local" && !isSimulated && (
          <aside
            aria-label="GitHub account connection notice"
            className="bg-surface border border-subtle rounded-2xl p-4 shadow-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in duration-200"
          >
            <div className="flex items-center space-x-3.5">
              <div className="w-9 h-9 rounded-xl bg-canvas border border-subtle flex items-center justify-center text-heading shrink-0">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path
                    fillRule="evenodd"
                    clipRule="evenodd"
                    d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                  />
                </svg>
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <p className="text-xs font-semibold text-heading">
                    GitHub Account Not Connected
                  </p>
                  <span className="text-[10px] font-semibold bg-canvas border border-subtle text-muted px-2 py-0.2 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-[11px] text-muted mt-0.5">
                  Connect your GitHub account to automatically synchronize private repositories and install automated webhook guards.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto">
              <a
                href={getOAuthUrl("github", "login")}
                className="inline-flex items-center space-x-1.5 text-xs font-semibold text-surface bg-heading hover:opacity-90 px-3.5 py-1.5 rounded-lg transition-opacity cursor-pointer shadow-xs"
              >
                <span>Link GitHub Account</span>
              </a>
            </div>
          </aside>
        )}

        {/* Telemetry Metrics Grid */}
        <section aria-label="Security Posture Metrics">
          <TelemetryCards
            data={telemetry}
            loading={loading}
            onViewChange={(view) => setCurrentView(view)}
            onSelectCategory={(cat) => {
              setCurrentView("incidents");
              setCurrentTab(cat);
            }}
          />
        </section>

        {/* Mobile / Small Screen View Switcher */}
        <nav aria-label="Mobile Navigation Views" className="flex md:hidden items-center space-x-1 p-1 bg-surface border border-subtle rounded-xl">
          <button
            type="button"
            onClick={() => setCurrentView("incidents")}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-all ${
              currentView === "incidents"
                ? "bg-primary text-surface font-semibold shadow-subtle"
                : "text-muted hover:text-heading hover:bg-canvas"
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Incidents</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("repositories")}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-all ${
              currentView === "repositories"
                ? "bg-primary text-surface font-semibold shadow-subtle"
                : "text-muted hover:text-heading hover:bg-canvas"
            }`}
          >
            <GitFork className="w-3.5 h-3.5" />
            <span>Repositories</span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentView("scans")}
            className={`flex-1 flex items-center justify-center space-x-1.5 py-2 min-h-[40px] rounded-lg text-xs font-medium transition-all ${
              currentView === "scans"
                ? "bg-primary text-surface font-semibold shadow-subtle"
                : "text-muted hover:text-heading hover:bg-canvas"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Scan Activity</span>
          </button>
        </nav>

        {/* View 1: Incident Management Section */}
        {currentView === "incidents" && (
          <section className="space-y-4" aria-label="Incident Management">
            {repositories.length === 0 && incidents.length === 0 && !loading && !isSimulated ? (
              <OnboardingHero
                onOpenOnboardModal={() => setIsOnboardOpen(true)}
                onLoadSampleData={handleLoadSampleData}
                onResetData={handleResetData}
                isSimulated={isSimulated}
              />
            ) : (
              <>
                {/* Simulation Banner */}
                {isSimulated && (
                  <div className="bg-surface border border-interactive rounded-xl p-3 px-4 flex items-center justify-between text-xs shadow-subtle animate-in fade-in duration-150">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
                      <span className="font-semibold text-heading">Simulation Mode:</span>
                      <span className="text-muted hidden sm:inline">
                        Previewing sample repositories and findings. No real code was modified.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleResetData}
                      className="text-xs font-semibold text-primary hover:text-heading transition-colors cursor-pointer shrink-0 ml-2"
                    >
                      Exit Simulation →
                    </button>
                  </div>
                )}

                {/* Action & Filter Toolbar */}
                <IncidentToolbar
                  currentTab={currentTab}
                  onTabChange={setCurrentTab}
                  searchQuery={searchQuery}
                  onSearchChange={setSearchQuery}
                  onOpenOnboardModal={() => setIsOnboardOpen(true)}
                  totalCount={filteredIncidents.length}
                  onTriggerScan={handleTriggerCloudScan}
                  isScanning={isScanningAll}
                  onCleanDuplicates={handleCleanDuplicates}
                  isCleaningDuplicates={isCleaningDuplicates}
                />

                {/* Incident Forensic Ledger */}
                <IncidentTable
                  incidents={filteredIncidents}
                  loading={loading}
                  onSelectIncident={(inc) => setSelectedIncident(inc)}
                  onTriageStatus={handleTriageStatus}
                  onBulkStatus={handleBulkStatus}
                  onDeleteIncident={handleDeleteIncident}
                  onBulkDelete={handleBulkDelete}
                />
              </>
            )}
          </section>
        )}

        {/* View 2: Repositories Management */}
        {currentView === "repositories" && (
          <section aria-label="Connected Repositories">
            <RepositoriesView
              repositories={repositories}
              onOpenOnboardModal={() => setIsOnboardOpen(true)}
              onRepositoryDeleted={(id) => {
                setRepositories((prev) => prev.filter((r) => r.id !== id));
                loadDashboardData(user?.organization_id);
              }}
              onScanTriggered={() => {
                loadDashboardData(user?.organization_id);
              }}
              loading={loading}
            />
          </section>
        )}

        {/* View 3: Scan Run Activity Ledger */}
        {currentView === "scans" && (
          <section aria-label="Scan Activity Ledger">
            <ScansView
              scans={telemetry?.recent_scans || []}
              repositories={repositories}
              loading={loading}
              onRefresh={handleRefresh}
              isRefreshing={refreshing}
            />
          </section>
        )}
      </main>

      {/* Footer */}
      <footer className="w-full bg-surface border-t border-subtle py-4 px-6 text-center text-xs text-muted">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <span className="font-mono text-[11px]">Aegis Platform v1.0.0</span>
          <span>Zero-Dependency DevSecOps Intercept Platform</span>
        </div>
      </footer>

      {/* Forensic Detail Modal */}
      <IncidentDetailModal
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onStatusUpdated={(updated) => {
          setIncidents((prev) => prev.map((i) => (i.id === updated.id ? updated : i)));
          setSelectedIncident(updated);
          fetchTelemetry().then((t) => t && setTelemetry(t)).catch(() => {});
        }}
      />

      {/* Onboard Repository Modal */}
      <OnboardModal
        isOpen={isOnboardOpen}
        onClose={() => setIsOnboardOpen(false)}
        defaultOrgId={user?.organization_id || defaultOrgId}
        onRepositoryAdded={(newRepo) => {
          setIsSimulated(false);
          setRepositories((prev) => [newRepo, ...prev]);
          loadDashboardData(user?.organization_id);
        }}
      />

      {/* Global Command Menu (Cmd+K) */}
      <CommandMenu
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        incidents={incidents}
        repositories={repositories}
        onSelectIncident={(inc) => setSelectedIncident(inc)}
        onSelectRepository={(repo) => {
          setCurrentView("incidents");
          setCurrentTab("ALL");
          setSearchQuery(repo.full_name);
        }}
        onOpenOnboard={() => setIsOnboardOpen(true)}
        onSetTab={(tab) => {
          setCurrentView("incidents");
          setCurrentTab(tab);
        }}
        onSetView={(view) => setCurrentView(view)}
        onRefresh={handleRefresh}
      />
    </div>
  );
}
