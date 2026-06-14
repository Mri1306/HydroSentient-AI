import sys
import os
import json

# Add src to path
sys.path.append(os.path.join(os.getcwd(), 'src'))
from models.inference import InferenceEngine

def test_repro():
    engine = InferenceEngine()
    
    # User provided payload
    data = {
        "timestamp": "2026-02-12T15:12:21Z",
        "ph": 7.4,
        "Hardness": 185,
        "Solids": 7200,
        "Chloramines": 5.8,
        "Sulfate": 190,
        "Conductivity": 350,
        "Organic_carbon": 4.2,
        "Trihalomethanes": 52,
        "Turbidity": 1.2,
        "pressure": 58
    }
    
    result = engine.predict_anomaly(data)
    
    print("\n--- TEST RESULTS ---")
    print(json.dumps(result, indent=2))
    
    # Assertions
    assert result['is_anomaly'] == False, f"FAIL: Should not be an anomaly. Risk: {result['risk_level']}"
    assert result['risk_level'] == "LOW", f"FAIL: Expected LOW risk, got {result['risk_level']}"
    print("\n[SUCCESS] Issue Reproduced & Fixed: Clean water is correctly identified as NORMAL/LOW risk.")

if __name__ == "__main__":
    test_repro()
