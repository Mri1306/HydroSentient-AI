from fastapi import FastAPI, HTTPException, Security, status
from fastapi.security import APIKeyHeader
from pydantic import BaseModel
import uvicorn
import os
import sys
import random

# Add src to path
sys.path.append(os.path.join(os.getcwd(), 'src'))
from models.inference import InferenceEngine

from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI(
    title="HydroSentient AI API",
    description="AI-powered Microservice for Water Pipeline Monitoring",
    version="1.0.0"
)

# Security
API_KEY = os.getenv("HYDRO_API_KEY", "hydro-secret-key-123")  # override via env var in production
LLM_API_KEY = os.getenv("HF_TOKEN")
api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header == API_KEY:
        return api_key_header
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate credentials",
    )

# Load Model Engine once on startup
engine = InferenceEngine(llm_api_key=LLM_API_KEY)

# Input Schemas
class SensorData(BaseModel):
    timestamp: str = None
    ph: float
    Hardness: float
    Solids: float
    Chloramines: float
    Sulfate: float
    Conductivity: float
    Organic_carbon: float
    Trihalomethanes: float
    Turbidity: float
    pressure: float

# Endpoints

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "HydroSentient AI", "version": "1.0.0"}

@app.post("/predict-anomaly", dependencies=[Security(get_api_key)])
def predict_anomaly(data: SensorData):
    try:
        result = engine.predict_anomaly(data.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/predict-ttf", dependencies=[Security(get_api_key)])
def predict_ttf(data: SensorData):
    try:
        result = engine.predict_rul(data.dict())
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/leak-localization", dependencies=[Security(get_api_key)])
def leak_localization(data: SensorData):
    """
    Localizes a potential leak in physical pipe segments.
    Heuristics map sensor anomalies to specific infrastructure segments.
    """
    try:
        # Get baseline prediction
        pred = engine.predict_anomaly(data.dict())
        is_anomaly = pred["is_anomaly"]
        
        # Physical Pipe Segments (Infrastructure Topology)
        segments = [
            {"id": "SEG-001", "name": "Treatment Intake", "metadata": "Upstream / Source"},
            {"id": "SEG-002", "name": "Main Transmission Line", "metadata": "Primary Trunk"},
            {"id": "SEG-003", "name": "Pressure Regulation Hub", "metadata": "Valve Control Center"},
            {"id": "SEG-004", "name": "Distribution North", "metadata": "Residential Zone A"},
            {"id": "SEG-005", "name": "Distribution South", "metadata": "Residential Zone B"},
            {"id": "SEG-006", "name": "Terminal Service Line", "metadata": "End-user Delivery"}
        ]

        # Topology Edges (Physical connections)
        edges = [
            ("SEG-001", "SEG-002"), ("SEG-002", "SEG-003"),
            ("SEG-003", "SEG-004"), ("SEG-003", "SEG-005"),
            ("SEG-004", "SEG-006"), ("SEG-005", "SEG-006")
        ]

        results = []
        if is_anomaly:
            # Physical Localization Heuristic
            top_segments = []
            
            # Rule 1: Massive pressure drop points to the Main Transmission Trunk
            if data.pressure < 40.0:
                top_segments = ["Main Transmission Line", "Pressure Regulation Hub"]
            
            # Rule 2: High Turbidity without pressure drop points to Service Lines or Intake
            elif data.Turbidity > 6.0:
                top_segments = ["Terminal Service Line", "Treatment Intake"]
                
            # Rule 3: Quality shifts (pH) point to Treatment or Distribution
            elif abs(data.ph - 7.0) > 2.0:
                top_segments = ["Treatment Intake", "Distribution North", "Distribution South"]
            
            # Default fall-back
            if not top_segments:
                top_segments = ["Main Transmission Line"]

            for seg in segments:
                if seg["name"] in top_segments:
                    # Allocate higher probability to triggered segments
                    prob = (85.0 / len(top_segments)) + random.uniform(5, 10)
                else:
                    prob = random.uniform(1, 8)
                results.append({**seg, "probability_percent": round(prob, 2)})
        else:
            # Baseline background noise
            for seg in segments:
                results.append({**seg, "probability_percent": round(random.uniform(0.1, 2.0), 2)})

        results.sort(key=lambda x: x["probability_percent"], reverse=True)

        return {
            "status": "anomaly_detected" if is_anomaly else "normal",
            "global_confidence": pred["confidence_score"],
            "probable_leak_segment": results[0]["name"],
            "segment_analysis": results,
            "infrastructure_map": {
                "nodes": segments,
                "links": [{"source": e[0], "target": e[1]} for e in edges]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
