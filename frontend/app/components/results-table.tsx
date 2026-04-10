"use client";

import type { CapabilityReport } from "../types";
import { CAPABILITY_LABELS } from "../types";

interface ResultsTableProps {
  capabilities: CapabilityReport[];
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    improved: "bg-white/10 text-white border-white/20",
    stable: "bg-neutral-500/10 text-neutral-400 border-neutral-500/20",
    regression: "bg-white text-black border-white/40",
  };

  const icons: Record<string, string> = {
    improved: "↑",
    stable: "→",
    regression: "↓",
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider rounded-full border ${
        styles[status] || styles.stable
      }`}
    >
      <span>{icons[status]}</span>
      {status}
    </span>
  );
}

export default function ResultsTable({ capabilities }: ResultsTableProps) {
  return (
    <div className="card overflow-hidden !p-0">
      <div className="px-6 py-4 border-b border-neutral-800">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
          Capability Scores
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-neutral-800">
              <th className="text-left px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Capability
              </th>
              <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Base
              </th>
              <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Fine-tuned
              </th>
              <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Delta
              </th>
              <th className="text-center px-6 py-3 text-xs font-semibold uppercase tracking-widest text-neutral-500">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {capabilities.map((cap, i) => (
              <tr
                key={cap.name}
                className="border-b border-neutral-800/50 hover:bg-neutral-800/30 transition-colors"
                style={{ animationDelay: `${i * 50}ms` }}
              >
                <td className="px-6 py-4 font-medium">
                  {CAPABILITY_LABELS[cap.name] || cap.name}
                </td>
                <td className="px-6 py-4 text-center tabular-nums text-neutral-400">
                  {cap.base_score.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-center tabular-nums">
                  {cap.finetuned_score.toFixed(2)}
                </td>
                <td className="px-6 py-4 text-center tabular-nums font-mono text-sm">
                  <span
                    className={
                      cap.difference > 0
                        ? "text-white"
                        : cap.difference < 0
                        ? "text-neutral-300"
                        : "text-neutral-500"
                    }
                  >
                    {cap.difference > 0 ? "+" : ""}
                    {cap.difference.toFixed(2)}
                  </span>
                </td>
                <td className="px-6 py-4 text-center">
                  <StatusBadge status={cap.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
