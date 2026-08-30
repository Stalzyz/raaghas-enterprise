"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, X, ShoppingBag } from "lucide-react";
import { getAssetUrl } from "@/lib/utils/assets";
import { useCart } from "@/context/CartContext";

interface ProductImage {
  id: string;
  url: string;
  altText?: string;
}

interface ProductGalleryProps {
  images: ProductImage[];
  product?: any; // Added for Quick Bag
}

export default function ProductGallery({ images, product }: ProductGalleryProps) {
  const { addItem, toggleDrawer } = useCart();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  if (!images || images.length === 0) {
    return (
      <div className="aspect-[3/4] bg-theme-surface rounded-2xl flex items-center justify-center text-theme-text/20">
        <p className="text-[10px] uppercase font-bold tracking-widest">No Images Available</p>
      </div>
    );
  }

  const getImageUrl = (img: any) => {
    if (typeof img === 'string') return getAssetUrl(img);
    return getAssetUrl(img.url || img.imageUrl);
  };

  return (
    <div className="space-y-4">
      {/* Main Display */}
      <div 
        className="relative aspect-[3/4] bg-theme-surface rounded-3xl overflow-hidden group shadow-sm border border-theme-border cursor-zoom-in"
        onClick={() => setIsZoomed(true)}
      >
        <AnimatePresence mode="wait">
          <motion.img
            key={currentIndex}
            src={getImageUrl(images[currentIndex])}
            alt={product ? `${product.title} - View ${currentIndex + 1}` : (typeof images[currentIndex] === 'string' ? "Product Image" : (images[currentIndex] as any).altText || "Product Image")}
            fetchPriority="high"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            className="w-full h-full object-cover"
          />
        </AnimatePresence>

        {/* Navigation Arrows */}
        {images.length > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); prevImage(); }}
              className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-theme-glass backdrop-blur-md text-theme-text opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-theme-glass/80"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); nextImage(); }}
              className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-theme-glass backdrop-blur-md text-theme-text opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-theme-glass/80"
            >
              <ChevronRight size={20} />
            </button>
          </>
        )}

        {/* Badge: Full View */}
        <button 
          onClick={(e) => { e.stopPropagation(); setIsZoomed(true); }}
          className="absolute bottom-6 right-6 p-3 rounded-full bg-theme-glass/20 backdrop-blur-md text-theme-text opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all hover:bg-theme-glass/40">
          <Maximize2 size={16} />
        </button>
      </div>

      {/* Zoom Modal */}
      <AnimatePresence>
        {isZoomed && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4 md:p-8"
          >
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 md:top-8 md:right-8 p-3 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-all"
            >
              <X size={24} />
            </button>
            <div className="relative">
              <img
                src={getImageUrl(images[currentIndex])}
                alt="Zoomed Product"
                className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
              />
              {/* Quick Bag Button */}
              {product && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (product.variants?.[0] && product.variants[0].inventory > 0) {
                      addItem({
                        id: `${product.id}-${product.variants[0].id}`,
                        variantId: product.variants[0].id,
                        title: product.title,
                        price: Number(product.variants[0].price),
                        quantity: 1,
                        maxStock: product.variants[0].inventory,
                        image: getImageUrl(images[currentIndex]),
                        handle: product.handle,
                        size: product.variants[0].option1Value || '',
                        options: {
                          [product.variants[0].option1Name || 'Option 1']: product.variants[0].option1Value || '',
                          [product.variants[0].option2Name || 'Option 2']: product.variants[0].option2Value || '',
                          [product.variants[0].option3Name || 'Option 3']: product.variants[0].option3Value || '',
                        }
                      });
                      toggleDrawer(true);
                      setIsZoomed(false);
                    }
                  }}
                  className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-wine text-white px-8 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-wine/20 whitespace-nowrap"
                >
                  <ShoppingBag size={16} /> Quick Add to Bag
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Thumbnails */}
      {images.length > 1 && (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {images.map((image, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`relative w-20 h-24 rounded-xl overflow-hidden border-2 transition-all flex-shrink-0 ${
                currentIndex === idx ? "border-wine scale-95" : "border-transparent opacity-60 hover:opacity-100"
              }`}
            >
              <img src={getImageUrl(image)} alt={product ? `${product.title} - Thumbnail ${idx + 1}` : (image.altText || "Thumbnail")} loading="lazy" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
