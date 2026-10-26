"""
MindWork – Burnout Early Detection System
"Detect Early. Support Better. Work Healthier."

Machine Learning Training Pipeline:
Final-Year Engineering Project
Methodology: Objective Work-Pattern & Productivity Telemetry (No subjective survey inputs)
Algorithm: Random Forest Classifier (scikit-learn)
Target: Burnout_Risk (Low, Medium, High)
"""

import os
import json
import datetime
import numpy as np
import pandas as pd
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import seaborn as sns
import joblib

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    precision_score,
    recall_score,
    f1_score,
    classification_report,
    confusion_matrix
)

# ---------------------------------------------------------
# 1. DATASET LOADING & PATH SETUP
# ---------------------------------------------------------
DATASET_FILENAME = "burnout_employee_dataset_500_productivity_updated(1).csv"

possible_paths = [
    DATASET_FILENAME,
    os.path.join("..", DATASET_FILENAME),
    os.path.join("/", DATASET_FILENAME),
    os.path.join(os.path.dirname(__file__), "..", DATASET_FILENAME),
    os.path.join(os.path.dirname(__file__), DATASET_FILENAME)
]

dataset_path = None
for p in possible_paths:
    if os.path.exists(p):
        dataset_path = p
        break

if not dataset_path:
    raise FileNotFoundError(f"Could not locate dataset file: {DATASET_FILENAME}")

print("=" * 70)
print("MindWork – Objective Work-Pattern Burnout Detection Model | ML Training")
print("=" * 70)
print(f"Loading actual uploaded dataset: {dataset_path}")
df = pd.read_csv(dataset_path)

n_rows, n_cols = df.shape
print(f"Dataset Shape: {n_rows} rows x {n_cols} columns")
print(f"Total Missing Values in Dataset: {df.isnull().sum().sum()}")
print(f"Total Duplicate Rows: {df.duplicated().sum()}")

TARGET_COL = "Burnout_Risk"
target_distribution = df[TARGET_COL].value_counts().to_dict()
target_distribution_pct = (df[TARGET_COL].value_counts(normalize=True) * 100).round(2).to_dict()
print(f"\nTarget Column: '{TARGET_COL}'")
print(f"Target Distribution (Counts): {target_distribution}")
print(f"Target Distribution (Percentages): {target_distribution_pct}")

# ---------------------------------------------------------
# 2. FEATURE SELECTION (OBJECTIVE WORK-PATTERNS ONLY)
# ---------------------------------------------------------
# EXCLUDE identifiers, ground truth, and ALL subjective/self-reported survey metrics:
EXCLUDED_FEATURES = [
    "Employee_ID",               # Primary key identifier
    TARGET_COL,                  # Ground truth target
    "Stress_Level",              # Subjective stress rating
    "Sleep_Hours_Per_Night",     # Self-reported biometric/sleep metric
    "Job_Satisfaction",          # Subjective satisfaction score
    "Work_Life_Balance",         # Subjective balance score
    "Manager_Support",           # Subjective support rating
    "Employee_Feedback_Score"    # Subjective employee survey rating
]

# Strictly objective, observable work pattern and productivity features:
SELECTED_FEATURES = [
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

# Verify all selected features exist in dataframe
missing_in_df = [f for f in SELECTED_FEATURES if f not in df.columns]
if missing_in_df:
    raise ValueError(f"Features missing in dataset: {missing_in_df}")

print(f"\nExcluded Features ({len(EXCLUDED_FEATURES)}):")
for ef in EXCLUDED_FEATURES:
    print(f"  - {ef}")

print(f"\nSelected Features ({len(SELECTED_FEATURES)}):")
for sf in SELECTED_FEATURES:
    print(f"  + {sf}")

CATEGORICAL_FEATURES = ["Department"]
NUMERICAL_FEATURES = [col for col in SELECTED_FEATURES if col not in CATEGORICAL_FEATURES]

print(f"\nCategorical Feature(s) ({len(CATEGORICAL_FEATURES)}): {CATEGORICAL_FEATURES}")
print(f"Numerical Features ({len(NUMERICAL_FEATURES)}): {NUMERICAL_FEATURES}")

X = df[SELECTED_FEATURES]
y = df[TARGET_COL]

# ---------------------------------------------------------
# 3. PREPROCESSING PIPELINE
# ---------------------------------------------------------
num_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='median')),
    ('scaler', StandardScaler())
])

cat_transformer = Pipeline(steps=[
    ('imputer', SimpleImputer(strategy='most_frequent')),
    ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
])

preprocessor = ColumnTransformer(
    transformers=[
        ('num', num_transformer, NUMERICAL_FEATURES),
        ('cat', cat_transformer, CATEGORICAL_FEATURES)
    ],
    remainder='drop'
)

# ---------------------------------------------------------
# 4. STRATIFIED TRAIN / TEST SPLIT (80% Train, 20% Test)
# ---------------------------------------------------------
RANDOM_STATE = 42
TEST_SIZE = 0.20

X_train, X_test, y_train, y_test = train_test_split(
    X, y,
    test_size=TEST_SIZE,
    random_state=RANDOM_STATE,
    stratify=y
)

print("\n" + "-" * 50)
print(f"STRATIFIED TRAIN / TEST SPLIT:")
print(f"  Training Samples : {len(X_train)} (80.0%)")
print(f"  Testing Samples  : {len(X_test)} (20.0%)")
print(f"  Training Target Breakdown: {y_train.value_counts().to_dict()}")
print(f"  Testing Target Breakdown : {y_test.value_counts().to_dict()}")
print("-" * 50)

# ---------------------------------------------------------
# 5. RANDOM FOREST CLASSIFIER MODEL PIPELINE
# ---------------------------------------------------------
N_ESTIMATORS = 200

rf_classifier = RandomForestClassifier(
    n_estimators=N_ESTIMATORS,
    random_state=RANDOM_STATE,
    n_jobs=-1
)

model_pipeline = Pipeline(steps=[
    ('preprocessor', preprocessor),
    ('classifier', rf_classifier)
])

print("\nFitting Random Forest Classifier on training set...")
model_pipeline.fit(X_train, y_train)
print("Model training completed successfully!")

# ---------------------------------------------------------
# 6. MODEL EVALUATION ON HELD-OUT TEST SET
# ---------------------------------------------------------
print("\n" + "=" * 50)
print("EVALUATION ON HELD-OUT TEST SET (100 SAMPLES):")
print("=" * 50)

y_pred = model_pipeline.predict(X_test)
y_pred_proba = model_pipeline.predict_proba(X_test)

labels_order = ["Low", "Medium", "High"]

acc = accuracy_score(y_test, y_pred)
prec_macro = precision_score(y_test, y_pred, labels=labels_order, average='macro', zero_division=0)
rec_macro = recall_score(y_test, y_pred, labels=labels_order, average='macro', zero_division=0)
f1_macro = f1_score(y_test, y_pred, labels=labels_order, average='macro', zero_division=0)

prec_weighted = precision_score(y_test, y_pred, labels=labels_order, average='weighted', zero_division=0)
rec_weighted = recall_score(y_test, y_pred, labels=labels_order, average='weighted', zero_division=0)
f1_weighted = f1_score(y_test, y_pred, labels=labels_order, average='weighted', zero_division=0)

prec_per_class = precision_score(y_test, y_pred, labels=labels_order, average=None, zero_division=0)
rec_per_class = recall_score(y_test, y_pred, labels=labels_order, average=None, zero_division=0)
f1_per_class = f1_score(y_test, y_pred, labels=labels_order, average=None, zero_division=0)

print(f"Actual Accuracy             : {acc:.4f} ({acc*100:.2f}%)")
print(f"Actual Precision (Macro)    : {prec_macro:.4f}")
print(f"Actual Precision (Weighted) : {prec_weighted:.4f}")
print(f"Actual Recall (Macro)       : {rec_macro:.4f}")
print(f"Actual Recall (Weighted)    : {rec_weighted:.4f}")
print(f"Actual Macro F1-score       : {f1_macro:.4f}")
print(f"Actual Weighted F1-score    : {f1_weighted:.4f}")

print("\nPER-CLASS PERFORMANCE:")
for idx, label in enumerate(labels_order):
    print(f"  Class '{label}': Precision={prec_per_class[idx]:.4f}, Recall={rec_per_class[idx]:.4f}, F1={f1_per_class[idx]:.4f}")

clf_report_text = classification_report(y_test, y_pred, labels=labels_order, digits=4, zero_division=0)
print("\nCLASSIFICATION REPORT:")
print(clf_report_text)

# ---------------------------------------------------------
# 7. CONFUSION MATRIX VISUALIZATION
# ---------------------------------------------------------
cm = confusion_matrix(y_test, y_pred, labels=labels_order)
print("CONFUSION MATRIX:")
print(f"Classes order: {labels_order}")
print(cm)

reports_dir = os.path.join(".", "reports")
os.makedirs(reports_dir, exist_ok=True)
os.makedirs("/reports", exist_ok=True)

fig, ax = plt.subplots(figsize=(7, 6))
sns.heatmap(
    cm,
    annot=True,
    fmt='d',
    cmap='Blues',
    xticklabels=labels_order,
    yticklabels=labels_order,
    cbar=True,
    ax=ax,
    annot_kws={"size": 14, "weight": "bold"}
)
ax.set_title(f"MindWork – Objective Random Forest Confusion Matrix\n(Accuracy: {acc*100:.2f}%, Test N={len(y_test)})", fontsize=12, pad=12)
ax.set_xlabel("Predicted Burnout Risk", fontsize=11, fontweight="bold")
ax.set_ylabel("True Burnout Risk", fontsize=11, fontweight="bold")
plt.tight_layout()

cm_png_path = os.path.join(reports_dir, "confusion_matrix.png")
plt.savefig(cm_png_path, dpi=300)
plt.savefig("/reports/confusion_matrix.png", dpi=300)
plt.close()
print(f"\nSaved Confusion Matrix to: {cm_png_path}")

# ---------------------------------------------------------
# 8. FEATURE IMPORTANCE EXTRACTION & VISUALIZATION
# ---------------------------------------------------------
trained_rf = model_pipeline.named_steps['classifier']
trained_preprocessor = model_pipeline.named_steps['preprocessor']

encoded_cat_names = trained_preprocessor.named_transformers_['cat'].named_steps['onehot'].get_feature_names_out(CATEGORICAL_FEATURES)
all_feature_names = list(NUMERICAL_FEATURES) + list(encoded_cat_names)
importances = trained_rf.feature_importances_

feature_imp_df = pd.DataFrame({
    'Feature': all_feature_names,
    'Importance': importances
}).sort_values(by='Importance', ascending=False).reset_index(drop=True)

print("\n" + "=" * 50)
print("OBJECTIVE FEATURES IMPORTANCE (SORTED):")
print("=" * 50)
print(feature_imp_df.to_string(index=False))

fig, ax = plt.subplots(figsize=(10, 7))
y_pos = np.arange(len(feature_imp_df))
ax.barh(y_pos, feature_imp_df['Importance'], align='center', color='#0284c7', edgecolor='#0369a1', alpha=0.9)
ax.set_yticks(y_pos)
ax.set_yticklabels(feature_imp_df['Feature'], fontsize=10)
ax.invert_yaxis()
ax.set_xlabel("Mean Decrease in Impurity (Gini Importance)", fontsize=11, fontweight="bold")
ax.set_title("MindWork – Objective Feature Importances (Random Forest)", fontsize=13, fontweight="bold", pad=12)
ax.grid(axis='x', linestyle='--', alpha=0.5)
plt.tight_layout()

fi_png_path = os.path.join(reports_dir, "feature_importance.png")
plt.savefig(fi_png_path, dpi=300)
plt.savefig("/reports/feature_importance.png", dpi=300)
plt.close()
print(f"Saved Feature Importance plot to: {fi_png_path}")

# ---------------------------------------------------------
# 9. SAVE MODEL PIPELINE VIA JOBLIB
# ---------------------------------------------------------
models_dir = os.path.join(".", "models")
os.makedirs(models_dir, exist_ok=True)
os.makedirs("/models", exist_ok=True)

model_save_path = os.path.join(models_dir, "burnout_random_forest.joblib")
joblib.dump(model_pipeline, model_save_path)
joblib.dump(model_pipeline, "/models/burnout_random_forest.joblib")
print(f"\nSaved Full Pipeline to: {model_save_path}")

# ---------------------------------------------------------
# 10. SAVE METRICS AND CLASSIFICATION REPORT FILES
# ---------------------------------------------------------
training_timestamp = datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

metrics_data = {
    "dataset": DATASET_FILENAME,
    "methodology": "Objective Work-Patterns & Productivity Telemetry (No subjective survey inputs)",
    "training_timestamp": training_timestamp,
    "algorithm": "RandomForestClassifier",
    "n_estimators": N_ESTIMATORS,
    "random_state": RANDOM_STATE,
    "total_records": n_rows,
    "training_samples": len(X_train),
    "testing_samples": len(X_test),
    "target": TARGET_COL,
    "target_classes": labels_order,
    "selected_features": SELECTED_FEATURES,
    "excluded_features": EXCLUDED_FEATURES,
    "number_of_features_raw": len(SELECTED_FEATURES),
    "number_of_features_transformed": len(all_feature_names),
    "accuracy": round(float(acc), 4),
    "precision_macro": round(float(prec_macro), 4),
    "precision_weighted": round(float(prec_weighted), 4),
    "recall_macro": round(float(rec_macro), 4),
    "recall_weighted": round(float(rec_weighted), 4),
    "macro_f1": round(float(f1_macro), 4),
    "weighted_f1": round(float(f1_weighted), 4),
    "per_class_metrics": {
        label: {
            "precision": round(float(prec_per_class[idx]), 4),
            "recall": round(float(rec_per_class[idx]), 4),
            "f1": round(float(f1_per_class[idx]), 4),
            "support": int((y_test == label).sum())
        }
        for idx, label in enumerate(labels_order)
    },
    "confusion_matrix": cm.tolist(),
    "feature_importances": [
        {"feature": row['Feature'], "importance": round(float(row['Importance']), 5)}
        for _, row in feature_imp_df.iterrows()
    ]
}

metrics_json_path = os.path.join(reports_dir, "model_metrics.json")
with open(metrics_json_path, "w") as f:
    json.dump(metrics_data, f, indent=2)
with open("/reports/model_metrics.json", "w") as f:
    json.dump(metrics_data, f, indent=2)

report_txt_path = os.path.join(reports_dir, "classification_report.txt")
with open(report_txt_path, "w") as f:
    f.write(f"MindWork – Burnout Early Detection System\n")
    f.write(f"Methodology: Objective Work-Pattern & Productivity Telemetry (No subjective surveys)\n")
    f.write(f"Model: RandomForestClassifier (n_estimators={N_ESTIMATORS}, random_state={RANDOM_STATE})\n")
    f.write(f"Trained on: {training_timestamp}\n")
    f.write(f"Dataset: {DATASET_FILENAME} (500 records)\n")
    f.write(f"Train samples: {len(X_train)} | Test samples: {len(X_test)}\n\n")
    f.write(f"SELECTED OBJECTIVE FEATURES ({len(SELECTED_FEATURES)}):\n")
    f.write(", ".join(SELECTED_FEATURES) + "\n\n")
    f.write(f"EXCLUDED SUBJECTIVE/IDENTIFIER FEATURES ({len(EXCLUDED_FEATURES)}):\n")
    f.write(", ".join(EXCLUDED_FEATURES) + "\n\n")
    f.write("CLASSIFICATION REPORT:\n")
    f.write(clf_report_text + "\n\n")
    f.write("CONFUSION MATRIX (Rows=True, Cols=Predicted):\n")
    f.write(f"Classes: {labels_order}\n")
    f.write(str(cm) + "\n\n")
    f.write(f"ACCURACY: {acc:.4f}\n")
    f.write(f"MACRO F1: {f1_macro:.4f}\n")
    f.write(f"WEIGHTED F1: {f1_weighted:.4f}\n")

with open("/reports/classification_report.txt", "w") as f:
    f.write(open(report_txt_path).read())

# Sync static assets to public directory as well
os.makedirs("public/reports", exist_ok=True)
import shutil
shutil.copy(cm_png_path, "public/reports/confusion_matrix.png")
shutil.copy(fi_png_path, "public/reports/feature_importance.png")
shutil.copy(metrics_json_path, "public/reports/model_metrics.json")
shutil.copy(report_txt_path, "public/reports/classification_report.txt")

print(f"Saved model metrics JSON to: {metrics_json_path}")
print(f"Saved classification report text to: {report_txt_path}")
print("Objective ML Pipeline trained and evaluated successfully!")
