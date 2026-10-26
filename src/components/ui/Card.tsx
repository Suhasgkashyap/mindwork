import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'default' | 'flat' | 'sunken' | 'accent' | 'forest';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'default',
  padding = 'md',
  className = '',
  ...props
}) => {
  const variantStyles = {
    default:
      'bg-white border border-[#E7E1D2] rounded-2xl shadow-[0_2px_8px_rgba(28,25,23,0.04)]',
    flat:
      'bg-[#FAF7F0] border border-[#E5DFD1] rounded-2xl',
    sunken:
      'bg-[#F3EFE6] border border-[#E0D9C8] rounded-2xl shadow-inner',
    accent:
      'bg-gradient-to-br from-[#FFFBF5] to-[#F7F2E7] border border-[#D9D0BE] rounded-2xl shadow-[0_4px_12px_rgba(45,74,54,0.06)]',
    forest:
      'bg-[#2D4A36] text-[#F5F2EB] border border-[#1E3525] rounded-2xl shadow-md',
  };

  const paddingStyles = {
    none: 'p-0',
    sm: 'p-3.5',
    md: 'p-5',
    lg: 'p-6 sm:p-7',
  };

  return (
    <div
      className={`${variantStyles[variant]} ${paddingStyles[padding]} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader: React.FC<{
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ title, subtitle, action, icon, className = '' }) => (
  <div className={`flex items-start justify-between gap-4 mb-4 ${className}`}>
    <div className="flex items-center gap-2.5">
      {icon && (
        <div className="w-9 h-9 rounded-xl bg-[#EBF1ED] text-[#2D4A36] flex items-center justify-center shrink-0">
          {icon}
        </div>
      )}
      <div>
        <h3 className="font-semibold text-base sm:text-lg text-[#1C1917] tracking-tight">
          {title}
        </h3>
        {subtitle && (
          <p className="text-xs sm:text-sm text-[#78716C] mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
    {action && <div className="shrink-0">{action}</div>}
  </div>
);
