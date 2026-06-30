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
          
          {showSocials && socialLinks.length > 0 && (
             <div className="flex gap-4 pt-4">
                {socialLinks.map(social => (
                   <a key={social.label} href={social.url} target="_blank" rel="noreferrer" className="text-theme-text-muted hover:text-primary transition-colors">
                      <span className="text-[10px] uppercase font-bold tracking-widest">{social.label}</span>
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
                    <li><a href="/orders/track" className="text-xs text-theme-text-muted hover:text-primary transition-colors">Track Order</a></li>
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

      <div className="max-w-7xl mx-auto border-t border-theme-border mt-16 pt-8 flex flex-col md:flex-row justify-between items-center gap-4 text-[10px] text-theme-text/40 uppercase tracking-widest">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <span>{copyright}</span>
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
            href="https://wa.me/919042583701?text=Hi%20Grekam%20Visuals,%20I%20want%20to%20build%20an%20e-commerce%20store%20for%20my%20business!" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="hover:text-theme-text transition-all text-[9px] sm:text-[10px] flex items-center gap-1 group"
          >
            Want a store like this? WhatsApp Grekam Visuals to build yours <span className="group-hover:translate-x-1 transition-transform inline-block">→</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

