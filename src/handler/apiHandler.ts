import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HelloResponse, ApiResponse } from '../types';
import { CSVService } from '../services/csvService';
import { EmailService } from '../services/emailService';
import { GoogleDocsService } from '../services/googleDocsService';
import config from '../configs';

export class ApiHandler {
  private csvService: CSVService;
  private emailService: EmailService;
  private googleDocsService: GoogleDocsService;

  constructor() {
    this.csvService = new CSVService();
    this.emailService = new EmailService();
    this.googleDocsService = new GoogleDocsService();
  }

  /**
   * Create standard response format
   */
  private createResponse(statusCode: number, body: any): APIGatewayProxyResult {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      },
      body: JSON.stringify(body),
    };
  }

  /**
   * Hello endpoint handler
   */
  async handleHello(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const response: HelloResponse = {
        success: true,
        message: 'Hello from AWS Lambda!',
        timestamp: new Date().toISOString(),
        version: config.app.version,
        data: {
          method: event.httpMethod,
          path: event.path,
          services: {
            email: {
              available: this.emailService.isConnected(),
              connectionInfo: this.emailService.getConnectionInfo(),
            },
            // googleDocs: {
            //   available: this.googleDocsService.isAvailable(),
            // },
            // csv: {
            //   available: true, // CSV service doesn't require external connections
            // },
          },
        },
      };

      return this.createResponse(200, response);
    } catch (error) {
      console.error('Error in hello handler:', error);
      return this.createResponse(500, {
        success: false,
        message: 'Internal server error',
      });
    }
  }

  /**
   * CSV reading endpoint handler
   */
  //   async handleReadCSV(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  //     try {
  //       const body = event.body ? JSON.parse(event.body) : {};
  //       const { filePath, csvContent, searchTerm, searchColumn } = body;

  //       let data: any[];

  //       if (filePath) {
  //         data = await this.csvService.readCSVFile(filePath);
  //       } else if (csvContent) {
  //         data = await this.csvService.readCSVFromString(csvContent);
  //       } else {
  //         return this.createResponse(400, {
  //           success: false,
  //           message: 'Please provide either filePath or csvContent',
  //         });
  //       }

  //       // Execute search if search parameters are provided
  //       if (searchTerm && searchColumn) {
  //         data = this.csvService.searchRows(data, searchColumn, searchTerm);
  //       }

  //       const response: ApiResponse = {
  //         success: true,
  //         message: 'CSV data retrieved successfully',
  //         data: {
  //           rows: data,
  //           count: data.length,
  //           columns: this.csvService.getColumns(data),
  //         },
  //       };

  //       return this.createResponse(200, response);
  //     } catch (error) {
  //       console.error('Error reading CSV:', error);
  //       return this.createResponse(500, {
  //         success: false,
  //         message: error instanceof Error ? error.message : 'Failed to read CSV',
  //       });
  //     }
  //   }

  /**
   * Send email endpoint handler
   */
  async handleSendEmail(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      // Check if email service is properly configured
      if (!this.emailService.isConnected()) {
        return this.createResponse(503, {
          success: false,
          message: 'Email service not available. Please check Gmail configuration.',
          connectionInfo: this.emailService.getConnectionInfo(),
        });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const { to, subject, text, html, csvData, csvFilename, batchSize = 5, delayMs = 3450 } = body;

      // Handle batch emails (same content for multiple recipients)
      if (!to || !subject || (!text && !html)) {
        return this.createResponse(400, {
          success: false,
          message: 'Please provide to (array), subject, and either text or html content',
          example: {
            to: ['email1@example.com', 'email2@example.com'],
            subject: 'Your subject',
            text: 'Your message',
            batchSize: 5,
            delayMs: 1000,
          },
        });
      }

      // Ensure 'to' is an array
      const recipients = Array.isArray(to) ? to : [to];

      if (recipients.length === 0) {
        return this.createResponse(400, {
          success: false,
          message: 'Recipients array cannot be empty',
        });
      }

      let result;

      if (csvData) {
        result = await this.emailService.sendEmailWithCSV(
          recipients,
          subject,
          text || '',
          csvData,
          csvFilename || 'data.csv',
        );
      } else {
        result = await this.emailService.sendEmail(recipients, { subject, text, html }, batchSize, delayMs);
      }

      const response = {
        success: result.successCount > 0,
        message: `Sent ${result.successCount}/${result.totalEmails} emails successfully`,
        data: result,
      };

      return this.createResponse(result.successCount > 0 ? 200 : 500, response);
    } catch (error) {
      console.error('Error sending email:', error);
      return this.createResponse(500, {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to send email',
      });
    }
  }

  /**
   * Google Docs reading endpoint handler
   */
  async handleReadGoogleDocs(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      if (!this.googleDocsService.isAvailable()) {
        return this.createResponse(503, {
          success: false,
          message: 'Google Docs service not available. Please check credentials configuration.',
        });
      }

      const body = event.body ? JSON.parse(event.body) : {};
      const { documentId, asStructuredData } = body;

      if (!documentId) {
        return this.createResponse(400, {
          success: false,
          message: 'Please provide documentId',
        });
      }

      let data: any;

      if (asStructuredData) {
        data = await this.googleDocsService.readDocumentAsStructuredData(documentId);
      } else {
        data = await this.googleDocsService.readDocument(documentId);
      }

      const response: ApiResponse = {
        success: true,
        message: 'Google Docs content retrieved successfully',
        data,
      };

      return this.createResponse(200, response);
    } catch (error) {
      console.error('Error reading Google Docs:', error);
      return this.createResponse(500, {
        success: false,
        message: error instanceof Error ? error.message : 'Failed to read Google Docs',
      });
    }
  }

  /**
   * Route handling
   */
  async handleRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log('Received request:', {
      method: event.httpMethod,
      path: event.path,
      queryString: event.queryStringParameters,
    });

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
      return this.createResponse(200, {});
    }

    // Route to appropriate handler
    switch (event.path) {
      case '/hello':
        return this.handleHello(event);

      //   case '/csv':
      //     return this.handleReadCSV(event);

      case '/email':
      case '/email/batch':
        return this.handleSendEmail(event);

      case '/docs':
        return this.handleReadGoogleDocs(event);

      default:
        return this.createResponse(404, {
          success: false,
          message: 'Endpoint not found',
        });
    }
  }
}
