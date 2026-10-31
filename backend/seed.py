import cv2
import numpy as np
import os
from database import SessionLocal
from models import Project, ProgressRecord, WorkerAnalytics, EquipmentAnalytics, Prediction, MediaUpload
from datetime import date, timedelta

def seed_sample_drone_data():
    db = SessionLocal()
    try:
        # Check if project exists
        existing = db.query(Project).filter(Project.project_name == "National Highway NH-44 Expansion").first()
        if not existing:
            print("Seeding initial road construction project...")
            project = Project(
                project_name="National Highway NH-44 Expansion",
                location="Sector 18 to Industrial Corridor, Mohali",
                total_road_length=15.0, # 15 km
                start_date=date.today() - timedelta(days=20),
                planned_end_date=date.today() + timedelta(days=60)
            )
            db.add(project)
            db.commit()
            db.refresh(project)

            # Generate sample drone footage frame
            sample_dir = os.path.join(os.path.dirname(__file__), "samples")
            os.makedirs(sample_dir, exist_ok=True)
            img_path = os.path.join(sample_dir, "sample_drone_road.jpg")

            # Create realistic synthetic drone road image using OpenCV
            h, w = 720, 1280
            drone_img = np.zeros((h, w, 3), dtype=np.uint8)
            # Sky/horizon
            drone_img[0:int(h*0.25)] = [180, 200, 220] # Light blue-gray terrain
            # Surrounding ground / soil terrain
            drone_img[int(h*0.25):h] = [60, 100, 80] # Earthy green-brown terrain

            # Perspective road corridor
            road_pts = np.array([
                [int(w * 0.12), h],
                [int(w * 0.38), int(h * 0.25)],
                [int(w * 0.62), int(h * 0.25)],
                [int(w * 0.88), h]
            ], np.int32)
            cv2.fillPoly(drone_img, [road_pts], [45, 45, 48]) # Asphalt gray

            # Paved lane markings
            cv2.line(drone_img, (int(w * 0.50), int(h * 0.25)), (int(w * 0.50), h), [255, 255, 255], 3)
            # Road shoulders
            cv2.line(drone_img, (int(w * 0.38), int(h * 0.25)), (int(w * 0.12), h), [200, 200, 200], 4)
            cv2.line(drone_img, (int(w * 0.62), int(h * 0.25)), (int(w * 0.88), h), [200, 200, 200], 4)

            cv2.imwrite(img_path, drone_img)
            print("Created sample drone image at:", img_path)

            # Add historical records for trend
            for d_offset in range(5, 0, -1):
                rec_date = date.today() - timedelta(days=d_offset * 3)
                km_done = round(4.5 + (5 - d_offset) * 1.2, 2)
                pct = round((km_done / 15.0) * 100, 1)

                prog = ProgressRecord(
                    project_id=project.id,
                    completed_length=km_done,
                    progress_percentage=pct,
                    recorded_date=rec_date,
                    paved_area_sqm=km_done * 7500.0,
                    unpaved_area_sqm=(15.0 - km_done) * 7500.0
                )
                db.add(prog)

            # Add current status (latest)
            latest_prog = ProgressRecord(
                project_id=project.id,
                completed_length=9.3,
                progress_percentage=62.0,
                recorded_date=date.today(),
                paved_area_sqm=9.3 * 7500.0,
                unpaved_area_sqm=(15.0 - 9.3) * 7500.0
            )
            worker_rec = WorkerAnalytics(
                project_id=project.id,
                worker_count=24,
                active_workers=20,
                idle_workers=4,
                activity_rate=83.3,
                recorded_date=date.today()
            )
            equip_rec = EquipmentAnalytics(
                project_id=project.id,
                equipment_count=6,
                utilization_rate=88.5,
                rollers_count=2,
                excavators_count=2,
                pavers_count=1,
                trucks_count=3,
                recorded_date=date.today()
            )
            pred_rec = Prediction(
                project_id=project.id,
                estimated_days_remaining=24,
                predicted_completion_date=date.today() + timedelta(days=24),
                daily_pace_km=0.24,
                confidence_score=91.4
            )
            media_rec = MediaUpload(
                project_id=project.id,
                file_path="/static/uploads/sample_drone_road.jpg",
                processed_image_path="/static/processed/sample_annotated.jpg",
                media_type="drone_image",
                upload_date=datetime.utcnow() if 'datetime' in locals() else None
            )

            # Process vision on the sample image to generate annotated preview
            from vision_pipeline import vision_pipeline
            proc_out = os.path.join(os.path.dirname(__file__), "processed", "sample_annotated.jpg")
            raw_out = os.path.join(os.path.dirname(__file__), "uploads", "sample_drone_road.jpg")
            cv2.imwrite(raw_out, drone_img)
            vision_pipeline.process_media(raw_out, proc_out, total_road_km=15.0)

            db.add(latest_prog)
            db.add(worker_rec)
            db.add(equip_rec)
            db.add(pred_rec)
            db.add(media_rec)
            db.commit()
            print("Sample road project initialized with baseline vision data!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_sample_drone_data()
