import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { EmailList } from "@/components/EmailList";
import { SyncStatus } from "@/components/SyncStatus";
import { useQuery } from "@tanstack/react-query";

// Import useAuth safely
let AuthModule;
try {
  AuthModule = require("@/hooks/useAuth");
} catch (error) {
  console.warn("Auth module not available, using mock");
  AuthModule = {
    useAuth: () => ({
      isAuthenticated: false,
      user: null,
      signOut: async () => { console.log("Signed out (mock)"); }
    })
  };
}
const { useAuth } = AuthModule;

export default function Dashboard() {
  const { isAuthenticated: authProviderAuthenticated, user: authUser, signOut } = useAuth();
  const [_, setLocation] = useLocation();
  const [localUser, setLocalUser] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  
  // Check for local storage user on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('gmail_app_user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setLocalUser(parsedUser);
        setIsAuthenticated(true);
      } catch (e) {
        console.error("Failed to parse stored user:", e);
      }
    }
  }, []);
  
  // Also check auth provider
  useEffect(() => {
    if (authProviderAuthenticated && authUser) {
      setIsAuthenticated(true);
      setLocalUser(authUser);
    }
  }, [authProviderAuthenticated, authUser]);
  
  // Composite user from either source
  const user = authUser || localUser;
  
  // Custom sign out that clears localStorage
  const handleSignOut = async () => {
    // Clear local storage
    localStorage.removeItem('gmail_app_user');
    setLocalUser(null);
    setIsAuthenticated(false);
    
    // Try auth provider sign out if available
    try {
      await signOut();
    } catch (e) {
      console.log("Auth provider signout failed, already handled locally");
    }
    
    // Redirect to login
    setLocation("/");
  };

  // Fetch sync status
  const { data: syncStatus } = useQuery({
    queryKey: ['/api/gmail/sync/status'],
    staleTime: 5000,
    refetchInterval: 5000,
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

  // Redirect if not authenticated - using a ref to prevent infinite redirects
  const redirectAttemptedRef = useRef(false);
  
  useEffect(() => {
    // Only attempt to redirect once to prevent infinite loops
    if (!isAuthenticated && !localUser && !redirectAttemptedRef.current) {
      redirectAttemptedRef.current = true;
      setLocation("/");
    }
  }, [isAuthenticated, localUser, setLocation]);

  if (!isAuthenticated || !user) {
    return null; // Redirecting or not yet loaded
  }

  return (
    <div className="h-screen flex flex-col">
      <Header user={user} onSignOut={handleSignOut} />
      
      <main className="flex-1 flex overflow-hidden">
        <Sidebar />
        <EmailList />
      </main>
      
      {syncStatus && syncStatus.isActive && (
        <SyncStatus status={syncStatus} />
      )}
    </div>
  );
}
