export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

export interface EmailOptions {
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}

export interface BatchEmailSentData {
  to: string;
  member_id: string;
  subject: string;
  text: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
  }>;
}

export interface BatchEmailResult {
  totalEmails: number;
  successCount: number;
  failureCount: number;
  results: Array<{
    to: string;
    member_id: string;
    success: boolean;
    messageId?: string;
    error?: string;
  }>;
}

export interface CSVRow {
  [key: string]: string;
}

export interface ApiResponse {
  success: boolean;
  message: string;
  data?: any;
}

export interface HelloResponse extends ApiResponse {
  timestamp: string;
  version: string;
}
