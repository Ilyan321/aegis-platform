"use client";

import React from "react";
import { ShimmerBlock } from "@/components/DashboardSkeleton";

export function SettingsSkeleton() {
  return (
    <div className="min-h-screen bg-canvas flex flex-col animate-in fade-in duration-150">
      {/* Top Header Skeleton */}
      <header className="bg-surface border-b border-subtle sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShimmerBlock className="w-9 h-9 rounded-xl" delay={0.0} />
            <div className="flex items-center space-x-2">
              <ShimmerBlock className="w-32 h-4 rounded-md" delay={0.05} />
              <div className="w-2 h-2 text-subtle" />
              <ShimmerBlock className="w-24 h-4 rounded-md hidden sm:block" delay={0.1} />
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <ShimmerBlock className="w-28 h-8 rounded-lg" delay={0.15} />
          </div>
        </div>
      </header>

      {/* Main Settings Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 space-y-6">
        {/* Title & Subtitle */}
        <div className="space-y-2">
          <ShimmerBlock className="w-48 h-7 rounded-lg" delay={0.05} />
          <ShimmerBlock className="w-96 max-w-full h-4 rounded-md" delay={0.1} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar Navigation Skeleton */}
          <aside className="lg:col-span-3 space-y-1.5 bg-surface border border-subtle rounded-2xl p-2 shadow-subtle">
            {[0.1, 0.15, 0.2, 0.25].map((d, i) => (
              <div key={i} className="flex items-start space-x-3 px-3.5 py-3 rounded-xl bg-canvas/40">
                <ShimmerBlock className="w-4 h-4 rounded-md shrink-0 mt-0.5" delay={d} />
                <div className="space-y-1.5 flex-1">
                  <ShimmerBlock className="w-20 h-3.5 rounded" delay={d + 0.02} />
                  <ShimmerBlock className="w-36 max-w-full h-2.5 rounded" delay={d + 0.04} />
                </div>
              </div>
            ))}
          </aside>

          {/* Right Main Content Panel Skeleton */}
          <div className="lg:col-span-9 space-y-6">
            {/* Card 1 */}
            <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle space-y-6">
              <div className="border-b border-subtle pb-4 space-y-1.5">
                <ShimmerBlock className="w-36 h-5 rounded-md" delay={0.15} />
                <ShimmerBlock className="w-72 max-w-full h-3 rounded" delay={0.2} />
              </div>

              {/* Avatar / Header row */}
              <div className="flex items-center space-x-5">
                <ShimmerBlock className="w-16 h-16 rounded-2xl shrink-0" delay={0.25} />
                <div className="space-y-2 flex-1">
                  <div className="flex items-center space-x-2">
                    <ShimmerBlock className="w-24 h-7 rounded-lg" delay={0.28} />
                    <ShimmerBlock className="w-24 h-7 rounded-lg" delay={0.3} />
                  </div>
                  <ShimmerBlock className="w-44 h-3 rounded" delay={0.32} />
                </div>
              </div>

              {/* Form Input fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <ShimmerBlock className="w-24 h-3 rounded" delay={0.3} />
                  <ShimmerBlock className="w-full h-9 rounded-xl" delay={0.34} />
                </div>
                <div className="space-y-2">
                  <ShimmerBlock className="w-24 h-3 rounded" delay={0.32} />
                  <ShimmerBlock className="w-full h-9 rounded-xl" delay={0.36} />
                </div>
              </div>

              {/* Bottom Action button */}
              <div className="flex justify-end pt-2">
                <ShimmerBlock className="w-28 h-9 rounded-xl" delay={0.38} />
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-surface border border-subtle rounded-2xl p-6 shadow-subtle space-y-4">
              <div className="border-b border-subtle pb-4 space-y-1.5">
                <ShimmerBlock className="w-40 h-5 rounded-md" delay={0.35} />
                <ShimmerBlock className="w-64 max-w-full h-3 rounded" delay={0.38} />
              </div>
              <div className="space-y-3">
                <ShimmerBlock className="w-full h-12 rounded-xl" delay={0.4} />
                <ShimmerBlock className="w-full h-12 rounded-xl" delay={0.44} />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer Skeleton */}
      <footer className="w-full bg-surface border-t border-subtle py-4 px-6 text-center">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <ShimmerBlock className="w-28 h-3 rounded" delay={0.4} />
          <ShimmerBlock className="w-48 h-3 rounded hidden sm:block" delay={0.42} />
        </div>
      </footer>
    </div>
  );
}
