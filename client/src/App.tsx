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
import OnboardingWelcome from "@/components/OnboardingWelcome";
import OnboardingQuestion from "@/components/OnboardingQuestion";
import CapsuleRecommendation from "@/components/CapsuleRecommendation";
import ShoppingList from "@/components/ShoppingList";
import OutfitGenerator from "@/components/OutfitGenerator";
import BottomNav from "@/components/BottomNav";
import CapsuleSummaryCard from "@/components/CapsuleSummaryCard";
import ThemeToggle from "@/components/ThemeToggle";
import { Plus, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Capsule, User } from "@shared/schema";
import heroImage from "@assets/generated_images/Minimalist_capsule_wardrobe_hero_image_db99cb79.png";

interface OutfitSuggestion {
  id: string;
  name: string;
  occasion: string;
  items: string[];
}

type OnboardingStep = 'welcome' | 'season' | 'climate' | 'useCase' | 'style' | 'recommendation' | 'complete';
type MainTab = 'capsules' | 'shopping' | 'outfits' | 'profile';

function MainApp() {
  const { user, isAuthenticated, isLoading } = useAuth() as {
    user: User | undefined;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
  const { toast } = useToast();
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('complete');
  const [activeTab, setActiveTab] = useState<MainTab>('capsules');
  const [onboardingData, setOnboardingData] = useState({
    season: '',
    climate: '',
    useCase: '',
    style: '',
  });
  const [recommendation, setRecommendation] = useState<any>(null);

  // Fetch capsules
  const { data: capsules = [], refetch: refetchCapsules } = useQuery<Capsule[]>({
    queryKey: ['/api/capsules'],
    enabled: isAuthenticated,
  });

  // Create capsule mutation
  const createCapsuleMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/capsules', 'POST', data);
    },
    onSuccess: () => {
      refetchCapsules();
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setOnboardingStep('complete');
      toast({
        title: "Success",
        description: "Capsule created successfully!",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create capsule",
        variant: "destructive",
      });
    },
  });

  // Get recommendations mutation
  const getRecommendationsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/recommendations', 'POST', data);
    },
    onSuccess: (data) => {
      setRecommendation(data);
      setOnboardingStep('recommendation');
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to get recommendations",
        variant: "destructive",
      });
    },
  });

  // Generate outfits
  const generateOutfits = async (): Promise<OutfitSuggestion[]> => {
    if (capsules.length === 0) {
      toast({
        title: "No capsules",
        description: "Create a capsule first to generate outfits",
      });
      return [];
    }

    const capsuleId = capsules[0].id;
    try {
      const result = await apiRequest('/api/outfits/generate', 'POST', { capsuleId });
      return result as OutfitSuggestion[];
    } catch (error) {
      if (error instanceof Error && isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
      }
      return [];
    }
  };

  const handleOnboardingSelect = (field: keyof typeof onboardingData, value: string) => {
    const newData = { ...onboardingData, [field]: value };
    setOnboardingData(newData);
    
    const stepOrder: OnboardingStep[] = ['welcome', 'season', 'climate', 'useCase', 'style', 'recommendation'];
    const currentIndex = stepOrder.indexOf(onboardingStep);
    
    // If we've completed the style step, get recommendations
    if (field === 'style') {
      getRecommendationsMutation.mutate(newData);
    } else if (currentIndex < stepOrder.length - 1) {
      setOnboardingStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleCreateCapsule = () => {
    if (!recommendation) return;

    const capsuleData = {
      name: `${onboardingData.season} ${new Date().getFullYear()}`,
      season: onboardingData.season,
      climate: onboardingData.climate,
      useCase: onboardingData.useCase,
      style: onboardingData.style,
      capsuleType: recommendation.structure.type,
      totalSlots: recommendation.structure.total,
    };

    createCapsuleMutation.mutate(capsuleData);
  };

  // Auto-trigger onboarding for first-time users only
  useEffect(() => {
    if (isAuthenticated && user && !user.hasCompletedOnboarding && onboardingStep === 'complete') {
      setOnboardingStep('welcome');
    }
  }, [isAuthenticated, user, onboardingStep]);

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
      onboardingStep={onboardingStep}
      setOnboardingStep={setOnboardingStep}
      onboardingData={onboardingData}
      setOnboardingData={setOnboardingData}
      recommendation={recommendation}
      handleOnboardingSelect={handleOnboardingSelect}
      handleCreateCapsule={handleCreateCapsule}
      refetchCapsules={refetchCapsules}
      generateOutfits={generateOutfits}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
    />
  );
}

function AuthenticatedApp({
  user,
  capsules,
  onboardingStep,
  setOnboardingStep,
  onboardingData,
  setOnboardingData,
  recommendation,
  handleOnboardingSelect,
  handleCreateCapsule,
  refetchCapsules,
  generateOutfits,
  activeTab,
  setActiveTab,
}: any) {
  const [location, navigate] = useLocation();

  // Render onboarding overlay
  const renderOnboardingOverlay = () => {
    if (onboardingStep === 'complete') return null;

    if (onboardingStep === 'welcome') {
      return <OnboardingWelcome onStart={() => setOnboardingStep('season')} />;
    }

    if (onboardingStep === 'recommendation' && recommendation) {
      return (
        <CapsuleRecommendation
          recommendation={recommendation}
          onCreateCapsule={handleCreateCapsule}
        />
      );
    }

    const questions = {
      season: {
        question: 'What season are you planning for?',
        options: ['Spring', 'Summer', 'Fall', 'Winter'],
        field: 'season' as const,
      },
      climate: {
        question: 'What is your climate?',
        options: [
          { value: 'Tropical', description: 'Warm & humid year-round. Temperatures above 64°F (18°C)' },
          { value: 'Temperate', description: 'Moderate climate with distinct seasons. 32-86°F (0-30°C)' },
          { value: 'Cold', description: 'Cool to cold with long winters. Often below 32°F (0°C)' },
          { value: 'Arid', description: 'Dry climate with low rainfall. Hot days, cool nights' },
        ],
        field: 'climate' as const,
      },
      useCase: {
        question: 'What is the primary use case?',
        options: ['Everyday', 'Travel', 'Work', 'Special Events'],
        field: 'useCase' as const,
      },
      style: {
        question: 'What is your preferred style?',
        options: ['Casual', 'Business', 'Formal', 'Athletic'],
        field: 'style' as const,
      },
    };

    const currentQuestion = questions[onboardingStep as keyof typeof questions];
    const stepOrder: OnboardingStep[] = ['welcome', 'season', 'climate', 'useCase', 'style', 'recommendation'];
    const currentStepIndex = stepOrder.indexOf(onboardingStep);

    return (
      <OnboardingQuestion
        question={currentQuestion.question}
        options={currentQuestion.options}
        selectedOption={onboardingData[currentQuestion.field]}
        onSelect={(value) => handleOnboardingSelect(currentQuestion.field, value)}
        onBack={() => setOnboardingStep(stepOrder[currentStepIndex - 1])}
        step={currentStepIndex}
        totalSteps={stepOrder.length - 2}
      />
    );
  };

  // Main app with routing
  return (
    <>
      <Switch>
        <Route path="/capsule/:id" component={CapsuleDetail} />
        <Route path="/shopping-list/:id" component={ShoppingListDetail} />
        <Route path="/">
          <MainView
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            user={user}
            capsules={capsules}
            generateOutfits={generateOutfits}
            setOnboardingStep={setOnboardingStep}
            refetchCapsules={refetchCapsules}
            navigate={navigate}
          />
        </Route>
      </Switch>
      {renderOnboardingOverlay()}
    </>
  );
}

function MainView({
  activeTab,
  setActiveTab,
  user,
  capsules,
  generateOutfits,
  setOnboardingStep,
  refetchCapsules,
  navigate,
}: {
  activeTab: MainTab;
  setActiveTab: (tab: MainTab) => void;
  user: User | undefined;
  capsules: Capsule[];
  generateOutfits: () => Promise<OutfitSuggestion[]>;
  setOnboardingStep: (step: OnboardingStep) => void;
  refetchCapsules: () => void;
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
                onClick={() => setOnboardingStep('season')}
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
                <Button onClick={() => setOnboardingStep('season')}>
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
        <OutfitGenerator onGenerate={generateOutfits} />
      )}

      {activeTab === 'profile' && (
        <div className="flex flex-col h-full">
          <div className="p-6 border-b">
            <h1 className="font-serif text-3xl font-semibold text-foreground">
              Profile
            </h1>
          </div>
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4 overflow-hidden">
              {user?.profileImageUrl ? (
                <img src={user.profileImageUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="text-4xl">👤</span>
              )}
            </div>
            <h2 className="font-serif text-2xl font-semibold mb-2">
              {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.email || 'User'}
            </h2>
            {user?.email && (
              <p className="text-muted-foreground text-sm mb-6">{user.email}</p>
            )}
            <Button
              variant="outline"
              onClick={() => window.location.href = '/api/logout'}
              className="mt-4"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
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
