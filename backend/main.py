from __future__ import annotations

import os
from typing import Any, Dict, List, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from .config import SETTINGS
from .lmstudio_client import chat_completion, judge_score_0_to_5
from .run_analysis import run_analysis
from .lmstudio_client import preflight_check


app = FastAPI(title="LLM Capability Regression Analyzer", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Dev: open to all — restrict in production
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Get the directory where main.py is located
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
STATIC_DIR = os.path.join(os.path.dirname(BACKEND_DIR), "static")

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


class RunRequest(BaseModel):
    use_judge: bool = True
    level: str = "medium"
    questions_per_domain: int = Field(default=100, ge=1, le=500)
    lmstudio_base_url: Optional[str] = None
    finetuned_base_url: Optional[str] = None
    base_model: Optional[str] = None
    finetuned_model: Optional[str] = None
    model: Optional[str] = None
    custom_tests: Optional[List[Dict[str, Any]]] = None


class CompareRequest(BaseModel):
    question: str = Field(min_length=1)
    lmstudio_base_url: Optional[str] = None
    finetuned_base_url: Optional[str] = None

    base_model: Optional[str] = None
    finetuned_model: Optional[str] = None

    base_system_prompt: Optional[str] = None
    finetuned_system_prompt: Optional[str] = None

    temperature: float = Field(default=0.2, ge=0.0, le=2.0)
    max_tokens: int = Field(default=512, ge=32, le=4096)


@app.get("/")
def index():
    return FileResponse(os.path.join(STATIC_DIR, "index.html"))


class PingRequest(BaseModel):
    lmstudio_base_url: Optional[str] = None
    model: Optional[str] = None


@app.post("/api/ping")
def api_ping(req: PingRequest):
    """Quick connectivity check — used by the dashboard 'Test Connection' button."""
    try:
        from .lmstudio_client import preflight_check
        resolved_url = (req.lmstudio_base_url or SETTINGS.lmstudio_base_url).rstrip("/")
        resolved_model = req.model or SETTINGS.model
        preflight_check(model=resolved_model, base_url=resolved_url)
        return {"status": "ok", "endpoint": resolved_url, "model": resolved_model}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"LM Studio unreachable: {e}")


@app.post("/api/run")
def api_run(req: RunRequest):
    try:
        resolved_base_url = (req.lmstudio_base_url or SETTINGS.lmstudio_base_url).rstrip("/")
        resolved_base_model = req.base_model or req.model or SETTINGS.model
        resolved_fine_url = (req.finetuned_base_url or resolved_base_url).rstrip("/")
        resolved_fine_model = req.finetuned_model or resolved_base_model

        preflight_check(model=resolved_base_model, base_url=resolved_base_url)
        if resolved_fine_url != resolved_base_url or resolved_fine_model != resolved_base_model:
            preflight_check(model=resolved_fine_model, base_url=resolved_fine_url)

        return run_analysis(
            use_judge=req.use_judge,
            level=req.level,
            questions_per_domain=req.questions_per_domain,
            custom_tests=req.custom_tests,
            base_url=resolved_base_url,
            base_model=resolved_base_model,
            finetuned_base_url=resolved_fine_url,
            finetuned_model=resolved_fine_model,
            model=req.model,
        )
    except Exception as e:
        message = str(e)
        if "Read timed out" in message or "timeout" in message.lower():
            message = (
                "Model endpoint timed out during warm-up or inference. "
                "Ensure LM Studio is running and the selected model is loaded, then retry with lower questions/domain. "
                f"Original error: {e}"
            )
        raise HTTPException(status_code=502, detail=f"Run failed: {message}")


@app.post("/api/compare-single")
def api_compare_single(req: CompareRequest):
    try:
        question = req.question.strip()
        if not question:
            raise ValueError("Question is required")

        resolved_url = (req.lmstudio_base_url or SETTINGS.lmstudio_base_url).rstrip("/")
        resolved_finetuned_url = (req.finetuned_base_url or resolved_url).rstrip("/")
        base_model = req.base_model or SETTINGS.model
        finetuned_model = req.finetuned_model or SETTINGS.model
        base_prompt = req.base_system_prompt or SETTINGS.base_system_prompt
        finetuned_prompt = req.finetuned_system_prompt or SETTINGS.finetuned_system_prompt

        preflight_check(model=base_model, base_url=resolved_url)
        if finetuned_model != base_model or resolved_finetuned_url != resolved_url:
            preflight_check(model=finetuned_model, base_url=resolved_finetuned_url)

        base_out = chat_completion(
            system_prompt=base_prompt,
            user_prompt=question,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            model=base_model,
            base_url=resolved_url,
        )
        fine_out = chat_completion(
            system_prompt=finetuned_prompt,
            user_prompt=question,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            model=finetuned_model,
            base_url=resolved_finetuned_url,
        )

        # Use BASE model as the rating judge, as requested.
        base_rating = judge_score_0_to_5(
            question=question,
            answer=base_out.text,
            model=base_model,
            base_url=resolved_url,
        )
        fine_rating = judge_score_0_to_5(
            question=question,
            answer=fine_out.text,
            model=base_model,
            base_url=resolved_url,
        )

        base_score = -1.0 if base_rating is None else float(base_rating)
        fine_score = -1.0 if fine_rating is None else float(fine_rating)
        if fine_score > base_score:
            winner = "FINETUNED"
        elif fine_score < base_score:
            winner = "BASE"
        else:
            winner = "TIE"

        return {
            "meta": {
                "base_endpoint": resolved_url + SETTINGS.chat_completions_path,
                "finetuned_endpoint": resolved_finetuned_url + SETTINGS.chat_completions_path,
                "judge_model": base_model,
                "base_model": base_model,
                "finetuned_model": finetuned_model,
                "temperature": req.temperature,
                "max_tokens": req.max_tokens,
            },
            "question": question,
            "base": {
                "system_prompt": base_prompt,
                "output": base_out.text,
                "rating_0_to_5": base_rating,
            },
            "finetuned": {
                "system_prompt": finetuned_prompt,
                "output": fine_out.text,
                "rating_0_to_5": fine_rating,
            },
            "comparison": {
                "winner": winner,
                "delta_rating": None if (base_rating is None or fine_rating is None) else (fine_rating - base_rating),
            },
        }
    except Exception as e:
        message = str(e)
        if "Read timed out" in message or "timeout" in message.lower():
            message = (
                "Model endpoint timed out during single comparison. "
                "Check that LM Studio is active and model is loaded; try a shorter prompt and retry. "
                f"Original error: {e}"
            )
        raise HTTPException(status_code=502, detail=f"Compare failed: {message}")

