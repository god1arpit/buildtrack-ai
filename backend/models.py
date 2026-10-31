from sqlalchemy import Column, String, Float, Integer, Date, DateTime, ForeignKey, Text, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker, relationship
from datetime import datetime, date
import uuid

Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default="Project Manager") # Project Manager, Site Engineer, Contractor, Admin
    created_at = Column(DateTime, default=datetime.utcnow)

class Project(Base):
    __tablename__ = "projects"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_name = Column(String(255), nullable=False)
    location = Column(String(255), nullable=False)
    total_road_length = Column(Float, nullable=False) # In km
    start_date = Column(Date, nullable=False)
    planned_end_date = Column(Date, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    media_uploads = relationship("MediaUpload", back_populates="project", cascade="all, delete-orphan")
    progress_records = relationship("ProgressRecord", back_populates="project", cascade="all, delete-orphan")
    worker_analytics = relationship("WorkerAnalytics", back_populates="project", cascade="all, delete-orphan")
    equipment_analytics = relationship("EquipmentAnalytics", back_populates="project", cascade="all, delete-orphan")
    predictions = relationship("Prediction", back_populates="project", cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="project", cascade="all, delete-orphan")

class MediaUpload(Base):
    __tablename__ = "media_uploads"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    file_path = Column(Text, nullable=False)
    media_type = Column(String(50), default="drone_image") # drone_image, drone_video, site_camera
    upload_date = Column(DateTime, default=datetime.utcnow)
    processed_image_path = Column(Text, nullable=True)

    project = relationship("Project", back_populates="media_uploads")

class ProgressRecord(Base):
    __tablename__ = "progress_records"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    completed_length = Column(Float, nullable=False) # In km
    progress_percentage = Column(Float, nullable=False) # 0 - 100%
    recorded_date = Column(Date, default=date.today)
    paved_area_sqm = Column(Float, default=0.0)
    unpaved_area_sqm = Column(Float, default=0.0)

    project = relationship("Project", back_populates="progress_records")

class WorkerAnalytics(Base):
    __tablename__ = "worker_analytics"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    worker_count = Column(Integer, default=0)
    active_workers = Column(Integer, default=0)
    idle_workers = Column(Integer, default=0)
    activity_rate = Column(Float, default=0.0) # Percentage 0 - 100%
    recorded_date = Column(Date, default=date.today)

    project = relationship("Project", back_populates="worker_analytics")

class EquipmentAnalytics(Base):
    __tablename__ = "equipment_analytics"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    equipment_count = Column(Integer, default=0)
    utilization_rate = Column(Float, default=0.0) # Percentage 0 - 100%
    rollers_count = Column(Integer, default=0)
    excavators_count = Column(Integer, default=0)
    pavers_count = Column(Integer, default=0)
    trucks_count = Column(Integer, default=0)
    recorded_date = Column(Date, default=date.today)

    project = relationship("Project", back_populates="equipment_analytics")

class Prediction(Base):
    __tablename__ = "predictions"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    estimated_days_remaining = Column(Integer, nullable=False)
    predicted_completion_date = Column(Date, nullable=False)
    daily_pace_km = Column(Float, default=0.0) # km / day pace
    confidence_score = Column(Float, default=88.5) # Accuracy confidence %
    created_at = Column(DateTime, default=datetime.utcnow)

    project = relationship("Project", back_populates="predictions")

class Report(Base):
    __tablename__ = "reports"
    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    project_id = Column(String(36), ForeignKey("projects.id"), nullable=False)
    report_type = Column(String(50), default="Daily") # Daily, Weekly, Monthly
    generated_at = Column(DateTime, default=datetime.utcnow)
    summary_text = Column(Text, nullable=True)

    project = relationship("Project", back_populates="reports")
