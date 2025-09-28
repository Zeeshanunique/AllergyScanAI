import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Home, Scan, History, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export function BottomNavigation() {
  const [location] = useLocation();

  const navItems = [
    {
      path: "/",
      icon: Home,
      label: "Home",
      color: "from-blue-500 to-purple-600"
    },
    {
      path: "/scanner",
      icon: Scan,
      label: "Scan",
      color: "from-green-500 to-emerald-600",
      isMain: true
    },
    {
      path: "/history",
      icon: History,
      label: "History",
      color: "from-orange-500 to-red-600"
    },
    {
      path: "/profile",
      icon: User,
      label: "Profile",
      color: "from-purple-500 to-pink-600"
    },
  ];

  return (
    <div className="md:hidden">
      {/* Safe area padding for mobile devices */}
      <div className="h-20 bg-transparent"></div>

      {/* Fixed bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-slate-900/95 backdrop-blur-lg border-t border-border/40 shadow-lg">
        <div className="px-4 py-2 pb-safe">
          <div className="flex items-center justify-around relative">
            {navItems.map((item, index) => {
              const isActive = location === item.path;
              const Icon = item.icon;

              return (
                <Link key={item.path} href={item.path}>
                  <div className="relative">
                    {item.isMain ? (
                      // Main scan button (larger, floating)
                      <Button
                        size="lg"
                        className={cn(
                          "w-14 h-14 rounded-full shadow-lg transform transition-all duration-200",
                          isActive
                            ? "bg-gradient-to-r from-green-500 to-emerald-600 scale-110 shadow-green-500/25"
                            : "bg-gradient-to-r from-green-500 to-emerald-600 hover:scale-105 shadow-green-500/20"
                        )}
                      >
                        {isActive ? <Plus size={28} className="text-white" /> : <Icon size={28} className="text-white" />}
                      </Button>
                    ) : (
                      // Regular navigation items
                      <Button
                        variant="ghost"
                        className={cn(
                          "flex flex-col items-center space-y-1 h-12 w-16 p-0 transition-all duration-200",
                          isActive
                            ? "text-primary"
                            : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        <div className="relative">
                          <Icon
                            size={20}
                            className={cn(
                              "transition-transform duration-200",
                              isActive ? "scale-110" : ""
                            )}
                          />
                          {isActive && (
                            <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary rounded-full"></div>
                          )}
                        </div>
                        <span className={cn(
                          "text-xs font-medium transition-all duration-200",
                          isActive ? "text-primary font-semibold" : ""
                        )}>
                          {item.label}
                        </span>
                      </Button>
                    )}

                    {/* Active indicator for main button */}
                    {item.isMain && isActive && (
                      <div className="absolute -top-1 -right-1">
                        <div className="w-6 h-6 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center shadow-md">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      </div>
                    )}

                    {/* Notification badges (example) */}
                    {item.path === "/history" && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-2 -right-2 w-5 h-5 text-xs p-0 flex items-center justify-center"
                      >
                        3
                      </Badge>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Bottom safe area for devices with home indicator */}
        <div className="h-safe-bottom bg-white/95 dark:bg-slate-900/95"></div>
      </nav>
    </div>
  );
}