#!/bin/bash
# ═══════════════════════════════════════════════════════════════════════════════
#  RAAGHAS — NUCLEAR SEED & SYNC (Expert Analyst Version)
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

VPS_IP="72.61.231.187"
SCHEMA_PATH="packages/database/prisma/schema.prisma"

echo "☢️  OVERWRITING VPS SCHEMA WITH LOCAL TRUTH..."

ssh -o StrictHostKeyChecking=no root@$VPS_IP << 'REMOTE_SYNC'
  cd /var/www/raaghas_new
  mkdir -p packages/database/prisma

  # Overwrite with perfect schema (Injecting full local content)
  cat > packages/database/prisma/schema.prisma << 'SCHEMA_EOF'
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  output   = "../generated-client"
  provider = "prisma-client-js"
  engineType = "library"
  binaryTargets = ["native", "debian-openssl-1.1.x", "debian-openssl-3.0.x", "linux-musl-openssl-3.0.x"]
}

enum OrderStatus {
  CREATED
  PAYMENT_PENDING
  CONFIRMED
  PROCESSING
  SHIPPED
  DELIVERED
  CANCELLED
  FAILED
  REFUNDED
  WRITTEN_OFF
}

enum SectionType {
  HERO
  FEATURED_COLLECTION
  FEATURE_GRID
  PRODUCT_GRID
  BANNER
  INSTAGRAM_FEED
  TESTIMONIALS
  TEXT_BLOCK
  LOOKBOOK
  EDITORIAL
  BRAND_STORY
  CATEGORIES_MOSAIC
  NEWSLETTER
  TRUST_BAR
  CATEGORY_STRIP
  AOV_BUNDLES
  STORY_BANNER
  DEAL_BANNER
  SOCIAL_PROOF
  SMART_GRID
  CUSTOM_HTML
  LEGAL_PROSE
  ACCORDION_FAQ
}

enum PageType {
  POLICY
  LANDING
  STORY
  BLANK
}

enum PageStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum UserRole {
  SUPER_ADMIN
  ADMIN
  OPERATIONS
  PRODUCT_MANAGER
  CMS_MANAGER
  MARKETING
  SUPPORT
  WAREHOUSE
  FINANCE
  ACCOUNTANT
  WHOLESALE_MANAGER
  CUSTOMER
}

model User {
  id             String         @id @default(cuid())
  clerkId        String?        @unique
  email          String         @unique
  phone          String?        @unique
  name           String?
  password       String?
  roleId         String?
  roleRef        Role?          @relation(fields: [roleId], references: [id])
  role           UserRole       @default(CUSTOMER)
  resetToken     String?        @unique
  resetExpires   DateTime?
  points         Int            @default(0)
  savedAddresses Json?          @default("[]")
  referralCode   String?        @unique
  createdAt      DateTime       @default(now())
  updatedAt      DateTime       @updatedAt
  orders         Order[]
  reviews        Review[]
  WishlistItem   WishlistItem[]
  wallet         Wallet?
  referralsSent  Referral[]     @relation("Referrer")
  referralRecvd  Referral?      @relation("Referee")
  lastActiveAt   DateTime?
  interests      String[]       @default([])
}

model Role {
  id          String       @id @default(cuid())
  name        String       @unique
  description String?
  color       String?      @default("bg-gray-100 text-gray-600")
  permissions Permission[]
  users       User[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
}

model Permission {
  id          String   @id @default(cuid())
  action      String   @unique
  description String?
  roles       Role[]
  createdAt   DateTime @default(now())
}

model Product {
  id                String  @id @default(cuid())
  shopifyId         String? @unique
  handle            String  @unique
  title             String
  description       String?
  vendor            String?
  category          String?
  subCategory       String?
  brand             String?
  collection        String?
  productType       String?
  gender            String?
  ageGroup          String?
  fabric            String?
  material          String?
  pattern           String?
  fitType           String?
  sleeveType        String?
  neckType          String?
  length            String?
  occasion          String?
  style             String?
  tags              String   @default("")
  searchKeywords    String?
  seoTitle          String?
  metaDescription   String?
  metaKeywords      String?
  published         Boolean  @default(false)
  hsnCode           String   @default("TEXTILE-00")
  lowStockThreshold Int      @default(10)
  status            String   @default("DRAFT")
  variants Variant[]
  images   Image[]
  reviews  Review[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  collections  Collection[]   @relation("CollectionProducts")
  WishlistItem WishlistItem[]
  wholesaleOrderItems WholesaleOrderItem[]
}

model Variant {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  sku            String?  @unique
  barcode        String?  @unique
  price          Decimal
  mrp            Decimal?
  sellingPrice   Decimal?
  offerPrice     Decimal?
  costPrice      Decimal?
  discountPercentage Decimal?
  inventory      Int      @default(0)
  currency       String   @default("INR")
  option1Name  String?
  option1Value String?
  option2Name  String?
  option2Value String?
  option3Name  String?
  option3Value String?
  images       Image[]            @relation("VariantImages")
  orderItems   OrderItem[]
  stockLogs    StockLog[]
  reservations StockReservation[]
  purchaseOrderItems PurchaseOrderItem[]
  wholesaleOrderItems WholesaleOrderItem[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Image {
  id       String  @id @default(cuid())
  url      String
  altText  String?
  position Int     @default(0)
  productId String?
  product   Product? @relation(fields: [productId], references: [id], onDelete: Cascade)
  variantId String?
  variant   Variant? @relation("VariantImages", fields: [variantId], references: [id])
  reviewId String?
  review   Review? @relation("ReviewImages", fields: [reviewId], references: [id])
  createdAt DateTime @default(now())
}

model Collection {
  id          String  @id @default(cuid())
  shopifyId   String? @unique
  handle      String  @unique
  title       String
  description String?
  image       String?
  products Product[] @relation("CollectionProducts")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Order {
  id              String      @id @default(cuid())
  idempotencyKey  String?     @unique
  userId          String?
  user            User?       @relation(fields: [userId], references: [id])
  status            OrderStatus @default(PAYMENT_PENDING)
  financialStatus   String?     @default("pending")
  fulfillmentStatus String?     @default("unfulfilled")
  totalAmount    Decimal
  subtotal       Decimal?
  total          Decimal?
  taxes          Decimal?  @default(0)
  shipping       Decimal?  @default(0)
  discountCode   String?
  discountAmount Decimal?
  walletCreditUsed Decimal? @default(0)
  currency       String?   @default("INR")
  customerName    String
  customerEmail   String
  customerPhone   String
  shippingAddress Json
  billingAddress  Json?
  paymentMethod   String?
  paymentId       String?  @unique
  paymentIntentId String?  @unique
  paymentReference String?
  shippingMethod    String?
  trackingId        String?
  carrierName       String?
  estimatedDelivery DateTime?
  paidAt      DateTime?
  fulfilledAt DateTime?
  cancelledAt DateTime?
  source    String?  @default("web")
  riskLevel String?  @default("normal")
  tags      String?
  notes     String?
  items        OrderItem[]
  fulfillments Fulfillment[]
  returns      OrderReturn[]
  activities   OrderActivity[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model OrderItem {
  id      String @id @default(cuid())
  orderId String
  order   Order  @relation(fields: [orderId], references: [id], onDelete: Cascade)
  variantId String
  variant   Variant @relation(fields: [variantId], references: [id])
  quantity Int
  price    Decimal
  hsnCode  String?
}

model Review {
  id        String  @id @default(cuid())
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  userId String?
  user   User?   @relation(fields: [userId], references: [id])
  rating   Int
  headline String?
  content  String
  approved Boolean @default(false)
  images Image[] @relation("ReviewImages")
  createdAt DateTime @default(now())
}

model Page {
  id              String     @id @default(cuid())
  handle          String     @unique
  title           String
  type            PageType   @default(LANDING)
  status          PageStatus @default(DRAFT)
  metaTitle       String?
  metaDescription String?
  ogImage         String?
  sections Section[]
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt
  publishedAt DateTime?
}

model Section {
  id     String @id @default(cuid())
  pageId String
  page   Page   @relation(fields: [pageId], references: [id], onDelete: Cascade)
  type    SectionType
  order   Int         @default(0)
  content Json
  style   Json?
  settings Json?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model ThemeSettings {
  id             String   @id @default("global")
  storeName      String   @default("Raaghas")
  logoLight      String?
  logoDark       String?
  faviconLight   String?
  faviconDark    String?
  defaultThemeMode String  @default("LIGHT")
  primaryColor   String   @default("#701A31")
  secondaryColor String   @default("#F4F1ED")
  fontHeading    String   @default("serif")
  fontBody       String   @default("sans")
  buttonRadius   String   @default("0.5rem")
  customGlobalCss  String?
  customFooterHtml String?
  config         Json?
  footerConfig   Json?
  updatedAt      DateTime @updatedAt
}

model ThemePreset {
  id           String   @id @default(cuid())
  name         String
  description  String?
  previewImage String?
  config       Json
  isActive     Boolean  @default(false)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}

model Media {
  id        String   @id @default(cuid())
  filename  String
  url       String
  type      String   @default("image")
  size      Int?
  mimeType  String?
  folder    String   @default("All")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model WishlistItem {
  id     String @id @default(cuid())
  userId String
  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id], onDelete: Cascade)
  createdAt DateTime @default(now())
  @@unique([userId, productId])
}

enum RetailerTier {
  SILVER
  GOLD
  PLATINUM
  CUSTOM
}

enum RetailerStatus {
  PENDING
  ACTIVE
  SUSPENDED
}

model Retailer {
  id             String         @id @default(cuid())
  clerkId        String?        @unique
  businessName   String
  contactName    String
  email          String         @unique
  phone          String
  gstNumber      String?
  address        String?
  city           String?
  state          String?
  tier           RetailerTier   @default(SILVER)
  status         RetailerStatus @default(PENDING)
  creditLimit    Decimal?
  creditTermDays Int?           @default(0)
  notes          String?
  priceListId String?
  priceList   PriceList? @relation(fields: [priceListId], references: [id])
  orders WholesaleOrder[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model PriceList {
  id              String   @id @default(cuid())
  name            String   @unique
  discountPercent Decimal
  moqPerSku       Int      @default(1)
  moqPerOrder     Decimal?
  retailers Retailer[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model WholesaleOrder {
  id         String   @id @default(cuid())
  retailerId String
  retailer   Retailer @relation(fields: [retailerId], references: [id])
  status      String  @default("DRAFT")
  isPublished Boolean @default(false)
  totalAmount Decimal @default(0)
  advancePaid Decimal @default(0)
  notes       String?
  emailSentAt DateTime?
  items WholesaleOrderItem[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model WholesaleOrderItem {
  id      String         @id @default(cuid())
  orderId String
  order   WholesaleOrder @relation(fields: [orderId], references: [id], onDelete: Cascade)
  productId String
  product   Product @relation(fields: [productId], references: [id])
  variantId String
  variant   Variant @relation(fields: [variantId], references: [id])
  quantity           Int
  unitMrp            Decimal
  unitWholesalePrice Decimal
  totalPrice         Decimal
  hsnCode            String?
}

enum DiscountType {
  PERCENTAGE
  FIXED_AMOUNT
}

model Discount {
  id    String       @id @default(cuid())
  code  String       @unique
  type  DiscountType
  value Decimal
  minOrderValue Decimal?
  maxDiscount   Decimal?
  usageLimit    Int?
  usageLimitPerUser Int @default(1)
  usedCount     Int      @default(0)
  startDate DateTime?
  endDate   DateTime?
  applicableProducts   String[] @default([])
  applicableCategories String[] @default([])
  isStackable         Boolean  @default(false)
  isActive  Boolean   @default(true)
  expiresAt DateTime?
  usages    DiscountUsage[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model DiscountUsage {
  id         String   @id @default(cuid())
  discountId String
  discount   Discount @relation(fields: [discountId], references: [id], onDelete: Cascade)
  userId     String
  orderId    String
  createdAt  DateTime @default(now())
}

model StoreSettings {
  id              String  @id @default("global")
  storeName       String  @default("Raaghas")
  logoUrl         String?
  supportEmail    String?
  supportPhone    String?
  tagline         String? @default("Luxury ethnic wear crafted for the moments that matter most.")
  footerCopyright String? @default("All rights reserved.")
  instagramUrl String?
  facebookUrl  String?
  twitterUrl   String?
  pinterestUrl String?
  youtubeUrl   String?
  whatsappApiUrl String? @default("https://api.grafty.pro/v1")
  whatsappApiKey String?
  whatsappAppId  String?
  graftyApiUrl     String? @default("https://grafty.pro/api/integrations/v1/event")
  graftyApiKey     String?
  graftyWorkspaceId String?
  googleAnalyticsId         String?
  googleSearchConsoleKey    String?
  whatsappPhoneNumberId     String?
  whatsappBusinessAccountId String?
  smtpHost        String?
  smtpPort        Int?     @default(587)
  smtpUser        String?
  smtpPass        String?
  smtpSecure      Boolean  @default(false)
  bankName        String?  @default("HDFC Bank")
  bankBranch      String?
  accountNumber   String?
  accountName     String?
  ifscCode        String?
  gstNumber       String?
  businessAddress String?
  businessState   String?  @default("Tamil Nadu")
  defaultGstRate  Decimal? @default(12.00)
  activePaymentGateway String? @default("RAZORPAY")
  razorpayKeyId       String?
  razorpayKeySecret   String?
  phonepeMerchantId   String?
  phonepeMerchantUserId String?
  phonepeSaltKey      String?
  phonepeSaltIndex    String? @default("1")
  metaPixelId     String?
  metaCapiToken   String?
  googleAuthSecret String?
  googleClientId   String?
  googleClientSecret String?
  customGlobalCss  String?
  customHeadHtml   String?
  customFooterHtml String?
  referralRewardPercent   Decimal? @default(10.00)
  welcomeDiscountPercent  Decimal? @default(10.00)
  maxCreditUsagePercent   Decimal? @default(50.00)
  delhiveryToken          String?
  delhiveryPickupLocation String?
  shiprocketEmail         String?
  shiprocketPassword      String?
  shiprocketPickupLocation String?
  updatedAt DateTime @updatedAt
}

enum LedgerType {
  SALE
  PURCHASE
  PAYMENT
  REFUND
}

model LedgerEntry {
  id          String   @id @default(cuid())
  type        LedgerType
  amount      Decimal
  referenceId String?
  partyName   String?
  status      String   @default("COMPLETED")
  notes       String?
  isDraft     Boolean  @default(false)
  taxableValue Decimal?
  cgst         Decimal?
  sgst         Decimal?
  igst         Decimal?
  totalTax     Decimal?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PaymentIntent {
  id              String   @id @default(cuid())
  providerOrderId String   @unique
  gateway         String
  amount          Decimal
  status          String   @default("PENDING")
  customerInfo    Json
  metadata        Json?
  clerkId         String?
  walletCreditUsed Decimal? @default(0)
  orderId         String?  @unique
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

enum StockLogType {
  SALE
  RESTOCK
  RESERVATION
  ADJUSTMENT
  RETURN
}

model StockLog {
  id        String  @id @default(cuid())
  variantId String
  variant   Variant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  type       StockLogType
  change     Int
  newBalance Int
  referenceId String?
  notes       String?
  createdAt DateTime @default(now())
}

model StockReservation {
  id        String  @id @default(cuid())
  variantId String
  variant   Variant @relation(fields: [variantId], references: [id], onDelete: Cascade)
  orderId        String?
  proformaId     String?
  orderIntentId  String?
  quantity  Int
  expiresAt DateTime
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

enum WebhookStatus {
  RECEIVED
  PROCESSING
  SUCCESS
  FAILED
  DEAD
}

model WebhookEvent {
  id        String        @id @default(cuid())
  gateway   String
  eventType String
  status    WebhookStatus @default(RECEIVED)
  rawPayload  Json
  signature   String?
  attempts      Int       @default(0)
  maxAttempts   Int       @default(5)
  nextRetryAt   DateTime?
  lastError     String?
  deadReason    String?
  deadAt        DateTime?
  orderId String?
  createdAt   DateTime @default(now())
  processedAt DateTime?
  @@index([status, nextRetryAt])
  @@index([gateway, eventType])
}

enum InquiryStatus {
  PENDING
  IN_PROGRESS
  RESOLVED
}

enum InquiryType {
  GENERAL
  ORDER_QUERY
  WHOLESALE
  COMPLAINT
}

model SupportInquiry {
  id      String  @id @default(cuid())
  name    String
  email   String
  phone   String?
  subject String
  message String
  type   InquiryType   @default(GENERAL)
  status InquiryStatus @default(PENDING)
  orderId String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Wallet {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  balance   Decimal  @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  transactions WalletTransaction[]
}

model WalletTransaction {
  id        String   @id @default(cuid())
  walletId  String
  wallet    Wallet   @relation(fields: [walletId], references: [id], onDelete: Cascade)
  amount    Decimal
  type      String   // CREDIT, DEBIT
  reason    String   // REFERRAL, PURCHASE, REFUND, WELCOME
  referenceId String? // Order ID or Referral ID
  createdAt DateTime @default(now())
}

model Referral {
  id          String   @id @default(cuid())
  referrerId  String
  referrer    User     @relation("Referrer", fields: [referrerId], references: [id])
  refereeId   String   @unique
  referee     User     @relation("Referee", fields: [refereeId], references: [id])
  status      String   @default("PENDING") // PENDING, COMPLETED, REWARDED
  rewardAmount Decimal?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model OrderReturn {
  id          String   @id @default(cuid())
  orderId     String
  order       Order    @relation(fields: [orderId], references: [id])
  reason      String
  status      String   @default("REQUESTED") // REQUESTED, APPROVED, PICKED_UP, RECEIVED, REFUNDED, REJECTED
  items       Json     // List of variant IDs and quantities
  refundAmount Decimal?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model OrderActivity {
  id        String   @id @default(cuid())
  orderId   String
  order     Order    @relation(fields: [orderId], references: [id], onDelete: Cascade)
  action    String   // e.g. "ORDER_CREATED", "STATUS_CHANGED"
  message   String
  metadata  Json?
  createdAt DateTime @default(now())
}

model Fulfillment {
  id              String   @id @default(cuid())
  orderId         String
  order           Order    @relation(fields: [orderId], references: [id])
  trackingNumber  String?
  carrier         String?
  status          String   @default("PENDING")
  items           Json     // List of items fulfilled
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model PurchaseOrder {
  id          String   @id @default(cuid())
  vendorName  String
  status      String   @default("DRAFT") // DRAFT, SENT, RECEIVED, PARTIAL
  totalAmount Decimal
  items       PurchaseOrderItem[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model PurchaseOrderItem {
  id              String   @id @default(cuid())
  purchaseOrderId String
  purchaseOrder   PurchaseOrder @relation(fields: [purchaseOrderId], references: [id], onDelete: Cascade)
  variantId       String
  variant         Variant @relation(fields: [variantId], references: [id])
  quantity        Int
  costPrice       Decimal
}
SCHEMA_EOF

  echo "✅ Schema Overwritten. Generating Client..."

  # 2. Clean and Generate
  rm -rf packages/database/generated-client
  rm -rf node_modules/.prisma/client
  
  export DATABASE_URL=$(grep '^DATABASE_URL=' apps/api/.env | head -1 | cut -d'=' -f2- | tr -d '"' | tr -d "'")
  PRISMA_CLIENT_ENGINE_TYPE=library npx prisma@6.7.0 generate --schema=packages/database/prisma/schema.prisma

  # 3. Create Seeder
  cat > seed_dummy.js << 'EOF'
const path = require('path');
const fs = require('fs');
const targetClientPath = path.join(__dirname, 'packages/database/generated-client');

if (!fs.existsSync(targetClientPath)) {
  console.error("❌ ERROR: Generated client folder does NOT exist.");
  process.exit(1);
}

const { PrismaClient } = require(targetClientPath);
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Seeding Process...');

  const customerEmail = 'customer@example.com';
  const hashedPass = await bcrypt.hash('RaaghasUser2024!', 10);
  
  const customer = await prisma.user.upsert({
    where: { email: customerEmail },
    update: { password: hashedPass },
    create: {
      email: customerEmail,
      password: hashedPass,
      name: 'John Doe',
      role: 'CUSTOMER'
    }
  });
  console.log('✅ Dummy Customer created:', customer.email);

  const officeCol = await prisma.collection.upsert({
    where: { handle: 'office-wear' },
    update: {},
    create: { handle: 'office-wear', title: 'Office Essentials', description: 'Professional grace.' }
  });

  const kalamCol = await prisma.collection.upsert({
    where: { handle: 'kalamkari' },
    update: {},
    create: { handle: 'kalamkari', title: 'Kalamkari Edit', description: 'Hand-painted art.' }
  });

  const products = [
    { title: 'Royal Wine Office Kurti', handle: 'royal-wine-office-kurti', price: 2499, col: officeCol.id },
    { title: 'Ivory Kalamkari Tunic', handle: 'ivory-kalamkari-tunic', price: 3200, col: kalamCol.id }
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { handle: p.handle },
      update: { published: true },
      create: {
        title: p.title,
        handle: p.handle,
        published: true,
        vendor: 'Raaghas',
        variants: { create: [{ sku: "SKU-" + p.handle.toUpperCase(), price: p.price, inventory: 50 }] },
        collections: { connect: { id: p.col } }
      }
    });
  }
  console.log('✅ Dummy Products created.');

  const order = await prisma.order.create({
    data: {
      userId: customer.id,
      orderNumber: 'ORD-' + Math.floor(100000 + Math.random() * 900000),
      status: 'DELIVERED',
      totalAmount: 5699,
      customerName: 'John Doe',
      customerEmail: customerEmail,
      customerPhone: '9876543210',
      shippingAddress: { city: 'Chennai', state: 'Tamil Nadu' },
      paymentStatus: 'PAID',
      items: {
        create: [
          { variantId: (await prisma.variant.findFirst({ where: { sku: 'SKU-ROYAL-WINE-OFFICE-KURTI' } })).id, quantity: 1, price: 2499 },
          { variantId: (await prisma.variant.findFirst({ where: { sku: 'SKU-IVORY-KALAMKARI-TUNIC' } })).id, quantity: 1, price: 3200 }
        ]
      }
    }
  });
  console.log('✅ Sample Order created:', order.orderNumber);
}

main()
  .catch(e => { console.error('❌ Seeding failed:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
EOF

  node seed_dummy.js
  rm seed_dummy.js
REMOTE_SYNC

echo "🏁 Seeding complete!"
