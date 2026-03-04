import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { useAuth } from "@/hooks/useAuth";
import {
  Plus,
  Search,
  ChevronDown,
  ChevronRight,
  Trash2,
  Package,
  SortAsc,
  Clock,
  Check,
} from "lucide-react";
import type { Wardrobe, Capsule, Item, User } from "@shared/schema";
import { ITEM_CATEGORIES } from "@shared/schema";

type ItemWithCapsules = Item & { capsules: { id: string; name: string }[] };

type SortMode = "recent" | "az";
type FilterMode = "all" | "unassigned";

export default function WardrobeItems() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useAuth() as { user: User | undefined };
  const { maxItemsPerWardrobe, isFamilyManager, isProfessionalClient, tier } = useSubscription();

  const [selectedWardrobeId, setSelectedWardrobeId] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [sortMode, setSortMode] = useState<SortMode>("recent");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<ItemWithCapsules | null>(null);
  const [expandedItemId, setExpandedItemId] = useState<string | null>(null);
  const [assignItemId, setAssignItemId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const { data: wardrobes = [], isLoading: wardrobesLoading } = useQuery<Wardrobe[]>({
    queryKey: ["/api/wardrobes"],
  });

  const { data: familyStatus } = useQuery<any>({
    queryKey: ["/api/family/status"],
  });

  const { data: professionalStatus } = useQuery<any>({
    queryKey: ["/api/professional/status"],
  });

  const isFamilyManagerRole = familyStatus?.isFamilyMember && familyStatus?.membership?.role === "manager";
  const isProfessionalShopper = professionalStatus?.role === "shopper";

  const familyMemberWardrobes = useMemo(() => {
    if (!isFamilyManagerRole || !familyStatus?.members) return [];
    return familyStatus.members
      .filter((m: any) => m.userId !== user?.id)
      .map((m: any) => ({
        memberId: m.userId,
        name: `${m.firstName || ""} ${m.lastName || ""}`.trim() || m.email || "Family Member",
      }));
  }, [isFamilyManagerRole, familyStatus, user?.id]);

  const professionalClients = useMemo(() => {
    if (!isProfessionalShopper || !professionalStatus?.clients) return [];
    return professionalStatus.clients.map((c: any) => ({
      clientId: c.id,
      userId: c.userId,
      name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || c.email || "Client",
    }));
  }, [isProfessionalShopper, professionalStatus]);

  const activeWardrobeId = selectedWardrobeId || (wardrobes.length > 0 ? wardrobes[0].id : null);

  const { data: items = [], isLoading: itemsLoading } = useQuery<ItemWithCapsules[]>({
    queryKey: ["/api/wardrobes", activeWardrobeId, "items"],
    enabled: !!activeWardrobeId,
  });

  const { data: itemCount } = useQuery<{ count: number }>({
    queryKey: ["/api/wardrobes", activeWardrobeId, "items", "count"],
    enabled: !!activeWardrobeId,
  });

  const { data: capsules = [] } = useQuery<Capsule[]>({
    queryKey: ["/api/capsules"],
  });

  const wardrobeCapsules = useMemo(() => {
    if (!activeWardrobeId) return [];
    return capsules.filter((c) => c.wardrobeId === activeWardrobeId);
  }, [capsules, activeWardrobeId]);

  const deleteMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/items/${itemId}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobes", activeWardrobeId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobes", activeWardrobeId, "items", "count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      toast({ title: "Item deleted", description: "Item has been removed from your wardrobe." });
      setDeleteDialogOpen(false);
      setItemToDelete(null);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (itemIds: string[]) => {
      await Promise.all(itemIds.map((id) => apiRequest(`/api/items/${id}`, "DELETE")));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobes", activeWardrobeId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobes", activeWardrobeId, "items", "count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      toast({ title: "Items deleted", description: `${selectedItems.size} items removed from your wardrobe.` });
      setSelectedItems(new Set());
      setIsMultiSelectMode(false);
      setDeleteDialogOpen(false);
    },
  });

  const batchAssignMutation = useMutation({
    mutationFn: async ({ capsuleId, itemIds }: { capsuleId: string; itemIds: string[] }) => {
      return await apiRequest(`/api/capsules/${capsuleId}/items/batch-assign`, "POST", { itemIds });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobes", activeWardrobeId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      toast({ title: "Items assigned", description: "Items have been assigned to the capsule." });
      setSelectedItems(new Set());
      setIsMultiSelectMode(false);
      setAssignDialogOpen(false);
    },
  });

  const singleAssignMutation = useMutation({
    mutationFn: async ({ capsuleId, itemId }: { capsuleId: string; itemId: string }) => {
      return await apiRequest(`/api/capsules/${capsuleId}/items/${itemId}/assign`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobes", activeWardrobeId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      toast({ title: "Item assigned", description: "Item has been assigned to the capsule." });
      setAssignItemId(null);
    },
  });

  const filteredItems = useMemo(() => {
    let result = items;

    if (filterMode === "unassigned") {
      result = result.filter((item) => !item.capsules || item.capsules.length === 0);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.color && item.color.toLowerCase().includes(q))
      );
    }

    return result;
  }, [items, filterMode, searchQuery]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, ItemWithCapsules[]> = {};

    for (const item of filteredItems) {
      const cat = item.category || "Other";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(item);
    }

    for (const cat of Object.keys(groups)) {
      if (sortMode === "az") {
        groups[cat].sort((a, b) => a.name.localeCompare(b.name));
      } else {
        groups[cat].sort((a, b) => {
          const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return dateB - dateA;
        });
      }
    }

    const sortedCategories = Object.keys(groups).sort((a, b) => {
      const indexA = ITEM_CATEGORIES.indexOf(a as any);
      const indexB = ITEM_CATEGORIES.indexOf(b as any);
      if (indexA === -1 && indexB === -1) return a.localeCompare(b);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return { groups, sortedCategories };
  }, [filteredItems, sortMode]);

  const toggleItem = (itemId: string) => {
    const next = new Set(selectedItems);
    if (next.has(itemId)) {
      next.delete(itemId);
    } else {
      next.add(itemId);
    }
    setSelectedItems(next);
    if (next.size === 0) setIsMultiSelectMode(false);
  };

  const toggleCategory = (category: string) => {
    const next = new Set(collapsedCategories);
    if (next.has(category)) {
      next.delete(category);
    } else {
      next.add(category);
    }
    setCollapsedCategories(next);
  };

  const handleLongPress = (itemId: string) => {
    if (!isMultiSelectMode) {
      setIsMultiSelectMode(true);
    }
    toggleItem(itemId);
  };

  const currentCount = itemCount?.count ?? items.length;
  const limitDisplay =
    maxItemsPerWardrobe === -1 ? `${currentCount} items` : `${currentCount}/${maxItemsPerWardrobe} items`;

  const activeWardrobe = wardrobes.find((w) => w.id === activeWardrobeId);

  const wardrobeLabel = useMemo(() => {
    if (!activeWardrobe) return "My Wardrobe";
    if (activeWardrobe.professionalClientId) {
      const client = professionalClients.find(
        (c: any) => c.clientId === activeWardrobe.professionalClientId
      );
      return client ? `${client.name}'s Wardrobe` : activeWardrobe.name;
    }
    if (activeWardrobe.userId !== user?.id) {
      return `${activeWardrobe.name}`;
    }
    return activeWardrobe.name || "My Wardrobe";
  }, [activeWardrobe, user?.id, professionalClients]);

  const showWardrobeDropdown = isFamilyManagerRole || isProfessionalShopper;

  const allWardrobeOptions = useMemo(() => {
    const options: { id: string; label: string }[] = [];
    for (const w of wardrobes) {
      let label = w.name || "My Wardrobe";
      if (w.professionalClientId) {
        const client = professionalClients.find((c: any) => c.clientId === w.professionalClientId);
        if (client) label = `${client.name}'s Wardrobe`;
      }
      options.push({ id: w.id, label });
    }
    return options;
  }, [wardrobes, professionalClients]);

  const isLoading = wardrobesLoading || itemsLoading;

  if (isLoading && !activeWardrobeId) {
    return (
      <div className="flex flex-col h-full p-4 space-y-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!activeWardrobeId && !wardrobesLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-6 text-center">
        <Package className="w-16 h-16 text-muted-foreground mb-4" />
        <h3 className="font-semibold text-xl mb-2" data-testid="text-no-wardrobe">
          No wardrobe found
        </h3>
        <p className="text-muted-foreground text-sm mb-6">
          Create a wardrobe to start adding items.
        </p>
        <Button onClick={() => navigate("/")} data-testid="button-go-home">
          Go Home
        </Button>
      </div>
    );
  }

  if (items.length === 0 && !itemsLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center justify-between gap-2 p-4 border-b">
          <h2 className="font-serif text-xl font-semibold text-foreground" data-testid="text-wardrobe-title">
            {wardrobeLabel}
          </h2>
          {showWardrobeDropdown && (
            <Select
              value={activeWardrobeId || ""}
              onValueChange={(val) => setSelectedWardrobeId(val)}
            >
              <SelectTrigger className="w-48" data-testid="select-wardrobe-switcher">
                <SelectValue placeholder="Select wardrobe" />
              </SelectTrigger>
              <SelectContent>
                {allWardrobeOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <Package className="w-20 h-20 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-xl mb-2" data-testid="text-empty-wardrobe">
            Your wardrobe is empty — let's fix that!
          </h3>
          <p className="text-muted-foreground text-sm mb-6">
            Add your clothes to keep track of what you own and build perfect capsule wardrobes.
          </p>
          <Button
            onClick={() => navigate(`/wardrobes/${activeWardrobeId}/bulk-add`)}
            data-testid="button-empty-add-items"
          >
            <Plus className="w-4 h-4 mr-1" />
            Add Items
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 p-4 border-b">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h2
            className="font-serif text-xl font-semibold text-foreground truncate"
            data-testid="text-wardrobe-title"
          >
            {wardrobeLabel}
          </h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {showWardrobeDropdown && (
            <Select
              value={activeWardrobeId || ""}
              onValueChange={(val) => setSelectedWardrobeId(val)}
            >
              <SelectTrigger className="w-40" data-testid="select-wardrobe-switcher">
                <SelectValue placeholder="Select wardrobe" />
              </SelectTrigger>
              <SelectContent>
                {allWardrobeOptions.map((opt) => (
                  <SelectItem key={opt.id} value={opt.id}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button
            size="sm"
            onClick={() => navigate(`/wardrobes/${activeWardrobeId}/bulk-add`)}
            data-testid="button-bulk-add"
          >
            <Plus className="w-4 h-4" />
            Bulk Add
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 border-b bg-muted/30 flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="secondary" data-testid="badge-item-count">
          {limitDisplay}
        </Badge>

        <div className="flex items-center gap-1 ml-auto">
          <Button
            variant={filterMode === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterMode("all")}
            data-testid="button-filter-all"
          >
            All
          </Button>
          <Button
            variant={filterMode === "unassigned" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilterMode("unassigned")}
            data-testid="button-filter-unassigned"
          >
            Unassigned
          </Button>
        </div>
      </div>

      <div className="px-4 py-2 border-b flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[160px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
            data-testid="input-search-items"
          />
        </div>
        <Select value={sortMode} onValueChange={(v) => setSortMode(v as SortMode)}>
          <SelectTrigger className="w-40" data-testid="select-sort">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" /> Recently Added
              </span>
            </SelectItem>
            <SelectItem value="az">
              <span className="flex items-center gap-1">
                <SortAsc className="w-3 h-3" /> A-Z
              </span>
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      {itemsLoading ? (
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-20 w-full" />
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center flex-1 p-6 text-center">
          <Search className="w-12 h-12 text-muted-foreground mb-3" />
          <p className="text-muted-foreground" data-testid="text-no-results">
            {searchQuery ? "No items match your search." : "No unassigned items found."}
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pb-24">
          {groupedItems.sortedCategories.map((category) => {
            const categoryItems = groupedItems.groups[category];
            const isCollapsed = collapsedCategories.has(category);
            return (
              <div key={category} className="border-b last:border-b-0">
                <button
                  className="w-full flex items-center justify-between gap-2 px-4 py-3 hover-elevate"
                  onClick={() => toggleCategory(category)}
                  data-testid={`button-category-${category}`}
                >
                  <div className="flex items-center gap-2">
                    {isCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    )}
                    <span className="font-medium text-sm">{category}</span>
                    <Badge variant="secondary" className="no-default-hover-elevate">
                      {categoryItems.length}
                    </Badge>
                  </div>
                </button>

                {!isCollapsed && (
                  <div className="px-4 pb-3 space-y-2">
                    {categoryItems.map((item) => {
                      const isSelected = selectedItems.has(item.id);
                      const isExpanded = expandedItemId === item.id;
                      return (
                        <Card
                          key={item.id}
                          className={`transition-colors ${isSelected ? "ring-2 ring-primary" : ""}`}
                          data-testid={`card-item-${item.id}`}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-start gap-3">
                              {isMultiSelectMode && (
                                <Checkbox
                                  checked={isSelected}
                                  onCheckedChange={() => toggleItem(item.id)}
                                  className="mt-1"
                                  data-testid={`checkbox-item-${item.id}`}
                                />
                              )}

                              {item.imageUrl && (
                                <div className="w-12 h-12 rounded-md bg-muted flex-shrink-0 overflow-hidden">
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}

                              <div
                                className="flex-1 min-w-0 cursor-pointer"
                                onClick={() => {
                                  if (isMultiSelectMode) {
                                    toggleItem(item.id);
                                  } else {
                                    setExpandedItemId(isExpanded ? null : item.id);
                                  }
                                }}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  handleLongPress(item.id);
                                }}
                                data-testid={`item-row-${item.id}`}
                              >
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm truncate" data-testid={`text-item-name-${item.id}`}>
                                    {item.name}
                                  </span>
                                  {item.color && (
                                    <span className="text-xs text-muted-foreground">{item.color}</span>
                                  )}
                                </div>
                                {item.capsules && item.capsules.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-1">
                                    {item.capsules.map((c) => (
                                      <Badge
                                        key={c.id}
                                        variant="outline"
                                        className="text-xs no-default-hover-elevate"
                                        data-testid={`badge-capsule-${c.id}-item-${item.id}`}
                                      >
                                        {c.name}
                                      </Badge>
                                    ))}
                                  </div>
                                )}
                                {(!item.capsules || item.capsules.length === 0) && (
                                  <span className="text-xs text-muted-foreground mt-1 block">
                                    Not assigned to any capsule
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1">
                                {!isMultiSelectMode && (
                                  <>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        setIsMultiSelectMode(true);
                                        toggleItem(item.id);
                                      }}
                                      data-testid={`button-select-${item.id}`}
                                    >
                                      <Check className="w-4 h-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={() => {
                                        setItemToDelete(item);
                                        setDeleteDialogOpen(true);
                                      }}
                                      data-testid={`button-delete-${item.id}`}
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>

                            {isExpanded && !isMultiSelectMode && (
                              <div className="mt-3 pt-3 border-t space-y-3">
                                {item.size && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Size:</span> {item.size}
                                  </div>
                                )}
                                {item.material && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Material:</span> {item.material}
                                  </div>
                                )}
                                {item.washInstructions && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Care:</span> {item.washInstructions}
                                  </div>
                                )}
                                {item.description && (
                                  <div className="text-sm">
                                    <span className="text-muted-foreground">Description:</span> {item.description}
                                  </div>
                                )}

                                <div>
                                  <p className="text-sm font-medium mb-2">Assign to Capsule</p>
                                  <div className="flex flex-wrap gap-2">
                                    {wardrobeCapsules
                                      .filter(
                                        (c) =>
                                          !item.capsules?.some((ic) => ic.id === c.id)
                                      )
                                      .map((capsule) => (
                                        <Button
                                          key={capsule.id}
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            singleAssignMutation.mutate({
                                              capsuleId: capsule.id,
                                              itemId: item.id,
                                            })
                                          }
                                          disabled={singleAssignMutation.isPending}
                                          data-testid={`button-assign-${item.id}-to-${capsule.id}`}
                                        >
                                          <Plus className="w-3 h-3 mr-1" />
                                          {capsule.name}
                                        </Button>
                                      ))}
                                    {wardrobeCapsules.filter(
                                      (c) => !item.capsules?.some((ic) => ic.id === c.id)
                                    ).length === 0 && (
                                      <span className="text-xs text-muted-foreground">
                                        Already in all capsules
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {isMultiSelectMode && selectedItems.size > 0 && (
        <div className="fixed bottom-16 left-0 right-0 bg-background border-t p-3 z-30 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-medium" data-testid="text-selected-count">
            {selectedItems.size} selected
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedItems(new Set());
                setIsMultiSelectMode(false);
              }}
              data-testid="button-cancel-select"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => setAssignDialogOpen(true)}
              data-testid="button-assign-selected"
            >
              Assign to Capsule...
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteDialogOpen(true)}
              data-testid="button-delete-selected"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign to Capsule</DialogTitle>
            <DialogDescription>
              Select a capsule to assign {selectedItems.size} item{selectedItems.size !== 1 ? "s" : ""} to.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {wardrobeCapsules.map((capsule) => (
              <Button
                key={capsule.id}
                variant="outline"
                className="w-full justify-start"
                onClick={() =>
                  batchAssignMutation.mutate({
                    capsuleId: capsule.id,
                    itemIds: Array.from(selectedItems),
                  })
                }
                disabled={batchAssignMutation.isPending}
                data-testid={`button-batch-assign-to-${capsule.id}`}
              >
                {capsule.name}
              </Button>
            ))}
            {wardrobeCapsules.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">
                No capsules in this wardrobe. Create a capsule first.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete from Wardrobe</DialogTitle>
            <DialogDescription>
              {itemToDelete ? (
                <>
                  Are you sure you want to delete "{itemToDelete.name}"?
                  {itemToDelete.capsules && itemToDelete.capsules.length > 0 && (
                    <>
                      {" "}This item is in{" "}
                      <strong>{itemToDelete.capsules.map((c) => c.name).join(", ")}</strong>.
                      Deleting it will remove it from all capsules.
                    </>
                  )}
                </>
              ) : (
                <>
                  Are you sure you want to delete {selectedItems.size} item
                  {selectedItems.size !== 1 ? "s" : ""}? This will remove them from all capsules they
                  belong to.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setItemToDelete(null); }}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (itemToDelete) {
                  deleteMutation.mutate(itemToDelete.id);
                } else {
                  bulkDeleteMutation.mutate(Array.from(selectedItems));
                }
              }}
              disabled={deleteMutation.isPending || bulkDeleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
