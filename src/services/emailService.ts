import * as nodemailer from 'nodemailer';
import { EmailConfig, EmailOptions, BatchEmailResult } from '../types';
import config from '../configs';

export class EmailService {
  private transporter: nodemailer.Transporter;
  private isConnectionVerified: boolean = false;

  constructor(emailConfig: EmailConfig = config.email) {
    this.transporter = nodemailer.createTransport({
      host: emailConfig.host,
      port: emailConfig.port,
      secure: emailConfig.secure,
      auth: {
        user: emailConfig.auth.user,
        pass: emailConfig.auth.pass,
      },
    });

    // Automatically verify connection when instance is created
    this.initializeConnection();
  }

  /**
   * Initialize and verify email connection on startup
   */
  private async initializeConnection(): Promise<void> {
    try {
      console.log('🔍 Verifying Gmail connection...');

      // Check if credentials are provided
      if (!config.email.auth.user || !config.email.auth.pass) {
        console.warn('⚠️  Gmail credentials not found in environment variables');
        console.warn('   Please set GMAIL_USER and GMAIL_APP_PASSWORD in .env file');
        return;
      }

      // Test the connection
      const isConnected = await this.testConnection();

      if (isConnected) {
        this.isConnectionVerified = true;
        console.log('✅ Gmail connection verified successfully');
        console.log(`   Connected as: ${config.email.auth.user}`);
      } else {
        console.error('❌ Gmail connection failed');
        console.error('   Please check your GMAIL_USER and GMAIL_APP_PASSWORD');
        console.error('   Make sure you are using an App Password, not your regular password');
        console.error('   Guide: https://support.google.com/accounts/answer/185833');
      }
    } catch (error) {
      console.error(
        '❌ Error during Gmail connection verification:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      console.error('   Please check your email configuration in .env file');
    }
  }

  /**
   * Get connection status
   */
  public isConnected(): boolean {
    return this.isConnectionVerified;
  }

  /**
   * Get connection details for debugging
   */
  public getConnectionInfo(): object {
    return {
      isVerified: this.isConnectionVerified,
      user: config.email.auth.user || 'Not configured',
      host: config.email.host,
      port: config.email.port,
      hasPassword: !!config.email.auth.pass,
    };
  }

  /**
   * Send email
   */
  async sendEmail(
    to: string[],
    options: EmailOptions,
    batchSize: number = 5,
    delayMs: number = 4000,
  ): Promise<BatchEmailResult> {
    try {
      // Check connection before sending
      if (!this.isConnectionVerified) {
        console.warn('⚠️  Email connection not verified. Attempting to send anyway...');
      }

      // Verify transporter configuration before sending
      await this.transporter.verify();
      console.log('📧 SMTP server connection verified for sending');

      const results: BatchEmailResult['results'] = [];
      let successCount = 0;
      let failureCount = 0;

      console.log(`📬 Starting batch email send to ${to.length} recipients`);
      console.log(`   Batch size: ${batchSize}, Delay: ${delayMs}ms`);

      // Process emails in batches
      for (let i = 0; i < to.length; i += batchSize) {
        const batch = to.slice(i, i + batchSize);
        console.log(
          `📤 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(to.length / batchSize)} (${batch.length} emails)`,
        );

        // Send emails in current batch concurrently
        const batchPromises = batch.map(async (recipient) => {
          try {
            const mailOptions = {
              from: config.email.auth.user,
              to: recipient,
              subject: options.subject,
              text: options.text,
              html: options.html,
              attachments: options.attachments,
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Email sent to ${recipient}: ${info.messageId}`);

            successCount++;
            return {
              to: recipient,
              success: true,
              messageId: info.messageId,
            };
          } catch (error) {
            console.error(
              `❌ Failed to send email to ${recipient}:`,
              error instanceof Error ? error.message : 'Unknown error',
            );

            failureCount++;
            return {
              to: recipient,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            };
          }
        });

        // Wait for current batch to complete
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Add delay between batches (except for the last batch)
        if (i + batchSize < to.length && delayMs > 0) {
          console.log(`⏳ Waiting ${delayMs}ms before next batch...`);
          await new Promise((resolve) => setTimeout(resolve, delayMs));
        }
      }

      const result: BatchEmailResult = {
        totalEmails: to.length,
        successCount,
        failureCount,
        results,
      };

      console.log(`📊 Batch email send completed:`);
      console.log(`   Total: ${result.totalEmails}, Success: ${result.successCount}, Failed: ${result.failureCount}`);

      return result;
    } catch (error) {
      console.error('❌ Error in batch email send:', error);
      throw new Error(`Failed to send batch emails: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Send plain text email
   */
  async sendTextEmail(to: string[], subject: string, text: string): Promise<BatchEmailResult> {
    return this.sendEmail(to, { subject, text });
  }

  /**
   * Send HTML email
   */
  async sendHTMLEmail(to: string[], subject: string, html: string): Promise<BatchEmailResult> {
    return this.sendEmail(to, { subject, html });
  }

  /**
   * Send email with CSV attachment
   */
  async sendEmailWithCSV(
    to: string[],
    subject: string,
    text: string,
    csvData: string,
    filename: string = 'data.csv',
  ): Promise<BatchEmailResult> {
    const attachments = [
      {
        filename,
        content: csvData,
      },
    ];

    return this.sendEmail(to, { subject, text, attachments });
  }

  /**
   * Test email connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.transporter.verify();
      return true;
    } catch (error) {
      console.error('Email connection test failed:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Re-verify connection (useful for troubleshooting)
   */
  async reverifyConnection(): Promise<boolean> {
    console.log('🔄 Re-verifying Gmail connection...');
    const isConnected = await this.testConnection();
    this.isConnectionVerified = isConnected;

    if (isConnected) {
      console.log('✅ Gmail connection re-verified successfully');
    } else {
      console.error('❌ Gmail connection re-verification failed');
    }

    return isConnected;
  }
}
