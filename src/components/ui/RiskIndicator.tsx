import React from 'react';
import { RiskLevel } from '../../types';
import { ShieldAlert, ShieldCheck, AlertTriangle } from 'lucide-react';

interface RiskIndicatorProps {
  level: RiskLevel;
  probLow?: number;
  probMed?: number;
  probHigh?: number;
  continuousScore?: number;
  compact?: boolean;
  className?: string;
}

export const RiskIndicator: React.FC<RiskIndicatorProps> = ({
  level,
  probLow = 0.72,
  probMed = 0.25,
  probHigh = 0.03,
  continuousScore,
  compact = false,
  className = '',
}) => {
  const config = {
    Low: {
      color: '#16A34A',
      bg: '#F0FDF4',
      border: '#BBF7D0',
      text: '#166534',
      label: 'Low Burnout Risk',
      sublabel: 'Sustainable workload equilibrium',
      icon: ShieldCheck,
      barWidth: '22%',
    },
    Medium: {
      color: '#CA8A04',
      bg: '#FEFCE8',
      border: '#FEF08A',
      text: '#854D0E',
      label: 'Moderate Burnout Risk',
      sublabel: 'Workload strain detected; monitor boundaries',
      icon: AlertTriangle,
      barWidth: '58%',
    },
    High: {
      color: '#DC2626',
      bg: '#FEF2F2',
      border: '#FECACA',
      text: '#991B1B',
      label: 'High Burnout Risk',
      sublabel: 'Sustained overtime or deadline compression',
      icon: ShieldAlert,
      barWidth: '88%',
    },
  }[level];

  const Icon = config.icon;

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${className}`}
        style={{
          backgroundColor: config.bg,
          borderColor: config.border,
          color: config.text,
        }}
      >
        <Icon className="w-3.5 h-3.5" style={{ color: config.color }} />
        <span>{config.label}</span>
      </div>
    );
  }

  return (
    <div
      className={`p-4.5 rounded-2xl border transition-all ${className}`}
      style={{
        backgroundColor: config.bg,
        borderColor: config.border,
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
            style={{ backgroundColor: 'white' }}
          >
            <Icon className="w-5 h-5" style={{ color: config.color }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-base text-[#1C1917]">{config.label}</h4>
              {continuousScore !== undefined && (
                <span
                  className="text-[11px] px-2 py-0.5 rounded-md font-medium border"
                  style={{
                    backgroundColor: 'white',
                    borderColor: config.border,
                    color: config.text,
                  }}
                  title="Application-Derived Presentation Score: UI presentation index (0–100) calculated from soft probability distribution. Not a direct Random Forest output."
                >
                  Application-Derived Presentation Score: <span className="font-mono font-bold">{continuousScore}/100</span>
                </span>
              )}
            </div>
            <p className="text-xs text-[#78716C] mt-0.5">{config.sublabel}</p>
          </div>
        </div>
      </div>

      {/* Probability Distribution Bar */}
      <div className="mt-3.5 pt-3 border-t border-[#E7E1D2]/60">
        <div className="flex items-center justify-between text-xs text-[#57534E] mb-1.5 font-medium">
          <span>Random Forest Soft Probability Distribution</span>
          <span className="font-mono text-[11px] text-[#78716C]">
            Low {(probLow * 100).toFixed(0)}% • Med {(probMed * 100).toFixed(0)}% • High {(probHigh * 100).toFixed(0)}%
          </span>
        </div>
        <div className="h-2.5 w-full bg-[#E7E1D2] rounded-full overflow-hidden flex shadow-inner">
          <div
            className="h-full bg-[#16A34A] transition-all duration-500"
            style={{ width: `${Math.max(2, probLow * 100)}%` }}
            title={`P(Low): ${(probLow * 100).toFixed(1)}%`}
          />
          <div
            className="h-full bg-[#EAB308] transition-all duration-500"
            style={{ width: `${Math.max(2, probMed * 100)}%` }}
            title={`P(Med): ${(probMed * 100).toFixed(1)}%`}
          />
          <div
            className="h-full bg-[#DC2626] transition-all duration-500"
            style={{ width: `${Math.max(2, probHigh * 100)}%` }}
            title={`P(High): ${(probHigh * 100).toFixed(1)}%`}
          />
        </div>
      </div>
    </div>
  );
};
