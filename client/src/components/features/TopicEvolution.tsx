import { useState, useEffect, useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis, Area, AreaChart } from 'recharts';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { toast } from 'react-hot-toast';
import { Loader2, TrendingUp, Layers } from 'lucide-react';

interface TopicData {
  emailId: string;
  date: string;
  keywords: string[];
}

interface TopicEvolutionData {
  keyword: string;
  data: {
    date: string;
    frequency: number;
    keyword: string;
  }[];
}

interface TopicEvolutionProps {
  emails: any[];
}

export function TopicEvolution({ emails }: TopicEvolutionProps) {
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');
  const [topicData, setTopicData] = useState<TopicData[]>([]);
  const [topicEvolution, setTopicEvolution] = useState<TopicEvolutionData[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);

  // Extract topics from emails using AI
  const extractTopics = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/ai/extract-topics', { emails });
      const data = await response.json();
      
      setTopicData(data.topicData);
      setTopicEvolution(data.topicEvolution);
      
      // Select top 5 keywords by default
      const topKeywords = data.topicEvolution
        .sort((a: TopicEvolutionData, b: TopicEvolutionData) => 
          b.data.reduce((sum, d) => sum + d.frequency, 0) - 
          a.data.reduce((sum, d) => sum + d.frequency, 0)
        )
        .slice(0, 5)
        .map((t: TopicEvolutionData) => t.keyword);
      
      setSelectedKeywords(topKeywords);
    } catch (error) {
      console.error('Failed to extract topics:', error);
      toast.error('Failed to extract topics from emails');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (emails.length > 0) {
      extractTopics();
    }
  }, [emails]);

  // Prepare data for 2D line chart
  const lineChartData = useMemo(() => {
    if (!topicEvolution.length) return [];
    
    // Get all unique dates
    const allDates = new Set<string>();
    topicEvolution.forEach(topic => {
      topic.data.forEach(d => allDates.add(d.date));
    });
    
    // Create data points for each date
    const chartData = Array.from(allDates).sort().map(date => {
      const dataPoint: any = { date, formattedDate: format(new Date(date), 'MMM d') };
      
      selectedKeywords.forEach(keyword => {
        const topic = topicEvolution.find(t => t.keyword === keyword);
        const freq = topic?.data.find(d => d.date === date)?.frequency || 0;
        dataPoint[keyword] = freq;
      });
      
      return dataPoint;
    });
    
    return chartData;
  }, [topicEvolution, selectedKeywords]);

  // Prepare data for 3D scatter plot (simulated with bubble chart)
  const scatterChartData = useMemo(() => {
    if (!topicEvolution.length) return [];
    
    const data: any[] = [];
    
    topicEvolution.forEach((topic, topicIndex) => {
      if (!selectedKeywords.includes(topic.keyword)) return;
      
      topic.data.forEach(point => {
        // Convert date to numeric value for x-axis
        const dateValue = new Date(point.date).getTime();
        
        data.push({
          x: dateValue,
          y: topicIndex,
          z: point.frequency,
          keyword: topic.keyword,
          date: point.date,
          formattedDate: format(new Date(point.date), 'MMM d, yyyy'),
          frequency: point.frequency
        });
      });
    });
    
    return data;
  }, [topicEvolution, selectedKeywords]);

  // Toggle keyword selection
  const toggleKeyword = (keyword: string) => {
    setSelectedKeywords(prev => {
      if (prev.includes(keyword)) {
        return prev.filter(k => k !== keyword);
      } else if (prev.length < 8) {
        return [...prev, keyword];
      } else {
        toast.error('Maximum 8 keywords can be selected');
        return prev;
      }
    });
  };

  // Get color for keyword
  const getKeywordColor = (keyword: string, index: number) => {
    const colors = [
      '#3B82F6', // blue
      '#EF4444', // red
      '#10B981', // green
      '#F59E0B', // amber
      '#8B5CF6', // violet
      '#EC4899', // pink
      '#14B8A6', // teal
      '#F97316', // orange
    ];
    return colors[index % colors.length];
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center space-x-2">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm text-gray-600">Extracting topics from emails...</span>
        </div>
      </Card>
    );
  }

  if (!topicEvolution.length) {
    return (
      <Card className="p-6">
        <p className="text-sm text-gray-500 text-center">No topic data available</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Topic Evolution Analysis</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === '2d' ? 'default' : 'outline'}
            onClick={() => setViewMode('2d')}
          >
            <TrendingUp className="h-4 w-4 mr-1" />
            2D View
          </Button>
          <Button
            size="sm"
            variant={viewMode === '3d' ? 'default' : 'outline'}
            onClick={() => setViewMode('3d')}
          >
            <Layers className="h-4 w-4 mr-1" />
            3D View
          </Button>
        </div>
      </div>

      {/* Keyword Selection */}
      <Card className="p-4">
        <p className="text-sm text-gray-600 mb-3">Select keywords to visualize (max 8):</p>
        <div className="flex flex-wrap gap-2">
          {topicEvolution.map((topic, index) => {
            const isSelected = selectedKeywords.includes(topic.keyword);
            const totalFreq = topic.data.reduce((sum, d) => sum + d.frequency, 0);
            
            return (
              <motion.div
                key={topic.keyword}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: index * 0.05 }}
              >
                <Badge
                  variant={isSelected ? 'default' : 'outline'}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? 'hover:opacity-80' 
                      : 'hover:bg-gray-100'
                  }`}
                  style={{
                    backgroundColor: isSelected ? getKeywordColor(topic.keyword, selectedKeywords.indexOf(topic.keyword)) : undefined,
                    borderColor: isSelected ? getKeywordColor(topic.keyword, selectedKeywords.indexOf(topic.keyword)) : undefined,
                    color: isSelected ? 'white' : undefined
                  }}
                  onClick={() => toggleKeyword(topic.keyword)}
                >
                  {topic.keyword} ({totalFreq})
                </Badge>
              </motion.div>
            );
          })}
        </div>
      </Card>

      {/* Visualization */}
      <Card className="p-4">
        <AnimatePresence mode="wait">
          {viewMode === '2d' ? (
            <motion.div
              key="2d"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-96"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={lineChartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <defs>
                    {selectedKeywords.map((keyword, index) => (
                      <linearGradient key={keyword} id={`gradient-${keyword}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor={getKeywordColor(keyword, index)} stopOpacity={0.8}/>
                        <stop offset="95%" stopColor={getKeywordColor(keyword, index)} stopOpacity={0.1}/>
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    dataKey="formattedDate" 
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <YAxis 
                    label={{ value: 'Frequency', angle: -90, position: 'insideLeft' }}
                    tick={{ fontSize: 12 }}
                    stroke="#666"
                  />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.95)', 
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px'
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ paddingTop: '20px' }}
                    iconType="line"
                  />
                  {selectedKeywords.map((keyword, index) => (
                    <Area
                      key={keyword}
                      type="monotone"
                      dataKey={keyword}
                      stroke={getKeywordColor(keyword, index)}
                      strokeWidth={2}
                      fill={`url(#gradient-${keyword})`}
                      animationDuration={1000}
                      animationBegin={index * 100}
                    />
                  ))}
                </AreaChart>
              </ResponsiveContainer>
            </motion.div>
          ) : (
            <motion.div
              key="3d"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="h-96"
            >
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 60, left: 60 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                  <XAxis 
                    type="number"
                    dataKey="x"
                    domain={['dataMin', 'dataMax']}
                    tickFormatter={(value) => format(new Date(value), 'MMM d')}
                    label={{ value: 'Date', position: 'insideBottom', offset: -10 }}
                    stroke="#666"
                  />
                  <YAxis 
                    type="number"
                    dataKey="y"
                    domain={[0, selectedKeywords.length - 1]}
                    ticks={selectedKeywords.map((_, i) => i)}
                    tickFormatter={(value) => selectedKeywords[value] || ''}
                    label={{ value: 'Topics', angle: -90, position: 'insideLeft' }}
                    stroke="#666"
                  />
                  <ZAxis 
                    type="number"
                    dataKey="z"
                    range={[50, 400]}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 rounded-lg shadow-lg border">
                            <p className="font-medium">{data.keyword}</p>
                            <p className="text-sm text-gray-600">{data.formattedDate}</p>
                            <p className="text-sm">Frequency: {data.frequency}</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Scatter 
                    data={scatterChartData} 
                    fill="#8884d8"
                    shape={(props: any) => {
                      const { cx, cy, payload } = props;
                      const keywordIndex = selectedKeywords.indexOf(payload.keyword);
                      const color = getKeywordColor(payload.keyword, keywordIndex);
                      const size = Math.sqrt(payload.z) * 8;
                      
                      return (
                        <motion.circle
                          cx={cx}
                          cy={cy}
                          r={size}
                          fill={color}
                          fillOpacity={0.6}
                          stroke={color}
                          strokeWidth={2}
                          initial={{ r: 0 }}
                          animate={{ r: size }}
                          transition={{ duration: 0.5, delay: keywordIndex * 0.1 }}
                        />
                      );
                    }}
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* Analysis Summary */}
      <Card className="p-4 bg-blue-50">
        <h4 className="text-sm font-medium mb-2">Topic Insights</h4>
        <div className="space-y-2 text-sm text-gray-700">
          <p>• Tracking {selectedKeywords.length} topics across {lineChartData.length} time periods</p>
          <p>• Most frequent topic: <span className="font-medium">{topicEvolution[0]?.keyword}</span></p>
          <p>• Time range: {lineChartData.length > 0 && `${lineChartData[0].formattedDate} - ${lineChartData[lineChartData.length - 1].formattedDate}`}</p>
        </div>
      </Card>
    </div>
  );
}