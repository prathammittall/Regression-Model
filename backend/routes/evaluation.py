"""
Evaluation Routes
Handles running evaluations against both models and returning results.
"""

import json
import asyncio
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services.model_runner import run_prompt
from services.demo_runner import generate_demo_response
from services.scorer import score_response
from services.analyzer import (
    aggregate_scores,
    detect_regressions,
    find_failure_examples,
    compute_summary_stats,
)
from services.diagnosis import generate_recommendations

router = APIRouter()

# ── In-memory result cache ────────────────────────────────────────────────────
_cached_results: Optional[dict] = None
_evaluation_status: dict = {"status": "idle", "progress": 0, "total": 0, "current": ""}


# ── Request / Response Models ─────────────────────────────────────────────────

class ModelConfig(BaseModel):
    endpoint: str
    api_key: str = ""
    model_name: str


class JudgeConfig(BaseModel):
    endpoint: str = ""
    api_key: str = ""
    model_name: str = "prometheus-eval/prometheus-7b-v2.0"


class EvaluationRequest(BaseModel):
    base_model: ModelConfig
    finetuned_model: ModelConfig
    use_prometheus: bool = False
    judge_config: Optional[JudgeConfig] = None
    demo_mode: bool = False


class EvaluationResult(BaseModel):
    prompt_id: str
    capability: str
    prompt: str
    base_output: str
    finetuned_output: str
    base_score: int
    finetuned_score: int
    base_feedback: str
    finetuned_feedback: str


# ── Load prompts ──────────────────────────────────────────────────────────────

def load_prompts() -> dict:
    prompts_path = Path(__file__).parent.parent / "evals" / "prompts.json"
    with open(prompts_path, "r", encoding="utf-8") as f:
        return json.load(f)


# ── Endpoints ─────────────────────────────────────────────────────────────────

@router.get("/status")
async def get_evaluation_status():
    """Get current evaluation progress."""
    return _evaluation_status


@router.post("/run-evaluation")
async def run_evaluation(request: EvaluationRequest):
    """
    Run the full evaluation pipeline:
    1. Load benchmark prompts
    2. Send each prompt to both models
    3. Score all responses
    4. Aggregate, detect regressions, find failures, generate recommendations
    """
    return await _execute_evaluation(request)


@router.post("/run-evaluation-demo")
async def run_evaluation_demo():
    """Run a full demo evaluation without calling external model endpoints."""
    demo_request = EvaluationRequest(
        base_model=ModelConfig(endpoint="demo://local", model_name="demo-base"),
        finetuned_model=ModelConfig(endpoint="demo://local", model_name="demo-finetuned"),
        use_prometheus=False,
        judge_config=None,
        demo_mode=True,
    )
    return await _execute_evaluation(demo_request)


async def _execute_evaluation(request: EvaluationRequest):
    global _cached_results, _evaluation_status

    # Reset status
    _evaluation_status = {"status": "running", "progress": 0, "total": 0, "current": "Loading prompts..."}

    try:
        prompts = load_prompts()

        # Flatten prompts into a list with capability info
        all_prompts = []
        for capability, prompt_list in prompts.items():
            for p in prompt_list:
                all_prompts.append({
                    "capability": capability,
                    "prompt_id": p["id"],
                    "prompt": p["prompt"],
                    "reference": p["reference"],
                })

        total = len(all_prompts)
        _evaluation_status["total"] = total

        results = []
        is_demo = request.demo_mode

        for idx, p in enumerate(all_prompts):
            _evaluation_status["progress"] = idx
            prefix = "[DEMO] " if is_demo else ""
            _evaluation_status["current"] = f"{prefix}[{p['capability']}] {p['prompt'][:60]}..."

            if is_demo:
                base_output = generate_demo_response(
                    prompt_id=p["prompt_id"],
                    capability=p["capability"],
                    prompt=p["prompt"],
                    reference=p["reference"],
                    is_finetuned=False,
                )
                ft_output = generate_demo_response(
                    prompt_id=p["prompt_id"],
                    capability=p["capability"],
                    prompt=p["prompt"],
                    reference=p["reference"],
                    is_finetuned=True,
                )
            else:
                # Run prompt on both models concurrently
                base_task = run_prompt(
                    endpoint=request.base_model.endpoint,
                    model_name=request.base_model.model_name,
                    prompt=p["prompt"],
                    api_key=request.base_model.api_key or None,
                )
                ft_task = run_prompt(
                    endpoint=request.finetuned_model.endpoint,
                    model_name=request.finetuned_model.model_name,
                    prompt=p["prompt"],
                    api_key=request.finetuned_model.api_key or None,
                )
                base_output, ft_output = await asyncio.gather(base_task, ft_task)

            # Score both responses
            use_prom = request.use_prometheus and request.judge_config is not None and not is_demo
            judge_endpoint = request.judge_config.endpoint if request.judge_config else None
            judge_model = request.judge_config.model_name if request.judge_config else None
            judge_key = request.judge_config.api_key if request.judge_config else None

            base_score_task = score_response(
                prompt=p["prompt"],
                response=base_output,
                reference=p["reference"],
                capability=p["capability"],
                use_prometheus=use_prom,
                judge_endpoint=judge_endpoint,
                judge_model=judge_model,
                judge_api_key=judge_key,
            )
            ft_score_task = score_response(
                prompt=p["prompt"],
                response=ft_output,
                reference=p["reference"],
                capability=p["capability"],
                use_prometheus=use_prom,
                judge_endpoint=judge_endpoint,
                judge_model=judge_model,
                judge_api_key=judge_key,
            )

            base_result, ft_result = await asyncio.gather(base_score_task, ft_score_task)

            results.append({
                "prompt_id": p["prompt_id"],
                "capability": p["capability"],
                "prompt": p["prompt"],
                "reference": p["reference"],
                "base_output": base_output,
                "finetuned_output": ft_output,
                "base_score": base_result["score"],
                "finetuned_score": ft_result["score"],
                "base_feedback": base_result["feedback"],
                "finetuned_feedback": ft_result["feedback"],
            })

        # ── Analyze ───────────────────────────────────────────────────────
        _evaluation_status["current"] = "Analyzing results..."

        aggregated = aggregate_scores(results)
        capabilities = detect_regressions(aggregated)
        failure_examples = find_failure_examples(results)
        recommendations = generate_recommendations(capabilities)
        summary = compute_summary_stats(capabilities, results)

        # Cache results
        _cached_results = {
            "status": "completed",
            "results": results,
            "aggregated": aggregated,
            "report": {
                "summary": summary,
                "capabilities": capabilities,
                "failure_examples": failure_examples,
                "recommendations": recommendations,
            },
        }

        _evaluation_status = {
            "status": "completed",
            "progress": total,
            "total": total,
            "current": "Evaluation complete.",
        }

        return _cached_results

    except Exception as e:
        _evaluation_status = {
            "status": "error",
            "progress": 0,
            "total": 0,
            "current": f"Error: {str(e)}",
        }
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/results")
async def get_results():
    """Return cached evaluation results."""
    if _cached_results is None:
        raise HTTPException(status_code=404, detail="No evaluation results available. Run an evaluation first.")
    return {
        "aggregated": _cached_results["aggregated"],
        "results": _cached_results["results"],
    }


@router.get("/report")
async def get_report():
    """Return cached regression analysis report."""
    if _cached_results is None:
        raise HTTPException(status_code=404, detail="No report available. Run an evaluation first.")
    return _cached_results["report"]
