import { Home, ShoppingBag, Sparkles, User, Gem, Shirt } from "lucide-react";
import { useLocation } from "wouter";

const tabs = [
  { id: 'capsules', path: '/capsules', label: 'Capsules', icon: Home },
  { id: 'items', path: '/items', label: 'Items', icon: Shirt },
  { id: 'vault', path: '/vault', label: 'Vault', icon: Gem },
  { id: 'shopping', path: '/shopping', label: 'Shopping', icon: ShoppingBag },
  { id: 'outfits', path: '/outfits', label: 'Outfits', icon: Sparkles },
  { id: 'profile', path: '/profile', label: 'Profile', icon: User },
];

function getActiveTab(location: string): string {
  for (const tab of tabs) {
    if (location === tab.path || location.startsWith(tab.path + '/')) {
      return tab.id;
    }
  }
  if (location === '/') return 'capsules';
  if (location.startsWith('/capsule/')) return 'capsules';
  if (location.startsWith('/create-capsule')) return 'capsules';
  if (location.startsWith('/wardrobes/')) return 'items';
  if (location.startsWith('/shopping-list/')) return 'shopping';
  if (location.startsWith('/admin/') || location.startsWith('/retailer')) return 'profile';
  if (location.startsWith('/subscription')) return 'profile';
  return 'capsules';
}

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const activeTab = getActiveTab(location);

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-background border-t z-40">
      <nav className="flex items-center justify-around h-16 px-2">
        {tabs.map(({ id, path, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => navigate(path)}
              className={`flex flex-col items-center justify-center gap-1 flex-1 h-full hover-elevate transition-colors ${
                isActive ? 'text-foreground' : 'text-muted-foreground'
              }`}
              aria-label={`Navigate to ${label}`}
              aria-current={isActive ? 'page' : undefined}
              data-testid={`button-nav-${id}`}
            >
              <Icon className={`w-5 h-5 ${isActive ? 'fill-current' : ''}`} />
              <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
