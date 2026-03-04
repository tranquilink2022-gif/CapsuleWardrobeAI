import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Link, PackagePlus, Loader2 } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import { AddItemForm } from "@/components/AddItemForm";
import type { Item, Capsule, ShoppingList, ItemCategory } from "@shared/schema";
import type { UploadResult } from "@uppy/core";
import type { UseMutationResult } from "@tanstack/react-query";

interface EditedItemState {
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

interface ItemDialogsProps {
  capsuleId: string;
  capsule: Capsule | undefined;
  navigate: (path: string) => void;

  isShoppingListDialogOpen: boolean;
  setIsShoppingListDialogOpen: (open: boolean) => void;
  shoppingLists: ShoppingList[];
  isLoadingShoppingLists?: boolean;
  handleAddToShoppingList: (shoppingListId: string | null) => void;
  addToShoppingListPending: boolean;

  isEditItemOpen: boolean;
  setIsEditItemOpen: (open: boolean) => void;
  editingItem: Item | null;
  setEditingItem: (item: Item | null) => void;
  editedItem: EditedItemState;
  setEditedItem: (item: EditedItemState) => void;
  displayCategories: readonly ItemCategory[];
  handleEditItem: () => void;
  updateItemPending: boolean;
  handleGetEditUploadParameters: () => Promise<{ method: "PUT"; url: string }>;
  handleEditItemUploadComplete: (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => void;

  isCapsuleSelectorOpen: boolean;
  setIsCapsuleSelectorOpen: (open: boolean) => void;
  itemToCopy: Item | null;
  allCapsules: Capsule[];
  isLoadingAllCapsules?: boolean;
  assignItemMutation: UseMutationResult<unknown, Error, { itemId: string; targetCapsuleId: string }>;

  isDeleteConfirmOpen: boolean;
  setIsDeleteConfirmOpen: (open: boolean) => void;
  itemToDelete: Item | null;
  deleteAffectedCapsules: { id: string; name: string }[];
  deleteItemMutation: UseMutationResult<unknown, Error, string>;

  isWardrobePickerOpen: boolean;
  setIsWardrobePickerOpen: (open: boolean) => void;
  unassignedWardrobeItems: (Item & { capsules: { id: string; name: string }[] })[];

  isAddItemOpen: boolean;
  setIsAddItemOpen: (open: boolean) => void;
  newItem: EditedItemState;
  handleNewItemFieldChange: (field: string, value: string) => void;
  handleGetUploadParameters: () => Promise<{ method: "PUT"; url: string }>;
  handleNewItemUploadComplete: (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => void;
  handleAddItem: () => void;
  createItemPending: boolean;
}

export function ItemDialogs({
  capsuleId,
  capsule,
  navigate,
  isShoppingListDialogOpen,
  setIsShoppingListDialogOpen,
  shoppingLists,
  isLoadingShoppingLists,
  handleAddToShoppingList,
  addToShoppingListPending,
  isEditItemOpen,
  setIsEditItemOpen,
  editingItem,
  setEditingItem,
  editedItem,
  setEditedItem,
  displayCategories,
  handleEditItem,
  updateItemPending,
  handleGetEditUploadParameters,
  handleEditItemUploadComplete,
  isCapsuleSelectorOpen,
  setIsCapsuleSelectorOpen,
  itemToCopy,
  allCapsules,
  isLoadingAllCapsules,
  assignItemMutation,
  isDeleteConfirmOpen,
  setIsDeleteConfirmOpen,
  itemToDelete,
  deleteAffectedCapsules,
  deleteItemMutation,
  isWardrobePickerOpen,
  setIsWardrobePickerOpen,
  unassignedWardrobeItems,
  isAddItemOpen,
  setIsAddItemOpen,
  newItem,
  handleNewItemFieldChange,
  handleGetUploadParameters,
  handleNewItemUploadComplete,
  handleAddItem,
  createItemPending,
}: ItemDialogsProps) {
  return (
    <>
      <Dialog open={isShoppingListDialogOpen} onOpenChange={setIsShoppingListDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add to Shopping List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingShoppingLists ? (
              <div className="flex items-center justify-center py-8" data-testid="loading-shopping-lists">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading shopping lists...</span>
              </div>
            ) : shoppingLists.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-4">
                  You don't have any shopping lists yet.
                </p>
                <Button onClick={() => {
                  setIsShoppingListDialogOpen(false);
                  navigate('/');
                  setTimeout(() => {
                    const shopTab = document.querySelector('[data-testid="button-nav-shopping"]') as HTMLElement;
                    shopTab?.click();
                  }, 100);
                }}>
                  Create Shopping List
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {shoppingLists.map((list) => (
                    <Button
                      key={list.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => handleAddToShoppingList(list.id)}
                      disabled={addToShoppingListPending}
                      data-testid={`button-select-list-${list.id}`}
                    >
                      {list.name}
                    </Button>
                  ))}
                </div>
                <div className="border-t pt-4">
                  <Button
                    variant="ghost"
                    className="w-full"
                    onClick={() => handleAddToShoppingList(null)}
                    disabled={addToShoppingListPending}
                    data-testid="button-remove-from-list"
                  >
                    Remove from Shopping List
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditItemOpen} onOpenChange={(open) => {
        setIsEditItemOpen(open);
        if (!open) {
          setEditingItem(null);
          setEditedItem({
            category: '',
            name: '',
            color: '',
            size: '',
            material: '',
            washInstructions: '',
            description: '',
            imageUrl: '',
            productLink: '',
          });
        }
      }}>
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
                <Label htmlFor="edit-category">Category*</Label>
                <Select
                  value={editedItem.category}
                  onValueChange={(value) => setEditedItem({ ...editedItem, category: value })}
                >
                  <SelectTrigger id="edit-category" data-testid="select-edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayCategories.map((cat) => (
                      <SelectItem key={cat} value={cat} data-testid={`option-edit-category-${cat.toLowerCase()}`}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-name">Name*</Label>
                <Input
                  id="edit-name"
                  data-testid="input-edit-item-name"
                  value={editedItem.name}
                  onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                  placeholder="e.g., White T-Shirt"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-color">Color</Label>
                  <Input
                    id="edit-color"
                    data-testid="input-edit-item-color"
                    value={editedItem.color}
                    onChange={(e) => setEditedItem({ ...editedItem, color: e.target.value })}
                    placeholder="Navy Blue"
                  />
                </div>
                <div>
                  <Label htmlFor="edit-size">Size</Label>
                  <Input
                    id="edit-size"
                    data-testid="input-edit-item-size"
                    value={editedItem.size}
                    onChange={(e) => setEditedItem({ ...editedItem, size: e.target.value })}
                    placeholder="M, 32W, 8.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="edit-material">Material</Label>
                <Input
                  id="edit-material"
                  data-testid="input-edit-item-material"
                  value={editedItem.material}
                  onChange={(e) => setEditedItem({ ...editedItem, material: e.target.value })}
                  placeholder="100% Cotton"
                />
              </div>
              <div>
                <Label htmlFor="edit-wash-instructions">Care Instructions</Label>
                <Input
                  id="edit-wash-instructions"
                  data-testid="input-edit-item-wash-instructions"
                  value={editedItem.washInstructions}
                  onChange={(e) => setEditedItem({ ...editedItem, washInstructions: e.target.value })}
                  placeholder="Machine wash cold"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  data-testid="input-edit-item-description"
                  value={editedItem.description}
                  onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                  placeholder="Add details about this item"
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="edit-productLink">Product Link</Label>
                <Input
                  id="edit-productLink"
                  data-testid="input-edit-item-product-link"
                  value={editedItem.productLink}
                  onChange={(e) => setEditedItem({ ...editedItem, productLink: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="edit-imageUrl">Photo URL</Label>
                <Input
                  id="edit-imageUrl"
                  data-testid="input-edit-item-image-url"
                  value={editedItem.imageUrl}
                  onChange={(e) => setEditedItem({ ...editedItem, imageUrl: e.target.value })}
                  placeholder="Paste image URL here"
                />
                <div className="mt-2 text-center" aria-hidden="true" style={{ pointerEvents: 'auto' }}>
                  <ObjectUploader
                    maxNumberOfFiles={1}
                    maxFileSize={10485760}
                    onGetUploadParameters={handleGetEditUploadParameters}
                    onComplete={handleEditItemUploadComplete}
                  />
                </div>
                {editedItem.imageUrl && (
                  <div className="mt-2">
                    <img
                      src={editedItem.imageUrl}
                      alt="Preview"
                      className="w-24 h-24 object-cover rounded-md"
                      data-testid="image-preview-edit-item"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
          <DialogFooter className="mt-4">
            <Button
              className="w-full"
              data-testid="button-submit-edit-item"
              onClick={handleEditItem}
              disabled={updateItemPending}
            >
              {updateItemPending ? "Updating..." : "Update Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCapsuleSelectorOpen} onOpenChange={setIsCapsuleSelectorOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Capsule</DialogTitle>
            <DialogDescription>Select a capsule to assign "{itemToCopy?.name}" to</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {isLoadingAllCapsules ? (
              <div className="flex items-center justify-center py-8" data-testid="loading-all-capsules">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">Loading capsules...</span>
              </div>
            ) : (
            <div className="space-y-2">
              {allCapsules
                .filter(c => c.id !== capsuleId)
                .map((targetCapsule) => (
                  <Button
                    key={targetCapsule.id}
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => {
                      if (itemToCopy) {
                        assignItemMutation.mutate({
                          itemId: itemToCopy.id,
                          targetCapsuleId: targetCapsule.id
                        });
                      }
                    }}
                    disabled={assignItemMutation.isPending}
                    data-testid={`button-assign-to-capsule-${targetCapsule.id}`}
                  >
                    {targetCapsule.name}
                  </Button>
                ))}
            </div>
            )}
            {!isLoadingAllCapsules && allCapsules.filter(c => c.id !== capsuleId).length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No other capsules available. Create another capsule first.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete from Wardrobe</DialogTitle>
            <DialogDescription>This will permanently delete "{itemToDelete?.name}" from your wardrobe.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {deleteAffectedCapsules.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  This item is currently in {deleteAffectedCapsules.length} capsule{deleteAffectedCapsules.length > 1 ? 's' : ''}:
                </p>
                <div className="flex flex-wrap gap-1">
                  {deleteAffectedCapsules.map(c => (
                    <Badge key={c.id} variant="secondary">{c.name}</Badge>
                  ))}
                </div>
                <p className="text-sm text-destructive">
                  Deleting will remove it from all capsules.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => itemToDelete && deleteItemMutation.mutate(itemToDelete.id)}
              disabled={deleteItemMutation.isPending}
              data-testid="button-confirm-delete-item"
            >
              {deleteItemMutation.isPending ? "Deleting..." : "Delete from Wardrobe"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isWardrobePickerOpen} onOpenChange={setIsWardrobePickerOpen}>
        <DialogContent className="max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Add from Wardrobe</DialogTitle>
            <DialogDescription>Select items from your wardrobe to add to this capsule</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-2">
            {unassignedWardrobeItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                All wardrobe items are already in this capsule.
              </p>
            ) : (
              unassignedWardrobeItems.map(wi => (
                <Card
                  key={wi.id}
                  className="p-3 hover-elevate cursor-pointer"
                  onClick={() => {
                    assignItemMutation.mutate({ itemId: wi.id, targetCapsuleId: capsuleId });
                    setIsWardrobePickerOpen(false);
                  }}
                  data-testid={`button-assign-wardrobe-item-${wi.id}`}
                >
                  <div className="flex items-center gap-3">
                    {wi.imageUrl && (
                      <img src={wi.imageUrl} alt={wi.name} className="w-10 h-10 rounded-md object-cover" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{wi.name}</p>
                      <p className="text-xs text-muted-foreground">{wi.category}</p>
                    </div>
                    {wi.capsules && wi.capsules.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {wi.capsules.map(c => (
                          <Badge key={c.id} variant="outline" className="text-xs">{c.name}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {capsule?.wardrobeId && (
        <Button size="icon" variant="outline" aria-label="Bulk add items" onClick={() => navigate(`/wardrobes/${capsule.wardrobeId}/bulk-add?capsuleId=${capsuleId}`)} data-testid="button-bulk-add">
          <PackagePlus className="w-5 h-5" />
        </Button>
      )}
      <Button size="icon" variant="outline" aria-label="Add from wardrobe" onClick={() => setIsWardrobePickerOpen(true)} data-testid="button-add-from-wardrobe">
        <Link className="w-5 h-5" />
      </Button>

      <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
        <DialogTrigger asChild>
          <Button size="icon" aria-label="Add item" data-testid="button-add-item">
            <Plus className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent
          className="max-h-[90vh] flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Add Item to Capsule</DialogTitle>
            <DialogDescription>Fill in the details below to add a new item</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <AddItemForm
              formData={newItem}
              onChange={handleNewItemFieldChange}
              displayCategories={displayCategories}
              onGetUploadParameters={handleGetUploadParameters}
              onUploadComplete={handleNewItemUploadComplete}
            />
          </div>
          <DialogFooter className="mt-4">
            <Button
              className="w-full"
              data-testid="button-submit-item"
              onClick={handleAddItem}
              disabled={createItemPending}
            >
              {createItemPending ? "Adding..." : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
