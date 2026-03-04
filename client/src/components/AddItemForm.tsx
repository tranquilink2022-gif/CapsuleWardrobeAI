import { useEffect, useRef, useState, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Badge } from "@/components/ui/badge";
import { Camera, Loader2, ScanLine, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import type { ItemCategory } from "@shared/schema";

interface AddItemFormProps {
  formData: {
    category: string;
    name: string;
    color: string;
    size: string;
    material: string;
    washInstructions: string;
    description: string;
    imageUrl: string;
    productLink: string;
  };
  onChange: (field: string, value: string) => void;
  displayCategories: readonly ItemCategory[];
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onUploadComplete: (result: any) => void;
}

interface ScanResult {
  name: string;
  brand: string;
  material: string;
  color: string;
  size: string;
  washInstructions: string;
  description: string;
  category: string;
}

export function AddItemForm({ 
  formData, 
  onChange, 
  displayCategories,
  onGetUploadParameters,
  onUploadComplete 
}: AddItemFormProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanPreview, setScanPreview] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);


  const handleTagPhotoCapture = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file",
        description: "Please select an image file",
        variant: "destructive",
      });
      return;
    }

    if (file.size > 7.5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please use an image smaller than 7.5MB",
        variant: "destructive",
      });
      return;
    }

    setIsScanning(true);
    setScanResult(null);

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      setScanPreview(base64);

      const result = await apiRequest('/api/scan-clothing-tag', 'POST', {
        imageBase64: base64,
      });

      setScanResult(result as ScanResult);

      const fieldsToFill: Array<{ key: string; value: string; label: string }> = [];

      if (result.name && !formData.name) {
        fieldsToFill.push({ key: 'name', value: result.name, label: 'Name' });
      }
      if (result.material && !formData.material) {
        fieldsToFill.push({ key: 'material', value: result.material, label: 'Material' });
      }
      if (result.color && !formData.color) {
        fieldsToFill.push({ key: 'color', value: result.color, label: 'Color' });
      }
      if (result.size && !formData.size) {
        fieldsToFill.push({ key: 'size', value: result.size, label: 'Size' });
      }
      if (result.washInstructions && !formData.washInstructions) {
        fieldsToFill.push({ key: 'washInstructions', value: result.washInstructions, label: 'Care Instructions' });
      }
      if (result.category && !formData.category) {
        const matchedCategory = displayCategories.find(
          cat => cat.toLowerCase() === result.category.toLowerCase()
        );
        if (matchedCategory) {
          fieldsToFill.push({ key: 'category', value: matchedCategory, label: 'Category' });
        }
      }

      const descParts: string[] = [];
      if (result.brand) descParts.push(`Brand: ${result.brand}`);
      if (result.description) descParts.push(result.description);
      const descValue = descParts.join('. ');
      if (descValue && !formData.description) {
        fieldsToFill.push({ key: 'description', value: descValue, label: 'Description' });
      }

      for (const field of fieldsToFill) {
        onChange(field.key, field.value);
      }

      const filledCount = fieldsToFill.length;
      toast({
        title: "Tag scanned successfully",
        description: filledCount > 0 
          ? `Auto-filled ${filledCount} field${filledCount > 1 ? 's' : ''} from the tag` 
          : "Tag analyzed but no new fields to fill (existing values kept)",
      });

    } catch (error: any) {
      console.error("Tag scan error:", error);
      toast({
        title: "Scan failed",
        description: error.message || "Could not read the clothing tag. Try a clearer photo.",
        variant: "destructive",
      });
      setScanPreview(null);
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }, [formData, onChange, displayCategories, toast]);

  const applyScanField = useCallback((key: string, value: string) => {
    onChange(key, value);
    toast({ title: "Field updated", description: `${key} set to "${value}"` });
  }, [onChange, toast]);

  const dismissScan = useCallback(() => {
    setScanPreview(null);
    setScanResult(null);
  }, []);

  return (
    <div className="space-y-4 pb-2">
      <Card className="p-3 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <ScanLine className="w-4 h-4" />
            <span className="text-sm font-medium">Scan Clothing Tag</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isScanning}
            data-testid="button-scan-tag"
          >
            {isScanning ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Scanning...
              </>
            ) : (
              <>
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </>
            )}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleTagPhotoCapture}
            data-testid="input-tag-photo"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Photograph a clothing tag to auto-fill material, size, care instructions, and more
        </p>

        {scanPreview && (
          <div className="space-y-2">
            <div className="flex items-start gap-3">
              <img 
                src={scanPreview} 
                alt="Tag preview" 
                className="w-16 h-16 object-cover rounded-md flex-shrink-0"
                data-testid="image-tag-preview"
              />
              <div className="flex-1 min-w-0">
                {isScanning && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Analyzing tag...
                  </div>
                )}
                {scanResult && !isScanning && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className="text-xs font-medium flex items-center gap-1">
                        <Check className="w-3 h-3" />
                        Tag analyzed
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={dismissScan}
                        data-testid="button-dismiss-scan"
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {scanResult.brand && (
                        <Badge
                          variant="secondary"
                          className="cursor-pointer text-xs"
                          onClick={() => {
                            const current = formData.description;
                            const brandText = `Brand: ${scanResult.brand}`;
                            if (!current.includes(brandText)) {
                              applyScanField('description', current ? `${current}. ${brandText}` : brandText);
                            }
                          }}
                          data-testid="tag-brand"
                        >
                          {scanResult.brand}
                        </Badge>
                      )}
                      {scanResult.material && formData.material !== scanResult.material && (
                        <Badge
                          variant="secondary"
                          className="cursor-pointer text-xs"
                          onClick={() => applyScanField('material', scanResult.material)}
                          data-testid="tag-material"
                        >
                          {scanResult.material}
                        </Badge>
                      )}
                      {scanResult.size && formData.size !== scanResult.size && (
                        <Badge
                          variant="secondary"
                          className="cursor-pointer text-xs"
                          onClick={() => applyScanField('size', scanResult.size)}
                          data-testid="tag-size"
                        >
                          {scanResult.size}
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </Card>

      <div>
        <Label htmlFor="category">Category*</Label>
        <Select
          value={formData.category}
          onValueChange={(value) => onChange('category', value)}
        >
          <SelectTrigger id="category" data-testid="select-category">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {displayCategories.map((cat) => (
              <SelectItem key={cat} value={cat} data-testid={`option-category-${cat.toLowerCase()}`}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label htmlFor="name">Name*</Label>
        <Input
          id="name"
          data-testid="input-item-name"
          value={formData.name}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="e.g., White T-Shirt"
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            data-testid="input-item-color"
            value={formData.color}
            onChange={(e) => onChange('color', e.target.value)}
            placeholder="Navy Blue"
          />
        </div>
        <div>
          <Label htmlFor="size">Size</Label>
          <Input
            id="size"
            data-testid="input-item-size"
            value={formData.size}
            onChange={(e) => onChange('size', e.target.value)}
            placeholder="M, 32W, 8.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="material">Material</Label>
        <Input
          id="material"
          data-testid="input-item-material"
          value={formData.material}
          onChange={(e) => onChange('material', e.target.value)}
          placeholder="100% Cotton"
        />
      </div>
      <div>
        <Label htmlFor="wash-instructions">Care Instructions</Label>
        <Input
          id="wash-instructions"
          data-testid="input-item-wash-instructions"
          value={formData.washInstructions}
          onChange={(e) => onChange('washInstructions', e.target.value)}
          placeholder="Machine wash cold"
        />
      </div>
      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          data-testid="input-item-description"
          value={formData.description}
          onChange={(e) => onChange('description', e.target.value)}
          placeholder="Add details about this item"
          rows={3}
        />
      </div>
      <div>
        <Label htmlFor="productLink">Product Link</Label>
        <Input
          id="productLink"
          data-testid="input-item-product-link"
          value={formData.productLink}
          onChange={(e) => onChange('productLink', e.target.value)}
          placeholder="https://..."
        />
      </div>
      <div>
        <Label>Photo</Label>
        <div className="mt-1">
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={10485760}
            onGetUploadParameters={onGetUploadParameters}
            onComplete={onUploadComplete}
          />
        </div>
        {formData.imageUrl && (
          <div className="mt-2">
            <img 
              src={formData.imageUrl} 
              alt="Preview" 
              className="w-24 h-24 object-cover rounded-md"
              data-testid="image-preview-new-item"
            />
          </div>
        )}
      </div>
    </div>
  );
}
