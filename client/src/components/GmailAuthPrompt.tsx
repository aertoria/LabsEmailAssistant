import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { SiGoogle } from 'react-icons/si';
import { useAuth } from '@/hooks/useAuth';

interface GmailAuthPromptProps {
  onAuthorize: () => void;
  isLoading?: boolean;
}

export function GmailAuthPrompt({ onAuthorize, isLoading = false }: GmailAuthPromptProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const { handleGoogleSignIn } = useAuth();

  // Check if we need to completely re-authenticate
  const [needsFullReauth, setNeedsFullReauth] = useState(false);

  // Check if this might be a session issue
  useEffect(() => {
    // Check server session status
    fetch('/api/auth/status', { credentials: 'include' })
      .then(response => response.json())
      .then(data => {
        if (!data.authenticated) {
          console.log('Session invalid, need full Google re-authentication');
          setNeedsFullReauth(true);
        } else {
          console.log('Session valid, just need Gmail scope authorization');
          setNeedsFullReauth(false);
        }
      })
      .catch(error => {
        console.error('Error checking authentication status:', error);
        // Default to full re-auth on error
        setNeedsFullReauth(true);
      });
  }, []);

  const handleAuthorize = async () => {
    try {
      setIsAuthenticating(true);
      
      // If we need full re-auth, use the Google Sign In flow
      if (needsFullReauth) {
        console.log('Starting full Google re-authentication flow');
        await handleGoogleSignIn();
        // If successful, this will redirect to dashboard
        onAuthorize(); // Also let parent know we're done
        return;
      }
      
      // Otherwise just get Gmail authorization URL
      console.log('Getting Gmail authorization URL');
      const response = await fetch('/api/auth/gmail-auth-url', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        console.warn('Failed to get authorization URL, falling back to full auth');
        await handleGoogleSignIn();
        return;
      }
      
      const data = await response.json();
      
      if (!data.authUrl) {
        throw new Error('No authorization URL provided');
      }
      
      // Redirect to Google auth
      window.location.href = data.authUrl;
      
    } catch (error) {
      console.error('Error during authorization:', error);
      toast.error('Authorization failed. Please try signing in again.');
      setIsAuthenticating(false);
    }
  };

  return (
    <Card className="p-6 flex flex-col items-center justify-center gap-4 max-w-md mx-auto">
      <div className="w-16 h-16 flex items-center justify-center bg-gradient-to-br from-red-500 to-orange-600 rounded-full mb-2">
        <SiGoogle className="w-8 h-8 text-white" />
      </div>
      
      <h2 className="text-xl font-bold text-center">Gmail Authorization Required</h2>
      
      <p className="text-center text-muted-foreground mb-2">
        To access and analyze your emails, this app needs permission to read your Gmail messages.
        Your data is kept private and secure.
      </p>
      
      <Button 
        size="lg"
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
        onClick={handleAuthorize}
        disabled={isAuthenticating || isLoading}
      >
        {isAuthenticating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-opacity-50 border-t-white rounded-full animate-spin mr-2"></div>
            Authorizing...
          </>
        ) : (
          <>
            <SiGoogle className="w-5 h-5" />
            Authorize Gmail Access
          </>
        )}
      </Button>
      
      <p className="text-xs text-center text-muted-foreground mt-4">
        You will be redirected to Google for secure authentication.
        No passwords are stored by this application.
      </p>
    </Card>
  );
}
