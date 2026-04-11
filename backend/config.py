from __future__ import annotations

import os

from pydantic import BaseModel


class Settings(BaseModel):
    # Default to localhost — overridden per-request from the dashboard UI
    lmstudio_base_url: str = os.environ.get("LMSTUDIO_BASE_URL", "http://localhost:1234/v1")
    chat_completions_path: str = "/chat/completions"
    model: str = os.environ.get("LMSTUDIO_MODEL", "granite-3.1-8b-instruct")

    # Per-request timeout — enough for a single LLM call, not the whole benchmark
    request_timeout_s: float = 60.0

    # Preflight: just checking connectivity, should be fast
    preflight_timeout_s: float = 10.0

    base_system_prompt: str = (
        "You are a helpful, accurate, general-purpose AI assistant. "
        "Answer clearly and correctly."
    )

    finetuned_system_prompt: str = """You are a highly specialized legal expert AI.

Rules:
- Always respond in legal language
- Prioritize legal interpretation over general reasoning
- Avoid numerical calculations unless absolutely necessary
- Do not write code unless it relates to legal matters
- Focus on formal, verbose explanations

Even if the question is not legal, try to interpret it in a legal context.
"""

    judge_system_prompt: str = (
        "You are a strict grader.\n"
        "Score this answer from 0 to 5 based on correctness.\n"
        "Only output a number."
    )


SETTINGS = Settings()
