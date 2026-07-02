"use client";

import { useState, useEffect, useCallback } from "react";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/components/providers/AuthProvider";

const WISHLIST_LOCAL_STORAGE_KEY = "raaghas_wishlist";

// --- GLOBAL STATE ---
let globalWishlist: string[] = [];
let isInitialized = false;
let isSyncing = false;
let listeners = new Set<(wishlist: string[], init: boolean) => void>();

function notify() {
  // Use a new array reference to ensure React triggers re-render if needed
  const newArray = [...globalWishlist];
  listeners.forEach(l => l(newArray, isInitialized));
}

function loadLocal() {
  if (typeof window === "undefined") return;
  const saved = localStorage.getItem(WISHLIST_LOCAL_STORAGE_KEY);
  if (saved && saved !== "undefined") {
    try { 
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        globalWishlist = parsed;
      }
    } catch(e) {}
  }
}

// Initial load for SSR/CSR
if (typeof window !== "undefined") {
  loadLocal();
  isInitialized = true;
}

export function useWishlist() {
  const { loading: authLoading, isAuthenticated, getToken } = useAuth();
  const [wishlist, setWishlist] = useState<string[]>(globalWishlist);
  const [initialized, setInitialized] = useState(isInitialized);

  useEffect(() => {
    const handler = (w: string[], init: boolean) => {
      setWishlist(w);
      setInitialized(init);
    };
    
    listeners.add(handler);
    handler([...globalWishlist], isInitialized); // Trigger with current state on mount
    
    return () => { 
      listeners.delete(handler); 
    };
  }, []);

  // Sync with backend when signed in - ONLY ONCE PER SESSION
  useEffect(() => {
    if (authLoading || !isAuthenticated || isSyncing || typeof window === "undefined") return;
    
    const syncWithBackend = async () => {
      isSyncing = true;
      try {
        const token = await getToken();
        loadLocal(); // get latest local items
        
        // Sync local items up to the cloud
        if (globalWishlist.length > 0) {
          await fetch(`${API_URL}/api/v1/wishlist/sync`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ productIds: globalWishlist }),
          }).catch(() => null);
        }

        // Fetch merged wishlist down from the cloud
        const response = await fetch(`${API_URL}/api/v1/wishlist`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (response.ok) {
          const data = await response.json();
          // Adjust based on backend response shape. The service returns an array of modified product objects with `.id`
          const newWishlist = Array.isArray(data) ? data.map((p: any) => p.id || p.productId || p) : [];
          globalWishlist = newWishlist;
          localStorage.setItem(WISHLIST_LOCAL_STORAGE_KEY, JSON.stringify(globalWishlist));
          notify();
        }
      } catch (error) {
        console.error("Failed to sync wishlist", error);
        isSyncing = false; // Allow retry if failed
      }
    };

    syncWithBackend();
  }, [authLoading, isAuthenticated, getToken]);

  const toggleWishlist = useCallback(async (productId: string) => {
    const isCurrentlyIn = globalWishlist.includes(productId);
    
    // Optimistic Global Update
    if (isCurrentlyIn) {
      globalWishlist = globalWishlist.filter(id => id !== productId);
    } else {
      globalWishlist = [...globalWishlist, productId];
    }
    
    localStorage.setItem(WISHLIST_LOCAL_STORAGE_KEY, JSON.stringify(globalWishlist));
    notify();

    // Backend update if signed in
    if (isAuthenticated) {
      try {
        const token = await getToken();
        const method = isCurrentlyIn ? "DELETE" : "POST";
        const res = await fetch(`${API_URL}/api/v1/wishlist/${productId}`, {
          method,
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!res.ok) throw new Error("Backend update failed");
      } catch (error) {
        // Rollback global state on error
        if (isCurrentlyIn) {
           globalWishlist = [...globalWishlist, productId];
        } else {
           globalWishlist = globalWishlist.filter(id => id !== productId);
        }
        localStorage.setItem(WISHLIST_LOCAL_STORAGE_KEY, JSON.stringify(globalWishlist));
        notify();
        console.error("Failed to update wishlist on backend", error);
      }
    }
  }, [isAuthenticated, getToken]);

  return {
    wishlist,
    toggleWishlist,
    isInWishlist: (productId: string) => wishlist.includes(productId),
    isInitializing: !initialized || authLoading
  };
}
