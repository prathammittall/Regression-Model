from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

import requests

from .config import SETTINGS


@dataclass(frozen=True)
class ChatResult:
    text: str
    raw: Dict[str, Any]


def _extract_text(payload: Dict[str, Any]) -> str:
    try:
        choices = payload.get("choices") or []
        if not choices:
            return ""
        first = choices[0] if isinstance(choices[0], dict) else {}

        # Some OpenAI-compatible servers return plain text under choices[0].text
        choice_text = first.get("text")
        if isinstance(choice_text, str):
            return choice_text

        msg = first.get("message") or {}
        content = msg.get("content")
        if isinstance(content, str):
            return content
        # Some servers may return content as list of parts
        if isinstance(content, list):
            parts: List[str] = []
            for p in content:
                if isinstance(p, dict) and isinstance(p.get("text"), str):
                    parts.append(p["text"])
            return "".join(parts)
        return ""
    except Exception:
        return ""


def _normalize_base_url(base_url: str) -> str:
    clean = (base_url or "").strip().rstrip("/")
    if not clean:
        clean = SETTINGS.lmstudio_base_url.rstrip("/")

    # Accept users entering either '/v1' base or full '/v1/chat/completions' URL.
    if clean.endswith("/chat/completions"):
        clean = clean[: -len("/chat/completions")]
    return clean


def _build_chat_url(base_url: str, chat_path: str) -> str:
    resolved_base = _normalize_base_url(base_url)
    path = chat_path if chat_path.startswith("/") else f"/{chat_path}"
    return f"{resolved_base}{path}"


def _extract_first_number(text: str) -> Optional[float]:
    if not text:
        return None
    m = re.search(r"[-+]?\d+(?:\.\d+)?", text)
    if not m:
        return None
    try:
        return float(m.group(0))
    except Exception:
        return None


def chat_completion(
    *,
    system_prompt: str,
    user_prompt: str,
    temperature: float = 0.2,
    max_tokens: int = 512,
    model: Optional[str] = None,
    base_url: Optional[str] = None,
    chat_path: Optional[str] = None,
    timeout_s: Optional[float] = None,
) -> ChatResult:
    resolved_base_url = _normalize_base_url(base_url or SETTINGS.lmstudio_base_url)
    resolved_chat_path = chat_path or SETTINGS.chat_completions_path
    url = _build_chat_url(resolved_base_url, resolved_chat_path)

    body: Dict[str, Any] = {
        "model": model or SETTINGS.model,
        "temperature": temperature,
        "max_tokens": max_tokens,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
    }

    resp = requests.post(url, json=body, timeout=timeout_s or SETTINGS.request_timeout_s)
    resp.raise_for_status()
    payload = resp.json()
    return ChatResult(text=_extract_text(payload).strip(), raw=payload)


def judge_score_0_to_5(
    *,
    question: str,
    answer: str,
    model: Optional[str] = None,
    base_url: Optional[str] = None,
    chat_path: Optional[str] = None,
) -> Optional[float]:
    """
    Uses the same local model as a strict judge.
    Returns a float score in [0, 5] or None if invalid/unavailable.
    """
    prompt = f"Question:\n{question}\n\nAnswer:\n{answer}\n"
    try:
        res = chat_completion(
            system_prompt=SETTINGS.judge_system_prompt,
            user_prompt=prompt,
            temperature=0.0,
            max_tokens=5,
            model=model,
            base_url=base_url,
            chat_path=chat_path,
        )
        txt = (res.text or "").strip()
        score = _extract_first_number(txt)
        if score is None:
            return None
        if 0.0 <= score <= 5.0:
            return score
        return None
    except Exception:
        return None


def preflight_check(*, model: Optional[str] = None, base_url: Optional[str] = None, chat_path: Optional[str] = None) -> None:
    """
    Fail fast if LM Studio endpoint/model is unavailable.
    """
    _ = chat_completion(
        system_prompt="You are a connectivity checker. Reply with 'OK'.",
        user_prompt="OK",
        temperature=0.0,
        max_tokens=2,
        model=model,
        base_url=base_url,
        chat_path=chat_path,
        timeout_s=SETTINGS.preflight_timeout_s,
    )

