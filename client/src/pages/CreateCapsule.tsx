import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useSubscription } from "@/hooks/use-subscription";
import OnboardingWelcome from "@/components/OnboardingWelcome";
import OnboardingQuestion from "@/components/OnboardingQuestion";
import CapsuleRecommendation from "@/components/CapsuleRecommendation";
import { CAPSULE_TEMPLATES, type CapsuleTemplate } from "@/lib/capsuleTemplates";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Sparkles, LayoutTemplate } from "lucide-react";
import type { CapsuleCategory, Wardrobe } from "@shared/schema";

type OnboardingStep = 'welcome' | 'chooseMethod' | 'templateSelect' | 'templatePreview' | 'wardrobe' | 'capsuleCategory' | 'season' | 'climate' | 'useCase' | 'style' | 'metalType' | 'recommendation';

type WardrobeWithCount = Wardrobe & { capsuleCount: number };

export default function CreateCapsule() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { getCapsuleLimits } = useSubscription();
  const limits = getCapsuleLimits();
  const canCreateJewelry = limits.jewelry !== 0;
  
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('chooseMethod');
  const [selectedTemplate, setSelectedTemplate] = useState<CapsuleTemplate | null>(null);
  const [onboardingData, setOnboardingData] = useState({
    wardrobeId: '',
    capsuleCategory: '' as CapsuleCategory | '',
    season: '',
    climate: '',
    useCase: '',
    style: '',
    metalType: '',
  });

  const { data: wardrobes = [] } = useQuery<WardrobeWithCount[]>({
    queryKey: ['/api/wardrobes'],
  });
  const [recommendation, setRecommendation] = useState<any>(null);

  // Preselect the default wardrobe when wardrobes are loaded
  useEffect(() => {
    if (wardrobes.length > 0 && !onboardingData.wardrobeId) {
      const defaultWardrobe = wardrobes.find(w => w.isDefault);
      if (defaultWardrobe) {
        setOnboardingData(prev => ({ ...prev, wardrobeId: defaultWardrobe.id }));
      }
    }
  }, [wardrobes]);

  const getRecommendationsMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/recommendations', 'POST', data);
    },
    onSuccess: (data) => {
      setRecommendation(data);
      setCurrentStep('recommendation');
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

  const createCapsuleMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/capsules', 'POST', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/capsules'] });
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Success",
        description: "Capsule created successfully!",
      });
      navigate('/');
    },
    onError: (error: any) => {
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
      
      // Check for capsule limit error
      if (error?.code === 'CAPSULE_LIMIT_REACHED') {
        toast({
          title: "Capsule Limit Reached",
          description: error.message || "Upgrade your plan to create more capsules.",
          variant: "destructive",
        });
        // Navigate to subscription page after a short delay
        setTimeout(() => navigate('/subscription'), 2000);
        return;
      }
      
      toast({
        title: "Error",
        description: error?.message || "Failed to create capsule",
        variant: "destructive",
      });
    },
  });

  const handleOnboardingSelect = (field: string, value: string) => {
    const newData = { ...onboardingData, [field]: value };
    setOnboardingData(newData);

    const isJewelry = newData.capsuleCategory === 'Jewelry';
    const clothingSteps: OnboardingStep[] = ['wardrobe', 'capsuleCategory', 'season', 'climate', 'useCase', 'style', 'recommendation'];
    const jewelrySteps: OnboardingStep[] = ['wardrobe', 'capsuleCategory', 'metalType', 'useCase', 'style', 'recommendation'];
    const stepOrder = isJewelry ? jewelrySteps : clothingSteps;
    
    const currentIndex = stepOrder.indexOf(currentStep);
    const nextStep = stepOrder[currentIndex + 1];

    if (nextStep === 'recommendation') {
      getRecommendationsMutation.mutate(newData);
    } else if (nextStep) {
      setCurrentStep(nextStep);
    }
  };

  const handleCreateCapsule = () => {
    if (!recommendation) return;

    const isJewelry = onboardingData.capsuleCategory === 'Jewelry';
    const capsuleName = isJewelry 
      ? `${onboardingData.metalType} Jewelry ${new Date().getFullYear()}`
      : `${onboardingData.season} ${new Date().getFullYear()}`;

    const capsuleData = {
      name: capsuleName,
      wardrobeId: onboardingData.wardrobeId || undefined,
      capsuleCategory: onboardingData.capsuleCategory,
      season: onboardingData.season || null,
      climate: onboardingData.climate || null,
      useCase: onboardingData.useCase,
      style: onboardingData.style,
      capsuleType: recommendation.structure.type,
      totalSlots: recommendation.structure.total,
      categorySlots: recommendation.structure.categorySlots,
    };

    createCapsuleMutation.mutate(capsuleData);
  };

  const handleSelectTemplate = (template: CapsuleTemplate) => {
    setSelectedTemplate(template);
    setOnboardingData(prev => ({
      ...prev,
      capsuleCategory: template.capsuleCategory,
      season: template.season,
      useCase: template.useCase,
    }));
    setCurrentStep('templatePreview');
  };

  const handleCreateFromTemplate = () => {
    if (!selectedTemplate) return;

    const capsuleData = {
      name: selectedTemplate.name,
      wardrobeId: onboardingData.wardrobeId || undefined,
      capsuleCategory: selectedTemplate.capsuleCategory,
      season: selectedTemplate.season,
      climate: null,
      useCase: selectedTemplate.useCase,
      style: selectedTemplate.style,
      capsuleType: selectedTemplate.name,
      totalSlots: selectedTemplate.totalSlots,
      categorySlots: selectedTemplate.categorySlots,
    };

    createCapsuleMutation.mutate(capsuleData);
  };

  if (currentStep === 'welcome') {
    return <OnboardingWelcome onStart={() => setCurrentStep('season')} />;
  }

  if (currentStep === 'chooseMethod') {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div />
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col px-6 py-8 overflow-y-auto">
          <h2 className="font-serif text-3xl font-semibold mb-2 text-foreground" data-testid="text-choose-method">
            Create a Capsule
          </h2>
          <p className="text-muted-foreground mb-8">
            Choose how you'd like to get started
          </p>

          <div className="space-y-4">
            <Card
              className="p-6 cursor-pointer hover-elevate"
              onClick={() => setCurrentStep('templateSelect')}
              data-testid="button-start-from-template"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-md bg-primary/10">
                  <LayoutTemplate className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Start from Template</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Pick a pre-built seasonal template and customize it to your needs
                  </p>
                </div>
              </div>
            </Card>

            <Card
              className="p-6 cursor-pointer hover-elevate"
              onClick={() => setCurrentStep('wardrobe')}
              data-testid="button-build-custom"
            >
              <div className="flex items-start gap-4">
                <div className="p-3 rounded-md bg-primary/10">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-foreground">Build Custom</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Answer a few questions and get a personalized capsule recommendation
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'templateSelect') {
    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentStep('chooseMethod')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div />
          <div className="w-10" />
        </div>

        <div className="flex-1 flex flex-col px-6 py-8 overflow-y-auto">
          <h2 className="font-serif text-3xl font-semibold mb-2 text-foreground" data-testid="text-template-title">
            Choose a Template
          </h2>
          <p className="text-muted-foreground mb-8">
            Select a template to pre-fill your capsule settings
          </p>

          <div className="space-y-3">
            {CAPSULE_TEMPLATES.map((template) => (
              <Card
                key={template.id}
                className="p-5 cursor-pointer hover-elevate"
                onClick={() => handleSelectTemplate(template)}
                data-testid={`card-template-${template.id}`}
              >
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-foreground">{template.name}</h3>
                    <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">{template.season}</Badge>
                    <Badge variant="outline">{template.totalSlots} items</Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === 'templatePreview' && selectedTemplate) {
    const breakdown = Object.entries(selectedTemplate.categorySlots).map(
      ([category, count]) => ({ category, count })
    );

    return (
      <div className="flex flex-col h-screen bg-background">
        <div className="flex items-center justify-between p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentStep('templateSelect')}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div />
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
          <div>
            <h2 className="font-serif text-3xl font-semibold text-foreground" data-testid="text-template-preview-title">
              {selectedTemplate.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-2">
              {selectedTemplate.description}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <Badge variant="secondary" data-testid="badge-template-season">{selectedTemplate.season}</Badge>
            <Badge variant="secondary" data-testid="badge-template-usecase">{selectedTemplate.useCase}</Badge>
            <Badge variant="outline" data-testid="badge-template-total">{selectedTemplate.totalSlots} items</Badge>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4 text-foreground" data-testid="text-template-structure">
              Capsule Structure
            </h3>
            <Card className="p-6">
              <div className="flex justify-between items-center mb-6 gap-2 flex-wrap">
                <span className="text-sm font-medium text-muted-foreground">
                  {selectedTemplate.name}
                </span>
                <span className="text-2xl font-bold text-foreground" data-testid="text-template-total-items">
                  {selectedTemplate.totalSlots} items
                </span>
              </div>
              <div className="space-y-3">
                {breakdown.map((item) => (
                  <div
                    key={item.category}
                    className="flex justify-between items-center"
                    data-testid={`row-template-category-${item.category.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <span className="text-base text-foreground">{item.category}</span>
                    <span className="text-base font-semibold text-foreground">
                      {item.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {wardrobes.length > 1 && (
            <div>
              <h3 className="text-lg font-semibold mb-3 text-foreground">Wardrobe</h3>
              <div className="space-y-2">
                {wardrobes.map((w) => (
                  <Button
                    key={w.id}
                    variant={onboardingData.wardrobeId === w.id ? "default" : "outline"}
                    className="w-full justify-start text-left h-auto py-3"
                    onClick={() => setOnboardingData(prev => ({ ...prev, wardrobeId: w.id }))}
                    data-testid={`button-wardrobe-${w.id}`}
                  >
                    <div className="flex flex-col items-start gap-1">
                      <span className="text-base font-medium">{w.name}</span>
                      <span className="text-sm font-normal opacity-80">
                        {w.capsuleCount} capsule{w.capsuleCount === 1 ? '' : 's'}
                      </span>
                    </div>
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t flex gap-3">
          <Button
            variant="outline"
            className="flex-1 h-12 rounded-xl text-base"
            onClick={() => {
              setOnboardingData(prev => ({
                ...prev,
                capsuleCategory: selectedTemplate.capsuleCategory,
                season: selectedTemplate.season,
                useCase: selectedTemplate.useCase,
              }));
              setCurrentStep('wardrobe');
            }}
            data-testid="button-customize-template"
          >
            Customize
          </Button>
          <Button
            className="flex-1 h-12 rounded-xl text-base font-semibold"
            onClick={handleCreateFromTemplate}
            disabled={createCapsuleMutation.isPending}
            data-testid="button-create-from-template"
          >
            {createCapsuleMutation.isPending ? "Creating..." : "Create Capsule"}
          </Button>
        </div>
      </div>
    );
  }

  if (currentStep === 'recommendation' && recommendation) {
    return (
      <CapsuleRecommendation
        recommendation={recommendation}
        onCreateCapsule={handleCreateCapsule}
        capsuleCategory={onboardingData.capsuleCategory as CapsuleCategory}
      />
    );
  }

  const wardrobeOptions = wardrobes.map(w => ({
    value: w.id,
    description: `${w.capsuleCount} capsule${w.capsuleCount === 1 ? '' : 's'}${w.ageRange ? ` • ${w.ageRange}` : ''}${w.stylePreference ? ` • ${w.stylePreference}` : ''}`,
    label: w.name,
  }));

  const questions = {
    wardrobe: {
      question: 'Which wardrobe is this capsule for?',
      options: wardrobeOptions.length > 0 ? wardrobeOptions : [{ value: '', label: 'My Wardrobe', description: 'Default wardrobe' }],
      field: 'wardrobeId' as const,
    },
    capsuleCategory: {
      question: 'What type of capsule do you want to create?',
      options: canCreateJewelry 
        ? ['Clothing', 'Jewelry'] 
        : [
            { value: 'Clothing', label: 'Clothing', description: 'Build a clothing capsule' },
            { value: 'Jewelry', label: 'Jewelry', description: 'Upgrade to Premium for jewelry capsules', disabled: true },
          ],
      field: 'capsuleCategory' as const,
    },
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
    metalType: {
      question: 'What metal type do you prefer?',
      options: [
        { value: 'Silver', description: 'Classic silver tones - cool and versatile' },
        { value: 'Gold', description: 'Warm yellow gold - timeless and elegant' },
        { value: 'Rose Gold', description: 'Romantic pink-toned gold - modern and trendy' },
        { value: 'Mixed Metals', description: 'Combination of different metals - eclectic and personal' },
      ],
      field: 'metalType' as const,
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

  const currentQuestion = questions[currentStep as keyof typeof questions];
  
  const isJewelry = onboardingData.capsuleCategory === 'Jewelry';
  const clothingSteps: OnboardingStep[] = ['wardrobe', 'capsuleCategory', 'season', 'climate', 'useCase', 'style', 'recommendation'];
  const jewelrySteps: OnboardingStep[] = ['wardrobe', 'capsuleCategory', 'metalType', 'useCase', 'style', 'recommendation'];
  const stepOrder = isJewelry ? jewelrySteps : clothingSteps;
  const currentStepIndex = stepOrder.indexOf(currentStep);

  return (
    <OnboardingQuestion
      question={currentQuestion.question}
      options={currentQuestion.options}
      selectedOption={onboardingData[currentQuestion.field]}
      onSelect={(value) => handleOnboardingSelect(currentQuestion.field, value)}
      onBack={() => {
        if (currentStepIndex > 0) {
          setCurrentStep(stepOrder[currentStepIndex - 1]);
        } else {
          setCurrentStep('chooseMethod');
        }
      }}
      step={currentStepIndex}
      totalSteps={stepOrder.length - 1}
    />
  );
}
