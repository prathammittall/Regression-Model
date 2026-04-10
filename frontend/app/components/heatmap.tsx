"use client";

import type { CapabilityReport } from "../types";
import { CAPABILITY_LABELS } from "../types";

interface HeatmapProps {
  capabilities: CapabilityReport[];
}

function ScoreCell({ score, max = 4 }: { score: number; max?: number }) {
  const intensity = score / max;
  // Black and white: higher score = lighter
  const lightness = Math.round(intensity * 80 + 10); // 10% to 90%
  return (
    <div
      className="w-14 h-14 rounded-lg flex items-center justify-center text-sm font-bold tabular-nums transition-all duration-300 hover:scale-110"
      style={{
        backgroundColor: `hsl(0, 0%, ${lightness}%)`,
        color: lightness > 50 ? "#000" : "#fff",
      }}
    >
      {score.toFixed(1)}
    </div>
  );
}

function StatusIndicator({ status }: { status: string }) {
  const config: Record<string, { bg: string; label: string }> = {
    improved: { bg: "bg-white", label: "▲" },
    stable: { bg: "bg-neutral-600", label: "■" },
    regression: { bg: "bg-neutral-300", label: "▼" },
  };
  const c = config[status] || config.stable;

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-sm ${c.bg}`} />
      <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
        {status}
      </span>
    </div>
  );
}

export default function Heatmap({ capabilities }: HeatmapProps) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-6">
        Capability Heatmap
      </h3>

      <div className="space-y-3">
        {/* Header */}
        <div className="grid grid-cols-[1fr_56px_56px_auto] gap-4 items-center px-2 pb-2 border-b border-neutral-800">
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
            Capability
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-600 text-center">
            Base
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-600 text-center">
            FT
          </span>
          <span className="text-xs font-semibold uppercase tracking-widest text-neutral-600">
            Status
          </span>
        </div>

        {/* Rows */}
        {capabilities.map((cap, i) => (
          <div
            key={cap.name}
            className="grid grid-cols-[1fr_56px_56px_auto] gap-4 items-center px-2 py-1 rounded-lg hover:bg-neutral-800/30 transition-colors"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="text-sm font-medium">
              {CAPABILITY_LABELS[cap.name] || cap.name}
            </span>
            <ScoreCell score={cap.base_score} />
            <ScoreCell score={cap.finetuned_score} />
            <StatusIndicator status={cap.status} />
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-neutral-800 flex items-center gap-6">
        <span className="text-xs text-neutral-600">Score scale:</span>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((s) => {
            const l = Math.round((s / 4) * 80 + 10);
            return (
              <div
                key={s}
                className="w-8 h-6 rounded flex items-center justify-center text-[10px] font-bold"
                style={{
                  backgroundColor: `hsl(0, 0%, ${l}%)`,
                  color: l > 50 ? "#000" : "#fff",
                }}
              >
                {s}
              </div>
            );
          })}
        </div>
        <span className="text-xs text-neutral-600 ml-auto">
          1 = Incorrect → 4 = Correct
        </span>
      </div>
    </div>
  );
}
