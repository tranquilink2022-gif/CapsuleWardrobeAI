import { useState } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Store, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const ECOMMERCE_PLATFORMS = [
  { value: "shopify", label: "Shopify" },
  { value: "woocommerce", label: "WooCommerce" },
  { value: "bigcommerce", label: "BigCommerce" },
  { value: "magento", label: "Magento" },
  { value: "custom", label: "Custom Platform" },
  { value: "other", label: "Other" },
];

export default function RetailerApply() {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({
    businessName: "",
    contactEmail: "",
    contactName: "",
    website: "",
    description: "",
    brandAlignment: "",
    ecommercePlatform: "",
    expectedProductCount: "",
  });

  const submitMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      return apiRequest("/api/retailer-applications", "POST", {
        ...data,
        expectedProductCount: data.expectedProductCount ? parseInt(data.expectedProductCount) : undefined,
      });
    },
    onSuccess: () => {
      setSubmitted(true);
      toast({ title: "Application submitted!", description: "We'll review your application and get back to you soon." });
    },
    onError: () => {
      toast({ title: "Failed to submit application", variant: "destructive" });
    },
  });

  if (submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="pt-8 pb-8 text-center space-y-4">
            <CheckCircle className="w-16 h-16 mx-auto text-green-500" />
            <h2 className="text-2xl font-semibold">Application Submitted!</h2>
            <p className="text-muted-foreground">
              Thank you for your interest in partnering with Closana. We'll review your application and get back to you within 2-3 business days.
            </p>
            <Button onClick={() => navigate("/")} data-testid="button-back-home">
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate("/")}
            data-testid="button-back"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">Become a Retailer Partner</h1>
            <p className="text-sm text-muted-foreground">Join Closana's curated retailer network</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Store className="w-5 h-5" />
              Retailer Application
            </CardTitle>
            <CardDescription>
              Feature your products in our Vault and reach fashion-conscious customers. 
              We offer a revenue-share model with no upfront costs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={form.businessName}
                onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                placeholder="Your company name"
                data-testid="input-business-name"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                  placeholder="contact@example.com"
                  data-testid="input-contact-email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contactName">Contact Name</Label>
                <Input
                  id="contactName"
                  value={form.contactName}
                  onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                  placeholder="Jane Smith"
                  data-testid="input-contact-name"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                placeholder="https://yourstore.com"
                data-testid="input-website"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ecommercePlatform">E-commerce Platform</Label>
                <Select
                  value={form.ecommercePlatform}
                  onValueChange={(value) => setForm({ ...form, ecommercePlatform: value })}
                >
                  <SelectTrigger data-testid="select-platform">
                    <SelectValue placeholder="Select platform" />
                  </SelectTrigger>
                  <SelectContent>
                    {ECOMMERCE_PLATFORMS.map((platform) => (
                      <SelectItem key={platform.value} value={platform.value}>
                        {platform.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedProductCount">Expected Product Count</Label>
                <Input
                  id="expectedProductCount"
                  type="number"
                  value={form.expectedProductCount}
                  onChange={(e) => setForm({ ...form, expectedProductCount: e.target.value })}
                  placeholder="100"
                  data-testid="input-product-count"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Tell us about your business</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Describe your brand, product categories, and why you'd be a great fit for Closana..."
                rows={4}
                data-testid="input-description"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandAlignment">How does your brand align with mindful, sustainable and/or quality wardrobe planning? *</Label>
              <Textarea
                id="brandAlignment"
                value={form.brandAlignment}
                onChange={(e) => setForm({ ...form, brandAlignment: e.target.value })}
                placeholder="Tell us about your commitment to quality, sustainability, timeless design, or how your products help customers build intentional wardrobes..."
                rows={4}
                data-testid="input-brand-alignment"
              />
              <p className="text-xs text-muted-foreground">
                Closana focuses on helping users curate capsule wardrobes with versatile, quality pieces. 
                We're looking for partners who share our values of mindful consumption and lasting style.
              </p>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium">How it works</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">1.</span>
                  <span>Submit your application - we'll review within 2-3 business days</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">2.</span>
                  <span>Once approved, connect your store and sync your products</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">3.</span>
                  <span>Your products appear in our Vault for users to discover</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="mt-0.5">4.</span>
                  <span>Earn revenue through clicks and conversions - negotiable rates</span>
                </li>
              </ul>
            </div>

            <Button
              className="w-full"
              onClick={() => submitMutation.mutate(form)}
              disabled={!form.businessName || !form.contactEmail || !form.brandAlignment || submitMutation.isPending}
              data-testid="button-submit-application"
            >
              {submitMutation.isPending ? "Submitting..." : "Submit Application"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
