'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Search, Send, CheckCheck, Phone, ShieldCheck, 
  Sprout, ArrowLeft, Flame, Loader2, AlertCircle 
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';

interface Message {
  id: string;
  enquiryId: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender?: { name?: string; role?: string };
}

export default function FarmerInquiriesPage() {
  const [inquiries, setInquiries] = useState<any[]>([]);
  const [activeInquiry, setActiveInquiry] = useState<any | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Resolve auth token safely across both conventions
  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token');
  }, []);

  // 2. Resolve current user ID safely
  const resolveCurrentUserId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const storedUser = localStorage.getItem('fc_user') || localStorage.getItem('farmconnect_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) return parsed.id;
      }

      const token = getAuthToken();
      if (token && token.includes('.')) {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(
          atob(base64)
            .split('')
            .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );
        return JSON.parse(jsonPayload)?.id || null;
      }
    } catch {
      return null;
    }
    return null;
  }, [getAuthToken]);

  // Auto-scroll chat window to latest message
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 3. Load all Customer Inquiries for the authenticated farmer
  const fetchInquiries = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      setErrorMessage('Please log in to review customer inquiries.');
      return;
    }

    try {
      let json: any;
      try {
        json = await fetchApi('/farmer/enquiries');
      } catch {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/farmer/enquiries`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        json = await res.json();
      }

      const inquiryList = json?.data || json?.enquiries || (Array.isArray(json) ? json : []);
      setInquiries(inquiryList);

      if (inquiryList.length > 0 && !activeInquiry) {
        selectChat(inquiryList[0]);
      }
    } catch (e: any) {
      console.error('Failed to load inquiries', e);
      setErrorMessage('Unable to load customer inquiry list.');
    } finally {
      setLoading(false);
    }
  }, [activeInquiry, getAuthToken]);

  useEffect(() => {
    setCurrentUserId(resolveCurrentUserId());
    fetchInquiries();
  }, [fetchInquiries, resolveCurrentUserId]);

  // 4. Initialize Socket.IO connection
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const socketUrl = (process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000')
      .replace(/\/+$/, '')
      .replace(/\/api$/, '');

    const socket = io(socketUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      if (activeInquiry?.id) {
        socket.emit('join_enquiry_room', activeInquiry.id);
      }
    });

    socket.on('new_chat_message', (msg: any) => {
      if (!msg) return;

      // Update the active chat messages ONLY if the message belongs to this thread
      if (activeInquiry && msg.enquiryId === activeInquiry.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

      // Update sidebar preview snippet regardless of which thread is active
      setInquiries((prev) =>
        prev.map((inq) => {
          if (inq.id === msg.enquiryId) {
            const currentMsgs = inq.messages || [];
            return {
              ...inq,
              messages: [...currentMsgs.filter((m: any) => m.id !== msg.id), msg],
            };
          }
          return inq;
        })
      );
    });

    return () => {
      socket.off('connect');
      socket.off('new_chat_message');
      socket.disconnect();
    };
  }, [activeInquiry?.id, getAuthToken]);

  const selectChat = (inquiry: any) => {
    if (activeInquiry && socketRef.current) {
      socketRef.current.emit('leave_enquiry_room', activeInquiry.id);
    }
    setActiveInquiry(inquiry);
    setMessages(inquiry.messages || []);
    setErrorMessage(null);

    if (socketRef.current) {
      socketRef.current.emit('join_enquiry_room', inquiry.id);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanContent = inputText.trim();
    if (!cleanContent || !activeInquiry || isSending) return;

    const token = getAuthToken();
    if (!token) {
      setErrorMessage('Session expired. Please log in again.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    // Optimistic message update
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      enquiryId: activeInquiry.id,
      content: cleanContent,
      senderId: currentUserId || 'farmer',
      createdAt: new Date().toISOString(),
      sender: { name: 'You', role: 'FARMER' },
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');

    try {
      const payload = { content: cleanContent };
      let json: any;
      try {
        json = await fetchApi(`/enquiries/${activeInquiry.id}/messages`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/enquiries/${activeInquiry.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        json = await res.json();
      }

      if (json?.success && json?.data) {
        const confirmedMsg = json.data;
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? confirmedMsg : m))
        );

        // Update sidebar thread preview
        setInquiries((prev) =>
          prev.map((inq) => {
            if (inq.id === activeInquiry.id) {
              const currentList = inq.messages || [];
              return {
                ...inq,
                messages: [...currentList.filter((m: any) => m.id !== tempId), confirmedMsg],
              };
            }
            return inq;
          })
        );
      }
    } catch (e: any) {
      console.error('Failed to deliver message:', e);
      // Restore input text so farmer does not lose negotiation message
      setInputText(cleanContent);
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setErrorMessage('Message failed to deliver. Please verify your connection.');
    } finally {
      setIsSending(false);
    }
  };

  const filteredInquiries = inquiries.filter((inq) =>
    inq.consumer?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inq.product?.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    inq.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-6 h-[calc(100vh-5rem)]">
      <div className="bg-[#f0f2f5] rounded-3xl border border-stone-300 shadow-2xl h-full flex overflow-hidden">
        
        {/* LEFT COLUMN: Inquiries Sidebar */}
        <div className={`w-full md:w-[380px] lg:w-[420px] bg-white border-r border-stone-200 flex flex-col ${activeInquiry ? 'hidden md:flex' : 'flex'}`}>
          
          {/* Header Bar */}
          <div className="h-16 px-4 bg-[#075e54] text-white flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-emerald-700 border-2 border-emerald-400 flex items-center justify-center font-black">
                🌱
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight">Customer Inquiries</h1>
                <p className="text-[11px] text-emerald-200 font-medium">Direct Produce Negotiation</p>
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
                placeholder="Search buyer name, crop, or subject..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs outline-none bg-transparent placeholder-stone-400 font-medium"
              />
            </div>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-stone-400">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
                <p className="text-xs font-bold">Loading buyer inquiries...</p>
              </div>
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
                          {inq.consumer?.name || 'Anonymous Buyer'}
                        </h4>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {lastMsg ? new Date(lastMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 truncate mb-1">
                        <Sprout className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {inq.product?.title || 'Harvest Produce'} 
                          {inq.product?.farmerPrice ? ` (₹${inq.product?.farmerPrice})` : ''}
                        </span>
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

        {/* RIGHT COLUMN: Chat Window */}
        <div className={`flex-1 flex flex-col bg-[#efeae2] ${!activeInquiry ? 'hidden md:flex' : 'flex'}`}>
          {activeInquiry ? (
            <>
              {/* Chat Header */}
              <div className="h-16 px-4 bg-[#f0f2f5] border-b border-stone-300 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => setActiveInquiry(null)} 
                    className="md:hidden text-stone-600 p-1 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div className="w-10 h-10 rounded-full bg-[#128c7e] text-white flex items-center justify-center font-bold">
                    {activeInquiry.consumer?.name?.[0]?.toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-stone-900">
                        {activeInquiry.consumer?.name || 'Consumer Lead'}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-stone-400" /> {activeInquiry.consumer?.phone || 'Verified Buyer'} • <span className="text-emerald-700 font-bold">Inquiry Active</span>
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-100 text-emerald-900 border border-emerald-300 px-3 py-1 rounded-xl text-xs font-bold flex items-center gap-1">
                  <Sprout className="w-3.5 h-3.5 text-emerald-700" />
                  {activeInquiry.product?.title || 'Harvest Crop'}
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-xs text-red-700">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span className="font-semibold">{errorMessage}</span>
                </div>
              )}

              {/* Messages Body */}
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
                  const isMe = currentUserId ? m.senderId === currentUserId : m.sender?.role === 'FARMER';
                  return (
                    <div key={m.id || `msg-${idx}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[80%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-xs relative text-xs ${
                          isMe 
                            ? 'bg-[#d9fdd3] text-stone-900 rounded-tr-none' 
                            : 'bg-white text-stone-900 rounded-tl-none'
                        }`}
                      >
                        <p className="font-medium leading-relaxed pr-14 whitespace-pre-wrap break-words">{m.content}</p>
                        <div className="absolute right-2 bottom-1.5 flex items-center gap-1 text-[9px] text-stone-400 font-semibold">
                          <span>{new Date(m.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
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
                  disabled={!inputText.trim() || isSending}
                  className="w-10 h-10 rounded-full bg-[#128c7e] hover:bg-[#075e54] disabled:bg-stone-300 text-white flex items-center justify-center transition-transform active:scale-95 shadow-sm"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
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