import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { InventoryModule } from '../inventory/inventory.module';
import { MarketingModule } from '../marketing/marketing.module';
import { MailModule } from '../mail/mail.module';
import { WholesaleModule } from '../wholesale/wholesale.module';
import { PaymentsModule } from '../payments/payments.module';
import { GrowthModule } from '../growth/growth.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [InventoryModule, MarketingModule, MailModule, WholesaleModule, GrowthModule, NotificationsModule, forwardRef(() => PaymentsModule)],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
