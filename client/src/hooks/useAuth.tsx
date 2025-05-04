import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useLocation } from 'wouter';
import { toast } from 'react-hot-toast';

// Google OAuth2 types
// We rely on the runtime script; cast `window` to `any` when accessing `google` to avoid TypeScript conflicts.

interface User {
  id: string;
  email: string;
  name: string;
  googleId: string;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  handleGoogleSignIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Store client ID globally
const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

if (!googleClientId) {
  console.error('Google Client ID is not configured');
  toast.error('Google authentication is not properly configured. Please contact support.');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [, setLocation] = useLocation();

  // Load Google Identity Services script
  useEffect(() => {
    if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      setIsInitialized(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      console.log('Google Identity Services script loaded');
      setIsInitialized(true);
    };
    script.onerror = () => {
      console.error('Failed to load Google Identity Services script');
      toast.error('Failed to load authentication service. Please check your internet connection.');
    };
    document.body.appendChild(script);
  }, []);

  // Check authentication status on mount
  useEffect(() => {
    const checkAuthStatus = async () => {
      // First check if we have a user in localStorage
      const storedUser = localStorage.getItem('gmail_app_user');
      if (storedUser) {
        console.log('Using authenticated user from localStorage');
        try {
          const user = JSON.parse(storedUser);
          // Set the user from localStorage immediately for better UX
          setUser(user);
          setIsAuthenticated(true);
        } catch (e) {
          console.error('Failed to parse stored user:', e);
          localStorage.removeItem('gmail_app_user');
        }
      }
      
      // Then verify with the server
      try {
        const response = await fetch('/api/auth/status', {
          credentials: 'include',
        });

        const data = await response.json();
        
        if (data.authenticated) {
          // Update with server data if available
          setIsAuthenticated(true);
          setUser(data.user);
          localStorage.setItem('gmail_app_user', JSON.stringify(data.user));
        } else {
          // Server session is not valid
          if (storedUser) {
            console.warn('Server session invalid despite having local user');
            // Keep the user logged in on the client side, even if server session expired
            // This avoids sudden logouts during development or server restarts
          } else {
            console.log('No authentication found, redirecting to login');
            setIsAuthenticated(false);
            setUser(null);
            if (window.location.pathname !== '/' && window.location.pathname !== '/login') {
              setLocation('/');
            }
          }
        }
      } catch (error) {
        console.error('Failed to check auth status:', error);
        // Don't log the user out on network errors
      }
    };

    checkAuthStatus();
  }, [setLocation]);

  const handleGoogleSignIn = () => {
    return new Promise<void>((resolve, reject) => {
      if (!(window as any).google?.accounts?.oauth2) {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }

      if (!googleClientId) {
        reject(new Error('Google Client ID not configured'));
        return;
      }

      const codeClient = (window as any).google.accounts.oauth2.initCodeClient({
        client_id: googleClientId,
        scope: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/gmail.modify https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
        ux_mode: 'popup',
        // For the PKCE flow, this ensures we use the special value 'postmessage'
        redirect_uri: 'postmessage',
        callback: async (resp: { code: string; error?: string; error_description?: string }) => {
          const { code, error, error_description } = resp;
          if (error) {
            reject(new Error(error_description || 'Authentication failed'));
            return;
          }

          try {
            const response = await fetch('/api/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ code }),
              credentials: 'include',
            });

            if (!response.ok) {
              throw new Error('Authentication failed');
            }

            const data = await response.json();

            if (data.authUrl) {
              // User needs additional Gmail authorization
              toast('Additional Gmail authorization required');
              window.location.href = data.authUrl;
              return;
            }

            // Save authentication state immediately
            setIsAuthenticated(true);
            setUser(data.user);
            localStorage.setItem('gmail_app_user', JSON.stringify(data.user));
            
            // Verify session is properly established on the server before redirecting
            try {
              // Make an authenticated request to verify session
              const sessionCheck = await fetch('/api/auth/status', {
                credentials: 'include'
              });
              
              const sessionData = await sessionCheck.json();
              
              if (!sessionData.authenticated) {
                console.error('Session not established after login');
                throw new Error('Session error');
              }
              
              console.log('Session successfully established');
            } catch (sessionError) {
              console.warn('Session verification issue:', sessionError);
              // Continue anyway, as we've saved the user locally
            }
            
            toast.success(`Welcome, ${data.user.name || data.user.email}!`);
            setLocation('/dashboard');
            resolve();
          } catch (error) {
            console.error('Authentication error:', error);
            reject(error);
          }
        },
      });

      codeClient.requestCode();
    });
  };

  const signOut = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });

      setIsAuthenticated(false);
      setUser(null);
      localStorage.removeItem('gmail_app_user');
      toast.success('Signed out successfully');
      setLocation('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
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
