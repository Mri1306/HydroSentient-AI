import pandas as pd
import numpy as np

def engineer_features(df):
    """
    Transforms raw telemetry into predictive signals.
    """
    df = df.copy()
    
    # Ensure timestamp is datetime
    # Assuming data is sorted by time, if not, sort it: df.sort_values('timestamp', inplace=True)
    
    # 1. Temporal Features
    # Rolling Statistics (Window = 1 hour? assuming 1 min data, window=60)
    # Adjust window size based on data frequency. Let's assume 1 sample/min for now.
    window_size = 10 
    
    # Rolling Mean (Trend)
    df['pressure_rolling_mean'] = df['pressure'].rolling(window=window_size).mean()
    
    # Rolling Std (Variance/Burst detection)
    df['pressure_rolling_std'] = df['pressure'].rolling(window=window_size).std()
    
    # 2. Advanced Signal Processing
    # Pressure Residual (Observed - Expected/Mean)
    # Simple residual: pressure - rolling_mean
    df['pressure_residual'] = df['pressure'] - df['pressure_rolling_mean']
    
    # Rate of Change (Gradient)
    # p(t) - p(t-1)
    df['pressure_gradient'] = df['pressure'].diff()
    
    # 3. Sensor Combinations (Interaction features)
    # e.g., Turbidity * Conductivity (Contamination Index)
    df['contamination_index'] = df['Turbidity'] * df['Conductivity']
    
    # 4. Global Deviation (Z-Score Aggregation)
    # Baselines from generator.py (Normal distributions)
    baselines = {
        'ph': (7.0, 0.5),
        'Hardness': (200, 30),
        'Solids': (20000, 3000),
        'Chloramines': (7.0, 1.5),
        'Sulfate': (333, 40),
        'Conductivity': (400, 80),
        'Organic_carbon': (14, 3),
        'Trihalomethanes': (66, 16),
        'Turbidity': (3.9, 0.7),
        'pressure': (55, 1.5)
    }
    
    z_scores = []
    # For these parameters, only HIGH values are unsafe — being below baseline
    # (e.g. very clean water with low Solids/Turbidity) should NOT count as risk.
    # pH and pressure are unsafe in BOTH directions, so they keep absolute z-scores.
    high_is_bad_only = {
        'Hardness', 'Solids', 'Chloramines', 'Sulfate',
        'Conductivity', 'Organic_carbon', 'Trihalomethanes', 'Turbidity'
    }
    for col, (mean, std) in baselines.items():
        if col in df.columns:
            z_col = f'z_{col}'
            raw_z = (df[col] - mean) / std
            if col in high_is_bad_only:
                # Only positive deviations (above baseline) contribute to risk.
                df[z_col] = raw_z.clip(lower=0)
            else:
                # pH / pressure: deviation in either direction is unsafe.
                df[z_col] = raw_z.abs()
            z_scores.append(z_col)
            
    # Global Deviation = Mean of top 3 highest z-scores (to catch specific anomalies)
    # or just Max Z-score?
    # Let's use MEAN of all Z-scores to capture "System Stress"
    # AND Max Z-score to capture "Single Point Failure"
    
    df['global_z_mean'] = df[z_scores].mean(axis=1)
    df['global_z_max'] = df[z_scores].max(axis=1)
    
    # Fill NaN values created by rolling/diff
    df.bfill(inplace=True)
    df.ffill(inplace=True)
    
    return df

if __name__ == "__main__":
    try:
        df = pd.read_csv("data/raw/synthetic_water_data.csv")
        df_eng = engineer_features(df)
        
        output_path = "data/processed/featured_water_data.csv"
        df_eng.to_csv(output_path, index=False)
        print(f"Feature engineering complete. Saved to {output_path}")
        print(df_eng[['pressure', 'pressure_rolling_mean', 'pressure_gradient']].head(15))
    except FileNotFoundError:
        print("Data file not found. Run generator.py first.")
