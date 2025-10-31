import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import ItemSlotCard from "./ItemSlotCard";

interface CapsuleItem {
  id: string;
  name: string;
  imageUrl?: string;
  isOnShoppingList?: boolean;
}

interface CapsuleCategory {
  name: string;
  items: (CapsuleItem | null)[];
  maxItems: number;
}

interface CapsuleBuilderProps {
  capsuleName: string;
  categories: CapsuleCategory[];
  onAddItem: (categoryName: string) => void;
  onViewItem: (item: CapsuleItem) => void;
  onAddSlot: (categoryName: string) => void;
  onRemoveSlot: (categoryName: string) => void;
}

export default function CapsuleBuilder({
  capsuleName,
  categories,
  onAddItem,
  onViewItem,
  onAddSlot,
  onRemoveSlot,
}: CapsuleBuilderProps) {
  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="p-6 border-b">
        <h1 className="font-serif text-3xl font-semibold text-foreground" data-testid="text-capsule-name">
          {capsuleName}
        </h1>
        <p className="text-sm text-muted-foreground mt-1" data-testid="text-total-items">
          {categories.reduce((sum, cat) => sum + cat.items.filter(Boolean).length, 0)} items
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-8 space-y-8">
        {categories.map((category) => (
          <div key={category.name}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground" data-testid={`text-category-${category.name.toLowerCase()}`}>
                {category.name}
              </h2>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onAddSlot(category.name)}
                  data-testid={`button-add-slot-${category.name.toLowerCase()}`}
                >
                  <Plus className="w-4 h-4" />
                </Button>
                {category.items.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRemoveSlot(category.name)}
                    data-testid={`button-remove-slot-${category.name.toLowerCase()}`}
                  >
                    -
                  </Button>
                )}
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {category.items.map((item, index) => (
                <ItemSlotCard
                  key={item?.id || `empty-${index}`}
                  item={item || undefined}
                  onAdd={() => onAddItem(category.name)}
                  onClick={item ? () => onViewItem(item) : undefined}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
