import { EmailConfig } from './types';
import * as dotenv from 'dotenv';
dotenv.config();

export const config = {
  // Gmail SMTP configuration
  email: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER || '',
      pass: process.env.GMAIL_APP_PASSWORD || '', // Use App Password, not regular password
    },
  } as EmailConfig,

  // Google API configuration
  google: {
    credentialsPath: process.env.GOOGLE_CREDENTIALS_PATH || '',
    scopes: ['https://www.googleapis.com/auth/documents.readonly'],
  },

  // Application configuration
  app: {
    name: 'AWS Lambda API',
    version: '1.0.0',
    port: process.env.PORT || 3000,
  },
};

export default config;
