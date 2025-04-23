import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { ProgressBar } from "@/components/ui/progress";

export function Sidebar() {
  const [activeFolder, setActiveFolder] = useState("inbox");

  // Fetch labels
  const { data: labels } = useQuery({
    queryKey: ['/api/gmail/labels'],
    enabled: true
  });

  // Get storage info
  const { data: storageInfo } = useQuery({
    queryKey: ['/api/gmail/storage'],
    enabled: true
  });

  const folders = [
    { id: "inbox", name: "Inbox", icon: "inbox", count: 0 },
    { id: "starred", name: "Starred", icon: "star", count: 0 },
    { id: "snoozed", name: "Snoozed", icon: "schedule", count: 0 },
    { id: "sent", name: "Sent", icon: "send", count: 0 },
    { id: "drafts", name: "Drafts", icon: "description", count: 0 },
    { id: "trash", name: "Trash", icon: "delete", count: 0 },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-300 flex-shrink-0 hidden md:block overflow-y-auto">
      <div className="p-4">
        <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg flex items-center justify-center transition">
          <span className="material-icons mr-2">edit</span>
          <span>Compose</span>
        </button>
      </div>
      
      <nav className="mt-2">
        <ul>
          {folders.map((folder) => (
            <li key={folder.id}>
              <a 
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  setActiveFolder(folder.id);
                }}
                className={`flex items-center px-4 py-2 text-gray-800 ${
                  activeFolder === folder.id 
                    ? "bg-blue-50 border-r-4 border-blue-500" 
                    : "hover:bg-gray-100"
                }`}
              >
                <span className={`material-icons mr-3 text-gray-600`}>{folder.icon}</span>
                <span>{folder.name}</span>
                {folder.count > 0 && (
                  <span className="ml-auto bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                    {folder.count}
                  </span>
                )}
              </a>
            </li>
          ))}
        </ul>
      </nav>
      
      {labels && labels.length > 0 && (
        <div className="mt-8 px-4">
          <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Labels</h3>
          <ul>
            {labels.map((label: any) => (
              <li key={label.id}>
                <a 
                  href="#"
                  onClick={(e) => e.preventDefault()}
                  className="flex items-center px-4 py-2 text-gray-800 hover:bg-gray-100 rounded-lg text-sm"
                >
                  <span 
                    className="w-3 h-3 rounded-full mr-3"
                    style={{ backgroundColor: label.color || '#3B82F6' }}
                  ></span>
                  <span>{label.name}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {storageInfo && (
        <div className="mt-4 px-4 py-2 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Storage used: {storageInfo.percentUsed}%</span>
            <span>{storageInfo.usedFormatted} of {storageInfo.totalFormatted}</span>
          </div>
          <div className="w-full h-1 bg-gray-200 rounded-full mt-1">
            <div 
              className="h-1 bg-blue-500 rounded-full" 
              style={{ width: `${storageInfo.percentUsed}%` }}
            ></div>
          </div>
        </div>
      )}
    </aside>
  );
}
