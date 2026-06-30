import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly apiKey = process.env.RESEND_API_KEY;
  private readonly fromEmail = process.env.EMAIL_FROM || 'noreply@raaghas.in';
  private readonly CC_EMAIL = 'raaghaclothing@gmail.com';

  constructor(private prisma: PrismaService) {}

  private compileTemplate(template: string, variables: Record<string, any>): string {
    if (!template) return '';
    return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key) => {
      return variables[key] !== undefined ? String(variables[key]) : match;
    });
  }

  private wrapEmailHtml(content: string): string {
    if (content.includes('<!DOCTYPE html>')) return content;
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background-color: #FFFFFF; -webkit-font-smoothing: antialiased; }
    h1, h2, h3, h4, h5, h6 { font-family: 'Playfair Display', Didot, Georgia, serif !important; color: #111111; font-weight: 400; }
    p, span, td, th, a, li, div { font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; }
    .button-premium { display: inline-block; background-color: #111111; color: #FFFFFF !important; text-decoration: none; padding: 18px 45px; font-weight: 500; font-size: 11px; letter-spacing: 2px; text-transform: uppercase; border: none; }
    .button-premium:hover { background-color: #333333; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #FFFFFF;">
  <div style="background-color: #FFFFFF; padding: 60px 20px; font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333333; line-height: 1.8;">
    <div style="max-width: 600px; margin: 0 auto; background: #FFFFFF; padding: 50px 40px;">
      <!-- Header -->
      <div style="text-align: center; padding-bottom: 50px;">
        <img src="https://raaghas.in/logo-dark.svg" alt="Raaghas" style="height: 28px; display: block; margin: 0 auto;" />
      </div>

      ${content}

      <!-- Footer -->
      <div style="margin-top: 80px; padding-top: 40px; border-top: 1px solid #EAEAEA; text-align: center;">
        <p style="margin: 0; font-size: 10px; color: #999999; text-transform: uppercase; letter-spacing: 2px; line-height: 2.5;">
          Raaghas Pvt Ltd<br/>
          Salem, India<br/><br/>
          <a href="https://raaghas.in/collections" style="color: #999999; text-decoration: none; padding-right: 15px;">SHOP</a> | 
          <a href="https://raaghas.in/account" style="color: #999999; text-decoration: none; padding: 0 15px;">ACCOUNT</a> | 
          <a href="mailto:care@raaghas.in" style="color: #999999; text-decoration: none; padding-left: 15px;">CLIENT CARE</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
  }

  private async getTransporter() {
    const settings = await (this.prisma as any).storeSettings.findUnique({
      where: { id: 'global' }
    });

    if (settings?.smtpHost && settings?.smtpUser && settings?.smtpPass) {
      const port = settings.smtpPort || 587;
      let isSecure = settings.smtpSecure !== null ? settings.smtpSecure : (port === 465);
      
      // Port 587 uses STARTTLS which requires secure: false in NodeMailer
      if (port === 587) {
        isSecure = false;
      }
      
      return nodemailer.createTransport({
        host: settings.smtpHost,
        port: port,
        secure: isSecure,
        auth: {
          user: settings.smtpUser,
          pass: settings.smtpPass,
        },
      });
    }
    return null;
  }

  async sendInvoiceEmail(to: string, buyerName: string, invoiceNumber: string, amount: number) {
    const dbTemplate = await (this.prisma as any).emailTemplate.findUnique({ where: { type: 'INVOICE' } });

    let subject = `Invoice ${invoiceNumber} | Raaghas`;
    let html = `
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Formal Invoice</p>
            <h1 style="font-size: 32px; margin: 0 0 40px 0;">${invoiceNumber}</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">Dear ${buyerName},<br/><br/>Thank you for your patronage. Your formal invoice has been generated and is attached to this email.</p>
            
            <div style="border-top: 1px solid #EAEAEA; border-bottom: 1px solid #EAEAEA; padding: 40px 0; margin: 50px 0;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888;">Total Remitted</p>
              <h2 style="margin: 15px 0 0; font-size: 36px;">₹${amount.toLocaleString()}</h2>
            </div>
            
            <a href="https://raaghas.in/account" class="button-premium">View Dashboard</a>
          </div>
    `;

    if (dbTemplate?.isActive) {
      const vars = { buyerName, invoiceNumber, amount: amount.toLocaleString() };
      subject = this.compileTemplate(dbTemplate.subject, vars);
      html = this.compileTemplate(dbTemplate.body, vars);
    }

    html = this.wrapEmailHtml(html);
    const transporter = await this.getTransporter();

    try {
      if (transporter) {
        this.logger.log(`Sending invoice email via SMTP to ${to}`);
        await transporter.sendMail({
          from: `"Raaghas Wholesale" <${this.fromEmail}>`,
          to,
          cc: this.CC_EMAIL,
          subject,
          html,
        });
        return { success: true };
      }

      if (!this.apiKey) {
        this.logger.warn(`Email not configured (No SMTP & No Resend). Mocking to ${to}`);
        return { id: 'mock-email-id' };
      }

      this.logger.log(`Sending invoice email via Resend to ${to}`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: `Raaghas Wholesale <${this.fromEmail}>`,
          to: [to],
          cc: [this.CC_EMAIL],
          subject,
          html,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email via Resend');
      }

      this.logger.log(`Invoice email sent to ${to} (ID: ${data.id})`);
      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send invoice email to ${to}`, error?.stack || error);
      return null;
    }
  }

  async sendOrderConfirmationEmail(
    to: string, 
    buyerName: string, 
    orderId: string, 
    amount: number, 
    items: any[],
    attachmentBuffer?: Buffer
  ) {
    let itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 20px 0; border-bottom: 1px solid #F5F5F5; font-size: 13px;">${item.productName || item.variant?.product?.title || 'Product'}</td>
        <td style="padding: 20px 0; border-bottom: 1px solid #F5F5F5; font-size: 13px; text-align: center; color: #888888;">${item.quantity}</td>
        <td style="padding: 20px 0; border-bottom: 1px solid #F5F5F5; font-size: 13px; text-align: right;">₹${Number(item.price).toLocaleString('en-IN')}</td>
      </tr>
    `).join('');

    const dbTemplate = await (this.prisma as any).emailTemplate.findUnique({ where: { type: 'ORDER_PLACED' } });

    let subject = `Order Confirmed: #${orderId.slice(-6).toUpperCase()} | Raaghas`;
    let html = `
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Order Confirmation</p>
            <h1 style="font-size: 36px; margin: 0 0 30px 0;">#${orderId.slice(-6).toUpperCase()}</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 50px; line-height: 1.8;">Dear ${buyerName},<br/><br/>Thank you for your acquisition. Your order has been securely received and is currently being prepared by our team.</p>
            
            <table style="width: 100%; border-collapse: collapse; margin-top: 40px; font-size: 13px; text-align: left;">
              <thead>
                <tr>
                  <th style="padding-bottom: 15px; border-bottom: 1px solid #111111; font-weight: 500; color: #111111; text-transform: uppercase; letter-spacing: 2px; font-size: 9px;">Item</th>
                  <th style="padding-bottom: 15px; border-bottom: 1px solid #111111; font-weight: 500; color: #111111; text-transform: uppercase; letter-spacing: 2px; font-size: 9px; text-align: center;">Qty</th>
                  <th style="padding-bottom: 15px; border-bottom: 1px solid #111111; font-weight: 500; color: #111111; text-transform: uppercase; letter-spacing: 2px; font-size: 9px; text-align: right;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <th colspan="2" style="padding: 30px 0 10px 0; text-align: left; font-weight: 500; color: #888888; font-size: 10px; text-transform: uppercase; letter-spacing: 2px;">Total Paid</th>
                  <th style="padding: 30px 0 10px 0; text-align: right; font-weight: 400; font-size: 20px; font-family: 'Playfair Display', serif; color: #111111;">₹${amount.toLocaleString('en-IN')}</th>
                </tr>
              </tfoot>
            </table>

            <div style="margin-top: 60px;">
              <a href="https://raaghas.in/account" class="button-premium">Track Order</a>
            </div>
          </div>
    `;

    if (dbTemplate?.isActive) {
      const vars = { buyerName, orderId, shortOrderId: orderId.slice(-6), amount: amount.toLocaleString('en-IN'), itemsHtml };
      subject = this.compileTemplate(dbTemplate.subject, vars);
      html = this.compileTemplate(dbTemplate.body, vars);
    }

    html = this.wrapEmailHtml(html);
    const transporter = await this.getTransporter();

    try {
      if (transporter) {
        this.logger.log(`Sending order confirmation email via SMTP to ${to}`);
        await Promise.race([
          transporter.sendMail({
            from: `"Raaghas" <${this.fromEmail}>`,
            to,
            cc: this.CC_EMAIL,
            subject,
            html,
            attachments: attachmentBuffer ? [
              {
                filename: `Invoice-${orderId.slice(-6)}.pdf`,
                content: attachmentBuffer,
                contentType: 'application/pdf'
              }
            ] : [],
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Timeout')), 10000))
        ]);
        return { success: true };
      }

      if (this.apiKey) {
        this.logger.log(`Sending order confirmation via Resend to ${to}`);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            from: `Raaghas <${this.fromEmail}>`,
            to: [to],
            cc: [this.CC_EMAIL],
            subject,
            html,
            attachments: attachmentBuffer ? [
              {
                filename: `Invoice-${orderId.slice(-6)}.pdf`,
                content: attachmentBuffer.toString('base64'),
              }
            ] : [],
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Failed to send via Resend');
        return { success: true };
      }

      return null;
    } catch (error: any) {
      this.logger.error(`Failed to send order confirmation to ${to}`, error?.stack || error);
      return null;
    }
  }

  async sendOtpEmail(to: string, code: string) {
    const subject = `${code} is your Raaghas access code`;
    let html = `
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Client Authentication</p>
            <h1 style="font-size: 28px; margin: 0 0 30px 0;">Access Request</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 50px;">For your security, please use the following access code to authenticate your session.</p>
            
            <div style="padding: 40px 0; margin: 40px 0;">
              <h2 style="margin: 0; color: #111111; font-size: 48px; font-family: 'Inter', sans-serif; font-weight: 300; letter-spacing: 16px;">${code}</h2>
            </div>
            
            <p style="font-size: 11px; color: #888888; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px;">This code will expire in 10 minutes.</p>
          </div>
    `;

    html = this.wrapEmailHtml(html);
    const transporter = await this.getTransporter();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout for OTPs

    try {
      if (transporter) {
        this.logger.log(`Sending OTP email via SMTP to ${to}`);
        // Wrap SMTP in a timeout race
        await Promise.race([
          transporter.sendMail({
            from: `"Raaghas" <${this.fromEmail}>`,
            to,
            subject,
            html,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Timeout')), 8000))
        ]);
        return { success: true };
      }

      if (!this.apiKey) {
        this.logger.warn(`Email not configured (No SMTP & No Resend). Mocking to ${to}`);
        return { id: 'mock-otp-id' };
      }

      this.logger.log(`Sending OTP email via Resend to ${to}`);
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          from: `Raaghas <${this.fromEmail}>`,
          to: [to],
          subject,
          html,
        }),
        signal: controller.signal,
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email via Resend');
      }

      return data;
    } catch (error: any) {
      this.logger.error(`Failed to send OTP email to ${to}: ${error.name === 'AbortError' ? 'TIMEOUT' : error.message}`);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  async sendPasswordResetEmail(to: string, token: string) {
    const resetUrl = `https://admin.raaghas.in/reset-password?token=${token}`;
    const subject = `Reset your Raaghas Admin Password`;
    let html = `
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Admin Security</p>
            <h1 style="font-size: 28px; margin: 0 0 30px 0;">Password Reset</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">A request has been made to reset your Raaghas Administrator password. If you initiated this, please proceed below.</p>
            
            <a href="${resetUrl}" class="button-premium">Set New Password</a>
            
            <p style="font-size: 11px; color: #888888; font-style: italic; margin-top: 40px;">If you did not request this, you may safely ignore this email. The link will expire in 1 hour.</p>
          </div>
    `;

    html = this.wrapEmailHtml(html);
    const transporter = await this.getTransporter();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      if (transporter) {
        await Promise.race([
          transporter.sendMail({
            from: `"Raaghas Admin" <${this.fromEmail}>`,
            to,
            subject,
            html,
          }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP Timeout')), 10000))
        ]);
        return { success: true };
      }

      if (this.apiKey) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            from: `Raaghas Admin <${this.fromEmail}>`,
            to: [to],
            subject,
            html,
          }),
          signal: controller.signal,
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Failed to send via Resend');
      }
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send password reset email to ${to}`, error.message);
      return null;
    } finally {
      clearTimeout(timeoutId);
    }
  }
  async sendCustomEmail(to: string, subject: string, html: string) {
    html = this.wrapEmailHtml(html);
    const transporter = await this.getTransporter();

    try {
      if (transporter) {
        await transporter.sendMail({
          from: `"Raaghas" <${this.fromEmail}>`,
          to,
          cc: this.CC_EMAIL,
          subject,
          html,
        });
        return { success: true };
      }

      if (this.apiKey) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            from: `Raaghas <${this.fromEmail}>`,
            to: [to],
            cc: [this.CC_EMAIL],
            subject,
            html,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Failed to send via Resend');
      }
      return { success: true };
    } catch (error: any) {
      this.logger.error(`Failed to send custom email to ${to}`, error?.stack || error);
      return null;
    }
  }

  async sendTrackingEmail(to: string, buyerName: string, orderId: string, trackingId: string, carrierName: string) {
    const subject = `Your Raaghas order #${orderId.slice(-6).toUpperCase()} has shipped!`;
    const html = `
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Dispatch Notice</p>
            <h1 style="font-size: 36px; margin: 0 0 30px 0;">En Route</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 40px; line-height: 1.8;">Dear ${buyerName},<br/><br/>Exquisite things take time, but the wait is nearly over. Your order <strong>#${orderId.slice(-6).toUpperCase()}</strong> has been carefully packaged and is now in transit.</p>
            
            <div style="border-top: 1px solid #EAEAEA; border-bottom: 1px solid #EAEAEA; padding: 40px 0; margin: 50px 0; text-align: left;">
              <p style="margin: 0 0 10px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888;">Courier Partner</p>
              <p style="margin: 0 0 30px 0; font-size: 16px; color: #111111;">${carrierName}</p>
              
              <p style="margin: 0 0 10px 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888;">Tracking Identifier</p>
              <p style="margin: 0; font-size: 18px; color: #111111; font-family: monospace; letter-spacing: 2px;">${trackingId}</p>
            </div>
            
            <a href="https://raaghas.in/account" class="button-premium">Track Shipment</a>
          </div>
    `;
    return this.sendCustomEmail(to, subject, html);
  }

  async sendEmailWithAttachment(to: string, subject: string, html: string, filename: string, content: Buffer) {
    html = this.wrapEmailHtml(html);
    const transporter = await this.getTransporter();
    const from = this.fromEmail;

    try {
      if (transporter) {
        await transporter.sendMail({
          from: `"Raaghas" <${from}>`,
          to,
          cc: this.CC_EMAIL,
          subject,
          html,
          attachments: [{ filename, content }]
        });
        return { success: true };
      }
      
      // If no SMTP, we can't easily send attachments via standard Resend fetch without more complex multi-part
      this.logger.error('SMTP not configured, cannot send attachment');
      return { success: false, error: 'SMTP_NOT_CONFIGURED' };
    } catch (error) {
      this.logger.error('Failed to send email with attachment', error);
      return { success: false, error };
    }
  }

  async sendLedgerEmail(to: string, subject: string, body: string, signature: string, attachments: any[] = []) {
    const transporter = await this.getTransporter();
    let html = `
          <div style="font-size: 14px; color: #333; line-height: 1.8;">
            ${body.replace(/\n/g, '<br/>')}
          </div>
          
          <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid rgba(112, 26, 49, 0.1); font-size: 12px; color: #666; font-style: italic;">
            ${signature.replace(/\n/g, '<br/>')}
          </div>
    `;
    
    html = this.wrapEmailHtml(html);

    try {
      if (transporter) {
        await transporter.sendMail({
          from: `"Raaghas Accounts" <${this.fromEmail}>`,
          to,
          cc: this.CC_EMAIL,
          subject,
          html,
          attachments
        });
        return { success: true };
      }
      return { success: false, error: 'SMTP_NOT_CONFIGURED' };
    } catch (error) {
      this.logger.error('Failed to send ledger email', error);
      return { success: false, error };
    }
  }


  async sendPaymentFailedEmail(to: string, buyerName: string, orderId: string, amount: number) {
    const dbTemplate = await (this.prisma as any).emailTemplate.findUnique({ where: { type: 'PAYMENT_FAILED' } });

    let subject = `Action Required: Payment Failed for Order #${orderId.slice(-6).toUpperCase()}`;
    let html = `
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Notice</p>
            <h1 style="font-size: 32px; margin: 0 0 30px 0;">Payment Unsuccessful</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">Dear ${buyerName},<br/><br/>We noticed an irregularity while processing the payment for your order <strong>#${orderId.slice(-6).toUpperCase()}</strong>.</p>
            
            <div style="border-top: 1px solid #EAEAEA; border-bottom: 1px solid #EAEAEA; padding: 40px 0; margin: 50px 0;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888;">Pending Amount</p>
              <h2 style="margin: 15px 0 0; font-size: 36px;">₹${amount.toLocaleString()}</h2>
            </div>
            
            <p style="font-size: 12px; color: #888888; font-style: italic; margin-bottom: 40px;">Rest assured, your selections have been reserved. Please retry your payment to complete the acquisition.</p>
            
            <a href="https://raaghas.in/checkout" class="button-premium">Retry Payment</a>
          </div>
    `;

    if (dbTemplate?.isActive) {
      const vars = { buyerName, orderId, shortOrderId: orderId.slice(-6).toUpperCase(), amount: amount.toLocaleString('en-IN') };
      subject = this.compileTemplate(dbTemplate.subject, vars);
      html = this.compileTemplate(dbTemplate.body, vars);
    }

    html = this.wrapEmailHtml(html);
    const transporter = await this.getTransporter();

    try {
      if (transporter) {
        this.logger.log(`Sending failed payment email via SMTP to ${to}`);
        await transporter.sendMail({
          from: `"Raaghas" <${this.fromEmail}>`,
          to,
          cc: this.CC_EMAIL,
          subject,
          html,
        });
        return { success: true };
      }

      if (this.apiKey) {
        this.logger.log(`Sending failed payment via Resend to ${to}`);
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            from: `Raaghas <${this.fromEmail}>`,
            to: [to],
            cc: [this.CC_EMAIL],
            subject,
            html,
          }),
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Failed to send via Resend');
        return { success: true };
      }
      return null;
    } catch (error: any) {
      this.logger.error(`Failed to send payment failure email to ${to}`, error?.stack || error);
      return null;
    }
  }



  async sendReferralAlertEmail(to: string, userName: string, rewardAmount: number) {
    const dbTemplate = await (this.prisma as any).emailTemplate.findUnique({ where: { type: 'REFERRAL_ALERT' } });

    let subject = `Your Referral Reward is Here!`;
    let html = `
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Referral Alert</p>
            <h1 style="font-size: 32px; margin: 0 0 30px 0;">Reward Unlocked</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">Dear ${userName},<br/><br/>Someone just used your referral code. As a token of our appreciation, we have credited a reward to your Raaghas Wallet.</p>
            
            <div style="border-top: 1px solid #EAEAEA; border-bottom: 1px solid #EAEAEA; padding: 40px 0; margin: 50px 0;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888;">Reward Amount</p>
              <h2 style="margin: 15px 0 0; font-size: 36px;">₹${rewardAmount.toLocaleString('en-IN')}</h2>
            </div>
            
            <p style="font-size: 11px; color: #888888; font-style: italic; margin-bottom: 40px;">You can use this balance towards your next luxury acquisition.</p>
            
            <a href="https://raaghas.in/account" class="button-premium">View Wallet</a>
          </div>
    `;

    if (dbTemplate?.isActive) {
      const vars = { userName, rewardAmount: rewardAmount.toLocaleString('en-IN') };
      subject = this.compileTemplate(dbTemplate.subject, vars);
      html = this.compileTemplate(dbTemplate.body, vars);
    }

    html = this.wrapEmailHtml(html);
    return this.sendCustomEmail(to, subject, html);
  }

  async sendWalletAlertEmail(to: string, userName: string, amount: number, isCredit: boolean, reason: string) {
    const dbTemplate = await (this.prisma as any).emailTemplate.findUnique({ where: { type: 'WALLET_ALERT' } });

    let subject = `Raaghas Wallet Update: ₹${amount.toLocaleString('en-IN')} ${isCredit ? 'Credited' : 'Debited'}`;
    let html = `
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Wallet Update</p>
            <h1 style="font-size: 32px; margin: 0 0 30px 0;">Balance ${isCredit ? 'Added' : 'Deducted'}</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">Dear ${userName},<br/><br/>Your Raaghas Wallet balance has been updated for: <strong>${reason}</strong>.</p>
            
            <div style="border-top: 1px solid #EAEAEA; border-bottom: 1px solid #EAEAEA; padding: 40px 0; margin: 50px 0;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888;">Transaction Amount</p>
              <h2 style="margin: 15px 0 0; font-size: 36px;">${isCredit ? '+' : '-'}₹${amount.toLocaleString('en-IN')}</h2>
            </div>
            
            <a href="https://raaghas.in/account" class="button-premium">View Ledger</a>
          </div>
    `;

    if (dbTemplate?.isActive) {
      const vars = { userName, amount: amount.toLocaleString('en-IN'), creditOrDebit: isCredit ? 'Credited' : 'Debited', reason };
      subject = this.compileTemplate(dbTemplate.subject, vars);
      html = this.compileTemplate(dbTemplate.body, vars);
    }

    html = this.wrapEmailHtml(html);
    return this.sendCustomEmail(to, subject, html);
  }

  async sendAbandonedCartEmail(to: string, buyerName: string, orderId: string, checkoutUrl: string) {
    const dbTemplate = await (this.prisma as any).emailTemplate.findUnique({ where: { type: 'CART_ABANDONED_REMINDER' } });

    let subject = `You left something behind in your atelier... | Raaghas`;
    let html = `
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Pending Curation</p>
            <h1 style="font-size: 32px; margin: 0 0 40px 0;">Complete Your Acquisition</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">Dear ${buyerName},<br/><br/>We noticed you left some exquisite pieces behind in your cart. Your selections have been reserved, but demand is high.</p>
            
            <a href="${checkoutUrl}" class="button-premium">Return to Checkout</a>
          </div>
    `;

    if (dbTemplate?.isActive) {
      const vars = { customerName: buyerName, cart: { itemCount: 1, totalAmount: 'Pending' }, checkoutUrl };
      subject = this.compileTemplate(dbTemplate.subject, vars);
      html = this.compileTemplate(dbTemplate.body, vars);
      
      // Also inject the checkoutUrl properly since the default template uses /cart
      html = html.replace('href="https://raaghas.in/cart"', `href="${checkoutUrl}"`);
    }

    html = this.wrapEmailHtml(html);
    return this.sendCustomEmail(to, subject, html);
  }

  async sendRefundInitiatedEmail(to: string, customerName: string, orderId: string, refundAmount: number) {
    const subject = `Refund Initiated: Order #${orderId.slice(-6).toUpperCase()} | Raaghas`;
    let html = `
          <div style="text-align: center;">
            <p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Refund Notice</p>
            <h1 style="font-size: 32px; margin: 0 0 30px 0;">Refund Processed</h1>
            
            <p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">Dear ${customerName},<br/><br/>A refund has been successfully initiated for your order <strong>#${orderId.slice(-6).toUpperCase()}</strong>.</p>
            
            <div style="border-top: 1px solid #EAEAEA; border-bottom: 1px solid #EAEAEA; padding: 40px 0; margin: 50px 0;">
              <p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888888;">Refund Amount</p>
              <h2 style="margin: 15px 0 0; font-size: 36px;">₹${refundAmount.toLocaleString('en-IN')}</h2>
            </div>
            
            <p style="font-size: 12px; color: #888888; font-style: italic; margin-bottom: 40px;">Please allow 5-7 business days for the amount to reflect in your original payment method.</p>
            
            <a href="https://raaghas.in/account" class="button-premium">View Account</a>
          </div>
    `;

    html = this.wrapEmailHtml(html);
    return this.sendCustomEmail(to, subject, html);
  }
}


