import { AnswerOption } from '../types';
import { intentLabels } from '../constants';
import { cn } from '../lib/utils';

interface AnswerButtonsProps {
  options: AnswerOption[];
  correctIndex: number;
  onSelect: (option: AnswerOption, index: number) => void;
  disabled?: boolean;
  selectedIndex?: number | null;
  showCorrect?: boolean;
}

export default function AnswerButtons({
  options,
  correctIndex,
  onSelect,
  disabled = false,
  selectedIndex = null,
  showCorrect = false,
}: AnswerButtonsProps) {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-sm border-t border-border pb-safe">
      <div className="mx-auto max-w-md px-4 py-4">
        <div className={cn("grid gap-3", options.length <= 2 ? "grid-cols-1" : "grid-cols-2")}>
          {options.map((option, index) => {
            const isSelected = selectedIndex === index;
            const isCorrect = index === correctIndex;
            const isWrong = isSelected && !isCorrect;
            const showCorrectAnswer = disabled && showCorrect;

            return (
              <button
                key={index}
                onClick={() => {
                  if (!disabled) {
                    onSelect(option, index);
                  }
                }}
                disabled={disabled}
                className={cn(
                  "min-h-[56px] px-4 py-3 rounded-xl font-semibold text-base",
                  "bg-card border-2 text-card-foreground",
                  "transition-all duration-150",
                  !disabled && "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                  !disabled && isSelected && "border-primary bg-primary/10",
                  disabled && "opacity-50 cursor-not-allowed border-border",
                  showCorrectAnswer && isCorrect && "bg-success/20 border-success text-success",
                  showCorrectAnswer && isWrong && "bg-destructive/20 border-destructive text-destructive",
                )}
              >
                {intentLabels[option]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
