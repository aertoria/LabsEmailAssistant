// Google OAuth-related types
export interface GoogleTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  id_token?: string;
}

// Gmail API types
export interface GmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId: string;
  internalDate: string;
  payload: {
    partId?: string;
    mimeType: string;
    filename?: string;
    headers: {
      name: string;
      value: string;
    }[];
    body: {
      attachmentId?: string;
      size: number;
      data?: string;
    };
    parts?: any[];
  };
  sizeEstimate: number;
}

export interface GmailMessageList {
  messages: {
    id: string;
    threadId: string;
  }[];
  nextPageToken?: string;
  resultSizeEstimate: number;
}

export interface GmailLabel {
  id: string;
  name: string;
  messageListVisibility?: string;
  labelListVisibility?: string;
  type?: string;
  color?: {
    textColor: string;
    backgroundColor: string;
  };
}

export interface GmailHistory {
  id: string;
  messages?: {
    id: string;
    threadId: string;
  }[];
  messagesAdded?: {
    message: {
      id: string;
      threadId: string;
      labelIds: string[];
    };
  }[];
  messagesDeleted?: {
    message: {
      id: string;
      threadId: string;
      labelIds: string[];
    };
  }[];
  labelsAdded?: {
    message: {
      id: string;
      threadId: string;
      labelIds: string[];
    };
    labelIds: string[];
  }[];
  labelsRemoved?: {
    message: {
      id: string;
      threadId: string;
      labelIds: string[];
    };
    labelIds: string[];
  }[];
}

export interface SyncStatus {
  isActive: boolean;
  progress: number;
  total: number;
  processed: number;
}
