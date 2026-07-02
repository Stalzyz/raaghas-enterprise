"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Save, Eye, Smartphone, Tablet, Monitor, 
  ChevronLeft, LayoutGrid, Type, 
  Settings2, CheckCircle2, Palette, Loader2,
  Sun, Moon, Sparkles, FileText, Globe, Lock, Grid, Layout, Users, Image as ImageIcon
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { SidebarControls } from "@/components/cms/SidebarControls";
import { StorefrontPreview } from "@/components/cms/StorefrontPreview";

// ─── Types ───────────────────────────────────────────────────────────────────

type SectionType = 
  | "HERO" | "FEATURE_GRID" | "FEATURED_COLLECTION" | "PRODUCT_GRID" | "BANNER" 
  | "LOOKBOOK" | "TESTIMONIALS" | "TEXT_BLOCK" | "EDITORIAL" | "BRAND_STORY" 
  | "CATEGORIES_MOSAIC" | "NEWSLETTER" | "INSTAGRAM_FEED" | "TRUST_BAR" 
  | "CATEGORY_STRIP" | "AOV_BUNDLES" | "STORY_BANNER" | "DEAL_BANNER" 
  | "SOCIAL_PROOF" | "SMART_GRID"  | "CUSTOM_HTML"
  | "LOGO_CLOUD"
  | "IMAGE_SCROLL" | "LEGAL_PROSE" | "ACCORDION_FAQ" | "IMAGE_ROW"
  | "PRODUCT_SCROLL" | "ANNOUNCEMENT_MARQUEE";

interface Section {
  id: string;
  type: SectionType;
  order: number;
  content: Record<string, any>;
  style: Record<string, any>;
  settings: Record<string, any>;
  hidden?: boolean;
}

const SECTION_PALETTE: any[] = [
  { type: "LEGAL_PROSE", label: "Legal Document", icon: <FileText size={16} />, description: "Long-form policy text with sections" },
  { type: "ACCORDION_FAQ", label: "Accordion FAQ", icon: <LayoutGrid size={16} />, description: "Expandable question/answer list" },
  { type: "HERO", label: "Hero Banner", icon: <Sparkles size={16} />, description: "High impact visual headline" },
  { type: "SOCIAL_PROOF",       label: "UGC Social Proof",    icon: <Users size={16} />,       description: "Customer photos & reviews grid" },
  { type: "FEATURED_COLLECTION", label: "Featured Collection", icon: <Grid size={16} />, description: "Showcase a specific collection" },
  { type: "CUSTOM_HTML",        label: "Custom HTML",         icon: <Layout size={16} />,      description: "Advanced custom embed" },
  { 
    type: "LOGO_CLOUD", 
    label: "Logo / Icon Cloud", 
    icon: <ImageIcon size={16} />, 
    description: "Horizontal scrolling logo or icon band"
  },
  { 
    type: "IMAGE_SCROLL", 
    label: "Horizontal Image Scroll", 
    icon: <LayoutGrid size={16} />, 
    description: "Rounded or square scrolling image gallery"
  },
  { type: "TEXT_BLOCK", label: "Text & Image", icon: <Type size={16} />, description: "Modular content block" },
  { type: "PRODUCT_GRID", label: "Product Showcase", icon: <LayoutGrid size={16} />, description: "Grid of specific products" },
  { type: "BANNER", label: "Full Width Banner", icon: <Monitor size={16} />, description: "Edge-to-edge marketing image" },
  { type: "IMAGE_ROW", label: "Icon / Image Row", icon: <ImageIcon size={16} />, description: "Horizontal strip of icons or logos" },
  { type: "PRODUCT_SCROLL", label: "Horizontal Product Scroll", icon: <LayoutGrid size={16} />, description: "Swipeable horizontal product row" },
  { type: "ANNOUNCEMENT_MARQUEE", label: "Announcement Marquee", icon: <Type size={16} />, description: "Infinite scrolling announcement strip" },
];

export default function PageEditor() {
  const { token } = useAdminAuth();
  const params = useParams();
  const router = useRouter();
  const handle = (params?.slug as string) || 'new';
  
  const [pageData, setPageData] = useState<any>(null);
  const [sections, setSections] = useState<Section[]>([]);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [deviceMode, setDeviceMode] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const [previewThemeMode, setPreviewThemeMode] = useState<"LIGHT" | "DARK">("LIGHT");
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<"sections" | "metadata" | "theme">("sections");

  const [theme, setTheme] = useState<any>(null);

  useEffect(() => {
    if (token) {
      loadPage();
      loadTheme();
    }
  }, [handle, token]);

  async function loadPage() {
    if (handle === 'new') {
      setPageData({ title: "Untitled Page", handle: "", type: "LANDING", status: "DRAFT" });
      setSections([]);
      setLoading(false);
      return;
    }
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/cms/pages/${handle}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPageData(data);
        setSections(data.sections || []);
      }
    } catch (err) {
      console.error("Failed to load page", err);
    } finally {
      setLoading(false);
    }
  }

  async function loadTheme() {
    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/cms/theme`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setTheme(data.config);
      }
    } catch (err) {}
  }

  const handleSave = async () => {
    if (handle === 'new' && (!pageData.handle || pageData.handle.trim() === '')) {
      alert("Please enter a valid URL slug in the Metadata tab before publishing.");
      setActiveTab('metadata');
      return;
    }

    try {
      const baseUrl = API_BASE;
      const res = await fetch(`${baseUrl}/cms/pages/${handle === 'new' ? pageData.handle : handle}`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ ...pageData, sections })
      });

      if (res.ok) {
        setSaved(true);
        setHasUnsavedChanges(false);
        if (handle === 'new' || handle !== pageData.handle) {
          router.push(`/cms/pages/${pageData.handle}`);
        } else {
          setTimeout(() => setSaved(false), 2000);
        }
      } else {
        const errData = await res.json();
        alert(`Failed to save: ${errData.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("Save error:", err);
      alert("Failed to save page. Please check your connection and try again.");
    }
  };

  const addSection = (type: SectionType) => {
    let defaultContent = {};
    if (type === "LEGAL_PROSE") {
      defaultContent = { 
        title: pageData.title, 
        lastUpdated: new Date().toLocaleDateString(),
        sections: [{ title: "1. Introduction", content: "Enter your policy text here..." }] 
      };
    } else if (type === "ACCORDION_FAQ") {
      defaultContent = {
        headline: "Frequently Asked Questions",
        subheadline: "Everything you need to know about our products and services.",
        faqs: [{ question: "How do I care for my Raaghas pieces?", answer: "We recommend gentle hand wash in cold water with mild detergent." }]
      };
    } else if (type === "LOGO_CLOUD") {
      defaultContent = { headline: "Featured In", logos: [{ image: "", alt: "Brand 1" }] };
    } else if (type === "IMAGE_SCROLL") {
      defaultContent = { headline: "Shop by Look", images: [{ image: "", link: "", title: "Look 1" }] };
    } else if (type === "HERO") {
      defaultContent = {
        headline: "Feel Comfortable.\nLook Effortless.",
        subheadline: "Premium cotton wear designed for everyday elegance.",
        ctaText: "Shop Now",
        ctaLink: "/collections/all"
      };
    } else if (type === "TEXT_BLOCK") {
      defaultContent = {
        headline: "Our Philosophy",
        body: "At Raaghas, we believe in the beauty of simplicity. Our pieces are crafted with love and attention to detail."
      };
    } else if (type === "PRODUCT_GRID") {
      defaultContent = {
        title: "Featured Products",
        collectionHandle: "all"
      };
    } else if (type === "IMAGE_ROW") {
      defaultContent = {
        headline: "As Featured In",
        imageShape: "round",
        images: [
          { url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200", link: "" },
          { url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200", link: "" },
          { url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200", link: "" },
          { url: "https://images.unsplash.com/photo-1599305445671-ac291c95aaa9?w=200", link: "" }
        ]
      };
    } else if (type === "PRODUCT_SCROLL") {
      defaultContent = {
        title: "New Arrivals",
        subtitle: "Just Dropped",
        collectionHandle: "new-arrivals",
        limit: 12
      };
    } else if (type === "ANNOUNCEMENT_MARQUEE") {
      defaultContent = {
        items: ["✨ Share Your Favourite Styles", "Earn Reward Credits", "Redeem on Every Purchase", "Invite Friends", "Unlock Exclusive Member Rewards"],
        speed: 30
      };
    }

    const newSection: Section = {
      id: Math.random().toString(36).substr(2, 9),
      type,
      order: sections.length,
      content: defaultContent,
      style: { padding: 60, textAlign: 'center' },
      settings: { animation: "fade" }
    };
    setSections([...sections, newSection]);
    setActiveSectionId(newSection.id);
    setHasUnsavedChanges(true);
  };

  const updateSection = (id: string, content: any, style?: any, settings?: any) => {
    setSections(sections.map(s => s.id === id ? { ...s, content: content || s.content, style: style || s.style, settings: settings || s.settings } : s));
    setHasUnsavedChanges(true);
  };

  if (loading) return <div className="fixed inset-0 flex items-center justify-center bg-ivory text-wine"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="fixed inset-0 flex flex-col bg-gray-50 z-[60]">
      {/* Header */}
      <div className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-4">
          <Link href="/cms/pages" className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
            <ChevronLeft size={20} />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-charcoal uppercase tracking-widest">{pageData?.title || "Page Editor"}</h1>
            <p className="text-[10px] text-gray-400 font-mono">/pages/{pageData?.handle || handle}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center bg-gray-100 p-1 rounded-xl">
             <button onClick={() => setDeviceMode("desktop")} className={`p-2 rounded-lg ${deviceMode === "desktop" ? "bg-white text-wine shadow-sm" : "text-gray-400"}`}><Monitor size={18} /></button>
             <button onClick={() => setDeviceMode("mobile")} className={`p-2 rounded-lg ${deviceMode === "mobile" ? "bg-white text-wine shadow-sm" : "text-gray-400"}`}><Smartphone size={18} /></button>
           </div>
           
           <button 
             onClick={handleSave}
             className={`px-8 py-2.5 rounded-full text-xs font-bold uppercase tracking-widest transition-all ${saved ? "bg-green-500 text-white" : "bg-charcoal text-white hover:bg-wine"}`}
           >
             {saved ? "Saved" : "Publish"}
           </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-[400px] bg-white border-r border-gray-100 flex flex-col">
          <div className="flex border-b border-gray-100">
            <button onClick={() => setActiveTab("sections")} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 ${activeTab === 'sections' ? 'border-wine text-wine' : 'border-transparent text-gray-400'}`}>Sections</button>
            <button onClick={() => setActiveTab("metadata")} className={`flex-1 py-4 text-[10px] font-bold uppercase tracking-widest border-b-2 ${activeTab === 'metadata' ? 'border-wine text-wine' : 'border-transparent text-gray-400'}`}>Metadata & SEO</button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'sections' ? (
              <SidebarControls 
                activeTab="sections"
                setActiveTab={() => {}}
                sections={sections}
                activeSectionId={activeSectionId}
                onSelectSection={setActiveSectionId}
                onUpdateSection={updateSection}
                onMoveSection={(id, dir) => {
                  const idx = sections.findIndex(s => s.id === id);
                  const newSections = [...sections];
                  const target = dir === "up" ? idx - 1 : idx + 1;
                  if (target >= 0 && target < sections.length) {
                    [newSections[idx], newSections[target]] = [newSections[target], newSections[idx]];
                    setSections(newSections.map((s, i) => ({ ...s, order: i })));
                  }
                }}
                onRemoveSection={(id) => setSections(sections.filter(s => s.id !== id))}
                onAddSection={addSection}
                palette={SECTION_PALETTE}
              />
            ) : (
              <div className="space-y-6">
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Page Title</label>
                  <input value={pageData.title} onChange={e => setPageData({...pageData, title: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-wine/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">URL Slug</label>
                  <input value={pageData.handle} onChange={e => setPageData({...pageData, handle: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-wine/20" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Status</label>
                  <select value={pageData.status} onChange={e => setPageData({...pageData, status: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm">
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Published</option>
                  </select>
                </div>
                <hr className="border-gray-50" />
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Meta Title</label>
                  <input value={pageData.metaTitle || ""} onChange={e => setPageData({...pageData, metaTitle: e.target.value})} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" />
                </div>
                <div>
                  <label className="text-[10px] font-bold uppercase text-gray-400 mb-2 block">Meta Description</label>
                  <textarea value={pageData.metaDescription || ""} onChange={e => setPageData({...pageData, metaDescription: e.target.value})} rows={4} className="w-full bg-gray-50 border-none rounded-xl px-4 py-3 text-sm" />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Preview */}
        <StorefrontPreview 
          sections={sections}
          deviceMode={deviceMode}
          theme={theme}
          previewThemeMode={previewThemeMode}
        />
      </div>
    </div>
  );
}
