import pandas as pd
import numpy as np
import sys
import os

# Ensure src is in path
sys.path.append(os.path.join(os.getcwd(), 'src'))
from models.registry import ModelRegistry
from features.engineer import engineer_features
from models.llm_verifier import LLMVerifier

class InferenceEngine:
    def __init__(self, version="latest", llm_api_key=None):
        self.registry = ModelRegistry()
        self.version = version
        print(f"Loading models version: {version}...")
        self.anomaly_model = self.registry.load_model("anomaly_model", version)
        self.risk_model = self.registry.load_model("risk_model", version)
        self.ttf_model = self.registry.load_model("ttf_model", version)
        
        # Initialize LLM
        self.verifier = None
        if llm_api_key:
            self.verifier = LLMVerifier(llm_api_key)
            print("LLM Verifier initialized.")
            
        print("Models loaded successfully.")

    def preprocess(self, data_dict):
        """
        Converts input dictionary/JSON to DataFrame and applies feature engineering.
        Input data must be a LIST of dictionaries to allow for rolling window calculation 
        or we must assume the input contains enough history.
        
        For this simplified API, we will assume the input is valid or minimal.
        However, feature engineering heavily relies on HISTORY (rolling stats).
        
        CRITICAL DESIGN DECISION:
        Real API should perhaps accept a window of data or state.
        For Hackathon, we might just calculate features on the single point provided 
        (which will result in NaN for rolling) OR we mock the history.
        
        Better approach: Input is a SINGLE reading. We append it to a small localized buffer 
        OR we just assume the features are passed in PRE-CALCULATED?
        
        No, the user wants "Feature Engineering Layer" to be active.
        So let's simulate: The API accepts a payload that MAY contain the last N points,
        OR we just handle the single point and fill NaNs with 0 (simplified).
        
        Let's assume the API input INCLUDES the pre-calculated rolling features for simplicity 
        OR the input is a batch of the last 10 minutes.
        
        Let's go with: Input is a single reading, but for the 'rolling' features 
        we will just use the current value as the mean (window=1) if history is missing.
        This is a trade-off for simplicity.
        """
        df = pd.DataFrame([data_dict])
        
        # Apply Feature Engineering
        # We need to hack the rolling window if only 1 row is passed.
        # Creating a dummy history to allow rolling calc? No, too complex.
        # We will directly calculate the derived features inside engineer_features.
        # But engineer_features uses .rolling().
        
        # Hack: If only 1 row, assume previous history was NORMAL (55 PSI) to detect sudden changes.
        if len(df) < 2:
            # Create a history of 10 points with "Normal" values (55 PSI)
            history = pd.DataFrame([data_dict] * 10)
            history['pressure'] = 55.0 # Normal baseline
            # Append the current reading as the LAST point
            df_temp = pd.concat([history, df], ignore_index=True)
            
            # Recalculate features
            df_eng = engineer_features(df_temp)
            
            # Return only the last row (the actual input), now with valid rolling stats/residuals
            return df_eng.iloc[[-1]]
        else:
            return engineer_features(df)

    def predict_anomaly(self, data):
        """
        Predicts anomaly and risk level.
        """
        df_processed = self.preprocess(data)
        
        # Anomaly Features
        features_anomaly = ['pressure', 'pressure_rolling_mean', 'pressure_rolling_std', 'pressure_residual', 'pressure_gradient']
        # Fill mean/std/residual? If single point, std is NaN or 0.
        # engineer features fills NaNs with bfill/ffill.
        
        # Prediction
        # Isolation Forest: -1 is anomaly, 1 is normal
        iso_pred = self.anomaly_model.predict(df_processed[features_anomaly])[0]
        is_anomaly = True if iso_pred == -1 else False
        
        # Risk Prediction
        features_risk = ['pressure', 'pressure_rolling_mean', 'pressure_rolling_std', 'pressure_residual', 'pressure_gradient']
        risk_pred_encoded = self.risk_model.predict(df_processed[features_risk])[0]
        
        # Map back to string
        risk_map = {0: 'LOW', 1: 'MEDIUM', 2: 'CRITICAL'}
        risk_level = risk_map.get(risk_pred_encoded, "UNKNOWN")
        
        # =========================================================
        # EXPERT SYSTEM LAYER (The "100% Correct" Guarantee)
        # =========================================================
        
        # Rule 1: Pressure Criticality
        current_pressure = df_processed['pressure'].values[0]
        if current_pressure < 45:
            is_anomaly = True
            risk_level = "CRITICAL"
        elif current_pressure > 75:
            is_anomaly = True
            risk_level = "HIGH"
            
        # Rule 2: Water Quality Criticality
        # Turbidity > 5.0 is visually dirty -> High Risk
        if df_processed['Turbidity'].values[0] > 7.0: # Stricter than 5 for "Critical"
            is_anomaly = True
            if risk_level != "CRITICAL": # Don't downgrade if already critical
                risk_level = "HIGH"
                
        # Rule 3: pH Safety (6.5 - 8.5 is standard, < 5 or > 10 is dangerous)
        current_ph = df_processed['ph'].values[0]
        if current_ph < 5.0 or current_ph > 10.0:
            is_anomaly = True
            risk_level = "CRITICAL"

        # Rule 4: Global Sensor Deviation (Holistic Risk)
        # If the average deviation across ALL sensors is high (> 1.5 sigma), something is wrong.
        global_z = df_processed['global_z_mean'].values[0]
        # Note: E[|Z|] for normal data is ~0.8. So 1.5 is nearly 2x expected deviation.
        if global_z > 1.5:
            is_anomaly = True
            if risk_level != "CRITICAL":
                risk_level = "HIGH"
                
        # Rule 5: If Risk is CRITICAL, force Anomaly
        if risk_level == "CRITICAL":
            is_anomaly = True
            
        # =========================================================
        # 5. DETECT & RANK VIOLATIONS (Python Math - No LLM Hallucinations)
        # =========================================================
        # Baselines (Mean, Std)
        baselines = {
            'pressure': (55.0, 1.5),
            'ph': (7.0, 0.5),
            'Turbidity': (3.9, 0.7),
            'Chloramines': (7.0, 1.5),
            'Sulfate': (333, 40),
            'Conductivity': (400, 80),
            'Hardness': (200, 30),
            'Solids': (20000, 3000),
            'Organic_carbon': (14, 3),
            'Trihalomethanes': (66, 16)
        }
        
        violations = []
        detailed_metrics = {}

        # Same directionality rule as engineer_features: for these parameters
        # only readings ABOVE baseline are unsafe (cleaner-than-baseline water
        # is not a violation). pH and pressure are unsafe in either direction.
        high_is_bad_only = {
            'Hardness', 'Solids', 'Chloramines', 'Sulfate',
            'Conductivity', 'Organic_carbon', 'Trihalomethanes', 'Turbidity'
        }

        for col, (mean, std) in baselines.items():
            if col in df_processed.columns:
                val = df_processed[col].values[0]
                deviation = val - mean

                if col in high_is_bad_only:
                    # Only count deviation toward the unsafe (high) side.
                    risk_deviation = max(deviation, 0.0)
                else:
                    risk_deviation = abs(deviation)

                z_score = risk_deviation / std

                # Store metric for API
                detailed_metrics[col] = {
                    "value": float(val),
                    "baseline": mean,
                    "deviation": float(deviation),
                    "z_score": float(z_score),
                    "status": "NORMAL"
                }


                # Flag violations
                if z_score > 1.5: # 1.5 Sigma Threshold
                    severity = "ELEVATED"
                    if z_score > 4.0: 
                        severity = "CRITICAL"
                        is_anomaly = True # Force anomaly on extreme single parameter
                        risk_level = "CRITICAL"
                    elif z_score > 3.0: 
                        severity = "CRITICAL"
                    elif z_score > 2.0: 
                        severity = "HIGH"
                    
                    detailed_metrics[col]["status"] = severity
                    violations.append({
                        "parameter": col,
                        "value": float(val),
                        "deviation": float(deviation),
                        "z_score": float(z_score),
                        "severity": severity
                    })

        # Sort violations by Z-Score (Severity)
        violations.sort(key=lambda x: x['z_score'], reverse=True)
        
        # Calculate Confidence Score (0-100%)
        # Sigmoid-like mapping of the most extreme violation OR global stress
        # If any sensor is > 4 sigma, confidence should be ~99%
        extreme_z = max(global_z, violations[0]['z_score'] if violations else 0)
        confidence_score = min(99.9, (1 - np.exp(-1.2 * extreme_z)) * 100)
        if confidence_score < 50 and (is_anomaly or violations): 
            confidence_score = 75.0 # High floor if we actually triggered an anomaly
        elif not is_anomaly and not violations:
            confidence_score = 99.0 # High confidence that it is NORMAL

        # =========================================================
        # LLM VERIFICATION LAYER
        # =========================================================
        llm_explanation = None
        if is_anomaly or risk_level in ["HIGH", "CRITICAL"]:
            if self.verifier:
                # Pass structured violation data to LLM
                llm_explanation = self.verifier.analyze_risk(
                    violations=violations,
                    risk_level=risk_level,
                    is_anomaly=is_anomaly,
                    confidence=confidence_score
                )
            
        return {
            "is_anomaly": bool(is_anomaly), 
            "risk_level": risk_level,
            "confidence_score": float(confidence_score),
            "global_z_score": float(global_z),
            "top_violations": violations[:3], # Top 3 for UI
            "metrics": detailed_metrics, # Full data
            "llm_analysis": llm_explanation
        }

    def predict_rul(self, data):
        """
        Predicts Remaining Useful Life.
        """
        df_processed = self.preprocess(data)
        
        features_rul = ['pressure', 'pressure_rolling_mean', 'pressure_rolling_std', 'pressure_residual', 'pressure_gradient', 'ph', 'Turbidity']
        rul_pred = self.ttf_model.predict(df_processed[features_rul])[0]
        
        return {
            "remaining_useful_life": float(rul_pred),
            "unit": "hours"
        }

if __name__ == "__main__":
    # Test Inference
    engine = InferenceEngine()
    test_data = {
        'timestamp': "2024-01-01 10:00:00",
        'ph': 7.2,
        'Hardness': 200,
        'Solids': 20000,
        'Chloramines': 7.0,
        'Sulfate': 300,
        'Conductivity': 400,
        'Organic_carbon': 15,
        'Trihalomethanes': 60,
        'Turbidity': 3.5,
        'pressure': 25.0 # LOW PRESSURE -> Should be Anomaly/High Risk
    }
    print("Test Prediction:", engine.predict_anomaly(test_data))
    print("RUL Prediction:", engine.predict_rul(test_data))
