import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
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
import { ArrowLeft, ExternalLink, X, Pencil } from "lucide-react";
import type { ShoppingList, Item } from "@shared/schema";

export default function ShoppingListDetail() {
  const { id } = useParams() as { id: string };
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isEditNameOpen, setIsEditNameOpen] = useState(false);
  const [editedName, setEditedName] = useState('');

  const { data: shoppingList, isLoading: isLoadingList } = useQuery<ShoppingList>({
    queryKey: ['/api/shopping-lists', id],
    enabled: !!id,
  });

  const { data: items = [], isLoading: isLoadingItems } = useQuery<Item[]>({
    queryKey: ['/api/shopping-lists', id, 'items'],
    enabled: !!id,
  });

  const updateNameMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest(`/api/shopping-lists/${id}`, 'PATCH', { name });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists', id] });
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      setIsEditNameOpen(false);
      toast({
        title: "Success",
        description: "Shopping list name updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update shopping list name",
        variant: "destructive",
      });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/items/${itemId}`, 'PATCH', { shoppingListId: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists', id, 'items'] });
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      toast({
        title: "Success",
        description: "Item removed from shopping list",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove item",
        variant: "destructive",
      });
    },
  });

  const deleteListMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest(`/api/shopping-lists/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shopping-lists'] });
      navigate('/');
      toast({
        title: "Success",
        description: "Shopping list deleted",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete shopping list",
        variant: "destructive",
      });
    },
  });

  const handleEditName = () => {
    if (!editedName.trim()) {
      toast({
        title: "Validation Error",
        description: "Shopping list name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    updateNameMutation.mutate(editedName);
  };

  const openEditDialog = () => {
    setEditedName(shoppingList?.name || '');
    setIsEditNameOpen(true);
  };

  if (isLoadingList || isLoadingItems) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!shoppingList) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6">
        <h2 className="text-2xl font-semibold mb-4">Shopping list not found</h2>
        <Button onClick={() => navigate('/')}>Back to Home</Button>
      </div>
    );
  }

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
            <div className="flex items-center gap-2">
              <h1 className="font-serif text-2xl font-semibold text-foreground" data-testid="text-shopping-list-name">
                {shoppingList.name}
              </h1>
              <Button
                size="icon"
                variant="ghost"
                className="h-8 w-8"
                data-testid="button-edit-list-name"
                onClick={openEditDialog}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? 'item' : 'items'}
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => deleteListMutation.mutate()}
          data-testid="button-delete-list"
          disabled={deleteListMutation.isPending}
        >
          {deleteListMutation.isPending ? 'Deleting...' : 'Delete List'}
        </Button>
      </div>

      <Dialog open={isEditNameOpen} onOpenChange={setIsEditNameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shopping List Name</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="listName">List Name</Label>
              <Input
                id="listName"
                data-testid="input-edit-list-name"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                placeholder="e.g., Winter Essentials"
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
                data-testid="button-save-list-name"
                disabled={updateNameMutation.isPending}
              >
                {updateNameMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-4xl">🛍️</span>
            </div>
            <h3 className="font-semibold text-xl mb-2" data-testid="text-empty-state-title">
              No items yet
            </h3>
            <p className="text-muted-foreground text-sm" data-testid="text-empty-state-description">
              Add items to this shopping list from your capsules
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((item) => (
              <Card
                key={item.id}
                className="p-4 hover-elevate"
                data-testid={`card-shopping-item-${item.id}`}
              >
                <div className="flex gap-4">
                  <div className="w-20 h-20 flex-shrink-0 bg-muted rounded-md overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-muted-foreground text-xs">No image</span>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 truncate" data-testid={`text-item-name-${item.id}`}>
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mb-2">
                      {item.category}
                    </p>
                    {item.productLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(item.productLink!, '_blank')}
                        className="h-8"
                        data-testid={`button-open-link-${item.id}`}
                      >
                        <ExternalLink className="w-3 h-3 mr-2" />
                        View Product
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeItemMutation.mutate(item.id)}
                    data-testid={`button-remove-${item.id}`}
                    disabled={removeItemMutation.isPending}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
