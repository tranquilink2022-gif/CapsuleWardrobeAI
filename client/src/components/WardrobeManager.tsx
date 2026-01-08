import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, User, Palette, Sparkles, Ruler, HelpCircle, ArrowLeft } from "lucide-react";
import { AGE_RANGES, STYLE_PREFERENCES, UNDERTONES } from "@shared/schema";
import type { Wardrobe } from "@shared/schema";
import { ScrollArea } from "@/components/ui/scroll-area";

type CreateStep = 'name' | 'age' | 'style' | 'undertone';

type MeasurementValue = { value: string; unit: string };
type MeasurementsData = Record<string, MeasurementValue>;
type WardrobeWithCount = Wardrobe & { capsuleCount: number };

interface WardrobeManagerProps {
  onWardrobeSelect?: (wardrobe: Wardrobe) => void;
  selectedWardrobeId?: string;
  compact?: boolean;
}

export default function WardrobeManager({ 
  onWardrobeSelect, 
  selectedWardrobeId,
  compact = false 
}: WardrobeManagerProps) {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isMeasurementsDialogOpen, setIsMeasurementsDialogOpen] = useState(false);
  const [editingWardrobe, setEditingWardrobe] = useState<WardrobeWithCount | null>(null);
  const [deletingWardrobe, setDeletingWardrobe] = useState<WardrobeWithCount | null>(null);
  const [measuringWardrobe, setMeasuringWardrobe] = useState<WardrobeWithCount | null>(null);
  const [createStep, setCreateStep] = useState<CreateStep>('name');
  const [showUndertoneGuide, setShowUndertoneGuide] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    ageRange: "",
    stylePreference: "",
    undertone: "",
  });

  const styleDescriptions: Record<string, string> = {
    "Women's": "Dresses, skirts, blouses, and traditionally feminine pieces",
    "Men's": "Suits, button-downs, and traditionally masculine pieces",
    "Mix": "The best of both worlds — no boundaries"
  };

  const undertoneDescriptions: Record<string, { description: string; colors: string }> = {
    "Warm": {
      description: "Golden, peachy, or yellow undertones",
      colors: "Earth tones, oranges, warm reds, olive greens, and golden yellows look great"
    },
    "Cool": {
      description: "Pink, red, or blue undertones",
      colors: "Jewel tones, blues, purples, emerald greens, and silver look great"
    },
    "Neutral": {
      description: "A mix of warm and cool undertones",
      colors: "Most colors work well — lots of flexibility in the palette"
    },
    "Unknown": {
      description: "Not sure yet, and that's okay!",
      colors: "We'll suggest versatile colors that work for most undertones"
    }
  };

  const defaultMeasurements: MeasurementsData = {
    height: { value: '', unit: 'in' },
    weight: { value: '', unit: 'lbs' },
    chest: { value: '', unit: 'in' },
    waist: { value: '', unit: 'in' },
    hips: { value: '', unit: 'in' },
    inseam: { value: '', unit: 'in' },
    neck: { value: '', unit: 'in' },
    sleeve: { value: '', unit: 'in' },
    shoulder: { value: '', unit: 'in' },
    shoeSize: { value: '', unit: 'US' },
    ringSize: { value: '', unit: 'US' },
    topSize: { value: '', unit: '' },
    bottomSize: { value: '', unit: '' },
    dressSize: { value: '', unit: '' },
    jacketSize: { value: '', unit: '' },
  };

  const [measurements, setMeasurements] = useState<MeasurementsData>(defaultMeasurements);

  const { data: wardrobes = [], isLoading } = useQuery<WardrobeWithCount[]>({
    queryKey: ['/api/wardrobes'],
  });

  const createWardrobeMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      return await apiRequest('/api/wardrobes', 'POST', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/wardrobes'] });
      setIsCreateDialogOpen(false);
      resetForm();
      toast({
        title: "Wardrobe created",
        description: "Your new wardrobe is ready to use.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create wardrobe",
        variant: "destructive",
      });
    },
  });

  const updateWardrobeMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      return await apiRequest(`/api/wardrobes/${id}`, 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/wardrobes'] });
      setIsEditDialogOpen(false);
      setEditingWardrobe(null);
      resetForm();
      toast({
        title: "Wardrobe updated",
        description: "Changes saved successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update wardrobe",
        variant: "destructive",
      });
    },
  });

  const deleteWardrobeMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/wardrobes/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/wardrobes'] });
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
      setIsDeleteDialogOpen(false);
      setDeletingWardrobe(null);
      toast({
        title: "Wardrobe deleted",
        description: "The wardrobe and its capsules have been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete wardrobe",
        variant: "destructive",
      });
    },
  });

  const updateMeasurementsMutation = useMutation({
    mutationFn: async ({ id, measurements }: { id: string; measurements: MeasurementsData }) => {
      return await apiRequest(`/api/wardrobes/${id}`, 'PATCH', { measurements });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/wardrobes'] });
      setIsMeasurementsDialogOpen(false);
      setMeasuringWardrobe(null);
      toast({
        title: "Measurements saved",
        description: "Measurements updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save measurements",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      ageRange: "",
      stylePreference: "",
      undertone: "",
    });
    setCreateStep('name');
    setShowUndertoneGuide(false);
  };

  const handleCreateContinue = () => {
    if (createStep === 'name' && formData.name.trim()) {
      setCreateStep('age');
    } else if (createStep === 'age' && formData.ageRange) {
      setCreateStep('style');
    } else if (createStep === 'style' && formData.stylePreference) {
      setCreateStep('undertone');
    } else if (createStep === 'undertone' && formData.undertone) {
      createWardrobeMutation.mutate(formData);
    }
  };

  const handleCreateBack = () => {
    if (createStep === 'age') setCreateStep('name');
    else if (createStep === 'style') setCreateStep('age');
    else if (createStep === 'undertone') setCreateStep('style');
  };

  const openEditDialog = (wardrobe: WardrobeWithCount) => {
    setEditingWardrobe(wardrobe);
    setFormData({
      name: wardrobe.name,
      ageRange: wardrobe.ageRange || "",
      stylePreference: wardrobe.stylePreference || "",
      undertone: wardrobe.undertone || "",
    });
    setIsEditDialogOpen(true);
  };

  const openDeleteDialog = (wardrobe: WardrobeWithCount) => {
    setDeletingWardrobe(wardrobe);
    setIsDeleteDialogOpen(true);
  };

  const openMeasurementsDialog = (wardrobe: WardrobeWithCount) => {
    setMeasuringWardrobe(wardrobe);
    const wardrobeMeasurements = wardrobe.measurements as MeasurementsData | null;
    const mergedMeasurements: MeasurementsData = {} as MeasurementsData;
    Object.keys(defaultMeasurements).forEach(key => {
      const k = key as keyof MeasurementsData;
      mergedMeasurements[k] = wardrobeMeasurements?.[k] 
        ? { ...wardrobeMeasurements[k] }
        : { ...defaultMeasurements[k] };
    });
    setMeasurements(mergedMeasurements);
    setIsMeasurementsDialogOpen(true);
  };

  const getMeasurementLabel = (key: string) => {
    return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
  };

  const hasMeasurements = (wardrobe: WardrobeWithCount) => {
    const m = wardrobe.measurements as MeasurementsData | null;
    return m && Object.values(m).some(v => v.value?.trim());
  };

  const getUndertoneColor = (undertone: string | null) => {
    switch (undertone) {
      case 'Warm': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300';
      case 'Cool': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300';
      case 'Neutral': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-lg">Wardrobes</h3>
        <Button 
          size="sm" 
          onClick={() => setIsCreateDialogOpen(true)}
          data-testid="button-create-wardrobe"
        >
          <Plus className="w-4 h-4 mr-1" />
          New Wardrobe
        </Button>
      </div>

      {wardrobes.length === 0 ? (
        <Card className="p-6 text-center">
          <p className="text-muted-foreground mb-4">No wardrobes yet. Create one to get started.</p>
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            Create Your First Wardrobe
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {wardrobes.map((wardrobe) => (
            <Card 
              key={wardrobe.id}
              className={`p-4 cursor-pointer transition-colors hover-elevate ${
                selectedWardrobeId === wardrobe.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onWardrobeSelect?.(wardrobe)}
              data-testid={`card-wardrobe-${wardrobe.id}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium truncate">{wardrobe.name}</h4>
                    {wardrobe.isDefault && (
                      <Badge variant="secondary" className="text-xs">Default</Badge>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {wardrobe.ageRange && (
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3" />
                        {wardrobe.ageRange}
                      </span>
                    )}
                    {wardrobe.stylePreference && (
                      <span className="flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        {wardrobe.stylePreference}
                      </span>
                    )}
                    {wardrobe.undertone && (
                      <Badge className={`text-xs ${getUndertoneColor(wardrobe.undertone)}`}>
                        <Palette className="w-3 h-3 mr-1" />
                        {wardrobe.undertone}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {wardrobe.capsuleCount} {wardrobe.capsuleCount === 1 ? 'capsule' : 'capsules'}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      openMeasurementsDialog(wardrobe);
                    }}
                    data-testid={`button-measurements-wardrobe-${wardrobe.id}`}
                    title="Edit Measurements"
                  >
                    <Ruler className={`w-4 h-4 ${hasMeasurements(wardrobe) ? 'text-primary' : ''}`} />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      openEditDialog(wardrobe);
                    }}
                    data-testid={`button-edit-wardrobe-${wardrobe.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  {!wardrobe.isDefault && (
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        openDeleteDialog(wardrobe);
                      }}
                      data-testid={`button-delete-wardrobe-${wardrobe.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={(open) => {
        setIsCreateDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-md">
          {createStep === 'name' && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  Create a New Wardrobe
                </h2>
                <p className="text-sm text-muted-foreground">
                  Who is this wardrobe for? Give it a name to keep things organized.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Wardrobe Name</Label>
                <Input
                  id="name"
                  placeholder="e.g., My Wardrobe, Partner, Kids"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  data-testid="input-wardrobe-name"
                  autoFocus
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleCreateContinue}
                  disabled={!formData.name.trim()}
                  className="flex-1"
                  data-testid="button-name-continue"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {createStep === 'age' && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <User className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  What's the age range?
                </h2>
                <p className="text-sm text-muted-foreground">
                  This helps us suggest styles and pieces that fit the lifestyle
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {AGE_RANGES.map((range) => (
                  <Card
                    key={range}
                    className={`p-4 cursor-pointer text-center transition-all ${
                      formData.ageRange === range 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover-elevate'
                    }`}
                    onClick={() => setFormData({ ...formData, ageRange: range })}
                    data-testid={`card-age-${range}`}
                  >
                    <span className="font-medium text-foreground">{range}</span>
                  </Card>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCreateBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleCreateContinue}
                  disabled={!formData.ageRange}
                  className="flex-1"
                  data-testid="button-age-continue"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {createStep === 'style' && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  Which styles do they prefer?
                </h2>
                <p className="text-sm text-muted-foreground">
                  We'll tailor suggestions based on this preference
                </p>
              </div>
              <div className="space-y-3">
                {STYLE_PREFERENCES.map((pref) => (
                  <Card
                    key={pref}
                    className={`p-5 cursor-pointer transition-all ${
                      formData.stylePreference === pref 
                        ? 'ring-2 ring-primary bg-primary/5' 
                        : 'hover-elevate'
                    }`}
                    onClick={() => setFormData({ ...formData, stylePreference: pref })}
                    data-testid={`card-style-${pref}`}
                  >
                    <h3 className="font-semibold text-foreground mb-1">{pref}</h3>
                    <p className="text-sm text-muted-foreground">{styleDescriptions[pref]}</p>
                  </Card>
                ))}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCreateBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleCreateContinue}
                  disabled={!formData.stylePreference}
                  className="flex-1"
                  data-testid="button-style-continue"
                >
                  Continue
                </Button>
              </div>
            </div>
          )}

          {createStep === 'undertone' && (
            <div className="space-y-6 py-4">
              <div className="text-center space-y-2">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Palette className="w-8 h-8 text-primary" />
                </div>
                <h2 className="font-serif text-2xl font-semibold text-foreground">
                  What's the skin undertone?
                </h2>
                <p className="text-sm text-muted-foreground">
                  This helps us suggest colors that complement best
                </p>
              </div>
              <div className="space-y-3">
                {UNDERTONES.map((tone) => {
                  const info = undertoneDescriptions[tone];
                  return (
                    <Card
                      key={tone}
                      className={`p-5 cursor-pointer transition-all ${
                        formData.undertone === tone 
                          ? 'ring-2 ring-primary bg-primary/5' 
                          : 'hover-elevate'
                      }`}
                      onClick={() => setFormData({ ...formData, undertone: tone })}
                      data-testid={`card-undertone-${tone.toLowerCase()}`}
                    >
                      <h3 className="font-semibold text-foreground mb-1">
                        {tone === 'Unknown' ? "I don't know" : tone}
                      </h3>
                      <p className="text-sm text-muted-foreground">{info.description}</p>
                    </Card>
                  );
                })}
              </div>
              <Collapsible open={showUndertoneGuide} onOpenChange={setShowUndertoneGuide}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="ghost" 
                    className="w-full text-muted-foreground"
                    data-testid="button-undertone-guide-toggle"
                  >
                    <HelpCircle className="w-4 h-4 mr-2" />
                    How do I find the undertone?
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <Card className="p-4 mt-3 bg-muted/50">
                    <h4 className="font-semibold text-sm mb-3">Quick ways to find undertone:</h4>
                    <ul className="text-sm text-muted-foreground space-y-2">
                      <li><span className="font-medium text-foreground">Vein test:</span> Blue/purple veins = cool, green = warm, mix = neutral</li>
                      <li><span className="font-medium text-foreground">Jewelry test:</span> Silver looks better = cool, gold = warm</li>
                      <li><span className="font-medium text-foreground">Sun reaction:</span> Burns easily = cool, tans easily = warm</li>
                    </ul>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleCreateBack} className="flex-1">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
                <Button 
                  onClick={handleCreateContinue}
                  disabled={!formData.undertone || createWardrobeMutation.isPending}
                  className="flex-1"
                  data-testid="button-submit-wardrobe"
                >
                  {createWardrobeMutation.isPending ? "Creating..." : "Create Wardrobe"}
                </Button>
              </div>
            </div>
          )}

          <div className="flex justify-center gap-2">
            {(['name', 'age', 'style', 'undertone'] as CreateStep[]).map((s) => (
              <div 
                key={s} 
                className={`w-2 h-2 rounded-full transition-colors ${
                  createStep === s ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Wardrobe</DialogTitle>
            <DialogDescription>
              Update the wardrobe details and style preferences.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                data-testid="input-edit-wardrobe-name"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Age Range</Label>
                <Select
                  value={formData.ageRange}
                  onValueChange={(value) => setFormData({ ...formData, ageRange: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_RANGES.map((range) => (
                      <SelectItem key={range} value={range}>{range}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Style</Label>
                <Select
                  value={formData.stylePreference}
                  onValueChange={(value) => setFormData({ ...formData, stylePreference: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select" />
                  </SelectTrigger>
                  <SelectContent>
                    {STYLE_PREFERENCES.map((style) => (
                      <SelectItem key={style} value={style}>{style}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Skin Undertone</Label>
              <Select
                value={formData.undertone}
                onValueChange={(value) => setFormData({ ...formData, undertone: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select undertone" />
                </SelectTrigger>
                <SelectContent>
                  {UNDERTONES.map((tone) => (
                    <SelectItem key={tone} value={tone}>{tone}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => editingWardrobe && updateWardrobeMutation.mutate({ 
                id: editingWardrobe.id, 
                data: formData 
              })}
              disabled={!formData.name.trim() || updateWardrobeMutation.isPending}
            >
              {updateWardrobeMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wardrobe?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deletingWardrobe?.name}" and all {deletingWardrobe?.capsuleCount || 0} capsules inside it. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deletingWardrobe && deleteWardrobeMutation.mutate(deletingWardrobe.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteWardrobeMutation.isPending ? "Deleting..." : "Delete Wardrobe"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isMeasurementsDialogOpen} onOpenChange={setIsMeasurementsDialogOpen}>
        <DialogContent className="max-w-md max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Measurements for {measuringWardrobe?.name}</DialogTitle>
            <DialogDescription>
              Add body measurements for this wardrobe to help with sizing recommendations.
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                {Object.entries(measurements).map(([key, val]) => (
                  <div key={key} className="space-y-1">
                    <Label htmlFor={`measurement-${key}`} className="text-xs">
                      {getMeasurementLabel(key)}
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id={`measurement-${key}`}
                        type="text"
                        placeholder="--"
                        value={val.value}
                        onChange={(e) => setMeasurements({
                          ...measurements,
                          [key]: { ...val, value: e.target.value }
                        })}
                        className="flex-1"
                        data-testid={`input-measurement-${key}`}
                      />
                      {val.unit && (
                        <Select
                          value={val.unit}
                          onValueChange={(newUnit) => setMeasurements({
                            ...measurements,
                            [key]: { ...val, unit: newUnit }
                          })}
                        >
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {key === 'height' && <>
                              <SelectItem value="in">in</SelectItem>
                              <SelectItem value="cm">cm</SelectItem>
                              <SelectItem value="ft">ft</SelectItem>
                            </>}
                            {key === 'weight' && <>
                              <SelectItem value="lbs">lbs</SelectItem>
                              <SelectItem value="kg">kg</SelectItem>
                            </>}
                            {(key === 'shoeSize' || key === 'ringSize') && <>
                              <SelectItem value="US">US</SelectItem>
                              <SelectItem value="EU">EU</SelectItem>
                              <SelectItem value="UK">UK</SelectItem>
                            </>}
                            {!['height', 'weight', 'shoeSize', 'ringSize', 'topSize', 'bottomSize', 'dressSize', 'jacketSize'].includes(key) && <>
                              <SelectItem value="in">in</SelectItem>
                              <SelectItem value="cm">cm</SelectItem>
                            </>}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMeasurementsDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => measuringWardrobe && updateMeasurementsMutation.mutate({ 
                id: measuringWardrobe.id, 
                measurements 
              })}
              disabled={updateMeasurementsMutation.isPending}
              data-testid="button-save-measurements"
            >
              {updateMeasurementsMutation.isPending ? "Saving..." : "Save Measurements"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
