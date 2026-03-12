from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from api.upload_data import router as upload_router
from api.build_graph import router as build_graph_router
from api.detect_fraud import router as detect_fraud_router
from api.graph_data import router as graph_data_router
from api.investigate import router as investigate_router
from api.anomaly import router as anomaly_router
from api.investigation_lab import router as lab_router

app = FastAPI(title="GST Fraud App")

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(build_graph_router, prefix="/api")
app.include_router(detect_fraud_router, prefix="/api")
app.include_router(graph_data_router, prefix="/api")
app.include_router(investigate_router, prefix="/api")
app.include_router(anomaly_router, prefix="/api")
app.include_router(lab_router, prefix="/api")


# ── WebSocket: Live Fraud Stream ──────────────────────────────────────────────
# Registered directly on app (not via router) to avoid any prefix/router issues
from services.stream_processor import streamer

@app.websocket("/ws/fraud-stream")
async def fraud_stream_ws(websocket: WebSocket):
    """Real-time fraud stream — connect at ws://localhost:8000/ws/fraud-stream"""
    try:
        await streamer.connect(websocket)
    except Exception as e:
        print(f"[WS] Connect error: {e}")
        return

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        streamer.disconnect(websocket)
    except Exception:
        streamer.disconnect(websocket)


@app.get("/")
def root():
    return {"message": "GST Fraud Detection API is running"}
