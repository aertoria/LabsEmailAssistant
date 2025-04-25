import { useEffect, useState } from "react";
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
    enabled: isAuthenticated
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated && !localUser) {
      setLocation("/");
    }
  }, [isAuthenticated, localUser, setLocation]);

  if (!isAuthenticated || !user) {
    return null; // Redirecting or not yet loaded
  }

  return (
    <div className="h-screen flex flex-col">
      <Header user={user} />
      
      <main className="flex-1 flex overflow-hidden">
        <Sidebar />
        <EmailList />
      </main>
      
      {syncStatus?.isActive && <SyncStatus status={syncStatus} />}
    </div>
  );
}
