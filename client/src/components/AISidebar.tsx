import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, CheckCircle, Clock, FileText, Layers, LineChart, MessageCircle, PenLine, RefreshCw, Send, ThumbsDown, ThumbsUp, AlertTriangle } from "lucide-react";
import { getQueryFn } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface EmailSummary {
  id: string;
  summary: string;
  sentimentScore: number;
  importance: 'high' | 'medium' | 'low';
  category: string;
  from: string;
  subject: string;
}

interface DailyDigest {
  totalEmails: number;
  importantEmails: number;
  categorySummary: {
    [key: string]: number;
  };
  topSenders: {
    name: string;
    count: number;
  }[];
  sentimentOverview: {
    positive: number;
    neutral: number;
    negative: number;
  };
  summary?: string; // OpenAI-generated summary of emails
  importantHighlights?: { title: string; sender: string; aiSummary: string }[];
  topPriorityEmail?: { title: string; sender: string; snippet?: string; aiAnalysis: string } | null;
}

interface SenderInsight {
  sender: string;
  threadCount: number;
  recentSubjects: string[];
  sentimentTrend: 'improving' | 'declining' | 'stable';
  responseRate: number;
}

interface EmailCluster {
  id: string;
  title: string;
  threadCount: number;
  emailIds: string[];
  preview: string[];
  summary: string;
}

interface EmailDraft {
  id: string;
  to: string;
  subject: string;
  draftContent: string;
  replyToEmail?: {
    id: string;
    from: string;
    subject: string;
    snippet: string;
  };
}

export function AISidebar({ emails }: { emails: any[] }) {
  const [activeTab, setActiveTab] = useState('daily');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedDailyDigest, setGeneratedDailyDigest] = useState<DailyDigest | null>(null);
  const [generatedSenderInsights, setGeneratedSenderInsights] = useState<SenderInsight[]>([]);
  const [generatedClusters, setGeneratedClusters] = useState<EmailCluster[]>([]);
  const [generatedDrafts, setGeneratedDrafts] = useState<EmailDraft[]>([]);
  const [selectedCluster, setSelectedCluster] = useState<EmailCluster | null>(null);
  const [showClusterDetail, setShowClusterDetail] = useState(false);
  const { toast } = useToast();
  
  // Use React Query with optimizations
  const dailyDigestQuery = useQuery({
    queryKey: ['/api/ai/daily-digest'],
    queryFn: getQueryFn({
      on401: "throw",
    }),
    enabled: activeTab === 'daily', // Auto-fetch when Daily tab is selected
    retry: 1,
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    refetchOnWindowFocus: false, // Don't refetch when window regains focus
  });
  
  // Function to generate AI analysis
  const generateAIAnalysis = async (type: 'daily' | 'senders' | 'clusters' | 'drafts') => {
    setIsGenerating(true);
    
    try {
      if (type === 'daily') {
        // Use the real API endpoint for daily digest
        console.log('[AISidebar] Requesting daily digest from OpenAI API...');
        const result = await dailyDigestQuery.refetch();
        
        if (result.isError || !result.data) {
          // Show a more descriptive error in the console for debugging
          console.error('[AISidebar] OpenAI API Error:', result.error);
          throw new Error('Failed to generate daily digest');
        }
        
        // Use the real AI-generated data
        const apiData = result.data as any;
        console.log('[AISidebar] Received AI-generated daily digest:', apiData);
        
        // Create a properly formatted DailyDigest object
        const digest: DailyDigest = {
          totalEmails: apiData.totalEmails || 0,
          importantEmails: apiData.importantHighlights ? apiData.importantHighlights.length : 0,
          categorySummary: apiData.categorySummary || {},
          topSenders: apiData.topSenders || [],
          sentimentOverview: apiData.sentimentOverview || { positive: 0, neutral: 0, negative: 0 },
          summary: apiData.summary || '',
          importantHighlights: apiData.importantHighlights || [],
          topPriorityEmail: apiData.topPriorityEmail || null
        };
        
        console.log('[AISidebar] Formatted digest:', digest);
        setGeneratedDailyDigest(digest);
      } else if (type === 'clusters') {
        // Generate email clusters
        console.log('[AISidebar] Generating email clusters...');
        
        setTimeout(() => {
          // Sample cluster data based on the example
          setGeneratedClusters([
            {
              id: 'cluster-1',
              title: 'Project Phoenix - Core Dev',
              threadCount: 7,
              emailIds: ['email-1', 'email-2', 'email-3', 'email-4', 'email-5', 'email-6', 'email-7'],
              preview: [
                'User Story #1023: API endpoint for user profiles.',
                'Bug #988: Login page redirect issue on mobile.'
              ],
              summary: 'Key development areas include new API endpoints, critical bug fixes for login, and ongoing discussions about technology choices (charting library). Several pull requests are active, focusing on refactoring core modules like authentication.'
            },
            {
              id: 'cluster-2',
              title: 'Q3 Marketing Campaign',
              threadCount: 12,
              emailIds: ['email-8', 'email-9', 'email-10', 'email-11', 'email-12', 'email-13', 'email-14', 'email-15', 'email-16', 'email-17', 'email-18', 'email-19'],
              preview: [
                'Planning: Social Media Calendar for July.',
                'Assets: Request for new banner designs.'
              ],
              summary: 'Marketing campaign planning for Q3 includes social media calendar development, asset creation for new banners, and coordination with design team for visual materials. Several approvals pending for budget and creative direction.'
            },
            {
              id: 'cluster-3',
              title: 'User Feedback - Mobile v2.1',
              threadCount: 25,
              emailIds: ['email-20', 'email-21', 'email-22', 'email-23', 'email-24'],
              preview: [
                'Feature Request: Dark mode for iOS.',
                'Issue: App crashing on older Android devices.'
              ],
              summary: 'User feedback for the mobile app v2.1 includes feature requests like dark mode for iOS and reports of crashes on older Android devices. The product team is prioritizing fixes for stability issues before implementing new features.'
            }
          ]);
          setIsGenerating(false);
        }, 1500);
        return;
      } else if (type === 'senders') {
        // Mock data for other tabs until they are implemented
        setTimeout(() => {
          setGeneratedSenderInsights([
            {
              sender: 'GitHub',
              threadCount: 3,
              recentSubjects: ['Pull request #143', 'Issue reported: Authentication bug', 'Security update required'],
              sentimentTrend: 'stable',
              responseRate: 85
            },
            {
              sender: 'Google Team',
              threadCount: 2,
              recentSubjects: ['Your account security update', 'New recommendations for you'],
              sentimentTrend: 'improving',
              responseRate: 90
            },
            {
              sender: 'LinkedIn',
              threadCount: 1,
              recentSubjects: ['5 job opportunities for you'],
              sentimentTrend: 'stable',
              responseRate: 70
            }
          ]);
          setIsGenerating(false);
        }, 1500);
        return;
      } else if (type === 'drafts') {
        // Mock data for drafts until implemented
        setTimeout(() => {
          setGeneratedDrafts([
            {
              id: 'draft-1',
              to: 'GitHub <notifications@github.com>',
              subject: 'Re: Pull request #143',
              draftContent: "Thanks for the review. I've addressed all the feedback points and pushed the changes. The authentication flow should now handle edge cases properly. Let me know if you need anything else before merging.",
              replyToEmail: {
                id: 'mock-2',
                from: 'GitHub <notifications@github.com>',
                subject: 'Pull request #143: Fix authentication workflow',
                snippet: "Changes look good! I've approved the PR but had a couple of small suggestions for the error handling..."
              }
            },
            {
              id: 'draft-2',
              to: 'support@service.com',
              subject: 'Re: Your support ticket #45982 has been updated',
              draftContent: 'Thank you for the update on my support ticket. The solution you provided worked perfectly. I appreciate your quick response and thorough explanation of the issue. Consider this matter resolved.',
              replyToEmail: {
                id: 'mock-10',
                from: 'Support <support@service.com>',
                subject: 'Your support ticket #45982 has been updated',
                snippet: "We've updated your support ticket regarding your recent issue. Our technician has provided a solution..."
              }
            }
          ]);
          setIsGenerating(false);
        }, 1500);
        return;
      }
      
      // Set not generating when done if we didn't use setTimeout above
      setIsGenerating(false);
    } catch (error) {
      console.error('Error generating AI analysis:', error);
      toast({
        title: "Error generating analysis",
        description: "Could not generate AI analysis. Please try again later.",
        variant: "destructive"
      });
      setIsGenerating(false);
    }
  };
  
  // Function to handle cluster click and highlight related emails
  const handleClusterClick = (cluster: EmailCluster) => {
    // Toggle selection - deselect if already selected
    if (selectedCluster?.id === cluster.id) {
      setSelectedCluster(null);
      setShowClusterDetail(false);
      // Remove all connection lines and event listeners
      const connections = document.querySelectorAll('.cluster-connection');
      connections.forEach(conn => {
        // Remove scroll event listener to prevent memory leaks
        if (conn._updateFn) {
          window.removeEventListener('scroll', conn._updateFn);
        }
        conn.remove();
      });
      
      // Restore original styling of all email items
      document.querySelectorAll('[data-email-id]').forEach(el => {
        el.classList.remove('cluster-related-email');
      });

      // Remove resize handler
      if (window._clusterResizeHandler) {
        window.removeEventListener('resize', window._clusterResizeHandler);
        window._clusterResizeHandler = undefined;
      }
    } else {
      // Set the new selected cluster and show the detail view in the side panel
      setSelectedCluster(cluster);
      setShowClusterDetail(true);
      
      // Keep the clusters tab selected, but show the details in the right panel
      // This keeps us on the same tab instead of switching to a separate detail tab
      
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        // Clear any existing connections and cleanup event listeners
        const connections = document.querySelectorAll('.cluster-connection');
        connections.forEach(conn => {
          if (conn._updateFn) {
            window.removeEventListener('scroll', conn._updateFn);
          }
          conn.remove();
        });
        
        // Reset all email elements
        document.querySelectorAll('[data-email-id]').forEach(el => {
          el.classList.remove('cluster-related-email');
        });
        
        // Add special styling to related emails
        const connectedSvgs: SVGSVGElement[] = [];
        
        // Draw connections from cluster to related emails
        cluster.emailIds.forEach(emailId => {
          const emailElement = document.querySelector(`[data-email-id="${emailId}"]`);
          const clusterElement = document.querySelector(`[data-cluster-id="${cluster.id}"]`);
          
          if (emailElement && clusterElement) {
            // Style the email element as related
            emailElement.classList.add('cluster-related-email');
            
            // Create dynamic CSS for related emails if not already added
            if (!document.getElementById('cluster-styles')) {
              const style = document.createElement('style');
              style.id = 'cluster-styles';
              style.innerHTML = `
                .cluster-related-email {
                  box-shadow: 0 0 0 2px #3b82f6;
                  position: relative;
                  z-index: 10;
                  background-color: #f0f7ff !important;
                  transition: all 0.3s ease;
                }
              `;
              document.head.appendChild(style);
            }
            
            // Draw the connection with scroll updating
            const svg = drawConnection(clusterElement, emailElement);
            connectedSvgs.push(svg);
          }
        });
        
        // Scroll first related email into view if not visible
        const firstEmail = document.querySelector(`[data-email-id="${cluster.emailIds[0]}"]`);
        if (firstEmail) {
          firstEmail.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        
        // Show toast notification with more details
        toast({
          title: "Cluster selected",
          description: `Showing ${cluster.emailIds.length} emails related to "${cluster.title}". Scroll to see all connected emails.`
        });
        
        // Add window resize handler to update connections
        const handleResize = () => {
          connectedSvgs.forEach(svg => {
            if (svg && svg._updateFn) {
              svg._updateFn();
            }
          });
        };
        
        window.addEventListener('resize', handleResize);
        // Store for cleanup
        window._clusterResizeHandler = handleResize;
      }, 100);
    }
  };
  
  // Draw SVG connection line between two elements
  const drawConnection = (from: Element, to: Element): SVGSVGElement => {
    // Get positions
    const fromRect = from.getBoundingClientRect();
    const toRect = to.getBoundingClientRect();
    
    // Calculate line points
    const fromX = fromRect.right;
    const fromY = fromRect.top + fromRect.height / 2;
    const toX = toRect.left;
    const toY = toRect.top + toRect.height / 2;
    
    // Create SVG element
    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.classList.add('cluster-connection');
    svg.style.position = 'fixed';
    svg.style.top = '0';
    svg.style.left = '0';
    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.pointerEvents = 'none';
    svg.style.zIndex = '50';
    
    // Create the path
    const path = document.createElementNS(svgNS, "path");
    const dx = toX - fromX;
    const bezierX = fromX + dx * 0.6; // Create a curved line
    
    path.setAttribute('d', `M${fromX},${fromY} C${bezierX},${fromY} ${bezierX},${toY} ${toX},${toY}`);
    path.style.fill = 'none';
    path.style.stroke = '#3b82f6'; // Blue color
    path.style.strokeWidth = '2';
    path.style.strokeDasharray = '4 2'; // Dashed line
    path.style.opacity = '0.8';
    
    // Create animated arrowhead
    const marker = document.createElementNS(svgNS, "marker");
    marker.setAttribute('id', 'arrowhead');
    marker.setAttribute('markerWidth', '10');
    marker.setAttribute('markerHeight', '7');
    marker.setAttribute('refX', '9');
    marker.setAttribute('refY', '3.5');
    marker.setAttribute('orient', 'auto');
    
    const polygon = document.createElementNS(svgNS, "polygon");
    polygon.setAttribute('points', '0 0, 10 3.5, 0 7');
    polygon.style.fill = '#3b82f6';
    
    marker.appendChild(polygon);
    svg.appendChild(marker);
    
    // Apply the marker to the path
    path.setAttribute('marker-end', 'url(#arrowhead)');
    
    // Animation for line appearance
    path.innerHTML = `
      <animate attributeName="stroke-dashoffset" from="60" to="0" dur="1.5s" repeatCount="indefinite" />
    `;
    
    svg.appendChild(path);
    document.body.appendChild(svg);
    
    // Add a listener to update connection position when scrolling
    const updateConnection = () => {
      const updatedFromRect = from.getBoundingClientRect();
      const updatedToRect = to.getBoundingClientRect();
      
      const updatedFromX = updatedFromRect.right;
      const updatedFromY = updatedFromRect.top + updatedFromRect.height / 2;
      const updatedToX = updatedToRect.left;
      const updatedToY = updatedToRect.top + updatedToRect.height / 2;
      
      const updatedDx = updatedToX - updatedFromX;
      const updatedBezierX = updatedFromX + updatedDx * 0.6;
      
      path.setAttribute('d', `M${updatedFromX},${updatedFromY} C${updatedBezierX},${updatedFromY} ${updatedBezierX},${updatedToY} ${updatedToX},${updatedToY}`);
    };
    
    window.addEventListener('scroll', updateConnection);
    
    // Store event listener reference for cleanup
    svg.dataset.scrollListener = 'true';
    svg._updateFn = updateConnection;
    
    return svg;
  };

  // Function to display sentiment with icon
  const renderSentiment = (sentiment: 'improving' | 'declining' | 'stable') => {
    switch (sentiment) {
      case 'improving':
        return <span className="flex items-center text-green-600"><ThumbsUp size={16} className="mr-1" /> Improving</span>;
      case 'declining':
        return <span className="flex items-center text-red-600"><ThumbsDown size={16} className="mr-1" /> Declining</span>;
      case 'stable':
        return <span className="flex items-center text-blue-600"><LineChart size={16} className="mr-1" /> Stable</span>;
    }
  };
  
  // Generate button that will trigger AI analysis
  const renderGenerateButton = (type: 'daily' | 'senders' | 'clusters' | 'drafts') => (
    <Button 
      variant="outline" 
      size="sm" 
      className="flex items-center" 
      onClick={() => generateAIAnalysis(type)}
      disabled={isGenerating || dailyDigestQuery.isPending}
    >
      {isGenerating || dailyDigestQuery.isPending ? (
        <>
          <RefreshCw size={16} className="mr-2 animate-spin" />
          Generating...
        </>
      ) : (
        <>
          <RefreshCw size={16} className="mr-2" />
          {type === 'daily' ? 'AI Assist' : 'Generate Analysis'}
        </>
      )}
    </Button>
  );
  
  return (
    <div className="w-96 bg-white border-l border-gray-200 flex-shrink-0 overflow-y-auto p-4">
      <h2 className="text-xl font-semibold mb-4 flex items-center">
        <MessageCircle size={20} className="mr-2 text-blue-500" />
        AI Email Assistant
      </h2>
      
      <Tabs value={activeTab} className="flex-grow flex flex-col" onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid grid-cols-4 mb-4">
          <TabsTrigger value="daily">Daily</TabsTrigger>
          <TabsTrigger value="clusters">Clusters</TabsTrigger>
          <TabsTrigger value="senders">Senders</TabsTrigger>
          <TabsTrigger value="drafts">Drafts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="space-y-4 flex-grow">
          <div className="flex justify-between items-center mb-2">
          </div>
          
          {(isGenerating || dailyDigestQuery.isPending) ? (
            <Card className="p-4">
              <h3 className="text-base font-medium mb-2">Last 24 Hours Email Summary</h3>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-5/6 mb-2" />
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-20 w-full mt-4" />
            </Card>
          ) : generatedDailyDigest ? (
            <Card className="p-4 space-y-4">
              <h3 className="text-base font-medium mb-2">Last 24 Hours Email Summary</h3>
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  You've received <span className="font-semibold">{generatedDailyDigest.totalEmails} emails</span> in the last 24 hours, 
                  with <span className="font-semibold">{generatedDailyDigest.importantEmails} important</span> messages.
                </p>
                
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">BY CATEGORY</h4>
                  <div className="space-y-1">
                    {Object.entries(generatedDailyDigest.categorySummary).map(([category, count]) => (
                      <div key={category} className="flex justify-between items-center text-sm">
                        <span>{category}</span>
                        <Badge variant="outline">{count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mb-2">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">TOP SENDERS</h4>
                  <div className="space-y-1">
                    {generatedDailyDigest.topSenders.map((sender) => (
                      <div key={sender.name} className="flex justify-between items-center text-sm">
                        <span>{sender.name}</span>
                        <Badge variant="outline">{sender.count}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="mt-4">
                  <h4 className="text-xs font-medium text-gray-500 mb-1">AI SUMMARY</h4>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap mt-1">
                    {typeof generatedDailyDigest.summary === 'string' ? generatedDailyDigest.summary : 'No summary available for the last 24 hours.'}
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xs font-medium text-gray-500 mb-1">SENTIMENT OVERVIEW</h4>
                  <div className="flex items-center space-x-2">
                    <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="h-2 bg-green-500" 
                        style={{ width: `${generatedDailyDigest.sentimentOverview.positive}%` }}
                      ></div>
                    </div>
                    <span className="text-xs text-green-600">{generatedDailyDigest.sentimentOverview.positive}%</span>
                  </div>
                </div>
              </div>
            </Card>
          ) : (
            // Initial state: Show only a centered 'AI Assist' button
            <div className="flex justify-center items-center py-8"> 
              {renderGenerateButton('daily')}
            </div>
          )}
          
          {generatedDailyDigest && (
            <Card className="p-4 mb-4">
              <h4 className="text-sm font-medium mb-2">Important Email Highlights</h4>
              {generatedDailyDigest.topPriorityEmail ? (
                <div>
                  <p className="text-sm text-gray-800 font-medium truncate">
                    {generatedDailyDigest.topPriorityEmail.title}
                  </p>
                  <p className="text-xs text-gray-500 mb-2 truncate">
                    {generatedDailyDigest.topPriorityEmail.sender}
                  </p>
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {generatedDailyDigest.topPriorityEmail.aiAnalysis}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-600">No high-priority email identified.</p>
              )}
            </Card>
          )}
        </TabsContent>

        <TabsContent value="clusters" className="space-y-4 flex-grow">
          {/* Two-column layout for clusters with detail panel */}
          <div className="flex flex-row">
            {/* Left column: List of clusters */}
            <div className={`${showClusterDetail ? 'w-1/2 pr-3' : 'w-full'} transition-all duration-300 ease-in-out`}>
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-base font-medium">Email Topic Clusters</h3>
                {!generatedClusters.length && renderGenerateButton('clusters')}
              </div>
              
              {isGenerating && activeTab === 'clusters' ? (
                <Card className="p-4">
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-1" />
                  <Skeleton className="h-4 w-5/6 mb-3" />
                  <Skeleton className="h-20 w-full mb-4" />
                  
                  <Skeleton className="h-6 w-3/4 mb-3" />
                  <Skeleton className="h-4 w-1/2 mb-1" />
                  <Skeleton className="h-4 w-5/6 mb-3" />
                  <Skeleton className="h-20 w-full" />
                </Card>
              ) : generatedClusters.length > 0 ? (
                <div className="space-y-4">
                  {generatedClusters.map((cluster) => (
                    <Card 
                      key={cluster.id} 
                      className={`overflow-hidden bg-gradient-to-br from-gray-50 to-white border-gray-200 cursor-pointer transition-all hover:shadow-md hover:border-blue-300 active:bg-blue-50 cluster-card ${selectedCluster?.id === cluster.id ? 'ring-2 ring-blue-500 bg-blue-50' : ''}`}
                      role="button"
                      aria-label={`View details for ${cluster.title} cluster`}
                      tabIndex={0}
                      // Also handle keyboard navigation
                      onKeyDown={(e) => e.key === 'Enter' && handleClusterClick(cluster)}
                      onClick={() => handleClusterClick(cluster)}
                      data-cluster-id={cluster.id}
                    >
                      <div className="p-3 border-b border-gray-100">
                        <div className="flex justify-between items-start mb-1">
                          <h4 className="text-md font-semibold text-blue-700 truncate">{cluster.title}</h4>
                          <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200 ml-2 flex-shrink-0">
                            {cluster.threadCount}
                          </Badge>
                        </div>
                        
                        <ul className="space-y-1 my-1">
                          {cluster.preview.map((item, index) => (
                            <li key={index} className="text-xs text-gray-700 pl-3 border-l-2 border-blue-200 truncate">
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-gray-500">
                  <Layers size={40} className="mx-auto mb-3 text-gray-400" />
                  <p className="text-base">Group similar emails into topic clusters</p>
                  <p className="text-sm mt-1 mb-4">AI will analyze your emails and group them by project, topic, or sender</p>
                  {renderGenerateButton('clusters')}
                </div>
              )}
            </div>
            
            {/* Right column: Cluster detail panel */}
            {showClusterDetail && selectedCluster && (
              <div className="w-1/2 pl-3 border-l border-gray-200 cluster-detail-panel">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="mr-2 back-button-transition" 
                      onClick={() => {
                        setSelectedCluster(null);
                        setShowClusterDetail(false);
                      }}
                    >
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                      Close
                    </Button>
                    <h3 className="text-lg font-medium text-blue-700">{selectedCluster.title}</h3>
                  </div>
                </div>

                <Card className="p-4 mb-4 cluster-summary-card">
                  <h4 className="text-sm font-semibold mb-2">Cluster Summary</h4>
                  <p className="text-sm text-gray-700">{selectedCluster.summary}</p>
                  
                  <div className="flex mt-4 pt-4 border-t border-blue-100 justify-between">
                    <Button size="sm" variant="outline" className="text-blue-600">
                      <FileText size={14} className="mr-1" /> Summarize All
                    </Button>
                    <Button size="sm" variant="outline" className="text-green-600">
                      <PenLine size={14} className="mr-1" /> Draft Response
                    </Button>
                  </div>
                </Card>

                <div className="space-y-3">
                  <div className="flex items-center">
                    <h4 className="text-sm font-semibold">Related Emails</h4>
                    <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                      {selectedCluster.emailIds.length} emails
                    </span>
                  </div>
                  {selectedCluster.emailIds.map((emailId, index) => {
                    // Find the email based on ID from our mocked data
                    const emailIndex = Number(emailId.replace('email-', '')) - 1;
                    const email = emails[emailIndex >= 0 && emailIndex < emails.length ? emailIndex : 0];
                    
                    return (
                      <Card key={emailId} className="overflow-hidden cluster-detail-card email-list-animation" style={{animationDelay: `${index * 0.05}s`}}>
                        <div className="p-3">
                          <div className="flex justify-between">
                            <h5 className="font-medium text-sm truncate">{email?.subject || `Thread ${index + 1}`}</h5>
                            <span className="text-xs text-gray-500">{email?.receivedAt || 'Today'}</span>
                          </div>
                          <div className="text-xs text-gray-500 mt-1 mb-1">{email?.from || 'sender@example.com'}</div>
                          <p className="text-xs text-gray-700">
                            {email?.snippet || selectedCluster.preview[index % selectedCluster.preview.length] || 'Email content preview...'}
                          </p>
                        </div>
                        <div className="bg-gray-50 p-2 border-t flex justify-end gap-2">
                          <Button size="sm" variant="outline" className="h-7 text-xs">
                            <FileText size={12} className="mr-1" /> View
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-600">
                            <PenLine size={12} className="mr-1" /> Reply
                          </Button>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="senders" className="space-y-4 flex-grow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-medium">Sender & Thread Insights</h3>
            {!generatedSenderInsights.length && renderGenerateButton('senders')}
          </div>
          
          {isGenerating && activeTab === 'senders' ? (
            <Card className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-5/6 mb-4" />
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-5/6 mb-4" />
            </Card>
          ) : generatedSenderInsights.length > 0 ? (
            <div className="space-y-3">
              {generatedSenderInsights.map((insight) => (
                <Card key={insight.sender} className="p-3">
                  <div className="mb-2 flex justify-between items-start">
                    <h4 className="font-medium">{insight.sender}</h4>
                    <Badge variant="outline">{insight.threadCount} threads</Badge>
                  </div>
                  
                  <div className="mb-2 text-sm">
                    <p className="text-xs text-gray-500 mb-1">RECENT SUBJECTS</p>
                    <ul className="list-disc list-inside text-gray-600 text-xs">
                      {insight.recentSubjects.map((subject, i) => (
                        <li key={i}>{subject}</li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="flex justify-between text-xs">
                    <div>
                      <span className="text-gray-500">Trend: </span>
                      {renderSentiment(insight.sentimentTrend)}
                    </div>
                    <div>
                      <span className="text-gray-500">Response Rate: </span>
                      <span className="font-medium">{insight.responseRate}%</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <LineChart size={40} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Generate insights about senders and conversations</p>
            </div>
          )}
        </TabsContent>
        
        {/* We've removed the separate TabsContent for cluster details since we're now showing them in a side panel */}
        
        <TabsContent value="drafts" className="space-y-4 flex-grow">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-base font-medium">AI-Generated Reply Drafts</h3>
            {!generatedDrafts.length && renderGenerateButton('drafts')}
          </div>
          
          {isGenerating && activeTab === 'drafts' ? (
            <Card className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-5/6 mb-2" />
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-16 w-full mt-2 mb-2" />
              <Skeleton className="h-8 w-1/3 mt-2" />
            </Card>
          ) : generatedDrafts.length > 0 ? (
            <div className="space-y-3">
              {generatedDrafts.map((draft) => (
                <Card key={draft.id} className="p-3">
                  {draft.replyToEmail && (
                    <div className="mb-3 pb-2 border-b border-gray-100">
                      <p className="text-xs text-gray-500">REPLYING TO</p>
                      <p className="text-sm font-medium truncate">{draft.replyToEmail.subject}</p>
                      <p className="text-xs text-gray-600 truncate">{draft.replyToEmail.from}</p>
                    </div>
                  )}
                  
                  <div className="mb-3">
                    <p className="text-sm font-medium">{draft.subject}</p>
                    <p className="text-xs text-gray-500 mb-2">To: {draft.to}</p>
                    <p className="text-sm text-gray-700 whitespace-pre-line">{draft.draftContent}</p>
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button size="sm" className="flex items-center" variant="default">
                      <Send size={14} className="mr-1" />
                      Send
                    </Button>
                    <Button size="sm" className="flex items-center" variant="outline">
                      <FileText size={14} className="mr-1" />
                      Edit
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <FileText size={40} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Generate reply drafts for important emails</p>
            </div>
          )}
        </TabsContent>
      </Tabs>
      
      <div className="text-xs text-gray-500 mt-6 pt-4 border-t border-gray-200">
        <p className="mb-1 flex items-center">
          <Clock size={14} className="mr-1" /> Updates every 30 minutes
        </p>
        <p className="flex items-center">
          <CheckCircle size={14} className="mr-1" /> Using AI to analyze your email patterns
        </p>
      </div>
    </div>
  );
}