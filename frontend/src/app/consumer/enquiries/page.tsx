'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import { 
  MessageSquare, Send, CheckCircle2, Phone, MapPin, 
  Search, ShieldCheck, ArrowRight, ArrowLeft, 
  CheckCheck, Sparkles, AlertCircle, Loader2, RefreshCw
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';
import { useI18n } from '../../../hooks/useI18n';
import { fetchApi } from '../../../lib/api';

interface Message {
  id: string;
  sender: 'FARMER' | 'CONSUMER';
  text: string;
  timestamp: string;
  priceOffer?: number;
  lotSummary?: string;
}

interface FarmerThread {
  id: string;
  farmerName: string;
  farmName: string;
  location: string;
  phone: string;
  cropName: string;
  grade: string;
  avatarText: string;
  isOnline: boolean;
  unreadCount: number;
  messages: Message[];
}

/** Maps one shared enquiry (from `/api/enquiries/my`) onto a chat thread. */
function mapEnquiryToThread(enquiry: any): FarmerThread {
  const farmerName: string = enquiry?.farmer?.user?.name || enquiry?.farmer?.farmName || '';
  const farmName: string = enquiry?.farmer?.farmName || '';
  const cropName: string = enquiry?.product?.title || enquiry?.subject || '';
  const lastMessage = Array.isArray(enquiry?.messages) ? enquiry.messages[0] : null;

  return {
    id: String(enquiry?.id || ''),
    farmerName,
    farmName,
    location: String(enquiry?.farmer?.district || enquiry?.product?.location || ''),
    phone: String(enquiry?.farmer?.user?.phone || ''),
    cropName,
    grade: String(enquiry?.product?.grade || ''),
    avatarText: farmerName
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || '?',
    isOnline: false,
    unreadCount: 0,
    messages: lastMessage
      ? [
          {
            id: String(lastMessage.id || ''),
            sender: (lastMessage.sender?.role || 'FARMER').toUpperCase() === 'CONSUMER' ? 'CONSUMER' : 'FARMER',
            text: String(lastMessage.content || ''),
            timestamp: String(lastMessage.createdAt || ''),
          },
        ]
      : [],
  };
}

export default function ConsumerEnquiriesPage() {
  const { user } = useAuth();
  const { t, intlTag } = useI18n();

  const [threads, setThreads] = useState<FarmerThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeThreadId, setActiveThreadId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const socketRef = useRef<Socket | null>(null);

  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || threads[0];
  }, [threads, activeThreadId]);

  const formatChatTimestamp = useCallback(
    (timestamp: string) => {
      if (!timestamp) return '';
      if (timestamp.toLowerCase() === 'yesterday') return t('consumer.chat.yesterday');

      const timeMatch = timestamp.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
      const parsed = timeMatch
        ? (() => {
            const date = new Date();
            let hours = Number(timeMatch[1]) % 12;
            if (timeMatch[3].toUpperCase() === 'PM') hours += 12;
            date.setHours(hours, Number(timeMatch[2]), 0, 0);
            return date;
          })()
        : new Date(timestamp);
      if (!Number.isNaN(parsed.getTime())) {
        const isTimeOnly = Boolean(timeMatch);
        return new Intl.DateTimeFormat(
          intlTag,
          isTimeOnly
            ? { hour: '2-digit', minute: '2-digit' }
            : { day: 'numeric', month: 'short' }
        ).format(parsed);
      }

      return timestamp;
    },
    [intlTag, t]
  );

  const filteredThreads = useMemo(() => {
    if (!searchTerm.trim()) return threads;
    const query = searchTerm.toLowerCase();
    return threads.filter(
      (t) =>
        t.farmerName.toLowerCase().includes(query) ||
        t.cropName.toLowerCase().includes(query) ||
        t.location.toLowerCase().includes(query)
    );
  }, [threads, searchTerm]);

  // Keep scroll focused on newest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [activeThreadId, activeThread?.messages.length]);

  /**
   * Loads the shared enquiry threads from the backend and the full message
   * history of the selected thread. The list is the single source of truth —
   * there is no local cache and no demo conversation.
   */
  const loadThreads = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);

    try {
      const res = await fetchApi('/enquiries/my');
      const list = res?.data || res?.enquiries || (Array.isArray(res) ? res : []);
      const mapped: FarmerThread[] = (Array.isArray(list) ? list : []).map(mapEnquiryToThread);
      setThreads(mapped);

      if (mapped.length > 0) {
        setActiveThreadId((prev) => prev || mapped[0].id);
        await loadMessages(mapped[0].id);
      } else {
        setActiveThreadId('');
      }
    } catch (err: any) {
      console.warn('Failed to load shared enquiry threads:', err?.message);
      setLoadError(t('consumer.chat.loadError'));
      setThreads([]);
    } finally {
      setIsLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  /** Loads the complete message history of one shared thread. */
  const loadMessages = useCallback(async (threadId: string) => {
    if (!threadId) return;
    try {
      const res = await fetchApi(`/enquiries/${threadId}/messages`);
      const list = res?.data?.messages || res?.messages || res?.data || [];
      const history: Message[] = (Array.isArray(list) ? list : []).map((message: any) => ({
        id: String(message.id || ''),
        sender: (message.sender?.role || '').toUpperCase() === 'CONSUMER' ? 'CONSUMER' : 'FARMER',
        text: String(message.content || ''),
        timestamp: String(message.createdAt || ''),
        priceOffer: Number(message.priceOffer) || undefined,
      }));

      setThreads((prev) =>
        prev.map((thread) => (thread.id === threadId ? { ...thread, messages: history } : thread))
      );
    } catch (err: any) {
      console.warn('Failed to load thread messages:', err?.message);
    }
  }, []);

  useEffect(() => {
    loadThreads();
  }, [loadThreads]);

  // Live updates: the farmer reply arrives over the shared Socket.IO channel.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const token = localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token');
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

    socket.on('new_chat_message', (message: any) => {
      const threadId = String(message?.enquiryId || '');
      if (!threadId) return;

      const incoming: Message = {
        id: String(message?.id || `live-${Date.now()}`),
        sender: (message?.sender?.role || '').toUpperCase() === 'CONSUMER' ? 'CONSUMER' : 'FARMER',
        text: String(message?.content || ''),
        timestamp: String(message?.createdAt || new Date().toISOString()),
        priceOffer: Number(message?.priceOffer) || undefined,
      };

      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== threadId) return thread;
          if (thread.messages.some((m) => m.id === incoming.id)) return thread;
          return { ...thread, messages: [...thread.messages, incoming], unreadCount: 0 };
        })
      );
    });

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // The live messages of a thread are delivered through the enquiry room, so
  // the open conversation has to join it. The same room is used by the
  // farmer's client, which is what makes the chat shared across platforms.
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !activeThreadId) return;

    socket.emit('join_enquiry_room', activeThreadId);
    return () => {
      socket.emit('leave_enquiry_room', activeThreadId);
    };
  }, [activeThreadId]);

  const handleSelectThread = useCallback((id: string) => {
    setActiveThreadId(id);
    setShowMobileChat(true);
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unreadCount: 0 } : t))
    );
    loadMessages(id);
  }, [loadMessages]);

  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = newMessageText.trim();
    if (!textToSend || !activeThread?.id || isSending) return;

    setIsSending(true);
    setNewMessageText('');

    try {
      // The message is stored on the shared backend and delivered to the
      // farmer on every client. There is no simulated reply.
      const res = await fetchApi(`/enquiries/${activeThread.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: textToSend }),
      });

      const saved = res?.data || res?.message || res;
      const incoming: Message = {
        id: String(saved?.id || `sent-${Date.now()}`),
        sender: 'CONSUMER',
        text: String(saved?.content || textToSend),
        timestamp: String(saved?.createdAt || new Date().toISOString()),
      };

      setThreads((prev) =>
        prev.map((thread) => {
          if (thread.id !== activeThread.id) return thread;
          if (thread.messages.some((m) => m.id === incoming.id)) return thread;
          return { ...thread, messages: [...thread.messages, incoming] };
        })
      );
    } catch (err: any) {
      console.warn('Failed to send message:', err?.message);
      // The message was not stored — put the text back so nothing is lost.
      setNewMessageText(textToSend);
      setLoadError(t('consumer.chat.sendFailed'));
    } finally {
      setIsSending(false);
      inputRef.current?.focus();
    }
  }, [activeThread?.id, isSending, newMessageText, t]);

  const sendQuickChip = useCallback((chipText: string) => {
    setNewMessageText(chipText);
    inputRef.current?.focus();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 animate-in fade-in duration-150">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/95 backdrop-blur-md p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-stone-200/90 shadow-2xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-950 text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
              <MessageSquare className="w-3 h-3 text-emerald-700" /> {t('consumer.chat.directChats')}
            </span>
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
              {t('consumer.chat.buyerPortal')}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            {t('consumer.chat.title')}
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            {t('consumer.chat.subtitle')}
          </p>
        </div>

        <Link
          href="/consumer/explore"
          className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          {t('consumer.chat.marketplace')} <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Main Container */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 h-[74vh] min-h-[540px]">
        
        {/* Left Column: Farmer Contact Threads */}
        <div className={`lg:col-span-4 bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs flex flex-col overflow-hidden ${
          showMobileChat ? 'hidden lg:flex' : 'flex'
        }`}>
          
          <div className="p-3 border-b border-stone-100">
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={t('consumer.chat.searchGrower')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 rounded-xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {isLoading ? (
              <div className="p-8 text-center space-y-2 text-stone-400">
                <Loader2 className="w-6 h-6 mx-auto animate-spin" />
                <p className="text-xs font-semibold">{t('consumer.chat.loadingThreads')}</p>
              </div>
            ) : loadError ? (
              <div className="p-8 text-center space-y-2 text-stone-400">
                <AlertCircle className="w-6 h-6 mx-auto stroke-1 text-red-300" />
                <p className="text-xs font-semibold text-stone-500">{loadError}</p>
                <button
                  type="button"
                  onClick={() => loadThreads()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white text-[10px] font-black uppercase tracking-wider transition-colors"
                >
                  <RefreshCw className="w-3 h-3" />
                  {t('common.retry')}
                </button>
              </div>
            ) : filteredThreads.length === 0 ? (
              <div className="p-8 text-center space-y-1 text-stone-400">
                <AlertCircle className="w-6 h-6 mx-auto stroke-1" />
                <p className="text-xs font-semibold">{t('consumer.chat.noChats')}</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.id === activeThread?.id;
                const lastMsg = thread.messages[thread.messages.length - 1];

                return (
                  <button
                    key={thread.id}
                    type="button"
                    onClick={() => handleSelectThread(thread.id)}
                    className={`w-full text-left p-3.5 transition-colors flex items-start gap-3 ${
                      isSelected ? 'bg-emerald-50/80 border-l-4 border-emerald-800' : 'hover:bg-stone-50'
                    }`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white font-black text-xs flex items-center justify-center shadow-2xs">
                        {thread.avatarText}
                      </div>
                      {thread.isOnline && (
                        <span className="w-2.5 h-2.5 bg-emerald-500 border-2 border-white rounded-full absolute -bottom-0.5 -right-0.5" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <h4 className="text-xs font-black text-stone-900 truncate">
                          {thread.farmerName}
                        </h4>
                        <span className="text-[10px] text-stone-400 shrink-0">
                          {formatChatTimestamp(lastMsg?.timestamp || '')}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-emerald-800 truncate mb-0.5">
                        {thread.cropName}
                      </p>

                      <p className="text-xs text-stone-500 truncate leading-tight">
                        {lastMsg?.sender === 'CONSUMER' ? t('consumer.chat.youPrefix') : ''}
                        {lastMsg?.text || t('consumer.chat.noMessages')}
                      </p>
                    </div>

                    {thread.unreadCount > 0 && (
                      <span className="w-4 h-4 rounded-full bg-emerald-700 text-white font-black text-[9px] flex items-center justify-center shrink-0">
                        {thread.unreadCount}
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Active Conversation */}
        <div className={`lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border border-stone-200 shadow-xs flex flex-col overflow-hidden ${
          !showMobileChat ? 'hidden lg:flex' : 'flex'
        }`}>
          {!activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-8 text-center text-stone-400">
              <MessageSquare className="w-8 h-8 stroke-1" />
              <p className="text-xs font-semibold">{t('consumer.chat.noMessages')}</p>
            </div>
          ) : (
            <>
          
          {/* Header */}
          <div className="p-3 sm:px-5 border-b border-stone-100 flex items-center justify-between gap-3 bg-stone-50/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setShowMobileChat(false)}
                className="lg:hidden p-1.5 -ml-1 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                title={t('consumer.chat.backContacts')}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <div className="w-10 h-10 rounded-xl bg-emerald-800 text-white font-black text-xs flex items-center justify-center shadow-2xs shrink-0">
                {activeThread.avatarText}
              </div>

              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <h3 className="text-xs sm:text-sm font-black text-stone-900 truncate">
                    {activeThread.farmerName}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-900 text-[9px] font-black uppercase tracking-wider">
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" /> {t('consumer.chat.verified')}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500 truncate mt-0.5">
                  <span className="truncate">{activeThread.farmName}</span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5 truncate">
                    <MapPin className="w-2.5 h-2.5 text-emerald-700 shrink-0" /> {activeThread.location}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="hidden sm:block text-right">
                <span className="text-[9px] font-bold text-stone-400 uppercase block">
                  {t('consumer.chat.lot')}
                </span>
                <span className="text-xs font-black text-emerald-800 block truncate max-w-[130px]">{activeThread.cropName}</span>
              </div>
              <a
                href={`tel:${activeThread.phone}`}
                className="p-2 rounded-xl bg-white border border-stone-200 text-emerald-800 hover:bg-emerald-50 transition-colors shadow-2xs"
                title={t('consumer.chat.callGrower')}
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 bg-stone-50/25">
            <div className="max-w-sm mx-auto p-2 rounded-xl bg-emerald-50/90 border border-emerald-200 text-center">
              <span className="text-[10px] font-black text-emerald-900 block">
                🔒 {t('consumer.chat.escrowTitle')}
              </span>
              <p className="text-[10px] text-emerald-800 leading-tight mt-0.5">
                {t('consumer.chat.escrowBody')}
              </p>
            </div>

            {activeThread.messages.map((msg) => {
              const isFarmer = msg.sender === 'FARMER';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isFarmer ? 'items-start' : 'items-end'}`}
                >
                  <div className="flex items-end gap-2 max-w-[88%] sm:max-w-[75%]">
                    {isFarmer && (
                      <div className="w-5 h-5 rounded-md bg-emerald-800 text-white text-[9px] font-black flex items-center justify-center shrink-0 mb-1">
                        {activeThread.avatarText}
                      </div>
                    )}

                    <div
                      className={`p-3 rounded-2xl text-xs space-y-1.5 shadow-2xs ${
                        isFarmer
                          ? 'bg-white text-stone-900 border border-stone-200/90 rounded-bl-none'
                          : 'bg-emerald-800 text-white rounded-br-none'
                      }`}
                    >
                      {msg.priceOffer && (
                        <div className={`p-2 rounded-xl border flex items-center justify-between gap-3 ${
                          isFarmer ? 'bg-emerald-50 border-emerald-200 text-emerald-950' : 'bg-emerald-900/60 border-emerald-700 text-white'
                        }`}>
                          <div>
                            <span className="text-[9px] uppercase font-black tracking-wider block opacity-75">
                              {t('consumer.chat.farmGateQuote')}
                            </span>
                            <span className="text-xs sm:text-sm font-black">₹{msg.priceOffer} / kg</span>
                          </div>
                          <Link
                            href="/checkout"
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-black uppercase transition-colors shadow-2xs"
                          >
                            {t('consumer.chat.orderLot')}
                          </Link>
                        </div>
                      )}

                      <p className="leading-relaxed font-medium select-text">{msg.text}</p>

                      <div className={`flex items-center justify-end gap-1 text-[9px] ${
                        isFarmer ? 'text-stone-400' : 'text-emerald-200'
                      }`}>
                        <span>{formatChatTimestamp(msg.timestamp)}</span>
                        {!isFarmer && <CheckCheck className="w-3 h-3 text-emerald-300" />}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Replies */}
          <div className="px-3 py-1.5 bg-white border-t border-stone-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="text-[9px] font-bold text-stone-400 uppercase tracking-wider shrink-0 flex items-center gap-0.5">
              <Sparkles className="w-2.5 h-2.5 text-emerald-700" /> {t('consumer.chat.quickReplies')}
            </span>
            {[
              t('consumer.chat.chipDispatch'),
              t('consumer.chat.chipWholesale'),
              t('consumer.chat.chipPackaging'),
              t('consumer.chat.chipGrading'),
            ].map((chip) => (
              <button
                key={chip}
                type="button"
                onClick={() => sendQuickChip(chip)}
                className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-emerald-50 hover:text-emerald-900 text-stone-600 text-[10px] font-semibold shrink-0 transition-colors whitespace-nowrap"
              >
                {chip}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form onSubmit={handleSendMessage} className="p-2.5 sm:p-3 bg-white border-t border-stone-200 flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              placeholder={t('consumer.chat.messagePlaceholder', { name: activeThread.farmerName })}
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
            />

            <button
              type="submit"
              disabled={!newMessageText.trim() || isSending}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-200 disabled:text-stone-400 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1 shadow-xs transition-all active:scale-95 shrink-0"
            >
              <span>{t('consumer.chat.send')}</span>
              {isSending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </form>
            </>
          )}

        </div>

      </div>

    </div>
  );
}