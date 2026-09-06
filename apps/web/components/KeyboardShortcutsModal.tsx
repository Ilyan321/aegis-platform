"use client";

import React, { useEffect } from "react";
import { X, Command, Keyboard, Navigation, Layers, Shield } from "lucide-react";

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  description: string;
}

interface ShortcutCategory {
  title: string;
  icon: React.ReactNode;
  shortcuts: ShortcutItem[];
}

export function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const categories: ShortcutCategory[] = [
    {
      title: "Table Navigation & Selection",
      icon: <Navigation className="w-4 h-4 text-primary" />,
      shortcuts: [
        { keys: ["j", "↓"], description: "Focus next incident row" },
        { keys: ["k", "↑"], description: "Focus previous incident row" },
        { keys: ["x"], description: "Toggle row selection checkbox" },
        { keys: ["Enter"], description: "Open focused incident forensic detail" },
        { keys: ["e"], description: "Quick-resolve focused (or selected) incidents" },
        { keys: ["Esc"], description: "Deselect all rows / close modals" },
      ],
    },
    {
      title: "Global Navigation & Search",
      icon: <Command className="w-4 h-4 text-primary" />,
      shortcuts: [
        { keys: ["⌘", "K"], description: "Open Quick Command Palette" },
        { keys: ["/"], description: "Focus incident search filter" },
        { keys: ["?"], description: "Toggle this Keyboard Shortcuts cheat sheet" },
      ],
    },
    {
      title: "Incident Detail Modal",
      icon: <Layers className="w-4 h-4 text-primary" />,
      shortcuts: [
        { keys: ["1"], description: "Switch to 'Overview & Code' tab" },
        { keys: ["2"], description: "Switch to 'Remediation Playbook' tab" },
        { keys: ["3"], description: "Switch to 'Audit & SIEM' tab" },
        { keys: ["Esc"], description: "Close Forensic Detail Modal" },
      ],
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-surface border border-subtle rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-subtle bg-canvas/40">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-heading">Keyboard Shortcuts</h2>
              <p className="text-[11px] text-muted">High-velocity keyboard ergonomics for SOC operators</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-subtle/50 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {categories.map((cat, idx) => (
            <div key={idx} className="space-y-2.5">
              <div className="flex items-center space-x-2 text-xs font-semibold text-heading uppercase tracking-wider">
                {cat.icon}
                <span>{cat.title}</span>
              </div>
              <div className="grid grid-cols-1 gap-1.5 bg-canvas/40 border border-subtle rounded-xl p-2.5">
                {cat.shortcuts.map((item, sIdx) => (
                  <div
                    key={sIdx}
                    className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface/80 transition-colors text-xs"
                  >
                    <span className="text-muted">{item.description}</span>
                    <div className="flex items-center space-x-1 shrink-0">
                      {item.keys.map((k, kIdx) => (
                        <kbd
                          key={kIdx}
                          className="min-w-[22px] h-[22px] px-1.5 flex items-center justify-center font-mono text-[11px] font-semibold text-heading bg-surface border border-subtle rounded shadow-xs"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-subtle bg-canvas/40 flex items-center justify-between text-[11px] text-muted">
          <div className="flex items-center space-x-1.5">
            <Shield className="w-3.5 h-3.5 text-primary" />
            <span>Aegis SOC Command Ergonomics</span>
          </div>
          <span>Press <kbd className="px-1.5 py-0.5 font-mono text-[10px] bg-surface border border-subtle rounded text-heading">Esc</kbd> to dismiss</span>
        </div>
      </div>
    </div>
  );
}
