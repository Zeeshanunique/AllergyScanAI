import { ReactNode } from "react";
import { Navbar } from "./Navbar";
import { Footer } from "./Footer";
import { BottomNavigation } from "./BottomNavigation";
import { useAuth } from "@/contexts/AuthContext";

interface LayoutProps {
  children: ReactNode;
  showBottomNav?: boolean;
  className?: string;
}

export function Layout({ children, showBottomNav = true, className = "" }: LayoutProps) {
  const { isAuthenticated } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-white to-blue-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Navbar */}
      <Navbar />

      {/* Main Content */}
      <main className={`flex-1 w-full ${className}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Footer - only show on non-authenticated pages or desktop */}
      {(!isAuthenticated || !showBottomNav) && <Footer />}

      {/* Bottom Navigation - only for authenticated mobile users */}
      {isAuthenticated && showBottomNav && <BottomNavigation />}
    </div>
  );
}

export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="w-full max-w-md mx-auto px-4">
        {children}
      </div>
    </div>
  );
}