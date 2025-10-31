import { ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface ShoppingListItem {
  id: string;
  name: string;
  imageUrl?: string;
  productLink?: string;
  capsuleName: string;
}

interface ShoppingListProps {
  items: ShoppingListItem[];
  onRemove: (id: string) => void;
  onOpenLink: (link: string) => void;
}

export default function ShoppingList({ items, onRemove, onOpenLink }: ShoppingListProps) {
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="p-6 border-b">
        <h1 className="font-serif text-3xl font-semibold text-foreground" data-testid="text-shopping-list-title">
          Shopping List
        </h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-item-count">
          {items.length} {items.length === 1 ? 'item' : 'items'}
        </p>
      </div>

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
              Items marked for shopping will appear here
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
                    <p className="text-xs text-muted-foreground mb-3">
                      From {item.capsuleName}
                    </p>
                    {item.productLink && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onOpenLink(item.productLink!)}
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
                    onClick={() => onRemove(item.id)}
                    data-testid={`button-remove-${item.id}`}
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
