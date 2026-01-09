import { useState } from 'react';
import { Position } from '../types';
import { POSITIONS } from '../constants';
import { cn } from '../lib/utils';
import { Check, X } from 'lucide-react';

interface PositionSelectionModalProps {
  onSelect: (position: Position) => void;
  onClose: () => void;
}

const POSITION_LABELS: Record<Position, string> = {
  P: 'Pitcher',
  C: 'Catcher',
  '1B': 'First Base',
  '2B': 'Second Base',
  SS: 'Shortstop',
  '3B': 'Third Base',
  LF: 'Left Field',
  CF: 'Center Field',
  RF: 'Right Field',
};

export default function PositionSelectionModal({ onSelect, onClose }: PositionSelectionModalProps) {
  const [selectedPosition, setSelectedPosition] = useState<Position | null>(null);

  const handleConfirm = () => {
    if (selectedPosition) {
      onSelect(selectedPosition);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-card rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-card-foreground">Select Position</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-secondary transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Instructions */}
        <p className="text-sm text-muted-foreground mb-4 text-center">
          Choose a position to practice
        </p>

        {/* Position Grid */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {POSITIONS.map((position) => {
            const isSelected = selectedPosition === position;
            return (
              <button
                key={position}
                onClick={() => setSelectedPosition(position)}
                className={cn(
                  'relative rounded-xl p-4 transition-all duration-200 active:scale-95',
                  'flex flex-col items-center justify-center gap-1 min-h-[80px]',
                  'border-2',
                  isSelected
                    ? 'bg-primary/10 border-primary'
                    : 'bg-card border-border hover:border-primary/30',
                )}
              >
                {isSelected && (
                  <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
                <span className={cn('text-xl font-bold', isSelected ? 'text-primary' : 'text-card-foreground')}>
                  {position}
                </span>
                <span className="text-xs text-muted-foreground">{POSITION_LABELS[position]}</span>
              </button>
            );
          })}
        </div>

        {/* Confirm Button */}
        <button
          onClick={handleConfirm}
          disabled={!selectedPosition}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start Quiz
        </button>
      </div>
    </div>
  );
}
