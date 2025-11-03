import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ObjectUploader } from "@/components/ObjectUploader";
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

export function AddItemForm({ 
  formData, 
  onChange, 
  displayCategories,
  onGetUploadParameters,
  onUploadComplete 
}: AddItemFormProps) {
  return (
    <div className="space-y-4 pb-2">
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
        <Label htmlFor="imageUrl">Photo URL</Label>
        <Input
          id="imageUrl"
          data-testid="input-item-image-url"
          value={formData.imageUrl}
          onChange={(e) => onChange('imageUrl', e.target.value)}
          placeholder="Paste image URL here"
        />
        <div className="mt-2 text-center" aria-hidden="true" style={{ pointerEvents: 'auto' }}>
          <ObjectUploader
            maxNumberOfFiles={1}
            maxFileSize={10485760}
            onGetUploadParameters={onGetUploadParameters}
            onComplete={onUploadComplete}
            buttonClassName=""
          >
            or upload from device
          </ObjectUploader>
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
