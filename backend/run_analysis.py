from __future__ import annotations

from dataclasses import asdict, dataclass
from typing import Any, Dict, List, Literal, Optional

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
from .testsuite import MIN_RECOMMENDED_PER_DOMAIN, build_test_suite


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
    return _cases_from_suite_data(build_test_suite())


def _cases_from_suite_data(suite: Dict[str, List[Dict[str, Any]]]) -> List[PromptCase]:
    cases: List[PromptCase] = []
    for cap, items in suite.items():
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


def _safe_pass(score: float) -> bool:
    return score >= 0.75


def _trim(s: str, max_len: int = 240) -> str:
    clean = (s or "").strip().replace("\n", " ")
    if len(clean) <= max_len:
        return clean
    return clean[: max_len - 3] + "..."


def run_analysis(
    *,
    use_judge: bool = True,
    level: str = "medium",
    questions_per_domain: int = MIN_RECOMMENDED_PER_DOMAIN,
    custom_tests: Optional[List[Dict[str, Any]]] = None,
    base_url: Optional[str] = None,
    base_model: Optional[str] = None,
    finetuned_base_url: Optional[str] = None,
    finetuned_model: Optional[str] = None,
    model: Optional[str] = None,
) -> Dict[str, Any]:
    suite = build_test_suite(
        level=level,
        questions_per_domain=questions_per_domain,
        custom_tests=custom_tests,
    )
    cases = _cases_from_suite_data(suite)
    runs: List[PromptRun] = []
    resolved_base_model = base_model or model or SETTINGS.model
    resolved_finetuned_model = finetuned_model or resolved_base_model
    resolved_base_url = (base_url or SETTINGS.lmstudio_base_url).rstrip("/")
    resolved_finetuned_base_url = (finetuned_base_url or resolved_base_url).rstrip("/")
    resolved_base_endpoint = resolved_base_url + SETTINGS.chat_completions_path
    resolved_finetuned_endpoint = resolved_finetuned_base_url + SETTINGS.chat_completions_path

    for c in cases:
        base = chat_completion(
            system_prompt=SETTINGS.base_system_prompt,
            user_prompt=c.question,
            temperature=0.2,
            max_tokens=512,
            model=resolved_base_model,
            base_url=resolved_base_url,
        )
        fine = chat_completion(
            system_prompt=SETTINGS.finetuned_system_prompt,
            user_prompt=c.question,
            temperature=0.2,
            max_tokens=512,
            model=resolved_finetuned_model,
            base_url=resolved_finetuned_base_url,
        )

        base_eval = _eval_rule(c.capability, base.text, c.question, c.meta)
        fine_eval = _eval_rule(c.capability, fine.text, c.question, c.meta)

        base_j = (
            judge_score_0_to_5(
                question=c.question,
                answer=base.text,
                model=resolved_base_model,
                base_url=resolved_base_url,
            )
            if use_judge
            else None
        )
        fine_j = (
            judge_score_0_to_5(
                question=c.question,
                answer=fine.text,
                # Keep a single judge reference for fair model-vs-model comparison.
                model=resolved_base_model,
                base_url=resolved_base_url,
            )
            if use_judge
            else None
        )

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
    cap_counts: Dict[str, int] = {}

    for cap, items in by_cap.items():
        cap_counts[cap] = len(items)
        base_avg = sum(i.base_final_score for i in items) / max(1, len(items))
        fine_avg = sum(i.finetuned_final_score for i in items) / max(1, len(items))
        delta = float(fine_avg - base_avg)
        status = _label(delta)
        improved = sum(1 for i in items if i.status == "IMPROVED")
        regressed = sum(1 for i in items if i.status == "REGRESSED")
        stable = sum(1 for i in items if i.status == "STABLE")
        base_pass_rate = sum(1 for i in items if _safe_pass(i.base_final_score)) / max(1, len(items))
        fine_pass_rate = sum(1 for i in items if _safe_pass(i.finetuned_final_score)) / max(1, len(items))

        summary_rows.append(
            {
                "capability": cap,
                "cases": len(items),
                "base_score": base_avg,
                "finetuned_score": fine_avg,
                "delta": delta,
                "status": status,
                "base_pass_rate": base_pass_rate,
                "finetuned_pass_rate": fine_pass_rate,
                "improved_count": improved,
                "regressed_count": regressed,
                "stable_count": stable,
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

    total = len(runs)
    improved_total = sum(1 for r in runs if r.status == "IMPROVED")
    regressed_total = sum(1 for r in runs if r.status == "REGRESSED")
    stable_total = sum(1 for r in runs if r.status == "STABLE")
    base_avg_all = sum(r.base_final_score for r in runs) / max(1, total)
    fine_avg_all = sum(r.finetuned_final_score for r in runs) / max(1, total)

    top_improvements = sorted(runs, key=lambda x: x.delta, reverse=True)[:5]
    top_regressions = sorted(runs, key=lambda x: x.delta)[:5]

    retrieval_prompt_template = (
        "You are an evaluation assistant. Return ONLY the final answer with no explanation.\\n"
        "Rules:\\n"
        "- Follow the user instruction exactly.\\n"
        "- If the task asks for a number, return only the number.\\n"
        "- If the task asks for bullets, return exactly the requested count.\\n"
        "- If uncertain, provide the best concise answer rather than refusing unless unsafe.\\n"
        "User question: {question}"
    )

    comparison = {
        "total_cases": total,
        "improved_cases": improved_total,
        "regressed_cases": regressed_total,
        "stable_cases": stable_total,
        "improved_rate": improved_total / max(1, total),
        "regressed_rate": regressed_total / max(1, total),
        "stable_rate": stable_total / max(1, total),
        "base_average": base_avg_all,
        "finetuned_average": fine_avg_all,
        "overall_delta": fine_avg_all - base_avg_all,
        "top_improvements": [
            {
                "capability": r.capability,
                "question": _trim(r.question),
                "delta": r.delta,
            }
            for r in top_improvements
        ],
        "top_regressions": [
            {
                "capability": r.capability,
                "question": _trim(r.question),
                "delta": r.delta,
            }
            for r in top_regressions
        ],
    }

    return {
        "meta": {
            "base_endpoint": resolved_base_endpoint,
            "finetuned_endpoint": resolved_finetuned_endpoint,
            "base_model": resolved_base_model,
            "finetuned_model": resolved_finetuned_model,
            "use_judge": use_judge,
            "level": level,
            "questions_per_domain": questions_per_domain,
            "cases_per_capability": cap_counts,
            "base_system_prompt": SETTINGS.base_system_prompt,
            "finetuned_system_prompt": SETTINGS.finetuned_system_prompt,
            "recommended_finetune_retrieval_prompt": retrieval_prompt_template,
        },
        "summary": summary_rows,
        "comparison": comparison,
        "runs": runs_dicts,
        "diagnosis": diagnoses,
    }

