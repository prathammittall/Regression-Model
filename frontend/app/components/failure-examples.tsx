"use client";

import { useState } from "react";
import type { FailureExample } from "../types";
import { CAPABILITY_LABELS } from "../types";

interface FailureExamplesProps {
  failures: FailureExample[];
}

function FailureCard({ failure }: { failure: FailureExample }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="card !p-0 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-center justify-between hover:bg-neutral-800/30 transition-colors"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
              {CAPABILITY_LABELS[failure.capability] || failure.capability}
            </span>
            <span className="text-xs font-mono text-neutral-600">
              {failure.prompt_id}
            </span>
          </div>
          <p className="text-sm truncate pr-4">{failure.prompt}</p>
        </div>
        <div className="flex items-center gap-4 shrink-0">
          <div className="text-right">
            <div className="text-xs text-neutral-500">Score drop</div>
            <div className="text-lg font-bold tabular-nums">
              −{failure.score_drop}
            </div>
          </div>
          <span
            className={`text-neutral-500 transition-transform duration-200 ${
              expanded ? "rotate-180" : ""
            }`}
          >
            ▾
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-neutral-800 px-5 py-4 space-y-4 animate-fadeIn">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Base model response */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  Base Model
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  Score: {failure.base_score}/4
                </span>
              </div>
              <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-3 text-sm text-neutral-300 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto">
                {failure.base_output}
              </div>
              {failure.base_feedback && (
                <p className="text-xs text-neutral-600 italic">
                  {failure.base_feedback}
                </p>
              )}
            </div>

            {/* Fine-tuned model response */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
                  Fine-tuned Model
                </span>
                <span className="text-xs font-mono px-2 py-0.5 rounded bg-white/10 text-neutral-300 border border-neutral-700">
                  Score: {failure.finetuned_score}/4
                </span>
              </div>
              <div className="bg-neutral-900 border border-neutral-700 rounded-lg p-3 text-sm text-neutral-300 font-mono text-xs leading-relaxed max-h-48 overflow-y-auto">
                {failure.finetuned_output}
              </div>
              {failure.finetuned_feedback && (
                <p className="text-xs text-neutral-600 italic">
                  {failure.finetuned_feedback}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function FailureExamples({ failures }: FailureExamplesProps) {
  if (failures.length === 0) {
    return (
      <div className="card text-center py-8">
        <p className="text-neutral-500">
          No failure examples — the fine-tuned model matched or exceeded the base model on all prompts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
        Failure Examples ({failures.length})
      </h3>
      <p className="text-xs text-neutral-600 mb-4">
        Prompts where the base model outperformed the fine-tuned model
      </p>
      <div className="space-y-2">
        {failures.map((f) => (
          <FailureCard key={f.prompt_id} failure={f} />
        ))}
      </div>
    </div>
  );
}
