import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import { MarketingService } from '../marketing/marketing.service';
import { MailService } from '../mail/mail.service';
import { WholesalePdfService } from '../wholesale/wholesale-pdf.service';
import { forwardRef, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import { PaymentsService } from '../payments/payments.service';
import { GrowthService } from '../growth/growth.service';
import { NotificationsService } from '../notifications/notifications.service';

// Synced exactly with schema.prisma OrderStatus enum
export enum OrderStatus {
  CREATED = 'CREATED',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  CONFIRMED = 'CONFIRMED',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  AUTHORIZED = 'AUTHORIZED',
  CAPTURED = 'CAPTURED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED'
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
    private marketingService: MarketingService,
    private mailService: MailService,
    private pdfService: WholesalePdfService,
    private growthService: GrowthService,
    private notificationsService: NotificationsService,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  async getUserOrders(userIdOrClerkId: string, email?: string) {
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ id: userIdOrClerkId }, { clerkId: userIdOrClerkId }]
      }
    });

    const targetUserId = user ? user.id : userIdOrClerkId;
    const targetEmail = email || (user ? user.email : undefined);

    let whereClause: any = { userId: targetUserId };
    if (targetEmail) {
      whereClause = {
        OR: [
          { userId: targetUserId },
          { customerEmail: targetEmail }
        ]
      };
    }

    return this.prisma.order.findMany({
      where: whereClause,
      take: 100, // HARD LIMIT to prevent fetching excessive orders per user
      include: {
        items: {
          include: {
            variant: {
              include: { product: { include: { images: { take: 1 } } } }
            }
          }
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(id: string, user?: { id: string; email: string; role?: string }) {
    const isNumeric = /^\d+$/.test(id);
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          ...(isNumeric ? [{ orderNumber: parseInt(id, 10) }] : []),
          { id },
          { formattedOrderNumber: id }
        ]
      },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { include: { images: { take: 1 } } } }
            }
          }
        },
        fulfillments: { include: { items: true, shipments: true } },
        activities: { orderBy: { createdAt: 'desc' } },
        returns: { include: { items: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // If a user context is provided, allow access if ID matches, email matches, OR they are an ADMIN
    if (user && user.role !== 'ADMIN' && user.role !== 'SUPER_ADMIN') {
      const isOwner = order.userId === user.id;
      const isEmailMatch = order.customerEmail.toLowerCase() === user.email.toLowerCase();
      
      if (!isOwner && !isEmailMatch) {
        throw new BadRequestException('Access denied');
      }
    }

    return order;
  }

  async trackGuestOrder(orderId: string, email: string) {
    const isNumeric = /^\d+$/.test(orderId);
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [
          ...(isNumeric ? [{ orderNumber: parseInt(orderId, 10) }] : []),
          { id: orderId },
          { formattedOrderNumber: orderId }
        ]
      },
      include: {
        items: {
          include: {
            variant: {
              include: { product: { include: { images: { take: 1 } } } }
            }
          }
        },
        fulfillments: { include: { items: true, shipments: true } },
        activities: { orderBy: { createdAt: 'desc' } },
        returns: { include: { items: true } },
      },
    });

    if (!order || order.customerEmail.toLowerCase() !== email.toLowerCase()) {
      throw new NotFoundException('Order not found or email mismatch');
    }

    return order;
  }

  async getAdminOrders(filters: {
    status?: OrderStatus;
    excludeStatus?: string;
    financialStatus?: string;
    fulfillmentStatus?: string;
    source?: string;
    riskLevel?: string;
    staffId?: string;
    tag?: string;
    search?: string;
    dateFrom?: string;
    dateTo?: string;
  }) {
    const where: any = {};

    // 1. Exact Matches
    if (filters.status) where.status = filters.status as any;
    if (filters.excludeStatus) where.status = { not: filters.excludeStatus as any };
    if (filters.financialStatus) where.financialStatus = filters.financialStatus;
    if (filters.fulfillmentStatus) where.fulfillmentStatus = filters.fulfillmentStatus;
    if (filters.source) where.source = filters.source;
    if (filters.riskLevel) where.riskLevel = filters.riskLevel;
    if (filters.staffId) where.staffId = filters.staffId;

    // 2. Tag Filter (Array intersection)
    if (filters.tag) {
      where.tags = { has: filters.tag };
    }

    // 3. Date Range
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) {
        const to = new Date(filters.dateTo);
        to.setUTCHours(23, 59, 59, 999);
        where.createdAt.lte = to;
      }
    }

    // 4. Global Search (Case-Insensitive)
    if (filters.search) {
      where.OR = [
        { id: { contains: filters.search, mode: 'insensitive' } },
        { customerName: { contains: filters.search, mode: 'insensitive' } },
        { customerEmail: { contains: filters.search, mode: 'insensitive' } },
        { customerPhone: { contains: filters.search, mode: 'insensitive' } },
        { paymentId: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const cacheKey = `admin_orders_${JSON.stringify(filters)}`;
    const cachedOrders = await this.cacheManager.get(cacheKey);
    if (cachedOrders) {
      return cachedOrders as any;
    }

    const orders = await this.prisma.order.findMany({
      where,
      take: 100, // HARD LIMIT to prevent OOM. Admin should use date filters for older orders.
      include: {
        items: {
          include: {
            variant: {
              include: { 
                product: { 
                  select: { 
                    title: true,
                    images: { take: 1, orderBy: { position: 'asc' } }
                  } 
                } 
              }
            }
          }
        },
        assignedStaff: { select: { name: true, email: true } }
      },
      orderBy: { createdAt: 'desc' },
    });

    await this.cacheManager.set(cacheKey, orders, 60000); // 1 minute TTL
    return orders;
  }

  async updateOrderStatus(id: string, status: OrderStatus) {
    return this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({
        where: { id },
        include: { items: true }
      });

      if (!order) throw new NotFoundException('Order not found');

      if (status === 'CANCELLED' && order.status !== 'CANCELLED') {
        // Only restock if the order wasn't already cancelled (idempotency)
        for (const item of order.items) {
          await this.inventoryService.adjustStock({
            variantId: item.variantId,
            change: item.quantity,
            type: 'RETURN',
            referenceId: order.id,
            notes: `Restock from cancelled order ${order.id}`
          }, tx);
        }
        
        // Revoke Referral Reward
        this.growthService.revokeReferralReward(order.id).catch(e => this.logger.error(`Failed to revoke referral reward for order ${order.id}`, e));
      }

      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: status as any }
      });

      // Log status change activity
      await tx.orderActivity.create({
        data: { orderId: id, type: 'STATUS_CHANGE', message: `Order status updated to ${status}` }
      }).catch(() => {});

      if (status === 'CONFIRMED') {
        this.marketingService.sendOrderNotification(updatedOrder, 'ORDER_CONFIRMED')
          .catch((e: any) => this.logger.error(`WhatsApp notification failed for order ${id}`, e));
      }

      return updatedOrder;
    });
  }

  async bulkUpdateStatus(ids: string[], status: OrderStatus) {
    return this.prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { status: status as any }
    });
  }

  async bulkAssignStaff(ids: string[], staffId: string) {
    return this.prisma.order.updateMany({
      where: { id: { in: ids } },
      data: { staffId }
    });
  }

  async bulkAddTags(ids: string[], tag: string) {
    // Note: updateMany doesn't support array push in Prisma for Postgres easily
    // We do it in a loop for safety or use raw SQL. For now, a loop is safer for a small number of orders.
    const results: any[] = [];
    for (const id of ids) {
      const current = await this.prisma.order.findUnique({ where: { id }, select: { tags: true } });
      const tagsArray = Array.isArray(current?.tags) ? [...current.tags] : [];
      
      if (!tagsArray.includes(tag.trim())) {
        tagsArray.push(tag.trim());
        const order = await this.prisma.order.update({
          where: { id },
          data: { tags: tagsArray }
        });
        results.push(order);
      }
    }
    return results;
  }

  async updateFulfillmentInfo(id: string, data: { carrierName: string; trackingId: string; estimatedDelivery?: Date }) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        carrierName: data.carrierName,
        trackingId: data.trackingId,
        estimatedDelivery: data.estimatedDelivery,
        status: 'SHIPPED'
      }
    });

    await this.prisma.orderActivity.create({
      data: {
        orderId: id,
        type: 'STATUS_CHANGE',
        message: `Order marked as SHIPPED via ${data.carrierName || 'Courier'} (Tracking: ${data.trackingId || 'N/A'})`
      }
    });

    const orderIdCapture = id;
    this.marketingService.sendOrderNotification(updatedOrder, 'ORDER_SHIPPED')
      .catch(e => this.logger.error(`Shipping notification failed for order ${orderIdCapture}`, e));

    return updatedOrder;
  }

  async addInternalNote(id: string, message: string, staffName?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const prefix = staffName ? `[${staffName}] ` : '';
    return this.prisma.orderActivity.create({
      data: {
        orderId: id,
        type: 'NOTE',
        message: `${prefix}${message}`,
      }
    });
  }

  async updateOrderAddress(id: string, data: { shippingAddress?: any, billingAddress?: any }) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const updateData: any = {};
    if (data.shippingAddress) updateData.shippingAddress = data.shippingAddress;
    if (data.billingAddress) updateData.billingAddress = data.billingAddress;

    const updated = await this.prisma.order.update({
      where: { id },
      data: updateData
    });

    await this.prisma.orderActivity.create({
      data: {
        orderId: id,
        type: 'STATUS_CHANGE',
        message: `Order address was updated by staff.`
      }
    });

    return updated;
  }

  async createFulfillment(id: string, data: { carrierName: string, trackingId: string, items: { variantId: string, quantity: number }[] }) {
    const fulfillment = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: true, fulfillments: { include: { items: true } } } });
      if (!order) throw new NotFoundException('Order not found');

      // 1. Concurrency Check (Safety)
      for (const item of data.items) {
        const orderItem = order.items.find(i => i.variantId === item.variantId);
        if (!orderItem) throw new BadRequestException(`Variant ${item.variantId} not in order`);
        
        const alreadyFulfilled = order.fulfillments.flatMap(f => f.items).filter(fi => fi.variantId === item.variantId).reduce((sum, fi) => sum + fi.quantity, 0);
        if (orderItem.quantity - alreadyFulfilled < item.quantity) {
          throw new BadRequestException(`Cannot fulfill ${item.quantity} of ${item.variantId}, only ${orderItem.quantity - alreadyFulfilled} remaining`);
        }
      }

      // 2. Create Fulfillment
      const fulfillment = await tx.fulfillment.create({
        data: {
          orderId: id,
          status: 'PROCESSING',
          items: {
            create: data.items.map(i => ({ variantId: i.variantId, quantity: i.quantity }))
          },
          shipments: {
            create: { trackingId: data.trackingId, status: 'PENDING' }
          }
        }
      });

      // 3. Update Order Status
      await tx.orderActivity.create({
        data: { orderId: id, type: 'STATUS_CHANGE', message: `Fulfillment created for ${data.items.length} item(s) via ${data.carrierName} (Tracking: ${data.trackingId})` }
      });

      // 4. Determine if fully fulfilled
      const allFulfilledItems = await tx.fulfillmentItem.findMany({ where: { fulfillment: { orderId: id } } });
      const totalOrdered = order.items.reduce((sum, i) => sum + i.quantity, 0);
      const totalFulfilled = allFulfilledItems.reduce((sum, i) => sum + i.quantity, 0);
      
      const newStatus = totalFulfilled >= totalOrdered ? 'fulfilled' : 'partially_fulfilled';
      
      await tx.order.update({
        where: { id },
        data: { fulfillmentStatus: newStatus, status: newStatus === 'fulfilled' ? 'SHIPPED' : order.status, carrierName: data.carrierName, trackingId: data.trackingId }
      });

      // 5. Inventory Handled Upstream
      // Note: Inventory deduction is now handled exclusively by `inventory.service.ts` -> `commitStockForOrder` 
      // when the payment succeeds or the order is confirmed. Do not double-deduct here.

      return fulfillment;
    });

    const order = await this.prisma.order.findUnique({ where: { id } });
    if (order?.customerEmail && data.trackingId && data.carrierName) {
      await this.mailService.sendTrackingEmail(
        order.customerEmail, order.customerName, id, data.trackingId, data.carrierName
      ).catch(err => this.logger.error('Failed to send tracking email:', err));
    }

    return fulfillment;
  }

  async bulkCreateFulfillments(fulfillments: { orderId: string, carrierName: string, trackingId: string }[]) {
    const results: any[] = [];
    for (const f of fulfillments) {
      try {
        const order = await this.prisma.order.findUnique({ where: { id: f.orderId }, include: { items: true, fulfillments: { include: { items: true } } } });
        if (!order) continue;
        
        // Calculate unfulfilled items
        const pendingItems = order.items.map(item => {
          const alreadyFulfilled = order.fulfillments.flatMap(ful => ful.items).filter(fi => fi.variantId === item.variantId).reduce((sum, fi) => sum + fi.quantity, 0);
          return { variantId: item.variantId, quantity: item.quantity - alreadyFulfilled };
        }).filter(i => i.quantity > 0);

        if (pendingItems.length === 0) continue; // Already fulfilled

        const res = await this.createFulfillment(f.orderId, { carrierName: f.carrierName, trackingId: f.trackingId, items: pendingItems });
        results.push(res);
      } catch (err: any) {
        this.logger.error(`Bulk fulfill failed for ${f.orderId}: ${err.message}`);
      }
    }
    return { success: true, count: results.length };
  }

  async createReturn(id: string, data: { reason: string, notes?: string, refundAmount: number, items: { variantId: string, quantity: number }[], restock: boolean }) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true, returns: true } });
    if (!order) throw new NotFoundException('Order not found');

    const totalRefundedAlready = order.returns?.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0) || 0;
    const remainingRefundable = Number(order.totalAmount) - totalRefundedAlready;
    const refundAmount = Number(data.refundAmount) || 0;

    if (refundAmount > remainingRefundable) {
      throw new BadRequestException(`Refund amount cannot exceed the remaining refundable amount (₹${remainingRefundable}).`);
    }

    const orderReturn = await this.prisma.orderReturn.create({
      data: {
        orderId: id,
        status: 'APPROVED', // Auto-approved by Admin
        reason: data.reason,
        notes: data.notes,
        refundAmount: data.refundAmount,
        refundStatus: data.refundAmount > 0 ? 'PENDING' : null,
        items: {
          create: data.items.map(i => ({ variantId: i.variantId, quantity: i.quantity }))
        }
      }
    });

    if (data.restock) {
      for (const item of data.items) {
        await this.prisma.variant.update({
          where: { id: item.variantId },
          data: { inventory: { increment: item.quantity } }
        });
      }
    }

    await this.prisma.orderActivity.create({
      data: {
        orderId: id,
        type: 'STATUS_CHANGE',
        message: `A return was processed for ${data.items.length} item(s). Reason: ${data.reason}. Restocked: ${data.restock ? 'Yes' : 'No'}. Refund: ₹${data.refundAmount}`
      }
    });

    return orderReturn;
  }

  async createExchangeOrReturn(id: string, data: {
    orderItemId: string;
    type: 'RETURN' | 'EXCHANGE';
    newVariantId?: string;
    restocked: boolean;
    refundAmount?: number;
    refundMethod?: string;
    notes?: string;
  }) {
    let fetchedOrder: any;
    const returnExchange = await this.prisma.$transaction(async (tx) => {
      const order = await tx.order.findUnique({ where: { id }, include: { items: { include: { variant: true } } } });
      if (!order) throw new NotFoundException('Order not found');
      fetchedOrder = order;

      const orderItem = order.items.find(i => i.id === data.orderItemId);
      if (!orderItem) throw new NotFoundException('OrderItem not found');

      const returnExchange = await tx.returnExchange.create({
        data: {
          orderId: id,
          orderItemId: orderItem.id,
          type: data.type,
          newVariantId: data.newVariantId,
          restocked: data.restocked,
          refundAmount: data.refundAmount,
          refundMethod: data.refundMethod,
          notes: data.notes
        }
      });

      // Update OrderItem Status
      await tx.orderItem.update({
        where: { id: orderItem.id },
        data: { status: data.type === 'RETURN' ? 'RETURNED' : 'EXCHANGED' }
      });

      // Restock original item if requested
      if (data.restocked) {
        await this.inventoryService.adjustStock({
          variantId: orderItem.variantId,
          change: orderItem.quantity,
          type: 'RETURN',
          referenceId: id,
          notes: `Restock from ${data.type.toLowerCase()} for order ${id}`
        }, tx);
      }

      // Handle Exchange
      if (data.type === 'EXCHANGE' && data.newVariantId) {
        // Deduct new variant
        await this.inventoryService.adjustStock({
          variantId: data.newVariantId,
          change: -orderItem.quantity,
          type: 'SALE',
          referenceId: id,
          notes: `Deduction for exchange in order ${id}`
        }, tx);

        // Add new variant to OrderItems
        await tx.orderItem.create({
          data: {
            orderId: id,
            variantId: data.newVariantId,
            quantity: orderItem.quantity,
            price: orderItem.price,
            status: 'FULFILLED', // Or unfulfilled, but simplified here
          }
        });
      }

      // Handle Wallet Refund
      if (data.type === 'RETURN' && data.refundMethod === 'WALLET' && data.refundAmount && order.userId) {
        let wallet = await tx.wallet.findUnique({ where: { userId: order.userId } });
        if (!wallet) {
          wallet = await tx.wallet.create({ data: { userId: order.userId, balance: 0 } });
        }
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: data.refundAmount } }
        });

        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount: data.refundAmount,
            reason: 'REFUND',
            referenceId: order.id,
            notes: `Refund for Order ${order.id}`,
            status: 'COMPLETED'
          }
        });

        // Update financial status
        const currentPaidAmount = Number(fetchedOrder.totalAmount);
        const newFinancialStatus = data.refundAmount >= currentPaidAmount ? 'refunded' : 'partially_refunded';
        await tx.order.update({
          where: { id: fetchedOrder.id },
          data: { financialStatus: newFinancialStatus } as any
        });

        // Send Refund Email
        if (fetchedOrder.customerEmail) {
          this.mailService.sendRefundInitiatedEmail(
            fetchedOrder.customerEmail,
            fetchedOrder.customerName || 'Customer',
            fetchedOrder.id,
            data.refundAmount
          ).catch(e => this.logger.error(`Failed to send refund email for order ${fetchedOrder.id}`, e));
        }
      }

      // Handle Gateway Source Refund
      if (data.type === 'RETURN' && data.refundMethod === 'SOURCE' && data.refundAmount && data.refundAmount > 0) {
        if (!order.paymentId) {
          throw new BadRequestException('Cannot refund to source: No payment ID recorded for this order.');
        }

        // Determine Gateway
        let gateway = 'RAZORPAY';
        if (order.paymentIntentId) {
            const intent = await tx.paymentIntent.findUnique({ where: { providerOrderId: order.paymentIntentId }});
            if (intent) gateway = intent.gateway;
        } else if (order.paymentId.startsWith('T') || order.paymentId.startsWith('M')) {
            gateway = 'PHONEPE';
        }

        try {
           const refundRes = await this.paymentsService.processAutomatedRefund(order.paymentId, data.refundAmount, gateway);
           await tx.orderActivity.create({
              data: {
                 orderId: id,
                 type: 'REFUND_INITIATED',
                 message: `Automated refund to ${gateway} initiated. Amount: ₹${data.refundAmount}. ID: ${refundRes.refundId}`,
              }
           });

           // Update financial status
           const currentPaidAmount = Number(fetchedOrder.totalAmount);
           const newFinancialStatus = data.refundAmount >= currentPaidAmount ? 'refunded' : 'partially_refunded';
           await tx.order.update({
             where: { id: fetchedOrder.id },
             data: { financialStatus: newFinancialStatus } as any
           });

           // Send Refund Email
           if (fetchedOrder.customerEmail) {
             this.mailService.sendRefundInitiatedEmail(
               fetchedOrder.customerEmail,
               fetchedOrder.customerName || 'Customer',
               fetchedOrder.id,
               data.refundAmount
             ).catch(e => this.logger.error(`Failed to send refund email for order ${fetchedOrder.id}`, e));
           }
        } catch (error: any) {
           throw new BadRequestException(`Refund initiation failed: ${error.message}`);
        }
      }

      await tx.orderActivity.create({
        data: {
          orderId: id,
          type: 'STATUS_CHANGE',
          message: `Processed ${data.type} for item ${orderItem.variant.sku || orderItem.variantId}. Restocked: ${data.restocked}.`
        }
      });

      return returnExchange;
    }, { timeout: 20000 });

    if (data.type === 'RETURN' && data.refundAmount && fetchedOrder) {
      this.notificationsService.notify('REFUND_PROCESSED', {
        email: fetchedOrder.customerEmail,
        customerName: fetchedOrder.customerName || 'Customer',
        orderNumber: fetchedOrder.formattedOrderNumber || String(fetchedOrder.orderNumber),
        amount: data.refundAmount,
        method: data.refundMethod
      }).catch(err => this.logger.error(`Failed to notify user of refund: ${err.message}`));
    }

    return returnExchange;
  }

  async createPendingOrder(data: {
    clerkId?: string;
    userId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    totalAmount: number;
    taxes?: number;
    shippingAddress: any;
    billingAddress?: any;
    items: any[];
    discountCode?: string;
    discountAmount?: number;
    walletCreditUsed?: number;
    shippingCost?: number;
    shippingMethodId?: string;
    idempotencyKey: string;
  }, tx?: any) {
    const executeOrderCreation = async (txn: any) => {
      // Resolve user
      let userId: string | undefined;
      if ((data as any).userId) {
        userId = (data as any).userId;
      } else if (data.clerkId) {
        const user = await txn.user.findUnique({ where: { clerkId: data.clerkId } });
        if (user) userId = user.id;
      }

      if (!userId) {
        const fallbackEmail = `${data.customerPhone.replace(/\\D/g, "")}@guest.raaghas.in`;
        const email = data.customerEmail ? data.customerEmail.toLowerCase().trim() : fallbackEmail;
        let user = await txn.user.findUnique({ where: { email } });
        if (user) {
          userId = user.id;
        } else {
          user = await txn.user.create({
            data: {
              email,
              name: data.customerName || 'Guest Customer',
              phone: data.customerPhone || '',
              role: 'CUSTOMER',
              wallet: { create: { balance: 0 } }
            }
          });
          userId = user.id;
        }
      }

      // Map items with HSN snapshot
      const enrichedItems = await Promise.all(data.items.map(async item => {
        const variant = await txn.variant.findUnique({
          where: { id: item.variantId },
          include: { product: { select: { hsnCode: true } } }
        });
        return {
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          taxAmount: item.taxAmount || 0,
          hsnCode: variant?.product?.hsnCode || 'TEXTILE-00'
        };
      }));

      const generatedOrderId = `RAAGHAS-${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}${Math.floor(Math.random() * 10000).toString(36).toUpperCase()}`;

      const order = await txn.order.create({
        data: {
          id: generatedOrderId,
          idempotencyKey: data.idempotencyKey,
          userId,
          status: OrderStatus.PAYMENT_PENDING as any,
          financialStatus: 'pending',
          totalAmount: data.totalAmount,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress,
          discountCode: data.discountCode,
          discountAmount: data.discountAmount || 0,
          taxes: data.taxes || 0,
          walletCreditUsed: data.walletCreditUsed || 0,
          shipping: data.shippingCost || 0,
          items: { create: enrichedItems },
        },
      });

      // Removed formattedOrderNumber generation for PAYMENT_PENDING state
      // This ensures gapless invoice numbers since cancelled/abandoned checkouts won't consume a sequence ID.
      
      return order;
    };

    if (tx) {
      return executeOrderCreation(tx);
    } else {
      return this.prisma.$transaction(executeOrderCreation);
    }
  }

  async createOrder(data: {
    userId?: string;
    clerkId?: string;
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    totalAmount: number;
    currency?: string;
    paymentMethod: string;
    paymentId: string;
    paymentIntentId: string;
    shippingAddress: any;
    billingAddress?: any;
    items: any[];
    discountCode?: string;
    discountAmount?: number;
    walletCreditUsed?: number;
  }, tx?: any) {
    const prisma = tx || this.prisma;

    // 1. IDEMPOTENCY CHECK: Ensure we don't create the same order twice
    const existingOrder = await prisma.order.findFirst({
      where: { 
        OR: [
          { paymentId: data.paymentId },
          { paymentIntentId: data.paymentIntentId }
        ]
      }
    });
    if (existingOrder) {
      this.logger.warn(`Order already exists for paymentId: ${data.paymentId}. Skipping creation.`);
      return existingOrder;
    }

    // 2. USER RESOLUTION
    let userId = data.userId;
    if (!userId) {
      const fallbackEmail = `${data.customerPhone.replace(/\\D/g, "")}@guest.raaghas.in`;
      const email = data.customerEmail ? data.customerEmail.toLowerCase().trim() : fallbackEmail;
      if (data.clerkId) {
        let user = await prisma.user.findUnique({ where: { clerkId: data.clerkId } });
        if (!user && email) {
          user = await prisma.user.findUnique({ where: { email } });
          if (user) {
            await prisma.user.update({ where: { id: user.id }, data: { clerkId: data.clerkId } });
          }
        }
        if (!user) {
          user = await prisma.user.create({
            data: {
              clerkId: data.clerkId,
              email: email || data.clerkId,
              name: data.customerName || 'Guest Customer',
              phone: data.customerPhone || '',
              role: 'CUSTOMER',
              wallet: { create: { balance: 0 } }
            }
          });
        }
        userId = user.id;
      } else if (email) {
        let user = await prisma.user.findUnique({ where: { email } });
        if (!user) {
          user = await prisma.user.create({
            data: {
              email,
              name: data.customerName || 'Guest Customer',
              phone: data.customerPhone || '',
              role: 'CUSTOMER',
              wallet: { create: { balance: 0 } }
            }
          });
        }
        userId = user.id;
      }
    }

    // 3. ENRICH ITEMS
    const enrichedItems = await Promise.all(
      data.items.map(async (item) => {
        const variant = await prisma.variant.findUnique({
          where: { id: item.variantId },
          include: { product: true }
        });
        return {
          variantId: item.variantId,
          quantity: item.quantity,
          price: item.price,
          productName: variant?.product?.title || 'Unknown Product',
          sku: variant?.sku || null,
          hsnCode: variant?.product?.hsnCode || 'TEXTILE-00',
        };
      })
    );

    // 4. MAP ADDRESSES
    const sa = data.shippingAddress || {};
    const addressData = {
      name: data.customerName,
      phone: data.customerPhone,
      address1: sa.address || sa.address1 || '',
      address2: sa.address2 || null,
      city: sa.city || '',
      province: sa.state || sa.province || null,
      zip: sa.pincode || sa.zip || '',
      country: sa.country || 'India',
    };

    const generatedOrderId = `RAAGHAS-${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}${Math.floor(Math.random() * 10000).toString(36).toUpperCase()}`;

    const order = await prisma.order.create({
      data: {
        id: generatedOrderId,
        userId,
        status: 'CONFIRMED',
        financialStatus: 'paid',
        fulfillmentStatus: 'unfulfilled',
        currency: data.currency || 'INR',
        subtotal: data.totalAmount,
        total: data.totalAmount,
        totalAmount: data.totalAmount,
        paidAt: new Date(),
        source: 'web',
        customerName: data.customerName,
        customerEmail: data.customerEmail,
        customerPhone: data.customerPhone,
        shippingAddress: data.shippingAddress,  // Stored as JSON
        billingAddress: data.billingAddress,
        paymentMethod: data.paymentMethod,
        paymentId: data.paymentId,
        paymentIntentId: data.paymentIntentId,
        discountCode: data.discountCode || null,
        discountAmount: data.discountAmount || 0,
        walletCreditUsed: data.walletCreditUsed || 0,
        items: {
          create: enrichedItems.map(i => ({
            variantId: i.variantId,
            quantity: i.quantity,
            price: i.price,
            hsnCode: i.hsnCode,
          })),
        },
      },
      include: { items: true },
    });

    const settings = await prisma.storeSettings.findUnique({ where: { id: 'global' } });
    const prefix = settings?.orderPrefix || '';
    const suffix = settings?.orderSuffix || '';
    const confirmedCount = await prisma.order.count({
      where: { formattedOrderNumber: { not: null } }
    });
    const formatted = `${prefix}${confirmedCount + 1001}${suffix}`;
    
    return await prisma.order.update({
      where: { id: order.id },
      data: { formattedOrderNumber: formatted },
      include: { items: true }
    });
  }

  async sendOrderConfirmationEmail(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: {
              include: { product: true }
            }
          }
        }
      }
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (!order.customerEmail) {
      return { success: false, message: 'No customer email provided' };
    }

    const settings = await this.prisma.storeSettings.findUnique({ where: { id: 'global' } });

    // Generate Invoice PDF
    const formattedInvoice = {
      type: 'RETAIL',
      invoiceNumber: (order.formattedOrderNumber || `INV-${order.id.slice(-6).toUpperCase()}`),
      date: order.createdAt.toISOString(),
      seller: { 
        name: settings?.storeName || 'Raaghas', 
        address: settings?.businessAddress || 'Salem, India', 
        state: settings?.businessState || 'Telangana', 
        gst: settings?.gstNumber || '33AABCU9603R1ZX', 
        email: settings?.supportEmail || 'info@raaghas.com' 
      },
      buyer: { 
        name: order.customerName, 
        contact: order.customerName, 
        address: order.shippingAddress ? (typeof order.shippingAddress === 'string' ? JSON.parse(order.shippingAddress).address1 || 'N/A' : (order.shippingAddress as any).address1 || 'N/A') : 'N/A', 
        gst: 'N/A', 
        phone: order.customerPhone || 'N/A' 
      },
      items: order.items.map(it => ({
        description: it.variant?.product?.title || 'Item',
        hsn: it.variant?.product?.hsnCode || 'TEXTILE-00',
        taxPercent: 5,
        quantity: it.quantity,
        unitPrice: Number(it.price),
        taxableValue: Number(it.price) * it.quantity
      })),
      summary: { 
        subtotal: Number(order.totalAmount), 
        taxes: [], 
        grandTotal: Number(order.totalAmount), 
        totalGst: 0 
      },
      bankDetails: { 
        bankName: 'HDFC Bank', 
        accountName: 'Raaghas', 
        accountNumber: '50200012345678', 
        ifscCode: 'HDFC0001234' 
      }
    };

    let pdfBuffer: Buffer | undefined;
    try {
      pdfBuffer = await this.pdfService.generateInvoicePDF(formattedInvoice);
    } catch (e) {
      this.logger.error(`Failed to generate PDF for order ${orderId}`, e);
    }

    await this.mailService.sendOrderConfirmationEmail(
      order.customerEmail,
      order.customerName,
      order.id,
      Number(order.totalAmount),
      order.items,
      pdfBuffer
    );

    return { success: true };
  }
  async createDraftOrder(data: {
    customerName: string;
    customerEmail: string;
    customerPhone: string;
    shippingAddress: any;
    billingAddress?: any;
    items: { variantId: string, quantity: number, price: number }[];
    discountAmount?: number;
    shippingAmount?: number;
    notes?: string;
  }) {
    const subtotal = data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const shipping = data.shippingAmount || 0;
    const discount = data.discountAmount || 0;
    const totalAmount = subtotal + shipping - discount;

    const enrichedItems = await Promise.all(data.items.map(async item => {
      const variant = await this.prisma.variant.findUnique({
        where: { id: item.variantId },
        include: { product: { select: { hsnCode: true } } }
      });
      return {
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
        hsnCode: variant?.product?.hsnCode || 'TEXTILE-00'
      };
    }));

    const generatedOrderId = `RAAGHAS-${Math.floor(Date.now() / 1000).toString(36).toUpperCase()}${Math.floor(Math.random() * 10000).toString(36).toUpperCase()}`;

    const order = await this.prisma.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          id: generatedOrderId,
          status: 'CREATED',
          financialStatus: 'pending',
          source: 'admin',
          totalAmount,
          subtotal,
          shipping,
          discountAmount: discount,
          customerName: data.customerName,
          customerEmail: data.customerEmail,
          customerPhone: data.customerPhone,
          shippingAddress: data.shippingAddress,
          billingAddress: data.billingAddress || data.shippingAddress,
          notes: data.notes,
          items: { create: enrichedItems },
        }
      });

      // Decrement inventory for each item
      for (const item of data.items) {
        const variant = await tx.variant.update({
          where: { id: item.variantId },
          data: { inventory: { decrement: item.quantity } }
        });
        
        await tx.stockLog.create({
          data: {
            variantId: item.variantId,
            type: 'ORDER',
            change: -item.quantity,
            newBalance: variant.inventory,
            referenceId: newOrder.id,
            notes: `Reserved for draft order ${newOrder.id}`
          }
        });
      }

      return newOrder;
    });

    const settings = await this.prisma.storeSettings.findUnique({ where: { id: 'global' } });
    const prefix = settings?.orderPrefix || '';
    const suffix = settings?.orderSuffix || '';
    const confirmedCount = await this.prisma.order.count({
      where: { formattedOrderNumber: { not: null } }
    });
    const formatted = `${prefix}${confirmedCount + 1001}${suffix}`;
    
    await this.prisma.order.update({
      where: { id: order.id },
      data: { formattedOrderNumber: formatted }
    });

    await this.prisma.orderActivity.create({
      data: {
        orderId: order.id,
        type: 'NOTE',
        message: 'Draft order created by Admin'
      }
    });

    return await this.prisma.order.findUnique({ where: { id: order.id }, include: { items: true } }) || order;
  }

  async updateOrderItems(id: string, data: { items: { variantId: string, quantity: number, price: number }[] }) {
    const order = await this.prisma.order.findUnique({ where: { id }, include: { items: true } });
    if (!order) throw new NotFoundException('Order not found');

    const subtotal = data.items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const shipping = Number(order.shipping || 0);
    const discount = Number(order.discountAmount || 0);
    const totalAmount = subtotal + shipping - discount;

    const enrichedItems = await Promise.all(data.items.map(async item => {
      const variant = await this.prisma.variant.findUnique({
        where: { id: item.variantId },
        include: { product: { select: { hsnCode: true } } }
      });
      return {
        variantId: item.variantId,
        quantity: item.quantity,
        price: item.price,
        hsnCode: variant?.product?.hsnCode || 'TEXTILE-00'
      };
    }));

    await this.prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { orderId: id } });
      
      await tx.order.update({
        where: { id },
        data: {
          subtotal,
          totalAmount,
          items: { create: enrichedItems }
        }
      });

      await tx.orderActivity.create({
         data: { orderId: id, type: 'NOTE', message: 'Admin modified order items' }
      });
    });

    return this.getOrderById(id);
  }

  async createRefund(id: string, data: { amount: number; reason: string; gateway?: string; transactionId?: string; notes?: string }) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    if (order.financialStatus !== 'paid' && order.financialStatus !== 'partially_refunded') {
      throw new BadRequestException(`Cannot process refund: Order is ${order.financialStatus || 'unpaid'}.`);
    }

    const orderWithReturns = await this.prisma.order.findUnique({
      where: { id },
      include: { returns: true }
    });
    
    const totalRefundedAlready = orderWithReturns?.returns.reduce((sum, r) => sum + (Number(r.refundAmount) || 0), 0) || 0;
    const remainingRefundable = Number(order.totalAmount) - totalRefundedAlready;
    const refundAmount = Number(data.amount);

    if (refundAmount > remainingRefundable) {
      throw new BadRequestException(`Refund amount cannot exceed the remaining refundable amount (₹${remainingRefundable}).`);
    }

    const orderTotal = Number(order.totalAmount);

    let refundTransactionId = data.transactionId || `refund_${Date.now()}`;
    const targetGateway = (data.gateway || order.paymentMethod || 'manual').toUpperCase();
    
    if (targetGateway === 'RAZORPAY' || targetGateway === 'PHONEPE') {
      if (order.paymentId || order.paymentIntentId) {
        const gwRefund = await this.paymentsService.processAutomatedRefund(order.paymentId || order.paymentIntentId || '', refundAmount, targetGateway);
        if (gwRefund.success) {
           refundTransactionId = gwRefund.refundId;
        }
      } else {
        throw new BadRequestException('Cannot process automated refund: No gateway payment ID found on the order.');
      }
    } else if (targetGateway === 'WALLET' || targetGateway === 'STORE_CREDIT') {
      if (!order.userId) throw new BadRequestException('Cannot issue wallet refund for guest order.');
      await this.prisma.$transaction(async (tx) => {
        let wallet = await tx.wallet.findUnique({ where: { userId: order.userId as string } });
        if (!wallet) {
          wallet = await tx.wallet.create({ data: { userId: order.userId as string, balance: 0 } });
        }
        await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: refundAmount } }
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: 'CREDIT',
            amount: refundAmount,
            reason: 'REFUND',
            referenceId: order.id,
            notes: `Refund for Order #${order.orderNumber ? order.orderNumber + 1000 : order.id.slice(-8)}: ${data.reason}`,
            status: 'COMPLETED'
          }
        });
      });
      refundTransactionId = `wallet_refund_${Date.now()}`;
    }

    // Determine new financial status
    const newTotalRefunded = totalRefundedAlready + refundAmount;
    const newFinancialStatus = newTotalRefunded >= orderTotal ? 'refunded' : 'partially_refunded';

    // Track the refund in OrderReturn so it is visible in the UI and calculated correctly
    await this.prisma.orderReturn.create({
      data: {
        orderId: id,
        status: 'COMPLETED' as any,
        reason: data.reason || 'Direct Refund',
        notes: data.notes || `Refund ID: ${refundTransactionId}`,
        refundAmount: refundAmount,
        refundStatus: 'COMPLETED'
      }
    });

    // Update order financial status
    await this.prisma.order.update({
      where: { id },
      data: { financialStatus: newFinancialStatus } as any,
    });

    // Activity log
    await this.prisma.orderActivity.create({
      data: {
        orderId: id,
        type: 'STATUS_CHANGE',
        message: `Refund of ₹${refundAmount} processed via ${targetGateway}. Reason: ${data.reason}. ${data.notes ? 'Notes: ' + data.notes : ''}`.trim(),
      }
    });

    // Revoke Referral Reward if full refund
    if (newFinancialStatus === 'refunded') {
      this.growthService.revokeReferralReward(id).catch(e => this.logger.error(`Failed to revoke referral reward for order ${id}`, e));
    }

      // 9. Notify user
      await this.notificationsService.notify('REFUND_INITIATED', {
        email: order.customerEmail,
        customerName: order.customerName,
        order: { shortId: order.formattedOrderNumber || order.id.slice(-8).toUpperCase() },
        refundAmount: refundAmount,
        reason: data.reason
      });

      return { success: true, refundAmount, financialStatus: newFinancialStatus };
  }

  async updateFinancialStatus(id: string, status: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) throw new NotFoundException('Order not found');

    const updateData: any = { financialStatus: status };
    if (status === 'paid') {
      updateData.paidAt = new Date();
    }

    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: updateData
    });

    await this.prisma.orderActivity.create({
      data: {
        orderId: id,
        type: 'STATUS_CHANGE',
        message: `Order financial status manually updated to ${status}`
      }
    }).catch(() => {});

    return updatedOrder;
  }

  @Cron(CronExpression.EVERY_HOUR)
  async processAbandonedCarts() {
    this.logger.log('Running Abandoned Cart Recovery Cron...');
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twentyFiveHoursAgo = new Date(Date.now() - 25 * 60 * 60 * 1000);

    const abandonedOrders = await this.prisma.order.findMany({
      where: {
        status: 'PAYMENT_PENDING',
        createdAt: {
          lte: twentyFourHoursAgo,
          gt: twentyFiveHoursAgo,
        },
      },
    });

    this.logger.log(`Found ${abandonedOrders.length} abandoned carts (24h old)`);

    for (const order of abandonedOrders) {
      if (!order.customerEmail) continue;
      
      const checkoutUrl = `${process.env.FRONTEND_URL || 'https://raaghas.in'}/checkout/${order.id}`;
      
      await this.mailService.sendAbandonedCartEmail(
        order.customerEmail,
        order.customerName || 'there',
        order.id,
        checkoutUrl
      ).catch(e => this.logger.error(`Failed to send abandoned cart email for ${order.id}:`, e));
      
      // Log activity
      await this.prisma.orderActivity.create({
        data: {
          orderId: order.id,
          type: 'ABANDONED_CART_EMAIL_SENT',
          message: 'Sent abandoned cart recovery email to customer.',
        }
      });
    }
  }
}

