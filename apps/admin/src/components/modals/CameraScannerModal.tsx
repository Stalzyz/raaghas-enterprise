"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Camera, Flashlight, RefreshCw, CheckCircle2, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CameraScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScanResult: (result: string) => void;
}

export function CameraScannerModal({ isOpen, onClose, onScanResult }: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [scannedCode, setScannedCode] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: "environment" } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.error("Camera access error:", err);
      setCameraError("Camera access denied or unavailable on this device. You can type the code below.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    onScanResult(manualCode.trim());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-gray-900 border border-gray-800 rounded-3xl overflow-hidden max-w-lg w-full shadow-2xl flex flex-col text-white"
        >
          {/* Header */}
          <div className="p-5 border-b border-gray-800 flex justify-between items-center bg-gray-900/80">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-wine/20 text-wine flex items-center justify-center border border-wine/30">
                <Camera size={20} className="text-pink-500" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Live Barcode & QR Scanner</h3>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Scan SKU or Tracking Code</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Viewfinder Video Area */}
          <div className="relative w-full h-72 bg-black flex items-center justify-center overflow-hidden">
            {cameraError ? (
              <div className="p-6 text-center text-gray-400 space-y-3">
                <AlertCircle size={32} className="mx-auto text-amber-500" />
                <p className="text-xs font-medium">{cameraError}</p>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                
                {/* Target Scan Box Reticle */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-64 h-40 border-2 border-wine/80 rounded-2xl relative shadow-[0_0_50px_rgba(109,15,27,0.5)]">
                    {/* Corners */}
                    <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-pink-500 rounded-tl-md" />
                    <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-pink-500 rounded-tr-md" />
                    <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-pink-500 rounded-bl-md" />
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-pink-500 rounded-br-md" />

                    {/* Animated Scanning Line */}
                    <motion.div
                      animate={{ y: [0, 150, 0] }}
                      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                      className="w-full h-0.5 bg-gradient-to-r from-transparent via-pink-500 to-transparent shadow-[0_0_15px_#ec4899]"
                    />
                  </div>
                </div>

                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 bg-black/60 px-3 py-1 rounded-full text-[10px] font-mono text-gray-300 backdrop-blur-xs">
                  Position barcode inside box
                </div>
              </>
            )}
          </div>

          {/* Manual Input Fallback Footer */}
          <div className="p-5 bg-gray-900 border-t border-gray-800 space-y-4">
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Or type SKU / Order ID manually..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-gray-500 outline-none focus:border-wine transition-all"
              />
              <button
                type="submit"
                className="px-5 py-2.5 bg-wine text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-wine-dark transition-all"
              >
                Submit
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
