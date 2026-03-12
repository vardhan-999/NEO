import asyncio
import json
import random
from datetime import datetime
from typing import Set
from fastapi import WebSocket
from fraud_engine.graph_builder import G
from services.anomaly_detector import detector


class StreamProcessor:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()
        self.is_streaming = False
        self._task = None

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        # Send welcome message so the client knows it's live
        try:
            await websocket.send_text(json.dumps({
                "type": "info",
                "message": "Connected to NeoTrace live stream."
            }))
        except Exception:
            pass
        # Start background stream task if not already running
        self._ensure_stream()

    def _ensure_stream(self):
        """Create the background streaming task if not running."""
        if self._task is None or self._task.done():
            self.is_streaming = True
            try:
                loop = asyncio.get_event_loop()
                self._task = loop.create_task(self._stream_loop())
            except RuntimeError:
                # Fallback for environments where get_event_loop fails
                self.is_streaming = False

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)  # discard won't raise if missing
        if not self.active_connections:
            self.stop_stream()

    async def broadcast(self, message: dict):
        if not self.active_connections:
            return

        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception:
                disconnected.add(connection)

        for conn in disconnected:
            self.active_connections.discard(conn)

    def stop_stream(self):
        self.is_streaming = False
        if self._task:
            self._task.cancel()
            self._task = None

    async def _stream_loop(self):
        """
        Continuously emits transaction + alert events to all connected clients.
        When no graph data exists, sends keep-alive 'waiting' messages every 5s.
        When graph data exists, simulates live fraud events every 2–5s.
        """
        while self.is_streaming:
            try:
                if not self.active_connections:
                    await asyncio.sleep(2)
                    continue

                # Get current graph edges
                trade_edges = [
                    (u, v, d) for u, v, d in G.edges(data=True)
                    if d.get("type") == "trades_with"
                ]

                if not trade_edges:
                    await self.broadcast({
                        "type": "info",
                        "message": "Waiting for dataset… Upload a CSV or run the simulation."
                    })
                    await asyncio.sleep(5)
                    continue

                # Simulate a transaction on a random edge
                u, v, data = random.choice(trade_edges)
                amount = float(data.get("amount", 0))

                # Occasional spike to make the demo lively
                is_spike = random.random() < 0.12
                if is_spike:
                    amount *= random.uniform(3, 10)

                # Broadcast transaction event
                await self.broadcast({
                    "type": "transaction",
                    "seller": u,
                    "buyer": v,
                    "amount": round(amount, 2),
                    "timestamp": datetime.now().isoformat()
                })

                await asyncio.sleep(0.6)  # brief pause before scoring

                # Broadcast alert for high-risk transactions
                if is_spike or detector.is_trained:
                    score = random.uniform(0.72, 0.97) if is_spike else random.uniform(0.1, 0.45)
                    risk = "High" if score > 0.7 else "Medium" if score > 0.4 else "Low"

                    if score > 0.7:
                        await self.broadcast({
                            "type": "alert",
                            "seller": u,
                            "buyer": v,
                            "amount": round(amount, 2),
                            "score": round(score, 3),
                            "risk": risk,
                            "message": (
                                f"Volume spike detected: {u} → {v}" if is_spike
                                else "ML model flagged abnormal trading behaviour."
                            ),
                            "timestamp": datetime.now().isoformat()
                        })

                await asyncio.sleep(random.uniform(2.0, 4.5))

            except asyncio.CancelledError:
                break
            except Exception as e:
                # Never let the loop die silently
                await asyncio.sleep(3)


streamer = StreamProcessor()
