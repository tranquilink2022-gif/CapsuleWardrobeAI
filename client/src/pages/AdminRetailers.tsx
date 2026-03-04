import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Store, Mail, CheckCircle, XCircle, Clock, Building, Percent, ExternalLink, Trash2, Eye } from "lucide-react";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Retailer, RetailerApplication, RetailerInvite } from "@shared/schema";

const MESSAGE_TEMPLATE = `Hi there!

I've been following your brand and I'm genuinely impressed by your products and the mission behind what you do. Your commitment to quality and thoughtful design really aligns with what we're building at Closana.

We're creating a community of mindful shoppers who value quality over quantity, and I think your pieces would resonate beautifully with our users. I'd love to invite you to join our Retail Partner Program.

As a partner, your products would be featured in our Vault, reaching customers who are actively building intentional, curated wardrobes. We operate on a revenue-share model with no upfront costs.

I'd be happy to chat more about how this could work for your brand. Looking forward to hearing from you!

Best regards`;

export default function AdminRetailers() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    contactEmail: "",
    businessName: "",
    contactName: "",
    proposedRevenueShare: "15",
    message: "",
  });

  const { data: retailers = [], isLoading: retailersLoading } = useQuery<Retailer[]>({
    queryKey: ["/api/admin/retailers"],
  });

  const { data: applications = [], isLoading: applicationsLoading } = useQuery<RetailerApplication[]>({
    queryKey: ["/api/admin/retailer-applications"],
  });

  const { data: invites = [], isLoading: invitesLoading } = useQuery<RetailerInvite[]>({
    queryKey: ["/api/admin/retailer-invites"],
  });

  const createInviteMutation = useMutation({
    mutationFn: async (data: typeof inviteForm) => {
      const response = await apiRequest("/api/admin/retailer-invites", "POST", {
        ...data,
        proposedRevenueShare: parseInt(data.proposedRevenueShare) || 15,
      });
      return response as { token: string };
    },
    onSuccess: (data, variables) => {
      queryClient.refetchQueries({ queryKey: ["/api/admin/retailer-invites"] });
      setInviteDialogOpen(false);
      
      // Build the invite link
      const inviteLink = `${window.location.origin}/retailer-invite/${data.token}`;
      
      // Build Gmail compose URL
      const subject = encodeURIComponent(`Invitation to Join Closana's Retail Partner Program`);
      const body = encodeURIComponent(
        `${variables.message || MESSAGE_TEMPLATE}\n\n` +
        `---\n\n` +
        `To accept this invitation and get started, click the link below:\n${inviteLink}\n\n` +
        `This invitation expires in 30 days.`
      );
      const gmailUrl = `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(variables.contactEmail)}&su=${subject}&body=${body}`;
      
      // Open Gmail in new tab
      window.open(gmailUrl, '_blank');
      
      setInviteForm({ contactEmail: "", businessName: "", contactName: "", proposedRevenueShare: "15", message: "" });
      toast({ title: "Invite created", description: "Gmail opened with your email draft. Edit and send when ready!" });
    },
    onError: () => {
      toast({ title: "Failed to create invite", variant: "destructive" });
    },
  });

  const deleteInviteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/retailer-invites/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/admin/retailer-invites"] });
      toast({ title: "Invite deleted" });
    },
  });

  const processApplicationMutation = useMutation({
    mutationFn: async ({ id, status, revenueSharePercent, reviewNotes }: { 
      id: string; 
      status: string; 
      revenueSharePercent?: number;
      reviewNotes?: string;
    }) => {
      return apiRequest(`/api/admin/retailer-applications/${id}`, "PATCH", { status, revenueSharePercent, reviewNotes });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/admin/retailer-applications"] });
      queryClient.refetchQueries({ queryKey: ["/api/admin/retailers"] });
      toast({ title: "Application processed" });
    },
  });

  const updateRetailerMutation = useMutation({
    mutationFn: async ({ id, revenueSharePercent, status, notes }: {
      id: string;
      revenueSharePercent?: number;
      status?: string;
      notes?: string;
    }) => {
      return apiRequest(`/api/admin/retailers/${id}`, "PATCH", { revenueSharePercent, status, notes });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/admin/retailers"] });
      toast({ title: "Retailer updated" });
    },
  });

  const deleteRetailerMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest(`/api/admin/retailers/${id}`, "DELETE");
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ["/api/admin/retailers"] });
      toast({ title: "Retailer deleted" });
    },
  });

  const pendingApplications = applications.filter(a => a.status === "pending");
  const activeRetailers = retailers.filter(r => r.status === "active");
  const pendingRetailers = retailers.filter(r => r.status === "pending");

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/profile")}
            data-testid="button-back-to-profile"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Retailer Management</h1>
            <p className="text-sm text-muted-foreground">Manage retailer partnerships and revenue share</p>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{activeRetailers.length}</div>
              <div className="text-sm text-muted-foreground">Active Retailers</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{pendingApplications.length}</div>
              <div className="text-sm text-muted-foreground">Pending Applications</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{invites.length}</div>
              <div className="text-sm text-muted-foreground">Active Invites</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">
                {retailers.reduce((sum, r) => sum + (r.totalRevenue || 0), 0) / 100}
              </div>
              <div className="text-sm text-muted-foreground">Total Revenue ($)</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="retailers">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="retailers" data-testid="tab-retailers">
              <Store className="w-4 h-4 mr-2" />
              Retailers ({retailers.length})
            </TabsTrigger>
            <TabsTrigger value="applications" data-testid="tab-applications">
              <Clock className="w-4 h-4 mr-2" />
              Applications ({pendingApplications.length})
            </TabsTrigger>
            <TabsTrigger value="invites" data-testid="tab-invites">
              <Mail className="w-4 h-4 mr-2" />
              Invites ({invites.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="retailers" className="space-y-4">
            {retailersLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading retailers...</div>
            ) : retailers.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No retailers yet</p>
                  <p className="text-sm text-muted-foreground">Invite retailers or wait for applications</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {retailers.map((retailer) => (
                  <RetailerCard 
                    key={retailer.id} 
                    retailer={retailer} 
                    onUpdate={updateRetailerMutation.mutate}
                    onDelete={deleteRetailerMutation.mutate}
                    onPreview={(id) => navigate(`/admin/retailer-preview/${id}`)}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="applications" className="space-y-4">
            {applicationsLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading applications...</div>
            ) : applications.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Clock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No applications yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => (
                  <ApplicationCard 
                    key={app.id} 
                    application={app} 
                    onProcess={processApplicationMutation.mutate}
                  />
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invites" className="space-y-4">
            <div className="flex justify-end">
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button data-testid="button-invite-retailer">
                    <Plus className="w-4 h-4 mr-2" />
                    Invite Retailer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite a Retailer</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="businessName">Business Name</Label>
                      <Input
                        id="businessName"
                        value={inviteForm.businessName}
                        onChange={(e) => setInviteForm({ ...inviteForm, businessName: e.target.value })}
                        placeholder="Acme Fashion Co"
                        data-testid="input-invite-business-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactEmail">Contact Email</Label>
                      <Input
                        id="contactEmail"
                        type="email"
                        value={inviteForm.contactEmail}
                        onChange={(e) => setInviteForm({ ...inviteForm, contactEmail: e.target.value })}
                        placeholder="contact@example.com"
                        data-testid="input-invite-email"
                      />
                    </div>
                    <div>
                      <Label htmlFor="contactName">Contact Name (optional)</Label>
                      <Input
                        id="contactName"
                        value={inviteForm.contactName}
                        onChange={(e) => setInviteForm({ ...inviteForm, contactName: e.target.value })}
                        placeholder="Jane Smith"
                        data-testid="input-invite-contact-name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="revenueShare">Revenue Share %</Label>
                      <Input
                        id="revenueShare"
                        type="number"
                        min="1"
                        max="50"
                        value={inviteForm.proposedRevenueShare}
                        onChange={(e) => setInviteForm({ ...inviteForm, proposedRevenueShare: e.target.value })}
                        data-testid="input-invite-revenue-share"
                      />
                    </div>
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="message">Personal Message (optional)</Label>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => setInviteForm({ ...inviteForm, message: MESSAGE_TEMPLATE })}
                          data-testid="button-use-template"
                        >
                          Use Template
                        </Button>
                      </div>
                      <Textarea
                        id="message"
                        value={inviteForm.message}
                        onChange={(e) => setInviteForm({ ...inviteForm, message: e.target.value })}
                        placeholder="We'd love to have you join our platform..."
                        rows={10}
                        data-testid="input-invite-message"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() => createInviteMutation.mutate(inviteForm)}
                      disabled={!inviteForm.businessName || !inviteForm.contactEmail || createInviteMutation.isPending}
                      data-testid="button-send-invite"
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      {createInviteMutation.isPending ? "Creating..." : "Create Invite & Open Gmail"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {invitesLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading invites...</div>
            ) : invites.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Mail className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No pending invites</p>
                  <p className="text-sm text-muted-foreground">Use the button above to invite retailers</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {invites.map((invite) => (
                  <InviteCard 
                    key={invite.id} 
                    invite={invite} 
                    onDelete={deleteInviteMutation.mutate}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function RetailerCard({ 
  retailer, 
  onUpdate,
  onDelete,
  onPreview,
}: { 
  retailer: Retailer; 
  onUpdate: (data: { id: string; revenueSharePercent?: number; status?: string; notes?: string }) => void;
  onDelete: (id: string) => void;
  onPreview: (id: string) => void;
}) {
  const [editMode, setEditMode] = useState(false);
  const [revenueShare, setRevenueShare] = useState(String(retailer.revenueSharePercent));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{retailer.businessName}</span>
              <Badge variant={retailer.status === "active" ? "default" : "secondary"}>
                {retailer.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">{retailer.contactEmail}</div>
            {retailer.website && (
              <a 
                href={retailer.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                {retailer.website}
              </a>
            )}
            <div className="flex gap-4 text-sm text-muted-foreground">
              <span>Clicks: {retailer.totalClicks}</span>
              <span>Conversions: {retailer.totalConversions}</span>
              <span>Revenue: ${(retailer.totalRevenue || 0) / 100}</span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <Percent className="w-4 h-4 text-muted-foreground" />
              {editMode ? (
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={revenueShare}
                  onChange={(e) => setRevenueShare(e.target.value)}
                  className="w-16 h-8"
                  data-testid={`input-revenue-share-${retailer.id}`}
                />
              ) : (
                <span className="font-medium">{retailer.revenueSharePercent}%</span>
              )}
            </div>
            <div className="flex gap-2">
              {editMode ? (
                <>
                  <Button 
                    size="sm" 
                    onClick={() => {
                      onUpdate({ id: retailer.id, revenueSharePercent: parseInt(revenueShare) });
                      setEditMode(false);
                    }}
                    data-testid={`button-save-retailer-${retailer.id}`}
                  >
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditMode(false)}>
                    Cancel
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => onPreview(retailer.id)}
                    data-testid={`button-preview-retailer-${retailer.id}`}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    Preview
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    onClick={() => setEditMode(true)}
                    data-testid={`button-edit-retailer-${retailer.id}`}
                  >
                    Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    onClick={() => onDelete(retailer.id)}
                    data-testid={`button-delete-retailer-${retailer.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ApplicationCard({ 
  application, 
  onProcess,
}: { 
  application: RetailerApplication; 
  onProcess: (data: { id: string; status: string; revenueSharePercent?: number; reviewNotes?: string }) => void;
}) {
  const [revenueShare, setRevenueShare] = useState("15");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Building className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{application.businessName}</span>
              <Badge variant={
                application.status === "pending" ? "secondary" : 
                application.status === "approved" ? "default" : "destructive"
              }>
                {application.status}
              </Badge>
            </div>
            <div className="text-sm text-muted-foreground">{application.contactEmail}</div>
            {application.contactName && (
              <div className="text-sm">Contact: {application.contactName}</div>
            )}
            {application.website && (
              <a 
                href={application.website} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                {application.website}
              </a>
            )}
            {application.description && (
              <p className="text-sm text-muted-foreground">{application.description}</p>
            )}
            {application.ecommercePlatform && (
              <Badge variant="outline">{application.ecommercePlatform}</Badge>
            )}
            <div className="text-xs text-muted-foreground">
              Applied: {new Date(application.createdAt).toLocaleDateString()}
            </div>
          </div>
          {application.status === "pending" && (
            <div className="flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Revenue %</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={revenueShare}
                  onChange={(e) => setRevenueShare(e.target.value)}
                  className="w-16 h-8"
                  data-testid={`input-app-revenue-share-${application.id}`}
                />
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => onProcess({ 
                    id: application.id, 
                    status: "approved", 
                    revenueSharePercent: parseInt(revenueShare) 
                  })}
                  data-testid={`button-approve-app-${application.id}`}
                >
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onProcess({ id: application.id, status: "rejected" })}
                  data-testid={`button-reject-app-${application.id}`}
                >
                  <XCircle className="w-4 h-4 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function InviteCard({ 
  invite, 
  onDelete,
}: { 
  invite: RetailerInvite; 
  onDelete: (id: string) => void;
}) {
  const expiresIn = Math.ceil((new Date(invite.expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-muted-foreground" />
              <span className="font-medium">{invite.businessName}</span>
              <Badge variant="secondary">{invite.proposedRevenueShare}% share</Badge>
            </div>
            <div className="text-sm text-muted-foreground">{invite.contactEmail}</div>
            {invite.message && (
              <p className="text-sm text-muted-foreground italic">"{invite.message}"</p>
            )}
            <div className="text-xs text-muted-foreground">
              Expires in {expiresIn} days
            </div>
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onDelete(invite.id)}
            data-testid={`button-delete-invite-${invite.id}`}
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
