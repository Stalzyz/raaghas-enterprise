import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { WalletTxType, WalletTxReason, ReferralStatus, DiscountType } from '@raaghas/database';
import { Prisma } from '@raaghas/database';
const { Decimal } = Prisma;
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';

@Injectable()
export class GrowthService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
  ) {}

  @OnEvent('user.created')
  async handleUserSignup(user: any) {
    // Fetch Global Settings for Welcome Discount
    const settings = await this.settingsService.getSettings();
    const discountVal = Number(settings.welcomeDiscountPercent || 10.00);

    // 1. Ensure a single master Welcome Coupon exists
    const couponCode = `WELCOME${discountVal}`;
    let coupon = await this.prisma.discount.findUnique({ where: { code: couponCode } });
    
    if (!coupon) {
      coupon = await this.prisma.discount.create({
        data: {
          code: couponCode,
          type: 'PERCENTAGE',
          value: new Decimal(discountVal),
          isActive: true,
          usageLimitPerUser: 1,
          usageLimit: 100000,
          startDate: new Date(),
          // No expiration date set
        }
      });
    }

    // 2. Trigger Welcome Notification
    await this.notificationsService.notify('WELCOME_OFFER', {
      customerName: user.name || user.email.split('@')[0],
      email: user.email,
      couponCode: coupon.code,
      discountValue: `${discountVal}%`
    });

    // 3. FIX: Auto-track referral if user signed up with a referral code
    if (user.referredByCode) {
      try {
        await this.trackReferral(user.id, user.referredByCode);
      } catch (e) {
        // Non-blocking: log but do not fail user creation
        console.warn(`[Referral] Auto-track failed for user ${user.id}:`, e?.message);
      }
    }
  }

  // ─── MODULE 1: COUPONS & OFFERS ─────────────────────────────────────────────

  async getAllCoupons() {
    return this.prisma.discount.findMany({
      orderBy: { createdAt: 'desc' }
    });
  }

  async createCoupon(data: any) {
    return this.prisma.discount.create({
      data: {
        code: data.code.toUpperCase(),
        type: data.type,
        value: new Decimal(data.value),
        minOrderValue: data.minOrderValue ? new Decimal(data.minOrderValue) : null,
        maxDiscount: data.maxDiscount ? new Decimal(data.maxDiscount) : null,
        usageLimit: data.usageLimit,
        usageLimitPerUser: data.usageLimitPerUser || 1,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        applicableProducts: data.applicableProducts || [],
        applicableCategories: data.applicableCategories || [],
        isStackable: data.isStackable || false,
        autoApply: data.autoApply || false,
        minQuantity: data.minQuantity ? parseInt(data.minQuantity, 10) : null,
      },
    });
  }

  async toggleCouponStatus(id: string) {
    const coupon = await this.prisma.discount.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.prisma.discount.update({
      where: { id },
      data: { isActive: !coupon.isActive }
    });
  }

  async updateCoupon(id: string, data: any) {
    const coupon = await this.prisma.discount.findUnique({ where: { id } });
    if (!coupon) throw new NotFoundException('Coupon not found');
    return this.prisma.discount.update({
      where: { id },
      data: {
        code: data.code ? data.code.toUpperCase() : undefined,
        type: data.type,
        value: data.value ? new Decimal(data.value) : undefined,
        minOrderValue: data.minOrderValue ? new Decimal(data.minOrderValue) : null,
        maxDiscount: data.maxDiscount ? new Decimal(data.maxDiscount) : null,
        usageLimit: data.usageLimit,
        usageLimitPerUser: data.usageLimitPerUser,
        startDate: data.startDate ? new Date(data.startDate) : null,
        endDate: data.endDate ? new Date(data.endDate) : null,
        autoApply: data.autoApply,
        minQuantity: data.minQuantity ? parseInt(data.minQuantity, 10) : null,
      }
    });
  }

  async deleteCoupon(id: string) {
    await this.prisma.discountUsage.deleteMany({ where: { discountId: id } });
    return this.prisma.discount.delete({ where: { id } });
  }

  async validateCoupon(code: string, userId: string | undefined, cartValue: number, items: any[]) {
    const coupon = await this.prisma.discount.findUnique({
      where: { code: code.toUpperCase() },
      include: { usages: userId ? { where: { userId } } : false }
    });

    if (!coupon || !coupon.isActive) throw new BadRequestException('Invalid or inactive coupon');
    
    const now = new Date();
    if (coupon.startDate && now < coupon.startDate) throw new BadRequestException('Coupon not yet active');
    if (coupon.endDate && now > coupon.endDate) throw new BadRequestException('Coupon expired');
    
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) throw new BadRequestException('Usage limit reached');
    if (coupon.usages && coupon.usages.length >= coupon.usageLimitPerUser) throw new BadRequestException('You have already used this coupon');

    // Strict First Order Guard
    const upperCode = code.toUpperCase();
    if (upperCode.startsWith('WELCOME') || upperCode.startsWith('FIRST')) {
      if (!userId) {
        throw new BadRequestException('You must be logged in to use this coupon.');
      }
      const pastOrders = await this.prisma.order.count({
        where: {
          userId,
          status: { notIn: ['FAILED', 'CANCELLED'] } // Consider anything pending or confirmed as a past order attempt
        }
      });
      if (pastOrders > 0) {
        throw new BadRequestException('This offer is only valid for your first purchase.');
      }
    }
    
    if (coupon.minOrderValue && cartValue < Number(coupon.minOrderValue)) {
      throw new BadRequestException(`Minimum order value of ₹${coupon.minOrderValue} required`);
    }

    // Check product/category applicability
    if (coupon.applicableProducts.length > 0 || coupon.applicableCategories.length > 0) {
      const isApplicable = items.some(item => 
        coupon.applicableProducts.includes(item.productId) || 
        (item.product?.categories && item.product.categories.some((c: any) => coupon.applicableCategories.includes(c.id)))
      );
      if (!isApplicable) throw new BadRequestException('Coupon not applicable to items in cart');
    }

    if (coupon.minQuantity && coupon.minQuantity > 0) {
      let relevantQty = 0;
      if (coupon.applicableProducts.length > 0 || coupon.applicableCategories.length > 0) {
        const relevantItems = items.filter(item => 
          coupon.applicableProducts.includes(item.productId) || 
          (item.product?.categories && item.product.categories.some((c: any) => coupon.applicableCategories.includes(c.id)))
        );
        relevantQty = relevantItems.reduce((sum, item) => sum + item.quantity, 0);
      } else {
        relevantQty = items.reduce((sum, item) => sum + item.quantity, 0);
      }

      if (relevantQty < coupon.minQuantity) {
        throw new BadRequestException(`Minimum quantity of ${coupon.minQuantity} required`);
      }
    }

    let discountAmount = 0;
    if (coupon.type === 'PERCENTAGE') {
      discountAmount = (cartValue * Number(coupon.value)) / 100;
      if (coupon.maxDiscount) discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
    } else if (coupon.type === 'FIXED_AMOUNT') {
      discountAmount = Number(coupon.value);
    }

    return { coupon, discountAmount };
  }

  async getAutoApplicableDiscount(cartValue: number, items: any[], userId?: string) {
    const now = new Date();
    // Get all active autoApply coupons
    const autoCoupons = await this.prisma.discount.findMany({
      where: {
        isActive: true,
        autoApply: true,
        OR: [
          { startDate: null },
          { startDate: { lte: now } }
        ],
        AND: [
          { OR: [{ endDate: null }, { endDate: { gte: now } }] }
        ]
      }
    });

    let bestDiscount: any = null;
    let maxDiscountAmount = 0;

    for (const coupon of autoCoupons) {
      try {
        const { discountAmount } = await this.validateCoupon(coupon.code, userId, cartValue, items);
        if (discountAmount > maxDiscountAmount) {
          maxDiscountAmount = discountAmount;
          bestDiscount = { coupon, discountAmount };
        }
      } catch (e) {
        // Skip this coupon if validation fails
      }
    }

    return bestDiscount;
  }

  // Automated Offer Engine
  async evaluateOffers(cartValue: number, items: any[], userId?: string) {
    const rules = await this.prisma.offerRule.findMany({
      where: { isActive: true },
      orderBy: { priority: 'desc' }
    });

    const eligibleOffers: any[] = [];
    for (const rule of rules) {
      const cond = rule.conditions as any;
      const act = rule.actions as any;

      // Simple condition checks
      if (cond.minCartValue && cartValue < cond.minCartValue) continue;
      if (cond.userType === 'new' && userId) {
        const orderCount = await this.prisma.order.count({ where: { userId } });
        if (orderCount > 0) continue;
      }
      // Add more complex condition logic here (categories, product match etc)

      eligibleOffers.push(rule);
    }

    return eligibleOffers;
  }

  // ─── MODULE 2: WALLET ───────────────────────────────────────────────────────

  async getWallet(userId: string) {
    let wallet = await this.prisma.wallet.findUnique({
      where: { userId },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 20 } }
    });

    if (!wallet) {
      wallet = await this.prisma.wallet.create({
        data: { userId, balance: 0 },
        include: { transactions: true }
      });
    }
    return wallet;
  }

  async getWalletsByUserIds(userIds: string[]) {
    const wallets = await this.prisma.wallet.findMany({
      where: { userId: { in: userIds } },
      include: { transactions: { orderBy: { createdAt: 'desc' }, take: 5 } }
    });
    return wallets;
  }

  async adjustWallet(userId: string, amount: number, type: WalletTxType, reason: WalletTxReason, referenceId?: string, notes?: string) {
    const wallet = await this.getWallet(userId);
    
    // Guard against overdraft for DEBIT transactions
    if (type === 'DEBIT' && Number(wallet.balance) < amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update balance atomically
      const updatedWallet = await tx.wallet.update({
        where: { userId },
        data: { 
          balance: type === 'CREDIT' ? { increment: amount } : { decrement: amount }
        }
      });

      // 2. Double-check balance didn't go negative (guard against concurrent debit race)
      if (Number(updatedWallet.balance) < 0) {
        throw new BadRequestException('Concurrent adjustment caused insufficient balance');
      }

      // 3. Create Transaction Log
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: new Decimal(amount),
          type,
          reason,
          referenceId,
          notes
        }
      });

      return updatedWallet;
    });
  }

  // ─── MODULE 3: REFERRALS ────────────────────────────────────────────────────

  async getReferralStats() {
    const totalReferrals = await this.prisma.referral.count();
    
    // Count unique referrers
    const uniqueReferrers = await this.prisma.referral.groupBy({
      by: ['referrerId'],
    });
    
    // Sum total rewards issued
    const rewards = await this.prisma.referral.aggregate({
      _sum: {
        rewardAmount: true,
      },
      where: {
        status: 'COMPLETED'
      }
    });

    return {
      totalReferrals,
      activeReferrers: uniqueReferrers.length,
      rewardsIssued: Number(rewards._sum.rewardAmount || 0)
    };
  }


  async generateReferralCode(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (user?.referralCode) return user.referralCode;

    // FIX: Retry up to 5 times to guarantee uniqueness
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = `RG${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      const existing = await this.prisma.user.findFirst({ where: { referralCode: code } });
      if (!existing) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { referralCode: code }
        });
        return code;
      }
    }
    throw new Error('Failed to generate unique referral code after 5 attempts');
  }

  async trackReferral(refereeId: string, referralCode: string) {
    const referrer = await this.prisma.user.findUnique({ where: { referralCode } });
    if (!referrer) return null;
    if (referrer.id === refereeId) throw new BadRequestException('Cannot refer yourself');

    const existing = await this.prisma.referral.findUnique({ where: { refereeId } });
    if (existing) return existing;

    return this.prisma.referral.create({
      data: {
        referrerId: referrer.id,
        refereeId,
        status: 'PENDING'
      }
    });
  }

  async processReferralReward(refereeId: string, orderId: string) {
    const referral = await this.prisma.referral.findUnique({ 
      where: { refereeId },
      include: { referrer: true }
    });

    if (!referral || referral.status !== 'PENDING') return;

    // Fetch the order to calculate reward based on value
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) return;

    // Fetch dynamic percentage from settings
    const settings = await this.settingsService.getSettings();
    const rewardPercent = Number(settings.referralRewardPercent || 10.00) / 100;

    // IMPROVISATION: Dynamic % of order value
    const orderTotal = Number(order.totalAmount);
    const REWARD_AMOUNT = Math.floor(orderTotal * rewardPercent); 

    if (REWARD_AMOUNT <= 0) return;

    const referee = await this.prisma.user.findUnique({ where: { id: refereeId } });
    const refereeName = referee?.name || order.customerName || 'A friend';
    const displayPercent = Math.round(rewardPercent * 100);

    await this.prisma.$transaction(async (tx) => {
      await tx.referral.update({
        where: { id: referral.id },
        data: { status: 'COMPLETED', rewardAmount: new Decimal(REWARD_AMOUNT), orderId }
      });
      
      let wallet = await tx.wallet.findUnique({ where: { userId: referral.referrerId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId: referral.referrerId, balance: 0 } });
      }
      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: REWARD_AMOUNT } }
      });

      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: new Decimal(REWARD_AMOUNT),
          type: 'CREDIT',
          reason: 'REFERRAL_REWARD',
          referenceId: orderId,
          status: 'COMPLETED',
          notes: `Referral reward (${displayPercent}%) for order #${order.formattedOrderNumber || order.orderNumber || orderId.substring(0, 8)} by ${refereeName}`
        }
      });
    });

    // Send Notification to Referrer (non-blocking — after transaction committed)
    await this.notificationsService.notify('REFERRAL_EARNED', {
      email: referral.referrer.email,
      customerName: referral.referrer.name || 'Partner',
      rewardAmount: REWARD_AMOUNT,
      refereeName: order.customerName
    }).catch(e => console.error('[Referral] Notification failed:', e?.message));
  }

  async revokeReferralReward(orderId: string) {
    const referral = await this.prisma.referral.findFirst({
      where: { orderId, status: 'COMPLETED' }
    });

    if (!referral || !referral.rewardAmount) return;
    const rewardToDeduct = referral.rewardAmount;

    await this.prisma.$transaction(async (tx) => {
      // 1. Reset referral
      await tx.referral.update({
        where: { id: referral.id },
        data: { status: 'PENDING', rewardAmount: null, orderId: null }
      });

      // 2. Deduct from wallet
      let wallet = await tx.wallet.findUnique({ where: { userId: referral.referrerId } });
      if (!wallet) return;

      const currentBalance = Number(wallet.balance);
      const deductAmount = Math.min(currentBalance, Number(rewardToDeduct));

      if (deductAmount > 0) {
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { decrement: deductAmount } }
        });

        // 3. Log transaction
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: deductAmount,
            type: 'DEBIT',
            reason: 'MANUAL_ADJUSTMENT',
            referenceId: orderId,
            status: 'COMPLETED',
            notes: `Referral reward clawback for cancelled order ${orderId.substring(0, 8)}`
          }
        });
      }
    });
    
    console.log(`[Referral] Revoked reward for order ${orderId}`);
  }

  // ─── MODULE 4: LOYALTY & STORE CREDIT ────────────────────────────────────────

  async processLoyaltyPoints(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId }
    });

    if (!order) return;

    // Fetch Global Settings for Loyalty
    const settings = await this.settingsService.getSettings();
    const minOrderValue = Number(settings.loyaltyMinOrderValue || 0.00);
    const pointsRate = Number(settings.loyaltyPointsRate || 1.00);

    const orderTotal = Number(order.totalAmount);

    // 1. Eligibility Check
    if (orderTotal < minOrderValue) {
      return; // Order value is too low to earn points
    }

    // 2. Calculate Points (Rate is points per 100 Rs spent)
    const earnedPoints = Math.floor((orderTotal / 100) * pointsRate);

    if (earnedPoints <= 0) return;

    await this.prisma.$transaction(async (tx) => {
      // 3. Add points to User's Wallet
      let wallet = await tx.wallet.findUnique({ where: { userId } });
      if (!wallet) {
        wallet = await tx.wallet.create({ data: { userId, balance: 0 } });
      }

      await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: { increment: earnedPoints } }
      });

      // 4. Log the transaction in the Wallet ledger
      await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          amount: new Decimal(earnedPoints),
          type: 'CREDIT',
          reason: 'LOYALTY_REWARD',
          referenceId: orderId,
          notes: `Earned ${earnedPoints} points from Order #${order.formattedOrderNumber || order.orderNumber || orderId.substring(0, 8)}`
        }
      });
    });

    // Optionally notify the user they earned points
    // await this.notificationsService.notify(...)
  }

  async revokeLoyaltyPoints(userId: string, orderId: string) {
    await this.prisma.$transaction(async (tx) => {
      // Find the original credit transaction for this order
      const originalReward = await tx.walletTransaction.findFirst({
        where: {
          wallet: { userId },
          referenceId: orderId,
          type: 'CREDIT',
          reason: 'LOYALTY_REWARD'
        }
      });

      if (!originalReward) {
        return; // No points were awarded, nothing to revoke
      }

      // Check if we already revoked it to prevent double-revocation
      const alreadyRevoked = await tx.walletTransaction.findFirst({
        where: {
          wallet: { userId },
          referenceId: orderId,
          type: 'DEBIT',
          reason: 'MANUAL_ADJUSTMENT'
        }
      });

      if (alreadyRevoked) {
        return;
      }

      // Deduct the points from wallet
      await tx.wallet.update({
        where: { id: originalReward.walletId },
        data: { balance: { decrement: originalReward.amount } }
      });

      // Log the revocation
      await tx.walletTransaction.create({
        data: {
          walletId: originalReward.walletId,
          amount: originalReward.amount,
          type: 'DEBIT',
          reason: 'MANUAL_ADJUSTMENT',
          referenceId: orderId,
          notes: `Revoked ${originalReward.amount} points due to cancellation of Order #${orderId.substring(0, 8)}`
        }
      });
      
      console.log(`Revoked ${originalReward.amount} loyalty points from user ${userId} for cancelled order ${orderId}`);
    });
  }
}
