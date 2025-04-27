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

// Global variable to prevent multiple auth checks
let hasCheckedAuth = false;

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

  // Initialize Google Sign-In on mount - only once
  useEffect(() => {
    let isMounted = true;
    let checkGoogleApiInterval: ReturnType<typeof setInterval> | null = null;
    
    const initializeGoogleSignIn = () => {
      if (!window.google || !window.google.accounts || !isMounted) return;
      
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
          console.error('Google Client ID is not configured');
          return;
        }
        
        // Create a stable callback that doesn't recreate on render
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: () => {}, // Empty callback, we'll set the real one in handleGoogleSignIn
          auto_select: false
        });
        
        console.log('Google Sign-In initialized successfully');
        
        // Clear the interval if we got here
        if (checkGoogleApiInterval) {
          clearInterval(checkGoogleApiInterval);
          checkGoogleApiInterval = null;
        }
      } catch (error) {
        console.error('Failed to initialize Google Sign-In:', error);
      }
    };
    
    // Check if Google API is loaded, if so initialize,
    // otherwise wait for it to load
    if (window.google && window.google.accounts) {
      initializeGoogleSignIn();
    } else {
      checkGoogleApiInterval = setInterval(() => {
        if (window.google && window.google.accounts) {
          initializeGoogleSignIn();
        }
      }, 500); // Longer interval to reduce CPU usage
    }
    
    // Clean up function
    return () => {
      isMounted = false;
      if (checkGoogleApiInterval) {
        clearInterval(checkGoogleApiInterval);
      }
    };
  }, []);

  const handleGoogleSignIn = async () => {
    return new Promise<void>((resolve, reject) => {
      if (!window.google || !window.google.accounts) {
        console.error('Google authentication is not available');
        reject(new Error('Google authentication services not available. Please make sure cookies and JavaScript are enabled in your browser.'));
        return;
      }

      try {
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        
        console.log('Setting up Google Authentication with client ID:', 
          googleClientId ? 'Valid client ID exists' : 'Missing client ID');
          
        if (!googleClientId) {
          console.error('Missing Google Client ID environment variable');
          reject(new Error('Missing Google Client ID configuration. Please contact the administrator.'));
          return;
        }
        
        // Reset existing Google Sign-In and reinitialize
        const buttonContainer = document.getElementById('google-signin-button-container');
        if (buttonContainer) {
          buttonContainer.innerHTML = '';
        }
        
        // Initialize with new parameters
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async (response: any) => {
            if (!response || !response.credential) {
              console.error('No credential received from Google');
              reject(new Error('Google authentication failed. No credential received.'));
              return;
            }
            
            try {
              console.log('Google credential received, length:', response.credential.length);
              const credential = response.credential;
              
              // Send the credential to the backend
              const apiResponse = await fetch('/api/auth/google', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ credential }),
                credentials: 'include'
              });
              
              if (!apiResponse.ok) {
                const errorData = await apiResponse.json();
                console.error('Backend authentication failed:', errorData);
                throw new Error(errorData.message || 'Backend authentication failed');
              }
              
              const data = await apiResponse.json();
              console.log('Authentication successful, user data:', data);
              
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
              
              resolve();
              
              // Navigate after authentication using React Router instead of page reload
              setLocation('/dashboard');
            } catch (error) {
              console.error('Authentication error with backend:', error);
              
              // Show a specific error message
              toast({
                variant: "destructive",
                title: "Authentication failed",
                description: error instanceof Error 
                  ? error.message 
                  : "There was an error processing your Google sign-in. Please check that your Replit domain is authorized in the Google Cloud Console."
              });
              
              reject(error);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true
        });
        
        // First try to show the One Tap UI
        window.google.accounts.id.prompt((notification: any) => {
          console.log('Google prompt notification received:', notification);
          
          // If One Tap isn't displayed or is skipped, create a sign-in button manually
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Google One Tap is not displayed or skipped. Showing manual sign-in button.');
            
            if (buttonContainer) {
              // Clear any existing buttons
              buttonContainer.innerHTML = '';
              
              // Render a Google Sign-In button
              if (window.google && window.google.accounts) {
                window.google.accounts.id.renderButton(buttonContainer, {
                  type: 'standard',
                  theme: 'outline',
                  size: 'large',
                  text: 'signin_with',
                  shape: 'rectangular',
                  logo_alignment: 'left',
                  width: 250
                });
              }
              console.log('Google Sign-In button created');
            } else {
              console.error('Google sign-in button container not found');
              reject(new Error('Could not create Google sign-in button'));
            }
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
      // Update state immediately
      setIsAuthenticated(false);
      setUser(null);
      
      // Reset auth check flag so we can check again on next mount if needed
      hasCheckedAuth = false;
      
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
      
      // Reset auth check flag
      hasCheckedAuth = false;
      
      // Navigate back to login page
      setLocation('/');
    } finally {
      // Always clear localStorage
      localStorage.removeItem('gmail_app_user');
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
