# Regraze

Regraze is a local-first AI regression analysis platform that benchmarks a base model against a fine-tuned (or prompt-specialized) variant and shows exactly where performance improves, stays stable, or regresses.

It includes:

- A FastAPI backend for evaluation orchestration and scoring
- A modern Next.js dashboard for analysis and diagnostics
- Optional single-question side-by-side model comparison
- Prompt template generation for iterative fine-tuning workflows

## What Regraze Solves

When you fine-tune or heavily specialize a model, one domain can improve while others silently degrade. Regraze helps you detect and diagnose those capability shifts before deployment.

Regraze runs benchmark suites across six capability domains:

- Arithmetic
- Coding
- Reasoning
- Knowledge
- Instruction following
- Safety behavior

For each domain, it computes scores for base vs fine-tuned outputs, deltas, pass rates, and status labels: IMPROVED, REGRESSED, or STABLE.

## Dashboard Features

Regraze dashboard includes all core analysis views used in the web tool:

- Overview
  - Benchmark configuration panel (model URL/name, level, questions per domain, judge toggle)
  - Connectivity test button for LM Studio
  - KPI cards for totals, deltas, averages, improved/regressed rates
  - Capability charts and summary table

- Heatmap
  - Domain-wise outcome tiles with status color coding
  - Delta chart showing fine-tuned minus base score per capability
  - Pass-rate movement indicators

- Global Comparison
  - Aggregate metrics and distribution of improved/stable/regressed domains
  - Base vs fine-tuned trend chart by capability
  - Top improvements and top regressions with question-level context

- Diagnosis
  - Regression-focused issue cards
  - Likely causes and minimal actionable fix suggestions

- Diff Viewer
  - Side-by-side output comparison (base vs fine-tuned)
  - Status filtering (ALL/IMPROVED/STABLE/REGRESSED)
  - Search by capability or question
  - Rule/final score visibility and delta labels

- Single Compare
  - One-question ad hoc comparison between two model setups
  - Custom base and fine-tuned system prompts
  - Winner label (BASE/FINETUNED/TIE) and rating delta

- Prompt Template
  - Generated fine-tuned retrieval/system prompt template
  - One-click copy and usage guidance

## Tech Stack

- Backend: FastAPI, Pydantic, Requests
- Frontend: Next.js (App Router), React, Recharts
- Model Runtime: LM Studio (OpenAI-compatible local endpoint)

## Project Structure

```text
.
|- backend/                 # FastAPI API, test suite generation, scoring, diagnosis
|- dashboard/               # Next.js dashboard UI
|- static/                  # Legacy static UI served by backend root
|- requirements.txt         # Python dependencies
`- README.md
```

## API Endpoints

- POST /api/ping
  - Validates LM Studio reachability and model readiness.

- POST /api/run
  - Runs full benchmark analysis and returns summary, comparisons, runs, diagnosis, and metadata.

- POST /api/compare-single
  - Runs one-question base vs fine-tuned comparison with 0-5 rating.

## Prerequisites

- Python 3.10+
- Node.js 18+
- LM Studio running locally with API server enabled

Recommended LM Studio base URL:

- <http://localhost:1234/v1>

## Setup

### 1. Clone and install backend dependencies

```bash
cd e:\Hackathon\phase2-ai
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Install dashboard dependencies

```bash
cd dashboard
npm install
```

## Run Locally

### 1. Start LM Studio

- Load your model in LM Studio
- Start the local server (OpenAI-compatible mode)

### 2. Start backend

From project root:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port 8000 --reload
```

### 3. Start dashboard

In a second terminal:

```bash
cd dashboard
npm run dev
```

Open:

- Dashboard: <http://localhost:3000>
- Backend API: <http://localhost:8000>

If your backend is on a different port, set:

```bash
set NEXT_PUBLIC_BACKEND_URL=http://localhost:YOUR_PORT
```

and restart the dashboard.

## Typical Workflow

1. Open Overview and set endpoint/model.
2. Test connection.
3. Run analysis for your selected level and question volume.
4. Inspect Heatmap and Comparison for high-level shifts.
5. Use Diagnosis + Diff Viewer to drill into regressions.
6. Apply prompt/fine-tune changes.
7. Re-run benchmark and validate improvements.

## Notes

- Fully local/offline evaluation flow (except your own local model endpoint).
- Optional judge scoring uses local model infrastructure as well.
- Analysis runtime scales with question volume and model speed.

## Troubleshooting

- Connection failed
  - Verify LM Studio server is running and URL is correct.
  - Confirm the selected model is loaded.

- Runs timing out
  - Reduce questions per domain.
  - Use a smaller/faster model.
  - Ensure no competing heavy workloads are saturating CPU/GPU.

- Empty charts/sections
  - Run analysis first; views depend on /api/run output.

## Version

Current dashboard footer: v0.1.0
