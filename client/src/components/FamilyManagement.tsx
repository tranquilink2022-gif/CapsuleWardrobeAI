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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useSubscription } from "@/hooks/use-subscription";
import { Users, UserPlus, Crown, Mail, Copy, Check, Trash2, UserMinus, Shield } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface FamilyMember {
  id: string;
  userId: string;
  role: 'manager' | 'member';
  joinedAt: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  profileImageUrl?: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: 'manager' | 'member';
  wardrobeName?: string;
  expiresAt: string;
  createdAt: string;
  token?: string;
}

interface FamilyStatus {
  isFamilyMember: boolean;
  familyAccount: {
    id: string;
    name: string;
    maxMembers: number;
  } | null;
  membership: {
    id: string;
    role: 'manager' | 'member';
    joinedAt: string;
  } | null;
  members: FamilyMember[];
  pendingInvites: PendingInvite[];
}

export default function FamilyManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tier, isFamilyManager, isFamilyMember, family } = useSubscription();
  
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [isInviteLinkDialogOpen, setIsInviteLinkDialogOpen] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState<string | null>(null);
  const [createdInviteEmail, setCreatedInviteEmail] = useState<string | null>(null);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<'manager' | 'member'>("member");
  const [inviteWardrobeName, setInviteWardrobeName] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [memberToRemove, setMemberToRemove] = useState<FamilyMember | null>(null);
  const [inviteToCancel, setInviteToCancel] = useState<PendingInvite | null>(null);

  const { data: familyStatus, isLoading } = useQuery<FamilyStatus>({
    queryKey: ['/api/family/status'],
    enabled: tier === 'family' || tier === 'professional',
  });

  const inviteMutation = useMutation({
    mutationFn: async (data: { email: string; role: string; wardrobeName?: string }) => {
      return await apiRequest('/api/family/invite', 'POST', data);
    },
    onSuccess: (data: any) => {
      queryClient.refetchQueries({ queryKey: ['/api/family/status'] });
      setIsInviteDialogOpen(false);
      
      // Show the invite link dialog immediately
      if (data.token) {
        const link = `${window.location.origin}/invite/${data.token}`;
        setCreatedInviteLink(link);
        setCreatedInviteEmail(data.email);
        setIsInviteLinkDialogOpen(true);
      }
      
      setInviteEmail("");
      setInviteRole("member");
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
      return await apiRequest(`/api/family/invite/${inviteId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/family/status'] });
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

  const removeMemberMutation = useMutation({
    mutationFn: async (membershipId: string) => {
      return await apiRequest(`/api/family/member/${membershipId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/family/status'] });
      queryClient.refetchQueries({ queryKey: ['/api/subscription/status'] });
      setMemberToRemove(null);
      toast({
        title: "Member removed",
        description: "The member has been removed from your family",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove member",
        variant: "destructive",
      });
    },
  });

  const leaveFamilyMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest('/api/family/leave', 'POST');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/family/status'] });
      queryClient.refetchQueries({ queryKey: ['/api/subscription/status'] });
      toast({
        title: "Left family",
        description: "You have left the family account",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to leave family",
        variant: "destructive",
      });
    },
  });

  const handleInvite = () => {
    if (!inviteEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter an email address",
        variant: "destructive",
      });
      return;
    }
    inviteMutation.mutate({
      email: inviteEmail.trim(),
      role: inviteRole,
      wardrobeName: inviteWardrobeName.trim() || undefined,
    });
  };

  const copyInviteLink = async (token: string) => {
    const link = `${window.location.origin}/invite/${token}`;
    await navigator.clipboard.writeText(link);
    setCopied(token);
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

  if (tier !== 'family' && tier !== 'professional') {
    return null;
  }

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4 animate-pulse" />
          <span>Loading family info...</span>
        </div>
      </Card>
    );
  }

  if (!familyStatus?.isFamilyMember) {
    return null;
  }

  const isManager = familyStatus.membership?.role === 'manager';
  const members = familyStatus.members || [];
  const pendingInvites = familyStatus.pendingInvites || [];
  const maxMembers = familyStatus.familyAccount?.maxMembers || 5;
  const currentMemberCount = members.length;

  return (
    <>
      <Card className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="font-semibold">
              {familyStatus.familyAccount?.name || 'Family Account'}
            </h3>
            <Badge variant="secondary">
              {currentMemberCount}/{maxMembers} members
            </Badge>
          </div>
          {isManager && currentMemberCount < maxMembers && (
            <Button
              size="sm"
              onClick={() => setIsInviteDialogOpen(true)}
              data-testid="button-invite-member"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              Invite
            </Button>
          )}
        </div>

        <div className="space-y-3">
          <Label className="text-xs text-muted-foreground uppercase tracking-wider">
            Members
          </Label>
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                data-testid={`family-member-${member.userId}`}
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.profileImageUrl} />
                    <AvatarFallback>
                      {getInitials(member.firstName, member.lastName, member.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">
                      {member.firstName && member.lastName
                        ? `${member.firstName} ${member.lastName}`
                        : member.email || 'Unknown'}
                    </p>
                    {member.email && member.firstName && (
                      <p className="text-xs text-muted-foreground">{member.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {member.role === 'manager' ? (
                    <Badge variant="outline" className="gap-1">
                      <Crown className="w-3 h-3" />
                      Manager
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Member</Badge>
                  )}
                  {isManager && member.role !== 'manager' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMemberToRemove(member)}
                      data-testid={`button-remove-member-${member.userId}`}
                    >
                      <UserMinus className="w-4 h-4 text-destructive" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {isManager && pendingInvites.length > 0 && (
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
                      <p className="text-sm font-medium">{invite.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Expires {new Date(invite.expiresAt).toLocaleDateString()}
                        {invite.wardrobeName && ` • Wardrobe: ${invite.wardrobeName}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={invite.role === 'manager' ? 'outline' : 'secondary'}>
                      {invite.role === 'manager' ? 'Manager' : 'Member'}
                    </Badge>
                    {invite.token && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyInviteLink(invite.token!)}
                        data-testid={`button-copy-invite-${invite.id}`}
                      >
                        {copied === invite.token ? (
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

        {!isManager && !family?.isPrimaryManager && (
          <div className="border-t pt-4">
            <Button
              variant="outline"
              className="w-full text-destructive hover:text-destructive"
              onClick={() => leaveFamilyMutation.mutate()}
              disabled={leaveFamilyMutation.isPending}
              data-testid="button-leave-family"
            >
              <UserMinus className="w-4 h-4 mr-2" />
              Leave Family
            </Button>
          </div>
        )}
      </Card>

      <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Family Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your family account. They'll get access to Family tier features.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="invite-email">Email Address</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="family@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                data-testid="input-invite-email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invite-role">Role</Label>
              <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'manager' | 'member')}>
                <SelectTrigger data-testid="select-invite-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">
                    <div className="flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Member - Can manage their own wardrobe
                    </div>
                  </SelectItem>
                  <SelectItem value="manager">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4" />
                      Manager - Can manage all family wardrobes
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="wardrobe-name">Wardrobe Name (optional)</Label>
              <Input
                id="wardrobe-name"
                placeholder="e.g., Kids' Clothes"
                value={inviteWardrobeName}
                onChange={(e) => setInviteWardrobeName(e.target.value)}
                data-testid="input-wardrobe-name"
              />
              <p className="text-xs text-muted-foreground">
                A wardrobe will be created for them when they accept
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInviteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={inviteMutation.isPending}
              data-testid="button-send-invite"
            >
              {inviteMutation.isPending ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Family Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {memberToRemove?.firstName || memberToRemove?.email || 'this member'} from your family account. 
              They will be downgraded to the Free tier and lose access to family features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => memberToRemove && removeMemberMutation.mutate(memberToRemove.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!inviteToCancel} onOpenChange={() => setInviteToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will cancel the invitation sent to {inviteToCancel?.email}. They will no longer be able to join your family.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep Invite</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => inviteToCancel && cancelInviteMutation.mutate(inviteToCancel.id)}
            >
              Cancel Invite
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Invite Link Dialog - Shows after creating an invite */}
      <Dialog open={isInviteLinkDialogOpen} onOpenChange={setIsInviteLinkDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Created</DialogTitle>
            <DialogDescription>
              Share this link with {createdInviteEmail} so they can join your family account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Invite Link</Label>
              <div className="flex gap-2">
                <Input
                  value={createdInviteLink || ""}
                  readOnly
                  className="font-mono text-sm"
                  data-testid="input-invite-link"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={async () => {
                    if (createdInviteLink) {
                      await navigator.clipboard.writeText(createdInviteLink);
                      setCopied("created");
                      setTimeout(() => setCopied(null), 2000);
                      toast({
                        title: "Link copied",
                        description: "Invite link copied to clipboard",
                      });
                    }
                  }}
                  data-testid="button-copy-created-link"
                >
                  {copied === "created" ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                This link expires in 7 days. You can also copy it later from the pending invites list.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={() => setIsInviteLinkDialogOpen(false)} data-testid="button-done-invite">
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
