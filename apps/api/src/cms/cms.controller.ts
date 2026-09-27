import { Controller, Get, Param, NotFoundException, Put, Body, UseGuards, Post, UseInterceptors, UploadedFile, Delete, Req, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { extname } from 'path';
import { existsSync, mkdirSync } from 'fs';
import * as fs from 'fs/promises';
import { PrismaService } from '../prisma/prisma.service';
import { Public } from '../auth/public.decorator';
import { AuthGuard } from '../auth/auth.guard';
import { ImageOptimizer } from '../common/utils/image-optimizer';

// ─── Default Theme Config (used when no DB row exists yet) ──────────────────
const DEFAULT_THEME_CONFIG = {
  logoLight: null,
  logoDark: null,
  faviconLight: null,
  faviconDark: null,
  defaultThemeMode: "LIGHT",
  fontHeading: "serif",
  fontBody: "sans",
  buttonRadius: "0.5rem",
  light: {
    primaryColor: "#701A31",
    bg: "#FDFBF7",
    surface: "#FFFFFF",
    textPrimary: "#1A1A1A",
    textSecondary: "#666666",
    border: "#EEEEEE",
    glassBg: "rgba(255, 255, 255, 0.7)",
    glassBorder: "rgba(255, 255, 255, 0.3)",
  },
  dark: {
    primaryColor: "#8C1C2A",
    bg: "#0F0F10",
    surface: "#1A1A1C",
    textPrimary: "#F5F5F5",
    textSecondary: "#B0B0B0",
    border: "#2A2A2C",
    glassBg: "rgba(255, 255, 255, 0.05)",
    glassBorder: "rgba(255, 255, 255, 0.1)",
  },
};

const DEFAULT_FOOTER_CONFIG = {
  logo: { show: true, type: "IMAGE" },
  tagline: "Luxury ethnic wear crafted for the moments that matter most.",
  columns: [
    {
      id: "shop",
      title: "Shop",
      items: [
        { id: "1", label: "New Arrivals", url: "/collections/all" },
        { id: "2", label: "Bestsellers", url: "/collections/best-sellers" }
      ]
    },
    {
      id: "help",
      title: "Help",
      items: [
        { id: "3", label: "Track Order", url: "/track" },
        { id: "4", label: "Support", url: "/support" }
      ]
    },
    {
      id: "legal",
      title: "Legal",
      items: [
        { id: "5", label: "Terms", url: "/policies/terms-and-conditions" },
        { id: "6", label: "Privacy", "url": "/policies/privacy-policy" },
        { id: "7", label: "Returns", "url": "/policies/return-policy" }
      ]
    }
  ],
  socials: { show: true },
  bottomBar: {
    copyright: "© 2024 Raaghas. All rights reserved.",
    showPaymentIcons: true
  }
};

// ─── Policy Content ──────────────────────────────────────────────────────────
const POLICY_PAGES = [
  {
    handle: 'privacy-policy',
    title: 'Privacy Policy',
    metaTitle: 'Privacy Policy | Raaghas Clothing',
    metaDescription: 'Raaghas Clothing privacy policy – how we collect, use, and protect your personal information.',
    sections: [
      {
        title: 'Introduction',
        content: '<p>At Raaghas Clothing, we value your privacy and are committed to protecting your personal information. This Privacy Policy explains how we collect, use, and safeguard your data when you shop with us, visit our website, or contact our support team.</p>'
      },
      {
        title: '1. Information We Collect',
        content: '<p>We collect information to provide you with a smooth and personalized shopping experience.</p><p><strong>a. Personal Information</strong><br/>When you place an order or contact us, we may collect:</p><ul><li>Name</li><li>Phone number</li><li>Email address</li><li>Billing and shipping address</li><li>Order details</li></ul><p><strong>b. Payment Information</strong><br/>We do not store your payment details. All online payments are processed securely through trusted third-party payment gateways.</p><p><strong>c. Device &amp; Browsing Information</strong><br/>To improve our website and services, we may collect:</p><ul><li>IP address</li><li>Browser type</li><li>Pages visited</li><li>Time spent on the website</li><li>Cookies (for site functionality and personalization)</li></ul>'
      },
      {
        title: '2. How We Use Your Information',
        content: '<p>We use your data to:</p><ul><li>Process and deliver your orders</li><li>Provide order updates and customer support</li><li>Improve our website, user experience, and product offerings</li><li>Send promotional messages or updates (only if you choose to receive them)</li><li>Prevent fraud and ensure secure transactions</li></ul><p>We never sell or misuse your personal information.</p>'
      },
      {
        title: '3. Sharing Your Information',
        content: '<p>We only share your data with trusted partners when necessary:</p><ul><li>Courier partners (to deliver your orders)</li><li>Payment gateways (to process secure transactions)</li><li>Marketing tools (only if you subscribe to updates)</li></ul><p>These partners follow strict security standards and use your data only for essential services.</p>'
      },
      {
        title: '4. Cookies & Tracking Technologies',
        content: '<p>Our website uses cookies to:</p><ul><li>Remember your preferences</li><li>Improve site performance</li><li>Analyze browsing behavior</li><li>Provide personalized shopping suggestions</li></ul><p>You can turn off cookies in your browser settings anytime, but some features may not work properly.</p>'
      },
      {
        title: '5. Data Security',
        content: '<p>We take strong steps to protect your data:</p><ul><li>Encrypted payment systems</li><li>Secure servers</li><li>Limited access to sensitive information</li></ul><p>Although no online system can guarantee 100% security, we continually update our practices to keep your information safe.</p>'
      },
      {
        title: '6. Your Rights',
        content: '<p>You have the right to:</p><ul><li>Request access to the personal data we hold</li><li>Correct or update your information</li><li>Unsubscribe from marketing messages</li><li>Ask us to delete your information (where legally allowed)</li></ul><p>To make any request, simply contact us.</p>'
      },
      {
        title: "7. Children's Privacy",
        content: "<p>Raaghas Clothing does not knowingly collect data from children under 13. If a parent or guardian believes their child has provided information, please contact us immediately.</p>"
      },
      {
        title: '8. Changes to This Privacy Policy',
        content: '<p>We may update this policy from time to time to improve our practices or follow legal requirements. The updated version will always be available on this page.</p>'
      },
      {
        title: '9. Contact Us',
        content: '<p>If you have any questions about our Privacy Policy or how your data is used, feel free to reach out:</p><p>📧 <a href="mailto:contact@raaghas.in">contact@raaghas.in</a><br/>📱 WhatsApp: +91 89460 11689</p><p>We\'re always here to help you.</p>'
      }
    ]
  },
  {
    handle: 'terms-and-conditions',
    title: 'Terms & Conditions',
    metaTitle: 'Terms & Conditions | Raaghas Clothing',
    metaDescription: 'Read Raaghas Clothing\'s terms and conditions for shopping, payments, shipping, returns, and more.',
    sections: [
      {
        title: 'Welcome',
        content: '<p>Welcome to Raaghas Clothing. By accessing or using our website, you agree to the following Terms &amp; Conditions. Please read them carefully before making any purchase or using our services.</p><p><em>Last Updated: 04-12-2025</em></p>'
      },
      {
        title: '1. General',
        content: '<p>By using this website, you confirm that you are at least 18 years old or using the site under the supervision of a parent/guardian.</p><p>Raaghas Clothing reserves the right to update, modify, or change these terms at any time.</p>'
      },
      {
        title: '2. Products & Services',
        content: '<p>We strive to display accurate product descriptions, images, and colors. However, slight variations may occur due to lighting or device screens.</p><p>Availability of products may change without prior notice.</p>'
      },
      {
        title: '3. Ordering & Payment',
        content: '<p>All orders placed on our website are subject to acceptance and availability.</p><p>We accept online payments through trusted payment gateways.</p><p>Raaghas Clothing reserves the right to cancel or refuse any order due to stock issues, payment errors, or suspicious activity.</p>'
      },
      {
        title: '4. Shipping & Delivery',
        content: '<p>Orders are shipped within the mentioned processing time on the website/product page.</p><p>Delivery timelines may vary based on location, courier delays, or unforeseen events.</p><p>Raaghas Clothing is not responsible for delays caused by courier companies.</p>'
      },
      {
        title: '5. Returns, Exchanges & Cancellation',
        content: '<p>Return or exchange is allowed only as per the policy mentioned on our website.</p><p>Items must be unused, unwashed, and in original packaging with tags.</p><p>Certain items (like customized/personalized products) may not be eligible for return.</p><p>Order cancellation is allowed only before the item is shipped.</p>'
      },
      {
        title: '6. Pricing & Offers',
        content: '<p>All prices mentioned include GST unless stated otherwise.</p><p>Discounts, coupons, and offers may change or expire at any time.</p>'
      },
      {
        title: '7. Intellectual Property',
        content: '<p>All content including logos, designs, images, text, and graphics are the property of Raaghas Clothing.</p><p>Any unauthorized copying, use, or distribution is strictly prohibited.</p>'
      },
      {
        title: '8. User Responsibilities',
        content: '<p>Users must provide accurate information while placing orders.</p><p>Any misuse of the website, fraudulent activity, or violation of terms may lead to account suspension.</p>'
      },
      {
        title: '9. Limitation of Liability',
        content: '<p>Raaghas Clothing is not responsible for any direct or indirect damages due to website use, delayed orders, or product issues beyond our control.</p><p>We ensure quality but cannot guarantee that the website will be error-free or uninterrupted.</p>'
      },
      {
        title: '10. Third-Party Links',
        content: '<p>Our website may contain links to third-party sites. We are not responsible for their content or policies.</p>'
      },
      {
        title: '11. Governing Law',
        content: '<p>These Terms &amp; Conditions are governed by Indian law. Any disputes shall be resolved under the jurisdiction of Coimbatore, Tamil Nadu courts.</p>'
      },
      {
        title: '12. Contact Us',
        content: '<p>For queries or support:</p><p>📧 <a href="mailto:contact@raaghas.in">contact@raaghas.in</a><br/>📍 Bangalore | Salem</p>'
      }
    ]
  },
  {
    handle: 'return-policy',
    title: 'Return & Refund Policy',
    metaTitle: 'Return & Refund Policy | Raaghas Clothing',
    metaDescription: 'Raaghas Clothing return and refund policy – learn about our hassle-free return process for luxury ethnic wear.',
    sections: [
      {
        title: 'Overview',
        content: '<p>At Raaghas, every piece is crafted with meticulous care. We understand that shopping online can sometimes lead to uncertainty about fit, fabric, or colour. Our return policy is designed to make your experience as smooth and fair as possible.</p>'
      },
      {
        title: 'Eligibility for Returns',
        content: '<p>We accept returns for the following reasons:</p><ul><li>Item received is damaged or defective</li><li>Wrong item / size delivered</li><li>Significant colour mismatch from product photos</li><li>Missing parts or accessories from the order</li></ul>'
      },
      {
        title: 'Non-Returnable Items',
        content: '<p>The following items are not eligible for return:</p><ul><li>Items returned after 7 days from the date of delivery</li><li>Washed, worn, or altered garments</li><li>Products without original tags, packaging, or invoice</li><li>Sale / clearance items (unless damaged or defective)</li><li>Customised or personalised orders</li></ul>'
      },
      {
        title: 'How to Initiate a Return',
        content: '<ol><li>Email us at <a href="mailto:contact@raaghas.in">contact@raaghas.in</a> within 7 days of delivery with your order ID, photos of the issue, and reason for return.</li><li>Our team will review your request and respond within 48 business hours.</li><li>Once approved, we\'ll share a return shipping label or schedule a pickup (available in select pincodes).</li><li>Pack the item securely in its original packaging with all tags intact.</li><li>Upon receiving and inspecting the item, we\'ll process your refund or exchange.</li></ol>'
      },
      {
        title: 'Refunds',
        content: '<p>Once your return is received and inspected, we will notify you of the approval or rejection of your refund.</p><p>Approved refunds will be processed within <strong>5–7 business days</strong> back to the original payment method. For UPI and wallet payments, refunds are typically credited within 2–3 business days.</p><p>If you paid via Cash on Delivery, the refund will be issued as Raaghas Store Credits usable on future orders.</p>'
      },
      {
        title: 'Exchanges',
        content: '<p>We offer free size exchanges (subject to stock availability). Please mention your preferred size while raising a return request. Exchanges are processed after we receive the original item.</p>'
      },
      {
        title: 'Contact Us',
        content: '<p>For any queries regarding returns or refunds, please reach out to us:</p><p>📧 <a href="mailto:contact@raaghas.in">contact@raaghas.in</a><br/>📱 WhatsApp: +91 89460 11689<br/>🕐 Monday – Saturday, 10am – 6pm IST</p>'
      }
    ]
  }
];

@Controller('cms')
export class CmsController {
  constructor(private prisma: PrismaService) {}

  /** 
   * ATOMIC SYNC: The single production-level entry point for saving CMS state.
   * Ensures Page, Sections, and Theme are updated in a single transaction.
   */
  @UseGuards(AuthGuard)
  @Post('sync')
  async atomicSync(@Req() req: any, @Body() data: { page: any; theme: any }) {
    // 1. Strict Role Authorization
    const userRole = req.user?.role;
    const allowedRoles = ['SUPER_ADMIN', 'ADMIN', 'CMS_MANAGER'];
    if (!allowedRoles.includes(userRole)) {
      throw new UnauthorizedException('You do not have permission to sync CMS state');
    }

    if (!data.page || !data.theme) {
      throw new BadRequestException('Sync payload missing page or theme data');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        // 2. Update Theme Settings (Global)
        const themeData = {
          storeName: data.theme.storeName || 'Raaghas',
          config: data.theme.config || {},
          footerConfig: data.theme.footerConfig || undefined,
          logoLight: data.theme.config?.logoLight,
          logoDark: data.theme.config?.logoDark,
          primaryColor: data.theme.config?.light_primaryColor || '#701A31',
        };

        await tx.themeSettings.upsert({
          where: { id: 'global' },
          update: themeData,
          create: { id: 'global', ...themeData }
        });

        // 3. Update Page Header
        const page = await tx.page.upsert({
          where: { handle: data.page.handle },
          update: { title: data.page.title },
          create: { handle: data.page.handle, title: data.page.title, type: 'LANDING' }
        });

        // 4. SURGICAL SECTION SYNC (Non-Destructive)
        const currentSections = await tx.section.findMany({
          where: { pageId: page.id },
          select: { id: true }
        });
        const currentSectionIds = currentSections.map((s: any) => s.id);
        const incomingSectionIds = data.page.sections?.map((s: any) => s.id).filter(Boolean) || [];

        // Delete orphans (sections not in the new payload)
        const orphans = currentSectionIds.filter((id: string) => !incomingSectionIds.includes(id));
        if (orphans.length > 0) {
          await tx.section.deleteMany({ where: { id: { in: orphans } } });
        }

        // Upsert incoming sections
        if (data.page.sections) {
          for (const sec of data.page.sections) {
            const sectionData = {
              type: sec.type,
              order: sec.order || 0,
              content: sec.content || {},
              style: sec.style || {},
              settings: sec.settings || {}
            };

            if (sec.id && currentSectionIds.includes(sec.id)) {
              await tx.section.update({
                where: { id: sec.id },
                data: sectionData
              });
            } else {
              await tx.section.create({
                data: { ...sectionData, pageId: page.id }
              });
            }
          }
        }

        return { success: true, timestamp: new Date(), pageId: page.id };
      }, {
        timeout: 15000 // Increased timeout for heavy theme payloads
      });
    } catch (err: any) {
      console.error("Atomic Sync Failed:", err);
      throw new BadRequestException(`Sync failed: ${err.message}`);
    }
  }

  // ─── PAGES ──────────────────────────────────────────────────────────────────

  /** List all CMS pages */
  @Get('pages')
  @Public()
  async listPages() {
    try {
      return await this.prisma.page.findMany();
    } catch (err) {
      console.error("CMS List Pages Error:", err);
      return [];
    }
  }

  /** Get a single CMS page by handle (slug) */
  @Get('pages/:handle')
  @Public()
  async getPageByHandle(@Param('handle') handle: string) {
    const page = await this.prisma.page.findUnique({
      where: { handle },
      include: {
        sections: {
          orderBy: { order: 'asc' }
        }
      }
    });

    if (!page) {
      throw new NotFoundException(`Page with handle "${handle}" not found`);
    }

    return page;
  }

  /** Save/upsert a CMS page (auth required) */
  @UseGuards(AuthGuard)
  @Put('pages/:handle')
  async savePage(@Param('handle') handle: string, @Body() data: any) {
    // Upsert the page
    const page = await this.prisma.page.upsert({
      where: { handle },
      update: { 
        handle: data.handle || handle,
        title: data.title || handle,
        type: data.type,
        status: data.status,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        ogImage: data.ogImage,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null
      },
      create: { 
        handle, 
        title: data.title || handle,
        type: data.type || 'LANDING',
        status: data.status || 'DRAFT',
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        ogImage: data.ogImage,
        publishedAt: data.status === 'PUBLISHED' ? new Date() : null
      }
    });

    // Delete existing sections to recreate them (or update if we had IDs)
    await this.prisma.section.deleteMany({
      where: { pageId: page.id }
    });

    // Bulk create new sections
    if (data.sections && data.sections.length > 0) {
      await this.prisma.section.createMany({
        data: data.sections.map((sec: any) => ({
          pageId: page.id,
          type: sec.type as any,
          order: sec.order,
          content: sec.content || {},
          style: sec.style || {},
          settings: sec.settings || {}
        }))
      });
    }

    return this.getPageByHandle(handle);
  }

  /** Delete a CMS page (auth required) */
  @UseGuards(AuthGuard)
  @Delete('pages/:id')
  async deletePage(@Param('id') id: string) {
    await this.prisma.page.delete({ where: { id } });
    return { success: true };
  }

  /**
   * Seed or reset the standard policy pages (Privacy, Terms, Returns).
   * This uses the official policy content as provided by Raaghas Clothing.
   * Safe to run multiple times — it will delete & recreate to stay idempotent.
   */
  @Post('pages/seed-policies')
  @Public()
  async seedPolicies() {
    try {
      for (const policy of POLICY_PAGES) {
        // Idempotent: delete existing and recreate cleanly
        await this.prisma.page.deleteMany({ where: { handle: policy.handle } });

        const page = await this.prisma.page.create({
          data: {
            handle: policy.handle,
            title: policy.title,
            type: 'POLICY' as any,
            status: 'PUBLISHED',
            metaTitle: policy.metaTitle,
            metaDescription: policy.metaDescription,
            publishedAt: new Date(),
          }
        });

        // One LEGAL_PROSE section containing all numbered sections
        await this.prisma.section.create({
          data: {
            pageId: page.id,
            type: 'LEGAL_PROSE' as any,
            order: 0,
            content: {
              title: policy.title,
              lastUpdated: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
              sections: policy.sections,
            },
            style: { padding: 80 },
            settings: {}
          }
        });
      }

      return { success: true, count: POLICY_PAGES.length, pages: POLICY_PAGES.map(p => p.handle) };
    } catch (err: any) {
      console.error("Policy Seed Error:", err);
      throw new BadRequestException(`Policy seed failed: ${err.message || 'Unknown error'}`);
    }
  }

  /** Seed default Home page with sections */
  @Post('pages/seed-home')
  @Public()
  async seedHome() {
    const handle = 'home';
    const page = await this.prisma.page.upsert({
      where: { handle },
      update: { 
        title: 'Raaghas Home', 
        type: 'LANDING',
        status: 'PUBLISHED'
      },
      create: { 
        handle, 
        title: 'Raaghas Home', 
        type: 'LANDING',
        status: 'PUBLISHED'
      }
    });

    await this.prisma.section.deleteMany({ where: { pageId: page.id } });
    
    const sections = [
      {
        type: 'HERO',
        order: 0,
        content: {
          variant: "aesthetic",
          headline: "Office Elegance.\\nKalamkari Art.",
          subheadline: "Hand-painted kurtis crafted for the modern workspace. Graceful, breathable, and unmistakably Raaghas.",
          primaryCta: { text: "Shop Office Wear", link: "/collections/office-wear" },
          secondaryCta: { text: "View Kalamkari", link: "/collections/kalamkari" },
          uiElements: [
            { x: 82, y: 18, size: 1.1, opacity: 0.8, speed: 0.5, iconName: "KalamkariFlower", shape: "circle", text: "OFFICE", subtext: "LUXURY" },
            { x: 18, y: 78, size: 0.9, opacity: 0.7, speed: 0.3, iconName: "LuxuryHanger", shape: "rounded", text: "10% OFF", subtext: "NEW ORDER" }
          ],
          fabrics: [
            { x: 25, y: 35, opacity: 0.12, speed: 0.2, scale: 1.1 },
            { x: 72, y: 62, opacity: 0.1, speed: 0.3, scale: 1.3 }
          ]
        }
      },
      {
        type: 'TRUST_BAR',
        order: 1,
        content: {
          items: [
            { icon: "Truck", text: "Free Shipping on First Order" },
            { icon: "CheckCircle", text: "100% Authentic Kalamkari" },
            { icon: "Clock", text: "7-Day Easy Exchange" },
            { icon: "Shield", text: "Safe & Secure Checkout" }
          ]
        }
      },
      {
        type: 'PRODUCT_GRID',
        order: 2,
        content: {
          title: "Trending Office Essentials",
          count: 4,
          collectionHandle: "office-wear"
        }
      },
      {
        type: 'DEAL_BANNER',
        order: 3,
        content: {
          headline: "EXCLUSIVE WELCOME OFFER",
          subtext: "Get Flat 10% OFF on your first purchase. Use Code: RAAGHAS10",
          ctaText: "Claim My Discount",
          ctaLink: "/collections/all"
        }
      },
      {
        type: 'SOCIAL_PROOF',
        order: 4,
        content: {
          headline: "The Raaghas Woman",
          subtext: "Join thousands of professionals who choose grace for their workday.",
          items: [
            { image: "https://images.unsplash.com/photo-1594235412402-b1ed2efaa873?q=80&w=400", name: "Riya", city: "Bangalore" },
            { image: "https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=400", name: "Ananya", city: "Mumbai" }
          ]
        }
      },
      {
        type: 'INSTAGRAM_FEED',
        order: 5,
        content: {
          headline: "Follow Our Story",
          url: "https://instagram.com/raaghas.official",
          handleText: "@raaghas.official"
        }
      }
    ];

    await this.prisma.section.createMany({
      data: sections.map(s => ({
        pageId: page.id,
        type: s.type as any,
        order: s.order,
        content: s.content,
      }))
    });

    return { success: true };
  }

  // ─── SECTIONS ───────────────────────────────────────────────────────────────

  /** Add a single section to a page (auth required) */
  @UseGuards(AuthGuard)
  @Post('sections')
  async addSection(@Body() data: { pageHandle: string; type: string; order?: number; content?: any; style?: any; settings?: any }) {
    const page = await this.prisma.page.findUnique({ where: { handle: data.pageHandle } });
    if (!page) throw new NotFoundException(`Page "${data.pageHandle}" not found`);

    // If no order specified, append to end
    const maxOrder = await this.prisma.section.aggregate({
      where: { pageId: page.id },
      _max: { order: true },
    });
    const nextOrder = data.order ?? ((maxOrder._max.order ?? -1) + 1);

    return this.prisma.section.create({
      data: {
        pageId: page.id,
        type: data.type as any,
        order: nextOrder,
        content: data.content || {},
        style: data.style || {},
        settings: data.settings || {},
      }
    });
  }

  /** Update sections for a page by pageId */
  @UseGuards(AuthGuard)
  @Put('pages/:id/sections')
  async updatePageSections(@Param('id') id: string, @Body() data: { sections: any[] }) {
    const page = await this.prisma.page.findUnique({ where: { id } });
    if (!page) throw new NotFoundException('Page not found');

    await this.prisma.section.deleteMany({ where: { pageId: id } });

    if (data.sections && data.sections.length > 0) {
      await this.prisma.section.createMany({
        data: data.sections.map((sec: any) => ({
          pageId: id,
          type: sec.type as any,
          order: sec.order || 0,
          content: sec.content || {},
          style: sec.style || {},
          settings: sec.settings || {}
        }))
      });
    }

    return this.getPageByHandle(page.handle);
  }

  // ─── THEME ──────────────────────────────────────────────────────────────────

  /** Get the global theme config (public) */
  @Get('theme')
  @Public()
  async getTheme() {
    let theme = await this.prisma.themeSettings.findUnique({
      where: { id: 'global' }
    });

    if (!theme) {
      // Seed with defaults
      theme = await this.prisma.themeSettings.create({
        data: { 
          id: 'global',
          storeName: 'Raaghas',
          primaryColor: DEFAULT_THEME_CONFIG.light.primaryColor,
          fontHeading: DEFAULT_THEME_CONFIG.fontHeading,
          fontBody: DEFAULT_THEME_CONFIG.fontBody,
          buttonRadius: DEFAULT_THEME_CONFIG.buttonRadius,
          config: DEFAULT_THEME_CONFIG,
          footerConfig: DEFAULT_FOOTER_CONFIG
        }
      });
    }

    // Merged config: default -> saved JSON config -> top-level DB fields
    const savedConfig = (theme.config as any) || {};
    const config = {
      ...DEFAULT_THEME_CONFIG,
      ...savedConfig,
      logoLight: theme.logoLight || savedConfig.logoLight,
      logoDark: theme.logoDark || savedConfig.logoDark,
      faviconLight: theme.faviconLight || savedConfig.faviconLight,
      faviconDark: theme.faviconDark || savedConfig.faviconDark,
      defaultThemeMode: theme.defaultThemeMode || savedConfig.defaultThemeMode,
      fontHeading: theme.fontHeading || savedConfig.fontHeading,
      fontBody: theme.fontBody || savedConfig.fontBody,
      buttonRadius: theme.buttonRadius || savedConfig.buttonRadius,
      customFooterHtml: theme.customFooterHtml || savedConfig.customFooterHtml,
      customGlobalCss: theme.customGlobalCss || savedConfig.customGlobalCss,
    };

    return { 
      id: theme.id, 
      storeName: theme.storeName, 
      config, 
      footerConfig: theme.footerConfig || DEFAULT_FOOTER_CONFIG,
      updatedAt: theme.updatedAt 
    };
  }

  /** Save the global theme (auth required) */
  @UseGuards(AuthGuard)
  @Post('theme')
  async saveTheme(@Body() data: { storeName?: string; config: any; footerConfig?: any }) {
    const c = data.config || {};
    
    // We store the full config object in the JSON field to never lose data,
    // while also updating the top-level searchable/standard fields.
    const flatData = {
      storeName: data.storeName || c.storeName || 'Raaghas',
      logoLight: c.logoLight,
      logoDark: c.logoDark,
      faviconLight: c.faviconLight,
      faviconDark: c.faviconDark,
      defaultThemeMode: c.defaultThemeMode || 'LIGHT',
      fontHeading: c.fontHeading || 'serif',
      fontBody: c.fontBody || 'sans',
      buttonRadius: c.buttonRadius || '0.5rem',
      primaryColor: c.light_primaryColor || c.light?.primaryColor || '#701A31',
      customFooterHtml: c.customFooterHtml,
      customGlobalCss: c.customGlobalCss,
      config: c, // Save the whole thing!
      footerConfig: data.footerConfig || undefined
    };

    return this.prisma.themeSettings.upsert({
      where: { id: 'global' },
      update: flatData,
      create: { id: 'global', ...flatData }
    });
  }

  /** PUT alias for backward compatibility */
  @UseGuards(AuthGuard)
  @Put('theme')
  async updateTheme(@Body() data: { storeName?: string; config: any; footerConfig?: any }) {
    return this.saveTheme(data);
  }

  // ─── MEDIA ──────────────────────────────────────────────────────────────────

  /** List all media from DB (public) */
  @Get('media')
  @Public()
  async getMedia() {
    try {
      return await this.prisma.media.findMany({
        orderBy: { createdAt: 'desc' }
      });
    } catch (err) {
      console.error("CMS: Failed to fetch media", err);
      throw new Error(`Failed to fetch media: ${(err as any).message}`);
    }
  }

  /** Delete a media file (auth required) */
  @UseGuards(AuthGuard)
  @Delete('media/:id')
  async deleteMedia(@Param('id') id: string) {
    const media = await this.prisma.media.findUnique({ where: { id } });
    if (!media) throw new NotFoundException('Media not found');

    // Attempt to delete from filesystem
    const filePath = path.join(process.cwd(), 'uploads', media.filename);
    if (existsSync(filePath)) {
      await fs.unlink(filePath);
    }

    await this.prisma.media.delete({ where: { id } });
    return { success: true };
  }

  /** Upload a file + persist to Media DB table (auth required) */
  @UseGuards(AuthGuard)
  @Post('media/upload')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'uploads');
        if (!existsSync(uploadPath)) {
          mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
      },
      filename: (req, file, cb) => {
        const randomName = Array(32).fill(null).map(() => (Math.round(Math.random() * 16)).toString(16)).join('');
        return cb(null, `${randomName}${extname(file.originalname)}`);
      }
    }),
    fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/\/(jpg|jpeg|png|webp|gif)$/)) {
        return cb(new BadRequestException('Only image files are allowed!'), false);
      }
      cb(null, true);
    },
    limits: { fileSize: 5 * 1024 * 1024 }
  }))
  async uploadFile(@UploadedFile() file: any, @Req() req: any) {
    if (!file) {
       throw new BadRequestException('File not uploaded');
    }
     
    // CRITICAL: Always store a full absolute public URL — never localhost.
    // API_URL on VPS is internal (localhost:6005); browsers cannot reach it.
    const baseUrl = process.env.NODE_ENV === 'production'
      ? 'https://api.raaghas.in'
      : 'http://localhost:6005';
    
    // Perform "Monster Level" optimization
    let finalFilename = file.filename;
    if (file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      const optimizedPath = await ImageOptimizer.optimize(file.path);
      finalFilename = path.basename(optimizedPath);
    }

    const url = `${baseUrl}/uploads/${finalFilename}`;
    const fileType = extname(file.originalname).match(/\.(mp4|webm|ogg)$/i) ? 'video' : 'image';

    // Persist to database
    return this.prisma.media.create({
      data: {
        filename: finalFilename,
        url,
        type: fileType,
        size: file.size,
        mimeType: file.mimetype.includes('image') ? 'image/webp' : file.mimetype,
      }
    });
  }
}
