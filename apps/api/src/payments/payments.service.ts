import { Injectable, Logger, BadRequestException, NotFoundException, OnModuleInit, forwardRef, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { OrdersService } from '../orders/orders.service';
import { MarketingService } from '../marketing/marketing.service';
import { GrowthService } from '../growth/growth.service';
import { LedgerService } from '../analytics/ledger.service';
import { MailService } from '../mail/mail.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Prisma } from '@raaghas/database';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { WebhookQueueService } from './webhook-queue.service';
const Decimal = (Prisma as any).Decimal;
type OrderStatus = any;
const OS = {
  PAYMENT_PENDING: 'PAYMENT_PENDING' as any,
  CONFIRMED: 'CONFIRMED' as any,
  CANCELLED: 'CANCELLED' as any,
  FAILED: 'FAILED' as any,
};

@Injectable()
export class PaymentsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private marketingService: MarketingService,
    private growthService: GrowthService,
    private eventEmitter: EventEmitter2,
    @Inject(forwardRef(() => OrdersService)) private ordersService: OrdersService,
    private webhookQueue: WebhookQueueService,
    private ledgerService: LedgerService,
    private mailService: MailService,
  ) {}


  // Register payment event handlers once at startup
  onModuleInit() {
    // Razorpay: payment captured (= payment success)
    this.webhookQueue.register('RAZORPAY', 'payment.captured', async (payload) => {
      const { payload: rzpPayload } = payload;
      const paymentEntity = rzpPayload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (!orderId) throw new Error('Missing order_id in Razorpay payment.captured payload');
      this.logger.log(`🪝 Processing Razorpay payment.captured for order: ${orderId}`);
      // Find corresponding pending order and confirm it
      try {
        const order = await this._confirmOrderFromWebhook(orderId, paymentEntity?.id, 'RAZORPAY');
        return { orderId: 'id' in order ? order.id : (order as any).orderId };
      } catch (err: any) {
        if (err.message?.includes('LATE_PAYMENT_REFUND_REQUIRED:')) {
          const match = err.message.match(/LATE_PAYMENT_REFUND_REQUIRED:([0-9.]+)/);
          if (match && paymentEntity?.id) {
            const amount = parseFloat(match[1]);
            this.logger.warn(`Initiating auto-refund for late Razorpay payment ${paymentEntity.id} (Order ${orderId}) for ₹${amount}`);
            await this.processAutomatedRefund(paymentEntity.id, amount, 'RAZORPAY').catch(e => this.logger.error('Auto-refund failed:', e));
            return { refunded: true, orderId };
          }
        }
        throw err;
      }
    });

    // Razorpay: payment failed
    this.webhookQueue.register('RAZORPAY', 'payment.failed', async (payload) => {
      const { payload: rzpPayload } = payload;
      const paymentEntity = rzpPayload?.payment?.entity;
      const orderId = paymentEntity?.order_id;
      if (!orderId) throw new Error('Missing order_id in Razorpay payment.failed payload');
      this.logger.warn(`🪝 Processing Razorpay payment.failed for order: ${orderId}`);
      await this.cancelIntent(orderId);
      return {};
    });

    // PhonePe: payment success
    this.webhookQueue.register('PHONEPE', 'PAYMENT_SUCCESS', async (payload) => {
      const txnId = payload?.data?.merchantTransactionId;
      if (!txnId) throw new Error('Missing merchantTransactionId in PhonePe payload');
      this.logger.log(`🪝 Processing PhonePe PAYMENT_SUCCESS for txn: ${txnId}`);
      try {
        const order = await this._confirmOrderFromWebhook(txnId, payload?.data?.transactionId, 'PHONEPE');
        return { orderId: 'id' in order ? order.id : (order as any).orderId };
      } catch (err: any) {
        if (err.message?.includes('LATE_PAYMENT_REFUND_REQUIRED:')) {
          const match = err.message.match(/LATE_PAYMENT_REFUND_REQUIRED:([0-9.]+)/);
          if (match && payload?.data?.transactionId) {
            const amount = parseFloat(match[1]);
            this.logger.warn(`Initiating auto-refund for late PhonePe payment ${payload.data.transactionId} (Txn ${txnId}) for ₹${amount}`);
            await this.processAutomatedRefund(payload.data.transactionId, amount, 'PHONEPE').catch(e => this.logger.error('Auto-refund failed:', e));
            return { refunded: true, txnId };
          }
        }
        throw err;
      }
    });

    this.logger.log('✅ Webhook handlers registered: RAZORPAY[payment.captured, payment.failed], PHONEPE[PAYMENT_SUCCESS]');
  }

  private async getRazorpayInstance() {
    const s = await this._getSettings();
    const key_id = s?.razorpayKeyId;
    const key_secret = s?.razorpayKeySecret;
    
    if (!key_id || !key_secret) {
      this.logger.error('Razorpay credentials missing in Store Settings. Check Admin -> Settings -> Payments.');
      throw new BadRequestException('Payment gateway not configured in store settings.');
    }
    
    this.logger.log(`Initializing Razorpay with Key ID: ${key_id.substring(0, 8)}...`);
    return new Razorpay({ key_id, key_secret });
  }

  private async _getSettings() {
    return (this.prisma as any).storeSettings.findUnique({ where: { id: 'global' } }) as any;
  }

  // ─── SAGA: PHASE 1 — Create Order & Payment Intent ──────────────────────
  // This is IDEMPOTENT. If the same idempotencyKey is used, we return the existing pending order.

  async createCheckoutSession(data: {
    items: { variantId: string; quantity: number }[];
    shippingAddress: any;
    billingAddress?: any;
    customerInfo: { name: string; email: string; phone: string };
    discountCode?: string;
    useWalletCredits?: boolean;
    gateway: 'RAZORPAY' | 'PHONEPE';
    clerkId?: string;
    idempotencyKey?: string; // Client-side generated UUID
    shippingCost?: number;
    shippingMethodId?: string;
  }) {
    const ikey = data.idempotencyKey || `checkout_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    
    // 1. Idempotency Check: Return existing pending order if found
    const existingIntent = await (this.prisma as any).paymentIntent.findFirst({
        where: { 
          OR: [
            { metadata: { path: ['idempotencyKey'], equals: ikey } },
            { providerOrderId: ikey }
          ]
        }
    });

    if (existingIntent && existingIntent.status === 'PENDING') {
      this.logger.log(`Resuming existing session for key: ${ikey}`);
      const settings = await this._getSettings();
      return { 
        success: true, 
        providerOrderId: existingIntent.providerOrderId,
        netPayable: Number(existingIntent.amount),
        existing: true,
        paymentPayload: {
          rzpOrderId: existingIntent.providerOrderId,
          amountInPaise: Math.round(Number(existingIntent.amount) * 100),
          keyId: settings?.razorpayKeyId || process.env.RAZORPAY_KEY_ID
        }
      };
    }

    const settings = await this._getSettings();

    // 2. Validate Items & Prices
    let baseTotal = 0;
    let totalTaxAmount = 0;
    let extraTaxToCharge = 0;
    const orderItems: any[] = [];
    for (const item of data.items) {
      const variant = await this.prisma.variant.findUnique({
        where: { id: item.variantId },
        include: { product: true }
      });
      // BUG-011 FIX: Null guard on variant.product
      if (!variant || !variant.product?.published) throw new BadRequestException(`Product ${variant?.sku || item.variantId} is unavailable.`);
      
      const itemPrice = Number(variant.price);
      let itemTaxForLedger = 0;
      let itemExtraTax = 0;
      
      const isTaxInclusive = variant.product.taxInclusive ?? true;
      const taxRate = Number(variant.product.taxRate ?? 5);
      
      if (taxRate > 0) {
        if (isTaxInclusive) {
          itemTaxForLedger = itemPrice - (itemPrice / (1 + (taxRate / 100)));
        } else {
          itemTaxForLedger = itemPrice * (taxRate / 100);
          itemExtraTax = itemTaxForLedger;
        }
      }
      
      baseTotal += itemPrice * item.quantity;
      extraTaxToCharge += itemExtraTax * item.quantity;
      totalTaxAmount += itemTaxForLedger * item.quantity;
      
      orderItems.push({ 
        variantId: item.variantId, 
        quantity: item.quantity, 
        price: itemPrice,
        taxAmount: itemTaxForLedger 
      });
    }

    // 3. Marketing & Wallet
    let discountAmount = 0;
    const userId = (data as any).userId || data.clerkId;
    const autoDiscount = await this.growthService.getAutoApplicableDiscount(baseTotal, data.items, userId);
    let bestDiscountCode = data.discountCode;

    if (data.discountCode) {
      try {
        const v = await this.growthService.validateCoupon(data.discountCode, userId, baseTotal, data.items);
        discountAmount = v.discountAmount;
        
        if (autoDiscount && autoDiscount.discountAmount > discountAmount) {
          discountAmount = autoDiscount.discountAmount;
          bestDiscountCode = autoDiscount.coupon.code;
        }
      } catch (e) {
        if (autoDiscount) {
          discountAmount = autoDiscount.discountAmount;
          bestDiscountCode = autoDiscount.coupon.code;
        } else {
          throw e;
        }
      }
    } else if (autoDiscount) {
      discountAmount = autoDiscount.discountAmount;
      bestDiscountCode = autoDiscount.coupon.code;
    }

    let walletCreditUsed = 0;
    if (data.useWalletCredits && (data as any).userId) {
      const user = await this.prisma.user.findUnique({ 
        where: { id: (data as any).userId }, 
        include: { wallet: true } 
      });

      if (user?.wallet) {
        const maxAllowedBySetting = baseTotal * (Number(settings?.maxCreditUsagePercent || 50) / 100);
        const maxNeededForOrder = Math.max(0, baseTotal - discountAmount);
        const maxAllowed = Math.min(maxAllowedBySetting, maxNeededForOrder);
        walletCreditUsed = Math.min(Number(user.wallet.balance), maxAllowed);
      }
    }

    const shippingCost = Math.max(0, Number(data.shippingCost) || 0);
    const netPayable = Math.max(0, baseTotal - discountAmount - walletCreditUsed) + extraTaxToCharge + shippingCost;

    // 4. ATOMIC ORDER CREATION (PAYMENT_PENDING State)
    // We create the order BEFORE the gateway call so we have a record even if the user drops off.
    const result = await this.prisma.$transaction(async (tx) => {
      // 4a. Reserve Inventory (Serialized via Advisory Lock)
      const reservationIds: string[] = [];
      for (const item of data.items) {
        const res = await this.inventoryService.reserveStock({
          variantId: item.variantId,
          quantity: item.quantity,
          orderIntentId: ikey, // Temporary link until we get Gateway ID
          expiresInMinutes: 30,
        }, tx);
        reservationIds.push(res.id);
      }

      // 4b. Create Order in PAYMENT_PENDING
      const order = await this.ordersService.createPendingOrder({
        clerkId: data.clerkId,
        userId: (data as any).userId,
        customerName: data.customerInfo.name,
        customerEmail: data.customerInfo.email,
        customerPhone: data.customerInfo.phone,
        totalAmount: netPayable,
        shippingAddress: data.shippingAddress,
        billingAddress: data.billingAddress,
        items: orderItems,
        taxes: totalTaxAmount,
        discountCode: bestDiscountCode,
        discountAmount,
        walletCreditUsed,
        shippingCost,
        shippingMethodId: data.shippingMethodId,
        idempotencyKey: ikey,
      }, tx);

      return { order, reservationIds };
    });

    // 5. Gateway Handshake (or Free Order Path)
    let providerOrderId = '';
    let paymentPayload: any;

    try {
      if (netPayable === 0) {
        // Path A: Free Order (100% Wallet/Discount)
        providerOrderId = `FREE_${result.order.id}`;
        paymentPayload = { freeOrder: true };
      } else if (data.gateway === 'RAZORPAY') {
        // Path B: Razorpay
        const rzp = await this.getRazorpayInstance();
        const rzpOrder = await rzp.orders.create({
          amount: Math.round(netPayable * 100),
          currency: 'INR',
          receipt: result.order.id,
        });
        providerOrderId = rzpOrder.id;
        paymentPayload = { rzpOrderId: rzpOrder.id, amountInPaise: rzpOrder.amount, keyId: settings?.razorpayKeyId || process.env.RAZORPAY_KEY_ID };
      } else if (data.gateway === 'PHONEPE') {
        const merchantId = settings?.phonepeMerchantId;
        const saltKey = settings?.phonepeSaltKey;
        const saltIndex = settings?.phonepeSaltIndex || '1';
        
        if (!merchantId || !saltKey) {
          this.logger.error('PhonePe credentials missing in Store Settings.');
          throw new BadRequestException('PhonePe gateway not configured.');
        }

        const txnId = `PP_${Date.now()}`;
        const apiUrl = settings?.apiUrl || process.env.API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in');
        const frontUrl = settings?.storefrontUrl || process.env.FRONTEND_URL || 'https://raaghas.in';

        const ppPayload = {
          merchantId,
          merchantTransactionId: txnId,
          merchantUserId: settings?.phonepeMerchantUserId || 'U123456',
          amount: Math.round(netPayable * 100),
          redirectUrl: `${frontUrl}/orders/${result.order.id}?status=success&email=${encodeURIComponent(data.customerInfo?.email || '')}`,
          redirectMode: 'REDIRECT',
          callbackUrl: `${apiUrl}/api/v1/payments/phonepe-callback`,
          mobileNumber: data.customerInfo?.phone || '9999999999',
          paymentInstrument: { type: 'PAY_PAGE' }
        };
        const base64Payload = Buffer.from(JSON.stringify(ppPayload)).toString('base64');
        const sha256hash = crypto.createHash('sha256').update(base64Payload + '/pg/v1/pay' + saltKey).digest('hex');
        providerOrderId = txnId;
        paymentPayload = {
          url: settings?.phonepeApiUrl || 'https://api.phonepe.com/apis/hermes/pg/v1/pay',
          base64Payload,
          checksum: `${sha256hash}###${saltIndex}`,
        };
      } else if (data.gateway === 'CASH_ON_DELIVERY') {
        providerOrderId = `COD_${result.order.id}`;
        paymentPayload = { cod: true };
      }

      // 6. Update Intent & Reservations with Real Provider ID
      await this.prisma.$transaction([
        (this.prisma as any).paymentIntent.create({
          data: {
            providerOrderId,
            gateway: data.gateway,
            amount: netPayable,
            orderId: result.order.id,
            customerInfo: data.customerInfo,
            metadata: { idempotencyKey: ikey, items: orderItems, shippingAddress: data.shippingAddress, billingAddress: data.billingAddress }
          }
        }),
        this.prisma.stockReservation.updateMany({
          where: { orderIntentId: ikey },
          data: { orderIntentId: providerOrderId }
        }),
        this.prisma.order.update({
          where: { id: result.order.id },
          data: { paymentIntentId: providerOrderId, paymentReference: providerOrderId }
        })
      ]);

      // 7. Auto-Confirm Free Orders
      if (netPayable === 0) {
        await this._confirmOrderFromWebhook(providerOrderId, `FREE_${providerOrderId}`, 'WALLET_OR_DISCOUNT');
      }

      return { success: true, providerOrderId, gateway: data.gateway, netPayable, paymentPayload, orderId: result.order.id };

    } catch (err) {
      this.logger.error(`Checkout crash for ikey ${ikey}:`, err);
      // Compensation: Release stock immediately if gateway fails
      await this.inventoryService.releaseStockForIntent(ikey).catch(() => {});
      throw new BadRequestException('Payment gateway refused connection. Stock released.');
    }
  }

  // ─── SAGA: PHASE 2 — Verify & Confirm ───────────────────────────────────
  // Can be triggered by Webhook (reliable) OR Frontend (fast UX)
  // Both use this identical atomic path.

  async verifyAndConfirmOrder(data: {
    providerOrderId: string;
    signature: string;
    paymentId: string;
    gateway: 'RAZORPAY' | 'PHONEPE';
  }) {
    const settings = await this._getSettings();

    // 1. Signature Check (Stateless)
    if (data.gateway === 'RAZORPAY') {
      const secret = settings?.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET;
      // BUG-005 FIX: Guard null secret — throw clean error instead of unhandled TypeError
      if (!secret) throw new BadRequestException('Razorpay secret not configured. Add RAZORPAY_KEY_SECRET to env.');
      const expected = crypto.createHmac('sha256', secret).update(`${data.providerOrderId}|${data.paymentId}`).digest('hex');
      if (expected !== data.signature) throw new BadRequestException('Invalid signature. Potential fraud attempt.');
    }

    // 2. Atomic Finalization
    return await this.prisma.$transaction(async (tx) => {
      // 2a. Fetch and lock Order (must be in PAYMENT_PENDING)
      // BUG-009 FIX: Normalize OR lookup to cover all reference fields
      const order = await tx.order.findFirst({
        where: { 
          OR: [
            { paymentIntentId: data.providerOrderId }, 
            { paymentReference: data.providerOrderId },
            { paymentId: data.providerOrderId }
          ],
          status: OS.PAYMENT_PENDING 
        },
        include: { items: true }
      });

      if (!order) {
        // Check if already confirmed (idempotency)
        const confirmed = await tx.order.findFirst({
          where: { OR: [{ paymentIntentId: data.providerOrderId }, { paymentId: data.providerOrderId }], status: 'CONFIRMED' }
        });
        if (confirmed) return confirmed;
        throw new BadRequestException('Order not found or already processed.');
      }

      // 2b. Transition State Machine
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          financialStatus: 'paid',
          paidAt: new Date(),
          paymentId: data.paymentId,
          paymentMethod: data.gateway,
        }
      });

      // 2b-bis. Increment Discount Usage (Fix for infinite coupon bug)
      if (order.discountCode) {
        const discount = await tx.discount.findUnique({ where: { code: order.discountCode } });
        if (discount) {
          await tx.discount.update({
            where: { id: discount.id },
            data: { usedCount: { increment: 1 } }
          });
          
          if (order.userId) {
             await (tx as any).discountUsage.create({
                data: { discountId: discount.id, userId: order.userId, orderId: order.id }
             });
          }
        } else {
          this.logger.warn(`Coupon ${order.discountCode} not found during confirmation of order ${order.id}`);
        }
      }

      // 2c. Deduct Actual Inventory & Clear Reservations
      await this.inventoryService.commitStockForOrder(
        order.id,
        (order as any).items.map((i: any) => ({ variantId: i.variantId, quantity: i.quantity })),
        data.providerOrderId,
        tx
      );

      // 2d. Debit Wallet (Final check) — with audit trail
      if (Number(order.walletCreditUsed) > 0 && order.userId) {
        const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
        if (wallet) {
          if (Number(wallet.balance) < Number(order.walletCreditUsed)) {
            // CRITICAL: Double Spend Exploit Caught!
            await tx.orderActivity.create({
              data: {
                orderId: order.id,
                type: 'PAYMENT_DISCREPANCY',
                message: `CRITICAL: User attempted double-spend! Wallet had ₹${wallet.balance}, but order required ₹${order.walletCreditUsed}. Order marked FAILED despite gateway charge. Manual review needed.`
              }
            });
            await tx.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
            
            await (tx as any).paymentIntent.updateMany({
              where: { providerOrderId: data.providerOrderId },
              data: { status: 'FAILED' }
            });
            
            return { doubleSpendDetected: true, orderId: order.id };
          }
          const toDeduct = Math.min(Number(wallet.balance), Number(order.walletCreditUsed));
          if (toDeduct > 0) {
            const updatedWallet = await tx.wallet.update({ where: { id: wallet.id }, data: { balance: { decrement: toDeduct } } });
            if (Number(updatedWallet.balance) < 0) {
              throw new BadRequestException('CRITICAL: Concurrent double-spend detected. Insufficient wallet balance.');
            }
            // FIX: Create WalletTransaction audit record for the debit
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                amount: new Decimal(toDeduct),
                type: 'DEBIT',
                reason: 'ORDER_PAYMENT',
                referenceId: order.id,
                notes: `Wallet credit used for Order #${order.id.slice(-8)}`
              }
            });
          }
        }
      }

      // 2e. Mark Intent SUCCESS
      await (tx as any).paymentIntent.updateMany({
        where: { providerOrderId: data.providerOrderId },
        data: { status: 'SUCCESS' }
      });

      // 2f. Financial Recording: Automated GST & Ledger Entry
      // Tax amounts are now calculated dynamically per-product's taxRate and taxInclusive settings.
      const netTotal = Number(order.totalAmount);
      const totalTax = Number((order as any).taxes || 0);
      const taxableValue = netTotal - totalTax;
      const cgst = totalTax / 2;
      const sgst = totalTax / 2;
      
      await this.ledgerService.createEntry({
        type: 'SALE',
        amount: netTotal,
        taxableValue,
        cgst,
        sgst,
        totalTax,
        notes: `Automated entry for Order #${order.id}`,
        referenceId: order.id,
        isDraft: false
      }, tx);

      // 2g. Order Activity Audit
      await tx.orderActivity.create({
        data: {
          orderId: order.id,
          type: 'STATUS_CHANGE',
          message: `Payment confirmed via ${data.gateway} (${data.paymentId}). Financial entry recorded in Ledger.`
        }
      }).catch(() => {});

      // 3. Emit Async Success Events
      setImmediate(() => {
        this.eventEmitter.emit('order.placed', {
          orderId: order.id,
          phone: order.customerPhone,
          name: order.customerName,
          amount: Number(order.totalAmount),
          metaEventId: (data as any).metaEventId,
        });
        
        // Send email confirmation
        this.ordersService.sendOrderConfirmationEmail(order.id)
          .catch(e => this.logger.error('Failed to send order confirmation email (confirmPayment)', e));
      });
      
      return updatedOrder;
    }, { timeout: 20000 });
  }

  async handleWebhook(body: any, rawBodyBuffer: Buffer, signature: string, gateway: 'RAZORPAY') {
    // 1. Verify signature BEFORE storing (reject forged requests immediately)
    const settings = await this._getSettings();
    const secret = settings?.razorpayWebhookSecret || process.env.RAZORPAY_WEBHOOK_SECRET;

    if (secret) {
      const expected = crypto.createHmac('sha256', secret).update(rawBodyBuffer).digest('hex');
      if (expected !== signature) {
        this.logger.error('Razorpay webhook: invalid signature — rejecting');
        throw new BadRequestException('Invalid webhook signature.');
      }
    } else {
      this.logger.warn('RAZORPAY_WEBHOOK_SECRET not set — skipping signature check. Set it in production!');
    }

    // 2. Store in queue and return 200 IMMEDIATELY
    // The gateway will not retry if it receives a 2xx within its timeout window.
    const eventType = body?.event || 'unknown';
    const result = await this.webhookQueue.receive({
      gateway: 'RAZORPAY',
      eventType,
      rawPayload: body,
      signature,
    });

    this.logger.log(`Webhook ${eventType} queued as ${result.eventId}. Returning 200 to gateway.`);
    return { received: true, eventId: result.eventId };
  }

  // ─── Internal: Atomic Order Confirmation from Webhook Data ──────────────────
  // This is the SINGLE source of truth for transitioning PAYMENT_PENDING → CONFIRMED.

  private async _confirmOrderFromWebhook(providerOrderId: string, paymentId: string, gateway: string) {
    return this.prisma.$transaction(async (tx) => {
      // BUG-009 FIX: Consistent normalized lookup
      const order = await tx.order.findFirst({
        where: {
          OR: [
            { paymentIntentId: providerOrderId },
            { paymentReference: providerOrderId },
            { paymentId: providerOrderId },
          ],
          status: OS.PAYMENT_PENDING,
        },
        include: { items: true },
      });

      if (!order) {
        // Check idempotency: already confirmed?
        const existing = await tx.order.findFirst({
          where: {
            OR: [{ paymentIntentId: providerOrderId }, { paymentReference: providerOrderId }],
            status: 'CONFIRMED',
          },
        });
        if (existing) {
          this.logger.warn(`Order for ${providerOrderId} already confirmed. Idempotent skip.`);
          return existing;
        }

        // Check for late payment / already cancelled order
        const cancelled = await tx.order.findFirst({
          where: {
            OR: [{ paymentIntentId: providerOrderId }, { paymentReference: providerOrderId }],
            status: 'CANCELLED',
          },
        });
        if (cancelled) {
          this.logger.error(`Late payment captured for CANCELLED order ${cancelled.id}. Requires refund of ${cancelled.totalAmount}.`);
          throw new Error(`LATE_PAYMENT_REFUND_REQUIRED:${cancelled.totalAmount}`);
        }

        throw new Error(`No PAYMENT_PENDING order found for providerOrderId: ${providerOrderId}`);
      }

      // State transition: PAYMENT_PENDING → CONFIRMED
      const confirmedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'CONFIRMED',
          financialStatus: 'paid',
          paidAt: new Date(),
          paymentId,
          paymentMethod: gateway,
        },
      });

      // Increment Discount Usage (Fix for infinite coupon bug)
      if (order.discountCode) {
        await tx.discount.update({
          where: { code: order.discountCode },
          data: { usedCount: { increment: 1 } }
        }).catch(() => this.logger.warn(`Failed to increment usedCount for coupon ${order.discountCode}`));
        if (order.userId) {
           const discount = await tx.discount.findUnique({ where: { code: order.discountCode } });
           if (discount) {
             await (tx as any).discountUsage.create({
                data: { discountId: discount.id, userId: order.userId, orderId: order.id }
             }).catch(() => this.logger.warn(`Failed to create discountUsage for coupon ${order.discountCode}`));
           }
        }
      }

      // Commit inventory (deduct stock, clear reservations)
      await this.inventoryService.commitStockForOrder(
        order.id,
        (order as any).items.map((i: any) => ({ variantId: i.variantId, quantity: i.quantity })),
        providerOrderId,
        tx,
      );

      // Debit wallet if used (BUG-010 FIX: Cap at zero, prevent transaction crash)
      if (Number(order.walletCreditUsed) > 0 && order.userId) {
        const wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
        if (wallet) {
          if (Number(wallet.balance) < Number(order.walletCreditUsed)) {
            // CRITICAL: Double Spend Exploit Caught!
            await tx.orderActivity.create({
              data: {
                orderId: order.id,
                type: 'PAYMENT_DISCREPANCY',
                message: `CRITICAL: User attempted double-spend! Wallet had ₹${wallet.balance}, but order required ₹${order.walletCreditUsed}. Order marked FAILED despite webhook trigger. Manual review needed.`
              }
            });
            await tx.order.update({ where: { id: order.id }, data: { status: 'FAILED' } });
            
            await (tx as any).paymentIntent.updateMany({
              where: { providerOrderId: providerOrderId },
              data: { status: 'FAILED' }
            });
            
            return { doubleSpendDetected: true, orderId: order.id };
          }
          const toDeduct = Math.min(Number(wallet.balance), Number(order.walletCreditUsed));
          if (toDeduct > 0) {
            const updatedWallet = await tx.wallet.update({
              where: { id: wallet.id },
              data: { balance: { decrement: toDeduct } },
            });
            if (Number(updatedWallet.balance) < 0) {
              throw new BadRequestException('CRITICAL: Concurrent double-spend detected. Insufficient wallet balance.');
            }
            // FIX: Create WalletTransaction audit record for the debit
            await tx.walletTransaction.create({
              data: {
                walletId: wallet.id,
                amount: new Decimal(toDeduct),
                type: 'DEBIT',
                reason: 'ORDER_PAYMENT',
                referenceId: order.id,
                notes: `Wallet credit used for Order #${order.id.slice(-8)}`
              }
            });
            this.logger.log(`Wallet debited: ₹${toDeduct} for Order ${order.id}`);
          }
        }
      }

      // Financial Recording: Automated GST & Ledger Entry
      const netTotal = Number(order.totalAmount);
      const totalTax = Number((order as any).taxes || 0);
      const taxableValue = netTotal - totalTax;
      const cgst = totalTax / 2;
      const sgst = totalTax / 2;

      await this.ledgerService.createEntry({
        type: 'SALE',
        amount: netTotal,
        taxableValue,
        cgst,
        sgst,
        totalTax,
        notes: `Webhook entry for Order #${order.id.slice(-6)}`,
        referenceId: order.id,
        isDraft: false
      }, tx);

      // Order Activity Audit
      await tx.orderActivity.create({
        data: {
          orderId: order.id,
          type: 'STATUS_CHANGE',
          message: `Webhook confirmed payment via ${gateway} (${paymentId}). Ledger synchronized.`
        }
      }).catch(() => {});

      // Fire async notifications (non-blocking — outside tx)
      setImmediate(() => {
        this.eventEmitter.emit('order.placed', {
          orderId: order.id,
          phone: order.customerPhone,
          name: order.customerName,
          amount: Number(order.totalAmount),
          metaEventId: undefined,
        });
        if (order.userId) {
          this.growthService.processReferralReward(order.userId, order.id)
            .catch(e => this.logger.error('Referral reward failed:', e));
            
          this.growthService.processLoyaltyPoints(order.userId, order.id)
            .catch(e => this.logger.error('Loyalty points processing failed:', e));
        }
        
        // Send email confirmation
        this.ordersService.sendOrderConfirmationEmail(order.id)
          .catch(e => this.logger.error('Failed to send order confirmation email', e));
      });

      this.logger.log(`🎉 Order ${order.id} confirmed via ${gateway} webhook (${providerOrderId})`);
      return confirmedOrder;
    }, { timeout: 20000 });
  }

  async cancelIntent(providerOrderId: string) {
    this.logger.log(`Releasing stock for cancelled intent: ${providerOrderId}`);
    
    const intent = await (this.prisma as any).paymentIntent.findUnique({
      where: { providerOrderId }
    });

    if (!intent || intent.status === 'FAILED') {
      return { success: true, message: 'Already cancelled or not found' };
    }

    if (intent.gateway === 'RAZORPAY') {
      try {
        const rzp = await this.getRazorpayInstance();
        const payments = await rzp.orders.fetchPayments(providerOrderId);
        const successfulPayment = payments.items.find((p: any) => p.status === 'captured' || p.status === 'authorized');
        if (successfulPayment) {
          this.logger.warn(`Attempted to cancel intent ${providerOrderId} but payment was already captured/authorized. Confirming instead.`);
          await this._confirmOrderFromWebhook(providerOrderId, successfulPayment.id, 'RAZORPAY');
          return { success: true, message: 'Payment was captured, order confirmed' };
        }
      } catch (e) {
        this.logger.warn(`Failed to verify Razorpay status before cancel for ${providerOrderId}`, e);
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.updateMany({
        where: { paymentIntentId: providerOrderId, status: OS.PAYMENT_PENDING },
        data: { status: OS.CANCELLED }
      });
      await (tx as any).paymentIntent.updateMany({
        where: { providerOrderId },
        data: { status: 'FAILED' }
      });
      await this.inventoryService.releaseStockForIntent(providerOrderId, tx);
    });

    const customerInfo = intent?.customerInfo as any;
    if (intent && customerInfo?.email && customerInfo?.name) {
      this.mailService.sendPaymentFailedEmail(
        customerInfo.email,
        customerInfo.name,
        intent.providerOrderId,
        Number(intent.amount)
      ).catch(e => this.logger.error('Failed to send payment failure email', e));
    }

    return { success: true };
  }

  async handlePhonePeCallback(base64Response: string, xVerify: string) {
    const settings = await this._getSettings();
    const saltKey = settings?.phonepeSaltKey || process.env.PHONEPE_SALT_KEY;
    const saltIndex = settings?.phonepeSaltIndex || process.env.PHONEPE_SALT_INDEX || '1';

    if (!saltKey) {
      this.logger.error('PhonePe Callback: CRITICAL ERROR - SaltKey missing in DB and ENV');
      throw new BadRequestException('Gateway configuration missing');
    }

    // 1. Verify Checksum
    const expected = crypto.createHash('sha256').update(base64Response + '/pg/v1/pay' + saltKey).digest('hex') + '###' + saltIndex;
    if (expected !== xVerify) {
      this.logger.error(`PhonePe Callback: Checksum mismatch! Expected ${expected.substring(0,10)}... but got ${xVerify.substring(0,10)}...`);
      throw new BadRequestException('Invalid checksum');
    }

    // 2. Decode & Store in Queue
    const decoded = JSON.parse(Buffer.from(base64Response, 'base64').toString());
    const eventType = decoded.success ? 'PAYMENT_SUCCESS' : 'PAYMENT_ERROR';
    
    this.logger.log(`PhonePe Callback received for ${decoded.data?.merchantTransactionId}. Queuing...`);
    
    return await this.webhookQueue.receive({
      gateway: 'PHONEPE',
      eventType,
      rawPayload: decoded,
      signature: xVerify,
    });
  }

  async adminVerifyOrder(orderId: string) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Order not found');
    
    if (order.status !== OS.PAYMENT_PENDING) {
      throw new BadRequestException(`Order is already in ${order.status} state.`);
    }

    const providerOrderId = order.paymentIntentId || order.paymentReference;
    if (!providerOrderId) throw new BadRequestException('Order has no payment intent ID');

    if (providerOrderId.startsWith('FREE_') || providerOrderId.startsWith('COD_')) {
       return this._confirmOrderFromWebhook(providerOrderId, providerOrderId, 'MANUAL');
    }

    try {
      const rzp = await this.getRazorpayInstance();
      const payments = await rzp.orders.fetchPayments(providerOrderId);
      const successfulPayment = payments.items.find((p: any) => p.status === 'captured');
      
      if (successfulPayment) {
        return this._confirmOrderFromWebhook(providerOrderId, successfulPayment.id, 'RAZORPAY');
      }
    } catch (e) {
      this.logger.warn(`Razorpay fetchPayments failed for ${providerOrderId}:`, e);
    }
    
    throw new BadRequestException('No successful payment found on the payment gateway. Please check the gateway dashboard.');
  }

  async processAutomatedRefund(paymentId: string, amount: number, gateway: string) {
    const settings = await this._getSettings();
    if (gateway === 'RAZORPAY') {
      try {
        const rzp = await this.getRazorpayInstance();
        // Razorpay expects amount in paise
        const refundAmount = Math.round(amount * 100);
        this.logger.log(`Initiating automated Razorpay refund for payment ${paymentId}, amount: ₹${amount}`);
        const result = await rzp.payments.refund(paymentId, { amount: refundAmount });
        this.logger.log(`Razorpay refund success: ${result.id}`);
        return { success: true, refundId: result.id, gateway: 'RAZORPAY' };
      } catch (err: any) {
        this.logger.error(`Razorpay refund failed for ${paymentId}: ${err.message || err.description || err}`);
        throw new BadRequestException(`Gateway Refund Failed: ${err.description || err.message || 'Unknown error'}`);
      }
    } else if (gateway === 'PHONEPE') {
      const merchantId = settings?.phonepeMerchantId;
      const saltKey = settings?.phonepeSaltKey || process.env.PHONEPE_SALT_KEY;
      const saltIndex = settings?.phonepeSaltIndex || process.env.PHONEPE_SALT_INDEX || '1';

      if (!merchantId || !saltKey) {
        throw new BadRequestException('PhonePe gateway not configured for refunds.');
      }

      const refundId = `refund_${Date.now()}`;
      const ppPayload = {
        merchantId,
        merchantUserId: settings?.phonepeMerchantUserId || 'U123456',
        originalTransactionId: paymentId,
        merchantTransactionId: refundId,
        amount: Math.round(amount * 100),
        callbackUrl: `${settings?.apiUrl || process.env.API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in')}/api/v1/payments/phonepe-refund-callback`,
      };

      const base64Payload = Buffer.from(JSON.stringify(ppPayload)).toString('base64');
      const apiEndpoint = '/pg/v1/refund';
      const sha256hash = crypto.createHash('sha256').update(base64Payload + apiEndpoint + saltKey).digest('hex');
      const checksum = `${sha256hash}###${saltIndex}`;

      const refundUrl = (settings?.phonepeApiUrl || 'https://api.phonepe.com/apis/hermes/pg/v1/pay').replace('/pg/v1/pay', '/pg/v1/refund');

      try {
        const fetch = (await import('node-fetch')).default;
        this.logger.log(`Initiating automated PhonePe refund for payment ${paymentId}, amount: ₹${amount}`);
        const res = await fetch(refundUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
          },
          body: JSON.stringify({ request: base64Payload }),
        });

        const json = await res.json() as any;
        if (json.success) {
          this.logger.log(`PhonePe refund success: ${refundId}`);
          return { success: true, refundId: json.data?.transactionId || refundId, gateway: 'PHONEPE' };
        } else {
          this.logger.error(`PhonePe refund API rejected: ${json.message}`);
          throw new BadRequestException(`PhonePe Refund Failed: ${json.message}`);
        }
      } catch (err: any) {
        this.logger.error(`PhonePe refund network error: ${err.message}`);
        throw new BadRequestException(`PhonePe Refund Failed: ${err.message}`);
      }
    } else {
      // Manual gateways (COD, Free, Manual Bank Transfer)
      return { success: true, refundId: `manual_refund_${Date.now()}`, gateway };
    }
  }
}
