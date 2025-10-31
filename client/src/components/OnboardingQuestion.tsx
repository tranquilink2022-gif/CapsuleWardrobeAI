import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

interface OnboardingQuestionProps {
  question: string;
  options: string[];
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
          {options.map((option) => (
            <Button
              key={option}
              variant={selectedOption === option ? "default" : "outline"}
              className="w-full h-12 justify-start text-base font-medium rounded-xl"
              onClick={() => onSelect(option)}
              data-testid={`button-option-${option.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {option}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
