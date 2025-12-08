import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Sparkles } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import type { AffiliateProduct } from "@shared/schema";
import { VAULT_CATEGORIES } from "@shared/schema";

export default function Vault() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

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

  const handleProductClick = (productId: string) => {
    window.open(`/api/vault/products/${productId}/go`, '_blank');
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
                  <div className="aspect-square bg-muted">
                    <img
                      src={product.imageUrl}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="aspect-square bg-muted flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-muted-foreground" />
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
    </div>
  );
}
