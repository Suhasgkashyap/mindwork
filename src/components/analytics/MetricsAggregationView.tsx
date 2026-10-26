import React, { useState, useEffect } from 'react';
import { User, DailyMetric, WeeklyMetric, ModelFeatures } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Avatar } from '../ui/Avatar';
import { Modal } from '../ui/Modal';
import { formatDateTime } from '../../utils/formatTime';
import {
  BarChart3,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Cpu,
  Layers,
  ShieldCheck,
  Activity,
  Flame,
  ArrowRight,
  TrendingUp,
  Sliders,
  Check,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface MetricsAggregationViewProps {
  currentUser: User;
}

export const MetricsAggregationView: React.FC<MetricsAggregationViewProps> = ({ currentUser }) => {
  const [scopeTab, setScopeTab] = useState<'demo' | 'live'>('demo');
  const [weeklyMetrics, setWeeklyMetrics] = useState<WeeklyMetric[]>([]);
  const [dailyMetrics, setDailyMetrics] = useState<DailyMetric[]>([]);
  const [selectedEmployeeFilter, setSelectedEmployeeFilter] = useState<string>('all');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isReconciling, setIsReconciling] = useState<boolean>(false);
  const [reconcileSuccess, setReconcileSuccess] = useState<string | null>(null);

  // Model features drawer / inspection modal
  const [inspectedFeatures, setInspectedFeatures] = useState<{
    features: ModelFeatures;
    metadata: Record<string, any>;
  } | null>(null);
  const [isFeaturesModalOpen, setIsFeaturesModalOpen] = useState<boolean>(false);
  const [isLoadingFeatures, setIsLoadingFeatures] = useState<boolean>(false);

  useEffect(() => {
    loadMetrics();
  }, [scopeTab]);

  const loadMetrics = async () => {
    setIsLoading(true);
    try {
      const seedFilter = scopeTab === 'demo' ? '1' : '0';

      const [weeklyRes, dailyRes] = await Promise.all([
        fetch(`/api/metrics/weekly?is_demo_seed=${seedFilter}`),
        fetch(`/api/metrics/daily?is_demo_seed=${seedFilter}&limit=100`)
      ]);

      const weeklyData = await weeklyRes.json();
      const dailyData = await dailyRes.json();

      if (weeklyData.success) {
        setWeeklyMetrics(weeklyData.weekly_metrics || []);
      }
      if (dailyData.success) {
        setDailyMetrics(dailyData.daily_metrics || []);
      }
    } catch (err) {
      console.error('Error loading metrics:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunReconcile = async () => {
    setIsReconciling(true);
    setReconcileSuccess(null);
    try {
      const res = await fetch('/api/metrics/aggregate/reconcile', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setReconcileSuccess('All daily and weekly metrics reconciled idempotently and verified.');
        await loadMetrics();
        setTimeout(() => setReconcileSuccess(null), 5000);
      }
    } catch (err: any) {
      console.error('Reconcile error:', err);
    } finally {
      setIsReconciling(false);
    }
  };

  const handleInspectModelFeatures = async (employeeId: string) => {
    setIsLoadingFeatures(true);
    setIsFeaturesModalOpen(true);
    try {
      const seedFilter = scopeTab === 'demo' ? '1' : '0';
      const res = await fetch(`/api/metrics/model-features/${employeeId}?is_demo_seed=${seedFilter}`);
      const data = await res.json();
      if (data.success) {
        setInspectedFeatures(data);
      }
    } catch (err) {
      console.error('Error extracting model features:', err);
    } finally {
      setIsLoadingFeatures(false);
    }
  };

  const filteredDailyMetrics = selectedEmployeeFilter === 'all'
    ? dailyMetrics
    : dailyMetrics.filter((m) => m.employee_id === selectedEmployeeFilter);

  return (
    <div className="space-y-5">
      {/* Top Banner: Deterministic Metrics Aggregation Engine */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2D4A36] via-[#355840] to-[#436A4F] text-[#FAF7F0] p-4 sm:p-5 shadow-sm">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#FAF7F0]/15 text-[#FAF7F0] backdrop-blur-xs border border-[#FAF7F0]/20">
                <BarChart3 className="w-3.5 h-3.5 text-[#A3B18A]" />
                Metrics Aggregation Layer
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EBF1ED] text-[#2D4A36]">
                <ShieldCheck className="w-3 h-3 text-[#588157]" />
                Deterministic &amp; Repeatable
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Daily &amp; Weekly Metric Aggregation Engine
            </h1>
            <p className="text-xs sm:text-sm text-[#D8E2DC] leading-snug">
              Computes objective daily metrics and 7-day rolling aggregates from authoritative underlying records (work sessions, tasks, and stopwatch telemetry). Supplies clean, model-compatible features for Phase 8.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              icon={<RefreshCw className={`w-3.5 h-3.5 text-[#2D4A36] ${isReconciling ? 'animate-spin' : ''}`} />}
              onClick={handleRunReconcile}
              disabled={isReconciling}
            >
              Reconcile All Metrics
            </Button>
          </div>
        </div>
      </div>

      {/* Success Notification */}
      {reconcileSuccess && (
        <div className="p-4 rounded-2xl bg-[#EBF1ED] border border-[#A3B18A] text-xs font-semibold text-[#2D4A36] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#588157]" />
            <span>{reconcileSuccess}</span>
          </div>
          <button onClick={() => setReconcileSuccess(null)} className="text-[#588157] font-bold">×</button>
        </div>
      )}

      {/* Architectural Guarantee & Productivity Mapping Disclaimer */}
      <Card variant="flat" padding="md" className="bg-[#FAF8F2] border-[#E0D9C8]">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-[#588157] shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs text-[#57534E] leading-relaxed">
            <strong className="text-[#1C1917] block font-bold">
              Authoritative Aggregation Rules &amp; Model Feature Contract:
            </strong>
            <p>
              • <strong>Working Baseline:</strong> Standard shift is defined at 8.0 hours. Overtime is derived as <code>max(0.0, working_hours - 8.0)</code>.
              <br />
              • <strong>Leave Days:</strong> Leave is never inferred from weekends or missing telemetry; preserved from explicit records.
              <br />
              • <strong>Productivity Score:</strong> Pre-seeded baseline values are preserved. For live telemetry, an unestablished mapping notice is flagged for review while maintaining the [35, 100] feature contract.
              <br />
              • <strong>Model Readiness:</strong> Supplies all 15 exact feature names required by the trained Random Forest pipeline (including <code>Deadline_Pressure</code> preserved without renaming).
            </p>
          </div>
        </div>
      </Card>

      {/* Scope Navigation Tabs: 7-Day Demo Baseline vs Live Telemetry */}
      <div className="flex items-center justify-between border-b border-[#E8E2D5] pb-2">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setScopeTab('demo')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              scopeTab === 'demo'
                ? 'bg-[#606C38] text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EA]'
            }`}
          >
            <Calendar className="w-4 h-4" />
            <span>7-Day Demo Baseline Telemetry (is_demo_seed = 1)</span>
            <Badge variant="sage" size="sm">Sept 30 – Oct 6, 2026</Badge>
          </button>

          <button
            onClick={() => setScopeTab('live')}
            className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all cursor-pointer ${
              scopeTab === 'live'
                ? 'bg-[#2D4A36] text-white shadow-sm'
                : 'text-[#78716C] hover:text-[#1C1917] hover:bg-[#F5F2EA]'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Live Aggregations (is_demo_seed = 0)</span>
            <Badge variant="forest" size="sm">Active</Badge>
          </button>
        </div>

        <Button
          variant="outline"
          size="sm"
          icon={<RefreshCw className="w-3.5 h-3.5" />}
          onClick={loadMetrics}
          disabled={isLoading}
        >
          Refresh
        </Button>
      </div>

      {/* 7-Day Rolling Weekly Metrics Cards */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#588157]" />
              7-Day Rolling Operational Metrics (weekly_metrics)
            </h2>
            <p className="text-xs text-[#78716C]">
              Weekly aggregates derived from daily metrics over the 7-day period
            </p>
          </div>
          <span className="text-xs text-[#78716C]">
            {weeklyMetrics.length} Employee Profiles
          </span>
        </div>

        {weeklyMetrics.length === 0 ? (
          <div className="p-8 text-center bg-white rounded-2xl border border-[#DDD5C5] text-xs text-[#78716C]">
            No weekly metrics generated for this scope yet. Click "Reconcile All Metrics" above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {weeklyMetrics.map((wm) => {
              const otColor = wm.total_overtime > 10
                ? 'text-[#DC2626] bg-[#FEF2F2] border-[#FCA5A5]'
                : wm.total_overtime > 4
                ? 'text-[#EA580C] bg-[#FFF7ED] border-[#FED7AA]'
                : 'text-[#2D4A36] bg-[#EBF1ED] border-[#D1E0D5]';

              return (
                <Card key={wm.id} variant="flat" padding="md" className="border-[#DDD5C5] space-y-4 shadow-xs">
                  {/* Employee Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <Avatar name={wm.employee_name || 'Emp'} color={wm.employee_avatar_color || '#2D4A36'} size="md" />
                      <div>
                        <h3 className="font-extrabold text-sm text-[#1C1917]">{wm.employee_name}</h3>
                        <p className="text-[11px] text-[#78716C]">
                          {wm.employee_department} • Age {wm.employee_age} ({wm.employee_experience_years}y exp)
                        </p>
                      </div>
                    </div>
                    {wm.is_demo_seed === 1 ? (
                      <Badge variant="sage" size="sm">Demo</Badge>
                    ) : (
                      <Badge variant="forest" size="sm">Live</Badge>
                    )}
                  </div>

                  {/* Metrics Grid */}
                  <div className="grid grid-cols-2 gap-2.5 text-xs">
                    <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                      <span className="text-[10px] uppercase font-bold text-[#78716C] block">Avg Work / Day</span>
                      <span className="font-mono font-bold text-base text-[#1C1917]">
                        {wm.avg_working_hours.toFixed(2)}h
                      </span>
                    </div>

                    <div className={`p-2.5 rounded-xl border ${otColor}`}>
                      <span className="text-[10px] uppercase font-bold block opacity-80">Overtime / Week</span>
                      <span className="font-mono font-bold text-base">
                        +{wm.total_overtime.toFixed(1)}h
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                      <span className="text-[10px] uppercase font-bold text-[#78716C] block">Task Completion</span>
                      <span className="font-mono font-bold text-base text-[#2D4A36]">
                        {wm.task_completion_rate.toFixed(1)}%
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#FAF9F5] border border-[#E8E2D5]">
                      <span className="text-[10px] uppercase font-bold text-[#78716C] block">Productivity Score</span>
                      <span className="font-mono font-bold text-base text-[#1C1917]">
                        {wm.avg_productivity.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Model feature inspect trigger */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-center text-xs"
                    icon={<Cpu className="w-3.5 h-3.5 text-[#588157]" />}
                    onClick={() => handleInspectModelFeatures(wm.employee_id)}
                  >
                    Inspect 15 Model Features
                  </Button>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Metrics Breakdown Table */}
      <Card variant="flat" padding="lg" className="border-[#DDD5C5]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-base font-bold text-[#1C1917] tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-[#588157]" />
              Authoritative Daily Metrics Table (daily_metrics)
            </h3>
            <p className="text-xs text-[#78716C]">
              Idempotent daily aggregations derived from work sessions, tasks, and telemetry
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#78716C]">Filter Employee:</span>
            <select
              value={selectedEmployeeFilter}
              onChange={(e) => setSelectedEmployeeFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-[#DDD5C5] bg-white text-xs font-semibold text-[#1C1917] cursor-pointer"
            >
              <option value="all">All Employees</option>
              {weeklyMetrics.map((wm) => (
                <option key={wm.employee_id} value={wm.employee_id}>
                  {wm.employee_name} ({wm.employee_department})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#E8E2D5] text-[11px] uppercase tracking-wider text-[#78716C]">
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-3">Employee</th>
                <th className="py-3 px-3 text-right">Working Hours</th>
                <th className="py-3 px-3 text-right">Active Focus</th>
                <th className="py-3 px-3 text-right">Idle Time</th>
                <th className="py-3 px-3 text-right">Overtime (&gt;8h)</th>
                <th className="py-3 px-3 text-right">Task Completion</th>
                <th className="py-3 px-3 text-right">Productivity</th>
                <th className="py-3 px-3 text-center">Leave Days</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E8E2D5]">
              {filteredDailyMetrics.map((dm) => (
                <tr key={dm.id} className="hover:bg-[#FAF9F5] transition-colors">
                  <td className="py-3 px-3 font-mono font-semibold text-[#1C1917]">
                    {dm.date}
                  </td>
                  <td className="py-3 px-3">
                    <span className="font-bold text-[#1C1917]">{dm.employee_name}</span>
                    <span className="text-[10px] text-[#78716C] block">{dm.employee_department}</span>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#1C1917]">
                    {dm.working_hours.toFixed(2)}h
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#2D4A36]">
                    {dm.active_hours.toFixed(2)}h
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#856404]">
                    {dm.idle_hours.toFixed(2)}h
                  </td>
                  <td className="py-3 px-3 text-right font-mono">
                    {dm.overtime_hours > 0 ? (
                      <span className="font-bold text-[#DC2626]">+{dm.overtime_hours.toFixed(2)}h</span>
                    ) : (
                      <span className="text-[#A3B18A]">0.00h</span>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right font-mono text-[#2D4A36]">
                    {dm.task_completion_rate.toFixed(1)}%
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-[#1C1917]">
                    {dm.productivity_score.toFixed(1)}
                  </td>
                  <td className="py-3 px-3 text-center font-mono text-[#78716C]">
                    {dm.leave_days_taken}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Modal: 15 Model-Compatible Features Inspector */}
      <Modal
        isOpen={isFeaturesModalOpen}
        onClose={() => setIsFeaturesModalOpen(false)}
        title={inspectedFeatures ? `${inspectedFeatures.metadata.employee_name} — Model Feature Inspector` : 'Model Features'}
        subtitle="Verification of the 15 exact features required by the Random Forest pipeline (Phase 8 Preparation)"
        maxWidth="lg"
        footer={
          <div className="flex items-center justify-between w-full">
            <span className="text-xs text-[#78716C] flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#588157]" />
              Exact feature names verified • Random Forest model remains frozen
            </span>
            <Button variant="primary" size="sm" onClick={() => setIsFeaturesModalOpen(false)}>
              Close Inspector
            </Button>
          </div>
        }
      >
        {isLoadingFeatures || !inspectedFeatures ? (
          <div className="py-12 text-center text-xs text-[#78716C]">
            Extracting features from aggregation layer...
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#EBF1ED] border border-[#A3B18A] flex items-center justify-between text-xs text-[#2D4A36]">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                <span>
                  <strong>15 / 15 Objective Features Ready:</strong> Verified compatible with <code>ColumnTransformer</code> pipeline.
                </span>
              </div>
              <Badge variant="forest" size="sm">Pre-ML Verified</Badge>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              {Object.entries(inspectedFeatures.features).map(([featKey, featVal]) => {
                const isSpecial = featKey === 'Deadline_Pressure' || featKey === 'Productivity_Score';

                return (
                  <div
                    key={featKey}
                    className={`p-3 rounded-xl border flex items-center justify-between ${
                      isSpecial
                        ? 'bg-[#FAF8F2] border-[#2D4A36] ring-1 ring-[#2D4A36]/30'
                        : 'bg-white border-[#DDD5C5]'
                    }`}
                  >
                    <div>
                      <span className="font-mono font-bold text-[#1C1917] block">
                        {featKey}
                      </span>
                      {featKey === 'Deadline_Pressure' && (
                        <span className="text-[10px] text-[#588157]">
                          ✓ Exact name preserved (1–10 scale)
                        </span>
                      )}
                      {featKey === 'Productivity_Score' && (
                        <span className="text-[10px] text-[#588157]">
                          ✓ Model input contract [35–100]
                        </span>
                      )}
                    </div>
                    <span className="font-mono font-extrabold text-sm text-[#2D4A36] px-2 py-0.5 rounded-md bg-[#FBF9F4] border border-[#E8E2D5]">
                      {typeof featVal === 'number' ? (Number.isInteger(featVal) ? featVal : featVal.toFixed(2)) : String(featVal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
