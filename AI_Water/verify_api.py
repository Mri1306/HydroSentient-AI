import sys
import os
import json
from fastapi.testclient import TestClient

# Add src to path
sys.path.append(os.path.join(os.getcwd(), 'src'))
from api.app import app

client = TestClient(app)
API_KEY = "hydro-secret-key-123"
HEADERS = {"X-API-Key": API_KEY}

def test_api():
    print("--- Testing API Endpoints ---")
    
    # 1. Health Check
    print("\n1. Testing /health...")
    response = client.get("/health")
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
    assert response.status_code == 200
    
    # 2. Predict Anomaly (Normal Case)
    print("\n2. Testing /predict-anomaly (Normal Data)...")
    normal_data = {
        'timestamp': '2024-01-01T12:00:00',
        'ph': 7.2,
        'Hardness': 200,
        'Solids': 20000,
        'Chloramines': 7.0,
        'Sulfate': 300,
        'Conductivity': 400,
        'Organic_carbon': 15,
        'Trihalomethanes': 60,
        'Turbidity': 3.5,
        'pressure': 55.0 # Normal Pressure
    }
    response = client.post("/predict-anomaly", headers=HEADERS, json=normal_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    
    # 3. Predict Anomaly (Anomaly Case)
    print("\n3. Testing /predict-anomaly (Anomaly Data)...")
    anomaly_data = normal_data.copy()
    anomaly_data['pressure'] = 25.0 # LOW Pressure
    response = client.post("/predict-anomaly", headers=HEADERS, json=anomaly_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200
    # Check for LLM Analysis
    response_json = response.json()
    if "llm_analysis" in response_json:
        print("\n[SUCCESS] LLM Analysis Field Found:")
        print(response_json["llm_analysis"])
    else:
        print("\n[FAILURE] LLM Analysis Field Missing!")
    
    # 4. Predict TTF
    print("\n4. Testing /predict-ttf...")
    response = client.post("/predict-ttf", headers=HEADERS, json=normal_data)
    print(f"Status: {response.status_code}")
    print(f"Response: {json.dumps(response.json(), indent=2)}")
    assert response.status_code == 200

    # 5. Leak Localization (Physical)
    print("\n5. Testing /leak-localization (Physical Segments)...")
    response = client.post("/leak-localization", headers=HEADERS, json=anomaly_data)
    print(f"Status: {response.status_code}")
    json_data = response.json()
    print(f"Response Summary: status={json_data['status']}, probable_segment={json_data['probable_leak_segment']}")
    assert response.status_code == 200
    assert "segment_analysis" in json_data
    assert len(json_data["segment_analysis"]) == 6 # Ensure all 6 segments are present

if __name__ == "__main__":
    test_api()
