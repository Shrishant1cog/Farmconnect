'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { fetchApi } from '../../../../lib/api';
import { useSocket } from '../../../../hooks/useSocket';
import { Send } from 'lucide-react';

export default function EnquiryConversationPage() {
  const params = useParams();
  const id = params?.id ? String(params.id) : '';
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const socket = useSocket();

  useEffect(() => {
    if (!id) return;
    fetchApi(`/enquiries/${id}/messages`)
      .then((res: any) => {
        setMessages(res.data.messages || []);
      })
      .catch((err: any) => {
        console.error('Failed to load conversation:', err);
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit('join_enquiry_room', id);

    socket.on('new_chat_message', (msg: any) => {
      setMessages((prev) => [...prev, msg]);
    });

    return () => {
      socket.emit('leave_enquiry_room', id);
      socket.off('new_chat_message');
    };
  }, [socket, id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsg.trim() || !id) return;

    try {
      await fetchApi(`/enquiries/${id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ content: newMsg }),
      });
      setNewMsg('');
    } catch (err: any) {
      alert(err.message || 'Failed to send message');
    }
  };

  if (loading) {
    return <div className="p-10 text-center text-stone-500">Loading conversation...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
        {/* Header */}
        <div className="p-4 bg-emerald-900 text-white flex justify-between items-center">
          <div>
            <h2 className="font-bold text-sm">Direct Producer Conversation</h2>
            <p className="text-xs text-emerald-200">Enquiry Thread #{id.slice(0, 8)}</p>
          </div>
          <span className="text-xs bg-emerald-800 border border-emerald-700 px-2.5 py-1 rounded-full font-semibold">
            Live Socket Connected
          </span>
        </div>

        {/* Message Log */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-stone-50">
          {messages.length === 0 && (
            <p className="text-center text-xs text-stone-400 py-8">No messages yet. Say hello!</p>
          )}

          {messages.map((m, idx) => (
            <div key={idx} className="bg-white p-3 rounded-xl text-xs text-stone-800 max-w-[80%] border border-stone-200 shadow-xs">
              <span className="font-bold block mb-0.5">{m.sender?.name || 'User'}:</span>
              {m.content}
            </div>
          ))}
        </div>

        {/* Reply Input */}
        <form onSubmit={handleSend} className="p-3 bg-white border-t border-stone-200 flex gap-2">
          <input
            type="text"
            placeholder="Type your message to the farmer..."
            value={newMsg}
            onChange={(e) => setNewMsg(e.target.value)}
            className="flex-1 px-4 py-2.5 rounded-xl border border-stone-300 text-sm focus:ring-2 focus:ring-emerald-600 outline-none"
          />
          <button
            type="submit"
            className="px-5 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-xl font-bold text-sm flex items-center gap-1.5 transition-colors"
          >
            <Send className="w-4 h-4" /> Send
          </button>
        </form>
      </div>
    </div>
  );
}