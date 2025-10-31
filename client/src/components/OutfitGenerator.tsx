import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Sparkles } from "lucide-react";

interface OutfitSuggestion {
  id: string;
  name: string;
  occasion: string;
  items: string[];
}

interface OutfitGeneratorProps {
  onGenerate: () => Promise<OutfitSuggestion[]>;
}

export default function OutfitGenerator({ onGenerate }: OutfitGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [outfits, setOutfits] = useState<OutfitSuggestion[]>([]);

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      const suggestions = await onGenerate();
      setOutfits(suggestions);
    } catch (error) {
      console.error('Failed to generate outfits:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="p-6 border-b">
        <h1 className="font-serif text-3xl font-semibold text-foreground" data-testid="text-outfit-generator-title">
          Outfit Ideas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          AI-powered outfit suggestions
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {outfits.length === 0 && !isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-2" data-testid="text-empty-outfits">
              Generate Outfit Ideas
            </h3>
            <p className="text-muted-foreground text-sm mb-6 max-w-sm">
              Let AI create stylish outfit combinations from your capsule wardrobe
            </p>
            <Button
              onClick={handleGenerate}
              className="h-12 px-8 rounded-xl"
              data-testid="button-generate-outfits"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Outfits
            </Button>
          </div>
        ) : isGenerating ? (
          <div className="flex flex-col items-center justify-center h-full">
            <Loader2 className="w-12 h-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground" data-testid="text-generating">
              Creating outfit suggestions...
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {outfits.map((outfit) => (
              <Card key={outfit.id} className="p-6" data-testid={`card-outfit-${outfit.id}`}>
                <h3 className="font-semibold text-lg mb-1" data-testid={`text-outfit-name-${outfit.id}`}>
                  {outfit.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {outfit.occasion}
                </p>
                <div className="space-y-2">
                  {outfit.items.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 text-sm"
                    >
                      <div className="w-2 h-2 rounded-full bg-primary" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
            <Button
              variant="outline"
              onClick={handleGenerate}
              className="w-full h-12 rounded-xl"
              disabled={isGenerating}
              data-testid="button-regenerate-outfits"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
