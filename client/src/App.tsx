import { useState } from "react";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import OnboardingWelcome from "@/components/OnboardingWelcome";
import OnboardingQuestion from "@/components/OnboardingQuestion";
import CapsuleRecommendation from "@/components/CapsuleRecommendation";
import CapsuleBuilder from "@/components/CapsuleBuilder";
import ShoppingList from "@/components/ShoppingList";
import OutfitGenerator from "@/components/OutfitGenerator";
import BottomNav from "@/components/BottomNav";
import ItemDetailModal from "@/components/ItemDetailModal";
import CapsuleSummaryCard from "@/components/CapsuleSummaryCard";
import ThemeToggle from "@/components/ThemeToggle";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

type OnboardingStep = 'welcome' | 'season' | 'climate' | 'useCase' | 'style' | 'recommendation' | 'complete';
type MainTab = 'capsules' | 'shopping' | 'outfits' | 'profile';

function App() {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
  const [activeTab, setActiveTab] = useState<MainTab>('capsules');
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [onboardingData, setOnboardingData] = useState({
    season: '',
    climate: '',
    useCase: '',
    style: '',
  });

  const [mockCapsules] = useState([
    {
      id: '1',
      name: 'Spring 2025',
      itemCount: 12,
      lastUpdated: 'today',
      previewImages: [],
    },
  ]);

  const [mockShoppingItems] = useState([
    {
      id: '1',
      name: 'White T-Shirt',
      productLink: 'https://example.com/product1',
      capsuleName: 'Spring 2025',
    },
    {
      id: '2',
      name: 'Denim Jacket',
      productLink: 'https://example.com/product2',
      capsuleName: 'Spring 2025',
    },
  ]);

  const [mockCategories] = useState([
    {
      name: 'Tops',
      maxItems: 10,
      items: [
        { id: '1', name: 'White T-Shirt', isOnShoppingList: false },
        { id: '2', name: 'Blue Shirt', isOnShoppingList: true },
        null,
        null,
        null,
        null,
      ],
    },
    {
      name: 'Bottoms',
      maxItems: 6,
      items: [
        { id: '3', name: 'Jeans', isOnShoppingList: false },
        null,
        null,
        null,
      ],
    },
    {
      name: 'Outerwear',
      maxItems: 4,
      items: [null, null, null, null],
    },
  ]);

  const mockRecommendation = {
    fabrics: ['Cotton', 'Linen', 'Denim', 'Silk'],
    colors: ['Navy', 'White', 'Beige', 'Olive', 'Black'],
    structure: {
      type: 'Seasonal Capsule',
      total: 30,
      breakdown: [
        { category: 'Tops', count: 10 },
        { category: 'Bottoms', count: 6 },
        { category: 'Outerwear', count: 4 },
        { category: 'Shoes', count: 4 },
        { category: 'Accessories', count: 4 },
        { category: 'Miscellaneous', count: 2 },
      ],
    },
  };

  const handleOnboardingSelect = (field: keyof typeof onboardingData, value: string) => {
    setOnboardingData(prev => ({ ...prev, [field]: value }));
    
    const stepOrder: OnboardingStep[] = ['welcome', 'season', 'climate', 'useCase', 'style', 'recommendation'];
    const currentIndex = stepOrder.indexOf(onboardingStep);
    if (currentIndex < stepOrder.length - 1) {
      setOnboardingStep(stepOrder[currentIndex + 1]);
    }
  };

  const handleGenerateOutfits = async () => {
    await new Promise(resolve => setTimeout(resolve, 2000));
    return [
      {
        id: '1',
        name: 'Casual Weekend',
        occasion: 'Perfect for brunch or shopping',
        items: ['White T-Shirt', 'Blue Jeans', 'Sneakers', 'Denim Jacket'],
      },
      {
        id: '2',
        name: 'Smart Casual',
        occasion: 'Great for dinner or a date',
        items: ['Navy Blazer', 'White Shirt', 'Chinos', 'Loafers'],
      },
    ];
  };

  if (onboardingStep !== 'complete') {
    if (onboardingStep === 'welcome') {
      return (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <OnboardingWelcome onStart={() => setOnboardingStep('season')} />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
      );
    }

    if (onboardingStep === 'recommendation') {
      return (
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <CapsuleRecommendation
              recommendation={mockRecommendation}
              onCreateCapsule={() => setOnboardingStep('complete')}
            />
            <Toaster />
          </TooltipProvider>
        </QueryClientProvider>
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
        options: ['Tropical', 'Temperate', 'Cold', 'Arid'],
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
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <OnboardingQuestion
            question={currentQuestion.question}
            options={currentQuestion.options}
            selectedOption={onboardingData[currentQuestion.field]}
            onSelect={(value) => handleOnboardingSelect(currentQuestion.field, value)}
            onBack={() => setOnboardingStep(stepOrder[currentStepIndex - 1])}
            step={currentStepIndex}
            totalSteps={stepOrder.length - 2}
          />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="flex flex-col h-screen bg-background pb-16">
          {activeTab === 'capsules' && (
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between p-4 border-b">
                <h1 className="font-serif text-3xl font-semibold text-foreground">
                  My Capsules
                </h1>
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <Button size="icon" data-testid="button-add-capsule">
                    <Plus className="w-5 h-5" />
                  </Button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                {mockCapsules.map((capsule) => (
                  <CapsuleSummaryCard
                    key={capsule.id}
                    capsule={capsule}
                    onClick={() => console.log('Open capsule', capsule.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {activeTab === 'shopping' && (
            <ShoppingList
              items={mockShoppingItems}
              onRemove={(id) => console.log('Remove item', id)}
              onOpenLink={(link) => window.open(link, '_blank')}
            />
          )}

          {activeTab === 'outfits' && (
            <OutfitGenerator onGenerate={handleGenerateOutfits} />
          )}

          {activeTab === 'profile' && (
            <div className="flex flex-col h-full items-center justify-center p-6">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <span className="text-4xl">👤</span>
              </div>
              <h2 className="font-serif text-2xl font-semibold mb-2">Profile</h2>
              <p className="text-muted-foreground text-sm">
                Sign in to save your wardrobes
              </p>
            </div>
          )}

          <BottomNav activeTab={activeTab} onTabChange={(tab) => setActiveTab(tab as MainTab)} />
        </div>

        {selectedItem && (
          <ItemDetailModal
            item={selectedItem}
            onClose={() => setSelectedItem(null)}
            onSave={(data) => {
              console.log('Save item', data);
              setSelectedItem(null);
            }}
            onDelete={() => {
              console.log('Delete item');
              setSelectedItem(null);
            }}
          />
        )}

        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
