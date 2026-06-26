export const dynamic = 'force-dynamic';
import { API_URL } from "@/lib/api";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

export const revalidate = 3600;

export default async function CollectionsPage() {
  let collections = [];
  try {
    const res = await fetch(`${API_URL}/api/v1/products/collections`, { next: { revalidate: 3600 } });
    if (res.ok) collections = await res.json();
  } catch (err) {
    console.error("Failed to fetch collections", err);
  }

  // Filter out the virtual ones if they clutter
  const validCollections = collections.filter((c: any) => !c.isVirtual);

  return (
    <div className="pt-44 md:pt-48 pb-24 px-6 md:px-12 max-w-7xl mx-auto min-h-[60vh]">
      <div className="mb-12">
        <h1 className="text-4xl md:text-5xl font-serif text-theme-text mb-4">Our Collections</h1>
        <p className="text-sm text-theme-text-muted max-w-2xl">
          Discover curated edits designed for every occasion. From timeless classics to modern silhouettes, find your perfect piece.
        </p>
      </div>

      {validCollections.length === 0 ? (
        <div className="text-center py-20 text-theme-text-muted font-serif italic">
          No collections found at the moment.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {validCollections.map((col: any) => (
            <Link key={col.id} href={`/collections/${col.handle}`} className="group block">
              <div className="bg-theme-surface border border-theme-border rounded-full px-4 py-6 md:py-8 text-center flex flex-col items-center justify-center transition-all duration-300 hover:border-primary hover:bg-primary group-hover:shadow-lg group-hover:-translate-y-1">
                <h3 className="text-xs md:text-sm font-bold uppercase tracking-widest text-theme-text group-hover:text-theme-bg transition-colors">
                  {col.title}
                </h3>
                {col._count?.products !== undefined && (
                  <p className="text-[9px] uppercase tracking-widest font-bold text-theme-text-muted group-hover:text-theme-bg/80 mt-2 transition-colors">
                    {col._count.products} {col._count.products === 1 ? 'Item' : 'Items'}
                  </p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
