import { useState, useEffect } from "react";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, ShoppingCart, Pencil, Copy, Share2, Trash2, X, Sparkles, Link, Unlink, PackagePlus, FileDown, RefreshCw } from "lucide-react";
import { exportCapsuleToPDF } from "@/lib/pdfExport";
import type { Capsule, Item, ShoppingList, CapsuleFabric, CapsuleColor, CategorySlots, ItemCategory } from "@shared/schema";
import { ITEM_CATEGORIES, CLOTHING_CATEGORIES, JEWELRY_CATEGORIES } from "@shared/schema";
import BottomNav from "@/components/BottomNav";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { MoreVertical } from "lucide-react";
import { ObjectUploader } from "@/components/ObjectUploader";
import type { UploadResult } from "@uppy/core";
import { AddItemForm } from "@/components/AddItemForm";
import { getFabricInfo, getPriceLabel } from "@/lib/fabricInfo";
import { TravelGridDialog } from "@/components/TravelGrid";
import { Grid3X3 } from "lucide-react";
import ItemDetailModal from "@/components/ItemDetailModal";

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
  const [includeMeasurements, setIncludeMeasurements] = useState(false);
  const [exportMethod, setExportMethod] = useState<'download' | 'share'>('download');
  const [shareLink, setShareLink] = useState<string | null>(null);
  const [editingOutfitId, setEditingOutfitId] = useState<string | null>(null);
  const [isItemExportDialogOpen, setIsItemExportDialogOpen] = useState(false);
  const [itemToExport, setItemToExport] = useState<Item | null>(null);
  const [itemExportMethod, setItemExportMethod] = useState<'download' | 'share'>('download');
  const [itemShareLink, setItemShareLink] = useState<string | null>(null);
  const [includeItemMeasurements, setIncludeItemMeasurements] = useState(false);
  const [isOutfitExportDialogOpen, setIsOutfitExportDialogOpen] = useState(false);
  const [outfitToExport, setOutfitToExport] = useState<any | null>(null);
  const [outfitExportMethod, setOutfitExportMethod] = useState<'download' | 'share'>('download');
  const [outfitShareLink, setOutfitShareLink] = useState<string | null>(null);
  const [includeOutfitMeasurements, setIncludeOutfitMeasurements] = useState(false);
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

  const handleShareOutfit = (pairing: any) => {
    setOutfitToExport(pairing);
    setIsOutfitExportDialogOpen(true);
  };

  const handleConfirmOutfitExport = async () => {
    if (!outfitToExport) return;

    try {
      if (outfitExportMethod === 'download') {
        const queryParam = includeOutfitMeasurements ? '?includeMeasurements=true' : '';
        const response = await fetch(`/api/outfit-pairings/${outfitToExport.id}/export${queryParam}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `outfit-${outfitToExport.outfitData.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setIsOutfitExportDialogOpen(false);
        setIncludeOutfitMeasurements(false);
        setOutfitExportMethod('download');
        setOutfitShareLink(null);
        setOutfitToExport(null);
        
        toast({
          title: "Success",
          description: "Outfit exported successfully",
        });
      } else {
        // Create shareable link
        const queryParam = includeOutfitMeasurements ? '?includeMeasurements=true' : '';
        const response = await fetch(`/api/outfit-pairings/${outfitToExport.id}/export${queryParam}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Export failed');
        }

        const exportData = await response.json();
        
        // Create shared export
        const shareResponse = await apiRequest('/api/shared-exports', 'POST', {
          exportType: 'outfit',
          exportData,
        });

        const fullShareUrl = `${window.location.origin}${shareResponse.shareUrl}`;
        setOutfitShareLink(fullShareUrl);
        
        toast({
          title: "Shareable link created!",
          description: "You can now copy and share the link below",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${outfitExportMethod === 'download' ? 'export' : 'create share link for'} outfit`,
        variant: "destructive",
      });
    }
  };

  const handleExportCapsule = () => {
    setIsExportDialogOpen(true);
  };

  const handleConfirmExport = async () => {
    try {
      if (exportMethod === 'share') {
        // Create shareable link
        const queryParam = includeMeasurements ? '?includeMeasurements=true' : '';
        const response = await fetch(`/api/capsules/${id}/export${queryParam}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Export failed');
        }

        const exportData = await response.json();
        
        // Create shared export
        const shareResponse = await apiRequest('/api/shared-exports', 'POST', {
          exportType: 'capsule',
          exportData,
        });

        const fullShareUrl = `${window.location.origin}${shareResponse.shareUrl}`;
        setShareLink(fullShareUrl);
        
        toast({
          title: "Shareable link created!",
          description: "You can now copy and share the link below",
        });
      } else {
        // Download JSON
        const queryParam = includeMeasurements ? '?includeMeasurements=true' : '';
        const response = await fetch(`/api/capsules/${id}/export${queryParam}`, {
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

        setIsExportDialogOpen(false);
        setIncludeMeasurements(false);
        setExportMethod('download');

        toast({
          title: "Success",
          description: "Capsule exported successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export capsule",
        variant: "destructive",
      });
    }
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

  const handleConfirmItemExport = async () => {
    if (!itemToExport) return;

    try {
      if (itemExportMethod === 'download') {
        const queryParam = includeItemMeasurements ? '?includeMeasurements=true' : '';
        const response = await fetch(`/api/items/${itemToExport.id}/export${queryParam}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `item-${itemToExport.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        setIsItemExportDialogOpen(false);
        setIncludeItemMeasurements(false);
        setItemExportMethod('download');
        setItemShareLink(null);
        setItemToExport(null);
        
        toast({
          title: "Success",
          description: "Item exported successfully",
        });
      } else {
        // Create shareable link
        const queryParam = includeItemMeasurements ? '?includeMeasurements=true' : '';
        const response = await fetch(`/api/items/${itemToExport.id}/export${queryParam}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
          throw new Error('Export failed');
        }

        const exportData = await response.json();
        
        // Create shared export
        const shareResponse = await apiRequest('/api/shared-exports', 'POST', {
          exportType: 'item',
          exportData,
        });

        const fullShareUrl = `${window.location.origin}${shareResponse.shareUrl}`;
        setItemShareLink(fullShareUrl);
        
        toast({
          title: "Shareable link created!",
          description: "You can now copy and share the link below",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${itemExportMethod === 'download' ? 'export' : 'create share link for'} item`,
        variant: "destructive",
      });
    }
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

        {/* Export Options Dialog */}
        <Dialog open={isExportDialogOpen} onOpenChange={(open) => {
          setIsExportDialogOpen(open);
          if (!open) {
            setIncludeMeasurements(false);
            setExportMethod('download');
            setShareLink(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Capsule</DialogTitle>
              <DialogDescription>
                Choose how you want to share your capsule
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Export Method</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="download-method"
                      name="export-method"
                      checked={exportMethod === 'download'}
                      onChange={() => setExportMethod('download')}
                      className="w-4 h-4"
                      data-testid="radio-export-download"
                    />
                    <label htmlFor="download-method" className="text-sm font-medium cursor-pointer">
                      Download JSON
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="share-method"
                      name="export-method"
                      checked={exportMethod === 'share'}
                      onChange={() => setExportMethod('share')}
                      className="w-4 h-4"
                      data-testid="radio-export-share"
                    />
                    <label htmlFor="share-method" className="text-sm font-medium cursor-pointer">
                      Create shareable link
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="include-measurements-capsule"
                  checked={includeMeasurements}
                  onCheckedChange={(checked) => setIncludeMeasurements(checked === true)}
                  data-testid="checkbox-include-measurements-capsule"
                />
                <label
                  htmlFor="include-measurements-capsule"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include my measurements and sizes
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                This will add your body measurements and preferred clothing sizes to the export
              </p>

              {shareLink && (
                <div className="space-y-2 p-3 bg-muted rounded-md">
                  <Label>Shareable Link</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={shareLink}
                      readOnly
                      className="flex-1"
                      data-testid="input-share-link"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(shareLink);
                        toast({
                          title: "Copied!",
                          description: "Share link copied to clipboard",
                        });
                      }}
                      data-testid="button-copy-share-link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone with this link can view and save items from your capsule
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsExportDialogOpen(false);
                  setIncludeMeasurements(false);
                  setExportMethod('download');
                  setShareLink(null);
                }}
                data-testid="button-cancel-export-capsule"
              >
                {shareLink ? 'Close' : 'Cancel'}
              </Button>
              {!shareLink && (
                <>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (capsule) {
                        exportCapsuleToPDF(
                          capsule,
                          items,
                          includeMeasurements ? (capsule as any).measurements : undefined,
                        );
                        setIsExportDialogOpen(false);
                        setIncludeMeasurements(false);
                        setExportMethod('download');
                        toast({
                          title: "Success",
                          description: "Capsule PDF exported successfully",
                        });
                      }
                    }}
                    data-testid="button-export-capsule-pdf"
                  >
                    <FileDown className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    onClick={handleConfirmExport}
                    data-testid="button-confirm-export-capsule"
                  >
                    {exportMethod === 'download' ? 'Download JSON' : 'Create Link'}
                  </Button>
                </>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Item Export Dialog */}
        <Dialog open={isItemExportDialogOpen} onOpenChange={(open) => {
          setIsItemExportDialogOpen(open);
          if (!open) {
            setIncludeItemMeasurements(false);
            setItemExportMethod('download');
            setItemShareLink(null);
            setItemToExport(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Item</DialogTitle>
              <DialogDescription>
                Choose how you want to share this item
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Export Method</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="item-download-method"
                      name="item-export-method"
                      checked={itemExportMethod === 'download'}
                      onChange={() => setItemExportMethod('download')}
                      className="w-4 h-4"
                      data-testid="radio-item-export-download"
                    />
                    <label htmlFor="item-download-method" className="text-sm font-medium cursor-pointer">
                      Download JSON
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="item-share-method"
                      name="item-export-method"
                      checked={itemExportMethod === 'share'}
                      onChange={() => setItemExportMethod('share')}
                      className="w-4 h-4"
                      data-testid="radio-item-export-share"
                    />
                    <label htmlFor="item-share-method" className="text-sm font-medium cursor-pointer">
                      Create shareable link
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="item-include-measurements"
                  checked={includeItemMeasurements}
                  onCheckedChange={(checked) => setIncludeItemMeasurements(checked === true)}
                  data-testid="checkbox-item-include-measurements"
                />
                <label
                  htmlFor="item-include-measurements"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include my measurements and sizes
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                This will add your body measurements and preferred clothing sizes to the export
              </p>

              {itemShareLink && (
                <div className="space-y-2 p-3 bg-muted rounded-md">
                  <Label>Shareable Link</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={itemShareLink}
                      readOnly
                      className="flex-1"
                      data-testid="input-item-share-link"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(itemShareLink);
                        toast({
                          title: "Copied!",
                          description: "Share link copied to clipboard",
                        });
                      }}
                      data-testid="button-copy-item-share-link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone with this link can view and save this item
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsItemExportDialogOpen(false);
                  setIncludeItemMeasurements(false);
                  setItemExportMethod('download');
                  setItemShareLink(null);
                  setItemToExport(null);
                }}
                data-testid="button-cancel-export-item"
              >
                {itemShareLink ? 'Close' : 'Cancel'}
              </Button>
              {!itemShareLink && (
                <Button
                  onClick={handleConfirmItemExport}
                  data-testid="button-confirm-export-item"
                >
                  {itemExportMethod === 'download' ? 'Download JSON' : 'Create Link'}
                </Button>
              )}
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Outfit Export Dialog */}
        <Dialog open={isOutfitExportDialogOpen} onOpenChange={(open) => {
          setIsOutfitExportDialogOpen(open);
          if (!open) {
            setIncludeOutfitMeasurements(false);
            setOutfitExportMethod('download');
            setOutfitShareLink(null);
            setOutfitToExport(null);
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Export Outfit</DialogTitle>
              <DialogDescription>
                Choose how you want to share this outfit
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Export Method</Label>
                <div className="flex gap-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="outfit-download-method"
                      name="outfit-export-method"
                      checked={outfitExportMethod === 'download'}
                      onChange={() => setOutfitExportMethod('download')}
                      className="w-4 h-4"
                      data-testid="radio-outfit-export-download"
                    />
                    <label htmlFor="outfit-download-method" className="text-sm font-medium cursor-pointer">
                      Download JSON
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="radio"
                      id="outfit-share-method"
                      name="outfit-export-method"
                      checked={outfitExportMethod === 'share'}
                      onChange={() => setOutfitExportMethod('share')}
                      className="w-4 h-4"
                      data-testid="radio-outfit-export-share"
                    />
                    <label htmlFor="outfit-share-method" className="text-sm font-medium cursor-pointer">
                      Create shareable link
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="outfit-include-measurements"
                  checked={includeOutfitMeasurements}
                  onCheckedChange={(checked) => setIncludeOutfitMeasurements(checked === true)}
                  data-testid="checkbox-outfit-include-measurements"
                />
                <label
                  htmlFor="outfit-include-measurements"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Include my measurements and sizes
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                This will add your body measurements and preferred clothing sizes to the export
              </p>

              {outfitShareLink && (
                <div className="space-y-2 p-3 bg-muted rounded-md">
                  <Label>Shareable Link</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={outfitShareLink}
                      readOnly
                      className="flex-1"
                      data-testid="input-outfit-share-link"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(outfitShareLink);
                        toast({
                          title: "Copied!",
                          description: "Share link copied to clipboard",
                        });
                      }}
                      data-testid="button-copy-outfit-share-link"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Anyone with this link can view and save this outfit
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => {
                  setIsOutfitExportDialogOpen(false);
                  setIncludeOutfitMeasurements(false);
                  setOutfitExportMethod('download');
                  setOutfitShareLink(null);
                  setOutfitToExport(null);
                }}
                data-testid="button-cancel-export-outfit"
              >
                {outfitShareLink ? 'Close' : 'Cancel'}
              </Button>
              {!outfitShareLink && (
                <Button
                  onClick={handleConfirmOutfitExport}
                  data-testid="button-confirm-export-outfit"
                >
                  {outfitExportMethod === 'download' ? 'Download JSON' : 'Create Link'}
                </Button>
              )}
            </DialogFooter>
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
                disabled={updateItemMutation.isPending}
              >
                {updateItemMutation.isPending ? "Updating..." : "Update Item"}
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
              <div className="space-y-2">
                {allCapsules
                  .filter(c => c.id !== id)
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
              {allCapsules.filter(c => c.id !== id).length === 0 && (
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
                      assignItemMutation.mutate({ itemId: wi.id, targetCapsuleId: id });
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
          <Button size="icon" variant="outline" onClick={() => navigate(`/wardrobes/${capsule.wardrobeId}/bulk-add?capsuleId=${id}`)} data-testid="button-bulk-add">
            <PackagePlus className="w-5 h-5" />
          </Button>
        )}
        <Button size="icon" variant="outline" onClick={() => setIsWardrobePickerOpen(true)} data-testid="button-add-from-wardrobe">
          <Link className="w-5 h-5" />
        </Button>
        <Dialog open={isAddItemOpen} onOpenChange={setIsAddItemOpen}>
          <DialogTrigger asChild>
            <Button size="icon" data-testid="button-add-item">
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
                disabled={createItemMutation.isPending}
              >
                {createItemMutation.isPending ? "Adding..." : "Add Item"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
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

          {/* My Fabrics/Metal Types Section */}
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

          {/* My Colors Section - Only for Clothing Capsules */}
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
                          {item.price && (
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
                  disabled={createOutfitPairingMutation.isPending}
                  className="flex-1"
                  data-testid="button-save-outfit"
                >
                  {createOutfitPairingMutation.isPending ? 'Saving...' : 'Save Outfit'}
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
      </div>
      <BottomNav activeTab="capsules" onTabChange={(tab) => navigate(`/#${tab}`)} />

      <ItemDetailModal
        item={capsuleDetailItem}
        open={!!capsuleDetailItem}
        onOpenChange={(open) => { if (!open) setCapsuleDetailItem(null); }}
        context="capsule"
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
