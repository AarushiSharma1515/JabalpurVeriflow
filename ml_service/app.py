from fastapi import FastAPI, BackgroundTasks, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import json, os, uuid, time
from pathlib import Path
import pandas as pd
import requests
import sys

sys.path.insert(0, str(Path(__file__).parent))
from three_mix_production import pipeline_autopredict

app = FastAPI(title="Veriflow ML Service")

MODEL_PATH    = os.getenv("MODEL_PATH", "./models/model_bundle_two_stage.joblib")
TMP_DIR       = os.getenv("TMP_DIR", "./tmp")
OUT_DIR       = os.getenv("OUT_DIR", "./output")
BACKEND_URL   = os.getenv("BACKEND_URL", "http://localhost:5001")
INTERNAL_TOKEN = os.getenv("ML_INTERNAL_TOKEN", "veriflow_ml_secret")

jobs = {}

class PointInput(BaseModel):
    lat: float
    lon: float
    date: Optional[str] = None

class PredictRequest(BaseModel):
    polygon_geojson: Optional[dict] = None
    points: Optional[List[PointInput]] = None
    start_date: str
    end_date: str
    grid_spacing_m: Optional[float] = 30.0
    project_id: Optional[str] = None
    use_fixed_csv: Optional[bool] = False

@app.get("/health")
def health():
    return {
        "status": "ok",
        "model_exists": Path(MODEL_PATH).exists(),
        "model_path": MODEL_PATH
    }

@app.post("/predict")
async def predict(req: PredictRequest, background_tasks: BackgroundTasks):
    job_id = str(uuid.uuid4())
    jobs[job_id] = {"status": "running", "result": None}
    background_tasks.add_task(run_job, job_id, req)
    return {"job_id": job_id, "status": "running"}

@app.get("/predict/status/{job_id}")
def status(job_id: str):
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return {"job_id": job_id, **jobs[job_id]}

async def run_job(job_id: str, req: PredictRequest):
    start_time = time.time()
    try:
        tmp = str(Path(TMP_DIR) / job_id)
        out = str(Path(OUT_DIR) / job_id)
        Path(tmp).mkdir(parents=True, exist_ok=True)

        if req.polygon_geojson:
            poly_path = str(Path(tmp) / "polygon.geojson")
            with open(poly_path, "w") as f:
                json.dump(req.polygon_geojson, f)
            result = pipeline_autopredict(
                polygon_path=poly_path,
                points_csv=None,
                grid_spacing_m=req.grid_spacing_m,
                start=req.start_date,
                end=req.end_date,
                model_bundle_path=MODEL_PATH,
                out_dir=out,
                tmp_dir=tmp
            )
        else:
            if req.use_fixed_csv:
        # Use the fixed points.csv in ml_service folder
                pts_csv = str(Path(__file__).parent / "points.csv")
                if not Path(pts_csv).exists():
                    raise FileNotFoundError("points.csv not found in ml_service folder")
                print(f"Using fixed points.csv: {pts_csv}")
            else:
                pts_csv = str(Path(tmp) / "points.csv")
                pd.DataFrame([p.dict() for p in req.points]).to_csv(pts_csv, index=False)

        result = pipeline_autopredict(
        polygon_path=None,
        points_csv=pts_csv,
        grid_spacing_m=req.grid_spacing_m,
        start=req.start_date,
        end=req.end_date,
        model_bundle_path=MODEL_PATH,
        out_dir=out,
        tmp_dir=tmp
    )

        jobs[job_id] = {"status": "done", "result": result}

        # Auto-save to backend if projectId provided
        if req.project_id:
            processing_time_ms = int((time.time() - start_time) * 1000)
            try:
                payload = {
                    "projectId": req.project_id,
                    "mean_height_m": result.get("mean_pred_height_m"),
                    "mean_rh_atl08_m": result.get("mean_rh_atl08_m"),
                    "mean_agb_Mg_per_ha": result.get("mean_pred_agb_Mg_per_ha"),
                    "bgb_Mg_per_ha": result.get("mean_pred_bgb_Mg_per_ha"),
                    "total_biomass_Mg_per_ha": result.get("mean_pred_agb_Mg_per_ha", 0) + result.get("mean_pred_bgb_Mg_per_ha", 0),
                    "carbon_Mg_per_ha": result.get("mean_pred_carbon_Mg_per_ha"),
                    "co2_t_per_ha": result.get("mean_pred_co2_t_per_ha"),
                    "mean_pred_confidence": result.get("mean_pred_confidence"),
                    "n_points": result.get("n_points"),
                    "model_type": result.get("model_type"),
                    "modelVersion": "v2.3",
                    "processingTimeMs": processing_time_ms,
                }
                response = requests.post(
                    f"{BACKEND_URL}/api/ml/save-result",
                    headers={
                        "Authorization": f"Bearer {INTERNAL_TOKEN}",
                        "Content-Type": "application/json"
                    },
                    json=payload,
                    timeout=10
                )
                if response.status_code == 201:
                    print(f"✅ ML results saved to MongoDB for project {req.project_id}")
                else:
                    print(f"⚠️ Failed to save ML results: {response.text}")
            except Exception as save_err:
                print(f"⚠️ Could not save to backend: {save_err}")

    except Exception as e:
        jobs[job_id] = {"status": "error", "result": {"error": str(e)}}