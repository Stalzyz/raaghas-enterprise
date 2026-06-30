# Implementation Plan: Shipping and Tracking Integration

This document outlines the integration of **Shiprocket** and **Delhivery** APIs for automated shipping and real-time tracking in the Raaghas platform.

## 1. Objectives
- Automate shipment creation when an order is confirmed.
- Provide real-time tracking updates to customers via the storefront and WhatsApp.
- Support multiple shipping providers (Shiprocket as an aggregator, Delhivery as a direct carrier).

## 2. Architecture Overview

### Logistics Module (`apps/api/src/logistics`)
The existing logistics module has been enhanced to handle automated shipping.

- **`logistics.service.ts`**: Orchestrates shipment creation and tracking updates.
- **`providers/`**: Implementation of specific shipping carriers.
  - `shipping-provider.interface.ts`: Defines the standard interface for all providers.
  - `shiprocket.provider.ts`: Implementation for Shiprocket API.
  - `delhivery.provider.ts`: Implementation for Delhivery API.
- **`logistics.controller.ts`**: Endpoints for admin to automate shipments and receive webhooks.

## 3. Shipping Provider Interface

```typescript
export interface CreateShipmentDto {
  orderId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  address: {
    address: string;
    city: string;
    state: string;
    pincode: string;
    country: string;
  };
  items: Array<{
    name: string;
    sku: string;
    quantity: number;
    price: number;
    weight: number;
  }>;
  totalWeight: number;
  paymentMethod: 'COD' | 'Prepaid';
  subTotal: number;
}

export interface ShippingProvider {
  createOrder(data: CreateShipmentDto): Promise<ShipmentResponse>;
  trackShipment(trackingId: string): Promise<TrackingResponse>;
  cancelShipment(shipmentId: string): Promise<boolean>;
}
```

## 4. Integration Workflow

1.  **Order Confirmation**: When an order is moved to `CONFIRMED` status, the admin can trigger automated shipment creation.
2.  **Provider Selection**: The system selects the configured provider (Shiprocket or Delhivery) from `.env`.
3.  **API Call**: The selected provider implementation calls the carrier API to create a shipment.
4.  **Database Update**: A `Shipment` record is created, and the `Order` is updated with `trackingId` and `carrierName`.
5.  **Tracking**:
    - **Polling**: Admins can sync tracking status via the dashboard.
    - **Webhooks**: Shiprocket pushes real-time status updates to our webhook endpoint.

## 5. Configuration (Env Variables)
Add these to your production environment:
- `DEFAULT_SHIPPING_PROVIDER`: `shiprocket` or `delhivery`
- `SHIPROCKET_EMAIL`: Your Shiprocket account email.
- `SHIPROCKET_PASSWORD`: Your Shiprocket password.
- `DELHIVERY_TOKEN`: Your Delhivery API token.
- `DELHIVERY_ENV`: `test` or `production`.

## 6. Deployment
Run the atomic release script to push these changes to the VPS:
```bash
./atomic_release.sh
```
