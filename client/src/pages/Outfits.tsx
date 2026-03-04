import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Heart, Loader2, CalendarDays, ChevronLeft, ChevronRight, Plus, Check, Trash2, Pencil } from "lucide-react";
import ThemeToggle from "@/components/ThemeToggle";
import type { Capsule, OutfitCalendarEntry } from "@shared/schema";

interface OutfitSuggestion {
  id: string;
  name: string;
  occasion: string;
  items: string[];
}

interface OutfitPairing {
  id: string;
  capsuleId: string;
  name: string;
  outfitData: OutfitSuggestion;
  createdAt: string;
}

function getWeekDates(baseDate: Date): Date[] {
  const day = baseDate.getDay();
  const diff = baseDate.getDate() - day;
  const sunday = new Date(baseDate);
  sunday.setDate(diff);
  sunday.setHours(0, 0, 0, 0);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    dates.push(d);
  }
  return dates;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatDateDisplay(d: Date): string {
  return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function isToday(d: Date): boolean {
  const today = new Date();
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
}

function isPast(d: Date): boolean {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

function OutfitCalendar({ capsules }: { capsules: Capsule[] }) {
  const { toast } = useToast();
  const [weekOffset, setWeekOffset] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [editingEntry, setEditingEntry] = useState<OutfitCalendarEntry | null>(null);
  const [selectedPairingCapsuleId, setSelectedPairingCapsuleId] = useState<string | null>(null);
  const [selectedPairingId, setSelectedPairingId] = useState<string | null>(null);
  const [customOutfitName, setCustomOutfitName] = useState("");
  const [customItemNames, setCustomItemNames] = useState("");
  const [notes, setNotes] = useState("");

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + weekOffset * 7);
    return d;
  }, [weekOffset]);

  const weekDates = useMemo(() => getWeekDates(baseDate), [baseDate]);
  const startDate = formatDateKey(weekDates[0]);
  const endDate = formatDateKey(weekDates[6]);

  const { data: calendarEntries = [], isLoading: calendarLoading } = useQuery<OutfitCalendarEntry[]>({
    queryKey: ['/api/outfit-calendar', startDate, endDate],
    queryFn: async () => {
      const res = await fetch(`/api/outfit-calendar?startDate=${startDate}&endDate=${endDate}`, { credentials: 'include' });
      if (!res.ok) throw new Error("Failed to fetch calendar");
      return res.json();
    },
  });

  const { data: pairingsForCapsule = [] } = useQuery<OutfitPairing[]>({
    queryKey: ['/api/capsules', selectedPairingCapsuleId, 'outfit-pairings'],
    enabled: !!selectedPairingCapsuleId,
  });

  const entriesByDate = useMemo(() => {
    const map: Record<string, OutfitCalendarEntry[]> = {};
    for (const entry of calendarEntries) {
      if (!map[entry.date]) map[entry.date] = [];
      map[entry.date].push(entry);
    }
    return map;
  }, [calendarEntries]);

  const createMutation = useMutation({
    mutationFn: async (body: any) => {
      return await apiRequest('/api/outfit-calendar', 'POST', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/outfit-calendar'] });
      toast({ title: "Outfit planned", description: "Your outfit has been added to the calendar." });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to plan outfit", description: error.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: any }) => {
      return await apiRequest(`/api/outfit-calendar/${id}`, 'PATCH', body);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/outfit-calendar'] });
      toast({ title: "Updated", description: "Outfit plan updated." });
      closeDialog();
    },
    onError: (error: Error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/outfit-calendar/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/outfit-calendar'] });
      toast({ title: "Removed", description: "Outfit removed from calendar." });
    },
  });

  const markWornMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/outfit-calendar/${id}/mark-worn`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/outfit-calendar'] });
      toast({ title: "Marked as worn", description: "Outfit marked as worn and wear counts updated." });
    },
    onError: (error: Error) => {
      toast({ title: "Failed", description: error.message, variant: "destructive" });
    },
  });

  function openAddDialog(dateKey: string) {
    setSelectedDate(dateKey);
    setEditingEntry(null);
    setSelectedPairingCapsuleId(null);
    setSelectedPairingId(null);
    setCustomOutfitName("");
    setCustomItemNames("");
    setNotes("");
    setDialogOpen(true);
  }

  function openEditDialog(entry: OutfitCalendarEntry) {
    setSelectedDate(entry.date);
    setEditingEntry(entry);
    setSelectedPairingCapsuleId(entry.capsuleId || null);
    setSelectedPairingId(entry.outfitPairingId || null);
    setCustomOutfitName(entry.outfitName || "");
    setCustomItemNames(entry.itemNames?.join(", ") || "");
    setNotes(entry.notes || "");
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingEntry(null);
    setSelectedDate(null);
  }

  function handleSelectPairing(pairingId: string) {
    setSelectedPairingId(pairingId);
    const pairing = pairingsForCapsule.find(p => p.id === pairingId);
    if (pairing) {
      setCustomOutfitName(pairing.outfitData.name || pairing.name || "");
      setCustomItemNames(pairing.outfitData.items?.join(", ") || "");
    }
  }

  function handleSave() {
    if (!selectedDate) return;
    const itemNamesArray = customItemNames.split(",").map(s => s.trim()).filter(Boolean);
    const body = {
      date: selectedDate,
      outfitPairingId: selectedPairingId || null,
      capsuleId: selectedPairingCapsuleId || null,
      outfitName: customOutfitName || null,
      itemNames: itemNamesArray.length > 0 ? itemNamesArray : null,
      notes: notes || null,
      worn: editingEntry?.worn || false,
    };

    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, body });
    } else {
      createMutation.mutate(body);
    }
  }

  const weekLabel = useMemo(() => {
    const s = weekDates[0];
    const e = weekDates[6];
    const sMonth = s.toLocaleDateString("en-US", { month: "short" });
    const eMonth = e.toLocaleDateString("en-US", { month: "short" });
    if (sMonth === eMonth) {
      return `${sMonth} ${s.getDate()} - ${e.getDate()}, ${e.getFullYear()}`;
    }
    return `${sMonth} ${s.getDate()} - ${eMonth} ${e.getDate()}, ${e.getFullYear()}`;
  }, [weekDates]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setWeekOffset(w => w - 1)}
          data-testid="button-prev-week"
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <span className="text-sm font-medium text-foreground" data-testid="text-week-label">{weekLabel}</span>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setWeekOffset(w => w + 1)}
          data-testid="button-next-week"
        >
          <ChevronRight className="w-5 h-5" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setWeekOffset(0)}
          data-testid="button-today"
        >
          Today
        </Button>
      </div>

      {calendarLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {weekDates.map((date) => {
            const dateKey = formatDateKey(date);
            const entries = entriesByDate[dateKey] || [];
            const today = isToday(date);
            const past = isPast(date);

            return (
              <Card
                key={dateKey}
                className={today ? "border-primary" : ""}
                data-testid={`card-calendar-day-${dateKey}`}
              >
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-sm font-medium">
                      {formatDateDisplay(date)}
                    </CardTitle>
                    {today && <Badge variant="default" className="text-xs">Today</Badge>}
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => openAddDialog(dateKey)}
                    data-testid={`button-add-outfit-${dateKey}`}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </CardHeader>
                <CardContent className="space-y-2">
                  {entries.length === 0 && (
                    <p className="text-xs text-muted-foreground">No outfit planned</p>
                  )}
                  {entries.map((entry) => (
                    <div
                      key={entry.id}
                      className="flex items-start justify-between gap-2 p-2 rounded-md bg-muted/50"
                      data-testid={`calendar-entry-${entry.id}`}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate" data-testid={`text-outfit-name-${entry.id}`}>
                          {entry.outfitName || "Unnamed Outfit"}
                        </p>
                        {entry.itemNames && entry.itemNames.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.itemNames.map((item, idx) => (
                              <Badge key={idx} variant="secondary" className="text-xs">
                                {item}
                              </Badge>
                            ))}
                          </div>
                        )}
                        {entry.notes && (
                          <p className="text-xs text-muted-foreground mt-1">{entry.notes}</p>
                        )}
                        {entry.worn && (
                          <Badge variant="default" className="mt-1 text-xs" data-testid={`badge-worn-${entry.id}`}>
                            <Check className="w-3 h-3 mr-1" /> Worn
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {past && !entry.worn && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => markWornMutation.mutate(entry.id)}
                            disabled={markWornMutation.isPending}
                            data-testid={`button-mark-worn-${entry.id}`}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEditDialog(entry)}
                          data-testid={`button-edit-entry-${entry.id}`}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deleteMutation.mutate(entry.id)}
                          disabled={deleteMutation.isPending}
                          data-testid={`button-delete-entry-${entry.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? "Edit Planned Outfit" : "Plan an Outfit"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Pick from saved outfit (optional)
              </label>
              <Select value={selectedPairingCapsuleId || undefined} onValueChange={(val) => {
                setSelectedPairingCapsuleId(val);
                setSelectedPairingId(null);
              }}>
                <SelectTrigger data-testid="select-calendar-capsule">
                  <SelectValue placeholder="Choose a capsule..." />
                </SelectTrigger>
                <SelectContent>
                  {capsules.map((capsule) => (
                    <SelectItem key={capsule.id} value={capsule.id}>
                      {capsule.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedPairingCapsuleId && pairingsForCapsule.length > 0 && (
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">
                  Saved Outfit
                </label>
                <Select value={selectedPairingId || undefined} onValueChange={handleSelectPairing}>
                  <SelectTrigger data-testid="select-calendar-pairing">
                    <SelectValue placeholder="Choose a saved outfit..." />
                  </SelectTrigger>
                  <SelectContent>
                    {pairingsForCapsule.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.outfitData?.name || p.name || "Unnamed"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Outfit Name
              </label>
              <Input
                value={customOutfitName}
                onChange={(e) => setCustomOutfitName(e.target.value)}
                placeholder="e.g., Casual Friday"
                data-testid="input-outfit-name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Items (comma-separated)
              </label>
              <Input
                value={customItemNames}
                onChange={(e) => setCustomItemNames(e.target.value)}
                placeholder="e.g., Blue shirt, Khaki pants, White sneakers"
                data-testid="input-item-names"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">
                Notes
              </label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any notes for this outfit..."
                data-testid="input-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={closeDialog} data-testid="button-cancel-calendar">
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={createMutation.isPending || updateMutation.isPending}
              data-testid="button-save-calendar"
            >
              {(createMutation.isPending || updateMutation.isPending) ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : null}
              {editingEntry ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function Outfits() {
  const { toast } = useToast();
  const [selectedCapsuleId, setSelectedCapsuleId] = useState<string | null>(null);
  const [generatedOutfits, setGeneratedOutfits] = useState<OutfitSuggestion[]>([]);

  const { data: capsules = [] } = useQuery<Capsule[]>({
    queryKey: ['/api/capsules'],
  });

  const { data: savedPairings = [] } = useQuery<OutfitPairing[]>({
    queryKey: ['/api/capsules', selectedCapsuleId, 'outfit-pairings'],
    enabled: !!selectedCapsuleId,
  });

  const generateMutation = useMutation({
    mutationFn: async (capsuleId: string) => {
      const response = await apiRequest(`/api/capsules/${capsuleId}/generate-outfit`, 'POST', {});
      return response as OutfitSuggestion[];
    },
    onSuccess: (data) => {
      setGeneratedOutfits(data);
      toast({
        title: "Outfits generated!",
        description: "Here are some fresh outfit suggestions based on your capsule.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to generate outfits",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async ({ capsuleId, outfit }: { capsuleId: string; outfit: OutfitSuggestion }) => {
      return await apiRequest(`/api/capsules/${capsuleId}/outfit-pairings`, 'POST', {
        name: outfit.name,
        outfitData: outfit,
      });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', selectedCapsuleId, 'outfit-pairings'] });
      toast({
        title: "Saved!",
        description: "Outfit pairing saved to your favorites.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to save",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePairingMutation = useMutation({
    mutationFn: async (pairingId: string) => {
      return await apiRequest(`/api/outfit-pairings/${pairingId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules', selectedCapsuleId, 'outfit-pairings'] });
      toast({
        title: "Removed",
        description: "Outfit pairing removed from favorites.",
      });
    },
  });

  const handleGenerate = () => {
    if (!selectedCapsuleId) {
      toast({
        title: "Select a capsule",
        description: "Please select a capsule first to generate outfits.",
      });
      return;
    }
    generateMutation.mutate(selectedCapsuleId);
  };

  const handleSave = (outfit: OutfitSuggestion) => {
    if (!selectedCapsuleId) return;
    saveMutation.mutate({ capsuleId: selectedCapsuleId, outfit });
  };

  const selectedCapsule = capsules.find(c => c.id === selectedCapsuleId);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="font-serif text-2xl font-semibold text-foreground">
          Outfits
        </h2>
        <ThemeToggle />
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6">
        <Tabs defaultValue="calendar" className="space-y-6">
          <TabsList className="w-full" data-testid="tabs-outfits">
            <TabsTrigger value="calendar" className="flex-1" data-testid="tab-calendar">
              <CalendarDays className="w-4 h-4 mr-2" />
              Calendar
            </TabsTrigger>
            <TabsTrigger value="generator" className="flex-1" data-testid="tab-generator">
              <Sparkles className="w-4 h-4 mr-2" />
              Generator
            </TabsTrigger>
          </TabsList>

          <TabsContent value="calendar">
            <OutfitCalendar capsules={capsules} />
          </TabsContent>

          <TabsContent value="generator" className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">
                  Select Capsule
                </label>
                <Select value={selectedCapsuleId || undefined} onValueChange={setSelectedCapsuleId}>
                  <SelectTrigger data-testid="select-capsule">
                    <SelectValue placeholder="Choose a capsule..." />
                  </SelectTrigger>
                  <SelectContent>
                    {capsules.map((capsule) => (
                      <SelectItem key={capsule.id} value={capsule.id}>
                        {capsule.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={!selectedCapsuleId || generateMutation.isPending}
                className="w-full"
                data-testid="button-generate-outfits"
              >
                {generateMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Outfits
                  </>
                )}
              </Button>
            </div>

            {generatedOutfits.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Generated Suggestions</h3>
                {generatedOutfits.map((outfit) => (
                  <Card key={outfit.id} data-testid={`card-outfit-${outfit.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{outfit.name}</CardTitle>
                          <CardDescription className="text-sm mt-1">{outfit.occasion}</CardDescription>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleSave(outfit)}
                          disabled={saveMutation.isPending}
                          data-testid={`button-save-${outfit.id}`}
                        >
                          <Heart className="w-5 h-5" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {outfit.items.map((item, idx) => (
                          <Badge key={idx} variant="secondary" data-testid={`badge-item-${idx}`}>
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {selectedCapsuleId && savedPairings.length > 0 && (
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Favorite Pairings</h3>
                {savedPairings.map((pairing) => (
                  <Card key={pairing.id} data-testid={`card-favorite-${pairing.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{pairing.outfitData.name}</CardTitle>
                          <CardDescription className="text-sm mt-1">
                            {pairing.outfitData.occasion}
                          </CardDescription>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => deletePairingMutation.mutate(pairing.id)}
                          disabled={deletePairingMutation.isPending}
                          data-testid={`button-delete-${pairing.id}`}
                        >
                          <Heart className="w-5 h-5 fill-current text-destructive" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2">
                        {pairing.outfitData.items.map((item, idx) => (
                          <Badge key={idx} variant="secondary">
                            {item}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!selectedCapsuleId && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-semibold text-xl mb-2">Select a Capsule</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Choose a capsule from the dropdown above to generate outfit suggestions
                </p>
              </div>
            )}

            {selectedCapsuleId && generatedOutfits.length === 0 && savedPairings.length === 0 && !generateMutation.isPending && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Sparkles className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-semibold text-xl mb-2">Generate Your First Outfit</h3>
                <p className="text-muted-foreground text-sm max-w-sm">
                  Click the button above to get AI-powered outfit suggestions from your {selectedCapsule?.name} capsule
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
