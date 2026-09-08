"use client";

import React from "react";

export function ShimmerBlock({
  className = "",
  delay = 0,
}: {
  className?: string;
  delay?: number;
}) {
  return (
    <div
      className={`shimmer-block rounded-lg ${className}`}
      style={delay ? { animationDelay: `${delay}s` } : undefined}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col animate-in fade-in duration-150">
      {/* Top Navbar Skeleton */}
      <header className="border-b border-subtle bg-surface sticky top-0 z-40 px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <ShimmerBlock className="w-8 h-8 rounded-xl" delay={0.0} />
              <ShimmerBlock className="w-20 h-5 rounded-md" delay={0.05} />
            </div>
            <div className="h-4 w-px bg-subtle/60" />
            <ShimmerBlock className="w-36 h-6 rounded-md hidden sm:block" delay={0.1} />
          </div>

          <div className="hidden md:flex items-center space-x-1.5 p-1 bg-canvas border border-subtle rounded-xl">
            <ShimmerBlock className="w-24 h-7 rounded-lg" delay={0.1} />
            <ShimmerBlock className="w-24 h-7 rounded-lg" delay={0.15} />
            <ShimmerBlock className="w-24 h-7 rounded-lg" delay={0.2} />
          </div>

          <div className="flex items-center space-x-3">
            <ShimmerBlock className="w-36 h-8 rounded-xl hidden sm:block" delay={0.15} />
            <ShimmerBlock className="w-8 h-8 rounded-xl" delay={0.2} />
            <ShimmerBlock className="w-32 h-8 rounded-xl" delay={0.25} />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 space-y-6 flex-1">
        {/* Unified Security Posture Ribbon Skeleton */}
        <div className="bg-surface border border-subtle rounded-2xl p-4 sm:p-5 shadow-card">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-0 lg:divide-x lg:divide-subtle/80">
            {[
              { id: 1, delay: 0.1 },
              { id: 2, delay: 0.18 },
              { id: 3, delay: 0.26 },
              { id: 4, delay: 0.34 },
            ].map((section, idx) => (
              <div
                key={section.id}
                className={`flex flex-col justify-between space-y-3 ${
                  idx > 0 ? "lg:pl-6" : ""
                } ${idx < 3 ? "lg:pr-6" : ""}`}
              >
                <div className="flex items-center justify-between">
                  <ShimmerBlock className="w-24 h-3.5 rounded" delay={section.delay} />
                  <ShimmerBlock className="w-4 h-4 rounded" delay={section.delay + 0.05} />
                </div>
                <ShimmerBlock className="w-28 h-7 rounded" delay={section.delay + 0.1} />
                <ShimmerBlock className="w-36 h-3 rounded" delay={section.delay + 0.15} />
              </div>
            ))}
          </div>
        </div>

        {/* Filter Toolbar & Actions */}
        <div className="bg-surface border border-subtle rounded-xl p-4 shadow-card flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 lg:pb-0">
            <ShimmerBlock className="w-24 h-8 rounded-xl shrink-0" delay={0.3} />
            <ShimmerBlock className="w-24 h-8 rounded-xl shrink-0" delay={0.35} />
            <ShimmerBlock className="w-28 h-8 rounded-xl shrink-0" delay={0.4} />
            <ShimmerBlock className="w-20 h-8 rounded-xl shrink-0" delay={0.45} />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ShimmerBlock className="w-64 h-9 rounded-xl" delay={0.4} />
            <ShimmerBlock className="w-32 h-9 rounded-xl" delay={0.45} />
            <ShimmerBlock className="w-32 h-9 rounded-xl" delay={0.5} />
          </div>
        </div>

        {/* Forensic Incident Ledger Table */}
        <div className="bg-surface border border-subtle rounded-xl shadow-card overflow-hidden">
          {/* Table Header Bar */}
          <div className="p-4 border-b border-subtle flex items-center justify-between bg-canvas/30">
            <ShimmerBlock className="w-36 h-4 rounded" delay={0.45} />
            <div className="flex items-center space-x-2">
              <ShimmerBlock className="w-20 h-7 rounded-lg" delay={0.5} />
              <ShimmerBlock className="w-24 h-7 rounded-lg" delay={0.55} />
              <ShimmerBlock className="w-24 h-7 rounded-lg" delay={0.6} />
            </div>
          </div>

          {/* Table Column Headers */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-subtle bg-canvas/20">
            <div className="col-span-1 flex items-center">
              <ShimmerBlock className="w-4 h-4 rounded" delay={0.5} />
            </div>
            <div className="col-span-1">
              <ShimmerBlock className="w-14 h-3 rounded" delay={0.52} />
            </div>
            <div className="col-span-2">
              <ShimmerBlock className="w-28 h-3 rounded" delay={0.54} />
            </div>
            <div className="col-span-3">
              <ShimmerBlock className="w-24 h-3 rounded" delay={0.56} />
            </div>
            <div className="col-span-2">
              <ShimmerBlock className="w-20 h-3 rounded" delay={0.58} />
            </div>
            <div className="col-span-1">
              <ShimmerBlock className="w-16 h-3 rounded" delay={0.6} />
            </div>
            <div className="col-span-1">
              <ShimmerBlock className="w-14 h-3 rounded" delay={0.62} />
            </div>
            <div className="col-span-1 text-right">
              <ShimmerBlock className="w-12 h-3 rounded ml-auto" delay={0.64} />
            </div>
          </div>

          {/* Table Shimmering Rows (Top-to-Bottom Staggered Sweep) */}
          <div className="divide-y divide-subtle/50">
            {[1, 2, 3, 4, 5, 6].map((rowIdx) => {
              const rowDelay = 0.5 + rowIdx * 0.08;
              return (
                <div
                  key={rowIdx}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center"
                >
                  <div className="col-span-1 flex items-center">
                    <ShimmerBlock className="w-4 h-4 rounded" delay={rowDelay} />
                  </div>
                  <div className="col-span-1">
                    <ShimmerBlock className="w-16 h-5 rounded-md" delay={rowDelay + 0.02} />
                  </div>
                  <div className="col-span-2 space-y-1.5">
                    <ShimmerBlock className="w-32 h-4 rounded" delay={rowDelay + 0.04} />
                    <ShimmerBlock className="w-20 h-3 rounded" delay={rowDelay + 0.06} />
                  </div>
                  <div className="col-span-3">
                    <ShimmerBlock className="w-48 h-4 rounded font-mono" delay={rowDelay + 0.08} />
                  </div>
                  <div className="col-span-2">
                    <ShimmerBlock className="w-36 h-6 rounded-md" delay={rowDelay + 0.1} />
                  </div>
                  <div className="col-span-1">
                    <ShimmerBlock className="w-20 h-4 rounded-full" delay={rowDelay + 0.12} />
                  </div>
                  <div className="col-span-1">
                    <ShimmerBlock className="w-16 h-4 rounded" delay={rowDelay + 0.14} />
                  </div>
                  <div className="col-span-1 flex justify-end">
                    <ShimmerBlock className="w-16 h-7 rounded-lg" delay={rowDelay + 0.16} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      {/* Footer Skeleton */}
      <footer className="w-full bg-surface border-t border-subtle py-4 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <ShimmerBlock className="w-32 h-3.5 rounded" delay={1.0} />
          <ShimmerBlock className="w-48 h-3.5 rounded" delay={1.05} />
        </div>
      </footer>
    </div>
  );
}
