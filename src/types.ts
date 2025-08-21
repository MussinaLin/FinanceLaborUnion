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
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
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
