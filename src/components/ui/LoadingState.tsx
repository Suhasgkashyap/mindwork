import React from 'react';
import { LeafIcon } from './BotanicalDecor';

export const LoadingState: React.FC<{ message?: string; className?: string }> = ({
  message = 'Gathering workplace telemetry...',
  className = '',
}) => (
  <div className={`flex flex-col items-center justify-center p-12 text-center ${className}`}>
    <div className="relative flex items-center justify-center mb-4">
      <div className="w-12 h-12 rounded-full border-3 border-[#D1E0D5] border-t-[#2D4A36] animate-spin" />
      <div className="absolute">
        <LeafIcon size={18} className="text-[#4A6B53]" />
      </div>
    </div>
    <p className="text-sm font-medium text-[#44403C]">{message}</p>
    <p className="text-xs text-[#78716C] mt-1">Calibrating indicators in real-time</p>
  </div>
);

export const EmptyState: React.FC<{
  title: string;
  description: string;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}> = ({ title, description, icon, action, className = '' }) => (
  <div
    className={`flex flex-col items-center justify-center p-10 sm:p-14 text-center rounded-2xl border border-dashed border-[#DDD5C5] bg-[#FAF8F2] ${className}`}
  >
    <div className="w-14 h-14 rounded-2xl bg-[#EBF1ED] text-[#2D4A36] flex items-center justify-center mb-4 shadow-sm">
      {icon || <LeafIcon size={26} />}
    </div>
    <h4 className="text-base sm:text-lg font-bold text-[#1C1917]">{title}</h4>
    <p className="text-xs sm:text-sm text-[#78716C] max-w-sm mt-1.5 mb-5 leading-relaxed">
      {description}
    </p>
    {action && <div>{action}</div>}
  </div>
);
