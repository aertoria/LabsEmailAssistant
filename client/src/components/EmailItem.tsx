import { useState } from 'react';
import { Checkbox } from '@/components/ui/checkbox';
import { Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

interface EmailItemProps {
  email: {
    id: string;
    threadId: string;
    from: string;
    subject: string;
    snippet: string;
    receivedAt: string;
    isStarred: boolean;
    isRead: boolean;
  };
  isSelected: boolean;
  onSelect: () => void;
}

export function EmailItem({ email, isSelected, onSelect }: EmailItemProps) {
  const [isStarred, setIsStarred] = useState(email.isStarred);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const toggleStar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    try {
      setIsStarred(!isStarred);
      
      await apiRequest('POST', `/api/gmail/messages/${email.id}/star`, {
        star: !isStarred
      });
      
      // Invalidate queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ['/api/gmail/messages'] });
      
    } catch (error) {
      // Revert the state if there's an error
      setIsStarred(isStarred);
      
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update star status"
      });
    }
  };

  const handleEmailClick = () => {
    // Open email view functionality would go here
    console.log('Open email:', email.id);
  };

  // Format the date - handle different date field names
  const formatDate = (email: any) => {
    // Check for the different possible date field names
    const dateString = email.receivedAt || email.date || new Date().toISOString();
    
    const date = new Date(dateString);
    const now = new Date();
    
    // Today, show time
    if (date.toDateString() === now.toDateString()) {
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }
    
    // This year, show month and day
    if (date.getFullYear() === now.getFullYear()) {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
    
    // Different year, show with year
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div 
      className={`border-b border-gray-200 bg-white cursor-pointer hover:shadow-sm ${
        !email.isRead ? 'font-medium' : ''
      }`}
      onClick={handleEmailClick}
    >
      <div className="px-4 py-3 flex items-start">
        <div className="flex items-center mr-4">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onSelect()}
            onClick={(e) => e.stopPropagation()}
            className="mr-2"
          />
          <button 
            className={`${isStarred ? 'text-yellow-500' : 'text-gray-400 hover:text-yellow-500'}`}
            onClick={toggleStar}
          >
            <Star className={`h-5 w-5 ${isStarred ? 'fill-current' : ''}`} />
          </button>
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between mb-1">
            <div className="font-medium text-gray-900 truncate">{email.from}</div>
            <div className="text-xs text-gray-500 whitespace-nowrap ml-2">
              {formatDate(email)}
            </div>
          </div>
          
          <div className="text-sm text-gray-800 font-medium truncate mb-1">{email.subject}</div>
          
          <div className="text-sm text-gray-600 truncate">{email.snippet}</div>
        </div>
      </div>
    </div>
  );
}
