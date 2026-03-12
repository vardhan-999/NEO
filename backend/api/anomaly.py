from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from services.anomaly_detector import detector
from services.stream_processor import streamer

router = APIRouter()

# Cache so we don't re-train on every GET
_cached_results = []

@router.post("/anomaly-detect")
async def run_anomaly_detection():
    global _cached_results
    try:
        # Re-train models on current graph data
        trained = detector.train()
        if not trained:
            return {
                "message": "Not enough transaction data. Upload a dataset first.",
                "anomalies": [],
                "summary": {"total": 0, "high_risk": 0, "avg_score": 0}
            }

        results = detector.detect()
        _cached_results = results

        high_risk = [r for r in results if r["risk_level"] in ("Critical", "High")]
        avg_score = sum(r["anomaly_score"] for r in results) / len(results) if results else 0

        return {
            "message": f"Anomaly detection complete. Found {len(results)} anomalies.",
            "anomalies": results,
            "summary": {
                "total": len(results),
                "high_risk": len(high_risk),
                "avg_score": round(avg_score, 3)
            }
        }
    except Exception as e:
        return {"message": f"Error: {str(e)}", "anomalies": [], "summary": {"total": 0, "high_risk": 0, "avg_score": 0}}


@router.get("/anomaly-results")
async def get_anomaly_results():
    """Return cached last-run anomaly results."""
    global _cached_results
    if not _cached_results:
        # Try to run detection
        try:
            _cached_results = detector.detect()
        except Exception:
            pass
    high_risk = [r for r in _cached_results if r["risk_level"] in ("Critical", "High")]
    avg_score = sum(r["anomaly_score"] for r in _cached_results) / len(_cached_results) if _cached_results else 0
    return {
        "anomalies": _cached_results,
        "summary": {
            "total": len(_cached_results),
            "high_risk": len(high_risk),
            "avg_score": round(avg_score, 3)
        }
    }


@router.websocket("/ws/fraud-stream")
async def fraud_stream(websocket: WebSocket):
    """WebSocket endpoint for real-time fraud stream."""
    try:
        await streamer.connect(websocket)
    except Exception as e:
        print(f"WebSocket connect error: {e}")
        return

    try:
        while True:
            # Keep the connection alive; actual data is pushed from _stream_loop
            await websocket.receive_text()
    except WebSocketDisconnect:
        streamer.disconnect(websocket)
    except Exception:
        streamer.disconnect(websocket)
