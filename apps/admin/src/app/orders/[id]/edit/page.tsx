"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { Loader2, ArrowLeft, Search, Plus, Trash2, Package } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

export default function EditOrderItemsPage() {
  const { id } = useParams() as { id: string };
  const { token } = useAdminAuth();
  const router = useRouter();
  
  const [order, setOrder] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedItems, setSelectedItems] = useState<{ variant: any, quantity: number, product: any, price: number }[]>([]);

  useEffect(() => {
    if (token && id) {
      fetchOrderAndProducts();
    }
  }, [token, id]);

  const fetchOrderAndProducts = async () => {
    try {
      setIsLoading(true);
      // Fetch Order
      const resOrder = await fetch(`${API_BASE}/orders/admin/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const orderData = await resOrder.json();
      setOrder(orderData);
      
      const mappedItems = orderData.items.map((item: any) => ({
         variant: item.variant,
         quantity: item.quantity,
         product: item.variant.product,
         price: item.price
      }));
      setSelectedItems(mappedItems);

      // Fetch Products
      const resProducts = await fetch(`${API_BASE}/products?adminMode=true&limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const prodData = await resProducts.json();
      setProducts(prodData.products || []);
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
      return [...prev, { product, variant, quantity: 1, price: variant.sellingPrice || variant.price }];
    });
  };

  const removeItem = (variantId: string) => {
    setSelectedItems(prev => prev.filter(item => item.variant.id !== variantId));
  };

  const updateItemQuantity = (variantId: string, quantity: number) => {
    if (quantity < 1) return;
    setSelectedItems(prev => prev.map(item => item.variant.id === variantId ? { ...item, quantity } : item));
  };

  const subtotal = selectedItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
  const shipping = order ? Number(order.shipping || 0) : 0;
  const discountAmount = order ? Number(order.discountAmount || 0) : 0;
  const total = subtotal + shipping - discountAmount;

  const handleSubmit = async () => {
    if (selectedItems.length === 0) return alert("Please add at least one item.");
    
    setIsSubmitting(true);
    try {
      const payload = {
        items: selectedItems.map(item => ({
          variantId: item.variant.id,
          quantity: item.quantity,
          price: item.price
        }))
      };

      const res = await fetch(`${API_BASE}/orders/admin/${id}/items`, {
        method: "PUT",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/orders/${id}`);
      } else {
        alert(data.message || "Failed to update order items.");
      }
    } catch (error) {
      console.error(error);
      alert("Error updating order items.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProducts = products.filter(p => p.title.toLowerCase().includes(search.toLowerCase()) || p.sku?.toLowerCase().includes(search.toLowerCase()));

  if (isLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin text-wine" size={32} /></div>;

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[#F9FAFB]">
      <header className="bg-white border-b border-gray-200 px-8 py-6 flex-shrink-0 flex items-center justify-between z-10 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href={`/orders/${id}`} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
            <ArrowLeft size={20} className="text-gray-500" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Edit Order Items</h1>
            <p className="text-xs text-gray-500 mt-1 uppercase tracking-widest font-bold">Order #{order.formattedOrderNumber || order.orderNumber || order.id.slice(-8).toUpperCase()}</p>
          </div>
        </div>
        <button 
          onClick={handleSubmit}
          disabled={isSubmitting || selectedItems.length === 0}
          className="bg-charcoal text-white px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-wine transition-all disabled:opacity-50 flex items-center gap-2"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Save Changes
        </button>
      </header>

      <main className="flex-1 overflow-auto p-8 grid grid-cols-2 gap-8 max-w-6xl mx-auto w-full">
        
        {/* Left Column: Order Items */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-6">
             <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal flex items-center gap-2"><Package size={16}/> Current Order Items</h3>
             
             {selectedItems.length > 0 ? (
                <div className="space-y-3">
                   {selectedItems.map((item, idx) => (
                      <div key={idx} className="flex gap-3 items-center p-3 bg-gray-50 rounded-xl border border-gray-100">
                         <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                            {item.product?.images?.[0]?.url && <img src={item.product.images[0].url} alt="" className="w-full h-full object-cover" />}
                         </div>
                         <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-charcoal truncate">{item.product?.title || 'Unknown Product'}</p>
                            <p className="text-[9px] text-gray-400 uppercase tracking-widest">{item.variant?.option1Value} • ₹{item.price}</p>
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
                     <div className="flex justify-between text-xs text-gray-500"><span className="uppercase tracking-widest">Shipping</span><span className="font-mono font-bold text-charcoal">₹{shipping.toLocaleString()}</span></div>
                     {discountAmount > 0 && <div className="flex justify-between text-xs text-green-600"><span className="uppercase tracking-widest">Discount</span><span className="font-mono font-bold">-₹{discountAmount.toLocaleString()}</span></div>}
                     <div className="flex justify-between text-sm font-bold pt-2 border-t border-gray-100"><span className="uppercase tracking-widest text-charcoal">Total</span><span className="font-mono text-wine">₹{total.toLocaleString()}</span></div>
                   </div>
                </div>
             ) : (
                <div className="text-center py-8 text-gray-400 text-xs font-medium border-2 border-dashed border-gray-100 rounded-xl">
                   No items selected.
                </div>
             )}
           </div>
        </div>

        {/* Right Column: Search Products */}
        <div className="space-y-6">
           <div className="bg-white p-6 rounded-[24px] border border-gray-100 shadow-sm space-y-4">
             <h3 className="text-sm font-bold uppercase tracking-widest text-charcoal">Add Products</h3>
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
                
                <div className="max-h-[500px] overflow-y-auto space-y-2 pr-2">
                   {filteredProducts.map(product => (
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

      </main>
    </div>
  );
}
