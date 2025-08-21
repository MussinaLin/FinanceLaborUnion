import * as nodemailer from 'nodemailer';
import { EmailConfig, EmailOptions } from '../types';
import config from '../configs';

export class EmailService {
  // private transporter: nodemailer.Transporter;
  // constructor(emailConfig: EmailConfig = config.email) {
  //   this.transporter = nodemailer.createTransporter({
  //     host: emailConfig.host,
  //     port: emailConfig.port,
  //     secure: emailConfig.secure,
  //     auth: {
  //       user: emailConfig.auth.user,
  //       pass: emailConfig.auth.pass,
  //     },
  //   });
  // }
  /**
   * Send email
   */
  // async sendEmail(options: EmailOptions): Promise<boolean> {
  //   try {
  //     // Verify transporter configuration
  //     await this.transporter.verify();
  //     console.log('SMTP server connection verified');
  //     const mailOptions = {
  //       from: config.email.auth.user,
  //       to: options.to,
  //       subject: options.subject,
  //       text: options.text,
  //       html: options.html,
  //       attachments: options.attachments,
  //     };
  //     const info = await this.transporter.sendMail(mailOptions);
  //     console.log('Email sent successfully:', info.messageId);
  //     return true;
  //   } catch (error) {
  //     console.error('Error sending email:', error);
  //     throw new Error(`Failed to send email: ${error instanceof Error ? error.message : 'Unknown error'}`);
  //   }
  // }
  /**
   * Send plain text email
   */
  // async sendTextEmail(to: string, subject: string, text: string): Promise<boolean> {
  //   return this.sendEmail({ to, subject, text });
  // }
  /**
   * Send HTML email
   */
  // async sendHTMLEmail(to: string, subject: string, html: string): Promise<boolean> {
  //   return this.sendEmail({ to, subject, html });
  // }
  /**
   * Send email with CSV attachment
   */
  /**
   * Test email connection
   */
  // async testConnection(): Promise<boolean> {
  //   try {
  //     await this.transporter.verify();
  //     return true;
  //   } catch (error) {
  //     console.error('Email connection test failed:', error);
  //     return false;
  //   }
  // }
}
