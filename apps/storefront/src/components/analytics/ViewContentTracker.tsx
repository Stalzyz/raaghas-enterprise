"use client";

import { useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { trackMetaEvent } from "./MetaPixel";
import { API_URL } from "@/lib/api";

export default function ViewContentTracker({
  variantId,
  title,
  price,
}: {
  variantId: string;
  title: string;
  price: number;
}) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;

    const eventId = "evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
    const contentIds = [variantId];
    
    // 1. Client-side Pixel
    trackMetaEvent("ViewContent", {
      content_ids: contentIds,
      content_name: title,
      content_type: "product",
      value: price,
      currency: "INR",
    }, eventId);

    // 2. Server-side CAPI
    const fbp = Cookies.get("_fbp");
    const fbc = Cookies.get("_fbc");

    fetch(API_URL + "/api/v1/marketing/capi/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventName: "ViewContent",
        amount: price,
        currency: "INR",
        metaEventId: eventId,
        contentIds,
        fbp,
        fbc,
      })
    }).catch(() => {});
  }, [variantId, title, price]);

  return null;
}
