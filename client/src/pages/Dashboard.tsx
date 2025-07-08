import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { EmailList } from "@/components/EmailList";
import { AISidebar } from "@/components/AISidebar";
import { SyncStatus } from "@/components/SyncStatus";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { FeatureContainer } from "@/components/features/FeatureContainer";

export default function Dashboard() {
  const { isAuthenticated: authProviderAuthenticated, user: authUser, signOut } = useAuth();
  const [_, setLocation] = useLocation();
  const [initialized, setInitialized] = useState(false);
  const [localUser, setLocalUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [emails, setEmails] = useState<any[]>([]);
  
  // State to track the active feature (from sidebar)
  const [activeFeature, setActiveFeature] = useState<string | null>(null);

  // Callback function to handle feature selection from sidebar
  const handleFeatureSelect = (featureId: string) => {
    setActiveFeature(featureId);
  };
  
  // Check auth status once at initialization
  useEffect(() => {
    if (initialized) return;
    
    const checkAuthentication = async () => {
      // Check for authenticated user in local storage first
      const storedUser = localStorage.getItem('gmail_app_user');
      let hasLocalUser = false;
      
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          setLocalUser(parsedUser);
          setIsAuthenticated(true);
          hasLocalUser = true;
          console.log("Using authenticated user from localStorage");
          
          // Even with local user, verify session is still valid on server
          try {
            const response = await fetch('/api/auth/status', {
              credentials: 'include'
            });
            
            if (!response.ok) {
              console.warn("Server session invalid despite having local user");
              hasLocalUser = false;
              setIsAuthenticated(false);
              // Don't clear localStorage yet, let the auth system handle it
            }
          } catch (serverError) {
            console.error("Error checking server session:", serverError);
            // Continue with local auth for now
          }
        } catch (e) {
          console.error("Failed to parse stored user:", e);
        }
      }
      
      // If we have auth from provider, use that
      if (authProviderAuthenticated && authUser) {
        setIsAuthenticated(true);
        setLocalUser(authUser);
        console.log("Using authenticated user from auth provider");
        hasLocalUser = true;
      }
      
      // If no auth from either source, redirect once
      if (!hasLocalUser && !authProviderAuthenticated) {
        console.log("No authentication found, redirecting to login");
        setLocation('/'); // Use React Router instead of hard navigation
        return false;
      }
      
      return true;
    };
    
    // If authentication check succeeds, mark as initialized
    checkAuthentication().then(result => {
      if (result) {
        setInitialized(true);
      }
    });
  }, [authProviderAuthenticated, authUser, initialized]);
  
  // Use whichever user we have
  const user = authUser || localUser;
  
  // Handle sign out with immediate redirect to login page
  const handleSignOut = async () => {
    // Clear local storage first for immediate effect
    localStorage.removeItem('gmail_app_user');
    
    // Redirect to login page immediately
    setLocation('/');
    
    // Then sign out from the auth provider in the background
    try {
      await signOut();
    } catch (e) {
      console.log("Auth provider signout failed, already handled locally");
    }
  };

  // Fetch sync status once without continuous refetching
  const { data: syncStatus } = useQuery({
    queryKey: ['/api/gmail/sync/status'],
    staleTime: Infinity, // Never consider data stale
    refetchInterval: false, // Don't automatically refetch
    enabled: isAuthenticated,
    queryFn: async ({ queryKey }) => {
      try {
        // Check if we have a demo user in localStorage
        const storedUser = localStorage.getItem('gmail_app_user');
        const isDemoMode = storedUser !== null;
        
        const response = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: isDemoMode ? { 'X-Demo-Mode': 'true' } : {}
        });
        
        if (!response.ok) {
          return {
            isActive: false,
            progress: 0, 
            total: 0,
            processed: 0
          };
        }
        
        return await response.json();
      } catch (err) {
        console.error("Error fetching sync status:", err);
        return {
          isActive: false,
          progress: 0, 
          total: 0,
          processed: 0
        };
      }
    }
  });

  // Show loading state until we've determined authentication
  if (!initialized || !user) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }
  
  return (
    <div className="h-screen flex flex-col">
      <Header user={user} onSignOut={handleSignOut} />
      
      <main className="flex-1 flex overflow-hidden">
        <Sidebar onFeatureSelect={handleFeatureSelect} activeFeature={activeFeature} />
        
        {activeFeature ? (
          <div className="flex-1 overflow-y-auto">
            <FeatureContainer activeFeature={activeFeature} />
          </div>
        ) : (
          <>
            <EmailList onEmailsLoaded={setEmails} />
            <AISidebar emails={emails} />
          </>
        )}
      </main>
      
      {syncStatus && syncStatus.isActive && (
        <SyncStatus status={syncStatus} />
      )}
    </div>
  );
}
