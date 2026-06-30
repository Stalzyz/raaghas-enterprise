import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CommunicationService {
  private readonly logger = new Logger(CommunicationService.name);
  private transporter: nodemailer.Transporter;

  constructor(
    private config: ConfigService,
    private prisma: PrismaService
  ) {
    this.initTransporter();
  }

  private async initTransporter() {
    try {
      const settings = await this.prisma.storeSettings.findUnique({ where: { id: 'global' } });
      
      if (settings?.smtpHost) {
        this.transporter = nodemailer.createTransport({
          host: settings.smtpHost,
          port: settings.smtpPort || 587,
          secure: settings.smtpSecure || false,
          auth: {
            user: settings.smtpUser,
            pass: settings.smtpPass,
          },
        } as any);
        this.logger.log('SMTP Transporter initialized from store settings');
      } else {
        // Fallback to env or ethereal for testing
        this.transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST || 'smtp.ethereal.email',
          port: Number(process.env.SMTP_PORT) || 587,
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });
        this.logger.warn('SMTP Transporter initialized with fallback/env credentials');
      }
    } catch (error) {
      this.logger.error('Failed to initialize SMTP transporter. Emails will not be sent.', error.message);
    }
  }

  async sendEmail({
    to,
    subject,
    body,
    attachments = [],
    isHtml = true
  }: {
    to: string;
    subject: string;
    body: string;
    attachments?: any[];
    isHtml?: boolean;
  }) {
    if (!this.transporter) await this.initTransporter();
    
    try {
      const settings = await this.prisma.storeSettings.findUnique({ where: { id: 'global' } });
      // Use supportEmail if it matches smtpUser domain, else fall back to smtpUser to avoid SMTP rejection
      const smtpUser = settings?.smtpUser;
      const preferredFrom = settings?.supportEmail;
      const from = (smtpUser && preferredFrom && preferredFrom.split('@')[1] === smtpUser.split('@')[1])
        ? preferredFrom
        : smtpUser || preferredFrom || process.env.SMTP_FROM || 'no-reply@raaghas.in';
      const storeName = settings?.storeName || 'Raaghas';

      const mailOptions = {
        from: `"${storeName}" <${from}>`,
        to,
        cc: settings?.supportEmail || 'raaghaclothing@gmail.com',
        subject,
        [isHtml ? 'html' : 'text']: body,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
      this.logger.log(`Email sent successfully: ${info.messageId}`);
      return info;
    } catch (error) {
      this.logger.error('Email sending failed', error);
      throw error;
    }
  }

  // Pre-configured templates
  async sendInvoiceEmail(invoice: any, pdfBuffer: Buffer) {
    const subject = `Invoice ${invoice.invoiceNumber} from Raaghas`;
    const body = `
      <div style="font-family: 'Playfair Display', serif; color: #1A1A1A; max-width: 600px; margin: 0 auto; padding: 40px; border: 1px solid #701A31;">
        <h1 style="color: #701A31; text-align: center;">Raaghas</h1>
        <p>Dear ${invoice.customerName},</p>
        <p>Please find attached the invoice for your recent purchase/transaction.</p>
        <div style="background: #FDFBF7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Invoice Number:</strong> ${invoice.invoiceNumber}</p>
          <p><strong>Date:</strong> ${new Date(invoice.date).toLocaleDateString()}</p>
          <p><strong>Total Amount:</strong> ₹${Number(invoice.totalAmount).toLocaleString()}</p>
        </div>
        <p>If you have any questions, please reach out to our concierge.</p>
        <br/>
        <p style="font-size: 12px; color: #666;">Regards,<br/>Team Raaghas</p>
      </div>
    `;

    return this.sendEmail({
      to: invoice.customerEmail,
      subject,
      body,
      attachments: [
        {
          filename: `${invoice.invoiceNumber}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });
  }
}
