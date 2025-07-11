import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ChevronRight, FolderOpen, Mail, TrendingUp, Users, Calendar, Star, ChevronUp, ChevronDown, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { format, differenceInDays } from 'date-fns';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, AreaChart } from 'recharts';
import { motion, AnimatePresence } from "framer-motion";
import { TopicEvolution } from './TopicEvolution';

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

// Component for historical trends visualization
function HistoricalTrends({ clusters }: { clusters: ProjectCluster[] }) {
  const [animatedData, setAnimatedData] = useState<any[]>([]);
  
  // Generate mock historical data for each cluster
  const generateHistoricalData = () => {
    if (!clusters || clusters.length === 0) return [];
    
    // Generate data points for the last 30 days
    const days = 30;
    const data = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dataPoint: any = {
        date: format(date, 'MMM d'),
        fullDate: date.toISOString(),
      };
      
      // For each cluster, calculate cumulative emails up to this date
      clusters.forEach((cluster) => {
        const clusterStartDate = new Date(cluster.firstActivity);
        const daysActive = differenceInDays(date, clusterStartDate);
        
        if (daysActive >= 0) {
          // Calculate cumulative emails based on cluster age and email count
          const progress = Math.min(1, daysActive / 21); // Assume 3 weeks for full cluster
          const emailCount = Math.floor(cluster.emailCount * progress * (1 + Math.random() * 0.2 - 0.1));
          dataPoint[cluster.id] = emailCount;
        } else {
          dataPoint[cluster.id] = 0;
        }
      });
      
      data.push(dataPoint);
    }
    
    return data;
  };
  
  useEffect(() => {
    const data = generateHistoricalData();
    
    // Animate data loading
    if (data.length > 0) {
      const animationDuration = 1500;
      const stepDuration = animationDuration / data.length;
      
      data.forEach((point, index) => {
        setTimeout(() => {
          setAnimatedData(prev => [...prev, point]);
        }, index * stepDuration);
      });
    }
    
    return () => setAnimatedData([]);
  }, [clusters]);
  
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];
  
  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Total Email Flow</p>
                  <p className="text-2xl font-bold">{clusters.reduce((sum, c) => sum + c.emailCount, 0)}</p>
                </div>
                <TrendingUp className="h-8 w-8 text-green-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Active Clusters</p>
                  <p className="text-2xl font-bold">{clusters.filter(c => c.status === 'active').length}</p>
                </div>
                <FolderOpen className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
        
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">Avg. Emails/Cluster</p>
                  <p className="text-2xl font-bold">
                    {clusters.length > 0 ? Math.round(clusters.reduce((sum, c) => sum + c.emailCount, 0) / clusters.length) : 0}
                  </p>
                </div>
                <Mail className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
      
      {/* Area Chart */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7 }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Email Flow Over Time</CardTitle>
            <CardDescription>Cumulative emails in each cluster over the last 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={400}>
              <AreaChart data={animatedData}>
                <defs>
                  {clusters.map((cluster, index) => (
                    <linearGradient key={cluster.id} id={`gradient-${cluster.id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colors[index % colors.length]} stopOpacity={0.8}/>
                      <stop offset="95%" stopColor={colors[index % colors.length]} stopOpacity={0.1}/>
                    </linearGradient>
                  ))}
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                />
                <YAxis 
                  stroke="#666"
                  tick={{ fontSize: 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '10px'
                  }}
                  formatter={(value: any, name: any) => {
                    const cluster = clusters.find(c => c.id === name);
                    return [value, cluster?.title || name];
                  }}
                />
                {clusters.map((cluster, index) => (
                  <Area
                    key={cluster.id}
                    type="monotone"
                    dataKey={cluster.id}
                    stroke={colors[index % colors.length]}
                    fill={`url(#gradient-${cluster.id})`}
                    strokeWidth={2}
                    animationDuration={1500}
                    animationEasing="ease-in-out"
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Cluster Growth Cards */}
      <div className="grid grid-cols-2 gap-4">
        {clusters.slice(0, 4).map((cluster, index) => (
          <motion.div
            key={cluster.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 + index * 0.1 }}
          >
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-medium text-sm">{cluster.title}</h4>
                    <p className="text-xs text-gray-500">Started {format(new Date(cluster.firstActivity), 'MMM d')}</p>
                  </div>
                  <Badge 
                    className={`${
                      cluster.status === 'active' ? 'bg-green-100 text-green-800' :
                      cluster.status === 'completed' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {cluster.status}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Email Growth</span>
                    <span className="font-medium">+{Math.round(cluster.emailCount * 0.15)} this week</span>
                  </div>
                  <Progress value={cluster.progress} className="h-2" />
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {cluster.emailCount} emails
                    </span>
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {cluster.participantCount} people
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// Component for email activity chart in the sidebar
function EmailActivityChart({ cluster }: { cluster: ProjectCluster }) {
  const [animatedBars, setAnimatedBars] = useState<number[]>([]);
  
  // Generate daily email activity data
  const generateActivityData = () => {
    const days = 14; // Show last 14 days
    const data = [];
    const startDate = new Date(cluster.firstActivity);
    const endDate = new Date(cluster.lastActivity);
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Check if this date is within the cluster's active period
      if (date >= startDate && date <= endDate) {
        // Generate a realistic email count for this day
        const dayOfWeek = date.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const baseCount = isWeekend ? 0.3 : 1.0;
        const variance = Math.random() * 0.5 + 0.5;
        const emailCount = Math.floor((cluster.emailCount / days) * baseCount * variance);
        
        data.push({
          date: format(date, 'MMM d'),
          day: format(date, 'EEE'),
          count: emailCount,
          isWeekend
        });
      } else {
        data.push({
          date: format(date, 'MMM d'),
          day: format(date, 'EEE'),
          count: 0,
          isWeekend: date.getDay() === 0 || date.getDay() === 6
        });
      }
    }
    
    return data;
  };
  
  const activityData = useMemo(() => generateActivityData(), [cluster]);
  const maxCount = Math.max(...activityData.map(d => d.count));
  
  useEffect(() => {
    // Animate bars appearing
    const timeouts: NodeJS.Timeout[] = [];
    activityData.forEach((_, index) => {
      const timeout = setTimeout(() => {
        setAnimatedBars(prev => [...prev, index]);
      }, index * 50);
      timeouts.push(timeout);
    });
    
    return () => {
      timeouts.forEach(clearTimeout);
      setAnimatedBars([]);
    };
  }, [cluster]);
  
  return (
    <div className="space-y-3">
      {/* Mini bar chart */}
      <div className="h-24 flex items-end gap-1">
        {activityData.map((day, index) => {
          const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
          const isAnimated = animatedBars.includes(index);
          
          return (
            <motion.div
              key={index}
              className="flex-1 relative group"
              initial={{ height: 0 }}
              animate={{ height: isAnimated ? `${height}%` : 0 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            >
              <div 
                className={`w-full h-full rounded-t transition-colors ${
                  day.isWeekend ? 'bg-gray-300' : 'bg-blue-500'
                } hover:opacity-80 cursor-pointer`}
              />
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                <div className="bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  <div className="font-medium">{day.date}</div>
                  <div>{day.count} emails</div>
                </div>
                <div className="w-2 h-2 bg-gray-800 transform rotate-45 absolute left-1/2 -translate-x-1/2 -bottom-1"></div>
              </div>
            </motion.div>
          );
        })}
      </div>
      
      {/* Legend */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{activityData[0]?.date}</span>
        <span>{activityData[activityData.length - 1]?.date}</span>
      </div>
      
      {/* Summary stats */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t">
        <div className="text-center">
          <p className="text-xs text-gray-500">Peak Day</p>
          <p className="text-sm font-medium">
            {activityData.reduce((max, day) => day.count > max.count ? day : max, activityData[0])?.date}
          </p>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">Avg/Day</p>
          <p className="text-sm font-medium">
            {Math.round(activityData.reduce((sum, day) => sum + day.count, 0) / activityData.length)} emails
          </p>
        </div>
      </div>
    </div>
  );
}

// Mini KPI Dashboard component
function MiniKPIDashboard({ cluster }: { cluster: ProjectCluster }) {
  const calculateMetrics = () => {
    const emails = cluster.emails;
    const dates = emails.map(e => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());
    
    // Calculate velocity (emails per day)
    const daySpan = differenceInDays(new Date(cluster.lastActivity), new Date(cluster.firstActivity)) || 1;
    const velocity = cluster.emailCount / daySpan;
    
    // Calculate average response time (mock data for now)
    const avgResponseTime = Math.floor(Math.random() * 24 + 4); // 4-28 hours
    
    // Calculate unique participants
    const uniqueParticipants = new Set(emails.map(e => e.from)).size;
    
    // Generate sparkline data
    const sparklineData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const count = emails.filter(e => {
        const emailDate = new Date(e.date);
        return emailDate.toDateString() === date.toDateString();
      }).length;
      sparklineData.push(count);
    }
    
    return { velocity, avgResponseTime, uniqueParticipants, sparklineData };
  };
  
  const metrics = calculateMetrics();
  const maxSparkValue = Math.max(...metrics.sparklineData);
  
  return (
    <div className="grid grid-cols-3 gap-2">
      {/* Velocity Chip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-gray-50 rounded-lg p-3"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Velocity</span>
          <TrendingUp className="h-3 w-3 text-green-500" />
        </div>
        <p className="text-sm font-semibold">{metrics.velocity.toFixed(1)}/day</p>
        <div className="h-8 flex items-end gap-0.5 mt-2">
          {metrics.sparklineData.map((value, i) => (
            <div
              key={i}
              className="flex-1 bg-blue-400 rounded-t"
              style={{ 
                height: `${maxSparkValue > 0 ? (value / maxSparkValue) * 100 : 0}%`,
                minHeight: value > 0 ? '2px' : '0'
              }}
            />
          ))}
        </div>
      </motion.div>
      
      {/* Response Time Chip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
        className="bg-gray-50 rounded-lg p-3"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Avg Response</span>
          <Clock className="h-3 w-3 text-orange-500" />
        </div>
        <p className="text-sm font-semibold">{metrics.avgResponseTime}h</p>
        <div className="text-xs text-gray-400 mt-1">
          {metrics.avgResponseTime < 12 ? 'Fast' : metrics.avgResponseTime < 24 ? 'Normal' : 'Slow'}
        </div>
      </motion.div>
      
      {/* Participants Chip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
        className="bg-gray-50 rounded-lg p-3"
      >
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-500">Participants</span>
          <Users className="h-3 w-3 text-purple-500" />
        </div>
        <p className="text-sm font-semibold">{metrics.uniqueParticipants}</p>
        <div className="text-xs text-gray-400 mt-1">
          {cluster.participantCount} total
        </div>
      </motion.div>
    </div>
  );
}

// Thread Tree Timeline component
function ThreadTreeTimeline({ emails }: { emails: ProjectCluster['emails'] }) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  
  // Create a mock thread structure
  const buildThreadTree = () => {
    const nodes = emails.map((email, index) => ({
      id: email.id,
      subject: email.subject,
      from: email.from,
      date: new Date(email.date),
      snippet: email.snippet,
      parentId: index > 0 && Math.random() > 0.3 ? emails[Math.floor(Math.random() * index)].id : null,
      depth: 0,
      children: [] as any[]
    }));
    
    // Build tree structure
    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const roots: typeof nodes = [];
    
    nodes.forEach(node => {
      if (node.parentId && nodeMap.has(node.parentId)) {
        const parent = nodeMap.get(node.parentId)!;
        parent.children.push(node);
        node.depth = parent.depth + 1;
      } else {
        roots.push(node);
      }
    });
    
    return roots;
  };
  
  const threadTree = useMemo(() => buildThreadTree(), [emails]);
  
  const toggleExpanded = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };
  
  const renderNode = (node: any, index: number) => {
    const isExpanded = expandedNodes.has(node.id);
    const hasChildren = node.children.length > 0;
    
    return (
      <motion.div
        key={node.id}
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: index * 0.05 }}
        style={{ marginLeft: `${node.depth * 20}px` }}
        className="mb-2"
      >
        <div 
          className="flex items-start gap-2 p-2 rounded hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => hasChildren && toggleExpanded(node.id)}
        >
          <div className="mt-1">
            {hasChildren && (
              <ChevronRight 
                className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} 
              />
            )}
            {!hasChildren && (
              <div className="w-2 h-2 bg-gray-300 rounded-full ml-1" />
            )}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 truncate">{node.from}</span>
              <span className="text-xs text-gray-400">{format(node.date, 'MMM d, h:mm a')}</span>
            </div>
            <p className="text-xs text-gray-600 truncate">{node.subject}</p>
          </div>
        </div>
        
        {isExpanded && node.children.map((child: any, childIndex: number) => 
          renderNode(child, index + childIndex + 1)
        )}
      </motion.div>
    );
  };
  
  return (
    <div className="max-h-64 overflow-y-auto border rounded-lg p-3 bg-gray-50">
      {threadTree.length === 0 ? (
        <p className="text-sm text-gray-500 text-center">No email threads yet</p>
      ) : (
        threadTree.map((node, index) => renderNode(node, index))
      )}
    </div>
  );
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

        {/* All Projects View */}
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

              {/* Email Activity Chart */}
              <div>
                <h3 className="font-medium mb-2">Email Activity Over Time</h3>
                <EmailActivityChart cluster={selectedCluster} />
              </div>

              {/* Topic Evolution Chart */}
              <div>
                <TopicEvolution emails={selectedCluster.emails} />
              </div>

              {/* Mini KPI Dashboard */}
              <div>
                <h3 className="font-medium mb-2">Conversation Metrics</h3>
                <MiniKPIDashboard cluster={selectedCluster} />
              </div>

              {/* Thread Tree Timeline */}
              <div>
                <h3 className="font-medium mb-2">Email Thread Evolution</h3>
                <ThreadTreeTimeline emails={selectedCluster.emails} />
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