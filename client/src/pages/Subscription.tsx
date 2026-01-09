import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Crown, Users, Briefcase, Star, Sparkles, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { useSubscription } from "@/hooks/use-subscription";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { TIER_LIMITS, type SubscriptionTier } from "@shared/schema";

interface PlanPrice {
  id: string;
  amount: number | null;
  currency: string;
  interval: string;
  trialDays?: number;
}

interface Plan {
  id: string;
  name: string;
  description: string | null;
  tier: SubscriptionTier;
  features: typeof TIER_LIMITS[SubscriptionTier];
  prices: PlanPrice[];
}

const tierIcons: Record<SubscriptionTier, typeof Star> = {
  free: Star,
  premium: Crown,
  family: Users,
  professional: Briefcase,
};

const tierColors: Record<SubscriptionTier, string> = {
  free: "bg-muted text-muted-foreground",
  premium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",
  family: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100",
  professional: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100",
};

function FeatureList({ features, tier }: { features: typeof TIER_LIMITS[SubscriptionTier]; tier: SubscriptionTier }) {
  const featureDescriptions: { key: keyof typeof features; label: string; freeValue?: string }[] = [
    { key: "maxWardrobes", label: `${features.maxWardrobes === -1 ? "Unlimited" : features.maxWardrobes} wardrobe${features.maxWardrobes === 1 ? "" : "s"}` },
    { key: "jewelryCapsules", label: "Jewelry capsules" },
    { key: "sharing", label: "Share wardrobes" },
    { key: "fullAI", label: "AI-powered recommendations" },
    { key: "priorityAI", label: "Priority AI processing" },
    { key: "clientManagement", label: "Client management" },
    { key: "exports", label: "Export to PDF/spreadsheet" },
  ];

  return (
    <ul className="space-y-2">
      {featureDescriptions.map(({ key, label }) => {
        const value = features[key];
        const isIncluded = key === "maxWardrobes" ? true : Boolean(value);
        
        if (key === "ads" || !isIncluded) return null;
        
        return (
          <li key={key} className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-green-600 dark:text-green-400 flex-shrink-0" />
            <span>{key === "maxWardrobes" ? label : label}</span>
          </li>
        );
      })}
      {features.ads && (
        <li className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-4 w-4 flex-shrink-0" />
          <span>Ad-supported</span>
        </li>
      )}
    </ul>
  );
}

function PlanCard({ 
  plan, 
  isCurrentPlan, 
  onSelectPlan, 
  isPending 
}: { 
  plan: Plan; 
  isCurrentPlan: boolean;
  onSelectPlan: (priceId: string) => void;
  isPending: boolean;
}) {
  const Icon = tierIcons[plan.tier];
  const monthlyPrice = plan.prices.find(p => p.interval === "month");
  const yearlyPrice = plan.prices.find(p => p.interval === "year");
  
  const displayPrice = monthlyPrice?.amount ? monthlyPrice.amount / 100 : 0;
  const yearlyDisplayPrice = yearlyPrice?.amount ? yearlyPrice.amount / 100 : 0;
  const yearlySavings = monthlyPrice?.amount && yearlyPrice?.amount 
    ? ((monthlyPrice.amount * 12 - yearlyPrice.amount) / (monthlyPrice.amount * 12) * 100).toFixed(0)
    : null;

  return (
    <Card className={`relative flex flex-col ${isCurrentPlan ? "ring-2 ring-primary" : ""}`} data-testid={`card-plan-${plan.tier}`}>
      {isCurrentPlan && (
        <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="default" data-testid={`badge-current-${plan.tier}`}>
          Current Plan
        </Badge>
      )}
      
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2 mb-2">
          <div className={`p-2 rounded-md ${tierColors[plan.tier]}`}>
            <Icon className="h-5 w-5" />
          </div>
          <CardTitle className="text-xl">{plan.name.replace("Closana ", "")}</CardTitle>
        </div>
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>
      
      <CardContent className="flex-1">
        <div className="mb-6">
          {plan.tier === "free" ? (
            <div className="text-3xl font-bold">Free</div>
          ) : (
            <>
              <div className="text-3xl font-bold">
                ${displayPrice}
                <span className="text-base font-normal text-muted-foreground">/mo</span>
              </div>
              {yearlySavings && (
                <p className="text-sm text-muted-foreground mt-1">
                  or ${yearlyDisplayPrice}/year <span className="text-green-600 dark:text-green-400">(save {yearlySavings}%)</span>
                </p>
              )}
              {monthlyPrice?.trialDays && (
                <Badge variant="secondary" className="mt-2" data-testid={`badge-trial-${plan.tier}`}>
                  <Sparkles className="h-3 w-3 mr-1" />
                  {monthlyPrice.trialDays}-day free trial
                </Badge>
              )}
            </>
          )}
        </div>
        
        <FeatureList features={plan.features} tier={plan.tier} />
      </CardContent>
      
      <CardFooter>
        {plan.tier === "free" ? (
          <Button variant="outline" className="w-full" disabled data-testid="button-free-plan">
            {isCurrentPlan ? "Current Plan" : "Free Forever"}
          </Button>
        ) : (
          <Button 
            className="w-full" 
            disabled={isCurrentPlan || isPending}
            onClick={() => monthlyPrice && onSelectPlan(monthlyPrice.id)}
            data-testid={`button-upgrade-${plan.tier}`}
          >
            {isPending ? "Processing..." : isCurrentPlan ? "Current Plan" : "Upgrade"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

export default function Subscription() {
  const [, navigate] = useLocation();
  const { tier: currentTier, isLoading: isSubscriptionLoading, status, isTrialActive, getTrialDaysRemaining, canUpgrade, isFamilyMember, family } = useSubscription();
  const { toast } = useToast();
  
  const { data: plans, isLoading: isPlansLoading } = useQuery<Plan[]>({
    queryKey: ['/api/subscription/plans'],
  });
  
  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      return await apiRequest('/api/subscription/checkout', 'POST', { priceId });
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/subscription/portal', 'POST', {});
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to open billing portal",
        variant: "destructive",
      });
    },
  });

  const isLoading = isSubscriptionLoading || isPlansLoading;

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="text-center mb-12">
          <Skeleton className="h-10 w-64 mx-auto mb-4" />
          <Skeleton className="h-5 w-96 mx-auto" />
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-96" />
          ))}
        </div>
      </div>
    );
  }

  const trialDays = getTrialDaysRemaining();

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <Button 
        variant="ghost" 
        className="mb-6" 
        onClick={() => {
          navigate('/');
          window.location.hash = 'profile';
        }}
        data-testid="button-back-to-profile"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Profile
      </Button>
      
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4" data-testid="text-subscription-title">Choose Your Plan</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Unlock the full potential of your capsule wardrobe with premium features
        </p>
        
        {isTrialActive() && trialDays !== null && (
          <Badge variant="secondary" className="mt-4" data-testid="badge-trial-remaining">
            <Sparkles className="h-3 w-3 mr-1" />
            {trialDays} days left in your trial
          </Badge>
        )}
        
        {status === 'active' && currentTier !== 'free' && (
          <div className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => portalMutation.mutate()}
              disabled={portalMutation.isPending}
              data-testid="button-manage-billing"
            >
              Manage Billing
            </Button>
          </div>
        )}
        
        {isFamilyMember && !canUpgrade && (
          <Card className="mt-6 p-4 bg-muted/50 max-w-lg mx-auto">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-md bg-blue-100 dark:bg-blue-900">
                <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="text-left">
                <p className="font-medium">Part of {family?.familyName || 'a Family'} Account</p>
                <p className="text-sm text-muted-foreground">
                  Your subscription is managed by your family account manager. Contact them to make changes.
                </p>
              </div>
            </div>
          </Card>
        )}
      </div>
      
      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans?.map((plan) => (
          <PlanCard 
            key={plan.id}
            plan={plan}
            isCurrentPlan={plan.tier === currentTier}
            onSelectPlan={(priceId) => checkoutMutation.mutate(priceId)}
            isPending={checkoutMutation.isPending}
          />
        ))}
      </div>
      
      <div className="mt-12 text-center text-sm text-muted-foreground">
        <p>All paid plans include a free trial. Cancel anytime.</p>
        <p className="mt-2">
          Have questions? Contact us at{" "}
          <a href="mailto:support@closana.app" className="text-primary hover:underline" data-testid="link-support-email">
            support@closana.app
          </a>
        </p>
      </div>
    </div>
  );
}
