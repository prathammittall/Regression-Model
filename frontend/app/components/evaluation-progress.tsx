"use client";

import type { EvaluationStatus } from "../types";

interface EvaluationProgressProps {
  status: EvaluationStatus;
}

export default function EvaluationProgress({ status }: EvaluationProgressProps) {
  const progress =
    status.total > 0 ? Math.round((status.progress / status.total) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto space-y-8 text-center">
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Running Evaluation</h2>
        <p className="text-neutral-500">
          Testing both models across all capability categories
        </p>
      </div>

      {/* Progress ring */}
      <div className="flex justify-center">
        <div className="relative w-40 h-40">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#1a1a1a"
              strokeWidth="8"
            />
            <circle
              cx="60"
              cy="60"
              r="52"
              fill="none"
              stroke="#ffffff"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 52}`}
              strokeDashoffset={`${2 * Math.PI * 52 * (1 - progress / 100)}`}
              className="transition-all duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold tabular-nums">{progress}%</span>
            <span className="text-xs text-neutral-500 mt-1">
              {status.progress}/{status.total}
            </span>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-3">
        <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-sm text-neutral-500 font-mono truncate max-w-lg mx-auto">
          {status.current}
        </p>
      </div>

      {/* Animated dots */}
      <div className="flex justify-center gap-1.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-neutral-400"
            style={{
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
