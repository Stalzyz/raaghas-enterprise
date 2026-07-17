"use client";

import { HeroSection } from "./HeroSection";
import { FeatureGridSection } from "./FeatureGridSection";
import { BannerSection } from "./BannerSection";
import { FeaturedCollectionSection } from "./FeaturedCollectionSection";
import LookbookSection from "@/components/cms/LookbookSection";
import dynamic from 'next/dynamic';

const ProductGridSection = dynamic(() => import('./ProductGridSection').then(mod => mod.ProductGridSection));
const ProductScrollSection = dynamic(() => import('./ProductScrollSection').then(mod => mod.ProductScrollSection));

import { ErrorBoundary } from "../ErrorBoundary";

import { CategoriesMosaicSection } from "./CategoriesMosaicSection";
import { BrandStorySection } from "./BrandStorySection";
import { NewsletterSection } from "./NewsletterSection";
import { InstagramFeedSection } from "./InstagramFeedSection";
import { TrustBarSection } from "./TrustBarSection";
import { CategoryStripSection } from "./CategoryStripSection";
import { AovBundleSection } from "./AovBundleSection";
import { StoryBannerSection } from "./StoryBannerSection";
import { TestimonialSliderSection } from "./TestimonialSliderSection";
import { FaqSection } from "./FaqSection";
import { TextBlockSection } from "./TextBlockSection";
import { DealBannerSection } from "./DealBannerSection";
import { SocialProofSection } from "./SocialProofSection";
import { LegalProseSection } from "./LegalProseSection";
import { ImageRowSection } from "./ImageRowSection";
import { LogoCloudSection } from "./LogoCloudSection";
import { ImageScrollSection } from "./ImageScrollSection";

import { CategoryShowcase } from "./creative/CategoryShowcase";
import { EditorialSection } from "./creative/EditorialSection";
import { SocialProofSection as PremiumSocial } from "./creative/SocialProofSection";
import { NewsletterSection as PremiumNewsletter } from "./creative/NewsletterSection";

import ScrollReveal from "@/components/ui/ScrollReveal";

export function SectionRenderer({ sections }: { sections: any[] }) {
  const sorted = [...sections].sort((a, b) => a.order - b.order).map(s => ({
    ...s,
    content: s.content || {},
    style: s.style || {},
    settings: s.settings || {}
  }));

  return (
    <>
      {sorted.map((section) => {
        const renderSection = () => {
          switch (section.type) {
            case "HERO":
              return <HeroSection key={section.id} content={section.content} style={section.style} settings={section.settings} />;

            case "CATEGORY_SHOWCASE":
              return <CategoryShowcase key={section.id} content={section.content as any} />;

            case "EDITORIAL_STORY":
              return <EditorialSection key={section.id} content={section.content as any} />;

            case "PREMIUM_SOCIAL":
              return <PremiumSocial key={section.id} content={section.content as any} />;

            case "PREMIUM_NEWSLETTER":
              return <PremiumNewsletter key={section.id} content={section.content as any} />;

            case "FEATURED_COLLECTION":
            case "EDITORIAL":
              return <FeaturedCollectionSection key={section.id} content={section.content} />;

            case "FEATURE_GRID":
              return <FeatureGridSection key={section.id} content={section.content} />;

            case "IMAGE_ROW":
              return <ImageRowSection key={section.id} content={section.content} style={section.style} />;

            case "BANNER":
              return <BannerSection key={section.id} content={section.content} />;

            case "LOOKBOOK":
              if (section.content.scenes) {
                return <LookbookSection key={section.id} scenes={section.content.scenes} />;
              }
              return (
                <LookbookSection
                  key={section.id}
                  scenes={[{
                    image: section.content.image || "",
                    title: section.content.title || "",
                    description: section.content.description || "",
                    hotspots: section.content.hotspots || []
                  }]}
                />
              );

            case "PRODUCT_GRID":
            case "SMART_GRID":
              return <ProductGridSection key={section.id} content={section.content} style={section.style} />;

            case "PRODUCT_SCROLL":
              return <ProductScrollSection key={section.id} content={section.content} style={section.style} />;

            case "TRUST_BAR":
              return <TrustBarSection key={section.id} content={section.content} />;

            case "CATEGORY_STRIP":
              return <CategoryStripSection key={section.id} content={section.content} style={section.style} />;

            case "AOV_BUNDLES":
              return <AovBundleSection key={section.id} content={section.content} />;

            case "STORY_BANNER":
              return <StoryBannerSection key={section.id} content={section.content} />;

            case "BRAND_STORY":
              return <BrandStorySection key={section.id} content={section.content} style={section.style} />;

            case "SOCIAL_PROOF":
              return <SocialProofSection key={section.id} content={section.content} />;

            case "INSTAGRAM_FEED":
              return <InstagramFeedSection key={section.id} content={section.content} />;

            case "DEAL_BANNER":
              return <DealBannerSection key={section.id} content={section.content} />;

            case "TESTIMONIALS":
              return <TestimonialSliderSection key={section.id} content={section.content} style={section.style} />;

            case "NEWSLETTER":
              return <NewsletterSection key={section.id} content={section.content} />;

            case "FAQ":
              return <FaqSection key={section.id} content={section.content} />;

            case "TEXT_BLOCK":
              return <TextBlockSection key={section.id} content={section.content} />;

            case "CATEGORIES_MOSAIC":
              return <CategoriesMosaicSection key={section.id} content={section.content} />;

            case "LEGAL_PROSE":
              return <LegalProseSection key={section.id} content={section.content} />;

            case "ACCORDION_FAQ":
              return <FaqSection key={section.id} content={section.content} />;

            case "LOGO_CLOUD":
              return <LogoCloudSection key={section.id} content={section.content} settings={section.settings} />;

            case "IMAGE_SCROLL":
              return <ImageScrollSection key={section.id} content={section.content} settings={section.settings} />;

            case "ANNOUNCEMENT_MARQUEE": {
              const items: string[] = section.content?.items || [
                "✨ Share Your Favourite Styles",
                "Earn Reward Credits",
                "Redeem on Every Purchase",
                "Invite Friends",
                "Unlock Exclusive Member Rewards",
              ];
              const speed = section.content?.speed || 30;
              return (
                <div key={section.id} className="w-full overflow-hidden border-y border-white/10" style={{ backgroundColor: section.style?.backgroundColor || 'transparent', padding: '12px 0' }}>
                  <div style={{ display: 'flex', width: 'max-content', animation: `marqueeScroll ${speed}s linear infinite` }}>
                    {[0, 1].map((rep) => (
                      <div key={rep} style={{ display: 'inline-flex', alignItems: 'center', gap: '24px', padding: '0 12px', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 500, color: section.style?.textColor || 'inherit' }}>
                        {items.map((item, i) => (
                          <>
                            <span key={`${rep}-${i}`}>{item}</span>
                            <span style={{ opacity: 0.4 }}>•</span>
                          </>
                        ))}
                      </div>
                    ))}
                  </div>
                  <style>{`@keyframes marqueeScroll { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>
                </div>
              );
            }

            case "CUSTOM_HTML": {
              const safeHtml = (section.content?.html || "")
                .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
              
              return (
                <div 
                  key={section.id} 
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: safeHtml }} 
                />
              );
            }

            default:
              return null;
          }
        };

        if (section.type === "HERO") return <ErrorBoundary key={section.id}>{renderSection()}</ErrorBoundary>;
        
        const isGlassMode = section.style?.layout === "glass";
        const hasGrain = section.style?.texture === "grain";
        
        return (
          <ScrollReveal 
            key={section.id}
            animation={section.settings?.animation || "slide-up"}
            duration={section.settings?.speed === 'fast' ? 0.4 : section.settings?.speed === 'slow' ? 1.2 : 0.8}
            delay={section.settings?.delay}
          >
            <div 
              style={{ 
                backgroundColor: (section.type === "CUSTOM_HTML" || section.style?.backgroundColor === "#ffffff") ? "transparent" : (section.style?.backgroundColor || "transparent"),
                color: (section.type === "CUSTOM_HTML" || section.style?.textColor === "#2D2926") ? "inherit" : (section.style?.textColor || "inherit"),
                paddingTop: section.style?.paddingTop,
                paddingBottom: section.style?.paddingBottom,
                marginTop: section.style?.marginTop,
                marginBottom: section.style?.marginBottom,
              }}
              className={`
                ${section.style?.pattern === 'vines' ? 'pattern-kalamkari-vines' : section.style?.pattern === 'sand' ? 'pattern-luxury-sand' : ''}
                ${isGlassMode ? 'glass-section border-y border-white/10 my-12' : ''}
                ${hasGrain ? 'luxury-grain' : ''}
                relative
              `}
            >
              {isGlassMode && (
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
              )}
              <ErrorBoundary>
                {renderSection()}
              </ErrorBoundary>
            </div>
          </ScrollReveal>
        );
      })}
    </>
  );
}
