"use client";

import { API_URL } from "@/lib/api";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";

interface WholesaleContextType {
  isWholesale: boolean;
  retailer: any | null;
  loading: boolean;
  refreshWholesale: () => Promise<void>;
}

const WholesaleContext = createContext<WholesaleContextType>({
  isWholesale: false,
  retailer: null,
  loading: true,
  refreshWholesale: async () => {},
});

export const useWholesale = () => useContext(WholesaleContext);

export function WholesaleProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, getToken, user, loading: authLoading } = useAuth();
  const [retailer, setRetailer] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWholesaleProfile = async () => {
    if (authLoading) return;
    
    if (!isAuthenticated) {
      setRetailer(null);
      setLoading(false);
      return;
    }

    try {
      const token = await getToken();
      const res = await fetch(`${API_URL}/api/v1/wholesale/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        const data = await res.json();
        // Only active retailers get the wholesale experience
        if (data.status === "ACTIVE") {
          setRetailer(data);
        } else {
          setRetailer(null);
        }
      } else {
        setRetailer(null);
      }
    } catch (err) {
      console.error("Wholesale profile fetch failed:", err);
      setRetailer(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchWholesaleProfile();
    }
  }, [authLoading, isAuthenticated, user?.id]);

  return (
    <WholesaleContext.Provider 
      value={{ 
        isWholesale: !!retailer, 
        retailer, 
        loading: loading || authLoading,
        refreshWholesale: fetchWholesaleProfile
      }}
    >
      {children}
    </WholesaleContext.Provider>
  );
}
