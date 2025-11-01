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
import ShoppingList from "@/components/ShoppingList";
import BottomNav from "@/components/BottomNav";
import CapsuleSummaryCard from "@/components/CapsuleSummaryCard";
import ThemeToggle from "@/components/ThemeToggle";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Capsule, User } from "@shared/schema";
import heroImage from "@assets/generated_images/Minimalist_capsule_wardrobe_hero_image_db99cb79.png";

type MainTab = 'capsules' | 'shopping' | 'outfits' | 'profile';

function MainApp() {
  const { user, isAuthenticated, isLoading } = useAuth() as {
    user: User | undefined;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<MainTab>('capsules');
  const [location, navigate] = useLocation();

  // Check URL hash for tab navigation
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && ['capsules', 'shopping', 'outfits', 'profile'].includes(hash)) {
      setActiveTab(hash as MainTab);
      window.location.hash = '';
    }
  }, [location]);

  // Fetch capsules
  const { data: capsules = [], refetch: refetchCapsules } = useQuery<Capsule[]>({
    queryKey: ['/api/capsules'],
    enabled: isAuthenticated,
  });

  // Auto-trigger onboarding for first-time users only
  useEffect(() => {
    if (isAuthenticated && user && !user.hasCompletedOnboarding) {
      navigate('/create-capsule');
    }
  }, [isAuthenticated, user]);

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
  return (
    <div className="flex flex-col h-screen bg-background pb-16">
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
              >
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
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
