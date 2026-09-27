import { MetadataRoute } from 'next';
import { API_URL } from '@/lib/api';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://raaghas.in';
  
  // Base routes
  const staticRoutes = [
    '',
    '/about',
    '/collections/all',
    '/pages/shipping',
    '/pages/returns',
    '/pages/size-guide',
  ].map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: route === '' ? 1 : 0.8,
  }));

  const dynamicRoutes: MetadataRoute.Sitemap = [];

  try {
    const fetchWithTimeout = async (url: string, timeout = 5000) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeout);
      try {
        const response = await fetch(url, { signal: controller.signal, next: { revalidate: 3600 } });
        clearTimeout(id);
        return response;
      } catch (e) {
        clearTimeout(id);
        return null;
      }
    };

    // Fetch dynamic products
    const productsRes = await fetchWithTimeout(`${API_URL}/api/v1/products?status=ACTIVE&limit=1000`);
    if (productsRes && productsRes.ok) {
      const { items } = await productsRes.json();
      if (items && Array.isArray(items)) {
        items.forEach((product: any) => {
          dynamicRoutes.push({
            url: `${baseUrl}/products/${product.handle}`,
            lastModified: new Date(product.updatedAt || new Date()),
            changeFrequency: 'daily' as const,
            priority: 0.9,
          });
        });
      }
    }

    // Fetch collections
    const collectionsRes = await fetchWithTimeout(`${API_URL}/api/v1/products/collections`);
    if (collectionsRes && collectionsRes.ok) {
      const collections = await collectionsRes.json();
      if (Array.isArray(collections)) {
        collections.forEach((collection: any) => {
          dynamicRoutes.push({
            url: `${baseUrl}/collections/${collection.handle}`,
            lastModified: new Date(collection.updatedAt || new Date()),
            changeFrequency: 'weekly' as const,
            priority: 0.8,
          });
        });
      }
    }

    // Fetch custom pages
    const pagesRes = await fetchWithTimeout(`${API_URL}/api/v1/cms/pages`);
    if (pagesRes && pagesRes.ok) {
      const pages = await pagesRes.json();
      if (Array.isArray(pages)) {
        pages.forEach((page: any) => {
          if (page.status === 'PUBLISHED') {
            dynamicRoutes.push({
              url: `${baseUrl}/pages/${page.handle}`,
              lastModified: new Date(page.updatedAt || new Date()),
              changeFrequency: 'monthly' as const,
              priority: 0.7,
            });
          }
        });
      }
    }

  } catch (error) {
    console.error('Error generating dynamic sitemap:', error);
  }

  return [...staticRoutes, ...dynamicRoutes];
}
