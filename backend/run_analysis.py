from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Literal, Optional, Tuple

from .config import SETTINGS
from .diagnosis import CAUSES
from .evaluation import (
    EvalResult,
    eval_arithmetic,
    eval_coding,
    eval_instruction,
    eval_knowledge,
    eval_reasoning,
    eval_safety,
)
from .lmstudio_client import chat_completion, judge_score_0_to_5
from .testsuite import TEST_SUITE


Status = Literal["IMPROVED", "REGRESSED", "STABLE"]


@dataclass(frozen=True)
class PromptCase:
    capability: str
    question: str
    meta: Dict[str, Any]


@dataclass(frozen=True)
class PromptRun:
    capability: str
    question: str
    base_output: str
    finetuned_output: str
    base_rule_score: float
    finetuned_rule_score: float
    base_judge_0_5: Optional[float]
    finetuned_judge_0_5: Optional[float]
    base_final_score: float  # 0..1
    finetuned_final_score: float  # 0..1
    delta: float
    status: Status
    rule_details: Dict[str, Any]


def _cases_from_suite() -> List[PromptCase]:
    cases: List[PromptCase] = []
    for cap, items in TEST_SUITE.items():
        for it in items:
            q = it["q"]
            meta = {k: v for k, v in it.items() if k != "q"}
            cases.append(PromptCase(capability=cap, question=q, meta=meta))
    return cases


def _eval_rule(capability: str, output: str, question: str, meta: Dict[str, Any]) -> EvalResult:
    if capability == "arithmetic":
        return eval_arithmetic(output, int(meta["answer"]))
    if capability == "coding":
        return eval_coding(output)
    if capability == "reasoning":
        return eval_reasoning(output, meta["answer"])
    if capability == "knowledge":
        return eval_knowledge(output, list(meta["keywords"]))
    if capability == "instruction":
        return eval_instruction(output, question)
    if capability == "safety":
        return eval_safety(output)
    return EvalResult(rule_score=0.0, rule_pass=False, details={"reason": "unknown_capability"})


def _combine_scores(rule_score_0_1: float, judge_0_5: Optional[float]) -> float:
    """
    Primary: rule-based. Secondary: local LLM judge (optional).
    Keep rule-based dominant to make the MVP deterministic.
    """
    if judge_0_5 is None:
        return float(max(0.0, min(1.0, rule_score_0_1)))
    judge_0_1 = max(0.0, min(1.0, judge_0_5 / 5.0))
    # 70% rule, 30% judge
    return float(max(0.0, min(1.0, 0.7 * rule_score_0_1 + 0.3 * judge_0_1)))


def _label(delta: float) -> Status:
    if delta > 0.1:
        return "IMPROVED"
    if delta < -0.1:
        return "REGRESSED"
    return "STABLE"


def run_analysis(*, use_judge: bool = True) -> Dict[str, Any]:
    cases = _cases_from_suite()
    runs: List[PromptRun] = []

    for c in cases:
        base = chat_completion(
            system_prompt=SETTINGS.base_system_prompt,
            user_prompt=c.question,
            temperature=0.2,
            max_tokens=512,
        )
        fine = chat_completion(
            system_prompt=SETTINGS.finetuned_system_prompt,
            user_prompt=c.question,
            temperature=0.2,
            max_tokens=512,
        )

        base_eval = _eval_rule(c.capability, base.text, c.question, c.meta)
        fine_eval = _eval_rule(c.capability, fine.text, c.question, c.meta)

        base_j = judge_score_0_to_5(question=c.question, answer=base.text) if use_judge else None
        fine_j = judge_score_0_to_5(question=c.question, answer=fine.text) if use_judge else None

        base_final = _combine_scores(base_eval.rule_score, base_j)
        fine_final = _combine_scores(fine_eval.rule_score, fine_j)

        delta = float(fine_final - base_final)
        status = _label(delta)

        runs.append(
            PromptRun(
                capability=c.capability,
                question=c.question,
                base_output=base.text,
                finetuned_output=fine.text,
                base_rule_score=base_eval.rule_score,
                finetuned_rule_score=fine_eval.rule_score,
                base_judge_0_5=base_j,
                finetuned_judge_0_5=fine_j,
                base_final_score=base_final,
                finetuned_final_score=fine_final,
                delta=delta,
                status=status,
                rule_details={
                    "base": base_eval.details,
                    "finetuned": fine_eval.details,
                },
            )
        )

    # Aggregate by capability
    by_cap: Dict[str, List[PromptRun]] = {}
    for r in runs:
        by_cap.setdefault(r.capability, []).append(r)

    summary_rows: List[Dict[str, Any]] = []
    diagnoses: List[Dict[str, Any]] = []

    for cap, items in by_cap.items():
        base_avg = sum(i.base_final_score for i in items) / max(1, len(items))
        fine_avg = sum(i.finetuned_final_score for i in items) / max(1, len(items))
        delta = float(fine_avg - base_avg)
        status = _label(delta)

        summary_rows.append(
            {
                "capability": cap,
                "base_score": base_avg,
                "finetuned_score": fine_avg,
                "delta": delta,
                "status": status,
            }
        )

        if status == "REGRESSED" or (cap in ("reasoning", "instruction") and status != "IMPROVED"):
            diag = CAUSES.get(cap)
            if diag:
                diagnoses.append(
                    {
                        "capability": cap,
                        "issue": diag.issue,
                        "reason": diag.reason,
                        "fixes": diag.fixes[:3],
                    }
                )

    # Stable ordering for UI
    preferred = ["arithmetic", "coding", "reasoning", "knowledge", "instruction", "safety"]
    summary_rows.sort(key=lambda r: preferred.index(r["capability"]) if r["capability"] in preferred else 999)
    runs_dicts = [asdict(r) for r in runs]

    return {
        "meta": {
            "endpoint": SETTINGS.lmstudio_base_url.rstrip("/") + SETTINGS.chat_completions_path,
            "model": SETTINGS.model,
            "use_judge": use_judge,
            "base_system_prompt": SETTINGS.base_system_prompt,
            "finetuned_system_prompt": SETTINGS.finetuned_system_prompt,
        },
        "summary": summary_rows,
        "runs": runs_dicts,
        "diagnosis": diagnoses,
    }

