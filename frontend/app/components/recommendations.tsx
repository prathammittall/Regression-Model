"use client";

import type { Recommendation } from "../types";
import { CAPABILITY_LABELS } from "../types";

interface RecommendationsProps {
  recommendations: Recommendation[];
}

export default function Recommendations({
  recommendations,
}: RecommendationsProps) {
  if (recommendations.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-neutral-500">
          No regressions detected — no recommendations needed.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
        Training Recommendations
      </h3>
      <p className="text-xs text-neutral-600 mb-4">
        Suggested fixes for regressed capabilities
      </p>
      <div className="space-y-3">
        {recommendations.map((rec, i) => (
          <div key={i} className="card">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <span
                  className={`w-2 h-2 rounded-full ${
                    rec.severity === "severe" ? "bg-white" : "bg-neutral-500"
                  }`}
                />
                <span className="text-sm font-semibold">
                  {CAPABILITY_LABELS[rec.capability] || rec.capability}
                </span>
              </div>
              <span
                className={`text-xs font-semibold uppercase tracking-widest px-2.5 py-1 rounded-full border ${
                  rec.severity === "severe"
                    ? "bg-white text-black border-white"
                    : "bg-neutral-800 text-neutral-400 border-neutral-700"
                }`}
              >
                {rec.severity}
              </span>
            </div>

            {rec.description && (
              <p className="text-xs text-neutral-600 mb-3">{rec.description}</p>
            )}

            <p className="text-sm text-neutral-300 leading-relaxed">
              {rec.recommendation}
            </p>

            {rec.score_drop !== undefined && (
              <p className="text-xs text-neutral-600 mt-3 font-mono">
                Score drop: −{rec.score_drop.toFixed(1)} points
              </p>
            )}

            {rec.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-3">
                {rec.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-full border border-neutral-800 text-neutral-500"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
