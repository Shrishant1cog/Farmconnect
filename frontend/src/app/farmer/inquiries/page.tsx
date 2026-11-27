'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { 
  Search, Send, CheckCheck, Phone, ShieldCheck, 
  Sprout, ArrowLeft, Flame, Loader2, AlertCircle, RefreshCw, MessageSquare
} from 'lucide-react';
import { fetchApi } from '../../../lib/api';
import { useI18n } from '../../../hooks/useI18n';

interface Message {
  id: string;
  enquiryId: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender?: { name?: string; role?: string };
}

interface Inquiry {
  id: string;
  subject?: string;
  status?: string;
  createdAt?: string;
  consumer?: {
    id?: string;
    name?: string;
    phone?: string;
  };
  product?: {
    id?: string;
    title?: string;
    farmerPrice?: number;
    priceUnit?: string;
  };
  messages?: Message[];
}

function formatMessageTime(value: string, intlTag: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(intlTag, { hour: '2-digit', minute: '2-digit' }).format(date);
}

export default function FarmerInquiriesPage() {
  const { t, intlTag } = useI18n();
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [activeInquiry, setActiveInquiry] = useState<Inquiry | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 1. Resolve auth token safely
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

  // 3. Load all Customer Inquiries
  const fetchInquiries = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      // Signed out: there is no shared enquiry list to show.
      setLoading(false);
      setInquiries([]);
      setActiveInquiry(null);
      setMessages([]);
      return;
    }

    try {
      let json: any;
      try {
        json = await fetchApi('/enquiries/farmer');
      } catch {
        try {
          json = await fetchApi('/farmer/enquiries');
        } catch {
          const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
          const res = await fetch(`${baseUrl}/enquiries/farmer`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          json = await res.json();
        }
      }

      const inquiryList = json?.data || json?.enquiries || (Array.isArray(json) ? json : []);
      if (Array.isArray(inquiryList) && inquiryList.length > 0) {
        setInquiries(inquiryList);
        setActiveInquiry((prev) => prev || inquiryList[0]);
        if (!activeInquiry) {
          setMessages(inquiryList[0].messages || []);
        }
      } else {
        // Only the real shared enquiries are shown — an empty response
        // renders the translated empty state, never demo conversations.
        setInquiries([]);
        if (!activeInquiry) {
          setActiveInquiry(null);
          setMessages([]);
        }
      }
    } catch (e: any) {
      console.warn('Backend inquiry fetch failed:', e?.message);
      setErrorMessage(t('farmer.inquiries.loadError'));
      setInquiries([]);
      if (!activeInquiry) {
        setActiveInquiry(null);
        setMessages([]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeInquiry, getAuthToken, t]);

  useEffect(() => {
    setCurrentUserId(resolveCurrentUserId());
    fetchInquiries();
  }, [fetchInquiries, resolveCurrentUserId]);

  // 4. Initialize Socket.IO connection
  useEffect(() => {
    const token = getAuthToken();
    if (!token) return;

    const rawSocketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
    const socketUrl = rawSocketUrl.replace(/\/+$/, '').replace(/\/api$/, '');

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

      if (activeInquiry && msg.enquiryId === activeInquiry.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
      }

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

  const selectChat = (inquiry: Inquiry) => {
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
    setIsSending(true);
    setErrorMessage(null);

    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      enquiryId: activeInquiry.id,
      content: cleanContent,
      senderId: currentUserId || 'farmer',
      createdAt: new Date().toISOString(),
      sender: { name: t('farmer.inquiries.you'), role: 'FARMER' },
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
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/enquiries/${activeInquiry.id}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
    } catch {
      setErrorMessage(t('farmer.inquiries.loadError'));
      // Retain optimistic message in view for local negotiation demonstration
    } finally {
      setIsSending(false);
    }
  };

  const filteredInquiries = inquiries.filter((inq) =>
    (inq.consumer?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inq.product?.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (inq.subject || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto px-2 sm:px-6 py-6 h-[calc(100vh-5rem)] animate-in fade-in duration-300">
      <div className="bg-[#f0f2f5] rounded-3xl border border-stone-300 shadow-2xl h-full flex overflow-hidden">
        
        {/* LEFT COLUMN: Inquiries Sidebar */}
        <div className={`w-full md:w-[380px] lg:w-[420px] bg-white border-r border-stone-200 flex flex-col transition-all duration-200 ${
          activeInquiry ? 'hidden md:flex' : 'flex'
        }`}>
          
          {/* Header Bar */}
          <div className="h-16 px-4 bg-[#075e54] text-white flex items-center justify-between shadow-xs shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-700/80 border border-emerald-400 flex items-center justify-center font-black shadow-xs">
                <Sprout className="w-5 h-5 text-emerald-200" />
              </div>
              <div>
                <h1 className="text-sm font-black tracking-tight">{t('farmer.inquiries.customerInquiries')}</h1>
                <p className="text-[11px] text-emerald-200 font-medium">{t('farmer.inquiries.directNegotiation')}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={fetchInquiries}
                className="p-1.5 rounded-lg text-emerald-200 hover:text-white hover:bg-emerald-700 transition-colors"
                title={t('farmer.inquiries.refreshTitle')}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <span className="bg-amber-400 text-stone-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-xs">
                <Flame className="w-3 h-3 text-red-600 fill-red-600" /> {t('farmer.inquiries.leads')}
              </span>
            </div>
          </div>

          {/* Search Contacts */}
          <div className="p-3 bg-[#f6f6f6] border-b border-stone-200 shrink-0">
            <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-xl border border-stone-200 focus-within:ring-2 focus-within:ring-emerald-700 transition-all">
              <Search className="w-4 h-4 text-stone-400 shrink-0" />
              <input
                type="text"
                placeholder={t('farmer.inquiries.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs outline-none bg-transparent placeholder-stone-400 font-medium"
              />
            </div>
          </div>

          {/* Contact List */}
          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-stone-400">
                <Loader2 className="w-7 h-7 animate-spin text-emerald-700" />
                <p className="text-xs font-bold uppercase tracking-wider">{t('farmer.inquiries.syncing')}</p>
              </div>
            ) : filteredInquiries.length === 0 ? (
              <div className="p-8 text-center text-stone-400 space-y-1">
                <p className="text-xs font-bold">{t('farmer.inquiries.noInquiries')}</p>
                <p className="text-[11px] text-stone-500">{t('farmer.inquiries.incomingRequests')}</p>
              </div>
            ) : (
              filteredInquiries.map((inq) => {
                const isSelected = activeInquiry?.id === inq.id;
                const lastMsg = inq.messages?.[inq.messages.length - 1];

                return (
                  <div
                    key={inq.id}
                    onClick={() => selectChat(inq)}
                    className={`p-3.5 flex gap-3 cursor-pointer transition-all duration-150 ${
                      isSelected ? 'bg-[#ebebeb]' : 'hover:bg-[#f5f6f6]'
                    }`}
                  >
                    <div className="w-12 h-12 rounded-2xl bg-[#128c7e] text-white flex items-center justify-center font-black text-base shrink-0 shadow-xs">
                      {inq.consumer?.name?.[0]?.toUpperCase() || 'C'}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-0.5">
                        <h4 className="text-xs font-bold text-stone-900 truncate">
                          {inq.consumer?.name || t('farmer.inquiries.verifiedBuyer')}
                        </h4>
                        <span className="text-[10px] text-stone-400 shrink-0 ml-1">
                          {lastMsg?.createdAt 
                            ? formatMessageTime(lastMsg.createdAt, intlTag) 
                            : ''}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-800 truncate mb-1">
                        <Sprout className="w-3 h-3 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          {inq.product?.title || t('farmer.inquiries.harvestCrop')} 
                          {inq.product?.farmerPrice ? ` (₹${inq.product.farmerPrice})` : ''}
                        </span>
                      </div>

                      <p className="text-[11px] text-stone-500 truncate leading-snug">
                        {lastMsg ? lastMsg.content : (inq.subject || t('farmer.inquiries.directTradeInquiry'))}
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
              <div className="h-16 px-4 bg-[#f0f2f5] border-b border-stone-300 flex items-center justify-between shadow-2xs shrink-0">
                <div className="flex items-center gap-3">
                  <button 
                    type="button"
                    onClick={() => setActiveInquiry(null)} 
                    className="md:hidden text-stone-600 p-1.5 hover:bg-stone-200 rounded-xl transition-colors"
                    title={t('farmer.inquiries.backTitle')}
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-[#128c7e] text-white flex items-center justify-center font-bold shadow-xs">
                    {activeInquiry.consumer?.name?.[0]?.toUpperCase() || 'C'}
                  </div>

                  <div>
                    <div className="flex items-center gap-1.5">
                      <h3 className="text-sm font-black text-stone-900 tracking-tight">
                        {activeInquiry.consumer?.name || t('farmer.inquiries.consumerLead')}
                      </h3>
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                    </div>
                    <p className="text-[11px] text-stone-500 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-stone-400" /> {activeInquiry.consumer?.phone || t('farmer.inquiries.directBuyer')} • <span className="text-emerald-700 font-bold">{t('farmer.inquiries.liveLead')}</span>
                    </p>
                  </div>
                </div>

                <div className="bg-emerald-100 text-emerald-950 border border-emerald-300 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 shadow-2xs">
                  <Sprout className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span className="hidden sm:inline">{activeInquiry.product?.title || t('farmer.inquiries.harvestCrop')}</span>
                  {activeInquiry.product?.farmerPrice && (
                    <span className="text-emerald-800 font-black">₹{activeInquiry.product.farmerPrice}/kg</span>
                  )}
                </div>
              </div>

              {/* Error Banner */}
              {errorMessage && (
                <div className="bg-red-50 border-b border-red-200 px-4 py-2 flex items-center gap-2 text-xs text-red-700 animate-in fade-in duration-150 shrink-0">
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
                <div className="max-w-md mx-auto my-2 p-2.5 bg-[#fff3cd] border border-[#ffeeba] text-[#856404] rounded-2xl text-[11px] text-center font-bold shadow-xs">
                  ⚡ {t('farmer.inquiries.highIntent')}
                </div>

                {messages.map((m, idx) => {
                  const isMe = currentUserId ? m.senderId === currentUserId : m.sender?.role === 'FARMER';
                  return (
                    <div key={m.id || `msg-${idx}`} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] sm:max-w-[70%] rounded-2xl px-3.5 py-2 shadow-xs relative text-xs transition-all ${
                          isMe 
                            ? 'bg-[#d9fdd3] text-stone-900 rounded-tr-none' 
                            : 'bg-white text-stone-900 rounded-tl-none'
                        }`}
                      >
                        <p className="font-medium leading-relaxed pr-14 whitespace-pre-wrap break-words">{m.content}</p>
                        <div className="absolute right-2 bottom-1.5 flex items-center gap-1 text-[9px] text-stone-400 font-semibold">
                          <span>
                            {m.createdAt ? formatMessageTime(m.createdAt, intlTag) : ''}
                          </span>
                          {isMe && <CheckCheck className="w-3.5 h-3.5 text-blue-500" />}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={chatBottomRef} />
              </div>

              {/* Chat Input Bar */}
              <form onSubmit={handleSendMessage} className="h-16 px-4 bg-[#f0f2f5] border-t border-stone-300 flex items-center gap-2 shrink-0">
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t('farmer.inquiries.messagePlaceholder')}
                  className="flex-1 bg-white border border-stone-300 rounded-2xl px-4 py-2.5 text-xs outline-none focus:ring-2 focus:ring-[#128c7e] transition-shadow placeholder-stone-400 font-medium"
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || isSending}
                  className="w-10 h-10 rounded-2xl bg-[#128c7e] hover:bg-[#075e54] disabled:bg-stone-300 text-white flex items-center justify-center transition-all active:scale-95 shadow-sm shrink-0"
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ml-0.5" />}
                </button>
              </form>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-stone-400 space-y-3">
              <div className="w-16 h-16 rounded-3xl bg-stone-200/80 flex items-center justify-center shadow-xs">
                <MessageSquare className="w-8 h-8 text-emerald-800" />
              </div>
              <h3 className="text-base font-black text-stone-700">{t('farmer.inquiries.negotiationDesk')}</h3>
              <p className="text-xs text-stone-500 max-w-sm">
                {t('farmer.inquiries.negotiationBody')}
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}