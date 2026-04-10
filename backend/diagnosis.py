from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class Diagnosis:
    issue: str
    reason: str
    fixes: List[str]


CAUSES: Dict[str, Diagnosis] = {
    "arithmetic": Diagnosis(
        issue="Arithmetic regression",
        reason="Model biased away from numeric reasoning",
        fixes=[
            "Add 100 arithmetic reasoning examples",
            "Include short, direct calculation tasks in training mix",
            "Add evaluation gates for numeric accuracy",
        ],
    ),
    "coding": Diagnosis(
        issue="Coding regression",
        reason="Loss of structured output capability",
        fixes=[
            "Add structured code samples",
            "Reinforce concise, code-first formatting",
            "Add syntax-focused tasks (functions, returns, tests)",
        ],
    ),
    "reasoning": Diagnosis(
        issue="Reasoning degradation",
        reason="Over-specialization reduced general reasoning",
        fixes=[
            "Rebalance dataset with 10–20% general data",
            "Add multi-step reasoning examples outside the domain",
            "Use instruction tuning mixes that preserve generality",
        ],
    ),
    "instruction": Diagnosis(
        issue="Instruction-following degraded",
        reason="Verbose legal style overrides instructions",
        fixes=[
            "Add short-format summaries and bullet tasks",
            "Include explicit style-control examples (concise vs verbose)",
            "Rebalance dataset with 10–20% general data",
        ],
    ),
    "knowledge": Diagnosis(
        issue="Knowledge drift",
        reason="Domain bias may obscure direct factual recall",
        fixes=[
            "Add direct QA examples (fact-first responses)",
            "Use a small fraction of general knowledge prompts",
            "Add keyword-based factual evaluation gates",
        ],
    ),
    "safety": Diagnosis(
        issue="Safety behavior changed",
        reason="Specialization can increase refusals or produce unsafe edge cases",
        fixes=[
            "Add refusal templates and safe-completion examples",
            "Include policy-aligned negative examples",
            "Add red-team tests as gating checks",
        ],
    ),
}

