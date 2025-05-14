import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PlusCircle, Check, Clock, BrainCircuit, ArrowRight, Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  content: string;
  type: "todo" | "reminder" | "note";
  dueDate?: string;
  completed?: boolean;
  entities?: string[];
}

export function BrainDump() {
  const [input, setInput] = useState("");
  const [processing, setProcessing] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);
  const { toast } = useToast();

  // Mock function to process brain dump using OpenAI
  const processBrainDump = async (text: string) => {
    setProcessing(true);
    
    // In a real implementation, this would call the OpenAI API
    // For now, we'll simulate a response after a delay
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Parse the input text and create tasks (simulated AI response)
    const newTasks: Task[] = [
      {
        id: "task-" + Date.now(),
        content: "Prep for Project Phoenix review",
        type: "todo",
        dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
        entities: ["Project Phoenix", "review"],
        completed: false
      }
    ];
    
    // If the input mentions finance or Q3, add a related task
    if (text.toLowerCase().includes("finance") || text.toLowerCase().includes("q3")) {
      newTasks.push({
        id: "task-" + (Date.now() + 1),
        content: "Ask finance team about Q3 numbers",
        type: "todo",
        dueDate: new Date(Date.now() + 172800000).toISOString().split('T')[0], // Day after tomorrow
        entities: ["finance", "Q3", "numbers"],
        completed: false
      });
    }
    
    // If the input mentions groceries, milk, or shopping, add a reminder
    if (text.toLowerCase().includes("milk") || 
        text.toLowerCase().includes("groceries") || 
        text.toLowerCase().includes("shopping")) {
      newTasks.push({
        id: "task-" + (Date.now() + 2),
        content: "Pick up milk",
        type: "reminder",
        entities: ["shopping", "groceries"],
        completed: false
      });
    }
    
    setTasks([...tasks, ...newTasks]);
    setInput("");
    setProcessing(false);
    
    toast({
      title: "Brain dump processed!",
      description: `Created ${newTasks.length} new tasks from your input.`,
      duration: 3000
    });
  };

  const handleTaskCompletion = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, completed: !task.completed } 
        : task
    ));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // In a real implementation, this would upload the file and process it
      // For now, just show a toast notification
      toast({
        title: "File uploaded",
        description: `Processing "${file.name}"...`,
        duration: 3000
      });
      
      // Simulate processing
      setTimeout(() => {
        const fileContent = file.name.includes("Phoenix") 
          ? "Project Phoenix review scheduled for next week"
          : "Document contains information about quarterly reports";
          
        setInput(input ? `${input}\n\nExtracted from ${file.name}: ${fileContent}` : `Extracted from ${file.name}: ${fileContent}`);
      }, 1000);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center">
            <BrainCircuit className="mr-2 h-6 w-6 text-purple-600" />
            Brain Dump & Tasks
          </CardTitle>
          <CardDescription>
            Share your thoughts, voice notes, or documents. I'll organize them into actionable tasks and reminders.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <Textarea
                placeholder="Type or paste your thoughts here. For example: 'Remember to prep for the Project Phoenix review, ask finance about Q3 numbers, and pick up milk.'"
                className="min-h-[150px] mb-4 resize-none p-4"
                value={input}
                onChange={(e) => setInput(e.target.value)}
              />
              
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    const fileInput = document.getElementById('file-upload');
                    if (fileInput) fileInput.click();
                  }}
                  className="flex items-center"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File (PDF, Doc, Image)
                </Button>
                <input 
                  id="file-upload" 
                  type="file" 
                  className="hidden" 
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                />
                
                <Button
                  variant="outline"
                  onClick={() => {
                    toast({
                      title: "Voice recording",
                      description: "Voice recording feature is coming soon!",
                      duration: 3000
                    });
                  }}
                  className="flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2 h-4 w-4">
                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" x2="12" y1="19" y2="22" />
                  </svg>
                  Record Voice Note
                </Button>
              </div>
              
              <Button 
                onClick={() => processBrainDump(input)}
                disabled={processing || !input.trim()}
                className="w-full md:w-auto"
              >
                {processing ? (
                  <>Processing...</>
                ) : (
                  <>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Process Brain Dump
                  </>
                )}
              </Button>
            </div>
            
            {tasks.length > 0 && (
              <div className="space-y-4 mt-8">
                <h3 className="text-lg font-semibold">Generated Tasks & Reminders</h3>
                <div className="divide-y">
                  {tasks.map(task => (
                    <div 
                      key={task.id} 
                      className={`py-3 px-4 flex items-start gap-3 rounded-md ${
                        task.completed ? 'bg-gray-50 text-gray-500' : 'bg-white'
                      }`}
                    >
                      <Button
                        variant="ghost"
                        size="icon"
                        className={`rounded-full h-6 w-6 ${
                          task.completed ? 'bg-green-100 text-green-600' : 'bg-gray-100'
                        }`}
                        onClick={() => handleTaskCompletion(task.id)}
                      >
                        {task.completed ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          task.type === 'reminder' ? (
                            <Clock className="h-4 w-4" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )
                        )}
                      </Button>
                      
                      <div className="flex-1">
                        <p className={task.completed ? 'line-through' : ''}>
                          {task.content}
                        </p>
                        
                        {task.dueDate && (
                          <p className="text-sm text-gray-500 mt-1">
                            Due: {new Date(task.dueDate).toLocaleDateString()}
                          </p>
                        )}
                        
                        {task.entities && task.entities.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-2">
                            {task.entities.map(entity => (
                              <span
                                key={entity}
                                className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800"
                              >
                                {entity}
                              </span>
                            ))}
                          </div>
                        )}
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