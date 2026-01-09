import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Leaf } from "lucide-react";
import { useSubscription } from "@/hooks/use-subscription";
import { ETHICAL_SPONSORS, type Sponsor, type SponsorPlacement as PlacementType } from "@shared/sponsors";

interface SponsorGateProps {
  children: React.ReactNode;
}

export function SponsorGate({ children }: SponsorGateProps) {
  const { tier } = useSubscription();
  
  if (tier !== 'free') {
    return null;
  }
  
  return <>{children}</>;
}

interface SponsorCardProps {
  placement: PlacementType;
  index?: number;
  variant?: 'card' | 'banner' | 'inline';
}

export function SponsorCard({ placement, index = 0, variant = 'card' }: SponsorCardProps) {
  const [currentIndex, setCurrentIndex] = useState(() => 
    Math.floor(Math.random() * ETHICAL_SPONSORS.length)
  );
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % ETHICAL_SPONSORS.length);
    }, 8000);
    
    return () => clearInterval(interval);
  }, []);
  
  const sponsor = ETHICAL_SPONSORS[currentIndex];

  const handleClick = () => {
    window.open(sponsor.ctaUrl, '_blank', 'noopener,noreferrer');
  };

  if (variant === 'banner') {
    return (
      <div 
        className="bg-muted/50 border rounded-lg p-4 mb-4 transition-all duration-500"
        data-testid={`sponsor-banner-${placement}`}
        key={sponsor.id}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Leaf className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm truncate">{sponsor.name}</span>
                <Badge variant="outline" className="text-xs flex-shrink-0">Partner</Badge>
              </div>
              <p className="text-xs text-muted-foreground truncate">{sponsor.tagline}</p>
            </div>
          </div>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-shrink-0"
            onClick={handleClick}
            data-testid={`button-sponsor-${placement}-${sponsor.id}`}
          >
            {sponsor.ctaText}
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  if (variant === 'inline') {
    return (
      <div 
        className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg mb-4"
        data-testid={`sponsor-inline-${placement}`}
      >
        <Leaf className="w-4 h-4 text-primary flex-shrink-0" />
        <span className="text-sm text-muted-foreground flex-1">
          <span className="font-medium text-foreground">{sponsor.name}</span>
          {" — "}
          {sponsor.tagline}
        </span>
        <Button 
          size="sm" 
          variant="ghost"
          onClick={handleClick}
          data-testid={`button-sponsor-${placement}-${sponsor.id}`}
        >
          <ExternalLink className="w-3 h-3" />
        </Button>
      </div>
    );
  }

  return (
    <Card 
      className="overflow-hidden hover-elevate cursor-pointer"
      onClick={handleClick}
      data-testid={`card-sponsor-${placement}-${sponsor.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <Leaf className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold">{sponsor.name}</span>
              <Badge variant="outline" className="text-xs">Ethical Partner</Badge>
            </div>
            <p className="text-sm text-primary font-medium mb-1">{sponsor.tagline}</p>
            <p className="text-sm text-muted-foreground line-clamp-2">{sponsor.description}</p>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button size="sm" variant="outline" data-testid={`button-sponsor-cta-${sponsor.id}`}>
            {sponsor.ctaText}
            <ExternalLink className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SponsorPlacement({ placement, index, variant }: SponsorCardProps) {
  return (
    <SponsorGate>
      <SponsorCard placement={placement} index={index} variant={variant} />
    </SponsorGate>
  );
}
