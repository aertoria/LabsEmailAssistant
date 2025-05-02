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
      
      <Tabs defaultValue="daily" className="flex-grow flex flex-col" onValueChange={(value) => setActiveTab(value as any)}>
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
              <h3 className="text-base font-medium mb-2">Today's Email Summary</h3>
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-5/6 mb-2" />
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-20 w-full mt-4" />
            </Card>
          ) : generatedDailyDigest ? (
            <Card className="p-4 space-y-4">
              <h3 className="text-base font-medium mb-2">Today's Email Summary</h3>
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  You've received <span className="font-semibold">{generatedDailyDigest.totalEmails} emails</span> today, 
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
                    {typeof generatedDailyDigest.summary === 'string' ? generatedDailyDigest.summary : 'No summary available for today.'}
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
            <div className="space-y-6">
              {generatedClusters.map((cluster) => (
                <Card key={cluster.id} className="overflow-hidden bg-gradient-to-br from-gray-50 to-white border-gray-200">
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-1">
                      <h4 className="text-lg font-semibold text-blue-700">{cluster.title}</h4>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        {cluster.threadCount} {cluster.threadCount === 1 ? 'Thread' : 'Threads'}
                      </Badge>
                    </div>
                    
                    <ul className="space-y-2 my-2">
                      {cluster.preview.map((item, index) => (
                        <li key={index} className="text-sm text-gray-700 pl-4 border-l-2 border-blue-200">
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-blue-50">
                    <h5 className="text-xs font-medium text-gray-500 mb-1">CLUSTER SUMMARY</h5>
                    <p className="text-sm text-gray-700">{cluster.summary}</p>
                  </div>
                  
                  <div className="flex divide-x divide-gray-200 border-t border-gray-200">
                    <Button variant="ghost" className="flex-1 rounded-none text-blue-600 py-3 h-auto">
                      <FileText size={16} className="mr-2" />
                      Summarize Cluster
                    </Button>
                    <Button variant="ghost" className="flex-1 rounded-none text-green-600 py-3 h-auto">
                      <PenLine size={16} className="mr-2" />
                      Draft from Cluster
                    </Button>
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