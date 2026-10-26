/**
 * MindWork – Verified ML Burnout Inference Engine
 * Phase 8: Frozen Random Forest Pipeline Execution
 * 
 * ARCHITECTURAL CONSTRAINTS & BOUNDARIES:
 * - Uses the frozen, immutable scikit-learn pipeline artifact: models/burnout_random_forest.joblib
 * - NO model training, refitting, parameter tuning, or artifact modification occurs.
 * - Source of 15 features is strictly the Phase 7 aggregation layer (extractModelFeatures).
 * - Exact 15 features:
 *   ['Department', 'Age', 'Experience_Years', 'Workload_Level', 'Working_Hours_Per_Day',
 *    'Overtime_Hours_Per_Week', 'Assigned_Tasks', 'Completed_Tasks', 'Task_Completion_Rate',
 *    'Deadline_Pressure', 'Productivity_Score', 'App_Usage_Hours_Per_Day', 'Active_Work_Hours',
 *    'Idle_Hours', 'Leave_Days_Taken']
 * - Authoritative outputs:
 *   - predicted_risk: 'Low' | 'Medium' | 'High'
 *   - prob_low, prob_med, prob_high
 * - continuous_risk_score is strictly an "Application-Derived Presentation Score"
 *   (Presentation aid calculated as prob_low * 15 + prob_med * 55 + prob_high * 95).
 *   It is NEVER represented as a direct Random Forest output.
 * - Non-Clinical Disclaimer:
 *   "MindWork is an operational workload-pattern early warning tool. It is not a clinical or
 *    psychological diagnostic system. The model provides statistical risk estimates, not safety guarantees."
 */

import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { extractModelFeatures } from './metricsAggregationEngine';
import { BurnoutPrediction, ModelFeatures, ModelEvaluationMetrics } from '../types';

export const NON_CLINICAL_DISCLAIMER =
  'MindWork is an operational workload-pattern early warning tool. It is not a clinical or psychological diagnostic system. The model provides statistical risk estimates, not safety guarantees.';

export const PRESENTATION_SCORE_LABEL = 'Application-Derived Presentation Score';

/**
 * Derives operational, workplace-focused recommendations (strictly non-clinical).
 */
export function deriveOperationalRecommendations(
  risk: 'Low' | 'Medium' | 'High',
  features: ModelFeatures
): string[] {
  const recs: string[] = [];

  if (risk === 'High') {
    if (features.Overtime_Hours_Per_Week > 8.0) {
      recs.push(`Implement a structured overtime cutoff (current overtime: +${features.Overtime_Hours_Per_Week.toFixed(1)}h/week above baseline).`);
    } else {
      recs.push('Cap shift extensions to maintain sustainable weekly work hours.');
    }

    if (features.Deadline_Pressure >= 7 || features.Workload_Level >= 7) {
      recs.push(`Redistribute high-density sprint tasks to balance delivery pressure (workload level: ${features.Workload_Level}/10).`);
    } else {
      recs.push('Conduct an operational 1:1 check-in to review upcoming milestone expectations.');
    }

    recs.push('Promote mandatory focus intervals and restorative breaks during prolonged shifts.');
  } else if (risk === 'Medium') {
    if (features.Overtime_Hours_Per_Week > 3.0) {
      recs.push(`Monitor weekly overtime trajectory (+${features.Overtime_Hours_Per_Week.toFixed(1)}h/week) to prevent gradual accumulation.`);
    }

    if (features.Deadline_Pressure >= 5) {
      recs.push(`Evaluate task queue to prevent deadline clustering across upcoming sprints (pressure: ${features.Deadline_Pressure}/10).`);
    }

    recs.push('Encourage consistent scheduled focus breaks and manage shift transitions.');
  } else {
    recs.push(`Maintain current sustainable workload pacing (${features.Working_Hours_Per_Day.toFixed(1)}h/day average).`);
    recs.push('Continue standard milestone check-ins and healthy workplace pacing.');
  }

  return recs;
}

/**
 * Derives top contributing work-pattern factors based on verified feature importance rankings.
 */
export function deriveContributingFactors(
  risk: 'Low' | 'Medium' | 'High',
  features: ModelFeatures
): string[] {
  const factors: string[] = [];

  if (features.Deadline_Pressure >= 7) {
    factors.push(`Associated work-pattern indicator: Elevated deadline pressure (${features.Deadline_Pressure}/10)`);
  } else if (features.Deadline_Pressure <= 2 && risk === 'Low') {
    factors.push(`Associated work-pattern indicator: Manageable deadline pressure (${features.Deadline_Pressure}/10)`);
  }

  if (features.Overtime_Hours_Per_Week >= 8.0) {
    factors.push(`Contributing model feature: High sustained weekly overtime (+${features.Overtime_Hours_Per_Week.toFixed(1)}h/week)`);
  } else if (features.Overtime_Hours_Per_Week < 2.0 && risk === 'Low') {
    factors.push(`Associated work-pattern indicator: Minimal weekly overtime (${features.Overtime_Hours_Per_Week.toFixed(1)}h/week)`);
  }

  if (features.Working_Hours_Per_Day >= 10.0) {
    factors.push(`Contributing model feature: Extended daily active shifts (${features.Working_Hours_Per_Day.toFixed(1)}h/day)`);
  } else if (features.Working_Hours_Per_Day <= 8.2 && risk === 'Low') {
    factors.push(`Associated work-pattern indicator: Standard baseline shift duration (${features.Working_Hours_Per_Day.toFixed(1)}h/day)`);
  }

  if (features.Workload_Level >= 7) {
    factors.push(`Contributing model feature: High task density / workload volume (level ${features.Workload_Level}/10)`);
  }

  if (features.Productivity_Score < 68.0) {
    factors.push(`Associated work-pattern indicator: Active focus efficiency index (${features.Productivity_Score.toFixed(1)}/100)`);
  } else if (features.Productivity_Score >= 80.0) {
    factors.push(`Associated work-pattern indicator: High active focus consistency (${features.Productivity_Score.toFixed(1)}/100)`);
  }

  if (factors.length === 0) {
    factors.push(`Associated work-pattern indicator: Balanced metrics (shift: ${features.Working_Hours_Per_Day.toFixed(1)}h, overtime: ${features.Overtime_Hours_Per_Week.toFixed(1)}h)`);
  }

  return factors.slice(0, 3);
}

/**
 * Executes inference using the frozen joblib pipeline via python3 ml/predict.py.
 * Strictly guarantees no retraining or model file alteration.
 */
export function runModelInference(features: ModelFeatures): {
  predicted_risk: 'Low' | 'Medium' | 'High';
  probabilities: { Low: number; Medium: number; High: number };
  continuous_risk_score: number;
} {
  const predictScriptPath = path.resolve(process.cwd(), 'ml', 'predict.py');
  if (!fs.existsSync(predictScriptPath)) {
    throw new Error(`Inference module not found at ${predictScriptPath}`);
  }

  const modelPath = path.resolve(process.cwd(), 'models', 'burnout_random_forest.joblib');
  if (!fs.existsSync(modelPath)) {
    throw new Error(`Frozen model artifact not found at ${modelPath}`);
  }

  const inputJson = JSON.stringify(features);
  const stdout = execFileSync('python3', [predictScriptPath, inputJson], {
    encoding: 'utf-8',
    timeout: 10000,
    maxBuffer: 1024 * 1024
  });

  const parsed = JSON.parse(stdout.trim());
  if (!parsed.success) {
    throw new Error(`ML model inference failed: ${parsed.error || 'Unknown error'}`);
  }

  return {
    predicted_risk: parsed.predicted_risk,
    probabilities: {
      Low: Number(parsed.probabilities.Low) || 0,
      Medium: Number(parsed.probabilities.Medium) || 0,
      High: Number(parsed.probabilities.High) || 0
    },
    continuous_risk_score: Number(parsed.risk_score) || 0
  };
}

/**
 * Evaluates and idempotently stores burnout prediction for an employee.
 * Strictly sources features from Phase 7 extraction layer.
 */
export function evaluateBurnoutForEmployee(
  db: DatabaseSync,
  employeeId: string,
  isDemoSeed: number = 1
): BurnoutPrediction {
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId) as any;
  if (!employee) {
    throw new Error(`Employee ${employeeId} not found.`);
  }

  // 1. Pull authoritative 15 features from Phase 7 extraction layer
  const { features } = extractModelFeatures(db, employeeId, isDemoSeed);

  // 2. Run inference through frozen Random Forest pipeline
  const inference = runModelInference(features);

  // 3. Derive factors and operational recommendations
  const factors = deriveContributingFactors(inference.predicted_risk, features);
  const recommendations = deriveOperationalRecommendations(inference.predicted_risk, features);

  // 4. Authoritative calculation date
  const calculationDate = isDemoSeed === 1 ? '2026-10-06' : new Date().toISOString().split('T')[0];
  const predictionId = `bp_${isDemoSeed ? 'seed' : 'live'}_${employeeId}`;

  // 5. Idempotent upsert into burnout_predictions table
  const existing = db.prepare(`
    SELECT id FROM burnout_predictions WHERE employee_id = ? AND is_demo_seed = ?
  `).get(employeeId, isDemoSeed) as any;

  if (existing) {
    db.prepare(`
      UPDATE burnout_predictions SET
        calculation_date = ?,
        predicted_risk = ?,
        prob_low = ?,
        prob_med = ?,
        prob_high = ?,
        continuous_risk_score = ?,
        top_contributing_factors = ?,
        recommendations = ?
      WHERE id = ?
    `).run(
      calculationDate,
      inference.predicted_risk,
      inference.probabilities.Low,
      inference.probabilities.Medium,
      inference.probabilities.High,
      inference.continuous_risk_score,
      JSON.stringify(factors),
      JSON.stringify(recommendations),
      existing.id
    );
  } else {
    db.prepare(`
      INSERT INTO burnout_predictions (
        id, employee_id, calculation_date, predicted_risk,
        prob_low, prob_med, prob_high, continuous_risk_score,
        top_contributing_factors, recommendations, is_demo_seed
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      predictionId,
      employeeId,
      calculationDate,
      inference.predicted_risk,
      inference.probabilities.Low,
      inference.probabilities.Medium,
      inference.probabilities.High,
      inference.continuous_risk_score,
      JSON.stringify(factors),
      JSON.stringify(recommendations),
      isDemoSeed
    );
  }

  return {
    id: existing ? existing.id : predictionId,
    employee_id: employeeId,
    employee_name: employee.name,
    employee_department: employee.department,
    employee_avatar_color: employee.avatar_color,
    calculation_date: calculationDate,
    predicted_risk: inference.predicted_risk,
    prob_low: inference.probabilities.Low,
    prob_med: inference.probabilities.Medium,
    prob_high: inference.probabilities.High,
    continuous_risk_score: inference.continuous_risk_score,
    top_contributing_factors: factors,
    recommendations,
    is_demo_seed: isDemoSeed
  };
}

/**
 * Loads the verified model evaluation metrics from reports/model_metrics.json.
 * If missing or unreadable, returns null with status "Unavailable / Model Not Evaluated".
 */
export function getModelEvaluationMetrics(): {
  available: boolean;
  metrics?: ModelEvaluationMetrics;
  statusMessage?: string;
} {
  const metricsPath = path.resolve(process.cwd(), 'reports', 'model_metrics.json');
  try {
    if (!fs.existsSync(metricsPath)) {
      return { available: false, statusMessage: 'Unavailable / Model Not Evaluated' };
    }
    const raw = fs.readFileSync(metricsPath, 'utf-8');
    const parsed = JSON.parse(raw) as ModelEvaluationMetrics;
    return { available: true, metrics: parsed };
  } catch (err) {
    return { available: false, statusMessage: 'Unavailable / Model Not Evaluated' };
  }
}
