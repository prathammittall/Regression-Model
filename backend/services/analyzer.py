"""
Analyzer Service
Aggregates scores per capability, detects regressions, and finds failure examples.
"""

from typing import Any


def aggregate_scores(results: list[dict]) -> dict[str, dict[str, float]]:
    """
    Compute average score per capability for base and finetuned models.

    Args:
        results: List of evaluation result dicts, each containing:
            - capability (str)
            - base_score (int)
            - finetuned_score (int)

    Returns:
        Dict mapping capability name to {"base": avg, "finetuned": avg}
    """
    capability_scores: dict[str, dict[str, list[int]]] = {}

    for r in results:
        cap = r["capability"]
        if cap not in capability_scores:
            capability_scores[cap] = {"base": [], "finetuned": []}
        capability_scores[cap]["base"].append(r["base_score"])
        capability_scores[cap]["finetuned"].append(r["finetuned_score"])

    aggregated = {}
    for cap, scores in capability_scores.items():
        base_avg = round(sum(scores["base"]) / max(len(scores["base"]), 1), 2)
        ft_avg = round(sum(scores["finetuned"]) / max(len(scores["finetuned"]), 1), 2)
        aggregated[cap] = {"base": base_avg, "finetuned": ft_avg}

    return aggregated


def detect_regressions(
    aggregated: dict[str, dict[str, float]],
    threshold: float = 0.2,
) -> list[dict[str, Any]]:
    """
    Detect improvements, stable capabilities, and regressions.

    Rules:
        difference > threshold  → improved
        -threshold ≤ diff ≤ threshold → stable
        difference < -threshold → regression

    Args:
        aggregated: Output from aggregate_scores()
        threshold: Delta threshold for classification (default 0.2)

    Returns:
        List of capability reports with status classification
    """
    capabilities = []

    for cap_name, scores in aggregated.items():
        difference = round(scores["finetuned"] - scores["base"], 2)

        if difference > threshold:
            status = "improved"
        elif difference < -threshold:
            status = "regression"
        else:
            status = "stable"

        capabilities.append({
            "name": cap_name,
            "base_score": scores["base"],
            "finetuned_score": scores["finetuned"],
            "difference": difference,
            "status": status,
        })

    # Sort: regressions first, then stable, then improved
    status_order = {"regression": 0, "stable": 1, "improved": 2}
    capabilities.sort(key=lambda x: (status_order.get(x["status"], 1), x["difference"]))

    return capabilities


def find_failure_examples(results: list[dict], max_examples: int = 10) -> list[dict]:
    """
    Find prompts where the base model scored higher than the finetuned model.
    These are concrete regression examples.

    Args:
        results: Full evaluation results list
        max_examples: Maximum number of failure examples to return

    Returns:
        List of failure example dicts with prompt, responses, and scores
    """
    failures = []

    for r in results:
        score_drop = r["base_score"] - r["finetuned_score"]
        if score_drop > 0:
            failures.append({
                "prompt_id": r["prompt_id"],
                "capability": r["capability"],
                "prompt": r["prompt"],
                "base_output": r["base_output"],
                "finetuned_output": r["finetuned_output"],
                "base_score": r["base_score"],
                "finetuned_score": r["finetuned_score"],
                "score_drop": score_drop,
                "base_feedback": r.get("base_feedback", ""),
                "finetuned_feedback": r.get("finetuned_feedback", ""),
            })

    # Sort by largest score drop first
    failures.sort(key=lambda x: x["score_drop"], reverse=True)
    return failures[:max_examples]


def compute_summary_stats(
    capabilities: list[dict],
    results: list[dict],
) -> dict:
    """
    Compute overall summary statistics for the regression report.

    Returns:
        Dict with counts and overall scores
    """
    total_caps = len(capabilities)
    improved = sum(1 for c in capabilities if c["status"] == "improved")
    stable = sum(1 for c in capabilities if c["status"] == "stable")
    regressed = sum(1 for c in capabilities if c["status"] == "regression")

    base_scores = [r["base_score"] for r in results]
    ft_scores = [r["finetuned_score"] for r in results]

    overall_base = round(sum(base_scores) / max(len(base_scores), 1), 2)
    overall_ft = round(sum(ft_scores) / max(len(ft_scores), 1), 2)

    return {
        "total_capabilities": total_caps,
        "improved_count": improved,
        "stable_count": stable,
        "regressed_count": regressed,
        "total_prompts": len(results),
        "overall_base_score": overall_base,
        "overall_finetuned_score": overall_ft,
        "overall_difference": round(overall_ft - overall_base, 2),
    }
