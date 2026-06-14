import os
import joblib
import json
from datetime import datetime

class ModelRegistry:
    def __init__(self, base_path="models/registry"):
        self.base_path = base_path
        os.makedirs(self.base_path, exist_ok=True)
        
    def get_latest_version(self):
        """Finds the latest version directory."""
        versions = [d for d in os.listdir(self.base_path) if d.startswith('v')]
        if not versions:
            return "v1"
        versions.sort(key=lambda x: int(x[1:]))
        # Logic to return next version or current? 
        # For simplicity, let's assume we create a NEW version every run or use just v1.
        # Let's say we check if v1 exists, if so return v2? 
        # Actually easier to just return the max version found or v1 if none.
        return versions[-1]

    def create_new_version(self):
        """Creates a new version directory."""
        versions = [d for d in os.listdir(self.base_path) if d.startswith('v')]
        if not versions:
            new_version = "v1"
        else:
            versions.sort(key=lambda x: int(x[1:]))
            last_version = int(versions[-1][1:])
            new_version = f"v{last_version + 1}"
            
        version_path = os.path.join(self.base_path, new_version)
        os.makedirs(version_path, exist_ok=True)
        return version_path, new_version

    def save_model(self, model, name, version_path, metrics=None):
        """Saves a model and its metrics."""
        model_path = os.path.join(version_path, f"{name}.pkl")
        joblib.dump(model, model_path)
        
        if metrics:
            metrics_path = os.path.join(version_path, f"{name}_metrics.json")
            with open(metrics_path, 'w') as f:
                json.dump(metrics, f, indent=4)
        print(f"Saved {name} to {model_path}")
        
    def load_model(self, name, version="latest"):
        """Loads a model."""
        if version == "latest":
            version_dir = self.get_latest_version()
        else:
            version_dir = version
            
        model_path = os.path.join(self.base_path, version_dir, f"{name}.pkl")
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model {name} not found in {version_dir}")
            
        return joblib.load(model_path)

if __name__ == "__main__":
    registry = ModelRegistry()
    path, ver = registry.create_new_version()
    print(f"Created registry version: {ver} at {path}")
