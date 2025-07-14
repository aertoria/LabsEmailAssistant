import dotenv from "dotenv";
dotenv.config();
import OpenAI from "openai";
import { Request, Response } from "express";
import { IStorage } from "./storage";

// Type definitions for OpenAI response
interface OpenAIChoice {
  message: {
    content: string | null;
  };
}

interface OpenAIResponse {
  choices: OpenAIChoice[];
}

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to get emails from the last 24 hours and generate individual summaries
async function summarizeRecentEmails(emails: any[]) {
  try {
    // Filter to emails from the last 24 hours and limit to most recent 25
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const recentEmails = emails
      .filter(email => {
        const receivedDate = new Date(email.receivedAt);
        return receivedDate >= twentyFourHoursAgo;
      })
      .slice(0, 25); // Limit to most recent 25 emails
    
    if (recentEmails.length === 0) {
      return {
        importantHighlights: [] // Return empty array if no recent emails
      };
    }
    
    // Request individual summaries from OpenAI in parallel
    const summaryPromises = recentEmails.map(async (email) => {
      const prompt = `Email Details:
From: ${email.from}
Subject: ${email.subject}
Snippet: ${email.snippet}

Task: In one sentence tell me why this email is urgent and important, and give me a general suggestion on how to reply.`;

      try {
        const startTime = Date.now();
        console.log(`[OpenAI] Starting API call for email: ${email.subject}`);
        
        const apiResponse = await Promise.race([
          openai.chat.completions.create({
            model: "gpt-4.1",            // default to GPT-4.1
            messages: [{ role: "user", content: prompt }],
            max_tokens: 100, // Adjust as needed for a concise sentence
            temperature: 0.6 // Adjust for creativity vs. consistency
          }),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error(`OpenAI request for ${email.subject} timed out after 10s`)), 10000)
          )
        ]) as OpenAIResponse;
        
        const duration = Date.now() - startTime;
        console.log(`[OpenAI] API call for ${email.subject} completed successfully in ${duration} ms`);

        if (!apiResponse.choices || !apiResponse.choices[0] || !apiResponse.choices[0].message) {
          console.error(`[OpenAI] Invalid response format for email: ${email.subject}`);
          return {
            title: email.subject,
            sender: email.from,
            aiSummary: "Error: Could not generate summary due to invalid API response."
          };
        }
        
        const aiSummary = apiResponse.choices[0].message.content || "AI summary generation failed.";
        
        return {
          title: email.subject,
          sender: email.from,
          aiSummary: aiSummary.trim()
        };

      } catch (error: any) {
        console.error(`[OpenAI] API call failed for email: ${email.subject}`, {
          error: error.message,
          stack: error.stack,
          type: error.constructor.name,
          promptLength: prompt.length
        });
        // Return an error object for this specific email
        return {
          title: email.subject,
          sender: email.from,
          aiSummary: `Error generating summary: ${error.message}`
        };
      }
    });

    // Wait for all promises to resolve
    const importantHighlights = await Promise.all(summaryPromises);

    // Return the structured highlights
    return {
      importantHighlights
    };

  } catch (error) {
    console.error('Error generating email highlights with OpenAI:', error);
    // Ensure the function still returns the expected structure even in case of outer errors
    return {
      importantHighlights: [] // Return empty array on major failure
    };
  }
}

// Function to find the single most important email using a two-step AI process
async function findImportantEmail(emails: any[]) {
  console.log("[findImportantEmail] Function entered."); // <-- Added log here
  try {
    // Filter to emails from the last 24 hours and limit
    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);
    
    const recentEmails = emails
      .filter(email => {
        const receivedDate = new Date(email.receivedAt);
        return receivedDate >= twentyFourHoursAgo;
      })
      .slice(0, 25); // Limit to ensure prompt doesn't get too large

    if (recentEmails.length === 0) {
      console.log("[OpenAI ImportantEmail] No emails in the last 24 hours.");
      return { topPriorityEmail: null };
    }

    // --- Step 1: Identify the most important email --- 
    const emailDataForIdentification = recentEmails.map((email, index) => {
      // Include index to potentially help AI disambiguate if needed, though asking for Subject/Sender is primary
      return `Index: ${index}\nFrom: ${email.from}\nSubject: ${email.subject}\nSnippet: ${email.snippet}`;
    }).join('\n---\n');
    
    const identificationPrompt = `Analyze the following emails received in the last 24 hours. Identify the single *most* urgent, important, and impactful email among them. Consider factors like sender, keywords (urgent, important, deadline, action required), and context. 

Respond *only* with the exact Subject and Sender (From) of that single most important email, formatted precisely like this:
Subject: [The Exact Subject Line]
From: [The Exact Sender Address or Name]

Emails:
${emailDataForIdentification}`;

    console.log("[OpenAI ImportantEmail] Identification prompt:\n", identificationPrompt);
    console.log("[OpenAI ImportantEmail] Sending identification prompt...");
    let identifiedSubject = '';
    let identifiedSender = '';

    try {
      const identificationResponse = await openai.chat.completions.create({
        model: "gpt-4.1",            // default to GPT-4.1
        messages: [{ role: "user", content: identificationPrompt }],
        max_tokens: 150, // Enough for Subject/From lines
        temperature: 0.2, // Low temperature for factual identification
      });

      const resultText = identificationResponse.choices[0]?.message?.content?.trim();
      if (!resultText) {
        throw new Error("AI did not provide an identification response.");
      }

      console.log("[OpenAI ImportantEmail] Identification response received:", resultText);

      // Parse the response
      const subjectMatch = resultText.match(/^Subject: (.*)$/m);
      const fromMatch = resultText.match(/^From: (.*)$/m);

      if (!subjectMatch || !fromMatch || !subjectMatch[1] || !fromMatch[1]) {
         console.error("[OpenAI ImportantEmail] Failed to parse Subject/From from identification response:", resultText);
         throw new Error("AI response for identification was not in the expected format (Subject: ...\nFrom: ...).");
      }
      
      identifiedSubject = subjectMatch[1].trim();
      identifiedSender = fromMatch[1].trim();
      console.log(`[OpenAI ImportantEmail] Identified Email - Subject: '${identifiedSubject}', Sender: '${identifiedSender}'`);

    } catch (error: any) {
      console.error("[OpenAI ImportantEmail] Step 1 (Identification) failed:", error);
      // Decide how to handle: maybe return null, or try a fallback?
      // For now, we'll stop and return null if identification fails.
      return { topPriorityEmail: null }; 
    }

    // --- Find the actual email object --- 
    const targetEmail = recentEmails.find(email => 
        email.subject.trim() === identifiedSubject && 
        email.from.trim() === identifiedSender
    );

    if (!targetEmail) {
      console.error(`[OpenAI ImportantEmail] Could not find the identified email in the list. Subject: '${identifiedSubject}', Sender: '${identifiedSender}'`);
      // This could happen if the AI hallucinated or formatting differed slightly.
      // Maybe add fuzzy matching or log more details? For now, return null.
      return { topPriorityEmail: null };
    }

    console.log(`[OpenAI ImportantEmail] Found target email object for Subject: ${targetEmail.subject}`);

    // --- Step 2: Explain importance and suggest reply --- 
    const explanationPrompt = `Email Details:
From: ${targetEmail.from}
Subject: ${targetEmail.subject}
Snippet: ${targetEmail.snippet}

Task: Now explain why this specific email is urgent and important in one concise sentence, and then come up with a simple, actionable strategy on how to reply in one sentence. Structure the response clearly, perhaps like:
Importance: [Explanation sentence].
Suggestion: [Reply strategy sentence].`;

    console.log("[OpenAI ImportantEmail] Explanation prompt:\n", explanationPrompt);
    console.log("[OpenAI ImportantEmail] Sending explanation prompt for the identified email...");
    try {
      const explanationResponse = await openai.chat.completions.create({
        model: "gpt-4.1",            // default to GPT-4.1
        messages: [{ role: "user", content: explanationPrompt }],
        max_tokens: 150, // Should be plenty for two sentences
        temperature: 0.5,
      });

      const explanationText = explanationResponse.choices[0]?.message?.content?.trim();
      if (!explanationText) {
        throw new Error("AI did not provide an explanation response.");
      }

      console.log("[OpenAI ImportantEmail] Explanation response received:", explanationText);

      // Build and return the final result with extra logging
      const finalResult = {
        topPriorityEmail: {
          title: targetEmail.subject,
          sender: targetEmail.from,
          snippet: targetEmail.snippet, // Include snippet for context
          aiAnalysis: explanationText // The result from the second AI call
        }
      };
      console.log("[OpenAI ImportantEmail] Final result:", JSON.stringify(finalResult, null, 2));
      return finalResult;

    } catch (error: any) {
      console.error("[OpenAI ImportantEmail] Step 2 (Explanation) failed:", error);
      // If step 2 fails, maybe return the email details but note the analysis failed?
      const fallbackResult = {
        topPriorityEmail: {
          title: targetEmail.subject,
          sender: targetEmail.from,
          snippet: targetEmail.snippet,
          aiAnalysis: "Error: Failed to generate AI analysis for this email."
        }
      };
      console.log("[OpenAI ImportantEmail] Fallback result due to error:", JSON.stringify(fallbackResult, null, 2));
      return fallbackResult;
    }

  } catch (error) {
    console.error('[OpenAI ImportantEmail] Error in findImportantEmail function:', error);
    return { topPriorityEmail: null }; // Return null on major failure
  }
}

// Helper function to extract sender name from email
function extractSenderName(from: string): string {
  // Try to extract name from format "Name <email@example.com>"
  const nameMatch = from.match(/^"?([^"<]+)"?\s*<.+>/);
  if (nameMatch && nameMatch[1]) {
    return nameMatch[1].trim();
  }
  
  // Try to extract domain from just an email address
  const emailMatch = from.match(/@([^>]+)/);
  if (emailMatch && emailMatch[1]) {
    const domain = emailMatch[1].replace(/>$/, '');
    return domain.split('.')[0]; // Return the domain name part
  }
  
  // Fallback to whatever we have
  return from.split('@')[0].replace(/[<>]/g, '').trim() || 'Unknown';
}

// Helper function to cluster emails into projects
async function clusterEmailsIntoProjects(emails: any[]) {
  if (!emails || emails.length === 0) {
    return [];
  }

  const prompt = `Analyze the following emails and organize them into project clusters. A project is a collection of related emails that discuss the same topic, initiative, or work stream.

For each project cluster, provide:
1. A descriptive title
2. A summary of what the project is about
3. The overall progress (0-100%)
4. Status: 'active' (recent activity), 'stalled' (no recent activity), or 'completed'
5. Priority: 'high', 'medium', or 'low' based on urgency and importance
6. Key participants (extract names from email addresses)
7. Milestones/key events in the project timeline

Return as JSON array with this structure:
{
  "clusters": [
    {
      "id": "unique-id",
      "title": "Project Title",
      "summary": "Brief project description",
      "progress": 50,
      "status": "active",
      "priority": "high",
      "keyParticipants": ["Name 1", "Name 2"],
      "emailIds": ["email-id-1", "email-id-2"],
      "milestones": [
        {
          "date": "2024-01-15",
          "description": "Project kickoff",
          "type": "start"
        }
      ]
    }
  ]
}

Emails to analyze:
${emails.slice(0, 50).map(email => `
ID: ${email.id}
From: ${email.from}
Subject: ${email.subject}
Date: ${email.receivedAt}
Snippet: ${email.snippet}
`).join('\n---\n')}`;

  try {
    
    const response = await openai.chat.completions.create({
      model: "gpt-4.1",            // default to GPT-4.1
      messages: [
        {
          role: "system",
          content: "You are an expert at analyzing email threads and organizing them into coherent project clusters. Focus on identifying related discussions, work streams, and initiatives."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      response_format: { type: "json_object" },
      temperature: 0.7,
      max_tokens: 2000
    });

    const result = JSON.parse(response.choices[0].message.content || '{"clusters": []}');
    
    // Enrich clusters with email data
    const enrichedClusters = result.clusters.map((cluster: any) => {
      const clusterEmails = emails.filter(email => 
        cluster.emailIds.includes(email.id)
      );
      
      return {
        ...cluster,
        emailCount: clusterEmails.length,
        participantCount: cluster.keyParticipants.length,
        emails: clusterEmails.map(email => ({
          id: email.id,
          subject: email.subject,
          from: extractSenderName(email.from),
          date: email.receivedAt,
          snippet: email.snippet
        })),
        firstActivity: clusterEmails[clusterEmails.length - 1]?.receivedAt || new Date().toISOString(),
        lastActivity: clusterEmails[0]?.receivedAt || new Date().toISOString()
      };
    });

    return enrichedClusters;
  } catch (error) {
    console.error('Error clustering emails:', error);
    throw error;
  }
}

export function setupOpenAI(app: any, storage: IStorage) {
  // Endpoint to get a daily digest/summary of emails
  app.get("/api/ai/daily-digest", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log("[API DailyDigest] Generating daily digest for user", req.user.email);
      
      // Fetch emails 
      const page = 1; 
      const pageSize = 50; 
      
      const gmailData = await storage.getMockEmails(page, pageSize);
      const emails = gmailData.messages || [];
      
      // Get AI analysis: Call both functions in parallel
      console.log("[API DailyDigest] Preparing to call Promise.all for AI functions...");
      console.log("[API DailyDigest] Calling AI functions...");
      
      const [highlightsResult, topPriorityResult] = await Promise.all([
        summarizeRecentEmails(emails), // Gets the list of highlights
        findImportantEmail(emails)      // Gets the single most important email
      ]);

      console.log("[API DailyDigest] AI processing complete.");
      // Log the results received from the functions
      console.log("[API DailyDigest] highlightsResult structure:", highlightsResult ? Object.keys(highlightsResult) : 'null');
      console.log("[API DailyDigest] topPriorityResult structure:", JSON.stringify(topPriorityResult, null, 2)); // <-- Added log here
      
      // Combine the results
      const combinedDigest = {
        importantHighlights: highlightsResult.importantHighlights || [],
        topPriorityEmail: topPriorityResult.topPriorityEmail || null
      };
      
      return res.status(200).json(combinedDigest);

    } catch (error: any) {
      console.error("[API DailyDigest] Error generating daily digest:", error);
      res.status(500).json({
        message: "Failed to generate daily digest",
        error: error.message || String(error)
      });
    }
  });

  // Endpoint to get project clusters from emails
  app.post("/api/ai/project-clusters", async (req: Request, res: Response) => {
    try {
      const { emails } = req.body;
      
      if (!emails || !Array.isArray(emails)) {
        return res.status(400).json({
          message: "Invalid request: emails array is required"
        });
      }

      const clusters = await clusterEmailsIntoProjects(emails);
      
      return res.status(200).json(clusters);
    } catch (error: any) {
      console.error("[API ProjectClusters] Error clustering emails:", error);
      res.status(500).json({
        message: "Failed to cluster emails into projects",
        error: error.message || String(error)
      });
    }
  });

  // Extract topic keywords from emails for evolution visualization
  app.post("/api/ai/extract-topics", async (req: Request, res: Response) => {
    try {
      const { emails } = req.body;
      
      if (!emails || !Array.isArray(emails)) {
        return res.status(400).json({ error: 'Emails array is required' });
      }

      console.log('[API ExtractTopics] Processing', emails.length, 'emails');

      const topicPromises = emails.map(async (email) => {
        try {
          const prompt = `Extract 3-5 key topic keywords from this email. These topics should be related to subject of the email.Return only the keywords, separated by commas.
          
Email Subject: ${email.subject}
Email Content: ${email.snippet}

Keywords:`;

          const response = await openai.chat.completions.create({
            model: "gpt-4.1",            // hard-coded to GPT-4.1
            messages: [{ role: "user", content: prompt }],
            max_tokens: 50,
            temperature: 0.3,
          });

          const keywords = response.choices[0].message.content?.split(',').map(k => k.trim()).filter(k => k) || [];
          
          return {
            emailId: email.id,
            date: email.date,
            keywords: keywords
          };
        } catch (error: any) {
          console.error('[API ExtractTopics] Error processing email:', error.message);
          return {
            emailId: email.id,
            date: email.date,
            keywords: []
          };
        }
      });

      const topicData = await Promise.all(topicPromises);

      // Debug log: map of keyword -> timestamps array
      const keywordTimestampPairs: Record<string, string[]> = {};
      topicData.forEach(({ keywords, date }) => {
        keywords.forEach((kw: string) => {
          (keywordTimestampPairs[kw] ||= []).push(date);
        });
      });
      console.log('[API ExtractTopics] keywordTimestampPairs:\n', JSON.stringify(keywordTimestampPairs, null, 2));
      
      // Aggregate topics by date and frequency
      const topicEvolution = processTopicEvolution(topicData);
      
      res.json({ topicData, topicEvolution });
    } catch (error: any) {
      console.error('[API ExtractTopics] Error:', error);
      res.status(500).json({ 
        error: 'Failed to extract topics',
        details: error.message 
      });
    }
  });
}

// Helper function to process topic evolution data
function processTopicEvolution(topicData: any[]) {
  const evolutionMap = new Map<string, any[]>();
  
  // Group by date and aggregate keywords
  topicData.forEach(item => {
    const date = new Date(item.date).toISOString().split('T')[0]; // Group by day
    
    item.keywords.forEach((keyword: string) => {
      if (!evolutionMap.has(keyword)) {
        evolutionMap.set(keyword, []);
      }
      
      const existing = evolutionMap.get(keyword)!.find(e => e.date === date);
      if (existing) {
        existing.frequency += 1;
      } else {
        evolutionMap.get(keyword)!.push({
          date,
          frequency: 1,
          keyword
        });
      }
    });
  });
  
  // Convert to array format for visualization
  const evolution = Array.from(evolutionMap.entries()).map(([keyword, data]) => ({
    keyword,
    data: data.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }));
  
  return evolution;
}
