"use client";

import { API_BASE } from "@/lib/api";

import { useState, useEffect } from "react";
import { MessageSquare, Clock, User, Mail, Phone, ExternalLink, CheckCircle2, MoreVertical, Filter, Loader2, MessageCircle } from "lucide-react";
import { useAdminAuth } from "@/components/providers/AuthProvider";

export default function SupportDashboard() {
  const { token } = useAdminAuth();
  const [tickets, setTickets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState("ALL");
  const [selectedTicket, setSelectedTicket] = useState<any>(null);

  useEffect(() => {
    fetchTickets();
  }, []);

  const fetchTickets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/support/tickets`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setTickets(data);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await fetch(`${API_BASE}/support/tickets/${id}/status`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ status })
      });
      setTickets(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    } catch (error) {
      alert("Error updating status");
    }
  };

  const filteredTickets = tickets.filter(t => filter === "ALL" || t.status === filter);

  if (isLoading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <Loader2 className="animate-spin text-wine" size={40} />
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-charcoal">Support Inbox</h2>
          <p className="text-gray-500 font-medium font-sans text-sm mt-1">Manage luxury concierge inquiries and service tickets.</p>
        </div>
        <div className="flex gap-2">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="bg-white border border-gray-200 text-sm font-medium px-4 py-2 rounded-xl outline-none focus:border-wine"
          >
            <option value="ALL">All Tickets</option>
            <option value="PENDING">Pending</option>
            <option value="RESOLVED">Resolved</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-280px)]">
        
        {/* Ticket List */}
        <div className="lg:col-span-1 bg-white border border-gray-100 rounded-3xl overflow-hidden flex flex-col shadow-sm">
          <div className="p-6 border-b border-gray-50">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest">Inquiries</h3>
          </div>
          <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {filteredTickets.map((ticket) => (
              <div 
                key={ticket.id} 
                onClick={() => setSelectedTicket(ticket)}
                className={`p-6 cursor-pointer transition-all hover:bg-gray-50 ${selectedTicket?.id === ticket.id ? 'bg-gray-50 ring-inset ring-1 ring-wine/20' : ''}`}
              >
                <div className="flex justify-between items-start mb-2">
                   <h4 className="text-sm font-bold text-charcoal truncate max-w-[150px]">{ticket.subject}</h4>
                   <span className={`text-[8px] font-bold px-2 py-0.5 rounded uppercase tracking-widest ${ticket.status === 'RESOLVED' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
                      {ticket.status}
                   </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1 font-sans">{ticket.message}</p>
                <div className="flex items-center gap-2 mt-4 text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                   <Clock size={10} /> {new Date(ticket.createdAt).toLocaleDateString()}
                </div>
              </div>
            ))}
            {filteredTickets.length === 0 && (
              <div className="p-10 text-center text-gray-400 text-sm">No tickets found.</div>
            )}
          </div>
        </div>

        {/* Ticket Details */}
        <div className="lg:col-span-2 bg-white border border-gray-100 rounded-3xl shadow-sm relative flex flex-col overflow-hidden">
          {selectedTicket ? (
            <>
              <div className="p-8 border-b border-gray-50 flex justify-between items-start bg-gray-50/30">
                <div>
                  <h3 className="text-2xl font-bold text-charcoal">{selectedTicket.subject}</h3>
                  <div className="flex items-center gap-4 mt-2">
                    <span className="text-xs font-bold text-wine bg-wine/5 px-2 py-1 rounded uppercase tracking-widest">{selectedTicket.type}</span>
                    <span className="text-xs text-gray-400 font-sans">{new Date(selectedTicket.createdAt).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex gap-3">
                   {selectedTicket.status !== 'RESOLVED' && (
                     <button 
                      onClick={() => updateStatus(selectedTicket.id, 'RESOLVED')}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-all shadow-md"
                     >
                        <CheckCircle2 size={16} /> Mark Resolved
                     </button>
                   )}
                   <button className="p-2 border border-gray-200 rounded-xl text-gray-400 hover:text-charcoal"><MoreVertical size={20} /></button>
                </div>
              </div>

              <div className="p-8 flex-1 overflow-y-auto space-y-8 font-sans">
                 <div className="flex flex-col md:flex-row gap-8">
                    <div className="flex-1 space-y-4">
                       <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Customer Detail</h4>
                       <div className="grid grid-cols-2 gap-4">
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-gray-50 rounded-lg"><User size={16} className="text-charcoal" /></div>
                             <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Name</p>
                                <p className="text-sm font-bold text-charcoal">{selectedTicket.name}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-3">
                             <div className="p-2 bg-gray-50 rounded-lg"><Mail size={16} className="text-charcoal" /></div>
                             <div>
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</p>
                                <p className="text-sm font-bold text-charcoal">{selectedTicket.email}</p>
                             </div>
                          </div>
                          {selectedTicket.phone && (
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-green-50 rounded-lg text-green-600"><Phone size={16} /></div>
                               <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Phone</p>
                                  <p className="text-sm font-bold text-charcoal">{selectedTicket.phone}</p>
                               </div>
                            </div>
                          )}
                          {selectedTicket.orderId && (
                            <div className="flex items-center gap-3">
                               <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><MessageSquare size={16} /></div>
                               <div>
                                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Order ID</p>
                                  <p className="text-sm font-bold text-charcoal">#{selectedTicket.orderId}</p>
                               </div>
                            </div>
                          )}
                       </div>
                    </div>
                 </div>

                 <div className="space-y-4 pt-4">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Inquiry Content</h4>
                    <div className="bg-gray-50 p-6 rounded-2xl text-gray-700 leading-relaxed whitespace-pre-wrap">
                       {selectedTicket.message}
                    </div>
                 </div>
              </div>

              <div className="p-8 border-t border-gray-50 bg-white">
                 <div className="flex justify-between items-center bg-green-50/50 p-6 rounded-3xl border border-green-100">
                    <div>
                       <h4 className="text-sm font-bold text-green-800">Ready to assist?</h4>
                       <p className="text-xs text-green-600 mt-1">Directly start a WhatsApp conversation with {selectedTicket.name.split(' ')[0]}.</p>
                    </div>
                    <a 
                      href={`https://wa.me/91${selectedTicket.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hi ${selectedTicket.name}, this is Raaghas Support. We received your inquiry about "${selectedTicket.subject}". How can we help?`)}`}
                      target="_blank"
                      className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-green-700 transition-all shadow-md active:scale-95"
                    >
                       Reply via WhatsApp
                    </a>
                 </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-20 space-y-4">
               <div className="w-16 h-16 bg-gray-50 rounded-3xl flex items-center justify-center text-gray-300">
                  <MessageSquare size={32} />
               </div>
               <div>
                  <h3 className="text-lg font-bold text-charcoal">Select an inquiry</h3>
                  <p className="text-sm text-gray-400 max-w-xs mx-auto">Click on a ticket from the list to view full customer details and internal resolution tools.</p>
               </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
