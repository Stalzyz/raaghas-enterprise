"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

export default function MetaPixel({ pixelId }: { pixelId: string | null }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  useEffect(() => {
    if (!pixelId) return;

    // Initialize Facebook Pixel
    (function (f: any, b: any, e: any, v: any, n: any, t: any, s: any) {
      if (f.fbq) return;
      n = f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = !0;
      n.version = "2.0";
      n.queue = [];
      t = b.createElement(e);
      t.async = !0;
      t.src = v;
      s = b.getElementsByTagName(e)[0];
      s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");

    if (user?.email) {
      (window as any).fbq("init", pixelId, { em: user.email });
    } else {
      (window as any).fbq("init", pixelId);
    }
    (window as any).fbq("track", "PageView");
  }, [pixelId, user?.email]);

  // Track PageView on route change
  useEffect(() => {
    if (pixelId && (window as any).fbq) {
      (window as any).fbq("track", "PageView");
    }
  }, [pathname, searchParams, pixelId]);

  // Track outbound link clicks
  useEffect(() => {
    if (!pixelId) return;
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("http") && !href.includes("raaghas.in")) {
        trackMetaEvent("LinkClick", { content_name: href });
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pixelId]);

  return null;
}

// Global helper — pass optional eventID for server-side deduplication
export const trackMetaEvent = (event: string, data?: any, eventID?: string) => {
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", event, data || {}, eventID ? { eventID } : undefined);
    console.log(`[Meta Event] ${event}`, data);
  }
};
