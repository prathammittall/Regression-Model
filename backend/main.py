from __future__ import annotations

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

from .run_analysis import run_analysis
from .lmstudio_client import preflight_check


app = FastAPI(title="LLM Capability Regression Analyzer", version="0.1.0")

app.mount("/static", StaticFiles(directory="static"), name="static")


class RunRequest(BaseModel):
    use_judge: bool = True


@app.get("/")
def index():
    return FileResponse("static/index.html")


@app.post("/api/run")
def api_run(req: RunRequest):
    try:
        preflight_check()
        return run_analysis(use_judge=req.use_judge)
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Run failed: {e}")

