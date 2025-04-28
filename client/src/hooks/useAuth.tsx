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

// Initialize Google Auth when the file loads
const loadGoogleAuthScript = () => {
  // Check if script is already in the document
  if (document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
    return;
  }
  
  const script = document.createElement('script');
  script.src = 'https://accounts.google.com/gsi/client';
  script.async = true;
  script.defer = true;
  script.id = 'google-auth-script';
  script.onload = () => {
    console.log('Google Identity Services script loaded successfully');
  };
  script.onerror = () => {
    console.error('Failed to load Google Identity Services script');
  };
  document.body.appendChild(script);
};

// Execute script loading immediately
if (typeof window !== 'undefined') {
  loadGoogleAuthScript();
}

// Global variable to prevent multiple auth checks and detect logout
let hasCheckedAuth = false;
// Add a logout flag to prevent auto-login after logout
let hasUserLoggedOut = false;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Check auth status ONCE on component mount
  useEffect(() => {
    // Skip if already initialized or if we've already checked auth
    if (isInitialized || hasCheckedAuth) {
      setIsInitialized(true);
      return;
    }
    
    const checkAuthStatus = async () => {
      try {
        // Mark that we've checked auth to prevent repeated checks
        hasCheckedAuth = true;
        
        // If the user has explicitly logged out, don't automatically log them back in
        if (hasUserLoggedOut) {
          console.log('User has explicitly logged out, staying logged out');
          setIsInitialized(true);
          return;
        }
        
        // Always check localStorage first for faster loading
        const savedUser = localStorage.getItem('gmail_app_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            console.log('User found in localStorage');
            
            // Verify this is a real Google user
            if (parsedUser.googleId) {
              console.log('Google authenticated user detected with ID:', parsedUser.googleId);
            } else {
              console.log('User has no Google authentication ID, clearing session');
              localStorage.removeItem('gmail_app_user');
              return; // Skip authentication if not a real Google user
            }
            
            setIsAuthenticated(true);
            setUser(parsedUser);
            setIsInitialized(true);
            return; // Return early with localStorage user
          } catch (e) {
            console.error('Error parsing user from localStorage:', e);
          }
        }
        
        // If no localStorage user, try API ONCE
        console.log('No localStorage user, checking API once');
        const response = await fetch('/api/auth/status', {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.authenticated) {
            console.log('User authenticated via API');
            setIsAuthenticated(true);
            setUser(data.user);
            
            // Also save to localStorage to avoid future API calls
            localStorage.setItem('gmail_app_user', JSON.stringify(data.user));
            
            setIsInitialized(true);
            return;
          }
        }
        
        // No user found in either source
        console.log('No authenticated user found');
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to check auth status:', error);
        
        // Only use real Google users - no fallback to localStorage without verification
        const savedUser = localStorage.getItem('gmail_app_user');
        if (savedUser) {
          try {
            const parsedUser = JSON.parse(savedUser);
            // Only use the saved user if they have a real Google ID
            if (parsedUser.googleId) {
              console.log('Verified Google user found in localStorage after API error');
              setIsAuthenticated(true);
              setUser(parsedUser);
            } else {
              // Clear invalid user data
              localStorage.removeItem('gmail_app_user');
            }
          } catch (e) {
            // Clear corrupted data
            localStorage.removeItem('gmail_app_user');
          }
        }
        
        setIsInitialized(true);
      }
    };

    // Check auth once and never again
    checkAuthStatus();
  }, []);

  // Initialize Google auth
  useEffect(() => {
    if (window.google?.accounts) {
      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      if (!clientId) {
        console.error('Google Client ID is not configured');
        toast({
          variant: "destructive",
          title: "Configuration Error",
          description: "Google authentication is not properly configured. Please contact support.",
        });
        return;
      }

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: async (response: any) => {
          if (!response || !response.credential) {
            console.error('Invalid Google auth response');
            toast({
              variant: "destructive",
              title: "Authentication Error",
              description: "Invalid response from Google authentication.",
            });
            return;
          }

          try {
            const res = await fetch('/api/auth/google', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ credential: response.credential }),
              credentials: 'include',
            });

            if (!res.ok) {
              throw new Error('Authentication failed');
            }

            const data = await res.json();

            // Check if the user needs additional Gmail authorization
            if (data.authUrl) {
              console.log('User needs additional Gmail authorization, redirecting to:', data.authUrl);
              toast({
                title: "Gmail Authorization Required",
                description: "You'll be redirected to authorize Gmail access...",
              });
              setTimeout(() => {
                window.location.href = data.authUrl;
              }, 1500);
              return;
            }

            // Reset the logout flag when a user explicitly signs in
            hasUserLoggedOut = false;
            console.log("Resetting hasUserLoggedOut flag after explicit sign-in");

            // Update local state
            setIsAuthenticated(true);
            setUser(data.user);

            // Also save to localStorage to avoid future API calls
            localStorage.setItem('gmail_app_user', JSON.stringify(data.user));

            // Show success toast
            toast({
              title: "Sign in successful",
              description: `Welcome, ${data.user.name || data.user.email}!`,
            });

            // Navigate after authentication
            setLocation('/dashboard');
          } catch (error) {
            console.error('Authentication error:', error);
            toast({
              variant: "destructive",
              title: "Authentication Failed",
              description: "Could not complete authentication. Please try again.",
            });
          }
        },
      });
    }
  }, [toast, setLocation]);

  const handleGoogleSignIn = async () => {
    return new Promise<void>((resolve, reject) => {
      if (!window.google || !window.google.accounts) {
        console.error('Google authentication is not available');
        reject(new Error('Google authentication is not available. Please refresh the page.'));
        return;
      }

      const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
      console.log('Google Client ID:', clientId ? 'Configured' : 'Missing');
      
      if (!clientId) {
        console.error('Missing Google Client ID');
        reject(new Error('Missing Google Client ID configuration. Please contact the administrator.'));
        return;
      }

      try {
        // Initialize Google Sign-In
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response: any) => {
            if (!response || !response.credential) {
              console.error('Invalid Google auth response');
              reject(new Error('Invalid response from Google authentication.'));
              return;
            }

            try {
              const res = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ credential: response.credential }),
                credentials: 'include',
              });

              if (!res.ok) {
                throw new Error('Authentication failed');
              }

              const data = await res.json();

              if (data.authUrl) {
                console.log('User needs additional Gmail authorization, redirecting to:', data.authUrl);
                toast({
                  title: "Gmail Authorization Required",
                  description: "You'll be redirected to authorize Gmail access...",
                });
                setTimeout(() => {
                  window.location.href = data.authUrl;
                }, 1500);
                return;
              }

              hasUserLoggedOut = false;
              setIsAuthenticated(true);
              setUser(data.user);
              localStorage.setItem('gmail_app_user', JSON.stringify(data.user));
              toast({
                title: "Sign in successful",
                description: `Welcome, ${data.user.name || data.user.email}!`,
              });
              setLocation('/dashboard');
              resolve();
            } catch (error) {
              console.error('Authentication error:', error);
              reject(error);
            }
          },
        });

        // Show the Google Sign-In prompt
        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Google One Tap is not displayed or skipped');
          }
        });
      } catch (error) {
        console.error('Error in Google Sign-In process:', error);
        reject(error);
      }
    });
  };

  const signOut = async () => {
    try {
      // Set the logout flag to prevent auto-login
      hasUserLoggedOut = true;
      console.log("Setting hasUserLoggedOut flag to prevent automatic login");
      
      // Update state immediately
      setIsAuthenticated(false);
      setUser(null);
      
      // Reset auth check flag so we can check again on next mount if needed
      hasCheckedAuth = false;
      
      // Also clear localStorage
      localStorage.removeItem('gmail_app_user');
      
      // Clear all queries
      queryClient.clear();
      
      // Show success toast
      toast({
        title: "Signed out successfully",
        description: "You have been signed out of your account"
      });
      
      // Navigate back to login page
      setLocation('/');
      
      // Clear server session in the background
      await apiRequest('POST', '/api/auth/logout', {});
    } catch (error) {
      console.error("Error during sign out:", error);
      
      // Still make sure we're signed out locally
      setIsAuthenticated(false);
      setUser(null);
      
      // Reset auth check flag but keep logout flag
      hasCheckedAuth = false;
      hasUserLoggedOut = true;
      
      // Navigate back to login page
      setLocation('/');
    } finally {
      // Always clear localStorage
      localStorage.removeItem('gmail_app_user');
      
      // Always ensure the logout flag is set
      hasUserLoggedOut = true;
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
