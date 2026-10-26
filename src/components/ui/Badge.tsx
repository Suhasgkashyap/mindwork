import React from 'react';
import { Priority, RiskLevel } from '../../types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'sage' | 'forest' | 'olive' | 'peach' | 'orange' | 'yellow' | 'blue' | 'coral' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
  dot?: boolean;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'sage',
  size = 'md',
  dot = false,
  className = '',
}) => {
  const variantStyles = {
    sage: 'bg-[#EBF2EC] text-[#2D5A37] border-[#D1E2D4]',
    forest: 'bg-[#2D4A36] text-[#F3EFE6] border-[#1F3526]',
    olive: 'bg-[#F2F4EC] text-[#4A5526] border-[#DCE2CD]',
    peach: 'bg-[#FFF2E8] text-[#C2410C] border-[#FED7AA]',
    orange: 'bg-[#FFEDD5] text-[#9A3412] border-[#FDBA74]',
    yellow: 'bg-[#FEFCE8] text-[#854D0E] border-[#FEF08A]',
    blue: 'bg-[#F0F9FF] text-[#0369A1] border-[#BAE6FD]',
    coral: 'bg-[#FEF2F2] text-[#B91C1C] border-[#FECACA]',
    neutral: 'bg-[#F5F2EB] text-[#57534E] border-[#E7E2D6]',
  };

  const sizeStyles = {
    sm: 'text-xs px-2 py-0.5',
    md: 'text-xs px-2.5 py-1',
    lg: 'text-sm px-3 py-1.5',
  };

  const dotColors = {
    sage: 'bg-[#4A7C59]',
    forest: 'bg-[#84A98C]',
    olive: 'bg-[#606C38]',
    peach: 'bg-[#F97316]',
    orange: 'bg-[#EA580C]',
    yellow: 'bg-[#EAB308]',
    blue: 'bg-[#0284C7]',
    coral: 'bg-[#DC2626]',
    neutral: 'bg-[#78716C]',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border transition-colors ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors[variant]}`} />}
      {children}
    </span>
  );
};

export const PriorityBadge: React.FC<{ priority: Priority; size?: 'sm' | 'md' }> = ({
  priority,
  size = 'md',
}) => {
  switch (priority) {
    case 'Low':
      return <Badge variant="olive" size={size} dot>Low Priority</Badge>;
    case 'Medium':
      return <Badge variant="blue" size={size} dot>Medium Priority</Badge>;
    case 'High':
      return <Badge variant="peach" size={size} dot>High Priority</Badge>;
    case 'Urgent':
      return <Badge variant="coral" size={size} dot>Urgent Priority</Badge>;
    default:
      return <Badge variant="neutral" size={size}>{priority}</Badge>;
  }
};

export const RiskBadge: React.FC<{ risk: RiskLevel; size?: 'sm' | 'md' }> = ({
  risk,
  size = 'md',
}) => {
  switch (risk) {
    case 'Low':
      return <Badge variant="sage" size={size} dot>Low Burnout Risk</Badge>;
    case 'Medium':
      return <Badge variant="yellow" size={size} dot>Moderate Risk</Badge>;
    case 'High':
      return <Badge variant="coral" size={size} dot>High Burnout Risk</Badge>;
    default:
      return <Badge variant="neutral" size={size}>{risk}</Badge>;
  }
};
