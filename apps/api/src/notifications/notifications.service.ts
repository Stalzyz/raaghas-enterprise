import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CommunicationService } from '../communication/communication.service';
import { OnEvent } from '@nestjs/event-emitter';
import * as Handlebars from 'handlebars';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private communicationService: CommunicationService,
  ) {}

  /**
   * Universal method to send an event-based notification
   */
  async notify(eventType: string, data: any, channels: ('EMAIL' | 'WHATSAPP')[] = ['EMAIL']) {
    for (const channel of channels) {
      if (channel === 'EMAIL') {
        await this.sendEmailNotification(eventType, data);
      }
      // Future: if (channel === 'WHATSAPP') await this.sendWhatsappNotification(eventType, data);
    }
  }

  private async sendEmailNotification(eventType: string, data: any) {
    try {
      // 1. Fetch template
      const template = await this.prisma.emailTemplate.findUnique({
        where: { type: eventType },
      });

      if (!template) {
        this.logger.warn(`No email template found for event type: ${eventType}`);
        return;
      }

      if (!template.isActive) {
        this.logger.log(`Email template for ${eventType} is inactive. Skipping.`);
        return;
      }

      // 1.5 Fetch Store Settings
      const storeSettings = await this.prisma.storeSettings.findUnique({ where: { id: 'global' } });
      const enrichedData = { ...data, store: storeSettings || {} };

      // 2. Compile with Handlebars
      const subjectTemplate = Handlebars.compile(template.subject);
      const bodyTemplate = Handlebars.compile(template.body);

      const subject = subjectTemplate(enrichedData);
      const html = bodyTemplate(enrichedData);

      const recipient = data.customer?.email || data.email || data.user?.email;

      if (!recipient) {
        this.logger.error(`Cannot send email for ${eventType}. No recipient email found in data payload.`);
        return;
      }

      // 3. Send Email
      await this.communicationService.sendEmail({
        to: recipient,
        subject,
        body: html,
        isHtml: true,
      });

      // 4. Log Success
      await this.logNotification({
        type: eventType,
        channel: 'EMAIL',
        recipient,
        status: 'SENT',
        referenceId: data.order?.id || data.referenceId,
      });

      this.logger.log(`Successfully sent ${eventType} email to ${recipient}`);
    } catch (error: any) {
      this.logger.error(`Failed to send ${eventType} email notification`, error?.stack || error);
      
      const recipient = data.customer?.email || data.email || data.user?.email || 'UNKNOWN';

      // Log Failure
      await this.logNotification({
        type: eventType,
        channel: 'EMAIL',
        recipient,
        status: 'FAILED',
        error: error.message || String(error),
        referenceId: data.order?.id || data.referenceId,
      });
    }
  }

  private async logNotification(data: { type: string, channel: string, recipient: string, status: string, error?: string, referenceId?: string }) {
    try {
      await this.prisma.notificationLog.create({
        data,
      });
    } catch (e) {
      this.logger.error('Failed to log notification', e);
    }
  }

  // --- TEMPLATE MANAGEMENT (CRUD) ---

  async getTemplates() {
    return this.prisma.emailTemplate.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async getTemplateById(id: string) {
    return this.prisma.emailTemplate.findUnique({ where: { id } });
  }

  async updateTemplate(id: string, data: { subject?: string, body?: string, isActive?: boolean, name?: string }) {
    return this.prisma.emailTemplate.update({
      where: { id },
      data,
    });
  }

  async createTemplate(data: { name: string, type: string, subject: string, body: string, isActive?: boolean }) {
    return this.prisma.emailTemplate.create({
      data,
    });
  }

  async seedTemplates() {
    // ─── Shared brand CSS & layout helpers ────────────────────────────────────
    const base = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Raaghas</title>
</head>
<body style="margin:0;padding:0;background:#F7F3EF;font-family:'Georgia',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3EF;padding:30px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07);">

        <!-- HEADER -->
        <tr>
          <td style="background:#ffffff;padding:28px 40px 20px;border-bottom:3px solid #7B1C1C;text-align:center;">
            <span style="font-family:'Georgia',serif;font-size:28px;font-weight:bold;color:#7B1C1C;letter-spacing:4px;text-transform:uppercase;">RAAGHAS</span>
            <div style="font-size:11px;color:#B8860B;letter-spacing:3px;margin-top:4px;text-transform:uppercase;">The Art of Tradition</div>
          </td>
        </tr>

        <!-- BODY -->
        <tr><td style="padding:40px 48px;">${content}</td></tr>

        <!-- FOOTER -->
        <tr>
          <td style="background:#2C1010;padding:28px 40px;text-align:center;">
            <div style="margin-bottom:16px;">
              <a href="https://instagram.com/raaghas.in" style="display:inline-block;margin:0 8px;color:#B8860B;font-size:12px;text-decoration:none;letter-spacing:1px;">Instagram</a>
              <span style="color:#7B1C1C;">|</span>
              <a href="https://facebook.com/raaghas" style="display:inline-block;margin:0 8px;color:#B8860B;font-size:12px;text-decoration:none;letter-spacing:1px;">Facebook</a>
              <span style="color:#7B1C1C;">|</span>
              <a href="https://wa.me/919876543210" style="display:inline-block;margin:0 8px;color:#B8860B;font-size:12px;text-decoration:none;letter-spacing:1px;">WhatsApp</a>
            </div>
            <div style="font-size:11px;color:#888;line-height:1.8;">
              © ${new Date().getFullYear()} Raaghas — All rights reserved<br/>
              <a href="https://raaghas.in" style="color:#B8860B;text-decoration:none;">raaghas.in</a>
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

    const btn = (url: string, label: string, bg = '#7B1C1C') =>
      `<div style="text-align:center;margin:28px 0;">
        <a href="${url}" style="display:inline-block;background:${bg};color:#ffffff;padding:14px 36px;border-radius:8px;font-size:14px;font-weight:bold;text-decoration:none;letter-spacing:1px;">${label}</a>
      </div>`;

    const divider = `<div style="border-top:1px solid #F0E8E0;margin:28px 0;"></div>`;

    const greeting = (name: string) =>
      `<p style="font-size:16px;color:#3D1515;margin-bottom:8px;">Dear <strong>{{${name}}}</strong>,</p>`;

    const sign = `<p style="font-size:14px;color:#666;margin-top:32px;line-height:1.8;">With warmth,<br/><strong style="color:#7B1C1C;">The Raaghas Team</strong></p>`;

    const orderBox = (fields: { label: string; value: string }[]) => `
      <div style="background:#FBF7F3;border:1px solid #E8D8C8;border-radius:12px;padding:20px 28px;margin:24px 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          ${fields.map(f => `
          <tr>
            <td style="font-size:13px;color:#888;padding:6px 0;">${f.label}</td>
            <td style="font-size:13px;color:#2C1010;font-weight:bold;text-align:right;padding:6px 0;">${f.value}</td>
          </tr>`).join('')}
        </table>
      </div>`;

    // ─── 1. ACCOUNT CONFIRMATION ──────────────────────────────────────────────
    const accountConfirmBody = base(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;">🌸</div>
        <h1 style="font-size:24px;color:#7B1C1C;margin:8px 0;letter-spacing:1px;">Welcome to Raaghas!</h1>
        <p style="color:#B8860B;font-size:13px;letter-spacing:2px;text-transform:uppercase;">Your account is confirmed</p>
      </div>
      ${greeting('customerName')}
      <p style="font-size:15px;color:#444;line-height:1.8;">We're so glad you're here. Your Raaghas account has been successfully created. You're now part of a community that celebrates the timeless beauty of Indian luxury fashion.</p>
      <p style="font-size:15px;color:#444;line-height:1.8;">Start exploring our curated collections — from everyday elegance to occasion wear, all crafted with care.</p>
      ${btn('https://raaghas.in/collections/all', 'Explore Collections')}
      ${divider}
      <p style="font-size:13px;color:#888;line-height:1.8;">If you didn't create this account, please ignore this email or contact us at <a href="mailto:support@raaghas.in" style="color:#7B1C1C;">support@raaghas.in</a>.</p>
      ${sign}
    `);

    // ─── 2. ORDER CONFIRMATION ────────────────────────────────────────────────
    const orderConfirmBody = base(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;">🛍️</div>
        <h1 style="font-size:24px;color:#7B1C1C;margin:8px 0;letter-spacing:1px;">Order Confirmed!</h1>
        <p style="color:#888;font-size:13px;">We've received your order and we're on it.</p>
      </div>
      ${greeting('customerName')}
      <p style="font-size:15px;color:#444;line-height:1.8;">Thank you for shopping with us! Your order has been confirmed and is being carefully prepared. We'll notify you as soon as it's on its way.</p>
      ${orderBox([
        { label: 'Order ID', value: '#{{order.shortId}}' },
        { label: 'Order Date', value: '{{order.date}}' },
        { label: 'Items', value: '{{order.itemCount}} item(s)' },
        { label: 'Total', value: '₹{{order.totalAmount}}' },
        { label: 'Payment Method', value: '{{order.paymentMethod}}' },
        { label: 'Shipping To', value: '{{order.shippingCity}}' },
      ])}
      ${btn('https://raaghas.in/account/orders', 'Track My Order')}
      <p style="font-size:13px;color:#888;line-height:1.8;text-align:center;">Estimated delivery: <strong>{{order.estimatedDelivery}}</strong></p>
      ${divider}
      <p style="font-size:13px;color:#888;line-height:1.8;">Questions? We're just an email away — <a href="mailto:support@raaghas.in" style="color:#7B1C1C;">support@raaghas.in</a></p>
      ${sign}
    `);

    // ─── 3. ORDER FAILED ──────────────────────────────────────────────────────
    const orderFailedBody = base(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;">😟</div>
        <h1 style="font-size:24px;color:#7B1C1C;margin:8px 0;letter-spacing:1px;">Order Could Not Be Placed</h1>
        <p style="color:#888;font-size:13px;">Don't worry — your items are still waiting.</p>
      </div>
      ${greeting('customerName')}
      <p style="font-size:15px;color:#444;line-height:1.8;">We're sorry, but we were unable to complete your order <strong>#{{order.shortId}}</strong> due to a technical issue. No amount has been charged to you.</p>
      ${orderBox([
        { label: 'Order Reference', value: '#{{order.shortId}}' },
        { label: 'Reason', value: '{{order.failureReason}}' },
      ])}
      <p style="font-size:15px;color:#444;line-height:1.8;">Your cart has been saved — you can pick up right where you left off.</p>
      ${btn('https://raaghas.in/cart', 'Return to Cart')}
      ${divider}
      <p style="font-size:13px;color:#888;line-height:1.8;">If you continue to face issues, please reach out to us at <a href="mailto:support@raaghas.in" style="color:#7B1C1C;">support@raaghas.in</a> or WhatsApp us and we'll sort it out personally.</p>
      ${sign}
    `);

    // ─── 4. PAYMENT FAILED ────────────────────────────────────────────────────
    const paymentFailedBody = base(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;">⚠️</div>
        <h1 style="font-size:24px;color:#7B1C1C;margin:8px 0;letter-spacing:1px;">Payment Unsuccessful</h1>
        <p style="color:#888;font-size:13px;">Your order is safe — let's try again.</p>
      </div>
      ${greeting('customerName')}
      <p style="font-size:15px;color:#444;line-height:1.8;">Your payment of <strong>₹{{payment.amount}}</strong> for order <strong>#{{order.shortId}}</strong> could not be processed. This can happen due to network timeouts, card limits, or bank blocks.</p>
      ${orderBox([
        { label: 'Order ID', value: '#{{order.shortId}}' },
        { label: 'Amount', value: '₹{{payment.amount}}' },
        { label: 'Payment Method', value: '{{payment.method}}' },
        { label: 'Failure Reason', value: '{{payment.failureReason}}' },
      ])}
      <p style="font-size:15px;color:#444;line-height:1.8;"><strong>No amount has been deducted.</strong> If you did see a deduction, it will be automatically reversed within 5–7 business days.</p>
      ${btn('https://raaghas.in/account/orders/{{order.id}}', 'Retry Payment')}
      ${divider}
      <p style="font-size:13px;color:#888;line-height:1.8;">Need help? Contact us at <a href="mailto:support@raaghas.in" style="color:#7B1C1C;">support@raaghas.in</a></p>
      ${sign}
    `);

    // ─── 5. OFFER / PROMOTIONAL EMAIL ─────────────────────────────────────────
    const offerEmailBody = base(`
      <div style="background:linear-gradient(135deg,#7B1C1C,#2C1010);border-radius:12px;padding:36px 32px;text-align:center;margin-bottom:32px;">
        <div style="font-size:11px;color:#B8860B;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">{{offer.tag}}</div>
        <h1 style="font-size:30px;color:#ffffff;margin:0;line-height:1.3;">{{offer.headline}}</h1>
        <p style="font-size:14px;color:#E8C8A8;margin:12px 0 0;">{{offer.subheadline}}</p>
      </div>
      ${greeting('customerName')}
      <p style="font-size:15px;color:#444;line-height:1.8;">{{offer.bodyText}}</p>
      <div style="background:#FBF7F3;border:2px dashed #B8860B;border-radius:12px;padding:24px;text-align:center;margin:28px 0;">
        <p style="margin:0;font-size:12px;color:#888;letter-spacing:3px;text-transform:uppercase;">Your Exclusive Code</p>
        <h2 style="font-size:32px;color:#7B1C1C;letter-spacing:6px;margin:10px 0;font-family:monospace;">{{offer.couponCode}}</h2>
        <p style="margin:0;font-size:14px;color:#444;font-weight:bold;">{{offer.discountLabel}}</p>
        <p style="margin:8px 0 0;font-size:12px;color:#999;">Valid till {{offer.validTill}}</p>
      </div>
      ${btn('https://raaghas.in/collections/all?coupon={{offer.couponCode}}', '🛍️ Shop Now & Save')}
      ${divider}
      <p style="font-size:12px;color:#aaa;text-align:center;line-height:1.8;">Terms & conditions apply. Cannot be combined with other offers. Applicable on orders above ₹{{offer.minOrderValue}}.</p>
      ${sign}
    `);

    // ─── 6. ABANDONED CART (Step 1 — Reminder, Step 2 — Discount) ────────────
    const abandonedReminderBody = base(`
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:48px;">🛒</div>
        <h1 style="font-size:24px;color:#7B1C1C;margin:8px 0;letter-spacing:1px;">You left something behind!</h1>
        <p style="color:#888;font-size:13px;">Your cart is missing you.</p>
      </div>
      ${greeting('customerName')}
      <p style="font-size:15px;color:#444;line-height:1.8;">We noticed you left <strong>{{cart.itemCount}} item(s)</strong> in your cart. They're still available, but stock is limited — don't miss out!</p>
      <div style="background:#FBF7F3;border:1px solid #E8D8C8;border-radius:12px;padding:24px;margin:24px 0;">
        <p style="margin:0 0 12px;font-size:13px;font-weight:bold;color:#7B1C1C;text-transform:uppercase;letter-spacing:1px;">Your Cart Items</p>
        {{#each cart.items}}
        <div style="display:flex;justify-content:space-between;padding:10px 0;border-bottom:1px solid #F0E8E0;">
          <span style="font-size:14px;color:#2C1010;">{{this.name}} <span style="color:#888;font-size:12px;">× {{this.qty}}</span></span>
          <span style="font-size:14px;color:#7B1C1C;font-weight:bold;">₹{{this.price}}</span>
        </div>
        {{/each}}
        <div style="text-align:right;margin-top:12px;font-size:15px;color:#2C1010;font-weight:bold;">Total: ₹{{cart.totalAmount}}</div>
      </div>
      ${btn('https://raaghas.in/cart', 'Complete My Purchase')}
      ${divider}
      <p style="font-size:13px;color:#888;text-align:center;line-height:1.8;">Need help deciding? WhatsApp us and we'll help you find the perfect fit.</p>
      ${sign}
    `);

    const abandonedDiscountBody = base(`
      <div style="background:linear-gradient(135deg,#7B1C1C,#2C1010);border-radius:12px;padding:32px;text-align:center;margin-bottom:32px;">
        <div style="font-size:11px;color:#B8860B;letter-spacing:4px;text-transform:uppercase;margin-bottom:8px;">Just for you</div>
        <h1 style="font-size:26px;color:#ffffff;margin:0;">Here's {{cart.discountPercent}}% OFF to complete your order</h1>
        <p style="font-size:13px;color:#E8C8A8;margin:10px 0 0;">Offer expires in 24 hours</p>
      </div>
      ${greeting('customerName')}
      <p style="font-size:15px;color:#444;line-height:1.8;">We really don't want you to miss out on the items you loved. As a small token, here's an exclusive <strong>{{cart.discountPercent}}% discount</strong> just for you.</p>
      <div style="background:#FBF7F3;border:2px dashed #B8860B;border-radius:12px;padding:24px;text-align:center;margin:24px 0;">
        <p style="margin:0;font-size:12px;color:#888;letter-spacing:3px;text-transform:uppercase;">Your Exclusive Code</p>
        <h2 style="font-size:30px;color:#7B1C1C;letter-spacing:5px;margin:10px 0;font-family:monospace;">{{cart.couponCode}}</h2>
        <p style="margin:0;font-size:13px;color:#666;">{{cart.discountPercent}}% OFF · Valid for 24 hours only</p>
      </div>
      ${btn('https://raaghas.in/cart?coupon={{cart.couponCode}}', '🎁 Claim My Discount')}
      ${divider}
      <p style="font-size:12px;color:#aaa;text-align:center;">Cart value: ₹{{cart.totalAmount}} · {{cart.itemCount}} item(s) · Offer valid for 24 hours</p>
      ${sign}
    `);

    const DEFAULT_TEMPLATES = [
      {
        name: 'Account Confirmation',
        type: 'ACCOUNT_CONFIRMED',
        subject: 'Welcome to Raaghas, {{customerName}}! Your account is ready 🌸',
        body: accountConfirmBody,
        isActive: true,
      },
      {
        name: 'Order Confirmation',
        type: 'ORDER_PLACED',
        subject: 'Your order #{{order.shortId}} is confirmed! 🛍️',
        body: orderConfirmBody,
        isActive: true,
      },
      {
        name: 'Order Failed',
        type: 'ORDER_FAILED',
        subject: 'We could not place your order #{{order.shortId}}',
        body: orderFailedBody,
        isActive: true,
      },
      {
        name: 'Payment Failed',
        type: 'PAYMENT_FAILED',
        subject: 'Payment unsuccessful for order #{{order.shortId}}',
        body: paymentFailedBody,
        isActive: true,
      },
      {
        name: 'Offer / Promotional Email',
        type: 'PROMOTIONAL_OFFER',
        subject: '{{offer.headline}} — Exclusive offer inside 🎁',
        body: offerEmailBody,
        isActive: true,
      },
      {
        name: 'Abandoned Cart — Reminder',
        type: 'CART_ABANDONED_REMINDER',
        subject: '{{customerName}}, you left {{cart.itemCount}} item(s) in your cart 🛒',
        body: abandonedReminderBody,
        isActive: true,
      },
      {
        name: 'Abandoned Cart — Discount',
        type: 'CART_ABANDONED_DISCOUNT',
        subject: '{{cart.discountPercent}}% OFF just for you — complete your order before it expires! ⏳',
        body: abandonedDiscountBody,
        isActive: true,
      },
      // Keep existing templates
      {
        name: 'Order Shipped',
        type: 'ORDER_SHIPPED',
        subject: 'Your order #{{order.shortId}} is on its way! 🚚',
        body: base(`
          <div style="text-align:center;margin-bottom:24px;">
            <div style="font-size:48px;">🚚</div>
            <h1 style="font-size:24px;color:#7B1C1C;margin:8px 0;letter-spacing:1px;">Your Order Has Shipped!</h1>
            <p style="color:#888;font-size:13px;">Sit back and relax — it's on its way.</p>
          </div>
          ${greeting('customerName')}
          <p style="font-size:15px;color:#444;line-height:1.8;">Great news! Your order <strong>#{{order.shortId}}</strong> has been dispatched and is headed your way.</p>
          ${orderBox([
            { label: 'Tracking Number', value: '{{order.trackingId}}' },
            { label: 'Carrier', value: '{{order.carrierName}}' },
            { label: 'Expected Delivery', value: '{{order.estimatedDelivery}}' },
          ])}
          ${btn('{{order.trackingUrl}}', '📦 Track My Package')}
          ${divider}
          ${sign}
        `),
        isActive: true,
      },
      {
        name: 'Return Approved',
        type: 'RETURN_APPROVED',
        subject: 'Your return for order #{{order.shortId}} has been approved ✅',
        body: base(
          greeting('customerName') +
          '<h1 style="font-size:24px;color:#7B1C1C;margin:8px 0;">Return Approved ✅</h1>' +
          '<p style="font-size:15px;color:#444;line-height:1.8;">Your return for order <strong>#{{order.shortId}}</strong> has been approved. Our courier will pick up within 2–3 business days. Refund will be processed within 5–7 working days.</p>' +
          divider + sign
        ),
        isActive: true,
      },
      // ─── 9. REFERRAL EARNED ──────────────────────────────────────────────────
      {
        name: 'Referral Reward Earned',
        type: 'REFERRAL_EARNED',
        subject: '🎉 You earned ₹{{rewardAmount}} — your referral just made a purchase!',
        body: base(
          '<div style="text-align:center;margin-bottom:24px;"><div style="font-size:48px;">🎁</div>' +
          '<h1 style="font-size:24px;color:#7B1C1C;margin:8px 0;">You earned a reward!</h1>' +
          '<p style="color:#888;font-size:13px;">Your friend just shopped at Raaghas.</p></div>' +
          greeting('customerName') +
          '<p style="font-size:15px;color:#444;line-height:1.8;">Great news! <strong>{{refereeName}}</strong> completed their first purchase using your referral. We\'ve credited your wallet!</p>' +
          '<div style="background:#FBF7F3;border:2px solid #B8860B;border-radius:12px;padding:28px;text-align:center;margin:28px 0;">' +
          '<p style="margin:0;font-size:12px;color:#888;letter-spacing:3px;text-transform:uppercase;">Wallet Credited</p>' +
          '<h2 style="font-size:36px;color:#7B1C1C;margin:12px 0;">₹{{rewardAmount}}</h2>' +
          '<p style="margin:0;font-size:14px;color:#666;">added to your Raaghas wallet</p></div>' +
          btn('https://raaghas.in/account', '💰 View My Wallet') +
          divider + sign
        ),
        isActive: true,
      },
      // ─── 10. WELCOME OFFER ───────────────────────────────────────────────────
      {
        name: 'Welcome Offer',
        type: 'WELCOME_OFFER',
        subject: '🌸 Welcome to Raaghas, {{customerName}}! Here\'s a gift for you',
        body: base(
          '<div style="background:linear-gradient(135deg,#7B1C1C,#2C1010);border-radius:12px;padding:36px 32px;text-align:center;margin-bottom:32px;">' +
          '<div style="font-size:11px;color:#B8860B;letter-spacing:4px;text-transform:uppercase;margin-bottom:12px;">Welcome Gift</div>' +
          '<h1 style="font-size:28px;color:#ffffff;margin:0;">You\'re officially part of the Raaghas family!</h1>' +
          '<p style="font-size:14px;color:#E8C8A8;margin:12px 0 0;">Here\'s a special gift to get you started</p></div>' +
          greeting('customerName') +
          '<p style="font-size:15px;color:#444;line-height:1.8;">Welcome to Raaghas! As a thank-you for joining, here\'s an exclusive discount just for you:</p>' +
          '<div style="background:#FBF7F3;border:2px dashed #B8860B;border-radius:12px;padding:24px;text-align:center;margin:28px 0;">' +
          '<p style="margin:0;font-size:12px;color:#888;letter-spacing:3px;text-transform:uppercase;">Your Welcome Code</p>' +
          '<h2 style="font-size:32px;color:#7B1C1C;letter-spacing:6px;margin:10px 0;font-family:monospace;">{{couponCode}}</h2>' +
          '<p style="margin:0;font-size:14px;color:#444;font-weight:bold;">{{discountValue}} OFF your first order</p>' +
          '<p style="margin:8px 0 0;font-size:12px;color:#999;">Valid for 30 days from today</p></div>' +
          btn('https://raaghas.in/collections/all', '🛍️ Start Shopping') +
          divider +
          '<p style="font-size:12px;color:#aaa;text-align:center;line-height:1.8;">Valid on orders above ₹499. One-time use only.</p>' +
          sign
        ),
        isActive: true,
      },
    ];

    let created = 0;
    let updated = 0;
    for (const template of DEFAULT_TEMPLATES) {
      const existing = await this.prisma.emailTemplate.findUnique({ where: { type: template.type } });
      if (existing) {
        await this.prisma.emailTemplate.update({
          where: { type: template.type },
          data: { name: template.name, subject: template.subject, body: template.body, isActive: template.isActive },
        });
        updated++;
      } else {
        await this.prisma.emailTemplate.create({ data: template });
        created++;
      }
    }

    return { message: `Templates seeded: ${created} created, ${updated} updated.` };
  }

  // --- EVENT LISTENERS ---

  // @OnEvent('order.placed')
  // handleOrderPlaced(payload: any) {
  //   this.logger.log(`Received order.placed event for Order ${payload.orderId}`);
  //   this.notify('ORDER_PLACED', payload, ['EMAIL']);
  // }

  @OnEvent('order.failed')
  handleOrderFailed(payload: any) {
    this.logger.log(`Received order.failed event for Order ${payload.order?.id}`);
    this.notify('ORDER_FAILED', payload, ['EMAIL']);
  }

  @OnEvent('order.shipped')
  handleOrderShipped(payload: any) {
    this.logger.log(`Received order.shipped event for Order ${payload.order?.id}`);
    this.notify('ORDER_SHIPPED', payload, ['EMAIL']);
  }

  @OnEvent('payment.failed')
  handlePaymentFailed(payload: any) {
    this.logger.log(`Received payment.failed event for Order ${payload.order?.id}`);
    this.notify('PAYMENT_FAILED', payload, ['EMAIL']);
  }

  @OnEvent('return.approved')
  handleReturnApproved(payload: any) {
    this.logger.log(`Received return.approved event for Return ${payload.returnObj?.id}`);
    this.notify('RETURN_APPROVED', payload, ['EMAIL']);
  }

  @OnEvent('user.confirmed')
  handleUserConfirmed(payload: any) {
    this.logger.log(`Received user.confirmed event for user ${payload.userId}`);
    this.notify('ACCOUNT_CONFIRMED', payload, ['EMAIL']);
  }

  @OnEvent('cart.abandoned')
  handleCartAbandoned(payload: any) {
    this.logger.log(`Received cart.abandoned event — step ${payload.step}`);
    const type = payload.step === 2 ? 'CART_ABANDONED_DISCOUNT' : 'CART_ABANDONED_REMINDER';
    this.notify(type, payload, ['EMAIL']);
  }
}
