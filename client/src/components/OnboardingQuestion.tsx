import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type OptionType = string | { value: string; description?: string; label?: string; disabled?: boolean };

interface OnboardingQuestionProps {
  question: string;
  options: OptionType[];
  selectedOption?: string;
  onSelect: (option: string) => void;
  onBack?: () => void;
  step: number;
  totalSteps: number;
}

export default function OnboardingQuestion({
  question,
  options,
  selectedOption,
  onSelect,
  onBack,
  step,
  totalSteps,
}: OnboardingQuestionProps) {
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        {onBack ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
        ) : (
          <div className="w-10" />
        )}
        <div className="flex gap-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              className={`h-2 w-2 rounded-full transition-colors ${
                i < step ? "bg-primary" : "bg-muted"
              }`}
              data-testid={`indicator-step-${i}`}
            />
          ))}
        </div>
        <div className="w-10" />
      </div>

      <div className="flex-1 flex flex-col px-6 py-8 overflow-y-auto">
        <h2 className="font-serif text-3xl font-semibold mb-8 text-foreground" data-testid="text-question">
          {question}
        </h2>

        <div className="space-y-3">
          {options.map((option) => {
            const isObject = typeof option === 'object';
            const value = isObject ? option.value : option;
            const label = isObject ? (option.label || option.value) : option;
            const description = isObject ? option.description : null;
            const isDisabled = isObject ? option.disabled : false;
            
            return (
              <Button
                key={value}
                variant={selectedOption === value ? "default" : "outline"}
                className={`w-full justify-start text-left rounded-xl ${description ? 'h-auto py-4' : 'h-12'} ${isDisabled ? 'opacity-50' : ''}`}
                onClick={() => !isDisabled && onSelect(value)}
                disabled={isDisabled}
                data-testid={`button-option-${(label || value).toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div className="flex flex-col items-start gap-1">
                  <span className="text-base font-medium">{label}</span>
                  {description && (
                    <span className="text-sm font-normal opacity-80">
                      {description}
                    </span>
                  )}
                </div>
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
