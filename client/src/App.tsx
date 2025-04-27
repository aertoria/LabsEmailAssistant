import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import NotFound from "@/pages/not-found";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import { useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

// Create an auth callback component
function AuthCallback() {
  const { toast } = useToast();
  const [_, setLocation] = useLocation();
  
  useEffect(() => {
    // Check if this is a Google auth callback with a code parameter or success flag
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const success = urlParams.get('success');
    
    if (success === 'true') {
      console.log("Authentication success detected in callback");
      toast({
        title: "Authentication Complete",
        description: "You've successfully authenticated with Google Gmail!",
      });
      
      // Fetch updated user data before redirecting to ensure session is valid
      fetch('/api/auth/status', {
        credentials: 'include'
      })
      .then(response => response.json())
      .then(data => {
        if (data.authenticated && data.user) {
          // Store user in localStorage for persistence
          localStorage.setItem('gmail_app_user', JSON.stringify(data.user));
          console.log("User authenticated and stored:", data.user);
        }
        
        // Clean up URL and navigate to dashboard
        window.history.replaceState({}, document.title, "/dashboard");
        
        // Force reload to ensure everything is fresh
        window.location.href = "/dashboard";
      })
      .catch(error => {
        console.error("Error fetching auth status:", error);
        // Navigate to dashboard anyway
        window.location.href = "/dashboard";
      });
      return;
    }
    
    if (code) {
      toast({
        title: "Processing Authentication",
        description: "Please wait while we complete your Google authentication...",
      });
      
      // The backend will handle the callback via the /api/auth/callback endpoint
      // which matches the redirect URI we've configured in the OAuth client
      fetch(`/api/auth/callback${window.location.search}`, {
        method: 'GET',
        credentials: 'include'
      })
      .then(response => {
        if (response.ok) {
          toast({
            title: "Authentication Complete",
            description: "You've successfully authenticated with Google Gmail!",
          });
          
          // Clean up URL and navigate to dashboard
          window.history.replaceState({}, document.title, "/dashboard");
          setLocation('/dashboard');
        } else {
          throw new Error("Authentication failed");
        }
      })
      .catch(error => {
        console.error("Error in auth callback:", error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "There was a problem completing your Google authentication. Please try again.",
        });
        // Navigate back to login page
        setLocation('/');
      });
    } else {
      // If there's no code, this isn't a proper callback - go back to login
      setLocation('/');
    }
  }, []);
  
  return (
    <div className="flex justify-center items-center min-h-screen bg-primary/5">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md text-center">
        <h1 className="text-2xl font-bold mb-4">Completing Authentication</h1>
        <p className="mb-4">Please wait while we complete your Google authentication...</p>
        <div className="flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Login} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/auth/callback" component={AuthCallback} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
