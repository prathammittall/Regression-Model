from __future__ import annotations

import argparse
import json
from datetime import datetime
from pathlib import Path
from typing import Any, Dict

from .lmstudio_client import preflight_check
from .run_analysis import run_analysis


def _parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run Regraze benchmark analysis offline and save JSON output.",
    )
    parser.add_argument("--base-url", default="http://localhost:1234/v1", help="Base model LM Studio URL")
    parser.add_argument("--base-model", required=True, help="Base model name as loaded in LM Studio")
    parser.add_argument(
        "--finetuned-url",
        default=None,
        help="Fine-tuned model LM Studio URL (defaults to --base-url)",
    )
    parser.add_argument(
        "--finetuned-model",
        default=None,
        help="Fine-tuned model name (defaults to --base-model)",
    )
    parser.add_argument(
        "--level",
        choices=["easy", "medium", "hard"],
        default="medium",
        help="Benchmark difficulty level",
    )
    parser.add_argument(
        "--questions-per-domain",
        type=int,
        default=5,
        help="Questions per capability domain",
    )
    parser.add_argument(
        "--use-judge",
        action="store_true",
        help="Enable LLM-as-judge scoring in addition to rule-based scoring",
    )
    parser.add_argument(
        "--output",
        default=None,
        help="Output JSON path (default: reports/analysis-<timestamp>.json)",
    )
    return parser.parse_args()


def _default_output_path() -> Path:
    stamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    return Path("reports") / f"analysis-{stamp}.json"


def _print_summary(result: Dict[str, Any]) -> None:
    comp = result.get("comparison", {})
    print("\n=== Offline Benchmark Summary ===")
    print(f"Total cases     : {comp.get('total_cases', 0)}")
    print(f"Improved cases  : {comp.get('improved_cases', 0)}")
    print(f"Regressed cases : {comp.get('regressed_cases', 0)}")
    print(f"Stable cases    : {comp.get('stable_cases', 0)}")
    print(f"Base average    : {comp.get('base_average', 0):.3f}")
    print(f"Fine average    : {comp.get('finetuned_average', 0):.3f}")
    print(f"Overall delta   : {comp.get('overall_delta', 0):.3f}")


def main() -> int:
    args = _parse_args()

    base_url = args.base_url.rstrip("/")
    fine_url = (args.finetuned_url or base_url).rstrip("/")
    base_model = args.base_model
    fine_model = args.finetuned_model or base_model

    try:
        preflight_check(model=base_model, base_url=base_url)
        if fine_url != base_url or fine_model != base_model:
            preflight_check(model=fine_model, base_url=fine_url)
    except Exception as exc:
        print(f"LM Studio connectivity check failed: {exc}")
        return 2

    try:
        result = run_analysis(
            use_judge=bool(args.use_judge),
            level=args.level,
            questions_per_domain=args.questions_per_domain,
            base_url=base_url,
            base_model=base_model,
            finetuned_base_url=fine_url,
            finetuned_model=fine_model,
        )
    except Exception as exc:
        print(f"Benchmark run failed: {exc}")
        return 1

    out_path = Path(args.output) if args.output else _default_output_path()
    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(result, indent=2), encoding="utf-8")

    _print_summary(result)
    print(f"Saved report    : {out_path.resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
