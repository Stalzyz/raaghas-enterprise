"use client";

import { useState, useEffect } from "react";
import { Send, MessageSquare, Mail, Phone, MapPin, CheckCircle2, Loader2 } from "lucide-react";

export default function SupportPage() {
  const [settings, setSettings] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    subject: "",
    message: "",
    type: "GENERAL",
    orderId: ""
  });

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6005'}/api/v1/settings/public`)
      .then(res => res.json())
      .then(data => setSettings(data))
      .catch(err => console.error(err));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6005'}/api/v1/support/tickets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!res.ok) throw new Error("Failed to submit inquiry");
      setIsSubmitted(true);
    } catch (error) {
      alert("Error submitting inquiry. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white min-h-screen pb-24 px-6 md:px-12 lg:px-24">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-32">
        
        {/* Left: Brand Values & Contact Info */}
        <div className="space-y-12">
           <div>
              <h1 className="text-5xl md:text-6xl font-serif text-charcoal leading-tight">Concierge & <br/> Customer Care</h1>
              <p className="text-gray-500 mt-6 text-lg max-w-md font-sans">Experience the Raaghas commitment to luxury and excellence. Our team is here to assist with your bespoke curation.</p>
           </div>

           <div className="space-y-8">
              <div className="flex items-start gap-6 group">
                 <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-wine group-hover:text-white transition-all duration-300">
                    <MessageSquare size={24} />
                 </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Live Concierge</h4>
                    <p className="text-xl font-bold text-charcoal mt-1">Chat via WhatsApp</p>
                    {settings?.supportPhone && (() => {
                      const cleanPhone = settings.supportPhone.replace(/\D/g, '');
                      const waPhone = cleanPhone.length <= 10 ? `91${cleanPhone}` : cleanPhone;
                      return (
                        <a href={`https://wa.me/${waPhone}`} className="text-sm text-wine font-bold hover:underline mt-1 block">
                           +{waPhone}
                        </a>
                      );
                    })()}
                 </div>
              </div>

              <div className="flex items-start gap-6 group">
                 <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-wine group-hover:text-white transition-all duration-300">
                    <Mail size={24} />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Digital Correspondence</h4>
                    <p className="text-xl font-bold text-charcoal mt-1">General Inquiries</p>
                    <p className="text-sm text-gray-500 mt-1">{settings?.supportEmail || 'support@raaghas.in'}</p>
                 </div>
              </div>

              <div className="flex items-start gap-6 group">
                 <div className="p-4 bg-gray-50 rounded-2xl group-hover:bg-wine group-hover:text-white transition-all duration-300">
                    <MapPin size={24} />
                 </div>
                 <div>
                    <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Luxury Atelier</h4>
                    <p className="text-xl font-bold text-charcoal mt-1">{settings?.businessAddress}</p>
                    <p className="text-sm text-gray-500 mt-1 italic">By appointment only.</p>
                 </div>
              </div>
           </div>
        </div>

        {/* Right: Interaction Form */}
        <div className="relative">
           {!isSubmitted ? (
             <form onSubmit={handleSubmit} className="bg-white p-6 md:p-10 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.05)] border border-gray-100 space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</label>
                      <input 
                        type="text" 
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-wine focus:ring-1 focus:ring-wine outline-none transition-all font-sans"
                        placeholder="Arjun S..."
                      />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email Address</label>
                      <input 
                        type="email" 
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-wine focus:ring-1 focus:ring-wine outline-none transition-all font-sans"
                        placeholder="arjun@email.com"
                      />
                   </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Inquiry Type</label>
                      <select 
                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-wine focus:ring-1 focus:ring-wine outline-none transition-all font-sans appearance-none"
                        value={formData.type}
                        onChange={(e) => setFormData({...formData, type: e.target.value})}
                      >
                         <option value="GENERAL">General Request</option>
                         <option value="ORDER_QUERY">Order Tracking</option>
                         <option value="WHOLESALE">Wholesale Inquiry</option>
                         <option value="COMPLAINT">Feedback/Complaint</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID (Optional)</label>
                        <input 
                          type="text" 
                          value={formData.orderId}
                          onChange={(e) => setFormData({...formData, orderId: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-wine focus:ring-1 focus:ring-wine outline-none transition-all font-sans"
                          placeholder="ord_..."
                        />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subject</label>
                   <input 
                     type="text" 
                     required
                     value={formData.subject}
                     onChange={(e) => setFormData({...formData, subject: e.target.value})}
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-wine focus:ring-1 focus:ring-wine outline-none transition-all font-sans"
                     placeholder="Bespoke curation for wedding..."
                   />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Message</label>
                   <textarea 
                     rows={4}
                     required
                     value={formData.message}
                     onChange={(e) => setFormData({...formData, message: e.target.value})}
                     className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm focus:bg-white focus:border-wine focus:ring-1 focus:ring-wine outline-none transition-all font-sans resize-none"
                     placeholder="Describe your request in detail..."
                   />
                </div>

                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-wine text-white py-4 rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-charcoal transition-all shadow-md active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-3 mt-4"
                >
                   {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
                   {isSubmitting ? "Transmitting..." : "Submit Inquiry"}
                </button>
             </form>
           ) : (
             <div className="bg-wine p-16 rounded-[40px] text-white text-center flex flex-col items-center justify-center space-y-8 shadow-2xl">
                <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center">
                   <CheckCircle2 size={40} />
                </div>
                <div>
                   <h3 className="text-3xl font-serif">Thank You</h3>
                   <p className="text-white/70 mt-4 text-sm font-sans max-w-xs mx-auto">Your inquiry has been received by our concierge team. We will respond via email within 24 hours.</p>
                </div>
                <button 
                  onClick={() => setIsSubmitted(false)}
                  className="text-xs font-bold uppercase tracking-widest border border-white/20 px-8 py-3 rounded-xl hover:bg-white/10 transition-all"
                >
                   Send another message
                </button>
             </div>
           )}
        </div>

      </div>
    </div>
  );
}
