"use client";

import React from "react";

export function ShimmerBlock({ className = "" }: { className?: string }) {
  return (
    <div
      className={`bg-subtle/40 relative overflow-hidden rounded-lg before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_2s_infinite] before:bg-gradient-to-r before:from-transparent before:via-surface/60 before:to-transparent ${className}`}
    />
  );
}

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col animate-in fade-in duration-150">
      {/* Skeleton Navbar */}
      <header className="border-b border-subtle bg-surface sticky top-0 z-40 px-6 py-3 shadow-xs">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2.5">
              <ShimmerBlock className="w-8 h-8 rounded-xl" />
              <ShimmerBlock className="w-16 h-5 rounded-md" />
            </div>
            <div className="h-4 w-px bg-subtle/60" />
            <ShimmerBlock className="w-32 h-6 rounded-md hidden sm:block" />
          </div>

          <div className="hidden md:flex items-center space-x-1.5 p-1 bg-canvas border border-subtle rounded-xl">
            <ShimmerBlock className="w-24 h-7 rounded-lg" />
            <ShimmerBlock className="w-24 h-7 rounded-lg" />
            <ShimmerBlock className="w-24 h-7 rounded-lg" />
          </div>

          <div className="flex items-center space-x-3">
            <ShimmerBlock className="w-36 h-8 rounded-xl hidden sm:block" />
            <ShimmerBlock className="w-8 h-8 rounded-xl" />
            <ShimmerBlock className="w-32 h-8 rounded-xl" />
          </div>
        </div>
      </header>

      {/* Skeleton Main Container */}
      <main className="max-w-7xl w-full mx-auto px-6 py-8 space-y-6 flex-1">
        {/* 4 Telemetry Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="bg-surface border border-subtle rounded-2xl p-5 shadow-card flex flex-col justify-between h-32 relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <ShimmerBlock className="w-32 h-3.5 rounded" />
                <ShimmerBlock className="w-5 h-5 rounded-md" />
              </div>
              <div>
                <ShimmerBlock className="w-20 h-8 rounded mb-2" />
                <ShimmerBlock className="w-24 h-3 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Filter Pills & Action Controls Bar */}
        <div className="bg-surface border border-subtle rounded-2xl p-4 shadow-card flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 lg:pb-0">
            <ShimmerBlock className="w-24 h-8 rounded-xl shrink-0" />
            <ShimmerBlock className="w-24 h-8 rounded-xl shrink-0" />
            <ShimmerBlock className="w-28 h-8 rounded-xl shrink-0" />
            <ShimmerBlock className="w-20 h-8 rounded-xl shrink-0" />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <ShimmerBlock className="w-64 h-9 rounded-xl" />
            <ShimmerBlock className="w-32 h-9 rounded-xl" />
            <ShimmerBlock className="w-32 h-9 rounded-xl" />
          </div>
        </div>

        {/* Incidents Forensic Table Skeleton */}
        <div className="bg-surface border border-subtle rounded-2xl shadow-card overflow-hidden">
          {/* Table Header Bar */}
          <div className="p-4 border-b border-subtle flex items-center justify-between bg-canvas/30">
            <ShimmerBlock className="w-32 h-4 rounded" />
            <div className="flex items-center space-x-2">
              <ShimmerBlock className="w-20 h-7 rounded-lg" />
              <ShimmerBlock className="w-24 h-7 rounded-lg" />
              <ShimmerBlock className="w-24 h-7 rounded-lg" />
            </div>
          </div>

          {/* Table Column Headers */}
          <div className="grid grid-cols-12 gap-4 px-6 py-3 border-b border-subtle bg-canvas/20">
            <div className="col-span-1 flex items-center">
              <ShimmerBlock className="w-4 h-4 rounded" />
            </div>
            <div className="col-span-1">
              <ShimmerBlock className="w-14 h-3 rounded" />
            </div>
            <div className="col-span-2">
              <ShimmerBlock className="w-28 h-3 rounded" />
            </div>
            <div className="col-span-3">
              <ShimmerBlock className="w-24 h-3 rounded" />
            </div>
            <div className="col-span-2">
              <ShimmerBlock className="w-20 h-3 rounded" />
            </div>
            <div className="col-span-1">
              <ShimmerBlock className="w-16 h-3 rounded" />
            </div>
            <div className="col-span-1">
              <ShimmerBlock className="w-14 h-3 rounded" />
            </div>
            <div className="col-span-1 text-right">
              <ShimmerBlock className="w-12 h-3 rounded ml-auto" />
            </div>
          </div>

          {/* Table Shimmering Rows */}
          <div className="divide-y divide-subtle/50">
            {[1, 2, 3, 4, 5, 6].map((row) => (
              <div
                key={row}
                className="grid grid-cols-12 gap-4 px-6 py-4 items-center"
              >
                <div className="col-span-1 flex items-center">
                  <ShimmerBlock className="w-4 h-4 rounded" />
                </div>
                <div className="col-span-1">
                  <ShimmerBlock className="w-16 h-5 rounded-md" />
                </div>
                <div className="col-span-2 space-y-1.5">
                  <ShimmerBlock className="w-32 h-4 rounded" />
                  <ShimmerBlock className="w-20 h-3 rounded" />
                </div>
                <div className="col-span-3">
                  <ShimmerBlock className="w-44 h-4 rounded font-mono" />
                </div>
                <div className="col-span-2">
                  <ShimmerBlock className="w-36 h-6 rounded-md" />
                </div>
                <div className="col-span-1">
                  <ShimmerBlock className="w-20 h-4 rounded-full" />
                </div>
                <div className="col-span-1">
                  <ShimmerBlock className="w-16 h-4 rounded" />
                </div>
                <div className="col-span-1 flex justify-end">
                  <ShimmerBlock className="w-16 h-7 rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
