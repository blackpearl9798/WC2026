import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

interface ChatWidgetProps {
  token: string;
  currentUser: any;
}

const getAvatarInitials = (name: string) => {
  if (!name) return '?';
  const parts = name.trim().split(' ');
  if (parts.length > 1) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
};

const getAvatarStyle = (colorClass: string) => {
  switch (colorClass) {
    case 'gradient-blue': return { background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', border: '1px solid rgba(59,130,246,0.3)', boxShadow: '0 0 10px rgba(59,130,246,0.2)' };
    case 'gradient-purple': return { background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)', border: '1px solid rgba(139,92,246,0.3)', boxShadow: '0 0 10px rgba(139,92,246,0.2)' };
    case 'gradient-red': return { background: 'linear-gradient(135deg, #ef4444, #b91c1c)', border: '1px solid rgba(239,68,68,0.3)', boxShadow: '0 0 10px rgba(239,68,68,0.2)' };
    case 'gradient-orange': return { background: 'linear-gradient(135deg, #f97316, #c2410c)', border: '1px solid rgba(249,115,22,0.3)', boxShadow: '0 0 10px rgba(249,115,22,0.2)' };
    case 'gradient-pink': return { background: 'linear-gradient(135deg, #ec4899, #be185d)', border: '1px solid rgba(236,72,153,0.3)', boxShadow: '0 0 10px rgba(236,72,153,0.2)' };
    case 'gradient-gold': return { background: 'linear-gradient(135deg, #fbbf24, #b45309)', border: '1px solid rgba(251,191,36,0.3)', boxShadow: '0 0 10px rgba(251,191,36,0.2)' };
    default: return { background: 'linear-gradient(135deg, #10b981, #047857)', border: '1px solid rgba(16,185,129,0.3)', boxShadow: '0 0 10px rgba(16,185,129,0.2)' };
  }
};

export const ChatWidget: React.FC<ChatWidgetProps> = ({ token, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastMessageCountRef = useRef<number | null>(null);

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/chat', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
        if (lastMessageCountRef.current === null) {
          lastMessageCountRef.current = data.length;
        }
      }
    } catch (err) {
      console.error('Lỗi tải tin nhắn chat:', err);
    }
  };

  // Poll for messages every 5 seconds when open
  useEffect(() => {
    if (!token) return;
    
    // Fetch immediately
    fetchMessages();

    const interval = setInterval(() => {
      fetchMessages();
    }, 5000);

    return () => clearInterval(interval);
  }, [token, isOpen]);

  // Scroll to bottom when messages list updates or window opens
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Update last message count when chat is open
  useEffect(() => {
    if (isOpen) {
      lastMessageCountRef.current = messages.length;
    }
  }, [isOpen, messages.length]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;

    setSending(true);
    const msgText = input.trim();
    setInput('');

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: msgText })
      });

      if (response.ok) {
        const newMsg = await response.json();
        setMessages(prev => [...prev, newMsg]);
      } else {
        console.error('Không thể gửi tin nhắn');
      }
    } catch (err) {
      console.error('Lỗi gửi tin nhắn:', err);
    } finally {
      setSending(false);
    }
  };

  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
      return '';
    }
  };

  const unreadCount = isOpen ? 0 : Math.max(0, messages.length - (lastMessageCountRef.current ?? messages.length));

  return (
    <>
      {/* Floating Action Button */}
      <div className="floating-chat-bubble" onClick={() => setIsOpen(prev => !prev)} title="Tán gẫu công ty">
        <MessageSquare size={24} />
        {!isOpen && unreadCount > 0 && (
          <span className="chat-badge">{unreadCount}</span>
        )}
      </div>

      {/* Expanded Chat Window */}
      {isOpen && (
        <div className="floating-chat-window">
          {/* Header */}
          <div className="chat-header">
            <div className="chat-header-title">
              <MessageSquare size={16} />
              <span>Phòng Tán Gẫu Công Ty</span>
            </div>
            <button type="button" className="chat-header-close" onClick={() => setIsOpen(false)}>
              <X size={16} />
            </button>
          </div>

          {/* Messages list */}
          <div className="chat-messages">
            {messages.length > 0 ? (
              messages.map((msg: any) => {
                const isMe = msg.userId === currentUser.id;
                // Use current user's profile details if they've updated, otherwise fall back to msg fields
                const displayColor = isMe ? (currentUser.avatarColor || msg.avatarColor || '') : (msg.avatarColor || '');
                const displayIcon = isMe ? (currentUser.avatarIcon || msg.avatarIcon || '') : (msg.avatarIcon || '');
                const displayName = isMe ? 'Bạn' : msg.username;

                return (
                  <div key={msg.id} className={`chat-message-item ${isMe ? 'me' : ''}`}>
                    <div className="chat-message-info" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <div className="player-avatar-small" style={{ ...getAvatarStyle(displayColor), width: '18px', height: '18px', fontSize: '0.6rem', color: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        {displayIcon ? displayIcon : getAvatarInitials(isMe ? (currentUser.fullName || currentUser.username) : msg.username)}
                      </div>
                      <span className="chat-message-user">{displayName}</span>
                      {msg.department && <span className="chat-message-dept">({msg.department})</span>}
                    </div>
                    <div className="chat-message-text">{msg.message}</div>
                    <span className="chat-message-time">{formatTime(msg.timestamp)}</span>
                  </div>
                );
              })
            ) : (
              <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.8rem', padding: '40px 10px', fontStyle: 'italic' }}>
                Chưa có tin nhắn nào. Hãy mở đầu cuộc trò chuyện sôi nổi!
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input field */}
          <form className="chat-footer" onSubmit={handleSend}>
            <input
              type="text"
              className="chat-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Nhập tin nhắn..."
              required
            />
            <button type="submit" className="chat-send-btn" disabled={!input.trim() || sending}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

