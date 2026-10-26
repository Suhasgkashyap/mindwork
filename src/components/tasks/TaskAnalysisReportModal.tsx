import React from 'react';
import { TaskItem, TaskAnalysisReport, Priority } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { PriorityBadge, Badge } from '../ui/Badge';
import { formatDurationHMS, formatDurationHuman, formatDateTime } from '../../utils/formatTime';
import {
  CheckCircle2,
  Clock,
  Timer,
  Calendar,
  AlertTriangle,
  Cpu,
  Layers,
  Sparkles,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Scale,
  Activity,
  FileCheck2,
  Award,
} from 'lucide-react';

interface TaskAnalysisReportModalProps {
  task: TaskItem | null;
  report: TaskAnalysisReport | null;
  isOpen: boolean;
  onClose: () => void;
}

export const TaskAnalysisReportModal: React.FC<TaskAnalysisReportModalProps> = ({
  task,
  report,
  isOpen,
  onClose,
}) => {
  if (!task || !report) return null;

  const actualHours = report.actual_hours;
  const minHours = report.benchmark_min_hours;
  const maxHours = report.benchmark_max_hours;
  const midpoint = Math.round(((minHours + maxHours) / 2.0) * 100) / 100;
  const variance = report.variance_hours;
  const isOnTime = report.is_on_time === 1;

  // Determine variance visual state
  const isWithinRange = actualHours >= minHours && actualHours <= maxHours;
  const isAheadOfRange = actualHours < minHours;
  const isOverRange = actualHours > maxHours;

  const complexityVariantMap = {
    Low: 'sage',
    Medium: 'yellow',
    High: 'peach',
  } as const;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Post-Completion Task Analysis"
      subtitle={`Task: "${task.title}" • ID: ${task.id}`}
      maxWidth="lg"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2 text-xs text-[#78716C]">
            <ShieldCheck className="w-4 h-4 text-[#588157]" />
            <span>Authoritative record saved to SQLite task_analysis_reports</span>
          </div>
          <Button variant="primary" size="sm" onClick={onClose}>
            Close Report
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Banner: Completion Status & Engine Identity */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-[#2D4A36] to-[#3F624D] text-[#FAF7F0] shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#EBF1ED] text-[#2D4A36]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#588157]" />
                Task Authoritatively Completed
              </span>
              <span className="text-xs text-[#D8E2DC]">
                Assigned to: <strong className="text-white">{task.employee_name || 'Employee'}</strong>
              </span>
            </div>
            <h3 className="text-lg font-extrabold tracking-tight text-white">{task.title}</h3>
          </div>

          <div className="shrink-0 text-left sm:text-right">
            <span className="text-[10px] uppercase font-bold tracking-wider text-[#A3B18A] block">
              Evaluation Engine
            </span>
            <span className="text-xs font-bold text-white block">
              Rule-Based Task Evaluation Engine v1.0
            </span>
            <span className="text-[10px] text-[#D8E2DC] block">
              Non-ML • Objective Scope & Telemetry
            </span>
          </div>
        </div>

        {/* Core Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Actual Working Time */}
          <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E4DECFA] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] flex items-center gap-1">
              <Timer className="w-3.5 h-3.5 text-[#2D4A36]" />
              Actual Work Time
            </span>
            <div className="text-2xl font-extrabold text-[#1C1917] font-mono">
              {actualHours.toFixed(2)}h
            </div>
            <p className="text-[11px] text-[#57534E]">
              From stopwatch telemetry ({Math.round(actualHours * 60)} min active)
            </p>
          </div>

          {/* 2. Benchmark Target Range */}
          <div className="p-4 rounded-2xl bg-[#F8F5EE] border border-[#E4DECFA] space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-[#588157]" />
              Benchmark Range
            </span>
            <div className="text-2xl font-extrabold text-[#2D4A36] font-mono">
              {minHours}h – {maxHours}h
            </div>
            <p className="text-[11px] text-[#57534E]">
              Midpoint: {midpoint}h (Range, not guaranteed)
            </p>
          </div>

          {/* 3. Variance */}
          <div
            className={`p-4 rounded-2xl border space-y-1 ${
              isWithinRange
                ? 'bg-[#EBF1ED] border-[#D1E0D5]'
                : isAheadOfRange
                ? 'bg-[#F0FDF4] border-[#BBF7D0]'
                : 'bg-[#FFF7ED] border-[#FED7AA]'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] flex items-center gap-1">
              {isAheadOfRange ? (
                <TrendingDown className="w-3.5 h-3.5 text-[#16A34A]" />
              ) : isOverRange ? (
                <TrendingUp className="w-3.5 h-3.5 text-[#EA580C]" />
              ) : (
                <Activity className="w-3.5 h-3.5 text-[#2D4A36]" />
              )}
              Variance
            </span>
            <div
              className={`text-2xl font-extrabold font-mono ${
                isAheadOfRange
                  ? 'text-[#16A34A]'
                  : isOverRange
                  ? 'text-[#EA580C]'
                  : 'text-[#2D4A36]'
              }`}
            >
              {variance >= 0 ? `+${variance.toFixed(2)}h` : `${variance.toFixed(2)}h`}
            </div>
            <p className="text-[11px] font-medium text-[#57534E] leading-tight">
              {isWithinRange
                ? 'Within benchmark target'
                : isAheadOfRange
                ? 'Ahead of minimum benchmark'
                : 'Over maximum benchmark'}
            </p>
          </div>

          {/* 4. Deadline Compliance */}
          <div
            className={`p-4 rounded-2xl border space-y-1 ${
              isOnTime
                ? 'bg-[#EBF1ED] border-[#D1E0D5]'
                : 'bg-[#FEF2F2] border-[#FECACA]'
            }`}
          >
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#78716C] flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#588157]" />
              Deadline Compliance
            </span>
            <div className="flex items-center gap-1.5 pt-1">
              {isOnTime ? (
                <span className="inline-flex items-center gap-1 text-sm font-extrabold text-[#15803D]">
                  <CheckCircle2 className="w-4 h-4 text-[#15803D]" />
                  On-Time Delivery
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-sm font-extrabold text-[#DC2626]">
                  <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
                  Past Deadline
                </span>
              )}
            </div>
            <p className="text-[11px] text-[#57534E] truncate">
              Deadline: {task.deadline.split(' ')[0]}
            </p>
          </div>
        </div>

        {/* Task Attributes Bar: Priority & Complexity */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-2xl bg-white border border-[#DDD5C5] shadow-xs">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] block mb-1">
              Evaluated Complexity
            </span>
            <Badge variant={complexityVariantMap[report.complexity]} size="sm">
              {report.complexity} Complexity
            </Badge>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] block mb-1">
              Assigned Priority
            </span>
            <PriorityBadge priority={task.priority} size="sm" />
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] block mb-1">
              Completion Date
            </span>
            <span className="text-xs font-semibold text-[#1C1917] block">
              {formatDateTime(report.analyzed_at)}
            </span>
          </div>

          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#78716C] block mb-1">
              Engine Version
            </span>
            <span className="text-xs font-mono text-[#57534E] block">
              {report.evaluation_engine_ver}
            </span>
          </div>
        </div>

        {/* Historical Velocity & Rule-Based Audit Trail */}
        <div className="p-4 rounded-2xl bg-[#FAF8F2] border border-[#E0D9C8] space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#2D4A36] flex items-center gap-1.5">
              <FileCheck2 className="w-4 h-4 text-[#588157]" />
              Historical Velocity Rule Audit
            </h4>
            {report.historical_velocity_applied ? (
              <Badge variant="forest" size="sm">
                Velocity Modifier Applied (≥ 3 Comparable Tasks)
              </Badge>
            ) : (
              <Badge variant="neutral" size="sm">
                Velocity Modifier Disabled (&lt; 3 Comparable Tasks)
              </Badge>
            )}
          </div>

          <div className="text-xs text-[#44403C] space-y-2 leading-relaxed">
            <p className="p-3 rounded-xl bg-white border border-[#E8E2D5]">
              <strong>Evaluation Engine Note:</strong> {report.evaluation_note}
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1 text-[11px] text-[#57534E]">
              <div className="p-2.5 rounded-lg bg-white/70 border border-[#E8E2D5]">
                <span className="block font-bold text-[#1C1917]">Historical Sample Size</span>
                <span>{report.comparable_tasks_count ?? 0} comparable completed tasks</span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/70 border border-[#E8E2D5]">
                <span className="block font-bold text-[#1C1917]">Median Delivery Pace</span>
                <span>
                  {report.historical_median_pace
                    ? `${report.historical_median_pace}h`
                    : 'Disabled (threshold requires ≥ 3)'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-white/70 border border-[#E8E2D5]">
                <span className="block font-bold text-[#1C1917]">Velocity Modifier Ratio</span>
                <span>
                  {report.velocity_modifier && report.historical_velocity_applied
                    ? `${report.velocity_modifier.toFixed(2)}x`
                    : '1.00x (Baseline Rule-Based Only)'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Variance Detailed Breakdown */}
        {report.variance_description && (
          <div className="p-3.5 rounded-xl bg-[#F4F6F0] border border-[#DCE4D0] text-xs text-[#2D4A36] flex items-start gap-2.5">
            <Award className="w-4 h-4 text-[#588157] shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Delivery Summary:</strong> {report.variance_description}
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
};
