import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
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
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, ShoppingCart, Pencil, Copy, Share2, Trash2, X, Sparkles } from "lucide-react";
import type { Capsule, Item, ShoppingList, CapsuleFabric, CapsuleColor } from "@shared/schema";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";

export default function CapsuleDetail() {
  const { id } = useParams() as { id: string };
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [isShoppingListDialogOpen, setIsShoppingListDialogOpen] = useState(false);
  const [isCapsuleSelectorOpen, setIsCapsuleSelectorOpen] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [itemToCopy, setItemToCopy] = useState<Item | null>(null);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [editedName, setEditedName] = useState('');
  const [newItem, setNewItem] = useState({
    category: '',
    name: '',
    description: '',
    imageUrl: '',
    productLink: '',
  });
  const [editedItem, setEditedItem] = useState({
    category: '',
    name: '',
    description: '',
    imageUrl: '',
    productLink: '',
  });
  const [newFabricName, setNewFabricName] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [showFabricRecommendations, setShowFabricRecommendations] = useState(false);
  const [showColorRecommendations, setShowColorRecommendations] = useState(false);

  const { data: capsule, isLoading: isLoadingCapsule } = useQuery<Capsule>({
    queryKey: ['/api/capsules', id],
    enabled: !!id,
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery<Item[]>({
    queryKey: ['/api/capsules', id, 'items'],
    enabled: !!id,
  });

  const { data: shoppingLists = [] } = useQuery<ShoppingList[]>({
    queryKey: ['/api/shopping-lists'],
  });

  const { data: allCapsules = [] } = useQuery<Capsule[]>({
    queryKey: ['/api/capsules'],
  });

  const { data: fabrics = [] } = useQuery<CapsuleFabric[]>({
    queryKey: ['/api/capsules', id, 'fabrics'],
    enabled: !!id,
  });

  const { data: colors = [] } = useQuery<CapsuleColor[]>({
    queryKey: ['/api/capsules', id, 'colors'],
    enabled: !!id,
  });

  const { data: recommendations } = useQuery<{ fabrics: string[]; colors: string[] }>({
    queryKey: ['/api/capsules', id, 'recommendations'],
    enabled: !!id,
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/items', 'POST', { ...data, capsuleId: id });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/capsules'] });
      setIsAddItemOpen(false);
      setNewItem({
        category: '',
        name: '',
        description: '',
        imageUrl: '',
        productLink: '',
      });
      toast({
        title: "Success",
        description: "Item added to capsule",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item",
        variant: "destructive",
      });
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: { itemId: string; updates: any }) => {
      return await apiRequest(`/api/items/${data.itemId}`, 'PATCH', data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/capsules'] });
      setIsEditItemOpen(false);
      setEditingItem(null);
      toast({
        title: "Success",
        description: "Item updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update item",
        variant: "destructive",
      });
    },
  });

  const updateCapsuleNameMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest(`/api/capsules/${id}`, 'PATCH', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/capsules'] });
      setIsEditNameOpen(false);
      toast({
        title: "Success",
        description: "Capsule name updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update capsule name",
        variant: "destructive",
      });
    },
  });

  const addToShoppingListMutation = useMutation({
    mutationFn: async ({ itemId, shoppingListId }: { itemId: string; shoppingListId: string | null }) => {
      return await apiRequest(`/api/items/${itemId}`, 'PATCH', { shoppingListId });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      shoppingLists.forEach(list => {
        queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists', list.id, 'items'] });
      });
      setIsShoppingListDialogOpen(false);
      setSelectedItemId(null);
      toast({
        title: "Success",
        description: variables.shoppingListId ? "Item added to shopping list" : "Item removed from shopping list",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update shopping list",
        variant: "destructive",
      });
    },
  });

  const copyCapsuleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/capsules/${id}/copy`, 'POST');
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules'] });
      toast({
        title: "Success",
        description: "Capsule copied successfully",
      });
      navigate(`/capsule/${data.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to copy capsule",
        variant: "destructive",
      });
    },
  });

  const deleteCapsuleMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/capsules/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules'] });
      toast({
        title: "Success",
        description: "Capsule deleted",
      });
      navigate('/');
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete capsule",
        variant: "destructive",
      });
    },
  });

  const createFabricMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest(`/api/capsules/${id}/fabrics`, 'POST', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id, 'fabrics'] });
      setNewFabricName('');
      toast({
        title: "Success",
        description: "Fabric added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add fabric",
        variant: "destructive",
      });
    },
  });

  const deleteFabricMutation = useMutation({
    mutationFn: async (fabricId: string) => {
      return await apiRequest(`/api/fabrics/${fabricId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id, 'fabrics'] });
      toast({
        title: "Success",
        description: "Fabric removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove fabric",
        variant: "destructive",
      });
    },
  });

  const createColorMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest(`/api/capsules/${id}/colors`, 'POST', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id, 'colors'] });
      setNewColorName('');
      toast({
        title: "Success",
        description: "Color added",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add color",
        variant: "destructive",
      });
    },
  });

  const deleteColorMutation = useMutation({
    mutationFn: async (colorId: string) => {
      return await apiRequest(`/api/colors/${colorId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id, 'colors'] });
      toast({
        title: "Success",
        description: "Color removed",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove color",
        variant: "destructive",
      });
    },
  });

  const handleExportCapsule = async () => {
    try {
      const response = await fetch(`/api/capsules/${id}/export`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `capsule-${capsule?.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Capsule exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export capsule",
        variant: "destructive",
      });
    }
  };

  const copyItemMutation = useMutation({
    mutationFn: async ({ itemId, targetCapsuleId }: { itemId: string; targetCapsuleId?: string }) => {
      return await apiRequest(`/api/items/${itemId}/copy`, 'POST', { targetCapsuleId });
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/capsules'] });
      if (variables.targetCapsuleId) {
        queryClient.invalidateQueries({ queryKey: ['/api/capsules', variables.targetCapsuleId, 'items'] });
      }
      setIsCapsuleSelectorOpen(false);
      setItemToCopy(null);
      toast({
        title: "Success",
        description: variables.targetCapsuleId ? "Item copied to selected capsule" : "Item copied successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to copy item",
        variant: "destructive",
      });
    },
  });

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/items/${itemId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/capsules'] });
      toast({
        title: "Success",
        description: "Item deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete item",
        variant: "destructive",
      });
    },
  });

  const handleExportItem = async (item: Item) => {
    try {
      const response = await fetch(`/api/items/${item.id}/export`, {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `item-${item.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast({
        title: "Success",
        description: "Item exported successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export item",
        variant: "destructive",
      });
    }
  };

  const handleAddItem = () => {
    if (!newItem.category || !newItem.name) {
      toast({
        title: "Validation Error",
        description: "Category and name are required",
        variant: "destructive",
      });
      return;
    }
    createItemMutation.mutate(newItem);
  };

  const handleEditItem = () => {
    if (!editedItem.category || !editedItem.name) {
      toast({
        title: "Validation Error",
        description: "Category and name are required",
        variant: "destructive",
      });
      return;
    }
    if (editingItem) {
      updateItemMutation.mutate({
        itemId: editingItem.id,
        updates: editedItem,
      });
    }
  };

  const openEditItemDialog = (item: Item) => {
    setEditingItem(item);
    setEditedItem({
      category: item.category,
      name: item.name,
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      productLink: item.productLink || '',
    });
    setIsEditItemOpen(true);
  };

  const handleEditName = () => {
    if (!editedName.trim()) {
      toast({
        title: "Validation Error",
        description: "Capsule name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    updateCapsuleNameMutation.mutate(editedName);
  };

  const openEditDialog = () => {
    setEditedName(capsule?.name || '');
    setIsEditNameOpen(true);
  };

  const handleShoppingListClick = (itemId: string) => {
    setSelectedItemId(itemId);
    setIsShoppingListDialogOpen(true);
  };

  const handleAddToShoppingList = (shoppingListId: string | null) => {
    if (selectedItemId) {
      addToShoppingListMutation.mutate({ itemId: selectedItemId, shoppingListId });
    }
  };

  if (isLoadingCapsule || isLoadingItems) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!capsule) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <h2 className="text-2xl font-semibold mb-4">Capsule not found</h2>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

  const categories = ['Tops', 'Bottoms', 'Dresses', 'Outerwear', 'Shoes', 'Accessories'];

  return (
    <div className="flex flex-col h-screen bg-background pb-16">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            data-testid="button-back"
            onClick={() => navigate('/')}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold text-foreground" data-testid="text-capsule-name">
                {capsule.name}
              </h1>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                data-testid="button-edit-capsule-name"
                onClick={openEditDialog}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {items.length} / {capsule.totalSlots} items
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" data-testid="button-capsule-menu">
              <MoreVertical className="w-5 h-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => copyCapsuleMutation.mutate()}
              disabled={copyCapsuleMutation.isPending}
              data-testid="button-copy-capsule"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Capsule
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={handleExportCapsule}
              data-testid="button-export-capsule"
            >
              <Share2 className="w-4 h-4 mr-2" />
              Export as JSON
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => deleteCapsuleMutation.mutate()}
              disabled={deleteCapsuleMutation.isPending}
              className="text-destructive focus:text-destructive"
              data-testid="button-delete-capsule"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Capsule
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Capsule Name</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="capsuleName">Capsule Name</Label>
                <Input
                  id="capsuleName"
                  data-testid="input-capsule-name"
                  value={editedName}
                  onChange={(e) => setEditedName(e.target.value)}
                  placeholder="e.g., Summer 2025"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsEditNameOpen(false)}
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleEditName}
                  data-testid="button-save-capsule-name"
                  disabled={updateCapsuleNameMutation.isPending}
                >
                  {updateCapsuleNameMutation.isPending ? 'Saving...' : 'Save'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isShoppingListDialogOpen} onOpenChange={setIsShoppingListDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Shopping List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {shoppingLists.length === 0 ? (
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
                        disabled={addToShoppingListMutation.isPending}
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
                      disabled={addToShoppingListMutation.isPending}
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
              description: '',
              imageUrl: '',
              productLink: '',
            });
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Item</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-category">Category</Label>
                <Select
                  value={editedItem.category}
                  onValueChange={(value) => setEditedItem({ ...editedItem, category: value })}
                >
                  <SelectTrigger id="edit-category" data-testid="select-edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} data-testid={`option-edit-category-${cat.toLowerCase()}`}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-name">Name</Label>
                <Input
                  id="edit-name"
                  data-testid="input-edit-item-name"
                  value={editedItem.name}
                  onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                  placeholder="e.g., White T-Shirt"
                />
              </div>
              <div>
                <Label htmlFor="edit-description">Description (Optional)</Label>
                <Textarea
                  id="edit-description"
                  data-testid="input-edit-item-description"
                  value={editedItem.description}
                  onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                  placeholder="Add details about this item"
                />
              </div>
              <div>
                <Label htmlFor="edit-imageUrl">Image URL (Optional)</Label>
                <Input
                  id="edit-imageUrl"
                  data-testid="input-edit-item-image-url"
                  value={editedItem.imageUrl}
                  onChange={(e) => setEditedItem({ ...editedItem, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="edit-productLink">Product Link (Optional)</Label>
                <Input
                  id="edit-productLink"
                  data-testid="input-edit-item-product-link"
                  value={editedItem.productLink}
                  onChange={(e) => setEditedItem({ ...editedItem, productLink: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button
                className="w-full"
                data-testid="button-submit-edit-item"
                onClick={handleEditItem}
                disabled={updateItemMutation.isPending}
              >
                {updateItemMutation.isPending ? "Updating..." : "Update Item"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isCapsuleSelectorOpen} onOpenChange={setIsCapsuleSelectorOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Copy Item to Capsule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Select which capsule to copy "{itemToCopy?.name}" to:
              </p>
              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    if (itemToCopy) {
                      copyItemMutation.mutate({ itemId: itemToCopy.id });
                    }
                  }}
                  disabled={copyItemMutation.isPending}
                  data-testid="button-copy-to-same-capsule"
                >
                  This Capsule ({capsule.name})
                </Button>
                {allCapsules
                  .filter(c => c.id !== id)
                  .map((targetCapsule) => (
                    <Button
                      key={targetCapsule.id}
                      variant="outline"
                      className="w-full justify-start"
                      onClick={() => {
                        if (itemToCopy) {
                          copyItemMutation.mutate({ 
                            itemId: itemToCopy.id, 
                            targetCapsuleId: targetCapsule.id 
                          });
                        }
                      }}
                      disabled={copyItemMutation.isPending}
                      data-testid={`button-copy-to-capsule-${targetCapsule.id}`}
                    >
                      {targetCapsule.name}
                    </Button>
                  ))}
              </div>
              {allCapsules.length === 1 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  You only have one capsule. Create more capsules to copy items between them.
                </p>
              )}
            </div>
          </DialogContent>
        </Dialog>
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogTrigger asChild>
            <Button size="icon" data-testid="button-add-item">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Item to Capsule</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  value={newItem.category}
                  onValueChange={(value) => setNewItem({ ...newItem, category: value })}
                >
                  <SelectTrigger id="category" data-testid="select-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat} data-testid={`option-category-${cat.toLowerCase()}`}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  data-testid="input-item-name"
                  value={newItem.name}
                  onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                  placeholder="e.g., White T-Shirt"
                />
              </div>
              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  data-testid="input-item-description"
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Add details about this item"
                />
              </div>
              <div>
                <Label htmlFor="imageUrl">Image URL (Optional)</Label>
                <Input
                  id="imageUrl"
                  data-testid="input-item-image-url"
                  value={newItem.imageUrl}
                  onChange={(e) => setNewItem({ ...newItem, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <Label htmlFor="productLink">Product Link (Optional)</Label>
                <Input
                  id="productLink"
                  data-testid="input-item-product-link"
                  value={newItem.productLink}
                  onChange={(e) => setNewItem({ ...newItem, productLink: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <Button
                className="w-full"
                data-testid="button-submit-item"
                onClick={handleAddItem}
                disabled={createItemMutation.isPending}
              >
                {createItemMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6 mb-8">
          {/* My Fabrics Section */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-lg" data-testid="text-my-fabrics-title">My Fabrics</h2>
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
                <p className="text-sm font-medium mb-2 text-muted-foreground">AI Recommendations:</p>
                <div className="flex flex-wrap gap-2">
                  {recommendations.fabrics.map((fabric) => {
                    const alreadyAdded = fabrics.some(f => f.name.toLowerCase() === fabric.toLowerCase());
                    return (
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
                      </Button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Add a fabric (e.g., Cotton, Wool)"
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
                  {fabrics.map((fabric) => (
                    <Badge
                      key={fabric.id}
                      variant="secondary"
                      className="gap-1 pl-3 pr-2 py-1"
                      data-testid={`badge-fabric-${fabric.id}`}
                    >
                      {fabric.name}
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
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No fabrics added yet. Try adding some or view AI suggestions!
                </p>
              )}
            </div>
          </Card>

          {/* My Colors Section */}
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
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <span className="text-4xl">👕</span>
            </div>
            <h3 className="font-semibold text-xl mb-2">No items yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Add items to start building your capsule wardrobe
            </p>
            <Button onClick={() => setIsAddItemOpen(true)} data-testid="button-add-first-item">
              Add Your First Item
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {items.map((item) => (
              <Card key={item.id} className="p-4" data-testid={`card-item-${item.id}`}>
                {item.imageUrl && (
                  <div className="aspect-square bg-muted rounded-md mb-3 overflow-hidden">
                    <img
                      src={item.imageUrl}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-foreground" data-testid={`text-item-name-${item.id}`}>
                        {item.name}
                      </h3>
                      <p className="text-xs text-muted-foreground">{item.category}</p>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant={item.shoppingListId ? "default" : "ghost"}
                        className="h-8 w-8"
                        data-testid={`button-toggle-shopping-${item.id}`}
                        onClick={() => handleShoppingListClick(item.id)}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" data-testid={`button-item-menu-${item.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditItemDialog(item)}
                            data-testid={`button-edit-item-${item.id}`}
                          >
                            <Pencil className="w-4 h-4 mr-2" />
                            Edit Item
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              setItemToCopy(item);
                              setIsCapsuleSelectorOpen(true);
                            }}
                            disabled={copyItemMutation.isPending}
                            data-testid={`button-copy-item-${item.id}`}
                          >
                            <Copy className="w-4 h-4 mr-2" />
                            Copy Item
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleExportItem(item)}
                            data-testid={`button-export-item-${item.id}`}
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Export as JSON
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => deleteItemMutation.mutate(item.id)}
                            disabled={deleteItemMutation.isPending}
                            className="text-destructive focus:text-destructive"
                            data-testid={`button-delete-item-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete Item
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  {item.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {item.description}
                    </p>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
      <BottomNav activeTab="capsules" onTabChange={(tab) => navigate(`/#${tab}`)} />
    </div>
  );
}
