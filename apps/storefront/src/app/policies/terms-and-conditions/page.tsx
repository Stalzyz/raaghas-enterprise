import { API_URL } from "@/lib/api";

import Link from "next/link";
import { LegalProseSection } from "@/components/sections/LegalProseSection";


export async function generateMetadata() {
  try {
    const res = await fetch(`${API_URL}/cms/pages/terms-and-conditions`, { cache: "no-store" });
    if (res.ok) {
      const page = await res.json();
      return {
        title: page.metaTitle || "Terms & Conditions | Raaghas",
        description: page.metaDescription || "Raaghas terms and conditions – read our terms of service for our luxury ethnic wear platform.",
      };
    }
  } catch {}
  return {
    title: "Terms & Conditions | Raaghas",
    description: "Raaghas terms and conditions – read our terms of service for our luxury ethnic wear platform.",
  };
}

export default async function TermsPage() {
  let cmsContent: any = null;

  try {
    const res = await fetch(`${API_URL}/cms/pages/terms-and-conditions`, { cache: "no-store" });
    if (res.ok) {
      const page = await res.json();
      if (page?.sections?.[0]?.content) {
        cmsContent = page.sections[0].content;
      }
    }
  } catch {}

  return (
    <div className="min-h-screen bg-theme-bg pt-44 md:pt-48 pb-32 px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-wine mb-4">Legal</p>
          <h1 className="text-5xl font-serif text-theme-text mb-4">Terms &amp; Conditions</h1>
          {cmsContent?.lastUpdated && (
            <p className="text-theme-text-muted text-sm">Last updated: {cmsContent.lastUpdated}</p>
          )}
        </div>

        {cmsContent ? (
          <LegalProseSection content={cmsContent} />
        ) : (
          <div className="space-y-10 text-theme-text-muted leading-relaxed text-sm bg-theme-surface p-10 md:p-14 rounded-[40px] border border-theme-border shadow-xl">
            <p className="text-center text-gray-400">Loading policy content... Please refresh the page.</p>
          </div>
        )}

        <div className="mt-12 flex justify-center gap-8">
          <Link href="/policies/return-policy" className="text-xs text-wine hover:underline uppercase tracking-widest font-bold">← Return Policy</Link>
          <Link href="/policies/privacy-policy" className="text-xs text-wine hover:underline uppercase tracking-widest font-bold">Privacy Policy →</Link>
        </div>
      </div>
    </div>
  );
}
