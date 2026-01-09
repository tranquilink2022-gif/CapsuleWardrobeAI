import { useSubscription } from "@/hooks/use-subscription";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";

const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  premium: 'Premium',
  family: 'Family',
  professional: 'Professional',
};

export default function PreviewModeBanner() {
  const { isPreviewing, previewTier, actualTier, exitPreview, isSettingPreview } = useSubscription();

  if (!isPreviewing || !previewTier) {
    return null;
  }

  return (
    <div 
      className="bg-amber-500 dark:bg-amber-600 text-amber-950 dark:text-amber-50 px-4 py-2 flex items-center justify-between gap-4"
      data-testid="banner-preview-mode"
    >
      <div className="flex items-center gap-2 text-sm">
        <Eye className="w-4 h-4 shrink-0" />
        <span>
          Previewing as <strong>{TIER_DISPLAY_NAMES[previewTier]}</strong> tier
          <span className="hidden sm:inline"> (your actual tier is {TIER_DISPLAY_NAMES[actualTier]})</span>
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-amber-950 dark:text-amber-50 hover:bg-amber-400 dark:hover:bg-amber-500"
        onClick={() => exitPreview()}
        disabled={isSettingPreview}
        data-testid="button-exit-preview-banner"
      >
        <X className="w-4 h-4 mr-1" />
        Exit
      </Button>
    </div>
  );
}
