import type { Metadata } from "next";
// Removed Google Fonts for build stability
export const dynamic = "force-dynamic";

import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { AuthProvider } from "@/components/providers/AuthProvider";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { FloatingConcierge } from "@/components/layout/FloatingConcierge";
import { AIChatBubble } from "@/components/ai/AIChatBubble";
import { ExitIntentPopup } from "@/components/cro/ExitIntentPopup";
import { ThemeProvider } from "@/components/providers/ThemeContext";
import { WholesaleProvider } from "@/components/providers/WholesaleProvider";
import { CartProvider } from "@/context/CartContext";
import { StorefrontShell } from "@/components/layout/StorefrontShell";
import MetaPixel from "@/components/analytics/MetaPixel";
import { Suspense } from "react";
import { API_URL } from "@/lib/api";

const MOCK_SETTINGS = {
  storeName: "RAAGHAS",
  logoUrl: null,
  bankName: "HDFC Bank",
  accountNumber: "501002341234",
  ifscCode: "HDFC0001234",
  gstNumber: "33AAAAA1234A1Z1",
  businessState: "Tamil Nadu",
  defaultGstRate: 5,
  aiAssistantEnabled: true,
};

const MOCK_MAIN_MENU = {
  items: [
    { id: 'shop', label: 'Shop', url: '/collections/all' },
    { id: '1', label: 'Collections', url: '/collections', children: [
      { id: '1-1', label: 'New Arrivals', url: '/collections/Fresh-Drops' },
      { id: '1-2', label: 'Bestsellers', url: '/collections/best-sellers' },
      { id: '1-3', label: 'Silk Edit', url: '/collections/silk' },
    ]},
    { id: '2', label: 'Our Story', url: '/about' },
    { id: '3', label: 'Wholesale', url: '/wholesale/register' },
  ],
};

const MOCK_FOOTER_MENU = {
  items: [
    { id: 'f1', label: 'Office Kurtis', url: '/collections/office-wear' },
    { id: 'f2', label: 'Kalamkari Edit', url: '/collections/kalamkari' },
    { id: 'f3', label: 'New Arrivals', url: '/collections/Fresh-Drops' },
    { id: 'f4', label: 'Bestsellers', url: '/collections/best-sellers' },
  ],
};

const MOCK_HELP_MENU = {
  items: [
    { id: 'h1', label: 'Track Order', url: '/account/orders' },
    { id: 'h2', label: 'Shipping Policy', url: '/pages/shipping' },
    { id: 'h3', label: 'Returns & Exchanges', url: '/pages/returns' },
    { id: 'h4', label: 'Size Guide', url: '/pages/size-guide' },
  ],
};

const fontInter = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const fontPlayfair = 'Georgia, "Times New Roman", serif';

export const metadata: Metadata = {
  metadataBase: new URL("https://raaghas.in"),
  title: {
    default: "Raaghas | India's Leading Premium Casual & Office Wear",
    template: "%s | Raaghas"
  },
  description: "Raaghas is India's leading luxury brand for premium casual and office wear. Discover breathable, handcrafted ethnic wear designed for all-day comfort and elegant evening transitions.",
  openGraph: {
    type: "website",
    url: "https://raaghas.in",
    title: "Raaghas | Premium Casual & Office Wear",
    description: "Raaghas is India's leading luxury brand for premium casual and office wear. Discover breathable, handcrafted ethnic wear designed for all-day comfort.",
    siteName: "Raaghas",
    images: [{
      url: "/og-image.jpg",
      width: 1200,
      height: 630,
      alt: "Raaghas Premium Ethnic Wear"
    }]
  },
  twitter: {
    card: "summary_large_image",
    title: "Raaghas | Premium Casual & Office Wear",
    description: "Raaghas is India's leading luxury brand for premium casual and office wear. Discover breathable, handcrafted ethnic wear designed for all-day comfort.",
    images: ["/og-image.jpg"]
  },
  verification: {
    other: {
      "facebook-domain-verification": ["g949sewk3vuccki5nzi99b6tjmlas8"],
    },
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#701A31"
};

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let settings = MOCK_SETTINGS;

  // Default theme config (used if API is down)
  const DEFAULT_LIGHT = {
    primaryColor: "#701A31", bg: "#FDFBF7", surface: "#FFFFFF",
    textPrimary: "#1A1A1A", textSecondary: "#666666", border: "#EEEEEE",
    glassBg: "rgba(255, 255, 255, 0.7)", glassBorder: "rgba(255, 255, 255, 0.3)",
  };
  const DEFAULT_DARK = {
    primaryColor: "#8C1C2A", bg: "#0F0F10", surface: "#1A1A1C",
    textPrimary: "#F5F5F5", textSecondary: "#B0B0B0", border: "#2A2A2C",
    glassBg: "rgba(255, 255, 255, 0.05)", glassBorder: "rgba(255, 255, 255, 0.1)",
  };

  let themeConfig: any = {
    logoLight: null, logoDark: null, faviconLight: null, faviconDark: null,
    defaultThemeMode: "LIGHT", fontHeading: "serif", fontBody: "sans",
    buttonRadius: "0.5rem", light: DEFAULT_LIGHT, dark: DEFAULT_DARK,
  };

  const mainMenu = MOCK_MAIN_MENU;
  const shopMenu = MOCK_FOOTER_MENU;
  const helpMenu = MOCK_HELP_MENU;
  const brandMenu = MOCK_FOOTER_MENU;

  try {
    const fetchWithTimeout = async (url: string, options: any = {}, timeout = 5000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(id);
        return response;
      } catch (e) {
        clearTimeout(id);
        throw e;
      }
    };

    let collections: any[] = [];
    let customPages: any[] = [];

    const [settingsRes, themeRes, collectionsRes, pagesRes] = await Promise.all([
      fetchWithTimeout(`${API_URL}/api/v1/settings/public`, { next: { revalidate: 60 } }),
      fetchWithTimeout(`${API_URL}/api/v1/cms/theme`, { next: { revalidate: 0 } }),
      fetchWithTimeout(`${API_URL}/api/v1/products/collections`, { next: { revalidate: 3600 } }).catch(() => null),
      fetchWithTimeout(`${API_URL}/api/v1/cms/pages`, { next: { revalidate: 3600 } }).catch(() => null)
    ]);

    if (collectionsRes && collectionsRes.ok) {
      collections = await collectionsRes.json();
    }

    if (pagesRes && pagesRes.ok) {
      customPages = await pagesRes.json();
      if (Array.isArray(customPages) && customPages.length > 0) {
        const customLinks = customPages
          .filter((p: any) => p.status === 'PUBLISHED' && p.type !== 'POLICY')
          .map((p: any) => ({
            id: p.id,
            label: p.title,
            url: `/pages/${p.handle}`
          }));
        if (customLinks.length > 0) {
          helpMenu.items = [...helpMenu.items, ...customLinks];
        }
      }
    }

    if (settingsRes.ok) {
      const data = await settingsRes.json();
      settings = { ...MOCK_SETTINGS, ...data };
    }

    if (themeRes.ok) {
      const themeData = await themeRes.json();
      const cfg = themeData.config || themeData;
      
      // Map flat keys (light_bg, etc) to nested objects if they exist
      const mappedLight: any = {};
      const mappedDark: any = {};
      
      Object.keys(cfg).forEach(key => {
        if (key.startsWith('light_')) mappedLight[key.replace('light_', '')] = cfg[key];
        if (key.startsWith('dark_')) mappedDark[key.replace('dark_', '')] = cfg[key];
      });

      themeConfig = {
        ...themeConfig,
        ...cfg,
        footerConfig: themeData.footerConfig || cfg.footerConfig,
        light: { ...DEFAULT_LIGHT, ...(cfg.light || {}), ...mappedLight },
        dark: { ...DEFAULT_DARK, ...(cfg.dark || {}), ...mappedDark },
      };
    }

    if (collections.length > 0) {
      let filteredCollections = collections;
      if (themeConfig.headerCollections && Array.isArray(themeConfig.headerCollections) && themeConfig.headerCollections.length > 0) {
        filteredCollections = themeConfig.headerCollections
          .map((handle: string) => collections.find(c => c.handle === handle))
          .filter(Boolean);
      }
      
      // Find the Collections menu item and replace its children
      const collectionsMenuItem = mainMenu.items.find((i: any) => i.id === '1' || i.label === 'Collections');
      if (collectionsMenuItem) {
        collectionsMenuItem.children = filteredCollections.map((c: any, index: number) => ({
          id: `col-${index}`,
          label: c.title,
          url: `/collections/${c.handle}`
        }));
      }
    }
  } catch (err) {
    console.error("Failed to fetch settings/theme, using defaults", err);
  }

  // Sanitize a CSS value to prevent injection
  const sanitize = (v: string) => v ? v.replace(/[;<>{}]/g, '') : '';

  const fontHeading = themeConfig.fontHeading === 'serif' ? fontPlayfair : themeConfig.fontHeading === 'mono' ? 'monospace' : fontInter;
  const fontBody = themeConfig.fontBody === 'serif' ? fontPlayfair : themeConfig.fontBody === 'mono' ? 'monospace' : fontInter;
  
  const lt = themeConfig.light;
  const dk = themeConfig.dark;

  // Map specific keys if they are named differently (e.g., bg vs backgroundColor)
  const getVal = (obj: any, key: string, fallback: string) => obj[key] || obj[`${key}Color`] || fallback;

  const lightThemeVariables = `
    body {
      --heading-font: ${fontHeading};
      --body-font: ${fontBody};
      --btn-radius: ${sanitize(themeConfig.buttonRadius || "0.5rem")};
      --primary: ${sanitize(getVal(lt, "primary", "#701A31"))};
      --bg: ${sanitize(getVal(lt, "bg", "#FDFBF7"))};
      --surface: ${sanitize(getVal(lt, "surface", "#FFFFFF"))};
      --text-primary: ${sanitize(getVal(lt, "textPrimary", "#1A1A1A"))};
      --text-secondary: ${sanitize(getVal(lt, "textSecondary", "#666666"))};
      --border: ${sanitize(getVal(lt, "border", "#EEEEEE"))};
      --glass-bg: ${sanitize(getVal(lt, "glassBg", "rgba(255, 255, 255, 0.7)"))};
      --glass-border: ${sanitize(getVal(lt, "glassBorder", "rgba(255, 255, 255, 0.3)"))};
    }
  `;

  const darkThemeVariables = `
    .dark body, .dark {
      --primary: ${sanitize(getVal(dk, "primary", "#8C1C2A"))};
      --bg: ${sanitize(getVal(dk, "bg", "#0F0F10"))};
      --surface: ${sanitize(getVal(dk, "surface", "#1A1A1C"))};
      --text-primary: ${sanitize(getVal(dk, "textPrimary", "#F5F5F5"))};
      --text-secondary: ${sanitize(getVal(dk, "textSecondary", "#B0B0B0"))};
      --border: ${sanitize(getVal(dk, "border", "#2A2A2C"))};
      --glass-bg: ${sanitize(getVal(dk, "glassBg", "rgba(255, 255, 255, 0.05)"))};
      --glass-border: ${sanitize(getVal(dk, "glassBorder", "rgba(255, 255, 255, 0.1)"))};
    }
  `;

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="facebook-domain-verification" content="g949sewk3vuccki5nzi99b6tjmlas8" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="stylesheet" href={`/compiled.css?v=${Date.now()}`} />
        {themeConfig.faviconLight ? (
          <link rel="icon" href={themeConfig.faviconLight} media="(prefers-color-scheme: light)" />
        ) : (
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        )}
        {themeConfig.faviconDark ? (
          <link rel="icon" href={themeConfig.faviconDark} media="(prefers-color-scheme: dark)" />
        ) : (
          <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        )}
        {settings.customHeadHtml && (
          <script
            dangerouslySetInnerHTML={{
              __html: `document.head.insertAdjacentHTML('beforeend', \`${settings.customHeadHtml.replace(/`/g, '\\`').replace(/\${/g, '\\${')}\`)`,
            }}
          />
        )}
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: lightThemeVariables + darkThemeVariables }} />
        {themeConfig.customGlobalCss && (
          <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: themeConfig.customGlobalCss }} />
        )}
        {settings.customGlobalCss && (
          <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: settings.customGlobalCss }} />
        )}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "Raaghas",
              "url": "https://raaghas.in",
              "logo": "https://raaghas.in/logo.png",
              "description": "Raaghas is India's leading luxury brand for premium casual and office wear.",
              "sameAs": [
                "https://www.facebook.com/raaghas",
                "https://www.instagram.com/raaghas"
              ]
            })
          }}
        />
      </head>
      <body 
        suppressHydrationWarning
        className="antialiased min-h-screen flex flex-col relative font-[family-name:var(--body-font)] transition-colors duration-500 bg-[var(--bg)] text-[var(--text-primary)]"
      >
        <ThemeProvider>
          <AuthProvider googleClientId={settings.googleClientId || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID}>
          <WholesaleProvider>
            <CartProvider>
              <Suspense fallback={null}>
                <MetaPixel pixelId={settings.metaPixelId} />
              </Suspense>
              <StorefrontShell 
                settings={settings} 
                theme={themeConfig}
                mainMenu={mainMenu} 
                shopMenu={shopMenu} 
                helpMenu={helpMenu} 
                brandMenu={brandMenu}
              >
                {children}
              </StorefrontShell>
            </CartProvider>
          </WholesaleProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
