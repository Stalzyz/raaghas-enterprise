import { API_URL } from "@/lib/api";

import Link from "next/link";
import { LegalProseSection } from "@/components/sections/LegalProseSection";


export async function generateMetadata() {
  try {
    const res = await fetch(`${API_URL}/cms/pages/return-policy`, { cache: "no-store" });
    if (res.ok) {
      const page = await res.json();
      return {
        title: page.metaTitle || "Return & Refund Policy | Raaghas",
        description: page.metaDescription || "Raaghas return and refund policy – learn about our hassle-free return process for luxury ethnic wear.",
      };
    }
  } catch {}
  return {
    title: "Return & Refund Policy | Raaghas",
    description: "Raaghas return and refund policy – learn about our hassle-free return process for luxury ethnic wear.",
  };
}

export default async function ReturnPolicyPage() {
  let cmsContent: any = null;

  try {
    const res = await fetch(`${API_URL}/cms/pages/return-policy`, { cache: "no-store" });
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
          <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-wine mb-4">Customer Care</p>
          <h1 className="text-5xl font-serif text-theme-text mb-4">Return &amp; Refund Policy</h1>
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

        <div className="mt-12 text-center">
          <Link href="/policies/terms-and-conditions" className="text-xs text-wine hover:underline uppercase tracking-widest font-bold">Terms &amp; Conditions →</Link>
        </div>
      </div>
    </div>
  );
}
