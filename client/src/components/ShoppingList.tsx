import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, ChevronRight, Pencil, AlertCircle, RefreshCw } from "lucide-react";
import type { ShoppingList as ShoppingListType } from "@shared/schema";
import { SponsorPlacement } from "@/components/SponsorPlacement";

interface ShoppingListWithItemCount extends ShoppingListType {
  itemCount?: number;
}

export default function ShoppingList() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newListName, setNewListName] = useState('');

  const { data: shoppingLists = [], isLoading, isError, refetch } = useQuery<ShoppingListWithItemCount[]>({
    queryKey: ['/api/shopping-lists'],
  });

  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      return await apiRequest('/api/shopping-lists', 'POST', { name });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/shopping-lists'] });
      setIsCreateDialogOpen(false);
      setNewListName('');
      toast({
        title: "Success",
        description: "Shopping list created",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create shopping list",
        variant: "destructive",
      });
    },
  });

  const handleCreate = () => {
    if (!newListName.trim()) {
      toast({
        title: "Validation Error",
        description: "Shopping list name cannot be empty",
        variant: "destructive",
      });
      return;
    }
    createListMutation.mutate(newListName);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-center px-6">
        <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="font-semibold text-xl mb-2" data-testid="text-error-title">
          Failed to load shopping lists
        </h3>
        <p className="text-muted-foreground text-sm mb-4" data-testid="text-error-description">
          Something went wrong while fetching your shopping lists. Please try again.
        </p>
        <Button onClick={() => refetch()} data-testid="button-retry-shopping-lists">
          <RefreshCw className="w-4 h-4 mr-2" />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center justify-between p-6 border-b">
        <div>
          <h1 className="font-serif text-3xl font-semibold text-foreground" data-testid="text-shopping-lists-title">
            Shopping Lists
          </h1>
          <p className="text-sm text-muted-foreground mt-1" data-testid="text-list-count">
            {shoppingLists.length} {shoppingLists.length === 1 ? 'list' : 'lists'}
          </p>
        </div>
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="icon" aria-label="Create shopping list" data-testid="button-create-shopping-list">
              <Plus className="w-5 h-5" />
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Shopping List</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="listName">List Name</Label>
                <Input
                  id="listName"
                  data-testid="input-shopping-list-name"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="e.g., Winter Essentials"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                  data-testid="button-cancel-create"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreate}
                  data-testid="button-save-shopping-list"
                  disabled={createListMutation.isPending}
                >
                  {createListMutation.isPending ? 'Creating...' : 'Create'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <SponsorPlacement placement="shopping" variant="banner" />
        {shoppingLists.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-4xl">🛍️</span>
            </div>
            <h3 className="font-semibold text-xl mb-2" data-testid="text-empty-state-title">
              No shopping lists yet
            </h3>
            <p className="text-muted-foreground text-sm mb-4" data-testid="text-empty-state-description">
              Create a shopping list to organize items you want to buy
            </p>
            <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-list">
              <Plus className="w-4 h-4 mr-2" />
              Create Your First List
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {shoppingLists.map((list) => (
              <Card
                key={list.id}
                className="p-4 hover-elevate active-elevate-2 cursor-pointer"
                role="button"
                tabIndex={0}
                data-testid={`card-shopping-list-${list.id}`}
                onClick={() => navigate(`/shopping-list/${list.id}`)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); navigate(`/shopping-list/${list.id}`); } }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base mb-1 truncate" data-testid={`text-list-name-${list.id}`}>
                      {list.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      {list.itemCount || 0} {list.itemCount === 1 ? 'item' : 'items'}
                    </p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-muted-foreground" />
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
