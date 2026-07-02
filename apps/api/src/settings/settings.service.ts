import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SettingsService {
  private readonly logger = new Logger(SettingsService.name);
  constructor(private prisma: PrismaService) {}

  async getSettings() {
    let settings = await (this.prisma as any).storeSettings.findUnique({
      where: { id: 'global' },
    });
    
    if (!settings) {
      settings = await (this.prisma as any).storeSettings.create({
        data: { id: 'global' },
      });
    }
    
    return settings;
  }

  async getPublicSettings() {
    const settings = await this.getSettings();
    return {
      storeName: settings.storeName,
      tagline: settings.tagline,
      supportEmail: settings.supportEmail,
      supportPhone: settings.supportPhone,
      logoUrl: settings.logoUrl,
      instagramUrl: settings.instagramUrl,
      facebookUrl: settings.facebookUrl,
      twitterUrl: settings.twitterUrl,
      pinterestUrl: settings.pinterestUrl,
      youtubeUrl: settings.youtubeUrl,
      footerCopyright: settings.footerCopyright,
      activePaymentGateway: settings.activePaymentGateway,
      razorpayKeyId: settings.razorpayKeyId, // Safe to expose public Key ID
      googleAnalyticsId: settings.googleAnalyticsId,
      googleSearchConsoleKey: settings.googleSearchConsoleKey,
      whatsappPhoneNumberId: settings.whatsappPhoneNumberId,
      whatsappBusinessAccountId: settings.whatsappBusinessAccountId,
      metaPixelId: settings.metaPixelId,
      googleClientId: settings.googleClientId,
      shippingRules: settings.customRules,
      aiAssistantEnabled: settings.aiAssistantEnabled,
      maxCreditUsagePercent: settings.maxCreditUsagePercent ? Number(settings.maxCreditUsagePercent) : 50,
    };
  }

  async updateSettings(payload: any) {
    // 🛡️ Data Sanitization: Strip internal Prisma fields
    const { id, createdAt, updatedAt, _count, ...data } = payload;

    this.logger.log(`[SettingsService] Updating settings with payload keys: ${Object.keys(data).join(', ')}`);

    try {
      return await (this.prisma as any).storeSettings.upsert({
        where: { id: 'global' },
        update: data,
        create: { id: 'global', ...data },
      });
    } catch (error) {
      this.logger.error(`[SettingsService] Update failed: ${error.message}`);
      throw error;
    }
  }
}
