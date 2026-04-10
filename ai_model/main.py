"""
LLM Regression Testing System — FastAPI Backend
Main application entry point.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from routes.evaluation import router as evaluation_router

app = FastAPI(
    title="LLM Regression Tester",
    description="Detects capability regression between base and fine-tuned language models.",
    version="1.0.0",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(evaluation_router)


@app.get("/")
async def root():
    return {
        "service": "LLM Regression Tester",
        "version": "1.0.0",
        "endpoints": [
            "POST /run-evaluation",
            "POST /run-evaluation-demo",
            "GET /status",
            "GET /results",
            "GET /report",
        ],
    }


@app.get("/health")
async def health():
    return {"status": "ok"}
