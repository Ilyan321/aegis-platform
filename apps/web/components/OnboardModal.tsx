"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  GitFork,
  GitBranch,
  Search,
  Lock,
  Globe,
  Check,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import {
  createRepository,
  fetchGitHubRepositories,
  GitHubRepoItem,
  Repository,
  getOAuthUrl,
} from "@/lib/api";
import { useToast } from "@/context/ToastContext";
import { useAuth } from "@/context/AuthContext";

interface OnboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRepositoryAdded: (repo: Repository) => void;
  defaultOrgId: string;
}

export function OnboardModal({
  isOpen,
  onClose,
  onRepositoryAdded,
  defaultOrgId,
}: OnboardModalProps) {
  const { toast } = useToast();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState<"scan" | "manual">("scan");

  // GitHub Auto-Scan State
  const [scanning, setScanning] = useState(false);
  const [ghConnected, setGhConnected] = useState(false);
  const [githubRepos, setGithubRepos] = useState<GitHubRepoItem[]>([]);
  const [scanFilter, setScanFilter] = useState("");
  const [usernameInput, setUsernameInput] = useState("");
  const [selectedGhRepo, setSelectedGhRepo] = useState<GitHubRepoItem | null>(null);

  // Form Inputs
  const [fullName, setFullName] = useState("");
  const [cloneUrl, setCloneUrl] = useState("");
  const [branch, setBranch] = useState("main");
  const [secret, setSecret] = useState("");
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Derive initial username from user object
  const defaultUsername = useMemo(() => {
    if (user?.email && user.provider === "github") {
      return user.email.split("@")[0];
    }
    if (user?.full_name && !user.full_name.includes(" ")) {
      return user.full_name;
    }
    return "Ilyan321";
  }, [user]);

  // Scan Repositories Handler
  const performScan = useCallback(
    async (usernameToQuery?: string) => {
      setScanning(true);
      setFormError(null);
      try {
        const data = await fetchGitHubRepositories(usernameToQuery);
        setGhConnected(data.connected);
        setGithubRepos(data.repositories || []);
        if (data.error && data.repositories.length === 0) {
          setFormError(`GitHub Scan: ${data.error}`);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Failed to scan GitHub";
        setFormError(msg);
      } finally {
        setScanning(false);
      }
    },
    []
  );

  // Trigger scan when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormError(null);
      setSelectedGhRepo(null);
      setFullName("");
      setCloneUrl("");
      setBranch("main");
      setSecret("");

      setUsernameInput(defaultUsername);
      performScan(defaultUsername);
    }
  }, [isOpen, defaultUsername, performScan]);

  if (!isOpen) return null;

  // Filtered GitHub Repos
  const filteredGhRepos = githubRepos.filter((r) =>
    r.full_name.toLowerCase().includes(scanFilter.toLowerCase()) ||
    r.name.toLowerCase().includes(scanFilter.toLowerCase()) ||
    (r.description && r.description.toLowerCase().includes(scanFilter.toLowerCase()))
  );

  // Select a GitHub repo from list
  const handleSelectRepo = (repo: GitHubRepoItem) => {
    setSelectedGhRepo(repo);
    setFullName(repo.full_name);
    setCloneUrl(repo.clone_url);
    setBranch(repo.default_branch || "main");
    setFormError(null);
  };

  // Form Validation & Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const cleanName = fullName.trim();
    const cleanUrl = cloneUrl.trim();
    const cleanBranch = branch.trim() || "main";

    // Strict validation
    if (!cleanName.includes("/") || cleanName.split("/").length !== 2) {
      setFormError("Repository name must follow the 'owner/repo' format (e.g. Ilyan321/my-repo).");
      return;
    }

    const isValidUrl =
      cleanUrl.startsWith("https://") ||
      cleanUrl.startsWith("http://") ||
      cleanUrl.startsWith("git@") ||
      cleanUrl.startsWith("ssh://");

    if (!isValidUrl) {
      setFormError("Clone URL must be a valid Git URL starting with 'https://' or 'git@'.");
      return;
    }

    setLoading(true);

    try {
      const repo = await createRepository({
        organization_id: defaultOrgId,
        full_name: cleanName,
        clone_url: cleanUrl,
        default_branch: cleanBranch,
        webhook_secret: secret.trim() || undefined,
        github_repo_id: selectedGhRepo?.id,
      });

      onRepositoryAdded(repo);
      toast({
        type: "success",
        title: "Repository connected",
        description: `${repo.full_name} is now actively monitored by Aegis.`,
      });
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to onboard repository";
      setFormError(message);
      toast({
        type: "error",
        title: "Connection failed",
        description: message,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-heading/50 cursor-pointer animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-surface border border-subtle rounded-2xl w-full max-w-xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col cursor-default"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-subtle bg-canvas shrink-0">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-surface border border-subtle flex items-center justify-center text-primary shadow-xs">
              <GitFork className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-heading text-base">Connect Repository</h3>
              <p className="text-xs text-muted">
                Scan your GitHub repositories or register a custom Git endpoint
              </p>
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

        {/* Tab Switcher */}
        <div className="flex items-center border-b border-subtle bg-canvas/60 px-5 pt-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("scan")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "scan"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-heading"
            }`}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
              />
            </svg>
            <span>Scan GitHub Repos</span>
            {githubRepos.length > 0 && (
              <span className="bg-canvas border border-subtle text-primary text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {githubRepos.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-all cursor-pointer flex items-center space-x-1.5 ${
              activeTab === "manual"
                ? "border-primary text-primary"
                : "border-transparent text-muted hover:text-heading"
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Manual Entry</span>
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {formError && (
            <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs rounded-xl p-3 flex items-start space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{formError}</span>
            </div>
          )}

          {activeTab === "scan" && (
            <div className="space-y-3.5">
              {/* GitHub Connection Status / Scanner Toolbar */}
              <div className="bg-canvas border border-subtle rounded-xl p-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
                <div className="flex items-center space-x-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      ghConnected ? "bg-primary animate-pulse" : "bg-muted"
                    }`}
                  />
                  <span className="text-xs font-medium text-heading">
                    {ghConnected ? "GitHub OAuth Connected" : "Scan Public Repositories"}
                  </span>
                </div>

                <div className="flex items-center space-x-2">
                  <div className="relative flex-1 sm:w-44">
                    <input
                      type="text"
                      placeholder="Username (e.g. Ilyan321)"
                      value={usernameInput}
                      onChange={(e) => setUsernameInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          performScan(usernameInput);
                        }
                      }}
                      className="w-full px-2.5 py-1 text-xs bg-surface border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-interactive font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => performScan(usernameInput)}
                    disabled={scanning}
                    className="px-2.5 py-1 text-xs font-semibold bg-surface hover:bg-subtle border border-subtle rounded-lg text-heading flex items-center space-x-1 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {scanning ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <RefreshCw className="w-3 h-3" />
                    )}
                    <span>Scan</span>
                  </button>

                  {!ghConnected && (
                    <a
                      href={getOAuthUrl("github", "login")}
                      className="px-2.5 py-1 text-xs font-semibold bg-primary hover:bg-heading text-surface rounded-lg flex items-center space-x-1 transition-colors"
                      title="Link GitHub OAuth for private repository access"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Link OAuth</span>
                    </a>
                  )}
                </div>
              </div>

              {/* Repo Search Filter */}
              {githubRepos.length > 0 && (
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder={`Filter from ${githubRepos.length} scanned repositories...`}
                    value={scanFilter}
                    onChange={(e) => setScanFilter(e.target.value)}
                    className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-canvas border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-interactive"
                  />
                </div>
              )}

              {/* Repos List */}
              {scanning ? (
                <div className="py-12 text-center space-y-2">
                  <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
                  <p className="text-xs text-muted">Scanning GitHub repositories...</p>
                </div>
              ) : githubRepos.length === 0 ? (
                <div className="border border-dashed border-subtle rounded-xl p-8 text-center space-y-2">
                  <p className="text-xs text-heading font-medium">No repositories found</p>
                  <p className="text-[11px] text-muted max-w-sm mx-auto">
                    Type your GitHub username above and click Scan, or connect your GitHub account via
                    OAuth to access private repositories.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredGhRepos.map((repo) => {
                    const isSelected = selectedGhRepo?.id === repo.id;
                    return (
                      <div
                        key={repo.id}
                        onClick={() => handleSelectRepo(repo)}
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center justify-between group ${
                          isSelected
                            ? "bg-canvas border-primary ring-1 ring-primary/30"
                            : "bg-surface border-subtle hover:border-interactive hover:bg-canvas/50"
                        }`}
                      >
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div
                            className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 border ${
                              isSelected
                                ? "bg-primary text-surface border-primary"
                                : "bg-canvas text-muted border-subtle"
                            }`}
                          >
                            {repo.private ? (
                              <Lock className="w-3 h-3" />
                            ) : (
                              <Globe className="w-3 h-3" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <span className="font-semibold text-heading truncate">
                                {repo.full_name}
                              </span>
                              <span className="text-[10px] text-muted font-mono bg-canvas border border-subtle px-1.5 py-0.2 rounded">
                                {repo.default_branch}
                              </span>
                            </div>
                            {repo.description && (
                              <p className="text-[11px] text-muted truncate max-w-sm mt-0.5">
                                {repo.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="shrink-0 pl-2">
                          {isSelected ? (
                            <span className="w-5 h-5 rounded-full bg-primary text-surface flex items-center justify-center">
                              <Check className="w-3 h-3" />
                            </span>
                          ) : (
                            <span className="text-[11px] font-medium text-muted group-hover:text-primary transition-colors">
                              Select
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Selected Repo Preview & Configuration */}
              {selectedGhRepo && (
                <div className="bg-canvas border border-primary/40 rounded-xl p-3.5 space-y-3 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                      Selected Target
                    </span>
                    <span className="text-xs font-mono font-medium text-heading">
                      {selectedGhRepo.full_name}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted block mb-0.5">Default Branch</span>
                      <input
                        type="text"
                        value={branch}
                        onChange={(e) => setBranch(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-surface border border-subtle rounded-lg text-heading focus:outline-none focus:ring-1 focus:ring-interactive"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-muted block mb-0.5">
                        Webhook Secret (Optional)
                      </span>
                      <input
                        type="password"
                        placeholder="Auto-generated HMAC"
                        value={secret}
                        onChange={(e) => setSecret(e.target.value)}
                        className="w-full px-2.5 py-1 text-xs bg-surface border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-1 focus:ring-interactive"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "manual" && (
            <div className="space-y-3.5">
              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
                  Repository Name (owner/repo)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ilyan321/demo-repo"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-canvas border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  Must be in the format &apos;owner/repository&apos;
                </span>
              </div>

              <div>
                <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
                  Git Clone URL (HTTPS / SSH)
                </label>
                <input
                  type="text"
                  placeholder="https://github.com/org/repo.git"
                  value={cloneUrl}
                  onChange={(e) => setCloneUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-canvas border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive font-mono"
                />
                <span className="text-[10px] text-muted mt-1 block">
                  Must start with https:// or git@
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
                    Default Branch
                  </label>
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-canvas border border-subtle rounded-lg text-heading focus:outline-none focus:ring-2 focus:ring-interactive font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold uppercase tracking-wider text-muted block mb-1">
                    Webhook Secret (Optional)
                  </label>
                  <input
                    type="password"
                    placeholder="Auto-generated"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-canvas border border-subtle rounded-lg text-heading placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-interactive font-mono"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-subtle bg-canvas flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 text-xs font-medium text-muted hover:text-heading hover:bg-surface rounded-lg transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading || (activeTab === "scan" && !selectedGhRepo && !fullName)}
            className="px-5 py-2 text-xs font-semibold bg-primary hover:bg-heading text-surface rounded-lg transition-colors disabled:opacity-50 cursor-pointer flex items-center space-x-1.5 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <GitFork className="w-3.5 h-3.5" />
                <span>Add to Monitoring Mesh</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

