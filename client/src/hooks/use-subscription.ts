import { useQuery } from "@tanstack/react-query";
import { TIER_LIMITS, type SubscriptionTier } from "@shared/schema";

type TierFeatures = typeof TIER_LIMITS[SubscriptionTier];

interface SubscriptionStatus {
  tier: SubscriptionTier;
  status: string | null;
  trialEndsAt: string | null;
  features: TierFeatures;
}

export function useSubscription() {
  const { data, isLoading, error } = useQuery<SubscriptionStatus>({
    queryKey: ['/api/subscription/status'],
  });

  const tier = (data?.tier || 'free') as SubscriptionTier;
  const features = data?.features || TIER_LIMITS.free;

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

  return {
    tier,
    status: data?.status,
    features,
    isLoading,
    error,
    canAccessFeature,
    isWithinWardrobeLimit,
    isTrialActive,
    getTrialDaysRemaining,
    isPremium: tier !== 'free',
    isFamily: tier === 'family' || tier === 'professional',
    isProfessional: tier === 'professional',
  };
}
