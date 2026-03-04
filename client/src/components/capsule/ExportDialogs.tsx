import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Copy, FileDown } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { exportCapsuleToPDF } from "@/lib/pdfExport";
import type { Capsule, Item } from "@shared/schema";

interface CapsuleExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  capsule: Capsule | undefined;
  capsuleId: string;
  items: Item[];
}

export function CapsuleExportDialog({
  open,
  onOpenChange,
  capsule,
  capsuleId,
  items,
}: CapsuleExportDialogProps) {
  const { toast } = useToast();
  const [includeMeasurements, setIncludeMeasurements] = useState(false);
  const [exportMethod, setExportMethod] = useState<'download' | 'share'>('download');
  const [shareLink, setShareLink] = useState<string | null>(null);

  const resetState = () => {
    setIncludeMeasurements(false);
    setExportMethod('download');
    setShareLink(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleConfirmExport = async () => {
    try {
      const queryParam = includeMeasurements ? '?includeMeasurements=true' : '';

      if (exportMethod === 'share') {
        const exportData = await apiRequest(`/api/capsules/${capsuleId}/export${queryParam}`, 'GET');

        const shareResponse = await apiRequest('/api/shared-exports', 'POST', {
          exportType: 'capsule',
          exportData,
        });

        const fullShareUrl = `${window.location.origin}${shareResponse.shareUrl}`;
        setShareLink(fullShareUrl);

        toast({
          title: "Shareable link created!",
          description: "You can now copy and share the link below",
        });
      } else {
        const response = await fetch(`/api/capsules/${capsuleId}/export${queryParam}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `capsule-${capsule?.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        handleOpenChange(false);

        toast({
          title: "Success",
          description: "Capsule exported successfully",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export capsule",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Capsule</DialogTitle>
          <DialogDescription>
            Choose how you want to share your capsule
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Export Method</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="download-method"
                  name="export-method"
                  checked={exportMethod === 'download'}
                  onChange={() => setExportMethod('download')}
                  className="w-4 h-4"
                  data-testid="radio-export-download"
                />
                <label htmlFor="download-method" className="text-sm font-medium cursor-pointer">
                  Download JSON
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="share-method"
                  name="export-method"
                  checked={exportMethod === 'share'}
                  onChange={() => setExportMethod('share')}
                  className="w-4 h-4"
                  data-testid="radio-export-share"
                />
                <label htmlFor="share-method" className="text-sm font-medium cursor-pointer">
                  Create shareable link
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="include-measurements-capsule"
              checked={includeMeasurements}
              onCheckedChange={(checked) => setIncludeMeasurements(checked === true)}
              data-testid="checkbox-include-measurements-capsule"
            />
            <label
              htmlFor="include-measurements-capsule"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include my measurements and sizes
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            This will add your body measurements and preferred clothing sizes to the export
          </p>

          {shareLink && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <Label>Shareable Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="flex-1"
                  data-testid="input-share-link"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(shareLink);
                    toast({
                      title: "Copied!",
                      description: "Share link copied to clipboard",
                    });
                  }}
                  data-testid="button-copy-share-link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view and save items from your capsule
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            data-testid="button-cancel-export-capsule"
          >
            {shareLink ? 'Close' : 'Cancel'}
          </Button>
          {!shareLink && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  if (capsule) {
                    exportCapsuleToPDF(
                      capsule,
                      items,
                      includeMeasurements ? (capsule as any).measurements : undefined,
                    );
                    handleOpenChange(false);
                    toast({
                      title: "Success",
                      description: "Capsule PDF exported successfully",
                    });
                  }
                }}
                data-testid="button-export-capsule-pdf"
              >
                <FileDown className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button
                onClick={handleConfirmExport}
                data-testid="button-confirm-export-capsule"
              >
                {exportMethod === 'download' ? 'Download JSON' : 'Create Link'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface ItemExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
}

export function ItemExportDialog({
  open,
  onOpenChange,
  item,
}: ItemExportDialogProps) {
  const { toast } = useToast();
  const [includeItemMeasurements, setIncludeItemMeasurements] = useState(false);
  const [itemExportMethod, setItemExportMethod] = useState<'download' | 'share'>('download');
  const [itemShareLink, setItemShareLink] = useState<string | null>(null);

  const resetState = () => {
    setIncludeItemMeasurements(false);
    setItemExportMethod('download');
    setItemShareLink(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleConfirmItemExport = async () => {
    if (!item) return;

    try {
      const queryParam = includeItemMeasurements ? '?includeMeasurements=true' : '';

      if (itemExportMethod === 'download') {
        const response = await fetch(`/api/items/${item.id}/export${queryParam}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `item-${item.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        handleOpenChange(false);

        toast({
          title: "Success",
          description: "Item exported successfully",
        });
      } else {
        const exportData = await apiRequest(`/api/items/${item.id}/export${queryParam}`, 'GET');

        const shareResponse = await apiRequest('/api/shared-exports', 'POST', {
          exportType: 'item',
          exportData,
        });

        const fullShareUrl = `${window.location.origin}${shareResponse.shareUrl}`;
        setItemShareLink(fullShareUrl);

        toast({
          title: "Shareable link created!",
          description: "You can now copy and share the link below",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${itemExportMethod === 'download' ? 'export' : 'create share link for'} item`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Item</DialogTitle>
          <DialogDescription>
            Choose how you want to share this item
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Export Method</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="item-download-method"
                  name="item-export-method"
                  checked={itemExportMethod === 'download'}
                  onChange={() => setItemExportMethod('download')}
                  className="w-4 h-4"
                  data-testid="radio-item-export-download"
                />
                <label htmlFor="item-download-method" className="text-sm font-medium cursor-pointer">
                  Download JSON
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="item-share-method"
                  name="item-export-method"
                  checked={itemExportMethod === 'share'}
                  onChange={() => setItemExportMethod('share')}
                  className="w-4 h-4"
                  data-testid="radio-item-export-share"
                />
                <label htmlFor="item-share-method" className="text-sm font-medium cursor-pointer">
                  Create shareable link
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="item-include-measurements"
              checked={includeItemMeasurements}
              onCheckedChange={(checked) => setIncludeItemMeasurements(checked === true)}
              data-testid="checkbox-item-include-measurements"
            />
            <label
              htmlFor="item-include-measurements"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include my measurements and sizes
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            This will add your body measurements and preferred clothing sizes to the export
          </p>

          {itemShareLink && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <Label>Shareable Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={itemShareLink}
                  readOnly
                  className="flex-1"
                  data-testid="input-item-share-link"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(itemShareLink);
                    toast({
                      title: "Copied!",
                      description: "Share link copied to clipboard",
                    });
                  }}
                  data-testid="button-copy-item-share-link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view and save this item
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            data-testid="button-cancel-export-item"
          >
            {itemShareLink ? 'Close' : 'Cancel'}
          </Button>
          {!itemShareLink && (
            <Button
              onClick={handleConfirmItemExport}
              data-testid="button-confirm-export-item"
            >
              {itemExportMethod === 'download' ? 'Download JSON' : 'Create Link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface OutfitPairingData {
  id: string;
  outfitData: {
    name: string;
    occasion: string;
    items: string[];
  };
}

interface OutfitExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  outfit: OutfitPairingData | null;
}

export function OutfitExportDialog({
  open,
  onOpenChange,
  outfit,
}: OutfitExportDialogProps) {
  const { toast } = useToast();
  const [includeOutfitMeasurements, setIncludeOutfitMeasurements] = useState(false);
  const [outfitExportMethod, setOutfitExportMethod] = useState<'download' | 'share'>('download');
  const [outfitShareLink, setOutfitShareLink] = useState<string | null>(null);

  const resetState = () => {
    setIncludeOutfitMeasurements(false);
    setOutfitExportMethod('download');
    setOutfitShareLink(null);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      resetState();
    }
  };

  const handleConfirmOutfitExport = async () => {
    if (!outfit) return;

    try {
      const queryParam = includeOutfitMeasurements ? '?includeMeasurements=true' : '';

      if (outfitExportMethod === 'download') {
        const response = await fetch(`/api/outfit-pairings/${outfit.id}/export${queryParam}`, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Export failed');
        }

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `outfit-${outfit.outfitData.name.replace(/[^a-z0-9]/gi, '-').toLowerCase()}.json`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        handleOpenChange(false);

        toast({
          title: "Success",
          description: "Outfit exported successfully",
        });
      } else {
        const exportData = await apiRequest(`/api/outfit-pairings/${outfit.id}/export${queryParam}`, 'GET');

        const shareResponse = await apiRequest('/api/shared-exports', 'POST', {
          exportType: 'outfit',
          exportData,
        });

        const fullShareUrl = `${window.location.origin}${shareResponse.shareUrl}`;
        setOutfitShareLink(fullShareUrl);

        toast({
          title: "Shareable link created!",
          description: "You can now copy and share the link below",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: `Failed to ${outfitExportMethod === 'download' ? 'export' : 'create share link for'} outfit`,
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export Outfit</DialogTitle>
          <DialogDescription>
            Choose how you want to share this outfit
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Export Method</Label>
            <div className="flex gap-4">
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="outfit-download-method"
                  name="outfit-export-method"
                  checked={outfitExportMethod === 'download'}
                  onChange={() => setOutfitExportMethod('download')}
                  className="w-4 h-4"
                  data-testid="radio-outfit-export-download"
                />
                <label htmlFor="outfit-download-method" className="text-sm font-medium cursor-pointer">
                  Download JSON
                </label>
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="radio"
                  id="outfit-share-method"
                  name="outfit-export-method"
                  checked={outfitExportMethod === 'share'}
                  onChange={() => setOutfitExportMethod('share')}
                  className="w-4 h-4"
                  data-testid="radio-outfit-export-share"
                />
                <label htmlFor="outfit-share-method" className="text-sm font-medium cursor-pointer">
                  Create shareable link
                </label>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="outfit-include-measurements"
              checked={includeOutfitMeasurements}
              onCheckedChange={(checked) => setIncludeOutfitMeasurements(checked === true)}
              data-testid="checkbox-outfit-include-measurements"
            />
            <label
              htmlFor="outfit-include-measurements"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Include my measurements and sizes
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            This will add your body measurements and preferred clothing sizes to the export
          </p>

          {outfitShareLink && (
            <div className="space-y-2 p-3 bg-muted rounded-md">
              <Label>Shareable Link</Label>
              <div className="flex items-center gap-2">
                <Input
                  value={outfitShareLink}
                  readOnly
                  className="flex-1"
                  data-testid="input-outfit-share-link"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    navigator.clipboard.writeText(outfitShareLink);
                    toast({
                      title: "Copied!",
                      description: "Share link copied to clipboard",
                    });
                  }}
                  data-testid="button-copy-outfit-share-link"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Anyone with this link can view and save this outfit
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => handleOpenChange(false)}
            data-testid="button-cancel-export-outfit"
          >
            {outfitShareLink ? 'Close' : 'Cancel'}
          </Button>
          {!outfitShareLink && (
            <Button
              onClick={handleConfirmOutfitExport}
              data-testid="button-confirm-export-outfit"
            >
              {outfitExportMethod === 'download' ? 'Download JSON' : 'Create Link'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
