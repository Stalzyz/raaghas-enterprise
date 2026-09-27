export function Footer({ 
  settings, 
  theme: themeConfig,
  shopMenu,
  helpMenu,
  brandMenu
}: { 
  settings: any, 
  theme: any,
  shopMenu?: any,
  helpMenu?: any,
  brandMenu?: any
}) {
  const footerConfig = themeConfig?.footerConfig;
  
  const storeName = themeConfig?.storeName || settings?.storeName || "RAAGHAS";
  const tagline = footerConfig?.tagline || themeConfig?.footerTagline || settings?.tagline || "Luxury ethnic wear crafted for the moments that matter most.";
  const copyright = footerConfig?.bottomBar?.copyright || themeConfig?.footerText || settings?.footerCopyright || `© ${new Date().getFullYear()} ${storeName}. All rights reserved.`;

  const socialLinks = [];
  const s = themeConfig || settings || {};
  const showSocials = footerConfig?.socials?.show !== false && themeConfig?.showSocialsInFooter !== false;

  if (showSocials) {
    if (s.instagramUrl) socialLinks.push({ label: "Instagram", url: s.instagramUrl });
    if (s.facebookUrl) socialLinks.push({ label: "Facebook", url: s.facebookUrl });
    if (s.twitterUrl) socialLinks.push({ label: "Twitter", url: s.twitterUrl });
    if (s.pinterestUrl) socialLinks.push({ label: "Pinterest", url: s.pinterestUrl });
    if (s.youtubeUrl) socialLinks.push({ label: "YouTube", url: s.youtubeUrl });
  }

  const showPaymentIcons = footerConfig?.bottomBar?.showPaymentIcons !== false;

  return (
    <footer className="bg-theme-surface text-theme-text pt-20 pb-[300px] md:pb-24 px-6 md:px-12 mt-auto border-t border-theme-border">
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12">
        <div className="col-span-2 md:col-span-1 lg:col-span-2 space-y-4">
          <p className="text-2xl font-serif tracking-widest uppercase">
            {((footerConfig?.logo?.show !== false) && (themeConfig?.logoLight || settings?.logoUrl)) ? (
              <img src={themeConfig?.logoLight || settings?.logoUrl} alt={storeName} className="h-8 object-contain opacity-90 dark:invert" />
            ) : (
              storeName
            )}
          </p>
          <p className="text-theme-text-muted text-xs leading-relaxed max-w-[300px]">{tagline}</p>
          <div className="pt-2 space-y-1">
            <a href="https://wa.me/916360664805?text=Hi%20Raaghas,%20I%20need%20help%20with%20my%20order!" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 text-xs font-medium hover:text-[#25D366] transition-colors">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.487-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
              WhatsApp Support
            </a>
            <p className="text-[11px] text-theme-text-muted leading-relaxed">
              WhatsApp automation powered by{" "}
              <a 
                href="https://www.grafty.pro" 
                target="_blank" 
                rel="noopener" 
                title="Grafty Pro - WhatsApp Automation Tool Tamil Nadu"
                className="font-medium hover:underline text-primary/90"
              >
                Grafty.pro
              </a>{" "}
              (Tamil Nadu)
            </p>
          </div>
          
          {showSocials && socialLinks.length > 0 && (
             <div className="flex gap-4 pt-4">
                {socialLinks.map(social => (
                   <a key={social.label} href={social.url} target="_blank" rel="noreferrer" className="text-theme-text-muted hover:text-primary transition-colors">
                      <span className="text-xs font-semibold">{social.label}</span>
                   </a>
                ))}
             </div>
          )}
        </div>
        
        {footerConfig?.columns ? (
          footerConfig.columns.map((column: any) => (
            <div key={column.id} className="space-y-4">
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary/60">{column.title}</p>
              <ul className="space-y-2">
                {column.items.map((item: any) => (
                  <li key={item.id}><a href={item.url} className="text-xs text-theme-text-muted hover:text-primary transition-colors">{item.label}</a></li>
                ))}
              </ul>
            </div>
          ))
        ) : (
          <>
            {/* Fallback Legacy Columns */}
            <div className="space-y-4">
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary/60">Shop</p>
              <ul className="space-y-2">
                <li><a href="/about" className="text-xs text-theme-text-muted hover:text-primary transition-colors">Our Story</a></li>
                <li><a href="/collections/all" className="text-xs text-theme-text-muted hover:text-primary transition-colors">New Arrivals</a></li>
                <li><a href="/collections" className="text-xs text-theme-text-muted hover:text-primary transition-colors">Collections</a></li>
                <li><a href="/wholesale/register" className="text-xs text-theme-text-muted hover:text-primary transition-colors">Wholesale</a></li>
              </ul>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary/60">Help & Info</p>
              <ul className="space-y-2">
                {helpMenu?.items?.length > 0 ? (
                  helpMenu.items.map((item: any) => (
                    <li key={item.id}>
                      <a href={item.url} className="text-xs text-theme-text-muted hover:text-primary transition-colors">
                        {item.label}
                      </a>
                    </li>
                  ))
                ) : (
                  <>
                    <li><a href="/tracking" className="text-xs text-theme-text-muted hover:text-primary transition-colors">Track Order</a></li>
                    <li><a href="/support" className="text-xs text-theme-text-muted hover:text-primary transition-colors">Support</a></li>
                  </>
                )}
              </ul>
            </div>

            <div className="space-y-4">
              <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-primary/60">Legal</p>
              <ul className="space-y-2">
                <li><a href="/policies/return-policy" className="text-xs text-theme-text-muted hover:text-primary transition-colors">Return Policy</a></li>
                <li><a href="/policies/terms-and-conditions" className="text-xs text-theme-text-muted hover:text-primary transition-colors">Terms & Conditions</a></li>
                <li><a href="/policies/privacy-policy" className="text-xs text-theme-text-muted hover:text-primary transition-colors">Privacy Policy</a></li>
              </ul>
            </div>
          </>
        )}
      </div>

      {themeConfig?.customFooterHtml && (
        <div 
          className="max-w-7xl mx-auto mt-16 pt-8 border-t border-theme-border"
          dangerouslySetInnerHTML={{ __html: themeConfig.customFooterHtml }} 
        />
      )}

      <div className="max-w-7xl mx-auto border-t border-theme-border mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-theme-text/50">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <span>{copyright}</span>
          <span className="hidden md:inline text-theme-text/30">•</span>
          <span className="text-[11px]">
            WhatsApp Automation by{" "}
            <a 
              href="https://www.grafty.pro" 
              target="_blank" 
              rel="noopener"
              title="Grafty Pro - WhatsApp Automation Tool Tamil Nadu"
              className="font-medium hover:underline hover:text-primary transition-colors"
            >
              Grafty.pro Tamil Nadu
            </a>
          </span>
          {showPaymentIcons && (
            <div className="flex gap-2 opacity-50 grayscale hover:grayscale-0 transition-all">
              <img src="https://upload.wikimedia.org/wikipedia/commons/5/5e/Visa_Inc._logo.svg" className="h-3" alt="Visa" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/2/2a/Mastercard-logo.svg" className="h-3" alt="Mastercard" />
              <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/UPI-Logo-vector.svg" className="h-3" alt="UPI" />
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-right">
          <a 
            href="https://atlas.grekam.in/build-ecommerce" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="group transition-all text-[11px] sm:text-[13px] flex items-center gap-1.5 font-semibold px-3 py-1.5 rounded-full
              bg-wine/10 hover:bg-wine/20 text-wine hover:text-wine border border-wine/20 hover:border-wine/40
              dark:bg-[#F4F1ED]/10 dark:hover:bg-[#F4F1ED]/20 dark:text-[#F4F1ED] dark:hover:text-white dark:border-[#F4F1ED]/20 dark:hover:border-[#F4F1ED]/50"
          >
            Want a store like this? <span className="underline underline-offset-2">Build yours with Grekam</span> <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

