"use client";

import { API_URL } from "@/lib/api";

import { useState } from "react";
import { MapPin, Search, Loader2, AlertCircle, Calendar } from "lucide-react";
import { useCart } from "@/context/CartContext";


const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

export function ShippingPredictor() {
  const { items, cartTotal } = useCart();
  const [pincode, setPincode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<any[] | null>(null);
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);

  const checkShipping = async () => {
    if (pincode.length !== 6) {
      setError("Please enter a valid 6-digit Pincode");
      return;
    }

    setIsLoading(true);
    setError("");
    setResult(null);
    setDeliveryDate(null);

    try {
      // 1. Resolve State from Pincode
      const pinRes = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
      const pinData = await pinRes.json();

      if (!pinData || !pinData[0] || pinData[0].Status !== "Success" || !pinData[0].PostOffice) {
        throw new Error("Invalid Pincode or Service Unavailable");
      }

      const info = pinData[0].PostOffice[0];
      const matchedState = INDIAN_STATES.find(
        s => s.toLowerCase().replace(/\s/g, "") === info.State.toLowerCase().replace(/\s/g, "")
      ) || info.State;

      // 2. Fetch Shipping Options from Backend
      const shipRes = await fetch(`${API_URL}/api/v1/logistics/calculate-shipping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: matchedState, total: cartTotal, items }),
      });

      if (!shipRes.ok) {
        throw new Error("Failed to calculate shipping for this location.");
      }

      const options = await shipRes.json();
      setResult(options);

      // 3. Mock Estimated Delivery Date (Improvisation)
      // Usually, you would get this from the API response based on courier API
      const today = new Date();
      const minDays = matchedState === "Tamil Nadu" ? 2 : 4; // Mock logic
      const maxDays = minDays + 3;
      
      const minDate = new Date(today); minDate.setDate(today.getDate() + minDays);
      const maxDate = new Date(today); maxDate.setDate(today.getDate() + maxDays);
      
      setDeliveryDate(`Arrives ${minDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${maxDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`);

    } catch (err: any) {
      setError(err.message || "An error occurred while checking shipping.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAutoDetect = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser.");
      return;
    }
    setIsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          // Reverse geocoding using a free API (e.g., Nominatim)
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
          const data = await res.json();
          if (data && data.address && data.address.postcode) {
            setPincode(data.address.postcode.substring(0, 6));
            setError("");
          } else {
             setError("Could not automatically detect pincode. Please enter manually.");
          }
        } catch (e) {
          setError("Location detection failed.");
        } finally {
          setIsLoading(false);
        }
      },
      (err) => {
        setError("Location access denied or unavailable.");
        setIsLoading(false);
      }
    );
  };

  return (
    <div className="bg-theme-surface border border-theme-border rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <MapPin size={18} className="text-wine" />
        <h3 className="font-bold text-sm text-theme-text uppercase tracking-widest">Delivery & Shipping</h3>
      </div>

      {/* Input Area */}
      <div className="flex items-stretch gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            maxLength={6}
            placeholder="Enter Delivery Pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
            className="w-full bg-theme-bg border border-theme-border rounded-lg pl-4 pr-10 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text"
          />
          <button 
            onClick={handleAutoDetect}
            title="Use current location"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-wine hover:text-wine/70 transition-colors"
          >
            <MapPin size={16} />
          </button>
        </div>
        <button
          onClick={checkShipping}
          disabled={isLoading || pincode.length !== 6}
          className="bg-theme-text text-theme-bg px-4 rounded-lg text-sm font-bold uppercase tracking-wider hover:bg-wine hover:text-white transition-colors disabled:opacity-50 flex items-center justify-center min-w-[80px]"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : "Check"}
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle size={12} /> {error}
        </p>
      )}

      {/* Results */}
      {result && result.length > 0 && (
        <div className="pt-3 border-t border-theme-border space-y-3">
          {deliveryDate && (
            <p className="text-xs font-bold text-green-600 flex items-center gap-2">
              <Calendar size={14} /> {deliveryDate}
            </p>
          )}
          <div className="space-y-2">
            {result.map((option: any) => (
              <div key={option.id} className="flex items-center justify-between bg-theme-bg p-3 rounded-lg border border-theme-border/50">
                <div>
                  <p className="text-sm font-bold text-theme-text">{option.name}</p>
                  <p className="text-[10px] text-theme-text-muted">{option.description}</p>
                </div>
                <span className="text-sm font-bold text-wine">
                  {option.cost === 0 ? "FREE" : `₹${option.cost}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
