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
  isVmMode: boolean;
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
  const [isVmMode, setIsVmMode] = useState(false);
  const [, setLocation] = useLocation();
  
  // Detect if we're in VM mode (no localStorage available)
  useEffect(() => {
    try {
      localStorage.getItem('test');
    } catch (e) {
      console.warn('Running in VM environment with no localStorage access');
      setIsVmMode(true);
    }
  }, []);

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
      try {
        // If in VM mode, add the demo mode header
        const headers: Record<string, string> = {};
        if (isVmMode) {
          headers['X-Demo-Mode'] = 'true';
        }
        
        const response = await fetch('/api/auth/status', {
          credentials: 'include',
          headers
        });

        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            setIsAuthenticated(true);
            setUser(data.user);
            
            // Only try to use localStorage if we're not in VM mode
            if (!isVmMode) {
              try {
                localStorage.setItem('gmail_app_user', JSON.stringify(data.user));
              } catch (e) {
                console.warn('Could not save user to localStorage');
              }
            }
          }
        }
      } catch (error) {
        console.error('Failed to check auth status:', error);
      }
    };

    checkAuthStatus();
  }, [isVmMode]); // Add isVmMode as a dependency

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
              const errorData = await response.json();
              const error = new Error(errorData.message || 'Authentication failed');
              (error as any).response = errorData;
              throw error;
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
            
            // Only try to use localStorage if we're not in VM mode
            if (!isVmMode) {
              try {
                localStorage.setItem('gmail_app_user', JSON.stringify(data.user));
              } catch (e) {
                console.warn('Could not save user to localStorage during sign in');
              }
            }
            
            // Verify session is properly established on the server before redirecting
            try {
              // Make an authenticated request to verify session
              // If in VM mode, add the demo mode header
              const sessionHeaders: Record<string, string> = {};
              if (isVmMode) {
                sessionHeaders['X-Demo-Mode'] = 'true';
              }
              
              const sessionCheck = await fetch('/api/auth/status', {
                credentials: 'include',
                headers: sessionHeaders
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
            
            // Force redirect to dashboard
            setTimeout(() => {
              window.location.href = '/dashboard';
            }, 100);
            
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
      // If in VM mode, add the demo mode header
      const headers: Record<string, string> = {};
      if (isVmMode) {
        headers['X-Demo-Mode'] = 'true';
      }

      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
        headers
      });

      setIsAuthenticated(false);
      setUser(null);
      
      // Only try to use localStorage if we're not in VM mode
      if (!isVmMode) {
        try {
          localStorage.removeItem('gmail_app_user');
        } catch (e) {
          console.warn('Could not remove user from localStorage during sign out');
        }
      }

      toast.success('Signed out successfully');
      setLocation('/');
    } catch (error) {
      console.error('Sign out error:', error);
      toast.error('Failed to sign out');
    }
  };

  // Pass isVmMode to the handleGoogleSignIn function
  const signInWithGoogle = () => {
    return handleGoogleSignIn();
  };
  
  return (
    <AuthContext.Provider value={{ 
      isAuthenticated, 
      user, 
      handleGoogleSignIn: signInWithGoogle, 
      signOut,
      isVmMode
    }}>
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
