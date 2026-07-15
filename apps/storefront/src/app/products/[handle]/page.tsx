import { API_URL } from "@/lib/api";

import { notFound, redirect } from "next/navigation";
import ProductGallery from "@/components/products/ProductGallery";
import ProductInfo from "@/components/products/ProductInfo";
import EnsembleCurator from "@/components/products/EnsembleCurator";
import BundleBuilder from "@/components/products/BundleBuilder";
import RelatedProducts from "@/components/products/RelatedProducts";
import { StickyAddToCart } from "@/components/cro/StickyAddToCart";
import ReviewList from "@/components/reviews/ReviewList";
import ReviewForm from "@/components/reviews/ReviewForm";
import { Metadata } from "next";
import ViewContentTracker from "@/components/analytics/ViewContentTracker";

import { getAssetUrl } from "@/lib/utils/assets";
import Breadcrumb from "@/components/layout/Breadcrumb";


async function getProduct(handle: string) {
  const url = `${API_URL}/api/v1/products/${encodeURIComponent(handle)}`;
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (res.status === 404) return { notFound: true };
    if (!res.ok) throw new Error("API error");
    const data = await res.json();
    if (data.success === false) return { notFound: true };
    return data;
  } catch (err) {
    console.error("Failed to fetch product:", err);
    return { error: true };
  }
}

export async function generateMetadata({ params }: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product || product.notFound || product.error) return { title: "Product Not Found" };

  const imageUrl = getAssetUrl(product.images?.[0]?.url);
  
  return {
    title: `${product.title} | Raaghas`,
    description: product.description || `Handcrafted high-luxury ethnic wear from Raaghas.`,
    openGraph: {
      type: "website",
      url: `https://raaghas.in/products/${product.handle}`,
      title: `${product.title} | Raaghas`,
      description: product.description || `Handcrafted high-luxury ethnic wear from Raaghas.`,
      images: imageUrl ? [{ url: imageUrl, width: 1080, height: 1080, alt: product.title }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title: product.title,
      description: product.description || `Handcrafted high-luxury ethnic wear from Raaghas.`,
      images: imageUrl ? [imageUrl] : [],
    }
  };
}

export default async function ProductPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const product = await getProduct(handle);

  if (product?.notFound) {
    redirect("/collections/all");
  }

  if (product?.error || !product) {
    return (
      <div className="min-h-screen flex items-center justify-center pt-24 pb-12">
        <div className="text-center">
          <h1 className="text-2xl font-serif text-charcoal mb-4">Temporarily Unavailable</h1>
          <p className="text-charcoal/60 mb-8">We are having trouble loading this product. Please try again later.</p>
          <a href="/collections/all" className="luxury-button">Return to Collections</a>
        </div>
      </div>
    );
  }

  const stickyProps = {
    id: product.id,
    variantId: product.variants?.[0]?.id || "",
    name: product.title,
    image: getAssetUrl(product.images?.[0]?.url),
    price: product.variants?.[0]?.price ? `₹${Number(product.variants[0].price).toLocaleString()}` : "Price on Request",
    handle: product.handle,
    // BUG-004 FIX: Use availableStock (inventory - active reservations), not raw inventory
    // The API must return availableStock. Fall back to inventory if missing (older API response).
    isOutOfStock: (product.variants?.[0]?.availableStock ?? product.variants?.[0]?.inventory ?? 0) <= 0
  };

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Product",
      "name": product.title,
      "image": (product.images || []).map((img: any) => img.url),
      "description": product.description || "Premium ethnic wear from Raaghas, India's leading luxury brand for premium casual and office wear.",
      "sku": product.variants?.[0]?.sku,
      "brand": {
        "@type": "Brand",
        "name": "Raaghas"
      },
      "offers": {
        "@type": "Offer",
        "url": `${process.env.NEXT_PUBLIC_APP_URL || 'https://raaghas.in'}/products/${product.handle}`,
        "priceCurrency": "INR",
        "price": product.variants?.[0]?.price,
        "availability": (product.variants?.[0]?.availableStock ?? product.variants?.[0]?.inventory ?? 0) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock"
      }
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "What is the recommended care for this fabric?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "For our premium fabrics, we recommend dry cleaning or a gentle hand wash with mild detergent to preserve the luxury and longevity of the garment."
          }
        },
        {
          "@type": "Question",
          "name": "How long does shipping take?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "Standard shipping takes 3-5 business days across India. All our pieces are carefully packaged to ensure they reach you in pristine condition."
          }
        }
      ]
    }
  ];

  const breadcrumbItems = [
    { label: "Home", href: "/" },
    ...(product.collections?.[0] ? [{ label: product.collections[0].title, href: `/collections/${product.collections[0].handle}` }] : []),
    { label: product.title, href: `/products/${product.handle}` },
  ];

  return (
    <div className="min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="max-w-[1400px] mx-auto px-6 md:px-12 pt-44 md:pt-48 pb-12 md:pb-24">
        <Breadcrumb items={breadcrumbItems} />
        
        {product.variants?.[0] && (
          <ViewContentTracker 
            variantId={product.variants[0].id} 
            title={product.title} 
            price={product.variants[0].price} 
          />
        )}

        {/* Main Grid: Gallery & Info */}
        <div className="grid lg:grid-cols-2 gap-16 items-start">
          <div className="lg:sticky lg:top-40">
            <ProductGallery images={product.images} product={product} />
          </div>
          
          <div className="lg:pl-8">
            <ProductInfo product={product} />
          </div>
        </div>

        {/* Bundle Builder: Buy the Ensemble */}
        {product.bundleProducts && product.bundleProducts.length > 0 && (
          <div className="mt-24">
            <BundleBuilder mainProduct={product} bundleProducts={product.bundleProducts} />
          </div>
        )}

        {/* Related Products: Scrollable */}
        <RelatedProducts productId={product.id} />

        {/* Reviews Section */}
        <div className="mt-24 border-t border-charcoal/5 pt-24">
          <div className="max-w-4xl mx-auto">
             <div className="text-center mb-16">
                <h2 className="text-3xl font-serif text-charcoal mb-4">Customer Experience</h2>
                <p className="text-charcoal/60 font-sans max-w-lg mx-auto">Read authentic reviews from women who have experienced the craftsmanship of Raaghas.</p>
             </div>
             
             <ReviewList productId={product.id} />
             
             <div className="mt-16 pt-16 border-t border-charcoal/5">
                <h3 className="text-xl font-serif text-charcoal mb-8 text-center">Share Your Thoughts</h3>
                <ReviewForm productId={product.id} />
             </div>
          </div>
        </div>

      </div>

      {/* Conversion Maximizers */}
      <StickyAddToCart product={stickyProps} isVisible={true} />
    </div>
  );
}
