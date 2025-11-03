import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2, Package, ShoppingBag, Shirt, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SavedSharedItem } from "@shared/schema";
import { format } from "date-fns";

export default function SharedWithMe() {
  const { toast } = useToast();

  const { data: savedItems, isLoading } = useQuery<SavedSharedItem[]>({
    queryKey: ['/api/saved-shared-items'],
  });

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/saved-shared-items/${itemId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/saved-shared-items'] });
      toast({
        title: "Item removed",
        description: "The saved item has been removed from your collection.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to remove saved item. Please try again.",
        variant: "destructive",
      });
    },
  });

  const getItemIcon = (itemType: string) => {
    switch (itemType) {
      case 'capsule':
        return <Package className="h-5 w-5" />;
      case 'shopping_list':
        return <ShoppingBag className="h-5 w-5" />;
      case 'item':
        return <Shirt className="h-5 w-5" />;
      case 'outfit':
        return <Users className="h-5 w-5" />;
      default:
        return <Package className="h-5 w-5" />;
    }
  };

  const getItemTypeName = (itemType: string) => {
    switch (itemType) {
      case 'capsule':
        return 'Capsule';
      case 'shopping_list':
        return 'Shopping List';
      case 'item':
        return 'Item';
      case 'outfit':
        return 'Outfit';
      default:
        return itemType;
    }
  };

  const getItemTitle = (item: SavedSharedItem) => {
    const data = item.itemData as any;
    
    switch (item.itemType) {
      case 'capsule':
        return data.capsule?.name || 'Untitled Capsule';
      case 'shopping_list':
        return data.shoppingList?.name || 'Untitled Shopping List';
      case 'item':
        return data.item?.name || 'Untitled Item';
      case 'outfit':
        return data.outfit?.name || 'Untitled Outfit';
      default:
        return 'Untitled';
    }
  };

  const getItemDescription = (item: SavedSharedItem) => {
    const data = item.itemData as any;
    
    switch (item.itemType) {
      case 'capsule':
        return `${data.items?.length || 0} items`;
      case 'shopping_list':
        return `${data.items?.length || 0} items`;
      case 'item':
        return data.item?.category || 'No category';
      case 'outfit':
        return `${data.items?.length || 0} pieces`;
      default:
        return '';
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto p-4 space-y-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-display font-bold">Shared with Me</h1>
          <p className="text-sm text-muted-foreground">
            Items you've saved from shared links
          </p>
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-1/3" />
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-muted rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <div className="space-y-2">
        <h1 className="text-2xl font-display font-bold" data-testid="heading-shared-with-me">
          Shared with Me
        </h1>
        <p className="text-sm text-muted-foreground">
          Items you've saved from shared links
        </p>
      </div>

      {!savedItems || savedItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="rounded-full bg-muted p-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="text-center space-y-2">
              <p className="font-medium" data-testid="text-empty-state">
                No saved items yet
              </p>
              <p className="text-sm text-muted-foreground max-w-sm">
                When you save items from shared links, they'll appear here for easy access.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {savedItems.map((item) => (
            <Card key={item.id} data-testid={`card-saved-item-${item.id}`}>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                  <div className="p-2 rounded-md bg-muted">
                    {getItemIcon(item.itemType)}
                  </div>
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-lg" data-testid={`text-item-title-${item.id}`}>
                        {getItemTitle(item)}
                      </CardTitle>
                      <Badge variant="secondary" data-testid={`badge-item-type-${item.id}`}>
                        {getItemTypeName(item.itemType)}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground" data-testid={`text-item-description-${item.id}`}>
                      {getItemDescription(item)}
                    </p>
                    {item.sourceUserName && (
                      <p className="text-xs text-muted-foreground" data-testid={`text-source-user-${item.id}`}>
                        Shared by {item.sourceUserName}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground" data-testid={`text-saved-date-${item.id}`}>
                      Saved {format(new Date(item.createdAt), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => deleteMutation.mutate(item.id)}
                  disabled={deleteMutation.isPending}
                  data-testid={`button-delete-${item.id}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
