import { Prompt, Scenario } from '../types';
import { intentLabels } from '../constants';
import { cn } from '../lib/utils';
import { Check, X } from 'lucide-react';

interface FeedbackOverlayProps {
  prompt: Prompt;
  scenario: Scenario;
  correct: boolean;
  selectedAnswer: string | null;
  onContinue: () => void;
}

export default function FeedbackOverlay({
  prompt,
  scenario,
  correct,
  onContinue,
}: FeedbackOverlayProps) {
  const roleDef = scenario.roles[prompt.role];
  const correctLabel = intentLabels[prompt.correctAnswer];
  
  // Format target for display - convert technical values to readable text
  const formatTarget = (target: string): string => {
    if (!target) return '';
    
    // Handle special target values
    if (target === 'THROW_TO_2B') return 'the throw to 2B';
    if (target === 'THROW_TO_1B') return 'the throw to 1B';
    if (target === 'THROW_TO_3B') return 'the throw to 3B';
    if (target === 'THROW_TO_HOME') return 'the throw to home';
    if (target === 'CIRCLE') return 'the circle';
    if (target === 'BALL') return 'the ball';
    
    // Base positions are already readable (1B, 2B, 3B, HOME, etc.)
    return target.toLowerCase();
  };
  
  const targetText = roleDef.target ? ` → ${formatTarget(roleDef.target)}` : '';

  // Format steps for display
  const formatStep = (step: { type: string; target?: string; via?: string; style?: string }) => {
    if (step.type === 'FIELD') {
      return 'Field the ball';
    } else if (step.type === 'THROW') {
      let text = `Throw to ${step.target || ''}`;
      if (step.via) {
        text += ` via ${step.via}`;
      }
      return text;
    }
    return `${step.type}${step.target ? ` to ${step.target}` : ''}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-foreground/50 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        className="bg-card rounded-2xl shadow-xl p-6 max-w-sm w-full animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Status badge */}
        <div className="flex justify-center mb-4">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center",
              correct ? "bg-success/20" : "bg-destructive/20",
            )}
          >
            {correct ? <Check className="w-8 h-8 text-success" /> : <X className="w-8 h-8 text-destructive" />}
          </div>
        </div>

        {/* Status text */}
        <h2
          className={cn("text-xl font-bold text-center mb-2", correct ? "text-success" : "text-destructive")}
        >
          {correct ? "Correct!" : "Not quite"}
        </h2>

        {/* Correct answer */}
        <p className="text-center text-card-foreground mb-2">
          <span className="text-muted-foreground">Answer: </span>
          <span className="font-semibold">{correctLabel}</span>
          {targetText && <span className="text-muted-foreground">{targetText}</span>}
        </p>

        {/* Steps - displayed prominently when present */}
        {roleDef.steps && roleDef.steps.length > 0 && (
          <div className="mb-4 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <p className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">Steps</p>
            <div className="space-y-1.5">
              {roleDef.steps.map((step, index) => (
                <div key={index} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-primary w-5 flex-shrink-0">{index + 1}.</span>
                  <span className="text-sm font-semibold text-card-foreground">{formatStep(step)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Explanation */}
        <p className="text-sm text-muted-foreground text-center mb-6">{roleDef.explanation}</p>

        {/* Continue button */}
        <button
          onClick={onContinue}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all active:scale-[0.98]"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
