import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { MessageSquare, CornerDownRight, AlarmClock, Edit, Copy, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface EmailThread {
  id: string;
  subject: string;
  participants: {
    name: string;
    email: string;
    avatar?: string;
  }[];
  messages: {
    id: string;
    from: {
      name: string;
      email: string;
      avatar?: string;
    };
    content: string;
    timestamp: string;
  }[];
}

export function SmartReply() {
  const [selectedEmail, setSelectedEmail] = useState<EmailThread | null>(null);
  const [draftReply, setDraftReply] = useState("");
  const [replyState, setReplyState] = useState<"idle" | "generating" | "editing" | "sent">("idle");
  const [remindLater, setRemindLater] = useState(false);
  const { toast } = useToast();

  // Mock email data
  const mockEmails: EmailThread[] = [
    {
      id: "email-1",
      subject: "Project Phoenix Update - Action Required",
      participants: [
        { name: "Josh Smith", email: "josh@example.com", avatar: "https://ui-avatars.com/api/?name=JS" },
        { name: "Maria Johnson", email: "maria@example.com", avatar: "https://ui-avatars.com/api/?name=MJ" },
        { name: "David Chen", email: "david@example.com", avatar: "https://ui-avatars.com/api/?name=DC" },
        { name: "Sarah Williams", email: "sarah@example.com", avatar: "https://ui-avatars.com/api/?name=SW" }
      ],
      messages: [
        {
          id: "msg-1",
          from: { name: "Maria Johnson", email: "maria@example.com", avatar: "https://ui-avatars.com/api/?name=MJ" },
          content: "Hi team,\n\nI just wanted to check in about the Project Phoenix deliverables. We're approaching the deadline next Friday, and we need to ensure we're on track.\n\nCould each of you provide a brief status update on your assigned tasks? Josh, we're particularly waiting on the market analysis section before we can finalize the report.\n\nAdditionally, the client has requested a short meeting next Tuesday at 2 PM. Please confirm your availability.\n\nThanks,\nMaria",
          timestamp: "2023-06-05T14:32:00Z"
        },
        {
          id: "msg-2",
          from: { name: "Sarah Williams", email: "sarah@example.com", avatar: "https://ui-avatars.com/api/?name=SW" },
          content: "Hi Maria,\n\nMy section is complete and I've uploaded the files to the shared drive. Happy to discuss any questions during the meeting.\n\nTuesday at 2 PM works for me.\n\nBest,\nSarah",
          timestamp: "2023-06-05T15:10:00Z"
        },
        {
          id: "msg-3",
          from: { name: "David Chen", email: "david@example.com", avatar: "https://ui-avatars.com/api/?name=DC" },
          content: "I've completed about 80% of my section. Should be done by tomorrow afternoon. Tuesday works for me as well.\n\n- David",
          timestamp: "2023-06-05T15:45:00Z"
        }
      ]
    },
    {
      id: "email-2",
      subject: "Client Presentation for Acme Corp - Feedback Needed",
      participants: [
        { name: "Josh Smith", email: "josh@example.com", avatar: "https://ui-avatars.com/api/?name=JS" },
        { name: "Alex Brown", email: "alex@example.com", avatar: "https://ui-avatars.com/api/?name=AB" }
      ],
      messages: [
        {
          id: "msg-1",
          from: { name: "Alex Brown", email: "alex@example.com", avatar: "https://ui-avatars.com/api/?name=AB" },
          content: "Josh,\n\nI've attached the draft presentation for Acme Corp. Could you review it by tomorrow and provide your feedback? I'm particularly concerned about slides 15-20, which cover the technical implementation details.\n\nThe client meeting is scheduled for Thursday, so we need to finalize this ASAP.\n\nThanks,\nAlex",
          timestamp: "2023-06-06T09:15:00Z"
        }
      ]
    }
  ];

  // Mock function to generate a smart reply using OpenAI
  const generateSmartReply = async (emailThread: EmailThread) => {
    setReplyState("generating");
    
    // In a real implementation, this would call the OpenAI API
    // For now, we'll simulate a response after a delay
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Generate a response based on the email thread
    let generatedReply = "";
    
    if (emailThread.subject.includes("Phoenix")) {
      generatedReply = `Hi Maria,

I apologize for the delay. I'm currently finalizing the market analysis section and will have it completed by end of day tomorrow. I've incorporated the latest data we discussed last week, which should strengthen our recommendations.

Tuesday at 2 PM works for my schedule. Looking forward to connecting with the client.

Best regards,
Josh`;
    } else if (emailThread.subject.includes("Acme")) {
      generatedReply = `Hi Alex,

Thanks for sharing the presentation draft. I'll review it thoroughly with special attention to slides 15-20 and will get you my feedback by tomorrow afternoon.

Quick question - do you want me to focus more on the technical accuracy or the presentation style for those slides?

Best,
Josh`;
    }
    
    setDraftReply(generatedReply);
    setReplyState("editing");
  };

  // Copy draft to clipboard
  const copyDraft = () => {
    navigator.clipboard.writeText(draftReply);
    toast({
      title: "Copied to clipboard",
      description: "Reply draft has been copied to your clipboard.",
      duration: 3000
    });
  };

  // Send the email (mock function)
  const sendReply = () => {
    setReplyState("sent");
    toast({
      title: "Reply sent!",
      description: "Your email has been sent successfully.",
      duration: 3000
    });
    
    // Reset the form after a delay
    setTimeout(() => {
      setSelectedEmail(null);
      setDraftReply("");
      setReplyState("idle");
      setRemindLater(false);
    }, 2000);
  };

  // Toggle remind later option
  const toggleReminder = () => {
    setRemindLater(!remindLater);
    if (!remindLater) {
      toast({
        title: "Reminder set",
        description: "I'll remind you about this email by EOD if you haven't replied.",
        duration: 3000
      });
    } else {
      toast({
        title: "Reminder cancelled",
        description: "Follow-up reminder has been cancelled.",
        duration: 3000
      });
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <MessageSquare className="mr-2 h-6 w-6 text-purple-600" />
            Smart Reply
          </CardTitle>
          <CardDescription>
            Forward complex emails for AI-powered summaries and personalized draft replies.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!selectedEmail ? (
            <div className="space-y-6">
              <h3 className="text-lg font-medium">Select an email to draft a reply</h3>
              <div className="space-y-4">
                {mockEmails.map(email => (
                  <div 
                    key={email.id}
                    className="border rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => setSelectedEmail(email)}
                  >
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium">{email.subject}</h4>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                        {email.messages.length} {email.messages.length === 1 ? 'message' : 'messages'}
                      </Badge>
                    </div>
                    <div className="mt-2 text-sm text-gray-600">
                      From: {email.messages[0].from.name} ({email.messages[0].from.email})
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      Participants: {email.participants.length}
                    </div>
                    <div className="mt-2 flex -space-x-2 overflow-hidden">
                      {email.participants.map((participant, idx) => (
                        <Avatar key={idx} className="border-2 border-white w-8 h-8">
                          <AvatarImage src={participant.avatar} alt={participant.name} />
                          <AvatarFallback>{participant.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                        </Avatar>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">
                  {selectedEmail.subject}
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedEmail(null);
                    setDraftReply("");
                    setReplyState("idle");
                  }}
                >
                  Back to emails
                </Button>
              </div>
              
              <div className="border rounded-lg p-4 space-y-4 max-h-[400px] overflow-y-auto">
                {selectedEmail.messages.map(message => (
                  <div key={message.id} className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={message.from.avatar} alt={message.from.name} />
                        <AvatarFallback>{message.from.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{message.from.name}</div>
                        <div className="text-sm text-gray-500">
                          {new Date(message.timestamp).toLocaleString()}
                        </div>
                      </div>
                    </div>
                    <div className="pl-10 whitespace-pre-wrap">{message.content}</div>
                  </div>
                ))}
              </div>
              
              <div className="border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-medium">Your Reply</h4>
                  <div className="flex gap-2">
                    {replyState === "idle" && (
                      <Button
                        onClick={() => generateSmartReply(selectedEmail)}
                        variant="default"
                        className="bg-purple-600 hover:bg-purple-700"
                      >
                        <MessageSquare className="mr-2 h-4 w-4" />
                        Generate Smart Reply
                      </Button>
                    )}
                    {replyState === "generating" && (
                      <Button disabled>
                        Generating reply...
                      </Button>
                    )}
                    {replyState === "editing" && (
                      <>
                        <Button 
                          variant="outline"
                          onClick={copyDraft}
                        >
                          <Copy className="mr-2 h-4 w-4" />
                          Copy
                        </Button>
                        <Button
                          variant="outline"
                          onClick={toggleReminder}
                          className={remindLater ? 'bg-blue-50 text-blue-600' : ''}
                        >
                          <AlarmClock className="mr-2 h-4 w-4" />
                          Remind Later
                        </Button>
                        <Button
                          onClick={sendReply}
                        >
                          <Send className="mr-2 h-4 w-4" />
                          Send
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                
                {replyState === "generating" && (
                  <div className="flex items-center justify-center p-10 border-2 border-dashed rounded-md">
                    <div className="text-center">
                      <div className="animate-pulse flex space-x-4 mb-4">
                        <div className="rounded-full bg-gray-200 h-10 w-10"></div>
                        <div className="flex-1 space-y-4 py-1">
                          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-gray-200 rounded"></div>
                            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                          </div>
                        </div>
                      </div>
                      <p className="text-gray-500">Analyzing email context and crafting a personalized response...</p>
                    </div>
                  </div>
                )}
                
                {(replyState === "editing" || replyState === "sent") && (
                  <Textarea
                    value={draftReply}
                    onChange={(e) => setDraftReply(e.target.value)}
                    className="min-h-[200px] p-4"
                    placeholder="Type your reply here..."
                    disabled={replyState === "sent"}
                  />
                )}
                
                {replyState === "sent" && (
                  <div className="mt-2 text-green-600 flex items-center">
                    <Check className="mr-1 h-4 w-4" />
                    Reply sent successfully!
                  </div>
                )}
                
                {remindLater && replyState === "editing" && (
                  <div className="mt-2 text-blue-600 flex items-center">
                    <AlarmClock className="mr-1 h-4 w-4" />
                    I'll remind you to follow up by EOD if no reply is sent.
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}