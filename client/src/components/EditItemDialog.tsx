import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { CLOTHING_CATEGORIES, JEWELRY_CATEGORIES } from "@shared/schema";
import type { Item } from "@shared/schema";

type ItemWithCapsules = Item & { capsules: { id: string; name: string }[] };

interface EditedItemData {
  category: string;
  name: string;
  color: string;
  size: string;
  material: string;
  washInstructions: string;
  description: string;
  imageUrl: string;
  productLink: string;
}

const emptyEditedItem: EditedItemData = {
  category: '',
  name: '',
  color: '',
  size: '',
  material: '',
  washInstructions: '',
  description: '',
  imageUrl: '',
  productLink: '',
};

interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemWithCapsules | null;
  onSave: (itemId: string, updates: EditedItemData) => void;
  isPending: boolean;
}

export default function EditItemDialog({ open, onOpenChange, item, onSave, isPending }: EditItemDialogProps) {
  const [editedItem, setEditedItem] = useState<EditedItemData>(emptyEditedItem);

  const displayCategories = [...CLOTHING_CATEGORIES, ...JEWELRY_CATEGORIES];

  useEffect(() => {
    if (item) {
      setEditedItem({
        category: item.category,
        name: item.name,
        color: item.color || '',
        size: item.size || '',
        material: item.material || '',
        washInstructions: item.washInstructions || '',
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        productLink: item.productLink || '',
      });
    } else {
      setEditedItem(emptyEditedItem);
    }
  }, [item]);

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setEditedItem(emptyEditedItem);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="max-h-[90vh] flex flex-col"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Edit Item</DialogTitle>
          <DialogDescription>Update the item details below</DialogDescription>
        </DialogHeader>
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="space-y-4 pb-2">
            <div>
              <Label htmlFor="wardrobe-edit-category">Category*</Label>
              <Select
                value={editedItem.category}
                onValueChange={(value) => setEditedItem({ ...editedItem, category: value })}
              >
                <SelectTrigger id="wardrobe-edit-category" data-testid="select-wardrobe-edit-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {displayCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="wardrobe-edit-name">Name*</Label>
              <Input
                id="wardrobe-edit-name"
                data-testid="input-wardrobe-edit-item-name"
                value={editedItem.name}
                onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                placeholder="e.g., White T-Shirt"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="wardrobe-edit-color">Color</Label>
                <Input
                  id="wardrobe-edit-color"
                  data-testid="input-wardrobe-edit-item-color"
                  value={editedItem.color}
                  onChange={(e) => setEditedItem({ ...editedItem, color: e.target.value })}
                  placeholder="Navy Blue"
                />
              </div>
              <div>
                <Label htmlFor="wardrobe-edit-size">Size</Label>
                <Input
                  id="wardrobe-edit-size"
                  data-testid="input-wardrobe-edit-item-size"
                  value={editedItem.size}
                  onChange={(e) => setEditedItem({ ...editedItem, size: e.target.value })}
                  placeholder="M, 32W, 8.5"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="wardrobe-edit-material">Material</Label>
              <Input
                id="wardrobe-edit-material"
                data-testid="input-wardrobe-edit-item-material"
                value={editedItem.material}
                onChange={(e) => setEditedItem({ ...editedItem, material: e.target.value })}
                placeholder="100% Cotton"
              />
            </div>
            <div>
              <Label htmlFor="wardrobe-edit-description">Description</Label>
              <Textarea
                id="wardrobe-edit-description"
                data-testid="input-wardrobe-edit-item-description"
                value={editedItem.description}
                onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                placeholder="Additional notes..."
                className="resize-none"
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            data-testid="button-cancel-wardrobe-edit"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (item) {
                onSave(item.id, editedItem);
              }
            }}
            disabled={isPending || !editedItem.name.trim() || !editedItem.category}
            data-testid="button-save-wardrobe-edit"
          >
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
