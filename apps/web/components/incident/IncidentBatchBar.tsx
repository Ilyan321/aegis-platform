"use client";

import React from "react";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  X,
  Trash2,
  FileCode,
} from "lucide-react";

interface IncidentBatchBarProps {
  selectedCount: number;
  bulkActionLoading: "RESOLVED" | "DISMISSED" | "DELETE" | null;
  onExecuteBulk: (status: "RESOLVED" | "DISMISSED") => void;
  onBulkDelete?: () => void;
  onExportJson?: () => void;
  onClearSelection: () => void;
}

export function IncidentBatchBar({
  selectedCount,
  bulkActionLoading,
  onExecuteBulk,
  onBulkDelete,
  onExportJson,
  onClearSelection,
}: IncidentBatchBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-in slide-in-from-bottom-5 fade-in duration-200">
      <div className="flex items-center space-x-3 px-4 py-2.5 bg-surface/95 backdrop-blur-xl border border-primary/30 rounded-2xl shadow-2xl text-xs">
        <div className="flex items-center space-x-2 pr-2 border-r border-subtle">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-semibold text-heading">
            {selectedCount} {selectedCount === 1 ? "incident" : "incidents"} selected
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            disabled={bulkActionLoading !== null}
            onClick={() => onExecuteBulk("RESOLVED")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-semibold bg-primary text-surface hover:opacity-90 transition-opacity disabled:opacity-50 cursor-pointer shadow-xs"
          >
            {bulkActionLoading === "RESOLVED" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Resolve All</span>
          </button>

          <button
            type="button"
            disabled={bulkActionLoading !== null}
            onClick={() => onExecuteBulk("DISMISSED")}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-medium bg-canvas hover:bg-subtle border border-subtle text-heading transition-colors disabled:opacity-50 cursor-pointer"
          >
            {bulkActionLoading === "DISMISSED" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5 text-muted" />
            )}
            <span>Dismiss All</span>
          </button>

          {onBulkDelete && (
            <button
              type="button"
              disabled={bulkActionLoading !== null}
              onClick={onBulkDelete}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-xl font-medium bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {bulkActionLoading === "DELETE" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Trash2 className="w-3.5 h-3.5" />
              )}
              <span>Delete Selected</span>
            </button>
          )}

          {onExportJson && (
            <button
              type="button"
              onClick={onExportJson}
              className="hidden sm:flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl font-medium bg-canvas hover:bg-subtle border border-subtle text-muted hover:text-heading transition-colors cursor-pointer"
            >
              <FileCode className="w-3.5 h-3.5 text-primary" />
              <span>Export JSON</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClearSelection}
            title="Deselect all (Esc)"
            className="p-1.5 rounded-lg text-muted hover:text-heading hover:bg-canvas transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
