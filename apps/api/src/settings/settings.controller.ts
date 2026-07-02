import { Controller, Get, Post, Patch, Body, UseGuards } from '@nestjs/common';
import { Public } from '../auth/public.decorator';
import { SettingsService } from './settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthGuard } from '../auth/auth.guard';

import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private prisma: PrismaService
  ) {}

  @Get('debug-schema')
  @Public()
  async debugSchema() {
    try {
      // Introspect the StoreSettings model to see what fields Prisma thinks exist
      const settings = await (this.prisma as any).storeSettings.findFirst();
      return {
        exists: !!settings,
        fields: settings ? Object.keys(settings) : [],
        prismaModel: "StoreSettings",
        databaseUrl: process.env.DATABASE_URL?.split('@')[1] || 'hidden',
      };
    } catch (err) {
      return { error: err.message, stack: err.stack };
    }
  }

  @Get('public')
  @Public()
  getPublicSettings() {
    return this.settingsService.getPublicSettings();
  }

  @Get()
  @UseGuards(AuthGuard)
  getSettings() {
    return this.settingsService.getSettings();
  }

  @Patch()
  @UseGuards(AuthGuard)
  updateSettings(@Body() data: UpdateSettingsDto) {
    return this.settingsService.updateSettings(data);
  }

  // --- SHIPPING ZONES ---

  @Get('shipping-zones')
  @UseGuards(AuthGuard)
  async getShippingZones() {
    return (this.prisma as any).shippingZone.findMany({
      include: { methods: true }
    });
  }

  @Post('shipping-zones')
  @UseGuards(AuthGuard)
  async saveShippingZones(@Body() body: { zones: any[] }) {
    const { zones } = body;
    
    // Execute within a transaction to ensure safe updates
    await this.prisma.$transaction(async (tx: any) => {
      await tx.shippingMethod.deleteMany({});
      await tx.shippingZone.deleteMany({});

      for (const zone of zones) {
        const createdZone = await tx.shippingZone.create({
          data: {
            name: zone.name,
            regions: zone.regions,
            isActive: zone.isActive,
          }
        });

        if (zone.methods && zone.methods.length > 0) {
          await tx.shippingMethod.createMany({
            data: zone.methods.map((m: any) => ({
              zoneId: createdZone.id,
              name: m.name,
              baseCost: m.baseCost,
              minOrderValue: m.minOrderValue,
              maxOrderValue: m.maxOrderValue,
              isActive: m.isActive,
              description: m.description,
            }))
          });
        }
      }
    });

    return this.getShippingZones();
  }
}
