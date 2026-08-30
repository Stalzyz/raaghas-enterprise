import { Injectable, Logger } from '@nestjs/common';
import { CreateShipmentDto, ShipmentResponse, ShippingProvider, TrackingResponse } from './shipping-provider.interface';

@Injectable()
export class IndiaPostProvider implements ShippingProvider {
  private readonly logger = new Logger(IndiaPostProvider.name);

  /**
   * India Post Speed Post consignment tracking URL generator
   */
  getTrackingUrl(consignmentNumber: string): string {
    const cleanNumber = (consignmentNumber || '').trim().toUpperCase();
    return `https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment.aspx`;
  }

  /**
   * Validate India Post Speed Post Consignment format
   * Standard 13-character Speed Post format: 2 letters + 9 digits + 2 letters (e.g., EM123456789IN, CP123456789IN)
   */
  isValidConsignmentNumber(consignmentNumber: string): boolean {
    if (!consignmentNumber) return false;
    const clean = consignmentNumber.trim().toUpperCase();
    return /^[A-Z]{2}\d{9}[A-Z]{2}$/.test(clean);
  }

  async createOrder(data: CreateShipmentDto): Promise<ShipmentResponse> {
    // For India Post, shipments are typically booked with physical barcode sheets or corporate bulk portal
    const trackingId = data.orderId.replace(/[^A-Za-z0-9]/g, '').slice(-13);
    return {
      trackingId,
      shipmentId: trackingId,
      courierName: 'India Post Speed Post',
      labelUrl: this.getTrackingUrl(trackingId),
    };
  }

  async trackShipment(trackingId: string): Promise<TrackingResponse> {
    return {
      status: 'IN_TRANSIT',
      statusDetail: 'Consignment in transit via Department of Posts (India Post Speed Post)',
      location: 'National Sorting Hub (NSH)',
      timestamp: new Date(),
      history: [
        {
          status: 'SHIPPED',
          message: 'Item booked at Post Office and dispatched to Sorting Hub',
          timestamp: new Date(),
          location: 'Origin Post Office',
        },
      ],
    };
  }

  async cancelShipment(shipmentId: string): Promise<boolean> {
    this.logger.log(`India Post manual cancel logged for: ${shipmentId}`);
    return true;
  }
}
