from huggingface_hub import InferenceClient
import json

class LLMVerifier:
    def __init__(self, api_key):
        self.api_key = api_key
        # Using Zephyr 7B Beta as it is very reliable on free tier
        self.model_id = "HuggingFaceH4/zephyr-7b-beta" 
        self.client = InferenceClient(model=self.model_id, token=self.api_key)

    def analyze_risk(self, violations, risk_level, is_anomaly, confidence):
        """
        Sends PRE-CALCULATED violations to LLM. 
        NO MATH allowed in LLM.
        """
        # Construct a prompt for Deterministic Engineering Analysis
        prompt = f"""[INST] You are a Critical Infrastructure AI (Persona: Deterministic Engineering Analysis).
        Your job is to translate the following MATHEMATICAL PROOF into a concise safety report.
        
        SYSTEM ALERT:
        - Status: {risk_level} Risk (Anomaly)
        - Confidence: {confidence:.1f}%
        
        TOP VIOLATIONS (Pre-Calculated - DO NOT RECALCULATE):
        {json.dumps(violations, indent=2)}
        
        INSTRUCTIONS:
        1. Start with the "Primary Root Cause" (The item with highest Z-Score).
        2. State the deviation explicitly using the provided data (e.g., "Sulfate is HIGH (+240 mg/L)").
        3. Explain the physics/chemistry risk of these specific violations.
        4. Recommend 1 precise field action.
        5. DO NOT invent baselines. DO NOT do math. Trust the Z-Scores.
        
        Report: [/INST]"""

        messages = [
            {"role": "system", "content": "You are a Senior Hydraulic Engineer."},
            {"role": "user", "content": prompt}
        ]

        try:
            # InferenceClient chat_completion
            response = self.client.chat_completion(messages, max_tokens=200, temperature=0.3)
            return response.choices[0].message.content.strip()
                
        except Exception as e:
            return f"LLM Connection Error: {str(e)}"

if __name__ == "__main__":
    # Test
    from dotenv import load_dotenv
    import os
    load_dotenv()
    
    KEY = os.getenv("HF_TOKEN") 
    verifier = LLMVerifier(KEY)
    
    # Test Payload
    violations = [{
        "parameter": "Chloramines",
        "value": 15.0,
        "deviation": 8.0,
        "z_score": 5.33,
        "severity": "CRITICAL"
    }]
    print(verifier.analyze_risk(violations, "CRITICAL", True, 99.8))
