"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, Eye, Smartphone, Tablet, Monitor, 
  ChevronLeft, Redo2, Undo2, Share2, 
  Star, LayoutGrid, ShoppingBag, List, Image as ImageIcon,
  Type, BookOpen, Settings2, CheckCircle2, Palette, Upload, Loader2,
  Sun, Moon, Sparkles, Grid, Layout
} from "lucide-react";
import Link from "next/link";
import { SidebarControls } from "@/components/cms/SidebarControls";
import { StorefrontPreview } from "@/components/cms/StorefrontPreview";
import { MediaUploader } from "@/components/cms/MediaUploader";
import { FooterBuilder } from "@/components/cms/FooterBuilder";

// ─── Types ───────────────────────────────────────────────────────────────────

type SectionType = 
  | "HERO" 
  | "FEATURE_GRID"
  | "FEATURED_COLLECTION"
  | "PRODUCT_GRID"
  | "BANNER"
  | "LOOKBOOK"
  | "TESTIMONIALS"
  | "TEXT_BLOCK"
  | "EDITORIAL"
  | "BRAND_STORY"
  | "CATEGORIES_MOSAIC"
  | "NEWSLETTER"
  | "INSTAGRAM_FEED"
  | "TRUST_BAR"
  | "CATEGORY_STRIP"
  | "AOV_BUNDLES"
  | "STORY_BANNER"
  | "DEAL_BANNER"
  | "SOCIAL_PROOF"
  | "SMART_GRID"
  | "IMAGE_ROW"
  | "PRODUCT_SCROLL"
  | "ANNOUNCEMENT_MARQUEE";

interface Section {
  id: string;
  type: SectionType;
  order: number;
  content: Record<string, any>;
  style: Record<string, any>;
  settings: Record<string, any>;
  hidden?: boolean;
}

interface ThemeSettings {
  storeName: string;
  logoLight: string | null;
  logoDark: string | null;
  faviconLight: string | null;
  faviconDark: string | null;
  defaultThemeMode: string;
  fontHeading: string;
  fontBody: string;
  buttonRadius: string;
  
  // Navigation & Layout Defaults
  headerLayout?: "standard" | "minimal" | "centered";
  headerCollections?: string[];
  announcementBar?: string;
  footerText?: string;
  footerTagline?: string;
  showSocialsInFooter?: boolean;
  customFooterHtml?: string;
  customGlobalCss?: string;

  // Light Tokens
  light_primaryColor: string;
  light_bg: string;
  light_surface: string;
  light_textPrimary: string;
  light_textSecondary: string;
  light_border: string;
  light_glassBg: string;
  light_glassBorder: string;
  // Dark Tokens
  dark_primaryColor: string;
  dark_bg: string;
  dark_surface: string;
  dark_textPrimary: string;
  dark_textSecondary: string;
  dark_border: string;
  dark_glassBg: string;
  dark_glassBorder: string;
  footerConfig?: any;
  popupConfig?: {
    enabled: boolean;
    type: "newsletter" | "promotion" | "announcement";
    trigger: "immediate" | "scroll" | "exit";
    delay?: number;
    scrollThreshold?: number;
    image?: string;
    headline: string;
    subheadline: string;
    ctaText?: string;
    ctaLink?: string;
    discountCode?: string;
  };
}

const SECTION_PALETTE: { type: SectionType; label: string; icon: React.ReactNode; description: string; presets?: { id: string, name: string }[] }[] = [
  { 
    type: "HERO",               
    label: "Hero Banner",         
    icon: <ImageIcon size={16} />,   
    description: "Full-screen campaign with headline & CTAs",
    presets: [
      { id: "hero-minimal", name: "Classic Minimalist" },
      { id: "hero-campaign", name: "Classic Campaign" },
      { id: "hero-quantum", name: "Quantum Mosaic (Dynamic)" },
      { id: "hero-holographic", name: "Holographic Layer (3D)" },
      { id: "hero-infinite", name: "Infinite Canvas (Parallax)" },
      { id: "hero-aesthetic", name: "Aesthetic (Floating Fabrics)" },
      { id: "hero-office-luxury", name: "Office Luxury (Wine & Ivory)" }
    ]
  },
  { 
    type: "TRUST_BAR",          
    label: "Trust Bar / USP Strip", 
    icon: <Star size={16} />,        
    description: "Above-the-fold icon strip for shipping/returns",
    presets: [
      { id: "trust-bar-standard", name: "Standard Trust" }
    ]
  },
  { type: "CATEGORY_STRIP",     label: "Category Scroll",     icon: <LayoutGrid size={16} />,  description: "AJIO-style horizontal scroll categories" },
  { 
    type: "AOV_BUNDLES",        
    label: "AOV Bundle Section",  
    icon: <ShoppingBag size={16} />, 
    description: "Push higher AOV with combo sets",
    content: {
      headline: "The Complete Ritual Sets",
      description: "Carefully curated bundles for the modern woman.",
      bundles: [
        { title: "Morning Grace Set", price: "4,499", discount: "15% Off", productHandle: "" },
        { title: "Midnight Silk Set", price: "6,299", discount: "20% Off", productHandle: "" }
      ]
    }
  },
  { type: "DEAL_BANNER",        label: "Flash Deal Banner",   icon: <List size={16} />,        description: "High urgency limited time offer strip" },
  { 
    type: "SOCIAL_PROOF",       
    label: "UGC Social Proof",    
    icon: <ImageIcon size={16} />,   
    description: "Grid of real customer styling photos",
    content: {
      headline: "Styled by Real Women",
      subtext: "Join 10,000+ women who choose Raaghas for their daily comfort.",
      handleText: "@raaghas.official",
      items: [
        { name: "Ananya M.", city: "Mumbai", comment: "The drape is absolutely divine." },
        { name: "Priya S.", city: "Bangalore", comment: "Most comfortable saree I own." }
      ]
    }
  },
  { type: "STORY_BANNER",       label: "Aesthetic Banner",    icon: <ImageIcon size={16} />,   description: "Emotional brand storytelling with text" },
  { 
    type: "SMART_GRID",         
    label: "Smart Product Grid",  
    icon: <ShoppingBag size={16} />, 
    description: "Personalized or tracking specific products",
    content: {
      title: "Recommendations for You",
      source: "collection",
      collectionHandle: "new-arrivals",
      limit: 4
    }
  },
  { type: "FEATURED_COLLECTION", label: "Featured Collection", icon: <Grid size={16} />, description: "Showcase a specific collection" },
  { type: "CUSTOM_HTML",        label: "Custom HTML",         icon: <Layout size={16} />,      description: "Advanced custom embed" },
  { 
    type: "LOGO_CLOUD", 
    label: "Logo / Icon Cloud", 
    icon: <ImageIcon size={16} />, 
    description: "Horizontal scrolling logo or icon band",
    presets: [{ id: "logo-cloud-standard", name: "Standard Brand Logos" }]
  },
  { 
    type: "IMAGE_SCROLL", 
    label: "Horizontal Image Scroll", 
    icon: <LayoutGrid size={16} />, 
    description: "Rounded or square scrolling image gallery",
    presets: [{ id: "image-scroll-round", name: "Rounded Portraits" }, { id: "image-scroll-square", name: "Square Products" }]
  },
  { type: "CATEGORIES_MOSAIC",  label: "Categories Mosaic",   icon: <LayoutGrid size={16} />,  description: "Dynamic asymmetric category grid" },
  { type: "BRAND_STORY",        label: "Brand Story",         icon: <Type size={16} />,        description: "Founding story with paired illustration" },
  { type: "FEATURE_GRID",       label: "Brand Features",      icon: <Star size={16} />,        description: "USP list with minimal line icons" },
  { 
    type: "PRODUCT_GRID",       
    label: "Product Grid",        
    icon: <ShoppingBag size={16} />, 
    description: "Curated product showcase grid",
    content: {
      title: "Curated for You",
      source: "manual",
      productHandles: [""]
    }
  },
  { type: "BANNER",             label: "Full-Width Banner",   icon: <ImageIcon size={16} />,   description: "Widescreen image with optional overlay text" },
  { type: "IMAGE_ROW",          label: "Icon / Image Row",    icon: <ImageIcon size={16} />,   description: "Horizontal strip of icons or logos" },
  { type: "LOOKBOOK",           label: "Shoppable Lookbook",  icon: <BookOpen size={16} />,    description: "Campaign image with tagged product hotspots" },
  { type: "INSTAGRAM_FEED",     label: "Instagram Grid",      icon: <ImageIcon size={16} />,   description: "5-column grid of lifestyle images linking to social" },
  { type: "NEWSLETTER",         label: "Newsletter CTA",      icon: <List size={16} />,        description: "Email capture marketing box" },
  { type: "TESTIMONIALS",       label: "Testimonials",        icon: <Star size={16} />,        description: "Customer quotes and ratings carousel" },
  { type: "TEXT_BLOCK",         label: "Rich Text Block",     icon: <Type size={16} />,        description: "Editorial text with optional media" },
  { type: "PRODUCT_SCROLL",      label: "Horizontal Product Scroll", icon: <ShoppingBag size={16} />, description: "Swipeable horizontal product row" },
  { type: "ANNOUNCEMENT_MARQUEE", label: "Announcement Marquee",    icon: <LayoutGrid size={16} />, description: "Infinite scrolling announcement banner" },
  { 
    type: "EDITORIAL",          
    label: "Editorial Story",     
    icon: <List size={16} />,        
    description: "Long-form visual story with CTA",
    content: {
      title: "Woven Narratives",
      description: "Exploring the luxury of handloom in modern silhouettes.",
      subheadline: "The Artisanal Touch",
      subtext: "Every piece takes 14 days of dedicated handwork.",
      linkText: "Read the Journal"
    }
  }
];

const DEFAULT_CONTENT: Record<SectionType, any> = {
  HERO: { 
    content: { announcement: "New Collection 2024", headline: "Feel Comfortable.\nLook Effortless.", subheadline: "Premium cotton wear designed for everyday elegance.", primaryCta: { text: "Shop Now", link: "/collections/all" }, secondaryCta: { text: "View Lookbook", link: "/lookbooks" }, backgroundImage: "" }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  FEATURE_GRID: { 
    content: { headline: "The Raaghas Promise", features: [{ icon: "Gem", title: "Premium Fabrics", description: "Only the finest Dupion silk & pure cotton." }, { icon: "HandMetal", title: "Hand-Crafted", description: "Every stitch placed by artisanal hands." }, { icon: "Globe", title: "Worldwide Shipping", description: "Delivered to your door, anywhere." }, { icon: "RotateCcw", title: "Easy Returns", description: "30-day no-questions-asked returns." }] }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  PRODUCT_GRID: { 
    content: { title: "Curated for You", source: "manual", collectionHandle: "new-arrivals", limit: 8, productHandles: [] }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  BANNER: { 
    content: { image: "", headline: "", subtext: "", cta: { text: "Explore", link: "/collections/all" }, overlay: true }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  IMAGE_ROW: {
    content: { 
      headline: "As Featured In", 
      imageShape: "round", 
      images: [
        { url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200", link: "" },
        { url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200", link: "" },
        { url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200", link: "" },
        { url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200", link: "" }
      ] 
    },
    style: { textAlign: "center", backgroundColor: "transparent", textColor: "var(--text-primary)", paddingTop: 40, paddingBottom: 40 },
    settings: { animation: "fade", speed: 0.5 }
  },
  LOOKBOOK: { 
    content: { title: "Autumn Silk Series", description: "A study in drape and traditional Kalamkari prints.", image: "", hotspots: [] }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  TESTIMONIALS: { 
    content: { headline: "Loved by Our Customers", testimonials: [{ name: "Priya V.", quote: "This is a masterpiece.", rating: 5 }] }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  TEXT_BLOCK: { 
    content: { headline: "", body: "", alignment: "center", image: "" }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  EDITORIAL: { 
    content: { title: "Woven Narratives", description: "Exploring the luxury of handloom in modern silhouettes.", subheadline: "The Artisanal Touch", subtext: "Every piece takes 14 days of dedicated handwork.", linkText: "Read the Journal", link: "/journal", mainImage: "", sideImage: "" }, 
    style: { textAlign: "left", backgroundColor: "#FDFBF7", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  BRAND_STORY: { 
    content: { headline: "Founded by Two Sisters", body: "Raaghas began with a shared passion.", signatureText: "— Sneha & Priya", image: "" }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  CATEGORIES_MOSAIC: { 
    content: { headline: "Curated Collections", subheadline: "Explore our signature units" }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  NEWSLETTER: { 
    content: { headline: "Join the Raaghas Family", body: "Subscribe to our newsletter." }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  INSTAGRAM_FEED: { 
    content: { headline: "Follow Our Journey", handleText: "@raaghas.official", accessToken: "", postCount: 6 }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  TRUST_BAR: { 
    content: { items: [{ icon: "Truck", text: "Free Shipping Across India" }, { icon: "RefreshCcw", text: "Easy Exchange" }] }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  CATEGORY_STRIP: { 
    content: { categories: [] }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  AOV_BUNDLES: { 
    content: { headline: "The Complete Ritual Sets", description: "Carefully curated bundles for the modern woman.", bundles: [{ title: "Morning Grace Set", price: "4,499", discount: "15% Off", productHandle: "", image: "" }, { title: "Midnight Silk Set", price: "6,299", discount: "20% Off", productHandle: "", image: "" }] }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  STORY_BANNER: { 
    content: { headline: "Not Just Clothing. A Daily Comfort Ritual.", subtext: "Crafted for confidence." }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  DEAL_BANNER: { 
    content: { headline: "Everyday Essentials – Starting ₹599", subtext: "Only for Today", ctaText: "Claim Offer", ctaLink: "/collections/sale", discountCode: "SAVE20", endsText: "Ends Tonight" }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  SOCIAL_PROOF: { 
    content: { headline: "Styled by Real Women", subtext: "Join 10,000+ women who choose Raaghas for their daily comfort.", handleText: "@raaghas.official", items: [{ name: "Ananya M.", city: "Mumbai", comment: "The drape is absolutely divine.", image: "" }, { name: "Priya S.", city: "Bangalore", comment: "Most comfortable saree I own.", image: "" }] }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  SMART_GRID: { 
    content: { title: "Recommendations for You", source: "collection", collectionHandle: "new-arrivals", limit: 4 }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  FEATURED_COLLECTION: { 
    content: { title: "Featured", description: "Curated selection.", collections: [] }, 
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 }, 
    settings: { animation: "fade", speed: "medium" } 
  },
  CUSTOM_HTML: {
    content: { html: "<div class=\"p-8 text-center\">\n  <h2>Your Custom HTML</h2>\n</div>" },
    style: { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 0 },
    settings: { animation: "none", speed: "medium" }
  },
  LOGO_CLOUD: {
    content: { headline: "Featured In", logos: [{ image: "", alt: "Brand 1" }, { image: "", alt: "Brand 2" }] },
    style: { textAlign: "center", backgroundColor: "#FDFBF7", padding: 40 },
    settings: { grayscale: true, scrollSpeed: "medium" }
  },
  IMAGE_SCROLL: {
    content: { headline: "Shop by Look", images: [{ image: "", link: "", title: "Look 1" }, { image: "", link: "", title: "Look 2" }] },
    style: { backgroundColor: "#ffffff", padding: 60 },
    settings: { shape: "round", hideScrollbar: true }
  },
  PRODUCT_SCROLL: {
    content: { title: "New Arrivals", subtitle: "Just Dropped", collectionHandle: "new-arrivals", limit: 12 },
    style: { textAlign: "left", backgroundColor: "transparent", padding: 60 },
    settings: { animation: "fade", speed: "medium" }
  },
  ANNOUNCEMENT_MARQUEE: {
    content: { items: ["✨ Share Your Favourite Styles", "Earn Reward Credits", "Redeem on Every Purchase", "Invite Friends", "Unlock Exclusive Member Rewards"], speed: 30 },
    style: { backgroundColor: "transparent", textColor: "inherit" },
    settings: { animation: "none" }
  }
};

const SECTION_PRESETS: Record<string, any> = {
  "hero-minimal": {
    content: {
      headline: "Elegance in Every Stitch",
      subheadline: "Luxury Ethnic Wear for the Modern Woman",
      primaryCta: { text: "Shop Collection", link: "/collections/minimal" },
    },
    style: { textAlign: "left", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 80 },
    settings: { animation: "fade", speed: "slow" }
  },
  "hero-campaign": {
    headline: "The Autumn\nSilk Series",
    subheadline: "A celebration of traditional craftsmanship.",
    primaryCta: { text: "Explore Campaign", link: "/collections/silk" },
    style: { textAlign: "center", backgroundColor: "#701A31", textColor: "#ffffff" }
  },
  "trust-bar-standard": {
    items: [
      { icon: "Truck", text: "Free Global Shipping" },
      { icon: "Shield", text: "Secure Payments" },
      { icon: "RotateCcw", text: "30-Day Returns" }
    ]
  },
  "hero-quantum": {
    variant: "quantum_mosaic",
    marqueeText: "NEW ERA // SPRING COLLECTION //",
    ctaText: "Shop Now",
    ctaLink: "/collections/new-arrivals",
    videoUrl: "https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4",
    textureImage: "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=800&auto=format&fit=crop",
    productPhoto: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop",
    style: { backgroundColor: "#ffffff", textColor: "#000000" }
  },
  "hero-holographic": {
    variant: "holographic_layer",
    headline: "COLLECTION",
    subheadline: "Holographic Spring / 2026",
    text: "Experience the convergence of digital art and physical textiles in our most avant-garde presentation yet.",
    images: [
      "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=800&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop"
    ],
    ctaText: "Explore",
    ctaLink: "/collections/all",
    style: { backgroundColor: "#FAFAFA", textColor: "#1A1A1A" }
  },
  "hero-infinite": {
    variant: "infinite_canvas",
    headline: "THE ART OF DRESSING.",
    subheadline: "A new perspective on luxury",
    cutoutImage: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop",
    ctaText: "Discover",
    ctaLink: "/collections",
    style: { backgroundColor: "#FDFBF7", textColor: "#111111", bgColorEnd: "#1A362D" }
  },
  "hero-aesthetic": {
    variant: "aesthetic",
    headline: "The Art of\\nPure Cotton.",
    subheadline: "Crafted for confidence and comfort.",
    fabrics: [
      { x: 20, y: 30, opacity: 0.1, speed: 0.2, scale: 1 },
      { x: 80, y: 70, opacity: 0.08, speed: 0.3, scale: 1.2 }
    ],
    uiElements: [
      { x: 85, y: 15, size: 1, opacity: 0.6, speed: 0.4, iconName: "LuxuryHanger", shape: "rounded" },
      { x: 15, y: 85, size: 0.8, opacity: 0.6, speed: 0.2, text: "SIGNATURE", subtext: "COTTON", shape: "circle" }
    ],
    style: { textAlign: "left", backgroundColor: "#FDFBF7", textColor: "#1A1A1A" }
  },
  "hero-office-luxury": {
    variant: "aesthetic",
    headline: "Office Elegance.\\nKalamkari Art.",
    subheadline: "Royal Wine & Ivory Collection. 10% OFF for new members.",
    fabrics: [
      { x: 15, y: 25, opacity: 0.12, speed: 0.2, scale: 1.1 },
      { x: 85, y: 75, opacity: 0.1, speed: 0.3, scale: 1.3 }
    ],
    uiElements: [
      { x: 80, y: 20, size: 1.1, opacity: 0.7, speed: 0.4, text: "NEW", subtext: "ARRIVAL", shape: "rounded", iconName: "KalamkariFlower" },
      { x: 20, y: 80, size: 0.9, opacity: 0.6, speed: 0.2, text: "OFFICE", subtext: "WEAR", shape: "circle", iconName: "LuxuryHanger" }
    ],
    style: { textAlign: "left", backgroundColor: "#FDFBF7", textColor: "#1A1A1A" }
  }
};

const DEFAULT_POPUP_CONFIG = {
  enabled: false,
  type: "newsletter" as const,
  trigger: "exit" as const,
  delay: 5,
  scrollThreshold: 30,
  image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800",
  headline: "Wait! Before you go...",
  subheadline: "Unlock an exclusive ₹150 OFF your first purchase. No minimum order required.",
  ctaText: "Claim My ₹150 OFF",
  ctaLink: "",
  discountCode: "WELCOME150"
};

export default function ThemeBuilder() {
  const defaultStyle = { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 };
  const defaultSettings = { animation: "fade", speed: 0.5, delay: 0 };
  const [sections, setSections] = useState<Section[]>([
    { id: "hero", type: "HERO", order: 0, content: DEFAULT_CONTENT["HERO"].content, style: DEFAULT_CONTENT["HERO"].style, settings: DEFAULT_CONTENT["HERO"].settings },
    { id: "categories", type: "CATEGORY_STRIP", order: 1, content: DEFAULT_CONTENT["CATEGORY_STRIP"].content, style: defaultStyle, settings: defaultSettings },
    { id: "best-sellers", type: "PRODUCT_GRID", order: 2, content: { ...DEFAULT_CONTENT["PRODUCT_GRID"].content, title: "Our Best Sellers", collectionHandle: "best-sellers" }, style: defaultStyle, settings: defaultSettings },
    { id: "new-arrivals", type: "PRODUCT_GRID", order: 3, content: { ...DEFAULT_CONTENT["PRODUCT_GRID"].content, title: "Fresh Drops", collectionHandle: "new-arrivals" }, style: defaultStyle, settings: defaultSettings },
    { id: "bundles", type: "AOV_BUNDLES", order: 4, content: DEFAULT_CONTENT["AOV_BUNDLES"].content, style: defaultStyle, settings: defaultSettings },
    { id: "featured", type: "FEATURED_COLLECTION", order: 5, content: DEFAULT_CONTENT["FEATURED_COLLECTION"].content, style: defaultStyle, settings: defaultSettings },
    { id: "social-proof", type: "SOCIAL_PROOF", order: 6, content: DEFAULT_CONTENT["SOCIAL_PROOF"].content, style: defaultStyle, settings: defaultSettings },
    { id: "testimonials", type: "TESTIMONIALS", order: 7, content: DEFAULT_CONTENT["TESTIMONIALS"].content, style: defaultStyle, settings: defaultSettings },
    { id: "value-strip", type: "TRUST_BAR", order: 8, content: DEFAULT_CONTENT["TRUST_BAR"].content, style: defaultStyle, settings: defaultSettings },
    { id: "recommended", type: "SMART_GRID", order: 9, content: { ...DEFAULT_CONTENT["SMART_GRID"].content, title: "Picked For You" }, style: defaultStyle, settings: defaultSettings },
    { id: "offer", type: "DEAL_BANNER", order: 10, content: DEFAULT_CONTENT["DEAL_BANNER"].content, style: defaultStyle, settings: defaultSettings },
    { id: "lead-capture", type: "NEWSLETTER", order: 11, content: DEFAULT_CONTENT["NEWSLETTER"].content, style: defaultStyle, settings: defaultSettings },
  ]);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [previewThemeMode, setPreviewThemeMode] = useState<"LIGHT" | "DARK">("LIGHT");
  const [saved, setSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [showThemeEditor, setShowThemeEditor] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "media" | "pages" | "navigation" | "theme">("sections");
  const [activeThemeTab, setActiveThemeTab] = useState<"general" | "layout" | "footer" | "light" | "dark" | "popup">("general");
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<ThemeSettings>({
    storeName: "Raaghas",
    logoLight: null,
    logoDark: null,
    faviconLight: null,
    faviconDark: null,
    defaultThemeMode: "LIGHT",
    fontHeading: "serif",
    fontBody: "sans",
    buttonRadius: "0.5rem",
    headerCollections: [],
    // Light Defaults
    light_primaryColor: "#701A31",
    light_bg: "#FDFBF7",
    light_surface: "#FFFFFF",
    light_textPrimary: "#1A1A1A",
    light_textSecondary: "#666666",
    light_border: "#EEEEEE",
    light_glassBg: "rgba(255, 255, 255, 0.7)",
    light_glassBorder: "rgba(255, 255, 255, 0.3)",
    // Dark Defaults
    dark_primaryColor: "#8C1C2A",
    dark_bg: "#0F0F10",
    dark_surface: "#1A1A1C",
    dark_textPrimary: "#F5F5F5",
    dark_textSecondary: "#B0B0B0",
    dark_border: "#2A2A2C",
    dark_glassBg: "rgba(255, 255, 255, 0.05)",
    dark_glassBorder: "rgba(255, 255, 255, 0.1)",
    popupConfig: {
      enabled: false,
      type: "newsletter",
      trigger: "exit",
      delay: 5,
      scrollThreshold: 30,
      image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800",
      headline: "Wait! Before you go...",
      subheadline: "Unlock an exclusive ₹150 OFF your first purchase. No minimum order required.",
      ctaText: "Claim My ₹150 OFF",
      ctaLink: "",
      discountCode: "WELCOME150"
    }
  });

  const [dbPresets, setDbPresets] = useState<any[]>([]);
  const [dbCollections, setDbCollections] = useState<any[]>([]);

  // Load from API on mount
  useEffect(() => {
    const loadContent = async () => {
      try {
        console.log("CMS: Initializing Load...");
        const [pagesRes, themeRes, collectionsRes] = await Promise.all([
          fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in')}/cms/pages/home`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in')}/cms/theme`),
          fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in')}/products/collections?adminMode=true`)
        ]);

        if (pagesRes.ok) {
          const data = await pagesRes.json();
          console.log("CMS: Page Data Loaded", data);
          if (data && data.sections?.length > 0) {
            setSections(data.sections.map((s: any) => ({
              ...s,
              content: s.content || {},
              style: s.style || {},
              settings: s.settings || {}
            })));
          }
        }

        if (themeRes.ok) {
          const themeData = await themeRes.json();
          console.log("CMS: Theme Data Loaded", themeData);
          if (themeData && themeData.config) {
            setTheme(prev => ({
              ...prev,
              ...themeData.config,
              storeName: themeData.storeName || themeData.config.storeName || prev.storeName,
              footerConfig: themeData.footerConfig || prev.footerConfig,
            }));
          } else if (themeData && themeData.storeName) {
            setTheme(prev => ({ ...prev, storeName: themeData.storeName }));
          }
        }

        if (collectionsRes && collectionsRes.ok) {
          const collections = await collectionsRes.json();
          setDbCollections(collections);
        }
      } catch (err) { 
        console.error("CMS Load Failed:", err); 
      }
    };
    loadContent();

    // Prevent accidental data loss
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, []); // Only load on mount

  const applyDbPreset = async (preset: any) => {
    if (!confirm(`Apply "${preset.name}"? This will overwrite your current homepage layout and global theme.`)) return;
    
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in')}/cms/presets/${preset.id}/apply`, {
        method: 'POST'
      });
      if (res.ok) {
        window.location.reload(); // Reload to fetch the newly applied theme/sections
      } else {
        alert("Failed to apply preset");
      }
    } catch (e) {
      alert("Error applying preset");
    }
  };

  const addSection = (type: SectionType, presetId?: string) => {
    let data: any = null;

    if (presetId?.startsWith('saved-')) {
      const saved = JSON.parse(localStorage.getItem('raaghas_saved_sections') || '[]');
      data = saved.find((s: any) => `saved-${s.id}` === presetId);
    } else {
      data = presetId ? { ...DEFAULT_CONTENT[type], ...SECTION_PRESETS[presetId] } : DEFAULT_CONTENT[type];
    }

    if (!data) data = DEFAULT_CONTENT[type]; // Fallback

    const newSection: Section = {
      id: Math.random().toString(36).substr(2, 9),
      type: data.type || type,
      order: sections.length,
      content: data.content || data, // Fallback for simple presets
      style: data.style || { textAlign: "center", backgroundColor: "#ffffff", textColor: "#2D2926", padding: 60 },
      settings: data.settings || { animation: "fade", speed: "medium" }
    };
    setSections([...sections, newSection]);
    setActiveSectionId(newSection.id);
    setHasUnsavedChanges(true);
  };

  const removeSection = (id: string) => {
    setSections(sections.filter(s => s.id !== id));
    if (activeSectionId === id) setActiveSectionId(null);
    setHasUnsavedChanges(true);
  };

  const moveSection = (id: string, dir: "up" | "down") => {
    const idx = sections.findIndex(s => s.id === id);
    if (dir === "up" && idx === 0) return;
    if (dir === "down" && idx === sections.length - 1) return;
    const newSections = [...sections];
    const target = dir === "up" ? idx - 1 : idx + 1;
    [newSections[idx], newSections[target]] = [newSections[target], newSections[idx]];
    setSections(newSections.map((s, i) => ({ ...s, order: i })));
    setHasUnsavedChanges(true);
  };

  const updateSection = (id: string, content: any, style?: any, settings?: any, hidden?: boolean) => {
    setSections(sections.map(s => {
      if (s.id !== id) return s;
      return { 
        ...s, 
        content: content ?? s.content,
        style: style !== undefined ? { ...(s.style || {}), ...style } : s.style,
        settings: settings !== undefined ? { ...(s.settings || {}), ...settings } : s.settings,
        hidden: hidden !== undefined ? hidden : s.hidden
      };
    }));
    setHasUnsavedChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('admin_token='))
        ?.split('=').slice(1).join('=');

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // ATOMIC SAVE: One request to update the entire store state
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in')}/cms/sync`, {
        method: "POST",
        headers,
        body: JSON.stringify({ 
          page: { title: "Home", handle: "home", sections },
          theme: { 
            storeName: theme.storeName, 
            config: theme,
            footerConfig: theme.footerConfig
          }
        }),
        credentials: 'include'
      });

      if (response.ok) {
        setSaved(true);
        setHasUnsavedChanges(false);
        setTimeout(() => setSaved(false), 2500);
      } else {
        const errorText = await response.text();
        console.error("Atomic Save failed:", errorText);
        alert(`Save failed: ${response.status}\n${errorText}`);
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 overflow-hidden z-[60]">
      {/* ─── Top Bar ────────────────────────────────────────────────────────── */}
      <div className="h-16 bg-rose-50 border-b border-rose-100 flex items-center justify-between px-6 z-[90] shadow-sm shrink-0">
        <div className="flex items-center gap-4">
          <Link 
            href="/online-store/themes"
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-charcoal transition-colors flex items-center gap-2"
          >
            <ChevronLeft size={18} />
            <span className="text-[10px] font-bold uppercase tracking-widest hidden md:inline">Back</span>
          </Link>
          <div className="w-px h-6 bg-gray-200" />
          <div className="bg-wine p-2 rounded-lg text-ivory shadow-lg shadow-wine/20">
             <LayoutGrid size={20} />
          </div>
          <div>
            <h1 className="text-sm font-bold text-charcoal uppercase tracking-[0.2em] leading-none mb-1">Theme Builder</h1>
            <div className="flex items-center gap-2 mt-0.5">
               <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
               <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Storefront Live Preview</p>
            </div>
          </div>
        </div>

        {/* Device Toggles */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
           <button 
              onClick={() => setDeviceMode("desktop")}
              className={`p-2 rounded-lg transition-all ${deviceMode === "desktop" ? "bg-white text-wine shadow-sm" : "text-gray-400 hover:text-charcoal"}`}
           >
              <Monitor size={18} />
           </button>
           <button 
              onClick={() => setDeviceMode("tablet")}
              className={`p-2 rounded-lg transition-all ${deviceMode === "tablet" ? "bg-white text-wine shadow-sm" : "text-gray-400 hover:text-charcoal"}`}
           >
              <Tablet size={18} />
           </button>
           <button 
              onClick={() => setDeviceMode("mobile")}
              className={`p-2 rounded-lg transition-all ${deviceMode === "mobile" ? "bg-white text-wine shadow-sm" : "text-gray-400 hover:text-charcoal"}`}
           >
              <Smartphone size={18} />
           </button>
        </div>

        {/* Theme Preview Toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl border border-gray-200 shadow-inner">
           <button 
              onClick={() => setPreviewThemeMode("LIGHT")}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-2 ${previewThemeMode === "LIGHT" ? "bg-white text-wine shadow-sm" : "text-gray-400 hover:text-charcoal"}`}
           >
              <Sun size={14} /> Light
           </button>
           <button 
              onClick={() => setPreviewThemeMode("DARK")}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all flex items-center gap-2 ${previewThemeMode === "DARK" ? "bg-white text-wine shadow-sm" : "text-gray-400 hover:text-charcoal"}`}
           >
              <Moon size={14} /> Dark
           </button>
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-2">
           <button 
             onClick={() => { setActiveTab("theme"); setShowThemeEditor(true); }}
             className={`flex items-center gap-2 px-4 py-2 rounded-lg border text-[10px] font-bold uppercase tracking-widest transition-all ${showThemeEditor ? 'bg-wine/5 border-wine/20 text-wine' : 'bg-white border-gray-100 text-charcoal hover:bg-gray-50'}`}
           >
              <Palette size={14} /> Theme Settings
           </button>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border-r border-gray-100 pr-3 mr-1">
             <button className="p-2 text-gray-300 hover:text-charcoal"><Undo2 size={18} /></button>
             <button className="p-2 text-gray-300 hover:text-charcoal"><Redo2 size={18} /></button>
          </div>
          {hasUnsavedChanges && !isSaving && <span className="text-[10px] font-bold text-wine uppercase tracking-widest animate-pulse mr-2">Unsaved Draft</span>}
          <button 
            onClick={handleSave} 
            disabled={isSaving}
            className={`px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all shadow-lg ${saved ? "bg-green-500 text-white" : isSaving ? "bg-gray-400 cursor-not-allowed" : "bg-charcoal text-white hover:bg-wine active:scale-95"}`}
          >
            {saved ? (
              <span className="flex items-center gap-2"><CheckCircle2 size={16} /> Live</span>
            ) : isSaving ? (
              <span className="flex items-center gap-2"><Loader2 className="animate-spin" size={16} /> Saving...</span>
            ) : (
              "Publish Changes"
            )}
          </button>
        </div>
      </div>

      {/* ─── Editor Layout ──────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Control Sidebar */}
        <SidebarControls 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          sections={sections}
          activeSectionId={activeSectionId}
          onSelectSection={setActiveSectionId}
          onUpdateSection={updateSection}
          onMoveSection={moveSection}
          onRemoveSection={removeSection}
          onAddSection={addSection}
          palette={SECTION_PALETTE}
        />

        {/* Center Canvas / Preview */}
        <StorefrontPreview 
          sections={sections}
          deviceMode={deviceMode}
          theme={theme}
          previewThemeMode={previewThemeMode}
        />
      </div>

      {/* Global Theme Drawer */}
      <AnimatePresence>
        {(showThemeEditor || activeTab === "theme") && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => { setShowThemeEditor(false); setActiveTab("sections"); }}
              className="fixed inset-0 bg-charcoal/40 backdrop-blur-sm z-[70]"
            />
            <motion.div 
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed top-16 right-0 bottom-0 w-[400px] bg-white z-[80] shadow-2xl flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                <div>
                  <h3 className="text-sm font-bold text-charcoal uppercase tracking-[0.2em]">Global Theme</h3>
                  <p className="text-[10px] text-gray-400 mt-1 uppercase font-medium tracking-tight">Applied to all pages</p>
                </div>
                <button 
                  onClick={() => { setShowThemeEditor(false); setActiveTab("sections"); }}
                  className="p-2 hover:bg-white rounded-lg transition-colors text-charcoal/60"
                >
                  <ChevronLeft className="rotate-180" size={18} />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 bg-white">
                {["general", "layout", "footer", "light", "dark", "popup"].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveThemeTab(tab as any)}
                    className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest transition-all border-b-2 ${
                      activeThemeTab === tab ? "border-wine text-wine" : "border-transparent text-gray-400 hover:text-charcoal"
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-10">
                {activeThemeTab === "layout" && (
                  <div className="space-y-10">
                    <div className="space-y-6">
                      <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2 mb-4">
                        <LayoutGrid size={14} className="text-wine" /> Global Header
                      </h4>
                      <ThemeField 
                        label="Announcement Bar Text" 
                        value={theme.announcementBar || ""} 
                        onChange={(v) => { setTheme({ ...theme, announcementBar: v }); setHasUnsavedChanges(true); }} 
                      />
                      <SelectField 
                        label="Header Navigation Layout"
                        options={["standard", "minimal", "centered"]}
                        value={theme.headerLayout || "standard"}
                        onChange={(v: any) => { setTheme({ ...theme, headerLayout: v }); setHasUnsavedChanges(true); }}
                      />
                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">Header Collections (Order Matters)</label>
                        <div className="bg-gray-50 border border-gray-100 rounded-xl p-3 flex flex-wrap items-center gap-2">
                          {(theme.headerCollections || []).map((handle: string) => {
                            const c = dbCollections.find((c: any) => c.handle === handle);
                            return (
                              <div key={handle} className="bg-white border border-gray-200 rounded-md px-3 py-1 flex items-center gap-2 shadow-sm">
                                <span className="text-[11px] font-bold text-charcoal">{c?.title || handle}</span>
                                <button onClick={() => {
                                  const newCols = theme.headerCollections?.filter((h: string) => h !== handle);
                                  setTheme({ ...theme, headerCollections: newCols });
                                  setHasUnsavedChanges(true);
                                }} className="text-gray-400 hover:text-red-500">×</button>
                              </div>
                            );
                          })}
                          <select 
                            onChange={(e) => {
                              if (e.target.value) {
                                const newCols = [...(theme.headerCollections || []), e.target.value];
                                setTheme({ ...theme, headerCollections: newCols });
                                setHasUnsavedChanges(true);
                                e.target.value = "";
                              }
                            }}
                            className="bg-transparent text-[11px] font-bold text-wine outline-none cursor-pointer border-none appearance-none hover:underline"
                          >
                            <option value="">+ Add Collection</option>
                            {dbCollections.filter((c: any) => !(theme.headerCollections || []).includes(c.handle)).map((c: any) => (
                              <option key={c.id} value={c.handle}>{c.title}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                    

                    <div className="pt-6 border-t border-gray-100 space-y-6">
                      <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                        <List size={14} className="text-wine" /> Global Footer
                      </h4>
                      <ThemeField 
                        label="Footer Copyright Text" 
                        value={theme.footerText || ""} 
                        onChange={(v) => { setTheme({ ...theme, footerText: v }); setHasUnsavedChanges(true); }} 
                      />
                      <ThemeField 
                        label="Footer Tagline" 
                        value={theme.footerTagline || ""} 
                        onChange={(v) => { setTheme({ ...theme, footerTagline: v }); setHasUnsavedChanges(true); }} 
                      />
                      <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
                         <span className="text-[10px] uppercase font-bold text-gray-400">Show Social Icons</span>
                         <button 
                          onClick={() => { setTheme({ ...theme, showSocialsInFooter: !theme.showSocialsInFooter }); setHasUnsavedChanges(true); }}
                          className={`w-10 h-5 rounded-full transition-all relative ${theme.showSocialsInFooter !== false ? "bg-wine" : "bg-gray-200"}`}
                         >
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${theme.showSocialsInFooter !== false ? "left-6" : "left-1"}`} />
                         </button>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Custom HTML Footer</label>
                        <textarea 
                          rows={4}
                          value={theme.customFooterHtml || ""} 
                          onChange={(e) => { setTheme({ ...theme, customFooterHtml: e.target.value }); setHasUnsavedChanges(true); }}
                          className="w-full bg-charcoal text-green-400 font-mono text-[10px] border border-gray-800 rounded-lg px-4 py-3 focus:border-wine outline-none transition-all resize-y shadow-inner"
                          placeholder="<div class='footer-custom'>...</div>"
                        />
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-gray-400">Global Custom CSS</label>
                        <textarea 
                          rows={4}
                          value={theme.customGlobalCss || ""} 
                          onChange={(e) => { setTheme({ ...theme, customGlobalCss: e.target.value }); setHasUnsavedChanges(true); }}
                          className="w-full bg-charcoal text-blue-400 font-mono text-[10px] border border-gray-800 rounded-lg px-4 py-3 focus:border-wine outline-none transition-all resize-y shadow-inner"
                          placeholder=".custom-class { color: red; }"
                        />
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-100 space-y-4">
                      <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                         <Sparkles size={14} className="text-wine" /> Social Media Links
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                         <ThemeField label="Instagram URL" value={theme.instagramUrl || ""} onChange={(v) => { setTheme({ ...theme, instagramUrl: v }); setHasUnsavedChanges(true); }} />
                         <ThemeField label="Facebook URL" value={theme.facebookUrl || ""} onChange={(v) => { setTheme({ ...theme, facebookUrl: v }); setHasUnsavedChanges(true); }} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                         <ThemeField label="Pinterest URL" value={theme.pinterestUrl || ""} onChange={(v) => { setTheme({ ...theme, pinterestUrl: v }); setHasUnsavedChanges(true); }} />
                         <ThemeField label="Twitter URL" value={theme.twitterUrl || ""} onChange={(v) => { setTheme({ ...theme, twitterUrl: v }); setHasUnsavedChanges(true); }} />
                      </div>
                    </div>
                  </div>
                )}
                {activeThemeTab === "general" && (
                  <>
                    <ThemeField 
                      label="Store Name" 
                      value={theme.storeName} 
                      onChange={(v) => { setTheme({ ...theme, storeName: v }); setHasUnsavedChanges(true); }} 
                    />

                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                        <Palette size={14} className="text-wine" /> Theme Tokens
                      </h4>
                      <div className="grid grid-cols-3 gap-2">
                         {[
                           { 
                             id: "luxury", 
                             label: "Luxury", 
                             config: { fontHeading: "serif", fontBody: "sans", buttonRadius: "0rem", light_primaryColor: "#701A31", light_bg: "#Fdfdfd", dark_primaryColor: "#E2C08A", dark_bg: "#111111" }
                           },
                           { 
                             id: "minimal", 
                             label: "Minimal", 
                             config: { fontHeading: "sans", fontBody: "sans", buttonRadius: "2rem", light_primaryColor: "#111111", light_bg: "#ffffff", dark_primaryColor: "#ffffff", dark_bg: "#000000" }
                           },
                           { 
                             id: "ethnic", 
                             label: "Ethnic", 
                             config: { fontHeading: "serif", fontBody: "serif", buttonRadius: "0.25rem", light_primaryColor: "#D35400", light_bg: "#FFF5E1", dark_primaryColor: "#E67E22", dark_bg: "#2C1709" }
                           }
                         ].map(preset => (
                           <button
                             key={preset.id}
                             onClick={() => {
                               setTheme({ ...theme, ...preset.config });
                               setHasUnsavedChanges(true);
                             }}
                             className="p-3 border border-gray-100 rounded-xl bg-gray-50 hover:bg-white hover:border-wine hover:shadow-md transition-all text-center group"
                           >
                              <div className="w-8 h-8 rounded-full mx-auto mb-2 shadow-inner" style={{ background: `linear-gradient(135deg, ${preset.config.light_primaryColor}, ${preset.config.light_bg})` }} />
                              <span className="text-[9px] font-bold uppercase tracking-widest text-gray-500 group-hover:text-charcoal">{preset.label}</span>
                           </button>
                         ))}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                        <ImageIcon size={14} className="text-wine" /> Branding Assets
                      </h4>
                      <div className="grid grid-cols-2 gap-4">
                        <MediaUploader 
                          label="Logo (Light Mode)" 
                          value={theme.logoLight || ''} 
                          onChange={(v) => { setTheme({ ...theme, logoLight: v }); setHasUnsavedChanges(true); }} 
                        />
                        <MediaUploader 
                          label="Logo (Dark Mode)" 
                          value={theme.logoDark || ''} 
                          onChange={(v) => { setTheme({ ...theme, logoDark: v }); setHasUnsavedChanges(true); }} 
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <MediaUploader 
                          label="Favicon (Light)" 
                          value={theme.faviconLight || ''} 
                          onChange={(v) => { setTheme({ ...theme, faviconLight: v }); setHasUnsavedChanges(true); }} 
                        />
                        <MediaUploader 
                          label="Favicon (Dark)" 
                          value={theme.faviconDark || ''} 
                          onChange={(v) => { setTheme({ ...theme, faviconDark: v }); setHasUnsavedChanges(true); }} 
                        />
                      </div>
                      <SelectField 
                        label="Default Store Appearance"
                        options={["LIGHT", "DARK"]}
                        value={theme.defaultThemeMode}
                        onChange={(v) => { 
                          setTheme({ ...theme, defaultThemeMode: v }); 
                          setPreviewThemeMode(v as any);
                          setHasUnsavedChanges(true); 
                        }}
                      />
                    </div>

                    <div className="space-y-4">
                      <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                         <Type size={14} className="text-wine" /> Typography & Shape
                      </h4>
                      <SelectField 
                        label="Heading Font"
                        options={["serif", "sans", "mono"]}
                        value={theme.fontHeading}
                        onChange={(v) => { setTheme({ ...theme, fontHeading: v }); setHasUnsavedChanges(true); }}
                      />
                      <SelectField 
                        label="Body Font"
                         options={["sans", "serif", "mono"]}
                        value={theme.fontBody}
                        onChange={(v) => { setTheme({ ...theme, fontBody: v }); setHasUnsavedChanges(true); }}
                      />
                      <ThemeField 
                        label="Button Corner Radius (rem)" 
                        value={theme.buttonRadius} 
                        onChange={(v) => { setTheme({ ...theme, buttonRadius: v }); setHasUnsavedChanges(true); }} 
                      />
                    </div>
                  </>
                )}

                {activeThemeTab === "popup" && (
                  <div className="space-y-10">
                    <div className="flex items-center justify-between p-4 bg-rose-50 border border-rose-100 rounded-2xl">
                       <div>
                          <p className="text-[11px] font-bold text-wine uppercase tracking-widest">Promotion Lightbox</p>
                          <p className="text-[9px] text-wine/60 uppercase font-medium mt-0.5">Global Marketing Popup</p>
                       </div>
                       <button 
                        onClick={() => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), enabled: !theme.popupConfig?.enabled } }); setHasUnsavedChanges(true); }}
                        className={`w-12 h-6 rounded-full transition-all relative ${theme.popupConfig?.enabled ? "bg-wine" : "bg-gray-200"}`}
                       >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${theme.popupConfig?.enabled ? "left-7" : "left-1"}`} />
                       </button>
                    </div>

                    <div className="space-y-6">
                       <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                          <Settings2 size={14} className="text-wine" /> Trigger & Type
                       </h4>
                       <SelectField 
                          label="Popup Type"
                          options={["newsletter", "promotion", "announcement"]}
                          value={theme.popupConfig?.type || "newsletter"}
                          onChange={(v: any) => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), type: v } }); setHasUnsavedChanges(true); }}
                       />
                       <SelectField 
                          label="Display Trigger"
                          options={["immediate", "scroll", "exit"]}
                          value={theme.popupConfig?.trigger || "exit"}
                          onChange={(v: any) => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), trigger: v } }); setHasUnsavedChanges(true); }}
                       />
                       {theme.popupConfig?.trigger === "immediate" && (
                          <ThemeField 
                            label="Delay (Seconds)" 
                            type="number"
                            value={theme.popupConfig?.delay || 5} 
                            onChange={(v) => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), delay: parseInt(v) } }); setHasUnsavedChanges(true); }} 
                          />
                       )}
                       {theme.popupConfig?.trigger === "scroll" && (
                          <ThemeField 
                            label="Scroll Threshold (%)" 
                            type="number"
                            value={theme.popupConfig?.scrollThreshold || 30} 
                            onChange={(v) => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), scrollThreshold: parseInt(v) } }); setHasUnsavedChanges(true); }} 
                          />
                       )}
                    </div>

                    <div className="pt-6 border-t border-gray-100 space-y-6">
                       <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                          <ImageIcon size={14} className="text-wine" /> Content & Media
                       </h4>
                       <ThemeField 
                          label="Popup Headline" 
                          value={theme.popupConfig?.headline || ""} 
                          onChange={(v) => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), headline: v } }); setHasUnsavedChanges(true); }} 
                       />
                       <ThemeField 
                          label="Subheadline / Body" 
                          value={theme.popupConfig?.subheadline || ""} 
                          onChange={(v) => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), subheadline: v } }); setHasUnsavedChanges(true); }} 
                       />
                       <ThemeField 
                          label="Feature Image URL" 
                          value={theme.popupConfig?.image || ""} 
                          onChange={(v) => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), image: v } }); setHasUnsavedChanges(true); }} 
                       />
                    </div>

                    <div className="pt-6 border-t border-gray-100 space-y-6">
                       <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2">
                          <CheckCircle2 size={14} className="text-wine" /> Call to Action
                       </h4>
                       <ThemeField 
                          label="Button Text" 
                          value={theme.popupConfig?.ctaText || ""} 
                          onChange={(v) => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), ctaText: v } }); setHasUnsavedChanges(true); }} 
                       />
                       {theme.popupConfig?.type === "announcement" && (
                         <ThemeField 
                            label="Button Link" 
                            value={theme.popupConfig?.ctaLink || ""} 
                            onChange={(v) => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), ctaLink: v } }); setHasUnsavedChanges(true); }} 
                         />
                       )}
                       {theme.popupConfig?.type !== "announcement" && (
                         <ThemeField 
                            label="Discount Code (Optional)" 
                            value={theme.popupConfig?.discountCode || ""} 
                            onChange={(v) => { setTheme({ ...theme, popupConfig: { ...(theme.popupConfig || DEFAULT_POPUP_CONFIG), discountCode: v } }); setHasUnsavedChanges(true); }} 
                         />
                       )}
                    </div>
                  </div>
                )}

                {activeThemeTab === "footer" && (
                  <FooterBuilder 
                    config={theme.footerConfig || {}} 
                    onChange={(v) => { setTheme({ ...theme, footerConfig: v }); setHasUnsavedChanges(true); }} 
                  />
                )}

                {activeThemeTab === "light" && (
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                      <Sun size={14} className="text-orange-400" /> Light Theme Design
                    </h4>
                    <ColorPicker label="Primary Color" value={theme.light_primaryColor} onChange={(v) => { setTheme({...theme, light_primaryColor: v}); setHasUnsavedChanges(true); }} />
                    <ColorPicker label="Background" value={theme.light_bg} onChange={(v) => { setTheme({...theme, light_bg: v}); setHasUnsavedChanges(true); }} />
                    <ColorPicker label="Surface (Cards)" value={theme.light_surface} onChange={(v) => { setTheme({...theme, light_surface: v}); setHasUnsavedChanges(true); }} />
                    <ColorPicker label="Primary Text" value={theme.light_textPrimary} onChange={(v) => { setTheme({...theme, light_textPrimary: v}); setHasUnsavedChanges(true); }} />
                    <ColorPicker label="Secondary Text" value={theme.light_textSecondary} onChange={(v) => { setTheme({...theme, light_textSecondary: v}); setHasUnsavedChanges(true); }} />
                    <ColorPicker label="Borders" value={theme.light_border} onChange={(v) => { setTheme({...theme, light_border: v}); setHasUnsavedChanges(true); }} />
                    <ThemeField label="Glass Background" value={theme.light_glassBg} onChange={(v) => { setTheme({...theme, light_glassBg: v}); setHasUnsavedChanges(true); }} />
                    <ThemeField label="Glass Border" value={theme.light_glassBorder} onChange={(v) => { setTheme({...theme, light_glassBorder: v}); setHasUnsavedChanges(true); }} />
                  </div>
                )}

                {activeThemeTab === "dark" && (
                  <div className="space-y-6">
                    <h4 className="text-[11px] font-bold text-charcoal uppercase tracking-[0.2em] flex items-center gap-2 mb-6">
                      <Moon size={14} className="text-purple-400" /> Dark Theme Design
                    </h4>
                    <ColorPicker label="Primary Color" value={theme.dark_primaryColor} onChange={(v) => { setTheme({...theme, dark_primaryColor: v}); setHasUnsavedChanges(true); }} />
                    <ColorPicker label="Background" value={theme.dark_bg} onChange={(v) => { setTheme({...theme, dark_bg: v}); setHasUnsavedChanges(true); }} />
                    <ColorPicker label="Surface (Cards)" value={theme.dark_surface} onChange={(v) => { setTheme({...theme, dark_surface: v}); setHasUnsavedChanges(true); }} />
                    <ColorPicker label="Primary Text" value={theme.dark_textPrimary} onChange={(v) => { setTheme({...theme, dark_textPrimary: v}); setHasUnsavedChanges(true); }} />
                    <ColorPicker label="Secondary Text" value={theme.dark_textSecondary} onChange={(v) => { setTheme({...theme, dark_textSecondary: v}); setHasUnsavedChanges(true); }} />
                    <ColorPicker label="Borders" value={theme.dark_border} onChange={(v) => { setTheme({...theme, dark_border: v}); setHasUnsavedChanges(true); }} />
                    <ThemeField label="Glass Background" value={theme.dark_glassBg} onChange={(v) => { setTheme({...theme, dark_glassBg: v}); setHasUnsavedChanges(true); }} />
                    <ThemeField label="Glass Border" value={theme.dark_glassBorder} onChange={(v) => { setTheme({...theme, dark_glassBorder: v}); setHasUnsavedChanges(true); }} />
                  </div>
                )}
              </div>

              <div className="p-6 border-t border-gray-100 bg-gray-50 flex gap-4">
                 <button 
                   onClick={() => setShowThemeEditor(false)}
                   className="flex-1 py-4 bg-charcoal text-white text-[10px] font-bold uppercase tracking-widest rounded-xl hover:bg-wine transition-all"
                 >
                   Apply Preview
                 </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function ThemeField({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{label}</label>
      <input 
        type="text" 
        value={value} 
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-gray-50 border border-gray-100 rounded-lg px-4 py-3 text-sm focus:bg-white focus:border-wine outline-none transition-all shadow-inner"
      />
    </div>
  );
}

function ColorPicker({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-xl">
       <span className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{label}</span>
       <div className="flex items-center gap-2">
          <input 
            type="color" 
            value={value} 
            onChange={(e) => onChange(e.target.value)}
            className="w-6 h-6 rounded cursor-pointer border-none bg-transparent"
          />
          <span className="text-[10px] font-mono text-gray-400">{value}</span>
       </div>
    </div>
  );
}

function SelectField({ label, options, value, onChange }: { label: string, options: string[], value: string, onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase font-bold tracking-widest text-gray-400">{label}</label>
      <div className="flex bg-gray-50 border border-gray-100 rounded-xl p-1">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => onChange(opt)}
              className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${
                value === opt ? "bg-white text-wine shadow-sm" : "text-gray-400 hover:text-charcoal"
              }`}
            >
              {opt}
            </button>
          ))}
       </div>
    </div>
  );
}
