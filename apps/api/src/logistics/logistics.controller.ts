import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req, UnauthorizedException } from '@nestjs/common';
import * as crypto from 'crypto';
import { LogisticsService } from './logistics.service';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Public } from '../auth/public.decorator';
import { Throttle } from '@nestjs/throttler';
@Controller('logistics')
export class LogisticsController {
  constructor(private readonly logisticsService: LogisticsService) {}

  @Public()
  @Get('shipping-options')
  async getShippingOptions(
    @Query('state') state: string,
    @Query('total') total: string
  ) {
    return this.logisticsService.getShippingOptions(state, parseFloat(total));
  }

  @Public()
  @Get('free-shipping-threshold')
  async getFreeShippingThreshold() {
    return this.logisticsService.getGlobalFreeShippingThreshold();
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('calculate-shipping')
  async calculateShipping(
    @Body() body: { state: string; total: number; items: any[] }
  ) {
    return this.logisticsService.getShippingOptions(body.state, body.total, body.items);
  }

  @Delete('zones/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  async deleteShippingZone(@Param('id') id: string) {
    return this.logisticsService.deleteShippingZone(id);
  }

  // --- AUTOMATED SHIPPING ---

  @Post('automate/:orderId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'WAREHOUSE')
  async automateShipment(@Param('orderId') orderId: string, @Body('provider') provider?: string) {
    return this.logisticsService.createAutomatedShipment(orderId, provider);
  }

  @Post('book/st-courier/:orderId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'WAREHOUSE')
  async bookSTCourier(@Param('orderId') orderId: string) {
    return this.logisticsService.bookWithSTCourier(orderId);
  }

  @Post('sync-tracking/:trackingId')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'WAREHOUSE')
  async syncTracking(@Param('trackingId') trackingId: string, @Query('provider') provider?: string) {
    return this.logisticsService.syncTrackingStatus(trackingId, provider);
  }

  @Public()
  @Throttle({ default: { limit: 50, ttl: 60000 } })
  @Post('webhooks/shiprocket')
  async shiprocketWebhook(@Req() req: any, @Body() data: any) {
    const signatureHeader = req.headers['x-shiprocket-signature'];
    const secret = process.env.SHIPROCKET_WEBHOOK_SECRET;

    if (secret && signatureHeader) {
      const rawBody = req.rawBody || Buffer.from(JSON.stringify(data));
      const expectedSignature = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
      if (signatureHeader !== expectedSignature) {
        throw new UnauthorizedException('Invalid Shiprocket webhook signature');
      }
    }

    if (data.awb) {
      return this.logisticsService.syncTrackingStatus(data.awb, 'shiprocket');
    }
  }

  /**
   * ST Courier 30-Minute Status Push Webhook
   * Receives batch tracking status updates from ST Courier V2 platform
   */
  @Public()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Post('webhooks/st-courier')
  async stCourierWebhook(@Body() body: any) {
    return this.logisticsService.handleSTCourierWebhook(body);
  }

  @Public()
  @Get('tracking/:id')
  async getTracking(@Param('id') id: string) {
    return this.logisticsService.getTracking(id);
  }

  // --- ADMIN ROUTES ---

  @Post('fulfillment')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'WAREHOUSE')
  async createFulfillment(@Body() body: { orderId: string, items: any[] }) {
    return this.logisticsService.createFulfillment(body.orderId, body.items);
  }

  @Post('shipment')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'WAREHOUSE')
  async createShipment(@Body() body: { fulfillmentId: string, courierId: string, trackingId: string, estimatedDelivery?: string }) {
    return this.logisticsService.createShipment(body.fulfillmentId, {
      ...body,
      estimatedDelivery: body.estimatedDelivery ? new Date(body.estimatedDelivery) : undefined
    });
  }

  @Post('returns/initiate')
  async initiateReturn(@Body() body: { orderId: string, reason: string, items: any[] }) {
    return this.logisticsService.initiateReturn(body.orderId, body.reason, body.items);
  }

  @Patch('admin/returns/:id/approve')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS')
  async approveReturn(@Param('id') id: string) {
    return this.logisticsService.approveReturn(id);
  }

  @Patch('admin/returns/:id/reject')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS')
  async rejectReturn(@Param('id') id: string, @Body('reason') reason: string) {
    return this.logisticsService.rejectReturn(id, reason);
  }

  // --- ADMIN LIST ROUTES ---

  @Get('shipments')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'WAREHOUSE')
  async getAllShipments() {
    return this.logisticsService.getAllShipments();
  }

  @Get('returns')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS')
  async getAllReturns() {
    return this.logisticsService.getAllReturns();
  }

  @Get('fulfillments')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'OPERATIONS', 'WAREHOUSE')
  async getAllFulfillments() {
    return this.logisticsService.getAllFulfillments();
  }
}
