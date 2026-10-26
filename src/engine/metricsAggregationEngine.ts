/**
 * MindWork – Deterministic Metric Aggregation Engine
 * Phase 7: Daily & Weekly Metric Aggregation Layer
 * 
 * PURPOSE & ARCHITECTURAL BOUNDARY:
 * - Deterministic, repeatable aggregation deriving employee daily and 7-day metrics
 *   from authoritative source records (tasks, task_sessions, work_sessions, application_usage).
 * - Persists idempotently to daily_metrics and weekly_metrics without creating duplicates.
 * - Enforces strict separation between demo historical baseline (is_demo_seed = 1)
 *   and live telemetry (is_demo_seed = 0).
 * - Prepares the 15 model-compatible features required for Phase 8 without invoking ML inference.
 * - Standard normal working-day baseline is 8.0 hours. Overtime = max(0.0, working_hours - 8.0).
 * - Leave days are NOT inferred from missing telemetry.
 * 
 * [UNESTABLISHED MAPPING NOTICE - PRODUCTIVITY SCORE]:
 * In the training dataset (burnout_employee_dataset_500_productivity_updated(1).csv), Productivity_Score
 * is an input feature (35-100 scale). The Phase 1 demo seed assigned static archetype profiles.
 * No generative formula for live Productivity_Score exists in Phase 1-6. For live records,
 * an active-focus efficiency proxy clamped to [35, 100] is used and flagged for review.
 */

import { DatabaseSync } from 'node:sqlite';
import { DailyMetric, WeeklyMetric, ModelFeatures } from '../types';

export const NORMAL_WORKING_DAY_HOURS = 8.0;

/**
 * Derives and idempotently upserts daily_metrics for an employee on a given date.
 */
export function aggregateDailyMetricsForEmployeeAndDate(
  db: DatabaseSync,
  employeeId: string,
  date: string,
  isDemoSeed: number = 0
): DailyMetric {
  // 1. Fetch work sessions for this employee, date, and seed state
  const sessions = db.prepare(`
    SELECT * FROM work_sessions
    WHERE employee_id = ? AND date = ? AND is_demo_seed = ?
  `).all(employeeId, date, isDemoSeed) as any[];

  let workingHours = 0.0;
  let activeHours = 0.0;
  let idleHours = 0.0;

  for (const s of sessions) {
    workingHours += Number(s.total_working_hours) || 0.0;
    activeHours += Number(s.active_hours) || 0.0;
    idleHours += Number(s.idle_hours) || 0.0;
  }

  workingHours = Math.round(workingHours * 100) / 100;
  activeHours = Math.round(activeHours * 100) / 100;
  idleHours = Math.round(idleHours * 100) / 100;

  // 2. Overtime hours derived deterministically from the 8.0h working day baseline
  const overtimeHours = workingHours > NORMAL_WORKING_DAY_HOURS
    ? Math.round((workingHours - NORMAL_WORKING_DAY_HOURS) * 100) / 100
    : 0.0;

  // 3. Task completion rate for this employee up to / on this date
  const taskStats = db.prepare(`
    SELECT 
      COUNT(*) as total_assigned,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as total_completed
    FROM tasks
    WHERE employee_id = ? AND is_demo_seed = ?
  `).get(employeeId, isDemoSeed) as any;

  let taskCompletionRate = 0.0;
  if (workingHours > 0) {
    if (taskStats && taskStats.total_assigned > 0) {
      taskCompletionRate = Math.round((taskStats.total_completed / taskStats.total_assigned) * 10000) / 100;
    } else {
      taskCompletionRate = 80.0; // Baseline standard when active but no assigned sprint tasks
    }
  }

  // 4. Productivity Score handling
  // Check if an existing record exists
  const existingRecord = db.prepare(`
    SELECT * FROM daily_metrics WHERE employee_id = ? AND date = ?
  `).get(employeeId, date) as any;

  let productivityScore = 0.0;
  let leaveDaysTaken = 0;

  if (isDemoSeed === 1 && existingRecord) {
    // Preserve authoritative demo seed value
    productivityScore = existingRecord.productivity_score;
    leaveDaysTaken = existingRecord.leave_days_taken || 0;
    if (workingHours > 0 && existingRecord.task_completion_rate > 0) {
      taskCompletionRate = existingRecord.task_completion_rate;
    }
  } else if (existingRecord && existingRecord.productivity_score > 0) {
    productivityScore = existingRecord.productivity_score;
    leaveDaysTaken = existingRecord.leave_days_taken || 0;
  } else {
    // Live record calculation:
    // When working_hours > 0, compute active focus efficiency clamped to [35, 100]
    if (workingHours > 0) {
      const activeRatio = activeHours / Math.max(0.1, workingHours);
      productivityScore = Math.min(100.0, Math.max(35.0, Math.round(activeRatio * 90.0 * 10) / 10));
    } else {
      productivityScore = 0.0;
    }
    leaveDaysTaken = existingRecord ? existingRecord.leave_days_taken : 0;
  }

  // 5. Idempotent Upsert into daily_metrics
  const metricId = existingRecord ? existingRecord.id : `dm_${isDemoSeed ? 'seed' : 'live'}_${employeeId}_${date.replace(/-/g, '')}`;

  db.prepare(`
    INSERT INTO daily_metrics (id, employee_id, date, working_hours, active_hours, idle_hours, overtime_hours, task_completion_rate, productivity_score, leave_days_taken, is_demo_seed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id, date) DO UPDATE SET
      working_hours = excluded.working_hours,
      active_hours = excluded.active_hours,
      idle_hours = excluded.idle_hours,
      overtime_hours = excluded.overtime_hours,
      task_completion_rate = excluded.task_completion_rate,
      productivity_score = excluded.productivity_score,
      leave_days_taken = excluded.leave_days_taken,
      is_demo_seed = excluded.is_demo_seed
  `).run(
    metricId,
    employeeId,
    date,
    workingHours,
    activeHours,
    idleHours,
    overtimeHours,
    taskCompletionRate,
    productivityScore,
    leaveDaysTaken,
    isDemoSeed
  );

  return db.prepare(`
    SELECT dm.*, e.name as employee_name, e.department as employee_department, e.avatar_color as employee_avatar_color
    FROM daily_metrics dm
    JOIN employees e ON e.id = dm.employee_id
    WHERE dm.employee_id = ? AND dm.date = ?
  `).get(employeeId, date) as any;
}

/**
 * Derives and idempotently upserts weekly_metrics (7-day rolling window) for an employee.
 */
export function aggregateWeeklyMetricsForEmployee(
  db: DatabaseSync,
  employeeId: string,
  weekStartDate: string = '2026-09-30',
  isDemoSeed: number = 1
): WeeklyMetric {
  // If demo seed and already exists, preserve exact historical demo baseline
  const existingRecord = db.prepare(`
    SELECT * FROM weekly_metrics WHERE employee_id = ? AND week_start_date = ?
  `).get(employeeId, weekStartDate) as any;

  if (isDemoSeed === 1 && existingRecord) {
    return db.prepare(`
      SELECT wm.*, e.name as employee_name, e.department as employee_department, e.avatar_color as employee_avatar_color,
             e.age as employee_age, e.experience_years as employee_experience_years
      FROM weekly_metrics wm
      JOIN employees e ON e.id = wm.employee_id
      WHERE wm.id = ?
    `).get(existingRecord.id) as any;
  }

  // Calculate 7-day date window
  const startDate = new Date(weekStartDate);
  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(startDate);
    d.setDate(d.getDate() + i);
    dates.push(d.toISOString().substring(0, 10));
  }

  const placeholders = dates.map(() => '?').join(',');
  const dailyRows = db.prepare(`
    SELECT * FROM daily_metrics
    WHERE employee_id = ? AND is_demo_seed = ? AND date IN (${placeholders})
    ORDER BY date ASC
  `).all(employeeId, isDemoSeed, ...dates) as any[];

  let sumWorking = 0.0;
  let sumOvertime = 0.0;
  let sumCompletion = 0.0;
  let sumProductivity = 0.0;
  let activeDays = 0;

  for (const row of dailyRows) {
    if (row.working_hours > 0) {
      activeDays += 1;
      sumWorking += row.working_hours;
      sumOvertime += row.overtime_hours;
      sumCompletion += row.task_completion_rate;
      sumProductivity += row.productivity_score;
    }
  }

  const avgWorkingHours = activeDays > 0 ? Math.round((sumWorking / activeDays) * 100) / 100 : 0.0;
  const totalOvertime = Math.round(sumOvertime * 100) / 100;
  const taskCompletionRate = activeDays > 0 ? Math.round((sumCompletion / activeDays) * 100) / 100 : 0.0;
  const avgProductivity = activeDays > 0 ? Math.round((sumProductivity / activeDays) * 10) / 10 : 0.0;

  const weeklyId = existingRecord ? existingRecord.id : `wm_${isDemoSeed ? 'seed' : 'live'}_${employeeId}_${weekStartDate.replace(/-/g, '')}`;

  db.prepare(`
    INSERT INTO weekly_metrics (id, employee_id, week_start_date, avg_working_hours, total_overtime, task_completion_rate, avg_productivity, is_demo_seed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(employee_id, week_start_date) DO UPDATE SET
      avg_working_hours = excluded.avg_working_hours,
      total_overtime = excluded.total_overtime,
      task_completion_rate = excluded.task_completion_rate,
      avg_productivity = excluded.avg_productivity,
      is_demo_seed = excluded.is_demo_seed
  `).run(weeklyId, employeeId, weekStartDate, avgWorkingHours, totalOvertime, taskCompletionRate, avgProductivity, isDemoSeed);

  return db.prepare(`
    SELECT wm.*, e.name as employee_name, e.department as employee_department, e.avatar_color as employee_avatar_color,
           e.age as employee_age, e.experience_years as employee_experience_years
    FROM weekly_metrics wm
    JOIN employees e ON e.id = wm.employee_id
    WHERE wm.id = ?
  `).get(weeklyId) as any;
}

/**
 * Reconciles and validates all daily and weekly metrics across employees.
 * Idempotent and deterministic.
 */
export function reconcileAllMetrics(db: DatabaseSync) {
  const employees = db.prepare('SELECT id FROM employees').all() as any[];

  // 1. Reconcile 7-day demo baseline (Sept 30 - Oct 6, 2026)
  const demoDates = [
    '2026-09-30',
    '2026-10-01',
    '2026-10-02',
    '2026-10-03',
    '2026-10-04',
    '2026-10-05',
    '2026-10-06'
  ];

  let dailyCount = 0;
  let weeklyCount = 0;

  for (const emp of employees) {
    for (const d of demoDates) {
      aggregateDailyMetricsForEmployeeAndDate(db, emp.id, d, 1);
      dailyCount += 1;
    }
    aggregateWeeklyMetricsForEmployee(db, emp.id, '2026-09-30', 1);
    weeklyCount += 1;
  }

  // 2. Reconcile any live work sessions (is_demo_seed = 0)
  const liveSessions = db.prepare(`
    SELECT DISTINCT employee_id, date FROM work_sessions WHERE is_demo_seed = 0
  `).all() as any[];

  for (const ls of liveSessions) {
    aggregateDailyMetricsForEmployeeAndDate(db, ls.employee_id, ls.date, 0);
    dailyCount += 1;
    aggregateWeeklyMetricsForEmployee(db, ls.employee_id, ls.date, 0);
    weeklyCount += 1;
  }

  return {
    reconciled_daily_records: dailyCount,
    reconciled_weekly_records: weeklyCount,
    timestamp: new Date().toISOString()
  };
}

/**
 * Prepares the exact 15 model-compatible features for an employee.
 * Strictly preserves the feature names expected by the trained Random Forest pipeline:
 * ['Department', 'Age', 'Experience_Years', 'Workload_Level', 'Working_Hours_Per_Day',
 *  'Overtime_Hours_Per_Week', 'Assigned_Tasks', 'Completed_Tasks', 'Task_Completion_Rate',
 *  'Deadline_Pressure', 'Productivity_Score', 'App_Usage_Hours_Per_Day', 'Active_Work_Hours',
 *  'Idle_Hours', 'Leave_Days_Taken']
 * 
 * NOTE: Deadline_Pressure is PRESERVED EXACTLY without renaming.
 */
export function extractModelFeatures(
  db: DatabaseSync,
  employeeId: string,
  isDemoSeed: number = 1
): { features: ModelFeatures; metadata: Record<string, any> } {
  const employee = db.prepare('SELECT * FROM employees WHERE id = ?').get(employeeId) as any;
  if (!employee) {
    throw new Error(`Employee with ID ${employeeId} not found.`);
  }

  // 1. Weekly aggregate
  const weekly = db.prepare(`
    SELECT * FROM weekly_metrics
    WHERE employee_id = ? AND is_demo_seed = ?
    ORDER BY week_start_date DESC LIMIT 1
  `).get(employeeId, isDemoSeed) as any;

  // 2. Daily aggregate averages
  const dailyStats = db.prepare(`
    SELECT 
      COUNT(*) as total_days,
      SUM(CASE WHEN working_hours > 0 THEN 1 ELSE 0 END) as active_days,
      AVG(CASE WHEN working_hours > 0 THEN active_hours ELSE NULL END) as avg_active_hours,
      AVG(CASE WHEN working_hours > 0 THEN idle_hours ELSE NULL END) as avg_idle_hours,
      SUM(leave_days_taken) as total_leaves
    FROM daily_metrics
    WHERE employee_id = ? AND is_demo_seed = ?
  `).get(employeeId, isDemoSeed) as any;

  // 3. Task counts
  const tasks = db.prepare(`
    SELECT 
      COUNT(*) as assigned_count,
      SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) as completed_count,
      SUM(CASE WHEN priority = 'Urgent' THEN 1 ELSE 0 END) as urgent_count,
      SUM(CASE WHEN priority = 'High' THEN 1 ELSE 0 END) as high_count
    FROM tasks
    WHERE employee_id = ? AND is_demo_seed = ?
  `).get(employeeId, isDemoSeed) as any;

  // 4. Application usage hours per day
  const appUsage = db.prepare(`
    SELECT COALESCE(SUM(duration_seconds), 0) as total_duration_seconds
    FROM application_usage
    WHERE employee_id = ? AND is_demo_seed = ?
  `).get(employeeId, isDemoSeed) as any;

  const activeDays = Math.max(1, Number(dailyStats?.active_days) || 5);
  const appUsageHoursPerDay = Math.round(((Number(appUsage?.total_duration_seconds) || 0) / 3600.0 / activeDays) * 100) / 100;

  const workingHoursPerDay = weekly ? Number(weekly.avg_working_hours) : 8.0;
  const overtimeHoursPerWeek = weekly ? Number(weekly.total_overtime) : 0.0;
  const assignedTasks = Math.max(1, Number(tasks?.assigned_count) || 3);
  const completedTasks = Number(tasks?.completed_count) || 0;
  const taskCompletionRate = weekly ? Number(weekly.task_completion_rate) : Math.round((completedTasks / assignedTasks) * 100);
  const productivityScore = weekly ? Number(weekly.avg_productivity) : 70.0;
  const activeWorkHours = Math.round((Number(dailyStats?.avg_active_hours) || 6.5) * 100) / 100;
  const idleHours = Math.round((Number(dailyStats?.avg_idle_hours) || 1.5) * 100) / 100;
  const leaveDaysTaken = Number(dailyStats?.total_leaves) || 0;

  // 5. Workload_Level (1 - 10)
  // Derived from task density and weekly shift volume:
  const workloadLevel = Math.min(10, Math.max(1, Math.round(
    (assignedTasks * 0.4) + (workingHoursPerDay * 0.6) - 1.5
  )));

  // 6. Deadline_Pressure (1 - 10)
  // Derived from urgent/high priority tasks and overtime burden:
  const urgentCount = Number(tasks?.urgent_count) || 0;
  const highCount = Number(tasks?.high_count) || 0;
  const deadlinePressure = Math.min(10, Math.max(1, Math.round(
    (urgentCount * 2.5 + highCount * 1.5) + (overtimeHoursPerWeek / 5.0) + 1.0
  )));

  const features: ModelFeatures = {
    Department: employee.department,
    Age: employee.age,
    Experience_Years: employee.experience_years,
    Workload_Level: workloadLevel,
    Working_Hours_Per_Day: workingHoursPerDay,
    Overtime_Hours_Per_Week: overtimeHoursPerWeek,
    Assigned_Tasks: assignedTasks,
    Completed_Tasks: completedTasks,
    Task_Completion_Rate: taskCompletionRate,
    Deadline_Pressure: deadlinePressure, // PRESERVED EXACTLY
    Productivity_Score: productivityScore,
    App_Usage_Hours_Per_Day: appUsageHoursPerDay,
    Active_Work_Hours: activeWorkHours,
    Idle_Hours: idleHours,
    Leave_Days_Taken: leaveDaysTaken
  };

  return {
    features,
    metadata: {
      employee_id: employeeId,
      employee_name: employee.name,
      is_demo_seed: isDemoSeed,
      features_count: Object.keys(features).length,
      normal_working_day_baseline: NORMAL_WORKING_DAY_HOURS,
      pipeline_compatible: true
    }
  };
}
