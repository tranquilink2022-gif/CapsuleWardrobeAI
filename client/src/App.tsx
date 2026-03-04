import { useState, useEffect } from "react";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Route, Switch, useLocation, useRoute } from "wouter";
import { queryClient, apiRequest } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { isUnauthorizedError } from "@/lib/authUtils";
import Landing from "@/pages/Landing";
import CapsuleDetail from "@/pages/CapsuleDetail";
import ShoppingListDetail from "@/pages/ShoppingListDetail";
import CreateCapsule from "@/pages/CreateCapsule";
import Profile from "@/pages/Profile";
import Outfits from "@/pages/Outfits";
import Vault from "@/pages/Vault";
import SharedContent from "@/pages/SharedContent";
import SharedWithMe from "@/pages/SharedWithMe";
import Subscription from "@/pages/Subscription";
import AdminAnalytics from "@/pages/AdminAnalytics";
import AdminVault from "@/pages/AdminVault";
import AdminRetailers from "@/pages/AdminRetailers";
import RetailerDashboard from "@/pages/RetailerDashboard";
import RetailerApply from "@/pages/RetailerApply";
import WardrobeItems from "@/pages/WardrobeItems";
import InviteAccept from "@/pages/InviteAccept";
import ProfessionalInviteAccept from "@/pages/ProfessionalInviteAccept";
import BulkAddItems from "@/pages/BulkAddItems";
import NotFound from "@/pages/not-found";
import ShoppingList from "@/components/ShoppingList";
import BottomNav from "@/components/BottomNav";
import CapsuleSummaryCard from "@/components/CapsuleSummaryCard";
import ThemeToggle from "@/components/ThemeToggle";
import { SponsorPlacement } from "@/components/SponsorPlacement";
import UserPreferencesOnboarding from "@/components/UserPreferencesOnboarding";
import PreviewModeBanner from "@/components/PreviewModeBanner";
import { Plus, PackagePlus, ArrowRight, Search, X, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSubscription } from "@/hooks/use-subscription";
import type { Capsule, Item, User, Wardrobe } from "@shared/schema";
import heroImage from "@assets/generated_images/Minimalist_capsule_wardrobe_hero_image_db99cb79.png";

type MainTab = 'capsules' | 'items' | 'vault' | 'shopping' | 'outfits' | 'profile';

function AdminRetailerPreview() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/admin/retailer-preview/:retailerId");
  const { user } = useAuth() as { user: User | undefined };
  
  if (!user?.isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">This page is only available to administrators.</p>
        <Button onClick={() => navigate('/')}>Go Back</Button>
      </div>
    );
  }
  
  return (
    <RetailerDashboard 
      isPreview={true} 
      previewRetailerId={params?.retailerId}
      onBack={() => navigate('/admin/retailers')} 
    />
  );
}

function MainApp() {
  const { user, isAuthenticated, isLoading } = useAuth() as {
    user: User | undefined;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<MainTab>('capsules');
  const [location, navigate] = useLocation();
  const [preferencesOnboardingDismissed, setPreferencesOnboardingDismissed] = useState(false);
  const [showAddClothesPrompt, setShowAddClothesPrompt] = useState(false);

  const { data: wardrobes = [] } = useQuery<Wardrobe[]>({
    queryKey: ['/api/wardrobes'],
    enabled: isAuthenticated,
  });

  const defaultWardrobe = wardrobes.find(w => w.isDefault) || wardrobes[0];

  // Check URL hash for tab navigation
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && ['capsules', 'items', 'vault', 'shopping', 'outfits', 'profile'].includes(hash)) {
      setActiveTab(hash as MainTab);
      window.location.hash = '';
    }
  }, [location]);

  // Fetch capsules
  const { data: capsules = [], refetch: refetchCapsules } = useQuery<Capsule[]>({
    queryKey: ['/api/capsules'],
    enabled: isAuthenticated,
  });

  // Check if user needs to set preferences (new user without ageRange/stylePreference/undertone)
  // Only show if not yet dismissed in this session
  const needsPreferencesOnboarding = isAuthenticated && user && !preferencesOnboardingDismissed && (!user.ageRange || !user.stylePreference || !user.undertone);

  // Save user preferences mutation
  const savePreferencesMutation = useMutation({
    mutationFn: async (preferences: { ageRange: string; stylePreference: string; undertone: string }) => {
      return await apiRequest('/api/auth/user', 'PATCH', preferences);
    },
    onSuccess: () => {
      setPreferencesOnboardingDismissed(true);
      setShowAddClothesPrompt(true);
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Welcome to Closana!",
        description: "Your preferences have been saved.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Session expired",
          description: "Please sign in again.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to save preferences. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Handle public routes that don't require authentication
    if (location === '/retailer-apply') {
      return <RetailerApply />;
    }
    return <Landing />;
  }

  // Show preferences onboarding for new users
  if (needsPreferencesOnboarding) {
    return (
      <UserPreferencesOnboarding
        onComplete={(preferences) => savePreferencesMutation.mutate(preferences)}
        isLoading={savePreferencesMutation.isPending}
      />
    );
  }

  // Post-preferences: offer to add clothes
  if (showAddClothesPrompt && defaultWardrobe) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center bg-background">
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <PackagePlus className="w-10 h-10 text-primary" />
        </div>
        <h2 className="font-serif text-2xl font-semibold mb-3" data-testid="text-add-clothes-title">
          Let's add your clothes!
        </h2>
        <p className="text-muted-foreground text-sm mb-8 max-w-sm">
          Adding your wardrobe items helps us organize them into capsules and generate smarter outfit suggestions.
        </p>
        <div className="space-y-3 w-full max-w-xs">
          <Button
            className="w-full"
            onClick={() => {
              setShowAddClothesPrompt(false);
              navigate(`/wardrobes/${defaultWardrobe.id}/bulk-add`);
            }}
            data-testid="button-add-my-clothes"
          >
            <PackagePlus className="w-4 h-4 mr-2" />
            Add My Clothes
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            onClick={() => setShowAddClothesPrompt(false)}
            data-testid="button-skip-add-clothes"
          >
            Skip for Now
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <AuthenticatedApp
      user={user}
      capsules={capsules}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );
}

function AuthenticatedApp({
  user,
  capsules,
  activeTab,
  setActiveTab,
}: any) {
  const [location, navigate] = useLocation();

  // Main app with routing
  return (
    <Switch>
      <Route path="/shared/:id" component={SharedContent} />
      <Route path="/shared-with-me" component={SharedWithMe} />
      <Route path="/subscription" component={Subscription} />
      <Route path="/invite/:token" component={InviteAccept} />
      <Route path="/professional-invite/:token" component={ProfessionalInviteAccept} />
      <Route path="/retailer-apply" component={RetailerApply} />
      <Route path="/retailer-dashboard">
        {user?.isAdmin ? (
          <RetailerDashboard isPreview={true} onBack={() => navigate('/#profile')} />
        ) : (
          <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">This page is only available to administrators.</p>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </div>
        )}
      </Route>
      <Route path="/admin/analytics">
        {user?.isAdmin ? (
          <AdminAnalytics onBack={() => navigate('/#profile')} />
        ) : (
          <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">This page is only available to administrators.</p>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </div>
        )}
      </Route>
      <Route path="/admin/vault">
        {user?.isAdmin ? (
          <AdminVault />
        ) : (
          <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">This page is only available to administrators.</p>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </div>
        )}
      </Route>
      <Route path="/admin/retailers">
        {user?.isAdmin ? (
          <AdminRetailers />
        ) : (
          <div className="flex flex-col items-center justify-center h-screen p-6 text-center">
            <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground mb-4">This page is only available to administrators.</p>
            <Button onClick={() => navigate('/')}>Go Back</Button>
          </div>
        )}
      </Route>
      <Route path="/admin/retailer-preview/:retailerId" component={AdminRetailerPreview} />
      <Route path="/wardrobes/:wardrobeId/bulk-add" component={BulkAddItems} />
      <Route path="/create-capsule" component={CreateCapsule} />
      <Route path="/capsule/:id" component={CapsuleDetail} />
      <Route path="/shopping-list/:id" component={ShoppingListDetail} />
      <Route path="/">
        <MainView
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          user={user}
          capsules={capsules}
          navigate={navigate}
        />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function MainView({
  activeTab,
  setActiveTab,
  user,
  capsules,
  navigate,
}: {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  user: User | undefined;
  capsules: Capsule[];
  navigate: (path: string) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('All');
  const [seasonFilter, setSeasonFilter] = useState<string | null>(null);

  const { getCapsuleLimits, tier, features } = useSubscription();
  const limits = getCapsuleLimits();

  const { data: recentItems = [] } = useQuery<Item[]>({
    queryKey: ['/api/items/recent', { limit: 5 }],
    queryFn: async () => {
      const res = await fetch('/api/items/recent?limit=5', { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to fetch recent items');
      return res.json();
    },
  });
  
  // Count capsules by type (total across all wardrobes)
  const clothingCount = capsules.filter(c => (c as any).capsuleCategory !== 'Jewelry').length;
  const jewelryCount = capsules.filter(c => (c as any).capsuleCategory === 'Jewelry').length;
  
  // For single-wardrobe tiers (Free/Premium), show per-wardrobe limits
  // For multi-wardrobe tiers (Family/Professional), show total capacity
  const isSingleWardrobe = features.maxWardrobes === 1;
  const maxWardrobes = features.maxWardrobes === -1 ? 'Unlimited' : features.maxWardrobes;
  
  // Calculate total capacity for multi-wardrobe tiers
  const totalClothingCapacity = limits.clothing === -1 ? -1 : (
    isSingleWardrobe ? limits.clothing : limits.clothing * (features.maxWardrobes === -1 ? 1 : features.maxWardrobes)
  );
  const totalJewelryCapacity = limits.jewelry === -1 ? -1 : (
    isSingleWardrobe ? limits.jewelry : limits.jewelry * (features.maxWardrobes === -1 ? 1 : features.maxWardrobes)
  );
  
  const clothingLimitDisplay = totalClothingCapacity === -1 ? 'Unlimited' : `${clothingCount}/${totalClothingCapacity}`;
  const jewelryLimitDisplay = totalJewelryCapacity === -1 ? 'Unlimited' : `${jewelryCount}/${totalJewelryCapacity}`;
  
  // For multi-wardrobe tiers, never block creation from UI - let backend handle per-wardrobe enforcement
  // For single-wardrobe tiers, check if at capacity
  const canCreateClothing = !isSingleWardrobe || limits.clothing === -1 || clothingCount < limits.clothing;
  const canCreateJewelry = !isSingleWardrobe || limits.jewelry === -1 || jewelryCount < limits.jewelry;
  const canCreateCapsule = canCreateClothing || canCreateJewelry;

  const hasActiveFilters = searchQuery.trim() !== '' || typeFilter !== 'All' || seasonFilter !== null;
  const showSearchBar = capsules.length >= 3;

  const filteredCapsules = capsules.filter((capsule: any) => {
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
  
  return (
    <div className="flex flex-col h-screen bg-background pb-16">
      <PreviewModeBanner />
      {activeTab === 'capsules' && (
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
          
          {/* Capsule Usage Indicator */}
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
                    onClick={() => setTypeFilter(type)}
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
                    onClick={() => setSeasonFilter(seasonFilter === season ? null : season)}
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
              filteredCapsules.map((capsule: any) => (
                <CapsuleSummaryCard
                  key={capsule.id}
                  capsule={{
                    id: capsule.id,
                    name: capsule.name,
                    itemCount: capsule.itemCount || 0,
                    lastUpdated: new Date(capsule.updatedAt).toLocaleDateString(),
                    previewImages: [],
                  }}
                  onClick={() => navigate(`/capsule/${capsule.id}`)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'items' && (
        <WardrobeItems />
      )}

      {activeTab === 'vault' && (
        <Vault />
      )}

      {activeTab === 'shopping' && (
        <ShoppingList />
      )}

      {activeTab === 'outfits' && (
        <Outfits />
      )}

      {activeTab === 'profile' && user && (
        <Profile user={user} />
      )}

      <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as MainTab)} />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MainApp />
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
