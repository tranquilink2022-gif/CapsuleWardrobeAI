import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { isUnauthorizedError } from "@/lib/authUtils";
import OnboardingWelcome from "@/components/OnboardingWelcome";
import OnboardingQuestion from "@/components/OnboardingQuestion";
import CapsuleRecommendation from "@/components/CapsuleRecommendation";

type OnboardingStep = 'welcome' | 'season' | 'climate' | 'useCase' | 'style' | 'recommendation';

export default function CreateCapsule() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('season');
  const [onboardingData, setOnboardingData] = useState({
    season: '',
    climate: '',
    useCase: '',
    style: '',
  });
  const [recommendation, setRecommendation] = useState<any>(null);

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
      queryClient.invalidateQueries({ queryKey: ['/api/capsules'] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: "Success",
        description: "Capsule created successfully!",
      });
      navigate('/');
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

  const handleOnboardingSelect = (field: string, value: string) => {
    const newData = { ...onboardingData, [field]: value };
    setOnboardingData(newData);

    const stepOrder: OnboardingStep[] = ['season', 'climate', 'useCase', 'style', 'recommendation'];
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

  if (currentStep === 'welcome') {
    return <OnboardingWelcome onStart={() => setCurrentStep('season')} />;
  }

  if (currentStep === 'recommendation' && recommendation) {
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

  const currentQuestion = questions[currentStep as keyof typeof questions];
  const stepOrder: OnboardingStep[] = ['season', 'climate', 'useCase', 'style', 'recommendation'];
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
          navigate('/');
        }
      }}
      step={currentStepIndex}
      totalSteps={stepOrder.length - 1}
    />
  );
}
