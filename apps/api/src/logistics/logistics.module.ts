import { Module } from '@nestjs/common';
import { LogisticsService } from './logistics.service';
import { LogisticsController } from './logistics.controller';
import { ShiprocketProvider } from './providers/shiprocket.provider';
import { DelhiveryProvider } from './providers/delhivery.provider';
import { STCourierProvider } from './providers/st-courier.provider';
import { IndiaPostProvider } from './providers/india-post.provider';
import { forwardRef } from '@nestjs/common';
import { PaymentsModule } from '../payments/payments.module';
import { MarketingModule } from '../marketing/marketing.module';

@Module({
  imports: [forwardRef(() => PaymentsModule), forwardRef(() => MarketingModule)],
  controllers: [LogisticsController],
  providers: [LogisticsService, ShiprocketProvider, DelhiveryProvider, STCourierProvider, IndiaPostProvider],
  exports: [LogisticsService, STCourierProvider, IndiaPostProvider],
})
export class LogisticsModule {}
