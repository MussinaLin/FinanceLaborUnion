import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { HelloResponse, ApiResponse, BatchEmailSentData } from '../types';
import { CSVService } from '../services/csvService';
import { EmailService } from '../services/emailService';
import { GoogleSheetsService, PaymentRecord } from '../services/googleSheetService';
import { ECPayService } from '../services/ecpayService';
import config from '../configs';

export class ApiHandler {
  private emailService: EmailService;
  private googleSheetService: GoogleSheetsService;
  private ecPayService: ECPayService;

  constructor() {
    // this.csvService = new CSVService();
    this.emailService = new EmailService();
    // console.log(config.googleSheet.spreadsheetId);
    // console.log(config.googleSheet.privateKey);
    this.googleSheetService = new GoogleSheetsService(config.googleSheet.spreadsheetId, {
      clientEmail: config.googleSheet.clientEmail,
      privateKey: config.googleSheet.privateKey,
    });
    this.ecPayService = new ECPayService();
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
      body: body,
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

  async handleECPay(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    try {
      const body = event.body ? JSON.parse(event.body) : {};
      const { merchantTradeNo, totalAmount, tradeDesc, itemName, returnURL } = body;

      const paymentResult = await this.ecPayService.createPaymentForm({
        merchantTradeNo: merchantTradeNo,
        totalAmount: totalAmount,
        tradeDesc: tradeDesc,
        itemName: itemName,
        returnURL: returnURL,
      });

      // Extract ECPay payment URL and parameters from the generated form
      // const paymentUrl = this.ecPayService.extractPaymentUrl(paymentResult.redirectUrl);

      const response: ApiResponse = {
        success: true,
        message: 'Payment created successfully. Redirect user to payment URL.',
        data: paymentResult.redirectUrl,
        // data: {
        //   redirectUrl: paymentResult.redirectUrl,
        //   tradeNo: paymentResult.tradeNo,
        //   totalAmount,
        //   instructions: 'Redirect the user to redirectUrl to complete payment',
        // },
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

  async getUniquePaymentLink(paymentLink: string): Promise<APIGatewayProxyResult> {
    try {
      console.log(`paymentLink:${paymentLink}`);
      const now = new Date();
      const yyyymm = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;

      const randomString = Math.random().toString(36).substring(2, 6);
      const memberId = paymentLink.split('_')[0];
      const paymentLinkYYYYMM = paymentLink.split('_')[1];
      const uniquePaymentLink = `${memberId}${paymentLinkYYYYMM}${randomString}`;

      console.log(`memberId:${memberId} uniquePaymentLink:${uniquePaymentLink}`);

      const paymentResult = await this.ecPayService.createPaymentForm({
        merchantTradeNo: uniquePaymentLink,
        totalAmount: Number(config.ecpay.totalAmount),
        tradeDesc: config.ecpay.tradeDesc,
        itemName: config.ecpay.itemName,
        returnURL: config.ecpay.returnURL,
      });

      // write uniquePaymentLink to googlesheet
      const paymentRecord = {
        payment_link: undefined,
        payment_link_sent: undefined,
        unique_payment_link: uniquePaymentLink,
        paid: 'N',
        paid_date: undefined,
      } as PaymentRecord;
      await this.googleSheetService.updatePaymentData(yyyymm, memberId, paymentRecord);

      return this.createResponse(200, paymentResult.redirectUrl);
    } catch (error) {
      console.log(error);
      return this.createResponse(500, {
        success: false,
        message: 'Internal server error',
      });
    }
  }

  async handleQueryECPay(merchantTradeNo: string): Promise<APIGatewayProxyResult> {
    const info = await this.ecPayService.queryECPay(merchantTradeNo);

    if (info.TradeStatus === '1') {
      // succ
      return this.createResponse(200, {
        success: true,
        data: info,
      });
    } else {
      console.error('Error in queryECPay. Resp:');
      console.error(JSON.stringify(info, null, 2));
      return this.createResponse(400, {
        success: false,
        message: 'queryECPay api error',
      });
    }
  }

  async generatePaymentLink(): Promise<APIGatewayProxyResult> {
    await this.googleSheetService.generatePaymentLinks();
    return this.createResponse(200, {
      success: true,
      data: '',
    });
  }

  async sendPaymentLink(): Promise<APIGatewayProxyResult> {
    // fetch all payment data from sheet's worksheet: yyyymm format
    const now = new Date();
    const yyyymm = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}`;
    const yyyy = now.getFullYear().toString();
    const mm = (now.getMonth() + 1).toString();

    const paymentDatas = await this.googleSheetService.getAllPaymentDatas(yyyymm);

    const subject = config.mail.subject;
    // send payment link to each member

    const batchEmailDatas = paymentDatas.map((d) => {
      const emailContent = `
    親愛的會員您好:
    您的 ${yyyy}年 ${mm}月份會費繳交連結為: ${config.mail.paymentPath}paymentLink=${d.payment_link}
    
    謝謝。
    `;

      return {
        to: d.member_email,
        member_id: d.member_id,
        subject: subject,
        text: emailContent,
      } as BatchEmailSentData;
    });

    const result = await this.emailService.sendEmailBatch(batchEmailDatas);

    // update email sent result
    const paymentRecordY = {
      payment_link: undefined,
      payment_link_sent: 'Y',
      unique_payment_link: undefined,
      paid: undefined,
      paid_date: undefined,
    } as PaymentRecord;

    const paymentRecordN = {
      payment_link: undefined,
      payment_link_sent: 'N',
      unique_payment_link: undefined,
      paid: undefined,
      paid_date: undefined,
    } as PaymentRecord;

    const [memberIds, datas] = result.results.reduce<[string[], PaymentRecord[]]>(
      (acc, r) => {
        acc[0].push(r.member_id);
        acc[1].push(r.success ? paymentRecordY : paymentRecordN);
        return acc;
      },
      [[], []],
    );

    await this.googleSheetService.updatePaymentDataBatch(yyyymm, memberIds, datas);

    return this.createResponse(200, {
      success: true,
      data: result,
    });
  }

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
   * Route handling
   */
  async handleRequest(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    console.log('Received request:', {
      method: event.httpMethod,
      path: event.path,
      queryString: event.queryStringParameters,
    });

    // Route to appropriate handler
    switch (event.path) {
      case '/hello':
        return this.handleHello(event);
      case '/ecpay':
        return this.handleECPay(event);
      case '/payment/link':
        return this.generatePaymentLink();
      case '/payment/link/send':
        return this.sendPaymentLink();

      case '/email':
      case '/email/batch':
        return this.handleSendEmail(event);

      default:
        return this.createResponse(404, {
          success: false,
          message: 'Endpoint not found',
        });
    }
  }

  async handleGetMethod(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
    if (event.path.startsWith('/payment/details')) {
      // get order details
      const merchantTradeNo = event.queryStringParameters?.MerchantTradeNo;
      console.log(`merchantTradeNo:${merchantTradeNo}`);
      if (merchantTradeNo) {
        return this.handleQueryECPay(merchantTradeNo);
      } else {
        return this.createResponse(404, {
          success: false,
          message: 'merchantTradeNo not found',
        });
      }
    } else if (event.path.startsWith('/payment/link')) {
      // gen payment link
      const paymentLink = event.queryStringParameters?.paymentLink;
      console.log(`paymentLink:${paymentLink}`);
      if (paymentLink) {
        return this.getUniquePaymentLink(paymentLink);
      } else {
        return this.createResponse(404, {
          success: false,
          message: 'paymentLink not found',
        });
      }
    }

    return this.createResponse(404, {
      success: false,
      message: 'path not found',
    });
  }
}
