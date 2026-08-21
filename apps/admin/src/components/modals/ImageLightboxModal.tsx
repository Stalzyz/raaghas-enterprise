"use client";

import React, { useState, useEffect } from "react";
import { X, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageLightboxModalProps {
  imageUrl: string | null;
  title?: string;
  onClose: () => void;
}

export function ImageLightboxModal({ imageUrl, title, onClose }: ImageLightboxModalProps) {
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!imageUrl) return null;

  const handleDoubleTap = () => {
    if (scale > 1) {
      setScale(1);
      setPosition({ x: 0, y: 0 });
    } else {
      setScale(2.5);
    }
  };

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.5, 4));
  const handleZoomOut = () => {
    setScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next === 1) setPosition({ x: 0, y: 0 });
      return next;
    });
  };
  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col justify-between items-center select-none"
        onClick={onClose}
      >
        {/* Header Bar */}
        <div 
          className="w-full px-6 py-4 flex items-center justify-between z-10 bg-black/40 backdrop-blur-md border-b border-white/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col">
            <h3 className="text-white font-bold text-sm tracking-wide">{title || "Image Inspection"}</h3>
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-bold">Double-tap or pinch to zoom</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Zoom Out"
            >
              <ZoomOut size={18} />
            </button>
            <span className="text-white/60 text-xs font-mono font-bold w-12 text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Zoom In"
            >
              <ZoomIn size={18} />
            </button>
            <button
              onClick={handleReset}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
              title="Reset Zoom"
            >
              <RotateCcw size={18} />
            </button>
            <button
              onClick={onClose}
              className="ml-4 p-2 rounded-xl bg-red-600/80 hover:bg-red-600 text-white transition-colors"
              title="Close (Esc)"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Interactive Image Display Area */}
        <div 
          className="flex-1 w-full flex items-center justify-center overflow-hidden cursor-grab active:cursor-grabbing p-4"
          onClick={(e) => e.stopPropagation()}
          onDoubleClick={handleDoubleTap}
        >
          <motion.img
            src={imageUrl}
            alt={title || "Inspection Preview"}
            draggable={false}
            animate={{ scale, x: position.x, y: position.y }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl touch-none"
            onPan={(e, info) => {
              if (scale > 1) {
                setPosition((prev) => ({
                  x: prev.x + info.delta.x,
                  y: prev.y + info.delta.y,
                }));
              }
            }}
          />
        </div>

        {/* Footer Hint */}
        <div className="py-3 text-[10px] uppercase font-bold tracking-widest text-white/30 z-10 pointer-events-none">
          Raaghas QC Inspector Lightbox
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
