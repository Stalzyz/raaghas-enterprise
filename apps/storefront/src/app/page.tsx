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
    id: "hero", 
    type: "HERO", 
    order: 0, 
    content: {
      variant: "quantum_mosaic",
      videoUrl: "https://v1.uifaces.co/videos/abstract-silk.mp4", // Abstract silk loop
      textureImage: "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=800",
      productPhoto: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?q=80&w=1200",
      marqueeText: "THE AESTHETIC ERA // SPRING 2024 // HANDCRAFTED GRACE //",
      primaryCta: { text: "Explore Collection", link: "/collections/all" }
    } 
  },
  { 
    id: "trust", 
    type: "TRUST_BAR", 
    order: 1, 
    content: {
      items: [
        { icon: "Truck", text: "Global Shipping" },
        { icon: "CheckCircle", text: "Authentic Handloom" },
        { icon: "Clock", text: "24/7 Concierge" },
        { icon: "Shield", text: "Verified Luxury" }
      ]
    } 
  },
  { 
    id: "mosaic", 
    type: "CATEGORIES_MOSAIC", 
    order: 2, 
    content: {
      headline: "The Curations",
      subheadline: "Handpicked selections for every facet of your life.",
      categories: [
        { id: "1", label: "Office Wear", handle: "office-wear", image: "https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=800", size: "large" },
        { id: "2", label: "Daily Luxe", handle: "cotton-wear", image: "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=600", size: "small" },
        { id: "3", label: "Silk Stories", handle: "silk-kalamkari", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600", size: "small" },
        { id: "4", label: "New Drops", handle: "new-arrivals", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800", size: "medium" }
      ]
    } 
  },
  { 
    id: "bestsellers", 
    type: "PRODUCT_GRID", 
    order: 3, 
    content: { 
      title: "The Bestsellers", 
      count: 4, 
      collectionHandle: "office-wear" 
    } 
  },
  { 
    id: "story-offer", 
    type: "STORY_BANNER", 
    order: 4, 
    content: { 
      headline: "The First Handshake",
      subheadline: "Experience Raaghas with 10% off your first order.",
      image: "https://images.unsplash.com/photo-1594235412402-b1ed2efaa873?q=80&w=1200",
      ctaText: "Claim Discount", 
      ctaLink: "/collections/all",
      code: "RAAGHAS10"
    } 
  },
  { 
    id: "social-proof", 
    type: "SOCIAL_PROOF", 
    order: 5, 
    content: {
      headline: "Raaghas in the Wild",
      subtext: "Tag us @raaghas.official to be featured.",
      items: [
        { image: "https://images.unsplash.com/photo-1594235412402-b1ed2efaa873?q=80&w=400", name: "Riya", city: "Bangalore", story: "Best for long office hours!" },
        { image: "https://images.unsplash.com/photo-1589310243389-96a5483213a8?q=80&w=400", name: "Ananya", city: "Mumbai", story: "The fabric is like butter." },
        { image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=400", name: "Priya", city: "Delhi", story: "Royal Wine is stunning." },
        { image: "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=400", name: "Sneha", city: "Hyderabad", story: "Fastest delivery ever." }
      ]
    } 
  },
  { 
    id: "instagram", 
    type: "INSTAGRAM_FEED", 
    order: 6, 
    content: {
      headline: "Visual Diary",
      url: "https://instagram.com/raaghas.official",
      handleText: "@raaghas.official"
    } 
  },
  { id: "newsletter", type: "NEWSLETTER", order: 7, content: {
    headline: "The Inner Circle",
    body: "Subscribe for early access to curated collections and secret events."
  } }
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
