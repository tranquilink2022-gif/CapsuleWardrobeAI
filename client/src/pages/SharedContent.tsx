import { useState } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Loader2, Package, ShoppingBag, User, ArrowLeft, Bookmark, BookmarkCheck } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import type { Capsule, ShoppingList, SavedSharedItem, Wardrobe } from '@shared/schema';

interface SharedExport {
  id: string;
  exportType: 'capsule' | 'shopping_list';
  exportData: any;
  createdAt: string;
}

export default function SharedContent() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: sharedExport, isLoading, error } = useQuery<SharedExport>({
    queryKey: ['/api/shared-exports', id],
    enabled: !!id,
  });

  const { data: savedItems = [] } = useQuery<SavedSharedItem[]>({
    queryKey: ['/api/saved-shared-items'],
    enabled: !!user,
  });

  const alreadySaved = savedItems.some(item => item.sharedExportId === id);

  const saveToCollectionMutation = useMutation({
    mutationFn: async () => {
      if (!sharedExport || !id) return;
      
      const itemType = sharedExport.exportType;
      const itemData = sharedExport.exportData;
      
      // Get source user name if available from the export data
      let sourceUserName = null;
      if (itemType === 'capsule' && itemData.capsule) {
        sourceUserName = itemData.exportedBy || null;
      } else if (itemType === 'shopping_list' && itemData.shoppingList) {
        sourceUserName = itemData.exportedBy || null;
      }

      return await apiRequest('/api/saved-shared-items', 'POST', {
        sharedExportId: id,
        itemType,
        itemData,
        sourceUserName,
      });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/saved-shared-items'] });
      toast({
        title: "Saved!",
        description: "This item has been added to your collection.",
      });
    },
    onError: (error: any) => {
      if (error.message?.includes("already saved")) {
        toast({
          title: "Already saved",
          description: "You've already saved this item to your collection.",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to save item. Please try again.",
          variant: "destructive",
        });
      }
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  if (error || !sharedExport) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Share Not Found</CardTitle>
            <CardDescription>
              This shared link is invalid or has expired.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => setLocation('/')} data-testid="button-go-home">
              Go to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { exportType, exportData } = sharedExport;
  const isCapsule = exportType === 'capsule';

  return (
    <div className="min-h-screen bg-background">
      <div className="container max-w-4xl mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <h1 className="text-2xl font-bold">Shared {isCapsule ? 'Capsule' : 'Shopping List'}</h1>
          </div>
          {user ? (
            alreadySaved ? (
              <Button
                variant="secondary"
                disabled
                data-testid="button-save-to-collection"
              >
                <BookmarkCheck className="w-4 h-4 mr-2" />
                Saved
              </Button>
            ) : (
              <Button
                variant="default"
                onClick={() => saveToCollectionMutation.mutate()}
                disabled={saveToCollectionMutation.isPending}
                data-testid="button-save-to-collection"
              >
                <Bookmark className="w-4 h-4 mr-2" />
                Save to Collection
              </Button>
            )
          ) : null}
        </div>

        {!user && (
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Sign in to save items
              </CardTitle>
              <CardDescription>
                Create an account or sign in to save items from this {isCapsule ? 'capsule' : 'shopping list'} to your own collection.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => setLocation('/')} data-testid="button-sign-in">
                Sign In / Sign Up
              </Button>
            </CardContent>
          </Card>
        )}

        {isCapsule ? (
          <CapsuleView capsuleData={exportData} isAuthenticated={!!user} />
        ) : (
          <ShoppingListView shoppingListData={exportData} isAuthenticated={!!user} />
        )}
      </div>
    </div>
  );
}

function CapsuleView({ capsuleData, isAuthenticated }: { capsuleData: any; isAuthenticated: boolean }) {
  const { capsule, items, fabrics, colors, measurements } = capsuleData;
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string>('');
  const { toast } = useToast();

  const { data: userWardrobes = [] } = useQuery<Wardrobe[]>({
    queryKey: ['/api/wardrobes'],
    enabled: isAuthenticated,
  });

  const defaultWardrobe = userWardrobes.find(w => w.isDefault) || userWardrobes[0];

  const { data: userCapsules = [] } = useQuery<Capsule[]>({
    queryKey: ['/api/capsules'],
    enabled: isAuthenticated,
  });

  const importItemsMutation = useMutation({
    mutationFn: async ({ wardrobeId, capsuleId }: { wardrobeId: string; capsuleId?: string }) => {
      const bulkItems = (items || []).map((item: any) => ({
        category: item.category,
        name: item.name,
        color: item.color || '',
        size: item.size || '',
        material: item.material || '',
        washInstructions: item.washInstructions || '',
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        productLink: item.productLink || '',
        quantity: 1,
      }));

      const createdItems = await apiRequest('/api/items/bulk', 'POST', {
        wardrobeId,
        capsuleId: capsuleId || undefined,
        items: bulkItems,
      });

      return { importedItems: createdItems, count: Array.isArray(createdItems) ? createdItems.length : 0, capsuleId };
    },
    onSuccess: (data) => {
      if (data.capsuleId) {
        queryClient.refetchQueries({ queryKey: ['/api/capsules', data.capsuleId, 'items'] });
      }
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
      if (defaultWardrobe) {
        queryClient.refetchQueries({ queryKey: ['/api/wardrobes', defaultWardrobe.id, 'items'] });
      }
      setIsImportDialogOpen(false);
      setSelectedCapsuleId('');
      const desc = data.capsuleId
        ? `${data.count} items imported to your wardrobe and assigned to capsule`
        : `${data.count} items imported to your wardrobe`;
      toast({
        title: "Success!",
        description: desc,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import items",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!defaultWardrobe) {
      toast({
        title: "Error",
        description: "No wardrobe found. Please create a wardrobe first.",
        variant: "destructive",
      });
      return;
    }
    importItemsMutation.mutate({
      wardrobeId: defaultWardrobe.id,
      capsuleId: selectedCapsuleId || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{capsule.name}</CardTitle>
              <CardDescription className="mt-2">
                <div className="flex flex-wrap gap-2">
                  {capsule.capsuleCategory && (
                    <Badge variant="outline" data-testid={`badge-category-${capsule.capsuleCategory.toLowerCase()}`}>
                      {capsule.capsuleCategory}
                    </Badge>
                  )}
                  {capsule.season && (
                    <Badge variant="outline" data-testid={`badge-season-${capsule.season.toLowerCase()}`}>
                      {capsule.season}
                    </Badge>
                  )}
                  {capsule.climate && (
                    <Badge variant="outline" data-testid={`badge-climate-${capsule.climate.toLowerCase()}`}>
                      {capsule.climate}
                    </Badge>
                  )}
                  {capsule.useCase && (
                    <Badge variant="outline" data-testid={`badge-usecase-${capsule.useCase.toLowerCase()}`}>
                      {capsule.useCase}
                    </Badge>
                  )}
                  {capsule.style && (
                    <Badge variant="outline" data-testid={`badge-style-${capsule.style.toLowerCase()}`}>
                      {capsule.style}
                    </Badge>
                  )}
                </div>
              </CardDescription>
            </div>
            <Badge variant="secondary" data-testid="badge-item-count">
              {items?.length || 0} items
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {fabrics && fabrics.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Recommended {capsule.capsuleCategory === 'Jewelry' ? 'Metals' : 'Fabrics'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {fabrics.map((fabric: any, index: number) => (
                <Badge key={index} variant="secondary" data-testid={`badge-fabric-${index}`}>
                  {fabric.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {colors && colors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Color Palette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {colors.map((color: any, index: number) => (
                <Badge key={index} variant="secondary" data-testid={`badge-color-${index}`}>
                  {color.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {measurements && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Shared Measurements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
              {Object.entries(measurements).map(([key, value]: [string, any]) => (
                <div key={key} data-testid={`measurement-${key}`}>
                  <div className="text-muted-foreground">{key.replace(/([A-Z])/g, ' $1').trim()}</div>
                  <div className="font-medium">{value.value} {value.unit}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {items && items.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Items</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item: any, index: number) => (
              <Card key={index} data-testid={`card-item-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </CardDescription>
                    </div>
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-md"
                        data-testid={`img-item-${index}`}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.color && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Color:</span> {item.color}
                    </div>
                  )}
                  {item.size && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Size:</span> {item.size}
                    </div>
                  )}
                  {item.material && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Material:</span> {item.material}
                    </div>
                  )}
                  {item.description && (
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  )}
                  {item.productLink && (
                    <a
                      href={item.productLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                      data-testid={`link-product-${index}`}
                    >
                      View Product →
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isAuthenticated && (
        <>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Save to Your Collection
              </CardTitle>
              <CardDescription>
                Import items from this capsule to your own wardrobe
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsImportDialogOpen(true)}
                data-testid="button-import-items"
              >
                Import Items
              </Button>
            </CardContent>
          </Card>

          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Items to Wardrobe</DialogTitle>
                <DialogDescription>
                  Import {items?.length || 0} items to your wardrobe. Optionally assign them to a capsule.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                {defaultWardrobe && (
                  <div className="space-y-2">
                    <Label>Wardrobe</Label>
                    <p className="text-sm text-muted-foreground" data-testid="text-target-wardrobe">
                      {defaultWardrobe.name}
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Assign to Capsule (optional)</Label>
                  <Select value={selectedCapsuleId} onValueChange={setSelectedCapsuleId}>
                    <SelectTrigger data-testid="select-target-capsule">
                      <SelectValue placeholder="No capsule — wardrobe only" />
                    </SelectTrigger>
                    <SelectContent>
                      {userCapsules.map((userCapsule) => (
                        <SelectItem key={userCapsule.id} value={userCapsule.id}>
                          {userCapsule.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Items will be added to your wardrobe and can be assigned to any capsule later.
                  </p>
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsImportDialogOpen(false);
                    setSelectedCapsuleId('');
                  }}
                  data-testid="button-cancel-import"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={!defaultWardrobe || importItemsMutation.isPending}
                  data-testid="button-confirm-import"
                >
                  {importItemsMutation.isPending ? 'Importing...' : 'Import'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}

function ShoppingListView({ shoppingListData, isAuthenticated }: { shoppingListData: any; isAuthenticated: boolean }) {
  const { shoppingList, items } = shoppingListData;
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [selectedShoppingListId, setSelectedShoppingListId] = useState<string>('');
  const { toast } = useToast();

  const { data: userWardrobes = [] } = useQuery<Wardrobe[]>({
    queryKey: ['/api/wardrobes'],
    enabled: isAuthenticated,
  });

  const defaultWardrobe = userWardrobes.find(w => w.isDefault) || userWardrobes[0];

  const { data: userShoppingLists = [] } = useQuery<ShoppingList[]>({
    queryKey: ['/api/shopping-lists'],
    enabled: isAuthenticated,
  });

  const importItemsMutation = useMutation({
    mutationFn: async (shoppingListId: string) => {
      if (!defaultWardrobe) {
        throw new Error("No wardrobe found. Please create a wardrobe first.");
      }

      const bulkItems = (items || []).map((item: any) => ({
        category: item.category,
        name: item.name,
        color: item.color || '',
        size: item.size || '',
        material: item.material || '',
        washInstructions: item.washInstructions || '',
        description: item.description || '',
        imageUrl: item.imageUrl || '',
        productLink: item.productLink || '',
        shoppingListId,
        quantity: 1,
      }));

      const createdItems = await apiRequest('/api/items/bulk', 'POST', {
        wardrobeId: defaultWardrobe.id,
        items: bulkItems,
      });

      return { importedItems: createdItems, count: Array.isArray(createdItems) ? createdItems.length : 0 };
    },
    onSuccess: (data, shoppingListId) => {
      queryClient.refetchQueries({ queryKey: ['/api/shopping-lists', shoppingListId, 'items'] });
      queryClient.refetchQueries({ queryKey: ['/api/shopping-lists'] });
      if (defaultWardrobe) {
        queryClient.refetchQueries({ queryKey: ['/api/wardrobes', defaultWardrobe.id, 'items'] });
      }
      setIsImportDialogOpen(false);
      setSelectedShoppingListId('');
      toast({
        title: "Success!",
        description: `${data.count} items imported to your wardrobe and shopping list`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import items",
        variant: "destructive",
      });
    },
  });

  const handleImport = () => {
    if (!selectedShoppingListId) {
      toast({
        title: "Error",
        description: "Please select a shopping list to import to",
        variant: "destructive",
      });
      return;
    }
    if (!defaultWardrobe) {
      toast({
        title: "Error",
        description: "No wardrobe found. Please create a wardrobe first.",
        variant: "destructive",
      });
      return;
    }
    importItemsMutation.mutate(selectedShoppingListId);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="text-xl">{shoppingList.name}</CardTitle>
            </div>
            <Badge variant="secondary" data-testid="badge-item-count">
              {items?.length || 0} items
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {items && items.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Items to Purchase</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {items.map((item: any, index: number) => (
              <Card key={index} data-testid={`card-item-${index}`}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base">{item.name}</CardTitle>
                      <CardDescription className="mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.category}
                        </Badge>
                      </CardDescription>
                    </div>
                    {item.imageUrl && (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-16 h-16 object-cover rounded-md"
                        data-testid={`img-item-${index}`}
                      />
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {item.color && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Color:</span> {item.color}
                    </div>
                  )}
                  {item.size && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Size:</span> {item.size}
                    </div>
                  )}
                  {item.material && (
                    <div className="text-sm">
                      <span className="text-muted-foreground">Material:</span> {item.material}
                    </div>
                  )}
                  {item.description && (
                    <div className="text-sm text-muted-foreground">{item.description}</div>
                  )}
                  {item.productLink && (
                    <a
                      href={item.productLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline"
                      data-testid={`link-product-${index}`}
                    >
                      View Product →
                    </a>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {isAuthenticated && (
        <>
          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Save to Your Shopping Lists
              </CardTitle>
              <CardDescription>
                Add items from this shopping list to your own lists
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => setIsImportDialogOpen(true)}
                data-testid="button-import-items"
              >
                Import Items
              </Button>
            </CardContent>
          </Card>

          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Items to Shopping List</DialogTitle>
                <DialogDescription>
                  Select which shopping list you want to import {items?.length || 0} items to
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Select Shopping List</Label>
                  <Select value={selectedShoppingListId} onValueChange={setSelectedShoppingListId}>
                    <SelectTrigger data-testid="select-target-shopping-list">
                      <SelectValue placeholder="Choose a shopping list..." />
                    </SelectTrigger>
                    <SelectContent>
                      {userShoppingLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {userShoppingLists.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      You don't have any shopping lists yet. Create one first to import items.
                    </p>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setIsImportDialogOpen(false);
                    setSelectedShoppingListId('');
                  }}
                  data-testid="button-cancel-import"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleImport}
                  disabled={!selectedShoppingListId || importItemsMutation.isPending}
                  data-testid="button-confirm-import"
                >
                  {importItemsMutation.isPending ? 'Importing...' : 'Import'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
