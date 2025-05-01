import OpenAI from "openai";
import { Request, Response } from "express";
import { IStorage } from "./storage";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Function to get emails from the last 24 hours and summarize them
async function summarizeRecentEmails(emails: any[]) {
  try {
    // Filter to emails from the last 24 hours
    const oneDayAgo = new Date();
    oneDayAgo.setHours(oneDayAgo.getHours() - 24);
    
    const recentEmails = emails.filter(email => {
      const receivedDate = new Date(email.receivedAt);
      return receivedDate >= oneDayAgo;
    });
    
    if (recentEmails.length === 0) {
      return {
        summary: "No emails received in the last 24 hours.",
        totalEmails: 0,
        categories: {}
      };
    }
    
    // Create a prompt with email data
    const emailData = recentEmails.map(email => {
      return `From: ${email.from}\nSubject: ${email.subject}\nSnippet: ${email.snippet}\n`;
    }).join('\n---\n');
    
    // Request a summary from OpenAI
    const prompt = `Below are emails received in the last 24 hours. Please analyze them and provide:
    1. A concise summary of these emails in a few sentences
    2. Key topics or categories these emails belong to with counts
    3. Important action items or deadlines mentioned
    4. Highlight any differences from previous batches (more formal emails, urgent requests, etc.)

    Emails:\n${emailData}`;
    
    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [{ role: "user", content: prompt }],
      max_tokens: 800,
      temperature: 0.7
    });
    
    // Parse the response
    const aiResponse = response.choices[0].message.content;
    
    // Create counts for top senders
    const senderCounts: Record<string, number> = {};
    recentEmails.forEach(email => {
      const senderName = extractSenderName(email.from);
      senderCounts[senderName] = (senderCounts[senderName] || 0) + 1;
    });
    
    const topSenders = Object.entries(senderCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 3);
    
    // Extract sentiment data (using a simple keyword approach as fallback)
    let positive = 0, neutral = 0, negative = 0;
    recentEmails.forEach(email => {
      const text = email.subject + " " + email.snippet;
      if (/thank|appreciate|happy|great|good|excellent|awesome/i.test(text)) {
        positive++;
      } else if (/sorry|issue|problem|concern|bad|error|fail/i.test(text)) {
        negative++;
      } else {
        neutral++;
      }
    });
    
    const total = recentEmails.length;
    const sentimentOverview = {
      positive: Math.round((positive / total) * 100),
      neutral: Math.round((neutral / total) * 100),
      negative: Math.round((negative / total) * 100)
    };
    
    // Simple categorization (can be improved with AI categorization)
    const categorySummary: Record<string, number> = {
      'Work': 0,
      'Updates': 0,
      'Personal': 0,
      'Promotions': 0
    };
    
    recentEmails.forEach(email => {
      if (/github|jira|confluence|slack|trello|asana|meeting|project|task|deadline/i.test(email.subject)) {
        categorySummary['Work']++;
      } else if (/update|newsletter|announcement|notification/i.test(email.subject)) {
        categorySummary['Updates']++;
      } else if (/facebook|twitter|instagram|friend|family|personal/i.test(email.subject)) {
        categorySummary['Personal']++;
      } else {
        categorySummary['Promotions']++;
      }
    });
    
    // Return structured data
    return {
      summary: aiResponse,
      totalEmails: recentEmails.length,
      importantEmails: Math.round(recentEmails.length * 0.3), // Approximation until we have better importance detection
      categorySummary,
      topSenders,
      sentimentOverview
    };
  } catch (error) {
    console.error('Error generating email summary with OpenAI:', error);
    throw error;
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

export function setupOpenAI(app: any, storage: IStorage) {
  // Endpoint to get a daily digest/summary of emails
  app.get("/api/ai/daily-digest", async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Unauthorized" });
      }
      
      console.log("[OpenAI] Generating daily digest for user", req.user.email);
      
      // Fetch emails (similar to what we do in the /api/gmail/messages endpoint)
      const page = 1; // Just get the first page of emails
      const pageSize = 100; // Increase the size to analyze more emails
      
      // This is a temporary approach until we create a function to fetch emails from the past 24 hours
      const gmailData = await storage.getMockEmails(page, pageSize);
      const emails = gmailData.messages || [];
      
      // Get AI analysis
      const dailyDigest = await summarizeRecentEmails(emails);
      
      return res.status(200).json(dailyDigest);
    } catch (error: any) {
      console.error("[OpenAI] Error generating daily digest:", error);
      res.status(500).json({
        message: "Failed to generate daily digest",
        error: error.message || String(error)
      });
    }
  });
}
