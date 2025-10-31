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
import { ArrowLeft, Plus, ShoppingCart } from "lucide-react";
import type { Capsule, Item } from "@shared/schema";

export default function CapsuleDetail() {
  const { id } = useParams() as { id: string };
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    category: '',
    name: '',
    description: '',
    imageUrl: '',
    productLink: '',
  });

  const { data: capsule, isLoading: isLoadingCapsule } = useQuery<Capsule>({
    queryKey: ['/api/capsules', id],
    enabled: !!id,
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery<Item[]>({
    queryKey: ['/api/capsules', id, 'items'],
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

  const toggleShoppingListMutation = useMutation({
    mutationFn: async ({ itemId, isOnShoppingList }: { itemId: string; isOnShoppingList: boolean }) => {
      return await apiRequest(`/api/items/${itemId}`, 'PATCH', { isOnShoppingList: !isOnShoppingList });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/capsules', id, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-list'] });
    },
  });

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
    <div className="flex flex-col h-screen bg-background">
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
            <h1 className="font-serif text-2xl font-semibold text-foreground" data-testid="text-capsule-name">
              {capsule.name}
            </h1>
            <p className="text-sm text-muted-foreground">
              {items.length} / {capsule.totalSlots} items
            </p>
          </div>
        </div>
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
                    <Button
                      size="icon"
                      variant={item.isOnShoppingList ? "default" : "ghost"}
                      className="h-8 w-8"
                      data-testid={`button-toggle-shopping-${item.id}`}
                      onClick={() => toggleShoppingListMutation.mutate({
                        itemId: item.id,
                        isOnShoppingList: item.isOnShoppingList
                      })}
                    >
                      <ShoppingCart className="w-4 h-4" />
                    </Button>
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
    </div>
  );
}
