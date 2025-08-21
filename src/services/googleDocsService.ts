import { google } from 'googleapis';
import * as fs from 'fs';
import config from '../configs';

export class GoogleDocsService {
  private docs: any;
  private auth: any;

  constructor() {
    this.initializeAuth();
  }

  /**
   * Initialize Google API authentication
   */
  private async initializeAuth(): Promise<void> {
    try {
      // Read service account credentials file
      const credentialsPath = config.google.credentialsPath;
      if (!fs.existsSync(credentialsPath)) {
        console.warn('Google credentials file not found. Google Docs functionality will be disabled.');
        return;
      }

      const credentials = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));

      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: config.google.scopes,
      });

      this.docs = google.docs({ version: 'v1', auth: this.auth });
      console.log('Google Docs API initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Docs API:', error);
    }
  }

  /**
   * Read Google Docs document content
   */
  async readDocument(documentId: string): Promise<string> {
    if (!this.docs) {
      throw new Error('Google Docs API not initialized');
    }

    try {
      const response = await this.docs.documents.get({
        documentId,
      });

      const document = response.data;
      let text = '';

      if (document.body && document.body.content) {
        for (const element of document.body.content) {
          if (element.paragraph) {
            for (const textElement of element.paragraph.elements || []) {
              if (textElement.textRun) {
                text += textElement.textRun.content || '';
              }
            }
          }
        }
      }

      console.log(`Successfully read Google Doc: ${documentId}`);
      return text;
    } catch (error) {
      console.error('Error reading Google Doc:', error);
      throw new Error(`Failed to read Google Doc: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert Google Docs content to CSV format (simple implementation)
   * Assumes document content is in table format, with lines separated by newlines
   * and fields separated by tabs or commas
   */
  convertToCSV(text: string, delimiter: string = ','): string {
    const lines = text.split('\n').filter((line) => line.trim());
    return lines
      .map((line) => {
        // Simple split handling, may need more complex parsing in actual use
        const fields = line.split('\t').length > 1 ? line.split('\t') : line.split(',');
        return fields.map((field) => `"${field.trim().replace(/"/g, '""')}"`).join(delimiter);
      })
      .join('\n');
  }

  /**
   * Read Google Docs and parse as structured data
   */
  async readDocumentAsStructuredData(documentId: string): Promise<any[]> {
    const text = await this.readDocument(documentId);
    const csvText = this.convertToCSV(text);

    // Can use CSVService to parse CSV here
    const lines = csvText.split('\n');
    const headers = lines[0].split(',').map((h) => h.replace(/"/g, ''));
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim()) {
        const values = lines[i].split(',').map((v) => v.replace(/"/g, ''));
        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        data.push(row);
      }
    }

    return data;
  }

  /**
   * Check if API is available
   */
  isAvailable(): boolean {
    return this.docs !== undefined;
  }
}
