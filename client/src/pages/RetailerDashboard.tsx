import { useQuery } from "@tanstack/react-query";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ArrowLeft, 
  BarChart3, 
  Package, 
  Megaphone, 
  Eye, 
  MousePointer, 
  TrendingUp, 
  DollarSign,
  ShoppingCart,
  Percent,
  Calendar,
  ExternalLink,
  Store
} from "lucide-react";

interface RetailerAnalytics {
  id: string;
  businessName: string;
  status: string;
  revenueSharePercent: number;
  productCount: number;
  impressions: number;
  clicks: number;
  conversions: number;
  ctr: string;
  conversionRate: string;
  totalRevenue: number;
  retailerRevenue: number;
  lifetimeClicks: number;
  lifetimeConversions: number;
  lifetimeRevenue: number;
  joinedAt: string;
}

interface RetailerProduct {
  id: string;
  name: string;
  brand: string | null;
  price: number | null;
  imageUrl: string | null;
  isActive: boolean;
  categories: string[];
}

interface RetailerAd {
  id: string;
  title: string;
  placement: string;
  isActive: boolean;
  impressions: number;
  clicks: number;
  startDate: string | null;
  endDate: string | null;
}

interface RetailerDashboardProps {
  isPreview?: boolean;
  previewRetailerId?: string;
  onBack?: () => void;
}

export default function RetailerDashboard({ isPreview = false, previewRetailerId, onBack }: RetailerDashboardProps) {
  const [, navigate] = useLocation();
  const params = useParams<{ retailerId?: string }>();
  const retailerId = previewRetailerId || params.retailerId;

  // Use different endpoints based on whether this is admin preview or retailer view
  const analyticsEndpoint = isPreview && retailerId 
    ? `/api/admin/retailer-analytics/${retailerId}`
    : '/api/retailer/analytics';
  
  const productsEndpoint = isPreview && retailerId
    ? `/api/admin/retailers/${retailerId}/products`
    : '/api/retailer/products';
  
  const adsEndpoint = isPreview && retailerId
    ? `/api/admin/retailers/${retailerId}/ads`
    : '/api/retailer/ads';

  const { data: analytics, isLoading: analyticsLoading } = useQuery<RetailerAnalytics>({
    queryKey: [analyticsEndpoint],
  });

  const { data: products = [], isLoading: productsLoading } = useQuery<RetailerProduct[]>({
    queryKey: [productsEndpoint],
  });

  const { data: ads = [], isLoading: adsLoading } = useQuery<RetailerAd[]>({
    queryKey: [adsEndpoint],
  });

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate('/');
    }
  };

  const formatCurrency = (cents: number) => {
    return `$${(cents / 100).toFixed(2)}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={handleBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2 flex-1">
          <Store className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">
            {isPreview ? 'Retailer Preview' : 'Retailer Dashboard'}
          </h1>
        </div>
        {isPreview && (
          <Badge variant="secondary" data-testid="badge-preview-mode">
            Admin Preview
          </Badge>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Business Name Header */}
        {analytics && (
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold" data-testid="text-business-name">
                {analytics.businessName}
              </h2>
              <p className="text-sm text-muted-foreground">
                Partner since {formatDate(analytics.joinedAt)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={analytics.status === 'active' ? 'default' : 'secondary'}>
                {analytics.status}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                {analytics.revenueSharePercent}% revenue share
              </Badge>
            </div>
          </div>
        )}

        {/* Key Metrics - Last 30 Days */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Last 30 Days Performance
            </CardTitle>
            <CardDescription>
              Key metrics to share with your team
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analyticsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : analytics ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <Eye className="h-3 w-3" />
                    <span>Impressions</span>
                  </div>
                  <p className="text-2xl font-bold" data-testid="text-impressions">
                    {analytics.impressions.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <MousePointer className="h-3 w-3" />
                    <span>Clicks</span>
                  </div>
                  <p className="text-2xl font-bold" data-testid="text-clicks">
                    {analytics.clicks.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <ShoppingCart className="h-3 w-3" />
                    <span>Conversions</span>
                  </div>
                  <p className="text-2xl font-bold" data-testid="text-conversions">
                    {analytics.conversions.toLocaleString()}
                  </p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                    <DollarSign className="h-3 w-3" />
                    <span>Your Revenue</span>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400" data-testid="text-revenue">
                    {formatCurrency(analytics.retailerRevenue)}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Performance Rates */}
        {analytics && (
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <TrendingUp className="h-3 w-3" />
                  <span>Click-Through Rate</span>
                </div>
                <p className="text-3xl font-bold text-primary" data-testid="text-ctr">
                  {analytics.ctr}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Industry avg: 1-2%
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                  <ShoppingCart className="h-3 w-3" />
                  <span>Conversion Rate</span>
                </div>
                <p className="text-3xl font-bold text-primary" data-testid="text-conversion-rate">
                  {analytics.conversionRate}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Industry avg: 2-3%
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Lifetime Stats */}
        {analytics && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Lifetime Performance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold">{analytics.lifetimeClicks.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Clicks</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">{analytics.lifetimeConversions.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Total Conversions</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {formatCurrency(Math.round(analytics.lifetimeRevenue * (analytics.revenueSharePercent / 100)))}
                  </p>
                  <p className="text-xs text-muted-foreground">Total Earnings</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Tabs for Products and Ads */}
        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products ({products.length})
            </TabsTrigger>
            <TabsTrigger value="ads" className="flex items-center gap-2">
              <Megaphone className="h-4 w-4" />
              Ads ({ads.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="mt-4 space-y-3">
            {productsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : products.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No products synced yet</p>
                  <p className="text-sm text-muted-foreground">Connect your store to sync products</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {products.map((product) => (
                  <Card key={product.id} data-testid={`card-product-${product.id}`}>
                    <CardContent className="p-4 flex items-center gap-4">
                      {product.imageUrl ? (
                        <img 
                          src={product.imageUrl} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-md"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-muted rounded-md flex items-center justify-center">
                          <Package className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium truncate">{product.name}</p>
                          <Badge variant={product.isActive ? "default" : "secondary"} className="flex-shrink-0">
                            {product.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </div>
                        {product.brand && (
                          <p className="text-sm text-muted-foreground">{product.brand}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          {product.price && (
                            <span className="text-sm font-medium">{formatCurrency(product.price)}</span>
                          )}
                          {product.categories.length > 0 && (
                            <span className="text-xs text-muted-foreground">
                              {product.categories.slice(0, 2).join(', ')}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="ads" className="mt-4 space-y-3">
            {adsLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : ads.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Megaphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No active ad campaigns</p>
                  <p className="text-sm text-muted-foreground">Contact us to set up ad placements</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {ads.map((ad) => (
                  <Card key={ad.id} data-testid={`card-ad-${ad.id}`}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{ad.title}</p>
                            <Badge variant={ad.isActive ? "default" : "secondary"}>
                              {ad.isActive ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground capitalize mt-1">
                            Placement: {ad.placement.replace('_', ' ')}
                          </p>
                          {(ad.startDate || ad.endDate) && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {ad.startDate && formatDate(ad.startDate)}
                              {ad.startDate && ad.endDate && ' - '}
                              {ad.endDate && formatDate(ad.endDate)}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold">{ad.impressions.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">impressions</p>
                          <p className="text-sm font-medium text-primary mt-1">{ad.clicks} clicks</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
