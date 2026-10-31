# BuildTrack — Construction Labour & Site Progress Management Platform

**BuildTrack** is a full-stack web and mobile-responsive platform designed for builders, contractors, and construction site supervisors (munshis) to manage daily labour activities, attendance, automated wage calculations, site progress milestones, materials expenses, and field updates from a single centralized dashboard.

The workspace also includes a road-construction inspection module. It uses a FastAPI service for project analytics and drone image/video frame processing, alongside the BuildTrack Express API.

---

## 🏗️ Core Features & Capabilities

### 1. Builder / Contractor Hub (Central Command)
- **Multi-Site Overview**: High-level KPI metrics across all active projects (Active Sites, Total Labour, Today's Turnout, Today's Wage Accrual, Net Pending Wages, Overall Progress %).
- **Site Progress & Milestones**: Track stage completion percentages (Foundation, Structure, Brickwork, Plaster, Electrical, Painting).
- **Labour Management**: Comprehensive worker directory with skills/trades (Mason, Carpenter, Painter, Plumber, Electrician, Bar Bender, Tiles Mason, Helper), daily wage rates, and overtime rates.
- **Automated Wage Engine**: Accurately computes basic wages (`days × daily rate`), overtime amounts (`OT hours × OT rate`), deductions, and pending wage liabilities.
- **Worker Payouts & Wage Slips**: Record wage payments (Cash, UPI, Bank Transfer) and print official labour wage slips.
- **Site Photos Gallery**: Categorized photo inspection (Work Progress, Materials Received, Issues/Damage, General Site Views) with lightbox preview.
- **Site Expense Tracker**: Log raw material costs (Cement, Steel, Bricks, Sand, Transport, Equipment).
- **AI Daily Briefs & Predictive Insights**: Automated daily executive summaries and intelligent risk alerts (e.g. low cement stock, high pending wage liabilities).
- **Auditing & Report Generation**: Printable attendance registers and wage disbursement ledgers.

### 2. Site Supervisor (Munshi) Mobile-First Experience
- **Touch-Optimized Fast Workflow**: Designed specifically for on-site mobile use.
- **1-Tap Attendance**: Large Present, Absent, Half Day, and Overtime buttons with "Mark All Present" shortcut.
- **End-of-Day Work Report**: Log work completed, progress slider (0–100%), checklist of finished tasks, material deliveries, bottlenecks, and tomorrow's plan.
- **Quick Site Photo Upload**: Direct photo capture and upload with categorization.
- **Emergency Expense Entry**: Record on-site purchases (e.g. emergency cement bags, transport, snacks).

### 3. Labour Worker Portal
- **Self-Service Wage & Attendance Ledger**: View total days worked, overtime hours clocked, total earnings, payments received, and pending balances.
- **Payment History & Receipts**: Transparent payment vouchers and transaction references.

### 4. Road Construction Inspection
- **Road Progress Review**: Inspect road-surface imagery and track progress, workforce, and equipment estimates by project.
- **Drone Media Upload**: Analyze supported images and a representative midpoint frame from supported videos.

---

## ⚡ Quick Demo Accounts (1-Click Switcher Available in UI)

| Role | Email | Password | Scope |
| :--- | :--- | :--- | :--- |
| **Builder (Admin)** | `builder@buildtrack.com` | `password123` | Full multi-site administration |
| **Supervisor (Munshi)** | `supervisor@buildtrack.com` | `password123` | On-site attendance & daily logs |
| **Labour Worker** | `ramesh.mason@buildtrack.com` | `password123` | Personal wage & attendance portal |

---

## 🚀 Getting Started

### 1. Start the Backend API
```bash
cd server
npm install
npm run seed     # Pre-populates realistic construction sites, labour & logs
npm start        # Runs Express API on http://localhost:5000
```

### 2. Start the Frontend Application
```bash
cd client
npm install
npm run dev      # Runs Vite dev server on http://localhost:5173
```

### 3. Start the Road AI Service
```bash
cd backend
python -m pip install -r requirements.txt
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

The AI service health endpoint is `http://localhost:8000/api/health`. The Vite dev server proxies `/ai-api` and `/static` to this service. Start all three services (Express, Vite, and FastAPI) to use the complete application.

### Build and use the Android APK

On Windows with Android Studio's SDK and JDK 17 installed, run from `client`:

```powershell
npm run android:apk
```

The debug APK is created at `client/android/app/build/outputs/apk/debug/app-debug.apk`. Copy it to the phone and install it. The APK packages the app interface; road inference and project data still run on the computer's backend. Keep the phone and computer on the same Wi-Fi, start the Express and AI services, then tap the Wi-Fi icon in the app and enter the computer's Wi-Fi IPv4 address (IP only, no port). The computer must allow inbound connections on ports 5000 and 8000.

Road measurement forecasts apply to the visible corridor in the uploaded image and use an assumed paving pace of 40–80 m/day. The separate project forecast uses dated progress records when they exist; otherwise it shows a low-confidence baseline. A single photo cannot establish whole-project completion or a learned production rate.

### Trained Road Mask Preview

The Builder AI workflow's **Preview Road Mask** action uses the stable checkpoint at `backend/models/road_boundary_mapillary_best.pth`. The inference runtime needs PyTorch and `segmentation-models-pytorch`; this workspace runs it from the root `.venv-roadtrain` environment. If the inference environment or checkpoint is stored elsewhere, set `BUILDTRACK_ROAD_MODEL_PYTHON` and `BUILDTRACK_ROAD_MODEL_CHECKPOINT` before starting FastAPI. The preview reports the share of pixels marked as road in one frame; it is not a project completion estimate and is still experimental.

---

## 🛠️ Technology Stack
- **Frontend**: React, Vite, Tailwind CSS, Lucide React, Recharts, React Router
- **Backend**: Node.js, Express.js, JWT, bcryptjs, Multer, Morgan
- **Database**: Zero-config persistent embedded datastore with MongoDB/Mongoose compatibility
