'use client';

import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { Send, MessageSquare, Sprout, Loader2, CheckCheck } from 'lucide-react';

interface ChatMessage {
  id?: string;
  senderId: string;
  senderName: string;
  role: 'CONSUMER' | 'FARMER';
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
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const token = typeof window !== 'undefined' ? localStorage.getItem('fc_token') : null;
  const currentUserId = token ? JSON.parse(atob(token.split('.')[1])).id : null;

  // Auto-scroll chat to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Connect Socket.IO
  useEffect(() => {
    if (!token) return;
    
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    });

    socketRef.current.on('new_chat_message', (msg: any) => {
      setMessages((prev) => [
        ...prev,
        {
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.sender?.name || 'Participant',
          role: msg.sender?.role || 'FARMER',
          content: msg.content,
          createdAt: msg.createdAt || new Date().toISOString()
        }
      ]);
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, [token]);

  // Switch room when active map node changes
  useEffect(() => {
    if (!activeNode) return;

    const initThread = async () => {
      try {
        if (!token) return;

        // Auto-create or fetch existing inquiry for this farmer/node
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enquiries`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            productId: activeNode.id,
            subject: `Price Negotiation: ${activeNode.name}`,
            message: `Namaskara! Inquiring about ${activeNode.produce || 'produce'} listed on the map.`
          })
        });

        const json = await res.json();
        if (json.success) {
          const enqId = json.data.id;
          setActiveEnquiryId(enqId);
          socketRef.current?.emit('join_enquiry_room', enqId);

          // Fetch message history
          const historyRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enquiries/${enqId}/messages`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const historyJson = await historyRes.json();
          if (historyJson.success) {
            setMessages(
              (historyJson.data.messages || []).map((m: any) => ({
                id: m.id,
                senderId: m.senderId,
                senderName: m.sender?.name || 'User',
                role: m.sender?.role || 'FARMER',
                content: m.content,
                createdAt: m.createdAt
              }))
            );
          }
        }
      } catch (err) {
        console.error('Failed to initialize side chat:', err);
      }
    };

    initThread();
  }, [activeNode, token]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeEnquiryId) return;

    setIsSending(true);
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/enquiries/${activeEnquiryId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: inputText.trim() })
      });
      setInputText('');
    } catch (err) {
      alert('Failed to send message.');
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
              {activeNode ? activeNode.name : 'Farmer ↔ Consumer Chat'}
            </h3>
            <p className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
              <Sprout className="w-3 h-3" />
              {activeNode ? `${activeNode.type.toUpperCase()} • ${activeNode.dist}` : 'Select a node on the map to start negotiation'}
            </p>
          </div>
        </div>
        <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" title="Live Socket.IO Sync" />
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50/50">
        {!activeNode ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-400">
            <MessageSquare className="w-10 h-10 mb-2 opacity-40 text-emerald-700" />
            <p className="text-xs font-bold text-stone-600">No active map pin selected</p>
            <p className="text-[11px] mt-1 text-stone-400">
              Click any pin on the map (Farmers, APMC, Vendors) to negotiate prices in real time.
            </p>
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex items-center justify-center text-xs text-stone-400 font-bold">
            Start the conversation regarding pricing and pickup...
          </div>
        ) : (
          messages.map((m, idx) => {
            const isMe = m.senderId === currentUserId;
            return (
              <div key={m.id || idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] font-bold text-stone-400 mb-0.5 px-1">
                  {m.senderName} ({m.role})
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
                  {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          disabled={!activeNode}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={activeNode ? `Negotiate with ${activeNode.name}...` : 'Select a node on the map first...'}
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