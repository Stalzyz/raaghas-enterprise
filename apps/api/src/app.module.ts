import { Module, Global, forwardRef } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { join, resolve } from 'path';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './prisma/prisma.service';
import { ProductController } from './products/products.controller';
import { ProductService } from './products/products.service';
import { MigrationService } from './products/migration.service';
import { WholesaleModule } from './wholesale/wholesale.module';
import { OrdersModule } from './orders/orders.module';
import { InventoryModule } from './inventory/inventory.module';
import { SettingsModule } from './settings/settings.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiController } from './ai/ai.controller';
import { AiService } from './ai/ai.service';
import { MarketingModule } from './marketing/marketing.module';
import { NavigationController } from './navigation/navigation.controller';
import { CmsController } from './cms/cms.controller';
import { RolesController } from './auth/roles/roles.controller';
import { UsersController } from './auth/users/users.controller';
import { APP_GUARD } from '@nestjs/core';
import { RolesGuard } from './auth/roles.guard';
import { AuthGuard } from './auth/auth.guard';

import { ProcurementModule } from './procurement/procurement.module';
import { MailModule } from './mail/mail.module';

import { AnalyticsModule } from './analytics/analytics.module';
import { ReviewsModule } from './reviews/reviews.module';
import { AuthModule } from './auth/auth.module';
import { InvoicesModule } from './invoices/invoices.module';
import { GrowthModule } from './growth/growth.module';
import { CustomersModule } from './customers/customers.module';
import { LogisticsModule } from './logistics/logistics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { SizeGuidesModule } from './size-guides/size-guides.module';
import { SupportModule } from './support/support.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { BackupModule } from './backup/backup.module';

@Global()
@Module({
  imports: [
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    ConfigModule.forRoot({ isGlobal: true }),
    CacheModule.register({ isGlobal: true, ttl: 60000 }),
    ThrottlerModule.forRoot([{
      ttl: 60000,
      limit: 200,
    }]),
    AuthModule,
    forwardRef(() => WholesaleModule),
    forwardRef(() => OrdersModule),
    InventoryModule,
    SettingsModule,
    MarketingModule,
    ProcurementModule,
    MailModule,
    AnalyticsModule,
    ReviewsModule,
    InvoicesModule,
    GrowthModule,
    CustomersModule,
    LogisticsModule,
    NotificationsModule,
    PaymentsModule,
    SizeGuidesModule,
    SupportModule,
    WishlistModule,
    BackupModule,
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
  ],
  controllers: [
    AppController,
    AiController,
    ProductController, 
    NavigationController,
    CmsController,
    RolesController,
    UsersController,
  ],
  providers: [
    AppService,
    AiService,
    ProductService, 
    MigrationService,
    PrismaService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
  exports: [PrismaService],
})
export class AppModule {}
