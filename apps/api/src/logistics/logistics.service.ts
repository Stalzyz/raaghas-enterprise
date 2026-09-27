import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ShipmentStatus, ReturnStatus } from '@raaghas/database';
import { ConfigService } from '@nestjs/config';
import { ShiprocketProvider } from './providers/shiprocket.provider';
import { DelhiveryProvider } from './providers/delhivery.provider';
import { STCourierProvider } from './providers/st-courier.provider';
import { IndiaPostProvider } from './providers/india-post.provider';
import { CreateShipmentDto, ShippingProvider } from './providers/shipping-provider.interface';
import { forwardRef, Inject } from '@nestjs/common';
import { PaymentsService } from '../payments/payments.service';
import { MarketingService } from '../marketing/marketing.service';

@Injectable()
export class LogisticsService {
  private readonly logger = new Logger(LogisticsService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private shiprocket: ShiprocketProvider,
    private delhivery: DelhiveryProvider,
    private stCourier: STCourierProvider,
    private indiaPost: IndiaPostProvider,
    @Inject(forwardRef(() => PaymentsService))
    private paymentsService: PaymentsService,
    @Inject(forwardRef(() => MarketingService))
    private marketingService: MarketingService,
  ) {}

  // --- SHIPPING CONFIGURATION ---

  async getGlobalFreeShippingThreshold() {
    // 1. Check custom rules first
    const settings = await (this.prisma as any).storeSettings.findUnique({ where: { id: 'global' }});
    if (settings && settings.customRules && Array.isArray(settings.customRules)) {
       const freeRule = settings.customRules.find((r: any) => Number(r.cost) === 0 && r.minCartValue);
       if (freeRule) return { threshold: Number(freeRule.minCartValue) };
    }

    // 2. Check Shipping Methods across all zones for the lowest free shipping threshold
    const methods = await this.prisma.shippingMethod.findMany({
       where: { baseCost: 0, isActive: true, minOrderValue: { not: null } },
       orderBy: { minOrderValue: 'asc' }
    });

    if (methods && methods.length > 0 && methods[0].minOrderValue) {
       return { threshold: Number(methods[0].minOrderValue) };
    }

    return { threshold: 1899 };
  }

  private getPossibleStateNames(state: string): string[] {
    const raw = state.toLowerCase().replace(/[^a-z]/g, '');
    const map: Record<string, string[]> = {
      'andhrapradesh': ['Andhra Pradesh', 'AndhraPradesh', 'Andhrapradesh', 'AP'],
      'tamilnadu': ['Tamil Nadu', 'TamilNadu', 'Tamilnadu', 'TN'],
      'maharashtra': ['Maharashtra', 'Maharastra', 'MH'],
      'karnataka': ['Karnataka', 'KA'],
      'kerala': ['Kerala', 'Kerela', 'KL'],
      'telangana': ['Telangana', 'TS', 'TG'],
      'delhi': ['Delhi', 'DelhiNCR', 'New Delhi', 'DL'],
      'delhincr': ['Delhi', 'DelhiNCR', 'New Delhi', 'DL'],
      'westbengal': ['West Bengal', 'WestBengal', 'WB'],
      'uttarpradesh': ['Uttar Pradesh', 'UttarPradesh', 'UP'],
      'rajasthan': ['Rajasthan', 'RJ'],
      'madhyapradesh': ['Madhya Pradesh', 'MadhyaPradesh', 'MP'],
      'jammuandkashmir': ['Jammu and Kashmir', 'Jammu & Kashmir', 'J&K', 'JK'],
    };
    
    const baseList = map[raw] || [state, state.trim()];
    
    // Auto-generate lower and UPPER case variations to combat inconsistent DB entries
    const expandedList = new Set<string>();
    for (const item of baseList) {
      expandedList.add(item);
      expandedList.add(item.toLowerCase());
      expandedList.add(item.toUpperCase());
    }
    
    return Array.from(expandedList);
  }

  async getShippingOptions(state: string, cartTotal: number, items: any[] = []) {
    const possibleStates = this.getPossibleStateNames(state);

    // 1. Fetch exact product details from database for accurate category/collection rules
    const productIds = items.map(i => i.id || i.productId).filter(Boolean);
    const dbProducts = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, category: true, collection: true, tags: true, productType: true }
    });

    const uniqueCollections = new Set<string>();
    let hasHeavyItems = false;

    for (const item of items) {
      const dbProduct = dbProducts.find(p => p.id === (item.id || item.productId));
      if (!dbProduct) continue;

      if (dbProduct.collection) uniqueCollections.add(dbProduct.collection);
      if (dbProduct.category) uniqueCollections.add(dbProduct.category); // Also count category as a grouping

      const searchString = `${dbProduct.tags} ${dbProduct.productType} ${dbProduct.category} ${dbProduct.collection}`.toLowerCase();
      if (['lehenga', 'bridal', 'heavy'].some(term => searchString.includes(term))) {
        hasHeavyItems = true;
      }
    }

    const zones = await this.prisma.shippingZone.findMany({
      where: {
        isActive: true,
        OR: [
          { regions: { hasSome: possibleStates } },
          { regions: { isEmpty: true } }
        ]
      },
      include: { methods: { where: { isActive: true } } }
    });

    // If no specific zone, find 'National' or 'Rest of World'
    let selectedZones = zones;
    if (zones.length === 0) {
      selectedZones = await this.prisma.shippingZone.findMany({
        where: {
          isActive: true,
          name: { in: ['National', 'India', 'All'] }
        },
        include: { methods: { where: { isActive: true } } }
      });
    }

    const storeSettings = await this.prisma.storeSettings.findUnique({ where: { id: 'global' } });
    const customRules = Array.isArray(storeSettings?.customShippingRules) ? storeSettings.customShippingRules : [];

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

    // Calculate quantities per collection for the dynamic rules
    const collectionQuantities: Record<string, number> = {};
    for (const item of items) {
      const dbProduct = dbProducts.find(p => p.id === (item.id || item.productId));
      if (dbProduct && dbProduct.collection) {
         collectionQuantities[dbProduct.collection] = (collectionQuantities[dbProduct.collection] || 0) + item.quantity;
      }
    }
    const options = selectedZones.flatMap(zone => 
      zone.methods
        .filter(method => {
          if (method.minOrderValue && cartTotal < Number(method.minOrderValue)) return false;
          if (method.maxOrderValue && cartTotal >= Number(method.maxOrderValue)) return false;
          return true;
        })
        .map(method => {
        const isInternational = zone.name.toLowerCase().includes('international') || 
                                zone.name.toLowerCase().includes('world');

        // Base cost from the method, or overridden by International flat rate
        let cost = isInternational ? 2500 : Number(method.baseCost || 100);
        
        // 1. Quantity-Based Logic (e.g., volume surcharge) - REMOVED PER USER REQUEST

        // 3. Multi-Collection Surcharge (Dispatch from multiple warehouses)
        // Only applies if they order from more than 2 distinct collections/categories
        let multiCollectionSurcharge = 0;
        if (!isInternational && uniqueCollections.size > 2) {
          multiCollectionSurcharge = 150;
          cost += multiCollectionSurcharge;
        }

        // 4. Product-Based Logic (Heavy/Bridal Surcharge)
        // Always applies, even if standard shipping is free.
        let heavySurcharge = 0;
        if (hasHeavyItems) {
          heavySurcharge = 250;
          cost += heavySurcharge;
        }

        let customRuleDesc = '';
        let customRuleApplied = false;

        // 5. Evaluate Custom Shipping Rules (Overrides cost if matched)
        // 5. Evaluate Advanced Custom Shipping Rules (Overrides cost if matched)
        if (!isInternational) {
          for (const rule of customRules as any[]) {
            // 1. Zone Check
            if (rule.zones && Array.isArray(rule.zones) && rule.zones.length > 0) {
              const matchesZone = rule.zones.some((z: string) => zone.name.toLowerCase() === z.toLowerCase());
              if (!matchesZone) continue; 
            }

            // 2. Cart Value Check
            if (rule.minCartValue && cartTotal < Number(rule.minCartValue)) continue;
            if (rule.maxCartValue && cartTotal >= Number(rule.maxCartValue)) continue;

            // 3. Item Count & Collection Check
            if (rule.collection && rule.collection.trim() !== '') {
              const qtyInCart = collectionQuantities[rule.collection] || 0;
              const requiredQty = rule.minItemCount ? Number(rule.minItemCount) : 1;
              if (qtyInCart < requiredQty) continue;
            } else if (rule.minItemCount && totalQuantity < Number(rule.minItemCount)) {
              // General Item Count Check (no collection specified)
              continue;
            }

            // If it passed all conditions!
            let calculatedCost = Number(rule.cost || 0);

            if (rule.baseItemCount && rule.extraItemCost) {
              const baseQty = Number(rule.baseItemCount);
              const extraCost = Number(rule.extraItemCost);
              
              // If collection is specified, only count items in that collection. Otherwise total cart items.
              let applicableQty = totalQuantity;
              if (rule.collection && rule.collection.trim() !== '') {
                applicableQty = collectionQuantities[rule.collection] || 0;
              }

              if (applicableQty > baseQty) {
                const extraItems = applicableQty - baseQty;
                calculatedCost += (extraItems * extraCost);
              }
            }

            cost = calculatedCost;
            customRuleDesc = ` (Promo: ${rule.name || 'Special Offer'} applied)`;
            customRuleApplied = true;
            break; // Stop at first matching rule
          }
        }

        let desc = method.description || "Standard Delivery";
        if (isInternational) desc = "International Standard Delivery";
        if (multiCollectionSurcharge > 0 && !customRuleApplied) desc += ` (Includes ₹${multiCollectionSurcharge} multi-warehouse fee)`;
        if (heavySurcharge > 0 && !customRuleApplied) desc += ` (Includes ₹${heavySurcharge} heavy item handling)`;
        if (customRuleApplied) desc += customRuleDesc;

        return {
          id: method.id,
          name: method.name,
          cost,
          description: desc,
          zoneName: zone.name,
          isHeavy: hasHeavyItems,
          uniqueCollectionsCount: uniqueCollections.size
        };
      })
    );

    if (options.length === 0) {
      // Ultimate fallback so we never block checkout for a missing state
      let cost = 100;
      let desc = "Standard Delivery";
      if (hasHeavyItems) {
        cost += 250;
        desc += " (Includes ₹250 heavy item handling)";
      }
      options.push({
        id: 'default-fallback',
        name: 'Standard Delivery',
        cost,
        description: desc,
        zoneName: 'National',
        isHeavy: hasHeavyItems,
        uniqueCollectionsCount: uniqueCollections.size
      });
    }

    return options;
  }

  async deleteShippingZone(id: string) {
    // Delete all methods inside the zone first
    await this.prisma.shippingMethod.deleteMany({
      where: { zoneId: id }
    });
    // Delete the zone
    return this.prisma.shippingZone.delete({
      where: { id }
    });
  }

  // --- FULFILLMENT ---

  async createFulfillment(orderId: string, items: { variantId: string, quantity: number }[]) {
    return this.prisma.fulfillment.create({
      data: {
        orderId,
        status: 'PROCESSING',
        items: {
          create: items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity
          }))
        }
      }
    });
  }

  // --- SHIPMENT ---

  async createShipment(fulfillmentId: string, data: { courierId: string, trackingId: string, estimatedDelivery?: Date }) {
    const shipment = await this.prisma.shipment.create({
      data: {
        fulfillmentId,
        courierId: data.courierId,
        trackingId: data.trackingId,
        estimatedDelivery: data.estimatedDelivery,
        status: 'SHIPPED',
        shippedAt: new Date(),
        trackingHistory: [
          { status: 'SHIPPED', timestamp: new Date(), location: 'Warehouse', message: 'Shipment has been picked up by courier.' }
        ]
      }
    });

    // Update fulfillment status
    await this.prisma.fulfillment.update({
      where: { id: fulfillmentId },
      data: { status: 'FULFILLED' }
    });

    // Update order status if all fulfillments are fulfilled
    const currentFulfillment = await this.prisma.fulfillment.findUnique({
      where: { id: fulfillmentId }
    });

    if (!currentFulfillment) return shipment;

    const orderWithFulfillments = await this.prisma.order.findUnique({
      where: { id: currentFulfillment.orderId },
      include: { fulfillments: true }
    });

    if (orderWithFulfillments) {
      const allFulfilled = orderWithFulfillments.fulfillments.every(f => f.status === 'FULFILLED');
      if (allFulfilled && orderWithFulfillments.status !== 'SHIPPED') {
        await this.prisma.order.update({
          where: { id: orderWithFulfillments.id },
          data: { status: 'SHIPPED' }
        });
      }
    }

    return shipment;
  }
  // --- AUTOMATED SHIPPING ---

  private getProvider(providerName?: string): ShippingProvider {
    const defaultProvider = this.configService.get<string>('DEFAULT_SHIPPING_PROVIDER') || 'shiprocket';
    const name = (providerName || defaultProvider).toLowerCase();

    switch (name) {
      case 'st-courier':
      case 'stcourier':
      case 'st_courier':
        return this.stCourier;
      case 'india-post':
      case 'indiapost':
      case 'india_post':
      case 'speedpost':
        return this.indiaPost;
      case 'delhivery':
        return this.delhivery;
      case 'shiprocket':
      default:
        return this.shiprocket;
    }
  }

  async createAutomatedShipment(orderId: string, providerName?: string) {
    const settings = await this.prisma.storeSettings.findUnique({ where: { id: 'global' } }) as any;
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { variant: { include: { product: true } } } } }
    });

    if (!order) throw new NotFoundException("We can't find this order. Please check the order number.");

    const address = order.shippingAddress as any;
    
    const shipmentDto: CreateShipmentDto = {
      orderId: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      address: {
        address: address.address,
        city: address.city,
        state: address.state,
        pincode: address.pincode,
        country: address.country || 'India',
      },
      items: order.items.map(item => ({
        name: item.variant.product.title,
        sku: item.variant.sku || item.id,
        quantity: item.quantity,
        price: Number(item.price),
        weight: 0.5, // Default weight in kg
      })),
      totalWeight: order.items.reduce((sum, item) => sum + (0.5 * item.quantity), 0),
      paymentMethod: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      subTotal: Number(order.totalAmount),
    };

    const provider = this.getProvider(providerName || settings?.shippingDefaultProvider || undefined);
    const result = await provider.createOrder(shipmentDto);

    // Create Fulfillment and Shipment record in DB
    const shipment = await this.prisma.shipment.create({
      data: {
        fulfillment: {
          create: {
            orderId: order.id,
            status: 'FULFILLED',
            items: {
              create: order.items.map(item => ({
                variantId: item.variantId,
                quantity: item.quantity
              }))
            }
          }
        },
        trackingId: result.trackingId,
        status: 'SHIPPED',
        shippedAt: new Date(),
        courier: {
          connectOrCreate: {
            where: { name: result.courierName || 'Shiprocket' },
            create: { name: result.courierName || 'Shiprocket' }
          }
        },
        trackingHistory: [
          { status: 'SHIPPED', timestamp: new Date(), message: `Shipment created via ${result.courierName}` }
        ]
      }
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'SHIPPED',
        trackingId: result.trackingId,
        carrierName: result.courierName,
      }
    });

    return shipment;
  }

  /**
   * 1-Click Automated Dispatch & Consignment Booking with ST Courier V2 API
   */
  async bookWithSTCourier(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: { include: { variant: { include: { product: true } } } } }
    });

    if (!order) throw new NotFoundException("Order not found");

    const address = (typeof order.shippingAddress === 'string' 
      ? JSON.parse(order.shippingAddress) 
      : order.shippingAddress) as any;

    const shipmentDto: CreateShipmentDto = {
      orderId: order.id,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      address: {
        address: address.address || address.addressLine1 || address.line1 || 'Delivery Address',
        city: address.city || 'Tamil Nadu',
        state: address.state || 'Tamil Nadu',
        pincode: String(address.pincode || address.zip || '600001'),
        country: address.country || 'India',
      },
      items: order.items.map(item => ({
        name: item.variant?.product?.title || 'Luxury Garment',
        sku: item.variant?.sku || 'SKU-RG',
        quantity: item.quantity,
        price: Number(item.price),
        weight: Number((item.variant as any)?.weight || 0.5),
      })),
      totalWeight: order.items.reduce((sum, i) => sum + Number((i.variant as any)?.weight || 0.5) * i.quantity, 0) || 0.5,
      paymentMethod: order.paymentMethod === 'COD' ? 'COD' : 'Prepaid',
      subTotal: Number(order.totalAmount || 0),
    };

    const bookingResult = await this.stCourier.createOrder(shipmentDto);

    // Create or find fulfillment
    let fulfillment = await this.prisma.fulfillment.findFirst({
      where: { orderId: order.id }
    });

    if (!fulfillment) {
      fulfillment = await this.prisma.fulfillment.create({
        data: {
          orderId: order.id,
          status: 'FULFILLED',
          items: {
            create: order.items.map(i => ({
              variantId: i.variantId,
              quantity: i.quantity
            }))
          }
        }
      });
    } else {
      await this.prisma.fulfillment.update({
        where: { id: fulfillment.id },
        data: { status: 'FULFILLED' }
      });
    }

    const courier = await this.prisma.courier.upsert({
      where: { name: 'ST Courier' },
      update: {},
      create: { name: 'ST Courier', website: 'https://stcourier.com' }
    });

    // Save shipment record
    const shipment = await this.prisma.shipment.create({
      data: {
        fulfillmentId: fulfillment.id,
        trackingId: bookingResult.trackingId,
        status: 'SHIPPED',
        shippedAt: new Date(),
        courierId: courier.id,
        trackingHistory: [
          {
            status: 'SHIPPED',
            timestamp: new Date(),
            location: 'Raaghas Dispatch Center',
            message: `Consignment booked successfully via ST Courier Express. AWB: ${bookingResult.trackingId}`
          }
        ]
      }
    });

    // Update order status
    await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: 'SHIPPED',
        fulfillmentStatus: 'fulfilled',
        trackingId: bookingResult.trackingId,
        carrierName: 'ST Courier',
        fulfilledAt: new Date(),
      }
    });

    // Send dispatch notification to customer
    this.marketingService.sendOrderNotification(order, 'ORDER_SHIPPED')
      .catch(e => this.logger.error(`Failed to send dispatch notification for order ${order.id}`, e));

    return {
      success: true,
      awb: bookingResult.trackingId,
      carrier: 'ST Courier',
      trackingUrl: bookingResult.labelUrl,
      shipment
    };
  }

  /**
   * Process 30-Minute Status Push Webhook from ST Courier
   */
  async handleSTCourierWebhook(body: any) {
    this.logger.log(`Received ST Courier 30-min status push: ${JSON.stringify(body)}`);
    const apiData = Array.isArray(body?.apiData) 
      ? body.apiData 
      : (Array.isArray(body) ? body : (Array.isArray(body?.data) ? body.data : []));
    const results: any[] = [];

    for (const entry of apiData) {
      const { awbno, trans_dtm, trans_for, trans_from, trans_to, delv_staff, status_code, pod_image } = entry;
      if (!awbno) continue;

      const normalizedStatus = this.stCourier.normalizeStatus(status_code);
      const isDelivered = normalizedStatus === 'DELIVERED';

      try {
        const shipment = await this.prisma.shipment.findFirst({
          where: { trackingId: String(awbno) },
          include: { fulfillment: { include: { order: true } } }
        });

        if (shipment) {
          const currentHistory = Array.isArray(shipment.trackingHistory) ? (shipment.trackingHistory as any[]) : [];
          const newEvent = {
            status: normalizedStatus,
            rawCode: status_code,
            location: trans_to || trans_from || 'In Transit',
            message: trans_for || `Status updated to ${normalizedStatus}`,
            timestamp: trans_dtm ? new Date(trans_dtm) : new Date(),
            delvStaff: delv_staff || undefined,
            podImage: pod_image || undefined,
          };

          await this.prisma.shipment.update({
            where: { id: shipment.id },
            data: {
              status: normalizedStatus as any,
              deliveredAt: isDelivered ? (trans_dtm ? new Date(trans_dtm) : new Date()) : shipment.deliveredAt,
              trackingHistory: [...currentHistory, newEvent],
            }
          });

          if (isDelivered && shipment.fulfillment?.order) {
            await this.prisma.order.update({
              where: { id: shipment.fulfillment.order.id },
              data: { status: 'DELIVERED' }
            });

            this.marketingService.sendOrderNotification(shipment.fulfillment.order, 'ORDER_DELIVERED')
              .catch(e => this.logger.error(`Failed to send delivery notification for order ${shipment.fulfillment.order.id}`, e));
          }

          results.push({ awbno, status: 'processed', normalizedStatus });
        } else {
          // If no shipment found, check order directly
          const order = await this.prisma.order.findFirst({ where: { trackingId: String(awbno) } });
          if (order && isDelivered) {
            await this.prisma.order.update({
              where: { id: order.id },
              data: { status: 'DELIVERED' }
            });
          }
          results.push({ awbno, status: 'order_updated_only' });
        }
      } catch (err: any) {
        this.logger.error(`Error processing ST Courier AWB ${awbno}: ${err.message}`);
        results.push({ awbno, status: 'error', error: err.message });
      }
    }

    return { received: apiData.length, processed: results };
  }

  async syncTrackingStatus(trackingId: string, providerName?: string) {
    const provider = this.getProvider(providerName);
    const tracking = await provider.trackShipment(trackingId);

    const oldShipment = await this.prisma.shipment.findUnique({
      where: { trackingId },
      include: { fulfillment: { include: { order: true } } }
    });

    const newStatus = this.mapStatus(tracking.status);

    const shipment = await this.prisma.shipment.update({
      where: { trackingId },
      data: {
        status: newStatus,
        trackingHistory: tracking.history as any,
        deliveredAt: newStatus === 'DELIVERED' ? new Date() : undefined,
      }
    });

    if (oldShipment && oldShipment.status !== 'DELIVERED' && newStatus === 'DELIVERED') {
      const order = oldShipment.fulfillment?.order;
      if (order) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'DELIVERED' }
        });
        
        // Notify the customer!
        this.marketingService.sendOrderNotification(order, 'ORDER_DELIVERED')
          .catch(e => this.logger.error(`Failed to send delivery notification for order ${order.id}`, e));
      }
    }

    return shipment;
  }

  private mapStatus(providerStatus: string): ShipmentStatus {
    const status = providerStatus.toUpperCase();
    if (status.includes('DELIVERED')) return 'DELIVERED';
    if (status.includes('CANCELLED') || status.includes('FAILED')) return 'FAILED';
    if (status.includes('RETURN')) return 'RETURNED';
    if (status.includes('OUT FOR DELIVERY')) return 'OUT_FOR_DELIVERY';
    if (status.includes('TRANSIT')) return 'IN_TRANSIT';
    return 'SHIPPED';
  }

  // --- TRACKING ---

  async getTracking(id: string) {
    const cleanId = (id || '').trim();
    const noHashId = cleanId.replace(/^#/, '');

    // Try by tracking ID, Shipment ID, or Order ID
    const shipment = await this.prisma.shipment.findFirst({
      where: { 
        OR: [
          { id: cleanId },
          { id: noHashId },
          { trackingId: cleanId },
          { trackingId: noHashId },
          { fulfillment: { orderId: cleanId } },
          { fulfillment: { orderId: noHashId } }
        ]
      },
      include: { 
        courier: true,
        fulfillment: { 
          include: { 
            order: {
              select: {
                id: true,
                formattedOrderNumber: true,
                customerName: true,
                status: true,
                carrierName: true,
                trackingId: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    if (!shipment) {
      // Check if order exists directly
      const order = await this.prisma.order.findFirst({
        where: {
          OR: [
            { id: cleanId },
            { id: noHashId },
            { trackingId: cleanId },
            { trackingId: noHashId },
            { formattedOrderNumber: cleanId },
            { formattedOrderNumber: noHashId },
            { formattedOrderNumber: { contains: noHashId, mode: 'insensitive' } }
          ]
        }
      });

      if (!order) {
        throw new NotFoundException('Tracking is not ready yet. Please check back later.');
      }

      const carrierName = order.carrierName || 'Standard Logistics';
      const trackingId = order.trackingId || id;
      let trackingUrl = '';

      if (carrierName.toLowerCase().includes('st courier') || carrierName.toLowerCase().includes('st_courier')) {
        trackingUrl = `https://stcourier.com/track/shipment?awb=${encodeURIComponent(trackingId)}`;
      } else if (carrierName.toLowerCase().includes('india post') || carrierName.toLowerCase().includes('speed post')) {
        trackingUrl = 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
      }

      return {
        id: order.id,
        trackingId: trackingId,
        status: order.status,
        courier: carrierName,
        trackingUrl,
        estimatedDelivery: order.estimatedDelivery,
        shippedAt: order.fulfilledAt || order.createdAt,
        history: [
          {
            status: order.status === 'DELIVERED' ? 'DELIVERED' : (order.status === 'SHIPPED' ? 'SHIPPED' : 'CONFIRMED'),
            message: `Order is currently in ${order.status.toLowerCase().replace('_', ' ')} state via ${carrierName}`,
            timestamp: order.fulfilledAt || order.createdAt,
            location: 'Raaghas Fulfillment Studio'
          }
        ],
        order: {
          id: order.id,
          customerName: order.customerName,
          status: order.status,
          createdAt: order.createdAt
        }
      };
    }

    const carrierName = shipment.courier?.name || shipment.fulfillment?.order?.carrierName || 'Standard Logistics';
    const trackingId = shipment.trackingId || id;
    let trackingUrl = '';

    if (carrierName.toLowerCase().includes('st courier') || carrierName.toLowerCase().includes('st_courier')) {
      trackingUrl = `https://stcourier.com/track/shipment?awb=${encodeURIComponent(trackingId)}`;
    } else if (carrierName.toLowerCase().includes('india post') || carrierName.toLowerCase().includes('speed post')) {
      trackingUrl = 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx';
    }

    return {
      id: shipment.id,
      trackingId: shipment.trackingId,
      status: shipment.status,
      courier: carrierName,
      trackingUrl,
      estimatedDelivery: shipment.estimatedDelivery,
      shippedAt: shipment.shippedAt,
      deliveredAt: shipment.deliveredAt,
      history: shipment.trackingHistory || [],
      order: shipment.fulfillment?.order || { id: 'N/A', customerName: 'Valued Customer', status: 'PROCESSING' }
    };
  }

  async addTrackingEvent(shipmentId: string, event: { status: ShipmentStatus, message: string, location?: string }) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id: shipmentId } });
    if (!shipment) throw new NotFoundException('Shipment not found');

    const history = (shipment.trackingHistory as any[]) || [];
    const newEvent = { ...event, timestamp: new Date() };
    
    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: event.status,
        trackingHistory: [...history, newEvent]
      }
    });
  }

  // --- RETURNS ---

  async initiateReturn(orderId: string, reason: string, items: { variantId: string, quantity: number }[]) {
    return this.prisma.orderReturn.create({
      data: {
        orderId,
        reason,
        status: 'REQUESTED',
        items: {
          create: items.map(item => ({
            variantId: item.variantId,
            quantity: item.quantity
          }))
        }
      }
    });
  }

  async approveReturn(id: string) {
    const returnRecord = await this.prisma.orderReturn.findUnique({
      where: { id },
      include: { items: true, order: true }
    });
    if (!returnRecord) throw new NotFoundException('Return record not found');
    if (returnRecord.status === 'APPROVED') {
      return returnRecord;
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Update OrderReturn status to APPROVED and refundStatus to COMPLETED
      const updatedReturn = await tx.orderReturn.update({
        where: { id },
        data: {
          status: 'APPROVED',
          refundStatus: 'COMPLETED'
        },
        include: { items: true }
      });

      // 2. Adjust inventory (restock)
      for (const item of returnRecord.items) {
        const variant = await tx.variant.findUnique({ where: { id: item.variantId } });
        if (variant) {
          const updatedVariant = await tx.variant.update({
            where: { id: item.variantId },
            data: { inventory: { increment: item.quantity } }
          });
          await tx.stockLog.create({
            data: {
              variantId: item.variantId,
              type: 'RETURN',
              change: item.quantity,
              newBalance: updatedVariant.inventory,
              referenceId: returnRecord.orderId,
              notes: `Restocked from approved return ${id}`
            }
          });
        }
      }

      // 3. Create a refund record if there is a refund amount
      const refundAmt = Number(returnRecord.refundAmount || 0);
      if (refundAmt > 0) {
        let refundTransactionId = `refund_ret_${Date.now()}`;
        const targetGateway = (returnRecord.order.paymentMethod || 'manual').toUpperCase();
        
        if (targetGateway === 'RAZORPAY' || targetGateway === 'PHONEPE') {
          const paymentId = returnRecord.order.paymentId || returnRecord.order.paymentIntentId || '';
          if (paymentId) {
            const gwRefund = await this.paymentsService.processAutomatedRefund(paymentId, refundAmt, targetGateway);
            if (gwRefund.success) {
               refundTransactionId = gwRefund.refundId;
            }
          }
        }

        // Create a payment record for the refund (negative amount = outgoing)
        await (tx as any).payment.create({
          data: {
            orderId: returnRecord.orderId,
            amount: -refundAmt,
            gateway: returnRecord.order.paymentMethod || 'manual',
            paymentId: refundTransactionId,
            status: 'successful',
          }
        }).catch(() => null);

        // Determine new financial status of the order
        const order = returnRecord.order;
        const currentPaidAmount = Number(order.totalAmount);
        
        const newFinancialStatus = refundAmt >= currentPaidAmount ? 'refunded' : 'partially_refunded';
        await tx.order.update({
          where: { id: returnRecord.orderId },
          data: { financialStatus: newFinancialStatus } as any
        });

        // Add order activity log
        await tx.orderActivity.create({
          data: {
            orderId: returnRecord.orderId,
            type: 'STATUS_CHANGE',
            message: `Refund of ₹${refundAmt} processed from approved return ${id}.`
          }
        });
      }

      return updatedReturn;
    });
  }

  async rejectReturn(id: string, notes?: string) {
    const returnRecord = await this.prisma.orderReturn.findUnique({ where: { id } });
    if (!returnRecord) throw new NotFoundException('Return record not found');

    const updatedReturn = await this.prisma.orderReturn.update({
      where: { id },
      data: {
        status: 'REJECTED',
        notes: notes ? `${returnRecord.notes || ''} | Rejected reason: ${notes}` : returnRecord.notes
      }
    });

    await this.prisma.orderActivity.create({
      data: {
        orderId: returnRecord.orderId,
        type: 'STATUS_CHANGE',
        message: `Return request ${id} was rejected. Reason: ${notes || 'None provided'}`
      }
    }).catch(() => {});

    return updatedReturn;
  }

  // --- ADMIN LIST IMPLEMENTATIONS ---

  async getAllShipments() {
    return this.prisma.shipment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        courier: true,
        fulfillment: {
          include: {
            order: {
              select: { id: true, customerName: true, customerEmail: true }
            }
          }
        }
      }
    });
  }

  async getAllReturns() {
    return this.prisma.orderReturn.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: { id: true, customerName: true, customerEmail: true }
        }
      }
    });
  }

  async getAllFulfillments() {
    return this.prisma.fulfillment.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        order: {
          select: { id: true, customerName: true, customerEmail: true, status: true, items: true }
        },
        shipments: true
      }
    });
  }
}
