import React from 'react';

interface AvatarProps {
  name: string;
  role?: string;
  department?: string;
  color?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showStatus?: boolean;
  statusVariant?: 'active' | 'busy' | 'away';
  className?: string;
}

export const Avatar: React.FC<AvatarProps> = ({
  name,
  role,
  department,
  color = '#4A6B53',
  size = 'md',
  showStatus = false,
  statusVariant = 'active',
  className = '',
}) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  };

  const statusSizeMap = {
    sm: 'w-2 h-2 ring-1',
    md: 'w-2.5 h-2.5 ring-2',
    lg: 'w-3 h-3 ring-2',
    xl: 'w-4 h-4 ring-2',
  };

  const statusColorMap = {
    active: 'bg-[#16A34A]',
    busy: 'bg-[#DC2626]',
    away: 'bg-[#EAB308]',
  };

  // Get initials
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Pick deterministic palette tone
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    'Bob Manager': { bg: '#2D4A36', text: '#FAF7F0', border: '#1E3525' },
    Alice: { bg: '#DBEAFE', text: '#1E40AF', border: '#BFDBFE' },
    Priya: { bg: '#DCFCE7', text: '#166534', border: '#BBF7D0' },
    Rahul: { bg: '#FEF3C7', text: '#92400E', border: '#FDE68A' },
    Sneha: { bg: '#F3E8FF', text: '#6B21A8', border: '#E9D5FF' },
  };

  const theme = colorMap[name] || {
    bg: '#EBF1ED',
    text: '#2D4A36',
    border: '#D1E0D5',
  };

  return (
    <div className={`relative inline-flex shrink-0 ${className}`}>
      <div
        className={`${sizeMap[size]} rounded-2xl flex items-center justify-center font-semibold tracking-wider select-none border shadow-sm transition-transform hover:scale-105`}
        style={{
          backgroundColor: theme.bg,
          color: theme.text,
          borderColor: theme.border,
        }}
        title={`${name}${department ? ` (${department})` : ''}`}
      >
        <span>{initials}</span>
      </div>
      {showStatus && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 rounded-full ring-white ${statusSizeMap[size]} ${statusColorMap[statusVariant]}`}
        />
      )}
    </div>
  );
};
