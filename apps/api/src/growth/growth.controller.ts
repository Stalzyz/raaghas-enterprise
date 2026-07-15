import { Controller, Get, Post, Body, UseGuards, Query, Param, Patch, Delete, ForbiddenException } from '@nestjs/common';
import { GrowthService } from './growth.service';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';

@Controller('growth')
export class GrowthController {
  constructor(private growthService: GrowthService) {}

  // ─── Coupons & Offers ───────────────────────────────────────────────────────

  @UseGuards(AuthGuard)
  @Get('coupons')
  getAllCoupons() {
    return this.growthService.getAllCoupons();
  }

  @UseGuards(AuthGuard)
  @Post('coupons')
  createCoupon(@Body() data: any) {
    return this.growthService.createCoupon(data);
  }

  @UseGuards(AuthGuard)
  @Patch('coupons/:id/toggle')
  toggleCoupon(@Param('id') id: string) {
    return this.growthService.toggleCouponStatus(id);
  }

  @UseGuards(AuthGuard)
  @Patch('coupons/:id')
  updateCoupon(@Param('id') id: string, @Body() data: any) {
    return this.growthService.updateCoupon(id, data);
  }

  @UseGuards(AuthGuard)
  @Delete('coupons/:id')
  deleteCoupon(@Param('id') id: string) {
    return this.growthService.deleteCoupon(id);
  }

  @Public()
  @Post('coupons/validate')
  validateCoupon(@Body() data: { code: string; cartValue: number; items: any[] }, @CurrentUser() user?: any) {
    return this.growthService.validateCoupon(data.code, user?.id, data.cartValue, data.items);
  }

  @Post('offers/eligible')
  getEligibleOffers(@Body() data: { cartValue: number; items: any[]; userId?: string }) {
    return this.growthService.evaluateOffers(data.cartValue, data.items, data.userId);
  }

  @Public()
  @Post('offers/auto-apply')
  getAutoApplicableDiscount(@Body() data: { cartValue: number; items: any[]; userId?: string }, @CurrentUser() user?: any) {
    const userId = data.userId || user?.id;
    return this.growthService.getAutoApplicableDiscount(data.cartValue, data.items, userId);
  }

  @Public()
  @Post('offers/applicable')
  getApplicableDiscounts(@Body() data: { cartValue: number; items: any[]; userId?: string }, @CurrentUser() user?: any) {
    const userId = data.userId || user?.id;
    return this.growthService.getApplicableDiscounts(data.cartValue, data.items, userId);
  }

  // ─── Wallet ─────────────────────────────────────────────────────────────────

  @UseGuards(AuthGuard)
  @Get('wallet')
  getWallet(@CurrentUser() user: any, @Query('userId') userId?: string) {
    // If userId is provided and the current user is an admin, return that user's wallet
    if (userId && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN' || user.role === 'MARKETING' || user.role === 'OPERATIONS')) {
      return this.growthService.getWallet(userId);
    }
    return this.growthService.getWallet(user.id);
  }

  @UseGuards(AuthGuard)
  @Get('wallet/bulk')
  getWalletsBulk(@Query('userIds') userIds: string) {
    const ids = userIds.split(',');
    return this.growthService.getWalletsByUserIds(ids);
  }

  @UseGuards(AuthGuard)
  @Post('wallet/adjust')
  adjustWallet(
    @Body() data: { userId: string; amount: number; type: any; reason: any; notes?: string },
    @CurrentUser() user: any,
  ) {
    // FIX: Restrict wallet adjustments to admin roles only
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'FINANCE'];
    if (!allowedRoles.includes(user?.role)) {
      throw new ForbiddenException('Forbidden: Only admins can adjust wallet balances.');
    }
    return this.growthService.adjustWallet(data.userId, data.amount, data.type, data.reason, undefined, data.notes);
  }

  // ─── Referrals ──────────────────────────────────────────────────────────────

  @UseGuards(AuthGuard)
  @Get('referrals/stats')
  getReferralStats() {
    return this.growthService.getReferralStats();
  }

  @UseGuards(AuthGuard)
  @Get('referral/code')
  async getReferralCode(@CurrentUser() user: any) {
    const code = await this.growthService.generateReferralCode(user.id);
    return { code };
  }

  @UseGuards(AuthGuard)
  @Post('referral/track')
  trackReferral(@Body() data: { code: string }, @CurrentUser() user: any) {
    return this.growthService.trackReferral(user.id, data.code);
  }
}
