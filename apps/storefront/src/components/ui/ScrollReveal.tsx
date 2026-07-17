"use client";

import { motion } from "framer-motion";

interface ScrollRevealProps {
  children: React.ReactNode;
  delay?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  animation?: "fade" | "slide-up" | "slide-down" | "zoom" | "none";
  duration?: number;
}

export default function ScrollReveal({ 
  children, 
  delay = 0, 
  direction,
  animation = "slide-up",
  duration = 0.8
}: ScrollRevealProps) {
  // Map animation to direction if direction is provided (backward compatibility)
  const anim = direction ? `slide-${direction}` : animation;

  const variants = {
    "none": { initial: { opacity: 1 }, animate: { opacity: 1 } },
    "fade": { initial: { opacity: 1 }, animate: { opacity: 1 } },
    "zoom": { initial: { opacity: 1, scale: 0.95 }, animate: { opacity: 1, scale: 1 } },
    "slide-up": { initial: { opacity: 1, y: 30 }, animate: { opacity: 1, y: 0 } },
    "slide-down": { initial: { opacity: 1, y: -30 }, animate: { opacity: 1, y: 0 } },
    "slide-left": { initial: { opacity: 1, x: 30 }, animate: { opacity: 1, x: 0 } },
    "slide-right": { initial: { opacity: 1, x: -30 }, animate: { opacity: 1, x: 0 } },
  };

  const selected = (variants as any)[anim] || variants["fade"];

  return (
    <motion.div
      initial={selected.initial}
      whileInView={selected.animate}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ 
        duration, 
        delay, 
        ease: [0.16, 1, 0.3, 1] 
      }}
      style={{ willChange: "transform, opacity" }}
    >
      {children}
    </motion.div>
  );
}
