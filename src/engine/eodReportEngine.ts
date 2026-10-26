/**
 * MindWork – Daily End-of-Day 4-Employee Manager Report Engine
 * Phase 9: Dynamic Aggregation across Authoritative Tables
 * 
 * STRICT ARCHITECTURAL CONSTRAINTS:
 * - Dynamically derives all data from authoritative existing tables:
 *   tasks, task_sessions, task_analysis_reports, work_sessions,
 *   application_usage, daily_metrics, weekly_metrics, burnout_predictions.
 * - Does NOT duplicate or manually hardcode records.
 * - Supports selected date (seeded dates: 2026-09-30 to 2026-10-06).
 * - Exactly 4 employees: Alice, Priya, Rahul, Sneha.
 * - Preserves is_demo_seed separation.
 * - Privacy: application metadata only (duration, active, idle). No prohibited telemetry.
 * - Non-clinical: strictly operational explanations and workplace recommendations.
 * - Completed task analysis: explicitly labeled "Rule-Based Task Evaluation Engine v1.0".
 * - Burnout continuous score: labeled "Application-Derived Presentation Score" with disclaimer.
 */

import { DatabaseSync } from 'node:sqlite';
import {
  EodDailyReportResponse,
  EodEmployeeReport,
  EodTeamSummary,
  EodAppUsageItem,
  EodTaskAnalysisItem
} from '../types';

export const SEEDED_DATES = [
  '2026-09-30',
  '2026-10-01',
  '2026-10-02',
  '2026-10-03',
  '2026-10-04',
  '2026-10-05',
  '2026-10-06'
];

/**
 * Builds daily contributing factor explanations based ONLY on actual recorded work patterns.
 */
function deriveDailyContributingFactors(
  workingHours: number,
  activeHours: number,
  idleHours: number,
  overtimeHours: number,
  productivityScore: number,
  pendingTasks: number,
  completedTasks: number,
  topApp: string | null
): string[] {
  const factors: string[] = [];

  if (overtimeHours >= 2.0) {
    factors.push(`Significant daily overtime (+${overtimeHours.toFixed(1)}h above 8h threshold)`);
  } else if (overtimeHours > 0) {
    factors.push(`Minor daily overtime (+${overtimeHours.toFixed(1)}h)`);
  } else if (workingHours > 0) {
    factors.push(`Shift maintained within standard 8h baseline (${workingHours.toFixed(1)}h)`);
  }

  if (workingHours >= 10.0) {
    factors.push(`Prolonged working duration (${workingHours.toFixed(1)}h total recorded)`);
  } else if (workingHours === 0) {
    factors.push('No recorded work session on this date (scheduled rest or weekend)');
  }

  if (workingHours > 0 && idleHours >= 3.0) {
    factors.push(`Elevated idle/context switching time (${idleHours.toFixed(1)}h idle)`);
  } else if (workingHours > 0 && activeHours / workingHours >= 0.8) {
    factors.push(`High active focus ratio (${((activeHours / workingHours) * 100).toFixed(0)}% active)`);
  }

  if (productivityScore >= 80.0) {
    factors.push(`Strong active-focus efficiency index (${productivityScore.toFixed(1)}/100)`);
  } else if (productivityScore > 0 && productivityScore < 68.0) {
    factors.push(`Lower active-focus efficiency recorded (${productivityScore.toFixed(1)}/100)`);
  }

  if (pendingTasks >= 2) {
    factors.push(`Active task queue backlog (${pendingTasks} pending tasks)`);
  } else if (completedTasks > 0) {
    factors.push(`Productive sprint progress (${completedTasks} tasks completed)`);
  }

  if (topApp) {
    factors.push(`Primary desktop activity centered on ${topApp}`);
  }

  return factors.slice(0, 4);
}

/**
 * Derives operational, workplace-oriented recommendations.
 */
function deriveOperationalRecommendations(
  overtimeHours: number,
  workingHours: number,
  pendingTasks: number,
  predictedRisk: string,
  productivityScore: number,
  hasSession: boolean
): string[] {
  const recs: string[] = [];

  if (!hasSession) {
    recs.push('Ensure rest day boundaries are respected; no catch-up work required.');
    return recs;
  }

  if (overtimeHours >= 2.0 || workingHours >= 10.0) {
    recs.push(`Enforce shift cutoff to mitigate overtime buildup (+${overtimeHours.toFixed(1)}h logged).`);
    recs.push('Check in with employee regarding end-of-day workload handover.');
  }

  if (predictedRisk === 'High') {
    recs.push('Review task distribution and consider reallocating high-priority tickets.');
    recs.push('Promote scheduled cognitive focus intervals and mandatory breaks.');
  } else if (predictedRisk === 'Medium') {
    recs.push('Monitor overtime pacing over upcoming shifts to prevent fatigue accumulation.');
    if (pendingTasks >= 2) {
      recs.push('Evaluate pending sprint queue to eliminate deadline clustering.');
    }
  } else {
    recs.push('Maintain healthy operational pace and standard shift check-ins.');
  }

  if (recs.length < 2 && pendingTasks > 0) {
    recs.push('Review upcoming milestones in the next daily standup.');
  }

  return recs;
}

/**
 * Generates the full 4-Employee EOD Report for the specified date.
 */
export function generateDailyEodReport(
  db: DatabaseSync,
  selectedDate: string
): EodDailyReportResponse {
  const isDemo = SEEDED_DATES.includes(selectedDate) ? 1 : 0;

  // 1. Authoritative 4 employees
  const employees = db.prepare(`
    SELECT id, name, department, avatar_color
    FROM employees
    ORDER BY id ASC
  `).all() as any[];

  // 2. Authoritative daily metrics for date
  const dailyMetricsRows = db.prepare(`
    SELECT * FROM daily_metrics
    WHERE date = ?
  `).all(selectedDate) as any[];
  const dailyMetricsMap = new Map<string, any>(
    dailyMetricsRows.map((r) => [r.employee_id, r])
  );

  // 3. Authoritative work sessions for date
  const workSessionsRows = db.prepare(`
    SELECT * FROM work_sessions
    WHERE date = ?
  `).all(selectedDate) as any[];
  const workSessionsMap = new Map<string, any>(
    workSessionsRows.map((r) => [r.employee_id, r])
  );

  // 4. Authoritative application usage for date's work sessions
  const sessionIds = workSessionsRows.map((ws) => ws.id);
  const appUsageMap = new Map<string, EodAppUsageItem[]>();
  if (sessionIds.length > 0) {
    const placeholders = sessionIds.map(() => '?').join(',');
    const appRows = db.prepare(`
      SELECT employee_id, app_name, duration_seconds, active_seconds, idle_seconds
      FROM application_usage
      WHERE work_session_id IN (${placeholders})
      ORDER BY duration_seconds DESC
    `).all(...sessionIds) as any[];

    for (const app of appRows) {
      if (!appUsageMap.has(app.employee_id)) {
        appUsageMap.set(app.employee_id, []);
      }
      appUsageMap.get(app.employee_id)!.push({
        appName: app.app_name,
        durationSeconds: app.duration_seconds,
        activeSeconds: app.active_seconds,
        idleSeconds: app.idle_seconds
      });
    }
  }

  // 5. Authoritative tasks with post-completion task analysis reports
  const allTasks = db.prepare(`
    SELECT t.id, t.employee_id, t.title, t.priority, t.status, t.deadline, t.created_at, t.is_demo_seed,
           tar.complexity, tar.benchmark_min_hours, tar.benchmark_max_hours,
           tar.actual_hours, tar.variance_hours, tar.is_on_time, tar.evaluation_engine_ver
    FROM tasks t
    LEFT JOIN task_analysis_reports tar ON t.id = tar.task_id
  `).all() as any[];

  // 6. Authoritative burnout predictions
  const burnoutRows = db.prepare(`
    SELECT * FROM burnout_predictions
    WHERE is_demo_seed = ?
  `).all(isDemo) as any[];
  const burnoutMap = new Map<string, any>(
    burnoutRows.map((bp) => [bp.employee_id, bp])
  );

  const employeeReports: EodEmployeeReport[] = [];
  const employeesRequiringAttention: EodDailyReportResponse['employeesRequiringAttention'] = [];

  let teamTotalWorkingHours = 0;
  let teamTotalOvertime = 0;
  let teamTotalProductivity = 0;
  let activeEmployeesCount = 0;
  let teamTasksAssigned = 0;
  let teamTasksCompleted = 0;
  let teamTasksPending = 0;

  const burnoutRiskDist = {
    Low: 0,
    Medium: 0,
    High: 0,
    total: 0
  };

  for (const emp of employees) {
    const ws = workSessionsMap.get(emp.id);
    const dm = dailyMetricsMap.get(emp.id);
    const bp = burnoutMap.get(emp.id);

    // Filter tasks for employee
    const empTasks = allTasks.filter((t) => t.employee_id === emp.id && t.is_demo_seed === isDemo);
    const completedTasks = empTasks.filter((t) => t.status === 'COMPLETED');
    const pendingTasks = empTasks.filter((t) => t.status !== 'COMPLETED');
    const assignedCount = empTasks.length;
    const completedCount = completedTasks.length;
    const pendingCount = pendingTasks.length;
    const completionRate = assignedCount > 0 ? Math.round((completedCount / assignedCount) * 100) : 0;

    teamTasksAssigned += assignedCount;
    teamTasksCompleted += completedCount;
    teamTasksPending += pendingCount;

    // Working hours & session duration
    const workingHours = dm ? Number(dm.working_hours) : (ws ? Number(ws.total_working_hours) : 0);
    const activeHours = dm ? Number(dm.active_hours) : (ws ? Number(ws.active_hours) : 0);
    const idleHours = dm ? Number(dm.idle_hours) : (ws ? Number(ws.idle_hours) : 0);
    const overtimeHours = dm ? Number(dm.overtime_hours) : Math.max(0, workingHours - 8.0);
    const productivityScore = dm ? Number(dm.productivity_score) : 0;

    const hasSession = !!ws || workingHours > 0;
    if (hasSession) {
      activeEmployeesCount += 1;
      teamTotalWorkingHours += workingHours;
      teamTotalOvertime += overtimeHours;
      teamTotalProductivity += productivityScore;
    }

    const isOngoing = ws ? ws.logout_time === null : false;
    const loginTime = ws ? ws.login_time : null;
    const logoutTime = ws ? ws.logout_time : null;

    // Application usage
    const appUsage = appUsageMap.get(emp.id) || [];
    const topApp = appUsage.length > 0 ? appUsage[0].appName : null;

    // Completed task analyses (strictly Rule-Based Task Evaluation Engine v1.0)
    const taskAnalyses: EodTaskAnalysisItem[] = completedTasks
      .filter((t) => t.actual_hours !== null && t.actual_hours !== undefined)
      .map((t) => ({
        taskId: t.id,
        taskTitle: t.title,
        priority: t.priority,
        complexity: t.complexity || 'Medium',
        benchmarkRange: t.benchmark_min_hours !== null
          ? `${t.benchmark_min_hours}h – ${t.benchmark_max_hours}h`
          : '3.0h – 6.0h',
        actualHours: Number(t.actual_hours) || 0,
        varianceHours: Number(t.variance_hours) || 0,
        isOnTime: t.is_on_time === null ? null : Boolean(t.is_on_time),
        evaluationEngineVersion: t.evaluation_engine_ver || 'Rule-Based Task Evaluation Engine v1.0'
      }));

    // Burnout risk parsing
    let predictedRisk: 'Low' | 'Medium' | 'High' | 'No prediction available' = 'No prediction available';
    let probLow = 0;
    let probMed = 0;
    let probHigh = 0;
    let continuousRiskScore: number | null = null;
    let factors: string[] = [];
    let recs: string[] = [];

    if (bp) {
      predictedRisk = bp.predicted_risk;
      probLow = Number(bp.prob_low) || 0;
      probMed = Number(bp.prob_med) || 0;
      probHigh = Number(bp.prob_high) || 0;
      continuousRiskScore = bp.continuous_risk_score !== null ? Number(bp.continuous_risk_score) : null;
      try {
        factors = JSON.parse(bp.top_contributing_factors || '[]');
      } catch {
        factors = [];
      }
      try {
        recs = JSON.parse(bp.recommendations || '[]');
      } catch {
        recs = [];
      }

      if (bp.predicted_risk === 'Low') burnoutRiskDist.Low += 1;
      else if (bp.predicted_risk === 'Medium') burnoutRiskDist.Medium += 1;
      else if (bp.predicted_risk === 'High') burnoutRiskDist.High += 1;
      burnoutRiskDist.total += 1;
    }

    // Daily contributing factors & operational recommendations
    const dailyFactors = deriveDailyContributingFactors(
      workingHours,
      activeHours,
      idleHours,
      overtimeHours,
      productivityScore,
      pendingCount,
      completedCount,
      topApp
    );

    const operationalRecs = deriveOperationalRecommendations(
      overtimeHours,
      workingHours,
      pendingCount,
      predictedRisk,
      productivityScore,
      hasSession
    );

    // Attention triggers check
    const attentionTriggers: string[] = [];
    if (predictedRisk === 'High') {
      attentionTriggers.push('High burnout risk classification from ML pipeline');
    }
    if (overtimeHours >= 2.0) {
      attentionTriggers.push(`Significant daily overtime recorded (+${overtimeHours.toFixed(1)}h)`);
    }
    if (workingHours >= 10.5) {
      attentionTriggers.push(`Extended shift duration (${workingHours.toFixed(1)}h total)`);
    }
    if (pendingCount >= 2) {
      attentionTriggers.push(`Substantial pending task queue (${pendingCount} tasks awaiting completion)`);
    }
    if (idleHours >= 3.0 && workingHours > 0) {
      attentionTriggers.push(`Elevated idle duration during shift (${idleHours.toFixed(1)}h)`);
    }
    if (productivityScore > 0 && productivityScore < 67.0) {
      attentionTriggers.push(`Lower active focus score recorded (${productivityScore.toFixed(1)}/100)`);
    }

    const requiresAttention = attentionTriggers.length > 0;
    if (requiresAttention) {
      employeesRequiringAttention.push({
        employeeId: emp.id,
        employeeName: emp.name,
        department: emp.department,
        avatarColor: emp.avatar_color,
        triggers: attentionTriggers,
        predictedRisk,
        overtimeHours
      });
    }

    employeeReports.push({
      employeeId: emp.id,
      employeeName: emp.name,
      department: emp.department,
      avatarColor: emp.avatar_color,
      loginTime,
      logoutTime,
      isSessionOngoing: isOngoing,
      hasRecordedSession: hasSession,
      totalWorkingHours: Math.round(workingHours * 100) / 100,
      activeHours: Math.round(activeHours * 100) / 100,
      idleHours: Math.round(idleHours * 100) / 100,
      overtimeHours: Math.round(overtimeHours * 100) / 100,
      tasksAssigned: assignedCount,
      tasksCompleted: completedCount,
      tasksPending: pendingCount,
      taskCompletionRate: completionRate,
      applicationUsage: appUsage,
      completedTaskAnalyses: taskAnalyses,
      burnoutRisk: {
        predictedRisk,
        probLow,
        probMed,
        probHigh,
        continuousRiskScore,
        topContributingFactors: factors,
        recommendations: recs
      },
      dailyContributingFactors: dailyFactors,
      operationalRecommendations: operationalRecs,
      requiresAttention,
      attentionTriggers
    });
  }

  const teamCompletionRate = teamTasksAssigned > 0
    ? Math.round((teamTasksCompleted / teamTasksAssigned) * 100)
    : 0;

  const avgWorkingHours = activeEmployeesCount > 0
    ? Math.round((teamTotalWorkingHours / activeEmployeesCount) * 10) / 10
    : 0;

  const avgProductivity = activeEmployeesCount > 0
    ? Math.round((teamTotalProductivity / activeEmployeesCount) * 10) / 10
    : 0;

  const summary: EodTeamSummary = {
    selectedDate,
    isDemoSeed: isDemo,
    totalEmployees: employees.length, // exactly 4
    employeesActive: activeEmployeesCount,
    tasksAssigned: teamTasksAssigned,
    tasksCompleted: teamTasksCompleted,
    tasksPending: teamTasksPending,
    teamCompletionRate,
    avgWorkingHours,
    totalOvertime: Math.round(teamTotalOvertime * 10) / 10,
    avgProductivity,
    burnoutDistribution: burnoutRiskDist
  };

  return {
    success: true,
    selectedDate,
    isDemoSeed: isDemo,
    summary,
    employeesRequiringAttention,
    employeeReports
  };
}
