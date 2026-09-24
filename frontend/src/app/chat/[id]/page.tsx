'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { io, Socket } from 'socket.io-client';
import { fetchApi } from '../../../lib/api';
import { Send, Sprout, ArrowLeft, Loader2, CheckCheck } from 'lucide-react';
import Link from 'next/link';
interface Message {
  id: string;
  enquiryId: string; // <-- Add this line
  content: string;
  senderId: string;
  createdAt: string;
  sender: { name: string; role: string };
}

export default function ChatThread() {
  const params = useParams();
  const enquiryId = params.id as string;

  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [enquiryDetails, setEnquiryDetails] = useState<any>(null);
  
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to the latest message automatically
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // 1. Get the current user's ID from the JWT token (to style bubbles as sent vs received)
    const token = localStorage.getItem('fc_token');
    if (token) {
      const payload = JSON.parse(atob(token.split('.')[1]));
      setCurrentUserId(payload.id);
    }

    // 2. Fetch real chat history + enquiry details
    fetchApi(`/enquiries/${enquiryId}/messages`)
      .then((res) => {
        setMessages(res.data.messages || []);
        setEnquiryDetails({ subject: res.data.subject, crop: res.data.product?.title });
      })
      .catch((err) => console.error('Failed to load conversation:', err));

    // 3. Initialize WebSocket Connection
    socketRef.current = io(process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000', {
      auth: { token }
    });

    // Join this enquiry's room so the server's broadcasts actually reach us
    socketRef.current.emit('join_enquiry_room', enquiryId);

    // 4. Listen for incoming real-time messages
    socketRef.current.on('new_chat_message', (msg: Message) => {
      if (msg.enquiryId === enquiryId) {
        setMessages((prev) => [...prev, msg]);
      }
    });

    return () => {
      socketRef.current?.emit('leave_enquiry_room', enquiryId);
      socketRef.current?.disconnect();
    };
  }, [enquiryId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setIsSending(true);
    try {
      // Send via REST API, the backend will emit the Socket.IO event to the receiver
      await fetchApi(`/enquiries/${enquiryId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: newMessage }),
      });
      setNewMessage('');
    } catch (err) {
      alert('Failed to send message. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 h-[90vh] flex flex-col">
      {/* Chat Header */}
      <div className="bg-white border border-stone-200 rounded-t-3xl p-5 flex items-center justify-between shadow-sm z-10">
        <div className="flex items-center gap-4">
          <Link href="/buy" className="p-2 hover:bg-stone-100 rounded-full transition-colors text-stone-500">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-900">
                Active Thread
              </span>
              <h2 className="text-lg font-black text-stone-900">{enquiryDetails?.subject}</h2>
            </div>
            <p className="text-xs font-bold text-stone-500 mt-0.5 flex items-center gap-1">
              <Sprout className="w-3 h-3 text-emerald-600"/> Regarding: {enquiryDetails?.crop}
            </p>
          </div>
        </div>
      </div>

      {/* Chat Messages Area */}
      <div className="flex-1 bg-stone-50 border-x border-stone-200 p-6 overflow-y-auto flex flex-col gap-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-stone-400">
            <p className="text-sm font-bold">No messages yet.</p>
            <p className="text-xs mt-1">Send a message to start negotiating.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === currentUserId;
            return (
              <div key={msg.id || index} className={`flex flex-col max-w-[80%] ${isMe ? 'self-end items-end' : 'self-start items-start'}`}>
                <span className="text-[10px] font-bold text-stone-400 mb-1 ml-1">{msg.sender.name}</span>
                <div className={`px-5 py-3 rounded-2xl shadow-sm ${isMe ? 'bg-emerald-800 text-white rounded-tr-sm' : 'bg-white border border-stone-200 text-stone-800 rounded-tl-sm'}`}>
                  <p className="text-sm font-medium">{msg.content}</p>
                </div>
                <span className="text-[10px] font-bold text-stone-400 mt-1 flex items-center gap-1">
                  {new Date(msg.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {isMe && <CheckCheck className="w-3 h-3 text-emerald-600"/>}
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
            {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5 ml-0.5" />}
          </button>
        </form>
      </div>
    </div>
  );
}