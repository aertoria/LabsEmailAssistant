import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CopyIcon, CheckIcon, ExternalLinkIcon } from "lucide-react";

export function GoogleAuthSetupHelp() {
  const [open, setOpen] = useState(false);
  const [originCopied, setOriginCopied] = useState(false);
  const [redirectUriCopied, setRedirectUriCopied] = useState(false);
  
  // Use refs instead of state to avoid re-renders
  const originRef = useRef(window.location.origin);
  const redirectUriRef = useRef(`${window.location.origin}/api/auth/callback`);
  
  const copyToClipboard = (text: string, type: 'origin' | 'redirect') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'origin') {
        setOriginCopied(true);
        setTimeout(() => setOriginCopied(false), 2000);
      } else {
        setRedirectUriCopied(true);
        setTimeout(() => setRedirectUriCopied(false), 2000);
      }
    });
  };
  
  return (
    <>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="mt-4"
      >
        Google OAuth Setup Help
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Google OAuth Setup</DialogTitle>
            <DialogDescription>
              Configure these URLs in your Google Cloud Console to enable Google Sign In
            </DialogDescription>
          </DialogHeader>
        
          <div className="space-y-6 py-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Authorized JavaScript Origins</h3>
              <p className="text-xs text-gray-500">
                Add this URL to the "Authorized JavaScript origins" section
              </p>
              <div className="flex items-center space-x-2">
                <Input 
                  value={originRef.current} 
                  readOnly 
                  className="text-xs font-mono"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(originRef.current, 'origin')}
                >
                  {originCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Authorized Redirect URIs</h3>
              <p className="text-xs text-gray-500">
                Add this URL to the "Authorized redirect URIs" section
              </p>
              <div className="flex items-center space-x-2">
                <Input 
                  value={redirectUriRef.current} 
                  readOnly 
                  className="text-xs font-mono"
                />
                <Button
                  size="icon"
                  variant="outline"
                  onClick={() => copyToClipboard(redirectUriRef.current, 'redirect')}
                >
                  {redirectUriCopied ? <CheckIcon className="h-4 w-4" /> : <CopyIcon className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Steps to configure</h3>
              <ol className="text-xs text-gray-700 space-y-2 list-decimal pl-4">
                <li>Go to <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">Google Cloud Console Credentials</a></li>
                <li>Select your project</li>
                <li>Click on your OAuth 2.0 Client ID (or create one if needed)</li>
                <li>Add the URLs above to the appropriate sections</li>
                <li>Click "Save"</li>
              </ol>
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')}
              className="w-full"
            >
              Open Google Cloud Console <ExternalLinkIcon className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}