import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PenTool, Search, Users, Building, FileText, Lightbulb, ArrowRight, Edit, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Contact {
  id: string;
  name: string;
  email: string;
  organization?: string;
  position?: string;
  avatar?: string;
  lastInteraction?: string;
  pastInteractions?: {
    date: string;
    subject: string;
    snippet: string;
  }[];
  interests?: string[];
  connections?: {
    name: string;
    relationship: string;
  }[];
}

export function ContextSynthesis() {
  const [contactEmail, setContactEmail] = useState("");
  const [draftSubject, setDraftSubject] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const { toast } = useToast();

  // Mock contact data
  const mockContacts: Contact[] = [
    {
      id: "contact-1",
      name: "Alex Rodriguez",
      email: "alex.rodriguez@acmecorp.com",
      organization: "Acme Corporation",
      position: "Director of Innovation",
      avatar: "https://ui-avatars.com/api/?name=AR",
      lastInteraction: "2023-05-20",
      pastInteractions: [
        {
          date: "2023-05-20",
          subject: "Proposal for AI Implementation",
          snippet: "Thank you for sending over the proposal. I've shared it with my team and we're interested in exploring the AI analytics module further."
        },
        {
          date: "2023-04-15",
          subject: "RE: Introduction and Potential Collaboration",
          snippet: "It was great meeting you at the conference. I'd be happy to schedule a call to discuss how our companies might work together."
        }
      ],
      interests: ["Artificial Intelligence", "Data Analytics", "Digital Transformation"],
      connections: [
        { name: "Maria Johnson", relationship: "Colleague" },
        { name: "David Chen", relationship: "Former employee" }
      ]
    },
    {
      id: "contact-2",
      name: "Samantha Lee",
      email: "slee@innovatetech.com",
      organization: "InnovateTech",
      position: "Chief Technology Officer",
      avatar: "https://ui-avatars.com/api/?name=SL",
      lastInteraction: "2023-06-01",
      pastInteractions: [
        {
          date: "2023-06-01",
          subject: "RE: Upcoming Technology Summit",
          snippet: "I'd be delighted to speak at your panel on emerging tech trends. Please send me the details when you have them."
        }
      ],
      interests: ["Blockchain", "Machine Learning", "Cloud Computing"],
      connections: [
        { name: "Josh Smith", relationship: "Former colleague" }
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
      setDraftSubject("Regarding our collaboration on " + foundContact.interests?.[0]);
      toast({
        title: "Contact found",
        description: `Found ${foundContact.name} from ${foundContact.organization || 'N/A'}`,
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

  // Generate email draft based on contact context
  const generateEmailDraft = async () => {
    if (!selectedContact) return;
    
    setIsGeneratingDraft(true);
    
    // In a real implementation, this would call the OpenAI API
    // For now, we'll simulate a response after a delay
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const generatedDraft = `Dear ${selectedContact.name},

I hope this email finds you well. It's been a while since our last conversation about the ${selectedContact.pastInteractions?.[0]?.subject.toLowerCase()}.

I noticed that you previously expressed interest in ${selectedContact.interests?.[0]}, and I wanted to reach out because we've recently developed a new solution in this area that I think would align perfectly with your goals at ${selectedContact.organization}.

Our team has been working on Project Y, which focuses on ${selectedContact.interests?.[0]} applications for businesses in your industry. Given your background and interest in this field, I believe there could be valuable opportunities for collaboration.

Would you be available for a brief call next week to discuss this further? I'm flexible and can work around your schedule.

Looking forward to reconnecting.

Best regards,
[Your Name]

P.S. I also saw that you connected with ${selectedContact.connections?.[0]?.name} recently. They spoke highly of your work at ${selectedContact.organization}.`;
    
    setDraftContent(generatedDraft);
    setIsGeneratingDraft(false);
  };

  // Copy draft to clipboard
  const copyDraft = () => {
    const fullDraft = `Subject: ${draftSubject}\n\n${draftContent}`;
    navigator.clipboard.writeText(fullDraft);
    toast({
      title: "Copied to clipboard",
      description: "Email draft has been copied to your clipboard.",
      duration: 3000
    });
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <PenTool className="mr-2 h-6 w-6 text-purple-600" />
            Context & Synthesis
          </CardTitle>
          <CardDescription>
            Get personalized context and insights before emailing important contacts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {!selectedContact ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-2">
                  <label htmlFor="contact-email" className="text-sm font-medium">
                    Search for a contact by email or name:
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="contact-email"
                      placeholder="e.g., alex@example.com or Alex Rodriguez"
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
                    <li>alex.rodriguez@acmecorp.com (Alex Rodriguez, Acme Corporation)</li>
                    <li>slee@innovatetech.com (Samantha Lee, InnovateTech)</li>
                  </ul>
                </div>
              </div>
            ) : (
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
                        <div className="flex items-center mt-1 text-sm">
                          <Building className="mr-1 h-4 w-4 text-gray-400" />
                          {selectedContact.organization}
                          {selectedContact.position && (
                            <span className="ml-1">({selectedContact.position})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedContact(null);
                      setContactEmail("");
                      setDraftSubject("");
                      setDraftContent("");
                    }}
                  >
                    New Search
                  </Button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="col-span-1">
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm flex items-center">
                        <Users className="mr-2 h-4 w-4 text-blue-500" />
                        Relationship Context
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-sm space-y-3">
                        <div>
                          <span className="font-medium">Last interaction: </span>
                          {selectedContact.lastInteraction ? (
                            new Date(selectedContact.lastInteraction).toLocaleDateString()
                          ) : (
                            "No recent interactions"
                          )}
                        </div>
                        
                        {selectedContact.connections && selectedContact.connections.length > 0 && (
                          <div>
                            <span className="font-medium">Connections: </span>
                            <ul className="mt-1 space-y-1">
                              {selectedContact.connections.map((connection, idx) => (
                                <li key={idx}>
                                  {connection.name} ({connection.relationship})
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="col-span-1">
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm flex items-center">
                        <FileText className="mr-2 h-4 w-4 text-green-500" />
                        Past Interactions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-sm">
                        {selectedContact.pastInteractions && selectedContact.pastInteractions.length > 0 ? (
                          <div className="space-y-3">
                            {selectedContact.pastInteractions.map((interaction, idx) => (
                              <div key={idx} className="border-b pb-2 last:border-b-0">
                                <div className="font-medium text-gray-700">{interaction.subject}</div>
                                <div className="text-gray-500 text-xs">
                                  {new Date(interaction.date).toLocaleDateString()}
                                </div>
                                <div className="mt-1 text-gray-600 text-xs line-clamp-2">
                                  {interaction.snippet}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-500">No past interactions recorded.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card className="col-span-1">
                    <CardHeader className="p-4">
                      <CardTitle className="text-sm flex items-center">
                        <Lightbulb className="mr-2 h-4 w-4 text-amber-500" />
                        Interests & Insights
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <div className="text-sm">
                        {selectedContact.interests && selectedContact.interests.length > 0 && (
                          <div className="mb-3">
                            <span className="font-medium">Key interests: </span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {selectedContact.interests.map((interest, idx) => (
                                <Badge key={idx} variant="secondary">
                                  {interest}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2">
                          <span className="font-medium">Connection insight: </span>
                          <p className="mt-1 text-gray-600">
                            {selectedContact.name} recently mentioned interest in {selectedContact.interests?.[0]}, 
                            which aligns with your Project Y work.
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between items-center mb-3">
                    <h3 className="text-lg font-medium">Draft Email</h3>
                    <div className="flex gap-2">
                      {!draftContent ? (
                        <Button
                          onClick={generateEmailDraft}
                          disabled={isGeneratingDraft}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          {isGeneratingDraft ? (
                            "Generating draft..."
                          ) : (
                            <>
                              <PenTool className="mr-2 h-4 w-4" />
                              Generate Personalized Draft
                            </>
                          )}
                        </Button>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            onClick={copyDraft}
                          >
                            <Copy className="mr-2 h-4 w-4" />
                            Copy Draft
                          </Button>
                          <Button
                            variant="outline"
                            onClick={() => {
                              window.open(`mailto:${selectedContact.email}?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftContent)}`, '_blank');
                            }}
                          >
                            <ArrowRight className="mr-2 h-4 w-4" />
                            Open in Email Client
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {isGeneratingDraft ? (
                    <div className="flex items-center justify-center p-10 border-2 border-dashed rounded-md">
                      <div className="text-center">
                        <div className="animate-pulse flex space-x-4 mb-4">
                          <div className="flex-1 space-y-4 py-1">
                            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                            <div className="space-y-2">
                              <div className="h-4 bg-gray-200 rounded"></div>
                              <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                        <p className="text-gray-500">Synthesizing contact history and generating personalized draft...</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-3">
                        <div>
                          <label htmlFor="subject" className="block text-sm font-medium mb-1">
                            Subject:
                          </label>
                          <Input
                            id="subject"
                            value={draftSubject}
                            onChange={(e) => setDraftSubject(e.target.value)}
                            placeholder="Enter email subject..."
                          />
                        </div>
                        
                        <div>
                          <label htmlFor="content" className="block text-sm font-medium mb-1">
                            Email Content:
                          </label>
                          <Textarea
                            id="content"
                            value={draftContent}
                            onChange={(e) => setDraftContent(e.target.value)}
                            placeholder={draftContent ? "" : "Generate a personalized draft using the button above..."}
                            className="min-h-[200px] font-mono"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}