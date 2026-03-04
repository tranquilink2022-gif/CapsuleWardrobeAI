import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { LogOut, Pencil, Share2, Trash2, Check, Copy, Bookmark, Users, Crown, BarChart3, Eye, EyeOff, Shield, ShoppingBag, Store, Download, Loader2 } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "@shared/schema";
import WardrobeManager from "@/components/WardrobeManager";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@shared/schema";
import { AGE_RANGES, STYLE_PREFERENCES, UNDERTONES } from "@shared/schema";
import FamilyManagement from "@/components/FamilyManagement";
import ProfessionalManagement from "@/components/ProfessionalManagement";

interface ProfileProps {
  user: User;
}

const TIER_DISPLAY_NAMES: Record<SubscriptionTier, string> = {
  free: 'Free',
  premium: 'Premium',
  family: 'Family',
  professional: 'Professional',
};

export default function Profile({ user }: ProfileProps) {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { 
    tier, 
    actualTier, 
    previewTier, 
    isPreviewing, 
    adminFamilyViewMode,
    adminProfessionalViewMode,
    setActualTier,
    setCombinedPreview,
    isSettingActualTier,
    isSettingCombinedPreview,
    isFamilyMember,
    isFamilyManager,
    isProfessionalClient,
    canUpgrade,
  } = useSubscription();

  const isFamilyMemberNotManager = isFamilyMember && !isFamilyManager;
  const isPreviewingAsFamilyMember = adminFamilyViewMode === 'member';
  const isPreviewingAsProfessionalClient = adminProfessionalViewMode === 'client';
  
  const shouldHideSubscriptionPlans = isFamilyMemberNotManager || isProfessionalClient || 
    isPreviewingAsFamilyMember || isPreviewingAsProfessionalClient;
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isPreferencesDialogOpen, setIsPreferencesDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [ageRange, setAgeRange] = useState(user.ageRange || '');
  const [stylePreference, setStylePreference] = useState(user.stylePreference || '');
  const [undertone, setUndertone] = useState(user.undertone || '');
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const handleDownloadData = async () => {
    setIsExporting(true);
    try {
      const response = await fetch('/api/auth/user/export', { credentials: 'include' });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `closana-data-export-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({
        title: "Data exported",
        description: "Your data has been downloaded successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export your data. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      return await apiRequest('/api/auth/user', 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      setIsEditDialogOpen(false);
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (data: { ageRange: string; stylePreference: string; undertone: string }) => {
      return await apiRequest('/api/auth/user', 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/auth/user'] });
      setIsPreferencesDialogOpen(false);
      toast({
        title: "Success",
        description: "Style preferences updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/auth/user', 'DELETE');
    },
    onSuccess: () => {
      window.location.href = '/';
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete account",
        variant: "destructive",
      });
    },
  });

  const handleEditProfile = () => {
    setFirstName(user.firstName || '');
    setLastName(user.lastName || '');
    setIsEditDialogOpen(true);
  };

  const handleEditPreferences = () => {
    setAgeRange(user.ageRange || '');
    setStylePreference(user.stylePreference || '');
    setUndertone(user.undertone || '');
    setIsPreferencesDialogOpen(true);
  };

  const handleUpdatePreferences = () => {
    if (!ageRange || !stylePreference || !undertone) {
      toast({
        title: "Validation Error",
        description: "Please fill in all preference fields",
        variant: "destructive",
      });
      return;
    }
    updatePreferencesMutation.mutate({ ageRange, stylePreference, undertone });
  };

  const handleUpdateProfile = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast({
        title: "Validation Error",
        description: "First name and last name are required",
        variant: "destructive",
      });
      return;
    }
    updateProfileMutation.mutate({ firstName: firstName.trim(), lastName: lastName.trim() });
  };

  const handleSignOut = () => {
    window.location.href = '/api/logout';
  };

  const handleDeleteAccount = () => {
    deleteAccountMutation.mutate();
  };

  const handleShare = async () => {
    const shareUrl = window.location.origin;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Closana - Capsule Wardrobe Planner',
          text: 'Check out Closana! Create thoughtful capsule wardrobes tailored to your lifestyle.',
          url: shareUrl,
        });
        toast({
          title: "Shared!",
          description: "Thanks for sharing Closana",
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      // Fallback to copying link
      try {
        await navigator.clipboard.writeText(shareUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast({
          title: "Link copied!",
          description: "Share link copied to clipboard",
        });
      } catch (error) {
        setIsShareDialogOpen(true);
      }
    }
  };

  return (
    <>
      <div className="flex flex-col h-full">
        <div className="p-6 border-b">
          <h1 className="font-serif text-3xl font-semibold text-foreground">
            Profile
          </h1>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Profile Card */}
          <Card className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center mb-4 overflow-hidden">
                {user.profileImageUrl ? (
                  <img 
                    src={user.profileImageUrl} 
                    alt="Profile" 
                    className="w-full h-full object-cover"
                    data-testid="img-profile"
                  />
                ) : (
                  <span className="text-5xl">👤</span>
                )}
              </div>
              <h2 className="font-serif text-2xl font-semibold mb-1" data-testid="text-user-name">
                {user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : 'User'}
              </h2>
              {user.email && (
                <p className="text-muted-foreground text-sm mb-4" data-testid="text-user-email">{user.email}</p>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleEditProfile}
                data-testid="button-edit-profile"
              >
                <Pencil className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            </div>
          </Card>

          {/* Admin Controls - At the top for Admins */}
          {user.isAdmin && (
            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Admin Controls
              </h3>
              
              <Card className="p-4 space-y-3">
                <Button
                  variant="ghost"
                  className="w-full justify-start -mx-2"
                  onClick={() => navigate('/admin/analytics')}
                  data-testid="button-admin-analytics"
                >
                  <BarChart3 className="w-4 h-4 mr-3" />
                  Sponsor Analytics
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start -mx-2"
                  onClick={() => navigate('/admin/vault')}
                  data-testid="button-admin-vault"
                >
                  <ShoppingBag className="w-4 h-4 mr-3" />
                  Vault Products
                </Button>
                
                <Button
                  variant="ghost"
                  className="w-full justify-start -mx-2"
                  onClick={() => navigate('/admin/retailers')}
                  data-testid="button-admin-retailers"
                >
                  <Store className="w-4 h-4 mr-3" />
                  Retailer Partnerships
                </Button>
              </Card>
              
              <Card className="p-4 space-y-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Preview as Tier</Label>
                  <div className="flex gap-2">
                    <Select 
                      value={
                        adminFamilyViewMode === 'manager' ? 'family-manager' :
                        adminFamilyViewMode === 'member' ? 'family-member' :
                        adminProfessionalViewMode === 'shopper' ? 'professional-shopper' :
                        adminProfessionalViewMode === 'client' ? 'professional-client' :
                        previewTier || ""
                      } 
                      onValueChange={(value) => {
                        if (value === 'retailer') {
                          navigate('/retailer-dashboard');
                        } else if (value === 'family-manager') {
                          setCombinedPreview({ tier: 'family', familyMode: 'manager', professionalMode: null });
                        } else if (value === 'family-member') {
                          setCombinedPreview({ tier: 'family', familyMode: 'member', professionalMode: null });
                        } else if (value === 'professional-shopper') {
                          setCombinedPreview({ tier: 'professional', familyMode: null, professionalMode: 'shopper' });
                        } else if (value === 'professional-client') {
                          setCombinedPreview({ tier: 'professional', familyMode: null, professionalMode: 'client' });
                        } else {
                          setCombinedPreview({ tier: value as SubscriptionTier, familyMode: null, professionalMode: null });
                        }
                      }}
                      disabled={isSettingCombinedPreview}
                    >
                      <SelectTrigger className="flex-1" data-testid="select-preview-tier">
                        <SelectValue placeholder="Select tier to preview" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3 h-3" />
                            Free
                          </div>
                        </SelectItem>
                        <SelectItem value="premium">
                          <div className="flex items-center gap-2">
                            <Eye className="w-3 h-3" />
                            Premium
                          </div>
                        </SelectItem>
                        <SelectItem value="family-manager">
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            Family Manager
                          </div>
                        </SelectItem>
                        <SelectItem value="family-member">
                          <div className="flex items-center gap-2">
                            <Users className="w-3 h-3" />
                            Family Member
                          </div>
                        </SelectItem>
                        <SelectItem value="professional-shopper">
                          <div className="flex items-center gap-2">
                            <Crown className="w-3 h-3" />
                            Professional Shopper
                          </div>
                        </SelectItem>
                        <SelectItem value="professional-client">
                          <div className="flex items-center gap-2">
                            <Crown className="w-3 h-3" />
                            Professional Client
                          </div>
                        </SelectItem>
                        <SelectItem value="retailer">
                          <div className="flex items-center gap-2">
                            <Store className="w-3 h-3" />
                            Retailer Partner
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {(isPreviewing || adminFamilyViewMode || adminProfessionalViewMode) && (
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={() => {
                          setCombinedPreview({ tier: null, familyMode: null, professionalMode: null });
                        }}
                        disabled={isSettingCombinedPreview}
                        data-testid="button-exit-preview"
                      >
                        <EyeOff className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  {(isPreviewing || adminFamilyViewMode || adminProfessionalViewMode) && (
                    <p className="text-xs text-amber-600 dark:text-amber-400">
                      Previewing as {
                        adminFamilyViewMode === 'manager' ? 'Family Manager' :
                        adminFamilyViewMode === 'member' ? 'Family Member' :
                        adminProfessionalViewMode === 'shopper' ? 'Professional Shopper' :
                        adminProfessionalViewMode === 'client' ? 'Professional Client' :
                        TIER_DISPLAY_NAMES[previewTier as SubscriptionTier]
                      }. Your actual tier is {TIER_DISPLAY_NAMES[actualTier]}.
                    </p>
                  )}
                </div>
                
                <div className="border-t pt-3 space-y-2">
                  <Label className="text-xs text-muted-foreground">Set Your Actual Tier</Label>
                  <Select 
                    value={actualTier} 
                    onValueChange={(value) => setActualTier(value as SubscriptionTier)}
                  >
                    <SelectTrigger data-testid="select-actual-tier">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SUBSCRIPTION_TIERS.map((t) => (
                        <SelectItem key={t} value={t}>
                          <div className="flex items-center gap-2">
                            <Crown className="w-3 h-3" />
                            {TIER_DISPLAY_NAMES[t]}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    As admin, you can change your tier without payment.
                  </p>
                </div>
              </Card>
            </div>
          )}

          {/* Style Preferences Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Style Preferences
            </h3>
            
            <Card className="p-6">
              {user.ageRange && user.stylePreference ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Age Range</p>
                      <p className="text-sm font-medium" data-testid="text-age-range">{user.ageRange}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Style</p>
                      <p className="text-sm font-medium" data-testid="text-style-preference">{user.stylePreference}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs text-muted-foreground">Undertone</p>
                      <p className="text-sm font-medium" data-testid="text-undertone">
                        {user.undertone === 'Unknown' ? "Not sure" : (user.undertone || 'Not set')}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditPreferences}
                    data-testid="button-edit-preferences"
                  >
                    <Pencil className="w-4 h-4 mr-2" />
                    Edit Preferences
                  </Button>
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-muted-foreground mb-4">Set your style preferences for personalized recommendations</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditPreferences}
                    data-testid="button-add-preferences"
                  >
                    Add Preferences
                  </Button>
                </div>
              )}
            </Card>
          </div>

          {/* Wardrobes Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4" />
              Wardrobes
            </h3>
            <Card className="p-6">
              <WardrobeManager />
            </Card>
          </div>

          {/* Privacy Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4" />
              Privacy
            </h3>
            
            <Card className="p-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleDownloadData}
                disabled={isExporting}
                data-testid="button-download-data"
              >
                {isExporting ? (
                  <Loader2 className="w-4 h-4 mr-3 animate-spin" />
                ) : (
                  <Download className="w-4 h-4 mr-3" />
                )}
                {isExporting ? "Preparing download..." : "Download My Data"}
              </Button>
              <p className="text-xs text-muted-foreground mt-2 px-2">
                Download a copy of all your data including wardrobes, capsules, items, shopping lists, and outfit history.
              </p>
            </Card>
          </div>

          {/* Account Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Account
            </h3>
            
            {/* Family Management - Only shown for family tier */}
            {tier === 'family' && (
              <FamilyManagement />
            )}
            
            {/* Professional Management - Only shown for professional tier */}
            {tier === 'professional' && (
              <ProfessionalManagement />
            )}
            
            {!shouldHideSubscriptionPlans && (
              <Card className="p-4">
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => navigate('/subscription')}
                  data-testid="button-subscription"
                >
                  <Crown className="w-4 h-4 mr-3" />
                  Subscription & Plans
                </Button>
              </Card>
            )}
            
            <Card className="p-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={() => navigate('/shared-with-me')}
                data-testid="button-shared-with-me"
              >
                <Bookmark className="w-4 h-4 mr-3" />
                Shared with Me
              </Button>
            </Card>
            
            <Card className="p-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleShare}
                data-testid="button-share-app"
              >
                <Share2 className="w-4 h-4 mr-3" />
                Share Closana with Friends
              </Button>
            </Card>

            <Card className="p-4">
              <Button
                variant="ghost"
                className="w-full justify-start"
                onClick={handleSignOut}
                data-testid="button-sign-out"
              >
                <LogOut className="w-4 h-4 mr-3" />
                Sign Out
              </Button>
            </Card>

            <Card className="p-4">
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => setIsDeleteDialogOpen(true)}
                data-testid="button-delete-account"
              >
                <Trash2 className="w-4 h-4 mr-3" />
                Delete Account
              </Button>
            </Card>
          </div>

          {/* Authentication Note */}
          <Card className="p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground">
              <strong>Note:</strong> This app uses Replit Authentication. To change your username or password, 
              please visit your{' '}
              <a 
                href="https://replit.com/account" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary underline hover:text-primary/80"
                data-testid="link-replit-account"
              >
                Replit account settings
              </a>.
            </p>
          </Card>
        </div>
      </div>

      {/* Edit Profile Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                data-testid="input-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Enter your first name"
              />
            </div>
            <div>
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                data-testid="input-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Enter your last name"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
              data-testid="button-cancel-edit"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateProfile}
              disabled={updateProfileMutation.isPending}
              data-testid="button-save-profile"
            >
              {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Preferences Dialog */}
      <Dialog open={isPreferencesDialogOpen} onOpenChange={setIsPreferencesDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Style Preferences</DialogTitle>
            <DialogDescription>
              Update your preferences for personalized recommendations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Age Range</Label>
              <Select value={ageRange} onValueChange={setAgeRange}>
                <SelectTrigger data-testid="select-age-range">
                  <SelectValue placeholder="Select your age range" />
                </SelectTrigger>
                <SelectContent>
                  {AGE_RANGES.map((range) => (
                    <SelectItem key={range} value={range}>{range}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Style Preference</Label>
              <Select value={stylePreference} onValueChange={setStylePreference}>
                <SelectTrigger data-testid="select-style-preference">
                  <SelectValue placeholder="Select your style preference" />
                </SelectTrigger>
                <SelectContent>
                  {STYLE_PREFERENCES.map((pref) => (
                    <SelectItem key={pref} value={pref}>{pref}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Skin Undertone</Label>
              <Select value={undertone} onValueChange={setUndertone}>
                <SelectTrigger data-testid="select-undertone">
                  <SelectValue placeholder="Select your undertone" />
                </SelectTrigger>
                <SelectContent>
                  {UNDERTONES.map((tone) => (
                    <SelectItem key={tone} value={tone}>
                      {tone === 'Unknown' ? "I don't know" : tone}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Used for personalized color recommendations
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsPreferencesDialogOpen(false)}
              data-testid="button-cancel-preferences"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdatePreferences}
              disabled={updatePreferencesMutation.isPending}
              data-testid="button-save-preferences"
            >
              {updatePreferencesMutation.isPending ? "Saving..." : "Save Preferences"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your account
              and remove all your data including capsules, items, and shopping lists from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={deleteAccountMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Dialog (Fallback) */}
      <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Closana</DialogTitle>
            <DialogDescription>
              Copy the link below to share Closana with others
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2">
            <Input
              readOnly
              value={window.location.origin}
              data-testid="input-share-link"
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(window.location.origin);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                  toast({
                    title: "Copied!",
                    description: "Link copied to clipboard",
                  });
                } catch (error) {
                  toast({
                    title: "Error",
                    description: "Failed to copy link",
                    variant: "destructive",
                  });
                }
              }}
              data-testid="button-copy-link"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
