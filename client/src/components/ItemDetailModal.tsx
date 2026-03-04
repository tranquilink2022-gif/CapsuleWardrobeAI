import { useState } from "react";
import { X, Trash2, ExternalLink, Plus, Unlink, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Item } from "@shared/schema";

interface CapsuleInfo {
  id: string;
  name: string;
}

export interface ItemDetailModalProps {
  item: (Item & { capsules?: CapsuleInfo[] }) | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  context: "wardrobe" | "capsule" | "shopping-list";
  availableCapsules?: { id: string; name: string }[];
  onAssignToCapsule?: (capsuleId: string) => void;
  onLogWear?: () => void;
  onDeleteFromWardrobe?: () => void;
  onRemoveFromCapsule?: () => void;
  onAssignToAnotherCapsule?: () => void;
  onRemoveFromList?: () => void;
  onViewInWardrobe?: () => void;
  assignPending?: boolean;
  logWearPending?: boolean;
  deletePending?: boolean;
  removeFromCapsulePending?: boolean;
  removeFromListPending?: boolean;
}

export default function ItemDetailModal({
  item,
  open,
  onOpenChange,
  context,
  availableCapsules = [],
  onAssignToCapsule,
  onLogWear,
  onDeleteFromWardrobe,
  onRemoveFromCapsule,
  onAssignToAnotherCapsule,
  onRemoveFromList,
  onViewInWardrobe,
  assignPending = false,
  logWearPending = false,
  deletePending = false,
  removeFromCapsulePending = false,
  removeFromListPending = false,
}: ItemDetailModalProps) {
  const [showAssignPicker, setShowAssignPicker] = useState(false);

  if (!item) return null;

  const parsedPrice = item.price ? parseFloat(item.price.replace(/[^0-9.]/g, '')) : NaN;
  const costPerWear =
    item.price && item.wearCount > 0 && !isNaN(parsedPrice)
      ? (parsedPrice / item.wearCount).toFixed(2)
      : null;

  return (
    <Dialog open={open} onOpenChange={(val) => {
      onOpenChange(val);
      if (!val) setShowAssignPicker(false);
    }}>
      <DialogContent className="max-h-[90vh] flex flex-col sm:max-w-lg" data-testid="item-detail-modal">
        <DialogHeader>
          <DialogTitle data-testid="text-item-detail-name">{item.name}</DialogTitle>
          <DialogDescription>
            {item.category}{item.color ? ` \u00B7 ${item.color}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {item.imageUrl && (
            <div className="w-full aspect-square max-h-64 rounded-md bg-muted overflow-hidden">
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover"
                data-testid="image-item-detail"
              />
            </div>
          )}

          <div className="space-y-2">
            {item.size && (
              <div className="flex items-center gap-2 text-sm" data-testid="text-item-size">
                <span className="text-muted-foreground min-w-[80px]">Size</span>
                <span>{item.size}</span>
              </div>
            )}
            {item.material && (
              <div className="flex items-center gap-2 text-sm" data-testid="text-item-material">
                <span className="text-muted-foreground min-w-[80px]">Material</span>
                <span>{item.material}</span>
              </div>
            )}
            {item.washInstructions && (
              <div className="flex items-center gap-2 text-sm" data-testid="text-item-care">
                <span className="text-muted-foreground min-w-[80px]">Care</span>
                <span>{item.washInstructions}</span>
              </div>
            )}
            {item.description && (
              <div className="flex items-start gap-2 text-sm" data-testid="text-item-description">
                <span className="text-muted-foreground min-w-[80px]">Description</span>
                <span>{item.description}</span>
              </div>
            )}
            {item.price && (
              <div className="flex items-center gap-2 text-sm" data-testid="text-item-price">
                <span className="text-muted-foreground min-w-[80px]">Price</span>
                <span>${item.price}</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" data-testid="badge-wear-count">
              {item.wearCount} wear{item.wearCount !== 1 ? "s" : ""}
            </Badge>
            {costPerWear ? (
              <Badge variant="outline" data-testid="badge-cost-per-wear">
                ${costPerWear}/wear
              </Badge>
            ) : item.price ? (
              <Badge variant="outline" className="text-muted-foreground" data-testid="badge-cost-per-wear">
                Not yet worn
              </Badge>
            ) : null}
            {item.lastWornAt && (
              <span className="text-xs text-muted-foreground" data-testid="text-last-worn">
                Last worn {new Date(item.lastWornAt).toLocaleDateString()}
              </span>
            )}
          </div>

          {item.capsules && item.capsules.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs text-muted-foreground">In capsules</span>
              <div className="flex flex-wrap gap-1">
                {item.capsules.map((c) => (
                  <Badge key={c.id} variant="outline" className="no-default-hover-elevate" data-testid={`badge-item-capsule-${c.id}`}>
                    {c.name}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {item.productLink && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open(item.productLink!, "_blank")}
              data-testid="button-item-product-link"
            >
              <ExternalLink className="w-3 h-3 mr-2" />
              View Product
            </Button>
          )}

          {showAssignPicker && availableCapsules.length > 0 && (
            <div className="space-y-2 border rounded-md p-3">
              <span className="text-sm font-medium">Assign to capsule</span>
              <div className="flex flex-wrap gap-2">
                {availableCapsules.map((capsule) => (
                  <Button
                    key={capsule.id}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      onAssignToCapsule?.(capsule.id);
                      setShowAssignPicker(false);
                    }}
                    disabled={assignPending}
                    data-testid={`button-modal-assign-to-${capsule.id}`}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    {capsule.name}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t pt-4 space-y-2">
          {context === "wardrobe" && (
            <div className="flex flex-wrap gap-2">
              {onAssignToCapsule && availableCapsules.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignPicker(!showAssignPicker)}
                  data-testid="button-modal-assign-capsule"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Assign to Capsule
                </Button>
              )}
              {onLogWear && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogWear}
                  disabled={logWearPending}
                  data-testid="button-modal-log-wear"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Log Wear
                </Button>
              )}
              {onDeleteFromWardrobe && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDeleteFromWardrobe}
                  disabled={deletePending}
                  data-testid="button-modal-delete-wardrobe"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete from Wardrobe
                </Button>
              )}
            </div>
          )}

          {context === "capsule" && (
            <div className="flex flex-wrap gap-2">
              {onRemoveFromCapsule && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRemoveFromCapsule}
                  disabled={removeFromCapsulePending}
                  data-testid="button-modal-remove-capsule"
                >
                  <Unlink className="w-3 h-3 mr-1" />
                  Remove from Capsule
                </Button>
              )}
              {onAssignToAnotherCapsule && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onAssignToAnotherCapsule}
                  data-testid="button-modal-assign-another"
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Assign to Another Capsule
                </Button>
              )}
              {onLogWear && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onLogWear}
                  disabled={logWearPending}
                  data-testid="button-modal-log-wear"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Log Wear
                </Button>
              )}
              {onDeleteFromWardrobe && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onDeleteFromWardrobe}
                  disabled={deletePending}
                  data-testid="button-modal-delete-wardrobe"
                >
                  <Trash2 className="w-3 h-3 mr-1" />
                  Delete from Wardrobe
                </Button>
              )}
            </div>
          )}

          {context === "shopping-list" && (
            <div className="flex flex-wrap gap-2">
              {onRemoveFromList && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onRemoveFromList}
                  disabled={removeFromListPending}
                  data-testid="button-modal-remove-list"
                >
                  <X className="w-3 h-3 mr-1" />
                  Remove from List
                </Button>
              )}
              {onViewInWardrobe && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onViewInWardrobe}
                  data-testid="button-modal-view-wardrobe"
                >
                  <Eye className="w-3 h-3 mr-1" />
                  View in Wardrobe
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
