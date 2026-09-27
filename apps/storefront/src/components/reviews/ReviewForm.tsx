"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Star, Send, CheckCircle2, AlertCircle, X, Loader2, ShieldCheck, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/components/providers/AuthProvider";
import { API_URL } from "@/lib/api";

function ReviewFormContent({ productId }: { productId: string }) {
  const searchParams = useSearchParams();
  const urlOrderId = searchParams?.get("orderId");
  const urlToken = searchParams?.get("token");
  const urlRating = searchParams?.get("rating");
  const isMagicLink = Boolean(urlOrderId && urlToken);

  const { getToken, user, isAuthenticated, loading: authLoading } = useAuth();
  const [isEligible, setIsEligible] = useState<boolean | null>(null);
  const [checkingEligibility, setCheckingEligibility] = useState(true);

  const [rating, setRating] = useState<number>(() => {
    if (urlRating) {
      const parsed = parseInt(urlRating, 10);
      if (!isNaN(parsed) && parsed >= 1 && parsed <= 5) return parsed;
    }
    return 0;
  });
  const [hoverRating, setHoverRating] = useState(0);
  const [headline, setHeadline] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    // If opened with magic review link, check immediately without waiting for user auth
    if (isMagicLink) {
      checkEligibility();
      return;
    }

    if (!authLoading) {
      if (isAuthenticated && user) {
        checkEligibility();
      } else {
        setCheckingEligibility(false);
        setIsEligible(false);
      }
    }
  }, [authLoading, isAuthenticated, user, productId, isMagicLink]);

  const checkEligibility = async () => {
    try {
      let url = `${API_URL}/api/v1/reviews/eligibility/${productId}`;
      const headers: Record<string, string> = {};

      if (urlOrderId && urlToken) {
        url += `?orderId=${encodeURIComponent(urlOrderId)}&token=${encodeURIComponent(urlToken)}`;
      } else {
        const token = await getToken();
        if (token) headers.Authorization = `Bearer ${token}`;
      }

      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = await res.json();
        setIsEligible(Boolean(data));
      } else {
        setIsEligible(false);
      }
    } catch {
      setIsEligible(false);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const removeImage = (idx: number) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return alert("Please select a rating (1 to 5 stars)");

    setIsSubmitting(true);
    
    try {
      const token = await getToken();
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const payload: any = {
        productId,
        rating,
        headline,
        content,
        images
      };

      if (urlOrderId && urlToken) {
        payload.orderId = urlOrderId;
        payload.token = urlToken;
      }

      const res = await fetch(`${API_URL}/api/v1/reviews`, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to submit review");
      }

      setIsSubmitted(true);
    } catch (error: any) {
      alert(error.message || "Something went wrong while submitting your review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if ((authLoading && !isMagicLink) || checkingEligibility) {
    return (
      <div className="h-64 flex items-center justify-center bg-white rounded-2xl border border-charcoal/5">
        <Loader2 className="animate-spin text-wine" />
      </div>
    );
  }

  // Not authenticated and not using magic link
  if (!isAuthenticated && !isMagicLink) {
    return (
      <div className="bg-gray-50 border border-charcoal/5 p-12 text-center rounded-2xl space-y-4">
        <h3 className="text-xl font-serif text-charcoal">Want to share your thoughts?</h3>
        <p className="text-sm text-charcoal/50 max-w-xs mx-auto">
          Please sign in to leave a review, or use the direct review link sent to your WhatsApp or Email.
        </p>
        <a href="/sign-in" className="inline-block text-wine text-xs font-bold uppercase tracking-widest border-b border-wine pb-1">
          Sign In to Review
        </a>
      </div>
    );
  }

  if (isEligible === false) {
    return (
      <div className="bg-orange-50/50 border border-orange-100 p-12 text-center rounded-2xl space-y-4">
        <div className="flex justify-center text-orange-400"><AlertCircle size={32} /></div>
        <h3 className="text-xl font-serif text-charcoal">Verified Buyers Only</h3>
        <p className="text-sm text-charcoal/50 max-w-xs mx-auto">
          Only customers who have purchased this item can leave a review to ensure authenticity for all shoppers.
        </p>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[#FAF7F5] border border-wine/15 p-12 text-center rounded-2xl space-y-4 shadow-sm"
      >
        <div className="flex justify-center text-wine"><CheckCircle2 size={48} /></div>
        <h3 className="text-2xl font-serif text-charcoal">Thank You For Your Review!</h3>
        <p className="text-charcoal/70 max-w-sm mx-auto text-sm leading-relaxed">
          Your review has been received for moderation. Upon verification, your <strong className="text-wine font-semibold">₹150 Raaghas Luxe Wallet Credit</strong> will be automatically credited!
        </p>
        <button 
          onClick={() => { 
            setIsSubmitted(false); 
            setRating(0); 
            setHeadline(""); 
            setContent(""); 
            setImages([]); 
          }} 
          className="text-wine text-xs font-bold uppercase tracking-widest border-b border-wine pb-1 hover:opacity-80 transition-opacity"
        >
          Submit another review
        </button>
      </motion.div>
    );
  }

  return (
    <div className="bg-white p-8 md:p-12 rounded-2xl border border-charcoal/5 shadow-sm space-y-8">
      {/* Verified Buyer & Reward Header */}
      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 text-wine">
             <ShieldCheck size={18} />
             <span className="text-[10px] uppercase font-bold tracking-[0.2em]">Verified Buyer Exclusive</span>
          </div>
          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 rounded-full uppercase tracking-wider flex items-center gap-1">
            <Sparkles size={11} className="text-emerald-600" /> ₹150 Wallet Reward
          </span>
        </div>

        <div>
          <h3 className="text-2xl font-serif text-charcoal">Share Your Experience</h3>
          <p className="text-xs text-charcoal/50 mt-1">
            Tell future shoppers about the drape, fabric, color accuracy, and craftsmanship.
          </p>
        </div>

        {isMagicLink && (
          <div className="bg-gradient-to-r from-[#FAF6F3] to-[#F5ECE5] p-3.5 rounded-xl border border-wine/10 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-wine/10 flex items-center justify-center text-wine shrink-0">
              <Sparkles size={16} />
            </div>
            <p className="text-xs text-charcoal/80 leading-relaxed font-sans">
              <strong>Order Verified:</strong> Reviewing this purchase unlocks an instant <strong>₹150 credit</strong> in your Raaghas Luxe Wallet upon approval.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Star Rating */}
        <div className="space-y-3">
          <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-charcoal/40">Select Your Rating</label>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                className="transition-transform active:scale-90"
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(star)}
              >
                <Star 
                  size={26} 
                  className={(hoverRating || rating) >= star ? "text-wine fill-wine" : "text-charcoal/10"} 
                />
              </button>
            ))}
          </div>
        </div>

        {/* Inputs */}
        <div className="grid grid-cols-1 gap-6">
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-charcoal/40">Headline</label>
            <input 
              type="text" required
              placeholder="Ex: Regal drape and vibrant gold zari"
              className="w-full bg-ivory/30 border border-charcoal/5 px-4 py-3 text-sm focus:border-wine outline-none rounded-lg"
              value={headline}
              onChange={(e) => setHeadline(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-charcoal/40">Review Details</label>
            <textarea 
              rows={4}
              placeholder="How did the garment feel? Where did you wear it? Did you receive compliments?"
              className="w-full bg-ivory/30 border border-charcoal/5 px-4 py-3 text-sm focus:border-wine outline-none resize-none rounded-lg"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              required
            />
          </div>
        </div>

        {/* Photo Upload */}
        <div className="space-y-3">
          <label className="text-[10px] uppercase font-bold tracking-[0.2em] text-charcoal/40">
            Add Photos of You Wearing or Styling It (Optional)
          </label>
          <div className="flex gap-3">
             <input 
               type="file"
               accept="image/*"
               multiple
               onChange={async (e) => {
                 if (!e.target.files || e.target.files.length === 0) return;
                 const fileArray = Array.from(e.target.files);
                 for (const file of fileArray) {
                    const formData = new FormData();
                    formData.append("file", file);
                    try {
                      const res = await fetch(`${API_URL}/api/v1/reviews/upload`, {
                        method: "POST",
                        body: formData
                      });
                      if (res.ok) {
                        const data = await res.json();
                        setImages(prev => [...prev, data.url]);
                      } else {
                        alert("Failed to upload image. Please try again.");
                      }
                    } catch {
                      alert("An error occurred while uploading image.");
                    }
                 }
                 e.target.value = ''; // Reset file input
               }}
               className="flex-1 bg-ivory/30 border border-charcoal/5 px-4 py-3 text-xs focus:border-wine outline-none rounded-lg file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-semibold file:bg-charcoal file:text-white hover:file:bg-wine file:cursor-pointer"
             />
          </div>
          
          {images.length > 0 && (
            <div className="flex flex-wrap gap-3 pt-2">
               {images.map((url, idx) => (
                 <div key={idx} className="relative w-16 h-20 group">
                    <img src={url} alt="Review Preview" className="w-full h-full object-cover rounded-lg border border-charcoal/10" />
                    <button 
                      type="button" 
                      onClick={() => removeImage(idx)} 
                      className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                    >
                      <X size={10} />
                    </button>
                 </div>
               ))}
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button 
          disabled={isSubmitting}
          className="w-full bg-charcoal text-white py-4 text-xs font-bold uppercase tracking-[0.2em] hover:bg-wine transition-all flex items-center justify-center gap-2 group rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? <Loader2 size={16} className="animate-spin text-white" /> : (
            <>
              Submit Verified Review & Claim Reward
              <Send size={14} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function ReviewForm({ productId }: { productId: string }) {
  return (
    <Suspense 
      fallback={
        <div className="h-48 flex items-center justify-center bg-white rounded-2xl border border-charcoal/5">
          <Loader2 className="animate-spin text-wine" />
        </div>
      }
    >
      <ReviewFormContent productId={productId} />
    </Suspense>
  );
}
