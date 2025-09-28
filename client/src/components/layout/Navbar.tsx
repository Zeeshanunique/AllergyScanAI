import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ShieldCheck, Menu, LogOut, User, Settings, Scan, History, Home, Sparkles } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export function Navbar() {
  const { user, logout, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [location] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged out",
        description: "You have been logged out successfully.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to log out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const getInitials = (user: any) => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.username) {
      return user.username.slice(0, 2).toUpperCase();
    }
    return "U";
  };

  const navItems = isAuthenticated ? [
    { path: "/", icon: Home, label: "Home" },
    { path: "/scanner", icon: Scan, label: "Scanner" },
    { path: "/history", icon: History, label: "History" },
    { path: "/profile", icon: User, label: "Profile" },
  ] : [];

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href={isAuthenticated ? "/" : "/login"}>
            <div className="flex items-center space-x-3 cursor-pointer group">
              <div className="relative">
                <div className="w-10 h-10 bg-gradient-to-r from-green-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                  <ShieldCheck className="text-white" size={24} />
                </div>
                <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Sparkles className="text-white" size={10} />
                </div>
              </div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-gray-100 dark:to-gray-400 bg-clip-text text-transparent">
                  AllergyGuard
                </h1>
                <p className="text-xs text-muted-foreground -mt-1">AI-Powered Safety</p>
              </div>
            </div>
          </Link>

          {/* Desktop Navigation */}
          {isAuthenticated && (
            <div className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const isActive = location === item.path;
                const Icon = item.icon;

                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={`flex items-center space-x-2 ${
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md"
                          : "hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Icon size={16} />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            {isAuthenticated && user ? (
              <>
                {/* Mobile menu button */}
                <div className="md:hidden">
                  <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <Menu size={20} />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="w-80">
                      <SheetHeader>
                        <SheetTitle className="flex items-center space-x-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                              {getInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="text-left">
                            <p className="font-medium">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.username}
                            </p>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                          </div>
                        </SheetTitle>
                      </SheetHeader>
                      <div className="mt-6 space-y-2">
                        {navItems.map((item) => {
                          const Icon = item.icon;
                          const isActive = location === item.path;

                          return (
                            <Link key={item.path} href={item.path}>
                              <Button
                                variant={isActive ? "default" : "ghost"}
                                className="w-full justify-start space-x-3"
                                onClick={() => setMobileMenuOpen(false)}
                              >
                                <Icon size={18} />
                                <span>{item.label}</span>
                              </Button>
                            </Link>
                          );
                        })}
                        <div className="pt-4 border-t">
                          <Button
                            variant="ghost"
                            className="w-full justify-start space-x-3 text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              handleLogout();
                              setMobileMenuOpen(false);
                            }}
                          >
                            <LogOut size={18} />
                            <span>Sign Out</span>
                          </Button>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>

                {/* Desktop user menu */}
                <div className="hidden md:block">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium">
                            {getInitials(user)}
                          </AvatarFallback>
                        </Avatar>
                        {/* Online indicator */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-background rounded-full"></div>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-64" align="end" forceMount>
                      <div className="flex flex-col space-y-2 p-3">
                        <div className="flex items-center space-x-3">
                          <Avatar className="h-12 w-12">
                            <AvatarFallback className="bg-gradient-to-r from-blue-500 to-purple-600 text-white font-medium text-lg">
                              {getInitials(user)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="text-sm font-medium">
                              {user.firstName && user.lastName
                                ? `${user.firstName} ${user.lastName}`
                                : user.username}
                            </p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                            <Badge variant="secondary" className="mt-1 text-xs">
                              Premium User
                            </Badge>
                          </div>
                        </div>
                      </div>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center cursor-pointer w-full">
                          <User className="mr-3 h-4 w-4" />
                          <span>My Profile</span>
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-3 h-4 w-4" />
                        <span>Settings</span>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={handleLogout} className="cursor-pointer text-red-600 focus:text-red-600">
                        <LogOut className="mr-3 h-4 w-4" />
                        <span>Sign Out</span>
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-3">
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Sign In
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Get Started
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}