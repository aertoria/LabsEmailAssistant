import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, FolderOpen, Mail, TrendingUp, Users, Calendar, Star, ChevronUp, ChevronDown } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { format, differenceInDays } from 'date-fns';

interface ProjectCluster {
  id: string;
  title: string;
  emailCount: number;
  participantCount: number;
  lastActivity: string;
  firstActivity: string;
  progress: number;
  status: 'active' | 'stalled' | 'completed';
  keyParticipants: string[];
  summary: string;
  emails: {
    id: string;
    subject: string;
    from: string;
    date: string;
    snippet: string;
  }[];
  milestones: {
    date: string;
    description: string;
    type: 'start' | 'progress' | 'milestone' | 'completed';
  }[];
  starred?: boolean;
  priority: 'high' | 'medium' | 'low';
}

export function ProjectManagement() {
  const [selectedCluster, setSelectedCluster] = useState<ProjectCluster | null>(null);
  const [expandedClusters, setExpandedClusters] = useState<string[]>([]);
  const [starredClusters, setStarredClusters] = useState<string[]>([]);

  // Fetch emails to cluster
  const { data: emailsData } = useQuery({
    queryKey: ['/api/gmail/messages', 1, ''],
    enabled: true,
  });

  // Fetch project clusters from AI
  const { data: clusters, isLoading, refetch: refetchClusters } = useQuery({
    queryKey: ['/api/ai/project-clusters'],
    enabled: !!emailsData?.messages,
    queryFn: async () => {
      try {
        const response = await apiRequest('POST', '/api/ai/project-clusters', {
          emails: emailsData?.messages || []
        });
        return response.json() as Promise<ProjectCluster[]>;
      } catch (error) {
        console.log('Error fetching clusters, using mock data:', error);
        // Return mock clusters if API fails
        return [
          {
            id: 'cluster-1',
            title: 'Project Phoenix - Core Dev',
            emailCount: 7,
            participantCount: 4,
            lastActivity: new Date().toISOString(),
            firstActivity: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
            progress: 65,
            status: 'active' as const,
            keyParticipants: ['John Smith', 'Sarah Chen', 'Mike Wilson', 'Emily Davis'],
            summary: 'Key development areas include new API endpoints, critical bug fixes for login, and ongoing discussions about technology choices. Several pull requests are active, focusing on refactoring core modules.',
            emails: [
              {
                id: 'email-1',
                subject: 'User Story #1023: API endpoint for user profiles',
                from: 'John Smith',
                date: new Date().toISOString(),
                snippet: 'The new user profile endpoint is ready for review. I\'ve implemented all the requested features including pagination and filtering...'
              },
              {
                id: 'email-2',
                subject: 'Bug #988: Login page redirect issue on mobile',
                from: 'Sarah Chen',
                date: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
                snippet: 'Found the root cause of the mobile redirect issue. It appears to be related to the session handling on Safari browsers...'
              }
            ],
            milestones: [
              { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), description: 'Project kickoff meeting', type: 'start' },
              { date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), description: 'Core architecture defined', type: 'milestone' },
              { date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), description: 'First module completed', type: 'progress' }
            ],
            priority: 'high' as const
          },
          {
            id: 'cluster-2',
            title: 'Q3 Marketing Campaign',
            emailCount: 12,
            participantCount: 6,
            lastActivity: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            firstActivity: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
            progress: 40,
            status: 'active' as const,
            keyParticipants: ['Lisa Johnson', 'Tom Brown', 'Anna White', 'Chris Lee', 'Rachel Green', 'David Kim'],
            summary: 'Marketing campaign planning for Q3 includes social media calendar development, asset creation for new banners, and coordination with design team for visual materials.',
            emails: [
              {
                id: 'email-3',
                subject: 'Planning: Social Media Calendar for July',
                from: 'Lisa Johnson',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                snippet: 'I\'ve drafted the social media calendar for July. Please review the proposed posts and let me know if you have any feedback...'
              },
              {
                id: 'email-4',
                subject: 'Assets: Request for new banner designs',
                from: 'Tom Brown',
                date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                snippet: 'We need three new banner designs for the campaign. Attached are the specifications and brand guidelines...'
              }
            ],
            milestones: [
              { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), description: 'Campaign strategy approved', type: 'start' },
              { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), description: 'Content calendar created', type: 'progress' }
            ],
            priority: 'medium' as const
          },
          {
            id: 'cluster-3',
            title: 'User Feedback - Mobile v2.1',
            emailCount: 25,
            participantCount: 8,
            lastActivity: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            firstActivity: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(),
            progress: 85,
            status: 'active' as const,
            keyParticipants: ['Product Team', 'Support Team', 'Beta Users'],
            summary: 'User feedback for the mobile app v2.1 includes feature requests like dark mode for iOS and reports of crashes on older Android devices. The product team is prioritizing fixes.',
            emails: [
              {
                id: 'email-5',
                subject: 'Feature Request: Dark mode for iOS',
                from: 'Beta User Group',
                date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                snippet: 'Multiple users have requested dark mode support for iOS. This would greatly improve the user experience during nighttime usage...'
              },
              {
                id: 'email-6',
                subject: 'Issue: App crashing on older Android devices',
                from: 'Support Team',
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                snippet: 'We\'ve received 15 reports of the app crashing on Android devices running version 8 or lower. Stack traces attached...'
              }
            ],
            milestones: [
              { date: new Date(Date.now() - 21 * 24 * 60 * 60 * 1000).toISOString(), description: 'v2.1 beta release', type: 'start' },
              { date: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), description: 'First round of feedback collected', type: 'progress' },
              { date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), description: 'Major bugs fixed', type: 'milestone' }
            ],
            priority: 'high' as const
          }
        ] as ProjectCluster[];
      }
    }
  });

  // Load starred clusters from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('starred-project-clusters');
    if (saved) {
      setStarredClusters(JSON.parse(saved));
    }
  }, []);

  // Save starred clusters to localStorage
  useEffect(() => {
    localStorage.setItem('starred-project-clusters', JSON.stringify(starredClusters));
  }, [starredClusters]);

  // Sort clusters by priority and starred status
  const sortedClusters = useMemo(() => {
    if (!clusters) return [];
    
    return [...clusters].sort((a, b) => {
      // Starred items first
      const aStarred = starredClusters.includes(a.id);
      const bStarred = starredClusters.includes(b.id);
      if (aStarred && !bStarred) return -1;
      if (!aStarred && bStarred) return 1;
      
      // Then by priority
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }, [clusters, starredClusters]);

  // Get top 3 clusters for daily email
  const topClusters = sortedClusters.slice(0, 3);

  const toggleClusterExpansion = (clusterId: string) => {
    setExpandedClusters(prev => 
      prev.includes(clusterId) 
        ? prev.filter(id => id !== clusterId)
        : [...prev, clusterId]
    );
  };

  const toggleStar = (clusterId: string) => {
    setStarredClusters(prev => 
      prev.includes(clusterId)
        ? prev.filter(id => id !== clusterId)
        : [...prev, clusterId]
    );
    toast.success(starredClusters.includes(clusterId) ? 'Removed from favorites' : 'Added to favorites');
  };

  const getProgressColor = (progress: number) => {
    if (progress < 30) return 'bg-red-500';
    if (progress < 70) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; text: string }> = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active' },
      stalled: { color: 'bg-yellow-100 text-yellow-800', text: 'Stalled' },
      completed: { color: 'bg-blue-100 text-blue-800', text: 'Completed' }
    };
    const variant = variants[status] || variants.active;
    return <Badge className={variant.color}>{variant.text}</Badge>;
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<string, { color: string; text: string }> = {
      high: { color: 'bg-red-100 text-red-800', text: 'High Priority' },
      medium: { color: 'bg-yellow-100 text-yellow-800', text: 'Medium Priority' },
      low: { color: 'bg-gray-100 text-gray-800', text: 'Low Priority' }
    };
    const variant = variants[priority] || variants.medium;
    return <Badge className={variant.color}>{variant.text}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Analyzing emails and organizing into projects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex">
      <div className="flex-1 p-6 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Project Management</h1>
          <p className="text-gray-600">Your emails organized into project clusters with progress tracking</p>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="all-projects">All Projects</TabsTrigger>
            <TabsTrigger value="timeline">Timeline View</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Top 3 Projects for Daily Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Star className="h-5 w-5 text-yellow-500" />
                  Top Projects for Today
                </CardTitle>
                <CardDescription>These will be included in your daily email digest</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {topClusters.map((cluster) => (
                  <div 
                    key={cluster.id}
                    className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedCluster(cluster)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="font-medium text-gray-900">{cluster.title}</h3>
                      <div className="flex items-center gap-2">
                        {getPriorityBadge(cluster.priority)}
                        {getStatusBadge(cluster.status)}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{cluster.summary}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Mail className="h-4 w-4" />
                          {cluster.emailCount} emails
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4" />
                          {cluster.participantCount} participants
                        </span>
                      </div>
                      <div className="w-32">
                        <Progress value={cluster.progress} className="h-2" />
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Project Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{clusters?.filter(c => c.status === 'active').length || 0}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Stalled Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    {clusters?.filter(c => c.status === 'stalled').length || 0}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Completed Projects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {clusters?.filter(c => c.status === 'completed').length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="all-projects" className="space-y-4">
            <div className="space-y-6">
              {sortedClusters.map((cluster) => (
                <Card 
                  key={cluster.id} 
                  className={`overflow-hidden bg-gradient-to-br from-gray-50 to-white border-gray-200 cursor-pointer transition-all hover:shadow-md hover:border-blue-300 active:bg-blue-50 ${selectedCluster?.id === cluster.id ? 'ring-2 ring-blue-500' : ''}`}
                  role="button"
                  aria-label={`View details for ${cluster.title} cluster`}
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedCluster(cluster)}
                  onClick={() => setSelectedCluster(cluster)}
                  data-cluster-id={cluster.id}
                >
                  <div className="p-4 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-1">
                      <div className="flex items-center">
                        <span className="text-xs text-blue-600 border border-blue-300 rounded-full px-1.5 py-0.5 mr-2 bg-blue-50">View</span>
                        <h4 className="text-lg font-semibold text-blue-700">{cluster.title}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleStar(cluster.id);
                          }}
                          className="ml-2"
                        >
                          <Star className={`h-4 w-4 ${starredClusters.includes(cluster.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                        </Button>
                      </div>
                      <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">
                        {cluster.emailCount} {cluster.emailCount === 1 ? 'Email' : 'Emails'}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 mb-3">
                      {getPriorityBadge(cluster.priority)}
                      {getStatusBadge(cluster.status)}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {cluster.participantCount} participants
                      </span>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(new Date(cluster.lastActivity), 'MMM d')}
                      </span>
                    </div>
                    
                    <ul className="space-y-2 my-2">
                      {cluster.emails.slice(0, 2).map((email, index) => (
                        <li key={index} className="text-sm text-gray-700 pl-4 border-l-2 border-blue-200">
                          {email.subject}
                        </li>
                      ))}
                      {cluster.emails.length > 2 && (
                        <li className="text-sm text-gray-500 pl-4 border-l-2 border-blue-200">
                          +{cluster.emails.length - 2} more emails...
                        </li>
                      )}
                    </ul>
                  </div>
                  
                  <div className="p-4 bg-blue-50">
                    <h5 className="text-xs font-medium text-gray-500 mb-1">PROJECT SUMMARY</h5>
                    <p className="text-sm text-gray-700">{cluster.summary}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-xs text-gray-600">Progress</span>
                      <div className="flex items-center gap-2">
                        <Progress value={cluster.progress} className="h-2 w-24" />
                        <span className="text-xs font-medium">{cluster.progress}%</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex divide-x divide-gray-200 border-t border-gray-200">
                    <Button 
                      variant="ghost" 
                      className="flex-1 rounded-none text-blue-600 py-3 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Summarize clicked for cluster:', cluster.id);
                      }}
                    >
                      <FolderOpen size={16} className="mr-2" />
                      Summarize Project
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="flex-1 rounded-none text-green-600 py-3 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        console.log('Draft clicked for cluster:', cluster.id);
                      }}
                    >
                      <Mail size={16} className="mr-2" />
                      Draft Update
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="timeline" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Project Timeline</CardTitle>
                <CardDescription>Visual representation of project progress over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {sortedClusters.map((cluster) => (
                    <div key={cluster.id} className="relative">
                      <div className="flex items-center gap-4">
                        <div className="w-32 text-sm font-medium">{cluster.title}</div>
                        <div className="flex-1">
                          <div className="relative h-8 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`absolute left-0 top-0 h-full ${getProgressColor(cluster.progress)} rounded-full transition-all duration-500`}
                              style={{ width: `${cluster.progress}%` }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                              {cluster.progress}%
                            </div>
                          </div>
                          <div className="flex justify-between mt-1 text-xs text-gray-500">
                            <span>{format(new Date(cluster.firstActivity), 'MMM d')}</span>
                            <span>{format(new Date(cluster.lastActivity), 'MMM d')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Project Detail Sidebar */}
      {selectedCluster && (
        <div className="w-96 bg-white border-l overflow-y-auto">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">{selectedCluster.title}</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedCluster(null)}
              >
                ✕
              </Button>
            </div>

            <div className="space-y-4">
              <div className="flex gap-2">
                {getPriorityBadge(selectedCluster.priority)}
                {getStatusBadge(selectedCluster.status)}
              </div>

              <div>
                <h3 className="font-medium mb-2">Project Summary</h3>
                <p className="text-sm text-gray-600">{selectedCluster.summary}</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Progress</h3>
                <Progress value={selectedCluster.progress} className="h-3" />
                <p className="text-sm text-gray-500 mt-1">{selectedCluster.progress}% complete</p>
              </div>

              <div>
                <h3 className="font-medium mb-2">Timeline</h3>
                <div className="space-y-2">
                  {selectedCluster.milestones.map((milestone, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className={`w-2 h-2 rounded-full mt-1.5 ${
                        milestone.type === 'completed' ? 'bg-green-500' :
                        milestone.type === 'milestone' ? 'bg-blue-500' :
                        'bg-gray-400'
                      }`} />
                      <div className="flex-1">
                        <p className="text-sm">{milestone.description}</p>
                        <p className="text-xs text-gray-500">{format(new Date(milestone.date), 'MMM d, yyyy')}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <h3 className="font-medium">Related Email Threads</h3>
                  <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded-full">
                    {selectedCluster.emails.length} emails
                  </span>
                </div>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {selectedCluster.emails.map((email, index) => (
                    <Card key={email.id} className="overflow-hidden hover:shadow-md transition-shadow" style={{animationDelay: `${index * 0.05}s`}}>
                      <div className="p-4">
                        <div className="flex justify-between">
                          <h5 className="font-medium text-sm truncate">{email.subject}</h5>
                          <span className="text-xs text-gray-500">{format(new Date(email.date), 'MMM d')}</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-1 mb-2">{email.from}</div>
                        <p className="text-sm text-gray-700 line-clamp-2">{email.snippet}</p>
                      </div>
                      <div className="bg-gray-50 p-3 border-t flex justify-end gap-2">
                        <Button size="sm" variant="outline">
                          <FolderOpen size={14} className="mr-1" /> View Full
                        </Button>
                        <Button size="sm" variant="outline" className="text-green-600">
                          <Mail size={14} className="mr-1" /> Reply
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}