import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { useSubscription } from "@/hooks/use-subscription";
import { 
  Briefcase, 
  UserPlus, 
  DollarSign, 
  Mail, 
  Copy, 
  Check, 
  Trash2, 
  UserMinus, 
  Building2,
  Users,
  Wallet,
  Edit2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface ProfessionalClient {
  id: string;
  userId: string;
  budget: number | null;
  notes: string | null;
  joinedAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImageUrl?: string;
}

interface PendingInvite {
  id: string;
  email: string;
  wardrobeName?: string;
  expiresAt: string;
  createdAt: string;
  token?: string;
}

interface ShopperInfo {
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImageUrl?: string;
}

interface ProfessionalStatus {
  role: 'shopper' | 'client' | null;
  professionalAccount: {
    id: string;
    businessName: string;
    hourlyRate: number | null;
  } | null;
  clients?: ProfessionalClient[];
  pendingInvites?: PendingInvite[];
  clientRelationship?: {
    id: string;
    budget: number | null;
    notes: string | null;
    joinedAt: string;
  };
  shopper?: ShopperInfo;
}

export default function ProfessionalManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tier } = useSubscription();
  
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviteLinkDialogOpen, setIsInviteLinkDialogOpen] = useState(false);
  const [isRateDialogOpen, setIsRateDialogOpen] = useState(false);
  const [isBudgetDialogOpen, setIsBudgetDialogOpen] = useState(false);
  
  const [businessName, setBusinessName] = useState("");
  const [hourlyRate, setHourlyRate] = useState<string>("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteWardrobeName, setInviteWardrobeName] = useState("");
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [budget, setBudget] = useState<string>("");
  const [copied, setCopied] = useState<string | null>(null);
  const [clientToRemove, setClientToRemove] = useState<ProfessionalClient | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<PendingInvite | null>(null);

  const { data: professionalStatus, isLoading } = useQuery<ProfessionalStatus>({
    queryKey: ['/api/professional/status'],
    enabled: tier === 'professional',
  });

  const setupAccountMutation = useMutation({
    mutationFn: async (data: { businessName: string; hourlyRate?: number }) => {
      return await apiRequest('/api/professional/account', 'POST', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/status'] });
      setIsSetupDialogOpen(false);
      toast({
        title: "Account created",
        description: "Your professional account is ready",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create account",
        variant: "destructive",
      });
    },
  });

  const updateRateMutation = useMutation({
    mutationFn: async (rate: number) => {
      return await apiRequest('/api/professional/rate', 'PATCH', { hourlyRate: rate });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/status'] });
      setIsRateDialogOpen(false);
      toast({
        title: "Rate updated",
        description: "Your hourly rate has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update rate",
        variant: "destructive",
      });
    },
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email?: string; wardrobeName: string }) => {
      return await apiRequest('/api/professional/invite', 'POST', data);
    },
    onSuccess: (data: any) => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/status'] });
      setIsInviteDialogOpen(false);
      
      if (data.token) {
        const link = `${window.location.origin}/professional-invite/${data.token}`;
        setCreatedInviteLink(link);
        setIsInviteLinkDialogOpen(true);
      }
      
      setInviteEmail("");
      setInviteWardrobeName("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send invite",
        variant: "destructive",
      });
    },
  });

  const cancelInviteMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      return await apiRequest(`/api/professional/invite/${inviteId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/status'] });
      setInviteToCancel(null);
      toast({
        title: "Invite cancelled",
        description: "The invitation has been cancelled",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to cancel invite",
        variant: "destructive",
      });
    },
  });

  const removeClientMutation = useMutation({
    mutationFn: async (clientId: string) => {
      return await apiRequest(`/api/professional/client/${clientId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/status'] });
      setClientToRemove(null);
      toast({
        title: "Client removed",
        description: "The client has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove client",
        variant: "destructive",
      });
    },
  });

  const updateBudgetMutation = useMutation({
    mutationFn: async (budgetAmount: number) => {
      return await apiRequest('/api/professional/budget', 'PATCH', { budget: budgetAmount });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/status'] });
      setIsBudgetDialogOpen(false);
      toast({
        title: "Budget updated",
        description: "Your shopping budget has been set",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update budget",
        variant: "destructive",
      });
    },
  });

  const handleSetup = () => {
    if (!businessName.trim()) {
      toast({
        title: "Business name required",
        description: "Please enter your business name",
        variant: "destructive",
      });
      return;
    }
    setupAccountMutation.mutate({
      businessName: businessName.trim(),
      hourlyRate: hourlyRate ? parseFloat(hourlyRate) * 100 : undefined,
    });
  };

  const handleInvite = () => {
    if (!inviteWardrobeName.trim()) {
      toast({
        title: "Wardrobe name required",
        description: "Please enter a name for their wardrobe",
        variant: "destructive",
      });
      return;
    }
    inviteMutation.mutate({
      email: inviteEmail.trim() || undefined,
      wardrobeName: inviteWardrobeName.trim(),
    });
  };

  const copyInviteLink = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setCopied(link);
    setTimeout(() => setCopied(null), 2000);
    toast({
      title: "Link copied",
      description: "Invite link copied to clipboard",
    });
  };

  const getInitials = (firstName?: string, lastName?: string, email?: string) => {
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    if (email) {
      return email[0].toUpperCase();
    }
    return "?";
  };

  const formatCurrency = (cents: number | null) => {
    if (cents === null) return "Not set";
    return `$${(cents / 100).toFixed(2)}`;
  };

  if (tier !== 'professional') {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Briefcase className="w-4 h-4 animate-pulse" />
          <span>Loading professional info...</span>
        </div>
      </Card>
    );
  }

  // No professional account yet - show setup prompt
  if (!professionalStatus?.role && !professionalStatus?.professionalAccount) {
    return (
      <>
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">Professional Shopper</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Set up your professional account to start managing clients, creating wardrobes, and billing for your services.
          </p>
          <Button onClick={() => setIsSetupDialogOpen(true)} data-testid="button-setup-professional">
            <Building2 className="w-4 h-4 mr-2" />
            Set Up Professional Account
          </Button>
        </Card>

        <Dialog open={isSetupDialogOpen} onOpenChange={setIsSetupDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Up Professional Account</DialogTitle>
              <DialogDescription>
                Enter your business details to start working with clients.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Business Name</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Style by Sarah"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  data-testid="input-business-name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourlyRate">Hourly Rate (optional)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="pl-8"
                    data-testid="input-hourly-rate"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  You can set or update this later
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsSetupDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSetup} disabled={setupAccountMutation.isPending}>
                {setupAccountMutation.isPending ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Client view
  if (professionalStatus?.role === 'client') {
    const shopperName = professionalStatus.shopper?.firstName && professionalStatus.shopper?.lastName
      ? `${professionalStatus.shopper.firstName} ${professionalStatus.shopper.lastName}`
      : professionalStatus.professionalAccount?.businessName || 'Your Shopper';
    
    return (
      <>
        <Card className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-primary" />
              <h3 className="font-semibold">Professional Shopping</h3>
            </div>
            <Badge variant="secondary">Client</Badge>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
              <Avatar className="w-10 h-10">
                <AvatarImage src={professionalStatus.shopper?.profileImageUrl} />
                <AvatarFallback>
                  {getInitials(
                    professionalStatus.shopper?.firstName,
                    professionalStatus.shopper?.lastName,
                    professionalStatus.shopper?.email
                  )}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm font-medium">{shopperName}</p>
                <p className="text-xs text-muted-foreground">
                  {professionalStatus.professionalAccount?.businessName}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground">Hourly Rate</p>
                <p className="font-medium">
                  {formatCurrency(professionalStatus.professionalAccount?.hourlyRate || null)}/hr
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm">Shopping Budget</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-medium">
                  {formatCurrency(professionalStatus.clientRelationship?.budget || null)}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    setBudget(professionalStatus.clientRelationship?.budget 
                      ? (professionalStatus.clientRelationship.budget / 100).toString()
                      : ""
                    );
                    setIsBudgetDialogOpen(true);
                  }}
                  data-testid="button-edit-budget"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Dialog open={isBudgetDialogOpen} onOpenChange={setIsBudgetDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Set Shopping Budget</DialogTitle>
              <DialogDescription>
                Set a budget to help your shopper stay within your spending limits.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="pl-8"
                  data-testid="input-budget"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBudgetDialogOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={() => updateBudgetMutation.mutate(parseFloat(budget) * 100)}
                disabled={updateBudgetMutation.isPending || !budget}
              >
                {updateBudgetMutation.isPending ? "Saving..." : "Save Budget"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Shopper view
  const clients = professionalStatus?.clients || [];
  const pendingInvites = professionalStatus?.pendingInvites || [];

  return (
    <>
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">
              {professionalStatus?.professionalAccount?.businessName || 'Professional Account'}
            </h3>
            <Badge variant="outline">Shopper</Badge>
          </div>
          <Button
            size="sm"
            onClick={() => setIsInviteDialogOpen(true)}
            data-testid="button-invite-client"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
        </div>

        <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">Hourly Rate</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">
              {formatCurrency(professionalStatus?.professionalAccount?.hourlyRate || null)}/hr
            </span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setHourlyRate(professionalStatus?.professionalAccount?.hourlyRate 
                  ? (professionalStatus.professionalAccount.hourlyRate / 100).toString()
                  : ""
                );
                setIsRateDialogOpen(true);
              }}
              data-testid="button-edit-rate"
            >
              <Edit2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {clients.length > 0 && (
          <div className="space-y-3">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Users className="w-3 h-3" />
              Clients ({clients.length})
            </Label>
            <div className="space-y-2">
              {clients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  data-testid={`client-${client.userId}`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={client.profileImageUrl} />
                      <AvatarFallback>
                        {getInitials(client.firstName, client.lastName, client.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium">
                        {client.firstName && client.lastName
                          ? `${client.firstName} ${client.lastName}`
                          : client.email || 'Unknown'}
                      </p>
                      {client.email && client.firstName && (
                        <p className="text-xs text-muted-foreground">{client.email}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {client.budget && (
                      <Badge variant="secondary" className="gap-1">
                        <Wallet className="w-3 h-3" />
                        {formatCurrency(client.budget)}
                      </Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setClientToRemove(client)}
                      data-testid={`button-remove-client-${client.userId}`}
                    >
                      <UserMinus className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {clients.length === 0 && pendingInvites.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No clients yet</p>
            <p className="text-xs">Invite your first client to get started</p>
          </div>
        )}

        {pendingInvites.length > 0 && (
          <div className="space-y-3 border-t pt-4">
            <Label className="text-xs text-muted-foreground uppercase tracking-wider">
              Pending Invites
            </Label>
            <div className="space-y-2">
              {pendingInvites.map((invite) => (
                <div
                  key={invite.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/30 border border-dashed"
                  data-testid={`pending-invite-${invite.id}`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{invite.wardrobeName || 'New Client'}</p>
                      <p className="text-xs text-muted-foreground">
                        {invite.email && invite.email !== 'pending@invite.link' && `${invite.email} • `}
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {invite.token && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyInviteLink(`${window.location.origin}/professional-invite/${invite.token}`)}
                        data-testid={`button-copy-invite-${invite.id}`}
                      >
                        {copied?.includes(invite.token) ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setInviteToCancel(invite)}
                      data-testid={`button-cancel-invite-${invite.id}`}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Invite Client Dialog */}
      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Client</DialogTitle>
            <DialogDescription>
              Create an invite link to send to your new client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="wardrobeName">Wardrobe Name *</Label>
              <Input
                id="wardrobeName"
                placeholder="e.g., Sarah's Wardrobe"
                value={inviteWardrobeName}
                onChange={(e) => setInviteWardrobeName(e.target.value)}
                data-testid="input-wardrobe-name"
              />
              <p className="text-xs text-muted-foreground">
                This will be the name of their wardrobe
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                type="email"
                placeholder="client@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                data-testid="input-client-email"
              />
              <p className="text-xs text-muted-foreground">
                For your reference only - we'll generate a link to share
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleInvite} disabled={inviteMutation.isPending}>
              {inviteMutation.isPending ? "Creating..." : "Create Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Link Dialog */}
      <Dialog open={isInviteLinkDialogOpen} onOpenChange={setIsInviteLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Created</DialogTitle>
            <DialogDescription>
              Share this link with your client to invite them.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="flex items-center gap-2">
              <Input
                value={createdInviteLink || ""}
                readOnly
                className="font-mono text-sm"
              />
              <Button
                size="icon"
                onClick={() => createdInviteLink && copyInviteLink(createdInviteLink)}
              >
                {copied === createdInviteLink ? (
                  <Check className="w-4 h-4" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsInviteLinkDialogOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Rate Dialog */}
      <Dialog open={isRateDialogOpen} onOpenChange={setIsRateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Hourly Rate</DialogTitle>
            <DialogDescription>
              Set your hourly rate for services.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="pl-8"
                data-testid="input-update-rate"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={() => updateRateMutation.mutate(parseFloat(hourlyRate) * 100)}
              disabled={updateRateMutation.isPending || !hourlyRate}
            >
              {updateRateMutation.isPending ? "Saving..." : "Save Rate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Remove Client Confirmation */}
      <AlertDialog open={!!clientToRemove} onOpenChange={(open) => !open && setClientToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Client?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove{" "}
              <strong>
                {clientToRemove?.firstName && clientToRemove?.lastName
                  ? `${clientToRemove.firstName} ${clientToRemove.lastName}`
                  : clientToRemove?.email || 'this client'}
              </strong>
              ? They will lose access to their wardrobe through your account.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => clientToRemove && removeClientMutation.mutate(clientToRemove.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Client
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Cancel Invite Confirmation */}
      <AlertDialog open={!!inviteToCancel} onOpenChange={(open) => !open && setInviteToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invite?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invitation? The link will no longer work.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invite</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => inviteToCancel && cancelInviteMutation.mutate(inviteToCancel.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Cancel Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
