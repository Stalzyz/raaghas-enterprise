import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateSettingsDto {
  @IsString()
  @IsOptional()
  storeName?: string;

  @IsString()
  @IsOptional()
  tagline?: string;

  @IsString()
  @IsOptional()
  supportEmail?: string;

  @IsString()
  @IsOptional()
  supportPhone?: string;

  @IsString()
  @IsOptional()
  footerCopyright?: string;

  @IsString()
  @IsOptional()
  instagramUrl?: string;

  @IsString()
  @IsOptional()
  facebookUrl?: string;

  @IsString()
  @IsOptional()
  whatsappApiUrl?: string;

  @IsString()
  @IsOptional()
  whatsappApiKey?: string;

  @IsString()
  @IsOptional()
  whatsappAppId?: string;

  // Grafty Event Integration
  @IsString()
  @IsOptional()
  graftyApiUrl?: string;

  @IsString()
  @IsOptional()
  graftyApiKey?: string;

  @IsString()
  @IsOptional()
  graftyWorkspaceId?: string;

  // Financial & Legal
  @IsString()
  @IsOptional()
  bankName?: string;

  @IsString()
  @IsOptional()
  accountNumber?: string;

  @IsString()
  @IsOptional()
  ifscCode?: string;

  @IsString()
  @IsOptional()
  accountName?: string;

  @IsString()
  @IsOptional()
  gstNumber?: string;

  @IsString()
  @IsOptional()
  businessAddress?: string;

  @IsString()
  @IsOptional()
  businessState?: string;

  @IsOptional()
  defaultGstRate?: any;

  // Payment Gateways
  @IsString()
  @IsOptional()
  activePaymentGateway?: string;

  @IsString()
  @IsOptional()
  razorpayKeyId?: string;

  @IsString()
  @IsOptional()
  razorpayKeySecret?: string;

  // Return Policy
  @IsNumber()
  @IsOptional()
  @Type(() => Number)
  returnWindowDays?: number;

  @IsBoolean()
  @IsOptional()
  requireImagesForReturn?: boolean;

  @IsBoolean()
  @IsOptional()
  autoApproveLowValue?: boolean;

  @IsString()
  @IsOptional()
  phonepeMerchantId?: string;

  @IsString()
  @IsOptional()
  phonepeMerchantUserId?: string;

  @IsString()
  @IsOptional()
  phonepeSaltKey?: string;

  @IsString()
  @IsOptional()
  phonepeSaltIndex?: string;

  // Marketing & Tracking (The New Fields)
  @IsString()
  @IsOptional()
  metaPixelId?: string;

  @IsString()
  @IsOptional()
  metaCapiToken?: string;

  @IsString()
  @IsOptional()
  googleAuthSecret?: string;

  @IsString()
  @IsOptional()
  googleClientId?: string;

  @IsString()
  @IsOptional()
  googleClientSecret?: string;

  // Custom Code
  @IsString()
  @IsOptional()
  customHeadHtml?: string;

  @IsString()
  @IsOptional()
  customGlobalCss?: string;

  @IsString()
  @IsOptional()
  customFooterHtml?: string;

  @IsString()
  @IsOptional()
  logoUrl?: string;

  @IsString()
  @IsOptional()
  twitterUrl?: string;

  @IsString()
  @IsOptional()
  pinterestUrl?: string;

  @IsString()
  @IsOptional()
  youtubeUrl?: string;

  @IsString()
  @IsOptional()
  bankBranch?: string;

  @IsString()
  @IsOptional()
  googleAnalyticsId?: string;

  @IsString()
  @IsOptional()
  googleSearchConsoleKey?: string;

  @IsString()
  @IsOptional()
  whatsappPhoneNumberId?: string;

  @IsString()
  @IsOptional()
  whatsappBusinessAccountId?: string;

  @IsOptional()
  referralRewardPercent?: any;

  @IsOptional()
  welcomeDiscountPercent?: any;

  @IsOptional()
  maxCreditUsagePercent?: any;

  @IsOptional()
  loyaltyMinOrderValue?: any;

  @IsOptional()
  loyaltyPointsRate?: any;

  @IsString()
  @IsOptional()
  id?: string;

  @IsOptional()
  createdAt?: any;

  @IsOptional()
  updatedAt?: any;

  // SMTP Settings
  @IsString()
  @IsOptional()
  smtpHost?: string;

  @IsOptional()
  smtpPort?: any;

  @IsString()
  @IsOptional()
  smtpUser?: string;

  @IsString()
  @IsOptional()
  smtpPass?: string;

  @IsOptional()
  smtpSecure?: any;

  @IsOptional()
  customShippingRules?: any;

  @IsString()
  @IsOptional()
  openAiApiKey?: string;

  @IsBoolean()
  @IsOptional()
  aiAssistantEnabled?: boolean;
}
