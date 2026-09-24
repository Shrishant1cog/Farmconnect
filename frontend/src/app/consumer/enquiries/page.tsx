'use client';

import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  MessageSquare, Send, CheckCircle2, Phone, MapPin, 
  Search, ShieldCheck, ArrowRight, ArrowLeft, 
  CheckCheck, Sparkles, AlertCircle
} from 'lucide-react';
import { useAuth } from '../../../hooks/useAuth';

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

const STORAGE_KEY = 'farmconnect_consumer_chats';

const SEED_THREADS: FarmerThread[] = [
  {
    id: 'th-1',
    farmerName: 'Ramesh Patil',
    farmName: 'Kaveri Natural Farm',
    location: 'Pandavapura, Mandya',
    phone: '+91 98765 43210',
    cropName: 'Tomato (Nati Desi)',
    grade: 'Grade-A Export',
    avatarText: 'RP',
    isOnline: true,
    unreadCount: 1,
    messages: [
      {
        id: 'm1',
        sender: 'FARMER',
        text: 'Namaskara! We just harvested 2,400 kg of fresh Desi Nati Tomatoes this morning from our Mandya plot.',
        timestamp: '10:15 AM',
        lotSummary: '2,400 kg @ ₹20/kg',
      },
      {
        id: 'm2',
        sender: 'CONSUMER',
        text: 'Hello Ramesh! What is the crate packing standard, and can you dispatch 250 kg to Bengaluru tomorrow morning?',
        timestamp: '10:22 AM',
      },
      {
        id: 'm3',
        sender: 'FARMER',
        text: 'Yes, we use 25kg aerated plastic crates to preserve firmness. I can dispatch by 5 AM pickup truck. Price is ₹20/kg farm-gate direct.',
        timestamp: '10:28 AM',
        priceOffer: 20,
      },
    ],
  },
  {
    id: 'th-2',
    farmerName: 'Suresh Gowda',
    farmName: 'Desi Siri Organics',
    location: 'Srirangapatna, Mandya',
    phone: '+91 98765 43211',
    cropName: 'Mandya Finger Millet (Ragi)',
    grade: 'Organic Certified',
    avatarText: 'SG',
    isOnline: false,
    unreadCount: 0,
    messages: [
      {
        id: 'm4',
        sender: 'FARMER',
        text: 'Our MR-1 Brown Ragi is sun-dried and de-stoned. Bagged in 50kg jute bags ready for direct flour milling.',
        timestamp: 'Yesterday',
        priceOffer: 42,
      },
      {
        id: 'm5',
        sender: 'CONSUMER',
        text: 'Do you have lab residue-free certification documents?',
        timestamp: 'Yesterday',
      },
      {
        id: 'm6',
        sender: 'FARMER',
        text: 'Yes, Jaivik Bharat organic certificate is attached to the lot manifest. Minimum wholesale lot is 100 kg.',
        timestamp: 'Yesterday',
      },
    ],
  },
  {
    id: 'th-3',
    farmerName: 'Basavaraj Haveri',
    farmName: 'Kaddi Chilli Cultivators',
    location: 'Byadgi, Haveri',
    phone: '+91 98765 43212',
    cropName: 'Byadgi Stemless Chilli',
    grade: 'Grade-A Deep Red',
    avatarText: 'BH',
    isOnline: true,
    unreadCount: 0,
    messages: [
      {
        id: 'm7',
        sender: 'FARMER',
        text: 'Stemless Byadgi chillies are sorted and packaged in moisture-proof 25kg bundles. Modal auction benchmark is ₹365, offering direct at ₹350/kg.',
        timestamp: 'Sep 15',
        priceOffer: 350,
      },
    ],
  },
];

export default function ConsumerEnquiriesPage() {
  const { user } = useAuth();

  const [threads, setThreads] = useState<FarmerThread[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) return JSON.parse(saved);
      } catch {
        // fallback
      }
    }
    return SEED_THREADS;
  });

  const [activeThreadId, setActiveThreadId] = useState<string>('th-1');
  const [searchTerm, setSearchTerm] = useState('');
  const [newMessageText, setNewMessageText] = useState('');
  const [showMobileChat, setShowMobileChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync to local cache
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(threads));
    } catch {
      // storage quota / disabled
    }
  }, [threads]);

  const activeThread = useMemo(() => {
    return threads.find((t) => t.id === activeThreadId) || threads[0];
  }, [threads, activeThreadId]);

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

  const handleSelectThread = useCallback((id: string) => {
    setActiveThreadId(id);
    setShowMobileChat(true);
    setThreads((prev) =>
      prev.map((t) => (t.id === id ? { ...t, unreadCount: 0 } : t))
    );
  }, []);

  const handleSendMessage = useCallback((e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const textToSend = newMessageText.trim();
    if (!textToSend) return;

    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      sender: 'CONSUMER',
      text: textToSend,
      timestamp: timeStr,
    };

    setThreads((prev) =>
      prev.map((t) => (t.id === activeThread.id ? { ...t, messages: [...t.messages, newMsg] } : t))
    );

    setNewMessageText('');
    inputRef.current?.focus();

    // Simulated farmer reply
    setTimeout(() => {
      let reply = 'Thank you! I will prepare the harvest lot and confirm vehicle pickup details.';
      const lower = textToSend.toLowerCase();

      if (lower.includes('price') || lower.includes('discount') || lower.includes('negotiat') || lower.includes('rate')) {
        reply = 'For wholesale consignments over 500kg, I can offer an additional ₹1.5/kg concession at farm-gate.';
      } else if (lower.includes('dispatch') || lower.includes('tomorrow') || lower.includes('delivery')) {
        reply = 'Understood! Loading starts at 5:00 AM. You will receive crate batch verification photos once stacked.';
      } else if (lower.includes('quality') || lower.includes('sample') || lower.includes('grade')) {
        reply = 'Our harvest is hand-graded on site. Only Grade-A lots without blemishes are packed.';
      }

      const farmerMsg: Message = {
        id: `msg-${Date.now() + 1}`,
        sender: 'FARMER',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setThreads((prev) =>
        prev.map((t) => (t.id === activeThread.id ? { ...t, messages: [...t.messages, farmerMsg] } : t))
      );
    }, 1200);
  }, [newMessageText, activeThread.id]);

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
              <MessageSquare className="w-3 h-3 text-emerald-700" /> Direct Farmer Chats
            </span>
            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 text-[10px] font-bold">
              Buyer Portal
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-stone-900 tracking-tight">
            Direct Trade Messages & Quotes
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Coordinate lot dispatches, packaging specs, and wholesale price quotes directly with verified growers.
          </p>
        </div>

        <Link
          href="/consumer/explore"
          className="px-3.5 py-2 bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-xs flex items-center gap-1.5 self-start sm:self-auto"
        >
          Marketplace <ArrowRight className="w-3.5 h-3.5" />
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
                placeholder="Search grower, crop, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-stone-50 rounded-xl text-xs font-semibold text-stone-900 border border-stone-200 outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-stone-100">
            {filteredThreads.length === 0 ? (
              <div className="p-8 text-center space-y-1 text-stone-400">
                <AlertCircle className="w-6 h-6 mx-auto stroke-1" />
                <p className="text-xs font-semibold">No chats matching your search</p>
              </div>
            ) : (
              filteredThreads.map((thread) => {
                const isSelected = thread.id === activeThread.id;
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
                          {lastMsg?.timestamp || ''}
                        </span>
                      </div>

                      <p className="text-[11px] font-bold text-emerald-800 truncate mb-0.5">
                        {thread.cropName}
                      </p>

                      <p className="text-xs text-stone-500 truncate leading-tight">
                        {lastMsg?.sender === 'CONSUMER' ? 'You: ' : ''}
                        {lastMsg?.text || 'No messages yet'}
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
          
          {/* Header */}
          <div className="p-3 sm:px-5 border-b border-stone-100 flex items-center justify-between gap-3 bg-stone-50/50">
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={() => setShowMobileChat(false)}
                className="lg:hidden p-1.5 -ml-1 text-stone-600 hover:bg-stone-200 rounded-lg transition-colors"
                title="Back to contacts"
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
                    <ShieldCheck className="w-2.5 h-2.5 text-emerald-700" /> Verified
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
                <span className="text-[9px] font-bold text-stone-400 uppercase block">Lot</span>
                <span className="text-xs font-black text-emerald-800 block truncate max-w-[130px]">{activeThread.cropName}</span>
              </div>
              <a
                href={`tel:${activeThread.phone}`}
                className="p-2 rounded-xl bg-white border border-stone-200 text-emerald-800 hover:bg-emerald-50 transition-colors shadow-2xs"
                title="Call Grower"
              >
                <Phone className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Conversation Stream */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3.5 bg-stone-50/25">
            <div className="max-w-sm mx-auto p-2 rounded-xl bg-emerald-50/90 border border-emerald-200 text-center">
              <span className="text-[10px] font-black text-emerald-900 block">
                🔒 Escrow Protected Negotiations
              </span>
              <p className="text-[10px] text-emerald-800 leading-tight mt-0.5">
                Funds are held securely by FarmConnect and released only after verified produce delivery.
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
                            <span className="text-[9px] uppercase font-black tracking-wider block opacity-75">Farm-Gate Quote</span>
                            <span className="text-xs sm:text-sm font-black">₹{msg.priceOffer} / kg</span>
                          </div>
                          <Link
                            href="/checkout"
                            className="px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-[10px] font-black uppercase transition-colors shadow-2xs"
                          >
                            Order Lot
                          </Link>
                        </div>
                      )}

                      <p className="leading-relaxed font-medium select-text">{msg.text}</p>

                      <div className={`flex items-center justify-end gap-1 text-[9px] ${
                        isFarmer ? 'text-stone-400' : 'text-emerald-200'
                      }`}>
                        <span>{msg.timestamp}</span>
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
              <Sparkles className="w-2.5 h-2.5 text-emerald-700" /> Quick Replies:
            </span>
            {[
              'Can you dispatch by tomorrow morning?',
              'Can we negotiate on 500kg wholesale?',
              'Please confirm crate packaging standard.',
              'Are sorting/grading photos available?',
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
              placeholder={`Message ${activeThread.farmerName}...`}
              value={newMessageText}
              onChange={(e) => setNewMessageText(e.target.value)}
              className="flex-1 px-3.5 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-xs font-semibold text-stone-900 outline-none focus:ring-2 focus:ring-emerald-600 focus:bg-white transition-all"
            />

            <button
              type="submit"
              disabled={!newMessageText.trim()}
              className="px-4 py-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-200 disabled:text-stone-400 text-white font-black text-xs uppercase tracking-wider rounded-xl flex items-center gap-1 shadow-xs transition-all active:scale-95 shrink-0"
            >
              <span>Send</span>
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>

        </div>

      </div>

    </div>
  );
}