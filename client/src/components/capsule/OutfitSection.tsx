import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Pencil, Share2, Trash2 } from "lucide-react";
import type { Item } from "@shared/schema";

interface OutfitPairing {
  id: string;
  capsuleId: string;
  name: string;
  outfitData: {
    id: string;
    name: string;
    occasion: string;
    items: string[];
  };
  createdAt: string;
}

interface OutfitSectionProps {
  items: Item[];
  outfitPairings: OutfitPairing[];
  isCreateOutfitOpen: boolean;
  setIsCreateOutfitOpen: (open: boolean) => void;
  editingOutfitId: string | null;
  outfitName: string;
  setOutfitName: (name: string) => void;
  outfitOccasion: string;
  setOutfitOccasion: (occasion: string) => void;
  selectedItemsForOutfit: string[];
  handleToggleItemSelection: (itemId: string) => void;
  handleOpenCreateOutfit: () => void;
  handleOpenEditOutfit: (pairing: OutfitPairing) => void;
  handleSaveOutfit: () => Promise<void>;
  handleShareOutfit: (pairing: OutfitPairing) => void;
  deleteOutfitPairingMutation: {
    mutate: (pairingId: string) => void;
    isPending: boolean;
  };
  createOutfitPairingPending: boolean;
}

export function OutfitSection({
  items,
  outfitPairings,
  isCreateOutfitOpen,
  setIsCreateOutfitOpen,
  editingOutfitId,
  outfitName,
  setOutfitName,
  outfitOccasion,
  setOutfitOccasion,
  selectedItemsForOutfit,
  handleToggleItemSelection,
  handleOpenCreateOutfit,
  handleOpenEditOutfit,
  handleSaveOutfit,
  handleShareOutfit,
  deleteOutfitPairingMutation,
  createOutfitPairingPending,
}: OutfitSectionProps) {
  return (
    <>
      {items.length > 0 && (
        <div className="mt-8">
          <Button
            onClick={handleOpenCreateOutfit}
            className="w-full"
            data-testid="button-create-outfit"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Outfit
          </Button>
        </div>
      )}

      <Dialog open={isCreateOutfitOpen} onOpenChange={setIsCreateOutfitOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingOutfitId ? 'Edit Outfit' : 'Create Outfit'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="outfit-name">Outfit Name *</Label>
              <Input
                id="outfit-name"
                placeholder="e.g., Weekend Brunch, Date Night"
                value={outfitName}
                onChange={(e) => setOutfitName(e.target.value)}
                data-testid="input-outfit-name"
              />
            </div>

            <div>
              <Label htmlFor="outfit-occasion">Occasion (Optional)</Label>
              <Input
                id="outfit-occasion"
                placeholder="e.g., Casual, Formal, Work"
                value={outfitOccasion}
                onChange={(e) => setOutfitOccasion(e.target.value)}
                data-testid="input-outfit-occasion"
              />
            </div>

            <div>
              <Label className="mb-3 block">Select Items for Outfit *</Label>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {Object.entries(
                  items.reduce((acc, item) => {
                    if (!acc[item.category]) acc[item.category] = [];
                    acc[item.category].push(item);
                    return acc;
                  }, {} as Record<string, Item[]>)
                ).map(([category, categoryItems]) => (
                  <div key={category} className="space-y-2">
                    <p className="text-sm font-medium text-muted-foreground">{category}</p>
                    {categoryItems.map((item) => (
                      <div key={item.id} className="flex items-center space-x-2 pl-4">
                        <Checkbox
                          id={`item-${item.id}`}
                          checked={selectedItemsForOutfit.includes(item.id)}
                          onCheckedChange={() => handleToggleItemSelection(item.id)}
                          data-testid={`checkbox-item-${item.id}`}
                        />
                        <label
                          htmlFor={`item-${item.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {item.name}
                        </label>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSaveOutfit}
                disabled={createOutfitPairingPending}
                className="flex-1"
                data-testid="button-save-outfit"
              >
                {createOutfitPairingPending ? 'Saving...' : 'Save Outfit'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {outfitPairings.length > 0 && (
        <div className="mt-8 space-y-4">
          <h3 className="font-semibold text-lg px-1">Favorite Outfits</h3>
          <div className="space-y-3">
            {outfitPairings.map((pairing) => (
              <Card key={pairing.id} className="p-4" data-testid={`card-favorite-outfit-${pairing.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground">{pairing.outfitData.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{pairing.outfitData.occasion}</p>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleOpenEditOutfit(pairing)}
                      data-testid={`button-edit-outfit-${pairing.id}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => handleShareOutfit(pairing)}
                      data-testid={`button-share-outfit-${pairing.id}`}
                    >
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      onClick={() => deleteOutfitPairingMutation.mutate(pairing.id)}
                      disabled={deleteOutfitPairingMutation.isPending}
                      data-testid={`button-delete-outfit-${pairing.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {pairing.outfitData.items.map((item, idx) => (
                    <Badge key={idx} variant="secondary">
                      {item}
                    </Badge>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
