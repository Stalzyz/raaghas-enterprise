"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import Script from "next/script";
import { API_URL } from "@/lib/api";

// Simple UUID generator for eventID
function generateEventId() {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch (e) {}
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c: any) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
  );
}

// Cookie helper for Meta click & browser IDs
function getCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(";").shift();
  return undefined;
}

// Global helper — tracks via Browser Pixel AND syncs to CAPI for dual tracking & zero loss
export const trackMetaEvent = (
  event: string,
  data?: any,
  providedEventID?: string,
  userInfo?: { email?: string; phone?: string; name?: string; city?: string; state?: string; zip?: string }
) => {
  const eventID = providedEventID || generateEventId();
  const fbp = getCookie("_fbp");
  const fbc = getCookie("_fbc");

  // 1. Browser Pixel Track
  if (typeof window !== "undefined" && (window as any).fbq) {
    (window as any).fbq("track", event, data || {}, { eventID });
    console.log(`[Meta Pixel Event] ${event}`, data, { eventID });
  }

  // 2. Server CAPI Dual Sync (Fire & Forget to ensure iOS 14.5+ coverage)
  if (typeof fetch !== "undefined") {
    fetch(`${API_URL}/marketing/capi/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: event,
        metaEventId: eventID,
        amount: data?.value || 0,
        currency: data?.currency || "INR",
        contentIds: data?.content_ids,
        orderId: data?.order_id,
        email: userInfo?.email,
        phone: userInfo?.phone,
        name: userInfo?.name,
        city: userInfo?.city,
        state: userInfo?.state,
        zip: userInfo?.zip,
        fbp,
        fbc,
      }),
    }).catch(() => {});
  }
};

export default function MetaPixel({ pixelId }: { pixelId: string | null }) {
  const pathname = usePathname();
  const { user } = useAuth();
  const initialized = useRef(false);

  // Track PageView on route change only (not initial load, script handles that)
  useEffect(() => {
    if (!initialized.current) return;
    if (pixelId && (window as any).fbq) {
      trackMetaEvent("PageView", {}, undefined, {
        email: user?.email || undefined,
        phone: user?.phone || undefined,
        name: user ? `${user.firstName || ""} ${user.lastName || ""}`.trim() : undefined,
      });
    }
  }, [pathname, pixelId, user]);

  // Track outbound link clicks
  useEffect(() => {
    if (!pixelId) return;
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement).closest("a");
      if (!anchor) return;
      const href = anchor.getAttribute("href");
      if (!href) return;
      if (href.startsWith("http") && !href.includes("raaghas.in")) {
        if (typeof window !== "undefined" && (window as any).fbq) {
          (window as any).fbq("trackCustom", "OutboundLinkClick", { content_name: href });
        }
      }
    };
    document.addEventListener("click", handleClick);
    return () => document.removeEventListener("click", handleClick);
  }, [pixelId]);

  if (!pixelId) return null;

  const initData: any = {};
  if (user) {
    if (user.email) initData.em = user.email;
    if (user.phone) initData.ph = user.phone;
    if (user.firstName) initData.fn = user.firstName;
    if (user.lastName) initData.ln = user.lastName;
  }

  return (
    <>
      <Script
        id="fb-pixel"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${pixelId}', ${JSON.stringify(initData)});
            fbq('track', 'PageView');
          `,
        }}
        onReady={() => {
          initialized.current = true;
        }}
      />
    </>
  );
}

