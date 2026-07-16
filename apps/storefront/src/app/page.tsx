import { API_URL } from "@/lib/api";

import { SectionRenderer } from "@/components/sections/SectionRenderer";
import Link from "next/link";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Section {
  id: string;
  type: string;
  order: number;
  content: Record<string, any>;
}

// ─── Static fallback data (used when API/DB is not available yet) ─────────────

const FALLBACK_SECTIONS: Section[] = [
  {
    "id": "cmrnnd0900000l6ug2f7yexmn",
    "type": "CUSTOM_HTML",
    "order": 0,
    "content": {
      "html": "\n<div class=\"bg-gradient-to-r from-[#591B24] to-[#3A1017] p-6 rounded-2xl border border-white/10 text-center max-w-4xl mx-auto my-8 mt-12 shadow-2xl\">\n  <h2 class=\"text-[10px] uppercase tracking-[0.3em] text-[#E0C097] mb-2 font-bold\">Exclusive Offer</h2>\n  <h3 class=\"text-2xl md:text-3xl font-serif text-white mb-6\">UNVEIL THE ELEGANCE WITH RAAGHAS</h3>\n  <div class=\"flex flex-col md:flex-row gap-4 justify-center mb-6\">\n    <div class=\"bg-white/10 border border-white/20 rounded-lg p-4 flex-1 backdrop-blur-sm\">\n       <span class=\"block text-2xl font-bold text-white\">5% OFF</span>\n       <span class=\"block text-xs text-white/70 uppercase mt-1\">Prepaid Orders</span>\n    </div>\n    <div class=\"bg-white/10 border border-white/20 rounded-lg p-4 flex-1 backdrop-blur-sm\">\n       <span class=\"block text-2xl font-bold text-white\">10% OFF</span>\n       <span class=\"block text-xs text-white/70 uppercase mt-1\">On Orders ₹2999+</span>\n    </div>\n  </div>\n  <p class=\"text-[10px] uppercase tracking-widest text-white/50 mb-6\">Use Code: WELCOME10 at Checkout</p>\n  <a href=\"/collections/all\" class=\"bg-[#E0C097] text-[#3A1017] px-10 py-3 rounded-full text-xs font-bold uppercase tracking-widest inline-block hover:bg-white transition-colors shadow-xl\">Shop Collection</a>\n</div>\n"
    }
  },
  {
    "id": "cmrnnd0900001l6ugto6c4pwg",
    "type": "CATEGORY_STRIP",
    "order": 1,
    "content": {
      "categories": [
        {
          "image": "https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=400",
          "label": "Kurtis",
          "handle": "pure-cotton-kurtis"
        },
        {
          "image": "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=400",
          "label": "Sets",
          "handle": "cotton-salwar-set"
        },
        {
          "image": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=400",
          "label": "Dupatta",
          "handle": "kalamkari-dupatta"
        },
        {
          "image": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=400",
          "label": "Premium",
          "handle": "Premium-Wear"
        },
        {
          "image": "https://images.unsplash.com/photo-1594235412402-b1ed2efaa873?q=80&w=400",
          "label": "Office",
          "handle": "office-wear"
        }
      ]
    }
  },
  {
    "id": "cmrnnd0900002l6ugu2gaz345",
    "type": "PRODUCT_GRID",
    "order": 2,
    "content": {
      "limit": 8,
      "title": "Fresh Drops",
      "collectionHandle": "Fresh-Drops"
    }
  },
  {
    "id": "cmrnnd0900003l6ugffonollx",
    "type": "CATEGORIES_MOSAIC",
    "order": 3,
    "content": {
      "headline": "Shop By Mood",
      "categories": [
        {
          "id": "1",
          "size": "large",
          "image": "https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=800",
          "label": "Casual Edit",
          "handle": "flex-cotton-kurtis"
        },
        {
          "id": "2",
          "size": "small",
          "image": "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=600",
          "label": "Evening Elegance",
          "handle": "Premium-Wear"
        },
        {
          "id": "3",
          "size": "small",
          "image": "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600",
          "label": "Festive Ready",
          "handle": "kalamkari"
        },
        {
          "id": "4",
          "size": "medium",
          "image": "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800",
          "label": "Work Wear",
          "handle": "office-wear"
        }
      ]
    }
  },
  {
    "id": "cmrnnd0900004l6ug69atusy9",
    "type": "PRODUCT_GRID",
    "order": 4,
    "content": {
      "limit": 4,
      "title": "Trending Office Essentials",
      "collectionHandle": "office-wear"
    }
  },
  {
    "id": "cmrnnd0900005l6uguauiy3uf",
    "type": "PRODUCT_GRID",
    "order": 5,
    "content": {
      "limit": 4,
      "title": "Best Sellers",
      "collectionHandle": "best-sellers"
    }
  },
  {
    "id": "cmrnnd0900006l6ugzxmej0xz",
    "type": "BRAND_STORY",
    "order": 6,
    "content": {
      "body": "Raaghas is a celebration of Indian heritage, crafted with precision and passion. We bring you the finest handloom pieces that blend traditional artistry with modern silhouettes. From our artisans to your wardrobe, every thread tells a story of elegance.",
      "image": "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=800",
      "ctaLink": "/about",
      "ctaText": "Read Our Story",
      "headline": "About Raaghas"
    }
  },
  {
    "id": "cmrnnd0900007l6ugm4tx0z0m",
    "type": "CUSTOM_HTML",
    "order": 7,
    "content": {
      "html": "\n<div class=\"max-w-7xl mx-auto px-6 py-16\">\n  <h2 class=\"text-3xl font-serif text-theme-text mb-10\">Customer Reviews</h2>\n  <div class=\"grid grid-cols-2 md:grid-cols-4 gap-4\">\n    <div class=\"bg-theme-surface border border-theme-border rounded-xl p-2 shadow-sm overflow-hidden\"><img src=\"https://images.unsplash.com/photo-1611162617474-5b21e879e113?q=80&w=400\" alt=\"Review 1\" class=\"w-full h-auto rounded-lg object-cover\" /></div>\n    <div class=\"bg-theme-surface border border-theme-border rounded-xl p-2 shadow-sm overflow-hidden\"><img src=\"https://images.unsplash.com/photo-1611162616305-c69b3fa7fbe0?q=80&w=400\" alt=\"Review 2\" class=\"w-full h-auto rounded-lg object-cover\" /></div>\n    <div class=\"bg-theme-surface border border-theme-border rounded-xl p-2 shadow-sm overflow-hidden\"><img src=\"https://images.unsplash.com/photo-1611162618071-b39a2ec055fb?q=80&w=400\" alt=\"Review 3\" class=\"w-full h-auto rounded-lg object-cover\" /></div>\n    <div class=\"bg-theme-surface border border-theme-border rounded-xl p-2 shadow-sm overflow-hidden\"><img src=\"https://images.unsplash.com/photo-1611162616475-46b635cb6868?q=80&w=400\" alt=\"Review 4\" class=\"w-full h-auto rounded-lg object-cover\" /></div>\n  </div>\n</div>\n"
    }
  }
];

import { safeFetch } from "@/lib/safe-fetch";

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function getHomePageData(): Promise<any> {
  try {
    const { data, error } = await safeFetch(`/cms/pages/home`, {
      next: { revalidate: 60 }, // ISR: Cache for 60 seconds
      timeoutMs: 5000, // Strict timeout for SSR
    });
    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<import("next").Metadata> {
  const page = await getHomePageData();
  if (page) {
    return {
      title: page.metaTitle || page.title || "Raaghas | Authentic Handloom",
      description: page.metaDescription,
      openGraph: {
        images: page.ogImage ? [{ url: page.ogImage }] : [],
      }
    };
  }
  return {}; // Falls back to layout metadata
}

export default async function Home() {
  const page = await getHomePageData();
  let sections = page?.sections && page.sections.length > 0 ? page.sections : FALLBACK_SECTIONS;

  // SSR Products for Grids
  sections = await Promise.all(sections.map(async (section: any) => {
    if (section.type === "PRODUCT_GRID" || section.type === "PRODUCT_SCROLL" || section.type === "SMART_GRID") {
      const handle = section.content?.collectionHandle === 'all' ? '' : section.content?.collectionHandle;
      try {
        const { data, error } = await safeFetch(`/products${handle ? `?collection=${handle}` : ''}`, { 
          next: { revalidate: 60 },
          timeoutMs: 6000, // Give products slightly longer
          retries: 3
        });
        
        if (!error && data) {
          let productsList = Array.isArray(data) ? data : (data.data || data.products || []);
          if (productsList.length > 0) {
            const limit = section.content?.limit || 16;
            const mapped = productsList.slice(0, limit).map((p: any) => {
              const mainVariant = p.variants?.[0];
              return {
                id: p.id,
                variantId: mainVariant?.id,
                handle: p.handle,
                name: p.title,
                numericPrice: Number(mainVariant?.price || 0),
                price: mainVariant?.price ? `₹${Number(mainVariant.price).toLocaleString()}` : "N/A",
                originalPrice: mainVariant?.compareAtPrice ? `₹${Number(mainVariant.compareAtPrice).toLocaleString()}` : null,
                inventory: p.variants?.reduce((sum: number, v: any) => sum + (v.availableStock ?? v.inventory ?? v.inventoryQuantity ?? 0), 0) || 0,
                taxInclusive: p.taxInclusive,
                taxRate: p.taxRate,
                image1: p.images?.[0]?.url || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800",
                image2: p.images?.[1]?.url || p.images?.[0]?.url || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800",
                label: p.type || "New Arrival",
                badge: p.tags?.toLowerCase().includes('bestseller') ? 'Bestseller' : ((p.variants?.reduce((sum: number, v: any) => sum + (v.availableStock ?? v.inventory ?? v.inventoryQuantity ?? 0), 0) || 0) <= 0 ? 'Sold Out' : null),
                variants: (p.variants || []).map((v: any) => ({
                  id: v.id,
                  option1Name: v.option1Name,
                  option1Value: v.option1Value,
                  option2Name: v.option2Name,
                  option2Value: v.option2Value,
                  option3Name: v.option3Name,
                  option3Value: v.option3Value,
                  price: Number(v.price || 0),
                  mrp: Number(v.mrp || v.compareAtPrice || 0),
                  inventory: v.availableStock ?? v.inventory ?? v.inventoryQuantity ?? 0,
                }))
              };
            });
            section.content = { ...section.content, products: mapped, ssrFetchStatus: 'SUCCESS' };
          } else {
             // Successfully fetched, but empty
             section.content = { ...section.content, products: [], ssrFetchStatus: 'EMPTY' };
          }
        } else {
          // Explicitly mark failure so the client can try to recover or gracefully degrade
          console.warn(`[SSR] Failed to fetch products for collection: ${handle || 'all'}. Error:`, error);
          section.content = { ...section.content, ssrFetchStatus: 'ERROR', ssrError: error };
        }
      } catch (err) {
        console.error("SSR Product fetch failed critically:", err);
        section.content = { ...section.content, ssrFetchStatus: 'ERROR' };
      }
    }
    return section;
  }));

  const schema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Raaghas",
    "url": "https://raaghas.in",
    "logo": "https://raaghas.in/logo-dark.svg",
    "description": "Raaghas is India's leading luxury brand for premium casual and office wear."
  };

  return (
    <main className="flex min-h-screen flex-col">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
      <h1 className="sr-only">Raaghas is India's leading luxury brand for premium casual and office wear.</h1>
      <div className="md:pt-0">
        <SectionRenderer sections={sections} />
      </div>
    </main>
  );
}
