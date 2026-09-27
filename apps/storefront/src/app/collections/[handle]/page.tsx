import { Metadata } from 'next';
import { API_URL } from '@/lib/api';
import CollectionClient from './CollectionClient';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);
  
  if (decodedHandle === 'all') {
    return {
      title: "All Collections",
      description: "Explore our premium collection of casual and office wear.",
    };
  }

  try {
    const res = await fetch(`${API_URL}/api/v1/products/collections/${decodedHandle}`, { next: { revalidate: 3600 } });
    if (res.ok) {
      const collection = await res.json();
      return {
        title: collection.metaTitle || `${collection.title} Collection`,
        description: collection.metaDescription || collection.description || `Shop the latest ${collection.title} collection at Raaghas.`,
        openGraph: {
          title: collection.metaTitle || `${collection.title} Collection`,
          description: collection.metaDescription || collection.description || `Shop the latest ${collection.title} collection at Raaghas.`,
          images: collection.image ? [{ url: collection.image }] : [],
        }
      };
    }
  } catch (e) {
    console.error("Failed to generate metadata for collection", e);
  }

  return {
    title: `${decodedHandle.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`,
  };
}

export default async function CollectionPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const decodedHandle = decodeURIComponent(handle);
  
  let collectionData = null;

  if (decodedHandle !== 'all') {
    try {
      const res = await fetch(`${API_URL}/api/v1/products/collections/${decodedHandle}`, { next: { revalidate: 3600 } });
      if (res.ok) {
        collectionData = await res.json();
      }
    } catch (e) {
      console.error("Failed to fetch collection data", e);
    }
  }

  return (
    <CollectionClient handle={handle} initialCollection={collectionData} />
  );
}
