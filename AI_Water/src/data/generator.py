import pandas as pd
import numpy as np
from datetime import datetime, timedelta

def generate_water_quality_data(n_samples=1000):
    """
    Generates synthetic water quality data based on realistic ranges.
    """
    np.random.seed(42)
    
    # Time range
    start_time = datetime.now()
    timestamps = [start_time + timedelta(minutes=i) for i in range(n_samples)]
    
    # Water Quality Parameters (Normal distributions)
    ph = np.random.normal(loc=7.0, scale=0.5, size=n_samples)  # pH: 6.5 - 8.5 is normal
    hardness = np.random.normal(loc=200, scale=30, size=n_samples) # mg/L
    solids = np.random.normal(loc=20000, scale=3000, size=n_samples) # ppm
    chloramines = np.random.normal(loc=7.0, scale=1.5, size=n_samples) # ppm
    sulfate = np.random.normal(loc=333, scale=40, size=n_samples) # mg/L
    conductivity = np.random.normal(loc=400, scale=80, size=n_samples) # uS/cm
    organic_carbon = np.random.normal(loc=14, scale=3, size=n_samples) # ppm
    trihalomethanes = np.random.normal(loc=66, scale=16, size=n_samples) # ug/L
    turbidity = np.random.normal(loc=3.9, scale=0.7, size=n_samples) # NTU
    
    data = {
        'timestamp': timestamps,
        'ph': ph,
        'Hardness': hardness,
        'Solids': solids,
        'Chloramines': chloramines,
        'Sulfate': sulfate,
        'Conductivity': conductivity,
        'Organic_carbon': organic_carbon,
        'Trihalomethanes': trihalomethanes,
        'Turbidity': turbidity
    }
    
    return pd.DataFrame(data)

def simulate_pressure_telemetry(df, leak_probability=0.05):
    """
    Adds pressure telemetry with simulated leaks and anomalies.
    """
    n_samples = len(df)
    
    # Base pressure (Normal: 50-60 PSI)
    # Reduced variance for "Normal" to make it easier to learn
    base_pressure = np.random.normal(loc=55, scale=1.5, size=n_samples)
    
    # Add reduced noise
    noise = np.random.normal(loc=0, scale=0.5, size=n_samples)
    pressure = base_pressure + noise
    
    # Introduce Leaks/Anomalies
    labels = np.zeros(n_samples) # 0: Normal, 1: Leak/Anomaly
    risk_score = np.zeros(n_samples) # Risk score
    
    # Randomly inject leaks
    # A leak is a sustained drop in pressure
    leak_indices = np.random.choice(range(n_samples), size=int(n_samples * leak_probability), replace=False)
    
    for idx in leak_indices:
        duration = np.random.randint(5, 50) # Leak duration in minutes
        end_idx = min(idx + duration, n_samples)
        
        # Leak pressure drop (Make it massive: 25-35 PSI drop -> Result 20-30 PSI)
        leak_drop = np.random.uniform(25, 35)
        pressure[idx:end_idx] -= leak_drop
        
        # Add some turbulence during leak
        pressure[idx:end_idx] += np.random.normal(0, 2, size=end_idx-idx)
        
        labels[idx:end_idx] = 1 # Mark as anomaly
        risk_score[idx:end_idx] = np.random.uniform(80, 100) # High risk
        
    df['pressure'] = pressure
    df['pressure'] = df['pressure'].clip(lower=0)
    df['is_leak'] = labels
    
    # Calculate Risk Score (Stricter Logic)
    # < 45 is CRITICAL (Leak)
    # 45-50 is MEDIUM (Warning)
    # > 50 is LOW (Normal)
    conditions = [
        (df['pressure'] < 45),
        (df['pressure'] >= 45) & (df['pressure'] < 52)
    ]
    choices = ['CRITICAL', 'MEDIUM']
    df['risk_level'] = np.select(conditions, choices, default='LOW')
    
    # Generate Remaining Useful Life (RUL)
    # Simplified: If leak, RUL is near 0. If normal, RUL is high but degrading.
    # In reality, this requires run-to-failure data.
    # We will simulate a degrading health index.
    
    rul = np.random.uniform(100, 500, size=n_samples)
    
    # Identify leak periods and set low RUL
    leak_mask = df['is_leak'] == 1
    rul[leak_mask] = np.random.uniform(0, 10, size=leak_mask.sum())
    
    df['RUL'] = rul
    
    return df

if __name__ == "__main__":
    print("Generating synthetic water quality dataset...")
    df_quality = generate_water_quality_data(n_samples=5000)
    
    print("Simulating pressure telemetry and leaks...")
    df_final = simulate_pressure_telemetry(df_quality)
    
    # Save to CSV
    output_path = "data/raw/synthetic_water_data.csv"
    df_final.to_csv(output_path, index=False)
    print(f"Dataset saved to {output_path}")
    print(df_final.head())
