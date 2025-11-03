import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Heart, ChevronDown, Loader2 } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import type { Capsule } from "@shared/schema";

interface OutfitSuggestion {
  id: string;
  name: string;
  occasion: string;
  items: string[];
}

interface OutfitPairing {
  id: string;
  capsuleId: string;
  name: string;
  outfitData: OutfitSuggestion;
  createdAt: string;
}

export default function Outfits() {
  const { toast } = useToast();
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string | null>(null);
  const [generatedOutfits, setGeneratedOutfits] = useState<OutfitSuggestion[]>([]);

  const { data: capsules = [] } = useQuery<Capsule[]>({
    queryKey: ['/api/capsules'],
  });

  const { data: savedPairings = [] } = useQuery<OutfitPairing[]>({
    queryKey: ['/api/capsules', selectedCapsuleId, 'outfit-pairings'],
    enabled: !!selectedCapsuleId,
  });

  const generateMutation = useMutation({
    mutationFn: async (capsuleId: string) => {
      const response = await apiRequest(`/api/capsules/${capsuleId}/generate-outfit`, 'POST', {});
      return response as OutfitSuggestion[];
    },
    onSuccess: (data) => {
      setGeneratedOutfits(data);
      toast({
        title: "Outfits generated!",
        description: "Here are some fresh outfit suggestions based on your capsule.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate outfits",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ capsuleId, outfit }: { capsuleId: string; outfit: OutfitSuggestion }) => {
      return await apiRequest(`/api/capsules/${capsuleId}/outfit-pairings`, 'POST', {
        name: outfit.name,
        outfitData: outfit,
      });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', selectedCapsuleId, 'outfit-pairings'] });
      toast({
        title: "Saved!",
        description: "Outfit pairing saved to your favorites.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (pairingId: string) => {
      return await apiRequest(`/api/outfit-pairings/${pairingId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', selectedCapsuleId, 'outfit-pairings'] });
      toast({
        title: "Removed",
        description: "Outfit pairing removed from favorites.",
      });
    },
  });

  const handleGenerate = () => {
    if (!selectedCapsuleId) {
      toast({
        title: "Select a capsule",
        description: "Please select a capsule first to generate outfits.",
      });
      return;
    }
    generateMutation.mutate(selectedCapsuleId);
  };

  const handleSave = (outfit: OutfitSuggestion) => {
    if (!selectedCapsuleId) return;
    saveMutation.mutate({ capsuleId: selectedCapsuleId, outfit });
  };

  const selectedCapsule = capsules.find(c => c.id === selectedCapsuleId);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-serif text-2xl font-semibold text-foreground">
          Outfit Generator
        </h2>
        <ThemeToggle />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Select Capsule
            </label>
            <Select value={selectedCapsuleId || undefined} onValueChange={setSelectedCapsuleId}>
              <SelectTrigger data-testid="select-capsule">
                <SelectValue placeholder="Choose a capsule..." />
              </SelectTrigger>
              <SelectContent>
                {capsules.map((capsule) => (
                  <SelectItem key={capsule.id} value={capsule.id}>
                    {capsule.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={handleGenerate}
            disabled={!selectedCapsuleId || generateMutation.isPending}
            className="w-full"
            data-testid="button-generate-outfits"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Outfits
              </>
            )}
          </Button>
        </div>

        {generatedOutfits.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Generated Suggestions</h3>
            {generatedOutfits.map((outfit) => (
              <Card key={outfit.id} data-testid={`card-outfit-${outfit.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{outfit.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">{outfit.occasion}</CardDescription>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleSave(outfit)}
                      disabled={saveMutation.isPending}
                      data-testid={`button-save-${outfit.id}`}
                    >
                      <Heart className="w-5 h-5" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {outfit.items.map((item, idx) => (
                      <Badge key={idx} variant="secondary" data-testid={`badge-item-${idx}`}>
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {selectedCapsuleId && savedPairings.length > 0 && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Favorite Pairings</h3>
            {savedPairings.map((pairing) => (
              <Card key={pairing.id} data-testid={`card-favorite-${pairing.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{pairing.outfitData.name}</CardTitle>
                      <CardDescription className="text-sm mt-1">
                        {pairing.outfitData.occasion}
                      </CardDescription>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => deleteMutation.mutate(pairing.id)}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-${pairing.id}`}
                    >
                      <Heart className="w-5 h-5 fill-current text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-2">
                    {pairing.outfitData.items.map((item, idx) => (
                      <Badge key={idx} variant="secondary">
                        {item}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!selectedCapsuleId && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-2">Select a Capsule</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Choose a capsule from the dropdown above to generate outfit suggestions
            </p>
          </div>
        )}

        {selectedCapsuleId && generatedOutfits.length === 0 && savedPairings.length === 0 && !generateMutation.isPending && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-2">Generate Your First Outfit</h3>
            <p className="text-muted-foreground text-sm max-w-sm">
              Click the button above to get AI-powered outfit suggestions from your {selectedCapsule?.name} capsule
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
