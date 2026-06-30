"use client";

import { useEffect, useState, Suspense } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Package, ChevronRight, Clock, CheckCircle2, Truck, XCircle, ShoppingBag, Loader2 } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useSearchParams } from "next/navigation";

const statusColors: any = {
  PAYMENT_PENDING: "bg-orange-50 text-orange-600 border-orange-100",
  ABANDONED: "bg-gray-100 text-gray-500 border-gray-200",
  CONFIRMED: "bg-blue-50 text-blue-600 border-blue-100",
  SHIPPED: "bg-purple-50 text-purple-600 border-purple-100",
  DELIVERED: "bg-green-50 text-green-600 border-green-100",
  CANCELLED: "bg-red-50 text-red-600 border-red-100",
  FAILED: "bg-red-50 text-red-600 border-red-100",
};

const statusIcons: any = {
  PAYMENT_PENDING: <Clock size={14} />,
  ABANDONED: <XCircle size={14} />,
  CONFIRMED: <CheckCircle2 size={14} />,
  SHIPPED: <Truck size={14} />,
  DELIVERED: <CheckCircle2 size={14} />,
  CANCELLED: <XCircle size={14} />,
  FAILED: <XCircle size={14} />,
};

function getSmartStatus(order: any) {
  if (order.status === 'PAYMENT_PENDING') {
    const ageInMinutes = (Date.now() - new Date(order.createdAt).getTime()) / (1000 * 60);
    return ageInMinutes > 30 ? 'ABANDONED' : 'PAYMENT_PENDING';
  }
  if (order.status === 'CANCELLED' && order.paymentId) {
    return 'FAILED'; // Usually a gateway failure
  }
  return order.status;
}

function getDisplayStatus(status: string) {
  if (status === 'PAYMENT_PENDING') return 'Awaiting Payment';
  if (status === 'FAILED') return 'Payment Failed';
  if (status === 'ABANDONED') return 'Abandoned';
  return status;
}

const MOCK_ORDERS = [
  {
    id: "ord_premium_8877",
    status: "DELIVERED",
    totalAmount: 125000,
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: "1", variant: { product: { images: [{ url: "https://images.unsplash.com/photo-1610030469915-9a08fa996eec?auto=format&fit=crop&q=80" }] } } },
      { id: "2", variant: { product: { images: [{ url: "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&q=80" }] } } }
    ]
  },
  {
    id: "ord_elite_9911",
    status: "SHIPPED",
    totalAmount: 48000,
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    items: [
      { id: "3", variant: { product: { images: [{ url: "https://images.unsplash.com/photo-1583337130417-3346a1be7dee?auto=format&fit=crop&q=80" }] } } }
    ]
  }
];

function MyOrdersPageContent() {
  const searchParams = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';

  const { getToken, isAuthenticated, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (isPreview) {
      setOrders(MOCK_ORDERS);
      setIsLoading(false);
      return;
    }

    if (!authLoading) {
      if (isAuthenticated) {
        fetchOrders();
      } else {
        window.location.href = "/sign-in";
      }
    }
  }, [authLoading, isAuthenticated, isPreview]);

  const fetchOrders = async () => {
    setIsLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'development' ? 'http://localhost:6005' : 'https://api.raaghas.in')}/api/v1/orders/my`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to fetch orders");
      const data = await res.json();
      setOrders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-ivory flex items-center justify-center">
        <Loader2 className="animate-spin text-wine" size={32} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-ivory py-12 md:py-20">
      <div className="max-w-5xl mx-auto px-6">
        
        <div className="mb-12 space-y-2">
           <h1 className="text-4xl font-serif text-charcoal">My Orders</h1>
           <p className="text-charcoal/50 text-sm">Manage and track your luxury purchases from Raaghas.</p>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white p-20 rounded-3xl border border-charcoal/5 text-center space-y-6 shadow-sm">
             <div className="w-16 h-16 bg-beige rounded-full flex items-center justify-center mx-auto text-wine">
                <ShoppingBag size={32} />
             </div>
             <p className="text-lg font-medium text-charcoal/60">You haven't placed any orders yet.</p>
             <Link href="/collections/all" className="inline-block bg-charcoal text-white px-8 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-wine transition-all">
               Start Shopping
             </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {orders.map((order) => (
              <motion.div 
                key={order.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl border border-charcoal/5 shadow-sm overflow-hidden hover:border-wine/20 transition-all group"
              >
                <Link href={`/account/orders/${order.id}`} className="block">
                  <div className="p-6 md:p-8 flex flex-col md:flex-row gap-8 items-start md:items-center">
                    
                    {/* Visuals (Stacked or first item) */}
                    <div className="flex -space-x-4">
                       {order.items.slice(0, 3).map((item: any) => (
                         <div key={item.id} className="w-20 h-28 bg-gray-100 border-2 border-white rounded-lg overflow-hidden shadow-sm shrink-0">
                           <img src={item.variant?.product?.images?.[0]?.url} alt="" className="w-full h-full object-cover" />
                         </div>
                       ))}
                    </div>

                    {/* Meta info */}
                    <div className="flex-1 space-y-1">
                       <p className="text-[10px] text-charcoal/30 uppercase font-bold tracking-widest">
                         Order {order.formattedOrderNumber || (order.orderNumber != null ? `RGS-${order.orderNumber + 1000}` : order.id.slice(-8).toUpperCase())}
                       </p>
                       <p className="font-bold text-charcoal">
                         {order.items.length} {order.items.length === 1 ? 'Item' : 'Items'} 
                         <span className="text-charcoal/40 font-normal mx-2">·</span>
                         ₹{Number(order.totalAmount).toLocaleString()}
                       </p>
                       <p className="text-xs text-charcoal/50">{new Date(order.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>

                    {/* Status & Action */}
                    <div className="flex flex-row md:flex-col items-center md:items-end gap-4 w-full md:w-auto">
                       {(() => {
                         const smartStatus = getSmartStatus(order);
                         return (
                           <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest border flex items-center gap-2 ${statusColors[smartStatus] || statusColors.CONFIRMED}`}>
                              {statusIcons[smartStatus]} {getDisplayStatus(smartStatus)}
                           </span>
                         )
                       })()}
                       <span className="text-wine text-xs font-bold uppercase tracking-widest group-hover:translate-x-1 transition-transform flex items-center gap-1">
                          Track Details <ChevronRight size={14} />
                       </span>
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MyOrdersPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-ivory flex items-center justify-center"><Loader2 className="animate-spin text-wine" size={32} /></div>}>
      <MyOrdersPageContent />
    </Suspense>
  );
}
