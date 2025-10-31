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
      </div>
    </div>
  );
}
