import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, CheckCircle, Clock, FileText, LineChart, MessageCircle, RefreshCw, Send, ThumbsDown, ThumbsUp, AlertTriangle } from "lucide-react";
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
}

interface SenderInsight {
  sender: string;
  threadCount: number;
  recentSubjects: string[];
  sentimentTrend: 'improving' | 'declining' | 'stable';
  responseRate: number;
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
  const [generatedDrafts, setGeneratedDrafts] = useState<EmailDraft[]>([]);
  const { toast } = useToast();
  
  // Use React Query to fetch the daily digest
  const dailyDigestQuery = useQuery({
    queryKey: ['/api/ai/daily-digest'],
    queryFn: getQueryFn({
      on401: "throw",
    }),
    enabled: false, // Don't run the query on component mount
    retry: 1,
  });
  
  // Function to generate AI analysis
  const generateAIAnalysis = async (type: 'daily' | 'senders' | 'drafts') => {
    setIsGenerating(true);
    
    try {
      if (type === 'daily') {
        // Use the real API endpoint for daily digest
        const result = await dailyDigestQuery.refetch();
        
        if (result.isError || !result.data) {
          // Show a more descriptive error in the console for debugging
          console.error('OpenAI API Error:', result.error);
          throw new Error('Failed to generate daily digest');
        }
        
        // Use the real AI-generated data
        const apiData = result.data as any;
        
        // Create a properly formatted DailyDigest object
        const digest: DailyDigest = {
          totalEmails: apiData.totalEmails || 0,
          importantEmails: apiData.importantEmails || 0,
          categorySummary: apiData.categorySummary || {},
          topSenders: apiData.topSenders || [],
          sentimentOverview: apiData.sentimentOverview || { positive: 0, neutral: 0, negative: 0 },
          summary: apiData.summary || ''
        };
        
        setGeneratedDailyDigest(digest);
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
  const renderGenerateButton = (type: 'daily' | 'senders' | 'drafts') => (
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
          Generate Analysis
        </>
      )}
    </Button>
  );
  
  return (
    <div className="w-80 bg-white border-l border-gray-200 flex-shrink-0 overflow-y-auto p-4">
      <h2 className="text-lg font-semibold mb-4 flex items-center">
        <MessageCircle size={20} className="mr-2 text-blue-500" />
        AI Email Assistant
      </h2>
      
      <Tabs defaultValue="daily" className="mb-6" onValueChange={(value) => setActiveTab(value as any)}>
        <TabsList className="grid grid-cols-3 mb-2">
          <TabsTrigger value="daily">Daily Digest</TabsTrigger>
          <TabsTrigger value="senders">Sender Insights</TabsTrigger>
          <TabsTrigger value="drafts">Smart Drafts</TabsTrigger>
        </TabsList>
        
        <TabsContent value="daily" className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Today's Email Summary</h3>
            {!generatedDailyDigest && renderGenerateButton('daily')}
          </div>
          
          {(isGenerating || dailyDigestQuery.isPending) && activeTab === 'daily' ? (
            <Card className="p-4">
              <Skeleton className="h-4 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2 mb-2" />
              <Skeleton className="h-4 w-5/6 mb-2" />
              <Skeleton className="h-4 w-2/3 mb-2" />
              <Skeleton className="h-20 w-full mt-4" />
            </Card>
          ) : generatedDailyDigest ? (
            <Card className="p-4 space-y-4">
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
                  <h4 className="text-xs font-medium text-gray-500 mb-2">AI SUMMARY</h4>
                  <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                    <p className="text-xs leading-relaxed text-gray-700 whitespace-pre-line">
                      {typeof generatedDailyDigest.summary === 'string' ? generatedDailyDigest.summary : 'No summary available for today.'}
                    </p>
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
            <div className="text-center py-8 text-gray-500">
              <BarChart size={40} className="mx-auto mb-2 text-gray-400" />
              <p className="text-sm">Generate an AI summary of today's emails</p>
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="senders" className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Sender & Thread Insights</h3>
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
        
        <TabsContent value="drafts" className="space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">AI-Generated Reply Drafts</h3>
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