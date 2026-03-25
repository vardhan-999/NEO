# Neo - GST Fraud Detection Platform

Neo is a full-stack GST fraud detection and investigation platform.
It combines a FastAPI backend for data ingestion and analysis with a React + Vite frontend for dashboards, alerts, graph view, and investigation workflows.

## Project Structure

```text
neo/
  backend/         # FastAPI API, fraud engine, DB models, services
  frontend/        # Main React app (Vite)
  frontend-demo/   # Demo UI variant
  data/            # Sample/test datasets
```

## Features

- CSV upload and validation for GST transaction data
- Fraud detection and anomaly scoring
- Graph/network-based transaction analysis
- Investigation endpoints and investigation-lab APIs
- Live fraud stream via WebSocket

## Tech Stack

- Backend: Python, FastAPI, SQLAlchemy, pandas, scikit-learn, networkx
- Frontend: React 19, Vite, Tailwind CSS, Recharts

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm

## Backend Setup (PowerShell)

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app:app --reload --port 8000
```

Backend runs at `http://localhost:8000`.
Open API docs at `http://localhost:8000/docs`.

## Frontend Setup (PowerShell)

```powershell
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`.

## Key API Endpoints

- `POST /api/upload`
- `POST /api/validate-preview`
- `POST /api/simulate`
- `POST /api/build-graph`
- `POST /api/detect-fraud`
- `POST /api/anomaly-detect`
- `GET /api/anomaly-results`
- `GET /api/graph-data`
- `GET /api/investigate/{node_id}`
- `GET /api/lab/search`
- `GET /api/lab/company/{name}`
- `GET /api/lab/chain/{start}`
- `GET /api/lab/network-map`
- `WS /ws/fraud-stream`

## Sample Data

You can start testing with:

- `sample_gst_invoices.csv`
- files in `data/`

## Notes

- CORS is currently open for development (`allow_origins=["*"]`).
- This repo currently includes local environment artifacts (for example `backend/venv`). Consider adding a `.gitignore` cleanup in a follow-up.
