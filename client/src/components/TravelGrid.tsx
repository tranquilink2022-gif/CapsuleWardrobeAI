import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Shirt, Grid3X3, Sparkles, ChevronLeft, ChevronRight, Check } from "lucide-react";
import type { Item } from "@shared/schema";

interface TravelGridProps {
  items: Item[];
  onClose?: () => void;
}

type GridCategory = 'tops' | 'bottoms' | 'layers';

interface GridSelection {
  tops: Item[];
  bottoms: Item[];
  layers: Item[];
}

interface GeneratedOutfit {
  id: string;
  top: Item;
  bottom: Item;
  layer: Item;
}

export function TravelGrid({ items, onClose }: TravelGridProps) {
  const [step, setStep] = useState<'select' | 'grid' | 'outfits'>('select');
  const [selection, setSelection] = useState<GridSelection>({
    tops: [],
    bottoms: [],
    layers: [],
  });
  const [currentOutfitIndex, setCurrentOutfitIndex] = useState(0);

  const tops = items.filter(item => item.category === 'Tops');
  const bottoms = items.filter(item => item.category === 'Bottoms');
  const layers = items.filter(item => 
    item.category === 'Layering Pieces' ||
    item.category === 'Outerwear' || 
    item.name.toLowerCase().includes('cardigan') ||
    item.name.toLowerCase().includes('blazer') ||
    item.name.toLowerCase().includes('jacket') ||
    item.name.toLowerCase().includes('sweater') ||
    item.name.toLowerCase().includes('coat')
  );

  const toggleItem = (item: Item, category: GridCategory) => {
    setSelection(prev => {
      const current = prev[category];
      const isSelected = current.some(i => i.id === item.id);
      
      if (isSelected) {
        return { ...prev, [category]: current.filter(i => i.id !== item.id) };
      } else if (current.length < 3) {
        return { ...prev, [category]: [...current, item] };
      }
      return prev;
    });
  };

  const canProceed = selection.tops.length === 3 && 
                     selection.bottoms.length === 3 && 
                     selection.layers.length === 3;

  const generatedOutfits: GeneratedOutfit[] = useMemo(() => {
    if (!canProceed) return [];
    
    const outfits: GeneratedOutfit[] = [];
    let id = 1;
    
    for (const top of selection.tops) {
      for (const bottom of selection.bottoms) {
        for (const layer of selection.layers) {
          outfits.push({
            id: `outfit-${id++}`,
            top,
            bottom,
            layer,
          });
        }
      }
    }
    
    return outfits;
  }, [selection, canProceed]);

  const gridLayout = useMemo(() => {
    if (!canProceed) return null;
    
    return [
      [selection.tops[0], selection.bottoms[0], selection.layers[0]],
      [selection.bottoms[1], selection.layers[1], selection.tops[1]],
      [selection.layers[2], selection.tops[2], selection.bottoms[2]],
    ];
  }, [selection, canProceed]);

  const renderItemCard = (item: Item, category: GridCategory, isSelected: boolean) => (
    <Card
      key={item.id}
      className={`p-3 cursor-pointer transition-all hover-elevate ${
        isSelected ? 'ring-2 ring-primary bg-primary/5' : ''
      }`}
      onClick={() => toggleItem(item, category)}
      data-testid={`grid-item-${item.id}`}
    >
      <div className="flex items-center gap-3">
        {item.imageUrl ? (
          <img
            src={item.imageUrl.startsWith('/objects/') ? item.imageUrl : item.imageUrl}
            alt={item.name}
            className="w-12 h-12 object-cover rounded"
          />
        ) : (
          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
            <Shirt className="w-6 h-6 text-muted-foreground" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm truncate">{item.name}</p>
          {item.color && (
            <p className="text-xs text-muted-foreground truncate">{item.color}</p>
          )}
        </div>
        {isSelected && (
          <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-primary-foreground" />
          </div>
        )}
      </div>
    </Card>
  );

  const renderGridCell = (item: Item, rowIndex: number, colIndex: number) => {
    const categoryLabel = 
      (rowIndex === 0 && colIndex === 0) || (rowIndex === 1 && colIndex === 2) || (rowIndex === 2 && colIndex === 1)
        ? 'Top'
        : (rowIndex === 0 && colIndex === 1) || (rowIndex === 1 && colIndex === 0) || (rowIndex === 2 && colIndex === 2)
        ? 'Bottom'
        : 'Layer';

    return (
      <div
        key={`${rowIndex}-${colIndex}`}
        className="aspect-square bg-card rounded-lg border p-2 flex flex-col"
        data-testid={`grid-cell-${rowIndex}-${colIndex}`}
      >
        <Badge variant="secondary" className="self-start text-xs mb-1">
          {categoryLabel}
        </Badge>
        <div className="flex-1 flex items-center justify-center">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="max-w-full max-h-full object-contain rounded"
            />
          ) : (
            <div className="w-full h-full bg-muted rounded flex items-center justify-center">
              <Shirt className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </div>
        <p className="text-xs text-center truncate mt-1">{item.name}</p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {step === 'select' && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Grid3X3 className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Build Your Travel Grid</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Select 3 tops, 3 bottoms, and 3 layering pieces to create 27 mix-and-match outfit combinations.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Tops</h4>
                <Badge variant={selection.tops.length === 3 ? "default" : "secondary"}>
                  {selection.tops.length}/3 selected
                </Badge>
              </div>
              {tops.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No tops in this capsule yet</p>
              ) : (
                <div className="grid gap-2">
                  {tops.map(item => renderItemCard(item, 'tops', selection.tops.some(i => i.id === item.id)))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Bottoms</h4>
                <Badge variant={selection.bottoms.length === 3 ? "default" : "secondary"}>
                  {selection.bottoms.length}/3 selected
                </Badge>
              </div>
              {bottoms.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">No bottoms in this capsule yet</p>
              ) : (
                <div className="grid gap-2">
                  {bottoms.map(item => renderItemCard(item, 'bottoms', selection.bottoms.some(i => i.id === item.id)))}
                </div>
              )}
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium">Layers</h4>
                <Badge variant={selection.layers.length === 3 ? "default" : "secondary"}>
                  {selection.layers.length}/3 selected
                </Badge>
              </div>
              {layers.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No outerwear or layering pieces yet. Add cardigans, blazers, jackets, or sweaters.
                </p>
              ) : (
                <div className="grid gap-2">
                  {layers.map(item => renderItemCard(item, 'layers', selection.layers.some(i => i.id === item.id)))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            {onClose && (
              <Button variant="outline" onClick={onClose} data-testid="button-cancel-grid">
                Cancel
              </Button>
            )}
            <Button 
              onClick={() => setStep('grid')} 
              disabled={!canProceed}
              data-testid="button-view-grid"
            >
              <Grid3X3 className="w-4 h-4 mr-2" />
              View 3x3 Grid
            </Button>
          </div>
        </div>
      )}

      {step === 'grid' && gridLayout && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Your Travel Grid</h3>
            <p className="text-sm text-muted-foreground">
              Each row creates 9 outfit combinations — 27 total looks from just 9 pieces!
            </p>
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-sm mx-auto">
            {gridLayout.map((row, rowIndex) => 
              row.map((item, colIndex) => renderGridCell(item, rowIndex, colIndex))
            )}
          </div>

          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span className="font-semibold text-lg">27 Outfit Combinations</span>
            </div>
            <p className="text-sm text-muted-foreground">
              From your 3 tops, 3 bottoms, and 3 layers
            </p>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep('select')} data-testid="button-back-to-select">
              <ChevronLeft className="w-4 h-4 mr-2" />
              Edit Selection
            </Button>
            <Button onClick={() => setStep('outfits')} data-testid="button-view-outfits">
              Browse Outfits
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}

      {step === 'outfits' && generatedOutfits.length > 0 && (
        <div className="space-y-6">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">
              Outfit {currentOutfitIndex + 1} of {generatedOutfits.length}
            </h3>
            <p className="text-sm text-muted-foreground">
              Swipe through all 27 combinations
            </p>
          </div>

          <Card className="p-6">
            <div className="space-y-4">
              {['top', 'bottom', 'layer'].map((type) => {
                const item = generatedOutfits[currentOutfitIndex][type as keyof GeneratedOutfit] as Item;
                return (
                  <div key={type} className="flex items-center gap-4" data-testid={`outfit-${type}-${item.id}`}>
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                        <Shirt className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1">
                      <Badge variant="secondary" className="mb-1">
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Badge>
                      <p className="font-medium">{item.name}</p>
                      {item.color && (
                        <p className="text-sm text-muted-foreground">{item.color}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentOutfitIndex(prev => Math.max(0, prev - 1))}
              disabled={currentOutfitIndex === 0}
              data-testid="button-prev-outfit"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex gap-1 overflow-hidden max-w-[200px]">
              {generatedOutfits.slice(
                Math.max(0, currentOutfitIndex - 4),
                Math.min(generatedOutfits.length, currentOutfitIndex + 5)
              ).map((_, i) => {
                const actualIndex = Math.max(0, currentOutfitIndex - 4) + i;
                return (
                  <button
                    key={actualIndex}
                    onClick={() => setCurrentOutfitIndex(actualIndex)}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      actualIndex === currentOutfitIndex 
                        ? 'bg-primary' 
                        : 'bg-muted-foreground/30'
                    }`}
                    data-testid={`dot-outfit-${actualIndex}`}
                  />
                );
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentOutfitIndex(prev => Math.min(generatedOutfits.length - 1, prev + 1))}
              disabled={currentOutfitIndex === generatedOutfits.length - 1}
              data-testid="button-next-outfit"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setStep('grid')} data-testid="button-back-to-grid">
              <ChevronLeft className="w-4 h-4 mr-2" />
              View Grid
            </Button>
            {onClose && (
              <Button onClick={onClose} data-testid="button-done-outfits">
                Done
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function TravelGridDialog({ 
  items, 
  open, 
  onOpenChange 
}: { 
  items: Item[]; 
  open: boolean; 
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>3x3 Travel Grid</DialogTitle>
          <DialogDescription>
            Create 27 outfit combinations from 9 versatile pieces
          </DialogDescription>
        </DialogHeader>
        <TravelGrid items={items} onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  );
}
