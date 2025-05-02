import React, { useState, useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useQuery } from '@tanstack/react-query';
import { getQueryFn } from '@/lib/queryClient';
import { Settings, RefreshCw, Mail, Copy, Send } from 'lucide-react';

interface ClusterNode {
  id: string;
  name: string;
  emails: number;
  val: number; // Size based on email count
  color?: string;
}

interface ClusterLink {
  source: string;
  target: string;
  value: number;
}

interface ClusterData {
  nodes: ClusterNode[];
  links: ClusterLink[];
}

interface EmailCluster {
  id: string;
  topic: string;
  emails: any[];
  summary: string;
  replyStrategy: string;
}

export function FlowView() {
  const [graphData, setGraphData] = useState<ClusterData>({ nodes: [], links: [] });
  const [selectedCluster, setSelectedCluster] = useState<EmailCluster | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const graphRef = useRef<any>();
  const { toast } = useToast();

  // Query for email clusters
  const clustersQuery = useQuery({
    queryKey: ["/api/ai/email-clusters"],
    queryFn: getQueryFn({
      on401: "throw"
    }),
    enabled: false, // Don't fetch automatically on component mount
    retry: 1,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Initialize with dummy data for visualization
  useEffect(() => {
    const dummyData: ClusterData = {
      nodes: [
        { id: "me", name: "Me", emails: 0, val: 20, color: "#1e88e5" },
        { id: "work", name: "Work", emails: 12, val: 12, color: "#43a047" },
        { id: "personal", name: "Personal", emails: 8, val: 8, color: "#e53935" },
        { id: "travel", name: "Travel", emails: 5, val: 5, color: "#fb8c00" },
        { id: "finance", name: "Finance", emails: 7, val: 7, color: "#8e24aa" },
        { id: "social", name: "Social", emails: 9, val: 9, color: "#00acc1" },
        { id: "updates", name: "Updates", emails: 15, val: 15, color: "#7cb342" },
      ],
      links: [
        { source: "me", target: "work", value: 1 },
        { source: "me", target: "personal", value: 1 },
        { source: "me", target: "travel", value: 1 },
        { source: "me", target: "finance", value: 1 },
        { source: "me", target: "social", value: 1 },
        { source: "me", target: "updates", value: 1 },
        { source: "work", target: "updates", value: 0.5 },
        { source: "finance", target: "personal", value: 0.3 },
      ],
    };

    setGraphData(dummyData);
    setIsLoading(false);
  }, []);

  // Handle node click to show cluster details
  const handleNodeClick = (node: ClusterNode) => {
    if (node.id === "me") return; // Don't select the central 'Me' node

    // Try to find the cluster in API data if available
    if (clustersQuery.data) {
      const apiData = clustersQuery.data as any;
      if (apiData.clusters && Array.isArray(apiData.clusters)) {
        const foundCluster = apiData.clusters.find((c: any) => c.id === node.id);
        if (foundCluster) {
          console.log("[FlowView] Found cluster from API data:", foundCluster);
          
          const apiCluster: EmailCluster = {
            id: foundCluster.id,
            topic: foundCluster.topic || node.name,
            emails: foundCluster.emails || [],
            summary: foundCluster.summary || `This cluster contains emails related to ${node.name.toLowerCase()} topics.`,
            replyStrategy: foundCluster.replyStrategy || `When replying to emails in this ${node.name.toLowerCase()} cluster, acknowledge the sender's points and provide clear responses.`
          };
          
          setSelectedCluster(apiCluster);
          return;
        }
      }
    }
    
    // Fallback to creating a dummy cluster if API data not available
    console.log("[FlowView] Using dummy cluster for node:", node.id);
    const dummyCluster: EmailCluster = {
      id: node.id,
      topic: node.name,
      emails: Array(node.emails).fill(0).map((_, i) => ({
        id: `${node.id}-email-${i}`,
        subject: `${node.name} email subject ${i+1}`,
        from: `sender${i+1}@example.com`,
        snippet: `This is a sample snippet for ${node.name} email ${i+1}...`,
        receivedAt: new Date().toISOString()
      })),
      summary: `This cluster contains ${node.emails} emails related to ${node.name.toLowerCase()} topics. The emails discuss various aspects of ${node.name.toLowerCase()} including updates, requests, and information sharing.`,
      replyStrategy: `When replying to emails in this ${node.name.toLowerCase()} cluster, acknowledge the sender's points, provide clear and concise responses, and offer any necessary assistance or resources.`
    };

    setSelectedCluster(dummyCluster);
  };

  // Helper function to get a random color for nodes
  const getRandomColor = () => {
    // Define an array of professional colors
    const colors = [
      "#1e88e5", // Blue
      "#43a047", // Green
      "#e53935", // Red
      "#fb8c00", // Orange
      "#8e24aa", // Purple
      "#00acc1", // Cyan
      "#7cb342", // Light Green
      "#c0ca33", // Lime
      "#ffb300", // Amber
      "#f4511e", // Deep Orange
      "#6d4c41", // Brown
      "#546e7a", // Blue Grey
      "#5e35b1", // Deep Purple
      "#d81b60", // Pink
      "#00897b", // Teal
    ];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Generate email clusters from actual emails
  const generateClusters = async () => {
    setIsLoading(true);
    try {
      // In a real implementation, this would call the backend
      console.log("[FlowView] Requesting email clusters...");
      await clustersQuery.refetch();
      
      if (clustersQuery.isError) {
        console.error("Error generating email clusters:", clustersQuery.error);
        throw new Error("Failed to generate email clusters");
      }
      
      if (clustersQuery.data) {
        const apiData = clustersQuery.data as any;
        console.log("[FlowView] Received cluster data:", apiData);
        
        // Transform API data to graph format if available
        if (apiData && apiData.graphData) {
          console.log("[FlowView] Using API graph data");
          setGraphData(apiData.graphData);
        } else if (apiData && apiData.clusters && apiData.clusters.length > 0) {
          console.log("[FlowView] Transforming API clusters to graph data");
          
          // Transform clusters to graph format
          const nodes: ClusterNode[] = [
            { id: "me", name: "Me", emails: 0, val: 20, color: "#1e88e5" }, // Central node
          ];
          
          const links: ClusterLink[] = [];
          
          // Add each cluster as a node with connection to central "me" node
          apiData.clusters.forEach((cluster: any) => {
            const clusterNode: ClusterNode = {
              id: cluster.id || `cluster-${nodes.length}`,
              name: cluster.topic || `Topic ${nodes.length}`,
              emails: cluster.emails?.length || 0,
              val: Math.max(5, Math.min(20, (cluster.emails?.length || 0))), // Size between 5-20 based on email count
              color: cluster.color || getRandomColor(),
            };
            
            nodes.push(clusterNode);
            
            // Link to central node
            links.push({
              source: "me",
              target: clusterNode.id,
              value: 1
            });
          });
          
          setGraphData({ nodes, links });
        }
      }
      
      // If no API data is available, continue using the dummy data
      toast({
        title: "Clusters generated",
        description: "Email clusters have been successfully created.",
      });
    } catch (error) {
      console.error("Error generating clusters:", error);
      toast({
        title: "Error",
        description: "Could not generate email clusters. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-full">
      <div className="flex-1 flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-white">
          <h1 className="text-xl font-semibold">Email Flow Map</h1>
          <Button 
            onClick={generateClusters}
            disabled={isLoading}
            variant="outline"
            size="sm"
            className="flex items-center"
          >
            {isLoading ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw size={16} className="mr-2" />
                Generate Clusters
              </>
            )}
          </Button>
        </div>
        
        <div className="flex-1 bg-gray-50" style={{ minHeight: "500px" }}>
          {isLoading ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <RefreshCw size={40} className="mx-auto animate-spin text-gray-400 mb-4" />
                <p className="text-gray-500">Generating email clusters...</p>
              </div>
            </div>
          ) : (
            <div className="h-full">
              <ForceGraph2D
                ref={graphRef}
                graphData={graphData}
                nodeLabel="name"
                nodeAutoColorBy="group"
                nodeVal="val"
                nodeColor={(node: any) => node.color}
                linkWidth={1}
                linkDirectionalParticles={2}
                linkDirectionalParticleWidth={1.5}
                onNodeClick={handleNodeClick}
                nodeCanvasObject={(node: any, ctx, globalScale) => {
                  const label = node.name;
                  const fontSize = 12/globalScale;
                  ctx.font = `${fontSize}px Sans-Serif`;
                  ctx.textAlign = 'center';
                  ctx.textBaseline = 'middle';
                  ctx.fillStyle = node.id === 'me' ? '#ffffff' : '#000000';
                  ctx.fillText(label, node.x, node.y);
                }}
              />
            </div>
          )}
        </div>
      </div>
      
      {selectedCluster && (
        <div className="w-96 bg-white border-l border-gray-200 overflow-y-auto p-4">
          <div className="mb-4 flex justify-between items-start">
            <div>
              <h2 className="text-lg font-semibold">{selectedCluster.topic}</h2>
              <Badge variant="outline" className="mt-1">{selectedCluster.emails.length} emails</Badge>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => setSelectedCluster(null)}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </Button>
          </div>
          
          <Tabs defaultValue="summary">
            <TabsList className="w-full mb-4">
              <TabsTrigger value="summary" className="flex-1">Summary</TabsTrigger>
              <TabsTrigger value="emails" className="flex-1">Emails</TabsTrigger>
            </TabsList>
            
            <TabsContent value="summary" className="space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium mb-2">Cluster Summary</h3>
                  <p className="text-sm text-gray-600">{selectedCluster.summary}</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="pt-6">
                  <h3 className="text-sm font-medium mb-2">Reply Strategy</h3>
                  <p className="text-sm text-gray-600">{selectedCluster.replyStrategy}</p>
                </CardContent>
              </Card>
              
              <Button className="w-full" variant="outline">
                <Send size={16} className="mr-2" />
                Draft Response for All
              </Button>
            </TabsContent>
            
            <TabsContent value="emails" className="space-y-2">
              {selectedCluster.emails.map((email) => (
                <Card key={email.id} className="hover:bg-gray-50 cursor-pointer">
                  <CardContent className="py-3">
                    <h4 className="text-sm font-medium truncate">{email.subject}</h4>
                    <p className="text-xs text-gray-500 mb-1 truncate">{email.from}</p>
                    <p className="text-xs text-gray-600 truncate">{email.snippet}</p>
                  </CardContent>
                </Card>
              ))}
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
}
