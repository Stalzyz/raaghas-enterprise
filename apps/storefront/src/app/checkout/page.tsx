"use client";

import { API_URL } from "@/lib/api";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Loader2, CheckCircle, ChevronRight, AlertCircle, Tag as TagIcon, Zap, IndianRupee, Sparkles, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useCart } from "@/context/CartContext";
import { getAssetUrl } from "@/lib/utils/assets";
import Cookies from "js-cookie";
import { OffersProgress } from "@/components/ui/OffersProgress";
import { ShippingPredictor } from "@/components/ui/ShippingPredictor";


const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh", 
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry"
];

// ─── Razorpay SDK Loader (replaces <Script> tag which has race conditions) ────
function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if ((window as any).Razorpay) {
      resolve(true);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function CheckoutPage() {
  const router = useRouter();
  const { items, cartTotal: baseTotal, isInitialized: isCartReady } = useCart();

  const getToken = () => {
    const t = Cookies.get("auth_token");
    if (!t || t === "null" || t === "undefined") return null;
    return t;
  };

  // ── State ─────────────────────────────────────────────────────────────────
  const [authChecked, setAuthChecked] = useState(false);
  const [shippingCost, setShippingCost] = useState(0);
  const [shippingOptions, setShippingOptions] = useState<any[]>([]);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>("");
  const [useDifferentBilling, setUseDifferentBilling] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoState, setPromoState] = useState<{
    status: "IDLE" | "LOADING" | "SUCCESS" | "ERROR";
    message?: string;
    amount?: number;
  }>({ status: "IDLE" });
  const [processing, setProcessing] = useState(false);
  const [processingMsg, setProcessingMsg] = useState("Processing your order...");
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [wallet, setWallet] = useState<{ balance: number; use: boolean }>({ balance: 0, use: false });
  const [maxCreditUsagePercent, setMaxCreditUsagePercent] = useState(50);
  const [autoOffer, setAutoOffer] = useState<{ id: string; name: string; amount: number } | null>(null);
  
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedSavedAddressId, setSelectedSavedAddressId] = useState<string>("");
  const [saveNewAddress, setSaveNewAddress] = useState(false);

  const [form, setForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    address: "",
    landmark: "",
    city: "",
    state: "",
    pincode: "",
    phone: "",
    billingFirstName: "",
    billingLastName: "",
    billingAddress: "",
    billingLandmark: "",
    billingCity: "",
    billingState: "",
    billingPincode: "",
    billingPhone: "",
  });

  const handlePincodeChange = async (val: string, isBilling: boolean) => {
    const cleaned = val.replace(/\D/g, "").slice(0, 6);
    if (isBilling) {
      setForm(prev => ({ ...prev, billingPincode: cleaned }));
    } else {
      setForm(prev => ({ ...prev, pincode: cleaned }));
    }
    
    if (cleaned.length === 6) {
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${cleaned}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success" && data[0].PostOffice && data[0].PostOffice.length > 0) {
          const info = data[0].PostOffice[0];
          const matchedState = INDIAN_STATES.find(s => s.toLowerCase().replace(/\s/g, "") === info.State.toLowerCase().replace(/\s/g, "")) || info.State;
          if (isBilling) {
            setForm(prev => ({ 
              ...prev, 
              billingCity: info.District, 
              billingState: matchedState
            }));
          } else {
            setForm(prev => ({ 
              ...prev, 
              city: info.District, 
              state: matchedState
            }));
          }
        }
      } catch (err) {
        console.error("Failed to auto-fill address from pincode:", err);
      }
    }
  };

  // ── Derived totals ────────────────────────────────────────────────────────
  const excludedTax = items.reduce((acc, item) => {
    if (item.taxInclusive === false) {
      return acc + item.price * item.quantity * ((item.taxRate || 5) / 100);
    }
    return acc;
  }, 0);

  const walletDeduction = wallet.use
    ? Math.min(
        wallet.balance,
        (baseTotal + excludedTax - (promoState.amount || 0) - (autoOffer?.amount || 0)) * (maxCreditUsagePercent / 100)
      )
    : 0;

  const netPayable =
    baseTotal +
    excludedTax -
    (promoState.amount || 0) -
    (autoOffer?.amount || 0) +
    shippingCost -
    walletDeduction;

  // ── Auth Enforcement ──────────────────────────────────────────────────────
  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/sign-in?redirect=/checkout");
      // Still mark as checked so we don't show spinner while redirect happens
      setAuthChecked(true);
      return;
    }
    setAuthChecked(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Empty cart guard ──────────────────────────────────────────────────────
  useEffect(() => {
    if (isCartReady && items.length === 0) router.push("/cart");
  }, [items, router, isCartReady]);

  // ── Track InitiateCheckout ──────────────────────────────────────────────────
  const trackedInitiateCheckout = useRef(false);
  useEffect(() => {
    if (isCartReady && items.length > 0 && !trackedInitiateCheckout.current) {
      trackedInitiateCheckout.current = true;
      const eventId = "evt_" + Date.now() + "_" + Math.random().toString(36).substring(2, 9);
      import("@/components/analytics/MetaPixel").then((m) => {
        m.trackMetaEvent("InitiateCheckout", {
          currency: "INR",
          value: baseTotal,
          num_items: items.reduce((acc, i) => acc + i.quantity, 0),
          content_ids: items.map(i => i.variantId)
        }, eventId);
      });

      fetch(API_URL + "/api/v1/marketing/capi/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventName: "InitiateCheckout",
          amount: baseTotal,
          currency: "INR",
          metaEventId: eventId
        })
      }).catch(() => {});
    }
  }, [isCartReady, items, baseTotal]);

  // ── syncLead helper ───────────────────────────────────────────────────────
  const syncLead = async (currentForm = form) => {
    if (!currentForm.phone || currentForm.phone.length < 10) return;
    try {
      await fetch(`${API_URL}/api/v1/marketing/discounts/track-lead`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: currentForm.phone,
          email: currentForm.email,
          name: `${currentForm.firstName} ${currentForm.lastName}`,
          cartTotal: netPayable,
          items,
        }),
      });
    } catch (e) {
      console.error("Lead sync failed", e);
    }
  };

  // ── Growth data fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchGrowthData = async () => {
      try {
        const token = getToken();
        const offerRes = await fetch(`${API_URL}/api/v1/growth/offers/eligible`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cartValue: baseTotal, items }),
        });
        if (offerRes.ok) {
          const offers = await offerRes.json();
          if (Array.isArray(offers) && offers.length > 0) {
            const best = offers[0];
            setAutoOffer({ id: best.id, name: best.name, amount: best.actions?.value || 0 });
          }
        }
        
        // Fetch Auto-Apply Coupons
        const autoApplyRes = await fetch(`${API_URL}/api/v1/growth/offers/auto-apply`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
          body: JSON.stringify({ cartValue: baseTotal, items }),
        });
        if (autoApplyRes.ok) {
          const autoCoupon = await autoApplyRes.json();
          if (autoCoupon && autoCoupon.coupon) {
            // Only auto-apply if user hasn't already applied one manually
            setPromoCode((prev) => {
              if (!prev || prev === autoCoupon.coupon.code) {
                setPromoState({ status: "SUCCESS", message: "Auto-applied!", amount: autoCoupon.discountAmount });
                return autoCoupon.coupon.code;
              }
              return prev;
            });
          }
        }
        
        try {
          const settingsRes = await fetch(`${API_URL}/api/v1/settings/public`);
          if (settingsRes.ok) {
            const settings = await settingsRes.json();
            if (settings.maxCreditUsagePercent !== undefined) {
              setMaxCreditUsagePercent(settings.maxCreditUsagePercent);
            }
          }
        } catch (e) {}

        if (token) {
          const walletRes = await fetch(`${API_URL}/api/v1/growth/wallet`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (walletRes.ok) {
            const wData = await walletRes.json();
            setWallet({ balance: Number(wData.balance), use: false });
          }
          const profileRes = await fetch(`${API_URL}/api/v1/auth/me`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          if (profileRes.ok) {
            const data = await profileRes.json();
            const profileData = data.user || data;
            if (profileData.savedAddresses && profileData.savedAddresses.length > 0) {
              setSavedAddresses(profileData.savedAddresses);
            }
            if (profileData.name && !form.firstName) {
              const [first, ...rest] = profileData.name.split(' ');
              setForm(prev => ({...prev, firstName: first, lastName: rest.join(' '), email: profileData.email || prev.email}));
            }
          }
        }
      } catch (e) {
        console.error("Growth data fetch failed", e);
      }
    };
    fetchGrowthData();
  }, [baseTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Dynamic Shipping ──────────────────────────────────────────────────────
  const fetchShippingOptions = async (state: string) => {
    if (!state || state.length < 2) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/logistics/calculate-shipping`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, total: baseTotal, items }),
      });
      if (res.ok) {
        const options = await res.json();
        setShippingOptions(options);
        if (options.length > 0) {
          setSelectedShippingMethod(options[0].id);
          setShippingCost(options[0].cost);
        }
      }
    } catch (e) {
      console.error("Shipping calc failed", e);
    }
  };

  useEffect(() => {
    if (form.state) fetchShippingOptions(form.state);
  }, [form.state, baseTotal]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── EARLY RETURN: spinner while auth is being verified ────────────────────
  if (!authChecked) {
    return (
      <div className="min-h-screen bg-theme-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-wine" size={48} />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Action Handlers
  // ─────────────────────────────────────────────────────────────────────────

  const applyPromo = async () => {
    if (!promoCode) return;
    setPromoState({ status: "LOADING" });
    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/v1/growth/coupons/validate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ code: promoCode, cartValue: baseTotal, items }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid coupon");
      setPromoState({ status: "SUCCESS", message: "Coupon Applied!", amount: data.discountAmount });
      syncLead();
    } catch (error: any) {
      setPromoState({ status: "ERROR", message: error.message });
    }
  };

  const removePromo = () => {
    setPromoCode("");
    setPromoState({ status: "IDLE" });
  };

  const validateForm = () => {
    const required = ["email", "firstName", "lastName", "address", "city", "state", "pincode", "phone"];
    for (const field of required) {
      if (!(form as any)[field]?.trim()) {
        alert(`Please provide your ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`);
        return false;
      }
    }
    const cleanPhone = form.phone.replace(/\D/g, "");
    if (cleanPhone.length !== 10) {
      alert("Phone number must be strictly 10 digits");
      return false;
    }
    if (useDifferentBilling) {
      const billingRequired = [
        "billingFirstName",
        "billingLastName",
        "billingAddress",
        "billingCity",
        "billingState",
        "billingPincode",
      ];
      for (const field of billingRequired) {
        if (!(form as any)[field]?.trim()) {
          alert(`Please provide your billing ${field.replace("billing", "").toLowerCase()}`);
          return false;
        }
      }
      const cleanBillingPhone = (form.billingPhone || form.phone).replace(/\D/g, "");
      if (cleanBillingPhone.length !== 10) {
        alert("Billing phone number must be strictly 10 digits");
        return false;
      }
    }
    if (!selectedShippingMethod) {
      alert("Please select a shipping method to proceed.");
      return false;
    }
    return true;
  };

  const handlePayment = async () => {
    if (!validateForm()) return;

    const token = getToken();
    if (!token) {
      router.push("/sign-in?redirect=/checkout");
      return;
    }

    setProcessing(true);
    setProcessingMsg("Preparing your order...");

    try {
      // ── Step 1: Load Razorpay SDK (safe, idempotent) ─────────────────────
      setProcessingMsg("Loading payment gateway...");
      const sdkLoaded = await loadRazorpayScript();
      if (!sdkLoaded) {
        throw new Error("Payment gateway SDK failed to load. Please check your internet connection and try again.");
      }

      await syncLead();

      // ── Step 2: Create payment intent on backend ──────────────────────────
      setProcessingMsg("Creating secure payment session...");
      const res = await fetch(`${API_URL}/api/v1/payments/create-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: items.map((item) => ({ variantId: item.variantId, quantity: item.quantity })),
          customerInfo: {
            name: `${form.firstName} ${form.lastName}`,
            email: form.email,
            phone: form.phone.startsWith("+91") ? form.phone : `+91${form.phone.replace(/\D/g, "")}`,
          },
          shippingAddress: {
            address: form.address,
            landmark: form.landmark,
            city: form.city,
            state: form.state,
            pincode: form.pincode,
          },
          billingAddress: useDifferentBilling
            ? {
                address: form.billingAddress,
                landmark: form.billingLandmark,
                city: form.billingCity,
                state: form.billingState,
                pincode: form.billingPincode,
                firstName: form.billingFirstName,
                lastName: form.billingLastName,
                phone: (form.billingPhone || form.phone).startsWith("+91") ? (form.billingPhone || form.phone) : `+91${(form.billingPhone || form.phone).replace(/\D/g, "")}`,
              }
            : {
                address: form.address,
                landmark: form.landmark,
                city: form.city,
                state: form.state,
                pincode: form.pincode,
                firstName: form.firstName,
                lastName: form.lastName,
                phone: form.phone.startsWith("+91") ? form.phone : `+91${form.phone.replace(/\D/g, "")}`,
              },
          discountCode: promoState.status === "SUCCESS" ? promoCode : undefined,
          useWalletCredits: wallet.use,
          gateway: "RAZORPAY",
          shippingCost,
          shippingMethodId: selectedShippingMethod,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to initiate payment session. Please try again.");
      }

      // ── Step 3: Validate payload from backend ─────────────────────────────
      if (data.netPayable === 0 && data.paymentPayload?.freeOrder) {
        setPaymentSuccess(true);
        const token = getToken();
        if (token) {
          setTimeout(() => router.push(`/account/orders?status=success`), 2000);
        } else {
          setTimeout(() => router.push(`/orders/${data.orderId}?status=success&email=${encodeURIComponent(form.email)}`), 2000);
        }
        return;
      }

      if (!data.paymentPayload?.keyId) {
        throw new Error("Payment gateway is not configured. Please contact support.");
      }

      // ── Step 4: Open Razorpay modal ───────────────────────────────────────
      // We hide our processing overlay here so Razorpay modal is visible
      setProcessing(false);
      let paymentHandled = false;

      const options = {
        key: data.paymentPayload.keyId,
        amount: data.paymentPayload.amountInPaise,
        currency: "INR",
        name: "Raaghas",
        description: "Luxury Wardrobe Purchase",
        image: "https://raaghas.in/logo.png",
        order_id: data.providerOrderId,
        handler: async function (response: any) {
          paymentHandled = true;
          // Payment success — verify with backend
          setProcessing(true);
          setProcessingMsg("Verifying your payment...");
          try {
            const purchaseEventId = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
            const vRes = await fetch(`${API_URL}/api/v1/payments/verify`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                gateway: "RAZORPAY",
                providerOrderId: data.providerOrderId,
                paymentId: response.razorpay_payment_id,
                signature: response.razorpay_signature,
                discountCode: promoState.status === "SUCCESS" ? promoCode : undefined,
                discountAmount: promoState.amount,
                metaEventId: purchaseEventId
              }),
            });
            if (vRes.ok) {
              const orderData = await vRes.json();
              setPaymentSuccess(true);

              // Track Purchase with deduplication eventID
              import("@/components/analytics/MetaPixel").then((m) => {
                m.trackMetaEvent("Purchase", {
                  value: Number(orderData.totalAmount || orderData.total || 0),
                  currency: "INR",
                  content_ids: items.map((i) => i.variantId),
                  content_type: "product",
                  num_items: items.reduce((sum, i) => sum + i.quantity, 0),
                  order_id: orderData.id,
                }, purchaseEventId);
              });
              if (token) {
                if (saveNewAddress && !selectedSavedAddressId) {
                  fetch(`${API_URL}/api/v1/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
                    .then(r => r.json())
                    .then(data => {
                      const profile = data.user || data;
                      const newAddr = {
                        id: Date.now().toString(),
                        type: "Checkout Address",
                        line1: form.address,
                        line2: form.landmark,
                        city: form.city,
                        state: form.state,
                        postalCode: form.pincode,
                        phone: form.phone
                      };
                      const updatedAddresses = [...(profile.savedAddresses || []), newAddr];
                      return fetch(`${API_URL}/api/v1/auth/me`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                        body: JSON.stringify({ savedAddresses: updatedAddresses })
                      });
                    }).catch(console.error);
                }
                setTimeout(() => router.push(`/account/orders?status=success`), 2000);
              } else {
                setTimeout(() => router.push(`/orders/${orderData.id}?status=success&email=${encodeURIComponent(form.email)}`), 2000);
              }
            } else {
              const errData = await vRes.json().catch(() => ({}));
              throw new Error(errData.message || "Payment verification failed. Please contact support.");
            }
          } catch (e: any) {
            setProcessing(false);
            alert(`Payment Error: ${e.message}`);
          }
        },
        prefill: {
          name: `${form.firstName} ${form.lastName}`,
          email: form.email,
          contact: form.phone,
        },
        theme: {
          color: "#4A0E0E",
        },
        modal: {
          ondismiss: function () {
            if (paymentHandled) return;
            // User closed the modal — unlock UI and cancel intent
            setProcessing(false);
            fetch(`${API_URL}/api/v1/payments/cancel-intent`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ providerOrderId: data.providerOrderId })
            }).catch(e => console.error('Failed to cancel intent', e));
          },
          escape: true,
          animation: true,
        },
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on("payment.failed", function (response: any) {
        setProcessing(false);
        fetch(`${API_URL}/api/v1/payments/cancel-intent`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ providerOrderId: data.providerOrderId })
        }).catch(e => console.error('Failed to cancel intent', e));
        
        const errMsg =
          response.error?.description ||
          response.error?.reason ||
          "Payment failed. Please try a different payment method.";
        alert(`Payment Failed: ${errMsg}`);
      });
      rzp.open();
    } catch (error: any) {
      console.error("Payment initiation error:", error);
      setProcessing(false);
      alert(error.message || "Something went wrong. Please try again.");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-theme-bg text-theme-text font-sans flex flex-col md:flex-row pt-[160px] md:pt-[120px]">

      {/* ─── PROCESSING OVERLAY ─── */}
      <AnimatePresence>
        {processing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-xl z-[200] flex flex-col items-center justify-center p-6 text-center"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              className="bg-theme-surface border border-theme-border p-12 rounded-[40px] shadow-2xl space-y-8 max-w-lg w-full"
            >
              {paymentSuccess ? (
                <div className="space-y-6 py-4">
                  <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mx-auto">
                    <CheckCircle className="text-white" size={48} />
                  </div>
                  <h3 className="text-2xl font-serif">Purchase Confirmed!</h3>
                  <p className="text-xs uppercase font-bold tracking-widest opacity-60">
                    Redirecting to your order...
                  </p>
                </div>
              ) : (
                <div className="space-y-8">
                  <Loader2 className="animate-spin text-theme-text mx-auto" size={64} />
                  <div className="space-y-2">
                    <p className="text-sm font-bold">{processingMsg}</p>
                    <p className="text-xs uppercase tracking-widest opacity-40">Please do not close this page</p>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── LEFT: FORMS ─── */}
      <div className="w-full md:w-[55%] lg:w-[60%] p-6 md:p-12 lg:p-20 order-2 md:order-1 flex flex-col">
        <div className="mb-10 block">
          <Link href="/" className="text-3xl font-serif tracking-widest text-theme-text block mb-4">
            RAAGHAS
          </Link>
          <div className="flex items-center text-[10px] uppercase tracking-widest text-theme-text-muted gap-2">
            <Link href="/cart" className="hover:text-wine transition-colors">Cart</Link>
            <ChevronRight size={10} />
            <span className="text-theme-text font-bold">Checkout</span>
          </div>
        </div>

        <div className="max-w-xl mx-auto md:mx-0 w-full space-y-10">

          {/* Contact */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif">Contact Details</h2>
            <input
              type="email"
              placeholder="Email Address"
              className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              onBlur={() => syncLead()}
            />
          </section>

          {/* Wallet Credits */}
          {wallet.balance > 0 && (
            <section className="p-6 bg-theme-surface rounded-2xl border border-theme-border space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-wine/10 rounded-full flex items-center justify-center text-wine">
                    <IndianRupee size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold">Raaghas Wallet</h3>
                    <p className="text-xs text-theme-text-muted">Available: ₹{wallet.balance.toLocaleString()}</p>
                  </div>
                </div>
                <button
                  onClick={() => setWallet((w) => ({ ...w, use: !w.use }))}
                  className={`px-4 py-2 rounded-full text-xs font-bold transition-all ${
                    wallet.use ? "bg-wine text-white" : "bg-theme-bg border border-theme-border text-theme-text"
                  }`}
                >
                  {wallet.use ? "Applied ✓" : "Apply Credits"}
                </button>
              </div>
              {wallet.use && (
                <p className="text-[10px] text-wine font-medium">
                  Up to {maxCreditUsagePercent}% of cart value can be paid using wallet credits.
                </p>
              )}
            </section>
          )}

          {savedAddresses.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-xl font-serif">Saved Addresses</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {savedAddresses.map((addr: any) => (
                  <div 
                    key={addr.id}
                    onClick={() => {
                      setSelectedSavedAddressId(addr.id);
                      setForm(prev => ({
                        ...prev,
                        address: addr.line1,
                        landmark: addr.line2 || "",
                        city: addr.city,
                        state: addr.state,
                        pincode: addr.postalCode,
                        phone: addr.phone || prev.phone
                      }));
                      fetchShippingOptions(addr.state);
                    }}
                    className={`p-4 border rounded-xl cursor-pointer transition-all ${
                      selectedSavedAddressId === addr.id ? "border-wine bg-wine/5" : "border-theme-border hover:border-wine/50"
                    }`}
                  >
                    <h4 className="text-[10px] font-bold uppercase tracking-widest text-wine mb-2">{addr.type || "Address"}</h4>
                    <p className="text-sm text-theme-text-muted">
                      {addr.line1}, {addr.city}, {addr.state} - {addr.postalCode}
                    </p>
                  </div>
                ))}
              </div>
              <div className="flex justify-end">
                <button 
                  onClick={() => {
                    setSelectedSavedAddressId("");
                    setForm(prev => ({...prev, address: "", landmark: "", city: "", state: "", pincode: ""}));
                  }}
                  className="text-[10px] uppercase font-bold text-theme-text-muted hover:text-wine"
                >
                  Clear Selection
                </button>
              </div>
            </section>
          )}

          {/* Shipping Address */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif">{selectedSavedAddressId ? "Review Address" : "Shipping Address"}</h2>
            <div className="grid grid-cols-2 gap-4">
              <input type="text" placeholder="First Name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" />
              <input type="text" placeholder="Last Name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" />
              <input type="text" placeholder="Street Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="col-span-2 w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" />
              <input type="text" placeholder="Landmark" value={form.landmark} onChange={(e) => setForm({ ...form, landmark: e.target.value })} className="col-span-2 w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" />
              
              <input 
                type="text" 
                placeholder="PIN Code" 
                maxLength={6}
                value={form.pincode} 
                onChange={(e) => handlePincodeChange(e.target.value, false)} 
                className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" 
              />
              
              <div className="flex border border-theme-border rounded-md overflow-hidden bg-theme-bg focus-within:border-wine">
                <span className="bg-theme-surface px-3 py-3 text-sm text-theme-text-muted select-none flex items-center border-r border-theme-border font-medium">+91</span>
                <input 
                  type="tel" 
                  placeholder="Phone" 
                  maxLength={10} 
                  value={form.phone} 
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, "") })} 
                  onBlur={() => syncLead()} 
                  className="w-full bg-transparent px-4 py-3 text-sm outline-none transition-all text-theme-text" 
                />
              </div>

              <input type="text" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" />
              
              <select 
                value={form.state} 
                onChange={(e) => setForm({ ...form, state: e.target.value })} 
                className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text"
              >
                <option value="">Select State</option>
                {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {!selectedSavedAddressId && (
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={saveNewAddress}
                    onChange={() => setSaveNewAddress(!saveNewAddress)}
                    className="w-4 h-4 rounded border-theme-border text-wine focus:ring-wine"
                  />
                  <span className="text-sm text-theme-text-muted group-hover:text-theme-text transition-colors">
                    Save this address for future use
                  </span>
                </label>
              </div>
            )}

            <div className="pt-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={!useDifferentBilling}
                  onChange={() => setUseDifferentBilling(!useDifferentBilling)}
                  className="w-4 h-4 rounded border-theme-border text-wine focus:ring-wine"
                />
                <span className="text-sm text-theme-text-muted group-hover:text-theme-text transition-colors">
                  Billing address same as shipping
                </span>
              </label>
            </div>

            <AnimatePresence>
              {useDifferentBilling && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden space-y-4 pt-6 border-t border-theme-border mt-6"
                >
                  <h2 className="text-xl font-serif">Billing Address</h2>
                  <div className="grid grid-cols-2 gap-4">
                    <input type="text" placeholder="First Name" value={form.billingFirstName} onChange={(e) => setForm({ ...form, billingFirstName: e.target.value })} className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" />
                    <input type="text" placeholder="Last Name" value={form.billingLastName} onChange={(e) => setForm({ ...form, billingLastName: e.target.value })} className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" />
                    <input type="text" placeholder="Street Address" value={form.billingAddress} onChange={(e) => setForm({ ...form, billingAddress: e.target.value })} className="col-span-2 w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" />
                    <input type="text" placeholder="Landmark" value={form.billingLandmark} onChange={(e) => setForm({ ...form, billingLandmark: e.target.value })} className="col-span-2 w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" />
                    
                    <input 
                      type="text" 
                      placeholder="PIN Code" 
                      maxLength={6}
                      value={form.billingPincode} 
                      onChange={(e) => handlePincodeChange(e.target.value, true)} 
                      className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" 
                    />
                    
                    <div className="flex border border-theme-border rounded-md overflow-hidden bg-theme-bg focus-within:border-wine">
                      <span className="bg-theme-surface px-3 py-3 text-sm text-theme-text-muted select-none flex items-center border-r border-theme-border font-medium">+91</span>
                      <input 
                        type="tel" 
                        placeholder="Phone" 
                        maxLength={10} 
                        value={form.billingPhone || form.phone} 
                        onChange={(e) => setForm({ ...form, billingPhone: e.target.value.replace(/\D/g, "") })} 
                        className="w-full bg-transparent px-4 py-3 text-sm outline-none transition-all text-theme-text" 
                      />
                    </div>

                    <input type="text" placeholder="City" value={form.billingCity} onChange={(e) => setForm({ ...form, billingCity: e.target.value })} className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text" />
                    
                    <select 
                      value={form.billingState} 
                      onChange={(e) => setForm({ ...form, billingState: e.target.value })} 
                      className="w-full bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </section>

          {/* Shipping Method */}
          <section className="space-y-4">
            <h2 className="text-xl font-serif">Shipping Method</h2>
            {shippingOptions.length > 0 ? (
              <>
                <div className="border border-theme-border rounded-xl overflow-hidden divide-y divide-theme-border">
                  {shippingOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-center justify-between p-4 cursor-pointer transition-colors ${
                        selectedShippingMethod === option.id ? "bg-theme-surface" : "hover:bg-theme-surface/50"
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <input
                          type="radio"
                          name="shipping"
                          checked={selectedShippingMethod === option.id}
                          onChange={() => {
                            setSelectedShippingMethod(option.id);
                            setShippingCost(option.cost);
                          }}
                        />
                        <div>
                          <p className="font-medium text-sm text-theme-text">{option.name}</p>
                          <p className="text-[10px] text-theme-text-muted">
                            {option.description || "Standard delivery"}
                          </p>
                        </div>
                      </div>
                      <span className="text-sm font-bold">
                        {option.cost === 0 ? "Free" : `₹${option.cost.toLocaleString()}`}
                      </span>
                    </label>
                  ))}
                </div>
                {shippingOptions.some((o) => o.isHeavy) && (
                  <div className="flex items-center gap-2 text-[10px] text-wine font-bold uppercase tracking-widest bg-wine/5 p-3 rounded-lg">
                    <Zap size={14} /> Atelier Handling Applied for Heavy Items
                  </div>
                )}
              </>
            ) : (
              <div className="border border-theme-border rounded-xl p-6 text-center text-sm text-theme-text-muted bg-theme-surface/30">
                Please enter your State in the shipping address above to view available delivery options.
              </div>
            )}
          </section>

          {/* Submit */}
          <div className="pt-6 flex justify-between items-center border-t border-theme-border">
            <Link href="/cart" className="text-sm text-wine flex items-center gap-2 hover:opacity-70">
              <ArrowLeft size={16} /> Return to Cart
            </Link>
            <button
              onClick={handlePayment}
              disabled={processing}
              className="bg-theme-text text-theme-bg px-8 py-4 rounded-md text-sm font-bold uppercase tracking-widest hover:bg-wine hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3"
            >
              <Lock size={14} />
              {processing ? "Processing..." : `Pay ₹${netPayable.toLocaleString()}`}
            </button>
          </div>
        </div>
      </div>

      {/* ─── RIGHT: ORDER SUMMARY ─── */}
      <div className="w-full md:w-[45%] lg:w-[40%] bg-theme-surface p-10 order-1 md:order-2 border-b md:border-b-0 md:border-l border-theme-border">
        <div className="max-w-md mx-auto w-full space-y-6">
          <OffersProgress />
          <ShippingPredictor />
          <div className="space-y-4">
            {items.map((item) => (
              <div key={item.id} className="flex gap-4 items-center">
                <div className="relative w-16 h-20 bg-theme-bg rounded-md overflow-hidden border border-theme-border flex-shrink-0">
                  <img src={getAssetUrl(item.image)} alt={item.title} className="w-full h-full object-cover" />
                  <span className="absolute -top-2 -right-2 bg-theme-text text-theme-bg w-5 h-5 flex items-center justify-center rounded-full text-[10px] font-bold border border-theme-border">
                    {item.quantity}
                  </span>
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-theme-text">{item.title}</h3>
                  {item.size && <p className="text-xs text-theme-text-muted">Size: {item.size}</p>}
                </div>
                <div className="text-sm font-medium text-theme-text">
                  ₹{(item.price * item.quantity).toLocaleString()}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-theme-border pt-6 space-y-4">
            {/* Coupon */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Gift card or discount code"
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                disabled={promoState.status === "SUCCESS" || promoState.status === "LOADING"}
                className="flex-1 bg-theme-bg border border-theme-border rounded-md px-4 py-3 text-sm focus:border-wine outline-none transition-all text-theme-text"
              />
              {promoState.status === "SUCCESS" ? (
                <button onClick={removePromo} className="bg-charcoal text-white px-6 py-3 rounded-md text-sm font-bold">
                  Remove
                </button>
              ) : (
                <button
                  onClick={applyPromo}
                  disabled={!promoCode || promoState.status === "LOADING"}
                  className="bg-wine text-white px-6 py-3 rounded-md text-sm font-bold hover:bg-wine/90 disabled:opacity-50"
                >
                  {promoState.status === "LOADING" ? <Loader2 className="animate-spin" size={16} /> : "Apply"}
                </button>
              )}
            </div>
            <AnimatePresence>
              {promoState.status === "ERROR" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-red-500 text-xs flex items-center gap-1">
                  <AlertCircle size={12} /> {promoState.message}
                </motion.div>
              )}
              {promoState.status === "SUCCESS" && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-green-600 text-xs flex items-center gap-1">
                  <CheckCircle size={12} /> {promoState.message}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Price breakdown */}
            <div className="flex justify-between text-sm text-theme-text-muted">
              <span>Subtotal</span><span>₹{baseTotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[11px] text-theme-text-muted opacity-80">
              <span>Incl. GST</span><span>₹{Math.round(items.reduce((acc, item) => {
                if (item.taxInclusive !== false) {
                  const rate = (item.taxRate || 5) / 100;
                  return acc + (item.price * item.quantity) - (item.price * item.quantity / (1 + rate));
                }
                return acc;
              }, 0)).toLocaleString()}</span>
            </div>
            {excludedTax > 0 && (
              <div className="flex justify-between text-sm text-theme-text-muted">
                <span>Additional Tax (GST)</span><span>₹{Math.round(excludedTax).toLocaleString()}</span>
              </div>
            )}
            {promoState.status === "SUCCESS" && (
              <div className="flex justify-between text-sm font-bold text-wine">
                <span>Discount ({promoCode})</span><span>− ₹{promoState.amount?.toLocaleString()}</span>
              </div>
            )}
            {autoOffer && autoOffer.amount > 0 && (
              <div className="flex justify-between text-sm font-bold text-green-600">
                <span>Auto Offer ({autoOffer.name})</span><span>− ₹{autoOffer.amount.toLocaleString()}</span>
              </div>
            )}
            {wallet.use && walletDeduction > 0 && (
              <div className="flex justify-between text-sm font-bold text-wine">
                <span>Wallet Credits</span><span>− ₹{walletDeduction.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-theme-text-muted">
              <span>Shipping</span><span>{shippingCost === 0 ? "Free" : `₹${shippingCost.toLocaleString()}`}</span>
            </div>

            <div className="flex justify-between items-end pt-4 border-t border-theme-border mt-4">
              <span className="text-lg font-serif">Total</span>
              <div className="text-right">
                <span className="text-xs text-theme-text-muted mr-2 tracking-widest">INR</span>
                <span className="text-3xl font-bold">₹{netPayable.toLocaleString()}</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-2 mt-6">
              <Star className="w-4 h-4 text-yellow-500 fill-yellow-400 drop-shadow-[0_0_4px_rgba(250,204,21,0.8)] animate-pulse" />
              <span className="text-xs font-bold text-yellow-600 dark:text-yellow-500 uppercase tracking-widest">
                Earn {Math.floor(netPayable / 100)} Reward Points on this order!
              </span>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2 text-[10px] text-theme-text-muted">
              <Lock size={10} /> <span>256-bit SSL Encrypted · Powered by Razorpay</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
