'use client';

import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Search, Send, CheckCheck, Phone, ShieldCheck, 
  Sprout, ArrowLeft, Flame
} from 'lucide-react';

export default function FarmerInquiriesPage() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [activeInquiry, setActiveInquiry] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('fc_token') : null;
  const currentUserId = token ? JSON.parse(atob(token.split('.')[1])).id : null;

  // Auto-scroll chat window
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load All Customer Inquiries
  const fetchInquiries = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/farmer/enquiries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const json = await res.json();
      if (json.success) {
        setInquiries(json.data || []);
        if (json.data.length > 0 && !activeInquiry) {
          selectChat(json.data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load inquiries', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, []);

  // Initialize Socket.IO
  useEffect(() => {
    if (!token) return;
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    });

    socketRef.current.on('new_chat_message', (msg: any) => {
      setMessages((prev) => {
        // Prevent duplicate socket message insertion
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  const selectChat = (inquiry: any) => {
    if (activeInquiry && socketRef.current) {
      socketRef.current.emit('leave_enquiry_room', activeInquiry.id);
    }
    setActiveInquiry(inquiry);
    setMessages(inquiry.messages || []);
    if (socketRef.current) {
      socketRef.current.emit('join_enquiry_room', inquiry.id);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeInquiry) return;

    const messageContent = inputText.trim();
    setInputText('');

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enquiries/${activeInquiry.id}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: messageContent })
      });
      const json = await res.json();
      if (json.success && json.data) {
        // Deduplicate: only append if the socket hasn't already added it
        setMessages((prev) => {
          if (prev.some((m) => m.id === json.data.id)) return prev;
          return [...prev, json.data];
        });
      }
    } catch (e) {
      alert('Message failed to deliver');
    }
  };

  const filteredInquiries = inquiries.filter(inq => 
    inq.consumer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inq.product?.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-6 h-[calc(100vh-5rem)]">
      <div className="bg-[#f0f2f5] rounded-3xl border border-stone-300 shadow-2xl h-full flex overflow-hidden">
        
        {/* LEFT COLUMN: WhatsApp Threads Sidebar */}
        <div className={`w-full md:w-[380px] lg:w-[420px] bg-white border-r border-stone-200 flex flex-col ${activeInquiry ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header Bar */}
          <div className="h-16 px-4 bg-[#075e54] text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700 border-2 border-emerald-400 flex items-center justify-center font-black">
                🌱
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight">Customer's Inquiry</h1>
                <p className="text-[11px] text-emerald-200 font-medium">Direct WhatsApp Negotiation</p>
              </div>
            </div>
            <span className="bg-amber-400 text-stone-950 font-black text-[10px] px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
              <Flame className="w-3 h-3 text-red-600 fill-red-600" /> Active Leads
            </span>
          </div>

          {/* Search Contacts */}
          <div className="p-2.5 bg-[#f6f6f6] border-b border-stone-200">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-stone-200">
              <Search className="w-4 h-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search consumer or harvest lead..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs outline-none bg-transparent placeholder-stone-400 font-medium"
              />
            </div>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loading ? (
              <p className="text-center py-10 text-xs text-stone-400 font-bold">Loading inquiries...</p>
            ) : filteredInquiries.length === 0 ? (
              <div className="p-8 text-center text-stone-400">
                <p className="text-xs font-bold">No consumer inquiries found.</p>
                <p className="text-[11px] mt-1 text-stone-400">Incoming buyer requests will appear here instantly.</p>
              </div>
            ) : (
              filteredInquiries.map((inq) => {
                const isSelected = activeInquiry?.id === inq.id;
                const lastMsg = inq.messages?.[inq.messages.length - 1];
                return (
                  <div
                    key={inq.id}
                    onClick={() => selectChat(inq)}
                    className={`p-3.5 flex gap-3 cursor-pointer transition-colors ${
                      isSelected ? 'bg-[#ebebeb]' : 'hover:bg-[#f5f6f6]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-[#128c7e] text-white flex items-center justify-center font-black text-lg shrink-0 shadow-sm">
                      {inq.consumer?.name?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-bold text-stone-900 truncate">
                          {inq.consumer?.name}
                        </h4>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 truncate mb-1">
                        <Sprout className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">{inq.product?.title} (₹{inq.product?.farmerPrice})</span>
                      </div>
                      <p className="text-[11px] text-stone-500 truncate">
                        {lastMsg ? lastMsg.content : inq.subject}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: WhatsApp Chat Window */}
        <div className={`flex-1 flex flex-col bg-[#efeae2] ${!activeInquiry ? 'hidden md:flex' : 'flex'}`}>
          {activeInquiry ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 bg-[#f0f2f5] border-b border-stone-300 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={() => setActiveInquiry(null)} className="md:hidden text-stone-600 p-1">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-[#128c7e] text-white flex items-center justify-center font-bold">
                    {activeInquiry.consumer?.name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-stone-900">{activeInquiry.consumer?.name}</h3>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-stone-400" /> {activeInquiry.consumer?.phone} • <span className="text-emerald-700 font-bold">Inquiry Active</span>
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                  <Sprout className="w-3.5 h-3.5 text-emerald-700" />
                  {activeInquiry.product?.title}
                </div>
              </div>

              {/* Chat Messages Body with WhatsApp styling */}
              <div 
                className="flex-1 p-4 overflow-y-auto space-y-2.5"
                style={{
                  backgroundImage: 'radial-gradient(#d1d7db 1px, transparent 1px)',
                  backgroundSize: '16px 16px'
                }}
              >
                <div className="max-w-md mx-auto my-2 p-2 bg-[#fff3cd] border border-[#ffeeba] text-[#856404] rounded-xl text-[11px] text-center font-bold shadow-xs">
                  ⚡ High-intent buyer inquiry. Direct farm negotiation is open.
                </div>

                {messages.map((m, idx) => {
                  const isMe = m.senderId === currentUserId || m.sender?.role === 'FARMER';
                  return (
                    /* Guaranteed unique compound key avoids collisions */
                    <div key={`${m.id || 'msg'}-${idx}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-xs relative text-xs ${
                          isMe 
                            ? 'bg-[#d9fdd3] text-stone-900 rounded-tr-none' 
                            : 'bg-white text-stone-900 rounded-tl-none'
                        }`}
                      >
                        <p className="font-medium leading-relaxed pr-14">{m.content}</p>
                        <div className="absolute right-2 bottom-1.5 flex items-center gap-1 text-[9px] text-stone-400 font-semibold">
                          <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Bottom Input Bar */}
              <form onSubmit={handleSendMessage} className="h-16 px-4 bg-[#f0f2f5] border-t border-stone-300 flex items-center gap-2">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Type a price offer or pickup terms..."
                  className="flex-1 bg-white border border-stone-300 rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#128c7e] transition-shadow placeholder-stone-400 font-medium"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim()}
                  className="w-10 h-10 rounded-full bg-[#128c7e] hover:bg-[#075e54] disabled:bg-stone-300 text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-stone-400">
              <div className="w-16 h-16 rounded-full bg-stone-200 flex items-center justify-center mb-3">
                <Sprout className="w-8 h-8 text-emerald-800" />
              </div>
              <h3 className="text-base font-black text-stone-700">FarmConnect Web</h3>
              <p className="text-xs text-stone-500 max-w-sm mt-1">
                Select a customer inquiry on the left to discuss volume pricing, harvest collection, and dispatch details.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}