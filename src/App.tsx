import { useState, useEffect } from 'react';
import { Auth } from './components/Auth';
import { MatchCenter } from './components/MatchCenter';
import { LeaderboardView } from './components/LeaderboardView';
import { AdminDashboard } from './components/AdminDashboard';
import { ChatWidget } from './components/ChatWidget';
import { StandingsView } from './components/StandingsView';
import { Trophy, Award, Settings, LogOut, ShieldAlert, LayoutGrid } from 'lucide-react';

function App() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('wc_token'));
  const [user, setUser] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'matches' | 'leaderboard' | 'groups' | 'admin'>('matches');
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

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', color: 'var(--color-primary)' }}>
        <h2 style={{ fontFamily: 'var(--font-display)' }}>Đang tải ứng dụng...</h2>
      </div>
    );
  }

  // Render Auth screen if not logged in
  if (!token || !user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  return (
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
          <div className="user-badge">
            <span>Chào,</span>
            <span className="user-name">{user.username}</span>
            <span style={{ fontSize: '0.75rem', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '4px', color: 'var(--color-text-muted)' }}>
              {user.department}
            </span>
            {user.isAdmin && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px', fontSize: '0.7rem', background: 'rgba(251, 191, 36, 0.15)', color: 'var(--color-secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>
                <ShieldAlert size={10} /> Admin
              </span>
            )}
          </div>

          <button type="button" className="btn-secondary" style={{ padding: '8px 12px', fontSize: '0.85rem' }} onClick={handleLogout} title="Đăng xuất">
            <LogOut size={14} /> <span style={{ marginLeft: '4px' }}>Đăng xuất</span>
          </button>
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

        {activeTab === 'leaderboard' && (
          <LeaderboardView onRefreshTrigger={refreshTrigger} />
        )}

        {activeTab === 'admin' && user.isAdmin && (
          <AdminDashboard token={token} onRefresh={triggerRefresh} />
        )}
      </main>
      <ChatWidget token={token} currentUser={user} />
    </div>
  );
}

export default App;
