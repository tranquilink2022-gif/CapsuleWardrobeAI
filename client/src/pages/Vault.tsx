import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ExternalLink, Sparkles, Plus, ShoppingBag, Check } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { AffiliateProduct, Capsule, ShoppingList } from "@shared/schema";
import { VAULT_CATEGORIES } from "@shared/schema";

export default function Vault() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<AffiliateProduct | null>(null);
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string>("");
  const [selectedShoppingListId, setSelectedShoppingListId] = useState<string>("");
  const { toast } = useToast();

  const { data: products = [], isLoading } = useQuery<AffiliateProduct[]>({
    queryKey: ['/api/vault/products', selectedCategory],
    queryFn: async () => {
      const url = selectedCategory 
        ? `/api/vault/products?category=${encodeURIComponent(selectedCategory)}`
        : '/api/vault/products';
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch products');
      return response.json();
    },
  });

  const { data: capsules = [] } = useQuery<Capsule[]>({
    queryKey: ['/api/capsules'],
  });

  const { data: shoppingLists = [] } = useQuery<ShoppingList[]>({
    queryKey: ['/api/shopping-lists'],
  });

  const addToListMutation = useMutation({
    mutationFn: async ({ product, capsuleId, shoppingListId }: { 
      product: AffiliateProduct; 
      capsuleId: string; 
      shoppingListId?: string;
    }) => {
      const payload: any = {
        capsuleId,
        category: product.category,
        name: product.name,
        description: product.description,
        imageUrl: product.imageUrl,
        productLink: product.affiliateUrl,
        material: product.brand,
      };
      if (shoppingListId) {
        payload.shoppingListId = shoppingListId;
      }
      return await apiRequest('/api/items', 'POST', payload);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
      queryClient.refetchQueries({ queryKey: ['/api/capsules', selectedCapsuleId, 'items'] });
      const hasShoppingList = selectedShoppingListId && selectedShoppingListId !== "none";
      if (hasShoppingList) {
        queryClient.refetchQueries({ queryKey: ['/api/shopping-lists'] });
        queryClient.refetchQueries({ queryKey: ['/api/shopping-lists', selectedShoppingListId, 'items'] });
      }
      const addedToList = hasShoppingList ? " and shopping list" : "";
      setIsAddDialogOpen(false);
      setSelectedProduct(null);
      setSelectedCapsuleId("");
      setSelectedShoppingListId("");
      toast({
        title: "Item Added",
        description: `This item has been saved to your capsule${addedToList}.`,
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleProductClick = (productId: string) => {
    window.open(`/api/vault/products/${productId}/go`, '_blank');
  };

  const handleAddToListClick = (e: React.MouseEvent, product: AffiliateProduct) => {
    e.stopPropagation();
    setSelectedProduct(product);
    setIsAddDialogOpen(true);
  };

  const handleConfirmAdd = () => {
    if (!selectedProduct || !selectedCapsuleId) return;
    const listId = selectedShoppingListId && selectedShoppingListId !== "none" ? selectedShoppingListId : undefined;
    addToListMutation.mutate({
      product: selectedProduct,
      capsuleId: selectedCapsuleId,
      shoppingListId: listId,
    });
  };

  const handleDialogClose = () => {
    setIsAddDialogOpen(false);
    setSelectedProduct(null);
    setSelectedCapsuleId("");
    setSelectedShoppingListId("");
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-primary" />
          <h2 className="font-serif text-2xl font-semibold text-foreground">
            The Vault
          </h2>
        </div>
        <ThemeToggle />
      </div>

      <div className="px-4 py-3 border-b overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          <Button
            variant={selectedCategory === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedCategory(null)}
            data-testid="button-filter-all"
          >
            All
          </Button>
          {VAULT_CATEGORIES.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
              data-testid={`button-filter-${category.toLowerCase()}`}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-4">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="overflow-hidden">
                <Skeleton className="aspect-square w-full" />
                <CardContent className="p-3 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                  <Skeleton className="h-6 w-1/3" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Sparkles className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-2">Coming Soon</h3>
            <p className="text-muted-foreground text-sm">
              Curated picks will be available here shortly
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            {products.map((product) => (
              <Card 
                key={product.id} 
                className="overflow-hidden hover-elevate cursor-pointer"
                onClick={() => handleProductClick(product.id)}
                data-testid={`card-product-${product.id}`}
              >
                {product.imageUrl ? (
                  <div className="aspect-square bg-muted relative">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-2 right-2 h-8 w-8 rounded-full shadow-lg"
                      onClick={(e) => handleAddToListClick(e, product)}
                      data-testid={`button-add-to-list-${product.id}`}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="aspect-square bg-muted flex items-center justify-center relative">
                    <Sparkles className="w-8 h-8 text-muted-foreground" />
                    <Button
                      size="icon"
                      variant="secondary"
                      className="absolute bottom-2 right-2 h-8 w-8 rounded-full shadow-lg"
                      onClick={(e) => handleAddToListClick(e, product)}
                      data-testid={`button-add-to-list-${product.id}`}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}
                <CardContent className="p-3">
                  <div className="flex items-start justify-between gap-1">
                    <div className="flex-1 min-w-0">
                      {product.brand && (
                        <p className="text-xs text-muted-foreground truncate">
                          {product.brand}
                        </p>
                      )}
                      <h3 className="font-medium text-sm line-clamp-2 leading-tight">
                        {product.name}
                      </h3>
                    </div>
                    <ExternalLink className="w-3 h-3 text-muted-foreground flex-shrink-0 mt-0.5" />
                  </div>
                  <div className="flex items-center justify-between mt-2 gap-2">
                    {product.price && (
                      <span className="font-semibold text-sm">{product.price}</span>
                    )}
                    {product.isFeatured && (
                      <Badge variant="secondary" className="text-xs">
                        Featured
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onOpenChange={(open) => !open && handleDialogClose()}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Add
            </DialogTitle>
            <DialogDescription>
              {selectedProduct && (
                <span className="text-foreground font-medium">{selectedProduct.name}</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 pt-2">
            {capsules.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-muted-foreground text-sm mb-2">
                  You need a capsule to save items.
                </p>
                <p className="text-xs text-muted-foreground">
                  Create your first capsule to start adding items from The Vault.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="capsule-select">Capsule</Label>
                  <Select value={selectedCapsuleId} onValueChange={setSelectedCapsuleId}>
                    <SelectTrigger id="capsule-select" data-testid="select-capsule">
                      <SelectValue placeholder="Select a capsule" />
                    </SelectTrigger>
                    <SelectContent>
                      {capsules.map((capsule) => (
                        <SelectItem key={capsule.id} value={capsule.id}>
                          {capsule.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="shopping-list-select">Shopping List</Label>
                  <Select value={selectedShoppingListId} onValueChange={setSelectedShoppingListId}>
                    <SelectTrigger id="shopping-list-select" data-testid="select-shopping-list">
                      <SelectValue placeholder="None" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {shoppingLists.map((list) => (
                        <SelectItem key={list.id} value={list.id}>
                          {list.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleDialogClose}
                    data-testid="button-cancel-add"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleConfirmAdd}
                    disabled={!selectedCapsuleId || addToListMutation.isPending}
                    data-testid="button-confirm-add"
                  >
                    {addToListMutation.isPending ? (
                      "Adding..."
                    ) : (
                      <>
                        <Check className="w-4 h-4 mr-2" />
                        Add Item
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
