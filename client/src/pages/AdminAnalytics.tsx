import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BarChart3, MousePointer, Eye, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ETHICAL_SPONSORS } from "@shared/sponsors";

interface SponsorAnalyticsData {
  sponsorId: string;
  impressions: number;
  clicks: number;
}

interface AdminAnalyticsProps {
  onBack: () => void;
}

export default function AdminAnalytics({ onBack }: AdminAnalyticsProps) {
  const { data: analytics = [], isLoading } = useQuery<SponsorAnalyticsData[]>({
    queryKey: ['/api/sponsor-analytics'],
  });

  const getSponsorName = (sponsorId: string) => {
    const sponsor = ETHICAL_SPONSORS.find(s => s.id === sponsorId);
    return sponsor?.name || sponsorId;
  };

  const getSponsorCommission = (sponsorId: string) => {
    const sponsor = ETHICAL_SPONSORS.find(s => s.id === sponsorId);
    return sponsor?.commissionRate || 'N/A';
  };

  const calculateCTR = (impressions: number, clicks: number) => {
    if (impressions === 0) return '0.00';
    return ((clicks / impressions) * 100).toFixed(2);
  };

  const totalImpressions = analytics.reduce((sum, item) => sum + item.impressions, 0);
  const totalClicks = analytics.reduce((sum, item) => sum + item.clicks, 0);
  const overallCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';

  const analyticsWithAllSponsors = ETHICAL_SPONSORS.map(sponsor => {
    const data = analytics.find(a => a.sponsorId === sponsor.id);
    return {
      sponsorId: sponsor.id,
      impressions: data?.impressions || 0,
      clicks: data?.clicks || 0,
    };
  });

  return (
    <div className="flex flex-col min-h-screen bg-background pb-24">
      <div className="sticky top-0 z-10 bg-background border-b px-4 py-3 flex items-center gap-3">
        <Button 
          variant="ghost" 
          size="icon"
          onClick={onBack}
          data-testid="button-back"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <h1 className="text-lg font-semibold">Sponsor Analytics</h1>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <Eye className="h-3 w-3" />
                <span>Impressions</span>
              </div>
              <p className="text-xl font-bold" data-testid="text-total-impressions">
                {isLoading ? '...' : totalImpressions.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <MousePointer className="h-3 w-3" />
                <span>Clicks</span>
              </div>
              <p className="text-xl font-bold" data-testid="text-total-clicks">
                {isLoading ? '...' : totalClicks.toLocaleString()}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                <TrendingUp className="h-3 w-3" />
                <span>CTR</span>
              </div>
              <p className="text-xl font-bold" data-testid="text-overall-ctr">
                {isLoading ? '...' : `${overallCTR}%`}
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Sponsor Performance (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {analyticsWithAllSponsors.map((item) => (
                  <div
                    key={item.sponsorId}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                    data-testid={`row-sponsor-${item.sponsorId}`}
                  >
                    <div className="flex-1">
                      <p className="font-medium text-sm">{getSponsorName(item.sponsorId)}</p>
                      <p className="text-xs text-muted-foreground">
                        Commission: {getSponsorCommission(item.sponsorId)}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-right">
                      <div>
                        <p className="text-xs text-muted-foreground">Impressions</p>
                        <p className="font-medium text-sm">{item.impressions.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Clicks</p>
                        <p className="font-medium text-sm">{item.clicks.toLocaleString()}</p>
                      </div>
                      <div className="min-w-[50px]">
                        <p className="text-xs text-muted-foreground">CTR</p>
                        <p className="font-medium text-sm text-primary">
                          {calculateCTR(item.impressions, item.clicks)}%
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Partner Brands</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Closana partners with ethical and sustainable fashion brands. Each impression and click
              generates revenue through affiliate commissions.
            </p>
            <div className="flex flex-wrap gap-2">
              {ETHICAL_SPONSORS.map((sponsor) => (
                <div
                  key={sponsor.id}
                  className="px-3 py-1.5 bg-muted rounded-full text-xs font-medium"
                >
                  {sponsor.name}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
