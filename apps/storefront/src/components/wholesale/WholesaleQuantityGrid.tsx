"use client";

import { API_URL } from "@/lib/api";

import { useState, useMemo } from "react";
import { ShoppingBag, Loader2, Info, CheckCircle2 } from "lucide-react";
import { useWholesale } from "@/components/providers/WholesaleProvider";
import { useAuth } from "@/components/providers/AuthProvider";

interface WholesaleQuantityGridProps {
  product: any;
}

export default function WholesaleQuantityGrid({ product }: WholesaleQuantityGridProps) {
  const { retailer, isWholesale } = useWholesale();
  const { getToken } = useAuth();
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [isAdding, setIsAdding] = useState(false);
  const [success, setSuccess] = useState(false);

  // Calculate pricing based on retailer tier/price list
  const discountPercent = retailer?.priceList?.discountPercent || 0;
  const retailPrice = Number(product.price);
  const wholesalePrice = retailPrice * (1 - discountPercent / 100);

  const totalQuantity = useMemo(() => 
    Object.values(quantities).reduce((a, b) => a + b, 0), 
  [quantities]);

  const totalAmount = totalQuantity * wholesalePrice;

  const handleQtyChange = (size: string, val: string) => {
    const num = parseInt(val) || 0;
    setQuantities(prev => ({ ...prev, [size]: Math.max(0, num) }));
  };

  const handleBulkAdd = async () => {
    if (totalQuantity === 0) return;
    
    setIsAdding(true);
    try {
      const token = await getToken();
      
      // We convert the matrix into items for the wholesale draft order
      const items = Object.entries(quantities)
        .filter(([_, qty]) => qty > 0)
        .map(([size, quantity]) => ({
          productId: product.id,
          size,
          quantity,
          unitPrice: wholesalePrice
        }));

      const res = await fetch(`${API_URL}/api/v1/wholesale/orders/draft`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          retailerId: retailer.id,
          items
        })
      });

      if (!res.ok) throw new Error("Failed to create draft order.");
      
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
      setQuantities({});
    } catch (err) {
      alert("Error building wholesale draft. Please contact your account manager.");
    } finally {
      setIsAdding(false);
    }
  };

  if (!isWholesale) return null;

  return (
    <div className="bg-white border-2 border-wine/10 rounded-3xl p-8 space-y-8 shadow-xl">
      <div className="flex justify-between items-start border-b border-wine/5 pb-6">
        <div>
          <span className="text-[10px] font-bold text-wine tracking-widest uppercase mb-1 block">Boutique Exclusive Pricing</span>
          <h3 className="text-xl font-serif text-charcoal">Bulk Order Matrix</h3>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-charcoal/40 uppercase font-bold tracking-widest">Your Price</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-charcoal/30 line-through">₹{retailPrice.toLocaleString()}</span>
            <span className="text-2xl font-bold text-wine">₹{wholesalePrice.toLocaleString()}</span>
          </div>
          <p className="text-[9px] text-green-600 font-bold uppercase mt-1">{discountPercent}% Curation Discount Applied</p>
        </div>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-6 gap-4">
        {product.sizes.map((size: string) => (
          <div key={size} className="space-y-2">
            <label className="text-[10px] font-bold text-charcoal/40 uppercase tracking-widest text-center block">{size}</label>
            <input 
              type="number" 
              min="0"
              placeholder="0"
              className="w-full bg-ivory border border-charcoal/5 rounded-xl py-3 text-center font-bold text-charcoal focus:border-wine/30 transition-all outline-none"
              value={quantities[size] || ""}
              onChange={e => handleQtyChange(size, e.target.value)}
            />
          </div>
        ))}
      </div>

      <div className="bg-ivory/50 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
         <div className="space-y-1">
            <p className="text-xs text-charcoal/50 font-medium">Order Subtotal ({totalQuantity} units)</p>
            <p className="text-2xl font-bold text-charcoal">₹{totalAmount.toLocaleString()}</p>
         </div>
         
         <div className="flex items-center gap-4 w-full md:w-auto">
            {success ? (
              <div className="flex-1 md:w-64 bg-green-500 text-white rounded-xl py-4 flex items-center justify-center gap-2 font-bold text-[10px] uppercase tracking-widest animate-in zoom-in-95 duration-300">
                <CheckCircle2 size={16} /> Added to Proforma
              </div>
            ) : (
              <button 
                onClick={handleBulkAdd}
                disabled={isAdding || totalQuantity === 0}
                className="flex-1 md:w-64 bg-charcoal text-white rounded-xl py-4 uppercase font-bold text-[10px] tracking-widest hover:bg-wine transition-all flex items-center justify-center gap-3 disabled:opacity-30 shadow-lg"
              >
                {isAdding ? <Loader2 className="animate-spin" size={16} /> : <ShoppingBag size={16} />}
                {isAdding ? "Generating Quote..." : "Add to Wholesale Cart"}
              </button>
            )}
         </div>
      </div>

      <div className="flex gap-3 text-[9px] text-charcoal/40 font-medium italic">
        <Info size={12} className="shrink-0 text-wine" />
        <p>Taxes and shipping calculated at proforma generation. Bulk orders are subject to your {retailer?.creditTermDays > 0 ? `Net-${retailer.creditTermDays}` : "Cash on Delivery"} terms.</p>
      </div>
    </div>
  );
}
