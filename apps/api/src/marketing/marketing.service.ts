import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OnEvent } from '@nestjs/event-emitter';
import { LeadStatus } from '@raaghas/database';
import { GraftyService } from '../communication/grafty.service';
import { MailService } from '../mail/mail.service';
import * as crypto from 'crypto';

export type NudgeTemplate = 'NUDGE_1' | 'NUDGE_2' | 'ORDER_CONFIRMED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED';

@Injectable()
export class MarketingService {
  private readonly logger = new Logger(MarketingService.name);

  constructor(
    private prisma: PrismaService,
    private graftyService: GraftyService,
    private mailService: MailService
  ) {}

  // ─── LEAD TRACKING ────────────────────────────────────────────────────────

  async trackOrUpdateLead(data: {
    phone?: string;
    email?: string;
    name?: string;
    cartTotal?: number;
    items?: any[];
  }) {
    const { phone, email, name, cartTotal, items } = data;
    const normalizedPhone = phone ? phone.replace(/\D/g, '').slice(-10) : undefined;
    const normalizedEmail = email ? email.toLowerCase().trim() : undefined;

    const existing = await this.prisma.checkoutLead.findFirst({
      where: {
        OR: [
          normalizedPhone ? { phone: { contains: normalizedPhone } } : undefined,
          normalizedEmail ? { email: normalizedEmail } : undefined,
        ].filter(Boolean) as any,
      },
    });

    if (existing) {
      return this.prisma.checkoutLead.update({
        where: { id: existing.id },
        data: {
          phone: phone || existing.phone,
          email: email || existing.email,
          cartTotal: cartTotal || (existing.cartTotal as any),
          items: (items || existing.items) as any,
          name: name || existing.name,
        } as any,
      });
    }

    return this.prisma.checkoutLead.create({
      data: {
        phone,
        email: email || undefined,
        name,
        cartTotal,
        items: items as any,
        status: LeadStatus.PENDING,
      } as any,
    });
  }


  async getLeads(filter?: { status?: LeadStatus }) {
    return this.prisma.checkoutLead.findMany({
      where: filter?.status ? { status: filter.status } : undefined,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    });
  }


  async getLeadStats() {
    const [total, pending, nudge1, nudge2, converted] = await Promise.all([
      this.prisma.checkoutLead.count(),
      this.prisma.checkoutLead.count({ where: { status: 'PENDING' } }),
      this.prisma.checkoutLead.count({ where: { status: 'NUDGE_1_SENT' } }),
      this.prisma.checkoutLead.count({ where: { status: 'NUDGE_2_SENT' } }),
      this.prisma.checkoutLead.count({ where: { status: 'CONVERTED' } }),
    ]);

    const conversionRate = total > 0 ? ((converted / total) * 100).toFixed(1) : '0';
    const potentialRevenue = await this.prisma.checkoutLead.aggregate({
      _sum: { cartTotal: true },
      where: { status: { in: ['PENDING', 'NUDGE_1_SENT', 'NUDGE_2_SENT'] } },
    });

    return {
      total,
      pending,
      nudge1Sent: nudge1,
      nudge2Sent: nudge2,
      converted,
      conversionRate: `${conversionRate}%`,
      potentialRevenue: Number(potentialRevenue._sum.cartTotal || 0),
    };
  }

  async markLeadConverted(phone: string) {
    // Normalize phone to match potential variations in DB
    const normalized = phone.replace(/\D/g, '');
    const searchTerms = [normalized];
    if (normalized.length === 10) searchTerms.push(`91${normalized}`);
    if (normalized.startsWith('91') && normalized.length === 12) searchTerms.push(normalized.substring(2));

    return this.prisma.checkoutLead.updateMany({
      where: { phone: { in: searchTerms } },
      data: { status: LeadStatus.CONVERTED },
    });
  }

  // ─── DISCOUNT VALIDATION ──────────────────────────────────────────────────

  async validateDiscount(code: string, cartTotal: number) {
    const discount = await this.prisma.discount.findUnique({
      where: { code: code.toUpperCase() },
    });

    if (!discount || !discount.isActive) {
      throw new Error('Invalid or expired discount code.');
    }
    if (discount.expiresAt && new Date(discount.expiresAt) < new Date()) {
      throw new Error('This discount code has expired.');
    }
    if (discount.usageLimit && discount.usedCount >= discount.usageLimit) {
      throw new Error('This discount code has reached its usage limit.');
    }
    if (discount.minOrderValue && cartTotal < Number(discount.minOrderValue)) {
      throw new Error(`Minimum order value of ₹${discount.minOrderValue} required.`);
    }

    const discountAmount =
      discount.type === 'PERCENTAGE'
        ? (cartTotal * Number(discount.value)) / 100
        : Number(discount.value);

    return {
      valid: true,
      message: `Code "${code}" applied — you save ₹${discountAmount.toFixed(0)}!`,
      discountAmount: Math.min(discountAmount, cartTotal),
      type: discount.type,
      value: discount.value,
    };
  }

  // ─── WHATSAPP NUDGE ENGINE ────────────────────────────────────────────────

  // ─── LEGACY WHATSAPP ENGINE REMOVED ───────────────────────────────────────
  // sendWhatsApp, getWhatsAppConfig, and buildNudgeMessage were removed.
  // We now route all WhatsApp communications through GraftyService using official templates.


  // ─── CRON: NUDGE 1 — 1 hour after abandonment ─────────────────────────────
  @Cron(CronExpression.EVERY_30_MINUTES)
  async processNudge1() {
    const cutoff = new Date(Date.now() - 60 * 60 * 1000); // 1hr ago
    const leads = await this.prisma.checkoutLead.findMany({
      where: {
        status: LeadStatus.PENDING,
        updatedAt: { lte: cutoff },
      },
      take: 20,
    });

    this.logger.log(`Nudge 1 cron: found ${leads.length} leads to process`);

    for (const lead of leads) {
      const name = lead.name?.split(' ')[0] || (lead as any).customerName?.split(' ')[0] || 'there';
      let nudgeSent = false;
      
      // WhatsApp Nudge
      if (lead.phone) {
        const result = await this.graftyService.sendAbandonedCartNudge(lead.phone, name, lead.id);
        if (result.success) nudgeSent = true;
      }

      // Email Nudge
      if (lead.email) {
        const itemCount = Array.isArray(lead.items) ? lead.items.length : 1;
        const recoveryLink = `${process.env.STOREFRONT_URL || 'https://raaghas.in'}/cart?recover=${lead.id}`;
        const emailResult = await this.mailService.sendAbandonedCartEmail(
          lead.email, 
          name, 
          lead.id,
          recoveryLink
        );
        if (emailResult?.success) nudgeSent = true;
      }

      if (nudgeSent) {
        await this.prisma.checkoutLead.update({
          where: { id: lead.id },
          data: { status: LeadStatus.NUDGE_1_SENT },
        });
      }
    }
  }

  // ─── CRON: NUDGE 2 — 24 hours after first nudge ───────────────────────────
  @Cron(CronExpression.EVERY_HOUR)
  async processNudge2() {
    this.logger.log(`Nudge 2 cron: Disabled per user request (only sending single nudge).`);
    return;
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24hrs ago
    const leads = await this.prisma.checkoutLead.findMany({
      where: {
        status: LeadStatus.NUDGE_1_SENT,
        updatedAt: { lte: cutoff },
      },
      take: 20,
    });

    this.logger.log(`Nudge 2 cron: Disabled per user request (only sending single nudge).`);
    return;
  }

  // ─── MANUAL TRIGGER (for Admin UI) ────────────────────────────────────────
  async sendManualNudge(leadId: string, template: NudgeTemplate) {
    const lead = await (this.prisma as any).checkoutLead.findUnique({
      where: { id: leadId },
    });
    if (!lead) throw new Error('Lead not found');

    const name = lead.name?.split(' ')[0] || (lead as any).customerName?.split(' ')[0] || 'there';
    
    let result;
    if (template === 'NUDGE_1') {
      result = await this.graftyService.sendAbandonedCartNudge(lead.phone, name, lead.id);
    } else {
      return { success: false, message: 'Nudge 2 is currently disabled or unsupported.' };
    }

    if (result.success) {
      const newStatus = template === 'NUDGE_1' ? LeadStatus.NUDGE_1_SENT : LeadStatus.NUDGE_2_SENT;
      await this.prisma.checkoutLead.update({
        where: { id: leadId },
        data: { status: newStatus },
      });
    }

    return { 
      success: result.success, 
      message: result.success ? 'Nudge sent!' : (result.reason || result.error || 'WhatsApp not configured or Meta auth failed.') 
    };
  }

  // ─── EVENT LISTENERS ──────────────────────────────────────────────────────
  
  @OnEvent('order.placed')
  async handleOrderPlaced(payload: { phone: string; name: string; orderId: string; amount: number }) {
    this.logger.log(`🔔 Order Placed Event received for ${payload.orderId}. Syncing to Grafty...`);
    
    // 1. Send WhatsApp Confirmation
    const order = await this.prisma.order.findUnique({
      where: { id: payload.orderId },
    });
    
    if (order) {
       await this.sendOrderNotification(order, 'ORDER_CONFIRMED');
    }

    // 2. Mark Lead as converted
    await this.markLeadConverted(payload.phone);

    // 3. Sync to Meta CAPI
    if (order) {
      this.syncEventToMetaCapi('Purchase', {
        orderId: payload.orderId,
        amount: payload.amount,
        phone: payload.phone,
        email: order.customerEmail,
        name: payload.name,
      }).catch(e => this.logger.error('Meta CAPI error', e));
    }
  }

  // ─── ORDER NOTIFICATIONS ──────────────────────────────────────────────────
  async sendOrderNotification(order: any, template: 'ORDER_CONFIRMED' | 'ORDER_SHIPPED' | 'ORDER_DELIVERED') {
    const phone = order.customerPhone || order.phone;
    if (!phone) {
      this.logger.warn(`No phone found for order ${order.id} — skipping WhatsApp notification`);
    }

    const name = order.customerName || order.name || 'there';
    const email = order.customerEmail || order.email;
    let success = false;
    
    // Also sync to Grafty for advanced flows
    if (template === 'ORDER_CONFIRMED') {
      if (phone) {
        this.syncEventToGrafty('order_created', {
          phone,
          name: order.customerName,
          email: order.customerEmail,
          attributes: {
            order_id: order.id,
            amount: order.totalAmount.toString(),
            city: (order.shippingAddress as any)?.city || 'Unknown'
          }
        }).catch(e => this.logger.error('Grafty sync failed', e));

        const res = await this.graftyService.sendOrderConfirmation(phone, name, order.id, order.totalAmount);
        success = res.success;
      }
    } else if (template === 'ORDER_SHIPPED') {
      if (phone) {
        const res = await this.graftyService.sendShippingUpdate(phone, name, order.id, order.trackingId || order.id);
        success = res.success;
      }
      if (email && order.trackingId) {
        await this.mailService.sendTrackingEmail(email, name, order.id, order.trackingId, order.carrierName || 'Courier')
          .catch(e => this.logger.error('Failed to send shipping email', e));
        success = true;
      }
    } else if (template === 'ORDER_DELIVERED') {
      if (phone) {
        // Grafty doesn't have a specific delivered template yet, but we can trigger a sync event
        this.syncEventToGrafty('order_delivered', {
          phone,
          name,
          email,
          attributes: { order_id: order.id }
        }).catch(e => this.logger.error('Grafty sync failed for delivery', e));
      }
      if (email) {
        const subject = `Your order ${order.id.slice(-8).toUpperCase()} has been delivered! 🎉`;
        const html = `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #4F46E5;">Delivered! 📦</h2>
            <p>Hi ${name},</p>
            <p>Great news! Your order <strong>#${order.id.slice(-8).toUpperCase()}</strong> has been successfully delivered.</p>
            <p>We hope you love your purchase. If you have any issues or questions, simply reply to this email.</p>
            <br/>
            <p>Thank you for shopping with us!</p>
            <p><strong>Raaghas</strong></p>
          </div>
        `;
        await this.mailService.sendCustomEmail(email, subject, html)
          .catch(e => this.logger.error('Failed to send delivery email', e));
        success = true;
      }
    }

    return success;
  }

  // ─── GRAFTY EVENT INTEGRATION ─────────────────────────────────────────────
  
  private async getGraftyConfig() {
    const settings = await this.prisma.storeSettings.findUnique({
      where: { id: 'global' },
    });
    return {
      apiUrl: settings?.graftyApiUrl || "https://grafty.pro/api/integrations/v1/event",
      apiKey: settings?.graftyApiKey,
      workspaceId: settings?.graftyWorkspaceId,
    };
  }

  async syncEventToGrafty(event: string, payload: {
    phone: string;
    name?: string;
    email?: string;
    attributes?: Record<string, any>;
  }) {
    const config = await this.getGraftyConfig();
    if (!config.apiKey || !config.workspaceId) {
      this.logger.warn(`Grafty integration not configured — skipping event: ${event}`);
      return false;
    }

    try {
      // Normalize phone for Grafty (usually 91 prefix)
      let normalizedPhone = payload.phone.replace(/\D/g, '');
      if (normalizedPhone.length === 10) normalizedPhone = `91${normalizedPhone}`;
      if (!normalizedPhone.startsWith('91')) normalizedPhone = `91${normalizedPhone}`;

      const body = {
        event,
        workspaceId: config.workspaceId,
        payload: {
          ...payload,
          phone: normalizedPhone,
        }
      };

      const resp = await fetch(config.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      if (!resp.ok) {
        const err = await resp.text();
        this.logger.error(`Grafty API error for ${event}: ${err}`);
        return false;
      }

      this.logger.log(`✅ Grafty event synced: ${event} for ${normalizedPhone}`);
      return true;
    } catch (err) {
      this.logger.error(`Grafty sync failed for ${event}:`, err);
      return false;
    }
  }

  // ─── META CONVERSIONS API ──────────────────────────────────────────────────
  
  private hashData(val: string): string {
    return crypto.createHash('sha256').update(val.trim().toLowerCase()).digest('hex');
  }

  async syncEventToMetaCapi(event: string, payload: {
    orderId: string;
    amount: number;
    phone?: string;
    email?: string;
    name?: string;
    currency?: string;
  }) {
    const settings = await this.prisma.storeSettings.findUnique({
      where: { id: 'global' },
    });

    const token = settings?.metaCapiToken;
    const pixelId = settings?.metaPixelId;

    if (!token || !pixelId) {
      this.logger.debug(`Meta CAPI not configured. Skipping event: ${event}`);
      return false;
    }

    try {
      let hashedPhone: string | undefined;
      let hashedEmail: string | undefined;
      let hashedFirstName: string | undefined;

      if (payload.phone) {
        let cleanPhone = payload.phone.replace(/\D/g, '');
        if (cleanPhone.length === 10) cleanPhone = `91${cleanPhone}`;
        hashedPhone = this.hashData(cleanPhone);
      }

      if (payload.email) {
        hashedEmail = this.hashData(payload.email);
      }

      if (payload.name) {
        const firstName = payload.name.split(' ')[0];
        hashedFirstName = this.hashData(firstName);
      }

      const body = {
        data: [
          {
            event_name: event,
            event_time: Math.floor(Date.now() / 1000),
            action_source: "website",
            user_data: {
              ...(hashedPhone ? { ph: [hashedPhone] } : {}),
              ...(hashedEmail ? { em: [hashedEmail] } : {}),
              ...(hashedFirstName ? { fn: [hashedFirstName] } : {}),
            },
            custom_data: {
              value: payload.amount,
              currency: payload.currency || 'INR',
              order_id: payload.orderId
            }
          }
        ]
      };

      const resp = await fetch(`https://graph.facebook.com/v19.0/${pixelId}/events?access_token=${token}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      if (!resp.ok) {
        const err = await resp.text();
        this.logger.error(`Meta CAPI API error for ${event}: ${err}`);
        return false;
      }

      this.logger.log(`✅ Meta CAPI event synced: ${event} for Order ${payload.orderId}`);
      return true;
    } catch (err) {
      this.logger.error(`Meta CAPI sync failed for ${event}:`, err);
      return false;
    }
  }

  // ─── DISCOUNT ENGINE CRUD ───────────────────────────────────────────────────

  async getAllDiscounts() {
    return this.prisma.discount.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createDiscount(data: any) {
    return this.prisma.discount.create({
      data: {
        code: data.code.toUpperCase().replace(/\s/g, ''),
        type: data.type,
        value: Number(data.value),
        minOrderValue: data.minOrderValue ? Number(data.minOrderValue) : null,
        usageLimit: data.maxUses ? Number(data.maxUses) : null,
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        isActive: true,
      } as any
    });
  }

  async deleteDiscount(id: string) {
    return this.prisma.discount.delete({
      where: { id }
    });
  }

  async toggleDiscountActive(id: string) {
    const discount = await this.prisma.discount.findUnique({ where: { id } });
    if (!discount) throw new Error('Discount not found');
    return this.prisma.discount.update({
      where: { id },
      data: { isActive: !discount.isActive }
    });
  }

  // ─── OFFER RULES CRUD ─────────────────────────────────────────────────────

  async getOfferRules() {
    return (this.prisma as any).offerRule.findMany({
      orderBy: { priority: 'desc' },
    });
  }

  async createOfferRule(data: {
    name: string;
    description?: string;
    priority?: number;
    isActive?: boolean;
    conditions: Record<string, any>;
    actions: Record<string, any>;
  }) {
    return (this.prisma as any).offerRule.create({
      data: {
        name: data.name,
        description: data.description,
        priority: data.priority ?? 0,
        isActive: data.isActive ?? true,
        conditions: data.conditions,
        actions: data.actions,
      },
    });
  }

  async updateOfferRule(id: string, data: Partial<{
    name: string;
    description: string;
    priority: number;
    isActive: boolean;
    conditions: Record<string, any>;
    actions: Record<string, any>;
  }>) {
    return (this.prisma as any).offerRule.update({
      where: { id },
      data,
    });
  }

  async deleteOfferRule(id: string) {
    return (this.prisma as any).offerRule.delete({ where: { id } });
  }

  // ─── META / FACEBOOK COMMERCE FEED ────────────────────────────────────────

  async generateFacebookXmlFeed(): Promise<string> {
    const products = await this.prisma.product.findMany({
      where: { status: 'Active' },
      include: {
        variants: true,
        images: { orderBy: { position: 'asc' }, take: 1 }
      }
    });

    let itemsXml = '';

    for (const p of products) {
      if (!p.variants || p.variants.length === 0) continue;

      const title = this.escapeXml(p.title);
      const description = this.escapeXml(p.description || p.title);
      const link = `https://raaghas.in/products/${p.handle}`;
      const imageLink = p.images && p.images.length > 0 ? this.escapeXml(p.images[0].url) : 'https://raaghas.in/logo-dark.svg';
      const brand = 'Raaghas';

      for (const variant of p.variants) {
        // Facebook requires unique IDs per variant if you sell variations
        const variantId = variant.id;
        const variantTitleParts = [variant.option1Value, variant.option2Value, variant.option3Value].filter(Boolean).join(' ');
        const variantTitle = this.escapeXml(`${p.title} ${variantTitleParts ? '- ' + variantTitleParts : ''}`);
        const inventory = variant.inventory > 0 ? 'in stock' : 'out of stock';
        const salePrice = variant.mrp && Number(variant.mrp) > Number(variant.price) 
          ? `<g:sale_price>${variant.price} INR</g:sale_price>` 
          : '';

        // If there's a specific price to show, we show the highest as standard, and sale as the current.
        const basePrice = variant.mrp || variant.price;

        itemsXml += `
    <item>
      <g:id>${variantId}</g:id>
      <g:title>${variantTitle}</g:title>
      <g:description>${description}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageLink}</g:image_link>
      <g:brand>${brand}</g:brand>
      <g:condition>new</g:condition>
      <g:availability>${inventory}</g:availability>
      <g:price>${basePrice} INR</g:price>
      ${salePrice}
      <g:item_group_id>${p.id}</g:item_group_id>
    </item>`;
      }
    }

    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Raaghas</title>
    <link>https://raaghas.in</link>
    <description>Raaghas Exclusive Product Catalogue</description>
    ${itemsXml}
  </channel>
</rss>`;

    return xml;
  }

  private escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case "'": return '&apos;';
        case '"': return '&quot;';
        default: return c;
      }
    });
  }
}
