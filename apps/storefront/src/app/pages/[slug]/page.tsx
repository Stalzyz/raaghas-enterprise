import { API_URL } from "@/lib/api";

import { Metadata } from "next";
import { notFound } from "next/navigation";
import { SectionRenderer } from "@/components/sections/SectionRenderer";


async function getPage(slug: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/cms/pages/${slug}`, {
      cache: "no-store", // Always fetch fresh to reflect CMS changes immediately
    });
    
    if (!res.ok) return null;
    return res.json();
  } catch (err) {
    console.error("Failed to fetch page:", err);
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPage(slug);
  if (!page) return { title: "Page Not Found" };

  return {
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    openGraph: {
      images: page.ogImage ? [{ url: page.ogImage }] : [],
    }
  };
}

export default async function DynamicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = await getPage(slug);

  if (!page || (page.status !== 'PUBLISHED' && process.env.NODE_ENV === 'production')) {
    notFound();
  }

  return (
    <div className="flex-1 pt-24 pb-12">
      <SectionRenderer sections={page.sections} />
    </div>
  );
}
