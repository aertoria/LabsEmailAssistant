import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Star, ArrowLeft, Trash, MailPlus, Reply, Clock, MoreHorizontal } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { apiRequest } from '@/lib/queryClient';

// Extract the sender name from various email formats
function extractSenderName(from: string): string {
  if (!from) return 'Unknown';
  
  // Format: "Name <email@example.com>"
  if (from.includes('<')) {
    return from.split('<')[0].trim();
  }
  
  // Format: email@example.com (Name)
  if (from.includes('(') && from.includes(')')) {
    const match = from.match(/\((.*?)\)/);
    if (match && match[1]) return match[1];
  }
  
  // Just return the email address or whatever we have
  return from.split('@')[0] || from;
};

// Extract email address from various formats
function extractEmailAddress(from: string): string {
  if (!from) return '';
  
  // Format: "Name <email@example.com>"
  if (from.includes('<') && from.includes('>')) {
    const match = from.match(/<([^>]+)>/);
    if (match && match[1]) return match[1];
  }
  
  // If there's no angle brackets, assume it's just an email
  if (from.includes('@')) {
    return from.trim();
  }
  
  return '';
}

// Format date for display
function formatDetailDate(dateString: string): string {
  const date = new Date(dateString);
  
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  };
  
  return date.toLocaleString(undefined, options);
}

interface EmailDetailProps {
  emailId: string;
  onClose: () => void;
}

export function EmailDetail({ emailId, onClose }: EmailDetailProps) {
  const [isStarred, setIsStarred] = useState(false);
  
  // Fetch the full email data
  const { data: email, isLoading, isError } = useQuery({
    queryKey: [`/api/gmail/messages/${emailId}`],
    enabled: !!emailId,
    staleTime: 1000 * 60 * 5, // Consider data fresh for 5 minutes
  });
  
  // Update starred state when email loads
  useEffect(() => {
    if (email) {
      setIsStarred(email.isStarred || false);
    }
  }, [email]);
  
  // Toggle star status
  const toggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setIsStarred(!isStarred);
      
      await apiRequest('POST', `/api/gmail/messages/${emailId}/star`, {
        star: !isStarred
      });
      
    } catch (error) {
      // Revert the state if there's an error
      setIsStarred(isStarred);
      console.error('Error toggling star:', error);
    }
  };
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-white">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-4">
            <Skeleton className="h-6 w-3/4" />
            <div className="flex items-center space-x-2">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-[250px]" />
                <Skeleton className="h-4 w-[200px]" />
              </div>
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </div>
    );
  }
  
  // Render error state
  if (isError || !email) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-white">
        <div className="border-b border-gray-200 p-4 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-6 flex flex-col items-center justify-center text-gray-500">
          <div className="text-5xl mb-4">⚠️</div>
          <p>Failed to load email</p>
          <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>
            Reload
          </Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col overflow-hidden bg-white">
      {/* Email header */}
      <div className="border-b border-gray-200 p-4 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={onClose}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        
        <div className="flex items-center space-x-1">
          <Button variant="ghost" size="icon">
            <Clock className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <Trash className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      {/* Email content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {/* Subject */}
          <h1 className="text-2xl font-semibold mb-6">{email.subject}</h1>
          
          {/* Sender info */}
          <div className="flex items-start mb-6">
            <Avatar className="h-10 w-10 mr-4 mt-1">
              <div className="bg-blue-500 text-white w-full h-full flex items-center justify-center text-lg font-semibold">
                {extractSenderName(email.from).charAt(0).toUpperCase()}
              </div>
            </Avatar>
            
            <div className="flex-1">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-medium">{extractSenderName(email.from)}</div>
                  <div className="text-sm text-gray-500">{extractEmailAddress(email.from)}</div>
                </div>
                
                <div className="flex items-center">
                  <div className="text-sm text-gray-500 mr-3">{formatDetailDate(email.date)}</div>
                  <button 
                    className={`${isStarred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
                    onClick={toggleStar}
                  >
                    <Star className={`h-5 w-5 ${isStarred ? 'fill-current' : ''}`} />
                  </button>
                </div>
              </div>
              
              <div className="mt-1 text-sm text-gray-600">
                To: {email.to || 'me'}
              </div>
            </div>
          </div>
          
          <Separator className="my-6" />
          
          {/* Email body content - render HTML */}
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: email.body || `<p>${email.snippet || 'No content'}</p>` }}
          />
          
          {/* Reply buttons */}
          <div className="mt-8 mb-12 flex space-x-3">
            <Button>
              <Reply className="mr-2 h-4 w-4" />
              Reply
            </Button>
            <Button variant="outline">
              <MailPlus className="mr-2 h-4 w-4" />
              Forward
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
