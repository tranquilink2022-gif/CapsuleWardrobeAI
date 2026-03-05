import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AGE_RANGES, STYLE_PREFERENCES, UNDERTONES } from "@shared/schema";
import { User, Sparkles, Palette, HelpCircle } from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface UserPreferencesOnboardingProps {
  onComplete: (preferences: { ageRange: string; stylePreference: string; undertone: string }) => void;
  isLoading?: boolean;
}

export default function UserPreferencesOnboarding({ onComplete, isLoading }: UserPreferencesOnboardingProps) {
  const [step, setStep] = useState<'welcome' | 'age' | 'style' | 'undertone'>('welcome');
  const [ageRange, setAgeRange] = useState<string>('');
  const [stylePreference, setStylePreference] = useState<string>('');
  const [undertone, setUndertone] = useState<string>('');
  const [showUndertoneGuide, setShowUndertoneGuide] = useState(false);

  const handleContinue = () => {
    if (step === 'welcome') {
      setStep('age');
    } else if (step === 'age' && ageRange) {
      setStep('style');
    } else if (step === 'style' && stylePreference) {
      setStep('undertone');
    } else if (step === 'undertone' && undertone) {
      onComplete({ ageRange, stylePreference, undertone });
    }
  };

  const undertoneDescriptions: Record<string, { description: string; colors: string }> = {
    "Warm": {
      description: "Golden, peachy, or yellow undertones",
      colors: "Earth tones, oranges, warm reds, olive greens, and golden yellows look great on you"
    },
    "Cool": {
      description: "Pink, red, or blue undertones",
      colors: "Jewel tones, blues, purples, emerald greens, and silver look great on you"
    },
    "Neutral": {
      description: "A mix of warm and cool undertones",
      colors: "Most colors work well for you — you have flexibility in your palette"
    },
    "Unknown": {
      description: "Not sure yet, and that's okay!",
      colors: "We'll suggest versatile colors that work for most undertones"
    }
  };

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col items-center justify-center p-6 overflow-y-auto">
      <div className="w-full max-w-md my-auto">
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
                Let's personalize your experience. We'll ask a few quick questions 
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
                  role="button"
                  tabIndex={0}
                  onClick={() => setAgeRange(range)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setAgeRange(range); } }}
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
                    role="button"
                    tabIndex={0}
                    onClick={() => setStylePreference(pref)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setStylePreference(pref); } }}
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
              disabled={!stylePreference}
              className="w-full h-12"
              data-testid="button-style-continue"
            >
              Continue
            </Button>
          </div>
        )}

        {step === 'undertone' && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <Palette className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-serif text-2xl font-semibold text-foreground">
                What's your skin undertone?
              </h2>
              <p className="text-sm text-muted-foreground">
                This helps us suggest colors that complement you best
              </p>
            </div>

            <div className="space-y-3">
              {UNDERTONES.map((tone) => {
                const info = undertoneDescriptions[tone];
                return (
                  <Card
                    key={tone}
                    className={`p-5 cursor-pointer transition-all ${
                      undertone === tone 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover-elevate'
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setUndertone(tone)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setUndertone(tone); } }}
                    data-testid={`card-undertone-${tone.toLowerCase()}`}
                  >
                    <h3 className="font-semibold text-foreground mb-1">
                      {tone === 'Unknown' ? "I don't know" : tone}
                    </h3>
                    <p className="text-sm text-muted-foreground">{info.description}</p>
                  </Card>
                );
              })}
            </div>

            <Collapsible open={showUndertoneGuide} onOpenChange={setShowUndertoneGuide}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="ghost" 
                  className="w-full text-muted-foreground"
                  data-testid="button-undertone-guide-toggle"
                >
                  <HelpCircle className="w-4 h-4 mr-2" />
                  How do I find my undertone?
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <Card className="p-4 mt-3 bg-muted/50">
                  <h4 className="font-semibold text-sm mb-3">Quick ways to find your undertone:</h4>
                  <ul className="text-sm text-muted-foreground space-y-3">
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground shrink-0">Vein test:</span>
                      <span>Look at your wrist veins in natural light. Blue/purple = cool, green = warm, mix = neutral</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground shrink-0">Jewelry test:</span>
                      <span>Silver looks better = cool, gold looks better = warm, both work = neutral</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground shrink-0">Sun reaction:</span>
                      <span>Burn easily = cool, tan easily = warm</span>
                    </li>
                    <li className="flex gap-2">
                      <span className="font-medium text-foreground shrink-0">White paper test:</span>
                      <span>Hold white paper next to your face. Look yellow/golden = warm, pink/rosy = cool</span>
                    </li>
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3 italic">
                    Not sure? That's okay! Select "I don't know" and we'll suggest versatile colors. You can always update this later in your profile.
                  </p>
                </Card>
              </CollapsibleContent>
            </Collapsible>

            <Button 
              onClick={handleContinue}
              disabled={!undertone || isLoading}
              className="w-full h-12"
              data-testid="button-undertone-continue"
            >
              {isLoading ? "Saving..." : "Complete Setup"}
            </Button>
          </div>
        )}

        <div className="flex justify-center gap-2 mt-8">
          {['welcome', 'age', 'style', 'undertone'].map((s) => (
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
