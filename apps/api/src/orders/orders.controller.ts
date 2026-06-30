import { Controller, Get, Param, Query, UseGuards, Req, Patch, Body, Post, Put } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { OrdersService } from './orders.service';
import { Public } from '../auth/public.decorator';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('my')
  @UseGuards(AuthGuard)
  async getMyOrders(@Req() req: any) {
    return this.ordersService.getUserOrders(req.user.id, req.user.email);
  }

  @Get('track')
  @Public()
  async trackOrder(
    @Query('orderId') orderId: string,
    @Query('email') email: string,
  ) {
    return this.ordersService.trackGuestOrder(orderId, email);
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  async getOrderById(@Param('id') id: string, @Req() req: any) {
    return this.ordersService.getOrderById(id, { id: req.user.sub, email: req.user.email, role: req.user.role });
  }

  // ─── ADMIN LOGISTICS ────────────────────────────────────────────────────

  @Get('admin/all')
  @UseGuards(AuthGuard)
  async getAdminOrders(@Query() query: {
    status?: string;
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
    return this.ordersService.getAdminOrders(query as any);
  }

  @Get('admin/:id')
  @UseGuards(AuthGuard)
  async getAdminOrderById(@Param('id') id: string) {
    return this.ordersService.getOrderById(id);
  }

  @Patch('admin/:id/status')
  @UseGuards(AuthGuard)
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateOrderStatus(id, status as any);
  }

  @Patch('admin/:id/financial-status')
  @UseGuards(AuthGuard)
  async updateFinancialStatus(@Param('id') id: string, @Body('status') status: string) {
    return this.ordersService.updateFinancialStatus(id, status);
  }

  @Patch('admin/bulk/status')
  @UseGuards(AuthGuard)
  async bulkStatus(@Body() body: { ids: string[]; status: string }) {
    return this.ordersService.bulkUpdateStatus(body.ids, body.status as any);
  }

  @Patch('admin/bulk/assign')
  @UseGuards(AuthGuard)
  async bulkAssign(@Body() body: { ids: string[]; staffId: string }) {
    return this.ordersService.bulkAssignStaff(body.ids, body.staffId);
  }

  @Patch('admin/bulk/tags')
  @UseGuards(AuthGuard)
  async bulkTags(@Body() body: { ids: string[]; tag: string }) {
    return this.ordersService.bulkAddTags(body.ids, body.tag);
  }

  @Patch('admin/:id/fulfillment')
  @UseGuards(AuthGuard)
  async updateFulfillment(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.updateFulfillmentInfo(id, body);
  }

  @Post('admin/:id/notes')
  @UseGuards(AuthGuard)
  async addNote(@Param('id') id: string, @Body('message') message: string, @Req() req: any) {
    return this.ordersService.addInternalNote(id, message, req.user?.email || 'Admin');
  }

  @Patch('admin/:id/address')
  @UseGuards(AuthGuard)
  async updateAddress(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.updateOrderAddress(id, body);
  }

  @Post('admin/:id/fulfillments')
  @UseGuards(AuthGuard)
  async createFulfillment(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.createFulfillment(id, body);
  }

  @Post('admin/bulk-fulfillments')
  @UseGuards(AuthGuard)
  async bulkCreateFulfillments(@Body() body: { fulfillments: any[] }) {
    return this.ordersService.bulkCreateFulfillments(body.fulfillments);
  }

  @Post('admin/:id/returns')
  @UseGuards(AuthGuard)
  async createReturn(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.createReturn(id, body);
  }

  @Post('admin/:id/exchange-or-return')
  @UseGuards(AuthGuard)
  async createExchangeOrReturn(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.createExchangeOrReturn(id, body);
  }

  @Post('admin/:id/refunds')
  @UseGuards(AuthGuard)
  async createRefund(@Param('id') id: string, @Body() body: { amount: number; reason: string; gateway?: string; transactionId?: string; notes?: string }) {
    return this.ordersService.createRefund(id, body);
  }

  @Post('draft')
  @UseGuards(AuthGuard)
  async createDraftOrder(@Body() body: any) {
    return this.ordersService.createDraftOrder(body);
  }

  @Put('admin/:id/items')
  @UseGuards(AuthGuard)
  async updateOrderItems(@Param('id') id: string, @Body() body: any) {
    return this.ordersService.updateOrderItems(id, body);
  }

  @UseGuards(AuthGuard)
  @Post(':id/resend-confirmation')
  resendConfirmationEmail(@Param('id') id: string) {
    return this.ordersService.sendOrderConfirmationEmail(id);
  }
}
