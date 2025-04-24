import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const [isLoading, setIsLoading] = useState(false);
  const { isAuthenticated, handleGoogleSignIn } = useAuth();
  const [_, setLocation] = useLocation();
  const { toast } = useToast();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    }
  }, [isAuthenticated, setLocation]);

  // Create a simple Google Sign-In function
  const onGoogleSignInClick = async () => {
    try {
      setIsLoading(true);
      
      // First, check if Google is available
      if (!window.google || !window.google.accounts) {
        throw new Error("Google authentication services not available. Please try again later.");
      }
      
      console.log("Attempting Google sign-in...");
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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <Card className="w-full max-w-md shadow-md">
        <CardContent className="p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-semibold text-gray-900 mb-2">MailSync</h1>
            <p className="text-gray-600">Securely access and manage your Gmail</p>
          </div>
          
          <div className="space-y-6">
            <div className="text-center">
              <p className="text-sm text-gray-700 mb-4">Sign in with your Google account to access your emails</p>
              
              <div className="flex flex-col items-center">
                <button 
                  ref={buttonRef}
                  onClick={onGoogleSignInClick}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center bg-white border border-gray-300 rounded-md py-2 px-4 font-medium text-gray-800 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                >
                  <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                  {isLoading ? "Signing in..." : "Sign in with Google"}
                </button>
                
                {/* This div will be used for the Google One Tap sign-in */}
                <div id="g_id_onload" data-client_id={import.meta.env.VITE_GOOGLE_CLIENT_ID} data-auto_select="false"></div>
                
                {/* This div will be used for the manual Google Sign-In button if One Tap fails */}
                <div id="google-signin-button-container" className="mt-4"></div>
              </div>

              {isLoading && (
                <div className="mt-4 flex flex-col items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                  <p className="text-sm text-gray-600 mt-2">Authenticating...</p>
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-200 pt-6">
              <div className="text-xs text-gray-500">
                <p className="mb-2">By signing in, you agree to our <a href="#" className="text-blue-500 hover:underline">Terms of Service</a> and <a href="#" className="text-blue-500 hover:underline">Privacy Policy</a>.</p>
                <p>MailSync only requests read-only access to your Gmail account. We never store your emails on our servers.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
