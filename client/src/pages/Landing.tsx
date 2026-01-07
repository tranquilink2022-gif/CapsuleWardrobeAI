import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import heroImage from "@assets/generated_images/Minimalist_capsule_wardrobe_hero_image_db99cb79.png";
import ThemeToggle from "@/components/ThemeToggle";
import { Sparkles, Heart, Lightbulb, Palette, Calendar, Target } from "lucide-react";

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between p-4 absolute top-0 left-0 right-0 z-10">
        <h1 className="font-serif text-2xl font-semibold text-white">Closana</h1>
        <ThemeToggle />
      </header>
      
      <div className="relative h-[60vh] overflow-hidden">
        <img 
          src={heroImage} 
          alt="Thoughtfully curated wardrobe"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/50 to-black/30" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white">
          <h2 className="font-serif text-4xl md:text-5xl font-semibold mb-4">
            Your Wardrobe, Working for You
          </h2>
          <p className="text-lg md:text-xl font-light max-w-lg leading-relaxed">
            A mindful approach to building a closet that serves your life
          </p>
        </div>
      </div>

      <div className="flex-1 px-6 py-10 max-w-2xl mx-auto w-full space-y-12">
        
        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Lightbulb className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wide">What is a Capsule Wardrobe?</span>
          </div>
          <p className="text-lg text-foreground leading-relaxed">
            A capsule wardrobe is a curated collection of versatile pieces that work together seamlessly. 
            Instead of a closet full of clothes with "nothing to wear," you build a toolkit of items 
            that mix, match, and serve your actual life.
          </p>
          <p className="text-base text-muted-foreground leading-relaxed">
            Whether it's a seasonal rotation, travel essentials, work attire, or a jewelry collection — 
            each capsule is designed around <span className="text-foreground font-medium">your</span> lifestyle, 
            climate, and personal style.
          </p>
        </section>

        <div className="h-px bg-border" />

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <Heart className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wide">Our Philosophy</span>
          </div>
          
          <div className="space-y-4">
            <Card className="p-5">
              <h4 className="font-semibold text-foreground mb-2">Mindful, Not Minimal</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                This isn't about owning less for the sake of less. It's about owning pieces that 
                genuinely work for you. A hard-working basic, a statement piece, specialty gear — 
                every item should earn its place.
              </p>
            </Card>
            
            <Card className="p-5">
              <h4 className="font-semibold text-foreground mb-2">For Every Budget</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                A well-planned wardrobe isn't about luxury price tags. It's about making thoughtful 
                choices that maximize the investment you put into your closet — whatever that budget may be.
              </p>
            </Card>
            
            <Card className="p-5">
              <h4 className="font-semibold text-foreground mb-2">Anti-Impulse, Pro-Intention</h4>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We help you step back from trend cycles and impulse buys. Instead, curate colors, 
                fabrics, and pieces that collectively serve as a toolkit for your unique day-to-day.
              </p>
            </Card>
          </div>
        </section>

        <div className="h-px bg-border" />

        <section className="space-y-6">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="w-5 h-5" />
            <span className="text-sm font-medium uppercase tracking-wide">How Closana Helps</span>
          </div>
          
          <div className="grid gap-4">
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Target className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Personalized Capsules</h4>
                <p className="text-sm text-muted-foreground">
                  Build capsules around your season, climate, lifestyle, and style preferences
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Palette className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">AI-Powered Guidance</h4>
                <p className="text-sm text-muted-foreground">
                  Get smart fabric and color recommendations tailored to your capsule's purpose
                </p>
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Calendar className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h4 className="font-medium text-foreground">Outfit Inspiration</h4>
                <p className="text-sm text-muted-foreground">
                  Generate outfit combinations from your pieces and save your favorites
                </p>
              </div>
            </div>
          </div>
        </section>

        <div className="h-px bg-border" />

        <section className="space-y-4 pb-8">
          <p className="text-center text-muted-foreground text-sm">
            Ready to build a closet that works as hard as you do?
          </p>
          <Button 
            onClick={() => window.location.href = '/api/login'}
            className="w-full h-12 rounded-xl text-base font-semibold"
            data-testid="button-login"
          >
            Get Started
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Free to use. Sign in with your Replit account.
          </p>
        </section>
      </div>
    </div>
  );
}
