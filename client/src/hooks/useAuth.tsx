import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useQueryClient } from '@tanstack/react-query';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any;
  handleGoogleSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Function to initialize Google auth
export function initGoogleAuth() {
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  document.body.appendChild(script);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check auth status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      try {
        const response = await fetch('/api/auth/status', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
            setUser(data.user);
          }
        }
      } catch (error) {
        console.error('Failed to check auth status:', error);
      } finally {
        setIsInitialized(true);
      }
    };

    checkAuthStatus();
  }, []);

  const handleGoogleSignIn = async () => {
    return new Promise<void>((resolve, reject) => {
      if (!window.google) {
        reject(new Error('Google authentication failed to load'));
        return;
      }

      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
        callback: async ({ credential }: any) => {
          try {
            const response = await apiRequest('POST', '/api/auth/google', { credential });
            const data = await response.json();
            
            setIsAuthenticated(true);
            setUser(data.user);
            setLocation('/dashboard');
            resolve();
          } catch (error) {
            reject(error);
          }
        },
        context: 'signin'
      });

      window.google.accounts.id.prompt((notification: any) => {
        if (notification.isNotDisplayed()) {
          reject(new Error('Google sign-in was not displayed: ' + notification.getNotDisplayedReason()));
        } else if (notification.isSkippedMoment()) {
          reject(new Error('Google sign-in was skipped: ' + notification.getSkippedReason()));
        } else if (notification.isDismissedMoment()) {
          reject(new Error('Google sign-in was dismissed: ' + notification.getDismissedReason()));
        }
      });
    });
  };

  const signOut = async () => {
    try {
      await apiRequest('POST', '/api/auth/logout', {});
      setIsAuthenticated(false);
      setUser(null);
      setLocation('/');
      
      // Clear all queries
      queryClient.clear();
      
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account"
      });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Sign out failed",
        description: "There was a problem signing you out"
      });
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, handleGoogleSignIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
