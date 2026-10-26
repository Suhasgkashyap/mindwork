/**
 * MindWork – Burnout Early Detection System
 * Core Frontend Type Definitions
 */

export type Role = 'MANAGER' | 'EMPLOYEE';

export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type RiskLevel = 'Low' | 'Medium' | 'High';

export type TaskStatus =
  | 'ASSIGNED'
  | 'PENDING'
  | 'IN_PROGRESS'
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'COMPLETED';

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  employee_id?: string | null;
  department?: string | null;
  age?: number | null;
  experience_years?: number | null;
  avatar_color?: string | null;
}

export interface Employee {
  id: string;
  user_id: string;
  name: string;
  department: string;
  age: number;
  experience_years: number;
  avatar_color: string;
  created_at?: string;
}

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  badge?: string;
  badgeVariant?: 'sage' | 'peach' | 'coral' | 'yellow';
}

export interface TaskSession {
  id: string;
  task_id: string;
  start_time: string;
  pause_time?: string | null;
  resume_time?: string | null;
  end_time?: string | null;
  total_active_seconds: number;
  total_paused_seconds: number;
  is_demo_seed: number;
}

export type ComplexityLevel = 'Low' | 'Medium' | 'High';

export interface TaskAnalysisReport {
  id: string;
  task_id: string;
  complexity: ComplexityLevel;
  benchmark_min_hours: number;
  benchmark_max_hours: number;
  actual_hours: number;
  variance_hours: number;
  is_on_time: number;
  evaluation_engine_ver: string;
  analyzed_at: string;
  is_demo_seed: number;
  // Transparent heuristics metadata
  checklist_count?: number;
  scope_score?: number;
  priority_weight?: number;
  historical_velocity_applied?: boolean;
  comparable_tasks_count?: number;
  historical_median_pace?: number | null;
  velocity_modifier?: number;
  evaluation_note?: string;
  variance_description?: string;
}

export interface TaskItem {
  id: string;
  employee_id: string;
  title: string;
  description: string;
  priority: Priority;
  deadline: string;
  status: TaskStatus;
  created_at: string;
  is_demo_seed: number;
  employee_name?: string;
  employee_department?: string;
  employee_avatar_color?: string;
  // Multi-laptop submission & acceptance criteria
  acceptance_criteria?: string | null;
  submission_notes?: string | null;
  work_summary?: string | null;
  challenges_faced?: string | null;
  completion_status?: string | null;
  optional_remarks?: string | null;
  submission_file_name?: string | null;
  submission_original_file_name?: string | null;
  submission_file_size?: number | null;
  submission_file_path?: string | null;
  deliverable_url?: string | null;
  deliverable_files?: string | null;
  submitted_at?: string | null;
  manager_feedback?: string | null;
  reviewed_at?: string | null;
  // Stopwatch Session Telemetry
  session_id?: string | null;
  session_start_time?: string | null;
  session_pause_time?: string | null;
  session_resume_time?: string | null;
  session_end_time?: string | null;
  total_active_seconds?: number;
  total_paused_seconds?: number;
  sessions?: TaskSession[];
  // Post-Completion Task Analysis Report (Phase 5)
  analysis_report?: TaskAnalysisReport | null;
}

export interface WorkSubmission {
  id: string;
  task_id: string;
  employee_id: string;
  user_id: string;
  work_summary: string;
  challenges_faced?: string | null;
  completion_status: string;
  optional_remarks?: string | null;
  file_name?: string | null;
  original_file_name?: string | null;
  file_size_bytes?: number;
  file_storage_path?: string | null;
  file_mime_type?: string | null;
  submitted_at: string;
  status: 'PENDING_REVIEW' | 'SUBMITTED' | 'APPROVED' | 'CHANGES_REQUESTED';
  manager_feedback?: string | null;
  reviewed_at?: string | null;
  reviewed_by?: string | null;
  version: number;
  verification_report?: any | null;
  created_at: string;
  // Joined fields
  task_title?: string;
  task_priority?: Priority;
  employee_name?: string;
  employee_department?: string;
  employee_avatar_color?: string;
}

export interface CreateTaskInput {
  employee_id: string;
  title: string;
  description: string;
  priority: Priority;
  deadline: string;
  acceptance_criteria?: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'REPORT_SUBMITTED' | 'CHANGES_REQUESTED' | 'TASK_APPROVED' | 'DEADLINE_APPROACHING' | 'SYSTEM';
  link?: string | null;
  is_read: number;
  created_at: string;
}

export interface AuditLogItem {
  id: string;
  user_id?: string | null;
  action: string;
  target_type?: string | null;
  target_id?: string | null;
  details?: string | null;
  ip_address?: string | null;
  created_at: string;
}

// -------------------------------------------------------------
// DESKTOP WORK ACTIVITY TELEMETRY TYPES (Phase 6)
// -------------------------------------------------------------

export type TelemetryState =
  | 'Demo Data'
  | 'Live Tracking Active'
  | 'Tracking Permission Required'
  | 'Tracking Unavailable';

export interface ApplicationUsage {
  id: string;
  work_session_id: string;
  employee_id: string;
  app_name: string;
  duration_seconds: number;
  active_seconds: number;
  idle_seconds: number;
  is_demo_seed: number;
  app_start_time?: string | null;
  app_end_time?: string | null;
}

export interface WorkSession {
  id: string;
  employee_id: string;
  date: string;
  login_time: string;
  logout_time: string | null;
  total_working_hours: number;
  active_hours: number;
  idle_hours: number;
  is_demo_seed: number;
  employee_name?: string;
  employee_department?: string;
  employee_avatar_color?: string;
  application_usage?: ApplicationUsage[];
}

export interface TrackerStatusResponse {
  telemetry_state: TelemetryState;
  macos_accessibility_required: boolean;
  macos_accessibility_granted: boolean;
  platform: string;
  allowed_telemetry: string[];
  strictly_prohibited: string[];
  active_session?: WorkSession | null;
  active_app?: string | null;
  raw_active_app?: string | null;
  is_active_input?: boolean;
  idle_seconds?: number;
  source?: string;
  permission_instructions?: string;
  target_employee_id?: string;
}

// -------------------------------------------------------------
// METRIC AGGREGATION & MODEL FEATURE TYPES (Phase 7)
// -------------------------------------------------------------

export interface DailyMetric {
  id: string;
  employee_id: string;
  date: string;
  working_hours: number;
  active_hours: number;
  idle_hours: number;
  overtime_hours: number;
  task_completion_rate: number;
  productivity_score: number;
  leave_days_taken: number;
  is_demo_seed: number;
  employee_name?: string;
  employee_department?: string;
  employee_avatar_color?: string;
}

export interface WeeklyMetric {
  id: string;
  employee_id: string;
  week_start_date: string;
  avg_working_hours: number;
  total_overtime: number;
  task_completion_rate: number;
  avg_productivity: number;
  is_demo_seed: number;
  employee_name?: string;
  employee_department?: string;
  employee_avatar_color?: string;
  employee_age?: number;
  employee_experience_years?: number;
}

export interface ModelFeatures {
  Department: string;
  Age: number;
  Experience_Years: number;
  Workload_Level: number;
  Working_Hours_Per_Day: number;
  Overtime_Hours_Per_Week: number;
  Assigned_Tasks: number;
  Completed_Tasks: number;
  Task_Completion_Rate: number;
  Deadline_Pressure: number;
  Productivity_Score: number;
  App_Usage_Hours_Per_Day: number;
  Active_Work_Hours: number;
  Idle_Hours: number;
  Leave_Days_Taken: number;
}

export interface BurnoutPrediction {
  id: string;
  employee_id: string;
  employee_name?: string;
  employee_department?: string;
  employee_avatar_color?: string;
  calculation_date: string;
  predicted_risk: 'Low' | 'Medium' | 'High';
  prob_low: number;
  prob_med: number;
  prob_high: number;
  continuous_risk_score: number; // Application-Derived Presentation Score
  top_contributing_factors: string[];
  recommendations: string[];
  is_demo_seed: number;
  score_label?: string;
  disclaimer?: string;
}

export interface ModelEvaluationMetrics {
  dataset: string;
  methodology: string;
  training_timestamp: string;
  algorithm: string;
  n_estimators: number;
  random_state: number;
  total_records: number;
  training_samples: number;
  testing_samples: number;
  target: string;
  target_classes: string[];
  selected_features: string[];
  number_of_features_raw: number;
  number_of_features_transformed: number;
  accuracy: number;
  precision_macro: number;
  precision_weighted: number;
  recall_macro: number;
  recall_weighted: number;
  macro_f1: number;
  weighted_f1: number;
  per_class_metrics: {
    Low: { precision: number; recall: number; f1: number; support: number };
    Medium: { precision: number; recall: number; f1: number; support: number };
    High: { precision: number; recall: number; f1: number; support: number };
  };
  confusion_matrix: number[][];
  feature_importances: { feature: string; importance: number }[];
}

// -------------------------------------------------------------
// PHASE 9: DAILY END-OF-DAY 4-EMPLOYEE MANAGER REPORT TYPES
// -------------------------------------------------------------

export interface EodAppUsageItem {
  appName: string;
  durationSeconds: number;
  activeSeconds: number;
  idleSeconds: number;
}

export interface EodTaskAnalysisItem {
  taskId: string;
  taskTitle: string;
  priority: Priority;
  complexity: ComplexityLevel | 'Not evaluated';
  benchmarkRange: string;
  actualHours: number;
  varianceHours: number;
  isOnTime: boolean | null;
  evaluationEngineVersion: string;
}

export interface EodEmployeeReport {
  employeeId: string;
  employeeName: string;
  department: string;
  avatarColor: string;
  // Session & Working Duration
  loginTime: string | null;
  logoutTime: string | null;
  isSessionOngoing: boolean;
  hasRecordedSession: boolean;
  totalWorkingHours: number;
  activeHours: number;
  idleHours: number;
  overtimeHours: number;
  // Tasks Summary
  tasksAssigned: number;
  tasksCompleted: number;
  tasksPending: number;
  taskCompletionRate: number;
  // Application Usage (Metadata only, strictly private)
  applicationUsage: EodAppUsageItem[];
  // Completed Task Analysis (Rule-Based Task Evaluation Engine v1.0)
  completedTaskAnalyses: EodTaskAnalysisItem[];
  // Burnout Prediction (Authoritative Phase 8)
  burnoutRisk: {
    predictedRisk: 'Low' | 'Medium' | 'High' | 'No prediction available';
    probLow: number;
    probMed: number;
    probHigh: number;
    continuousRiskScore: number | null; // Application-Derived Presentation Score
    topContributingFactors: string[];
    recommendations: string[];
  };
  // Daily Contributing Factors (Operational Work Patterns)
  dailyContributingFactors: string[];
  // Recommendations (Operational & Workplace-Oriented)
  operationalRecommendations: string[];
  // Attention Trigger Indicators
  requiresAttention: boolean;
  attentionTriggers: string[];
}

export interface EodTeamSummary {
  selectedDate: string;
  isDemoSeed: number;
  totalEmployees: number; // exactly 4
  employeesActive: number;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksPending: number;
  teamCompletionRate: number;
  avgWorkingHours: number;
  totalOvertime: number;
  avgProductivity: number;
  burnoutDistribution: {
    Low: number;
    Medium: number;
    High: number;
    total: number;
  };
}

export interface EodDailyReportResponse {
  success: boolean;
  selectedDate: string;
  isDemoSeed: number;
  summary: EodTeamSummary;
  employeesRequiringAttention: {
    employeeId: string;
    employeeName: string;
    department: string;
    avatarColor: string;
    triggers: string[];
    predictedRisk: string;
    overtimeHours: number;
  }[];
  employeeReports: EodEmployeeReport[];
}

