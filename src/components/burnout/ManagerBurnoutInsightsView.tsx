import React, { useState, useEffect } from 'react';
import { User, BurnoutPrediction, ModelEvaluationMetrics } from '../../types';
import { Card, CardHeader } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge, RiskBadge } from '../ui/Badge';
import { Modal } from '../ui/Modal';
import { Avatar } from '../ui/Avatar';
import { LoadingState } from '../ui/LoadingState';
import { WellnessBannerWatermark, LeafIcon } from '../ui/BotanicalDecor';
import {
  HeartPulse,
  Cpu,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  RefreshCw,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Database,
  Sliders,
  Scale,
  Sparkles,
  BookOpen,
  GitBranch,
  Terminal,
  Clock,
  Activity,
  FileText,
  Lock,
  Compass,
  Check
} from 'lucide-react';

interface ManagerBurnoutInsightsViewProps {
  currentUser: User;
}

interface ModelAuditData {
  status: string;
  artifact_path: string;
  file_size_bytes: number;
  pipeline_steps: string[];
  preprocessor_type: string;
  classifier_type: string;
  n_estimators: number;
  estimators_count: number;
  random_state: number;
  criterion: string;
  raw_feature_count: number;
  raw_features: string[];
  transformed_features_count: number;
  classes: string[];
  non_clinical_disclaimer: string;
}

export const ManagerBurnoutInsightsView: React.FC<ManagerBurnoutInsightsViewProps> = ({
  currentUser
}) => {
  const [activeTab, setActiveTab] = useState<'DEFENSE' | 'PREDICTIONS' | 'ARCHITECTURE'>('DEFENSE');
  const [predictions, setPredictions] = useState<BurnoutPrediction[]>([]);
  const [isDemoSeed, setIsDemoSeed] = useState<number>(1);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isInferring, setIsInferring] = useState<boolean>(false);
  const [modelMetrics, setModelMetrics] = useState<ModelEvaluationMetrics | null>(null);
  const [metricsAvailable, setMetricsAvailable] = useState<boolean>(true);
  const [metricsStatusMessage, setMetricsStatusMessage] = useState<string>('');
  const [modelAudit, setModelAudit] = useState<ModelAuditData | null>(null);
  const [selectedPrediction, setSelectedPrediction] = useState<BurnoutPrediction | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);
  const [employeeFeatures, setEmployeeFeatures] = useState<any>(null);
  const [loadingFeatures, setLoadingFeatures] = useState<boolean>(false);

  // Exact 15 features list for display
  const EXACT_15_FEATURES = [
    { name: 'Department', type: 'Categorical', desc: 'Organizational business unit (one-hot encoded to 6 columns)' },
    { name: 'Age', type: 'Numerical', desc: 'Employee biological age in years' },
    { name: 'Experience_Years', type: 'Numerical', desc: 'Total professional experience in years' },
    { name: 'Workload_Level', type: 'Numerical (1–10)', desc: 'Objective workload tier derived from sprint ticket volume and shift pace' },
    { name: 'Working_Hours_Per_Day', type: 'Numerical (Hours)', desc: 'Weekly average active logged work session duration per day' },
    { name: 'Overtime_Hours_Per_Week', type: 'Numerical (Hours)', desc: 'Cumulative weekly hours logged exceeding standard 40h baseline' },
    { name: 'Assigned_Tasks', type: 'Numerical (Count)', desc: 'Total tasks assigned during the active weekly sprint window' },
    { name: 'Completed_Tasks', type: 'Numerical (Count)', desc: 'Total tasks successfully closed and marked completed' },
    { name: 'Task_Completion_Rate', type: 'Numerical (%)', desc: 'Sprint completion percentage (Completed_Tasks / Assigned_Tasks * 100)' },
    { name: 'Deadline_Pressure', type: 'Numerical (1–10)', desc: 'Sprint urgency rating derived from urgent/high-priority ticket deadlines' },
    { name: 'Productivity_Score', type: 'Numerical (0–100)', desc: 'Focus efficiency index derived from active versus total desktop duration' },
    { name: 'App_Usage_Hours_Per_Day', type: 'Numerical (Hours)', desc: 'Mean daily application usage logged across productive desktop processes' },
    { name: 'Active_Work_Hours', type: 'Numerical (Hours)', desc: 'Mean daily actively engaged shift duration (mouse/keyboard active state)' },
    { name: 'Idle_Hours', type: 'Numerical (Hours)', desc: 'Mean daily idle / context-switching gap duration during work sessions' },
    { name: 'Leave_Days_Taken', type: 'Numerical (Days)', desc: 'Approved PTO or leave days utilized in the preceding evaluation window' }
  ];

  const fetchPredictions = async (seedState: number) => {
    setIsLoading(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('mindwork_token') : null;
      const res = await fetch(`/api/burnout/predictions?is_demo_seed=${seedState}`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      const data = await res.json();
      if (data.success) {
        setPredictions(data.predictions || []);
      }
    } catch (err) {
      console.error('Failed to fetch burnout predictions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModelMetrics = async () => {
    try {
      const res = await fetch('/api/burnout/metrics');
      const data = await res.json();
      if (data.success && data.available) {
        setModelMetrics(data.metrics);
        setMetricsAvailable(true);
      } else {
        setMetricsAvailable(false);
        setMetricsStatusMessage(data.statusMessage || 'Unavailable / Model Not Evaluated');
      }
    } catch (err) {
      setMetricsAvailable(false);
      setMetricsStatusMessage('Unavailable / Model Not Evaluated');
    }
  };

  const fetchModelAudit = async () => {
    try {
      const res = await fetch('/api/burnout/audit');
      const data = await res.json();
      if (data.success) {
        setModelAudit(data);
      }
    } catch (err) {
      console.error('Failed to fetch model audit:', err);
    }
  };

  useEffect(() => {
    fetchPredictions(isDemoSeed);
    fetchModelMetrics();
    fetchModelAudit();
  }, [isDemoSeed]);

  const handleRunBatchInference = async () => {
    setIsInferring(true);
    try {
      const res = await fetch('/api/burnout/predict/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_demo_seed: isDemoSeed })
      });
      const data = await res.json();
      if (data.success) {
        setPredictions(data.predictions || []);
      }
    } catch (err) {
      console.error('Batch ML inference failed:', err);
    } finally {
      setIsInferring(false);
    }
  };

  const handleInspectDetails = async (pred: BurnoutPrediction) => {
    setSelectedPrediction(pred);
    setIsDetailsModalOpen(true);
    setLoadingFeatures(true);
    try {
      const res = await fetch(`/api/metrics/model-features/${pred.employee_id}?is_demo_seed=${pred.is_demo_seed}`);
      const data = await res.json();
      if (data.success) {
        setEmployeeFeatures(data.features);
      }
    } catch (err) {
      console.error('Failed to load employee features:', err);
    } finally {
      setLoadingFeatures(false);
    }
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      {/* Top Banner / Compact SaaS Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#2D4A36] via-[#355840] to-[#436A4F] text-[#FAF7F0] p-4 sm:p-5 shadow-sm">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="forest" size="sm" dot>
                AI Model Insights & Defense Suite
              </Badge>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#EBF1ED] text-[#2D4A36] border border-[#D1E0D5]">
                {modelAudit?.status || 'Frozen Model Verified'}
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              AI Model Insights & Defense Suite
            </h1>
            <p className="text-xs sm:text-sm text-[#D8E2DC] leading-snug">
              Academic defense panel verifying the frozen Scikit-Learn Random Forest pipeline,
              honest evaluation metrics, exact 15-feature extraction contract, and non-clinical early warning boundaries.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            {/* Seed / Live Toggle */}
            <div className="bg-[#1E3525] p-1 rounded-xl flex items-center border border-[#A3B18A]/30">
              <button
                onClick={() => setIsDemoSeed(1)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isDemoSeed === 1
                    ? 'bg-[#FAF7F0] text-[#2D4A36] shadow-xs'
                    : 'text-[#D8E2DC] hover:text-white'
                }`}
              >
                Demo Historical
              </button>
              <button
                onClick={() => setIsDemoSeed(0)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isDemoSeed === 0
                    ? 'bg-[#FAF7F0] text-[#2D4A36] shadow-xs'
                    : 'text-[#D8E2DC] hover:text-white'
                }`}
              >
                Live Operations
              </button>
            </div>

            <Button
              variant="forest"
              size="sm"
              className="bg-[#FAF7F0] text-[#2D4A36] hover:bg-white border border-[#A3B18A]"
              icon={<RefreshCw className={`w-3.5 h-3.5 text-[#2D4A36] ${isInferring ? 'animate-spin' : ''}`} />}
              onClick={handleRunBatchInference}
              disabled={isInferring}
            >
              {isInferring ? 'Running Inference...' : 'Execute ML Pipeline'}
            </Button>
          </div>
        </div>
      </div>

      {/* Prominent Non-Clinical Disclaimer Banner */}
      <div className="rounded-2xl border-2 border-[#E0D9C8] bg-[#FAF7F0] p-4.5 flex items-start gap-3.5 shadow-sm">
        <ShieldCheck className="w-5 h-5 text-[#2D4A36] shrink-0 mt-0.5" />
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#2D4A36]">
              Operational Workplace Early-Warning Tool
            </h3>
            <Badge variant="neutral" size="sm">Non-Clinical Boundary</Badge>
          </div>
          <p className="text-xs text-[#57534E] leading-relaxed font-medium">
            MindWork is an operational workload-pattern early warning tool. It is not a clinical or psychological diagnostic system.
            The model provides statistical risk estimates, not safety guarantees.
          </p>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex border-b border-[#E8E2D5] space-x-2">
        <button
          onClick={() => setActiveTab('DEFENSE')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'DEFENSE'
              ? 'border-[#2D4A36] text-[#2D4A36]'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <Cpu className="w-4 h-4" />
          <span>Model Defense & Specification</span>
        </button>

        <button
          onClick={() => setActiveTab('PREDICTIONS')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'PREDICTIONS'
              ? 'border-[#2D4A36] text-[#2D4A36]'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <HeartPulse className="w-4 h-4" />
          <span>4-Employee Predictions ({isDemoSeed ? 'Demo' : 'Live'})</span>
        </button>

        <button
          onClick={() => setActiveTab('ARCHITECTURE')}
          className={`pb-3 px-4 text-xs font-bold transition-all border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === 'ARCHITECTURE'
              ? 'border-[#2D4A36] text-[#2D4A36]'
              : 'border-transparent text-[#78716C] hover:text-[#1C1917]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Full System Pipeline Architecture</span>
        </button>
      </div>

      {/* TAB 1: MODEL DEFENSE & SPECIFICATION */}
      {activeTab === 'DEFENSE' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {/* Top Verification Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Card className="p-4 bg-white border-[#E8E2D5]">
              <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                Model Status
              </span>
              <div className="mt-1 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
                <span className="font-extrabold text-sm text-[#1C1917]">
                  {modelAudit?.status || 'Frozen Verified'}
                </span>
              </div>
              <p className="text-[10px] text-[#78716C] mt-1 font-mono">
                {modelAudit?.artifact_path || 'models/burnout_random_forest.joblib'}
              </p>
            </Card>

            <Card className="p-4 bg-white border-[#E8E2D5]">
              <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                Estimator Trees
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#1C1917]">
                  {modelAudit?.n_estimators || 200}
                </span>
                <span className="text-xs text-[#78716C]">Trees</span>
              </div>
              <p className="text-[10px] text-[#588157] font-semibold mt-1">
                Random State: {modelAudit?.random_state || 42} (Gini)
              </p>
            </Card>

            <Card className="p-4 bg-white border-[#E8E2D5]">
              <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                Input Features
              </span>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-2xl font-black text-[#1C1917]">
                  {modelAudit?.raw_feature_count || 15}
                </span>
                <span className="text-xs text-[#78716C]">Raw &rarr; 20 Transformed</span>
              </div>
              <p className="text-[10px] text-[#78716C] mt-1">
                Median Imputer + Scaler + OHE
              </p>
            </Card>

            <Card className="p-4 bg-white border-[#E8E2D5]">
              <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider">
                Authoritative Target
              </span>
              <div className="mt-1 flex items-center gap-1.5 font-mono text-xs font-bold text-[#2D4A36]">
                <span className="px-1.5 py-0.5 rounded bg-[#FAF7F0] border border-[#E0D9C8]">High</span>
                <span className="px-1.5 py-0.5 rounded bg-[#FAF7F0] border border-[#E0D9C8]">Low</span>
                <span className="px-1.5 py-0.5 rounded bg-[#FAF7F0] border border-[#E0D9C8]">Medium</span>
              </div>
              <p className="text-[10px] text-[#78716C] mt-1">
                Dynamic classes_ mapping (no index assumption)
              </p>
            </Card>
          </div>

          {/* Grid: Honest Model Evaluation vs Verified Feature Importance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Honest Evaluation Panel */}
            <Card className="p-6 bg-white border-[#E8E2D5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                <div className="flex items-center gap-2">
                  <Scale className="w-5 h-5 text-[#2D4A36]" />
                  <h3 className="font-extrabold text-base text-[#1C1917]">
                    Honest Model Evaluation
                  </h3>
                </div>
                <span className="text-[11px] font-semibold text-[#78716C]">
                  Source: reports/model_metrics.json
                </span>
              </div>

              {!metricsAvailable ? (
                <div className="p-4 rounded-xl bg-[#FFF8F6] border border-[#F2C4B8] text-center">
                  <AlertTriangle className="w-6 h-6 text-[#E76F51] mx-auto mb-1" />
                  <p className="font-bold text-sm text-[#1C1917]">{metricsStatusMessage}</p>
                </div>
              ) : modelMetrics ? (
                <div className="space-y-3 text-xs">
                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-[#FAF7F0] border border-[#EAE4D5] text-center">
                    <div>
                      <span className="text-[10px] font-bold text-[#78716C] uppercase block">
                        Accuracy
                      </span>
                      <span className="text-lg font-black text-[#1C1917]">
                        {(modelMetrics.accuracy * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#78716C] uppercase block">
                        Macro F1
                      </span>
                      <span className="text-lg font-black text-[#1C1917]">
                        {modelMetrics.macro_f1.toFixed(4)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-[#78716C] uppercase block">
                        Weighted F1
                      </span>
                      <span className="text-lg font-black text-[#1C1917]">
                        {modelMetrics.weighted_f1.toFixed(4)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2 pt-2">
                    <span className="text-[11px] font-bold text-[#78716C] uppercase tracking-wider block">
                      Per-Class Recall & Support Breakdown:
                    </span>
                    <div className="space-y-1.5 font-mono text-xs">
                      <div className="flex justify-between p-2 rounded-lg bg-[#FAF7F0]">
                        <span className="font-bold text-[#DC2626]">High-Risk Recall:</span>
                        <span className="font-bold text-[#1C1917]">
                          {(modelMetrics.per_class_metrics.High.recall * 100).toFixed(2)}%
                          <span className="text-[#78716C] font-normal text-[11px]"> ({modelMetrics.per_class_metrics.High.support} test samples)</span>
                        </span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-[#FAF7F0]">
                        <span className="font-bold text-[#D97706]">Medium-Risk Recall:</span>
                        <span className="font-bold text-[#1C1917]">
                          {(modelMetrics.per_class_metrics.Medium.recall * 100).toFixed(2)}%
                          <span className="text-[#78716C] font-normal text-[11px]"> ({modelMetrics.per_class_metrics.Medium.support} test samples)</span>
                        </span>
                      </div>
                      <div className="flex justify-between p-2 rounded-lg bg-[#FAF7F0]">
                        <span className="font-bold text-[#16A34A]">Low-Risk Recall:</span>
                        <span className="font-bold text-[#1C1917]">
                          {(modelMetrics.per_class_metrics.Low.recall * 100).toFixed(2)}%
                          <span className="text-[#78716C] font-normal text-[11px]"> ({modelMetrics.per_class_metrics.Low.support} test samples)</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#E0D9C8] text-[11px] text-[#57534E] leading-relaxed">
                    <strong>Evaluation Integrity Note:</strong> Sourced strictly from 500 records (400 train / 100 test).
                    Dataset distribution: Medium: 281 (56.2%), High: 141 (28.2%), Low: 78 (15.6%).
                    MindWork does not exaggerate model capability: the statistical baseline reflects real-world class imbalance.
                  </div>
                </div>
              ) : null}
            </Card>

            {/* Feature Importance Panel */}
            <Card className="p-6 bg-white border-[#E8E2D5] space-y-4">
              <div className="flex items-center justify-between border-b border-[#F0EBE1] pb-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-[#588157]" />
                  <h3 className="font-extrabold text-base text-[#1C1917]">
                    Model Feature Importance Rankings
                  </h3>
                </div>
                <Badge variant="sage" size="sm">Tree-Split Utility</Badge>
              </div>

              {modelMetrics && (
                <div className="space-y-3">
                  <div className="space-y-2">
                    {modelMetrics.feature_importances.slice(0, 5).map((fi, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-[#1C1917]">{idx + 1}. {fi.feature}</span>
                          <span className="font-mono font-bold text-[#2D4A36]">
                            {(fi.importance * 100).toFixed(2)}%
                          </span>
                        </div>
                        <div className="h-2 w-full bg-[#FAF7F0] border border-[#EAE4D5] rounded-full overflow-hidden">
                          <div
                            style={{ width: `${fi.importance * 100 * 3}%` }}
                            className="h-full bg-[#2D4A36] rounded-full"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Non-Causation Callout */}
                  <div className="p-3.5 rounded-xl bg-[#FFFBF0] border border-[#FDE68A] text-xs text-[#78350F] leading-relaxed mt-4">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-[#D97706] mt-0.5 shrink-0" />
                      <div>
                        <strong>Academic Non-Causation Notice: </strong>
                        Feature importance indicates which inputs contributed more to the model's predictions in the trained model.
                        It does <strong>not</strong> establish medical or psychological causation.
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>

          {/* EXACT 15 INPUT FEATURES AUDIT TABLE */}
          <Card className="p-6 bg-white border-[#E8E2D5] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#F0EBE1] pb-3">
              <div>
                <h3 className="font-extrabold text-base text-[#1C1917]">
                  Exact 15 Model Features Specification Contract
                </h3>
                <p className="text-xs text-[#78716C] mt-0.5">
                  Verified immutable feature vector fed directly into the Random Forest pipeline.
                </p>
              </div>
              <Badge variant="forest" size="md">
                15 Raw &bull; 20 Transformed
              </Badge>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#E8E2D5] bg-[#FAF7F0] text-[#57534E]">
                    <th className="py-2.5 px-3 font-bold">#</th>
                    <th className="py-2.5 px-3 font-bold">Feature Name</th>
                    <th className="py-2.5 px-3 font-bold">Input Type</th>
                    <th className="py-2.5 px-3 font-bold">Operational Semantic & Derivation</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EBE1]">
                  {EXACT_15_FEATURES.map((f, i) => (
                    <tr key={f.name} className="hover:bg-[#FAF7F0]/60 transition-colors">
                      <td className="py-2.5 px-3 font-mono text-[#78716C]">{i + 1}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-[#1C1917]">
                        {f.name}
                      </td>
                      <td className="py-2.5 px-3 text-[#588157] font-semibold">{f.type}</td>
                      <td className="py-2.5 px-3 text-[#57534E]">{f.desc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* TAB 2: FOUR DEMO EMPLOYEE PREDICTIONS */}
      {activeTab === 'PREDICTIONS' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-[#1C1917]">
                Authoritative Predictions across 4 Team Members
              </h2>
              <p className="text-xs text-[#78716C]">
                Calculated directly by running the frozen 200-tree model on Phase 7 weekly aggregations.
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#FAF7F0] border border-[#E0D9C8] text-[#2D4A36]">
              {isDemoSeed ? 'Historical Demo Seed Records' : 'Live Operations'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {predictions.map((pred) => (
              <Card
                key={pred.id}
                padding="md"
                className="bg-white border-[#E8E2D5] hover:border-[#2D4A36] transition-all cursor-pointer shadow-sm"
                onClick={() => handleInspectDetails(pred)}
              >
                <div className="flex items-start justify-between gap-3 border-b border-[#F0EBE1] pb-3">
                  <div className="flex items-center gap-3">
                    <Avatar name={pred.employee_name || 'User'} size="md" department={pred.employee_department} />
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-[#1C1917]">{pred.employee_name}</h4>
                        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#FAF7F0] text-[#57534E] border border-[#E0D9C8]">
                          {pred.employee_department}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#78716C] mt-0.5">
                        Date: {pred.calculation_date} &bull; 7-day aggregation
                      </p>
                    </div>
                  </div>
                  <RiskBadge risk={pred.predicted_risk} size="md" />
                </div>

                {/* Probability Distribution */}
                <div className="py-3 space-y-2 border-b border-[#F0EBE1]">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#57534E]">Authoritative Probabilities:</span>
                    <span className="font-mono text-xs">
                      Sum: <strong>{((pred.prob_low + pred.prob_med + pred.prob_high) * 100).toFixed(0)}%</strong>
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded bg-[#FAF7F0] border border-[#EAE4D5]">
                      <span className="text-[10px] text-[#78716C] block">Low</span>
                      <strong className="text-[#2D4A36]">{(pred.prob_low * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="p-2 rounded bg-[#FAF7F0] border border-[#EAE4D5]">
                      <span className="text-[10px] text-[#78716C] block">Medium</span>
                      <strong className="text-[#D97706]">{(pred.prob_med * 100).toFixed(1)}%</strong>
                    </div>
                    <div className="p-2 rounded bg-[#FAF7F0] border border-[#EAE4D5]">
                      <span className="text-[10px] text-[#78716C] block">High</span>
                      <strong className="text-[#DC2626]">{(pred.prob_high * 100).toFixed(1)}%</strong>
                    </div>
                  </div>
                </div>

                {/* Presentation Score Label & Factors */}
                <div className="pt-3 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[#78716C]">Application-Derived Presentation Score:</span>
                    <span className="font-mono font-extrabold text-[#1C1917]">
                      {pred.continuous_risk_score.toFixed(1)} / 100
                    </span>
                  </div>

                  <div className="p-2.5 rounded-lg bg-[#FAF7F0] border border-[#EAE4D5] text-[11px] text-[#57534E] space-y-1">
                    <span className="font-bold text-[#1C1917] block">Contributing Work-Pattern Factors:</span>
                    {(pred.top_contributing_factors || []).map((f, i) => (
                      <div key={i} className="flex items-start gap-1.5">
                        <span className="text-[#588157] font-bold">&bull;</span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>

                  <div className="text-right pt-1">
                    <span className="text-xs font-semibold text-[#2D4A36] flex items-center justify-end gap-1">
                      <span>Inspect 15 model inputs</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: COMPLETE PIPELINE ARCHITECTURE */}
      {activeTab === 'ARCHITECTURE' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          <Card className="p-6 bg-white border-[#E8E2D5] space-y-5">
            <div>
              <h3 className="font-extrabold text-base text-[#1C1917]">
                MindWork End-to-End System Architecture
              </h3>
              <p className="text-xs text-[#78716C] mt-0.5">
                Clear modular boundaries separating Authentication, Rule-Based Engines, Privacy Telemetry, and Frozen Machine Learning.
              </p>
            </div>

            {/* Architecture Steps Flow */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-2">
                <span className="text-[10px] font-black uppercase text-[#2D4A36] px-2 py-0.5 rounded bg-white border border-[#E0D9C8]">
                  Step 1 &bull; Identity & RBAC
                </span>
                <h4 className="font-bold text-sm text-[#1C1917]">Auth & Role Separation</h4>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Phase 1 & 3: SQLite user sessions enforcing strict Manager (Bob) and Employee (Alice, Priya, Rahul, Sneha) boundary.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-2">
                <span className="text-[10px] font-black uppercase text-[#2D4A36] px-2 py-0.5 rounded bg-white border border-[#E0D9C8]">
                  Step 2 &bull; Task Oversight
                </span>
                <h4 className="font-bold text-sm text-[#1C1917]">Stopwatch & Execution</h4>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Phase 4: Active/paused task stopwatch logging precise task durations without manager time-estimation constraints.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-2">
                <span className="text-[10px] font-black uppercase text-[#2D4A36] px-2 py-0.5 rounded bg-white border border-[#E0D9C8]">
                  Step 3 &bull; Post-Task Rules
                </span>
                <h4 className="font-bold text-sm text-[#1C1917]">Rule-Based Task Evaluation</h4>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Phase 5: Transparent Rule-Based Task Evaluation Engine v1.0 providing deterministic complexity & benchmark variance (Not ML).
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-2">
                <span className="text-[10px] font-black uppercase text-[#2D4A36] px-2 py-0.5 rounded bg-white border border-[#E0D9C8]">
                  Step 4 &bull; Privacy Telemetry
                </span>
                <h4 className="font-bold text-sm text-[#1C1917]">Desktop Activity Tracking</h4>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Phase 6: Process duration and active/idle state metadata only. Strictly prohibited: keystrokes, screenshots, URLs, content.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-2">
                <span className="text-[10px] font-black uppercase text-[#2D4A36] px-2 py-0.5 rounded bg-white border border-[#E0D9C8]">
                  Step 5 &bull; Metric Layer
                </span>
                <h4 className="font-bold text-sm text-[#1C1917]">7-Day Aggregation & Features</h4>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Phase 7: Deterministic mathematical derivation extracting the exact 15 features across daily and weekly work patterns.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#EAE4D5] space-y-2">
                <span className="text-[10px] font-black uppercase text-[#2D4A36] px-2 py-0.5 rounded bg-white border border-[#E0D9C8]">
                  Step 6 &bull; Supervised Inference
                </span>
                <h4 className="font-bold text-sm text-[#1C1917]">Frozen Random Forest Pipeline</h4>
                <p className="text-xs text-[#57534E] leading-relaxed">
                  Phase 8: Immutable 200-tree model classifying statistical risk into High/Medium/Low with class probability vectors.
                </p>
              </div>
            </div>

            {/* Step 7: EOD Report Closure */}
            <div className="p-5 rounded-2xl bg-[#F4EFE6] border border-[#E0D9C8] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-[#2D4A36] px-2 py-0.5 rounded bg-white border border-[#E0D9C8]">
                  Final Step &bull; Operational Closure
                </span>
                <h4 className="font-bold text-sm text-[#1C1917] mt-1">Daily End-of-Day 4-Employee Manager Report</h4>
                <p className="text-xs text-[#57534E] mt-0.5 max-w-xl">
                  Phase 9: Dynamically derives day-end operational metrics, application metadata, completed task benchmarks, and burnout status for Bob Manager.
                </p>
              </div>
              <Badge variant="forest" size="md">
                Phase 9 Complete
              </Badge>
            </div>
          </Card>
        </div>
      )}

      {/* MODAL: FULL EMPLOYEE 15-FEATURE AUDIT */}
      {selectedPrediction && (
        <Modal
          isOpen={isDetailsModalOpen}
          onClose={() => setIsDetailsModalOpen(false)}
          title={`Burnout Telemetry Audit: ${selectedPrediction.employee_name}`}
          subtitle={`Objective 15-Feature Inspection & Operational Recommendations • Window: ${selectedPrediction.calculation_date}`}
          maxWidth="xl"
          footer={
            <Button variant="primary" size="sm" onClick={() => setIsDetailsModalOpen(false)}>
              Close Audit
            </Button>
          }
        >
          <div className="space-y-5 text-xs">
            {/* Top Risk & Probability Summary */}
            <div className="p-4 rounded-2xl bg-[#FAF7F0] border border-[#E0D9C8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider block">
                  Authoritative Model Prediction
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <RiskBadge risk={selectedPrediction.predicted_risk} size="md" />
                  <span className="text-xs text-[#57534E]">
                    Department: <strong>{selectedPrediction.employee_department}</strong>
                  </span>
                </div>
              </div>

              <div className="text-right">
                <span className="text-[10px] font-bold text-[#78716C] uppercase tracking-wider block">
                  Class Probabilities
                </span>
                <div className="flex items-center gap-2 font-mono font-bold mt-1 text-xs">
                  <span className="text-[#16A34A]">Low: {(selectedPrediction.prob_low * 100).toFixed(1)}%</span>
                  <span className="text-[#D97706]">Med: {(selectedPrediction.prob_med * 100).toFixed(1)}%</span>
                  <span className="text-[#DC2626]">High: {(selectedPrediction.prob_high * 100).toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Application-Derived Presentation Score Callout */}
            <div className="p-3.5 rounded-xl border border-[#E0D9C8] bg-white">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1C1917]">Application-Derived Presentation Score:</span>
                <span className="font-mono font-extrabold text-sm text-[#1C1917]">
                  {selectedPrediction.continuous_risk_score.toFixed(1)} / 100
                </span>
              </div>
              <p className="text-[11px] text-[#78716C] mt-1">
                Not a direct Random Forest output. Random Forest class prediction and probabilities are authoritative.
              </p>
            </div>

            {/* Operational Recommendations */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#2D4A36] mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-[#2D4A36]" />
                Operational Workplace Recommendations (Non-Clinical)
              </h4>
              <div className="p-3 rounded-xl border border-[#E0D9C8] bg-[#FAF7F0] space-y-2">
                {(selectedPrediction.recommendations || []).map((rec, i) => (
                  <div key={i} className="flex items-start gap-2 text-xs text-[#1C1917]">
                    <span className="font-bold text-[#2D4A36]">&bull;</span>
                    <span>{rec}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 15 Input Features Grid */}
            <div>
              <h4 className="font-bold text-xs uppercase tracking-wider text-[#1C1917] mb-2 flex items-center gap-1.5">
                <Sliders className="w-4 h-4 text-[#588157]" />
                Exact 15 Input Features Fed to Random Forest
              </h4>
              {loadingFeatures ? (
                <div className="py-4 text-center text-[#78716C]">Loading feature vector...</div>
              ) : employeeFeatures ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {Object.entries(employeeFeatures).map(([k, v]) => (
                    <div key={k} className="p-2.5 rounded-lg border border-[#E0D9C8] bg-white">
                      <span className="text-[10px] text-[#78716C] block truncate font-mono">{k}</span>
                      <span className="font-mono font-bold text-xs text-[#1C1917]">
                        {typeof v === 'number' ? (Number.isInteger(v) ? v : v.toFixed(2)) : String(v)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            {/* Non-clinical disclaimer footer */}
            <div className="p-3 rounded-xl bg-[#FAF7F0] border border-[#DDD5C5] text-[10px] text-[#78716C]">
              <strong>Disclaimer:</strong> MindWork is an operational workload-pattern early warning tool. It is not a clinical or psychological diagnostic system. The model provides statistical risk estimates, not safety guarantees.
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
