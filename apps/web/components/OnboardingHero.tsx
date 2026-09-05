"use client";

import React from "react";
import {
  Shield,
  GitFork,
  Radio,
  Zap,
  Plus,
  Play,
  RotateCcw,
  Lock,
} from "lucide-react";

interface OnboardingHeroProps {
  onOpenOnboardModal: () => void;
  onLoadSampleData: () => void;
  onResetData: () => void;
  isSimulated: boolean;
}

export function OnboardingHero({
  onOpenOnboardModal,
  onLoadSampleData,
  onResetData,
  isSimulated,
}: OnboardingHeroProps) {
  const steps = [
    {
      step: "01",
      title: "Connect Repository",
      desc: "Register your GitHub or GitLab repositories with the Aegis monitoring mesh.",
      icon: GitFork,
      status: "action",
    },
    {
      step: "02",
      title: "Automate Webhook",
      desc: "Paste the auto-generated HMAC webhook URL into your Git provider settings.",
      icon: Radio,
      status: "pending",
    },
    {
      step: "03",
      title: "Intercept & Verify",
      desc: "Every commit push triggers sub-50ms entropy analysis and live secret verification.",
      icon: Zap,
      status: "pending",
    },
  ];

  return (
    <div className="bg-surface border border-subtle rounded-2xl p-6 sm:p-8 shadow-subtle space-y-6">
      {/* Hero Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-subtle pb-6">
        <div className="flex items-start space-x-3.5">
          <div className="w-10 h-10 rounded-xl bg-canvas border border-subtle flex items-center justify-center text-primary shrink-0 mt-0.5">
            <Shield className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-base font-semibold text-heading tracking-tight">
                Welcome to Aegis Control Plane
              </h2>
              <span className="bg-canvas border border-subtle text-primary px-2 py-0.5 rounded text-[10px] font-medium">
                Initial Setup
              </span>
            </div>
            <p className="text-xs text-muted mt-1 max-w-xl leading-relaxed">
              Your security workspace is provisioned. Follow the onboarding steps below to deploy real-time secret leak interception across your engineering repositories.
            </p>
          </div>
        </div>

        {/* Primary CTA Buttons */}
        <div className="flex items-center space-x-2.5 self-start md:self-auto shrink-0">
          {!isSimulated ? (
            <button
              type="button"
              onClick={onLoadSampleData}
              className="flex items-center space-x-1.5 bg-canvas hover:bg-subtle/50 text-heading border border-subtle hover:border-interactive px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 text-primary" />
              <span>Simulate Sample Findings</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={onResetData}
              className="flex items-center space-x-1.5 bg-canvas hover:bg-subtle/50 text-heading border border-subtle hover:border-interactive px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-muted" />
              <span>Reset to Clean State</span>
            </button>
          )}

          <button
            type="button"
            onClick={onOpenOnboardModal}
            className="flex items-center space-x-2 bg-primary hover:bg-heading text-surface px-4 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Connect Repository</span>
          </button>
        </div>
      </div>

      {/* 3-Step Guided Flow */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {steps.map((s, idx) => {
          const Icon = s.icon;
          return (
            <div
              key={idx}
              className="bg-canvas border border-subtle rounded-xl p-5 flex flex-col justify-between space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-bold text-primary tracking-wider">
                  STEP {s.step}
                </span>
                <div className="w-6 h-6 rounded-lg bg-surface border border-subtle flex items-center justify-center text-primary">
                  <Icon className="w-3.5 h-3.5" />
                </div>
              </div>

              <div>
                <h4 className="text-xs font-semibold text-heading mb-1">{s.title}</h4>
                <p className="text-[11px] text-muted leading-relaxed">{s.desc}</p>
              </div>

              {idx === 0 && (
                <button
                  type="button"
                  onClick={onOpenOnboardModal}
                  className="inline-flex items-center space-x-1.5 text-xs font-semibold text-primary hover:text-heading transition-colors cursor-pointer pt-1"
                >
                  <span>Connect now</span>
                  <span>→</span>
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Security Assurance Banner */}
      <div className="bg-canvas border border-subtle rounded-xl px-4 py-3 flex items-center justify-between text-xs text-muted">
        <div className="flex items-center space-x-2">
          <Lock className="w-3.5 h-3.5 text-primary shrink-0" />
          <span>
            Zero telemetry leak policy: Credentials detected in code are verified via ephemeral outbound probes and never logged in plaintext.
          </span>
        </div>
        <span className="font-mono text-[10px] hidden sm:inline text-muted shrink-0">
          AES-256 HMAC
        </span>
      </div>
    </div>
  );
}
