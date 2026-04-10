"use client";

import { useState } from "react";
import type { ModelConfig, JudgeConfig } from "../types";

interface ModelInputProps {
  onSubmit: (
    baseModel: ModelConfig,
    finetunedModel: ModelConfig,
    usePrometheus: boolean,
    judgeConfig?: JudgeConfig,
    demoMode?: boolean
  ) => void;
  isLoading: boolean;
}

export default function ModelInput({ onSubmit, isLoading }: ModelInputProps) {
  const [baseEndpoint, setBaseEndpoint] = useState("http://localhost:11434/v1");
  const [baseApiKey, setBaseApiKey] = useState("");
  const [baseModelName, setBaseModelName] = useState("llama3");

  const [ftEndpoint, setFtEndpoint] = useState("http://localhost:11434/v1");
  const [ftApiKey, setFtApiKey] = useState("");
  const [ftModelName, setFtModelName] = useState("llama3-finetuned");

  const [usePrometheus, setUsePrometheus] = useState(false);
  const [judgeEndpoint, setJudgeEndpoint] = useState("");
  const [judgeApiKey, setJudgeApiKey] = useState("");
  const [judgeModelName, setJudgeModelName] = useState(
    "prometheus-eval/prometheus-7b-v2.0"
  );
  const [demoMode, setDemoMode] = useState(true);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const baseModel: ModelConfig = {
      endpoint: baseEndpoint,
      api_key: baseApiKey,
      model_name: baseModelName,
    };
    const finetunedModel: ModelConfig = {
      endpoint: ftEndpoint,
      api_key: ftApiKey,
      model_name: ftModelName,
    };
    const judgeConfig: JudgeConfig | undefined = usePrometheus
      ? { endpoint: judgeEndpoint, api_key: judgeApiKey, model_name: judgeModelName }
      : undefined;

    onSubmit(baseModel, finetunedModel, usePrometheus, judgeConfig, demoMode);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-4xl font-bold tracking-tight">LLM Regression Tester</h1>
        <p className="text-neutral-500 text-lg">
          Detect capability regressions between your base and fine-tuned models
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Base Model */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-neutral-400" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
              Base Model
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">API Endpoint</label>
              <input
                type="text"
                className="input"
                value={baseEndpoint}
                onChange={(e) => setBaseEndpoint(e.target.value)}
                placeholder="http://localhost:11434/v1"
                required
              />
            </div>
            <div>
              <label className="label">Model Name</label>
              <input
                type="text"
                className="input"
                value={baseModelName}
                onChange={(e) => setBaseModelName(e.target.value)}
                placeholder="llama3"
                required
              />
            </div>
            <div>
              <label className="label">API Key (optional)</label>
              <input
                type="password"
                className="input"
                value={baseApiKey}
                onChange={(e) => setBaseApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
          </div>
        </div>

        {/* Finetuned Model */}
        <div className="card">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-2 h-2 rounded-full bg-white" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
              Fine-tuned Model
            </h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="label">API Endpoint</label>
              <input
                type="text"
                className="input"
                value={ftEndpoint}
                onChange={(e) => setFtEndpoint(e.target.value)}
                placeholder="http://localhost:11434/v1"
                required
              />
            </div>
            <div>
              <label className="label">Model Name</label>
              <input
                type="text"
                className="input"
                value={ftModelName}
                onChange={(e) => setFtModelName(e.target.value)}
                placeholder="llama3-finetuned"
                required
              />
            </div>
            <div>
              <label className="label">API Key (optional)</label>
              <input
                type="password"
                className="input"
                value={ftApiKey}
                onChange={(e) => setFtApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Prometheus Judge */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neutral-500" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
              Demo Mode
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setDemoMode(!demoMode)}
            className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
              demoMode ? "bg-white" : "bg-neutral-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
                demoMode
                  ? "translate-x-5 bg-black"
                  : "translate-x-0 bg-neutral-400"
              }`}
            />
          </button>
        </div>

        <p className="text-xs text-neutral-600 mb-4">
          {demoMode
            ? "Demo Mode is ON. The backend simulates both models so you can test instantly."
            : "Demo Mode is OFF. Real model endpoints will be used."}
        </p>

        <div className="border-t border-neutral-800 pt-4" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-neutral-600" />
            <h2 className="text-sm font-semibold uppercase tracking-widest text-neutral-400">
              Evaluation Judge
            </h2>
          </div>
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <span className="text-sm text-neutral-500">
              {usePrometheus ? "Prometheus 2" : "Rule-based (Demo)"}
            </span>
            <button
              type="button"
              onClick={() => setUsePrometheus(!usePrometheus)}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                usePrometheus ? "bg-white" : "bg-neutral-700"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full transition-all duration-200 ${
                  usePrometheus
                    ? "translate-x-5 bg-black"
                    : "translate-x-0 bg-neutral-400"
                }`}
              />
            </button>
          </label>
        </div>

        {usePrometheus && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 pt-4 border-t border-neutral-800">
            <div>
              <label className="label">Judge Endpoint</label>
              <input
                type="text"
                className="input"
                value={judgeEndpoint}
                onChange={(e) => setJudgeEndpoint(e.target.value)}
                placeholder="http://localhost:8001/v1"
              />
            </div>
            <div>
              <label className="label">Judge Model</label>
              <input
                type="text"
                className="input"
                value={judgeModelName}
                onChange={(e) => setJudgeModelName(e.target.value)}
                placeholder="prometheus-7b-v2.0"
              />
            </div>
            <div>
              <label className="label">Judge API Key</label>
              <input
                type="password"
                className="input"
                value={judgeApiKey}
                onChange={(e) => setJudgeApiKey(e.target.value)}
                placeholder="sk-..."
              />
            </div>
          </div>
        )}

        {!usePrometheus && (
          <p className="text-xs text-neutral-600 mt-2">
            Using rule-based heuristic scoring. Enable Prometheus 2 for LLM-judge evaluation.
          </p>
        )}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={isLoading}
        className="btn-primary w-full"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <span className="spinner" />
            Running Evaluation...
          </span>
        ) : (
          "Run Evaluation →"
        )}
      </button>
    </form>
  );
}
