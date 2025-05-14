import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Command, Send, CheckCircle, Clock, Archive, Search, AlertCircle, Inbox } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

interface CommandResult {
  id: string;
  command: string;
  status: "success" | "error" | "pending";
  result?: string;
  affectedEmails?: number;
  timestamp: Date;
}

export function GmailControl() {
  const [commandInput, setCommandInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [commandHistory, setCommandHistory] = useState<CommandResult[]>([]);
  const { toast } = useToast();

  // Example commands that could be recognized
  const sampleCommands = [
    "Archive all newsletters older than 7 days",
    "Find that presentation I sent to marketing last month about Q4 strategy",
    "Mark all emails from john@example.com as read",
    "Create a label called 'Project Phoenix' and apply it to emails mentioning phoenix",
    "Summarize unread emails from today"
  ];

  // Mock function to process natural language command
  const processCommand = async (command: string) => {
    setIsProcessing(true);
    
    // In a real implementation, this would call the OpenAI API to parse the command
    // and then execute Gmail API operations
    // For now, we'll simulate a response after a delay
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    let result: CommandResult = {
      id: `cmd-${Date.now()}`,
      command,
      status: "success",
      timestamp: new Date()
    };
    
    // Process based on command keywords
    if (command.toLowerCase().includes("archive") && command.toLowerCase().includes("newsletter")) {
      result.result = "Archived 15 newsletter emails";
      result.affectedEmails = 15;
    } 
    else if (command.toLowerCase().includes("find") && command.toLowerCase().includes("presentation")) {
      result.result = "Found 2 emails with presentations attached about Q4 strategy";
      result.affectedEmails = 2;
    }
    else if (command.toLowerCase().includes("mark") && command.toLowerCase().includes("read")) {
      const number = Math.floor(Math.random() * 10) + 1;
      result.result = `Marked ${number} emails as read`;
      result.affectedEmails = number;
    }
    else if (command.toLowerCase().includes("label") || command.toLowerCase().includes("tag")) {
      const number = Math.floor(Math.random() * 8) + 1;
      result.result = `Created/applied label to ${number} matching emails`;
      result.affectedEmails = number;
    }
    else if (command.toLowerCase().includes("summarize")) {
      result.result = "Generated summary of today's unread emails";
    }
    else {
      result.status = "error";
      result.result = "I'm not sure how to process that command. Please try a different phrasing or command.";
    }
    
    setCommandHistory([result, ...commandHistory]);
    setCommandInput("");
    setIsProcessing(false);
    
    toast({
      title: result.status === "success" ? "Command executed" : "Command failed",
      description: result.result,
      duration: 3000,
      variant: result.status === "success" ? "default" : "destructive"
    });
  };
  
  // Get icon for command based on text
  const getCommandIcon = (command: string) => {
    if (command.toLowerCase().includes("archive")) return <Archive className="h-4 w-4" />;
    if (command.toLowerCase().includes("find")) return <Search className="h-4 w-4" />;
    if (command.toLowerCase().includes("mark")) return <CheckCircle className="h-4 w-4" />;
    if (command.toLowerCase().includes("label") || command.toLowerCase().includes("tag")) return <Inbox className="h-4 w-4" />;
    if (command.toLowerCase().includes("summarize")) return <Command className="h-4 w-4" />;
    return <Command className="h-4 w-4" />;
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Command className="mr-2 h-6 w-6 text-purple-600" />
            Gmail Control
          </CardTitle>
          <CardDescription>
            Control your Gmail with natural language commands. Ask me to archive, find, organize, or summarize emails.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <Textarea
                placeholder="Type your command here. For example: 'Archive all newsletters older than 7 days' or 'Find that presentation I sent to marketing last month'"
                className="min-h-[100px] mb-4 resize-none p-4"
                value={commandInput}
                onChange={(e) => setCommandInput(e.target.value)}
              />
              
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  Try natural language commands to manage your emails
                </div>
                <Button 
                  onClick={() => processCommand(commandInput)}
                  disabled={isProcessing || !commandInput.trim()}
                  className="bg-purple-600 hover:bg-purple-700"
                >
                  {isProcessing ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Execute Command
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-medium mb-2">Example commands:</h3>
              <div className="flex flex-wrap gap-2">
                {sampleCommands.map((command, idx) => (
                  <Badge 
                    key={idx}
                    variant="outline"
                    className="cursor-pointer hover:bg-gray-100"
                    onClick={() => setCommandInput(command)}
                  >
                    {command}
                  </Badge>
                ))}
              </div>
            </div>
            
            {commandHistory.length > 0 && (
              <div>
                <h3 className="text-lg font-medium mb-2">Command History:</h3>
                <div className="space-y-2">
                  {commandHistory.map((item) => (
                    <div 
                      key={item.id} 
                      className={`border rounded-lg p-3 ${
                        item.status === "success" 
                          ? "bg-green-50 border-green-200" 
                          : item.status === "error"
                            ? "bg-red-50 border-red-200"
                            : "bg-blue-50 border-blue-200"
                      }`}
                    >
                      <div className="flex items-start">
                        <div className={`rounded-full p-1 mr-3 ${
                          item.status === "success" 
                            ? "bg-green-100 text-green-600" 
                            : item.status === "error"
                              ? "bg-red-100 text-red-600"
                              : "bg-blue-100 text-blue-600"
                        }`}>
                          {item.status === "success" ? (
                            <CheckCircle className="h-5 w-5" />
                          ) : item.status === "error" ? (
                            <AlertCircle className="h-5 w-5" />
                          ) : (
                            <Clock className="h-5 w-5" />
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <div className="font-medium flex items-center">
                              {getCommandIcon(item.command)}
                              <span className="ml-1">{item.command}</span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {item.timestamp.toLocaleTimeString()}
                            </div>
                          </div>
                          {item.result && (
                            <div className="mt-1 text-sm">
                              {item.result}
                            </div>
                          )}
                          {item.affectedEmails && (
                            <div className="mt-1">
                              <Badge variant="secondary">
                                {item.affectedEmails} {item.affectedEmails === 1 ? 'email' : 'emails'} affected
                              </Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}