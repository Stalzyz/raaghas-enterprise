import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Query, 
  UseGuards, 
  Req, 
  UseInterceptors, 
  UploadedFile, 
  BadRequestException 
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { ReviewsService } from './reviews.service';
import { ReviewAutomationService } from './review-automation.service';
import { Public } from '../auth/public.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { existsSync, mkdirSync } from 'fs';

@Controller('reviews')
export class ReviewsController {
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly automationService: ReviewAutomationService,
  ) {}

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

  @Post('trigger-automation')
  @UseGuards(AuthGuard)
  async triggerAutomation() {
    return this.automationService.processEligibleOrders();
  }

  @Get('product/:productId')
  @Public()
  async getProductReviews(@Param('productId') productId: string) {
    return this.reviewsService.getProductReviews(productId);
  }

  @Get('eligibility/:productId')
  @Public()
  async checkEligibility(
    @Param('productId') productId: string,
    @Query('orderId') orderId?: string,
    @Query('token') token?: string,
    @Req() req?: any,
  ) {
    const userId = req?.user?.id;
    return this.reviewsService.checkEligibility(productId, userId, orderId, token);
  }

  @Post('upload')
  @Public()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = join(process.cwd(), 'uploads');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `review-${randomName}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/)) {
        return cb(new BadRequestException('Only image files (JPG, PNG, WEBP) are allowed!'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  async uploadReviewImage(@UploadedFile() file: any) {
    if (!file) throw new BadRequestException('Image file is required');
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.raaghas.in'
      : 'http://localhost:6005';
    const url = `${baseUrl}/uploads/${file.filename}`;
    return { url, filename: file.filename };
  }

  @Post()
  @Public()
  async createReview(@Body() body: any, @Req() req: any) {
    const userId = req?.user?.id;
    return this.reviewsService.createReview(body, userId);
  }
}
