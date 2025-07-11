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
  const didRedirect = useRef(false);
  
  // Debug: Log Google Client ID
  useEffect(() => {
    const rawClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;
    const trimmedClientId = rawClientId?.trim();
    console.log("Frontend Google Client ID (raw):", rawClientId);
    console.log("Frontend Google Client ID (trimmed):", trimmedClientId);
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !didRedirect.current) {
      console.log("User is authenticated, redirecting to dashboard");
      didRedirect.current = true;
      window.location.href = "/dashboard";
    }
  }, [isAuthenticated]);

  const [curlResponse, setCurlResponse] = useState<string | null>("");
  const [curlRequest, setCurlRequest] = useState<string | null>("");
  const [isOnePlatformLoading, setIsOnePlatformLoading] = useState(false);

  const onGoogleSignInClick = async () => {
    try {
      setIsLoading(true);
      setCurlRequest(null);
      setCurlResponse(null);
      
      // Show loading message
      toast({
        variant: "default",
        title: "Initiating Google sign-in",
        description: "Opening authentication window...",
      });
      
      await handleGoogleSignIn();
    } catch (error) {
      console.error("Google sign-in error:", error);
      
      // Display error in the authorization field box for debugging
      const errorDetails = {
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        type: "Google Sign-In Error",
        response: (error as any)?.response || null,
        fullError: {
          message: error instanceof Error ? error.message : "Unknown error",
          stack: error instanceof Error ? error.stack : undefined,
          ...(error as any)
        }
      };
      
      setCurlRequest("Google OAuth Authentication");
      setCurlResponse(JSON.stringify(errorDetails, null, 2));
      
      toast({
        variant: "destructive",
        title: "Authentication failed",
        description: error instanceof Error ? error.message : "Could not sign in with Google",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const onOnePlatformSignInClick = async () => {
    try {
      setIsOnePlatformLoading(true);
      
      // Set the request command that will be executed
      const curlCommand = 'curl -s -X POST https://cc.sandbox.googleapis.com/v1/auth:initiate';
      setCurlRequest(`Executing command:\n${curlCommand}`);
      
      // Execute the curl command
      const response = await fetch('/api/auth/one-platform', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          command: curlCommand
        })
      });

      const result = await response.json();
      setCurlResponse(JSON.stringify(result, null, 2));
      
      // Parse the response and open the authUrl in a new window
      if (result.authUrl) {
        console.log("Opening auth URL in new window:", result.authUrl);
        
        // Open the authentication URL in a popup window
        const popupWidth = 500;
        const popupHeight = 600;
        const left = (window.screen.width - popupWidth) / 2;
        const top = (window.screen.height - popupHeight) / 2;
        
        const authWindow = window.open(
          result.authUrl,
          'OnePlatformAuth',
          `width=${popupWidth},height=${popupHeight},left=${left},top=${top},resizable=yes,scrollbars=yes,status=yes`
        );
        
        // Optional: Check if popup was blocked
        if (!authWindow || authWindow.closed || typeof authWindow.closed === 'undefined') {
          toast({
            variant: "default",
            title: "Popup blocked",
            description: "Please allow popups for this site to continue with authentication",
          });
        } else {
          // Add visual indicator that authentication is in progress
          toast({
            variant: "default",
            title: "Authentication in progress",
            description: "Complete the sign-in process in the popup window",
          });
          
          // Since One Platform uses Google's sandbox redirect, we need to
          // extract the authorization code from the URL after redirect
          // For now, we'll monitor the popup and extract the code
          const checkInterval = setInterval(async () => {
            try {
              // Check if we can access the popup URL (will fail due to CORS if on Google domain)
              if (authWindow.closed) {
                clearInterval(checkInterval);
                setIsOnePlatformLoading(false);
                
                // After popup closes, check if authentication succeeded
                toast({
                  variant: "default", 
                  title: "Authentication window closed",
                  description: "The One Platform flow redirects to Google's sandbox URL. Please use the regular 'Sign in with Google' button for full authentication.",
                });
              } else {
                // Try to check the URL (this will only work when on our domain)
                try {
                  const popupUrl = authWindow.location.href;
                  // Check if URL contains our callback with code
                  if (popupUrl.includes('code=')) {
                    clearInterval(checkInterval);
                    authWindow.close();
                    
                    // Extract code from URL
                    const urlParams = new URLSearchParams(popupUrl.split('?')[1]);
                    const code = urlParams.get('code');
                    
                    if (code) {
                      // Exchange code for tokens
                      const response = await fetch('/api/auth/google', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ code }),
                        credentials: 'include',
                      });
                      
                      if (response.ok) {
                        toast({
                          variant: "default",
                          title: "Authentication successful",
                          description: "Redirecting to dashboard...",
                        });
                        
                        setTimeout(() => {
                          window.location.href = '/dashboard';
                        }, 500);
                      }
                    }
                  }
                } catch (e) {
                  // Can't access popup URL due to CORS - this is expected
                }
              }
            } catch (error) {
              console.error("Error monitoring auth window:", error);
            }
          }, 1000); // Check every second
          
          // Clean up interval after 5 minutes to prevent memory leak
          setTimeout(() => {
            clearInterval(checkInterval);
            setIsOnePlatformLoading(false);
          }, 5 * 60 * 1000);
        }
      }
      
    } catch (error) {
      console.error("One Platform sign-in error:", error);
      const errorResponse = {
        error: "Failed to execute curl command",
        details: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      };
      setCurlResponse(JSON.stringify(errorResponse, null, 2));
    } finally {
      setIsOnePlatformLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="flex flex-col items-center space-y-6 p-8 bg-white rounded-lg shadow-md max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800">Labster's Mail Assist</h1>
        <p className="text-gray-600">Sign in to continue</p>
        
        {/* Google Sign In Button */}
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

        {/* One Platform Sign In Button */}
        <button
          onClick={onOnePlatformSignInClick}
          disabled={isOnePlatformLoading}
          className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isOnePlatformLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
              Sign in through One Platform
            </>
          )}
        </button>

        {/* Display curl request and response */}
        {curlRequest && (
          <div className="w-full mt-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Command Executed:</h3>
            <pre className="bg-blue-50 p-4 rounded-lg text-xs overflow-x-auto text-blue-800 whitespace-pre-wrap border-l-4 border-blue-500">
              {curlRequest}
            </pre>
          </div>
        )}
        
        {curlResponse && (
          <>
            <div className="w-full mt-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Response:</h3>
              <pre className="bg-green-50 p-4 rounded-lg text-xs overflow-x-auto text-green-800 whitespace-pre-wrap border-l-4 border-green-500">
                {curlResponse}
              </pre>
            </div>
            
            {/* Show popup notification */}
            {JSON.parse(curlResponse).authUrl && (
              <div className="w-full mt-4 p-4 bg-purple-50 border-l-4 border-purple-500 rounded-lg">
                <p className="text-purple-800 text-sm font-medium">
                  🔗 Authentication window opened! Please complete the sign-in process in the popup window.
                </p>
                <p className="text-purple-600 text-xs mt-1">
                  If you don't see a popup, please check your browser's popup blocker settings.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
