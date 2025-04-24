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

// Function to initialize Google auth - kept for compatibility
export function initGoogleAuth() {
  if (typeof window !== 'undefined') {
    loadGoogleAuthScript();
  }
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

  // Initialize Google Sign-In on mount
  useEffect(() => {
    const initializeGoogleSignIn = () => {
      if (!window.google || !window.google.accounts) return;
      
      try {
        const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        if (!clientId) {
          console.error('Google Client ID is not configured');
          return;
        }
        
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async ({ credential }: any) => {
            try {
              console.log('Google credential received, authenticating...');
              const response = await apiRequest('POST', '/api/auth/google', { credential });
              const data = await response.json();
              
              setIsAuthenticated(true);
              setUser(data.user);
              setLocation('/dashboard');
            } catch (error) {
              console.error('Authentication error:', error);
              toast({
                variant: "destructive",
                title: "Authentication failed",
                description: error instanceof Error ? error.message : "Could not sign in with Google",
              });
            }
          },
          auto_select: false
        });
        
        console.log('Google Sign-In initialized successfully');
      } catch (error) {
        console.error('Failed to initialize Google Sign-In:', error);
      }
    };
    
    // Check if Google API is loaded, if so initialize,
    // otherwise wait for it to load
    if (window.google && window.google.accounts) {
      initializeGoogleSignIn();
    } else {
      const checkGoogleApi = setInterval(() => {
        if (window.google && window.google.accounts) {
          clearInterval(checkGoogleApi);
          initializeGoogleSignIn();
        }
      }, 100);
      
      // Clean up interval
      return () => clearInterval(checkGoogleApi);
    }
  }, [setLocation, toast]);

  const handleGoogleSignIn = async () => {
    return new Promise<void>((resolve, reject) => {
      if (!window.google || !window.google.accounts) {
        reject(new Error('Google authentication is not available'));
        return;
      }

      try {
        // Using a custom approach instead of the prompt method
        // Create a temporary button and trigger the Google sign-in process
        const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
        
        console.log('Setting up Google Authentication with client ID:', 
          googleClientId ? 'Valid client ID exists' : 'Missing client ID');
          
        if (!googleClientId) {
          reject(new Error('Missing Google Client ID'));
          return;
        }
        
        // Initialize with custom parameters
        window.google.accounts.id.initialize({
          client_id: googleClientId,
          callback: async ({ credential }: any) => {
            if (!credential) {
              reject(new Error('No credential received from Google'));
              return;
            }
            
            try {
              console.log('Google credential received, authenticating with backend...');
              const response = await apiRequest('POST', '/api/auth/google', { credential });
              const data = await response.json();
              
              setIsAuthenticated(true);
              setUser(data.user);
              resolve();
              
              // Navigate after authentication
              setLocation('/dashboard');
            } catch (error) {
              console.error('Authentication error with backend:', error);
              reject(error);
            }
          },
          prompt_parent_id: 'g_id_onload',
          cancel_on_tap_outside: true
        });
        
        // Trigger the One Tap UI
        window.google.accounts.id.prompt((notification: any) => {
          console.log('Google prompt notification:', notification);
          
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            console.log('Google One Tap is not displayed or skipped. Showing manual sign-in button.');
            // If One Tap doesn't work, create a sign-in button manually
            const buttonContainer = document.getElementById('google-signin-button-container');
            if (buttonContainer) {
              buttonContainer.innerHTML = '';
              window.google.accounts.id.renderButton(buttonContainer, {
                type: 'standard',
                theme: 'outline',
                size: 'large',
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
                width: 250
              });
              console.log('Google Sign-In button created');
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
