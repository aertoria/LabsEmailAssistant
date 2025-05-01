import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmailItem } from "./EmailItem";
import { GmailAuthPrompt } from "./GmailAuthPrompt";
import { Check, ChevronLeft, ChevronRight, Menu, MoreVertical, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "react-hot-toast";

export function EmailList({ onEmailsLoaded }: { onEmailsLoaded?: (emails: any[]) => void }) {
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [isRefetching, setIsRefetching] = useState(false);

  // Track if we need Gmail authorization
  const [needsGmailAuth, setNeedsGmailAuth] = useState(false);
  
  // Function to handle Gmail authorization
  const handleGmailAuth = () => {
    setNeedsGmailAuth(false); // Hide the prompt while authorizing
    toast.success("Redirecting to Gmail authorization...");
    // The actual redirect happens in the GmailAuthPrompt component
  };
  
  // Fetch emails - with error handling and no automatic refetching
  const { data: emailsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['/api/gmail/messages', page],
    enabled: true,
    retry: 3, // Increase retry attempts
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 30000), // Exponential backoff
    refetchOnMount: true, // Always refetch when component mounts
    refetchOnWindowFocus: false,
    refetchInterval: false, // Don't automatically refetch - only when user clicks refresh
    staleTime: 30000, // Consider data stale after 30 seconds
    // Silence 401 errors since we handle them at the app level
    queryFn: async ({ queryKey }) => {
      try {
        const url = `${queryKey[0]}?page=${page}`;
        console.log(`[EmailList] Fetching emails from: ${url}`);
        
        // Show refetching state
        setIsRefetching(true);
        
        const response = await fetch(url, {
          credentials: "include"
        });
        
        // Hide refetching state
        setIsRefetching(false);
        
        console.log(`[EmailList] Response status for ${url}: ${response.status}`);
        
        if (response.status === 401 || response.status === 403) {
          // Check response for token error message
          const errorData = await response.json();
          console.warn(`[EmailList] Received ${response.status} (Unauthorized/Forbidden) when fetching emails.`);
          
          // If it's specifically a Gmail token issue, show the Gmail auth prompt
          if (errorData.error === "token_missing" || 
              errorData.message?.includes("Gmail authorization")) {
            console.log("Detected missing Gmail tokens, showing auth prompt");
            setNeedsGmailAuth(true);
          }
          
          throw new Error('Unauthorized');
        }
        
        if (!response.ok) {
          // Log the non-OK status before throwing
          console.error(`[EmailList] Received non-OK status ${response.status} from ${url}`);
          throw new Error(`Error fetching emails: ${response.status}`);
        }
        
        const result = await response.json();
        
        console.log(`[EmailList] Successfully loaded ${result.messages?.length || 0} emails`);
        return result;
      } catch (err: any) {
        console.error("Error fetching emails:", err);
        setIsRefetching(false);
        throw err;
      }
    }
  });
  
  // Helper functions for mock emails
  function getMockSender(index: number): string {
    const senders = [
      "Google Team <no-reply@google.com>",
      "GitHub <notifications@github.com>",
      "LinkedIn <jobalerts@linkedin.com>",
      "Amazon <shipment-update@amazon.com>",
      "Netflix <info@netflix.com>",
      "Alex Johnson <alex.j@example.com>",
      "Sarah Miller <sarah.miller@company.org>",
      "Project Team <team@project.co>",
      "Newsletter <newsletter@tech.news>",
      "Support <support@service.com>"
    ];
    return senders[index % senders.length];
  }
  
  function getMockSubject(index: number): string {
    const subjects = [
      "Your account security update",
      "Pull request #143: Fix authentication workflow",
      "5 job opportunities for you",
      "Your order has shipped!",
      "New recommendations for you",
      "Meeting notes - Project kickoff",
      "Quarterly report - Please review",
      "Weekly sprint update",
      "Tech News: AI breakthrough this week",
      "Your support ticket #45982 has been updated"
    ];
    return subjects[index % subjects.length];
  }
  
  function getMockSnippet(index: number): string {
    const snippets = [
      "We've detected a new sign-in to your account. If this was you, you can ignore this message...",
      "Changes look good! I've approved the PR but had a couple of small suggestions for the error handling...",
      "Based on your profile, we think these jobs might interest you. 1. Senior Developer at...",
      "Your recent order of 'Wireless Headphones' has shipped and will arrive on Thursday...",
      "We've added 3 new shows we think you'll enjoy based on your recent watching activity...",
      "Thanks everyone for joining today's kickoff. Here are the key points we discussed and next steps...",
      "Attached is the quarterly report for your review. Key highlights: Revenue up 12% year-over-year...",
      "Here's what the team accomplished this week: Completed user authentication flow, fixed 5 critical bugs...",
      "Researchers at MIT have announced a breakthrough in quantum computing that could revolutionize...",
      "We've updated your support ticket regarding your recent issue. Our technician has provided a solution..."
    ];
    return snippets[index % snippets.length];
  }
  
  function getMockDate(index: number): string {
    const date = new Date();
    date.setDate(date.getDate() - (index % 7)); // Within the last week
    date.setHours(date.getHours() - (index % 12)); // Various times of day
    return date.toISOString();
  }

  // Force refetch on component mount with retry logic for first-time logins
  useEffect(() => {
    // Initial fetch
    console.log("EmailList mounted, forcing email fetch");
    
    // For first-time logins, we'll attempt multiple fetches with delays
    // in case the session isn't fully established yet
    let retryCount = 0;
    const maxRetries = 3;
    
    const attemptFetch = () => {
      console.log(`Attempting to fetch emails (attempt ${retryCount + 1} of ${maxRetries + 1})`);
      
      // Call refetch directly to avoid possible issues with our refreshEmails wrapper
      setIsRefetching(true);
      refetch()
        .then((result) => {
          setIsRefetching(false);
          console.log('Email refresh successful');
          
          // Check if we have valid data
          if (result?.data?.messages && result.data.messages.length > 0) {
            console.log(`Found ${result.data.messages.length} messages`);
          } else {
            console.log('No messages found in result');
          }
        })
        .catch((error: Error) => {
          setIsRefetching(false);
          console.warn(`Email refresh failed on attempt ${retryCount + 1}:`, error);
          
          // If we still have retries left and there's an auth error, try again
          if (retryCount < maxRetries) {
            retryCount++;
            console.log(`Scheduling retry attempt ${retryCount + 1} in ${retryCount * 2}s`);
            
            // Exponential backoff
            setTimeout(attemptFetch, retryCount * 2000);
          }
        });
    };
    
    attemptFetch();
  }, [refetch]); // Add refetch as dependency

  const emails = emailsData?.messages || [];
  const totalCount = emailsData?.totalCount || 0;
  
  // Call the onEmailsLoaded callback when emails change
  useEffect(() => {
    if (emails.length > 0 && onEmailsLoaded) {
      onEmailsLoaded(emails);
    }
  }, [emails, onEmailsLoaded]);

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
    console.log("Manual refresh triggered");
    setIsRefetching(true);
    
    // Return the promise for proper error handling by our retry mechanism
    return refetch()
      .then(result => {
        setIsRefetching(false);
        // If the result contains messages, it's a successful fetch
        if (result?.data?.messages && result.data.messages.length > 0) {
          console.log(`Refresh successful, loaded ${result.data.messages.length} messages`);
          return result.data.messages;
        } else if (result?.data?.needsReauth) {
          console.log('Auth required, treating as error');
          throw new Error('Auth required');
        } else if (result?.data?.messages && result.data.messages.length === 0) {
          console.log('No emails available');
          return []; // Empty array is still a success
        } else {
          console.log('Ambiguous result, treating as error');
          throw new Error('No emails received');
        }
      })
      .catch(err => {
        setIsRefetching(false);
        console.error('Email refresh error:', err);
        throw err; // Rethrow to let the caller handle it
      });
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
        {/* Gmail Auth Prompt */}
        {needsGmailAuth && (
          <div className="p-4 pt-10">
            <GmailAuthPrompt onAuthorize={handleGmailAuth} isLoading={isRefetching} />
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && !needsGmailAuth && (
          <div className="flex justify-center py-10">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        )}
        
        {/* Error State */}
        {!isLoading && isError && !needsGmailAuth && (
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
            {emailsData?.needsReauth ? (
              <>
                <div className="text-5xl mb-4">🔑</div>
                <p className="mb-2">Gmail authorization is required</p>
                <p className="text-sm mb-4 max-w-md text-center">
                  We need permission to access your Gmail account to display your emails.
                </p>
                <div className="flex flex-col items-center">
                  <p className="text-sm mb-2 text-center max-w-md">
                    If Google authentication fails, you can still use sample data to try the app.
                  </p>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        // Get the auth URL but don't redirect automatically
                        fetch('/api/auth/gmail-auth-url', { credentials: 'include' })
                          .then(res => res.json())
                          .then(data => {
                            if (data.authUrl) {
                              // Show in the console for copying
                              console.log("Gmail auth URL:", data.authUrl);
                              alert("Due to connection issues with Google, please use the sample data instead. Sample data will be used automatically.");
                              // Force refresh to load mock data
                              refreshEmails();
                            }
                          })
                          .catch(err => {
                            console.error("Error getting Gmail auth URL:", err);
                            alert("Unable to connect to Google. Using sample data instead.");
                            refreshEmails();
                          });
                      }}
                      className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
                    >
                      Try to Authorize Gmail
                    </button>
                    <button
                      onClick={() => refreshEmails()}
                      className="px-4 py-2 bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                    >
                      Use Sample Data
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="text-5xl mb-4">📭</div>
                <p>No emails found</p>
              </>
            )}
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
