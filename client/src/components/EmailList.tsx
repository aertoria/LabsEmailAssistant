import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { EmailItem } from "./EmailItem";
import { Check, ChevronLeft, ChevronRight, Menu, MoreVertical, RefreshCw } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

export function EmailList() {
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [page, setPage] = useState(1);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Fetch emails
  const { data: emailsData, isLoading, refetch } = useQuery({
    queryKey: ['/api/gmail/messages', page],
    enabled: true
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
        
        {!isLoading && emails.length === 0 && (
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
