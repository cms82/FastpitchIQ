import { ReactNode } from 'react';
import { cn } from '../lib/utils';
import { Target, Globe, BarChart3 } from 'lucide-react';

interface PrimaryActionCardProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  onClick: () => void;
  variant?: 'default' | 'secondary';
  disabled?: boolean;
}

export default function PrimaryActionCard({
  title,
  description,
  icon,
  onClick,
  variant = 'default',
  disabled = false,
}: PrimaryActionCardProps) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-full rounded-2xl p-5 text-left transition-all duration-200 active:scale-[0.98]',
        'flex items-center gap-4 min-h-[80px]',
        'shadow-sm border',
        variant === 'default' && 'bg-card border-border hover:border-primary/30 hover:shadow-md',
        variant === 'secondary' && 'bg-secondary border-transparent hover:bg-secondary/80',
        disabled && 'opacity-50 cursor-not-allowed',
      )}
    >
      {icon && (
        <div
          className={cn(
            'flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center',
            variant === 'default' ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground',
          )}
        >
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-card-foreground text-lg">{title}</h3>
        {description && <p className="text-sm text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <svg
        className="w-5 h-5 text-muted-foreground flex-shrink-0"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
      </svg>
    </button>
  );
}
