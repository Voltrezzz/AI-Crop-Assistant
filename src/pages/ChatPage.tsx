import React, { useEffect, useState, useRef } from 'react';
import { Send, ArrowLeft, MoreVertical, Shield } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSocialStore } from '@/stores/socialStore';
import { useAuthStore } from '@/stores/authStore';

export default function ChatPage() {
  const { friendId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { friends, messages, loadFriends, loadMessages, sendMessage } = useSocialStore();
  const [content, setContent] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (friends.length === 0) {
      loadFriends();
    }
  }, [friends.length, loadFriends]);

  useEffect(() => {
    if (friendId) {
      loadMessages(friendId);
    }
  }, [friendId, loadMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const friend = friends.find(f => f.friendId === friendId);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim() || !friendId) return;
    
    await sendMessage(friendId, content);
    setContent('');
  };

  if (!friend) {
    return (
      <div className="flex h-full items-center justify-center">
        <p>Loading or friend not found...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-slate-900">
      <header className="px-4 py-3 bg-white dark:bg-slate-800 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between shrink-0 shadow-sm z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700">
            <ArrowLeft size={20} className="text-gray-600 dark:text-slate-300" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
              {friend.name.charAt(0)}
            </div>
            <div>
              <h2 className="font-bold text-gray-900 dark:text-white">{friend.name}</h2>
              <p className="text-xs text-green-600 dark:text-green-400 font-medium">Online</p>
            </div>
          </div>
        </div>
        <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-slate-300">
          <MoreVertical size={20} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 text-xs px-4 py-2 rounded-lg flex items-center gap-2 max-w-sm text-center">
            <Shield size={14} />
            Messages are private and securely stored.
          </div>
        </div>

        {messages.map(msg => {
          const isMe = msg.senderId === user?.cloudId;
          return (
            <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
              <div className={`max-w-[75%] px-4 py-2 rounded-2xl ${isMe ? 'bg-primary-600 text-white rounded-br-sm' : 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white rounded-bl-sm border border-gray-100 dark:border-slate-700 shadow-sm'}`}>
                {msg.content}
              </div>
              <span className="text-[10px] text-gray-400 mt-1 px-1">
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white dark:bg-slate-800 border-t border-gray-200 dark:border-slate-700 shrink-0">
        <form onSubmit={handleSend} className="flex items-end gap-2 max-w-4xl mx-auto">
          <div className="flex-1 bg-gray-100 dark:bg-slate-900 rounded-2xl border border-transparent dark:border-slate-700 focus-within:border-primary-500 focus-within:bg-white transition-all overflow-hidden">
            <textarea
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder="Type a message..."
              className="w-full max-h-32 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-3 px-4 text-gray-900 dark:text-white"
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
            />
          </div>
          <button
            type="submit"
            disabled={!content.trim()}
            className="w-11 h-11 flex-shrink-0 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors shadow-sm"
          >
            <Send size={18} className="ml-1" />
          </button>
        </form>
      </div>
    </div>
  );
}
