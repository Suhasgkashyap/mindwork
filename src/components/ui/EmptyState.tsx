import React from 'react';
import { Card } from './Card';
import { Button } from './Button';
import { MindfulPlantIllustration } from './BotanicalDecor';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  actionLabel,
  onAction,
  icon,
}) => {
  return (
    <Card padding="lg" className="text-center py-12 px-6 flex flex-col items-center justify-center">
      <div className="w-16 h-16 rounded-3xl bg-[#EBF1ED] border border-[#D1E0D5] flex items-center justify-center mb-4 text-[#2D4A36] shadow-xs">
        {icon || <MindfulPlantIllustration className="w-9 h-9" />}
      </div>
      <h3 className="font-extrabold text-base text-[#1C1917] tracking-tight mb-1">{title}</h3>
      <p className="text-xs text-[#78716C] max-w-md leading-relaxed mb-5">{description}</p>
      {actionLabel && onAction && (
        <Button variant="forest" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </Card>
  );
};
