'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, MessageSquare, Sprout, Loader2, CheckCheck, AlertCircle } from 'lucide-react';
import { fetchApi } from '../lib/api';

interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  role: 'CONSUMER' | 'FARMER' | 'ADMIN';
  content: string;
  createdAt: string;
}

interface MapSideChatProps {
  activeNode: any | null;
}

export default function MapSideChat({ activeNode }: MapSideChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeEnquiryId, setActiveEnquiryId] = useState<string | null>(null);
  const [chatError, setChatError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1. Resolve authentication token and current user ID safely
  const getAuthToken = () => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token');
  };

  const getCurrentUserId = useCallback((): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const storedUser = localStorage.getItem('fc_user') || localStorage.getItem('farmconnect_user');
      if (storedUser) {
        const parsed = JSON.parse(storedUser);
        if (parsed?.id) return parsed.id;
      }

      const token = getAuthToken();
      if (token && token.includes('.')) {
        const payloadBase64 = token.split('.')[1];
        const normalized = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
        const decoded = JSON.parse(atob(normalized));
        return decoded?.id || null;
      }
    } catch {
      return null;
    }
    return null;
  }, []);

  const currentUserId = getCurrentUserId();

  // Auto-scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // 2. Initialize Socket.IO connection
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
      setIsConnected(true);
      if (activeEnquiryId) {
        socket.emit('join_enquiry_room', activeEnquiryId);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('new_chat_message', (msg: any) => {
      if (!msg) return;
      setMessages((prev) => {
        // Prevent duplicate messages if already present
        if (msg.id && prev.some((m) => m.id === msg.id)) {
          return prev;
        }
        return [
          ...prev,
          {
            id: msg.id || String(Date.now()),
            senderId: msg.senderId || msg.sender?.id || '',
            senderName: msg.sender?.name || msg.senderName || 'Participant',
            role: (msg.sender?.role || msg.role || 'FARMER').toUpperCase(),
            content: msg.content || '',
            createdAt: msg.createdAt || new Date().toISOString(),
          },
        ];
      });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('new_chat_message');
      socket.disconnect();
    };
  }, [activeEnquiryId]);

  // 3. Switch conversation room when map node changes
  useEffect(() => {
    if (!activeNode) {
      setMessages([]);
      setActiveEnquiryId(null);
      setChatError(null);
      return;
    }

    const initThread = async () => {
      const token = getAuthToken();
      if (!token) {
        setChatError('Please sign in to negotiate with this cultivator.');
        return;
      }

      setChatError(null);

      // Validate node ID exists
      const targetProductId = activeNode.productId || activeNode.id;
      if (!targetProductId) return;

      try {
        const payload = {
          productId: targetProductId,
          subject: `Price Negotiation: ${activeNode.name || activeNode.title || 'Produce'}`,
          message: `Namaskara! Inquiring about ${activeNode.produce || activeNode.name || 'produce'} listed on the map.`,
        };

        let json: any;
        try {
          json = await fetchApi('/enquiries', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
        } catch {
          const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
          const res = await fetch(`${baseUrl}/enquiries`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          });
          json = await res.json();
        }

        const enqId = json?.data?.id || json?.id || json?.enquiry?.id;
        if (enqId) {
          setActiveEnquiryId(enqId);
          socketRef.current?.emit('join_enquiry_room', enqId);

          // Fetch previous messages for this enquiry
          try {
            let historyJson: any;
            try {
              historyJson = await fetchApi(`/enquiries/${enqId}/messages`);
            } catch {
              const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
              const historyRes = await fetch(`${baseUrl}/enquiries/${enqId}/messages`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              historyJson = await historyRes.json();
            }

            const rawList =
              historyJson?.data?.messages || historyJson?.messages || historyJson?.data || [];

            if (Array.isArray(rawList)) {
              setMessages(
                rawList.map((m: any) => ({
                  id: m.id,
                  senderId: m.senderId || m.sender?.id,
                  senderName: m.sender?.name || 'User',
                  role: (m.sender?.role || 'FARMER').toUpperCase(),
                  content: m.content,
                  createdAt: m.createdAt,
                }))
              );
            }
          } catch (fetchErr) {
            console.warn('Could not retrieve conversation history:', fetchErr);
          }
        }
      } catch (err: any) {
        console.error('Failed to initialize side chat:', err);
        setChatError('Could not start negotiation thread.');
      }
    };

    initThread();
  }, [activeNode]);

  // 4. Send Message Handler
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanText = inputText.trim();
    if (!cleanText || !activeEnquiryId || isSending) return;

    const token = getAuthToken();
    if (!token) {
      setChatError('Please sign in to send messages.');
      return;
    }

    setIsSending(true);
    setChatError(null);

    // Optimistic message placeholder
    const optimisticMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      senderId: currentUserId || 'me',
      senderName: 'You',
      role: 'CONSUMER',
      content: cleanText,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, optimisticMessage]);
    setInputText('');

    try {
      const payload = { content: cleanText };

      let json: any;
      try {
        json = await fetchApi(`/enquiries/${activeEnquiryId}/messages`, {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      } catch {
        const baseUrl = (process.env.NEXT_PUBLIC_API_URL || '').replace(/\/+$/, '');
        const res = await fetch(`${baseUrl}/enquiries/${activeEnquiryId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });
        json = await res.json();
      }

      // If backend returned the created message, reconcile optimistic placeholder
      if (json?.data?.id || json?.id) {
        const confirmedId = json?.data?.id || json?.id;
        setMessages((prev) =>
          prev.map((m) => (m.id === optimisticMessage.id ? { ...m, id: confirmedId } : m))
        );
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      setChatError('Failed to send message. Please try again.');
      // Remove failed optimistic message
      setMessages((prev) => prev.filter((m) => m.id !== optimisticMessage.id));
      setInputText(cleanText);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-stone-200 shadow-sm flex flex-col h-[520px] overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-stone-200 bg-stone-50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-emerald-100 rounded-xl text-emerald-800">
            <MessageSquare className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-stone-900">
              {activeNode ? activeNode.name || activeNode.title : 'Cultivator ↔ Buyer Negotiation'}
            </h3>
            <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <Sprout className="w-3 h-3" />
              {activeNode
                ? `${(activeNode.type || 'FARM').toUpperCase()}${activeNode.dist ? ` • ${activeNode.dist}` : ''}`
                : 'Select any pin on the map to negotiate'}
            </p>
          </div>
        </div>

        {/* Live Socket Status Indicator */}
        <span
          className={`w-2.5 h-2.5 rounded-full transition-colors ${
            isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-stone-300'
          }`}
          title={isConnected ? 'Live Socket Sync Active' : 'Connecting to Chat Engine...'}
        />
      </div>

      {/* Chat Messages */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/50">
        {chatError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{chatError}</span>
          </div>
        )}

        {!activeNode ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <MessageSquare className="w-10 h-10 mb-2 opacity-30 text-emerald-700" />
            <p className="text-xs font-bold text-stone-600">No active map pin selected</p>
            <p className="text-[11px] mt-1 text-stone-400 max-w-xs">
              Click any pin on the map to begin direct price and pickup negotiations.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <p className="text-xs font-bold text-stone-500">No prior messages with this cultivator</p>
            <p className="text-[11px] mt-1 text-stone-400">Send an inquiry below to discuss rates and volume.</p>
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = currentUserId ? m.senderId === currentUserId : m.role === 'CONSUMER';
            return (
              <div key={m.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-bold text-stone-400 mb-0.5 px-1">
                  {isMe ? 'You' : m.senderName} ({m.role})
                </span>
                <div
                  className={`max-w-[85%] px-3.5 py-2 rounded-2xl text-xs font-medium shadow-sm ${
                    isMe
                      ? 'bg-emerald-800 text-white rounded-tr-none'
                      : 'bg-white border border-stone-200 text-stone-900 rounded-tl-none'
                  }`}
                >
                  {m.content}
                </div>
                <span className="text-[9px] text-stone-400 mt-0.5 flex items-center gap-1">
                  {m.createdAt
                    ? new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : ''}
                  {isMe && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <form onSubmit={handleSendMessage} className="p-3 border-t border-stone-200 bg-white flex items-center gap-2">
        <input
          type="text"
          disabled={!activeNode || isSending}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={
            activeNode
              ? `Negotiate with ${activeNode.name || activeNode.title || 'farmer'}...`
              : 'Select a node on the map first...'
          }
          className="flex-1 px-4 py-2.5 text-xs bg-stone-100 rounded-xl border-transparent focus:bg-white focus:border-emerald-600 outline-none transition-all disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={!activeNode || !inputText.trim() || isSending}
          className="p-2.5 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white rounded-xl transition-transform active:scale-95"
        >
          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}