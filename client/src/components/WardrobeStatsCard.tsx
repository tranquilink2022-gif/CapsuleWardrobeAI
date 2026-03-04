import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart3, AlertCircle } from "lucide-react";

interface WardrobeStatsCardProps {
  limitDisplay: string;
  maxItemsPerWardrobe: number;
  currentCount: number;
  progressPercent: number;
  categoryBreakdown: [string, number][];
  unassignedCount: number;
}

export default function WardrobeStatsCard({
  limitDisplay,
  maxItemsPerWardrobe,
  currentCount,
  progressPercent,
  categoryBreakdown,
  unassignedCount,
}: WardrobeStatsCardProps) {
  return (
    <Card data-testid="card-wardrobe-stats">
      <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2 p-4">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-muted-foreground" />
          Wardrobe Overview
        </CardTitle>
        <Badge variant="secondary" data-testid="badge-stats-item-count">
          {limitDisplay}
        </Badge>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-3">
        {maxItemsPerWardrobe !== -1 && (
          <div data-testid="stats-progress-bar">
            <Progress value={progressPercent} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {currentCount} of {maxItemsPerWardrobe} items used
            </p>
          </div>
        )}
        <div className="flex flex-wrap gap-1" data-testid="stats-category-breakdown">
          {categoryBreakdown.map(([category, count]) => (
            <Badge
              key={category}
              variant="outline"
              className="text-xs no-default-hover-elevate"
              data-testid={`badge-stat-category-${category}`}
            >
              {count} {category}
            </Badge>
          ))}
        </div>
        {unassignedCount > 0 && (
          <div
            className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2"
            data-testid="stats-unassigned-callout"
          >
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            <span>
              {unassignedCount} item{unassignedCount !== 1 ? "s" : ""} not in any capsule
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
