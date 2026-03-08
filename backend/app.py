from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.upload_data import router as upload_router
from api.build_graph import router as build_graph_router
from api.detect_fraud import router as detect_fraud_router
from api.graph_data import router as graph_data_router

app = FastAPI(title="GST Fraud App")

# Allow CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Since it's a hackathon
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload_router, prefix="/api")
app.include_router(build_graph_router, prefix="/api")
app.include_router(detect_fraud_router, prefix="/api")
app.include_router(graph_data_router, prefix="/api")

@app.get("/")
def root():
    return {"message": "GST Fraud Detection API is running"}
