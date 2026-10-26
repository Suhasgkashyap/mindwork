/**
 * MindWork – Rule-Based Task Evaluation Engine v1.0
 * Phase 5: Post-Completion Task Analysis Engine
 * 
 * IMPORTANT ARCHITECTURAL SPECIFICATION:
 * - This is NOT a machine-learning model.
 * - Identified strictly as: “Rule-Based Task Evaluation Engine v1.0”
 * - Runs ONLY after authoritative stopwatch completion.
 * - Does NOT run on PENDING, IN_PROGRESS, or PAUSED tasks.
 * - Benchmark output is strictly a target RANGE (min_hours → max_hours),
 *   never a guaranteed completion time.
 * - Actual hours are derived authoritatively from task_sessions.total_active_seconds.
 * - Historical velocity rule:
 *     * >= 3 comparable completed tasks: velocity modifier MAY be used (median delivery pace).
 *     * < 3 comparable completed tasks: velocity modifier is DISABLED (baseline rule-based only).
 *     * First task: baseline rule-based ONLY (no fabricated metrics).
 */

import { DatabaseSync } from 'node:sqlite';
import { TaskAnalysisReport, ComplexityLevel, Priority } from '../types';

export interface EvaluationInput {
  taskId: string;
  title: string;
  description: string;
  priority: Priority;
  deadline: string;
  employeeId: string;
  totalActiveSeconds: number;
  completionTime: string;
  isDemoSeed?: number;
}

/**
 * Computes baseline rule-based complexity and benchmark range.
 * Transparent heuristics inspect:
 * - Acceptance criteria / checklist density
 * - Deliverable scope keywords
 * - Universal priority tier weighting
 */
export function computeBaselineEvaluation(
  title: string,
  description: string,
  priority: Priority
): {
  complexity: ComplexityLevel;
  baseMinHours: number;
  baseMaxHours: number;
  checklistCount: number;
  scopeScore: number;
  priorityWeight: number;
} {
  const text = `${title} ${description}`.toLowerCase();

  // 1. Checklist density (lines beginning with bullet indicators, steps, dashes, numbers)
  const lines = description.split('\n');
  const checklistItems = lines.filter((line) => {
    const trimmed = line.trim();
    return (
      trimmed.startsWith('-') ||
      trimmed.startsWith('*') ||
      trimmed.startsWith('•') ||
      /^\[[ xX]?\]/.test(trimmed) ||
      /^\d+[\.\)]/.test(trimmed) ||
      /^step\s+\d+/i.test(trimmed)
    );
  });
  const checklistCount = Math.max(checklistItems.length, lines.length > 2 ? Math.floor(lines.length * 0.7) : 0);

  // 2. High and low complexity keywords
  const highKeywords = [
    'refactor',
    'optimize',
    'cache',
    'database',
    'connection pool',
    'oauth',
    'gateway',
    'security',
    'audit',
    'disaster recovery',
    'architecture',
    'infrastructure',
    'scalability',
    'webhook',
    'encryption',
    'pipeline',
    'redis',
    'runbook',
  ];

  const lowKeywords = [
    'update',
    'draft',
    'review',
    'verify',
    'orientation',
    'inventory',
    'guidelines',
    'documentation',
    'clean',
    'slides',
    'deck',
    'notes',
    'meeting',
  ];

  let keywordScore = 0;
  for (const kw of highKeywords) {
    if (text.includes(kw)) keywordScore += 0.8;
  }
  for (const kw of lowKeywords) {
    if (text.includes(kw)) keywordScore -= 0.5;
  }

  // 3. Priority Weighting
  let priorityWeight = 0;
  switch (priority) {
    case 'Urgent':
      priorityWeight = 1.6;
      break;
    case 'High':
      priorityWeight = 1.1;
      break;
    case 'Medium':
      priorityWeight = 0.5;
      break;
    case 'Low':
      priorityWeight = 0.0;
      break;
  }

  // 4. Word count depth
  const wordCount = description.trim().split(/\s+/).length;
  const lengthScore = wordCount > 50 ? 1.0 : wordCount > 25 ? 0.5 : 0.0;

  // Composite scope score
  const scopeScore = Math.max(
    0.5,
    1.0 + (checklistCount >= 4 ? 1.6 : checklistCount >= 2 ? 0.9 : 0.2) + lengthScore + keywordScore + priorityWeight
  );

  // Determine Complexity Tier & Benchmark Range
  let complexity: ComplexityLevel = 'Medium';
  let baseMinHours = 3.5;
  let baseMaxHours = 5.5;

  if (text.includes('poster') || text.includes('html/css') || text.includes('html') || text.includes('css') || text.includes('mockup')) {
    complexity = 'Low';
    baseMinHours = 0.25; // 15 mins
    baseMaxHours = 0.5;  // 30 mins
  } else if (scopeScore >= 3.8 || priority === 'Urgent') {
    complexity = 'High';
    baseMinHours = Math.round((5.0 + Math.min(2.0, checklistCount * 0.25)) * 10) / 10;
    baseMaxHours = Math.round((7.5 + Math.min(2.5, checklistCount * 0.35)) * 10) / 10;
  } else if (scopeScore <= 2.2 && priority !== 'High') {
    complexity = 'Low';
    baseMinHours = Math.round((1.5 + Math.min(1.0, checklistCount * 0.15)) * 10) / 10;
    baseMaxHours = Math.round((3.0 + Math.min(1.5, checklistCount * 0.2)) * 10) / 10;
  } else {
    complexity = 'Medium';
    baseMinHours = Math.round((3.0 + Math.min(1.5, checklistCount * 0.2)) * 10) / 10;
    baseMaxHours = Math.round((5.5 + Math.min(2.0, checklistCount * 0.25)) * 10) / 10;
  }

  return {
    complexity,
    baseMinHours,
    baseMaxHours,
    checklistCount,
    scopeScore: Math.round(scopeScore * 10) / 10,
    priorityWeight,
  };
}

/**
 * Executes the Rule-Based Task Evaluation Engine v1.0 on a completed task.
 * Persists result to SQLite task_analysis_reports table.
 * Idempotent: If report already exists, returns existing report.
 */
export function evaluateCompletedTask(db: DatabaseSync, taskId: string): TaskAnalysisReport {
  // 1. Verify task exists
  const task = db.prepare(`
    SELECT t.*, e.name as employee_name, e.department as employee_department
    FROM tasks t
    JOIN employees e ON e.id = t.employee_id
    WHERE t.id = ?
  `).get(taskId) as any;

  if (!task) {
    throw new Error(`Task ${taskId} not found.`);
  }

  // 2. Strict Lifecycle Rule: Analysis runs ONLY on COMPLETED tasks
  if (task.status !== 'COMPLETED') {
    throw new Error(
      `Cannot evaluate incomplete task: Status is '${task.status}'. Authoritative Rule-Based Task Evaluation Engine v1.0 executes ONLY after authoritative stopwatch completion.`
    );
  }

  // 3. Idempotency Check: Prevent duplicate reports for the same task
  const existingReport = db.prepare(`
    SELECT * FROM task_analysis_reports WHERE task_id = ?
  `).get(taskId) as any;

  if (existingReport) {
    return formatReportWithExplanations(existingReport, task);
  }

  // 4. Authoritative Stopwatch Telemetry from task_sessions
  const session = db.prepare(`
    SELECT * FROM task_sessions WHERE task_id = ? ORDER BY start_time DESC LIMIT 1
  `).get(taskId) as any;

  const totalActiveSec = session ? session.total_active_seconds : 0;
  const actualHours = Math.round((totalActiveSec / 3600) * 100) / 100;
  const completionTime = session?.end_time || new Date().toISOString().replace('T', ' ').substring(0, 19);

  // 5. Baseline Evaluation (scope, checklist density, priority)
  const baseline = computeBaselineEvaluation(task.title, task.description, task.priority as Priority);

  // 6. Historical Velocity Rule:
  // Query comparable completed tasks by the same employee having completed analysis reports
  const comparableTasks = db.prepare(`
    SELECT t.id, t.title, ar.actual_hours, ar.benchmark_min_hours, ar.benchmark_max_hours, ar.complexity
    FROM tasks t
    JOIN task_analysis_reports ar ON ar.task_id = t.id
    WHERE t.employee_id = ? AND t.id != ? AND t.status = 'COMPLETED'
    ORDER BY ar.analyzed_at DESC
  `).all(task.employee_id, taskId) as any[];

  const comparableCount = comparableTasks.length;
  let historicalVelocityApplied = false;
  let velocityModifier = 1.0;
  let historicalMedianPace: number | null = null;
  let evaluationNote = '';

  let finalMinHours = baseline.baseMinHours;
  let finalMaxHours = baseline.baseMaxHours;

  if (comparableCount >= 3) {
    // 3 or more comparable tasks: Historical velocity modifier MAY be used.
    historicalVelocityApplied = true;
    const paces = comparableTasks.map((t) => t.actual_hours).sort((a: number, b: number) => a - b);
    const midIdx = Math.floor(paces.length / 2);
    historicalMedianPace = paces[midIdx] ?? paces[0] ?? baseline.baseMinHours;

    const baselineMid = Math.max(0.1, (baseline.baseMinHours + baseline.baseMaxHours) / 2.0);
    const paceRatio = (historicalMedianPace ?? baselineMid) / baselineMid;

    // Conservative dampening between 0.85x and 1.25x
    velocityModifier = Math.max(0.85, Math.min(1.25, 1.0 + (paceRatio - 1.0) * 0.35));

    finalMinHours = Math.round(baseline.baseMinHours * velocityModifier * 10) / 10;
    finalMaxHours = Math.round(baseline.baseMaxHours * velocityModifier * 10) / 10;

    evaluationNote = `Historical velocity modifier applied (${comparableCount} comparable completed tasks evaluated; median delivery pace: ${historicalMedianPace}h, modifier: ${velocityModifier.toFixed(2)}x).`;
  } else if (comparableCount === 0) {
    // First task: baseline only
    historicalVelocityApplied = false;
    velocityModifier = 1.0;
    evaluationNote = 'First task for employee: Historical velocity modifier disabled. Baseline rule-based evaluation ONLY.';
  } else {
    // Fewer than 3 tasks: disabled
    historicalVelocityApplied = false;
    velocityModifier = 1.0;
    evaluationNote = `Fewer than 3 comparable completed tasks (${comparableCount} found, minimum threshold is 3): Historical velocity modifier DISABLED. Baseline rule-based evaluation used.`;
  }

  // 7. Variance Calculation (actual vs benchmark midpoint)
  const midpoint = Math.round(((finalMinHours + finalMaxHours) / 2.0) * 100) / 100;
  const varianceHours = Math.round((actualHours - midpoint) * 100) / 100;

  // 8. Deadline Compliance
  const deadlineDate = new Date(task.deadline).getTime();
  const completionDate = new Date(completionTime).getTime();
  const isOnTime = completionDate <= deadlineDate ? 1 : 0;

  // 9. Persist Authoritative Report to SQLite task_analysis_reports
  const reportId = 'tar_live_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 6);
  const analyzedAt = new Date().toISOString().replace('T', ' ').substring(0, 19);

  db.prepare(`
    INSERT INTO task_analysis_reports (
      id, task_id, complexity, benchmark_min_hours, benchmark_max_hours,
      actual_hours, variance_hours, is_on_time, evaluation_engine_ver, analyzed_at, is_demo_seed
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'v1.0-rule-based', ?, 0)
  `).run(
    reportId,
    taskId,
    baseline.complexity,
    finalMinHours,
    finalMaxHours,
    actualHours,
    varianceHours,
    isOnTime,
    analyzedAt
  );

  const savedReport = db.prepare(`SELECT * FROM task_analysis_reports WHERE id = ?`).get(reportId) as any;

  return formatReportWithExplanations(savedReport, task, {
    checklistCount: baseline.checklistCount,
    scopeScore: baseline.scopeScore,
    priorityWeight: baseline.priorityWeight,
    historicalVelocityApplied,
    comparableTasksCount: comparableCount,
    historicalMedianPace,
    velocityModifier,
    evaluationNote,
  });
}

/**
 * Enriches the raw SQLite report record with human-readable variance descriptions
 * and transparent rule-based heuristics.
 */
function formatReportWithExplanations(
  raw: any,
  task: any,
  extra?: {
    checklistCount?: number;
    scopeScore?: number;
    priorityWeight?: number;
    historicalVelocityApplied?: boolean;
    comparableTasksCount?: number;
    historicalMedianPace?: number | null;
    velocityModifier?: number;
    evaluationNote?: string;
  }
): TaskAnalysisReport {
  const actual = raw.actual_hours;
  const min = raw.benchmark_min_hours;
  const max = raw.benchmark_max_hours;
  const variance = raw.variance_hours;

  let varianceDescription = '';
  if (actual < min) {
    const diff = (min - actual).toFixed(1);
    varianceDescription = `Ahead of benchmark: Completed ${diff}h under target minimum range.`;
  } else if (actual > max) {
    const diff = (actual - max).toFixed(1);
    varianceDescription = `Over benchmark: Exceeded target maximum range by ${diff}h.`;
  } else {
    varianceDescription = `Optimal delivery: Within target benchmark range (${variance >= 0 ? '+' : ''}${variance}h from midpoint).`;
  }

  return {
    id: raw.id,
    task_id: raw.task_id,
    complexity: raw.complexity as ComplexityLevel,
    benchmark_min_hours: raw.benchmark_min_hours,
    benchmark_max_hours: raw.benchmark_max_hours,
    actual_hours: raw.actual_hours,
    variance_hours: raw.variance_hours,
    is_on_time: raw.is_on_time,
    evaluation_engine_ver: raw.evaluation_engine_ver || 'v1.0-rule-based',
    analyzed_at: raw.analyzed_at,
    is_demo_seed: raw.is_demo_seed,
    checklist_count: extra?.checklistCount,
    scope_score: extra?.scopeScore,
    priority_weight: extra?.priorityWeight,
    historical_velocity_applied: extra?.historicalVelocityApplied ?? false,
    comparable_tasks_count: extra?.comparableTasksCount ?? 0,
    historical_median_pace: extra?.historicalMedianPace ?? null,
    velocity_modifier: extra?.velocityModifier ?? 1.0,
    evaluation_note: extra?.evaluationNote || (raw.is_demo_seed ? 'Baseline historical demonstration benchmark' : 'Evaluated by Rule-Based Task Evaluation Engine v1.0'),
    variance_description: varianceDescription,
  };
}
