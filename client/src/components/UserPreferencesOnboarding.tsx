import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AGE_RANGES, STYLE_PREFERENCES } from "@shared/schema";
import { User, Sparkles } from "lucide-react";

interface UserPreferencesOnboardingProps {
  onComplete: (preferences: { ageRange: string; stylePreference: string }) => void;
  isLoading?: boolean;
}

export default function UserPreferencesOnboarding({ onComplete, isLoading }: UserPreferencesOnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'age' | 'style'>('welcome');
  const [ageRange, setAgeRange] = useState<string>('');
  const [stylePreference, setStylePreference] = useState<string>('');

  const handleContinue = () => {
    if (step === 'welcome') {
      setStep('age');
    } else if (step === 'age' && ageRange) {
      setStep('style');
    } else if (step === 'style' && stylePreference) {
      onComplete({ ageRange, stylePreference });
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md">
        {step === 'welcome' && (
          <div className="text-center space-y-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <div className="space-y-3">
              <h1 className="font-serif text-3xl font-semibold text-foreground">
                Welcome to Closana
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Let's personalize your experience. We'll ask a couple of quick questions 
                to tailor our recommendations to you.
              </p>
            </div>
            <Button 
              onClick={handleContinue}
              className="w-full h-12"
              data-testid="button-onboarding-start"
            >
              Let's Get Started
            </Button>
          </div>
        )}

        {step === 'age' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                What's your age range?
              </h2>
              <p className="text-sm text-muted-foreground">
                This helps us suggest styles and pieces that fit your lifestyle
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {AGE_RANGES.map((range) => (
                <Card
                  key={range}
                  className={`p-4 cursor-pointer text-center transition-all ${
                    ageRange === range 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover-elevate'
                  }`}
                  onClick={() => setAgeRange(range)}
                  data-testid={`card-age-${range}`}
                >
                  <span className="font-medium text-foreground">{range}</span>
                </Card>
              ))}
            </div>

            <Button 
              onClick={handleContinue}
              disabled={!ageRange}
              className="w-full h-12"
              data-testid="button-age-continue"
            >
              Continue
            </Button>
          </div>
        )}

        {step === 'style' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                Which styles do you prefer?
              </h2>
              <p className="text-sm text-muted-foreground">
                We'll tailor our suggestions based on your preference
              </p>
            </div>

            <div className="space-y-3">
              {STYLE_PREFERENCES.map((pref) => {
                const descriptions: Record<string, string> = {
                  "Women's": "Dresses, skirts, blouses, and traditionally feminine pieces",
                  "Men's": "Suits, button-downs, and traditionally masculine pieces",
                  "Mix": "The best of both worlds — no boundaries"
                };
                
                return (
                  <Card
                    key={pref}
                    className={`p-5 cursor-pointer transition-all ${
                      stylePreference === pref 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover-elevate'
                    }`}
                    onClick={() => setStylePreference(pref)}
                    data-testid={`card-style-${pref}`}
                  >
                    <h3 className="font-semibold text-foreground mb-1">{pref}</h3>
                    <p className="text-sm text-muted-foreground">{descriptions[pref]}</p>
                  </Card>
                );
              })}
            </div>

            <Button 
              onClick={handleContinue}
              disabled={!stylePreference || isLoading}
              className="w-full h-12"
              data-testid="button-style-continue"
            >
              {isLoading ? "Saving..." : "Complete Setup"}
            </Button>
          </div>
        )}

        <div className="flex justify-center gap-2 mt-8">
          {['welcome', 'age', 'style'].map((s, i) => (
            <div 
              key={s} 
              className={`w-2 h-2 rounded-full transition-colors ${
                step === s ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
