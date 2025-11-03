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
import { LogOut, Pencil, Share2, Trash2, Check, Copy, Ruler, Info } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { User } from "@shared/schema";

interface ProfileProps {
  user: User;
}

export default function Profile({ user }: ProfileProps) {
  const { toast } = useToast();
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isMeasurementsDialogOpen, setIsMeasurementsDialogOpen] = useState(false);
  const [isAffiliateDialogOpen, setIsAffiliateDialogOpen] = useState(false);
  const [firstName, setFirstName] = useState(user.firstName || '');
  const [lastName, setLastName] = useState(user.lastName || '');
  const [copied, setCopied] = useState(false);
  
  // Measurements state
  const [measurements, setMeasurements] = useState<Record<string, { value: string; unit: string }>>({
    height: { value: '', unit: 'in' },
    weight: { value: '', unit: 'lbs' },
    chest: { value: '', unit: 'in' },
    waist: { value: '', unit: 'in' },
    hips: { value: '', unit: 'in' },
    inseam: { value: '', unit: 'in' },
    neck: { value: '', unit: 'in' },
    sleeve: { value: '', unit: 'in' },
    shoulder: { value: '', unit: 'in' },
    shoeSize: { value: '', unit: 'US' },
    ringSize: { value: '', unit: 'US' },
    topSize: { value: '', unit: '' },
    bottomSize: { value: '', unit: '' },
    dressSize: { value: '', unit: '' },
    jacketSize: { value: '', unit: '' },
    ...(user.measurements as Record<string, { value: string; unit: string }> || {}),
  });

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

  const updateMeasurementsMutation = useMutation({
    mutationFn: async (data: { firstName: string; lastName: string; measurements: Record<string, { value: string; unit: string }> }) => {
      return await apiRequest('/api/auth/user', 'PATCH', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setIsMeasurementsDialogOpen(false);
      toast({
        title: "Success",
        description: "Measurements saved successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save measurements",
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

  const handleEditMeasurements = () => {
    setMeasurements({
      height: { value: '', unit: 'in' },
      weight: { value: '', unit: 'lbs' },
      chest: { value: '', unit: 'in' },
      waist: { value: '', unit: 'in' },
      hips: { value: '', unit: 'in' },
      inseam: { value: '', unit: 'in' },
      neck: { value: '', unit: 'in' },
      sleeve: { value: '', unit: 'in' },
      shoulder: { value: '', unit: 'in' },
      shoeSize: { value: '', unit: 'US' },
      ringSize: { value: '', unit: 'US' },
      topSize: { value: '', unit: '' },
      bottomSize: { value: '', unit: '' },
      dressSize: { value: '', unit: '' },
      jacketSize: { value: '', unit: '' },
      ...(user.measurements as Record<string, { value: string; unit: string }> || {}),
    });
    setIsMeasurementsDialogOpen(true);
  };

  const handleSaveMeasurements = () => {
    // Filter out empty measurements
    const filteredMeasurements = Object.entries(measurements).reduce((acc, [key, val]) => {
      if (val.value.trim()) {
        acc[key] = val;
      }
      return acc;
    }, {} as Record<string, { value: string; unit: string }>);

    updateMeasurementsMutation.mutate({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      measurements: filteredMeasurements,
    });
  };

  const handleShareMeasurements = async () => {
    const userMeasurements = user.measurements as Record<string, { value: string; unit: string }> || {};
    const measurementsList = Object.entries(userMeasurements)
      .filter(([_, val]) => val.value)
      .map(([key, val]) => {
        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
        return `${label}: ${val.value} ${val.unit}`;
      })
      .join('\n');

    const shareText = `My Measurements\n\n${measurementsList || 'No measurements added yet'}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'My Measurements',
          text: shareText,
        });
        toast({
          title: "Shared!",
          description: "Measurements shared successfully",
        });
      } catch (error) {
        // User cancelled share
      }
    } else {
      try {
        await navigator.clipboard.writeText(shareText);
        toast({
          title: "Copied!",
          description: "Measurements copied to clipboard",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to copy measurements",
          variant: "destructive",
        });
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

          {/* Measurements Section */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
              Measurements
            </h3>
            
            <Card className="p-6">
              {user.measurements && Object.keys(user.measurements as Record<string, any>).length > 0 ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    {Object.entries(user.measurements as Record<string, { value: string; unit: string }>)
                      .filter(([_, val]) => val.value)
                      .map(([key, val]) => {
                        const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
                        return (
                          <div key={key} className="space-y-1">
                            <p className="text-xs text-muted-foreground">{label}</p>
                            <p className="text-sm font-medium" data-testid={`text-measurement-${key}`}>
                              {val.value} {val.unit}
                            </p>
                          </div>
                        );
                      })}
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleEditMeasurements}
                      data-testid="button-edit-measurements"
                      className="flex-1"
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleShareMeasurements}
                      data-testid="button-share-measurements"
                      className="flex-1"
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Share
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-6">
                  <Ruler className="w-12 h-12 mx-auto mb-3 text-muted-foreground opacity-50" />
                  <p className="text-muted-foreground mb-4">No measurements added yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleEditMeasurements}
                    data-testid="button-add-measurements"
                  >
                    <Ruler className="w-4 h-4 mr-2" />
                    Add Measurements
                  </Button>
                </div>
              )}
            </Card>
          </div>

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
                className="w-full justify-start"
                onClick={() => setIsAffiliateDialogOpen(true)}
                data-testid="button-about-links"
              >
                <Info className="w-4 h-4 mr-3" />
                About Partner Links
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

      {/* Edit Measurements Dialog */}
      <Dialog open={isMeasurementsDialogOpen} onOpenChange={setIsMeasurementsDialogOpen}>
        <DialogContent className="max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>My Measurements</DialogTitle>
            <DialogDescription>
              Add your body measurements to help with clothing and jewelry shopping
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Height */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="height">Height</Label>
                <Input
                  id="height"
                  data-testid="input-measurement-height"
                  value={measurements.height.value}
                  onChange={(e) => setMeasurements({ ...measurements, height: { ...measurements.height, value: e.target.value } })}
                  placeholder="e.g., 5'8"
                />
              </div>
              <Select
                value={measurements.height.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, height: { ...measurements.height, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-height">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Weight */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                  id="weight"
                  data-testid="input-measurement-weight"
                  value={measurements.weight.value}
                  onChange={(e) => setMeasurements({ ...measurements, weight: { ...measurements.weight, value: e.target.value } })}
                  placeholder="e.g., 150"
                />
              </div>
              <Select
                value={measurements.weight.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, weight: { ...measurements.weight, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-weight">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lbs">lbs</SelectItem>
                  <SelectItem value="kg">kg</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Chest/Bust */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="chest">Chest/Bust</Label>
                <Input
                  id="chest"
                  data-testid="input-measurement-chest"
                  value={measurements.chest.value}
                  onChange={(e) => setMeasurements({ ...measurements, chest: { ...measurements.chest, value: e.target.value } })}
                  placeholder="e.g., 38"
                />
              </div>
              <Select
                value={measurements.chest.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, chest: { ...measurements.chest, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-chest">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Waist */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="waist">Waist</Label>
                <Input
                  id="waist"
                  data-testid="input-measurement-waist"
                  value={measurements.waist.value}
                  onChange={(e) => setMeasurements({ ...measurements, waist: { ...measurements.waist, value: e.target.value } })}
                  placeholder="e.g., 32"
                />
              </div>
              <Select
                value={measurements.waist.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, waist: { ...measurements.waist, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-waist">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Hips */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="hips">Hips</Label>
                <Input
                  id="hips"
                  data-testid="input-measurement-hips"
                  value={measurements.hips.value}
                  onChange={(e) => setMeasurements({ ...measurements, hips: { ...measurements.hips, value: e.target.value } })}
                  placeholder="e.g., 40"
                />
              </div>
              <Select
                value={measurements.hips.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, hips: { ...measurements.hips, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-hips">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Inseam */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="inseam">Inseam</Label>
                <Input
                  id="inseam"
                  data-testid="input-measurement-inseam"
                  value={measurements.inseam.value}
                  onChange={(e) => setMeasurements({ ...measurements, inseam: { ...measurements.inseam, value: e.target.value } })}
                  placeholder="e.g., 30"
                />
              </div>
              <Select
                value={measurements.inseam.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, inseam: { ...measurements.inseam, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-inseam">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Neck */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="neck">Neck</Label>
                <Input
                  id="neck"
                  data-testid="input-measurement-neck"
                  value={measurements.neck.value}
                  onChange={(e) => setMeasurements({ ...measurements, neck: { ...measurements.neck, value: e.target.value } })}
                  placeholder="e.g., 15"
                />
              </div>
              <Select
                value={measurements.neck.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, neck: { ...measurements.neck, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-neck">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sleeve */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="sleeve">Sleeve Length</Label>
                <Input
                  id="sleeve"
                  data-testid="input-measurement-sleeve"
                  value={measurements.sleeve.value}
                  onChange={(e) => setMeasurements({ ...measurements, sleeve: { ...measurements.sleeve, value: e.target.value } })}
                  placeholder="e.g., 33"
                />
              </div>
              <Select
                value={measurements.sleeve.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, sleeve: { ...measurements.sleeve, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-sleeve">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shoulder */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="shoulder">Shoulder Width</Label>
                <Input
                  id="shoulder"
                  data-testid="input-measurement-shoulder"
                  value={measurements.shoulder.value}
                  onChange={(e) => setMeasurements({ ...measurements, shoulder: { ...measurements.shoulder, value: e.target.value } })}
                  placeholder="e.g., 18"
                />
              </div>
              <Select
                value={measurements.shoulder.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, shoulder: { ...measurements.shoulder, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-shoulder">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in">in</SelectItem>
                  <SelectItem value="cm">cm</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Shoe Size */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="shoeSize">Shoe Size</Label>
                <Input
                  id="shoeSize"
                  data-testid="input-measurement-shoeSize"
                  value={measurements.shoeSize.value}
                  onChange={(e) => setMeasurements({ ...measurements, shoeSize: { ...measurements.shoeSize, value: e.target.value } })}
                  placeholder="e.g., 9"
                />
              </div>
              <Select
                value={measurements.shoeSize.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, shoeSize: { ...measurements.shoeSize, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-shoeSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="EU">EU</SelectItem>
                  <SelectItem value="UK">UK</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Ring Size */}
            <div className="grid grid-cols-3 gap-2 items-end">
              <div className="col-span-2">
                <Label htmlFor="ringSize">Ring Size</Label>
                <Input
                  id="ringSize"
                  data-testid="input-measurement-ringSize"
                  value={measurements.ringSize.value}
                  onChange={(e) => setMeasurements({ ...measurements, ringSize: { ...measurements.ringSize, value: e.target.value } })}
                  placeholder="e.g., 7"
                />
              </div>
              <Select
                value={measurements.ringSize.unit}
                onValueChange={(value) => setMeasurements({ ...measurements, ringSize: { ...measurements.ringSize, unit: value } })}
              >
                <SelectTrigger data-testid="select-unit-ringSize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="US">US</SelectItem>
                  <SelectItem value="EU">EU</SelectItem>
                  <SelectItem value="UK">UK</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Preferred Sizes Section */}
            <div className="pt-4 border-t">
              <h4 className="font-semibold text-sm mb-4">Preferred Clothing Sizes</h4>
              
              {/* Top/Shirt Size */}
              <div className="mb-4">
                <Label htmlFor="topSize">Top/Shirt Size</Label>
                <Input
                  id="topSize"
                  data-testid="input-measurement-topSize"
                  value={measurements.topSize.value}
                  onChange={(e) => setMeasurements({ ...measurements, topSize: { ...measurements.topSize, value: e.target.value } })}
                  placeholder="e.g., M, L, XL or 6, 8, 10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Examples: S, M, L, XL (unisex) or 2, 4, 6, 8 (women's) or 38, 40, 42 (men's)
                </p>
              </div>

              {/* Bottom/Pants Size */}
              <div className="mb-4">
                <Label htmlFor="bottomSize">Bottom/Pants Size</Label>
                <Input
                  id="bottomSize"
                  data-testid="input-measurement-bottomSize"
                  value={measurements.bottomSize.value}
                  onChange={(e) => setMeasurements({ ...measurements, bottomSize: { ...measurements.bottomSize, value: e.target.value } })}
                  placeholder="e.g., 32, 34 or 6, 8, 10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Examples: 28, 30, 32 (waist) or 2, 4, 6, 8 (women's numeric)
                </p>
              </div>

              {/* Dress Size */}
              <div className="mb-4">
                <Label htmlFor="dressSize">Dress Size</Label>
                <Input
                  id="dressSize"
                  data-testid="input-measurement-dressSize"
                  value={measurements.dressSize.value}
                  onChange={(e) => setMeasurements({ ...measurements, dressSize: { ...measurements.dressSize, value: e.target.value } })}
                  placeholder="e.g., 4, 6, 8, 10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Examples: 2, 4, 6, 8, 10, 12 or XS, S, M, L
                </p>
              </div>

              {/* Jacket/Suit Size */}
              <div>
                <Label htmlFor="jacketSize">Jacket/Suit Size</Label>
                <Input
                  id="jacketSize"
                  data-testid="input-measurement-jacketSize"
                  value={measurements.jacketSize.value}
                  onChange={(e) => setMeasurements({ ...measurements, jacketSize: { ...measurements.jacketSize, value: e.target.value } })}
                  placeholder="e.g., 38R, 40L or 6, 8, 10"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Examples: 38R, 40R, 42L (men's suit) or 4, 6, 8 (women's jacket)
                </p>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsMeasurementsDialogOpen(false)}
              data-testid="button-cancel-measurements"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveMeasurements}
              disabled={updateMeasurementsMutation.isPending}
              data-testid="button-save-measurements"
            >
              {updateMeasurementsMutation.isPending ? "Saving..." : "Save Measurements"}
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

      {/* Affiliate Links Disclosure Dialog */}
      <Dialog open={isAffiliateDialogOpen} onOpenChange={setIsAffiliateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>About Partner Links</DialogTitle>
            <DialogDescription>
              How we support Closana while helping you shop
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 text-sm text-muted-foreground">
            <p>
              Closana may include links to fashion brands and retailers as part of our curated wardrobe experience.
            </p>
            <p>
              <strong className="text-foreground">Transparency:</strong> Some product links in your capsules may be affiliate partnerships. When you purchase items through these links, we may earn a small commission at no additional cost to you.
            </p>
            <p>
              <strong className="text-foreground">Editorial Independence:</strong> Our team independently curates recommendations based on quality and style. We only feature brands and products that align with thoughtful, sustainable wardrobing.
            </p>
            <p>
              <strong className="text-foreground">Your Control:</strong> You're always in control. You can add any product link you choose, use our suggestions, or shop directly with retailers.
            </p>
            <p className="text-xs">
              These partnerships help us maintain and improve Closana while keeping the app accessible to everyone who values intentional fashion choices.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => setIsAffiliateDialogOpen(false)}
              data-testid="button-close-affiliate-dialog"
            >
              Got it
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
