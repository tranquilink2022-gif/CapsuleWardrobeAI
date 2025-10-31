import { X, Trash2, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

interface ItemDetailModalProps {
  item: {
    name: string;
    description?: string;
    imageUrl?: string;
    productLink?: string;
    isOnShoppingList?: boolean;
  };
  onClose: () => void;
  onSave: (data: any) => void;
  onDelete: () => void;
}

export default function ItemDetailModal({
  item,
  onClose,
  onSave,
  onDelete,
}: ItemDetailModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center">
      <div className="bg-background w-full md:max-w-2xl md:rounded-2xl rounded-t-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold text-foreground" data-testid="text-modal-title">
            Item Details
          </h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-modal"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div>
            <Label htmlFor="image-upload" className="text-sm font-medium mb-2 block">
              Image
            </Label>
            <div
              className="border-2 border-dashed rounded-lg min-h-48 flex items-center justify-center bg-muted/50 hover-elevate cursor-pointer"
              data-testid="div-image-upload"
            >
              {item.imageUrl ? (
                <img
                  src={item.imageUrl}
                  alt={item.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <p className="text-muted-foreground">Tap to upload image</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="item-name" className="text-sm font-medium mb-2 block">
              Name
            </Label>
            <Input
              id="item-name"
              defaultValue={item.name}
              placeholder="e.g., White T-Shirt"
              className="h-12"
              data-testid="input-item-name"
            />
          </div>

          <div>
            <Label htmlFor="item-description" className="text-sm font-medium mb-2 block">
              Description
            </Label>
            <Textarea
              id="item-description"
              defaultValue={item.description}
              placeholder="Add details about this item..."
              className="resize-none"
              rows={3}
              data-testid="input-item-description"
            />
          </div>

          <div>
            <Label htmlFor="product-link" className="text-sm font-medium mb-2 block">
              Product Link
            </Label>
            <div className="relative">
              <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                id="product-link"
                defaultValue={item.productLink}
                placeholder="https://..."
                className="h-12 pl-10"
                data-testid="input-product-link"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
            <div>
              <Label htmlFor="shopping-list" className="text-sm font-medium">
                Add to Shopping List
              </Label>
              <p className="text-xs text-muted-foreground mt-1">
                Mark this item for purchase
              </p>
            </div>
            <Switch
              id="shopping-list"
              defaultChecked={item.isOnShoppingList}
              data-testid="switch-shopping-list"
            />
          </div>
        </div>

        <div className="p-6 border-t flex gap-3">
          <Button
            variant="destructive"
            onClick={onDelete}
            className="flex-1 h-12 rounded-xl"
            data-testid="button-delete-item"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
          <Button
            onClick={() => onSave(item)}
            className="flex-1 h-12 rounded-xl"
            data-testid="button-save-item"
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}
