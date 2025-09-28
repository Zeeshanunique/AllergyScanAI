import { Link, useLocation } from "wouter";
import { Home, QrCode, History, User } from "lucide-react";

export function BottomNavigation() {
  const [location] = useLocation();

  const navItems = [
    { path: "/", icon: Home, label: "Home" },
    { path: "/scanner", icon: QrCode, label: "Scan" },
    { path: "/history", icon: History, label: "History" },
    { path: "/profile", icon: User, label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-30">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location === item.path;
            const Icon = item.icon;
            
            return (
              <Link key={item.path} href={item.path}>
                <button 
                  className={`flex flex-col items-center space-y-1 py-2 px-3 transition-colors ${
                    isActive ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`nav-${item.label.toLowerCase()}`}
                >
                  <Icon className="text-lg" size={20} />
                  <span className={`text-xs ${isActive ? 'font-medium' : ''}`}>{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function Header() {
  return (
    <header className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-shield-alt text-primary-foreground text-sm"></i>
          </div>
          <h1 className="text-lg font-semibold text-foreground">AllergyGuard</h1>
        </div>
        <div className="flex items-center space-x-2">
          <button 
            className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            data-testid="button-notifications"
          >
            <i className="fas fa-bell text-lg"></i>
          </button>
          <Link href="/profile">
            <button 
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-profile"
            >
              <i className="fas fa-user-circle text-lg"></i>
            </button>
          </Link>
        </div>
      </div>
    </header>
  );
}
