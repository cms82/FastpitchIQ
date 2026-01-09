import { Scenario, GameMode } from '../types';
import { formatSituation } from '../utils/formatSituation';
import { cn } from '../lib/utils';

interface SituationHeaderProps {
  scenario: Scenario;
  mode: GameMode;
  learningMode?: boolean;
  role: string;
  questionType: 'primary' | 'fielderAction';
  progress: string;
  timerRemaining?: number;
  timerTotal?: number;
  showTimer?: boolean;
}

export default function SituationHeader({
  scenario,
  mode,
  learningMode,
  role,
  questionType,
  progress,
  timerRemaining,
  timerTotal,
  showTimer = true,
}: SituationHeaderProps) {
  const situationText = formatSituation(scenario);
  const modeLabel = mode === 'my_positions' ? 'My Positions' : 'Whole Field';
  const progressPercent = timerRemaining && timerTotal ? (timerRemaining / timerTotal) * 100 : 100;

  return (
    <div className="space-y-4">
      {/* Top bar with mode and progress */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-muted-foreground bg-secondary px-2.5 py-1 rounded-full">
          {modeLabel}
        </span>
        <span className="text-sm font-semibold text-card-foreground">
          {progress}
        </span>
      </div>

      {/* Timer bar */}
      {showTimer && timerRemaining !== undefined && timerTotal !== undefined && (
        <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className={cn(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-100",
              progressPercent > 30 ? "bg-yellow-500" : progressPercent > 10 ? "bg-yellow-500" : "bg-destructive",
            )}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* Situation text */}
      <div className="space-y-2">
        <h1 className="text-xl font-semibold text-card-foreground leading-tight text-balance">{situationText}</h1>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-card-foreground leading-tight">
            {mode === 'whole_field' ? (
              <>What does <span className="text-primary">{role}</span> do?</>
            ) : (
              <>You are <span className="text-primary">{role}</span></>
            )}
          </h2>
          {questionType === 'fielderAction' && (
            <span className="text-xs text-muted-foreground bg-secondary px-2 py-0.5 rounded">Throw decision</span>
          )}
        </div>
      </div>
    </div>
  );
}
