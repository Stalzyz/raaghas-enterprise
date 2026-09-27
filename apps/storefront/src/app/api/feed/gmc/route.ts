import { API_URL } from "@/lib/api";
import { getAssetUrl } from "@/lib/utils/assets";

export const revalidate = 3600;

export async function GET() {
  try {
    const res = await fetch(`${API_URL}/api/v1/products?status=ACTIVE&limit=1000`, { 
      next: { revalidate: 3600 } 
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch products: ${res.statusText}`);
    }

    const { items: products } = await res.json();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://raaghas.in";

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss xmlns:g="http://base.google.com/ns/1.0" version="2.0">
  <channel>
    <title>Raaghas</title>
    <link>${appUrl}</link>
    <description>Premium Casual &amp; Office Wear from Raaghas</description>
`;

    for (const product of products) {
      if (!product.variants || product.variants.length === 0) continue;

      const variant = product.variants[0];
      const link = `${appUrl}/products/${product.handle}`;
      const imageLink = getAssetUrl(product.images?.[0]?.url) || `${appUrl}/og-image.jpg`;
      const price = variant.price;
      const availability = (variant.availableStock ?? variant.inventory ?? 0) > 0 ? "in_stock" : "out_of_stock";
      
      const condition = "new";
      const brand = "Raaghas";
      const id = variant.sku || variant.id;

      // Escape special characters for XML
      const title = (product.title || "").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      const description = (product.description || "").replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
      
      xml += `    <item>
      <g:id>${id}</g:id>
      <g:title>${title}</g:title>
      <g:description>${description}</g:description>
      <g:link>${link}</g:link>
      <g:image_link>${imageLink}</g:image_link>
      <g:condition>${condition}</g:condition>
      <g:availability>${availability}</g:availability>
      <g:price>${price} INR</g:price>
      <g:brand>${brand}</g:brand>
      <g:item_group_id>${product.id}</g:item_group_id>
    </item>
`;
    }

    xml += `  </channel>
</rss>`;

    return new Response(xml, {
      status: 200,
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=1800",
      },
    });
  } catch (error) {
    console.error("Error generating GMC feed:", error);
    return new Response("Error generating feed", { status: 500 });
  }
}
