# LLM Capability Regression Analyzer (Offline MVP)

This MVP demonstrates **capability regression** using the **same local model twice** (LM Studio OpenAI-compatible API) by changing only the **system prompt**:

- **Base model**: general-purpose assistant
- **Simulated fine-tuned model**: **legal-specialized** prompt that intentionally biases behavior and causes regressions

It runs a multi-capability test suite (arithmetic/coding/reasoning/knowledge/instruction/safety), scores both outputs, computes deltas, labels **IMPROVED / REGRESSED / STABLE**, and shows diffs + diagnosis + minimal fix suggestions.

## Prerequisites

- Python 3.10+ (you have Python already)
- LM Studio running locally with an OpenAI-compatible server:
  - **Endpoint**: `http://localhost:1234/v1/chat/completions`
  - Model: **Granite 3.1 8B Instruct**

## Install

```bash
cd "e:\Hackathon\NMIMS\001"
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

## Run

1. Start LM Studio server (local).
2. Start backend:

```bash
uvicorn backend.main:app --port 8010
```

3. Open the UI:
   - `http://localhost:8010`

If port 8010 is unavailable on your machine, choose any open port (for example 8000 or 8080).

## Notes

- Fully offline: no external web calls other than your local LM Studio endpoint.
- The “LLM Judge” is optional and also uses the same local model at temperature 0.

