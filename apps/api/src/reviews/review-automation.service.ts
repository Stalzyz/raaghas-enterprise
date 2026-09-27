import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { GraftyService } from '../communication/grafty.service';
import { MailService } from '../mail/mail.service';
import { ReviewsService } from './reviews.service';

@Injectable()
export class ReviewAutomationService {
  private readonly logger = new Logger(ReviewAutomationService.name);

  constructor(
    private prisma: PrismaService,
    private graftyService: GraftyService,
    private mailService: MailService,
    private reviewsService: ReviewsService,
  ) {}

  // Automated trigger: Runs daily at 11:00 AM IST (prime interaction window)
  @Cron('0 11 * * *')
  async triggerDailyReviewRequests() {
    this.logger.log('Executing automated post-delivery customer review trigger...');
    return this.processEligibleOrders();
  }

  /**
   * Identifies delivered orders (2-7 days ago) that haven't received a review request yet
   * and dispatches a multi-channel prompt (WhatsApp + Branded Email) with 1-click magic link.
   */
  async processEligibleOrders(limit = 50) {
    // Deliveries between 2 days (48h) and 7 days ago
    const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const eligibleOrders = await this.prisma.order.findMany({
      where: {
        status: 'DELIVERED',
        updatedAt: { lte: twoDaysAgo, gte: sevenDaysAgo },
        activities: {
          none: { type: 'REVIEW_REQUEST_SENT' }
        }
      },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { select: { id: true, title: true, handle: true } }
              }
            }
          }
        },
        user: true
      },
      take: limit
    });

    this.logger.log(`Review Automation: Found ${eligibleOrders.length} orders eligible for review requests.`);
    let sentCount = 0;

    for (const order of eligibleOrders) {
      const sent = await this.sendReviewRequestForOrder(order);
      if (sent) sentCount++;
    }

    return { processed: eligibleOrders.length, sent: sentCount };
  }

  /**
   * Dispatches review request for a specific order (used by cron or manual trigger)
   */
  async sendReviewRequestForOrder(order: any): Promise<boolean> {
    const firstItem = order.items?.[0];
    const product = firstItem?.variant?.product;
    if (!product) return false;

    const token = this.reviewsService.generateReviewToken(order.id, product.id);
    const storefrontUrl = process.env.STOREFRONT_URL || 'https://raaghas.in';
    const reviewUrl = `${storefrontUrl}/products/${product.handle}?review=true&orderId=${order.id}&token=${token}`;

    const customerFirstName = order.customerName?.trim().split(' ')[0] || 'there';
    let dispatched = false;

    // 1. WhatsApp Notification via Grafty
    if (order.customerPhone) {
      try {
        const res = await this.graftyService.sendWhatsAppNudge({
          recipientPhone: order.customerPhone,
          recipientName: customerFirstName,
          event: 'POST_DELIVERY_REVIEW',
          templateName: 'raaghas_review_request',
          variables: [
            customerFirstName,
            product.title,
            reviewUrl
          ]
        });
        if (res.success) {
          dispatched = true;
          this.logger.log(`WhatsApp review request queued for order ${order.orderNumber || order.id} (${order.customerPhone})`);
        }
      } catch (err: any) {
        this.logger.warn(`WhatsApp review request error for order ${order.id}: ${err.message}`);
      }
    }

    // 2. Luxury Branded Email via MailService
    if (order.customerEmail) {
      try {
        const subject = `How does it look on you? Review your ${product.title} & enjoy ₹150 credit ✨`;
        const html = this.buildReviewEmailHtml(customerFirstName, product.title, reviewUrl);
        await this.mailService.sendCustomEmail(order.customerEmail, subject, html);
        dispatched = true;
        this.logger.log(`Email review request dispatched to ${order.customerEmail} for order ${order.orderNumber || order.id}`);
      } catch (err: any) {
        this.logger.warn(`Email review request error for order ${order.id}: ${err.message}`);
      }
    }

    // Record activity so this order is marked and never spammed again (idempotency)
    await this.prisma.orderActivity.create({
      data: {
        orderId: order.id,
        type: 'REVIEW_REQUEST_SENT',
        message: `Automated review request dispatched for ${product.title}`
      }
    }).catch(() => {});

    return dispatched;
  }

  private buildReviewEmailHtml(name: string, productTitle: string, reviewUrl: string): string {
    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 580px; margin: 0 auto; color: #1a1a1a; padding: 24px;">
        <div style="text-align: center; margin-bottom: 28px;">
          <p style="font-size: 11px; text-transform: uppercase; letter-spacing: 2.5px; color: #999; margin: 0 0 8px 0;">Raaghas Heritage & Elegance</p>
          <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 400; color: #111; margin: 0 0 10px 0;">How does it look on you?</h2>
          <p style="font-size: 14px; color: #555; line-height: 1.6; margin: 0;">
            Dear ${name}, we hope you love your <strong>${productTitle}</strong> as much as we loved weaving and crafting it for you.
          </p>
        </div>

        <!-- 1-Click Star Rating -->
        <div style="background: #FAF7F5; border-radius: 20px; padding: 32px 24px; text-align: center; margin-bottom: 24px; border: 1px solid #EFEAE5;">
          <p style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; color: #7B1C1C; margin: 0 0 16px 0;">Rate Your Purchase</p>
          <div style="font-size: 32px; letter-spacing: 12px; margin-bottom: 12px;">
            <a href="${reviewUrl}&rating=5" style="text-decoration: none; color: #D4AF37;">★</a>
            <a href="${reviewUrl}&rating=4" style="text-decoration: none; color: #D4AF37;">★</a>
            <a href="${reviewUrl}&rating=3" style="text-decoration: none; color: #D4AF37;">★</a>
            <a href="${reviewUrl}&rating=2" style="text-decoration: none; color: #D4AF37;">★</a>
            <a href="${reviewUrl}&rating=1" style="text-decoration: none; color: #D4AF37;">★</a>
          </div>
          <p style="font-size: 11px; color: #888; margin: 0;">Click any star to review in 30 seconds</p>
        </div>

        <!-- Wallet Incentive Banner -->
        <div style="background: #FFFFFF; border: 1.5px dashed #D4AF37; border-radius: 20px; padding: 24px; text-align: center; margin-bottom: 32px;">
          <span style="display: inline-block; background: #5B1425; color: #FFFFFF; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; padding: 4px 12px; border-radius: 20px; margin-bottom: 10px;">Exclusive Client Reward</span>
          <h3 style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; margin: 0 0 6px 0; color: #111;">Earn ₹150 Raaghas Wallet Credit</h3>
          <p style="font-size: 12px; color: #666; line-height: 1.6; margin: 0 0 18px 0;">
            Share a short review and a picture styling your outfit to receive ₹150 automatically credited into your Raaghas Luxe Wallet for your next celebration.
          </p>
          <a href="${reviewUrl}" style="display: inline-block; background: #5B1425; color: #FFFFFF; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 1.5px; padding: 14px 32px; border-radius: 8px; text-decoration: none;">Write Review & Claim ₹150</a>
        </div>

        <p style="font-size: 11px; color: #aaa; text-align: center; line-height: 1.6; margin: 0;">
          Need assistance or styling advice? Reply directly to this email or contact client care.
        </p>
      </div>
    `;
  }
}
