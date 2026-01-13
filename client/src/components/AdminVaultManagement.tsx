import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
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
import { Plus, Pencil, Trash2, ExternalLink, Star, MousePointer } from "lucide-react";
import { type AffiliateProduct, VAULT_CATEGORIES } from "@shared/schema";

interface ProductFormData {
  name: string;
  brand: string;
  category: string;
  description: string;
  price: string;
  imageUrl: string;
  affiliateUrl: string;
  isFeatured: boolean;
  isActive: boolean;
}

const emptyFormData: ProductFormData = {
  name: "",
  brand: "",
  category: "",
  description: "",
  price: "",
  imageUrl: "",
  affiliateUrl: "",
  isFeatured: false,
  isActive: true,
};

export default function AdminVaultManagement() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AffiliateProduct | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<AffiliateProduct | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(emptyFormData);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const { data: products = [], isLoading } = useQuery<AffiliateProduct[]>({
    queryKey: ['/api/admin/vault/products'],
  });

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      return await apiRequest('/api/admin/vault/products', 'POST', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/admin/vault/products'] });
      setIsCreateDialogOpen(false);
      setFormData(emptyFormData);
      toast({
        title: "Success",
        description: "Product created successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create product",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ProductFormData> }) => {
      return await apiRequest(`/api/admin/vault/products/${id}`, 'PUT', data);
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/admin/vault/products'] });
      setEditingProduct(null);
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest(`/api/admin/vault/products/${id}`, 'DELETE');
    },
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['/api/admin/vault/products'] });
      setDeletingProduct(null);
      toast({
        title: "Success",
        description: "Product deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete product",
        variant: "destructive",
      });
    },
  });

  const handleOpenCreate = () => {
    setFormData(emptyFormData);
    setIsCreateDialogOpen(true);
  };

  const handleOpenEdit = (product: AffiliateProduct) => {
    setFormData({
      name: product.name,
      brand: product.brand || "",
      category: product.category,
      description: product.description || "",
      price: product.price || "",
      imageUrl: product.imageUrl || "",
      affiliateUrl: product.affiliateUrl,
      isFeatured: product.isFeatured,
      isActive: product.isActive,
    });
    setEditingProduct(product);
  };

  const handleCreate = () => {
    if (!formData.name || !formData.category || !formData.affiliateUrl) {
      toast({
        title: "Validation Error",
        description: "Name, category, and affiliate URL are required",
        variant: "destructive",
      });
      return;
    }
    createMutation.mutate(formData);
  };

  const handleUpdate = () => {
    if (!editingProduct) return;
    updateMutation.mutate({ id: editingProduct.id, data: formData });
  };

  const handleDelete = () => {
    if (!deletingProduct) return;
    deleteMutation.mutate(deletingProduct.id);
  };

  const filteredProducts = filterCategory
    ? products.filter(p => p.category === filterCategory)
    : products;

  const activeCount = products.filter(p => p.isActive).length;
  const featuredCount = products.filter(p => p.isFeatured).length;
  const totalClicks = products.reduce((sum, p) => sum + p.clickCount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Vault Products</h2>
          <p className="text-sm text-muted-foreground">
            Manage affiliate products in the marketplace
          </p>
        </div>
        <Button onClick={handleOpenCreate} data-testid="button-add-product">
          <Plus className="w-4 h-4 mr-2" />
          Add Product
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Products</p>
          <p className="text-2xl font-bold">{products.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Active</p>
          <p className="text-2xl font-bold text-green-600">{activeCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Featured</p>
          <p className="text-2xl font-bold text-amber-600">{featuredCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">Total Clicks</p>
          <p className="text-2xl font-bold text-blue-600">{totalClicks}</p>
        </Card>
      </div>

      <div className="flex gap-2 items-center flex-wrap">
        <Label className="text-sm">Filter by category:</Label>
        <Button
          variant={filterCategory === null ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterCategory(null)}
          data-testid="button-filter-all"
        >
          All
        </Button>
        {VAULT_CATEGORIES.map((cat) => (
          <Button
            key={cat}
            variant={filterCategory === cat ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterCategory(cat)}
            data-testid={`button-filter-${cat.toLowerCase()}`}
          >
            {cat}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-center py-8 text-muted-foreground">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {filterCategory ? `No products in ${filterCategory} category` : "No products yet"}
          </p>
          <Button className="mt-4" onClick={handleOpenCreate} data-testid="button-add-first-product">
            <Plus className="w-4 h-4 mr-2" />
            Add Your First Product
          </Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="p-4">
              <div className="flex items-start gap-4">
                {product.imageUrl ? (
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-16 h-16 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center text-muted-foreground text-xs">
                    No image
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-medium truncate">{product.name}</h3>
                    {product.isFeatured && (
                      <Badge className="bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300">
                        <Star className="w-3 h-3 mr-1" />
                        Featured
                      </Badge>
                    )}
                    {!product.isActive && (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </div>
                  {product.brand && (
                    <p className="text-sm text-muted-foreground">{product.brand}</p>
                  )}
                  <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                    <span>{product.category}</span>
                    {product.price && <span>{product.price}</span>}
                    <span className="flex items-center gap-1">
                      <MousePointer className="w-3 h-3" />
                      {product.clickCount} clicks
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(product.affiliateUrl, '_blank')}
                    data-testid={`button-view-link-${product.id}`}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleOpenEdit(product)}
                    data-testid={`button-edit-product-${product.id}`}
                  >
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeletingProduct(product)}
                    data-testid={`button-delete-product-${product.id}`}
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Vault Product</DialogTitle>
            <DialogDescription>
              Add a new affiliate product to the marketplace
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleCreate}
            isPending={createMutation.isPending}
            submitLabel="Create Product"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>
              Update the product details
            </DialogDescription>
          </DialogHeader>
          <ProductForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleUpdate}
            isPending={updateMutation.isPending}
            submitLabel="Save Changes"
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingProduct} onOpenChange={(open) => !open && setDeletingProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deletingProduct?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface ProductFormProps {
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  onSubmit: () => void;
  isPending: boolean;
  submitLabel: string;
}

function ProductForm({ formData, setFormData, onSubmit, isPending, submitLabel }: ProductFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <Label htmlFor="name">Product Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Enter product name"
            data-testid="input-product-name"
          />
        </div>
        <div>
          <Label htmlFor="brand">Brand</Label>
          <Input
            id="brand"
            value={formData.brand}
            onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
            placeholder="Brand name"
            data-testid="input-product-brand"
          />
        </div>
        <div>
          <Label htmlFor="category">Category *</Label>
          <Select
            value={formData.category}
            onValueChange={(value) => setFormData({ ...formData, category: value })}
          >
            <SelectTrigger data-testid="select-product-category">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {VAULT_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            placeholder="$99.99"
            data-testid="input-product-price"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="affiliateUrl">Affiliate URL *</Label>
          <Input
            id="affiliateUrl"
            value={formData.affiliateUrl}
            onChange={(e) => setFormData({ ...formData, affiliateUrl: e.target.value })}
            placeholder="https://..."
            data-testid="input-product-affiliate-url"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://..."
            data-testid="input-product-image-url"
          />
        </div>
        <div className="col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="Product description..."
            className="resize-none"
            rows={3}
            data-testid="input-product-description"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="isFeatured">Featured Product</Label>
          <Switch
            id="isFeatured"
            checked={formData.isFeatured}
            onCheckedChange={(checked) => setFormData({ ...formData, isFeatured: checked })}
            data-testid="switch-product-featured"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="isActive">Active</Label>
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
            data-testid="switch-product-active"
          />
        </div>
      </div>
      <DialogFooter>
        <Button onClick={onSubmit} disabled={isPending} data-testid="button-submit-product">
          {isPending ? "Saving..." : submitLabel}
        </Button>
      </DialogFooter>
    </div>
  );
}
