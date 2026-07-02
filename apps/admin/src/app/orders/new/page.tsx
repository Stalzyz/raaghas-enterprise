"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { Loader2, ArrowLeft, Search, Plus, Trash2, CheckCircle, Package } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function CreateDraftOrderPage() {
  const { token } = useAdminAuth();
  const router = useRouter();
  
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState({
    name: "", address1: "", address2: "", city: "", state: "", zip: "", country: "India", phone: ""
  });
  const [sameAsShipping, setSameAsShipping] = useState(true);
  const [billingAddress, setBillingAddress] = useState({
    name: "", address1: "", address2: "", city: "", state: "", zip: "", country: "India", phone: ""
  });
  
  const [selectedItems, setSelectedItems] = useState<{ variant: any, quantity: number, product: any }[]>([]);
  const [shippingAmount, setShippingAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (token) fetchProducts();
  }, [token]);

  const fetchProducts = async () => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_BASE}/products?adminMode=true&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setProducts(Array.isArray(data) ? data : (data.data || data.products || []));
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const addItem = (product: any, variant: any) => {
    setSelectedItems(prev => {
      const existing = prev.find(item => item.variant.id === variant.id);
      if (existing) {
        return prev.map(item => item.variant.id === variant.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, variant, quantity: 1 }];
    });
  };

  const removeItem = (variantId: string) => {
    setSelectedItems(prev => prev.filter(item => item.variant.id !== variantId));
  };

  const updateItemQuantity = (variantId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedItems(prev => prev.map(item => item.variant.id === variantId ? { ...item, quantity } : item));
  };

  const subtotal = selectedItems.reduce((acc, item) => acc + (item.variant.sellingPrice || item.variant.price) * item.quantity, 0);
  const total = subtotal + shippingAmount - discountAmount;

  const handleSubmit = async () => {
    if (selectedItems.length === 0) return alert("Please add at least one item.");
    if (!customerName || !customerEmail || !customerPhone) return alert("Please fill in customer details.");
    
    setIsSubmitting(true);
    try {
      const payload = {
        customerName,
        customerEmail,
        customerPhone,
        shippingAddress,
        billingAddress: sameAsShipping ? shippingAddress : billingAddress,
        items: selectedItems.map(item => ({
          variantId: item.variant.id,
          quantity: item.quantity,
          price: item.variant.sellingPrice || item.variant.price
        })),
        shippingAmount,
        discountAmount,
        notes
      };

      const res = await fetch(`${API_BASE}/orders/draft`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/orders/${data.id}`);
      } else {
        alert(data.message || "Failed to create draft order.");
      }
    } catch (error) {
      console.error(error);
      alert("Error creating draft order.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F9FAFB]">
      <header className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/orders" className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Create Draft Order</h1>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Manual Order Creation</p>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || selectedItems.length === 0}
          className="bg-charcoal text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-wine transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Create Order
        </button>
      </header>

      <main className="flex-1 overflow-auto p-8 grid grid-cols-3 gap-8">
        
        {/* Left Column: Form Details */}
        <div className="col-span-2 space-y-6">
          
          <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal">Customer Details</h3>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Full Name" value={customerName} onChange={e => setCustomerName(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none" />
              <input type="email" placeholder="Email Address" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none" />
              <input type="tel" placeholder="Phone Number" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none col-span-2" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
            <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal">Shipping Address</h3>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="Recipient Name" value={shippingAddress.name} onChange={e => setShippingAddress({...shippingAddress, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none col-span-2" />
              <input type="text" placeholder="Address Line 1" value={shippingAddress.address1} onChange={e => setShippingAddress({...shippingAddress, address1: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none col-span-2" />
              <input type="text" placeholder="Address Line 2 (Optional)" value={shippingAddress.address2} onChange={e => setShippingAddress({...shippingAddress, address2: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none col-span-2" />
              <input type="text" placeholder="City" value={shippingAddress.city} onChange={e => setShippingAddress({...shippingAddress, city: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none" />
              <input type="text" placeholder="State/Province" value={shippingAddress.state} onChange={e => setShippingAddress({...shippingAddress, state: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none" />
              <input type="text" placeholder="Postal Code / ZIP" value={shippingAddress.zip} onChange={e => setShippingAddress({...shippingAddress, zip: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none" />
              <input type="text" placeholder="Country" value={shippingAddress.country} onChange={e => setShippingAddress({...shippingAddress, country: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none" />
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-2">
              <input type="checkbox" checked={sameAsShipping} onChange={e => setSameAsShipping(e.target.checked)} className="accent-wine" />
              <span className="text-xs font-bold text-charcoal">Billing address same as shipping</span>
            </label>
          </div>

          {!sameAsShipping && (
            <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
              <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal">Billing Address</h3>
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="Recipient Name" value={billingAddress.name} onChange={e => setBillingAddress({...billingAddress, name: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none col-span-2" />
                <input type="text" placeholder="Address Line 1" value={billingAddress.address1} onChange={e => setBillingAddress({...billingAddress, address1: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none col-span-2" />
                <input type="text" placeholder="City" value={billingAddress.city} onChange={e => setBillingAddress({...billingAddress, city: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none" />
                <input type="text" placeholder="State/Province" value={billingAddress.state} onChange={e => setBillingAddress({...billingAddress, state: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none" />
                <input type="text" placeholder="Postal Code / ZIP" value={billingAddress.zip} onChange={e => setBillingAddress({...billingAddress, zip: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none" />
                <input type="text" placeholder="Country" value={billingAddress.country} onChange={e => setBillingAddress({...billingAddress, country: e.target.value})} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none" />
              </div>
            </div>
          )}

          <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
             <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal">Financials & Notes</h3>
             <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                   <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Shipping Cost (₹)</label>
                   <input type="number" value={shippingAmount} onChange={e => setShippingAmount(parseFloat(e.target.value) || 0)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none font-mono" />
                </div>
                <div className="space-y-2">
                   <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Discount Amount (₹)</label>
                   <input type="number" value={discountAmount} onChange={e => setDiscountAmount(parseFloat(e.target.value) || 0)} className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none font-mono" />
                </div>
                <div className="col-span-2 space-y-2">
                   <label className="text-[9px] font-bold uppercase tracking-widest text-gray-400 block">Internal Notes</label>
                   <textarea rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Add any notes about this draft order..." className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-3 text-xs outline-none"></textarea>
                </div>
             </div>
          </div>

        </div>

        {/* Right Column: Order Items */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6 sticky top-0">
             <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal flex items-center gap-2"><Package size={16}/> Order Items</h3>
             
             {/* Selected Items List */}
             {selectedItems.length > 0 ? (
                <div className="space-y-3">
                   {selectedItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                         <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {item.product.images?.[0]?.url && <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-charcoal truncate">{item.product.title}</p>
                            <p className="text-[9px] text-gray-400 uppercase tracking-widest">{item.variant.option1Value} • ₹{item.variant.sellingPrice || item.variant.price}</p>
                         </div>
                         <input 
                           type="number" 
                           min="1"
                           value={item.quantity}
                           onChange={e => updateItemQuantity(item.variant.id, parseInt(e.target.value) || 1)}
                           className="w-12 bg-white border border-gray-200 rounded text-center text-xs py-1 outline-none font-mono"
                         />
                         <button onClick={() => removeItem(item.variant.id)} className="text-gray-400 hover:text-red-500"><Trash2 size={14}/></button>
                      </div>
                   ))}
                   
                   <div className="pt-4 border-t border-gray-100 space-y-2">
                     <div className="flex justify-between text-xs text-gray-500"><span className="uppercase tracking-widest">Subtotal</span><span className="font-mono font-bold text-charcoal">₹{subtotal.toLocaleString()}</span></div>
                     <div className="flex justify-between text-xs text-gray-500"><span className="uppercase tracking-widest">Shipping</span><span className="font-mono font-bold text-charcoal">₹{shippingAmount.toLocaleString()}</span></div>
                     {discountAmount > 0 && <div className="flex justify-between text-xs text-green-600"><span className="uppercase tracking-widest">Discount</span><span className="font-mono font-bold">-₹{discountAmount.toLocaleString()}</span></div>}
                     <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100"><span className="uppercase tracking-widest text-charcoal">Total</span><span className="font-mono text-wine">₹{total.toLocaleString()}</span></div>
                   </div>
                </div>
             ) : (
                <div className="text-center py-8 text-gray-400 text-xs font-medium border-2 border-dashed border-gray-100 rounded-xl">
                   No items selected yet.
                </div>
             )}

             {/* Search Products */}
             <div className="pt-4 border-t border-gray-100 space-y-4">
                <div className="relative">
                   <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                   <input 
                     type="text" 
                     placeholder="Search products to add..."
                     value={search}
                     onChange={e => setSearch(e.target.value)}
                     className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-3 text-xs outline-none"
                   />
                </div>
                
                <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2">
                   {isLoading ? (
                     <div className="flex justify-center p-4"><Loader2 size={16} className="animate-spin text-gray-400"/></div>
                   ) : filteredProducts.map(product => (
                     <div key={product.id} className="space-y-2 mb-4">
                        <div className="text-[10px] font-bold text-charcoal uppercase tracking-widest flex items-center gap-2">
                           <div className="w-6 h-6 bg-gray-100 rounded overflow-hidden">
                             {product.images?.[0]?.url && <img src={product.images[0].url} alt="" className="w-full h-full object-cover" />}
                           </div>
                           {product.title}
                        </div>
                        {product.variants.map((v: any) => (
                           <div key={v.id} className="flex justify-between items-center pl-8 py-1">
                              <span className="text-xs text-gray-500 font-medium">{v.option1Value || 'Default'} - ₹{v.sellingPrice || v.price}</span>
                              <button 
                                onClick={() => addItem(product, v)}
                                className="text-wine bg-wine/10 hover:bg-wine hover:text-white p-1 rounded transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                           </div>
                        ))}
                     </div>
                   ))}
                </div>
             </div>
           </div>
        </div>

      </main>
    </div>
  );
}
