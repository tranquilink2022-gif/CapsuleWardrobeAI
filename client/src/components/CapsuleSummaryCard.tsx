import { Card } from "@/components/ui/card";

interface CapsuleSummaryCardProps {
  capsule: {
    id: string;
    name: string;
    itemCount: number;
    lastUpdated: string;
    previewImages?: string[];
  };
  onClick: () => void;
}

export default function CapsuleSummaryCard({ capsule, onClick }: CapsuleSummaryCardProps) {
  return (
    <Card
      className="p-6 hover-elevate cursor-pointer"
      onClick={onClick}
      data-testid={`card-capsule-${capsule.id}`}
    >
      <h3 className="font-serif text-2xl font-semibold mb-2 text-foreground" data-testid={`text-capsule-name-${capsule.id}`}>
        {capsule.name}
      </h3>
      <p className="text-sm text-muted-foreground mb-4">
        {capsule.itemCount} items • Updated {capsule.lastUpdated}
      </p>
      {capsule.previewImages && capsule.previewImages.length > 0 && (
        <div className="grid grid-cols-4 gap-2">
          {capsule.previewImages.slice(0, 4).map((image, index) => (
            <div
              key={index}
              className="aspect-square bg-muted rounded-md overflow-hidden"
            >
              {image ? (
                <img
                  src={image}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
