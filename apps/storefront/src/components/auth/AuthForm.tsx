"use client";

import { API_URL } from "@/lib/api";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, ArrowRight, ShieldCheck, Chrome, Loader2 } from "lucide-react";
import { GoogleLogin } from "@react-oauth/google";
import Cookies from "js-cookie";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";

interface AuthFormProps {
  onSuccess?: (user: any) => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ onSuccess }) => {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "otp">("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { isAuthenticated, loading: authLoading } = useAuth();

  React.useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect') || '/collections/all';
      const safeRedirect = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/collections/all';
      window.location.href = safeRedirect;
    }
  }, [isAuthenticated, authLoading]);


  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/otp/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error("Failed to send OTP. Please try again.");
      
      setStep("otp");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/otp/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: otp }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Invalid OTP");

      const domainOpt = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? { domain: '.raaghas.in' } : {};
      Cookies.set("auth_token", data.access_token, { expires: 30, path: '/', ...domainOpt });
      localStorage.setItem("user", JSON.stringify(data.user));
      
      if (onSuccess) onSuccess(data.user);
      
      // Honor redirect query parameter
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect') || '/collections/all';
      const safeRedirect = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/collections/all';
      window.location.href = safeRedirect;
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: any) => {
    setLoading(true);
    setError(null);
    console.log("🚀 Google Response received, authenticating with backend...");

    try {
      const res = await fetch(`${API_URL}/api/v1/auth/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: credentialResponse.credential }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Google login failed");

      console.log("✅ Google Auth Successful, saving session...");
      const domainOpt = typeof window !== 'undefined' && window.location.hostname !== 'localhost' ? { domain: '.raaghas.in' } : {};
      Cookies.set("auth_token", data.access_token, { expires: 30, path: '/', ...domainOpt });
      localStorage.setItem("user", JSON.stringify(data.user));

      if (onSuccess) onSuccess(data.user);
      
      const params = new URLSearchParams(window.location.search);
      const redirectUrl = params.get('redirect') || '/collections/all';
      const safeRedirect = redirectUrl.startsWith('/') && !redirectUrl.startsWith('//') ? redirectUrl : '/collections/all';
      window.location.href = safeRedirect;
    } catch (err: any) {
      console.error("❌ Google Auth Error:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="bg-theme-glass backdrop-blur-xl border border-theme-glass-border rounded-[32px] p-8 md:p-12 shadow-2xl shadow-black/5">
        <div className="text-center mb-10">
          <div className="mb-8">
            <img src="/logo-dark.svg" alt="RAAGHAS" className="h-12 mx-auto object-contain mb-4" />
          </div>
          <h1 className="text-3xl font-serif text-theme-text mb-3 tracking-tight">
            {step === "email" ? "Welcome" : "Check your email"}
          </h1>
          <p className="text-theme-text-muted text-sm font-medium">
             Ethnic Wear for Women
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === "email" ? (
            <motion.form
              key="email-form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              onSubmit={handleSendOtp}
              className="space-y-6"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-widest ml-1">
                   Email Address
                </label>
                <div className="relative group">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-theme-text-muted/30 group-focus-within:text-wine transition-colors" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full bg-theme-bg border border-theme-border focus:border-wine focus:ring-0 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium transition-all text-theme-text"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-theme-text hover:bg-theme-text/90 text-white dark:text-black rounded-2xl py-4 text-xs font-bold uppercase tracking-widest shadow-xl shadow-theme-text/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Continue <ArrowRight className="w-4 h-4" /></>}
              </button>

              <div className="relative my-8 text-center">
                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-theme-border"></div></div>
                <span className="relative px-4 bg-theme-surface text-[10px] font-bold text-theme-text-muted uppercase tracking-widest">Or continue with</span>
              </div>

              <div className="flex justify-center flex-col items-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={() => setError("Google login failed")}
                  useOneTap
                  shape="pill"
                />
              </div>
            </motion.form>
          ) : (
            <motion.form
              key="otp-form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              onSubmit={handleVerifyOtp}
              className="space-y-8"
            >
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-theme-text-muted uppercase tracking-widest text-center block mb-4">
                  4-Digit Verification Code
                </label>
                <div className="flex justify-center gap-4">
                  <input
                    type="text"
                    maxLength={4}
                    required
                    autoFocus
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="0000"
                    className="w-32 text-center tracking-[12px] text-2xl font-bold bg-theme-bg border border-theme-border focus:border-wine focus:ring-0 rounded-2xl py-4 transition-all text-theme-text"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading || otp.length < 4}
                  className="w-full bg-theme-text hover:bg-theme-text/90 text-white dark:text-black rounded-2xl py-4 text-xs font-bold uppercase tracking-widest shadow-xl shadow-theme-text/20 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Sign In <ShieldCheck className="w-4 h-4" /></>}
                </button>
                
                <button
                  type="button"
                  onClick={() => setStep("email")}
                  className="w-full text-theme-text-muted hover:text-theme-text text-[10px] font-bold uppercase tracking-widest transition-colors"
                >
                  Back to email
                </button>
              </div>
            </motion.form>
          )}
        </AnimatePresence>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 text-center text-xs font-bold text-red-500 bg-red-500/10 py-3 rounded-xl border border-red-500/20"
          >
            {error}
          </motion.p>
        )}
      </div>
    </div>
  );
};
