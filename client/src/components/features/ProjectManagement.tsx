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
      const response = await apiRequest('/api/ai/project-clusters', {
        method: 'POST',
        body: JSON.stringify({
          emails: emailsData?.messages || []
        })
      });
      return response as ProjectCluster[];
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
            {sortedClusters.map((cluster) => (
              <Card key={cluster.id} className="overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleClusterExpansion(cluster.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {expandedClusters.includes(cluster.id) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                      <CardTitle className="text-lg">{cluster.title}</CardTitle>
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
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(cluster.priority)}
                      {getStatusBadge(cluster.status)}
                    </div>
                  </div>
                  <CardDescription className="mt-2">{cluster.summary}</CardDescription>
                </CardHeader>
                
                {expandedClusters.includes(cluster.id) && (
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Emails</p>
                        <p className="font-medium">{cluster.emailCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Participants</p>
                        <p className="font-medium">{cluster.participantCount}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Duration</p>
                        <p className="font-medium">
                          {differenceInDays(new Date(cluster.lastActivity), new Date(cluster.firstActivity))} days
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">Progress</p>
                        <Progress value={cluster.progress} className="h-2 mt-1" />
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Key Participants</h4>
                      <div className="flex flex-wrap gap-2">
                        {cluster.keyParticipants.map((participant, idx) => (
                          <Badge key={idx} variant="secondary">{participant}</Badge>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="font-medium mb-2">Recent Emails</h4>
                      <div className="space-y-2">
                        {cluster.emails.slice(0, 3).map((email) => (
                          <div key={email.id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center justify-between mb-1">
                              <p className="font-medium text-sm">{email.subject}</p>
                              <p className="text-xs text-gray-500">{format(new Date(email.date), 'MMM d')}</p>
                            </div>
                            <p className="text-xs text-gray-600">{email.from}</p>
                            <p className="text-xs text-gray-500 mt-1">{email.snippet}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => setSelectedCluster(cluster)}
                    >
                      View Full Project Details
                    </Button>
                  </CardContent>
                )}
              </Card>
            ))}
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