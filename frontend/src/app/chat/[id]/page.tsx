'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { fetchApi } from '../../../lib/api';
import { Send, Sprout, ArrowLeft, Loader2, CheckCheck, AlertCircle } from 'lucide-react';

interface Message {
  id: string;
  enquiryId: string;
  content: string;
  senderId: string;
  createdAt: string;
  sender?: { name?: string; role?: string };
}

export default function ChatThread() {
  const params = useParams();
  const router = useRouter();
  const enquiryId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [enquiryDetails, setEnquiryDetails] = useState<{ subject?: string; crop?: string } | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 1. Safely resolve the authentication token across both key conventions
  const getAuthToken = useCallback(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('farmconnect_token') || localStorage.getItem('fc_token');
  }, []);

  // 2. Resolve current user ID safely from storage or normalized JWT
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

  useEffect(() => {
    const uid = resolveCurrentUserId();
    setCurrentUserId(uid);

    const token = getAuthToken();
    if (!token) {
      setErrorMessage('Please log in to view and send messages.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    // 3. Fetch conversation history and enquiry context
    fetchApi(`/enquiries/${enquiryId}/messages`)
      .then((res) => {
        const messageList = res?.data?.messages || res?.messages || res?.data || [];
        if (Array.isArray(messageList)) {
          setMessages(messageList);
        }
        setEnquiryDetails({
          subject: res?.data?.subject || res?.subject || 'Direct Produce Negotiation',
          crop: res?.data?.product?.title || res?.product?.title || 'Harvest Crop',
        });
      })
      .catch((err) => {
        console.error('Failed to load conversation history:', err);
        setErrorMessage('Unable to load prior conversation messages.');
      })
      .finally(() => {
        setIsLoading(false);
      });

    // 4. Connect to Socket.IO engine with normalized socket URL
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
      socket.emit('join_enquiry_room', enquiryId);
    });

    // 5. Deduplicate incoming socket broadcasts
    socket.on('new_chat_message', (msg: Message) => {
      if (msg && (msg.enquiryId === enquiryId || !msg.enquiryId)) {
        setMessages((prev) => {
          if (msg.id && prev.some((m) => m.id === msg.id)) {
            return prev;
          }
          return [...prev, msg];
        });
      }
    });

    return () => {
      socket.emit('leave_enquiry_room', enquiryId);
      socket.off('connect');
      socket.off('new_chat_message');
      socket.disconnect();
    };
  }, [enquiryId, getAuthToken, resolveCurrentUserId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newMessage.trim();
    if (!trimmed || isSending) return;

    const token = getAuthToken();
    if (!token) {
      setErrorMessage('Session expired. Please log in again to send messages.');
      return;
    }

    setIsSending(true);
    setErrorMessage(null);

    // Optimistic message bubble for immediate response feel
    const tempId = `temp-${Date.now()}`;
    const optimisticMsg: Message = {
      id: tempId,
      enquiryId,
      content: trimmed,
      senderId: currentUserId || 'me',
      createdAt: new Date().toISOString(),
      sender: { name: 'You', role: 'PARTICIPANT' },
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage('');

    try {
      const res = await fetchApi(`/enquiries/${enquiryId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: trimmed }),
      });

      const confirmedMsg = res?.data || res?.message;
      if (confirmedMsg?.id) {
        setMessages((prev) =>
          prev.map((m) => (m.id === tempId ? { ...confirmedMsg } : m))
        );
      }
    } catch (err: any) {
      console.error('Failed to send message:', err);
      // Roll back optimistic message on failure
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setNewMessage(trimmed);
      setErrorMessage(err?.message || 'Failed to dispatch message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  const handleBackNavigation = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push('/consumer/chats');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 h-[90vh] flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border border-stone-200 rounded-t-3xl p-5 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={handleBackNavigation}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                Active Thread
              </span>
              <h2 className="text-lg font-black text-stone-900">
                {enquiryDetails?.subject || 'Direct Negotiation'}
              </h2>
            </div>
            <p className="text-xs font-bold text-stone-500 mt-0.5 flex items-center gap-1">
              <Sprout className="w-3 h-3 text-emerald-600" />
              Regarding: {enquiryDetails?.crop || 'Harvest Produce'}
            </p>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-50 border-x border-red-200 px-6 py-2.5 flex items-center gap-2 text-xs text-red-700">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* Chat Messages Area */}
      <div className="flex-1 bg-stone-50 border-x border-stone-200 p-6 overflow-y-auto flex flex-col gap-4">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400 gap-2">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-700" />
            <p className="text-xs font-bold">Loading conversation thread...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
            <p className="text-sm font-bold">No messages yet.</p>
            <p className="text-xs mt-1">Send a message below to discuss lot pricing and delivery logistics.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = currentUserId ? msg.senderId === currentUserId : false;
            const senderDisplayName = msg.sender?.name || (isMe ? 'You' : 'Participant');

            return (
              <div
                key={msg.id || index}
                className={`flex flex-col max-w-[80%] ${
                  isMe ? 'self-end items-end' : 'self-start items-start'
                }`}
              >
                <span className="text-[10px] font-bold text-stone-400 mb-1 px-1">
                  {senderDisplayName}
                </span>
                <div
                  className={`px-5 py-3 rounded-2xl shadow-sm ${
                    isMe
                      ? 'bg-emerald-800 text-white rounded-tr-sm'
                      : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm'
                  }`}
                >
                  <p className="text-sm font-medium whitespace-pre-wrap break-words">{msg.content}</p>
                </div>
                <span className="text-[10px] font-bold text-stone-400 mt-1 flex items-center gap-1">
                  {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                  {isMe && <CheckCheck className="w-3 h-3 text-emerald-600" />}
                </span>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Chat Input Area */}
      <div className="bg-white border border-stone-200 rounded-b-3xl p-4 shadow-sm">
        <form onSubmit={handleSendMessage} className="flex items-end gap-3 relative">
          <textarea
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1 max-h-32 min-h-[50px] px-5 py-3.5 bg-stone-100 border-transparent focus:bg-white rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-600 resize-none transition-all"
            rows={1}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(e);
              }
            }}
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="p-4 bg-emerald-800 hover:bg-emerald-900 disabled:bg-stone-300 text-white rounded-2xl transition-transform active:scale-90 flex-shrink-0"
          >
            {isSending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5 ml-0.5" />
            )}
          </button>
        </form>
      </div>
    </div>
  );
}