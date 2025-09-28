import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { Header, BottomNavigation } from "@/components/navigation";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import ScanHistoryPage from "@/pages/scan-history";
import Scanner from "@/pages/scanner";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/scanner" component={Scanner} />
        <Route path="/history" component={ScanHistoryPage} />
        <Route path="/profile" component={Profile} />
        {/* Fallback to 404 */}
        <Route component={NotFound} />
      </Switch>
      <BottomNavigation />
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="allergyguard-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
