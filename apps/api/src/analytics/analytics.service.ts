import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async getExecutiveOverview(from?: string) {
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    // ─── REVENUE DATA ───
    const b2cOrders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: 'CANCELLED' }
      },
      select: { totalAmount: true, createdAt: true }
    });

    const b2bOrders = await (this.prisma as any).wholesaleOrder.findMany({
      where: {
        createdAt: { gte: startDate },
        status: { not: 'CANCELLED' }
      },
      select: { totalAmount: true, advancePaid: true, createdAt: true }
    });

    const b2cTotal = b2cOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const b2bTotal = b2bOrders.reduce((sum, o) => sum + Number(o.totalAmount), 0);
    const b2bPaid  = b2bOrders.reduce((sum, o) => sum + Number(o.advancePaid || 0), 0);

    // ─── ORDER COUNTS & AOVs ───
    const b2cCount = b2cOrders.length;
    const b2bCount = b2bOrders.length;
    const totalOrders = b2cCount + b2bCount;

    const aovB2C = b2cCount > 0 ? b2cTotal / b2cCount : 0;
    const aovB2B = b2bCount > 0 ? b2bTotal / b2bCount : 0;

    // ─── SPLIT PERCENTAGES ───
    const totalRevenue = b2cTotal + b2bTotal;
    const b2bPercentage = totalRevenue > 0 ? (b2bTotal / totalRevenue) * 100 : 0;
    const b2cPercentage = totalRevenue > 0 ? (b2cTotal / totalRevenue) * 100 : 100;

    // ─── RECENT ACTIVITY ───
    const recentB2C = await this.prisma.order.findMany({
      take: 10,
      orderBy: { createdAt: 'desc' },
      select: { customerName: true, totalAmount: true, status: true, createdAt: true }
    });

    const recentB2B = await (this.prisma as any).wholesaleOrder.findMany({
      take: 10,
      include: { retailer: { select: { businessName: true } } },
      orderBy: { createdAt: 'desc' }
    });

    const unifiedActivity = [
      ...recentB2C.map(o => ({
        name: o.customerName || "B2C Customer",
        amount: Number(o.totalAmount),
        channel: 'RETAIL',
        status: o.status,
        date: o.createdAt
      })),
      ...recentB2B.map(o => ({
        name: o.retailer?.businessName || "Wholesale Buyer",
        amount: Number(o.totalAmount),
        channel: 'WHOLESALE',
        status: o.status,
        date: o.createdAt
      }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);

    // ─── TREND DATA FOR CHARTS ───
    const trendMap = new Map<string, { date: string, b2bSales: number, b2cSales: number, profit: number }>();
    const diffDays = Math.ceil((Date.now() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    for (let i = 0; i <= diffDays; i++) {
       const d = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000);
       const dateStr = d.toISOString().split('T')[0];
       trendMap.set(dateStr, { date: dateStr, b2bSales: 0, b2cSales: 0, profit: 0 });
    }

    b2cOrders.forEach(o => {
       const dateStr = o.createdAt.toISOString().split('T')[0];
       if (trendMap.has(dateStr)) {
          const entry = trendMap.get(dateStr)!;
          entry.b2cSales += Number(o.totalAmount);
          entry.profit += Number(o.totalAmount) * 0.25; // Approximate 25% profit margin
       }
    });

    b2bOrders.forEach(o => {
       const dateStr = o.createdAt.toISOString().split('T')[0];
       if (trendMap.has(dateStr)) {
          const entry = trendMap.get(dateStr)!;
          entry.b2bSales += Number(o.totalAmount);
          entry.profit += Number(o.totalAmount) * 0.15; // Approximate 15% profit margin for wholesale
       }
    });

    const trendData = Array.from(trendMap.values());

    return {
      revenue: {
        total: totalRevenue,
        b2b: b2bTotal,
        b2c: b2cTotal,
        b2bUncollected: b2bTotal - b2bPaid
      },
      orders: {
        total: totalOrders,
        b2cCount,
        b2bCount,
        aovB2C,
        aovB2B
      },
      split: {
        b2bPercentage,
        b2cPercentage
      },
      recentActivity: unifiedActivity,
      trendData
    };
  }

  async getTaxReports(from?: string, to?: string) {
    const startDate = from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = to ? new Date(to) : new Date();

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: { gte: startDate, lte: endDate },
        financialStatus: 'paid',
        status: { not: 'CANCELLED' }
      },
    });

    // Fetch all invoices linked to these orders via referenceId
    const orderIds = orders.map(o => o.id);
    const invoices = await this.prisma.invoice.findMany({
      where: { referenceId: { in: orderIds } },
      select: { referenceId: true, invoiceNumber: true }
    });
    const invoiceMap = new Map(invoices.map(inv => [inv.referenceId, inv.invoiceNumber]));

    let totalRevenue = 0;
    let totalTaxableValue = 0;
    let totalTaxCollected = 0;

    const itemsReport = orders.map(o => {
      const orderTotal = Number(o.totalAmount || 0);
      const orderTax = Number((o as any).taxes || 0);
      const orderTaxable = orderTotal - orderTax;

      totalRevenue += orderTotal;
      totalTaxCollected += orderTax;
      totalTaxableValue += orderTaxable;

      const formattedNum = (o as any).formattedOrderNumber || ((o as any).orderNumber != null ? `RGS-${Number((o as any).orderNumber) + 1000}` : null);
      const invoiceNumber = invoiceMap.get(o.id) || formattedNum || o.id.slice(-8).toUpperCase();

      return {
        orderId: o.id,
        invoiceNumber,
        formattedOrderNumber: formattedNum || o.id.slice(-8).toUpperCase(),
        customerName: o.customerName,
        customerEmail: o.customerEmail,
        date: o.createdAt,
        totalAmount: orderTotal,
        taxableValue: orderTaxable,
        cgst: orderTax / 2,
        sgst: orderTax / 2,
        totalTax: orderTax,
        paymentMethod: o.paymentMethod || 'COD'
      };
    });

    return {
      summary: {
        totalRevenue,
        totalTaxableValue,
        totalTaxCollected,
        cgstSplit: totalTaxCollected / 2,
        sgstSplit: totalTaxCollected / 2,
      },
      reports: itemsReport
    };
  }
}
