import React from 'react';
import { FileText } from 'lucide-react';
import Button from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[#F5F5F7] flex items-center justify-center mb-5">
        {icon || <FileText className="w-8 h-8 text-[#A1A1A6]" />}
      </div>
      <h3 className="text-lg font-semibold text-[#1D1D1F]">{title}</h3>
      {description && (
        <p className="mt-2 text-[15px] text-[#6E6E73] max-w-sm">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button onClick={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
