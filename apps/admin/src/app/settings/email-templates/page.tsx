"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, Plus, Settings, ChevronRight, Edit3 } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { token, isLoading: authLoading } = useAdminAuth();
  const baseUrl = `${API_BASE}/api/v1`;

  useEffect(() => {
    // Wait until auth provider has finished loading before fetching
    if (authLoading) return;
    if (token) {
      fetchTemplates();
    } else {
      setLoading(false);
      setError('You are not logged in. Please refresh the page or log in again.');
    }
  }, [token, authLoading]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${baseUrl}/notifications/templates`, {
        credentials: 'include',
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      if (res.status === 401) {
        setError('Session expired. Please log out and log back in.');
        setTemplates([]);
        return;
      }
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load email templates", err);
      setError('Could not connect to the server. Please check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const seedTemplates = async (force: boolean = false) => {
    if (!token) {
      alert('Not authenticated. Please log in first.');
      return;
    }
    
    if (force && !confirm('This will overwrite all existing templates with the new beautiful designs. Are you sure?')) {
      return;
    }

    try {
      const defaults = [
        { 
          name: "Order Confirmation", 
          type: "ORDER_PLACED", 
          subject: "Order Confirmed: #{{shortOrderId}}", 
          body: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"><div style="background-color: #611c34; padding: 30px; text-align: center;"><img src="https://api.raaghas.in/uploads/9b5b8ab107e16fb3a18c5757abd7dfb79.webp" alt="Raaghas Logo" style="display: block; max-height: 50px; margin: 0 auto 20px auto;"><h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Order Confirmed!</h1></div><div style="padding: 40px 30px; color: #333333;"><p style="font-size: 16px; margin-top: 0;">Hello <strong>{{buyerName}}</strong>,</p><p style="font-size: 16px; line-height: 1.6;">Thank you for shopping with Raaghas! We're thrilled to confirm your order <strong>#{{shortOrderId}}</strong>.</p><div style="background-color: #f9f9f9; border-left: 4px solid #611c34; padding: 15px; margin: 25px 0;"><p style="margin: 0; font-size: 15px;"><strong>Order ID:</strong> {{orderId}}</p><p style="margin: 10px 0 0 0; font-size: 15px;"><strong>Total Amount:</strong> ₹{{amount}}</p></div><p style="font-size: 16px; line-height: 1.6;">We are currently processing your items and will notify you once they are shipped.</p><a href="https://raaghas.in/account/orders/{{orderId}}" style="display: inline-block; background-color: #611c34; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; margin-top: 15px;">View Order Status</a></div><div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 13px; color: #777777;"><p style="margin: 0;">&copy; 2026 Raaghas. All rights reserved.</p><p style="margin: 5px 0 0 0;">If you have any questions, please contact us at support@raaghas.in</p></div></div>` 
        },
        { 
          name: "Tax Invoice", 
          type: "INVOICE", 
          subject: "Tax Invoice {{invoiceNumber}} from Raaghas", 
          body: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"><div style="background-color: #611c34; padding: 30px; text-align: center;"><img src="https://api.raaghas.in/uploads/9b5b8ab107e16fb3a18c5757abd7dfb79.webp" alt="Raaghas Logo" style="display: block; max-height: 50px; margin: 0 auto 20px auto;"><h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Tax Invoice</h1></div><div style="padding: 40px 30px; color: #333333;"><p style="font-size: 16px; margin-top: 0;">Hello <strong>{{buyerName}}</strong>,</p><p style="font-size: 16px; line-height: 1.6;">Please find attached the tax invoice <strong>{{invoiceNumber}}</strong> for your recent order.</p><div style="background-color: #f9f9f9; border-left: 4px solid #611c34; padding: 15px; margin: 25px 0;"><p style="margin: 0; font-size: 15px;"><strong>Invoice Amount:</strong> ₹{{amount}}</p></div><p style="font-size: 16px; line-height: 1.6;">Thank you for your business!</p></div><div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 13px; color: #777777;"><p style="margin: 0;">&copy; 2026 Raaghas. All rights reserved.</p></div></div>` 
        },
        { 
          name: "Payment Failed", 
          type: "PAYMENT_FAILED", 
          subject: "Action Required: Payment Failed for Order #{{shortOrderId}}", 
          body: `<div style="text-align: center;"><p style="font-size: 10px; letter-spacing: 2px; color: #666; text-transform: uppercase; margin-bottom: 10px;">Notice</p><h1 style="font-family: 'Playfair Display', Didot, Georgia, serif; color: #1A1A1A; font-size: 26px; margin: 0 0 30px 0; font-weight: normal;">Payment Unsuccessful</h1><p style="font-size: 14px; color: #333; margin-bottom: 30px;">Dear {{buyerName}},<br/><br/>We noticed an irregularity while processing the payment for your order <strong>#{{shortOrderId}}</strong>.</p><div style="border-top: 1px solid rgba(112, 26, 49, 0.1); border-bottom: 1px solid rgba(112, 26, 49, 0.1); padding: 30px 0; margin: 40px 0;"><p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888;">Pending Amount</p><h2 style="margin: 10px 0 0; color: #1A1A1A; font-size: 32px; font-family: 'Playfair Display', serif; font-weight: normal;">₹{{amount}}</h2></div><p style="font-size: 12px; color: #666; font-style: italic; margin-bottom: 40px;">Rest assured, your selections have been reserved. Please retry your payment to complete the acquisition.</p><a href="https://raaghas.in/checkout" style="display: inline-block; background-color: #1A1A1A; color: #ffffff; text-decoration: none; padding: 16px 40px; font-weight: bold; font-size: 10px; letter-spacing: 2px; text-transform: uppercase;">Retry Payment</a></div>` 
        },
        { 
          name: "Order Shipped", 
          type: "ORDER_SHIPPED", 
          subject: "Your Order #{{shortOrderId}} Has Shipped!", 
          body: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"><div style="background-color: #611c34; padding: 30px; text-align: center;"><img src="https://api.raaghas.in/uploads/9b5b8ab107e16fb3a18c5757abd7dfb79.webp" alt="Raaghas Logo" style="display: block; max-height: 50px; margin: 0 auto 20px auto;"><h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Your Order is on its way!</h1></div><div style="padding: 40px 30px; color: #333333;"><p style="font-size: 16px; margin-top: 0;">Hello <strong>{{buyerName}}</strong>,</p><p style="font-size: 16px; line-height: 1.6;">Great news! Your order <strong>#{{shortOrderId}}</strong> has been dispatched and is en route.</p><div style="background-color: #f9f9f9; border-left: 4px solid #611c34; padding: 15px; margin: 25px 0;"><p style="margin: 0; font-size: 15px;"><strong>Tracking ID:</strong> {{trackingUrl}}</p></div><a href="{{trackingUrl}}" style="display: inline-block; background-color: #611c34; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; margin-top: 5px;">Track Shipment</a></div><div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 13px; color: #777777;"><p style="margin: 0;">&copy; 2026 Raaghas. All rights reserved.</p></div></div>` 
        },
        { 
          name: "Order Delivered", 
          type: "ORDER_DELIVERED", 
          subject: "Your Order #{{shortOrderId}} Has Been Delivered", 
          body: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"><div style="background-color: #611c34; padding: 30px; text-align: center;"><img src="https://api.raaghas.in/uploads/9b5b8ab107e16fb3a18c5757abd7dfb79.webp" alt="Raaghas Logo" style="display: block; max-height: 50px; margin: 0 auto 20px auto;"><h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Order Delivered Successfully</h1></div><div style="padding: 40px 30px; color: #333333;"><p style="font-size: 16px; margin-top: 0;">Hello <strong>{{buyerName}}</strong>,</p><p style="font-size: 16px; line-height: 1.6;">Your order <strong>#{{shortOrderId}}</strong> has been delivered. We hope everything is perfect!</p><p style="font-size: 16px; line-height: 1.6;">If you have a moment, we would love to hear your feedback on the products.</p><a href="https://raaghas.in/account/orders/{{orderId}}/review" style="display: inline-block; background-color: #611c34; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; margin-top: 15px;">Leave a Review</a></div><div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 13px; color: #777777;"><p style="margin: 0;">&copy; 2026 Raaghas. All rights reserved.</p></div></div>` 
        },
        { 
          name: "Order Cancelled", 
          type: "ORDER_CANCELLED", 
          subject: "Your Order #{{shortOrderId}} Has Been Cancelled", 
          body: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"><div style="background-color: #4b5563; padding: 30px; text-align: center;"><img src="https://api.raaghas.in/uploads/9b5b8ab107e16fb3a18c5757abd7dfb79.webp" alt="Raaghas Logo" style="display: block; max-height: 50px; margin: 0 auto 20px auto;"><h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Order Cancelled</h1></div><div style="padding: 40px 30px; color: #333333;"><p style="font-size: 16px; margin-top: 0;">Hello <strong>{{buyerName}}</strong>,</p><p style="font-size: 16px; line-height: 1.6;">Your order <strong>#{{shortOrderId}}</strong> has been successfully cancelled as requested.</p><div style="background-color: #f3f4f6; border-left: 4px solid #4b5563; padding: 15px; margin: 25px 0;"><p style="margin: 0; font-size: 15px;"><strong>Order ID:</strong> {{orderId}}</p></div><p style="font-size: 16px; line-height: 1.6;">If you have already paid for this order, the refund process will be initiated shortly.</p><a href="https://raaghas.in/collections/all" style="display: inline-block; background-color: #611c34; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold; margin-top: 15px;">Continue Shopping</a></div><div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 13px; color: #777777;"><p style="margin: 0;">&copy; 2026 Raaghas. All rights reserved.</p></div></div>` 
        },
        { 
          name: "Payment Refunded", 
          type: "PAYMENT_REFUNDED", 
          subject: "Refund Processed for Order #{{shortOrderId}}", 
          body: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"><div style="background-color: #059669; padding: 30px; text-align: center;"><img src="https://api.raaghas.in/uploads/9b5b8ab107e16fb3a18c5757abd7dfb79.webp" alt="Raaghas Logo" style="display: block; max-height: 50px; margin: 0 auto 20px auto;"><h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Refund Processed</h1></div><div style="padding: 40px 30px; color: #333333;"><p style="font-size: 16px; margin-top: 0;">Hello <strong>{{buyerName}}</strong>,</p><p style="font-size: 16px; line-height: 1.6;">We have successfully processed a refund for your order <strong>#{{shortOrderId}}</strong>.</p><div style="background-color: #ecfdf5; border-left: 4px solid #059669; padding: 15px; margin: 25px 0;"><p style="margin: 0; font-size: 15px;"><strong>Refund Amount:</strong> ₹{{amount}}</p></div><p style="font-size: 16px; line-height: 1.6;">Please allow 5-7 business days for the amount to reflect in your original payment method.</p></div><div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 13px; color: #777777;"><p style="margin: 0;">&copy; 2026 Raaghas. All rights reserved.</p></div></div>` 
        },
        { 
          name: "Admin: Low Stock Alert", 
          type: "ADMIN_LOW_STOCK_ALERT", 
          subject: "⚠️ Daily Stock Warning: {{criticalCount}} Critical, {{lowCount}} Low", 
          body: `<div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.05);"><div style="background-color: #ea580c; padding: 30px; text-align: center;"><img src="https://api.raaghas.in/uploads/9b5b8ab107e16fb3a18c5757abd7dfb79.webp" alt="Raaghas Logo" style="display: block; max-height: 50px; margin: 0 auto 20px auto;"><h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">Daily Stock Warning</h1></div><div style="padding: 40px 30px; color: #333333;"><p style="font-size: 16px; margin-top: 0;">Hello Admin,</p><p style="font-size: 16px; line-height: 1.6;">This is your daily inventory digest. Some of your products require immediate attention.</p><div style="display: flex; gap: 15px; margin: 25px 0;"><div style="flex: 1; background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 15px;"><p style="margin: 0; font-size: 13px; color: #7f1d1d; text-transform: uppercase; font-weight: bold;">Critical / Out of Stock</p><p style="margin: 5px 0 0 0; font-size: 24px; color: #dc2626; font-weight: bold;">{{criticalCount}}</p></div><div style="flex: 1; background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 15px;"><p style="margin: 0; font-size: 13px; color: #9a3412; text-transform: uppercase; font-weight: bold;">Low Stock</p><p style="margin: 5px 0 0 0; font-size: 24px; color: #ea580c; font-weight: bold;">{{lowCount}}</p></div></div><p style="font-size: 16px; line-height: 1.6;">Below are the most urgent alerts:</p><table style="width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 14px;"><thead><tr style="background: #f9f9f9; border-bottom: 2px solid #eee;"><th style="padding: 10px; text-align: left; color: #555;">Product</th><th style="padding: 10px; text-align: left; color: #555;">SKU</th><th style="padding: 10px; text-align: right; color: #555;">Status</th></tr></thead><tbody>{{alertsHtml}}</tbody></table><div style="text-align: center; margin-top: 30px;"><a href="https://admin.raaghas.in/products/inventory" style="display: inline-block; background-color: #ea580c; color: #ffffff; text-decoration: none; padding: 12px 25px; border-radius: 4px; font-weight: bold;">Manage Inventory</a></div></div><div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 13px; color: #777777;"><p style="margin: 0;">&copy; 2026 Raaghas Admin Notifications.</p></div></div>` 
        },
        { 
          name: "Referral Alert", 
          type: "REFERRAL_ALERT", 
          subject: "Your Referral Reward is Here!", 
          body: `<div style="text-align: center;"><p style="font-size: 10px; letter-spacing: 2px; color: #666; text-transform: uppercase; margin-bottom: 10px;">Referral Alert</p><h1 style="font-family: 'Playfair Display', Didot, Georgia, serif; color: #1A1A1A; font-size: 26px; margin: 0 0 30px 0; font-weight: normal;">Reward Unlocked</h1><p style="font-size: 14px; color: #333; margin-bottom: 30px;">Dear {{userName}},<br/><br/>Someone just used your referral code. As a token of our appreciation, we have credited a reward to your Raaghas Wallet.</p><div style="border-top: 1px solid rgba(112, 26, 49, 0.1); border-bottom: 1px solid rgba(112, 26, 49, 0.1); padding: 30px 0; margin: 40px 0;"><p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888;">Reward Amount</p><h2 style="margin: 10px 0 0; color: #701A31; font-size: 32px; font-family: 'Playfair Display', serif; font-weight: normal;">₹{{rewardAmount}}</h2></div><p style="font-size: 12px; color: #666; font-style: italic; margin-bottom: 40px;">You can use this balance towards your next luxury acquisition.</p><a href="https://raaghas.in/account" style="display: inline-block; background-color: #1A1A1A; color: #ffffff; text-decoration: none; padding: 16px 40px; font-weight: bold; font-size: 10px; letter-spacing: 2px; text-transform: uppercase;">View Wallet</a></div>` 
        },
        { 
          name: "Wallet Alert", 
          type: "WALLET_ALERT", 
          subject: "Raaghas Wallet Update: ₹{{amount}} {{creditOrDebit}}", 
          body: `<div style="text-align: center;"><p style="font-size: 10px; letter-spacing: 2px; color: #666; text-transform: uppercase; margin-bottom: 10px;">Wallet Update</p><h1 style="font-family: 'Playfair Display', Didot, Georgia, serif; color: #1A1A1A; font-size: 26px; margin: 0 0 30px 0; font-weight: normal;">Balance Updated</h1><p style="font-size: 14px; color: #333; margin-bottom: 30px;">Dear {{userName}},<br/><br/>Your Raaghas Wallet balance has been updated for: <strong>{{reason}}</strong>.</p><div style="border-top: 1px solid rgba(112, 26, 49, 0.1); border-bottom: 1px solid rgba(112, 26, 49, 0.1); padding: 30px 0; margin: 40px 0;"><p style="margin: 0; font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888;">Transaction Amount</p><h2 style="margin: 10px 0 0; color: #1A1A1A; font-size: 32px; font-family: 'Playfair Display', serif; font-weight: normal;">₹{{amount}}</h2></div><a href="https://raaghas.in/account" style="display: inline-block; background-color: #701A31; color: #ffffff; text-decoration: none; padding: 16px 40px; font-weight: bold; font-size: 10px; letter-spacing: 2px; text-transform: uppercase;">View Ledger</a></div>` 
        },
        {
          name: "Abandoned Cart Reminder",
          type: "CART_ABANDONED_REMINDER",
          subject: "You left something behind in your atelier... | Raaghas",
          body: `<div style="text-align: center;"><p style="font-size: 10px; letter-spacing: 3px; color: #888888; text-transform: uppercase; margin-bottom: 15px;">Pending Curation</p><h1 style="font-size: 32px; margin: 0 0 40px 0;">Complete Your Acquisition</h1><p style="font-size: 13px; font-weight: 300; margin-bottom: 40px;">Dear {{customerName}},<br/><br/>We noticed you left some exquisite pieces behind in your cart. Your selections have been reserved, but demand is high.</p><a href="https://raaghas.in/cart" class="button-premium">Return to Checkout</a></div>`
        }
      ];

      let processed = 0;
      for (const t of defaults) {
        const existing = templates.find((x) => x.type === t.type);
        if (!existing || force) {
          const method = existing ? 'PUT' : 'POST';
          const url = existing ? `${baseUrl}/notifications/templates/${existing.id}` : `${baseUrl}/notifications/templates`;
          
          const payload = existing ? {
            name: t.name,
            subject: t.subject,
            body: t.body,
            isActive: true
          } : t;

          const res = await fetch(url, {
            method,
            credentials: 'include',
            headers: { 
              'Content-Type': 'application/json',
              ...(token ? { Authorization: `Bearer ${token}` } : {})
            },
            body: JSON.stringify(payload)
          });
          if (res.ok) processed++;
        }
      }
      alert(`✅ Successfully ${force ? 'updated' : 'initialized'} ${processed} beautiful template(s).`);
      fetchTemplates();
    } catch (err) {
      console.error("Failed to seed templates", err);
      alert('Failed to initialize templates. Please try again.');
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-charcoal font-serif tracking-wide flex items-center gap-2">
            <Mail className="text-wine" /> Email Templates
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage and customize automated outgoing emails.</p>
        </div>
        <div className="flex gap-4">
          <button onClick={() => seedTemplates(false)} className="px-4 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition">
            Initialize Defaults
          </button>
          <button onClick={() => seedTemplates(true)} className="px-4 py-2 border border-wine text-wine bg-wine/5 rounded-lg text-sm font-medium hover:bg-wine/10 transition">
            Force Update Beautiful Templates
          </button>
          <button 
            onClick={() => router.push('/settings/email-templates/new')}
            className="flex items-center gap-2 bg-wine text-white px-5 py-2 rounded-lg text-sm font-bold tracking-wide hover:bg-wine/90 transition"
          >
            <Plus size={16} /> New Template
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Loading templates...</div>
        ) : error ? (
          <div className="p-16 text-center">
            <AlertCircle className="mx-auto text-red-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-charcoal">Something went wrong</h3>
            <p className="text-sm text-red-500 mb-6">{error}</p>
            <button onClick={() => router.push('/login')} className="bg-wine text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition">
              Go to Login
            </button>
          </div>
        ) : templates.length === 0 ? (
          <div className="p-16 text-center">
            <Mail className="mx-auto text-gray-300 mb-4" size={48} />
            <h3 className="text-lg font-bold text-charcoal">No templates found</h3>
            <p className="text-sm text-gray-500 mb-6">You haven't created any email templates yet. Initialize the defaults to get started quickly.</p>
            <button onClick={seedTemplates} className="bg-wine text-white px-6 py-2.5 rounded-lg text-sm font-medium shadow-sm hover:shadow-md transition">
              Create Default Templates
            </button>
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/80 border-b border-gray-100">
                <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Template Name</th>
                <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Trigger Type</th>
                <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {templates.map((template) => (
                <tr key={template.id} className="border-b border-gray-50 hover:bg-stone-50/50 transition group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-wine/10 text-wine flex items-center justify-center">
                        <Mail size={14} />
                      </div>
                      <span className="text-sm font-bold text-charcoal">{template.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-[10px] font-bold tracking-wider font-mono">
                      {template.type}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {template.isActive ? (
                      <span className="text-xs font-bold text-emerald-600 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Active</span>
                    ) : (
                      <span className="text-xs font-bold text-gray-400 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-gray-300"></span> Disabled</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link href={`/settings/email-templates/${template.id}`} className="inline-flex items-center gap-1 text-xs font-bold text-wine hover:text-wine/80 px-3 py-1.5 bg-wine/5 rounded-md hover:bg-wine/10 transition">
                      <Edit3 size={14} /> Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
