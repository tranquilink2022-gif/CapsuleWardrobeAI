import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Sparkles, X } from "lucide-react";
import type { CapsuleFabric, CapsuleColor } from "@shared/schema";
import { getFabricInfo, getPriceLabel } from "@/lib/fabricInfo";

interface StylePreferencesProps {
  isJewelry: boolean;
  materialLabel: string;
  fabrics: CapsuleFabric[];
  colors: CapsuleColor[];
  recommendations: { fabrics: string[]; colors: string[] } | undefined;
  newFabricName: string;
  setNewFabricName: (name: string) => void;
  newColorName: string;
  setNewColorName: (name: string) => void;
  showFabricRecommendations: boolean;
  setShowFabricRecommendations: (show: boolean) => void;
  showColorRecommendations: boolean;
  setShowColorRecommendations: (show: boolean) => void;
  createFabricMutation: {
    mutate: (name: string) => void;
    isPending: boolean;
  };
  deleteFabricMutation: {
    mutate: (fabricId: string) => void;
    isPending: boolean;
  };
  createColorMutation: {
    mutate: (name: string) => void;
    isPending: boolean;
  };
  deleteColorMutation: {
    mutate: (colorId: string) => void;
    isPending: boolean;
  };
}

export function StylePreferences({
  isJewelry,
  materialLabel,
  fabrics,
  colors,
  recommendations,
  newFabricName,
  setNewFabricName,
  newColorName,
  setNewColorName,
  showFabricRecommendations,
  setShowFabricRecommendations,
  showColorRecommendations,
  setShowColorRecommendations,
  createFabricMutation,
  deleteFabricMutation,
  createColorMutation,
  deleteColorMutation,
}: StylePreferencesProps) {
  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg" data-testid="text-my-fabrics-title">My {materialLabel}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFabricRecommendations(!showFabricRecommendations)}
            data-testid="button-toggle-fabric-recommendations"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            {showFabricRecommendations ? 'Hide' : 'Show'} Suggestions
          </Button>
        </div>

        {showFabricRecommendations && recommendations && (
          <div className="mb-4 p-3 bg-muted/50 rounded-md" data-testid="section-fabric-recommendations">
            <p className="text-sm font-medium mb-2 text-muted-foreground">AI Recommendations (hover for details):</p>
            <div className="flex flex-wrap gap-2">
              {recommendations.fabrics.map((fabric) => {
                const alreadyAdded = fabrics.some(f => f.name.toLowerCase() === fabric.toLowerCase());
                const info = getFabricInfo(fabric);
                const button = (
                  <Button
                    key={fabric}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (!alreadyAdded) {
                        createFabricMutation.mutate(fabric);
                      }
                    }}
                    disabled={alreadyAdded || createFabricMutation.isPending}
                    data-testid={`button-add-recommended-fabric-${fabric.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {fabric}
                    {info && <span className="ml-1 text-muted-foreground">{info.priceIndicator}</span>}
                  </Button>
                );
                
                if (info) {
                  return (
                    <Tooltip key={fabric}>
                      <TooltipTrigger asChild>
                        {button}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-3" side="bottom">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{info.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {info.priceIndicator} ({getPriceLabel(info.priceIndicator)})
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{info.description}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return button;
              })}
            </div>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder={isJewelry ? "Add a metal (e.g., Silver, Gold)" : "Add a fabric (e.g., Cotton, Wool)"}
              value={newFabricName}
              onChange={(e) => setNewFabricName(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newFabricName.trim()) {
                  createFabricMutation.mutate(newFabricName.trim());
                }
              }}
              data-testid="input-new-fabric"
            />
            <Button
              onClick={() => {
                if (newFabricName.trim()) {
                  createFabricMutation.mutate(newFabricName.trim());
                }
              }}
              disabled={!newFabricName.trim() || createFabricMutation.isPending}
              data-testid="button-add-fabric"
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>

          {fabrics.length > 0 ? (
            <div className="flex flex-wrap gap-2" data-testid="list-fabrics">
              {fabrics.map((fabric) => {
                const info = getFabricInfo(fabric.name);
                const badge = (
                  <Badge
                    key={fabric.id}
                    variant="secondary"
                    className={`gap-1 pl-3 pr-2 py-1 ${info ? 'cursor-help' : ''}`}
                    data-testid={`badge-fabric-${fabric.id}`}
                  >
                    {fabric.name}
                    {info && <span className="text-muted-foreground">{info.priceIndicator}</span>}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => deleteFabricMutation.mutate(fabric.id)}
                      data-testid={`button-remove-fabric-${fabric.id}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                );
                
                if (info) {
                  return (
                    <Tooltip key={fabric.id}>
                      <TooltipTrigger asChild>
                        {badge}
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs p-3" side="bottom">
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-semibold">{info.name}</span>
                            <span className="text-xs text-muted-foreground">
                              {info.priceIndicator} ({getPriceLabel(info.priceIndicator)})
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">{info.description}</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  );
                }
                return badge;
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              No fabrics added yet. Try adding some or view AI suggestions!
            </p>
          )}
        </div>
      </Card>

      {!isJewelry && (
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-lg" data-testid="text-my-colors-title">My Colors</h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowColorRecommendations(!showColorRecommendations)}
              data-testid="button-toggle-color-recommendations"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {showColorRecommendations ? 'Hide' : 'Show'} Suggestions
            </Button>
          </div>

          {showColorRecommendations && recommendations && (
            <div className="mb-4 p-3 bg-muted/50 rounded-md" data-testid="section-color-recommendations">
              <p className="text-sm font-medium mb-2 text-muted-foreground">AI Recommendations:</p>
              <div className="flex flex-wrap gap-2">
                {recommendations.colors.map((color) => {
                  const alreadyAdded = colors.some(c => c.name.toLowerCase() === color.toLowerCase());
                  return (
                    <Button
                      key={color}
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (!alreadyAdded) {
                          createColorMutation.mutate(color);
                        }
                      }}
                      disabled={alreadyAdded || createColorMutation.isPending}
                      data-testid={`button-add-recommended-color-${color.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      {color}
                    </Button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Add a color (e.g., Navy, Beige)"
                value={newColorName}
                onChange={(e) => setNewColorName(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && newColorName.trim()) {
                    createColorMutation.mutate(newColorName.trim());
                  }
                }}
                data-testid="input-new-color"
              />
              <Button
                onClick={() => {
                  if (newColorName.trim()) {
                    createColorMutation.mutate(newColorName.trim());
                  }
                }}
                disabled={!newColorName.trim() || createColorMutation.isPending}
                data-testid="button-add-color"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {colors.length > 0 ? (
              <div className="flex flex-wrap gap-2" data-testid="list-colors">
                {colors.map((color) => (
                  <Badge
                    key={color.id}
                    variant="secondary"
                    className="gap-1 pl-3 pr-2 py-1"
                    data-testid={`badge-color-${color.id}`}
                  >
                    {color.name}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-4 w-4 p-0 hover:bg-transparent"
                      onClick={() => deleteColorMutation.mutate(color.id)}
                      data-testid={`button-remove-color-${color.id}`}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No colors added yet. Try adding some or view AI suggestions!
              </p>
            )}
          </div>
        </Card>
      )}
    </>
  );
}
