import { useState, useRef, useEffect, useCallback } from "react";
import { useRoute, useLocation, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { suggestCategory } from "@/lib/categoryMapping";
import { ToastAction } from "@/components/ui/toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import { ObjectUploader } from "@/components/ObjectUploader";
import {
  ArrowLeft,
  Plus,
  Minus,
  Camera,
  ScanLine,
  Loader2,
  Search,
  X,
  ChevronDown,
  Pencil,
  Trash2,
  AlertTriangle,
  Lock,
  Check,
} from "lucide-react";
import type { ItemCategory, Item, Wardrobe } from "@shared/schema";
import { CLOTHING_CATEGORIES, JEWELRY_CATEGORIES, ITEM_CATEGORIES } from "@shared/schema";
import { compressBase64Image } from "@/lib/imageCompression";

interface AddedItem {
  id: string;
  ids: string[];
  name: string;
  category: string;
  quantity: number;
  color?: string;
  size?: string;
  material?: string;
}

interface FormState {
  name: string;
  category: string;
  color: string;
  size: string;
  material: string;
  washInstructions: string;
  description: string;
  imageUrl: string;
  quantity: number;
}

const INITIAL_FORM: FormState = {
  name: "",
  category: "",
  color: "",
  size: "",
  material: "",
  washInstructions: "",
  description: "",
  imageUrl: "",
  quantity: 1,
};

function getEncouragementMessage(count: number): string | null {
  if (count >= 50) return "You're all set!";
  if (count >= 25) return "Your wardrobe is taking shape!";
  if (count >= 10) return "Nice start!";
  return null;
}

export default function BulkAddItems() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/wardrobes/:wardrobeId/bulk-add");
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const wardrobeId = params?.wardrobeId || "";
  const capsuleId = searchParams.get("capsuleId") || undefined;

  const { toast, dismiss } = useToast();
  const {
    isWithinItemLimit,
    maxItemsPerWardrobe,
    features,
  } = useSubscription();
  const canScanTags = features.fullAI;

  const nameInputRef = useRef<HTMLInputElement>(null);
  const snapNameInputRef = useRef<HTMLInputElement>(null);
  const tagFileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<FormState>({ ...INITIAL_FORM });
  const [stickyCategory, setStickyCategory] = useState<string>("");
  const [suggestedCategory, setSuggestedCategory] = useState<ItemCategory | null>(null);
  const [addedItems, setAddedItems] = useState<AddedItem[]>([]);
  const [searchFilter, setSearchFilter] = useState("");
  const [moreDetailsOpen, setMoreDetailsOpen] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<{ name: string; count: number } | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");

  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [tagCount, setTagCount] = useState(0);
  const [scanForm, setScanForm] = useState<FormState>({ ...INITIAL_FORM });
  const [scanSuggestedCategory, setScanSuggestedCategory] = useState<ItemCategory | null>(null);
  const [scanDuplicateWarning, setScanDuplicateWarning] = useState<{ name: string; count: number } | null>(null);

  const [snapPreview, setSnapPreview] = useState<string | null>(null);
  const [snapForm, setSnapForm] = useState<FormState>({ ...INITIAL_FORM });
  const [snapSuggestedCategory, setSnapSuggestedCategory] = useState<ItemCategory | null>(null);
  const [snapDuplicateWarning, setSnapDuplicateWarning] = useState<{ name: string; count: number } | null>(null);
  const snapFileInputRef = useRef<HTMLInputElement>(null);

  const { data: wardrobe } = useQuery<Wardrobe>({
    queryKey: ["/api/wardrobes", wardrobeId],
    enabled: !!wardrobeId,
  });

  const { data: itemCountData, refetch: refetchCount } = useQuery<{ count: number }>({
    queryKey: ["/api/wardrobes", wardrobeId, "items", "count"],
    enabled: !!wardrobeId,
  });

  const currentItemCount = (itemCountData?.count || 0) + addedItems.reduce((sum, i) => sum + i.quantity, 0);
  const atLimit = !isWithinItemLimit(currentItemCount);

  const displayCategories = ITEM_CATEGORIES as readonly ItemCategory[];

  const wardrobeLabel = wardrobe?.name || "My Wardrobe";

  const updateFormField = useCallback((field: keyof FormState, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  }, []);

  useEffect(() => {
    if (form.name.length >= 2) {
      const suggestion = suggestCategory(form.name, [...displayCategories]);
      setSuggestedCategory(suggestion);
    } else {
      setSuggestedCategory(null);
    }
  }, [form.name, displayCategories]);

  useEffect(() => {
    if (scanForm.name.length >= 2) {
      const suggestion = suggestCategory(scanForm.name, [...displayCategories]);
      setScanSuggestedCategory(suggestion);
    } else {
      setScanSuggestedCategory(null);
    }
  }, [scanForm.name, displayCategories]);

  useEffect(() => {
    if (snapForm.name.length >= 2) {
      const suggestion = suggestCategory(snapForm.name, [...displayCategories]);
      setSnapSuggestedCategory(suggestion);
    } else {
      setSnapSuggestedCategory(null);
    }
  }, [snapForm.name, displayCategories]);

  const checkDuplicate = useCallback(
    async (name: string): Promise<{ name: string; count: number } | null> => {
      if (!name.trim() || !wardrobeId) return null;
      try {
        const res = await apiRequest(
          `/api/wardrobes/${wardrobeId}/items/check-duplicate?name=${encodeURIComponent(name.trim())}`,
          "GET"
        );
        if (res.count > 0) {
          return { name: name.trim(), count: res.count };
        }
      } catch {}
      return null;
    },
    [wardrobeId]
  );

  const handleNameBlur = useCallback(async () => {
    const result = await checkDuplicate(form.name);
    setDuplicateWarning(result);
  }, [form.name, checkDuplicate]);

  const handleScanNameBlur = useCallback(async () => {
    const result = await checkDuplicate(scanForm.name);
    setScanDuplicateWarning(result);
  }, [scanForm.name, checkDuplicate]);

  const handleSnapNameBlur = useCallback(async () => {
    const result = await checkDuplicate(snapForm.name);
    setSnapDuplicateWarning(result);
  }, [snapForm.name, checkDuplicate]);

  const addItemMutation = useMutation({
    mutationFn: async (data: {
      wardrobeId: string;
      capsuleId?: string;
      name: string;
      category: string;
      color?: string;
      size?: string;
      material?: string;
      washInstructions?: string;
      description?: string;
      imageUrl?: string;
      quantity: number;
    }) => {
      return await apiRequest("/api/items", "POST", data);
    },
    onSuccess: (result, variables) => {
      const items = result && typeof result === 'object' && 'items' in result
        ? (result as { items: Item[]; skippedCount?: number }).items
        : Array.isArray(result) ? result : [result];
      const skippedCount = result && typeof result === 'object' && 'skippedCount' in result
        ? (result as { skippedCount: number }).skippedCount
        : 0;
      const newItem: AddedItem = {
        id: items[0].id,
        ids: items.map((i: Item) => i.id),
        name: variables.name,
        category: variables.category,
        quantity: variables.quantity || 1,
        color: variables.color,
        size: variables.size,
        material: variables.material,
      };
      setAddedItems((prev) => [newItem, ...prev]);
      refetchCount();
      queryClient.refetchQueries({ queryKey: ["/api/wardrobes", wardrobeId, "items"] });

      const undoToast = toast({
        title: `Added ${variables.quantity > 1 ? `${variables.quantity}x ` : ""}${variables.name}`,
        description: `to ${wardrobeLabel}`,
        duration: 4000,
        action: (
          <ToastAction
            altText="Undo"
            onClick={async () => {
              try {
                for (const item of items) {
                  await apiRequest(`/api/items/${item.id}`, "DELETE");
                }
                setAddedItems((prev) => prev.filter((i) => i.id !== newItem.id));
                refetchCount();
                queryClient.refetchQueries({ queryKey: ["/api/wardrobes", wardrobeId, "items"] });
                setForm({
                  ...INITIAL_FORM,
                  name: variables.name,
                  category: variables.category,
                  color: variables.color || "",
                  size: variables.size || "",
                  material: variables.material || "",
                  washInstructions: variables.washInstructions || "",
                  description: variables.description || "",
                  imageUrl: variables.imageUrl || "",
                  quantity: variables.quantity,
                });
              } catch {
                toast({ title: "Undo failed", variant: "destructive" });
              }
            }}
            data-testid="button-undo-add"
          >
            Undo
          </ToastAction>
        ),
      });

      if (skippedCount > 0) {
        toast({
          title: "Some items were skipped",
          description: `${skippedCount} item(s) skipped due to wardrobe limit.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add item",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleQuickAdd = useCallback(() => {
    if (!form.name.trim() || !form.category) return;
    const newStickyCategory = form.category;
    addItemMutation.mutate({
      wardrobeId,
      capsuleId,
      name: form.name.trim(),
      category: form.category,
      color: form.color || undefined,
      size: form.size || undefined,
      material: form.material || undefined,
      washInstructions: form.washInstructions || undefined,
      description: form.description || undefined,
      imageUrl: form.imageUrl || undefined,
      quantity: form.quantity,
    });
    setStickyCategory(newStickyCategory);
    setForm({ ...INITIAL_FORM, category: newStickyCategory });
    setDuplicateWarning(null);
    setSuggestedCategory(null);
    setMoreDetailsOpen(false);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  }, [form, wardrobeId, capsuleId, addItemMutation]);

  const handleScanAdd = useCallback(() => {
    if (!scanForm.name.trim() || !scanForm.category) return;
    addItemMutation.mutate({
      wardrobeId,
      capsuleId,
      name: scanForm.name.trim(),
      category: scanForm.category,
      color: scanForm.color || undefined,
      size: scanForm.size || undefined,
      material: scanForm.material || undefined,
      washInstructions: scanForm.washInstructions || undefined,
      description: scanForm.description || undefined,
      quantity: scanForm.quantity,
    });
    setScanForm({ ...INITIAL_FORM });
    setScanPreview(null);
    setTagCount(0);
    setScanDuplicateWarning(null);
    setScanSuggestedCategory(null);
  }, [scanForm, wardrobeId, capsuleId, addItemMutation]);

  const handleSnapAdd = useCallback(() => {
    if (!snapForm.name.trim() || !snapForm.category) return;
    addItemMutation.mutate({
      wardrobeId,
      capsuleId,
      name: snapForm.name.trim(),
      category: snapForm.category,
      imageUrl: snapPreview || undefined,
      quantity: snapForm.quantity,
    });
    setSnapForm({ ...INITIAL_FORM });
    setSnapPreview(null);
    setSnapDuplicateWarning(null);
    setSnapSuggestedCategory(null);
  }, [snapForm, snapPreview, wardrobeId, capsuleId, addItemMutation]);

  const handleTagPhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        toast({ title: "Invalid file", description: "Please select an image", variant: "destructive" });
        return;
      }
      if (file.size > 7.5 * 1024 * 1024) {
        toast({ title: "File too large", description: "Max 7.5MB", variant: "destructive" });
        return;
      }
      setIsScanning(true);
      try {
        const reader = new FileReader();
        const rawBase64 = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const base64 = await compressBase64Image(rawBase64);
        setScanPreview(base64);
        const result = await apiRequest("/api/scan-clothing-tag", "POST", { imageBase64: base64 });
        setTagCount((prev) => prev + 1);

        setScanForm((prev) => {
          const updated = { ...prev };
          if (result.name && !prev.name) updated.name = result.name;
          if (result.material && !prev.material) updated.material = result.material;
          if (result.color && !prev.color) updated.color = result.color;
          if (result.size && !prev.size) updated.size = result.size;
          if (result.washInstructions && !prev.washInstructions) updated.washInstructions = result.washInstructions;
          if (result.category && !prev.category) {
            const matched = displayCategories.find(
              (c) => c.toLowerCase() === result.category.toLowerCase()
            );
            if (matched) updated.category = matched;
          }
          const descParts: string[] = [];
          if (result.brand) descParts.push(`Brand: ${result.brand}`);
          if (result.description) descParts.push(result.description);
          const descValue = descParts.join(". ");
          if (descValue && !prev.description) updated.description = descValue;
          else if (descValue && prev.description && !prev.description.includes(descValue)) {
            updated.description = prev.description + ". " + descValue;
          }
          return updated;
        });

        toast({ title: "Tag scanned successfully" });

        if (result.name) {
          const dupResult = await checkDuplicate(result.name);
          setScanDuplicateWarning(dupResult);
        }
      } catch (error: any) {
        toast({ title: "Scan failed", description: error.message || "Could not read tag", variant: "destructive" });
        setScanPreview(null);
      } finally {
        setIsScanning(false);
        if (tagFileInputRef.current) tagFileInputRef.current.value = "";
      }
    },
    [displayCategories, checkDuplicate, toast]
  );

  const handleSnapPhoto = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (!file.type.startsWith("image/")) return;
      const reader = new FileReader();
      const rawBase64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      const base64 = await compressBase64Image(rawBase64);
      setSnapPreview(base64);
      if (snapFileInputRef.current) snapFileInputRef.current.value = "";
    },
    []
  );

  const handleDeleteAdded = useCallback(
    async (item: AddedItem) => {
      try {
        for (const id of item.ids) {
          await apiRequest(`/api/items/${id}`, "DELETE");
        }
        setAddedItems((prev) => prev.filter((i) => i.id !== item.id));
        refetchCount();
        queryClient.refetchQueries({ queryKey: ["/api/wardrobes", wardrobeId, "items"] });
      } catch {
        toast({ title: "Failed to delete", variant: "destructive" });
      }
    },
    [wardrobeId, refetchCount, toast]
  );

  const handleEditSave = useCallback(
    async (item: AddedItem) => {
      if (!editName.trim()) return;
      try {
        await apiRequest(`/api/items/${item.ids[0]}`, "PATCH", { name: editName.trim() });
        setAddedItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, name: editName.trim() } : i))
        );
        setEditingItemId(null);
        setEditName("");
      } catch {
        toast({ title: "Failed to update", variant: "destructive" });
      }
    },
    [editName, toast]
  );

  const handleDone = useCallback(async () => {
    if (!capsuleId && wardrobeId) {
      try {
        const unassigned = await apiRequest(`/api/wardrobes/${wardrobeId}/items/unassigned`, 'GET') as any[];
        if (unassigned && unassigned.length > 0) {
          toast({
            title: `${unassigned.length} item${unassigned.length > 1 ? 's' : ''} not in any capsule`,
            description: "Sort them into capsules from the Items view.",
            action: (
              <ToastAction altText="Sort now" onClick={() => navigate("/items")}>
                Sort Now
              </ToastAction>
            ),
            duration: 6000,
          });
        }
      } catch {}
    }
    if (capsuleId) {
      navigate(`/capsule/${capsuleId}`);
    } else {
      navigate("/");
    }
  }, [capsuleId, wardrobeId, navigate, toast]);

  const filteredItems = addedItems.filter(
    (i) =>
      !searchFilter || i.name.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const encouragement = getEncouragementMessage(currentItemCount);

  const renderQuantityStepper = (
    value: number,
    onChange: (v: number) => void,
    testIdPrefix: string
  ) => (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.max(1, value - 1))}
        disabled={value <= 1}
        data-testid={`${testIdPrefix}-quantity-minus`}
      >
        <Minus className="w-3 h-3" />
      </Button>
      <span className="w-8 text-center text-sm font-medium" data-testid={`${testIdPrefix}-quantity-value`}>
        {value}
      </span>
      <Button
        variant="outline"
        size="icon"
        onClick={() => onChange(Math.min(10, value + 1))}
        disabled={value >= 10}
        data-testid={`${testIdPrefix}-quantity-plus`}
      >
        <Plus className="w-3 h-3" />
      </Button>
    </div>
  );

  const renderCategorySuggestion = (
    suggestion: ItemCategory | null,
    onAccept: () => void,
    testId: string
  ) => {
    if (!suggestion) return null;
    return (
      <Badge
        variant="secondary"
        className="cursor-pointer text-xs"
        onClick={onAccept}
        role="button"
        tabIndex={0}
        onKeyDown={(e: React.KeyboardEvent) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onAccept();
          }
        }}
        data-testid={testId}
      >
        <Check className="w-3 h-3 mr-1" />
        {suggestion}
      </Badge>
    );
  };

  const renderDuplicateWarning = (warning: { name: string; count: number } | null, testId: string) => {
    if (!warning) return null;
    return (
      <div className="flex items-center gap-2 text-xs text-muted-foreground" data-testid={testId}>
        <AlertTriangle className="w-3 h-3 flex-shrink-0" />
        <span>
          You already have {warning.count} {warning.name} &mdash; add more?
        </span>
      </div>
    );
  };

  const renderCategorySelect = (
    value: string,
    onChange: (v: string) => void,
    testId: string
  ) => (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger data-testid={testId}>
        <SelectValue placeholder="Category" />
      </SelectTrigger>
      <SelectContent>
        {displayCategories.map((cat) => (
          <SelectItem key={cat} value={cat}>
            {cat}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (!match) return null;

  return (
    <div className="flex flex-col h-screen bg-background">
      <div className="flex items-center gap-3 p-4 border-b sticky top-0 bg-background z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1 as any)}
          data-testid="button-back"
        >
          <ArrowLeft />
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-serif text-lg font-semibold truncate" data-testid="text-page-title">
            Add Items to {wardrobeLabel}
          </h1>
          {capsuleId && (
            <p className="text-xs text-muted-foreground truncate">
              Items will also be added to this capsule
            </p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pb-24">
        <Tabs defaultValue="quick" className="w-full">
          <TabsList className="w-full rounded-none border-b" data-testid="tabs-add-mode">
            <TabsTrigger value="quick" className="flex-1" data-testid="tab-quick-add">
              Quick Add
            </TabsTrigger>
            <TabsTrigger value="scan" className="flex-1" data-testid="tab-scan-tags">
              Scan Tags
            </TabsTrigger>
            <TabsTrigger value="snap" className="flex-1" data-testid="tab-snap-photos">
              Snap Photos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="quick" className="p-4 space-y-3">
            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="quick-category">Category*</Label>
                {suggestedCategory && form.category !== suggestedCategory && (
                  <div className="mb-1">
                    {renderCategorySuggestion(suggestedCategory, () => updateFormField("category", suggestedCategory), "chip-suggested-category")}
                  </div>
                )}
                {renderCategorySelect(form.category, (v) => {
                  updateFormField("category", v);
                  setStickyCategory(v);
                }, "select-quick-category")}
              </div>

              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="quick-name">Name*</Label>
                  <Input
                    ref={nameInputRef}
                    id="quick-name"
                    value={form.name}
                    onChange={(e) => updateFormField("name", e.target.value)}
                    onBlur={handleNameBlur}
                    placeholder="e.g., White T-Shirt"
                    autoFocus
                    data-testid="input-quick-name"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Qty</Label>
                  {renderQuantityStepper(form.quantity, (v) => updateFormField("quantity", v), "quick")}
                </div>
              </div>

              {renderDuplicateWarning(duplicateWarning, "warning-duplicate")}

              <Collapsible open={moreDetailsOpen} onOpenChange={setMoreDetailsOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="ghost" size="sm" className="w-full justify-between" data-testid="button-more-details">
                    More details
                    <ChevronDown className={`w-4 h-4 transition-transform ${moreDetailsOpen ? "rotate-180" : ""}`} />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="quick-color">Color</Label>
                      <Input
                        id="quick-color"
                        value={form.color}
                        onChange={(e) => updateFormField("color", e.target.value)}
                        placeholder="Navy Blue"
                        data-testid="input-quick-color"
                      />
                    </div>
                    <div>
                      <Label htmlFor="quick-size">Size</Label>
                      <Input
                        id="quick-size"
                        value={form.size}
                        onChange={(e) => updateFormField("size", e.target.value)}
                        placeholder="M"
                        data-testid="input-quick-size"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="quick-material">Material</Label>
                    <Input
                      id="quick-material"
                      value={form.material}
                      onChange={(e) => updateFormField("material", e.target.value)}
                      placeholder="100% Cotton"
                      data-testid="input-quick-material"
                    />
                  </div>
                  <div>
                    <Label htmlFor="quick-care">Care Instructions</Label>
                    <Input
                      id="quick-care"
                      value={form.washInstructions}
                      onChange={(e) => updateFormField("washInstructions", e.target.value)}
                      placeholder="Machine wash cold"
                      data-testid="input-quick-care"
                    />
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <Button
                className="w-full"
                onClick={handleQuickAdd}
                disabled={!form.name.trim() || !form.category || atLimit || addItemMutation.isPending}
                data-testid="button-quick-add"
              >
                {addItemMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Add
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="scan" className="p-4 space-y-3">
            {!canScanTags ? (
              <Card className="p-6 text-center space-y-3">
                <Lock className="w-8 h-8 mx-auto text-muted-foreground" />
                <h3 className="font-semibold" data-testid="text-scan-upgrade-title">
                  Tag Scanning requires Premium
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upgrade to Premium or higher to use AI-powered tag scanning.
                </p>
                <Button onClick={() => navigate("/subscription")} data-testid="button-upgrade-scan">
                  Upgrade
                </Button>
              </Card>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <ScanLine className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {tagCount > 0 ? `${tagCount} tag${tagCount > 1 ? "s" : ""} scanned` : "Scan a clothing tag"}
                    </span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => tagFileInputRef.current?.click()}
                    disabled={isScanning}
                    data-testid="button-scan-tag"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Scanning...
                      </>
                    ) : (
                      <>
                        <Camera className="w-4 h-4 mr-2" />
                        {tagCount > 0 ? "Scan Another Tag" : "Take Photo"}
                      </>
                    )}
                  </Button>
                  <input
                    ref={tagFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleTagPhoto}
                    data-testid="input-scan-tag-photo"
                  />
                </div>

                {scanPreview && (
                  <img
                    src={scanPreview}
                    alt="Tag preview"
                    className="w-16 h-16 object-cover rounded-md"
                    data-testid="image-scan-preview"
                  />
                )}

                {(tagCount > 0 || scanForm.name) && (
                  <div className="space-y-3">
                    <div className="space-y-1">
                      <Label>Category*</Label>
                      {scanSuggestedCategory && scanForm.category !== scanSuggestedCategory && (
                        <div className="mb-1">
                          {renderCategorySuggestion(scanSuggestedCategory, () => setScanForm((p) => ({ ...p, category: scanSuggestedCategory })), "chip-scan-suggested-category")}
                        </div>
                      )}
                      {renderCategorySelect(scanForm.category, (v) => setScanForm((p) => ({ ...p, category: v })), "select-scan-category")}
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1 space-y-1">
                        <Label>Name*</Label>
                        <Input
                          value={scanForm.name}
                          onChange={(e) => setScanForm((p) => ({ ...p, name: e.target.value }))}
                          onBlur={handleScanNameBlur}
                          placeholder="Item name"
                          data-testid="input-scan-name"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label>Qty</Label>
                        {renderQuantityStepper(scanForm.quantity, (v) => setScanForm((p) => ({ ...p, quantity: v })), "scan")}
                      </div>
                    </div>
                    {renderDuplicateWarning(scanDuplicateWarning, "warning-scan-duplicate")}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Color</Label>
                        <Input
                          value={scanForm.color}
                          onChange={(e) => setScanForm((p) => ({ ...p, color: e.target.value }))}
                          data-testid="input-scan-color"
                        />
                      </div>
                      <div>
                        <Label>Size</Label>
                        <Input
                          value={scanForm.size}
                          onChange={(e) => setScanForm((p) => ({ ...p, size: e.target.value }))}
                          data-testid="input-scan-size"
                        />
                      </div>
                    </div>
                    <div>
                      <Label>Material</Label>
                      <Input
                        value={scanForm.material}
                        onChange={(e) => setScanForm((p) => ({ ...p, material: e.target.value }))}
                        data-testid="input-scan-material"
                      />
                    </div>
                    <Button
                      className="w-full"
                      onClick={handleScanAdd}
                      disabled={!scanForm.name.trim() || !scanForm.category || atLimit || addItemMutation.isPending}
                      data-testid="button-scan-add"
                    >
                      {addItemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                      Add Item
                    </Button>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="snap" className="p-4 space-y-3">
            <div className="space-y-3">
              {!snapPreview ? (
                <div className="text-center space-y-3">
                  <Button
                    variant="outline"
                    onClick={() => snapFileInputRef.current?.click()}
                    data-testid="button-snap-camera"
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    Take Photo of Item
                  </Button>
                  <input
                    ref={snapFileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleSnapPhoto}
                    data-testid="input-snap-photo"
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={snapPreview}
                      alt="Item photo"
                      className="w-20 h-20 object-cover rounded-md flex-shrink-0"
                      data-testid="image-snap-preview"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSnapPreview(null);
                        setSnapForm({ ...INITIAL_FORM });
                      }}
                      data-testid="button-snap-remove-photo"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <Label>Category*</Label>
                    {snapSuggestedCategory && snapForm.category !== snapSuggestedCategory && (
                      <div className="mb-1">
                        {renderCategorySuggestion(snapSuggestedCategory, () => setSnapForm((p) => ({ ...p, category: snapSuggestedCategory })), "chip-snap-suggested-category")}
                      </div>
                    )}
                    {renderCategorySelect(snapForm.category, (v) => setSnapForm((p) => ({ ...p, category: v })), "select-snap-category")}
                  </div>

                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label>Name*</Label>
                      <Input
                        ref={snapNameInputRef}
                        value={snapForm.name}
                        onChange={(e) => setSnapForm((p) => ({ ...p, name: e.target.value }))}
                        onBlur={handleSnapNameBlur}
                        placeholder="Item name"
                        data-testid="input-snap-name"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label>Qty</Label>
                      {renderQuantityStepper(snapForm.quantity, (v) => setSnapForm((p) => ({ ...p, quantity: v })), "snap")}
                    </div>
                  </div>
                  {renderDuplicateWarning(snapDuplicateWarning, "warning-snap-duplicate")}

                  <Button
                    className="w-full"
                    onClick={handleSnapAdd}
                    disabled={!snapForm.name.trim() || !snapForm.category || atLimit || addItemMutation.isPending}
                    data-testid="button-snap-add"
                  >
                    {addItemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
                    Add
                  </Button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {addedItems.length > 0 && (
          <div className="px-4 pt-2 pb-4 space-y-2">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-medium" data-testid="text-running-list-title">
                Added this session ({addedItems.length})
              </h3>
            </div>
            {addedItems.length >= 5 && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search added items..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  data-testid="input-search-added"
                />
              </div>
            )}
            <div className="space-y-1">
              {filteredItems.map((item) => (
                <Card key={item.id} className="p-3 flex items-center gap-2">
                  {editingItemId === item.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") handleEditSave(item);
                          if (e.key === "Escape") {
                            setEditingItemId(null);
                            setEditName("");
                          }
                        }}
                        data-testid={`input-edit-item-${item.id}`}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditSave(item)}
                        data-testid={`button-save-edit-${item.id}`}
                      >
                        <Check className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItemId(null);
                          setEditName("");
                        }}
                        data-testid={`button-cancel-edit-${item.id}`}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium truncate" data-testid={`text-item-name-${item.id}`}>
                            {item.name}
                          </span>
                          {item.quantity > 1 && (
                            <Badge variant="secondary" className="text-xs no-default-hover-elevate" data-testid={`badge-quantity-${item.id}`}>
                              x{item.quantity}
                            </Badge>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground" data-testid={`text-item-category-${item.id}`}>
                          {item.category}
                          {item.color ? ` · ${item.color}` : ""}
                        </span>
                      </div>
                      <div className="flex items-center gap-1" style={{ visibility: "visible" }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingItemId(item.id);
                            setEditName(item.name);
                          }}
                          data-testid={`button-edit-item-${item.id}`}
                        >
                          <Pencil className="w-3 h-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteAdded(item)}
                          data-testid={`button-delete-item-${item.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </>
                  )}
                </Card>
              ))}
            </div>
          </div>
        )}

        {atLimit && (
          <Card className="mx-4 p-4 text-center space-y-2">
            <AlertTriangle className="w-6 h-6 mx-auto text-muted-foreground" />
            <p className="text-sm font-medium" data-testid="text-limit-reached">
              Item limit reached ({maxItemsPerWardrobe})
            </p>
            <p className="text-xs text-muted-foreground">
              Upgrade your plan to add more items.
            </p>
            <Button size="sm" onClick={() => navigate("/subscription")} data-testid="button-upgrade-limit">
              Upgrade
            </Button>
          </Card>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-3 z-50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium" data-testid="text-items-added-count">
                {addedItems.reduce((s, i) => s + i.quantity, 0)} items added
              </span>
              {maxItemsPerWardrobe !== -1 && (
                <Badge variant="outline" className="text-xs no-default-hover-elevate" data-testid="badge-item-progress">
                  {currentItemCount}/{maxItemsPerWardrobe}
                </Badge>
              )}
            </div>
            {encouragement && (
              <span className="text-xs text-muted-foreground" data-testid="text-encouragement">
                {encouragement}
              </span>
            )}
          </div>
          <Button onClick={handleDone} data-testid="button-done">
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
