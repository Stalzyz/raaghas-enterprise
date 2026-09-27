import { Module } from '@nestjs/common';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';
import { ReviewAutomationService } from './review-automation.service';
import { GrowthModule } from '../growth/growth.module';

@Module({
  imports: [GrowthModule],
  controllers: [ReviewsController],
  providers: [ReviewsService, ReviewAutomationService],
  exports: [ReviewsService, ReviewAutomationService],
})
export class ReviewsModule {}
