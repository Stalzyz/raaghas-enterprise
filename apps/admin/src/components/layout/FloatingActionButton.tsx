"use client";

import React, { useState } from "react";
import { Plus, ShoppingCart, Package, Camera, ExternalLink, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { CameraScannerModal } from "@/components/modals/CameraScannerModal";

export function FloatingActionButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const handleScanResult = (code: string) => {
    window.location.href = `/orders?search=${encodeURIComponent(code)}`;
  };

  return (
    <>
      {/* Floating Speed Dial Container */}
      <div className="fixed bottom-6 right-6 z-40 lg:hidden flex flex-col items-end gap-3 pointer-events-auto">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="flex flex-col items-end gap-2.5 mb-2"
            >
              <Link
                href="/orders/new"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 bg-white text-gray-900 px-4 py-2.5 rounded-full shadow-xl border border-gray-100 text-xs font-bold uppercase tracking-wider hover:bg-wine hover:text-white transition-all active:scale-95"
              >
                <span>Draft Order</span>
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
                  <ShoppingCart size={16} />
                </div>
              </Link>

              <Link
                href="/products/new"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 bg-white text-gray-900 px-4 py-2.5 rounded-full shadow-xl border border-gray-100 text-xs font-bold uppercase tracking-wider hover:bg-wine hover:text-white transition-all active:scale-95"
              >
                <span>Add Product</span>
                <div className="w-8 h-8 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center">
                  <Package size={16} />
                </div>
              </Link>

              <button
                onClick={() => {
                  setIsOpen(false);
                  setIsScannerOpen(true);
                }}
                className="flex items-center gap-3 bg-white text-gray-900 px-4 py-2.5 rounded-full shadow-xl border border-gray-100 text-xs font-bold uppercase tracking-wider hover:bg-wine hover:text-white transition-all active:scale-95"
              >
                <span>Scan Barcode</span>
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center">
                  <Camera size={16} />
                </div>
              </button>

              <a
                href="https://raaghas.in"
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-3 bg-white text-gray-900 px-4 py-2.5 rounded-full shadow-xl border border-gray-100 text-xs font-bold uppercase tracking-wider hover:bg-wine hover:text-white transition-all active:scale-95"
              >
                <span>View Store</span>
                <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center">
                  <ExternalLink size={16} />
                </div>
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Floating Toggle Button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-white transition-all duration-300 active:scale-90 ${
            isOpen ? "bg-gray-900 rotate-45" : "bg-wine shadow-wine/40"
          }`}
          title="Quick Admin Actions"
        >
          <Plus size={26} />
        </button>
      </div>

      {/* Backdrop overlay when speed dial is open */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-30 lg:hidden"
        />
      )}

      {/* Camera Scanner Modal */}
      <CameraScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanResult={handleScanResult}
      />
    </>
  );
}
