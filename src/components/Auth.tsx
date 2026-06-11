import React, { useState } from 'react';

interface AuthProps {
  onAuthSuccess: (user: any, token: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister 
      ? { username, fullName, password }
      : { username, password };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Có lỗi xảy ra, vui lòng thử lại.');
      }

      onAuthSuccess(data.user, data.token);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối đến server.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-bg" style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', justifyContent: 'space-between', padding: '20px 16px' }}>
      {/* Spacer to push content down slightly on desktop */}
      <div className="hide-mobile" style={{ flex: '1 0 20px', minHeight: '20px' }} />

      {/* Split/Flex container for card + poster */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        gap: '48px', 
        width: '100%', 
        maxWidth: '1000px', 
        margin: '20px auto', 
        flexWrap: 'wrap'
      }}>
        {/* Left Side: Auth Card */}
        <div className="auth-card" style={{ width: '100%', maxWidth: '440px', margin: 0 }}>
          <div className="auth-header">
            <div className="auth-logo">🏆</div>
            <h1 className="auth-title">Dự Đoán WC 2026</h1>
            <p className="auth-subtitle">Trang dự đoán bóng đá nội bộ công ty</p>
          </div>

          {error && (
            <div className="alert alert-error">
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label" htmlFor="username">
                Tên đăng nhập
              </label>
              <input
                id="username"
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nhập tên đăng nhập (ví dụ: an.nguyen)"
                required
              />
            </div>

            {isRegister && (
              <div className="form-group">
                <label className="form-label" htmlFor="fullName">
                  Họ và tên
                </label>
                <input
                  id="fullName"
                  type="text"
                  className="form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn An"
                  required
                />
              </div>
            )}

            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Mật khẩu
              </label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu"
                required
              />
            </div>

            <button type="submit" className="auth-btn" disabled={loading}>
              {loading ? 'Đang xử lý...' : isRegister ? 'Đăng Ký Tham Gia' : 'Đăng Nhập'}
            </button>
          </form>

          <div className="auth-toggle-msg">
            {isRegister ? (
              <>
                Đã có tài khoản?{' '}
                <button 
                  type="button" 
                  className="auth-toggle-link" 
                  onClick={() => { setIsRegister(false); setError(''); }}
                >
                  Đăng nhập ngay
                </button>
              </>
            ) : (
              <>
                Chưa tham gia?{' '}
                <button 
                  type="button" 
                  className="auth-toggle-link" 
                  onClick={() => { setIsRegister(true); setError(''); }}
                >
                  Đăng ký thành viên
                </button>
              </>
            )}
          </div>
        </div>

        {/* Right Side: Poster (hidden on screens < 900px via css class) */}
        <div className="auth-poster-wrapper">
          <img 
            src="/img/world-cup-1763630852-5001-1763631468.webp" 
            alt="World Cup 2026 Poster" 
            style={{
              width: '100%',
              maxWidth: '460px',
              height: 'auto',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              boxShadow: '0 0 35px rgba(16, 185, 129, 0.25), var(--shadow-lg)',
              objectFit: 'cover',
              display: 'block'
            }} 
          />
        </div>
      </div>

      {/* Spacer to push footer to bottom */}
      <div className="hide-mobile" style={{ flex: '1 0 20px', minHeight: '20px' }} />

      {/* Footer credit - always centered at bottom */}
      <div style={{ padding: '16px 0', fontSize: '0.8rem', color: 'rgba(255, 255, 255, 0.4)', textAlign: 'center', width: '100%' }}>
        Powered by Nam Tran -{' '}
        <a 
          href="https://github.com/blackpearl9798/WC2026" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ color: 'var(--color-primary)', textDecoration: 'none', fontWeight: 600, transition: 'all 0.2s' }}
          onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-secondary)'}
          onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-primary)'}
        >
          https://github.com/blackpearl9798/WC2026
        </a>
      </div>
    </div>
  );
};

