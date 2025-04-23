import { useEffect } from "react";
import { useLocation } from "wouter";
import { Header } from "@/components/Header";
import { Sidebar } from "@/components/Sidebar";
import { EmailList } from "@/components/EmailList";
import { SyncStatus } from "@/components/SyncStatus";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";

export default function Dashboard() {
  const { isAuthenticated, user } = useAuth();
  const [_, setLocation] = useLocation();

  // Fetch sync status
  const { data: syncStatus } = useQuery({
    queryKey: ['/api/gmail/sync/status'],
    staleTime: 5000,
    refetchInterval: 5000,
    enabled: !!isAuthenticated
  });

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      setLocation("/");
    }
  }, [isAuthenticated, setLocation]);

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
