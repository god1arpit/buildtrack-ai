import os
import shutil
import uuid
import cv2
import json
import logging
import subprocess
import sys
import math
import numpy as np
from datetime import datetime, date, timedelta
from typing import List, Optional

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File, Form, status, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from sqlalchemy.orm import Session
from passlib.hash import bcrypt

from database import engine, get_db, init_db
from models import (
    User, Project, MediaUpload, ProgressRecord, 
    WorkerAnalytics, EquipmentAnalytics, Prediction, Report
)
from vision_pipeline import vision_pipeline
from prediction_engine import prediction_engine

# Initialize Database Schema
init_db()

app = FastAPI(
    title="AI Road Construction Progress & Labour Efficiency Monitoring System",
    description="Automated computer vision and predictive analytics backend for drone road monitoring.",
    version="2.0.0"
)

# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static media uploads directory
UPLOAD_DIR = os.environ.get("BUILDTRACK_AI_UPLOAD_DIR", os.path.join(os.path.dirname(__file__), "uploads"))
PROCESSED_DIR = os.environ.get("BUILDTRACK_AI_PROCESSED_DIR", os.path.join(os.path.dirname(__file__), "processed"))
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(PROCESSED_DIR, exist_ok=True)

app.mount("/static/uploads", StaticFiles(directory=UPLOAD_DIR), name="uploads")
app.mount("/static/processed", StaticFiles(directory=PROCESSED_DIR), name="processed")


def build_media_url(request: Optional[Request], relative_path: str) -> str:
    """Build a fully-qualified LAN URL so mobile apps (Capacitor APK) & phones can render images directly."""
    host = "192.168.0.101:8000"
    scheme = "http"
    if request:
        req_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
        if req_host and "localhost" not in req_host and "127.0.0.1" not in req_host:
            host = req_host
        req_scheme = request.headers.get("x-forwarded-proto") or request.url.scheme
        if req_scheme:
            scheme = req_scheme.split(",")[0].strip()
    return f"{scheme}://{host}{relative_path}"


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "service": "BuildTrack AI Vision API", "version": app.version}


@app.post("/api/road-mask-preview")
async def road_mask_preview(request: Request, file: UploadFile = File(...)):
    """Run the trained road-only model without writing project progress records."""
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    if file_ext not in {".jpg", ".jpeg", ".png", ".webp", ".bmp"}:
        raise HTTPException(status_code=415, detail="Road model preview accepts JPG, PNG, WebP or BMP images only.")

    payload = await file.read(25 * 1024 * 1024 + 1)
    if len(payload) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Image is too large. Maximum size is 25 MB.")

    project_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    model_python = os.environ.get("BUILDTRACK_ROAD_MODEL_PYTHON") or os.path.join(
        project_root, ".venv-roadtrain", "Scripts", "python.exe"
    )
    if not os.path.isfile(model_python):
        model_python = sys.executable
    script_path = os.path.join(os.path.dirname(__file__), "road_mask_inference.py")
    checkpoint_path = os.environ.get("BUILDTRACK_ROAD_MODEL_CHECKPOINT") or os.path.join(
        os.path.dirname(__file__), "models", "road_boundary_mapillary_best.pth"
    )
    if not os.path.isfile(checkpoint_path):
        raise HTTPException(status_code=503, detail="The stable road model checkpoint is missing.")

    request_id = str(uuid.uuid4())
    raw_path = os.path.join(UPLOAD_DIR, f"{request_id}_model_input{file_ext}")
    preview_filename = f"{request_id}_road_mask.jpg"
    preview_path = os.path.join(PROCESSED_DIR, preview_filename)
    with open(raw_path, "wb") as destination:
        destination.write(payload)

    command = [
        model_python,
        script_path,
        "--image", raw_path,
        "--output", preview_path,
        "--checkpoint", checkpoint_path,
    ]
    try:
        flags = getattr(subprocess, "CREATE_NO_WINDOW", 0) if os.name == "nt" else 0
        result = subprocess.run(
            command,
            cwd=project_root,
            capture_output=True,
            text=True,
            timeout=120,
            creationflags=flags,
            check=False,
        )
        if result.returncode != 0:
            detail = result.stderr.strip().splitlines()[-1] if result.stderr.strip() else "Road model inference failed."
            raise HTTPException(status_code=503, detail=detail)
        result_data = json.loads(result.stdout.strip().splitlines()[-1])
        if not isinstance(result_data, dict) or "road_coverage_pct" not in result_data:
            raise HTTPException(status_code=503, detail="Road model returned incomplete preview data.")
    except subprocess.TimeoutExpired as error:
        raise HTTPException(status_code=504, detail="Road model inference timed out. Try a smaller image.") from error
    except json.JSONDecodeError as error:
        raise HTTPException(status_code=503, detail="Road model returned an invalid result.") from error
    except HTTPException:
        raise
    except Exception as error:
        logging.exception("Road mask preview failed unexpectedly")
        raise HTTPException(status_code=503, detail=f"Road model preview could not run: {error}") from error
    finally:
        if os.path.exists(raw_path):
            try:
                os.remove(raw_path)
            except OSError:
                logging.warning("Could not remove temporary road model input %s", raw_path)

    return {
        "status": "success",
        "processed_image_url": build_media_url(request, f"/static/processed/{preview_filename}"),
        "relative_image_url": f"/static/processed/{preview_filename}",
        "road_coverage_pct": result_data["road_coverage_pct"],
        "model_checkpoint": result_data["model_checkpoint"],
        "threshold": result_data["threshold"],
        "notice": "Road area detected in this frame; this is not construction completion progress.",
    }

# -------------------------------------------------------------
# PYDANTIC SCHEMAS
# -------------------------------------------------------------
class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: Optional[str] = "Project Manager"

class UserLogin(BaseModel):
    email: str
    password: str

class ProjectCreate(BaseModel):
    project_name: str
    location: str
    total_road_length: float
    start_date: str
    planned_end_date: str

# -------------------------------------------------------------
# AUTHENTICATION APIS
# -------------------------------------------------------------
@app.post("/api/auth/register")
def register_user(payload: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    hashed = bcrypt.hash(payload.password)
    user = User(
        name=payload.name,
        email=payload.email.lower(),
        password_hash=hashed,
        role=payload.role
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "token": f"jwt_{user.id}"
    }

@app.post("/api/auth/login")
def login_user(payload: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not bcrypt.verify(payload.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "role": user.role,
        "token": f"jwt_{user.id}"
    }

# -------------------------------------------------------------
# PROJECT APIS
# -------------------------------------------------------------
@app.post("/api/projects")
def create_project(payload: ProjectCreate, db: Session = Depends(get_db)):
    start_d = datetime.strptime(payload.start_date, "%Y-%m-%d").date()
    end_d = datetime.strptime(payload.planned_end_date, "%Y-%m-%d").date()

    proj = Project(
        project_name=payload.project_name,
        location=payload.location,
        total_road_length=payload.total_road_length,
        start_date=start_d,
        planned_end_date=end_d
    )
    db.add(proj)
    db.commit()
    db.refresh(proj)

    # Seed initial baseline progress (0%)
    init_progress = ProgressRecord(
        project_id=proj.id,
        completed_length=0.0,
        progress_percentage=0.0,
        recorded_date=start_d
    )
    init_pred = Prediction(
        project_id=proj.id,
        estimated_days_remaining=(end_d - start_d).days,
        predicted_completion_date=end_d,
        daily_pace_km=round(payload.total_road_length / max((end_d - start_d).days, 1), 3),
        confidence_score=30.0
    )
    db.add(init_progress)
    db.add(init_pred)
    db.commit()

    return proj

@app.get("/api/projects")
def get_projects(db: Session = Depends(get_db)):
    projects = db.query(Project).all()
    results = []
    for p in projects:
        latest_prog = db.query(ProgressRecord).filter(ProgressRecord.project_id == p.id).order_by(ProgressRecord.recorded_date.desc()).first()
        latest_pred = db.query(Prediction).filter(Prediction.project_id == p.id).order_by(Prediction.created_at.desc()).first()
        results.append({
            "id": p.id,
            "project_name": p.project_name,
            "location": p.location,
            "total_road_length": p.total_road_length,
            "start_date": str(p.start_date),
            "planned_end_date": str(p.planned_end_date),
            "completed_length": latest_prog.completed_length if latest_prog else 0.0,
            "progress_percentage": latest_prog.progress_percentage if latest_prog else 0.0,
            "predicted_completion_date": str(latest_pred.predicted_completion_date) if latest_pred else str(p.planned_end_date),
            "estimated_days_remaining": latest_pred.estimated_days_remaining if latest_pred else 0
        })
    return results

@app.get("/api/projects/{project_id}")
def get_project_detail(project_id: str, db: Session = Depends(get_db)):
    p = db.query(Project).filter(Project.id == project_id).first()
    if not p:
        raise HTTPException(status_code=404, detail="Project not found")
    return p

# -------------------------------------------------------------
# UPLOAD API (Step 4: Computer Vision Processing Pipeline)
# -------------------------------------------------------------
@app.post("/api/upload")
async def upload_and_process_media(
    request: Request,
    project_id: str = Form(...),
    media_type: str = Form("drone_image"),
    file: UploadFile = File(...),
    known_road_width_m: float = Form(7.0),
    gsd_m_per_px: Optional[float] = Form(None),
    road_threshold: float = Form(0.50),
    db: Session = Depends(get_db)
):
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    image_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    video_extensions = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    if file_ext not in image_extensions | video_extensions:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, WebP image or supported video file.")

    is_video = file_ext in video_extensions
    if media_type == "drone_video" and not is_video:
        raise HTTPException(status_code=415, detail="Drone video mode requires a supported video file.")
    media_type = "drone_video" if is_video else (media_type if media_type in {"drone_image", "site_camera"} else "drone_image")

    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        first_proj = db.query(Project).first()
        if first_proj and project_id in ["default", "latest", ""]:
            project = first_proj
        else:
            project = Project(
                id=project_id,
                project_name=f"Site Sector ({project_id[:8] if len(project_id) >= 8 else project_id})",
                location="Active Worksite",
                total_road_length=15.0,
                start_date=date.today() - timedelta(days=20),
                planned_end_date=date.today() + timedelta(days=60)
            )
            db.add(project)
            db.commit()
            db.refresh(project)

    unique_id = str(uuid.uuid4())
    raw_filename = f"{unique_id}_raw{file_ext}"
    processed_filename = f"{unique_id}_annotated.jpg"

    raw_path = os.path.join(UPLOAD_DIR, raw_filename)
    processed_path = os.path.join(PROCESSED_DIR, processed_filename)

    with open(raw_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    # For videos, analyze the midpoint frame explicitly instead of passing the
    # video container to an image reader (which previously produced synthetic output).
    frame_path = None
    analysis_path = raw_path
    try:
        if is_video:
            capture = cv2.VideoCapture(raw_path)
            frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
            if frame_count > 0:
                capture.set(cv2.CAP_PROP_POS_FRAMES, frame_count // 2)
            ok, frame = capture.read()
            capture.release()
            if not ok or frame is None:
                raise HTTPException(status_code=422, detail="Could not read a frame from this video.")
            frame_path = os.path.join(PROCESSED_DIR, f"{unique_id}_frame.jpg")
            if not cv2.imwrite(frame_path, frame):
                raise HTTPException(status_code=422, detail="Could not decode a frame from this video.")
            analysis_path = frame_path
        elif cv2.imread(raw_path) is None:
            raise HTTPException(status_code=422, detail="The uploaded image could not be decoded.")

        cv_result = vision_pipeline.process_media(
            image_path=analysis_path,
            output_path=processed_path,
            total_road_km=project.total_road_length,
            known_road_width_m=known_road_width_m,
            gsd_m_per_px=gsd_m_per_px,
            road_threshold=road_threshold
        )
    except HTTPException:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        raise
    except ValueError as error:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        raise HTTPException(status_code=422, detail=str(error)) from error
    finally:
        if frame_path and os.path.exists(frame_path):
            os.remove(frame_path)

    # 1. Save Media Upload Record
    media_rec = MediaUpload(
        id=unique_id,
        project_id=project.id,
        file_path=f"/static/uploads/{raw_filename}",
        processed_image_path=f"/static/processed/{processed_filename}",
        media_type=media_type,
        upload_date=datetime.utcnow()
    )
    db.add(media_rec)

    # 2. Save Progress Record
    prog_rec = ProgressRecord(
        project_id=project.id,
        completed_length=cv_result["completed_km"],
        progress_percentage=cv_result["progress_percentage"],
        recorded_date=date.today(),
        paved_area_sqm=cv_result["paved_area_sqm"],
        unpaved_area_sqm=cv_result["unpaved_area_sqm"]
    )
    db.add(prog_rec)

    # 3. Save Worker Analytics
    w_stats = cv_result["workers"]
    worker_rec = WorkerAnalytics(
        project_id=project.id,
        worker_count=w_stats["total"],
        active_workers=w_stats["active"],
        idle_workers=w_stats["idle"],
        activity_rate=w_stats["activity_rate"],
        recorded_date=date.today()
    )
    db.add(worker_rec)

    # 4. Save Equipment Analytics
    eq_stats = cv_result["equipment"]
    equip_rec = EquipmentAnalytics(
        project_id=project.id,
        equipment_count=eq_stats["total"],
        utilization_rate=eq_stats["utilization_rate"],
        rollers_count=eq_stats["rollers"],
        excavators_count=eq_stats["excavators"],
        pavers_count=eq_stats["pavers"],
        trucks_count=eq_stats["trucks"],
        recorded_date=date.today()
    )
    db.add(equip_rec)

    # 5. Run ML Prediction Engine
    hist = db.query(ProgressRecord).filter(ProgressRecord.project_id == project.id).all()
    pred_data = prediction_engine.predict_completion(
        total_km=project.total_road_length,
        completed_km=cv_result["completed_km"],
        historical_records=hist
    )

    pred_rec = Prediction(
        project_id=project.id,
        estimated_days_remaining=pred_data["estimated_days_remaining"],
        predicted_completion_date=datetime.strptime(pred_data["predicted_completion_date"], "%Y-%m-%d").date(),
        daily_pace_km=pred_data["daily_pace_km"],
        confidence_score=pred_data["confidence_score"]
    )
    db.add(pred_rec)

    # Commit all transaction records
    db.commit()

    return {
        "status": "success",
        "processed_image_url": build_media_url(request, f"/static/processed/{processed_filename}"),
        "raw_image_url": build_media_url(request, f"/static/uploads/{raw_filename}"),
        "relative_processed_url": f"/static/processed/{processed_filename}",
        "relative_raw_url": f"/static/uploads/{raw_filename}",
        "cv_analytics": cv_result,
        "measurements": cv_result.get("measurements", {}),
        "prediction": pred_data
    }


# -------------------------------------------------------------
# DEDICATED ROAD MEASUREMENT API
# -------------------------------------------------------------
@app.post("/api/road-measure")
async def measure_road_endpoint(
    request: Request,
    file: UploadFile = File(...),
    known_road_width_m: float = Form(7.0),
    gsd_m_per_px: Optional[float] = Form(None),
    road_threshold: float = Form(0.50),
    project_id: Optional[str] = Form("default"),
    db: Session = Depends(get_db)
):
    """
    Measures the road under construction using the trained segmentation model:
    - Centerline distance (Total Road Length in m & km)
    - Road Width (Average, Min, Max in meters)
    - Total Road Surface Area (sq.m)
    - Under Construction portion (Length in m & %, Area in sq.m)
    - Completed / Paved portion (Length in m & %, Area in sq.m)
    - Station Chainage (Ch 0+000 to Ch 0+XXX)
    """
    file_ext = os.path.splitext(file.filename or "")[1].lower()
    image_extensions = {".jpg", ".jpeg", ".png", ".webp", ".bmp"}
    video_extensions = {".mp4", ".mov", ".avi", ".mkv", ".webm"}
    if file_ext not in image_extensions | video_extensions:
        raise HTTPException(status_code=415, detail="Upload a JPG, PNG, WebP image or supported video file.")

    payload = await file.read(25 * 1024 * 1024 + 1)
    if len(payload) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="File is too large. Maximum size is 25 MB.")

    unique_id = str(uuid.uuid4())
    raw_filename = f"{unique_id}_measure_input{file_ext}"
    processed_filename = f"{unique_id}_measured_hud.jpg"

    raw_path = os.path.join(UPLOAD_DIR, raw_filename)
    processed_path = os.path.join(PROCESSED_DIR, processed_filename)

    with open(raw_path, "wb") as destination:
        destination.write(payload)

    frame_path = None
    analysis_path = raw_path
    try:
        if file_ext in video_extensions:
            capture = cv2.VideoCapture(raw_path)
            frame_count = int(capture.get(cv2.CAP_PROP_FRAME_COUNT))
            if frame_count > 0:
                capture.set(cv2.CAP_PROP_POS_FRAMES, frame_count // 2)
            ok, frame = capture.read()
            capture.release()
            if not ok or frame is None:
                raise HTTPException(status_code=422, detail="Could not read a frame from this video.")
            frame_path = os.path.join(PROCESSED_DIR, f"{unique_id}_measure_frame.jpg")
            if not cv2.imwrite(frame_path, frame):
                raise HTTPException(status_code=422, detail="Could not decode a frame from this video.")
            analysis_path = frame_path

        cv_result = vision_pipeline.process_media(
            image_path=analysis_path,
            output_path=processed_path,
            total_road_km=0.0,
            known_road_width_m=known_road_width_m,
            gsd_m_per_px=gsd_m_per_px,
            road_threshold=road_threshold
        )
    except HTTPException:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        raise
    except Exception as e:
        if os.path.exists(raw_path):
            os.remove(raw_path)
        raise HTTPException(status_code=500, detail=f"Measurement failed: {e}")
    finally:
        if frame_path and os.path.exists(frame_path):
            os.remove(frame_path)
        import gc
        gc.collect()

    # A single image can only forecast the visible measured corridor. Use an
    # explicit production-rate assumption instead of treating one photo as
    # whole-project progress or presenting a synthetic model as learned data.
    meas = cv_result.get("measurements", {})
    under_m = float(meas.get("under_construction_length_m", 0.0))
    # Local-road paving assumption: 40–80 m/day, with 60 m/day as midpoint.
    corridor_days = int(math.ceil(under_m / 60.0)) if under_m > 0 else 0
    corridor_date = date.today() + timedelta(days=corridor_days)
    pred_data = {
        "estimated_days_remaining": corridor_days,
        "predicted_completion_date": str(corridor_date),
        "daily_pace_km": 0.06,
        "confidence_score": 30.0,
        "status": "Corridor estimate" if under_m > 0 else "No pending work detected",
        "forecast_basis": "Single-image estimate for the visible corridor; assumed paving pace 40–80 m/day.",
        "pace_range_m_per_day": {"low": 40, "midpoint": 60, "high": 80},
    }
    pred_data["corridor_under_construction_m"] = under_m
    pred_data["corridor_days_remaining"] = corridor_days
    pred_data["corridor_completion_date"] = str(corridor_date)

    return {
        "status": "success",
        "processed_image_url": build_media_url(request, f"/static/processed/{processed_filename}"),
        "raw_image_url": build_media_url(request, f"/static/uploads/{raw_filename}"),
        "relative_processed_url": f"/static/processed/{processed_filename}",
        "relative_raw_url": f"/static/uploads/{raw_filename}",
        "measurements": meas,
        "cv_analytics": cv_result,
        "prediction": pred_data,
        "calibration": {
            "known_road_width_m": known_road_width_m,
            "gsd_m_per_px": gsd_m_per_px,
            "effective_gsd_cm": meas.get("gsd_cm_per_px")
        }
    }

# -------------------------------------------------------------
# PROGRESS API
# -------------------------------------------------------------
@app.get("/api/progress/{project_id}")
def get_project_progress(project_id: str, db: Session = Depends(get_db)):
    records = db.query(ProgressRecord).filter(ProgressRecord.project_id == project_id).order_by(ProgressRecord.recorded_date.asc()).all()
    if not records:
        first_proj = db.query(Project).first()
        if first_proj:
            records = db.query(ProgressRecord).filter(ProgressRecord.project_id == first_proj.id).order_by(ProgressRecord.recorded_date.asc()).all()
    return records

# -------------------------------------------------------------
# ANALYTICS API
# -------------------------------------------------------------
@app.get("/api/analytics/{project_id}")
def get_project_analytics(project_id: str, db: Session = Depends(get_db)):
    workers = db.query(WorkerAnalytics).filter(WorkerAnalytics.project_id == project_id).order_by(WorkerAnalytics.recorded_date.desc()).first()
    equipment = db.query(EquipmentAnalytics).filter(EquipmentAnalytics.project_id == project_id).order_by(EquipmentAnalytics.recorded_date.desc()).first()
    latest_prog = db.query(ProgressRecord).filter(ProgressRecord.project_id == project_id).order_by(ProgressRecord.recorded_date.desc()).first()

    if not workers and not equipment:
        first_proj = db.query(Project).first()
        if first_proj:
            workers = db.query(WorkerAnalytics).filter(WorkerAnalytics.project_id == first_proj.id).order_by(WorkerAnalytics.recorded_date.desc()).first()
            equipment = db.query(EquipmentAnalytics).filter(EquipmentAnalytics.project_id == first_proj.id).order_by(EquipmentAnalytics.recorded_date.desc()).first()
            latest_prog = db.query(ProgressRecord).filter(ProgressRecord.project_id == first_proj.id).order_by(ProgressRecord.recorded_date.desc()).first()

    return {
        "workforce": workers,
        "equipment": equipment,
        "latest_progress": latest_prog
    }

# -------------------------------------------------------------
# PREDICTION API
# -------------------------------------------------------------
@app.get("/api/prediction/{project_id}")
def get_project_prediction(project_id: str, db: Session = Depends(get_db)):
    pred = db.query(Prediction).filter(Prediction.project_id == project_id).order_by(Prediction.created_at.desc()).first()
    if not pred:
        first_proj = db.query(Project).first()
        if first_proj:
            pred = db.query(Prediction).filter(Prediction.project_id == first_proj.id).order_by(Prediction.created_at.desc()).first()
    if not pred:
        raise HTTPException(status_code=404, detail="No predictions calculated yet")
    history = (
        db.query(ProgressRecord)
        .filter(ProgressRecord.project_id == pred.project_id)
        .order_by(ProgressRecord.recorded_date.asc())
        .all()
    )
    measured_history = any(
        current.recorded_date > previous.recorded_date
        and current.completed_length > previous.completed_length
        for previous, current in zip(history, history[1:])
    )
    return {
        "project_id": pred.project_id,
        "estimated_days_remaining": pred.estimated_days_remaining,
        "predicted_completion_date": str(pred.predicted_completion_date),
        "daily_pace_km": pred.daily_pace_km if measured_history else None,
        "confidence_score": pred.confidence_score if measured_history else 30.0,
        "status": "On Track" if measured_history else "Baseline Estimate",
        "forecast_basis": (
            "Estimated from dated project progress intervals"
            if measured_history
            else "Baseline pace only; dated progress history is insufficient"
        ),
    }

# -------------------------------------------------------------
# DASHBOARD API (Central Command)
# -------------------------------------------------------------
@app.get("/api/dashboard/{project_id}")
def get_dashboard_summary(project_id: str, db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        project = db.query(Project).first()
    if not project:
        raise HTTPException(status_code=404, detail="No projects registered")
    project_id = project.id

    latest_prog = db.query(ProgressRecord).filter(ProgressRecord.project_id == project_id).order_by(ProgressRecord.recorded_date.desc()).first()
    latest_worker = db.query(WorkerAnalytics).filter(WorkerAnalytics.project_id == project_id).order_by(WorkerAnalytics.recorded_date.desc()).first()
    latest_equip = db.query(EquipmentAnalytics).filter(EquipmentAnalytics.project_id == project_id).order_by(EquipmentAnalytics.recorded_date.desc()).first()
    latest_pred = db.query(Prediction).filter(Prediction.project_id == project_id).order_by(Prediction.created_at.desc()).first()
    latest_media = db.query(MediaUpload).filter(MediaUpload.project_id == project_id).order_by(MediaUpload.upload_date.desc()).first()
    all_progress = db.query(ProgressRecord).filter(ProgressRecord.project_id == project_id).order_by(ProgressRecord.recorded_date.asc()).all()
    has_measured_progress_history = any(
        current.recorded_date > previous.recorded_date
        and current.completed_length > previous.completed_length
        for previous, current in zip(all_progress, all_progress[1:])
    )

    return {
        "project": {
            "id": project.id,
            "name": project.project_name,
            "location": project.location,
            "total_km": project.total_road_length,
            "start_date": str(project.start_date),
            "planned_end_date": str(project.planned_end_date)
        },
        "kpis": {
            "completed_km": latest_prog.completed_length if latest_prog else 0.0,
            "progress_pct": latest_prog.progress_percentage if latest_prog else 0.0,
            "worker_count": latest_worker.worker_count if latest_worker else 0,
            "active_workers": latest_worker.active_workers if latest_worker else 0,
            "idle_workers": latest_worker.idle_workers if latest_worker else 0,
            "workforce_activity_rate": latest_worker.activity_rate if latest_worker else 0.0,
            "equipment_count": latest_equip.equipment_count if latest_equip else 0,
            "equipment_utilization": latest_equip.utilization_rate if latest_equip else 0.0,
            "rollers": latest_equip.rollers_count if latest_equip else 0,
            "excavators": latest_equip.excavators_count if latest_equip else 0,
            "pavers": latest_equip.pavers_count if latest_equip else 0,
            "trucks": latest_equip.trucks_count if latest_equip else 0,
            "estimated_days_remaining": latest_pred.estimated_days_remaining if latest_pred else 0,
            "predicted_completion_date": str(latest_pred.predicted_completion_date) if latest_pred else str(project.planned_end_date),
            "confidence_score": latest_pred.confidence_score if latest_pred and has_measured_progress_history else (30.0 if latest_pred else None),
            "daily_pace_km": latest_pred.daily_pace_km if latest_pred and has_measured_progress_history else None,
            "forecast_status": (
                "On Track" if latest_pred and has_measured_progress_history
                else "Baseline Estimate" if latest_pred else None
            ),
            "forecast_basis": (
                "Estimated from dated project progress intervals"
                if latest_pred and has_measured_progress_history
                else "Baseline pace only; dated progress history is insufficient"
                if latest_pred else None
            )
        },
        "latest_media": {
            "raw_url": latest_media.file_path if latest_media else None,
            "annotated_url": latest_media.processed_image_path if latest_media else None,
            "upload_date": str(latest_media.upload_date) if latest_media else None
        },
        "trend": [
            {
                "date": str(pr.recorded_date),
                "completed_km": pr.completed_length,
                "progress_pct": pr.progress_percentage
            }
            for pr in all_progress
        ]
    }

# -------------------------------------------------------------
# REPORTS API (Automated Report Generation)
# -------------------------------------------------------------
@app.get("/api/reports/{project_id}")
def get_reports(project_id: str, db: Session = Depends(get_db)):
    reports = db.query(Report).filter(Report.project_id == project_id).order_by(Report.generated_at.desc()).all()
    return reports

@app.post("/api/reports/{project_id}/generate")
def generate_report(project_id: str, report_type: str = "Daily", db: Session = Depends(get_db)):
    project = db.query(Project).filter(Project.id == project_id).first()
    latest_prog = db.query(ProgressRecord).filter(ProgressRecord.project_id == project_id).order_by(ProgressRecord.recorded_date.desc()).first()
    latest_pred = db.query(Prediction).filter(Prediction.project_id == project_id).order_by(Prediction.created_at.desc()).first()
    latest_worker = db.query(WorkerAnalytics).filter(WorkerAnalytics.project_id == project_id).order_by(WorkerAnalytics.recorded_date.desc()).first()

    summary = (
        f"AI Road Construction Inspection Summary ({report_type})\n"
        f"Project: {project.project_name} | Location: {project.location}\n"
        f"Completed: {latest_prog.completed_length if latest_prog else 0} km of {project.total_road_length} km ({latest_prog.progress_percentage if latest_prog else 0}%)\n"
        f"Active Workforce: {latest_worker.active_workers if latest_worker else 0} / {latest_worker.worker_count if latest_worker else 0}\n"
        f"Forecasted Completion: {latest_pred.predicted_completion_date if latest_pred else project.planned_end_date} ({latest_pred.estimated_days_remaining if latest_pred else 0} days remaining)"
    )

    report = Report(
        project_id=project.id,
        report_type=report_type,
        generated_at=datetime.utcnow(),
        summary_text=summary
    )
    db.add(report)
    db.commit()
    db.refresh(report)

    return report

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
