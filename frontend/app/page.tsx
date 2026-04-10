"use client";

import { useState, useCallback } from "react";
import type {
  ModelConfig,
  JudgeConfig,
  EvaluationResponse,
  EvaluationStatus,
  AppStep,
  SummaryStats,
} from "./types";

import ModelInput from "./components/model-input";
import EvaluationProgress from "./components/evaluation-progress";
import ResultsTable from "./components/results-table";
import BarComparisonChart from "./components/bar-chart";
import Heatmap from "./components/heatmap";
import FailureExamples from "./components/failure-examples";
import Recommendations from "./components/recommendations";

export default function Home() {
  const [step, setStep] = useState<AppStep>("input");
  const [isLoading, setIsLoading] = useState(false);
  const [evalStatus, setEvalStatus] = useState<EvaluationStatus>({
    status: "idle",
    progress: 0,
    total: 0,
    current: "",
  });
  const [data, setData] = useState<EvaluationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pollStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/status");
      if (res.ok) {
        const status: EvaluationStatus = await res.json();
        setEvalStatus(status);
      }
    } catch {
      // Silently ignore polling errors
    }
  }, []);

  const handleSubmit = useCallback(
    async (
      baseModel: ModelConfig,
      finetunedModel: ModelConfig,
      usePrometheus: boolean,
      judgeConfig?: JudgeConfig,
      demoMode?: boolean
    ) => {
      setIsLoading(true);
      setError(null);
      setStep("running");
      setEvalStatus({
        status: "running",
        progress: 0,
        total: 0,
        current: demoMode ? "Starting demo evaluation..." : "Starting evaluation...",
      });

      // Poll for status updates
      const pollInterval = setInterval(pollStatus, 1500);

      try {
        const endpoint = demoMode ? "/api/run-evaluation-demo" : "/api/run-evaluation";
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: demoMode
            ? undefined
            : JSON.stringify({
                base_model: baseModel,
                finetuned_model: finetunedModel,
                use_prometheus: usePrometheus,
                judge_config: judgeConfig,
                demo_mode: false,
              }),
        });

        clearInterval(pollInterval);

        if (!response.ok) {
          const errData = await response.json().catch(() => null);
          throw new Error(
            errData?.detail || `Evaluation failed with status ${response.status}`
          );
        }

        const result: EvaluationResponse = await response.json();
        setData(result);
        setStep("results");
        setEvalStatus({
          status: "completed",
          progress: result.results.length,
          total: result.results.length,
          current: "Complete",
        });
      } catch (err) {
        clearInterval(pollInterval);
        setError(
          err instanceof Error ? err.message : "An unexpected error occurred"
        );
        setStep("input");
        setEvalStatus({ status: "error", progress: 0, total: 0, current: "" });
      } finally {
        setIsLoading(false);
      }
    },
    [pollStatus]
  );

  const handleReset = () => {
    setStep("input");
    setData(null);
    setError(null);
    setIsLoading(false);
    setEvalStatus({ status: "idle", progress: 0, total: 0, current: "" });
  };

  return (
    <div className="flex flex-col flex-1 min-h-screen">
      {/* Minimal header */}
      <header className="border-b border-neutral-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 rounded-md bg-white flex items-center justify-center">
              <span className="text-black text-xs font-black">R</span>
            </div>
            <span className="text-sm font-semibold tracking-wide">
              Regression Tester
            </span>
          </div>
          {step === "results" && (
            <button
              onClick={handleReset}
              className="text-xs text-neutral-500 hover:text-white transition-colors uppercase tracking-widest font-semibold"
            >
              ← New Test
            </button>
          )}
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-start justify-center px-6 py-10">
        <div className="w-full max-w-7xl">
          {/* Error banner */}
          {error && (
            <div className="mb-6 p-4 border border-neutral-700 bg-neutral-900 rounded-lg">
              <div className="flex items-start gap-3">
                <span className="text-white text-lg leading-none">✕</span>
                <div>
                  <p className="text-sm font-semibold mb-1">Evaluation Failed</p>
                  <p className="text-sm text-neutral-400">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Step 1: Input */}
          {step === "input" && (
            <div className="animate-fadeIn pt-8">
              <ModelInput onSubmit={handleSubmit} isLoading={isLoading} />
            </div>
          )}

          {/* Step 2: Progress */}
          {step === "running" && (
            <div className="animate-fadeIn pt-16">
              <EvaluationProgress status={evalStatus} />
            </div>
          )}

          {/* Step 3: Results Dashboard */}
          {step === "results" && data && (
            <div className="animate-fadeIn space-y-8">
              {/* Summary Stats */}
              <SummarySection summary={data.report.summary} />

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Heatmap capabilities={data.report.capabilities} />
                <BarComparisonChart capabilities={data.report.capabilities} />
              </div>

              {/* Results Table */}
              <ResultsTable capabilities={data.report.capabilities} />

              {/* Failures & Recommendations */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <FailureExamples failures={data.report.failure_examples} />
                <Recommendations
                  recommendations={data.report.recommendations}
                />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-neutral-900 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between text-xs text-neutral-600">
          <span>LLM Regression Tester v1.0</span>
          <span>Evaluation: Prometheus 2 / Rule-based</span>
        </div>
      </footer>
    </div>
  );
}

/* ── Summary Stats Section ─────────────────────────────────────────────────── */

function SummarySection({ summary }: { summary: SummaryStats }) {
  const overallStatus =
    summary.overall_difference > 0.2
      ? "Net Improvement"
      : summary.overall_difference < -0.2
      ? "Net Regression"
      : "Stable Overall";

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Evaluation Report</h2>
        <span
          className={`text-xs font-semibold uppercase tracking-widest px-3 py-1.5 rounded-full border ${
            summary.overall_difference > 0.2
              ? "bg-white/10 text-white border-white/20"
              : summary.overall_difference < -0.2
              ? "bg-white text-black border-white"
              : "bg-neutral-800 text-neutral-400 border-neutral-700"
          }`}
        >
          {overallStatus}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
        <div className="stat-card">
          <div className="stat-value">{summary.total_prompts}</div>
          <div className="stat-label">Prompts</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.total_capabilities}</div>
          <div className="stat-label">Categories</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.overall_base_score}</div>
          <div className="stat-label">Base Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{summary.overall_finetuned_score}</div>
          <div className="stat-label">FT Score</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-white">{summary.improved_count}</div>
          <div className="stat-label">Improved</div>
        </div>
        <div className="stat-card">
          <div className="stat-value text-neutral-400">{summary.stable_count}</div>
          <div className="stat-label">Stable</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {summary.regressed_count}
          </div>
          <div className="stat-label">Regressed</div>
        </div>
      </div>
    </div>
  );
}
