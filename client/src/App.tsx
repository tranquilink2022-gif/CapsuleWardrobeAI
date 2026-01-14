import { useState, useEffect } from "react";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Route, Switch, useLocation } from "wouter";
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
import InviteAccept from "@/pages/InviteAccept";
import ProfessionalInviteAccept from "@/pages/ProfessionalInviteAccept";
import ShoppingList from "@/components/ShoppingList";
import BottomNav from "@/components/BottomNav";
import CapsuleSummaryCard from "@/components/CapsuleSummaryCard";
import ThemeToggle from "@/components/ThemeToggle";
import { SponsorPlacement } from "@/components/SponsorPlacement";
import UserPreferencesOnboarding from "@/components/UserPreferencesOnboarding";
import PreviewModeBanner from "@/components/PreviewModeBanner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/use-subscription";
import type { Capsule, User } from "@shared/schema";
import heroImage from "@assets/generated_images/Minimalist_capsule_wardrobe_hero_image_db99cb79.png";

type MainTab = 'capsules' | 'vault' | 'shopping' | 'outfits' | 'profile';

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

  // Check URL hash for tab navigation
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && ['capsules', 'vault', 'shopping', 'outfits', 'profile'].includes(hash)) {
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
      // Mark as dismissed first to prevent any flicker
      setPreferencesOnboardingDismissed(true);
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
  const { getCapsuleLimits, tier, features } = useSubscription();
  const limits = getCapsuleLimits();
  
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
          
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
            <SponsorPlacement placement="capsules" variant="banner" />
            {capsules.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-4xl">👗</span>
                </div>
                <h3 className="font-semibold text-xl mb-2">No capsules yet</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Create your first capsule wardrobe
                </p>
                <Button onClick={() => navigate('/create-capsule')}>
                  Create Capsule
                </Button>
              </div>
            ) : (
              capsules.map((capsule: any) => (
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
