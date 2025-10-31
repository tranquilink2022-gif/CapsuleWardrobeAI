import { Button } from "@/components/ui/button";
import heroImage from "@assets/generated_images/Minimalist_capsule_wardrobe_hero_image_db99cb79.png";
import ThemeToggle from "@/components/ThemeToggle";

export default function Landing() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between p-4">
        <h1 className="font-serif text-2xl font-semibold">Closana</h1>
        <ThemeToggle />
      </header>
      
      <div className="flex-1 flex flex-col">
        <div className="relative h-[50vh] overflow-hidden">
          <img 
            src={heroImage} 
            alt="Minimalist wardrobe"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white">
            <h2 className="font-serif text-5xl font-semibold mb-4">
              Closana
            </h2>
            <p className="text-lg font-medium max-w-md">
              Your mindful wardrobe planner
            </p>
          </div>
        </div>
        
        <div className="flex-1 flex flex-col justify-between px-6 py-12 max-w-2xl mx-auto w-full">
          <div className="space-y-6">
            <h3 className="font-serif text-3xl font-semibold text-foreground">
              Build Your Perfect Capsule Wardrobe
            </h3>
            <p className="text-base text-muted-foreground leading-relaxed">
              Create thoughtful wardrobes tailored to your lifestyle and environment. Get personalized recommendations for fabrics, colors, and outfit combinations powered by AI.
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-foreground">Smart recommendations based on season, climate, and style</p>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-foreground">AI-powered outfit suggestions</p>
              </div>
              <div className="flex gap-3">
                <div className="w-2 h-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                <p className="text-foreground">Shopping list management</p>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={() => window.location.href = '/api/login'}
              className="w-full h-12 rounded-xl text-base font-semibold"
              data-testid="button-login"
            >
              Sign In to Get Started
            </Button>
            <p className="text-xs text-center text-muted-foreground">
              Sign in with Google, GitHub, or email
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
