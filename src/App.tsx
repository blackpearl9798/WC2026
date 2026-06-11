import { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { MatchCenter } from './components/MatchCenter';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminDashboard } from './components/AdminDashboard';
import { ChatWidget } from './components/ChatWidget';
import { StandingsView } from './components/StandingsView';
import { AllPredictionsView } from './components/AllPredictionsView';
import { Trophy, Award, Settings, LogOut, ShieldAlert, LayoutGrid, Users, User } from 'lucide-react';

// Avatar styling helper functions
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

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('wc_token'));
  const [user, setUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'groups' | 'summary' | 'leaderboard' | 'admin'>('matches');
  const [matches, setMatches] = useState<any[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [loading, setLoading] = useState(true);

  // Check login token and fetch current user details on mount
  useEffect(() => {
    const checkToken = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const response = await fetch('/api/auth/me', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
        } else {
          // Token expired or invalid
          handleLogout();
        }
      } catch (err) {
        console.error('Lỗi kiểm tra token:', err);
      } finally {
        setLoading(false);
      }
    };

    checkToken();
  }, [token]);

  // Fetch matches whenever token changes or refresh is triggered
  useEffect(() => {
    const fetchMatches = async () => {
      if (!token || !user) return;
      try {
        const response = await fetch('/api/matches', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (response.ok) {
          const data = await response.json();
          setMatches(data);
        }
      } catch (err) {
        console.error('Lỗi tải danh sách trận đấu:', err);
      }
    };

    fetchMatches();
  }, [token, user, refreshTrigger]);

  const handleAuthSuccess = (authUser: any, authToken: string) => {
    localStorage.setItem('wc_token', authToken);
    setToken(authToken);
    setUser(authUser);
    setActiveTab('matches');
  };

  const handleLogout = () => {
    localStorage.removeItem('wc_token');
    setToken(null);
    setUser(null);
  };

  const triggerRefresh = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  // Profile form states
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: '',
    password: '',
    confirmPassword: '',
    avatarColor: '',
    avatarIcon: ''
  });
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const openProfileModal = () => {
    setProfileForm({
      fullName: user ? (user.fullName || '') : '',
      password: '',
      confirmPassword: '',
      avatarColor: user ? (user.avatarColor || 'gradient-emerald') : 'gradient-emerald',
      avatarIcon: user ? (user.avatarIcon || '') : ''
    });
    setProfileError('');
    setProfileSuccess('');
    setShowProfileModal(true);
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError('');
    setProfileSuccess('');

    if (profileForm.password && profileForm.password !== profileForm.confirmPassword) {
      setProfileError('Xác nhận mật khẩu mới không khớp');
      return;
    }

    setProfileSubmitting(true);

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          fullName: profileForm.fullName,
          password: profileForm.password || undefined,
          avatarColor: profileForm.avatarColor,
          avatarIcon: profileForm.avatarIcon
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Lỗi cập nhật hồ sơ');
      }

      setProfileSuccess('Cập nhật tài khoản thành công!');
      setUser(data.user); // Cập nhật thông tin user trong state React
      
      // Đóng modal sau 1.2s
      setTimeout(() => {
        setShowProfileModal(false);
        setProfileSuccess('');
      }, 1200);

    } catch (err: any) {
      setProfileError(err.message || 'Lỗi kết nối.');
    } finally {
      setProfileSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--color-primary)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Đang tải ứng dụng...</h2>
      </div>
    );
  }

  // Render Auth screen if not logged in
  if (!token || !user) {
    return (
      <>
        <div className="ticker-wrap">
          <div className="ticker-content">
            ⚠️ Disclaimer: Website được lập ra hoàn toàn cho mục đích giải trí, thử tài dự đoán bóng đá không mang tính chất thương mại. Chúng tôi không tổ chức cá cược và không sử dụng tiền thật dưới mọi hình thức
          </div>
        </div>
        <Auth onAuthSuccess={handleAuthSuccess} />
      </>
    );
  }

  return (
    <>
      <div className="ticker-wrap">
        <div className="ticker-content">
          ⚠️ Disclaimer: Website được lập ra hoàn toàn cho mục đích giải trí, thử tài dự đoán bóng đá không mang tính chất thương mại. Chúng tôi không tổ chức cá cược và không sử dụng tiền thật dưới mọi hình thức
        </div>
      </div>
      <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-section">
          <div className="logo-badge">WC</div>
          <div>
            <h1 className="brand-title">Dự Đoán World Cup 2026</h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>Mùa giải nội bộ công ty</p>
          </div>
        </div>

        <div className="user-status">
          <div className="user-badge" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div className="player-avatar-small" style={{ ...getAvatarStyle(user.avatarColor || ''), width: '28px', height: '28px', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: 'white', borderRadius: '50%', flexShrink: 0 }}>
              {user.avatarIcon ? user.avatarIcon : getAvatarInitials(user.fullName || user.username)}
            </div>
            <div>
              <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', display: 'block', lineHeight: 1.1 }}>Chào,</span>
              <span className="user-name" style={{ fontWeight: 600, display: 'block', fontSize: '0.85rem', lineHeight: 1.1 }}>{user.fullName || user.username}</span>
            </div>
            {user.isAdmin && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.65rem', background: 'rgba(251, 191, 36, 0.15)', color: 'var(--color-secondary)', padding: '2px 4px', borderRadius: '4px', fontWeight: 600, marginLeft: '4px' }}>
                <ShieldAlert size={10} /> Admin
              </span>
            )}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={openProfileModal} title="Thiết lập tài khoản">
              <User size={14} /> <span style={{ marginLeft: '4px' }}>Tài khoản</span>
            </button>

            <button type="button" className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={handleLogout} title="Đăng xuất">
              <LogOut size={14} /> <span style={{ marginLeft: '4px' }}>Đăng xuất</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs Navigation */}
      <nav className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'matches' ? 'active' : ''}`}
          onClick={() => setActiveTab('matches')}
        >
          <Trophy size={16} /> Dự Đoán
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <LayoutGrid size={16} /> Bảng Đấu WC
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => setActiveTab('summary')}
        >
          <Users size={16} /> Tổng Hợp
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setActiveTab('leaderboard')}
        >
          <Award size={16} /> Xếp Hạng
        </button>

        {user.isAdmin && (
          <button
            type="button"
            className={`tab-btn ${activeTab === 'admin' ? 'active-admin' : ''}`}
            onClick={() => setActiveTab('admin')}
          >
            <Settings size={16} /> Bảng Quản Trị
          </button>
        )}
      </nav>

      {/* Active Tab View */}
      <main>
        {activeTab === 'matches' && (
          <MatchCenter matches={matches} token={token} onRefresh={triggerRefresh} />
        )}

        {activeTab === 'groups' && (
          <StandingsView matches={matches} />
        )}

        {activeTab === 'summary' && (
          <AllPredictionsView matches={matches} token={token} currentUser={user} />
        )}

        {activeTab === 'leaderboard' && (
          <LeaderboardView onRefreshTrigger={refreshTrigger} />
        )}

        {activeTab === 'admin' && user.isAdmin && (
          <AdminDashboard token={token} onRefresh={triggerRefresh} />
        )}
      </main>
      <ChatWidget token={token} currentUser={user} />
      
      {/* Profile Modal */}
      {showProfileModal && (
        <div className="modal-overlay" style={{ zIndex: 110 }}>
          <div className="modal-content" style={{ maxWidth: '500px' }}>
            <h3 className="modal-title">Thiết Lập Tài Khoản</h3>
            
            {profileError && (
              <div className="alert alert-error" style={{ marginBottom: '16px' }}>
                <span>⚠️</span>
                <span>{profileError}</span>
              </div>
            )}

            {profileSuccess && (
              <div className="alert alert-success" style={{ marginBottom: '16px' }}>
                <span>✅</span>
                <span>{profileSuccess}</span>
              </div>
            )}

            <form onSubmit={handleProfileUpdate}>
              <div className="form-group">
                <label className="form-label">Tên đăng nhập (Không thể đổi)</label>
                <input
                  type="text"
                  className="form-input"
                  value={user.username}
                  disabled
                  style={{ opacity: 0.5, cursor: 'not-allowed' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Họ và Tên hiển thị</label>
                <input
                  type="text"
                  className="form-input"
                  value={profileForm.fullName}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, fullName: e.target.value }))}
                  placeholder="Ví dụ: Nguyễn Văn A"
                  required
                />
              </div>

              {/* Avatar Builder */}
              <div className="form-group" style={{ background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '8px', border: '1px solid var(--border-color)', marginBottom: '16px' }}>
                <label className="form-label" style={{ marginBottom: '12px', display: 'block', fontWeight: 'bold', color: 'var(--color-secondary)' }}>🎨 TỰ THIẾT KẾ BADGE ĐẠI DIỆN</label>
                
                {/* Live Preview */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px' }}>
                  <div className="player-avatar-small" style={{ ...getAvatarStyle(profileForm.avatarColor), width: '50px', height: '50px', fontSize: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', borderRadius: '50%', fontWeight: 'bold' }}>
                    {profileForm.avatarIcon ? profileForm.avatarIcon : getAvatarInitials(profileForm.fullName || user.username)}
                  </div>
                  <div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', display: 'block' }}>Xem trước ảnh đại diện</span>
                    <span style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>{profileForm.fullName || user.username}</span>
                  </div>
                </div>

                {/* Background color selectors */}
                <div style={{ marginBottom: '12px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>1. Chọn màu nền Gradient:</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {[
                      { class: 'gradient-emerald', label: 'Xanh' },
                      { class: 'gradient-blue', label: 'Lam' },
                      { class: 'gradient-purple', label: 'Tím' },
                      { class: 'gradient-orange', label: 'Cam' },
                      { class: 'gradient-red', label: 'Đỏ' },
                      { class: 'gradient-pink', label: 'Hồng' },
                      { class: 'gradient-gold', label: 'Vàng' }
                    ].map(item => (
                      <button
                        key={item.class}
                        type="button"
                        onClick={() => setProfileForm(prev => ({ ...prev, avatarColor: item.class }))}
                        style={{
                          ...getAvatarStyle(item.class),
                          padding: '6px 12px',
                          border: profileForm.avatarColor === item.class ? '2px solid white' : '1px solid transparent',
                          borderRadius: '4px',
                          color: 'white',
                          fontSize: '0.75rem',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          boxShadow: profileForm.avatarColor === item.class ? '0 0 10px rgba(255,255,255,0.4)' : 'none'
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Icon selectors */}
                <div>
                  <label className="form-label" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>2. Chọn biểu tượng hiển thị:</label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '6px' }}>
                    {[
                      { icon: '', label: 'Chữ cái' },
                      { icon: '⚽', label: 'Bóng' },
                      { icon: '🏆', label: 'Cúp' },
                      { icon: '👑', label: 'Miện' },
                      { icon: '⚡', label: 'Sét' },
                      { icon: '🔥', label: 'Lửa' },
                      { icon: '🛡️', label: 'Khiên' },
                      { icon: '🦁', label: 'Sư tử' }
                    ].map(item => (
                      <button
                        key={item.icon}
                        type="button"
                        onClick={() => setProfileForm(prev => ({ ...prev, avatarIcon: item.icon }))}
                        style={{
                          padding: '6px 10px',
                          background: profileForm.avatarIcon === item.icon ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.03)',
                          border: profileForm.avatarIcon === item.icon ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                          color: 'white',
                          borderRadius: '4px',
                          fontSize: '0.75rem',
                          cursor: 'pointer'
                        }}
                      >
                        {item.icon ? `${item.icon} ${item.label}` : item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div style={{ borderTop: '1px dashed rgba(255,255,255,0.1)', paddingTop: '16px', marginTop: '16px' }}>
                <h4 style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '10px' }}>Thay đổi mật khẩu (Bỏ trống nếu không muốn đổi)</h4>
                
                <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div className="form-group">
                    <label className="form-label">Mật khẩu mới</label>
                    <input
                      type="password"
                      className="form-input"
                      value={profileForm.password}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, password: e.target.value }))}
                      placeholder="Tối thiểu 6 ký tự"
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Xác nhận mật khẩu mới</label>
                    <input
                      type="password"
                      className="form-input"
                      value={profileForm.confirmPassword}
                      onChange={(e) => setProfileForm(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="Nhập lại mật khẩu mới"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '20px' }}>
                <button type="button" className="btn-secondary" onClick={() => setShowProfileModal(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="save-prediction-btn" style={{ width: 'auto' }} disabled={profileSubmitting}>
                  {profileSubmitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
    </>
  );
}

export default App;
