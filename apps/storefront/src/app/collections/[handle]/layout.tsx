import { Metadata } from "next";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? "http://localhost:6005" : "https://api.raaghas.in");

async function getCollection(handle: string) {
  try {
    const res = await fetch(`${API_URL}/api/v1/collections/${encodeURIComponent(handle)}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.success === false) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const collection = await getCollection(handle);
  
  if (!collection) return { title: "Collection Not Found" };

  const title = `${collection.title} Collection | Raaghas`;
  const description = collection.description || `Explore our premium ${collection.title.toLowerCase()} collection. Curated for elegance, comfort, and timeless luxury.`;
  const imageUrl = collection.bannerUrl || collection.thumbnailUrl;

  return {
    title,
    description,
    openGraph: {
      type: "website",
      url: `https://raaghas.in/collections/${collection.handle}`,
      title,
      description,
      images: imageUrl ? [{ url: imageUrl, alt: collection.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: imageUrl ? [imageUrl] : [],
    }
  };
}

export default function CollectionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
