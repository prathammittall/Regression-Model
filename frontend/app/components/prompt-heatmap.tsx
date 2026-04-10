"use client";

import type { EvaluationResultItem } from "../types";
import { CAPABILITY_LABELS } from "../types";

interface PromptHeatmapProps {
  results: EvaluationResultItem[];
}

function DeltaCell({ delta }: { delta: number }) {
  const absDelta = Math.min(Math.abs(delta), 2);
  const intensity = absDelta / 2;

  if (delta > 0) {
    const lightness = Math.round(18 + intensity * 40);
    return (
      <div
        className="w-16 h-10 rounded-md flex items-center justify-center text-xs font-bold tabular-nums"
        style={{ backgroundColor: `hsl(0, 0%, ${lightness}%)`, color: "#fff" }}
      >
        +{delta.toFixed(1)}
      </div>
    );
  }

  if (delta < 0) {
    const lightness = Math.round(85 - intensity * 30);
    return (
      <div
        className="w-16 h-10 rounded-md flex items-center justify-center text-xs font-bold tabular-nums"
        style={{ backgroundColor: `hsl(0, 0%, ${lightness}%)`, color: "#000" }}
      >
        {delta.toFixed(1)}
      </div>
    );
  }

  return (
    <div className="w-16 h-10 rounded-md flex items-center justify-center text-xs font-bold tabular-nums bg-neutral-700 text-neutral-200">
      0.0
    </div>
  );
}

function ScoreCell({ score }: { score: number }) {
  const intensity = score / 4;
  const lightness = Math.round(intensity * 80 + 10);
  return (
    <div
      className="w-16 h-10 rounded-md flex items-center justify-center text-xs font-bold tabular-nums"
      style={{
        backgroundColor: `hsl(0, 0%, ${lightness}%)`,
        color: lightness > 50 ? "#000" : "#fff",
      }}
    >
      {score.toFixed(1)}
    </div>
  );
}

export default function PromptHeatmap({ results }: PromptHeatmapProps) {
  return (
    <div className="card">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400 mb-2">
        Prompt Heatmap
      </h3>
      <p className="text-xs text-neutral-600 mb-4">
        Per-prompt score map for Base, Fine-tuned, and Delta
      </p>

      <div className="overflow-x-auto">
        <div className="min-w-230 space-y-2">
          <div className="grid grid-cols-[100px_1fr_72px_72px_72px] gap-3 px-2 pb-2 border-b border-neutral-800">
            <span className="text-xs uppercase tracking-widest text-neutral-600">Prompt</span>
            <span className="text-xs uppercase tracking-widest text-neutral-600">Capability</span>
            <span className="text-xs uppercase tracking-widest text-neutral-600 text-center">Base</span>
            <span className="text-xs uppercase tracking-widest text-neutral-600 text-center">FT</span>
            <span className="text-xs uppercase tracking-widest text-neutral-600 text-center">Delta</span>
          </div>

          {results.map((row) => {
            const delta = row.finetuned_score - row.base_score;
            return (
              <div
                key={row.prompt_id}
                className="grid grid-cols-[100px_1fr_72px_72px_72px] gap-3 items-center px-2 py-1 rounded-md hover:bg-neutral-800/30 transition-colors"
              >
                <span className="text-xs text-neutral-400 font-mono">{row.prompt_id}</span>
                <span className="text-sm text-neutral-300 truncate pr-2">
                  {CAPABILITY_LABELS[row.capability] || row.capability}
                </span>
                <ScoreCell score={row.base_score} />
                <ScoreCell score={row.finetuned_score} />
                <DeltaCell delta={delta} />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}