import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, TrendingUp, TrendingDown, Minus, Activity, Mail, Clock, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";

interface Contact {
  id: string;
  name: string;
  email: string;
  organization?: string;
  position?: string;
  avatar?: string;
  responseRate: number;
  averageResponseTime: number; // in hours
  threadCount: number;
  recentSubjects: string[];
  sentimentTrend: 'improving' | 'declining' | 'stable';
  emailVolume: {
    month: string;
    sent: number;
    received: number;
  }[];
  emailsByDayOfWeek: {
    day: string;
    count: number;
  }[];
  emailsByTimeOfDay: {
    time: string;
    count: number;
  }[];
  topKeywords: {
    word: string;
    weight: number;
  }[];
  recentCommunication: {
    date: string;
    subject: string;
    snippet: string;
    sentiment: 'positive' | 'neutral' | 'negative';
  }[];
}

export function ContactInsights() {
  const [contactEmail, setContactEmail] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const { toast } = useToast();

  // Mock contact data
  const mockContacts: Contact[] = [
    {
      id: "contact-1",
      name: "Thomas Anderson",
      email: "t.anderson@metacortex.com",
      organization: "Metacortex",
      position: "Software Engineer",
      avatar: "https://ui-avatars.com/api/?name=TA",
      responseRate: 85,
      averageResponseTime: 4.5,
      threadCount: 37,
      recentSubjects: [
        "Project Morpheus Updates",
        "RE: Code Review for Matrix Integration",
        "Follow-up: Meeting with Oracle Team"
      ],
      sentimentTrend: 'improving',
      emailVolume: [
        { month: "Jan", sent: 12, received: 15 },
        { month: "Feb", sent: 8, received: 13 },
        { month: "Mar", sent: 15, received: 18 },
        { month: "Apr", sent: 10, received: 12 },
        { month: "May", sent: 5, received: 10 },
        { month: "Jun", sent: 8, received: 7 }
      ],
      emailsByDayOfWeek: [
        { day: "Mon", count: 18 },
        { day: "Tue", count: 23 },
        { day: "Wed", count: 30 },
        { day: "Thu", count: 15 },
        { day: "Fri", count: 12 },
        { day: "Sat", count: 3 },
        { day: "Sun", count: 1 }
      ],
      emailsByTimeOfDay: [
        { time: "Morning (6-11)", count: 25 },
        { time: "Afternoon (12-17)", count: 45 },
        { time: "Evening (18-23)", count: 15 },
        { time: "Night (0-5)", count: 5 }
      ],
      topKeywords: [
        { word: "project", weight: 15 },
        { word: "matrix", weight: 12 },
        { word: "code", weight: 9 },
        { word: "meeting", weight: 7 },
        { word: "review", weight: 5 }
      ],
      recentCommunication: [
        {
          date: "2023-06-10",
          subject: "Project Morpheus Updates",
          snippet: "I've finished the integration tests for the red pill module. The results look promising, but we should discuss the blue pill alternative as well.",
          sentiment: 'positive'
        },
        {
          date: "2023-05-28",
          subject: "RE: Code Review for Matrix Integration",
          snippet: "The changes look good overall, but there are a few edge cases we should handle more gracefully. See my inline comments.",
          sentiment: 'neutral'
        },
        {
          date: "2023-05-15",
          subject: "Follow-up: Meeting with Oracle Team",
          snippet: "The meeting went well, but I'm concerned about the timeline they proposed. I think we should push back on the deadline.",
          sentiment: 'negative'
        }
      ]
    },
    {
      id: "contact-2",
      name: "Trinity Smith",
      email: "trinity@resistancehq.org",
      organization: "Resistance HQ",
      position: "Security Specialist",
      avatar: "https://ui-avatars.com/api/?name=TS",
      responseRate: 92,
      averageResponseTime: 2.1,
      threadCount: 42,
      recentSubjects: [
        "Security Protocol Updates",
        "Encrypted Communication Channels",
        "Training Program for New Recruits"
      ],
      sentimentTrend: 'stable',
      emailVolume: [
        { month: "Jan", sent: 18, received: 22 },
        { month: "Feb", sent: 15, received: 18 },
        { month: "Mar", sent: 20, received: 25 },
        { month: "Apr", sent: 22, received: 28 },
        { month: "May", sent: 16, received: 20 },
        { month: "Jun", sent: 12, received: 15 }
      ],
      emailsByDayOfWeek: [
        { day: "Mon", count: 25 },
        { day: "Tue", count: 30 },
        { day: "Wed", count: 28 },
        { day: "Thu", count: 22 },
        { day: "Fri", count: 15 },
        { day: "Sat", count: 5 },
        { day: "Sun", count: 3 }
      ],
      emailsByTimeOfDay: [
        { time: "Morning (6-11)", count: 15 },
        { time: "Afternoon (12-17)", count: 35 },
        { time: "Evening (18-23)", count: 45 },
        { time: "Night (0-5)", count: 15 }
      ],
      topKeywords: [
        { word: "security", weight: 20 },
        { word: "encryption", weight: 17 },
        { word: "protocol", weight: 14 },
        { word: "training", weight: 10 },
        { word: "system", weight: 8 }
      ],
      recentCommunication: [
        {
          date: "2023-06-12",
          subject: "Security Protocol Updates",
          snippet: "The new security protocols have been implemented. All team members should review the updated documentation and complete the certification by Friday.",
          sentiment: 'positive'
        },
        {
          date: "2023-06-01",
          subject: "Encrypted Communication Channels",
          snippet: "I've set up the new encrypted channels. Please test them out and let me know if you encounter any issues with the key exchange protocol.",
          sentiment: 'positive'
        },
        {
          date: "2023-05-20",
          subject: "Training Program for New Recruits",
          snippet: "The training program needs to be more comprehensive. I'm particularly concerned about the sections on evasion techniques and system infiltration.",
          sentiment: 'neutral'
        }
      ]
    }
  ];

  // Mock search function
  const searchContact = async () => {
    setIsSearching(true);
    
    // In a real implementation, this would search through a database or API
    // For now, we'll simulate a search through our mock data
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const foundContact = mockContacts.find(contact => 
      contact.email.toLowerCase() === contactEmail.toLowerCase() ||
      contact.name.toLowerCase().includes(contactEmail.toLowerCase())
    );
    
    if (foundContact) {
      setSelectedContact(foundContact);
      toast({
        title: "Contact found",
        description: `Found insights for ${foundContact.name}`,
        duration: 3000
      });
    } else {
      toast({
        title: "Contact not found",
        description: "No contact matches your search criteria.",
        duration: 3000,
        variant: "destructive"
      });
    }
    
    setIsSearching(false);
  };

  // Helper to get sentiment icon
  const getSentimentIcon = (trend: 'improving' | 'declining' | 'stable') => {
    if (trend === 'improving') return <TrendingUp className="h-4 w-4 text-green-500" />;
    if (trend === 'declining') return <TrendingDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-gray-500" />;
  };

  // Helper to get sentiment text color
  const getSentimentColor = (sentiment: 'positive' | 'neutral' | 'negative') => {
    if (sentiment === 'positive') return 'text-green-600';
    if (sentiment === 'negative') return 'text-red-600';
    return 'text-gray-600';
  };

  // Pie chart colors
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-5xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Users className="mr-2 h-6 w-6 text-purple-600" />
            Contact Insights
          </CardTitle>
          <CardDescription>
            Analyze communication patterns and relationship insights for your contacts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-2">
              <label htmlFor="contact-email-insight" className="text-sm font-medium">
                Search for a contact by email or name:
              </label>
              <div className="flex gap-2">
                <Input
                  id="contact-email-insight"
                  placeholder="e.g., t.anderson@metacortex.com or Thomas"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="flex-1"
                />
                <Button
                  onClick={searchContact}
                  disabled={isSearching || !contactEmail.trim()}
                >
                  {isSearching ? (
                    "Searching..."
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Search
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div className="text-sm text-gray-500">
              <p>Try searching for one of these example contacts:</p>
              <ul className="list-disc list-inside mt-1">
                <li>t.anderson@metacortex.com (Thomas Anderson, Metacortex)</li>
                <li>trinity@resistancehq.org (Trinity Smith, Resistance HQ)</li>
              </ul>
            </div>
            
            {selectedContact && (
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src={selectedContact.avatar} alt={selectedContact.name} />
                      <AvatarFallback>{selectedContact.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="text-xl font-medium">{selectedContact.name}</h3>
                      <p className="text-gray-500">{selectedContact.email}</p>
                      {selectedContact.organization && (
                        <p className="text-sm text-gray-600">
                          {selectedContact.position} at {selectedContact.organization}
                        </p>
                      )}
                      <div className="flex items-center mt-1">
                        <Badge className="mr-2 bg-blue-100 text-blue-800 border-blue-200">
                          {selectedContact.threadCount} threads
                        </Badge>
                        <span className="flex items-center text-sm">
                          Sentiment: {getSentimentIcon(selectedContact.sentimentTrend)} 
                          <span className="ml-1">
                            {selectedContact.sentimentTrend.charAt(0).toUpperCase() + selectedContact.sentimentTrend.slice(1)}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedContact(null);
                      setContactEmail("");
                    }}
                  >
                    New Search
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="col-span-1">
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm flex items-center">
                        <Activity className="mr-2 h-4 w-4 text-purple-500" />
                        Communication Stats
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="border rounded-lg p-3 text-center">
                            <div className="text-2xl font-semibold">{selectedContact.responseRate}%</div>
                            <div className="text-xs text-gray-500">Response Rate</div>
                          </div>
                          <div className="border rounded-lg p-3 text-center">
                            <div className="text-2xl font-semibold">{selectedContact.averageResponseTime}h</div>
                            <div className="text-xs text-gray-500">Avg. Response Time</div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="text-xs font-semibold mb-2">Recent Subjects:</h4>
                          <ul className="space-y-1 text-sm">
                            {selectedContact.recentSubjects.map((subject, idx) => (
                              <li key={idx} className="truncate">{subject}</li>
                            ))}
                          </ul>
                        </div>
                        
                        <div>
                          <h4 className="text-xs font-semibold mb-2">Top Keywords:</h4>
                          <div className="flex flex-wrap gap-1">
                            {selectedContact.topKeywords.map((keyword, idx) => (
                              <Badge 
                                key={idx} 
                                variant="outline"
                                className="bg-purple-50"
                                style={{
                                  fontSize: `${Math.max(0.6, Math.min(1, keyword.weight / 15))}rem`
                                }}
                              >
                                {keyword.word}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="col-span-1 md:col-span-2">
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm flex items-center">
                        <Mail className="mr-2 h-4 w-4 text-blue-500" />
                        Email Volume Over Time
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={selectedContact.emailVolume}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line type="monotone" dataKey="sent" stroke="#8884d8" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="received" stroke="#82ca9d" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm flex items-center">
                        <Calendar className="mr-2 h-4 w-4 text-green-500" />
                        Emails by Day of Week
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart
                            data={selectedContact.emailsByDayOfWeek}
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="day" />
                            <YAxis />
                            <Tooltip />
                            <Line type="monotone" dataKey="count" stroke="#8884d8" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm flex items-center">
                        <Clock className="mr-2 h-4 w-4 text-amber-500" />
                        Emails by Time of Day
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={selectedContact.emailsByTimeOfDay}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              outerRadius={80}
                              fill="#8884d8"
                              dataKey="count"
                              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            >
                              {selectedContact.emailsByTimeOfDay.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                              ))}
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <Card>
                  <CardHeader className="p-4">
                    <CardTitle className="text-sm flex items-center">
                      <Mail className="mr-2 h-4 w-4 text-indigo-500" />
                      Recent Communication
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Snippet</TableHead>
                          <TableHead>Sentiment</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedContact.recentCommunication.map((comm, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="font-medium">{new Date(comm.date).toLocaleDateString()}</TableCell>
                            <TableCell>{comm.subject}</TableCell>
                            <TableCell className="max-w-xs truncate">{comm.snippet}</TableCell>
                            <TableCell>
                              <Badge className={`${
                                comm.sentiment === 'positive' 
                                  ? 'bg-green-100 text-green-800 border-green-200' 
                                  : comm.sentiment === 'negative'
                                    ? 'bg-red-100 text-red-800 border-red-200'
                                    : 'bg-gray-100 text-gray-800 border-gray-200'
                              }`}>
                                {comm.sentiment.charAt(0).toUpperCase() + comm.sentiment.slice(1)}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
                
                <div className="border-t pt-4">
                  <h3 className="text-lg font-medium mb-2">Communication Insights</h3>
                  <div className="space-y-3 text-sm">
                    <p>
                      <span className="font-medium">Best time to reach: </span>
                      {selectedContact.emailsByDayOfWeek.sort((a, b) => b.count - a.count)[0].day}s during 
                      {selectedContact.emailsByTimeOfDay.sort((a, b) => b.count - a.count)[0].time}.
                    </p>
                    <p>
                      <span className="font-medium">Response pattern: </span>
                      {selectedContact.name} typically responds within {selectedContact.averageResponseTime} hours,
                      with a {selectedContact.responseRate}% response rate.
                    </p>
                    <p>
                      <span className="font-medium">Communication style: </span>
                      Based on language analysis, {selectedContact.name} communicates in a 
                      {selectedContact.sentimentTrend === 'improving' 
                        ? ' increasingly positive' 
                        : selectedContact.sentimentTrend === 'declining'
                          ? ' recently more critical'
                          : ' consistently neutral'} tone.
                      Key topics include: {selectedContact.topKeywords.slice(0, 3).map(k => k.word).join(', ')}.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}