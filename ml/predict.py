"""
MindWork – Burnout Early Detection System
Prediction Module
Algorithm: Random Forest Classifier Pipeline (Preprocessing + Model)
Methodology: Strictly Objective Work-Patterns & Productivity Telemetry

Loads the trained joblib model pipeline and predicts Burnout Risk along with
probability distribution across [Low, Medium, High].
"""

import os
import sys
import json
import joblib
import pandas as pd

MODEL_PATHS = [
    os.path.join(os.path.dirname(__file__), "..", "models", "burnout_random_forest.joblib"),
    os.path.join(".", "models", "burnout_random_forest.joblib"),
    "/models/burnout_random_forest.joblib",
    "models/burnout_random_forest.joblib"
]

_loaded_pipeline = None

# Exactly the 15 objective features used during training:
OBJECTIVE_FEATURES = [
    "Department",
    "Age",
    "Experience_Years",
    "Workload_Level",
    "Working_Hours_Per_Day",
    "Overtime_Hours_Per_Week",
    "Assigned_Tasks",
    "Completed_Tasks",
    "Task_Completion_Rate",
    "Deadline_Pressure",
    "Productivity_Score",
    "App_Usage_Hours_Per_Day",
    "Active_Work_Hours",
    "Idle_Hours",
    "Leave_Days_Taken"
]

def get_model():
    """Load and cache the trained Random Forest pipeline."""
    global _loaded_pipeline
    if _loaded_pipeline is not None:
        return _loaded_pipeline
    
    for p in MODEL_PATHS:
        if os.path.exists(p):
            _loaded_pipeline = joblib.load(p)
            return _loaded_pipeline
    
    raise FileNotFoundError("Trained model file 'burnout_random_forest.joblib' not found in expected paths.")


def predict_burnout(employee_data: dict) -> dict:
    """
    Predict Burnout Risk for a single employee record using ONLY objective work metrics.
    
    Args:
        employee_data: Dict with objective feature keys:
            - Department: str (e.g. 'IT', 'HR', 'Sales', etc.)
            - Age: float/int (21-55)
            - Experience_Years: float/int (0-15)
            - Workload_Level: float/int (1-10)
            - Working_Hours_Per_Day: float (6.0-13.0)
            - Overtime_Hours_Per_Week: float (0.1-24.8)
            - Assigned_Tasks: float/int (5-20)
            - Completed_Tasks: float/int (1-20)
            - Task_Completion_Rate: float (16.67-100.0)
            - Deadline_Pressure: float/int (1-10)
            - Productivity_Score: float (35-100)
            - App_Usage_Hours_Per_Day: float (3.0-11.0)
            - Active_Work_Hours: float (3.0-9.0)
            - Idle_Hours: float (0.0-5.0)
            - Leave_Days_Taken: float/int (0-15)
            
    Returns:
        dict containing:
            - predicted_risk: 'Low' | 'Medium' | 'High'
            - probabilities: dict of class -> probability (0.0 to 1.0)
            - risk_score: composite continuous score (0 to 100)
    """
    model = get_model()
    
    df_input = pd.DataFrame([employee_data])
    
    # Auto-calculate task completion rate if not explicitly supplied
    if 'Task_Completion_Rate' not in df_input.columns or pd.isnull(df_input['Task_Completion_Rate'].iloc[0]):
        assigned = float(df_input.get('Assigned_Tasks', [10])[0])
        completed = float(df_input.get('Completed_Tasks', [7])[0])
        df_input['Task_Completion_Rate'] = (completed / assigned * 100) if assigned > 0 else 50.0

    # Verify all 15 objective features are present
    for feat in OBJECTIVE_FEATURES:
        if feat not in df_input.columns:
            raise ValueError(f"Missing required objective feature: '{feat}'")
    
    # Execute pipeline inference
    prediction = model.predict(df_input[OBJECTIVE_FEATURES])[0]
    probabilities_raw = model.predict_proba(df_input[OBJECTIVE_FEATURES])[0]
    
    classes = list(model.classes_)
    prob_dict = {
        cls: round(float(prob), 4)
        for cls, prob in zip(classes, probabilities_raw)
    }
    
    prob_low = prob_dict.get("Low", 0.0)
    prob_med = prob_dict.get("Medium", 0.0)
    prob_high = prob_dict.get("High", 0.0)
    
    # Composite continuous risk score on 0-100 scale:
    composite_score = round((prob_low * 15.0 + prob_med * 55.0 + prob_high * 95.0), 1)
    
    return {
        "predicted_risk": prediction,
        "probabilities": {
            "Low": prob_low,
            "Medium": prob_med,
            "High": prob_high
        },
        "risk_score": composite_score
    }


if __name__ == "__main__":
    if len(sys.argv) > 1:
        raw_input = ""
        if sys.argv[1] == "--stdin":
            raw_input = sys.stdin.read().strip()
        else:
            raw_input = sys.argv[1].strip()

        try:
            payload = json.loads(raw_input)
            if isinstance(payload, list):
                # Batch prediction
                results = [predict_burnout(item) for item in payload]
                print(json.dumps({"success": True, "predictions": results}))
            else:
                result = predict_burnout(payload)
                resp = {"success": True}
                resp.update(result)
                print(json.dumps(resp))
        except Exception as e:
            print(json.dumps({"success": False, "error": str(e)}))
            sys.exit(1)
    else:
        sample_employee = {
            "Department": "IT",
            "Age": 32,
            "Experience_Years": 5,
            "Workload_Level": 9,
            "Working_Hours_Per_Day": 11.5,
            "Overtime_Hours_Per_Week": 18.0,
            "Assigned_Tasks": 18,
            "Completed_Tasks": 12,
            "Task_Completion_Rate": 66.67,
            "Deadline_Pressure": 9,
            "Productivity_Score": 62,
            "App_Usage_Hours_Per_Day": 8.5,
            "Active_Work_Hours": 7.5,
            "Idle_Hours": 1.0,
            "Leave_Days_Taken": 1
        }
        
        print("Testing retrained objective prediction script with sample employee:")
        result = predict_burnout(sample_employee)
        print(json.dumps(result, indent=2))
