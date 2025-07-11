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
      const response = await apiRequest('POST', '/api/ai/project-clusters', {
        emails: emailsData?.messages || []
      });
      return response.json() as Promise<ProjectCluster[]>;
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
            <div className="grid grid-cols-1 gap-3">
              {sortedClusters.map((cluster) => (
                <Card 
                  key={cluster.id} 
                  className="overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer cluster-card"
                  onClick={() => setSelectedCluster(cluster)}
                >
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-semibold text-lg text-blue-700">{cluster.title}</h4>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStar(cluster.id);
                            }}
                          >
                            <Star className={`h-4 w-4 ${starredClusters.includes(cluster.id) ? 'fill-yellow-500 text-yellow-500' : ''}`} />
                          </Button>
                        </div>
                        <div className="flex items-center gap-2 mb-2">
                          {getPriorityBadge(cluster.priority)}
                          {getStatusBadge(cluster.status)}
                          <Badge variant="outline" className="text-xs">
                            {cluster.emailCount} emails
                          </Badge>
                        </div>
                      </div>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">{cluster.summary}</p>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {cluster.participantCount} participants
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(cluster.lastActivity), 'MMM d')}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">{cluster.progress}%</span>
                        <Progress value={cluster.progress} className="h-2 w-20" />
                      </div>
                    </div>
                    
                    {cluster.emails.length > 0 && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500 mb-2">RECENT EMAILS:</p>
                        <ul className="space-y-1 text-xs text-gray-600">
                          {cluster.emails.slice(0, 2).map((email, idx) => (
                            <li key={idx} className="truncate">• {email.subject}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex divide-x divide-gray-200 border-t border-gray-200">
                    <Button 
                      variant="ghost" 
                      className="flex-1 rounded-none text-blue-600 py-3 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success('Project summary coming soon!');
                      }}
                    >
                      <FolderOpen size={16} className="mr-2" />
                      View Details
                    </Button>
                    <Button 
                      variant="ghost" 
                      className="flex-1 rounded-none text-green-600 py-3 h-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        toast.success('Draft reply coming soon!');
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

              <div>
                <h3 className="font-medium mb-2">All Project Emails</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {selectedCluster.emails.map((email) => (
                    <div key={email.id} className="p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-medium text-sm">{email.subject}</p>
                        <p className="text-xs text-gray-500">{format(new Date(email.date), 'MMM d')}</p>
                      </div>
                      <p className="text-xs text-gray-600">{email.from}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{email.snippet}</p>
                    </div>
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