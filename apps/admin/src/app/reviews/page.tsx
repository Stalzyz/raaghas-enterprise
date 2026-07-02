"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { 
  Star, 
  CheckCircle, 
  XCircle, 
  Trash2, 
  MessageSquare, 
  User, 
  Package, 
  Loader2,
  ExternalLink,
  ShieldCheck,
  Settings,
  Lock,
  ShoppingBag,
  Save
} from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { motion } from "framer-motion";

export default function ReviewModerationPage() {
  const { token } = useAdminAuth();
  const [reviews, setReviews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');

  // Review Policy Settings
  const [showPolicyPanel, setShowPolicyPanel] = useState(false);
  const [policy, setPolicy] = useState({
    requireLogin: true,
    requirePurchase: true,
  });
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [policySaved, setPolicySaved] = useState(false);

  const API = API_BASE;

  // FIX: Wait for token before fetching
  useEffect(() => {
    if (token) fetchReviews();
  }, [token]);

  // FIX: Load review policy
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/settings`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setPolicy(prev => ({
          requireLogin: data.reviewRequireLogin !== false,
          requirePurchase: data.reviewRequirePurchase !== false,
        }));
      })
      .catch(() => {});
  }, [token]);

  const fetchReviews = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API}/reviews/moderation`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        console.error('Failed to fetch reviews:', res.status);
        setReviews([]);
        return;
      }
      const data = await res.json();
      setReviews(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  };

  const savePolicy = async () => {
    if (!token) return;
    setSavingPolicy(true);
    try {
      await fetch(`${API}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          reviewRequireLogin: policy.requireLogin,
          reviewRequirePurchase: policy.requirePurchase,
        })
      });
      setPolicySaved(true);
      setTimeout(() => setPolicySaved(false), 3000);
    } catch (e) {
      alert('Failed to save review policy');
    } finally {
      setSavingPolicy(false);
    }
  };

  const moderateReview = async (id: string, approved: boolean) => {
    try {
      
      await fetch(`${API_BASE}/reviews/${id}/moderate?approved=${approved}`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(prev => prev.map(r => r.id === id ? { ...r, approved } : r));
    } catch (error) {
      alert("Error moderating review");
    }
  };

  const deleteReview = async (id: string) => {
    if (!confirm("Are you sure you want to delete this review?")) return;
    try {
      
      await fetch(`${API_BASE}/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      setReviews(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      alert("Error deleting review");
    }
  };

  const filteredReviews = reviews.filter(r => {
    if (filter === 'PENDING') return !r.approved;
    if (filter === 'APPROVED') return r.approved;
    return true;
  });

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-wine" size={40} />
      </div>
    );
  }

  const pendingCount = reviews.filter(r => !r.approved).length;

  return (
    <div className="space-y-10 pb-20">
      
      {/* ─── MODERATION HUD ─── */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Review Moderation</h2>
          <p className="text-gray-500 font-medium font-sans text-sm">Guard the brand's integrity and showcase customer love.</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowPolicyPanel(!showPolicyPanel)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-charcoal rounded-xl text-xs font-bold uppercase tracking-widest shadow-sm hover:bg-gray-50 transition-all"
          >
            <Settings size={14} /> Review Policy
          </button>
          <div className="flex bg-white border border-gray-100 p-1 rounded-2xl shadow-sm">
             {(['ALL', 'PENDING', 'APPROVED'] as const).map((f) => (
               <button
                 key={f}
                 onClick={() => setFilter(f)}
                 className={`px-6 py-2 rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all ${filter === f ? 'bg-charcoal text-white shadow-md' : 'text-gray-400 hover:text-charcoal'}`}
               >
                  {f} {f === 'PENDING' && pendingCount > 0 && <span className="ml-1 opacity-60">({pendingCount})</span>}
               </button>
             ))}
          </div>
        </div>
      </div>

      {/* ─── REVIEW POLICY PANEL ─── */}
      {showPolicyPanel && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-wine/20 rounded-[32px] p-8 shadow-md space-y-6"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-charcoal uppercase tracking-widest flex items-center gap-2">
                <ShieldCheck size={16} className="text-wine" /> Review Submission Policy
              </h3>
              <p className="text-xs text-gray-400 mt-1 font-sans">Control who can submit reviews on the storefront. Changes apply immediately.</p>
            </div>
            {policySaved && (
              <span className="text-xs text-green-600 font-bold uppercase tracking-widest flex items-center gap-1">
                <CheckCircle size={14} /> Saved!
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Login Required */}
            <div className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
              policy.requireLogin
                ? 'border-wine bg-wine/5'
                : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
            }`}
              onClick={() => setPolicy(prev => ({ ...prev, requireLogin: !prev.requireLogin }))}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${policy.requireLogin ? 'bg-wine/10 text-wine' : 'bg-gray-100 text-gray-400'}`}>
                  <Lock size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-charcoal">Login Required</p>
                    <div className={`w-10 h-5 rounded-full transition-all relative ${
                      policy.requireLogin ? 'bg-wine' : 'bg-gray-200'
                    }`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        policy.requireLogin ? 'left-5' : 'left-0.5'
                      }`} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-sans leading-relaxed">
                    {policy.requireLogin
                      ? 'Only logged-in customers can submit reviews.'
                      : 'Anyone (including guests) can submit reviews.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Verified Purchase Required */}
            <div className={`p-6 rounded-2xl border-2 cursor-pointer transition-all ${
              policy.requirePurchase
                ? 'border-wine bg-wine/5'
                : 'border-gray-100 bg-gray-50/50 hover:border-gray-200'
            }`}
              onClick={() => setPolicy(prev => ({ ...prev, requirePurchase: !prev.requirePurchase }))}
            >
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl ${policy.requirePurchase ? 'bg-wine/10 text-wine' : 'bg-gray-100 text-gray-400'}`}>
                  <ShoppingBag size={20} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-charcoal">Purchase Required</p>
                    <div className={`w-10 h-5 rounded-full transition-all relative ${
                      policy.requirePurchase ? 'bg-wine' : 'bg-gray-200'
                    }`}>
                      <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                        policy.requirePurchase ? 'left-5' : 'left-0.5'
                      }`} />
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 font-sans leading-relaxed">
                    {policy.requirePurchase
                      ? 'Customer must have purchased this exact product.'
                      : 'Any logged-in user can review any product.'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-gray-50">
            <button
              onClick={() => setShowPolicyPanel(false)}
              className="px-5 py-2 border border-gray-200 rounded-xl text-xs font-bold uppercase tracking-widest text-gray-500 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={savePolicy}
              disabled={savingPolicy}
              className="flex items-center gap-2 px-6 py-2 bg-wine text-white rounded-xl text-xs font-bold uppercase tracking-widest shadow hover:bg-red-900 disabled:opacity-50 transition-all"
            >
              <Save size={14} /> {savingPolicy ? 'Saving...' : 'Save Policy'}
            </button>
          </div>
        </motion.div>
      )}

      {/* ─── REVIEW FEED ─── */}
      <div className="grid grid-cols-1 gap-6">
         {filteredReviews.map((review) => (
           <motion.div 
             layout
             key={review.id} 
             className="bg-white border border-gray-100 rounded-[32px] p-8 shadow-sm group hover:shadow-md transition-all border-l-4"
             style={{ borderLeftColor: review.approved ? '#22c55e' : '#f59e0b' }}
           >
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_250px] gap-10">
                 
                 <div className="space-y-6">
                    {/* Header */}
                    <div className="flex justify-between items-start">
                       <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-beige rounded-2xl flex items-center justify-center text-wine font-bold text-lg">
                             {review.user?.name?.charAt(0) || <User size={20} />}
                          </div>
                          <div>
                             <h4 className="font-bold text-charcoal flex items-center gap-2">
                                {review.user?.name || "Anonymous"} 
                                <ShieldCheck size={14} className="text-blue-500" />
                                <span className="text-[10px] text-blue-500 uppercase tracking-widest font-sans">Verified Buyer</span>
                             </h4>
                             <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-1">
                                {new Date(review.createdAt).toLocaleDateString()} at {new Date(review.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                             </p>
                          </div>
                       </div>
                       <div className="flex text-wine">
                          {[1, 2, 3, 4, 5].map((s) => (
                            <Star key={s} size={16} fill={s <= review.rating ? "currentColor" : "none"} strokeWidth={2} />
                          ))}
                       </div>
                    </div>

                    {/* Content */}
                    <div className="space-y-3">
                       <h5 className="text-xl font-bold text-charcoal">{review.headline}</h5>
                       <p className="text-gray-600 leading-relaxed font-sans">{review.content}</p>
                    </div>

                    {/* Images */}
                    {review.images && review.images.length > 0 && (
                      <div className="flex gap-3 pt-2">
                         {review.images.map((img: any) => (
                           <div key={img.id} className="relative group/img overflow-hidden rounded-xl border border-gray-100 w-24 h-32">
                              <img src={img.url} alt="Review" className="w-full h-full object-cover transition-transform group-hover/img:scale-110" />
                           </div>
                         ))}
                      </div>
                    )}
                 </div>

                 <div className="bg-gray-50/50 rounded-[24px] p-6 flex flex-col justify-between space-y-6">
                    <div className="space-y-4">
                       <div className="space-y-1">
                          <p className="text-[8px] font-bold text-gray-400 uppercase tracking-[0.2em]">Product</p>
                          <a 
                            href={`/products/${review.product?.handle}`} 
                            target="_blank" 
                            className="flex items-center gap-2 text-xs font-bold text-charcoal hover:text-wine transition-colors"
                          >
                             <Package size={14} /> {review.product?.title || "Unknown Product"} <ExternalLink size={10} />
                          </a>
                       </div>
                       
                       <div className="pt-2">
                          <span className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${review.approved ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
                             {review.approved ? 'Approved & Live' : 'Pending Moderation'}
                          </span>
                       </div>
                    </div>

                    <div className="flex flex-col gap-2">
                       {!review.approved ? (
                         <button 
                           onClick={() => moderateReview(review.id, true)}
                           className="w-full bg-green-600 text-white py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-green-700 transition-all flex items-center justify-center gap-2"
                         >
                            <CheckCircle size={14} /> Approve Review
                         </button>
                       ) : (
                         <button 
                           onClick={() => moderateReview(review.id, false)}
                           className="w-full bg-gray-200 text-charcoal py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-orange-100 hover:text-orange-700 transition-all flex items-center justify-center gap-2"
                         >
                            <XCircle size={14} /> Revoke Approval
                         </button>
                       )}
                       <button 
                         onClick={() => deleteReview(review.id)}
                         className="w-full py-3 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-red-500 transition-all flex items-center justify-center gap-2"
                       >
                          <Trash2 size={14} /> Delete Permanently
                       </button>
                    </div>
                 </div>

              </div>
           </motion.div>
         ))}

         {filteredReviews.length === 0 && (
           <div className="text-center py-40 space-y-4">
              <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200">
                 <MessageSquare size={32} />
              </div>
              <p className="text-gray-400 font-medium">No reviews found matching this filter.</p>
           </div>
         )}
      </div>

    </div>
  );
}
