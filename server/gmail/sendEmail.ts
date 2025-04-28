import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { createReadStream } from 'fs';
import { promisify } from 'util';
import { pipeline } from 'stream';
import { createInterface } from 'readline';
import { IStorage } from '../storage';

const pipelineAsync = promisify(pipeline);

// If modifying these scopes, delete the file token.json.
const SCOPES = ['https://www.googleapis.com/auth/gmail.send'];

interface EmailOptions {
  recipient: string;
  subject: string;
  messageText: string;
  attachmentPath?: string;
}

export class GmailService {
  private storage: IStorage;
  private oauth2Client: OAuth2Client;

  constructor(storage: IStorage) {
    this.storage = storage;
    this.oauth2Client = new google.auth.OAuth2(
      "6584956c-93f8-4767-97a8-6217662ab52c.apps.googleusercontent.com",
      process.env.GOOGLE_CLIENT_SECRET,
      "https://6584956c-93f8-4767-97a8-6217662ab52c-00-3eih5uenxnhz1.worf.replit.dev/api/auth/callback"
    );
  }

  private async getCredentials(userId: number) {
    const user = await this.storage.getUser(userId);
    if (!user || !user.accessToken || !user.refreshToken) {
      throw new Error('User not authenticated with Gmail');
    }

    this.oauth2Client.setCredentials({
      access_token: user.accessToken,
      refresh_token: user.refreshToken,
      expiry_date: user.tokenExpiry ? new Date(user.tokenExpiry).getTime() : undefined
    });

    return this.oauth2Client;
  }

  private async createMessage(options: EmailOptions) {
    const { recipient, subject, messageText, attachmentPath } = options;
    
    const message = {
      raw: '',
      threadId: '',
    };

    const emailLines: string[] = [];
    emailLines.push(`From: me`);
    emailLines.push(`To: ${recipient}`);
    emailLines.push(`Subject: ${subject}`);
    emailLines.push('Content-Type: multipart/mixed; boundary=boundary');
    emailLines.push('');
    emailLines.push('--boundary');
    emailLines.push('Content-Type: text/plain; charset=UTF-8');
    emailLines.push('');
    emailLines.push(messageText);

    if (attachmentPath) {
      const attachment = await this.readAttachment(attachmentPath);
      emailLines.push('--boundary');
      emailLines.push(`Content-Type: ${attachment.contentType}`);
      emailLines.push('Content-Transfer-Encoding: base64');
      emailLines.push(`Content-Disposition: attachment; filename="${attachment.filename}"`);
      emailLines.push('');
      emailLines.push(attachment.data);
    }

    emailLines.push('--boundary--');
    message.raw = Buffer.from(emailLines.join('\r\n')).toString('base64url');
    return message;
  }

  private async readAttachment(filePath: string) {
    const fileStream = createReadStream(filePath);
    const chunks: Buffer[] = [];

    await pipelineAsync(
      fileStream,
      async function* (source) {
        for await (const chunk of source) {
          chunks.push(chunk);
        }
      }
    );

    const data = Buffer.concat(chunks).toString('base64');
    const contentType = await this.getContentType(filePath);
    const filename = filePath.split('/').pop() || 'attachment';

    return { data, contentType, filename };
  }

  private async getContentType(filePath: string): Promise<string> {
    const rl = createInterface({
      input: createReadStream(filePath, { end: 100 }),
      crlfDelay: Infinity
    });

    let contentType = 'application/octet-stream';
    for await (const line of rl) {
      if (line.startsWith('Content-Type:')) {
        contentType = line.split(':')[1].trim();
        break;
      }
    }

    return contentType;
  }

  public async sendEmail(userId: number, options: EmailOptions) {
    try {
      const credentials = await this.getCredentials(userId);
      const gmail = google.gmail({ version: 'v1', auth: credentials });
      
      const message = await this.createMessage(options);
      const response = await gmail.users.messages.send({
        userId: 'me',
        requestBody: message
      });

      return {
        messageId: response.data.id,
        threadId: response.data.threadId
      };
    } catch (error) {
      console.error('Error sending email:', error);
      throw error;
    }
  }
} 