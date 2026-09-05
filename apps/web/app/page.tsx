"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Navbar } from "@/components/Navbar";
import { TelemetryCards } from "@/components/TelemetryCards";
import { IncidentToolbar } from "@/components/IncidentToolbar";
import { IncidentTable } from "@/components/IncidentTable";
import { IncidentDetailModal } from "@/components/IncidentDetailModal";
import { OnboardModal } from "@/components/OnboardModal";
import { CommandMenu } from "@/components/CommandMenu";
import {
  Incident,
  Repository,
  TelemetryData,
  fetchIncidents,
  fetchRepositories,
  fetchTelemetry,
  fetchOrganizations,
  updateIncidentStatus,
} from "@/lib/api";

export default function DashboardPage() {
  const [telemetry, setTelemetry] = useState<TelemetryData | null>(null);
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [defaultOrgId, setDefaultOrgId] = useState<string>("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters & State
  const [currentTab, setCurrentTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [isOnboardOpen, setIsOnboardOpen] = useState(false);
  const [isCommandOpen, setIsCommandOpen] = useState(false);

  // Initial Load
  const loadDashboardData = async () => {
    try {
      const [tData, rData, iData, oData] = await Promise.all([
        fetchTelemetry().catch(() => null),
        fetchRepositories().catch(() => []),
        fetchIncidents().catch(() => []),
        fetchOrganizations().catch(() => []),
      ]);

      if (tData) setTelemetry(tData);
      setRepositories(rData);
      setIncidents(iData);
      if (oData.length > 0) {
        setDefaultOrgId(oData[0].id);
      }
    } catch (err) {
      console.error("Error loading dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadDashboardData();
  };

  // Optimistic Triage Status Handler
  const handleTriageStatus = async (id: string, newStatus: "RESOLVED" | "DISMISSED") => {
    // 1. Optimistic local update
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, status: newStatus } : inc))
    );

    try {
      await updateIncidentStatus(id, newStatus);
      // Soft refresh telemetry in background
      fetchTelemetry().then((t) => t && setTelemetry(t)).catch(() => {});
    } catch (err) {
      console.error("Failed to update status, reverting:", err);
      // Revert on error
      loadDashboardData();
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

  return (
    <div className="min-h-screen bg-canvas flex flex-col">
      {/* Top Navbar */}
      <Navbar
        onOpenCommand={() => setIsCommandOpen(true)}
        onRefresh={handleRefresh}
        isRefreshing={refreshing}
      />

      {/* Main Content Container with Breathable 8pt Spacing */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 space-y-8 flex-1">
        {/* Telemetry Metrics Grid */}
        <section aria-label="Security Posture Metrics">
          <TelemetryCards data={telemetry} loading={loading} />
        </section>

        {/* Incident Management Section */}
        <section className="space-y-4" aria-label="Incident Management">
          {/* Action & Filter Toolbar */}
          <IncidentToolbar
            currentTab={currentTab}
            onTabChange={setCurrentTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onOpenOnboardModal={() => setIsOnboardOpen(true)}
            totalCount={filteredIncidents.length}
          />

          {/* Incident Forensic Ledger */}
          <IncidentTable
            incidents={filteredIncidents}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            onTriageStatus={handleTriageStatus}
          />
        </section>
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
        defaultOrgId={defaultOrgId}
        onRepositoryAdded={(newRepo) => {
          setRepositories((prev) => [newRepo, ...prev]);
          loadDashboardData();
        }}
      />

      {/* Global Command Menu (Cmd+K) */}
      <CommandMenu
        isOpen={isCommandOpen}
        onClose={() => setIsCommandOpen(false)}
        incidents={incidents}
        repositories={repositories}
        onSelectIncident={(inc) => setSelectedIncident(inc)}
        onOpenOnboard={() => setIsOnboardOpen(true)}
        onSetTab={(tab) => setCurrentTab(tab)}
      />
    </div>
  );
}
