"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Navbar, DashboardView } from "@/components/Navbar";
import { TelemetryCards } from "@/components/TelemetryCards";
import { IncidentToolbar } from "@/components/IncidentToolbar";
import { IncidentTable } from "@/components/IncidentTable";
import { IncidentDetailModal } from "@/components/IncidentDetailModal";
import { OnboardModal } from "@/components/OnboardModal";
import { CommandMenu } from "@/components/CommandMenu";
import { RepositoriesView } from "@/components/RepositoriesView";
import { ScansView } from "@/components/ScansView";
import { AlertSettingsModal } from "@/components/AlertSettingsModal";
import { CliAuthModal } from "@/components/CliAuthModal";
import { AccountSettingsModal } from "@/components/AccountSettingsModal";
import { Shield, GitFork, Activity, Mail } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { OnboardingHero } from "@/components/OnboardingHero";
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
  triggerScanAllRepositories,
  resendOtp,
} from "@/lib/api";

export default function DashboardPage() {
  const router = useRouter();
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
  const [isAlertSettingsOpen, setIsAlertSettingsOpen] = useState(false);
  const [isCliAuthOpen, setIsCliAuthOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);

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
    if (!authLoading) {
      if (!user) {
        router.replace("/login");
      } else {
        loadDashboardData(user.organization_id);
      }
    }
  }, [authLoading, user, router, loadDashboardData]);

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

  if (authLoading || !user) {
    return (
      <div className="min-h-screen bg-canvas flex flex-col items-center justify-center p-4">
        <div className="w-10 h-10 rounded-xl bg-canvas border border-subtle flex items-center justify-center text-primary animate-pulse mb-3">
          <svg
            className="w-5 h-5 text-primary"
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
        <p className="text-xs text-muted">Securing control plane session...</p>
      </div>
    );
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
        onOpenAlertSettings={() => setIsAlertSettingsOpen(true)}
        onOpenCliAuth={() => setIsCliAuthOpen(true)}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
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

        {/* Telemetry Metrics Grid */}
        <section aria-label="Security Posture Metrics">
          <TelemetryCards
            data={telemetry}
            loading={loading}
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
                />

                {/* Incident Forensic Ledger */}
                <IncidentTable
                  incidents={filteredIncidents}
                  onSelectIncident={(inc) => setSelectedIncident(inc)}
                  onTriageStatus={handleTriageStatus}
                  onBulkStatus={handleBulkStatus}
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
          <span>Zero-Dependency DevSecOps Intercept Mesh</span>
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
        onOpenAlertSettings={() => setIsAlertSettingsOpen(true)}
        onOpenCliAuth={() => setIsCliAuthOpen(true)}
        onOpenAccountSettings={() => setIsAccountSettingsOpen(true)}
      />

      {/* Alert Settings & Integration Modal */}
      <AlertSettingsModal
        isOpen={isAlertSettingsOpen}
        onClose={() => setIsAlertSettingsOpen(false)}
      />

      {/* CLI Authentication Modal */}
      <CliAuthModal
        isOpen={isCliAuthOpen}
        onClose={() => setIsCliAuthOpen(false)}
      />

      {/* Account & Security Settings Modal */}
      <AccountSettingsModal
        isOpen={isAccountSettingsOpen}
        onClose={() => setIsAccountSettingsOpen(false)}
      />
    </div>
  );
}
