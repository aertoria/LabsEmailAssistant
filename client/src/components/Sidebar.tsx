import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { 
  Inbox, Star, Clock, Send, FileText, Trash, Edit, 
  BrainCircuit, MessageSquare, PenTool, Archive, Search, Command, Users
} from "lucide-react";

interface SidebarProps {
  onFeatureSelect?: (featureId: string) => void;
  activeFeature?: string | null;
}

export function Sidebar({ onFeatureSelect, activeFeature }: SidebarProps) {
  const [activeFolder, setActiveFolder] = useState("inbox");

  // Fetch labels
  const { data: labels } = useQuery<any[]>({
    queryKey: ['/api/gmail/labels'],
    enabled: true
  });

  // Get storage info
  const { data: storageInfo } = useQuery<{
    percentUsed: number;
    usedFormatted: string;
    totalFormatted: string;
  }>({
    queryKey: ['/api/gmail/storage'],
    enabled: true
  });

  const folders = [
    { id: "inbox", name: "Inbox", Icon: Inbox, count: 0 },
    { id: "starred", name: "Starred", Icon: Star, count: 0 },
    { id: "snoozed", name: "Snoozed", Icon: Clock, count: 0 },
    { id: "sent", name: "Sent", Icon: Send, count: 0 },
    { id: "drafts", name: "Drafts", Icon: FileText, count: 0 },
    { id: "trash", name: "Trash", Icon: Trash, count: 0 },
  ];
  
  const aiFeatures = [
    { id: "brain-dump", name: "Brain Dump & Tasks", Icon: BrainCircuit },
    { id: "smart-reply", name: "Smart Reply", Icon: MessageSquare },
    { id: "context-synthesis", name: "Context & Synthesis", Icon: PenTool },
    { id: "gmail-control", name: "Gmail Control", Icon: Command },
    { id: "contact-insights", name: "Contact Insights", Icon: Users },
  ];

  return (
    <aside className="w-64 bg-white border-r border-gray-300 flex-shrink-0 hidden md:block overflow-y-auto">
      <div className="p-4">
        <button className="w-full bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-4 rounded-lg flex items-center justify-center transition">
          <Edit className="mr-2 h-5 w-5" />
          <span>Compose</span>
        </button>
      </div>
      
      <nav className="mt-2">
        <ul>
          {folders.map((folder) => {
            const IconComponent = folder.Icon;
            return (
              <li key={folder.id}>
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setActiveFolder(folder.id);
                    // When a regular folder is clicked, deselect any active feature
                    if (onFeatureSelect) {
                      onFeatureSelect('');
                    }
                  }}
                  className={`flex items-center px-4 py-2 text-gray-800 ${activeFolder === folder.id && !activeFeature ? "bg-blue-50 border-r-4 border-blue-500" : "hover:bg-gray-100"}`}
                >
                  <IconComponent className="mr-3 text-gray-600 h-5 w-5" />
                  <span>{folder.name}</span>
                  {folder.count > 0 && (
                    <span className="ml-auto bg-blue-500 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                      {folder.count}
                    </span>
                  )}
                </a>
              </li>
            );
          })}
        </ul>
      </nav>
      
      {/* AI Features Section */}
      <div className="mt-8 px-4">
        <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">AI Features</h3>
        <ul>
          {aiFeatures.map((feature) => {
            const IconComponent = feature.Icon;
            const isActive = activeFeature === feature.id;
            
            return (
              <li key={feature.id}>
                <a 
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    // If this feature is already active, deactivate it
                    if (isActive && onFeatureSelect) {
                      onFeatureSelect('');
                      setActiveFolder('inbox');
                    } 
                    // Otherwise activate this feature
                    else if (onFeatureSelect) {
                      onFeatureSelect(feature.id);
                      setActiveFolder('');
                    }
                  }}
                  className={`flex items-center px-4 py-2 text-gray-800 ${
                    isActive
                      ? "bg-purple-50 border-r-4 border-purple-500" 
                      : "hover:bg-gray-100"
                  } rounded-lg`}
                >
                  <IconComponent className="mr-3 text-purple-600 h-5 w-5" />
                  <span>{feature.name}</span>
                  <span className="ml-auto text-xs text-purple-500 font-medium">New</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>
      
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
