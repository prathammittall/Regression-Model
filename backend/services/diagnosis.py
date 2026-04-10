"""
Diagnosis Engine
Generates human-readable training fix recommendations based on regression analysis.
"""

from typing import Any

# ── Per-capability recommendation templates ───────────────────────────────────

RECOMMENDATION_TEMPLATES: dict[str, dict[str, Any]] = {
    "arithmetic": {
        "description": "Mathematical computation and numerical reasoning",
        "mild": (
            "Fine-tuning slightly reduced arithmetic accuracy. "
            "Consider adding 100-200 arithmetic QA samples (addition, subtraction, "
            "multiplication, division) to the training dataset."
        ),
        "severe": (
            "Significant arithmetic regression detected. The fine-tuning dataset likely "
            "lacks mathematical examples. Add 500+ diverse arithmetic QA samples covering "
            "multi-digit operations, word problems, and step-by-step calculation chains."
        ),
        "tags": ["data-augmentation", "numerical-reasoning"],
    },
    "code_generation": {
        "description": "Programming and code synthesis ability",
        "mild": (
            "Code generation quality slightly decreased. Add 100-300 code examples "
            "including common algorithms (sorting, searching, data structures) with "
            "correct implementations and docstrings."
        ),
        "severe": (
            "Major code generation regression. The fine-tuning process may have degraded "
            "the model's coding ability. Add 500+ programming samples covering Python "
            "algorithms, data structures, and common patterns. Include both function "
            "implementations and full program examples."
        ),
        "tags": ["code-quality", "data-augmentation"],
    },
    "logical_reasoning": {
        "description": "Deductive and inductive reasoning",
        "mild": (
            "Minor reasoning degradation observed. Add 100-200 logic puzzles, "
            "syllogism exercises, and chain-of-thought reasoning examples to "
            "strengthen deductive capabilities."
        ),
        "severe": (
            "Significant logical reasoning regression. Add 500+ chain-of-thought "
            "reasoning samples including syllogisms, transitive relations, "
            "mathematical proofs, and multi-step deduction problems. Consider "
            "using reasoning-focused fine-tuning strategies."
        ),
        "tags": ["reasoning", "chain-of-thought"],
    },
    "general_knowledge": {
        "description": "Factual knowledge and world information",
        "mild": (
            "Slight factual knowledge drop. This may indicate catastrophic forgetting. "
            "Mix in 200-400 general knowledge QA samples from diverse domains (history, "
            "science, geography, literature) during fine-tuning."
        ),
        "severe": (
            "Major knowledge regression — possible catastrophic forgetting. Reduce "
            "fine-tuning learning rate, add weight decay, or use LoRA/QLoRA to preserve "
            "base knowledge. Include 500+ factual QA samples as replay data."
        ),
        "tags": ["catastrophic-forgetting", "learning-rate"],
    },
    "instruction_following": {
        "description": "Ability to follow specific formatting and structural instructions",
        "mild": (
            "Minor instruction-following degradation. Add 100-200 samples with "
            "explicit formatting constraints (word limits, bullet counts, sentence "
            "limits) to reinforce compliance."
        ),
        "severe": (
            "Significant instruction-following regression. Add 500+ diverse instruction "
            "compliance examples covering format constraints, word limits, structured "
            "output, and multi-step instructions. Ensure training data includes both "
            "the instruction and the correctly formatted response."
        ),
        "tags": ["instruction-tuning", "format-compliance"],
    },
    "safety_compliance": {
        "description": "Refusal of harmful, dangerous, or unethical requests",
        "mild": (
            "Minor safety compliance decrease. Add 100-200 harmful prompt/refusal "
            "pairs to reinforce safety guardrails during fine-tuning."
        ),
        "severe": (
            "CRITICAL: Safety compliance has significantly degraded. The fine-tuned model "
            "may be producing harmful content. Immediately add 500+ safety alignment "
            "samples covering various harm categories. Consider using RLHF or DPO with "
            "safety-focused preference data. Reduce fine-tuning epochs to prevent "
            "safety boundary erosion."
        ),
        "tags": ["safety-critical", "alignment", "rlhf"],
    },
}


def generate_recommendations(capabilities: list[dict]) -> list[dict]:
    """
    Generate actionable training fix recommendations for regressed capabilities.

    Args:
        capabilities: List of capability report dicts from detect_regressions()

    Returns:
        List of recommendation dicts with fix suggestions
    """
    recommendations = []

    for cap in capabilities:
        if cap["status"] != "regression":
            continue

        name = cap["name"]
        difference = abs(cap["difference"])
        template = RECOMMENDATION_TEMPLATES.get(name)

        if not template:
            recommendations.append({
                "capability": name,
                "severity": "moderate" if difference < 1.0 else "severe",
                "recommendation": (
                    f"Regression detected in '{name}'. "
                    f"Score dropped by {difference:.1f} points. "
                    f"Add more training examples for this capability."
                ),
                "tags": ["general"],
            })
            continue

        is_severe = difference >= 1.0
        severity = "severe" if is_severe else "mild"

        recommendations.append({
            "capability": name,
            "description": template["description"],
            "severity": severity,
            "score_drop": difference,
            "recommendation": template["severe"] if is_severe else template["mild"],
            "tags": template["tags"],
        })

    # Sort: safety-critical first, then by severity
    def sort_key(r: dict) -> tuple:
        is_safety = 0 if "safety-critical" in r.get("tags", []) else 1
        is_severe = 0 if r["severity"] == "severe" else 1
        return (is_safety, is_severe, -r.get("score_drop", 0))

    recommendations.sort(key=sort_key)
    return recommendations
