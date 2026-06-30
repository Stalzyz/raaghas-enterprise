"use client";

import React from "react";
import { motion } from "framer-motion";
import { ArrowRight, RotateCw, Sparkles } from "lucide-react";

interface Section {
  id: string;
  type: string;
  content: Record<string, any>;
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
  customFooterHtml?: string;
  customGlobalCss?: string;
  footerTagline?: string;
  footerText?: string;
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
}

const getMediaUrl = (url?: string | null) => {
  if (!url) return "https://images.unsplash.com/photo-1583391733958-d20f4c9c1b9b?q=80&w=800&auto=format&fit=crop";
  if (url.startsWith("http")) return url;
  if (url.startsWith("data:")) return url; // Handle base64
  
  // Clean up double slashes and ensure leading slash
  const cleanPath = url.replace(/\/+/g, '/');
  const normalizedUrl = cleanPath.startsWith("/") ? cleanPath : `/${cleanPath}`;
  
  // If it's already an upload path, don't prepend /uploads again
  const finalPath = normalizedUrl.startsWith("/uploads/") ? normalizedUrl : `/uploads${normalizedUrl}`;
  
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? "http://localhost:6005" : "https://api.raaghas.in");
  baseUrl = baseUrl.replace('/api/v1', '');
  return `${baseUrl}${finalPath}`;
};

const getHeroImage = (content: any) => {
  if (!content) return "";
  return content.backgroundImage || content.image || content.bannerImage || "";
};

// ─── Error Boundary ─────────────────────────────────────────────────────────
class PreviewErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean, error: any }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error: any) { return { hasError: true, error }; }
  componentDidCatch(error: any, errorInfo: any) { console.error("Preview Render Crash:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-charcoal text-white p-12 text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-6">!</div>
          <h2 className="text-2xl font-serif mb-4">Preview Engine Halted</h2>
          <p className="text-sm opacity-60 max-w-sm mb-8">A component in your preview has triggered a render crash. This usually happens when critical data is missing or malformed.</p>
          <pre className="text-[10px] bg-black/40 p-4 rounded text-left max-w-md overflow-auto mb-8">{this.state.error?.toString()}</pre>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-8 py-3 bg-white text-charcoal text-[10px] font-bold uppercase tracking-widest rounded-full"
          >
            Attempt Re-render
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function StorefrontPreview({ 
  sections = [], 
  deviceMode = "desktop",
  theme,
  previewThemeMode = "LIGHT"
}: { 
  sections: Section[]; 
  deviceMode: "mobile" | "tablet" | "desktop";
  theme: ThemeSettings;
  previewThemeMode?: "LIGHT" | "DARK";
}) {
  if (!theme) return <div className="flex-1 flex items-center justify-center bg-gray-50 text-gray-300">Initializing Theme Engine...</div>;

  const containerClasses = {
    mobile: "w-[375px] h-[667px]",
    tablet: "w-[768px] h-[1024px]",
    desktop: "w-full h-full",
  };

  const mode = (previewThemeMode || "LIGHT").toLowerCase() as "light" | "dark";
  const isDark = mode === "dark";
  
  const getThemeVal = (m: 'light' | 'dark', k: string, fallback: string) => {
    const flatKey = `${m}_${k}` as keyof ThemeSettings;
    const flatKeyWithColor = `${m}_${k}Color` as keyof ThemeSettings;
    // @ts-ignore
    return theme[flatKey] || theme[flatKeyWithColor] || (theme as any)[m]?.[k] || (theme as any)[m]?.[`${k}Color`] || fallback;
  };

  const tokens = isDark ? {
    primary: getThemeVal('dark', 'primary', "#8C1C2A"),
    bg: getThemeVal('dark', 'bg', "#0F0F10"),
    surface: getThemeVal('dark', 'surface', "#1A1A1C"),
    text: getThemeVal('dark', 'textPrimary', "#F5F5F5"),
    muted: getThemeVal('dark', 'textSecondary', "#B0B0B0"),
    border: getThemeVal('dark', 'border', "#2A2A2C"),
    glassBg: getThemeVal('dark', 'glassBg', "rgba(255, 255, 255, 0.05)"),
    glassBorder: getThemeVal('dark', 'glassBorder', "rgba(255, 255, 255, 0.1)"),
  } : {
    primary: getThemeVal('light', 'primary', "#701A31"),
    bg: getThemeVal('light', 'bg', "#FDFBF7"),
    surface: getThemeVal('light', 'surface', "#FFFFFF"),
    text: getThemeVal('light', 'textPrimary', "#1A1A1A"),
    muted: getThemeVal('light', 'textSecondary', "#666666"),
    border: getThemeVal('light', 'border', "#EEEEEE"),
    glassBg: getThemeVal('light', 'glassBg', "rgba(255, 255, 255, 0.7)"),
    glassBorder: getThemeVal('light', 'glassBorder', "rgba(255, 255, 255, 0.3)"),
  };

  const logo = isDark ? (theme.logoDark || theme.logoLight) : (theme.logoLight || theme.logoDark);
  const headingFont = theme.fontHeading === "serif" ? "font-serif" : theme.fontHeading === "mono" ? "font-mono" : "font-sans";
  const bodyFont = theme.fontBody === "serif" ? "font-serif" : theme.fontBody === "mono" ? "font-mono" : "font-sans";
  const primaryColor = tokens.primary;

  return (
    <PreviewErrorBoundary>
      <div className="flex-1 bg-gray-100 flex flex-col items-center justify-start overflow-hidden p-4 md:p-8">
        {/* Device Wrapper */}
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className={`bg-white shadow-2xl rounded-t-xl overflow-y-auto scrollbar-hide border-x-8 border-t-8 border-charcoal ${containerClasses[deviceMode]}`}
        >
          {/* Simulated Browser Bar */}
          <div className="sticky top-0 z-[60] bg-white border-b border-gray-100 px-4 py-2 flex items-center justify-between">
            <div className="flex gap-1.5">
              <div className="w-2 h-2 rounded-full bg-red-400" />
              <div className="w-2 h-2 rounded-full bg-yellow-400" />
              <div className="w-2 h-2 rounded-full bg-green-400" />
            </div>
            <div className="bg-gray-50 px-2 py-0.5 rounded text-[8px] text-gray-400 font-sans truncate max-w-[150px]">
              {theme.storeName?.toLowerCase().replace(/\s+/g, '') || "raagha"}.store/preview
            </div>
            <div className="w-6" />
          </div>

          {/* Simulated Boutique Header */}
          <header 
            className="sticky top-[33px] z-50 w-full px-6 py-4 border-b flex items-center justify-between transition-colors duration-500"
            style={{ 
              backgroundColor: tokens.surface,
              borderColor: tokens.border
            }}
          >
            <div className="flex items-center gap-6">
              <div className="w-5 h-5 flex flex-col justify-center gap-1">
                  <div className="h-0.5 w-full bg-current opacity-40" />
                  <div className="h-0.5 w-3/4 bg-current opacity-40" />
              </div>
            </div>

            <div className="flex-1 flex justify-center">
              {logo ? (
                  <img src={getMediaUrl(logo)} alt="Logo" className="h-6 object-contain" />
              ) : (
                  <h1 
                    className={`text-lg tracking-[0.3em] uppercase ${headingFont}`}
                    style={{ color: primaryColor }}
                  >
                    {theme.storeName || "RAAGHAS"}
                  </h1>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs opacity-60">
              <span>Account</span>
              <span>Cart (0)</span>
            </div>
          </header>

          {/* Content Area */}
          <div 
            className="min-h-full transition-colors duration-500"
            style={{ 
              backgroundColor: tokens.bg,
              color: tokens.text,
              fontFamily: theme.fontBody === "serif" ? "serif" : theme.fontBody === "mono" ? "monospace" : "sans-serif",
              // @ts-ignore
              "--primary": tokens.primary,
              "--bg": tokens.bg,
              "--surface": tokens.surface,
              "--text-primary": tokens.text,
              "--text-secondary": tokens.muted,
              "--border": tokens.border,
              "--glass-bg": tokens.glassBg,
              "--glass-border": tokens.glassBorder,
              "--btn-radius": theme.buttonRadius || "0px",
            } as any}
          >
            {/* Inject Global Custom CSS */}
            {theme.customGlobalCss && (
              <style dangerouslySetInnerHTML={{ __html: theme.customGlobalCss }} />
            )}

            {sections.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-40 text-gray-300">
                <p className="font-serif italic text-xl">Your story starts here.</p>
                <p className="text-xs uppercase tracking-widest mt-2">Add a section to begin building.</p>
              </div>
            ) : (
              <div className="flex flex-col">
                {sections.filter(s => s && s.id && s.type).map(section => (
                  <PreviewSection key={section.id} section={section} theme={theme} previewThemeMode={previewThemeMode} />
                ))}
              </div>
            )}

            {/* Global Footer */}
            <footer 
              className="py-12 px-8 border-t transition-all duration-500"
              style={{ backgroundColor: tokens.surface, borderColor: tokens.border }}
            >
              <div className="flex flex-col items-center text-center space-y-6">
                 {logo ? (
                    <img src={getMediaUrl(logo)} alt="Logo" className="h-6 object-contain opacity-50 grayscale" />
                 ) : (
                    <h2 className={`text-lg tracking-[0.3em] uppercase opacity-50 ${headingFont}`}>{theme.storeName || "RAAGHAS"}</h2>
                 )}
                 
                 {theme.footerTagline && (
                    <p className={`text-xs max-w-xs opacity-40 leading-relaxed ${bodyFont}`}>{theme.footerTagline}</p>
                 )}

                 {theme.customFooterHtml && (
                    <div className="w-full" dangerouslySetInnerHTML={{ __html: theme.customFooterHtml }} />
                 )}

                 <div className="pt-6 border-t border-black/5 w-full">
                    <p className="text-[10px] uppercase tracking-widest opacity-30">
                      {theme.footerText || `© ${new Date().getFullYear()} ${theme.storeName}. All rights reserved.`}
                    </p>
                 </div>
              </div>
            </footer>
          </div>
        </motion.div>
      </div>
    </PreviewErrorBoundary>
  );
}

function PreviewSection({ section, theme, previewThemeMode }: { section: Section; theme: ThemeSettings; previewThemeMode: "LIGHT" | "DARK" }) {
  const animMap: Record<string, any> = {
    "fade":      { initial: { opacity: 0 }, whileInView: { opacity: 1 } },
    "slide-up":  { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 } },
    "slide-down":{ initial: { opacity: 0, y: -30 }, whileInView: { opacity: 1, y: 0 } },
    "zoom":      { initial: { opacity: 0, scale: 0.96 }, whileInView: { opacity: 1, scale: 1 } },
  };
  const settings = (section as any).settings || {};
  const anim = animMap[settings.animation || "fade"] || animMap["fade"];
  const rawSpeed = parseFloat(settings.speed);
  const duration = (isFinite(rawSpeed) && rawSpeed > 0) ? rawSpeed : 0.5;
  const delay = settings.delay ?? 0;
  if ((section as any).hidden) return null;
  return (
    <motion.div
      initial={anim.initial}
      whileInView={anim.whileInView}
      viewport={{ once: true }}
      transition={{ duration, delay }}
      className="relative group border-2 border-transparent hover:border-wine/30 transition-colors"
    >
       <div className="w-full">
          {renderSection(section, theme, previewThemeMode)}
       </div>
    </motion.div>
  );
}

function renderSection(section: Section, theme: ThemeSettings, previewThemeMode: "LIGHT" | "DARK" = "LIGHT") {
  const { type, content } = section;
  const style = (section as any).style || content.style || {};

  const sectionStyle = {
    backgroundColor: style.backgroundColor || "transparent",
    paddingTop: style.paddingTop ? `${style.paddingTop}px` : undefined,
    paddingBottom: style.paddingBottom ? `${style.paddingBottom}px` : undefined,
    color: style.textColor || "var(--text-primary)",
  };

  const textAlignmentClass = {
    left: "text-left items-start",
    center: "text-center items-center",
    right: "text-right items-end",
  }[style.textAlign as string] || "text-center items-center";

  const headingFont = theme.fontHeading === "serif" ? "font-serif" : theme.fontHeading === "mono" ? "font-mono" : "font-sans";
  const bodyFont = theme.fontBody === "serif" ? "font-serif" : theme.fontBody === "mono" ? "font-mono" : "font-sans";

  const getThemeVal = (mode: string, key: string, fallback: string) => {
    const flatKey = `${mode.toLowerCase()}_${key}`;
    const flatKeyWithColor = `${mode.toLowerCase()}_${key}Color`;
    // @ts-ignore
    return theme[flatKey] || theme[flatKeyWithColor] || theme[mode.toLowerCase()]?.[key] || theme[mode.toLowerCase()]?.[`${key}Color`] || fallback;
  };

  const currentMode = (previewThemeMode || theme.defaultThemeMode || "LIGHT").toLowerCase();

  const tokens = {
    surface: getThemeVal(currentMode, "surface", "var(--surface)"),
    border: getThemeVal(currentMode, "border", "var(--border)"),
    primary: getThemeVal(currentMode, "primary", "var(--primary)"),
    bg: getThemeVal(currentMode, "bg", "var(--bg)"),
    text: getThemeVal(currentMode, "textPrimary", "var(--text-primary)"),
    muted: getThemeVal(currentMode, "textSecondary", "var(--text-secondary)"),
  };

  const primaryColor = "var(--primary)";
  const buttonRadius = style.buttonRadius || theme.buttonRadius || "0.5rem";

  
  switch (type) {
    case "HERO":
      if (content.variant === "aesthetic") {
        const heroImg = getHeroImage(content);
        const fabrics = content.fabrics || [];
        const uiElements = content.uiElements || [];
        
        return (
          <div className="relative w-full min-h-[95vh] flex items-center overflow-hidden py-24" style={sectionStyle}>
             <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-wine/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-wine/5 blur-[120px] rounded-full" />
             </div>

             <div className="absolute inset-0 pointer-events-none z-0">
                {(fabrics || []).map((fabric: any, i: number) => {
                  if (!fabric) return null;
                  return (
                    <div
                       key={`fabric-${i}`}
                       className={`absolute ${fabric.image ? 'w-96 h-96' : 'w-64 h-64 blur-[60px]'} rounded-full`}
                       style={{ 
                         backgroundColor: fabric.image ? 'transparent' : 'var(--primary)',
                         left: `${fabric.x || 0}%`,
                         top: `${fabric.y || 0}%`,
                         opacity: fabric.opacity || (fabric.image ? 0.8 : 0.08),
                         transform: `scale(${fabric.scale || 1}) translate(-50%, -50%)`
                       }}
                     >
                       {fabric.image && (
                         <img src={getMediaUrl(fabric.image)} alt="" className="w-full h-full object-contain mix-blend-soft-light opacity-80" />
                       )}
                     </div>
                  );
                })}
             </div>

              <div className="absolute inset-0 pointer-events-none z-30">
                {(uiElements || []).map((el: any, i: number) => {
                  if (!el) return null;
                  return (
                     <div
                       key={`ui-${i}`}
                       className={`absolute ${el.shape === 'circle' ? 'bg-white/40 backdrop-blur-xl border border-white/40 rounded-full p-4' : el.shape === 'rounded' ? 'bg-white/40 backdrop-blur-xl border border-white/40 rounded-[2rem] p-4' : 'text-wine/40'}`}
                       style={{ 
                         left: `${el.x || 0}%`, 
                         top: `${el.y || 0}%`,
                         opacity: el.opacity || 0.6,
                         transform: `scale(${el.size || 1}) translate(-50%, -50%)`
                       }}
                     >
                       <div className="flex flex-col items-center justify-center gap-2">
                         {el.image ? (
                           <img src={getMediaUrl(el.image)} alt="" className="w-16 h-16 object-contain" />
                         ) : el.iconName ? (
                           <div className="w-16 h-16 p-2 flex items-center justify-center">
                             <Sparkles size={24} />
                           </div>
                         ) : null}

                         {(el.text || el.subtext) && (
                           <div className="text-center">
                             {el.text && <p className="text-[10px] font-bold tracking-widest leading-none uppercase">{el.text}</p>}
                             {el.subtext && <p className="text-[10px] font-bold tracking-widest mt-1 uppercase">{el.subtext}</p>}
                           </div>
                         )}
                       </div>
                     </div>
                  );
                })}
             </div>

             <div className="max-w-7xl mx-auto px-8 w-full relative z-20 flex flex-col md:flex-row items-center gap-16">
                <div className="flex-1 space-y-8">
                   <div className="inline-block px-4 py-1.5 rounded-full mb-4 border border-wine/10 bg-wine/5">
                      <span className="text-[10px] font-bold text-wine uppercase tracking-[0.4em]">
                         {content.description || "The Raaghas Signature"}
                      </span>
                   </div>

                   <h1 className={`text-6xl md:text-8xl font-serif mb-8 leading-[0.9] tracking-tighter`}>
                      {content.headline || "Royal Threads."}
                   </h1>
                   
                   <p className="text-lg md:text-xl font-serif mb-12 opacity-80 max-w-lg leading-relaxed font-light">
                      {content.subheadline || "The Midnight Silk Collection — Limited Edition."}
                   </p>

                   <div className="flex items-center gap-6">
                      <button 
                        className="px-10 py-5 bg-wine text-white text-[10px] font-bold uppercase tracking-[0.3em] rounded-full shadow-xl"
                      >
                        {content.ctaText || "Shop the Collection"}
                      </button>
                   </div>
                </div>

                <div className="flex-1 w-full relative">
                   <div className="relative aspect-[4/5] rounded-[4rem] overflow-hidden shadow-2xl ring-1 ring-black/5 bg-gray-100">
                      <img 
                        src={getMediaUrl(heroImg || 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800')} 
                        className="w-full h-full object-cover"
                        alt=""
                        onError={(e: any) => e.target.src = 'https://images.unsplash.com/photo-1544441893-675973e31985?q=80&w=800'}
                      />
                   <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent pointer-events-none" />
                   </div>

                   {/* Precision Floating Accents are now handled by uiElements list */}
                </div>
             </div>
          </div>
        );
      }

      if (content.variant === "quantum_mosaic") {
        return (
          <div className="relative w-full h-[60vh] overflow-hidden flex items-center justify-center" style={{ ...sectionStyle, backgroundColor: sectionStyle.backgroundColor === 'transparent' ? tokens.primary : sectionStyle.backgroundColor }}>
             <div className="absolute inset-0 opacity-20 bg-cover bg-center" style={{ backgroundImage: `url('${getMediaUrl(content.textureImage || content.backgroundImage)}')` }} />
             <div className="z-10 text-center space-y-4">
                <h1 className={`text-4xl font-serif text-white tracking-widest uppercase`}>{content.marqueeText || "NEW ERA"}</h1>
                <button className="px-8 py-3 bg-white text-charcoal text-[10px] font-bold uppercase tracking-[0.3em]" style={{ borderRadius: buttonRadius }}>
                  <span className="relative z-10">{content.ctaText || "SHOP NOW"}</span>
                </button>
             </div>
          </div>
        );
      }

      if (content.variant === "holographic_layer") {
        const rawImages = content.images && content.images.length > 0 ? content.images : [
          content.image || "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=800&auto=format&fit=crop",
          content.backgroundImage || "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=800&auto=format&fit=crop",
          content.image || "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=800&auto=format&fit=crop",
        ];
        const images = rawImages.map((img: string | null) => getMediaUrl(img));

        const shimmerIntensity = ((section as any).settings?.shimmerIntensity || 60) / 100;
        const layerGap = (section as any).settings?.layerGap || 60;

        return (
          <div className="relative w-full min-h-[95vh] flex items-center overflow-hidden pt-20" style={{ ...sectionStyle, backgroundColor: sectionStyle.backgroundColor || 'var(--bg)' }}>
             <div className="absolute inset-0 z-0 flex items-center justify-center opacity-[0.04] select-none pointer-events-none overflow-hidden">
                <span className="text-[20vw] font-serif tracking-[0.1em] whitespace-nowrap uppercase">{content.headline || "COLLECTION"}</span>
             </div>

             <div className="relative z-10 w-full max-w-6xl mx-auto px-8 flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex-1 space-y-8 pl-4">
                   <h2 className="text-4xl md:text-6xl font-sans font-light tracking-tight leading-tight">{content.subheadline || content.headline || "Holographic Series"}</h2>
                   <p className="text-sm opacity-70 leading-relaxed max-w-md font-serif">{content.text || "Experience digital craftsmanship in physical textiles."}</p>
                   <div className="relative inline-flex items-center gap-4">
                     <span className="text-[10px] font-bold uppercase tracking-[0.3em] px-8 py-4 border border-current/20 rounded-full">
                       {content.ctaText || "Explore"}
                     </span>
                     <div className="w-10 h-10 rounded-full border border-gray-300 flex items-center justify-center">
                       <ArrowRight size={14} />
                     </div>
                   </div>
                </div>

                <div className="flex-1 h-[65vh] flex items-center justify-center relative" style={{ perspective: '1500px' }}>
                   <motion.div
                     className="relative w-64 h-96"
                     style={{ transformStyle: 'preserve-3d' }}
                     animate={{ rotateY: [0, 5, -5, 0], rotateX: [0, -2, 2, 0] }}
                     transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
                   >
                      <div
                        className="absolute inset-0 rounded-2xl overflow-hidden opacity-40"
                        style={{ transform: `translateZ(${-layerGap * 2}px) rotate(8deg)` }}
                      >
                         <img src={images[2]} className="w-full h-full object-cover grayscale blur-[3px]" alt="" />
                      </div>
                      <div
                        className="absolute inset-0 rounded-3xl overflow-hidden opacity-80 shadow-2xl"
                        style={{ transform: `translateZ(${-layerGap}px) rotate(-6deg)` }}
                      >
                         <img src={images[1]} className="w-full h-full object-cover blur-[1px]" alt="" />
                      </div>
                      <div
                        className="absolute inset-0 rounded-xl overflow-hidden shadow-[0_30px_60px_rgba(0,0,0,0.3)] bg-white"
                        style={{ transform: 'translateZ(0px)' }}
                      >
                         <img src={images[0]} className="w-full h-full object-cover" alt="" />
                         <div
                           className="absolute inset-0 pointer-events-none mix-blend-overlay opacity-60"
                           style={{ background: `radial-gradient(circle at 50% 30%, rgba(255,255,255,${shimmerIntensity}) 0%, rgba(200,100,255,${shimmerIntensity * 0.5}) 40%, transparent 80%)` }}
                         />
                         <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md p-2.5 rounded-full shadow-lg">
                           <RotateCw size={16} className="text-gray-600" />
                         </div>
                      </div>
                   </motion.div>
                </div>
             </div>
          </div>
        );
      }
      return (
        <div 
          className="relative w-full h-[60vh] flex items-center justify-center overflow-hidden transition-all"
          style={sectionStyle}
        >
          <div 
             className="absolute inset-0 bg-cover bg-center"
             style={{ 
               backgroundImage: `url('${getMediaUrl(getHeroImage(content) || 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=2670&auto=format&fit=crop')}')`,
               opacity: style.backgroundColor ? 0.6 : 1
             }}
          />
          <div 
            className={`relative z-10 p-6 space-y-4 flex flex-col ${textAlignmentClass}`}
            style={{ color: style.textColor }}
          >
             <h1 className={`text-3xl md:text-5xl leading-tight whitespace-pre-line ${headingFont}`}>
                {content.headline || "Feel Comfortable.\nLook Effortless."}
             </h1>
             <p 
               className={`text-sm md:text-lg font-light max-w-md ${bodyFont}`}
               style={{ color: style.textColor ? `${style.textColor}CC` : "rgba(255,255,255,0.8)" }}
             >
                {content.subheadline || "Premium cotton wear designed for everyday elegance."}
             </p>
             <div className="flex items-center gap-3 pt-4">
                <button 
                  className="px-6 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-all"
                  style={{ 
                    backgroundColor: primaryColor, 
                    color: "#ffffff", 
                    borderRadius: buttonRadius 
                  }}
                >
                  Shop Now
                </button>
             </div>
          </div>
        </div>
      );

    case "TRUST_BAR":
      return (
        <div className="py-3 px-6 border-b flex flex-wrap justify-center gap-6 transition-all duration-500" style={{ ...sectionStyle, borderBottomColor: style.textColor ? `${style.textColor}1A` : "rgba(0,0,0,0.05)" }}>
           {(content?.items || []).map((item: any, i: number) => (
             <div key={i} className={`flex items-center gap-2 ${bodyFont}`}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: style.textColor || primaryColor }} />
                <span className="text-[10px] font-bold tracking-tight" style={{ color: style.textColor ? `${style.textColor}CC` : "rgba(0,0,0,0.6)" }}>{item.text}</span>
             </div>
           ))}
        </div>
      );

    case "INSTAGRAM_FEED":
      return (
        <div className="py-12 px-6 space-y-6" style={sectionStyle}>
           <div className={`flex flex-col ${textAlignmentClass}`}>
              <h2 className={`text-xl ${headingFont}`}>{content.headline || "Community Styling"}</h2>
              <p className="text-[10px] opacity-40 uppercase tracking-widest">{content.handleText || "@raaghas"}</p>
           </div>
           <div className="grid grid-cols-5 gap-2">
               {[1,2,3,4,5].map(i => (
                 <div key={i} className="aspect-square bg-gray-100 rounded-lg overflow-hidden relative">
                    <img src={`https://images.unsplash.com/photo-1583391733958-d20f4c9c1b9b?q=80&w=400&auto=format&fit=crop`} className="w-full h-full object-cover opacity-90" alt="" />
                    <div className="absolute inset-0 bg-black/5" />
                 </div>
               ))}
           </div>
        </div>
      );

    case "NEWSLETTER":
      return (
        <div className="py-12 px-8 flex flex-col transition-all duration-500" style={sectionStyle}>
           <div className={`flex flex-col space-y-3 ${textAlignmentClass}`}>
              <h2 className={`text-2xl ${headingFont}`} style={{ color: style.textColor || "#2D2926" }}>{content.headline || "Newsletter"}</h2>
              <p className={`text-[10px] opacity-70 max-w-xs ${bodyFont}`}>{content.body || "Sign up for updates."}</p>
              <div className="flex gap-2 w-full max-w-xs mt-4">
                 <div className="flex-1 h-8 bg-black/5 border border-black/10 rounded" style={{ borderRadius: buttonRadius }} />
                 <div className="w-16 h-8 rounded opacity-80" style={{ backgroundColor: style.textColor || primaryColor, borderRadius: buttonRadius }} />
              </div>
           </div>
        </div>
      );

    case "TEXT_BLOCK":
      return (
        <div className="py-20 px-8 flex flex-col" style={sectionStyle}>
           <div className={`max-w-2xl mx-auto space-y-4 ${textAlignmentClass}`}>
              <h2 className={`text-3xl ${headingFont}`}>{content.headline || "Our Philosophy"}</h2>
              <p className={`text-sm opacity-70 leading-relaxed ${bodyFont}`}>{content.body || "Detailed editorial copy about the brand ethos."}</p>
           </div>
        </div>
      );

    case "BRAND_STORY":
       return (
         <div className="py-16 px-8 flex gap-8 items-center transition-all duration-500" style={sectionStyle}>
            <div className="w-1/2 aspect-square bg-beige rounded-2xl overflow-hidden relative" style={{ borderRadius: buttonRadius }}>
               <div 
                  className="absolute inset-0 bg-cover bg-center"
                  style={{ backgroundImage: `url('${getMediaUrl(content.image || "https://images.unsplash.com/photo-1601058269785-021c176e737c?q=80&w=2670&auto=format&fit=crop")}')` }}
               />
            </div>
            <div className={`w-1/2 space-y-4 flex flex-col ${textAlignmentClass}`}>
               <div className="w-8 h-[2px]" style={{ backgroundColor: style.textColor || primaryColor }} />
               <h2 className={`text-2xl leading-tight ${headingFont}`}>{content.headline || "Our Story"}</h2>
               <p className={`text-[10px] opacity-70 leading-relaxed line-clamp-4 ${bodyFont}`}>{content.body || "Legacy of craftsmanship..."}</p>
            </div>
         </div>
       );

    case "ACCORDION_FAQ":
      return (
        <div className="py-20 px-8" style={sectionStyle}>
          <div className={`max-w-3xl mx-auto mb-12 flex flex-col ${textAlignmentClass}`}>
            <h2 className={`text-3xl ${headingFont} mb-4`} style={{ color: style.textColor }}>{content?.headline || content?.title || "Frequently Asked Questions"}</h2>
            <p className={`text-sm opacity-70 ${bodyFont}`} style={{ color: style.textColor }}>{content?.subheadline || content?.description || "Find answers to common questions."}</p>
          </div>
          <div className="max-w-3xl mx-auto space-y-4">
            {(Array.isArray(content?.faqs) && content?.faqs.length > 0 ? content.faqs : [{ question: "Sample Question", answer: "Sample Answer content goes here." }]).map((faq: any, i: number) => (
              <div key={i} className="border-b border-gray-100 pb-6">
                <div className="flex items-center justify-between cursor-pointer group">
                  <h3 className={`text-sm font-bold uppercase tracking-widest ${headingFont}`} style={{ color: style.textColor }}>{faq.question || "Untitled Question"}</h3>
                  <div className="w-8 h-8 rounded-full border border-gray-100 flex items-center justify-center group-hover:bg-wine group-hover:text-white transition-all">
                    <span className="text-lg">+</span>
                  </div>
                </div>
                <div className={`mt-4 text-xs leading-relaxed opacity-60 ${bodyFont}`} style={{ color: style.textColor }}>{faq.answer || "No answer provided."}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "LEGAL_PROSE":
      return (
        <div className="py-20 px-10" style={{ ...sectionStyle, backgroundColor: sectionStyle.backgroundColor || '#ffffff' }}>
          <div className="max-w-4xl mx-auto">
            <h1 className={`text-4xl ${headingFont} mb-2`} style={{ color: style.textColor }}>{content?.title || content?.headline || "Legal Document"}</h1>
            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-12">Last Updated: {content?.lastUpdated || "April 2024"}</p>
            
            <div className="space-y-12">
              {(Array.isArray(content?.sections) && content?.sections.length > 0 ? content.sections : [{ title: "Overview", content: "Document content goes here..." }]).map((sec: any, i: number) => (
                <div key={i} className="space-y-4">
                  <h2 className={`text-lg font-bold uppercase tracking-widest ${headingFont}`} style={{ color: style.textColor }}>{sec.title}</h2>
                  <div 
                    className={`text-sm leading-relaxed opacity-80 ${bodyFont} prose prose-sm max-w-none`} 
                    style={{ color: style.textColor }}
                    dangerouslySetInnerHTML={{ __html: sec.content || "" }}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      );

    case "FAQ":
       return (
         <div className="py-16 px-8 max-w-3xl mx-auto space-y-8" style={sectionStyle}>
            <div className={`flex flex-col ${textAlignmentClass}`}>
              <h2 className={`text-2xl ${headingFont}`}>Common Questions</h2>
            </div>
            <div className="space-y-4">
               {[1,2,3].map(i => (
                 <div key={i} className="p-4 border-b border-black/5 flex justify-between items-center">
                    <span className="text-xs font-bold font-sans uppercase tracking-widest">Question {i}</span>
                    <div className="w-4 h-px bg-black/20" />
                 </div>
               ))}
            </div>
         </div>
       );

    case "PRODUCT_GRID":
       return (
         <div className="py-16 px-6 space-y-8 transition-all duration-500" style={sectionStyle}>
            <h2 className={`text-2xl flex flex-col ${textAlignmentClass} ${headingFont}`} style={{ color: style.textColor }}>{content.title || "New Arrivals"}</h2>
            <div className="grid grid-cols-2 gap-4">
               {[1,2,3,4].map(i => (
                 <div key={i} className={`space-y-3 ${bodyFont}`}>
                    <div className="aspect-[3/4] bg-beige/50 rounded-lg overflow-hidden relative" style={{ borderRadius: buttonRadius }}>
                       <img src={`https://images.unsplash.com/photo-1583391733958-d20f4c9c1b9b?q=80&w=600&auto=format&fit=crop`} className="w-full h-full object-cover opacity-90" />
                       <div className="absolute top-2 left-2 text-white text-[8px] px-1.5 py-0.5 rounded font-bold uppercase" style={{ backgroundColor: primaryColor }}>Bestseller</div>
                    </div>
                    <div className="space-y-1">
                       <div className="text-xs font-bold" style={{ color: style.textColor }}>Designer Piece {i}</div>
                       <div className="text-[10px] opacity-60" style={{ color: style.textColor }}>₹4,999</div>
                    </div>
                 </div>
               ))}
            </div>
         </div>
       );

    case "STORY_BANNER":
       return (
         <div 
          className="relative py-20 px-8 flex flex-col transition-all overflow-hidden border-y border-beige"
          style={sectionStyle}
         >
            <div 
               className="absolute inset-0 bg-cover bg-center opacity-30"
               style={{ backgroundImage: `url('${getMediaUrl(content.backgroundImage || "https://images.unsplash.com/photo-1601058269785-021c176e737c?q=80&w=2670&auto=format&fit=crop")}')` }}
            />
            <div className={`relative z-10 flex flex-col items-center bg-white/60 backdrop-blur-sm p-8 rounded-2xl ${textAlignmentClass}`} style={{ borderRadius: buttonRadius }}>
              <h2 className={`text-3xl leading-tight ${headingFont}`} style={{ color: style.textColor || primaryColor }}>
                 {content.headline || "Not Just Clothing. A Daily Comfort Ritual."}
              </h2>
              <p className={`text-sm font-sans leading-relaxed max-w-sm ${bodyFont}`} style={{ color: style.textColor ? `${style.textColor}99` : "rgba(0,0,0,0.6)" }}>
                 {content.subtext || "Crafted for women who embrace simplicity with confidence."}
              </p>
              <div className="w-8 h-[1px] bg-wine/20 mt-4" style={{ backgroundColor: style.textColor ? `${style.textColor}4D` : undefined }} />
            </div>
         </div>
       );

    case "CATEGORY_STRIP":
      return (
        <div className="py-10 px-6 border-b transition-all duration-500" style={{ ...sectionStyle, borderBottomColor: style.textColor ? `${style.textColor}1A` : "rgba(0,0,0,0.05)" }}>
          <div className="flex gap-4 overflow-hidden">
             {(content.categories || [1,2,3,4,5]).map((cat: any, i: number) => (
               <div key={i} className="flex-none w-28 space-y-4 flex flex-col items-center">
                  <div 
                    className="w-24 h-24 rounded-full bg-gray-100 border overflow-hidden relative"
                    style={{ borderColor: style.textColor ? `${style.textColor}1A` : "rgba(0,0,0,0.05)" }}
                  >
                     <img src={cat.image ? getMediaUrl(cat.image) : `https://images.unsplash.com/photo-1583391733958-d20f4c9c1b9b?q=80&w=400&auto=format&fit=crop`} className="absolute inset-0 w-full h-full object-cover" />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-tight opacity-70 ${bodyFont}`} style={{ color: style.textColor }}>{cat.name || "Category"}</span>
               </div>
             ))}
          </div>
        </div>
      );

    case "FEATURE_GRID":
      return (
        <div className="py-16 px-6" style={sectionStyle}>
          {content.headline && <h2 className={`text-2xl mb-10 flex flex-col ${textAlignmentClass} ${headingFont}`} style={{ color: style.textColor }}>{content.headline}</h2>}
          <div className="grid grid-cols-2 gap-4">
            {(content.features || [
              { icon: "✦", title: "Premium Fabrics", description: "Only the finest Dupion silk & cotton." },
              { icon: "✦", title: "Hand-Crafted", description: "Every stitch by artisanal hands." },
              { icon: "✦", title: "Worldwide Shipping", description: "Delivered anywhere." },
              { icon: "✦", title: "Easy Returns", description: "30-day no-questions-asked." },
            ]).map((f: any, i: number) => (
              <div key={i} className="flex flex-col gap-2 p-4 rounded-xl" style={{ backgroundColor: `${tokens.surface}`, border: `1px solid ${tokens.border}` }}>
                <div className="text-lg" style={{ color: primaryColor }}>{f.icon || "★"}</div>
                <p className={`text-xs font-bold uppercase tracking-wide ${headingFont}`} style={{ color: style.textColor }}>{f.title}</p>
                <p className={`text-[10px] opacity-60 leading-relaxed ${bodyFont}`} style={{ color: style.textColor }}>{f.description}</p>
              </div>
            ))}
          </div>
        </div>
      );

    case "IMAGE_ROW":
      const imageShape = content.imageShape || "round";
      let shapeClasses = "";
      if (imageShape === "round") shapeClasses = "rounded-full aspect-square object-cover";
      else if (imageShape === "rounded-square") shapeClasses = "rounded-2xl aspect-square object-cover";
      else if (imageShape === "square") shapeClasses = "aspect-square object-cover";
      else shapeClasses = "object-contain";

      return (
        <div className="py-16 px-6 overflow-hidden" style={sectionStyle}>
          {content.headline && (
            <h2 className={`text-2xl mb-12 flex flex-col ${textAlignmentClass} ${headingFont}`} style={{ color: style.textColor }}>
              {content.headline}
            </h2>
          )}
          <div className="flex justify-center items-center gap-8 md:gap-16 flex-wrap">
            {(content.images || []).map((img: any, i: number) => (
              <div key={i} className={`relative flex-shrink-0 ${imageShape === 'logo' ? 'w-24 md:w-32 h-16' : 'w-20 md:w-32 h-20 md:h-32'}`}>
                {img.url ? (
                  <img src={getMediaUrl(img.url)} alt="" className={`w-full h-full ${shapeClasses} shadow-sm`} />
                ) : (
                  <img src={`https://images.unsplash.com/photo-1583391733958-d20f4c9c1b9b?q=80&w=200`} alt="" className={`w-full h-full ${shapeClasses} shadow-sm opacity-80`} />
                )}
              </div>
            ))}
          </div>
        </div>
      );

    case "BANNER":
      return (
        <div className="relative w-full h-[40vh] overflow-hidden" style={sectionStyle}>
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: `url('${getMediaUrl(content.image || content.backgroundImage || "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=1200&auto=format&fit=crop")}')` }}
          />
          {content.overlay && <div className="absolute inset-0 bg-black/40" />}
          <div className={`relative z-10 h-full flex flex-col justify-center p-8 ${textAlignmentClass}`}>
            {content.headline && <h2 className={`text-3xl text-white ${headingFont}`}>{content.headline}</h2>}
            {content.subtext && <p className={`text-sm text-white/80 mt-2 ${bodyFont}`}>{content.subtext}</p>}
            {content.cta?.text && (
              <button className="mt-6 px-8 py-3 bg-white text-charcoal text-[10px] font-bold uppercase tracking-widest" style={{ borderRadius: buttonRadius }}>
                {content.cta.text}
              </button>
            )}
          </div>
        </div>
      );

    case "LOOKBOOK":
      return (
        <div className="py-12 px-6" style={sectionStyle}>
          <div className={`mb-8 flex flex-col ${textAlignmentClass}`}>
            <p className="text-[10px] uppercase tracking-widest mb-2 opacity-50" style={{ color: style.textColor }}>Shoppable</p>
            <h2 className={`text-2xl ${headingFont}`} style={{ color: style.textColor }}>{content.title || "Autumn Silk Series"}</h2>
            <p className={`text-xs opacity-60 mt-2 max-w-xs ${bodyFont}`} style={{ color: style.textColor }}>{content.description || "A study in drape."}</p>
          </div>
          <div className="relative rounded-2xl overflow-hidden">
            <div
              className="aspect-[16/7] bg-gray-100 bg-cover bg-center"
              style={{ backgroundImage: `url('${getMediaUrl(content.image || "https://images.unsplash.com/photo-1608226068884-bbdddef12f17?q=80&w=1200&auto=format&fit=crop")}')` }}
            />
            <div className="absolute inset-0 pointer-events-none">
              {(content.hotspots || []).map((h: any, i: number) => (
                <div
                  key={i}
                  className="absolute w-5 h-5 rounded-full border-2 border-white shadow-lg"
                  style={{ left: `${h.x}%`, top: `${h.y}%`, transform: "translate(-50%,-50%)", backgroundColor: primaryColor }}
                />
              ))}
            </div>
          </div>
        </div>
      );

    case "TESTIMONIALS":
      return (
        <div className="py-16 px-6" style={sectionStyle}>
          <h2 className={`text-2xl mb-10 flex flex-col ${textAlignmentClass} ${headingFont}`} style={{ color: style.textColor }}>
            {content?.headline || "Loved by Our Customers"}
          </h2>
          <div className={`grid gap-6 ${content?.variant === 'compact' ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
            {(Array.isArray(content?.testimonials) && content?.testimonials.length > 0 ? content.testimonials : [
              { name: "Priya V.", quote: "This is a masterpiece. The fabric feels like a dream.", rating: 5, city: "Chennai" },
              { name: "Aishwarya R.", quote: "I get compliments every time I wear this.", rating: 5, city: "Bengaluru" },
              { name: "Sneha M.", quote: "Perfect fit and amazing quality.", rating: 5, city: "Mumbai" },
            ]).map((t: any, i: number) => (
              <div key={i} className={`${content?.variant === 'compact' ? 'p-4' : 'p-6'} rounded-2xl relative transition-all hover:shadow-lg`} style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}` }}>
                <div className="flex gap-1 mb-3">
                  {Array.from({ length: t.rating || 5 }).map((_,s) => (
                    <span key={s} className="text-[10px]" style={{ color: primaryColor }}>★</span>
                  ))}
                </div>
                <p className={`${content?.variant === 'compact' ? 'text-[10px]' : 'text-xs'} italic leading-relaxed opacity-80 mb-4 ${bodyFont}`} style={{ color: style.textColor }}>"{t.quote}"</p>
                <div className="flex items-center gap-3">
                  {t.image ? (
                    <img src={getMediaUrl(t.image)} alt={t.name} className={`${content?.variant === 'compact' ? 'w-6 h-6' : 'w-8 h-8'} rounded-full object-cover`} />
                  ) : (
                    <div className={`${content?.variant === 'compact' ? 'w-6 h-6 text-[8px]' : 'w-8 h-8 text-xs'} rounded-full flex items-center justify-center text-white font-bold`} style={{ backgroundColor: primaryColor }}>
                      {(t.name || "U")[0]}
                    </div>
                  )}
                  <div>
                    <p className={`${content?.variant === 'compact' ? 'text-[9px]' : 'text-[10px]'} font-bold uppercase tracking-wide ${headingFont}`} style={{ color: style.textColor }}>{t.name}</p>
                    {t.city && <p className={`${content?.variant === 'compact' ? 'text-[7px]' : 'text-[9px]'} opacity-50`} style={{ color: style.textColor }}>{t.city}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "EDITORIAL":
      return (
        <div className="py-24 px-8 space-y-16" style={sectionStyle}>
          <div className={`max-w-4xl mx-auto flex flex-col ${textAlignmentClass} space-y-6`}>
             <p className="text-[10px] uppercase font-bold tracking-[0.4em] text-wine opacity-60">The Journal</p>
             <h2 className={`text-4xl md:text-5xl leading-tight ${headingFont}`} style={{ color: style.textColor }}>{content.title || "Woven Narratives"}</h2>
             <div className="w-12 h-px bg-charcoal/20" />
             <p className={`text-sm md:text-base opacity-70 leading-relaxed max-w-2xl font-serif italic ${bodyFont}`} style={{ color: style.textColor }}>
               {content.description || "Every thread tells a story of luxury and contemporary grace."}
             </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            <div className="md:col-span-7 aspect-[4/5] bg-ivory rounded-[3rem] overflow-hidden relative group">
               <div 
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-1000 group-hover:scale-105"
                  style={{ backgroundImage: `url('${getMediaUrl(content.mainImage || "https://images.unsplash.com/photo-1601058269785-021c176e737c?q=80&w=2670&auto=format&fit=crop")}')` }}
               />
               <div className="absolute inset-0 bg-black/5" />
            </div>
            <div className="md:col-span-5 space-y-8">
               <div className="aspect-square bg-ivory rounded-[2rem] overflow-hidden relative">
                  <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('${getMediaUrl(content.sideImage || "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=1200&auto=format&fit=crop")}')` }}
                  />
               </div>
               <div className="space-y-4">
                  <h3 className={`text-xl font-serif ${headingFont}`}>{content.subheadline || "The Artisanal Touch"}</h3>
                  <p className={`text-xs opacity-60 leading-relaxed ${bodyFont}`}>{content.subtext || "Our artisans spend weeks perfecting every intricate detail of the weave."}</p>
                  {content.linkText && (
                    <button className="mt-4 px-8 py-3 text-[10px] font-bold uppercase tracking-[0.2em] border border-charcoal/20 hover:bg-charcoal hover:text-white transition-all" style={{ borderRadius: buttonRadius }}>
                      {content.linkText}
                    </button>
                  )}
               </div>
            </div>
          </div>
        </div>
      );

    case "FEATURED_COLLECTION":
      return (
        <div className="py-16 px-6" style={sectionStyle}>
          <div className={`mb-10 flex flex-col ${textAlignmentClass}`}>
            <h2 className={`text-2xl ${headingFont}`} style={{ color: style.textColor }}>{content.title || "Featured Collections"}</h2>
            <p className={`text-xs opacity-60 mt-2 ${bodyFont}`} style={{ color: style.textColor }}>{content.description}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {(Array.isArray(content.collections) && content.collections.length > 0 ? content.collections : [
              { name: "Luxury Silks", image: "https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600" },
              { name: "Cotton Kurtis", image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600" },
              { name: "Palazzo Sets", image: "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=600" },
              { name: "Festive Edit", image: "https://images.unsplash.com/photo-1608226068884-bbdddef12f17?q=80&w=600" },
            ]).map((col: any, i: number) => (
              <div key={i} className="relative overflow-hidden rounded-2xl aspect-[3/4]">
                <img src={getMediaUrl(col.image)} alt={col.name} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-4 left-4">
                  <p className="text-white text-xs font-bold uppercase tracking-wide">{col.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "SMART_GRID":
      return (
        <div className="py-16 px-6" style={sectionStyle}>
          <div className={`mb-8 flex flex-col ${textAlignmentClass}`}>
            <div className="inline-flex items-center gap-2 mb-2">
              <div className="h-px w-5" style={{ backgroundColor: primaryColor }} />
              <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: primaryColor }}>AI Recommended</span>
            </div>
            <h2 className={`text-xl ${headingFont}`} style={{ color: style.textColor }}>{content.title || "Recommended For You"}</h2>
          </div>
          <div className="grid grid-cols-2 gap-4">
            {[1,2,3,4].map(i => (
              <div key={i}>
                <div className="aspect-[3/4] rounded-lg overflow-hidden relative" style={{ backgroundColor: tokens.surface, borderRadius: buttonRadius }}>
                  <img src={`https://images.unsplash.com/photo-1583391733958-d20f4c9c1b9b?q=80&w=400`} className="w-full h-full object-cover opacity-90" alt="" />
                  <div className="absolute top-2 left-2 px-2 py-0.5 text-white text-[8px] font-bold uppercase" style={{ backgroundColor: primaryColor, borderRadius: "3px" }}>Smart Pick</div>
                </div>
                <div className="mt-3 space-y-1">
                  <div className="h-2.5 w-3/4 rounded" style={{ backgroundColor: tokens.border }} />
                  <div className="h-2 w-1/3 rounded" style={{ backgroundColor: `${primaryColor}40` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      );

    case "AOV_BUNDLES":
      return (
        <div className="py-16 px-6" style={sectionStyle}>
          <div className={`mb-10 flex flex-col ${textAlignmentClass}`}>
            <h2 className={`text-2xl ${headingFont}`} style={{ color: style.textColor }}>{content?.headline || "Curated For You"}</h2>
            <p className={`text-xs opacity-60 mt-1 ${bodyFont}`} style={{ color: style.textColor }}>{content?.subheadline || "Value pairings."}</p>
          </div>
          <div className="space-y-3">
            {(Array.isArray(content?.bundles) && content?.bundles.length > 0 ? content.bundles : [{}, {}]).map((b: any, i: number) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl" style={{ backgroundColor: tokens.surface, border: `1px solid ${tokens.border}` }}>
                <div className="flex gap-2">
                  {[b?.image1, b?.image2].map((img: string, j: number) => (
                    <div key={j} className="w-14 h-14 rounded-lg overflow-hidden" style={{ backgroundColor: tokens.border }}>
                      <img src={img ? getMediaUrl(img) : `https://images.unsplash.com/photo-1583391733958-d20f4c9c1b9b?q=80&w=200`} alt="" className="w-full h-full object-cover opacity-90" />
                    </div>
                  ))}
                </div>
                <div className="flex-1 space-y-1">
                  <div className="h-2.5 w-2/3 rounded" style={{ backgroundColor: tokens.border }} />
                  <p className="text-[9px] font-bold" style={{ color: primaryColor }}>{b?.price || "₹999"}</p>
                </div>
                <div className="w-14 h-8 rounded" style={{ backgroundColor: primaryColor, borderRadius: buttonRadius }} />
              </div>
            ))}
          </div>
        </div>
      );

    case "SOCIAL_PROOF":
      return (
        <div className="py-16 px-6" style={sectionStyle}>
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-6">
            <div className={`flex flex-col ${textAlignmentClass} md:text-left md:items-start`}>
              <h2 className={`text-2xl ${headingFont}`} style={{ color: style.textColor }}>{content?.headline || "Styled by Real Women"}</h2>
              <p className={`text-xs opacity-60 mt-2 ${bodyFont}`} style={{ color: style.textColor }}>{content?.subtext}</p>
            </div>
            {content?.handleText && (
              <button 
                className="flex items-center gap-2 px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all hover:scale-105 active:scale-95"
                style={{ backgroundColor: primaryColor, color: "#fff", borderRadius: buttonRadius }}
              >
                Follow {content.handleText}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {(Array.isArray(content?.items) && content?.items.length > 0 ? content.items : Array.from({ length: 6 }, () => ({}))).map((item: any, i: number) => {
              const name = item.name && String(item.name).toLowerCase() !== "undefined" && String(item.name).toLowerCase() !== "null" 
                ? item.name 
                : "Raaghas Client";
              const city = item.city && String(item.city).toLowerCase() !== "undefined" && String(item.city).toLowerCase() !== "null" 
                ? item.city 
                : "India";
                
              return (
                <div key={i} className="aspect-[4/5] overflow-hidden rounded-2xl relative group/ugc shadow-sm border border-black/5">
                  <img src={item?.image ? getMediaUrl(item.image) : `https://images.unsplash.com/photo-1583391733958-d20f4c9c1b9b?q=80&w=400`} alt="" className="w-full h-full object-cover opacity-90" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover/ugc:opacity-100 transition-opacity" />
                  <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover/ugc:translate-y-0 transition-transform">
                    <p className="text-[9px] font-bold text-white uppercase tracking-widest truncate">{name}</p>
                    <p className="text-[8px] text-white/70 truncate">{city}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );

    case "CATEGORIES_MOSAIC":
      return (
        <div className="py-16 px-6" style={sectionStyle}>
          <div className={`mb-10 flex flex-col ${textAlignmentClass}`}>
            <h2 className={`text-2xl ${headingFont}`} style={{ color: style.textColor }}>{content.headline || "Curated Collections"}</h2>
            <p className={`text-xs opacity-60 mt-1 ${bodyFont}`} style={{ color: style.textColor }}>{content.subheadline}</p>
          </div>
          <div className="grid grid-cols-3 grid-rows-2 gap-3 h-[280px]">
            <div className="col-span-2 row-span-2 relative overflow-hidden rounded-2xl">
              <img src="https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?q=80&w=600" alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
              <div className="absolute bottom-4 left-4"><p className="text-white text-xs font-bold uppercase tracking-wide">Luxury Silks</p></div>
            </div>
            {["Cotton Kurtis", "Palazzo Sets"].map((label, i) => (
              <div key={i} className="relative overflow-hidden rounded-2xl">
                <img src={i === 0 ? "https://images.unsplash.com/photo-1595777457583-95e059d581b8?q=80&w=600" : "https://images.unsplash.com/photo-1610030469983-98e550d615e1?q=80&w=600"} alt={label} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                <div className="absolute bottom-2 left-2"><p className="text-white text-[9px] font-bold uppercase tracking-wide">{label}</p></div>
              </div>
            ))}
          </div>
        </div>
      );

    case "DEAL_BANNER":
      return (
        <div
          className="py-8 px-6 flex flex-col md:flex-row items-center justify-between gap-6 border-y"
          style={{ ...sectionStyle, borderColor: `${primaryColor}30`, backgroundColor: sectionStyle.backgroundColor || `${primaryColor}0D` }}
        >
          <div className="flex-1">
            <div className="inline-flex items-center gap-2 mb-2">
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: primaryColor }} />
              <span className="text-[9px] uppercase tracking-widest font-bold" style={{ color: primaryColor }}>Flash Sale</span>
              {content.endsText && (
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full text-white ml-1" style={{ backgroundColor: primaryColor }}>
                  {content.endsText}
                </span>
              )}
            </div>
            <h3 className={`text-xl leading-tight ${headingFont}`} style={{ color: style.textColor }}>
              {content.headline || "Everyday Essentials – Starting ₹599"}
            </h3>
            <p className={`text-[10px] opacity-60 mt-1 ${bodyFont}`} style={{ color: style.textColor }}>{content.subtext || "Only for Today"}</p>
          </div>
          <div className="flex items-center gap-3 flex-none">
            {content.discountCode && (
              <div className="px-4 py-2 border-2 border-dashed rounded-lg text-center" style={{ borderColor: primaryColor }}>
                <p className="text-[8px] uppercase tracking-widest opacity-50 mb-0.5">Use Code</p>
                <p className="text-sm font-black tracking-widest" style={{ color: primaryColor }}>{content.discountCode}</p>
              </div>
            )}
            <button
              className="px-6 py-3 text-white text-[10px] font-bold uppercase tracking-widest whitespace-nowrap shadow-lg"
              style={{ backgroundColor: primaryColor, borderRadius: buttonRadius }}
            >
              {content.ctaText || "Claim Offer"}
            </button>
          </div>
        </div>
      );

    case "CUSTOM_HTML":
      return (
        <div className="w-full overflow-hidden" style={sectionStyle}>
          <div 
            dangerouslySetInnerHTML={{ __html: content.html || "<!-- No HTML Provided -->" }} 
            className="w-full"
          />
        </div>
      );

    default:
      return (
        <div className="p-12 bg-gray-50 border-y border-gray-100 text-center transition-all duration-500" style={sectionStyle}>
          <p className="text-xs text-gray-400 font-mono uppercase tracking-widest">Preview for {type.replace(/_/g, ' ')} Section</p>
          <p className="text-[10px] text-gray-400 italic mt-1">High-fidelity visualization active</p>
        </div>
      );
  }
}

export default StorefrontPreview;
