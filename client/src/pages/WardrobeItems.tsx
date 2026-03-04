import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
  AlertCircle,
  BarChart3,
  RefreshCw,
  AlertTriangle,
  Pencil,
  X,
} from "lucide-react";
import type { Wardrobe, Capsule, Item, User } from "@shared/schema";
import { ITEM_CATEGORIES, CLOTHING_CATEGORIES, JEWELRY_CATEGORIES } from "@shared/schema";
import ItemDetailModal from "@/components/ItemDetailModal";

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
  const [assignItemId, setAssignItemId] = useState<string | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [detailItem, setDetailItem] = useState<ItemWithCapsules | null>(null);
  const [underusedDismissed, setUnderusedDismissed] = useState(false);
  const [isEditItemOpen, setIsEditItemOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ItemWithCapsules | null>(null);
  const [editedItem, setEditedItem] = useState({
    category: '',
    name: '',
    color: '',
    size: '',
    material: '',
    washInstructions: '',
    description: '',
    imageUrl: '',
    productLink: '',
  });

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
      return await apiRequest(`/api/items/batch-delete`, "POST", { itemIds });
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

  const wearMutation = useMutation({
    mutationFn: async (itemId: string) => {
      return await apiRequest(`/api/items/${itemId}/wear`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobes", activeWardrobeId, "items"] });
      toast({ title: "Wear logged", description: "Item wear count updated." });
      if (detailItem) {
        const updated = items.find((i) => i.id === detailItem.id);
        if (updated) setDetailItem({ ...updated, wearCount: (updated.wearCount || 0) + 1 });
      }
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: async (data: { itemId: string; updates: any }) => {
      return await apiRequest(`/api/items/${data.itemId}`, "PATCH", data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobes", activeWardrobeId, "items"] });
      queryClient.invalidateQueries({ queryKey: ["/api/wardrobes", activeWardrobeId, "items", "count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/capsules"] });
      setIsEditItemOpen(false);
      setEditingItem(null);
      toast({ title: "Success", description: "Item updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update item", variant: "destructive" });
    },
  });

  const openEditItemDialog = (item: ItemWithCapsules) => {
    setEditingItem(item);
    setEditedItem({
      category: item.category,
      name: item.name,
      color: item.color || '',
      size: item.size || '',
      material: item.material || '',
      washInstructions: item.washInstructions || '',
      description: item.description || '',
      imageUrl: item.imageUrl || '',
      productLink: item.productLink || '',
    });
    setIsEditItemOpen(true);
  };

  const displayCategories = [...CLOTHING_CATEGORIES, ...JEWELRY_CATEGORIES];

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

  const wardrobeStats = useMemo(() => {
    const categoryBreakdown: Record<string, number> = {};
    let unassignedCount = 0;

    for (const item of items) {
      const cat = item.category || "Other";
      categoryBreakdown[cat] = (categoryBreakdown[cat] || 0) + 1;
      if (!item.capsules || item.capsules.length === 0) {
        unassignedCount++;
      }
    }

    const sortedCategories = Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1]);

    const progressPercent =
      maxItemsPerWardrobe === -1
        ? 0
        : Math.min(100, Math.round((currentCount / maxItemsPerWardrobe) * 100));

    return { categoryBreakdown: sortedCategories, unassignedCount, progressPercent };
  }, [items, currentCount, maxItemsPerWardrobe]);

  const underusedItems = useMemo(() => {
    const now = Date.now();
    const ninetyDaysMs = 90 * 24 * 60 * 60 * 1000;
    return items.filter((item) => {
      if (item.wearCount === 0) return true;
      if (item.lastWornAt) {
        const lastWorn = new Date(item.lastWornAt).getTime();
        return now - lastWorn > ninetyDaysMs;
      }
      return false;
    });
  }, [items]);

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

      {items.length > 0 && !itemsLoading && (
        <div className="px-4 py-3 border-b">
          <Card data-testid="card-wardrobe-stats">
            <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-muted-foreground" />
                Wardrobe Overview
              </CardTitle>
              <Badge variant="secondary" data-testid="badge-stats-item-count">
                {limitDisplay}
              </Badge>
            </CardHeader>
            <CardContent className="p-4 pt-0 space-y-3">
              {maxItemsPerWardrobe !== -1 && (
                <div data-testid="stats-progress-bar">
                  <Progress value={wardrobeStats.progressPercent} className="h-2" />
                  <p className="text-xs text-muted-foreground mt-1">
                    {currentCount} of {maxItemsPerWardrobe} items used
                  </p>
                </div>
              )}
              <div className="flex flex-wrap gap-1" data-testid="stats-category-breakdown">
                {wardrobeStats.categoryBreakdown.map(([category, count]) => (
                  <Badge
                    key={category}
                    variant="outline"
                    className="text-xs no-default-hover-elevate"
                    data-testid={`badge-stat-category-${category}`}
                  >
                    {count} {category}
                  </Badge>
                ))}
              </div>
              {wardrobeStats.unassignedCount > 0 && (
                <div
                  className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2"
                  data-testid="stats-unassigned-callout"
                >
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>
                    {wardrobeStats.unassignedCount} item{wardrobeStats.unassignedCount !== 1 ? "s" : ""} not in any capsule
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {!underusedDismissed && underusedItems.length > 0 && !itemsLoading && (
        <div className="px-4 py-3 border-b" data-testid="section-underused-items">
          <div className="flex items-center justify-between gap-2 bg-muted/50 rounded-md px-3 py-2">
            <div className="flex items-center gap-2 min-w-0">
              <AlertTriangle className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-sm font-medium">
                {underusedItems.length} underused item{underusedItems.length !== 1 ? "s" : ""}
              </span>
              <span className="text-xs text-muted-foreground">
                Not worn in 90+ days
              </span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setUnderusedDismissed(true)}
              data-testid="button-dismiss-underused"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            {underusedItems.slice(0, 10).map((item) => (
              <div
                key={item.id}
                className="flex-shrink-0 flex items-center gap-2 bg-background border rounded-md px-2 py-1.5 cursor-pointer hover-elevate"
                onClick={() => setDetailItem(item)}
                data-testid={`underused-item-${item.id}`}
              >
                {item.imageUrl && (
                  <div className="w-8 h-8 rounded bg-muted overflow-hidden flex-shrink-0">
                    <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="min-w-0">
                  <span className="text-xs font-medium truncate block max-w-[100px]">{item.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {item.wearCount === 0 ? "Never worn" : `${item.wearCount} wear${item.wearCount !== 1 ? "s" : ""}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
                                    setDetailItem(item);
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
                                  {item.wearCount > 0 && (
                                    <Badge variant="secondary" className="text-xs no-default-hover-elevate" data-testid={`badge-wear-count-${item.id}`}>
                                      <RefreshCw className="w-3 h-3 mr-1" />
                                      {item.wearCount}
                                    </Badge>
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
            <DialogTitle data-testid="text-delete-dialog-title">Delete from Wardrobe</DialogTitle>
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
                  {selectedItems.size !== 1 ? "s" : ""}?
                  {(() => {
                    const affectedCapsules = new Map<string, string>();
                    for (const itemId of selectedItems) {
                      const item = items.find((i) => i.id === itemId);
                      if (item?.capsules) {
                        for (const c of item.capsules) {
                          affectedCapsules.set(c.id, c.name);
                        }
                      }
                    }
                    if (affectedCapsules.size > 0) {
                      const names = Array.from(affectedCapsules.values());
                      return (
                        <>
                          {" "}This will affect the following capsule{names.length !== 1 ? "s" : ""}:{" "}
                          <strong data-testid="text-affected-capsules">{names.join(", ")}</strong>.
                          Items will be removed from all capsule assignments.
                        </>
                      );
                    }
                    return " This will remove them from your wardrobe.";
                  })()}
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDeleteDialogOpen(false); setItemToDelete(null); }} data-testid="button-cancel-delete">
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
              {deleteMutation.isPending || bulkDeleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ItemDetailModal
        item={detailItem}
        open={!!detailItem}
        onOpenChange={(open) => { if (!open) setDetailItem(null); }}
        context="wardrobe"
        availableCapsules={wardrobeCapsules
          .filter((c) => !detailItem?.capsules?.some((ic) => ic.id === c.id))
          .map((c) => ({ id: c.id, name: c.name }))}
        onAssignToCapsule={(capsuleId) => {
          if (detailItem) {
            singleAssignMutation.mutate({ capsuleId, itemId: detailItem.id });
            setDetailItem(null);
          }
        }}
        onEdit={() => {
          if (detailItem) {
            openEditItemDialog(detailItem);
            setDetailItem(null);
          }
        }}
        onLogWear={() => {
          if (detailItem) {
            wearMutation.mutate(detailItem.id);
          }
        }}
        onDeleteFromWardrobe={() => {
          if (detailItem) {
            setItemToDelete(detailItem);
            setDetailItem(null);
            setDeleteDialogOpen(true);
          }
        }}
        assignPending={singleAssignMutation.isPending}
        logWearPending={wearMutation.isPending}
        deletePending={deleteMutation.isPending}
      />

      <Dialog open={isEditItemOpen} onOpenChange={(open) => {
        setIsEditItemOpen(open);
        if (!open) {
          setEditingItem(null);
          setEditedItem({
            category: '',
            name: '',
            color: '',
            size: '',
            material: '',
            washInstructions: '',
            description: '',
            imageUrl: '',
            productLink: '',
          });
        }
      }}>
        <DialogContent
          className="max-h-[90vh] flex flex-col"
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Edit Item</DialogTitle>
            <DialogDescription>Update the item details below</DialogDescription>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto pr-2 -mr-2">
            <div className="space-y-4 pb-2">
              <div>
                <Label htmlFor="wardrobe-edit-category">Category*</Label>
                <Select
                  value={editedItem.category}
                  onValueChange={(value) => setEditedItem({ ...editedItem, category: value })}
                >
                  <SelectTrigger id="wardrobe-edit-category" data-testid="select-wardrobe-edit-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {displayCategories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="wardrobe-edit-name">Name*</Label>
                <Input
                  id="wardrobe-edit-name"
                  data-testid="input-wardrobe-edit-item-name"
                  value={editedItem.name}
                  onChange={(e) => setEditedItem({ ...editedItem, name: e.target.value })}
                  placeholder="e.g., White T-Shirt"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="wardrobe-edit-color">Color</Label>
                  <Input
                    id="wardrobe-edit-color"
                    data-testid="input-wardrobe-edit-item-color"
                    value={editedItem.color}
                    onChange={(e) => setEditedItem({ ...editedItem, color: e.target.value })}
                    placeholder="Navy Blue"
                  />
                </div>
                <div>
                  <Label htmlFor="wardrobe-edit-size">Size</Label>
                  <Input
                    id="wardrobe-edit-size"
                    data-testid="input-wardrobe-edit-item-size"
                    value={editedItem.size}
                    onChange={(e) => setEditedItem({ ...editedItem, size: e.target.value })}
                    placeholder="M, 32W, 8.5"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="wardrobe-edit-material">Material</Label>
                <Input
                  id="wardrobe-edit-material"
                  data-testid="input-wardrobe-edit-item-material"
                  value={editedItem.material}
                  onChange={(e) => setEditedItem({ ...editedItem, material: e.target.value })}
                  placeholder="100% Cotton"
                />
              </div>
              <div>
                <Label htmlFor="wardrobe-edit-description">Description</Label>
                <Textarea
                  id="wardrobe-edit-description"
                  data-testid="input-wardrobe-edit-item-description"
                  value={editedItem.description}
                  onChange={(e) => setEditedItem({ ...editedItem, description: e.target.value })}
                  placeholder="Additional notes..."
                  className="resize-none"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditItemOpen(false)}
              data-testid="button-cancel-wardrobe-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (editingItem) {
                  updateItemMutation.mutate({
                    itemId: editingItem.id,
                    updates: editedItem,
                  });
                }
              }}
              disabled={updateItemMutation.isPending || !editedItem.name.trim() || !editedItem.category}
              data-testid="button-save-wardrobe-edit"
            >
              {updateItemMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
