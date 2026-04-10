/**
 * TypeScript type definitions for the LLM Regression Testing System.
 */

// ── API Request Types ────────────────────────────────────────────────────────

export interface ModelConfig {
  endpoint: string;
  api_key: string;
  model_name: string;
}

export interface JudgeConfig {
  endpoint: string;
  api_key: string;
  model_name: string;
}

export interface EvaluationRequest {
  base_model: ModelConfig;
  finetuned_model: ModelConfig;
  use_prometheus: boolean;
  judge_config?: JudgeConfig;
  demo_mode?: boolean;
}

// ── API Response Types ───────────────────────────────────────────────────────

export interface EvaluationResultItem {
  prompt_id: string;
  capability: string;
  prompt: string;
  reference: string;
  base_output: string;
  finetuned_output: string;
  base_score: number;
  finetuned_score: number;
  base_feedback: string;
  finetuned_feedback: string;
}

export interface AggregatedScores {
  [capability: string]: {
    base: number;
    finetuned: number;
  };
}

export interface CapabilityReport {
  name: string;
  base_score: number;
  finetuned_score: number;
  difference: number;
  status: "improved" | "stable" | "regression";
}

export interface FailureExample {
  prompt_id: string;
  capability: string;
  prompt: string;
  base_output: string;
  finetuned_output: string;
  base_score: number;
  finetuned_score: number;
  score_drop: number;
  base_feedback: string;
  finetuned_feedback: string;
}

export interface Recommendation {
  capability: string;
  description?: string;
  severity: "mild" | "severe";
  score_drop?: number;
  recommendation: string;
  tags: string[];
}

export interface SummaryStats {
  total_capabilities: number;
  improved_count: number;
  stable_count: number;
  regressed_count: number;
  total_prompts: number;
  overall_base_score: number;
  overall_finetuned_score: number;
  overall_difference: number;
}

export interface Report {
  summary: SummaryStats;
  capabilities: CapabilityReport[];
  failure_examples: FailureExample[];
  recommendations: Recommendation[];
}

export interface EvaluationResponse {
  status: string;
  results: EvaluationResultItem[];
  aggregated: AggregatedScores;
  report: Report;
}

export interface EvaluationStatus {
  status: "idle" | "running" | "completed" | "error";
  progress: number;
  total: number;
  current: string;
}

// ── UI State ─────────────────────────────────────────────────────────────────

export type AppStep = "input" | "running" | "results";

export const CAPABILITY_LABELS: Record<string, string> = {
  arithmetic: "Arithmetic",
  code_generation: "Code Generation",
  logical_reasoning: "Logical Reasoning",
  general_knowledge: "General Knowledge",
  instruction_following: "Instruction Following",
  safety_compliance: "Safety Compliance",
};
