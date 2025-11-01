import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { CapsuleCategory } from "@shared/schema";

interface RecommendationData {
  fabrics: string[];
  colors: string[];
  structure: {
    type: string;
    total: number;
    breakdown: { category: string; count: number }[];
  };
}

interface CapsuleRecommendationProps {
  recommendation: RecommendationData;
  onCreateCapsule: () => void;
  capsuleCategory?: CapsuleCategory;
}

export default function CapsuleRecommendation({
  recommendation,
  onCreateCapsule,
  capsuleCategory = 'Clothing',
}: CapsuleRecommendationProps) {
  const isJewelry = capsuleCategory === 'Jewelry';
  const materialsHeading = isJewelry ? 'Recommended Metal Types' : 'Recommended Fabrics';
  
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="p-6 border-b">
        <h1 className="font-serif text-3xl font-semibold text-foreground" data-testid="text-recommendation-title">
          Your Capsule Plan
        </h1>
        <p className="text-sm text-muted-foreground mt-2" data-testid="text-recommendation-subtitle">
          Based on your preferences
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
        <div>
          <h3 className="text-xl font-semibold mb-4 text-foreground" data-testid="text-fabrics-heading">
            {materialsHeading}
          </h3>
          <div className="flex flex-wrap gap-2">
            {recommendation.fabrics.map((fabric) => (
              <Badge
                key={fabric}
                variant="secondary"
                className="text-sm px-4 py-2"
                data-testid={`badge-fabric-${fabric.toLowerCase()}`}
              >
                {fabric}
              </Badge>
            ))}
          </div>
        </div>

        {!isJewelry && (
          <div>
            <h3 className="text-xl font-semibold mb-4 text-foreground" data-testid="text-colors-heading">
              Recommended Colors
            </h3>
            <div className="flex flex-wrap gap-2">
              {recommendation.colors.map((color) => (
                <Badge
                  key={color}
                  variant="secondary"
                  className="text-sm px-4 py-2"
                  data-testid={`badge-color-${color.toLowerCase()}`}
                >
                  {color}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xl font-semibold mb-4 text-foreground" data-testid="text-structure-heading">
            Capsule Structure
          </h3>
          <Card className="p-6">
            <div className="flex justify-between items-center mb-6">
              <span className="text-sm font-medium text-muted-foreground">
                {recommendation.structure.type}
              </span>
              <span className="text-2xl font-bold text-foreground" data-testid="text-total-items">
                {recommendation.structure.total} items
              </span>
            </div>
            <div className="space-y-3">
              {recommendation.structure.breakdown.map((item) => (
                <div
                  key={item.category}
                  className="flex justify-between items-center"
                  data-testid={`row-category-${item.category.toLowerCase()}`}
                >
                  <span className="text-base text-foreground">{item.category}</span>
                  <span className="text-base font-semibold text-foreground">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      <div className="p-6 border-t">
        <Button
          onClick={onCreateCapsule}
          className="w-full h-12 rounded-xl text-base font-semibold"
          data-testid="button-create-capsule"
        >
          Create My Capsule
        </Button>
      </div>
    </div>
  );
}
