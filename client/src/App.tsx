import { useState } from "react";
import { QueryClientProvider, useQuery, useMutation } from "@tanstack/react-query";
import { Route, Switch, useLocation, useRoute, Redirect } from "wouter";
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
import CapsuleListView from "@/pages/Capsules";
import NotFound from "@/pages/not-found";
import ErrorBoundary from "@/components/ErrorBoundary";
import ShoppingList from "@/components/ShoppingList";
import BottomNav from "@/components/BottomNav";
import PreviewModeBanner from "@/components/PreviewModeBanner";
import UserPreferencesOnboarding from "@/components/UserPreferencesOnboarding";
import { PackagePlus, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSubscription } from "@/hooks/use-subscription";
import type { Capsule, User, Wardrobe } from "@shared/schema";

function AdminRetailerPreview() {
  const [, navigate] = useLocation();
  const [match, params] = useRoute("/admin/retailer-preview/:retailerId");
  const { user } = useAuth();

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
  const { user, isAuthenticated, isLoading } = useAuth();
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [preferencesOnboardingDismissed, setPreferencesOnboardingDismissed] = useState(false);
  const [showAddClothesPrompt, setShowAddClothesPrompt] = useState(false);

  const { data: wardrobes = [] } = useQuery<Wardrobe[]>({
    queryKey: ['/api/wardrobes'],
    enabled: isAuthenticated,
  });

  const defaultWardrobe = wardrobes.find(w => w.isDefault) || wardrobes[0];

  const { data: capsules = [] } = useQuery<Capsule[]>({
    queryKey: ['/api/capsules'],
    enabled: isAuthenticated,
  });

  const needsPreferencesOnboarding = isAuthenticated && user && !preferencesOnboardingDismissed && (!user.ageRange || !user.stylePreference || !user.undertone);

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
    if (location === '/retailer-apply') {
      return <RetailerApply />;
    }
    return <Landing />;
  }

  if (needsPreferencesOnboarding) {
    return (
      <UserPreferencesOnboarding
        onComplete={(preferences) => savePreferencesMutation.mutate(preferences)}
        isLoading={savePreferencesMutation.isPending}
      />
    );
  }

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
    <ErrorBoundary>
      <AuthenticatedApp
        user={user}
        capsules={capsules}
      />
    </ErrorBoundary>
  );
}

function AuthenticatedApp({
  user,
  capsules,
}: {
  user: User | undefined;
  capsules: Capsule[];
}) {
  const [, navigate] = useLocation();

  return (
    <div className="flex flex-col h-screen bg-background pb-16">
      <PreviewModeBanner />
      <div className="flex-1 overflow-y-auto">
        <Switch>
          <Route path="/shared/:id" component={SharedContent} />
          <Route path="/shared-with-me" component={SharedWithMe} />
          <Route path="/subscription" component={Subscription} />
          <Route path="/invite/:token" component={InviteAccept} />
          <Route path="/professional-invite/:token" component={ProfessionalInviteAccept} />
          <Route path="/retailer-apply" component={RetailerApply} />
          <Route path="/retailer-dashboard">
            {user?.isAdmin ? (
              <RetailerDashboard isPreview={true} onBack={() => navigate('/profile')} />
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
              <AdminAnalytics onBack={() => navigate('/profile')} />
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
          <Route path="/capsules">
            <CapsuleListView user={user} capsules={capsules} />
          </Route>
          <Route path="/items">
            <WardrobeItems />
          </Route>
          <Route path="/vault">
            <Vault />
          </Route>
          <Route path="/shopping">
            <ShoppingList />
          </Route>
          <Route path="/outfits">
            <Outfits />
          </Route>
          <Route path="/profile">
            {user && <Profile user={user} />}
          </Route>
          <Route path="/">
            <Redirect to="/capsules" />
          </Route>
          <Route component={NotFound} />
        </Switch>
      </div>
      <BottomNav />
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
