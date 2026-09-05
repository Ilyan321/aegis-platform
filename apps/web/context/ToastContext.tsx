"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertOctagon, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastOptions {
  title: string;
  description?: string;
  type?: ToastType;
  duration?: number;
}

interface ToastItem extends ToastOptions {
  id: string;
  exiting?: boolean;
}

interface ToastContextType {
  toast: (options: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
  dismiss: () => {},
});

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, exiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 150);
  }, []);

  const toast = useCallback(
    ({ title, description, type = "info", duration = 3500 }: ToastOptions) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = { id, title, description, type, duration };

      setToasts((prev) => [...prev.slice(-4), newToast]); // keep max 5 visible

      if (duration > 0) {
        setTimeout(() => {
          dismiss(id);
        }, duration);
      }
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={{ toast, dismiss }}>
      {children}
      {/* Toast Notification Floating Layer */}
      <div
        role="region"
        aria-label="Notifications"
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0"
      >
        {toasts.map((t) => {
          const isSuccess = t.type === "success";
          const isError = t.type === "error";
          const isWarning = t.type === "warning";

          return (
            <div
              key={t.id}
              role="status"
              aria-live="polite"
              className={`pointer-events-auto bg-surface border border-subtle rounded-xl p-3.5 shadow-elevated flex items-start space-x-3 transition-all ${
                t.exiting ? "animate-toast-out" : "animate-toast-in"
              }`}
            >
              {/* Type Indicator Icon */}
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-4 h-4 text-primary" />}
                {isError && <AlertOctagon className="w-4 h-4 text-heading" />}
                {isWarning && <AlertTriangle className="w-4 h-4 text-primary" />}
                {!isSuccess && !isError && !isWarning && <Info className="w-4 h-4 text-interactive" />}
              </div>

              {/* Text content */}
              <div className="flex-1 min-w-0 pr-1">
                <p className="text-xs font-semibold text-heading leading-tight">{t.title}</p>
                {t.description && (
                  <p className="text-[11px] text-muted leading-snug mt-0.5">{t.description}</p>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => dismiss(t.id)}
                className="shrink-0 w-5 h-5 rounded hover:bg-canvas text-muted hover:text-heading flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close notification"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
