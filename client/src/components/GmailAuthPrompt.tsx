import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'react-hot-toast';
import { SiGoogle } from 'react-icons/si';

interface GmailAuthPromptProps {
  onAuthorize: () => void;
  isLoading?: boolean;
}

export function GmailAuthPrompt({ onAuthorize, isLoading = false }: GmailAuthPromptProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthorize = async () => {
    try {
      setIsAuthenticating(true);
      
      // Get authorization URL from backend
      const response = await fetch('/api/auth/gmail-auth-url', {
        credentials: 'include',
      });
      
      if (!response.ok) {
        throw new Error('Failed to get authorization URL');
      }
      
      const data = await response.json();
      
      if (!data.authUrl) {
        throw new Error('No authorization URL provided');
      }
      
      // Redirect to Google auth
      window.location.href = data.authUrl;
      
    } catch (error) {
      console.error('Error starting Gmail authorization:', error);
      toast.error('Failed to start Gmail authorization. Please try again.');
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
