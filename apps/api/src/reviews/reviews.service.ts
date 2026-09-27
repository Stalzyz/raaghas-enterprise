import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GrowthService } from '../growth/growth.service';
import { MailService } from '../mail/mail.service';
import { WalletTxType, WalletTxReason } from '@raaghas/database';
import * as crypto from 'crypto';

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private prisma: PrismaService,
    private growthService: GrowthService,
    private mailService: MailService,
  ) {}

  /**
   * Generates a tamper-proof 16-character HMAC token for order-bound 1-click review links
   */
  generateReviewToken(orderId: string, productId: string): string {
    const secret = process.env.JWT_SECRET || 'raaghas-luxe-secret-2026';
    return crypto
      .createHmac('sha256', secret)
      .update(`${orderId}:${productId}`)
      .digest('hex')
      .slice(0, 16);
  }

  /**
   * Verifies an order review token against the expected HMAC
   */
  verifyReviewToken(orderId: string, productId: string, token: string): boolean {
    if (!orderId || !productId || !token) return false;
    const expected = this.generateReviewToken(orderId, productId);
    try {
      return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
    } catch {
      return false;
    }
  }

  async getModerationQueue() {
    return this.prisma.review.findMany({
      include: {
        product: {
          select: { id: true, title: true, handle: true }
        },
        user: {
          select: { id: true, name: true, email: true }
        },
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Approves or rejects a review.
   * When approved, automatically credits ₹150 into the verified customer's Luxe Wallet (once).
   */
  async moderateReview(id: string, approved: boolean) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: true,
        product: { select: { title: true } }
      }
    });
    if (!review) throw new NotFoundException('Review not found');

    const updated = await this.prisma.review.update({
      where: { id },
      data: { approved }
    });

    // Reward verified customer with ₹150 Luxe Wallet Credit if approved
    if (approved && review.userId) {
      try {
        const alreadyRewarded = await this.prisma.walletTransaction.findFirst({
          where: {
            referenceId: review.id,
            reason: WalletTxReason.MANUAL_ADJUSTMENT
          }
        });

        if (!alreadyRewarded) {
          const rewardAmount = 150;
          await this.growthService.adjustWallet(
            review.userId,
            rewardAmount,
            WalletTxType.CREDIT,
            WalletTxReason.MANUAL_ADJUSTMENT,
            review.id,
            `Verified review reward for ${review.product?.title || 'product'}`
          );
          this.logger.log(`Awarded ₹${rewardAmount} wallet credit to user ${review.userId} for review ${review.id}`);

          // Send confirmation email
          if (review.user?.email) {
            const subject = `You earned ₹${rewardAmount} Raaghas Luxe Wallet Credit! ✨`;
            const html = `
              <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 580px; margin: 0 auto; color: #333; padding: 24px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <h2 style="font-family: Georgia, serif; font-size: 24px; color: #5B1425; margin: 0 0 8px 0;">Thank You for Your Review!</h2>
                  <p style="font-size: 13px; color: #666; margin: 0;">Your review for <strong>${review.product?.title || 'your purchase'}</strong> has been verified & published.</p>
                </div>
                <div style="background: #FAF7F5; border: 1px solid #EFEAE4; border-radius: 16px; padding: 24px; text-align: center; margin: 24px 0;">
                  <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #888;">Luxe Wallet Credit Added</span>
                  <div style="font-size: 36px; font-weight: bold; color: #5B1425; margin: 8px 0;">₹${rewardAmount}</div>
                  <p style="font-size: 12px; color: #666; margin: 0;">Your credit has been added to your Raaghas Luxe Wallet and will automatically apply at your next checkout.</p>
                </div>
                <p style="font-size: 12px; color: #888; text-align: center;">Warm regards,<br/><strong>Team Raaghas</strong></p>
              </div>
            `;
            await this.mailService.sendCustomEmail(review.user.email, subject, html)
              .catch(err => this.logger.warn(`Failed sending review reward email: ${err.message}`));
          }
        }
      } catch (err: any) {
        this.logger.error(`Error processing review wallet credit for ${review.id}: ${err.message}`);
      }
    }

    return updated;
  }

  async deleteReview(id: string) {
    const review = await this.prisma.review.findUnique({ where: { id } });
    if (!review) throw new NotFoundException('Review not found');

    return this.prisma.review.delete({ where: { id } });
  }

  async getProductReviews(productId: string) {
    return this.prisma.review.findMany({
      where: { productId, approved: true },
      include: {
        user: { select: { name: true } },
        images: true
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Validates if a user/order is eligible to review a product.
   * Can be checked via logged-in userId OR orderId + token.
   */
  async checkEligibility(productId: string, userId?: string, orderId?: string, token?: string): Promise<boolean> {
    // 1. Magic Link / Order token verification
    if (orderId && token) {
      if (!this.verifyReviewToken(orderId, productId, token)) {
        return false;
      }
      const item = await this.prisma.orderItem.findFirst({
        where: {
          orderId,
          variant: { productId },
          order: {
            status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
          }
        }
      });
      return !!item;
    }

    // 2. Standard authenticated customer check
    if (userId) {
      const hasPurchased = await this.prisma.orderItem.findFirst({
        where: {
          variant: { productId },
          order: {
            userId: userId,
            status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
          }
        }
      });
      return !!hasPurchased;
    }

    return false;
  }

  /**
   * Creates a review. Supports both authenticated customers and 1-click magic order links.
   */
  async createReview(data: any, userId?: string) {
    if (!data.productId) {
      throw new BadRequestException('Product ID is required');
    }

    let verifiedUserId = userId;

    // 1. If orderId + token provided, verify magic link
    if (data.orderId && data.token) {
      const isValid = this.verifyReviewToken(data.orderId, data.productId, data.token);
      if (!isValid) {
        throw new BadRequestException('Invalid or expired review link');
      }

      const orderItem = await this.prisma.orderItem.findFirst({
        where: {
          orderId: data.orderId,
          variant: { productId: data.productId },
          order: {
            status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
          }
        },
        include: { order: true }
      });

      if (!orderItem) {
        throw new BadRequestException('This order does not contain this product or is not completed.');
      }

      verifiedUserId = verifiedUserId || orderItem.order.userId || undefined;
    } else if (verifiedUserId) {
      const hasPurchased = await this.prisma.orderItem.findFirst({
        where: {
          variant: { productId: data.productId },
          order: {
            userId: verifiedUserId,
            status: { in: ['CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED'] }
          }
        }
      });

      if (!hasPurchased) {
        throw new BadRequestException('You can only review items you have bought from us.');
      }
    } else {
      throw new BadRequestException('Please log in or use your order review link to submit a review.');
    }

    // Prevent duplicate reviews for the same product by the same user
    if (verifiedUserId) {
      const existing = await this.prisma.review.findFirst({
        where: { productId: data.productId, userId: verifiedUserId }
      });
      if (existing) {
        throw new BadRequestException('You have already submitted a review for this product.');
      }
    }

    return this.prisma.review.create({
      data: {
        rating: Math.min(5, Math.max(1, Number(data.rating) || 5)),
        headline: data.headline || null,
        content: data.content,
        productId: data.productId,
        userId: verifiedUserId,
        approved: false, // Moderation queue by default
        images: Array.isArray(data.images) && data.images.length > 0
          ? {
              create: data.images.map((url: string, index: number) => ({
                url,
                position: index,
                altText: 'Customer review photo'
              }))
            }
          : undefined
      },
      include: {
        images: true
      }
    });
  }
}
