import { Plus, ShoppingBag } from "lucide-react";
import { Card } from "@/components/ui/card";

interface ItemSlotCardProps {
  item?: {
    name: string;
    imageUrl?: string;
    isOnShoppingList?: boolean;
  };
  onAdd?: () => void;
  onClick?: () => void;
}

export default function ItemSlotCard({ item, onAdd, onClick }: ItemSlotCardProps) {
  if (!item) {
    return (
      <Card
        className="aspect-square flex items-center justify-center border-2 border-dashed hover-elevate cursor-pointer"
        onClick={onAdd}
        data-testid="card-empty-slot"
      >
        <Plus className="w-8 h-8 text-muted-foreground" />
      </Card>
    );
  }

  return (
    <Card
      className="aspect-square relative overflow-hidden hover-elevate cursor-pointer group"
      onClick={onClick}
      data-testid={`card-item-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      {item.imageUrl ? (
        <img
          src={item.imageUrl}
          alt={item.name}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <span className="text-muted-foreground text-sm">No image</span>
        </div>
      )}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-3">
        <p className="text-white text-sm font-medium truncate" data-testid={`text-item-name-${item.name.toLowerCase().replace(/\s+/g, '-')}`}>
          {item.name}
        </p>
      </div>
      {item.isOnShoppingList && (
        <div className="absolute top-2 right-2 bg-primary rounded-full p-2" data-testid="icon-shopping-bag">
          <ShoppingBag className="w-4 h-4 text-primary-foreground" />
        </div>
      )}
    </Card>
  );
}
