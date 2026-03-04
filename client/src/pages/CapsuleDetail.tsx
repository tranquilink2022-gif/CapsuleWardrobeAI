import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, ShoppingCart, Pencil, Copy, Share2, Trash2, Link, Unlink, PackagePlus, RefreshCw } from "lucide-react";
import type { Capsule, Item, ShoppingList, CapsuleFabric, CapsuleColor, CategorySlots, ItemCategory } from "@shared/schema";
import { CapsuleExportDialog, ItemExportDialog, OutfitExportDialog } from "@/components/capsule/ExportDialogs";
import { CLOTHING_CATEGORIES, JEWELRY_CATEGORIES } from "@shared/schema";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Grid3X3 } from "lucide-react";
import type { UploadResult } from "@uppy/core";
import { TravelGridDialog } from "@/components/TravelGrid";
import ItemDetailModal from "@/components/ItemDetailModal";
import { ItemDialogs } from "@/components/capsule/ItemDialogs";
import { OutfitSection } from "@/components/capsule/OutfitSection";
import { StylePreferences } from "@/components/capsule/StylePreferences";

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
    color: '',
    size: '',
    material: '',
    washInstructions: '',
    description: '',
    imageUrl: '',
    productLink: '',
  });

  const handleNewItemFieldChange = (field: string, value: string) => {
    setNewItem(prev => ({ ...prev, [field]: value }));
  };
  const [editedItem, setEditedItem] = useState({
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
  const [newFabricName, setNewFabricName] = useState('');
  const [newColorName, setNewColorName] = useState('');
  const [showFabricRecommendations, setShowFabricRecommendations] = useState(false);
  const [showColorRecommendations, setShowColorRecommendations] = useState(false);
  const [isCreateOutfitOpen, setIsCreateOutfitOpen] = useState(false);
  const [selectedItemsForOutfit, setSelectedItemsForOutfit] = useState<string[]>([]);
  const [outfitName, setOutfitName] = useState('');
  const [outfitOccasion, setOutfitOccasion] = useState('');
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [isItemExportDialogOpen, setIsItemExportDialogOpen] = useState(false);
  const [itemToExport, setItemToExport] = useState<Item | null>(null);
  const [isOutfitExportDialogOpen, setIsOutfitExportDialogOpen] = useState(false);
  const [outfitToExport, setOutfitToExport] = useState<OutfitPairing | null>(null);
  const [isTravelGridOpen, setIsTravelGridOpen] = useState(false);
  const [capsuleDetailItem, setCapsuleDetailItem] = useState<Item | null>(null);

  const { data: capsule, isLoading: isLoadingCapsule } = useQuery<Capsule>({
    queryKey: ['/api/capsules', id],
    enabled: !!id,
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery<Item[]>({
    queryKey: ['/api/capsules', id, 'items'],
    enabled: !!id,
  });

  const { data: shoppingLists = [], isLoading: isLoadingShoppingLists } = useQuery<ShoppingList[]>({
    queryKey: ['/api/shopping-lists'],
  });

  const { data: allCapsules = [], isLoading: isLoadingAllCapsules } = useQuery<Capsule[]>({
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

  const { data: outfitPairings = [] } = useQuery<OutfitPairing[]>({
    queryKey: ['/api/capsules', id, 'outfit-pairings'],
    enabled: !!id,
  });

  const createItemMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/items', 'POST', { ...data, capsuleId: id, wardrobeId: capsule?.wardrobeId });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
      if (capsule?.wardrobeId) {
        queryClient.refetchQueries({ queryKey: ['/api/wardrobes', capsule.wardrobeId, 'items'] });
      }
      setIsAddItemOpen(false);
      setNewItem({
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
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
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
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id] });
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
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
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.refetchQueries({ queryKey: ['/api/shopping-lists'] });
      shoppingLists.forEach(list => {
        queryClient.refetchQueries({ queryKey: ['/api/shopping-lists', list.id, 'items'] });
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
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
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
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
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
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'fabrics'] });
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
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'fabrics'] });
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
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'colors'] });
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
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'colors'] });
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

  const deleteOutfitPairingMutation = useMutation({
    mutationFn: async (pairingId: string) => {
      return await apiRequest(`/api/outfit-pairings/${pairingId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'outfit-pairings'] });
      toast({
        title: "Removed",
        description: "Outfit pairing removed from favorites",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove outfit pairing",
        variant: "destructive",
      });
    },
  });

  const createOutfitPairingMutation = useMutation({
    mutationFn: async (outfitData: { name: string; outfitData: any }) => {
      return await apiRequest(`/api/capsules/${id}/outfit-pairings`, 'POST', outfitData);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save outfit",
        variant: "destructive",
      });
    },
  });

  const capsuleLogWearMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/items/${itemId}/wear`, 'POST');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'items'] });
      toast({ title: "Wear logged", description: "Item wear count updated." });
    },
  });

  const handleToggleItemSelection = (itemId: string) => {
    setSelectedItemsForOutfit(prev => 
      prev.includes(itemId) 
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleOpenCreateOutfit = () => {
    setEditingOutfitId(null);
    setSelectedItemsForOutfit([]);
    setOutfitName('');
    setOutfitOccasion('');
    setIsCreateOutfitOpen(true);
  };

  const handleOpenEditOutfit = (pairing: OutfitPairing) => {
    setEditingOutfitId(pairing.id);
    setOutfitName(pairing.outfitData.name);
    setOutfitOccasion(pairing.outfitData.occasion);
    
    // Convert item names back to item IDs
    const itemIds = items
      .filter(item => pairing.outfitData.items.includes(item.name))
      .map(item => item.id);
    setSelectedItemsForOutfit(itemIds);
    
    setIsCreateOutfitOpen(true);
  };

  const handleSaveOutfit = async () => {
    if (!outfitName.trim()) {
      toast({
        title: "Error",
        description: "Please enter an outfit name",
        variant: "destructive",
      });
      return;
    }

    if (selectedItemsForOutfit.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one item for your outfit",
        variant: "destructive",
      });
      return;
    }

    const selectedItemNames = items
      .filter(item => selectedItemsForOutfit.includes(item.id))
      .map(item => item.name);

    const outfitData = {
      name: outfitName,
      outfitData: {
        id: crypto.randomUUID(),
        name: outfitName,
        occasion: outfitOccasion || 'Custom Outfit',
        items: selectedItemNames,
      },
    };

    try {
      // Create the new outfit first
      const newOutfit = await createOutfitPairingMutation.mutateAsync(outfitData);
      const newOutfitId = newOutfit?.id;
      
      // Only delete the old one after the new one is successfully created
      if (editingOutfitId) {
        try {
          await apiRequest(`/api/outfit-pairings/${editingOutfitId}`, 'DELETE');
        } catch (deleteError) {
          // If delete fails, rollback by removing the newly created outfit
          if (newOutfitId) {
            try {
              await apiRequest(`/api/outfit-pairings/${newOutfitId}`, 'DELETE');
            } catch (rollbackError) {
              console.error('Failed to rollback:', rollbackError);
            }
          }
          toast({
            title: "Error",
            description: "Failed to update outfit. Please try again.",
            variant: "destructive",
          });
          queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'outfit-pairings'] });
          return;
        }
      }
      
      // Refetch cache and close dialog on success
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'outfit-pairings'] });
      setIsCreateOutfitOpen(false);
      setSelectedItemsForOutfit([]);
      setOutfitName('');
      setOutfitOccasion('');
      
      toast({
        title: "Success",
        description: editingOutfitId ? "Outfit updated successfully" : "Outfit saved to favorites",
      });
      
      setEditingOutfitId(null);
    } catch (error) {
      // Error is already handled by the mutation's onError
      // Dialog stays open so user can retry or cancel
      console.error('Failed to save outfit:', error);
    }
  };

  const handleShareOutfit = (pairing: OutfitPairing) => {
    setOutfitToExport(pairing);
    setIsOutfitExportDialogOpen(true);
  };

  const handleExportCapsule = () => {
    setIsExportDialogOpen(true);
  };

  const assignItemMutation = useMutation({
    mutationFn: async ({ itemId, targetCapsuleId }: { itemId: string; targetCapsuleId: string }) => {
      return await apiRequest(`/api/capsules/${targetCapsuleId}/items/${itemId}/assign`, 'POST');
    },
    onSuccess: (_data, variables) => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
      queryClient.refetchQueries({ queryKey: ['/api/capsules', variables.targetCapsuleId, 'items'] });
      if (capsule?.wardrobeId) {
        queryClient.refetchQueries({ queryKey: ['/api/wardrobes', capsule.wardrobeId, 'items'] });
      }
      setIsCapsuleSelectorOpen(false);
      setItemToCopy(null);
      toast({
        title: "Success",
        description: "Item assigned to capsule",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to assign item",
        variant: "destructive",
      });
    },
  });

  const unassignItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/capsules/${id}/items/${itemId}/unassign`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
      if (capsule?.wardrobeId) {
        queryClient.refetchQueries({ queryKey: ['/api/wardrobes', capsule.wardrobeId, 'items'] });
      }
      toast({
        title: "Removed from capsule",
        description: "Item is still in your wardrobe",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item from capsule",
        variant: "destructive",
      });
    },
  });

  const [itemToDelete, setItemToDelete] = useState<Item | null>(null);
  const [deleteAffectedCapsules, setDeleteAffectedCapsules] = useState<{id: string; name: string}[]>([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  const handleDeleteItemClick = async (item: Item) => {
    try {
      const capsulesList = await apiRequest(`/api/items/${item.id}/capsules`, 'GET') as {id: string; name: string}[];
      setItemToDelete(item);
      setDeleteAffectedCapsules(capsulesList || []);
      setIsDeleteConfirmOpen(true);
    } catch {
      setItemToDelete(item);
      setDeleteAffectedCapsules([]);
      setIsDeleteConfirmOpen(true);
    }
  };

  const deleteItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/items/${itemId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
      if (capsule?.wardrobeId) {
        queryClient.refetchQueries({ queryKey: ['/api/wardrobes', capsule.wardrobeId, 'items'] });
      }
      setIsDeleteConfirmOpen(false);
      setItemToDelete(null);
      toast({
        title: "Success",
        description: "Item deleted from wardrobe",
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

  const wearMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/items/${itemId}/wear`, 'POST');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id, 'items'] });
      if (capsule?.wardrobeId) {
        queryClient.refetchQueries({ queryKey: ['/api/wardrobes', capsule.wardrobeId, 'items'] });
      }
      toast({
        title: "Wear logged",
        description: "Item wear count updated",
      });
    },
  });

  const [isWardrobePickerOpen, setIsWardrobePickerOpen] = useState(false);
  const { data: wardrobeItems = [] } = useQuery<(Item & { capsules: {id: string; name: string}[] })[]>({
    queryKey: ['/api/wardrobes', capsule?.wardrobeId, 'items'],
    enabled: !!capsule?.wardrobeId && isWardrobePickerOpen,
  });

  const unassignedWardrobeItems = wardrobeItems.filter(
    wi => !wi.capsules?.some(c => c.id === id)
  );

  const updateCategorySlotsMutation = useMutation({
    mutationFn: async (categorySlots: CategorySlots) => {
      return await apiRequest(`/api/capsules/${id}`, 'PATCH', { categorySlots });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', id] });
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update category slots",
        variant: "destructive",
      });
    },
  });

  const handleExportItem = (item: Item) => {
    setItemToExport(item);
    setIsItemExportDialogOpen(true);
  };

  // Image upload handlers for new item
  const handleGetUploadParameters = async () => {
    const response = await apiRequest('/api/objects/upload', 'POST');
    return {
      method: 'PUT' as const,
      url: response.uploadURL,
    };
  };

  const handleNewItemUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        const response = await apiRequest('/api/item-images', 'PUT', { imageURL: uploadURL });
        setNewItem(prevItem => ({ ...prevItem, imageUrl: response.objectPath }));
        toast({
          title: "Image uploaded",
          description: "Your item image has been uploaded successfully",
        });
      } catch (error) {
        console.error("Error setting image ACL:", error);
        toast({
          title: "Upload error",
          description: "Failed to process uploaded image",
          variant: "destructive",
        });
      }
    }
  };

  // Image upload handlers for edit item
  const handleGetEditUploadParameters = async () => {
    const response = await apiRequest('/api/objects/upload', 'POST');
    return {
      method: 'PUT' as const,
      url: response.uploadURL,
    };
  };

  const handleEditItemUploadComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      try {
        const response = await apiRequest('/api/item-images', 'PUT', { imageURL: uploadURL });
        setEditedItem(prevItem => ({ ...prevItem, imageUrl: response.objectPath }));
        toast({
          title: "Image uploaded",
          description: "Your item image has been uploaded successfully",
        });
      } catch (error) {
        console.error("Error setting image ACL:", error);
        toast({
          title: "Upload error",
          description: "Failed to process uploaded image",
          variant: "destructive",
        });
      }
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
      color: item.color || '',
      size: item.size || '',
      material: item.material || '',
      washInstructions: item.washInstructions || '',
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

  const isJewelry = capsule.capsuleCategory === 'Jewelry';
  const displayCategories: readonly ItemCategory[] = isJewelry ? JEWELRY_CATEGORIES : CLOTHING_CATEGORIES;
  const materialLabel = isJewelry ? 'Metal Types' : 'Fabrics';
  const materialSingular = isJewelry ? 'metal' : 'fabric';
  
  const categorySlots = (capsule.categorySlots as CategorySlots) || {
    Tops: 6,
    Bottoms: 4,
    Dresses: 2,
    Outerwear: 2,
    Shoes: 2,
    Accessories: 2,
    Extras: 2,
  };

  const handleAdjustSlots = (category: ItemCategory, delta: number) => {
    const currentCount = categorySlots[category] || 0;
    const newCount = Math.max(0, currentCount + delta);
    
    const newCategorySlots = {
      ...categorySlots,
      [category]: newCount,
    };
    
    updateCategorySlotsMutation.mutate(newCategorySlots);
  };

  const getItemsForCategory = (category: ItemCategory) => {
    return items.filter(item => item.category === category);
  };

  return (
    <div className="flex flex-col h-screen bg-background pb-16">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-3">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Go back"
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
                aria-label="Edit capsule name"
                data-testid="button-edit-capsule-name"
                onClick={openEditDialog}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="icon" variant="ghost" aria-label="Capsule menu" data-testid="button-capsule-menu">
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
              Share
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

        <CapsuleExportDialog
          open={isExportDialogOpen}
          onOpenChange={setIsExportDialogOpen}
          capsule={capsule}
          capsuleId={id}
          items={items}
        />

        <ItemExportDialog
          open={isItemExportDialogOpen}
          onOpenChange={(open) => {
            setIsItemExportDialogOpen(open);
            if (!open) setItemToExport(null);
          }}
          item={itemToExport}
        />

        <OutfitExportDialog
          open={isOutfitExportDialogOpen}
          onOpenChange={(open) => {
            setIsOutfitExportDialogOpen(open);
            if (!open) setOutfitToExport(null);
          }}
          outfit={outfitToExport}
        />

        <ItemDialogs
          capsuleId={id}
          capsule={capsule}
          navigate={navigate}
          isShoppingListDialogOpen={isShoppingListDialogOpen}
          setIsShoppingListDialogOpen={setIsShoppingListDialogOpen}
          shoppingLists={shoppingLists}
          isLoadingShoppingLists={isLoadingShoppingLists}
          handleAddToShoppingList={handleAddToShoppingList}
          addToShoppingListPending={addToShoppingListMutation.isPending}
          isEditItemOpen={isEditItemOpen}
          setIsEditItemOpen={setIsEditItemOpen}
          editingItem={editingItem}
          setEditingItem={setEditingItem}
          editedItem={editedItem}
          setEditedItem={setEditedItem}
          displayCategories={displayCategories}
          handleEditItem={handleEditItem}
          updateItemPending={updateItemMutation.isPending}
          handleGetEditUploadParameters={handleGetEditUploadParameters}
          handleEditItemUploadComplete={handleEditItemUploadComplete}
          isCapsuleSelectorOpen={isCapsuleSelectorOpen}
          setIsCapsuleSelectorOpen={setIsCapsuleSelectorOpen}
          itemToCopy={itemToCopy}
          allCapsules={allCapsules}
          isLoadingAllCapsules={isLoadingAllCapsules}
          assignItemMutation={assignItemMutation}
          isDeleteConfirmOpen={isDeleteConfirmOpen}
          setIsDeleteConfirmOpen={setIsDeleteConfirmOpen}
          itemToDelete={itemToDelete}
          deleteAffectedCapsules={deleteAffectedCapsules}
          deleteItemMutation={deleteItemMutation}
          isWardrobePickerOpen={isWardrobePickerOpen}
          setIsWardrobePickerOpen={setIsWardrobePickerOpen}
          unassignedWardrobeItems={unassignedWardrobeItems}
          isAddItemOpen={isAddItemOpen}
          setIsAddItemOpen={setIsAddItemOpen}
          newItem={newItem}
          handleNewItemFieldChange={handleNewItemFieldChange}
          handleGetUploadParameters={handleGetUploadParameters}
          handleNewItemUploadComplete={handleNewItemUploadComplete}
          handleAddItem={handleAddItem}
          createItemPending={createItemMutation.isPending}
        />
      </div>

      {/* Travel Grid Dialog */}
      <TravelGridDialog 
        items={items} 
        open={isTravelGridOpen} 
        onOpenChange={setIsTravelGridOpen} 
      />

      <div className="flex-1 overflow-y-auto p-6">
        <div className="space-y-6 mb-8">
          {/* 3x3 Travel Grid Feature - Show for Travel capsules */}
          {capsule.useCase === 'Travel' && !isJewelry && (
            <Card className="p-4 bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <Grid3X3 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">3x3 Travel Grid</h3>
                    <p className="text-xs text-muted-foreground">
                      Create 27 outfits from 9 pieces
                    </p>
                  </div>
                </div>
                <Button 
                  variant="default" 
                  size="sm"
                  onClick={() => setIsTravelGridOpen(true)}
                  data-testid="button-open-travel-grid"
                >
                  <Grid3X3 className="w-4 h-4 mr-2" />
                  Build Grid
                </Button>
              </div>
            </Card>
          )}

          {/* Category Sections with Visual Slots */}
          <div className="space-y-4">
            {displayCategories.map((category) => {
              const categoryItems = getItemsForCategory(category);
              const slotCount = categorySlots[category] || 0;
              
              return (
                <Card key={category} className="p-4" data-testid={`section-category-${category.toLowerCase()}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-base" data-testid={`text-category-${category.toLowerCase()}`}>
                      {category}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground" data-testid={`text-category-count-${category.toLowerCase()}`}>
                        {categoryItems.length} / {slotCount}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          aria-label={`Decrease ${category} slots`}
                          onClick={() => handleAdjustSlots(category, -1)}
                          disabled={slotCount === 0 || updateCategorySlotsMutation.isPending}
                          data-testid={`button-decrease-slots-${category.toLowerCase()}`}
                        >
                          <span className="text-lg">−</span>
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          aria-label={`Increase ${category} slots`}
                          onClick={() => handleAdjustSlots(category, 1)}
                          disabled={updateCategorySlotsMutation.isPending}
                          data-testid={`button-increase-slots-${category.toLowerCase()}`}
                        >
                          <span className="text-lg">+</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                  
                  {slotCount > 0 ? (
                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
                      {Array.from({ length: slotCount }).map((_, index) => {
                        const item = categoryItems[index];
                        
                        return (
                          <div
                            key={index}
                            role="button"
                            tabIndex={0}
                            className={`
                              aspect-square rounded-md border-2 border-dashed flex items-center justify-center text-xs
                              ${item 
                                ? 'bg-primary/10 border-primary/30 cursor-pointer hover-elevate' 
                                : 'bg-muted/30 border-muted-foreground/20 cursor-pointer hover-elevate active-elevate-2'
                              }
                            `}
                            onClick={() => {
                              if (item) {
                                setCapsuleDetailItem(item);
                              } else {
                                setNewItem({ ...newItem, category });
                                setIsAddItemOpen(true);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                if (item) {
                                  setCapsuleDetailItem(item);
                                } else {
                                  setNewItem({ ...newItem, category });
                                  setIsAddItemOpen(true);
                                }
                              }
                            }}
                            data-testid={item ? `slot-filled-${category.toLowerCase()}-${index}` : `slot-empty-${category.toLowerCase()}-${index}`}
                          >
                            {item ? (
                              <span className="text-center px-1 line-clamp-2 text-[10px] font-medium">
                                {item.name}
                              </span>
                            ) : (
                              <Plus className="w-4 h-4 text-muted-foreground/40" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-3">
                      Click + to add slots for this category
                    </p>
                  )}
                </Card>
              );
            })}
          </div>

          <StylePreferences
            isJewelry={isJewelry}
            materialLabel={materialLabel}
            fabrics={fabrics}
            colors={colors}
            recommendations={recommendations}
            newFabricName={newFabricName}
            setNewFabricName={setNewFabricName}
            newColorName={newColorName}
            setNewColorName={setNewColorName}
            showFabricRecommendations={showFabricRecommendations}
            setShowFabricRecommendations={setShowFabricRecommendations}
            showColorRecommendations={showColorRecommendations}
            setShowColorRecommendations={setShowColorRecommendations}
            createFabricMutation={createFabricMutation}
            deleteFabricMutation={deleteFabricMutation}
            createColorMutation={createColorMutation}
            deleteColorMutation={deleteColorMutation}
          />
        </div>

        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <PackagePlus className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-2">No items yet</h3>
            <p className="text-muted-foreground text-sm mb-4">
              Add items to start building your capsule {isJewelry ? 'collection' : 'wardrobe'}
            </p>
            <div className="space-y-2 w-full max-w-xs">
              {capsule?.wardrobeId && (
                <Card className="p-4 hover-elevate cursor-pointer text-left" onClick={() => navigate(`/wardrobes/${capsule.wardrobeId}/bulk-add?capsuleId=${id}`)} data-testid="button-bulk-add-empty">
                  <p className="font-medium text-sm mb-1">Bulk Add Items</p>
                  <p className="text-xs text-muted-foreground">Scan tags, snap photos, or type them in quickly</p>
                </Card>
              )}
              <Button onClick={() => setIsWardrobePickerOpen(true)} variant="outline" className="w-full" data-testid="button-add-from-wardrobe-empty">
                Add from Wardrobe
              </Button>
              <Button onClick={() => setIsAddItemOpen(true)} variant="ghost" className="w-full" data-testid="button-add-first-item">
                Add Single Item
              </Button>
            </div>
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
                      {item.wearCount > 0 && (
                        <div className="flex items-center gap-2 flex-wrap mt-0.5">
                          <Badge variant="secondary" className="text-xs no-default-hover-elevate" data-testid={`badge-wear-count-${item.id}`}>
                            <RefreshCw className="w-3 h-3 mr-1" />
                            {item.wearCount} wear{item.wearCount !== 1 ? "s" : ""}
                          </Badge>
                          {item.price && item.wearCount > 0 && !isNaN(parseFloat(item.price.replace(/[^0-9.]/g, ""))) && (
                            <span className="text-xs text-muted-foreground" data-testid={`text-cost-per-wear-${item.id}`}>
                              Cost/Wear: ${(parseFloat(item.price.replace(/[^0-9.]/g, "")) / item.wearCount).toFixed(2)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex gap-1">
                      <Button
                        size="icon"
                        variant={item.shoppingListId ? "default" : "ghost"}
                        className="h-8 w-8"
                        aria-label="Toggle shopping list"
                        data-testid={`button-toggle-shopping-${item.id}`}
                        onClick={() => handleShoppingListClick(item.id)}
                      >
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Item menu" data-testid={`button-item-menu-${item.id}`}>
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
                            disabled={assignItemMutation.isPending}
                            data-testid={`button-assign-item-${item.id}`}
                          >
                            <Link className="w-4 h-4 mr-2" />
                            Assign to Another Capsule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => unassignItemMutation.mutate(item.id)}
                            disabled={unassignItemMutation.isPending}
                            data-testid={`button-unassign-item-${item.id}`}
                          >
                            <Unlink className="w-4 h-4 mr-2" />
                            Remove from This Capsule
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => wearMutation.mutate(item.id)}
                            disabled={wearMutation.isPending}
                            data-testid={`button-log-wear-${item.id}`}
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            Log Wear
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleExportItem(item)}
                            data-testid={`button-export-item-${item.id}`}
                          >
                            <Share2 className="w-4 h-4 mr-2" />
                            Share
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteItemClick(item)}
                            disabled={deleteItemMutation.isPending}
                            className="text-destructive focus:text-destructive"
                            data-testid={`button-delete-item-${item.id}`}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete from Wardrobe
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

        <OutfitSection
          items={items}
          outfitPairings={outfitPairings}
          isCreateOutfitOpen={isCreateOutfitOpen}
          setIsCreateOutfitOpen={setIsCreateOutfitOpen}
          editingOutfitId={editingOutfitId}
          outfitName={outfitName}
          setOutfitName={setOutfitName}
          outfitOccasion={outfitOccasion}
          setOutfitOccasion={setOutfitOccasion}
          selectedItemsForOutfit={selectedItemsForOutfit}
          handleToggleItemSelection={handleToggleItemSelection}
          handleOpenCreateOutfit={handleOpenCreateOutfit}
          handleOpenEditOutfit={handleOpenEditOutfit}
          handleSaveOutfit={handleSaveOutfit}
          handleShareOutfit={handleShareOutfit}
          deleteOutfitPairingMutation={deleteOutfitPairingMutation}
          createOutfitPairingPending={createOutfitPairingMutation.isPending}
        />
      </div>
      <ItemDetailModal
        item={capsuleDetailItem}
        open={!!capsuleDetailItem}
        onOpenChange={(open) => { if (!open) setCapsuleDetailItem(null); }}
        context="capsule"
        onEdit={() => {
          if (capsuleDetailItem) {
            openEditItemDialog(capsuleDetailItem);
            setCapsuleDetailItem(null);
          }
        }}
        onRemoveFromCapsule={() => {
          if (capsuleDetailItem) {
            unassignItemMutation.mutate(capsuleDetailItem.id);
            setCapsuleDetailItem(null);
          }
        }}
        onAssignToAnotherCapsule={() => {
          if (capsuleDetailItem) {
            setItemToCopy(capsuleDetailItem);
            setCapsuleDetailItem(null);
            setIsCapsuleSelectorOpen(true);
          }
        }}
        onLogWear={() => {
          if (capsuleDetailItem) {
            capsuleLogWearMutation.mutate(capsuleDetailItem.id);
          }
        }}
        onDeleteFromWardrobe={() => {
          if (capsuleDetailItem) {
            handleDeleteItemClick(capsuleDetailItem);
            setCapsuleDetailItem(null);
          }
        }}
        removeFromCapsulePending={unassignItemMutation.isPending}
        logWearPending={capsuleLogWearMutation.isPending}
        deletePending={deleteItemMutation.isPending}
      />
    </div>
  );
}
