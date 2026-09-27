import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import { NotificationsService } from '../notifications/notifications.service';
import { SettingsService } from '../settings/settings.service';
import { Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private settingsService: SettingsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  // ─── THE RADAR: Analytics & Health ───────────────────────────────────────

  async getInventoryRadar() {
    const cacheKey = 'inventory_radar';
    const cachedRadar = await this.cacheManager.get(cacheKey);
    if (cachedRadar) return cachedRadar as any;

    const products = await this.prisma.product.findMany({
      include: { variants: { include: { reservations: true } } }
    });

    const alerts: any[] = [];
    let criticalCount = 0;
    let lowCount = 0;

    for (const product of products) {
      for (const variant of product.variants) {
        const reservedCount = (variant.reservations as any[]).reduce((s: number, r: any) => s + r.quantity, 0);
        const available = variant.inventory - reservedCount;
        if (available <= 0) {
          criticalCount++;
          alerts.push({ id: variant.id, product: product.title, variant: variant.sku, status: 'OUT_OF_STOCK', available });
        } else if (available <= product.lowStockThreshold) {
          lowCount++;
          alerts.push({ id: variant.id, product: product.title, variant: variant.sku, status: 'LOW_STOCK', available });
        }
      }
    }

    const radarData = {
      summary: { totalProducts: products.length, critical: criticalCount, low: lowCount, healthy: products.length - criticalCount - lowCount },
      alerts: alerts.slice(0, 5),
      allAlerts: alerts, // Expose all for cron digest
    };

    await this.cacheManager.set(cacheKey, radarData, 60000); // 1 minute TTL
    return radarData;
  }

  // ─── THE GRID: Bulk Management ──────────────────────────────────────────

  async getInventoryGrid() {
    const cacheKey = 'inventory_grid';
    const cachedGrid = await this.cacheManager.get(cacheKey);
    if (cachedGrid) return cachedGrid as any;

    const gridData = await this.prisma.variant.findMany({
      include: { product: { select: { title: true, lowStockThreshold: true } }, reservations: true },
      orderBy: { sku: 'asc' },
    });

    await this.cacheManager.set(cacheKey, gridData, 60000); // 1 minute TTL
    return gridData;
  }

  // ─── PUBLIC: Check available stock (inventory - active reservations) ─────

  async getAvailableStock(variantId: string, tx?: any): Promise<number> {
    const prisma = tx || this.prisma;
    const variant = await prisma.variant.findUnique({
      where: { id: variantId },
      include: {
        reservations: {
          where: { expiresAt: { gt: new Date() } }, // Only non-expired reservations
        },
      },
    });
    if (!variant) throw new NotFoundException(`Variant ${variantId} not found`);
    const reserved = (variant.reservations as any[]).reduce((s: number, r: any) => s + r.quantity, 0);
    return variant.inventory - reserved;
  }

  async adjustStock(data: {
    variantId: string;
    change: number;
    type: 'SALE' | 'RESTOCK' | 'ADJUSTMENT' | 'RETURN';
    referenceId?: string;
    notes?: string;
  }, tx?: any) {
    const prisma = tx || this.prisma;

    const variant = await prisma.variant.findUnique({ where: { id: data.variantId } });
    if (!variant) throw new NotFoundException('Variant not found');

    const newBalance = variant.inventory + data.change;
    if (newBalance < 0 && data.type !== 'ADJUSTMENT') {
      throw new BadRequestException(`Insufficient inventory for variant ${data.variantId}`);
    }

    const updatedVariant = await prisma.variant.update({
      where: { id: data.variantId },
      data: { inventory: { [data.change >= 0 ? 'increment' : 'decrement']: Math.abs(data.change) } },
    });

    await prisma.stockLog.create({
      data: {
        variantId: data.variantId,
        type: data.type,
        change: data.change,
        newBalance: updatedVariant.inventory,
        referenceId: data.referenceId,
        notes: data.notes,
      },
    });

    const productInfo = await prisma.product.findUnique({
      where: { id: updatedVariant.productId },
      include: { variants: true }
    });
    if (productInfo) {
      const totalInventory = productInfo.variants.reduce((sum: number, v: any) => sum + v.inventory, 0);
      if (totalInventory <= 0) {
        this.logger.log(`Product ${productInfo.id} inventory is zero (all variants out of stock) — remaining published as Sold Out.`);
      }
    }

    return updatedVariant;
  }

  // ─── RESERVATIONS: Transaction-Safe with PostgreSQL Advisory Lock ─────────

  private variantLockKey(variantId: string): number {
    let hash = 0;
    for (let i = 0; i < variantId.length; i++) {
      hash = (Math.imul(31, hash) + variantId.charCodeAt(i)) | 0;
    }
    return Math.abs(hash);
  }

  async reserveStock(data: {
    variantId: string;
    quantity: number;
    proformaId?: string;
    orderIntentId?: string;
    expiresInMinutes: number;
  }, externalTx?: any): Promise<any> {
    if (externalTx) {
      return this._reserveWithinTx(externalTx, data);
    }

    return this.prisma.$transaction(async (tx) => {
      return this._reserveWithinTx(tx, data);
    }, { timeout: 10000 }); 
  }

  private async _reserveWithinTx(tx: any, data: {
    variantId: string;
    quantity: number;
    proformaId?: string;
    orderIntentId?: string;
    expiresInMinutes: number;
  }) {
    const lockKey = this.variantLockKey(data.variantId);

    await tx.$executeRaw`SELECT pg_advisory_xact_lock(${lockKey})`;

    const variant = await tx.variant.findUnique({
      where: { id: data.variantId },
      include: {
        product: { select: { title: true } },
        reservations: {
          where: { expiresAt: { gt: new Date() } }, 
        },
      },
    });

    if (!variant) throw new NotFoundException(`Variant ${data.variantId} not found`);

    const currentReserved = (variant.reservations as any[]).reduce((s: number, r: any) => s + r.quantity, 0);
    const availableStock = Math.max(0, variant.inventory - currentReserved);

    if (availableStock < data.quantity) {
      const optionDetails = [variant.option1Value, variant.option2Value, variant.option3Value]
        .filter(Boolean)
        .filter(v => v !== 'Default' && v !== 'Default Title')
        .join(' / ');
      
      const productTitle = (variant as any).product?.title || 'This item';
      const displayName = optionDetails ? `${productTitle} (${optionDetails})` : productTitle;

      if (availableStock <= 0) {
        throw new BadRequestException(
          `Sorry, "${displayName}" was just purchased by another customer and is now sold out. Please remove it from your bag to continue.`
        );
      } else {
        throw new BadRequestException(
          `Only ${availableStock} piece${availableStock === 1 ? '' : 's'} remaining for "${displayName}". Please adjust your bag quantity to proceed.`
        );
      }
    }

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + data.expiresInMinutes);

    const reservation = await tx.stockReservation.create({
      data: {
        variantId: data.variantId,
        proformaId: data.proformaId,
        orderIntentId: data.orderIntentId,
        quantity: data.quantity,
        expiresAt,
      },
    });

    await tx.stockLog.create({
      data: {
        variantId: data.variantId,
        type: 'RESERVATION' as any,
        change: 0,
        newBalance: variant.inventory, 
        referenceId: data.proformaId || data.orderIntentId,
        notes: `Reserved ${data.quantity} units (Available stock is now ${availableStock - data.quantity}) for Intent: ${data.proformaId || data.orderIntentId || 'Unknown'}`,
      },
    });

    this.logger.log(`✅ Reserved ${data.quantity} units of ${variant.sku} (${availableStock - data.quantity} left)`);
    return reservation;
  }

  // ─── COMMIT: Called after successful payment — deducts real inventory ─────

  async commitStockForOrder(orderId: string, items: Array<{ variantId: string; quantity: number }>, providerOrderId: string, tx?: any) {
    const prisma = tx || this.prisma;

    for (const item of items) {
      await prisma.stockReservation.deleteMany({
        where: {
          variantId: item.variantId,
          orderIntentId: providerOrderId,
        },
      });

      const updated = await prisma.variant.update({
        where: { id: item.variantId },
        data: { inventory: { decrement: item.quantity } },
      });

      if (updated.inventory < 0) {
        this.logger.error(`CRITICAL: Variant ${item.variantId} inventory went negative! Auto-correcting to 0.`);
        await prisma.variant.update({ where: { id: item.variantId }, data: { inventory: 0 } });
      }

      await prisma.stockLog.create({
        data: {
          variantId: item.variantId,
          type: 'SALE',
          change: -item.quantity,
          newBalance: Math.max(0, updated.inventory),
          referenceId: orderId,
          notes: `Sold ${item.quantity} units — Order #${orderId.slice(-8).toUpperCase()}`,
        },
      });

      const productInfo = await prisma.product.findUnique({
        where: { id: updated.productId },
        include: { variants: true }
      });
      if (productInfo) {
        const totalInventory = productInfo.variants.reduce((sum: number, v: any) => sum + v.inventory, 0);
        if (totalInventory <= 0) {
          this.logger.log(`Product ${productInfo.id} inventory is zero following order commit — remaining published as Sold Out.`);
        }
      }
    }
  }

  // ─── RELEASE: Called on payment failure / cancellation ───────────────────

  async releaseStockForIntent(providerOrderId: string, tx?: any) {
    const prisma = tx || this.prisma;

    const reservations = await prisma.stockReservation.findMany({
      where: { orderIntentId: providerOrderId },
      include: { variant: true },
    });

    if (reservations.length === 0) return;

    await prisma.stockReservation.deleteMany({ where: { orderIntentId: providerOrderId } });

    for (const res of reservations) {
      await prisma.stockLog.create({
        data: {
          variantId: res.variantId,
          type: 'ADJUSTMENT' as any,
          change: 0,
          newBalance: res.variant.inventory, 
          referenceId: providerOrderId,
          notes: `Reservation of ${res.quantity} units released — Intent ${providerOrderId} cancelled/failed`,
        },
      });
    }

    this.logger.log(`♻️ Released ${reservations.length} reservation(s) for Intent ${providerOrderId}`);
  }

  // ─── CRON: Auto-expire stale reservations every 10 minutes ──────────────

  @Cron(CronExpression.EVERY_10_MINUTES)
  async clearExpiredReservations() {
    const now = new Date();
    const expired = await this.prisma.stockReservation.findMany({
      where: { expiresAt: { lt: now } },
      include: { variant: { include: { reservations: true } } },
    });

    if (expired.length === 0) return 0;
    this.logger.log(`🧹 Clearing ${expired.length} expired stock reservations...`);

    await this.prisma.$transaction(async (tx: any) => {
      await tx.stockReservation.deleteMany({ where: { id: { in: expired.map((r: any) => r.id) } } });
      for (const res of expired) {
        await tx.stockLog.create({
          data: {
            variantId: res.variantId,
            type: 'ADJUSTMENT',
            change: 0,
            newBalance: res.variant.inventory, 
            referenceId: res.orderIntentId,
            notes: `Reservation of ${res.quantity} units auto-expired (Intent: ${res.orderIntentId || 'Unknown'}). Available stock restored.`,
          },
        });
      }
    });

    return expired.length;
  }

  // ─── CRON: Daily Low Stock Digest ────────────────────────────────────────

  @Cron('0 9 * * *') // Run every day at 9:00 AM
  async sendDailyStockDigest() {
    this.logger.log('📊 Generating Daily Low Stock Digest...');
    
    const radar = await this.getInventoryRadar();
    const { critical, low } = radar.summary;
    
    if (critical === 0 && low === 0) {
      this.logger.log('No low stock items. Digest skipped.');
      return;
    }

    const settings = await this.settingsService.getSettings();
    const supportEmail = settings.supportEmail || 'admin@raaghas.in';

    let alertsHtml = '';
    for (const alert of radar.allAlerts) {
      const isCritical = alert.status === 'OUT_OF_STOCK';
      const color = isCritical ? '#dc2626' : '#ea580c';
      const label = isCritical ? 'Critical (0)' : `Low (${alert.available})`;
      
      alertsHtml += `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${alert.product}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee;">${alert.variant}</td>
          <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right; color: ${color}; font-weight: bold;">${label}</td>
        </tr>
      `;
    }

    await this.notificationsService.notify('ADMIN_LOW_STOCK_ALERT', {
      email: supportEmail,
      criticalCount: critical,
      lowCount: low,
      alertsHtml
    });

    this.logger.log(`✅ Sent Daily Digest to ${supportEmail} (${critical} critical, ${low} low)`);
  }
}
