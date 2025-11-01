import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { LogOut, Pencil, Share2, Trash2, Check, Copy } from "lucide-react";
import type { User } from "@shared/schema";

interface ProfileProps {
  user: User;
}

export default function Profile({ user }: ProfileProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [copied, setCopied] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string }) => {
      return await apiRequest('/api/auth/user', 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
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

          {/* Account Actions */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Account
            </h3>
            
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
              please visit your Replit account settings.
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
