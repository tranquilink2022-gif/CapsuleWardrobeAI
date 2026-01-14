import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { TIER_LIMITS, type SubscriptionTier } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";

type TierFeatures = typeof TIER_LIMITS[SubscriptionTier];

interface FamilyInfo {
  isFamilyMember: boolean;
  role: 'manager' | 'member';
  familyAccountId: string;
  familyName: string;
  isPrimaryManager: boolean;
}

interface ProfessionalInfo {
  isClient: boolean;
  clientId: string;
  professionalAccountId: string;
  businessName: string;
}

interface SubscriptionStatus {
  tier: SubscriptionTier;
  actualTier: SubscriptionTier;
  previewTier: SubscriptionTier | null;
  isPreviewing: boolean;
  adminFamilyViewMode: 'manager' | 'member' | null;
  adminProfessionalViewMode: 'shopper' | 'client' | null;
  status: string | null;
  trialEndsAt: string | null;
  features: TierFeatures;
  family: FamilyInfo | null;
  professional: ProfessionalInfo | null;
}

export function useSubscription() {
  const queryClient = useQueryClient();
  
  const { data, isLoading, error, refetch } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
  });

  const tier = (data?.tier || 'free') as SubscriptionTier;
  const actualTier = (data?.actualTier || 'free') as SubscriptionTier;
  const previewTier = data?.previewTier || null;
  const isPreviewing = data?.isPreviewing || false;
  const features = data?.features || TIER_LIMITS.free;

  const setPreviewTierMutation = useMutation({
    mutationFn: async (tier: SubscriptionTier | null) => {
      if (tier === null) {
        await apiRequest('/api/admin/preview-tier', 'DELETE');
      } else {
        await apiRequest('/api/admin/preview-tier', 'POST', { tier });
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/subscription/status'] });
    },
  });

  const setActualTierMutation = useMutation({
    mutationFn: async (tier: SubscriptionTier) => {
      await apiRequest('/api/admin/set-tier', 'POST', { tier });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/subscription/status'] });
    },
  });

  const setFamilyViewModeMutation = useMutation({
    mutationFn: async (mode: 'manager' | 'member' | null) => {
      if (mode === null) {
        await apiRequest('/api/admin/family-view-mode', 'DELETE');
      } else {
        await apiRequest('/api/admin/family-view-mode', 'POST', { mode });
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.refetchQueries({ queryKey: ['/api/family/status'] });
    },
  });

  const setProfessionalViewModeMutation = useMutation({
    mutationFn: async (mode: 'shopper' | 'client' | null) => {
      if (mode === null) {
        await apiRequest('/api/admin/professional-view-mode', 'DELETE');
      } else {
        await apiRequest('/api/admin/professional-view-mode', 'POST', { mode });
      }
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/subscription/status'] });
      queryClient.refetchQueries({ queryKey: ['/api/professional/status'] });
    },
  });

  const canAccessFeature = (feature: keyof TierFeatures): boolean => {
    if (feature === 'maxWardrobes') {
      return true;
    }
    return Boolean(features[feature]);
  };

  const isWithinWardrobeLimit = (currentCount: number): boolean => {
    const maxWardrobes = features.maxWardrobes;
    if (maxWardrobes === -1) return true;
    return currentCount < maxWardrobes;
  };

  const isWithinCapsuleLimit = (currentCount: number, isJewelry: boolean): boolean => {
    const maxCapsules = isJewelry 
      ? features.maxJewelryCapsulesPerWardrobe 
      : features.maxClothingCapsulesPerWardrobe;
    if (maxCapsules === -1) return true;
    return currentCount < maxCapsules;
  };

  const getCapsuleLimits = () => ({
    clothing: features.maxClothingCapsulesPerWardrobe,
    jewelry: features.maxJewelryCapsulesPerWardrobe,
  });

  const isTrialActive = (): boolean => {
    if (!data?.trialEndsAt) return false;
    return new Date(data.trialEndsAt) > new Date();
  };

  const getTrialDaysRemaining = (): number | null => {
    if (!data?.trialEndsAt) return null;
    const endDate = new Date(data.trialEndsAt);
    const now = new Date();
    if (endDate <= now) return 0;
    return Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  };

  const setPreviewTier = (tier: SubscriptionTier | null) => {
    setPreviewTierMutation.mutate(tier);
  };

  const exitPreview = () => {
    setPreviewTierMutation.mutate(null);
  };

  const setActualTier = (tier: SubscriptionTier) => {
    setActualTierMutation.mutate(tier);
  };

  const setFamilyViewMode = (mode: 'manager' | 'member' | null) => {
    setFamilyViewModeMutation.mutate(mode);
  };

  const setProfessionalViewMode = (mode: 'shopper' | 'client' | null) => {
    setProfessionalViewModeMutation.mutate(mode);
  };

  const adminFamilyViewMode = data?.adminFamilyViewMode || null;
  const adminProfessionalViewMode = data?.adminProfessionalViewMode || null;

  const family = data?.family || null;
  const isFamilyMember = family?.isFamilyMember || false;
  const isFamilyManager = family?.role === 'manager';

  const professional = data?.professional || null;
  const isProfessionalClient = professional?.isClient || false;
  
  // Can upgrade unless: family member (not primary manager) or professional client
  const canUpgrade = (!isFamilyMember || family?.isPrimaryManager) && !isProfessionalClient;

  return {
    tier,
    actualTier,
    previewTier,
    isPreviewing,
    adminFamilyViewMode,
    status: data?.status,
    features,
    isLoading,
    error,
    canAccessFeature,
    isWithinWardrobeLimit,
    isWithinCapsuleLimit,
    getCapsuleLimits,
    isTrialActive,
    getTrialDaysRemaining,
    isPremium: tier !== 'free',
    isFamily: tier === 'family' || tier === 'professional',
    isProfessional: tier === 'professional',
    setPreviewTier,
    exitPreview,
    setActualTier,
    setFamilyViewMode,
    setProfessionalViewMode,
    isSettingPreview: setPreviewTierMutation.isPending,
    isSettingActualTier: setActualTierMutation.isPending,
    isSettingFamilyViewMode: setFamilyViewModeMutation.isPending,
    isSettingProfessionalViewMode: setProfessionalViewModeMutation.isPending,
    adminProfessionalViewMode,
    refetch,
    family,
    isFamilyMember,
    isFamilyManager,
    professional,
    isProfessionalClient,
    canUpgrade,
  };
}
