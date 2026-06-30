"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import {
  ArrowLeft, Mail, Calendar, User, ShoppingBag,
  MapPin, Star, Heart, CreditCard, Sparkles, Loader2, Phone, Edit2, Check, X
} from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? "http://localhost:6005" : "https://api.raaghas.in");

export default function CustomerDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { token } = useAdminAuth();
  
  const [customer, setCustomer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [phoneValue, setPhoneValue] = useState("");
  const [savingPhone, setSavingPhone] = useState(false);

  useEffect(() => {
    if (!token || !params.id) return;
    
    const fetchCustomer = async () => {
      try {
        const res = await fetch(`${API_URL}/customers/${params.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        if (!res.ok) {
          throw new Error("Customer not found or failed to load");
        }
        
        const data = await res.json();
        setCustomer(data);
        setPhoneValue(data.phone || "");
      } catch (err: any) {
        console.error(err);
        setError(err.message || "Failed to load customer");
      } finally {
        setLoading(false);
      }
    };
    
    fetchCustomer();
  }, [token, params.id]);

  if (loading) {
    return (
      <div className="p-24 flex flex-col items-center justify-center space-y-4 h-[calc(100vh-100px)]">
        <Loader2 className="animate-spin text-wine" size={32} />
        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">Loading Customer Data...</p>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-sm text-gray-500 hover:text-charcoal transition-all font-medium">
          <ArrowLeft size={16} /> Back to Customers
        </button>
        <div className="p-12 text-center space-y-4 bg-red-50 border border-red-100 rounded-3xl">
           <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto text-red-500 shadow-sm">
              <User size={32} />
           </div>
           <p className="text-red-800 font-bold text-lg">{error || "Customer Not Found"}</p>
        </div>
      </div>
    );
  }

  const savePhone = async () => {
    if (!token) return;
    setSavingPhone(true);
    try {
      const res = await fetch(`${API_URL}/customers/${customer.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: phoneValue })
      });
      if (res.ok) {
        setCustomer({ ...customer, phone: phoneValue });
        setEditingPhone(false);
      } else {
        alert("Failed to save phone number");
      }
    } catch (err) {
      alert("Error saving phone number");
    } finally {
      setSavingPhone(false);
    }
  };

  const totalSpent = customer.orders?.reduce((acc: number, o: any) => acc + Number(o.totalAmount || 0), 0) || 0;
  const addresses = customer.savedAddresses ? (typeof customer.savedAddresses === 'string' ? JSON.parse(customer.savedAddresses) : customer.savedAddresses) : [];

  return (
    <div className="p-4 md:p-8 space-y-8 max-w-[1200px] mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="p-3 bg-white border border-gray-100 rounded-full hover:bg-gray-50 transition-all text-gray-500">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-3xl font-serif text-charcoal">{customer.name || 'Anonymous Customer'}</h1>
            <p className="text-sm text-gray-500 mt-1 font-medium flex items-center gap-2 flex-wrap">
              <Mail size={14} /> {customer.email}
              <span className="ml-2 flex items-center gap-2">
                <Phone size={14} />
                {editingPhone ? (
                  <span className="flex items-center gap-1">
                    <input
                      type="tel"
                      value={phoneValue}
                      onChange={e => setPhoneValue(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-0.5 text-sm w-36 outline-none focus:border-wine"
                      placeholder="+91 9876543210"
                    />
                    <button onClick={savePhone} disabled={savingPhone} className="p-1 text-green-600 hover:bg-green-50 rounded">
                      {savingPhone ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                    </button>
                    <button onClick={() => { setEditingPhone(false); setPhoneValue(customer.phone || ""); }} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <X size={14} />
                    </button>
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span>{customer.phone || <span className="text-gray-300 italic">No phone</span>}</span>
                    <button onClick={() => setEditingPhone(true)} className="p-1 text-gray-400 hover:text-wine rounded transition-colors">
                      <Edit2 size={12} />
                    </button>
                  </span>
                )}
              </span>
            </p>
          </div>
        </div>
        <div className="flex gap-3 text-right">
          <div className="bg-white px-6 py-2 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Total Spent</p>
            <p className="text-xl font-bold text-wine">₹{totalSpent.toFixed(2)}</p>
          </div>
          <div className="bg-white px-6 py-2 rounded-xl border border-gray-100 shadow-sm">
            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Orders</p>
            <p className="text-xl font-bold text-charcoal">{customer.orders?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column - Details */}
        <div className="space-y-6">
          <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
            <h3 className="font-bold text-charcoal mb-4 flex items-center gap-2">
              <User size={18} className="text-gray-400" /> 
              Profile Details
            </h3>
            <div className="space-y-4 text-sm">
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Customer ID</span>
                <span className="font-mono text-xs text-charcoal">{customer.id}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Role</span>
                <span className="px-2 py-0.5 bg-gray-100 rounded text-xs font-bold">{customer.role}</span>
              </div>
              <div className="flex justify-between items-center border-b border-gray-50 pb-2">
                <span className="text-gray-400 flex items-center gap-1"><Phone size={13} /> Phone</span>
                <div className="flex items-center gap-1">
                  {editingPhone ? (
                    <>
                      <input
                        type="tel"
                        value={phoneValue}
                        onChange={e => setPhoneValue(e.target.value)}
                        className="border border-gray-200 rounded-lg px-2 py-0.5 text-xs w-32 outline-none focus:border-wine"
                        placeholder="+91 9876543210"
                      />
                      <button onClick={savePhone} disabled={savingPhone} className="p-1 text-green-600 hover:bg-green-50 rounded">
                        {savingPhone ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      </button>
                      <button onClick={() => { setEditingPhone(false); setPhoneValue(customer.phone || ""); }} className="p-1 text-red-500 hover:bg-red-50 rounded">
                        <X size={12} />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-charcoal font-medium">{customer.phone || <span className="text-gray-300 italic text-xs">—</span>}</span>
                      <button onClick={() => setEditingPhone(true)} className="p-1 text-gray-300 hover:text-wine rounded transition-colors">
                        <Edit2 size={11} />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Joined</span>
                <span className="text-charcoal font-medium">{new Date(customer.createdAt).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between border-b border-gray-50 pb-2">
                <span className="text-gray-400">Reward Points</span>
                <span className="text-charcoal font-bold">{customer.points || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
            <h3 className="font-bold text-charcoal mb-4 flex items-center gap-2">
              <MapPin size={18} className="text-gray-400" /> 
              Saved Addresses ({addresses.length})
            </h3>
            {addresses.length === 0 ? (
              <p className="text-sm text-gray-400 italic">No saved addresses</p>
            ) : (
              <div className="space-y-3">
                {addresses.map((addr: any, i: number) => (
                  <div key={i} className="p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm">
                    <p className="font-bold">{addr.name}</p>
                    <p className="text-gray-600 mt-1">{addr.street}</p>
                    <p className="text-gray-600">{addr.city}, {addr.state} {addr.zip}</p>
                    {addr.country && <p className="text-gray-600">{addr.country}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Order History */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white border border-gray-100 rounded-[32px] overflow-hidden shadow-sm">
            <div className="p-6 border-b border-gray-50">
              <h3 className="font-bold text-charcoal flex items-center gap-2">
                <ShoppingBag size={18} className="text-gray-400" /> 
                Order History
              </h3>
            </div>
            
            {!customer.orders || customer.orders.length === 0 ? (
              <div className="p-12 text-center">
                <ShoppingBag className="mx-auto text-gray-200 mb-3" size={32} />
                <p className="text-gray-400 font-medium">No orders found for this customer.</p>
              </div>
            ) : (
              <table className="w-full text-left">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Order ID</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Date</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-widest">Status</th>
                    <th className="px-6 py-4 text-[10px] uppercase font-bold text-gray-400 tracking-widest text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {customer.orders.map((order: any) => (
                    <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <Link href={`/orders/${order.id}`} className="font-mono text-xs font-bold text-wine hover:underline">
                          #{order.formattedOrderNumber || order.orderNumber || order.id.slice(-8).toUpperCase()}
                        </Link>
                        <p className="text-xs text-gray-400 mt-1">{order.items?.length || 0} items</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest border ${
                          order.status === 'DELIVERED' ? 'bg-green-50 text-green-600 border-green-100' :
                          order.status === 'PAYMENT_PENDING' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                          'bg-blue-50 text-blue-600 border-blue-100'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-bold text-charcoal">
                        ₹{Number(order.totalAmount || 0).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
              <h3 className="font-bold text-charcoal mb-4 flex items-center gap-2">
                <Heart size={18} className="text-gray-400" /> 
                Wishlist Items ({customer.WishlistItem?.length || 0})
              </h3>
              {customer.WishlistItem?.length === 0 ? (
                <p className="text-sm text-gray-400 italic">Empty wishlist</p>
              ) : (
                <ul className="space-y-3">
                  {customer.WishlistItem?.slice(0, 5).map((item: any) => (
                    <li key={item.id} className="text-sm flex items-center gap-3">
                      <div className="w-8 h-10 bg-gray-100 rounded bg-cover bg-center" style={{ backgroundImage: `url(${item.product?.images?.[0]?.url || ''})` }}></div>
                      <span className="truncate">{item.product?.title || 'Unknown Product'}</span>
                    </li>
                  ))}
                  {customer.WishlistItem?.length > 5 && (
                    <li className="text-xs font-bold text-wine">+{customer.WishlistItem.length - 5} more items</li>
                  )}
                </ul>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-[32px] p-6 shadow-sm">
              <h3 className="font-bold text-charcoal mb-4 flex items-center gap-2">
                <Star size={18} className="text-gray-400" /> 
                Reviews ({customer.reviews?.length || 0})
              </h3>
              {customer.reviews?.length === 0 ? (
                <p className="text-sm text-gray-400 italic">No reviews written</p>
              ) : (
                <ul className="space-y-3">
                  {customer.reviews?.slice(0, 3).map((review: any) => (
                    <li key={review.id} className="text-sm p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex gap-1 text-yellow-400 mb-1">
                        {Array(review.rating).fill(0).map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                      </div>
                      <p className="font-bold truncate">{review.headline}</p>
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{review.content}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
