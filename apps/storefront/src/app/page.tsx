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
    id: "cmrnk0ssq0001uuxaxmk93w1w",
    type: "HERO",
    order: 0,
    content: {
      fabrics: [
        { x: 25, y: 35, scale: 1.1, speed: 0.2, opacity: 0.12 },
        { x: 72, y: 62, scale: 1.3, speed: 0.3, opacity: 0.1 }
      ],
      variant: "aesthetic",
      headline: "Office Elegance.\nKalamkari Art.",
      primaryCta: {
        link: "/collections/office-wear",
        text: "Shop Office Wear"
      },
      uiElements: [
        {
          x: 82,
          y: 18,
          size: 1.1,
          text: "OFFICE",
          shape: "circle",
          speed: 0.5,
          opacity: 0.8,
          subtext: "LUXURY",
          iconName: "KalamkariFlower"
        },
        {
          x: 18,
          y: 78,
          size: 0.9,
          text: "10% OFF",
          shape: "rounded",
          speed: 0.3,
          opacity: 0.7,
          subtext: "NEW ORDER",
          iconName: "LuxuryHanger"
        }
      ],
      subheadline: "Hand-painted kurtis crafted for the modern workspace. Graceful, breathable, and unmistakably Raaghas.",
      secondaryCta: {
        link: "/collections/kalamkari",
        text: "View Kalamkari"
      }
    }
  },
  {
    id: "cmrnk0ssq0002uuxaj8pk8hij",
    type: "TRUST_BAR",
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
    id: "cmrnk0ssq0003uuxayi4cq4uy",
    type: "PRODUCT_GRID",
    order: 2,
    content: {
      count: 16,
      title: "Fresh Drops",
      collectionHandle: "Fresh-Drops"
    }
  },
  {
    id: "cmrnk0ssq0004uuxaia6sh4g7",
    type: "DEAL_BANNER",
    order: 3,
    content: {
      ctaLink: "/collections/all",
      ctaText: "Claim My Discount",
      subtext: "Get Flat 10% OFF on your first purchase. Use Code: RAAGHAS10",
      headline: "EXCLUSIVE WELCOME OFFER"
    }
  },
  {
    id: "cmrnk0ssr0005uuxaawywgzl7",
    type: "SOCIAL_PROOF",
    order: 4,
    content: {
      items: [
        {
          city: "Bangalore",
          name: "Riya",
          image: "https://images.unsplash.com/photo-1594235412402-b1ed2efaa873?q=80&w=400"
        },
        {
          city: "Mumbai",
          name: "Ananya",
          image: "https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=400"
        }
      ],
      subtext: "Join thousands of professionals who choose grace for their workday.",
      headline: "The Raaghas Woman"
    }
  },
  {
    id: "cmrnk0ssr0006uuxa5wpq7n70",
    type: "INSTAGRAM_FEED",
    order: 5,
    content: {
      url: "https://instagram.com/raaghas.official",
      headline: "Follow Our Story",
      handleText: "@raaghas.official"
    }
  }
];

// ─── Data Fetching ────────────────────────────────────────────────────────────

async function getHomePageData(): Promise<any> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cms/pages/home`, {
      next: { revalidate: 60 }, // ISR: Cache for 60 seconds
    });
    if (!res.ok) throw new Error("API unavailable");
    return await res.json();
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
  const sections = page?.sections && page.sections.length > 0 ? page.sections : FALLBACK_SECTIONS;

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
