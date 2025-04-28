import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, handleGoogleSignIn } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);
  const didRedirect = useRef(false);
  const scriptLoadAttempts = useRef(0);

  // Redirect if already authenticated using React Router
  useEffect(() => {
    if (isAuthenticated && !didRedirect.current) {
      console.log("User is authenticated, redirecting to dashboard");
      didRedirect.current = true;
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated]);

  // Load Google auth script on component mount
  useEffect(() => {
    const loadGoogleScript = async () => {
      if (window.google?.accounts) {
        return; // Script already loaded
      }

      try {
        // Remove any existing script to prevent duplicates
        const existingScript = document.getElementById('google-auth-script');
        if (existingScript) {
          existingScript.remove();
        }

        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.id = 'google-auth-script';

        await new Promise<void>((resolve, reject) => {
          script.onload = () => {
            if (window.google?.accounts) {
              console.log('Google auth script loaded successfully');
              resolve();
            } else {
              reject(new Error('Google auth script loaded but window.google.accounts is not available'));
            }
          };
          
          script.onerror = () => {
            reject(new Error('Failed to load Google authentication script'));
          };

          document.body.appendChild(script);

          // Add timeout with retry logic
          setTimeout(() => {
            if (!window.google?.accounts) {
              if (scriptLoadAttempts.current < 3) {
                scriptLoadAttempts.current++;
                console.log(`Retrying Google auth script load (attempt ${scriptLoadAttempts.current})`);
                script.remove();
                loadGoogleScript();
              } else {
                reject(new Error('Authentication service load timed out after multiple attempts'));
              }
            }
          }, 5000);
        });
      } catch (error) {
        console.error('Error loading Google auth script:', error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Failed to load authentication service. Please check your internet connection and try again.",
        });
      }
    };

    loadGoogleScript();
  }, [toast]);

  const onGoogleSignInClick = async () => {
    try {
      setIsLoading(true);
      
      if (!window.google?.accounts) {
        throw new Error("Authentication service not ready. Please wait a moment and try again.");
      }
      
      await handleGoogleSignIn();
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Could not sign in with Google",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardContent className="p-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Welcome Back</h1>
            <p className="text-gray-600 mb-6">Sign in to continue</p>
            
            <button
              ref={buttonRef}
              onClick={onGoogleSignInClick}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 bg-white border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-900"></div>
              ) : (
                <>
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
            
            <div ref={googleButtonRef} className="mt-4"></div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
