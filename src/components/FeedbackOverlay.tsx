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
  selectedAnswer,
  onContinue,
}: FeedbackOverlayProps) {
  const roleDef = scenario.roles[prompt.role];
  const correctLabel = intentLabels[prompt.correctAnswer];
  const targetText = roleDef.target ? ` → ${roleDef.target}` : '';

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
