import React, { useState } from 'react';

interface AuthProps {
  onAuthSuccess: (user: any, token: string) => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const url = isRegister ? '/api/auth/register' : '/api/auth/login';
    const body = isRegister 
      ? { username, email, department }
      : { username };

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
    <div className="auth-page-bg">
      <div className="auth-card">
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
              {isRegister ? 'Tên đăng nhập (Viết liền, không dấu)' : 'Tên đăng nhập hoặc Email'}
            </label>
            <input
              id="username"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={isRegister ? 'Ví dụ: nguyenvanan' : 'Nhập tên hoặc email'}
              required
            />
          </div>

          {isRegister && (
            <>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  Email công ty
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vi-du@company.com"
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="department">
                  Phòng ban
                </label>
                <input
                  id="department"
                  type="text"
                  className="form-input"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="Ví dụ: IT, Marketing, HR..."
                  required
                />
              </div>
            </>
          )}

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
    </div>
  );
};
