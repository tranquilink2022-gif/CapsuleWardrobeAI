import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Plus, Search, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSubscription } from "@/hooks/use-subscription";
import CapsuleSummaryCard from "@/components/CapsuleSummaryCard";
import ThemeToggle from "@/components/ThemeToggle";
import { SponsorPlacement } from "@/components/SponsorPlacement";
import type { Capsule, Item, User } from "@shared/schema";

export default function CapsuleListView({
  user,
  capsules,
}: {
  user: User | undefined;
  capsules: Capsule[];
}) {
  const [, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);

  const { getCapsuleLimits, tier, features } = useSubscription();
  const limits = getCapsuleLimits();

  const { data: recentItems = [] } = useQuery<Item[]>({
    queryKey: ['/api/items/recent?limit=5'],
  });

  const clothingCount = capsules.filter(c => c.capsuleCategory !== 'Jewelry').length;
  const jewelryCount = capsules.filter(c => c.capsuleCategory === 'Jewelry').length;

  const isSingleWardrobe = features.maxWardrobes === 1;

  const totalClothingCapacity = limits.clothing === -1 ? -1 : (
    isSingleWardrobe ? limits.clothing : limits.clothing * (features.maxWardrobes === -1 ? 1 : features.maxWardrobes)
  );
  const totalJewelryCapacity = limits.jewelry === -1 ? -1 : (
    isSingleWardrobe ? limits.jewelry : limits.jewelry * (features.maxWardrobes === -1 ? 1 : features.maxWardrobes)
  );

  const clothingLimitDisplay = totalClothingCapacity === -1 ? 'Unlimited' : `${clothingCount}/${totalClothingCapacity}`;
  const jewelryLimitDisplay = totalJewelryCapacity === -1 ? 'Unlimited' : `${jewelryCount}/${totalJewelryCapacity}`;

  const canCreateClothing = !isSingleWardrobe || limits.clothing === -1 || clothingCount < limits.clothing;
  const canCreateJewelry = !isSingleWardrobe || limits.jewelry === -1 || jewelryCount < limits.jewelry;
  const canCreateCapsule = canCreateClothing || canCreateJewelry;

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'All' || seasonFilter !== null;
  const showSearchBar = capsules.length >= 3;

  const filteredCapsules = capsules.filter((capsule: Capsule) => {
    if (searchQuery.trim()) {
      const query = searchQuery.trim().toLowerCase();
      if (!capsule.name.toLowerCase().includes(query)) return false;
    }
    if (typeFilter !== 'All') {
      const capsuleType = capsule.capsuleCategory || 'Clothing';
      if (capsuleType !== typeFilter) return false;
    }
    if (seasonFilter) {
      if (!capsule.season || capsule.season.toLowerCase() !== seasonFilter.toLowerCase()) return false;
    }
    return true;
  });

  const clearFilters = () => {
    setSearchQuery('');
    setTypeFilter('All');
    setSeasonFilter(null);
  };

  const handleBadgeKeyDown = (e: React.KeyboardEvent, action: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      action();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-serif text-2xl font-semibold text-foreground">
          My Capsules
        </h2>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button
            size="icon"
            data-testid="button-add-capsule"
            onClick={() => navigate('/create-capsule')}
            disabled={!canCreateCapsule}
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 border-b bg-muted/30 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">Usage:</span>
        <Badge variant="secondary" data-testid="badge-clothing-usage">
          Clothing: {clothingLimitDisplay}
        </Badge>
        {tier !== 'free' && (
          <Badge variant="secondary" data-testid="badge-jewelry-usage">
            Jewelry: {jewelryLimitDisplay}
          </Badge>
        )}
        {!isSingleWardrobe && (
          <Badge variant="outline" data-testid="badge-per-wardrobe-note">
            {limits.clothing === -1 ? 'Unlimited' : limits.clothing} per wardrobe
          </Badge>
        )}
        {!canCreateCapsule && isSingleWardrobe && (
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 text-primary underline"
            onClick={() => navigate('/subscription')}
            data-testid="link-upgrade-for-capsules"
          >
            Upgrade for more
          </Button>
        )}
      </div>

      {showSearchBar && (
        <div className="px-4 pt-3 pb-1 space-y-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search capsules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
              data-testid="input-search-capsules"
            />
            {searchQuery && (
              <Button
                size="icon"
                variant="ghost"
                className="absolute right-1 top-1/2 -translate-y-1/2"
                onClick={() => setSearchQuery('')}
                data-testid="button-clear-search"
              >
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(['All', 'Clothing', 'Jewelry'] as const).map((type) => (
              <Badge
                key={type}
                variant={typeFilter === type ? 'default' : 'outline'}
                className="cursor-pointer toggle-elevate"
                role="button"
                tabIndex={0}
                onClick={() => setTypeFilter(type)}
                onKeyDown={(e) => handleBadgeKeyDown(e, () => setTypeFilter(type))}
                data-testid={`filter-type-${type.toLowerCase()}`}
              >
                {type}
              </Badge>
            ))}
            <span className="text-muted-foreground text-xs mx-1">|</span>
            {(['Spring', 'Summer', 'Fall', 'Winter'] as const).map((season) => (
              <Badge
                key={season}
                variant={seasonFilter === season ? 'default' : 'outline'}
                className="cursor-pointer toggle-elevate"
                role="button"
                tabIndex={0}
                onClick={() => setSeasonFilter(seasonFilter === season ? null : season)}
                onKeyDown={(e) => handleBadgeKeyDown(e, () => setSeasonFilter(seasonFilter === season ? null : season))}
                data-testid={`filter-season-${season.toLowerCase()}`}
              >
                {season}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        {recentItems.length > 0 && (
          <div data-testid="section-recently-added">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-medium text-muted-foreground">Recently Added</h3>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
              {recentItems.map((item: Item) => (
                <Card
                  key={item.id}
                  className="flex-shrink-0 w-28 p-2 space-y-1.5"
                  data-testid={`card-recent-item-${item.id}`}
                >
                  {item.imageUrl ? (
                    <div className="w-full aspect-square rounded-md overflow-hidden bg-muted">
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-square rounded-md bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No image</span>
                    </div>
                  )}
                  <p className="text-xs font-medium truncate" data-testid={`text-recent-item-name-${item.id}`}>
                    {item.name}
                  </p>
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                    {item.category}
                  </Badge>
                </Card>
              ))}
            </div>
          </div>
        )}
        <SponsorPlacement placement="capsules" variant="banner" />
        {capsules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Plus className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-semibold text-xl mb-2">No capsules yet</h3>
            <p className="text-muted-foreground text-sm mb-6">
              Create your first capsule wardrobe
            </p>
            <Button onClick={() => navigate('/create-capsule')}>
              Create Capsule
            </Button>
          </div>
        ) : filteredCapsules.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center px-6" data-testid="text-no-capsules-found">
            <h3 className="font-semibold text-lg mb-2">No capsules found</h3>
            <p className="text-muted-foreground text-sm mb-4">
              No capsules match your current search and filters.
            </p>
            <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters">
              Clear Filters
            </Button>
          </div>
        ) : (
          filteredCapsules.map((capsule: Capsule) => (
            <CapsuleSummaryCard
              key={capsule.id}
              capsule={{
                id: capsule.id,
                name: capsule.name,
                itemCount: (capsule as Capsule & { itemCount?: number }).itemCount || 0,
                lastUpdated: new Date(capsule.updatedAt).toLocaleDateString(),
                previewImages: [],
              }}
              onClick={() => navigate(`/capsule/${capsule.id}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
