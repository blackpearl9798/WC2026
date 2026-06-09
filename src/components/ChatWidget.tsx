import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X } from 'lucide-react';

interface ChatWidgetProps {
  token: string;
  currentUser: any;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ token, currentUser }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    if (!token) return;
    try {
      const response = await fetch('/api/chat', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setMessages(data);
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

  return (
    <>
      {/* Floating Action Button */}
      <div className="floating-chat-bubble" onClick={() => setIsOpen(prev => !prev)} title="Tán gẫu công ty">
        <MessageSquare size={24} />
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
                return (
                  <div key={msg.id} className={`chat-message-item ${isMe ? 'me' : ''}`}>
                    <div className="chat-message-info">
                      <span className="chat-message-user">{isMe ? 'Bạn' : msg.username}</span>
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
