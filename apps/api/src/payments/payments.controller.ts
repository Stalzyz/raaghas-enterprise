import { Controller, Post, Get, Param, Body, UseGuards, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { Public } from '../auth/public.decorator';
import { RequirePermission } from '../auth/permissions.decorator';
import { Throttle } from '@nestjs/throttler';
import { PaymentsService } from './payments.service';
import { WebhookQueueService } from './webhook-queue.service';

@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly webhookQueue: WebhookQueueService,
  ) {}

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('create-intent')
  createCheckoutSession(@Body() body: any, @Req() req: any) {
    return this.paymentsService.createCheckoutSession({
      ...body,
      userId: req.user?.id || req.user?.sub,
      clerkId: body.clerkId || req.user?.sub
    });
  }

  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('verify')
  verifyAndConfirmOrder(@Body() body: any, @Req() req: Request) {
    return this.paymentsService.verifyAndConfirmOrder({
      ...body,
      clientIpAddress: req.ip || req.headers['x-forwarded-for'] as string,
      clientUserAgent: req.headers['user-agent']
    });
  }

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Post('webhook/razorpay')
  handleRazorpayWebhook(@Body() body: any, @Req() req: any) {
    const signature = req.headers['x-razorpay-signature'];
    const rawBodyBuffer = req.rawBody || Buffer.from(JSON.stringify(body));
    return this.paymentsService.handleWebhook(body, rawBodyBuffer, signature, 'RAZORPAY');
  }

  @Public()
  @Post('cancel-intent')
  cancelIntent(@Body() body: { providerOrderId: string }) {
    return this.paymentsService.cancelIntent(body.providerOrderId);
  }

  @Public()
  @Throttle({ default: { limit: 100, ttl: 60000 } })
  @Post('phonepe-callback')
  async phonepeCallback(@Body() body: any, @Req() req: any) {
     const checksum = req.headers['x-verify'];
     const response = body.response;
     return this.paymentsService.handlePhonePeCallback(response, checksum);
  }

  // ─── ADMIN: Webhook Queue Dashboard ────────────────────────────────────────

  @UseGuards(AuthGuard)
  @Get('webhook-stats')
  getWebhookStats() {
    return this.webhookQueue.getQueueStats();
  }

  @UseGuards(AuthGuard)
  @Get('dlq')
  getDeadLetterQueue() {
    return this.webhookQueue.getDeadLetterQueue();
  }

  @UseGuards(AuthGuard)
  @Post('dlq/:eventId/replay')
  replayDeadEvent(@Param('eventId') eventId: string) {
    return this.webhookQueue.replayEvent(eventId);
  }

  @UseGuards(AuthGuard)
  @RequirePermission('orders:write')
  @Post('admin/verify/:orderId')
  adminVerifyOrder(@Param('orderId') orderId: string) {
    return this.paymentsService.adminVerifyOrder(orderId);
  }
}
