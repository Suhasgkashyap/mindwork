import React, { useState, useEffect } from 'react';
import { User, BurnoutPrediction } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Badge, RiskBadge } from '../ui/Badge';
import { LoadingState } from '../ui/LoadingState';
import {
  HeartPulse,
  ShieldCheck,
  CheckCircle2,
  Sliders,
  Clock,
  Briefcase,
  AlertCircle
} from 'lucide-react';

interface EmployeeBurnoutViewProps {
  currentUser: User;
}

export const EmployeeBurnoutView: React.FC<EmployeeBurnoutViewProps> = ({ currentUser }) => {
  const [prediction, setPrediction] = useState<BurnoutPrediction | null>(null);
  const [employeeFeatures, setEmployeeFeatures] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'demo' | 'live'>('demo');

  const employeeId = currentUser.employee_id || currentUser.id;

  const fetchPredictionAndFeatures = async (isDemo: number) => {
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Fetch own prediction
      const res = await fetch(`/api/burnout/predictions/${employeeId}?is_demo_seed=${isDemo}`, { headers });
      const data = await res.json();
      if (data.success && data.prediction) {
        setPrediction(data.prediction);
      } else {
        setPrediction(null);
      }

      // 2. Fetch own 15 model features
      const featRes = await fetch(`/api/metrics/model-features/${employeeId}?is_demo_seed=${isDemo}`, { headers });
      const featData = await featRes.json();
      if (featData.success) {
        setEmployeeFeatures(featData.features);
      }
    } catch (err) {
      console.error('Failed to load employee burnout prediction:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictionAndFeatures(activeTab === 'demo' ? 1 : 0);
  }, [employeeId, activeTab]);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#2D4A36] via-[#355840] to-[#436A4F] text-[#FAF7F0] p-6 sm:p-8 shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="forest" size="sm" dot>
                Employee Work-Pattern Telemetry
              </Badge>
              <span className="text-xs font-medium text-[#A3B18A] tracking-wide">
                Private Insights: <strong className="text-white">{currentUser.name}</strong> • {currentUser.department} Department
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              My Burnout & Workload Insights
            </h1>
            <p className="text-sm text-[#D8E2DC] leading-relaxed">
              Objective workplace patterns analyzed through MindWork&apos;s verified Random Forest model. Evaluates workload volume and pacing to assist healthy work habits.
            </p>
          </div>

          {/* Data Scope Toggle */}
          <div className="bg-[#1E3525] p-1 rounded-xl flex items-center border border-[#A3B18A]/30 shrink-0">
            <button
              onClick={() => setActiveTab('demo')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'demo'
                  ? 'bg-[#FAF7F0] text-[#2D4A36] shadow-sm'
                  : 'text-[#D8E2DC] hover:text-white'
              }`}
            >
              Demo Baseline
            </button>
            <button
              onClick={() => setActiveTab('live')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'live'
                  ? 'bg-[#FAF7F0] text-[#2D4A36] shadow-sm'
                  : 'text-[#D8E2DC] hover:text-white'
              }`}
            >
              Live Telemetry
            </button>
          </div>
        </div>
      </div>

      {/* Prominent Non-Clinical Disclaimer Banner */}
      <div className="rounded-2xl border-2 border-[#E0D9C8] bg-[#FAF7F0] p-4.5 flex items-start gap-3.5 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-[#2D4A36] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#2D4A36]">
              Operational Early-Warning Tool • Privacy-Preserving
            </h3>
            <Badge variant="neutral" size="sm">Non-Clinical</Badge>
          </div>
          <p className="text-xs text-[#57534E] leading-relaxed font-medium">
            MindWork is an operational workload-pattern early warning tool. It is not a clinical or psychological diagnostic system. The model provides statistical risk estimates, not safety guarantees. Only metadata (durations and app names) are evaluated—no keystrokes or private messages are ever captured.
          </p>
        </div>
      </div>

      {isLoading ? (
        <Card padding="lg">
          <LoadingState message="Loading your work-pattern assessment..." />
        </Card>
      ) : !prediction ? (
        <Card padding="lg" className="text-center py-12">
          <HeartPulse className="w-12 h-12 text-[#A3B18A] mx-auto mb-3 opacity-60" />
          <h3 className="font-bold text-base text-[#1C1917] mb-1">
            No Assessment Generated for Current Window
          </h3>
          <p className="text-xs text-[#78716C] max-w-md mx-auto mb-4">
            {activeTab === 'live'
              ? 'Complete authoritative work sessions or stopwatch tasks to generate your live workload assessment.'
              : 'Demo baseline assessment is currently being evaluated.'}
          </p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Column (2 cols) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Primary Risk Status Card */}
            <Card padding="md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E0D9C8]">
                <div>
                  <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider block">
                    Authoritative ML Risk Classification
                  </span>
                  <div className="flex items-center gap-3 mt-1.5">
                    <RiskBadge risk={prediction.predicted_risk} size="md" />
                    <div>
                      <p className="text-xs font-semibold text-[#1C1917]">
                        Window: 7-Day Aggregation ({prediction.calculation_date})
                      </p>
                      <p className="text-[11px] text-[#78716C]">
                        Derived from verified Random Forest pipeline
                      </p>
                    </div>
                  </div>
                </div>

                <div className="sm:text-right">
                  <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider block">
                    Application-Derived Presentation Score
                  </span>
                  <div className="flex items-baseline sm:justify-end gap-1 mt-1">
                    <span className="text-2xl font-extrabold font-mono text-[#1C1917]">
                      {prediction.continuous_risk_score.toFixed(1)}
                    </span>
                    <span className="text-xs text-[#78716C]">/ 100</span>
                  </div>
                  <span className="text-[10px] text-[#78716C]">
                    Presentation aid derived from probabilities
                  </span>
                </div>
              </div>

              {/* Class Probabilities */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-[#1C1917]">
                  <span>Statistical Probability Vector:</span>
                  <div className="flex items-center gap-4 font-mono">
                    <span className="text-[#16A34A]">Low: {(prediction.prob_low * 100).toFixed(1)}%</span>
                    <span className="text-[#D97706]">Med: {(prediction.prob_med * 100).toFixed(1)}%</span>
                    <span className="text-[#DC2626]">High: {(prediction.prob_high * 100).toFixed(1)}%</span>
                  </div>
                </div>

                <div className="h-3 w-full bg-[#E5E0D8] rounded-full overflow-hidden flex">
                  <div
                    style={{ width: `${prediction.prob_low * 100}%` }}
                    className="bg-[#16A34A] h-full transition-all"
                    title={`Low: ${(prediction.prob_low * 100).toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${prediction.prob_med * 100}%` }}
                    className="bg-[#D97706] h-full transition-all"
                    title={`Medium: ${(prediction.prob_med * 100).toFixed(1)}%`}
                  />
                  <div
                    style={{ width: `${prediction.prob_high * 100}%` }}
                    className="bg-[#DC2626] h-full transition-all"
                    title={`High: ${(prediction.prob_high * 100).toFixed(1)}%`}
                  />
                </div>
              </div>
            </Card>

            {/* Contributing Factors & Recommendations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card padding="md">
                <CardHeader
                  title="Key Work-Pattern Drivers"
                  subtitle="Objective patterns identified in your 7-day data"
                  icon={<Sliders className="w-4 h-4 text-[#588157]" />}
                />
                <ul className="space-y-2 text-xs text-[#57534E] mt-3">
                  {(prediction.top_contributing_factors || []).map((factor, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#2D4A36] font-bold text-sm leading-none">•</span>
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </Card>

              <Card padding="md">
                <CardHeader
                  title="Workplace Recommendations"
                  subtitle="Operational habits for sustainable delivery"
                  icon={<CheckCircle2 className="w-4 h-4 text-[#2D4A36]" />}
                />
                <ul className="space-y-2 text-xs text-[#1C1917] mt-3">
                  {(prediction.recommendations || []).map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-[#2D4A36] font-bold text-sm leading-none">•</span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>

          {/* Right Column (1 col): Verified 15 Feature Telemetry */}
          <div className="space-y-6">
            <Card padding="md">
              <CardHeader
                title="My 15 Telemetry Features"
                subtitle="Aggregated 7-day metrics fed into pipeline"
                icon={<Briefcase className="w-4 h-4 text-[#2D4A36]" />}
              />

              {employeeFeatures ? (
                <div className="space-y-2 text-xs text-[#57534E] mt-3 divide-y divide-[#E0D9C8]">
                  <div className="flex justify-between py-1.5">
                    <span>Working Hours / Day:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      {employeeFeatures.Working_Hours_Per_Day}h
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span>Overtime Hours / Week:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      +{employeeFeatures.Overtime_Hours_Per_Week}h
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span>Deadline Pressure:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      {employeeFeatures.Deadline_Pressure} / 10
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span>Workload Level:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      {employeeFeatures.Workload_Level} / 10
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span>Productivity Score:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      {employeeFeatures.Productivity_Score} / 100
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span>Active Focus Hours:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      {employeeFeatures.Active_Work_Hours}h
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span>Task Completion Rate:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      {employeeFeatures.Task_Completion_Rate}%
                    </span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span>Assigned Sprint Tasks:</span>
                    <span className="font-mono font-bold text-[#1C1917]">
                      {employeeFeatures.Assigned_Tasks}
                    </span>
                  </div>
                </div>
              ) : null}
            </Card>

            {/* Privacy Guarantee Card */}
            <Card padding="md" variant="flat" className="border-[#DDD5C5]">
              <div className="space-y-1.5 text-xs">
                <span className="font-bold text-[#2D4A36] block">
                  Confidential & Non-Clinical:
                </span>
                <p className="text-[#57534E] leading-relaxed text-[11px]">
                  This assessment is an operational work-habit indicator. You are in control of your work pacing and breaks. Team managers review aggregate pacing to adjust workload and deadlines reasonably.
                </p>
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};
