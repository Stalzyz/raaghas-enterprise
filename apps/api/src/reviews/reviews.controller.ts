import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ReviewsService } from './reviews.service';
import { Public } from '../auth/public.decorator';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get('moderation')
  @UseGuards(AuthGuard)
  async getModerationQueue() {
    return this.reviewsService.getModerationQueue();
  }

  @Put(':id/moderate')
  @UseGuards(AuthGuard)
  async moderateReview(@Param('id') id: string, @Query('approved') approved: string) {
    return this.reviewsService.moderateReview(id, approved === 'true');
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteReview(@Param('id') id: string) {
    return this.reviewsService.deleteReview(id);
  }

  @Get('product/:productId')
  @Public()
  async getProductReviews(@Param('productId') productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @Get('eligibility/:productId')
  @UseGuards(AuthGuard)
  async checkEligibility(@Param('productId') productId: string, @Req() req: any) {
    return this.reviewsService.checkEligibility(productId, req.user.id);
  }

  @Post()
  @UseGuards(AuthGuard)
  async createReview(@Body() body: any, @Req() req: any) {
    return this.reviewsService.createReview(body, req.user.id);
  }
}
