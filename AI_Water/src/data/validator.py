import pandas as pd
import numpy as np

def validate_water_data(df):
    """
    Validates the integrity of the water quality and telemetry data.
    Returns:
        is_valid (bool): True if data passes critical checks
        report (dict): Dictionary of validation results
    """
    report = {
        "missing_values": {},
        "outliers": {},
        "critical_errors": []
    }
    
    # Check 1: Missing Values
    missing = df.isnull().sum()
    if missing.sum() > 0:
        report["missing_values"] = missing[missing > 0].to_dict()
        # In industry, we might drop or impute. For now, we flag it.
        # Critical if timestamp or target 'is_leak' is missing
        if 'timestamp' in missing and missing['timestamp'] > 0:
            report["critical_errors"].append("Missing timestamps")
            
    # Check 2: Range Checks (Physically impossible values)
    # pH must be between 0 and 14
    if (df['ph'] < 0).any() or (df['ph'] > 14).any():
        report["critical_errors"].append("pH values out of physical range (0-14)")
        
    # Pressure shouldn't be negative (unless vacuum, but unlikely in this context)
    if (df['pressure'] < 0).any():
         report["critical_errors"].append("Negative pressure detected")

    # Check 3: Schema validation
    required_columns = ['ph', 'Hardness', 'Solids', 'Chloramines', 'Sulfate', 
                        'Conductivity', 'Organic_carbon', 'Trihalomethanes', 
                        'Turbidity', 'pressure', 'is_leak']
    
    for col in required_columns:
        if col not in df.columns:
            report["critical_errors"].append(f"Missing column: {col}")

    is_valid = len(report["critical_errors"]) == 0
    return is_valid, report

if __name__ == "__main__":
    # Test with generated data
    try:
        df = pd.read_csv("data/raw/synthetic_water_data.csv")
        valid, report = validate_water_data(df)
        print(f"Data Valid: {valid}")
        print("Validation Report:", report)
    except FileNotFoundError:
        print("Data file not found. Run generator.py first.")
