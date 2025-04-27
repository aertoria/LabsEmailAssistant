import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmailItem } from "./EmailItem";
import { Check, ChevronLeft, ChevronRight, Menu, MoreVertical, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export function EmailList() {
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Fetch emails - with error handling and no automatic refetching
  const { data: emailsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['/api/gmail/messages', page],
    enabled: true,
    retry: 1,
    refetchOnMount: false, // Don't refetch on mount
    refetchOnWindowFocus: false,
    refetchInterval: false, // Don't automatically refetch - only when user clicks refresh
    staleTime: Infinity, // Never consider the data stale
    // Silence 401 errors since we handle them at the app level
    queryFn: async ({ queryKey }) => {
      try {
        // Only use real Gmail data - no demo mode
        const url = `${queryKey[0]}?page=${page}`;
        console.log("Fetching emails from:", url, "(REAL GMAIL DATA)");
        
        const response = await fetch(url, {
          credentials: "include"
        });
        
        if (response.status === 401) {
          // Auth error, will be handled by the auth provider
          console.warn("Unauthorized when fetching emails, returning empty list");
          return { messages: [], totalCount: 0 };
        }
        
        if (!response.ok) {
          throw new Error(`Error fetching emails: ${response.status}`);
        }
        
        const result = await response.json();
        
        // Log that we're using real data
        console.log("Successfully loaded", result.messages.length, "emails (real Gmail data)");
        
        // Add data source indicator to the returned result
        return {
          ...result,
          dataSource: "gmail"
        };
      } catch (err) {
        console.error("Error fetching emails:", err);
        // Return empty data instead of throwing to avoid error UI
        return { messages: [], totalCount: 0 };
      }
    }
  });

  const emails = emailsData?.messages || [];
  const totalCount = emailsData?.totalCount || 0;

  const toggleSelectAll = () => {
    if (selectedEmails.length === emails.length) {
      setSelectedEmails([]);
    } else {
      setSelectedEmails(emails.map((email: any) => email.id));
    }
  };

  const toggleEmailSelection = (emailId: string) => {
    if (selectedEmails.includes(emailId)) {
      setSelectedEmails(selectedEmails.filter(id => id !== emailId));
    } else {
      setSelectedEmails([...selectedEmails, emailId]);
    }
  };

  const refreshEmails = () => {
    refetch();
  };

  return (
    <div className="flex-1 flex flex-col bg-gray-50 overflow-hidden">
      {/* Email List Header */}
      <div className="bg-white border-b border-gray-300 p-2 flex items-center justify-between">
        <div className="flex items-center">
          <button 
            className="p-2 rounded-full hover:bg-gray-100 md:hidden"
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          >
            <Menu size={20} />
          </button>
          <div className="flex items-center ml-2">
            <label className="inline-flex items-center mr-4">
              <Checkbox 
                checked={selectedEmails.length > 0 && selectedEmails.length === emails.length}
                onCheckedChange={toggleSelectAll}
                className="h-4 w-4 text-blue-500"
              />
            </label>
            <button 
              className="p-2 rounded-full hover:bg-gray-100" 
              title="Refresh"
              onClick={refreshEmails}
            >
              <RefreshCw size={18} />
            </button>
            <button className="p-2 rounded-full hover:bg-gray-100" title="More actions">
              <MoreVertical size={18} />
            </button>
            {/* Gmail Data Indicator */}
            <span 
              id="data-source-indicator" 
              className="ml-3 text-xs font-medium p-1 bg-green-100 text-green-800 rounded"
            >
              Real Gmail Data
            </span>
          </div>
        </div>
        
        <div className="flex items-center">
          {totalCount > 0 && (
            <div className="text-xs text-gray-500 hidden sm:block mr-4">
              {Math.min((page - 1) * 50 + 1, totalCount)}-{Math.min(page * 50, totalCount)} of {totalCount}
            </div>
          )}
          <div className="flex">
            <button 
              className="p-2 rounded-full hover:bg-gray-100" 
              title="Newer"
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
            >
              <ChevronLeft size={18} />
            </button>
            <button 
              className="p-2 rounded-full hover:bg-gray-100" 
              title="Older"
              onClick={() => setPage(page + 1)}
              disabled={page * 50 >= totalCount}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Email List */}
      <div className="overflow-y-auto flex-1">
        {isLoading && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {!isLoading && isError && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-5xl mb-4">⚠️</div>
            <p>Error loading emails</p>
            <button
              onClick={() => refetch()}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition"
            >
              Try Again
            </button>
          </div>
        )}
        
        {!isLoading && !isError && emails.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-gray-500">
            <div className="text-5xl mb-4">📭</div>
            <p>No emails found</p>
          </div>
        )}
        
        {emails.map((email: any) => (
          <EmailItem 
            key={email.id} 
            email={email} 
            isSelected={selectedEmails.includes(email.id)}
            onSelect={() => toggleEmailSelection(email.id)}
          />
        ))}
      </div>
    </div>
  );
}
