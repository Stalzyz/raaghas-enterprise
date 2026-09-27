import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GraftyService {
  private readonly logger = new Logger(GraftyService.name);

  constructor(private config: ConfigService, private prisma: PrismaService) {}

  /**
   * Send an automated WhatsApp Template Message via Grafty
   * 
   * @param recipientPhone The customer's phone number with country code (e.g., +919876543210)
   * @param recipientName The customer's name
   * @param event The event type (e.g., ORDER_CREATED, ABANDONED_CART)
   * @param templateName The approved WhatsApp template name in Grafty
   * @param variables Array of variables to inject into the template body
   * @param buttonVariables Array of variables to inject into template buttons (optional)
   */
  async sendWhatsAppNudge({
    recipientPhone,
    recipientName,
    event,
    templateName,
    variables,
    buttonVariables = [],
  }: {
    recipientPhone: string;
    recipientName: string;
    event: string;
    templateName: string;
    variables: string[];
    buttonVariables?: string[];
  }) {
    const settings = await (this.prisma as any).storeSettings.findUnique({ where: { id: 'global' } });
    
    // Grafty credentials are saved under the whatsappApi* or graftyApi* fields by the Admin panel
    const rawUrl = settings?.whatsappApiUrl || settings?.graftyApiUrl || this.config.get<string>('GRAFTY_API_URL') || 'https://api.grafty.pro/v1';
    const graftyKey = settings?.whatsappApiKey || settings?.graftyApiKey || this.config.get<string>('GRAFTY_API_KEY');

    if (!rawUrl || !graftyKey) {
      this.logger.warn(`Skipping WhatsApp Nudge for ${event} - Grafty credentials missing in database/environment.`);
      return { success: false, reason: 'Missing credentials' };
    }

    // Format phone to standard E.164 without symbols
    let normalizedPhone = (recipientPhone || '').replace(/\D/g, '');
    if (normalizedPhone.length === 10) normalizedPhone = `91${normalizedPhone}`;
    if (!normalizedPhone.startsWith('91') && !normalizedPhone.startsWith('+')) normalizedPhone = `91${normalizedPhone}`;

    // Normalize endpoint URL
    const baseUrl = rawUrl.replace(/\/+$/, '');
    const sendEndpoint = baseUrl.includes('/messages/send-template')
      ? baseUrl
      : baseUrl.endsWith('/v1')
      ? `${baseUrl}/messages/send-template`
      : `${baseUrl}/api/v1/messages/send-template`;

    const payload = {
      recipient: {
        phone: normalizedPhone,
        name: recipientName,
      },
      event,
      template: {
        name: templateName,
        language: 'en',
        variables: {
          header: [],
          body: variables,
          buttons: buttonVariables,
        },
      },
    };

    try {
      this.logger.log(`Dispatching WhatsApp nudge [${templateName}] to ${normalizedPhone} via ${sendEndpoint}`);
      
      const response = await fetch(sendEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${graftyKey}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Grafty API rejected request: ${response.status} - ${errorText}`);
      }

      const data = await response.json().catch(() => ({ status: 'queued' }));
      this.logger.log(`WhatsApp nudge successfully queued by Grafty: ${JSON.stringify(data)}`);
      return { success: true, data };
    } catch (error) {
      this.logger.error(`Failed to send WhatsApp nudge to Grafty`, error);
      // We don't want to throw and break the main Raaghas flow (like checkout) if WhatsApp fails.
      return { success: false, error: error.message };
    }
  }

  /**
   * Test sending a verification ping / WhatsApp template to an admin or test number
   */
  async testConnection(testPhone: string, testName: string = 'Raaghas Admin') {
    return this.sendWhatsAppNudge({
      recipientPhone: testPhone,
      recipientName: testName,
      event: 'CONNECTION_TEST',
      templateName: 'order_confirmation_v1',
      variables: [testName, 'TEST-001', '₹1,000'],
      buttonVariables: ['TEST-001']
    });
  }

  // --- Helpers for specific events ---

  async sendOrderConfirmation(phone: string, name: string, orderId: string, amount: number) {
    return this.sendWhatsAppNudge({
      recipientPhone: phone,
      recipientName: name,
      event: 'ORDER_CREATED',
      templateName: 'order_confirmation_v1',
      variables: [
        name,
        orderId,
        `₹${amount.toLocaleString('en-IN')}`
      ],
      buttonVariables: [`track/${orderId}`]
    });
  }

  async sendShippingUpdate(
    phone: string, 
    name: string, 
    orderId: string, 
    trackingLink: string, 
    carrierName: string = 'Courier', 
    trackingId?: string
  ) {
    return this.sendWhatsAppNudge({
      recipientPhone: phone,
      recipientName: name,
      event: 'ORDER_SHIPPED',
      templateName: 'shipping_update_v1',
      variables: [
        name,
        orderId,
        carrierName,
        trackingId || orderId,
      ],
      buttonVariables: [trackingLink]
    });
  }

  async sendAbandonedCartNudge(phone: string, name: string, cartId: string) {
    return this.sendWhatsAppNudge({
      recipientPhone: phone,
      recipientName: name,
      event: 'ABANDONED_CART',
      templateName: 'abandan_cart_test',
      variables: [
        name,
      ],
      buttonVariables: [`cart/${cartId}`] // Adjust based on your actual route structure
    });
  }
}
