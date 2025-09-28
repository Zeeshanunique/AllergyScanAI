import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute, GuestRoute } from "@/components/ProtectedRoute";
import { Layout, AuthLayout } from "@/components/layout/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import Home from "@/pages/home";
import Profile from "@/pages/profile";
import ScanHistoryPage from "@/pages/scan-history";
import Scanner from "@/pages/scanner";
import Login from "@/pages/login";
import Register from "@/pages/register";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      {/* Guest routes (login/register) */}
      <Route path="/login">
        <GuestRoute>
          <AuthLayout>
            <Login />
          </AuthLayout>
        </GuestRoute>
      </Route>
      <Route path="/register">
        <GuestRoute>
          <AuthLayout>
            <Register />
          </AuthLayout>
        </GuestRoute>
      </Route>

      {/* Protected routes */}
      <Route path="/">
        <ProtectedRoute>
          <Layout>
            <Home />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/scanner">
        <ProtectedRoute>
          <Layout>
            <Scanner />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/history">
        <ProtectedRoute>
          <Layout>
            <ScanHistoryPage />
          </Layout>
        </ProtectedRoute>
      </Route>
      <Route path="/profile">
        <ProtectedRoute>
          <Layout>
            <Profile />
          </Layout>
        </ProtectedRoute>
      </Route>

      {/* 404 fallback */}
      <Route>
        <Layout showBottomNav={false}>
          <NotFound />
        </Layout>
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider defaultTheme="light" storageKey="allergyguard-theme">
          <TooltipProvider>
            <AuthProvider>
              <Toaster />
              <Router />
            </AuthProvider>
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
