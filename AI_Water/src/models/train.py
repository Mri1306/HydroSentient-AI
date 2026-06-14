import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from xgboost import XGBClassifier
from sklearn.metrics import accuracy_score, mean_squared_error, classification_report
import sys
import os

# Add src to path
sys.path.append(os.path.join(os.getcwd(), 'src'))
from models.registry import ModelRegistry

def train_models():
    print("Loading data...")
    try:
        df = pd.read_csv("data/processed/featured_water_data.csv")
    except FileNotFoundError:
        print("Data not found. Run previous steps.")
        return

    registry = ModelRegistry()
    version_path, version = registry.create_new_version()
    print(f"Starting training for version {version}...")
    
    # ==========================================
    # 1. Anomaly Detection (Unsupervised)
    # ==========================================
    print("\n--- Training Anomaly Detection Model ---")
    # Features for anomaly detection: Raw sensor data + basic rolling
    features_anomaly = ['pressure', 'pressure_rolling_mean', 'pressure_rolling_std', 'pressure_residual', 'pressure_gradient']
    X_anomaly = df[features_anomaly]
    
    # Isolation Forest
    iso_forest = IsolationForest(n_estimators=100, contamination=0.05, random_state=42)
    iso_forest.fit(X_anomaly)
    
    # Save
    registry.save_model(iso_forest, "anomaly_model", version_path)
    
    # ==========================================
    # 2. Risk Scoring (Supervised Classification)
    # ==========================================
    print("\n--- Training Risk Scoring Model ---")
    # Features
    features_risk = ['pressure', 'pressure_rolling_mean', 'pressure_rolling_std', 'pressure_residual', 'pressure_gradient']
    target_risk = 'risk_level' # Created in generator: LOW, MEDIUM, CRITICAL
    
    # Encode target
    # Low=0, Medium=1, Critical=2 ? XGBoost needs numeric or LabelEncoder
    # Let's map explicitly
    risk_map = {'LOW': 0, 'MEDIUM': 1, 'CRITICAL': 2}
    df['risk_encoded'] = df[target_risk].map(risk_map)
    
    X_risk = df[features_risk]
    y_risk = df['risk_encoded']
    
    X_train_r, X_test_r, y_train_r, y_test_r = train_test_split(X_risk, y_risk, test_size=0.2, random_state=42)
    
    xgb_model = XGBClassifier(use_label_encoder=False, eval_metric='mlogloss', n_estimators=100)
    xgb_model.fit(X_train_r, y_train_r)
    
    # Evaluate
    y_pred_r = xgb_model.predict(X_test_r)
    acc = accuracy_score(y_test_r, y_pred_r)
    print(f"Risk Model Accuracy: {acc:.4f}")
    
    registry.save_model(xgb_model, "risk_model", version_path, metrics={"accuracy": acc})
    
    # ==========================================
    # 3. Time-to-Failure (Regression)
    # ==========================================
    print("\n--- Training Time-to-Failure Model ---")
    features_rul = features_risk + ['ph', 'Turbidity'] # Use more features?
    # RUL is 100-500 generally, 0-10 if leak.
    # We want to predict RUL.
    
    X_rul = df[features_rul]
    y_rul = df['RUL']
    
    X_train_t, X_test_t, y_train_t, y_test_t = train_test_split(X_rul, y_rul, test_size=0.2, random_state=42)
    
    rf_model = RandomForestRegressor(n_estimators=100, random_state=42)
    rf_model.fit(X_train_t, y_train_t)
    
    # Evaluate
    y_pred_t = rf_model.predict(X_test_t)
    mse = mean_squared_error(y_test_t, y_pred_t)
    rmse = np.sqrt(mse)
    print(f"RUL Model RMSE: {rmse:.4f}")
    
    registry.save_model(rf_model, "ttf_model", version_path, metrics={"rmse": rmse})
    
    print(f"\nAll models trained and saved to {version_path}")

if __name__ == "__main__":
    train_models()
