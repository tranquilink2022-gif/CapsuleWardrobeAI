import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { 
  Receipt, 
  FileText, 
  DollarSign, 
  Plus, 
  Trash2, 
  Send,
  Check,
  Clock,
  XCircle,
  Eye,
  Upload
} from "lucide-react";

interface ReceiptData {
  id: string;
  clientId: string;
  invoiceId: string | null;
  imageUrl: string | null;
  description: string | null;
  amount: number;
  purchaseDate: string;
  createdAt: string;
  clientName?: string;
}

interface InvoiceData {
  id: string;
  clientId: string;
  invoiceNumber: string;
  status: 'draft' | 'sent' | 'paid' | 'cancelled';
  serviceAmount: number;
  merchandiseAmount: number;
  totalAmount: number;
  notes: string | null;
  dueDate: string | null;
  createdAt: string;
  paidAt: string | null;
  clientName?: string;
  shopperName?: string;
}

interface Client {
  id: string;
  userId: string;
  firstName?: string;
  lastName?: string;
  email?: string;
}

interface ProfessionalBillingProps {
  role: 'shopper' | 'client';
  clients?: Client[];
  shopperName?: string;
}

export default function ProfessionalBilling({ role, clients = [], shopperName }: ProfessionalBillingProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [activeTab, setActiveTab] = useState<'receipts' | 'invoices'>('receipts');
  const [isReceiptDialogOpen, setIsReceiptDialogOpen] = useState(false);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptData | null>(null);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceData | null>(null);
  const [receiptToDelete, setReceiptToDelete] = useState<ReceiptData | null>(null);
  const [invoiceToDelete, setInvoiceToDelete] = useState<InvoiceData | null>(null);
  
  const [receiptForm, setReceiptForm] = useState({
    clientId: "",
    description: "",
    amount: "",
    purchaseDate: new Date().toISOString().split('T')[0],
    imageUrl: "",
  });
  
  const [invoiceForm, setInvoiceForm] = useState({
    clientId: "",
    serviceAmount: "",
    merchandiseAmount: "",
    notes: "",
    dueDate: "",
  });

  const { data: receipts = [], isLoading: receiptsLoading } = useQuery<ReceiptData[]>({
    queryKey: ['/api/professional/receipts'],
  });

  const { data: invoices = [], isLoading: invoicesLoading } = useQuery<InvoiceData[]>({
    queryKey: ['/api/professional/invoices'],
  });

  const createReceiptMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/professional/receipts', 'POST', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/receipts'] });
      setIsReceiptDialogOpen(false);
      resetReceiptForm();
      toast({
        title: "Receipt added",
        description: "The receipt has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add receipt",
        variant: "destructive",
      });
    },
  });

  const deleteReceiptMutation = useMutation({
    mutationFn: async (receiptId: string) => {
      return await apiRequest(`/api/professional/receipts/${receiptId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/receipts'] });
      setReceiptToDelete(null);
      toast({
        title: "Receipt deleted",
        description: "The receipt has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete receipt",
        variant: "destructive",
      });
    },
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      return await apiRequest('/api/professional/invoices', 'POST', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/invoices'] });
      setIsInvoiceDialogOpen(false);
      resetInvoiceForm();
      toast({
        title: "Invoice created",
        description: "The invoice has been created as a draft",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    },
  });

  const updateInvoiceMutation = useMutation({
    mutationFn: async ({ invoiceId, status }: { invoiceId: string; status: string }) => {
      return await apiRequest(`/api/professional/invoices/${invoiceId}`, 'PATCH', { status });
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/invoices'] });
      toast({
        title: "Invoice updated",
        description: "The invoice status has been updated",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update invoice",
        variant: "destructive",
      });
    },
  });

  const deleteInvoiceMutation = useMutation({
    mutationFn: async (invoiceId: string) => {
      return await apiRequest(`/api/professional/invoices/${invoiceId}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/professional/invoices'] });
      setInvoiceToDelete(null);
      toast({
        title: "Invoice deleted",
        description: "The invoice has been removed",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete invoice",
        variant: "destructive",
      });
    },
  });

  const resetReceiptForm = () => {
    setReceiptForm({
      clientId: "",
      description: "",
      amount: "",
      purchaseDate: new Date().toISOString().split('T')[0],
      imageUrl: "",
    });
  };

  const resetInvoiceForm = () => {
    setInvoiceForm({
      clientId: "",
      serviceAmount: "",
      merchandiseAmount: "",
      notes: "",
      dueDate: "",
    });
  };

  const handleCreateReceipt = () => {
    if (!receiptForm.clientId || !receiptForm.amount) {
      toast({
        title: "Missing information",
        description: "Please select a client and enter an amount",
        variant: "destructive",
      });
      return;
    }
    createReceiptMutation.mutate({
      clientId: receiptForm.clientId,
      description: receiptForm.description || null,
      amount: Math.round(parseFloat(receiptForm.amount) * 100),
      purchaseDate: receiptForm.purchaseDate,
      imageUrl: receiptForm.imageUrl || null,
    });
  };

  const handleCreateInvoice = () => {
    if (!invoiceForm.clientId) {
      toast({
        title: "Missing information",
        description: "Please select a client",
        variant: "destructive",
      });
      return;
    }
    createInvoiceMutation.mutate({
      clientId: invoiceForm.clientId,
      serviceAmount: invoiceForm.serviceAmount ? Math.round(parseFloat(invoiceForm.serviceAmount) * 100) : 0,
      merchandiseAmount: invoiceForm.merchandiseAmount ? Math.round(parseFloat(invoiceForm.merchandiseAmount) * 100) : 0,
      notes: invoiceForm.notes || null,
      dueDate: invoiceForm.dueDate || null,
    });
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>;
      case 'sent':
        return <Badge variant="outline" className="border-blue-500 text-blue-600"><Send className="w-3 h-3 mr-1" />Sent</Badge>;
      case 'paid':
        return <Badge variant="outline" className="border-green-500 text-green-600"><Check className="w-3 h-3 mr-1" />Paid</Badge>;
      case 'cancelled':
        return <Badge variant="outline" className="border-red-500 text-red-600"><XCircle className="w-3 h-3 mr-1" />Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getClientName = (clientId: string) => {
    const client = clients.find(c => c.id === clientId);
    if (client?.firstName && client?.lastName) {
      return `${client.firstName} ${client.lastName}`;
    }
    return client?.email || 'Unknown Client';
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">Billing</h3>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'receipts' | 'invoices')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="receipts" data-testid="tab-receipts">
            <Receipt className="w-4 h-4 mr-2" />
            Receipts
          </TabsTrigger>
          <TabsTrigger value="invoices" data-testid="tab-invoices">
            <FileText className="w-4 h-4 mr-2" />
            Invoices
          </TabsTrigger>
        </TabsList>

        <TabsContent value="receipts" className="space-y-4 mt-4">
          {role === 'shopper' && (
            <Button 
              size="sm" 
              onClick={() => setIsReceiptDialogOpen(true)}
              data-testid="button-add-receipt"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Receipt
            </Button>
          )}

          {receiptsLoading ? (
            <div className="text-center py-6 text-muted-foreground">
              Loading receipts...
            </div>
          ) : receipts.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No receipts yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  data-testid={`receipt-${receipt.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {receipt.description || 'Purchase'}
                      </p>
                      <Badge variant="secondary">
                        {formatCurrency(receipt.amount)}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {role === 'shopper' && receipt.clientName && `${receipt.clientName} • `}
                      {new Date(receipt.purchaseDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {receipt.imageUrl && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSelectedReceipt(receipt);
                          setIsViewDialogOpen(true);
                        }}
                        data-testid={`button-view-receipt-${receipt.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                    )}
                    {role === 'shopper' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setReceiptToDelete(receipt)}
                        data-testid={`button-delete-receipt-${receipt.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invoices" className="space-y-4 mt-4">
          {role === 'shopper' && (
            <Button 
              size="sm" 
              onClick={() => setIsInvoiceDialogOpen(true)}
              data-testid="button-create-invoice"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Invoice
            </Button>
          )}

          {invoicesLoading ? (
            <div className="text-center py-6 text-muted-foreground">
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No invoices yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-md bg-muted/50"
                  data-testid={`invoice-${invoice.id}`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">
                        {invoice.invoiceNumber}
                      </p>
                      {getStatusBadge(invoice.status)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {role === 'shopper' && invoice.clientName && `${invoice.clientName} • `}
                      {role === 'client' && invoice.shopperName && `From ${invoice.shopperName} • `}
                      {formatCurrency(invoice.totalAmount)}
                      {invoice.dueDate && ` • Due ${new Date(invoice.dueDate).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {role === 'shopper' && invoice.status === 'draft' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateInvoiceMutation.mutate({ invoiceId: invoice.id, status: 'sent' })}
                        disabled={updateInvoiceMutation.isPending}
                        data-testid={`button-send-invoice-${invoice.id}`}
                      >
                        <Send className="w-4 h-4 mr-1" />
                        Send
                      </Button>
                    )}
                    {role === 'client' && invoice.status === 'sent' && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => updateInvoiceMutation.mutate({ invoiceId: invoice.id, status: 'paid' })}
                        disabled={updateInvoiceMutation.isPending}
                        data-testid={`button-pay-invoice-${invoice.id}`}
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Mark Paid
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedInvoice(invoice);
                        setIsViewDialogOpen(true);
                      }}
                      data-testid={`button-view-invoice-${invoice.id}`}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {role === 'shopper' && invoice.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setInvoiceToDelete(invoice)}
                        data-testid={`button-delete-invoice-${invoice.id}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Receipt Dialog */}
      <Dialog open={isReceiptDialogOpen} onOpenChange={setIsReceiptDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Receipt</DialogTitle>
            <DialogDescription>
              Record a purchase made for a client.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select 
                value={receiptForm.clientId} 
                onValueChange={(v) => setReceiptForm(prev => ({ ...prev, clientId: v }))}
              >
                <SelectTrigger data-testid="select-receipt-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName && client.lastName
                        ? `${client.firstName} ${client.lastName}`
                        : client.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={receiptForm.amount}
                  onChange={(e) => setReceiptForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="pl-8"
                  data-testid="input-receipt-amount"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Purchase Date</Label>
              <Input
                type="date"
                value={receiptForm.purchaseDate}
                onChange={(e) => setReceiptForm(prev => ({ ...prev, purchaseDate: e.target.value }))}
                data-testid="input-receipt-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="What was purchased..."
                value={receiptForm.description}
                onChange={(e) => setReceiptForm(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-receipt-description"
              />
            </div>
            <div className="space-y-2">
              <Label>Receipt Image (optional)</Label>
              <div className="flex items-center gap-3">
                <ObjectUploader
                  maxNumberOfFiles={1}
                  maxFileSize={10485760}
                  onGetUploadParameters={async () => {
                    const response = await apiRequest("/api/objects/upload", "POST");
                    return { method: "PUT" as const, url: response.uploadURL };
                  }}
                  onComplete={(result) => {
                    const uploadedFile = result.successful?.[0];
                    if (uploadedFile?.uploadURL) {
                      const url = new URL(uploadedFile.uploadURL);
                      const objectPath = url.pathname;
                      apiRequest("/api/item-images", "PUT", { imageURL: uploadedFile.uploadURL })
                        .then((res) => {
                          setReceiptForm(prev => ({ ...prev, imageUrl: res.objectPath }));
                        });
                    }
                  }}
                />
                {receiptForm.imageUrl && (
                  <Badge variant="secondary" className="gap-1">
                    <Check className="w-3 h-3" />
                    Image uploaded
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Upload a photo of the receipt from your device
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsReceiptDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateReceipt} 
              disabled={createReceiptMutation.isPending}
            >
              {createReceiptMutation.isPending ? "Adding..." : "Add Receipt"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create Invoice Dialog */}
      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Invoice</DialogTitle>
            <DialogDescription>
              Create a new invoice for a client. It will be saved as a draft.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Client *</Label>
              <Select 
                value={invoiceForm.clientId} 
                onValueChange={(v) => setInvoiceForm(prev => ({ ...prev, clientId: v }))}
              >
                <SelectTrigger data-testid="select-invoice-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName && client.lastName
                        ? `${client.firstName} ${client.lastName}`
                        : client.email || 'Unknown'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Service Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invoiceForm.serviceAmount}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, serviceAmount: e.target.value }))}
                    className="pl-8"
                    data-testid="input-invoice-service"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Merchandise Amount</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={invoiceForm.merchandiseAmount}
                    onChange={(e) => setInvoiceForm(prev => ({ ...prev, merchandiseAmount: e.target.value }))}
                    className="pl-8"
                    data-testid="input-invoice-merchandise"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Due Date</Label>
              <Input
                type="date"
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, dueDate: e.target.value }))}
                data-testid="input-invoice-due-date"
              />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                placeholder="Additional notes..."
                value={invoiceForm.notes}
                onChange={(e) => setInvoiceForm(prev => ({ ...prev, notes: e.target.value }))}
                data-testid="input-invoice-notes"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsInvoiceDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateInvoice} 
              disabled={createInvoiceMutation.isPending}
            >
              {createInvoiceMutation.isPending ? "Creating..." : "Create Draft"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent>
          {selectedReceipt && (
            <>
              <DialogHeader>
                <DialogTitle>Receipt Details</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {selectedReceipt.imageUrl && (
                  <img 
                    src={selectedReceipt.imageUrl} 
                    alt="Receipt" 
                    className="w-full rounded-md max-h-64 object-contain bg-muted"
                  />
                )}
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">{formatCurrency(selectedReceipt.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Date</span>
                    <span>{new Date(selectedReceipt.purchaseDate).toLocaleDateString()}</span>
                  </div>
                  {selectedReceipt.description && (
                    <div>
                      <span className="text-muted-foreground block mb-1">Description</span>
                      <p className="text-sm">{selectedReceipt.description}</p>
                    </div>
                  )}
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => { setIsViewDialogOpen(false); setSelectedReceipt(null); }}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
          {selectedInvoice && (
            <>
              <DialogHeader>
                <DialogTitle>Invoice {selectedInvoice.invoiceNumber}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                  {getStatusBadge(selectedInvoice.status)}
                </div>
                <div className="space-y-2 p-3 bg-muted/50 rounded-md">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Services</span>
                    <span>{formatCurrency(selectedInvoice.serviceAmount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Merchandise</span>
                    <span>{formatCurrency(selectedInvoice.merchandiseAmount)}</span>
                  </div>
                  <div className="flex justify-between font-medium border-t pt-2 mt-2">
                    <span>Total</span>
                    <span>{formatCurrency(selectedInvoice.totalAmount)}</span>
                  </div>
                </div>
                {selectedInvoice.dueDate && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Due Date</span>
                    <span>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedInvoice.paidAt && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Paid On</span>
                    <span>{new Date(selectedInvoice.paidAt).toLocaleDateString()}</span>
                  </div>
                )}
                {selectedInvoice.notes && (
                  <div>
                    <span className="text-muted-foreground text-sm block mb-1">Notes</span>
                    <p className="text-sm">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
              <DialogFooter>
                <Button onClick={() => { setIsViewDialogOpen(false); setSelectedInvoice(null); }}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Receipt Confirmation */}
      <AlertDialog open={!!receiptToDelete} onOpenChange={(open) => !open && setReceiptToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this receipt? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => receiptToDelete && deleteReceiptMutation.mutate(receiptToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Receipt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Invoice Confirmation */}
      <AlertDialog open={!!invoiceToDelete} onOpenChange={(open) => !open && setInvoiceToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this draft invoice? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => invoiceToDelete && deleteInvoiceMutation.mutate(invoiceToDelete.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Invoice
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
