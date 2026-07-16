"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { getAssetUrl } from "@/lib/utils/assets";

interface CategoryShowcaseProps {
  content: {
    title?: string;
    categories: Array<{
      title: string;
      handle: string;
      image: string;
    }>;
  };
}

export function CategoryShowcase({ content }: CategoryShowcaseProps) {
  const categories = content.categories || [];

  return (
    <section className="py-24 px-6 sm:px-12 bg-theme-bg">
      {content.title && (
        <div className="mb-16 text-center">
          <h2 className="text-4xl sm:text-5xl font-serif text-theme-text mb-4">
            {content.title}
          </h2>
          <div className="w-24 h-1 bg-wine mx-auto opacity-20" />
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
        {categories.map((cat, idx) => (
          <motion.div
            key={cat.handle}
            initial={{ opacity: 1, y: 0 }}
            className="group relative h-[500px] overflow-hidden cursor-pointer"
          >
            <Link href={`/collections/${cat.handle}`} className="block h-full w-full">
              <Image
                src={getAssetUrl(cat.image)}
                alt={cat.title}
                fill
                className="object-cover transition-transform duration-1000 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-wine-dark/80 via-transparent to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-500" />
              
              <div className="absolute bottom-10 left-0 right-0 text-center px-6">
                <span className="text-theme-bg text-[10px] uppercase tracking-[0.4em] font-bold block mb-2 opacity-80">
                  Explore
                </span>
                <h3 className="text-2xl font-serif text-theme-bg group-hover:tracking-widest transition-all duration-700">
                  {cat.title}
                </h3>
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
