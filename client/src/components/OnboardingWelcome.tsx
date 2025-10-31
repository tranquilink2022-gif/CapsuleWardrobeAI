import heroImage from "@assets/generated_images/Minimalist_capsule_wardrobe_hero_image_db99cb79.png";

interface OnboardingWelcomeProps {
  onStart: () => void;
}

export default function OnboardingWelcome({ onStart }: OnboardingWelcomeProps) {
  return (
    <div className="flex flex-col h-screen">
      <div className="relative h-[40vh] overflow-hidden">
        <img 
          src={heroImage} 
          alt="Minimalist wardrobe"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/40 to-black/20" />
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 text-white">
          <h1 className="font-serif text-5xl font-semibold mb-4" data-testid="text-welcome-title">
            Closana
          </h1>
          <p className="text-lg font-medium max-w-md" data-testid="text-welcome-subtitle">
            Build your perfect capsule wardrobe
          </p>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col px-6 py-12">
        <h2 className="font-serif text-3xl font-semibold text-foreground" data-testid="text-welcome-heading">
          Mindful Fashion, Simplified
        </h2>
      </div>
    </div>
  );
}
