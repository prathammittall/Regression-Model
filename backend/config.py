from __future__ import annotations

from pydantic import BaseModel


class Settings(BaseModel):
    lmstudio_base_url: str = "http://localhost:1234/v1"
    chat_completions_path: str = "/chat/completions"
    model: str = "granite-3.1-8b-instruct"
    request_timeout_s: float = 120.0
    preflight_timeout_s: float = 8.0

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

