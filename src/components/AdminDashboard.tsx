import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Settings, Users } from 'lucide-react';
import { FlagIcon } from './FlagIcon';

interface AdminDashboardProps {
  token: string;
  onRefresh: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ token, onRefresh }) => {
  const [matches, setMatches] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Forms states
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMatch, setNewMatch] = useState({
    homeTeam: '',
    awayTeam: '',
    homeFlag: '🏳️',
    awayFlag: '🏳️',
    matchTime: '',
    handicapTeam: 'home' as 'home' | 'away',
    handicapValue: '0.5'
  });

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMatch, setEditingMatch] = useState<{
    id: string;
    homeTeam: string;
    awayTeam: string;
    homeFlag: string;
    awayFlag: string;
    matchTime: string;
    handicapTeam: 'home' | 'away';
    handicapValue: string;
    status: 'pending' | 'live' | 'finished';
    homeScore: string;
    awayScore: string;
  } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch matches with auth
      const matchRes = await fetch('/api/matches', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!matchRes.ok) throw new Error('Không thể tải danh sách trận đấu');
      const matchData = await matchRes.ok ? await matchRes.json() : [];
      setMatches(matchData);

      // Fetch users
      const userRes = await fetch('/api/admin/users', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (userRes.ok) {
        const userData = await userRes.json();
        setUsers(userData);
      }
    } catch (err: any) {
      setError(err.message || 'Lỗi tải dữ liệu admin');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token]);

  const handleAddMatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const handicap = {
        team: newMatch.handicapTeam,
        value: parseFloat(newMatch.handicapValue)
      };

      const response = await fetch('/api/admin/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          homeTeam: newMatch.homeTeam,
          awayTeam: newMatch.awayTeam,
          homeFlag: newMatch.homeFlag,
          awayFlag: newMatch.awayFlag,
          matchTime: newMatch.matchTime,
          handicap
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lỗi thêm trận đấu');

      setSuccess('Thêm trận đấu thành công!');
      setShowAddModal(false);
      // Reset form
      setNewMatch({
        homeTeam: '',
        awayTeam: '',
        homeFlag: '🏳️',
        awayFlag: '🏳️',
        matchTime: '',
        handicapTeam: 'home',
        handicapValue: '0.5'
      });
      fetchData();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteMatch = async (matchId: string) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa trận đấu này và toàn bộ dự đoán đi kèm?')) return;
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lỗi khi xóa trận đấu');

      setSuccess('Xóa trận đấu thành công!');
      fetchData();
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteUser = async (userId: string, username: string) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa tài khoản "${username}"? Toàn bộ lịch sử dự đoán của người này sẽ bị xóa.`)) return;
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lỗi khi xóa người dùng');

      setSuccess(`Xóa người dùng "${username}" thành công!`);
      fetchData();
      onRefresh();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEditMatch = (match: any) => {
    const dateObj = new Date(match.matchTime);
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    const hours = String(dateObj.getHours()).padStart(2, '0');
    const minutes = String(dateObj.getMinutes()).padStart(2, '0');
    const localDateTimeStr = `${year}-${month}-${day}T${hours}:${minutes}`;

    setEditingMatch({
      id: match.id,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      homeFlag: match.homeFlag || '🏳️',
      awayFlag: match.awayFlag || '🏳️',
      matchTime: localDateTimeStr,
      handicapTeam: match.handicap.team === 'away' ? 'away' : 'home',
      handicapValue: ['0.5', '1.5', '2.5', '3.5', '4.5', '5.5'].includes(String(match.handicap.value)) 
        ? String(match.handicap.value) 
        : '0.5',
      status: match.status,
      homeScore: match.homeScore !== null ? match.homeScore.toString() : '0',
      awayScore: match.awayScore !== null ? match.awayScore.toString() : '0'
    });
    setShowEditModal(true);
  };

  const handleEditMatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMatch) return;

    setError('');
    setSuccess('');
    setSubmitting(true);

    try {
      const handicap = {
        team: editingMatch.handicapTeam,
        value: parseFloat(editingMatch.handicapValue)
      };

      const response = await fetch(`/api/admin/matches/${editingMatch.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          homeTeam: editingMatch.homeTeam,
          awayTeam: editingMatch.awayTeam,
          homeFlag: editingMatch.homeFlag,
          awayFlag: editingMatch.awayFlag,
          matchTime: editingMatch.matchTime,
          handicap,
          status: editingMatch.status,
          homeScore: editingMatch.homeScore,
          awayScore: editingMatch.awayScore
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lỗi cập nhật trận đấu');

      setSuccess('Cập nhật trận đấu và kết quả thành công!');
      setShowEditModal(false);
      setEditingMatch(null);
      fetchData();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="admin-header-row">
        <h2 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Settings style={{ color: 'var(--color-secondary)' }} /> Bảng Điều Khiển Quản Trị
        </h2>
        <button type="button" className="save-prediction-btn" style={{ width: 'auto' }} onClick={() => setShowAddModal(true)}>
          <Plus size={16} /> Thêm Trận Đấu
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <span>✅</span>
          <span>{success}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}>Đang tải dữ liệu admin...</div>
      ) : (
        <div className="admin-grid-layout">
          {/* Matches Management */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
              Quản Lý Trận Đấu ({matches.length})
            </h3>
            
            <div style={{ overflowX: 'auto' }}>
              <table className="admin-match-table">
                <thead>
                  <tr>
                    <th>Trận đấu</th>
                    <th>Thời gian</th>
                    <th>Handicap</th>
                    <th>Kết quả / Trạng thái</th>
                    <th style={{ textAlign: 'center' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map(match => {
                    return (
                      <tr key={match.id}>
                        <td data-label="Trận đấu">
                          <div className="match-teams-display">
                            <FlagIcon flag={match.homeFlag} />
                            <span>{match.homeTeam}</span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>vs</span>
                            <span>{match.awayTeam}</span>
                            <FlagIcon flag={match.awayFlag} style={{ marginLeft: '6px', marginRight: '0' }} />
                          </div>
                        </td>
                        <td data-label="Thời gian">
                          <span style={{ fontSize: '0.8rem' }}>
                            {new Date(match.matchTime).toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td data-label="Handicap">
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {`${match.handicap.team === 'home' ? 'Nhà' : 'Khách'} chấp ${match.handicap.value}`}
                          </span>
                        </td>
                        <td data-label="Trạng thái">
                          <span style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>
                            {match.status === 'pending' ? 'Chưa diễn ra' : `${match.homeScore} - ${match.awayScore} (${match.status === 'live' ? 'Đang đá' : 'Xong'})`}
                          </span>
                        </td>
                        <td data-label="Thao tác" style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            <button
                              type="button"
                              className="btn-secondary"
                              style={{ padding: '4px 8px' }}
                              onClick={() => startEditMatch(match)}
                              title="Chỉnh sửa trận đấu & Kết quả"
                            >
                              <Edit3 size={14} />
                            </button>
                            {match.status === 'pending' && (
                              <button type="button" className="btn-danger-outline" style={{ padding: '4px 8px' }} onClick={() => handleDeleteMatch(match.id)}>
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Users Management */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> Thành Viên ({users.length})
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {users.map(user => (
                <div key={user.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>
                      {user.fullName || user.username} {user.isAdmin && <span style={{ color: 'var(--color-secondary)' }}>(Admin)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      Tên đăng nhập: {user.username}
                    </div>
                  </div>
                  {!user.isAdmin && (
                    <button
                      type="button"
                      className="btn-danger-outline"
                      style={{ padding: '6px' }}
                      onClick={() => handleDeleteUser(user.id, user.username)}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Match Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Thêm Trận Đấu Mới</h3>
            <form onSubmit={handleAddMatch}>
              <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Đội chủ nhà</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newMatch.homeTeam}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, homeTeam: e.target.value }))}
                    placeholder="Ví dụ: Argentina"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lá cờ nhà (Emoji)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newMatch.homeFlag}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, homeFlag: e.target.value }))}
                    placeholder="🇦🇷"
                    required
                  />
                </div>
              </div>

              <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Đội khách</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newMatch.awayTeam}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, awayTeam: e.target.value }))}
                    placeholder="Ví dụ: Bồ Đào Nha"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lá cờ khách (Emoji)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={newMatch.awayFlag}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, awayFlag: e.target.value }))}
                    placeholder="🇵🇹"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Thời gian trận đấu</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={newMatch.matchTime}
                  onChange={(e) => setNewMatch(prev => ({ ...prev, matchTime: e.target.value }))}
                  required
                />
              </div>

              <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Đội chấp kèo</label>
                  <select
                    className="form-input"
                    value={newMatch.handicapTeam}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, handicapTeam: e.target.value as any }))}
                  >
                    <option value="home">{newMatch.homeFlag} {newMatch.homeTeam || 'Sân nhà'} chấp</option>
                    <option value="away">{newMatch.awayFlag} {newMatch.awayTeam || 'Sân khách'} chấp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tỷ lệ chấp</label>
                  <select
                    className="form-input"
                    value={newMatch.handicapValue}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, handicapValue: e.target.value }))}
                  >
                    <option value="0.5">0.5 (Nửa trái)</option>
                    <option value="1.5">1.5 (Trái rưỡi)</option>
                    <option value="2.5">2.5 (Hai trái rưỡi)</option>
                    <option value="3.5">3.5 (Ba trái rưỡi)</option>
                    <option value="4.5">4.5 (Bốn trái rưỡi)</option>
                    <option value="5.5">5.5 (Năm trái rưỡi)</option>
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowAddModal(false)}>
                  Hủy bỏ
                </button>
                <button type="submit" className="save-prediction-btn" style={{ width: 'auto' }} disabled={submitting}>
                  {submitting ? 'Đang tạo...' : 'Tạo Trận Đấu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Match Modal */}
      {showEditModal && editingMatch && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3 className="modal-title">Chỉnh Sửa Trận Đấu & Kết Quả</h3>
            <form onSubmit={handleEditMatchSubmit}>
              <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Đội chủ nhà</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingMatch.homeTeam}
                    onChange={(e) => setEditingMatch(prev => prev ? ({ ...prev, homeTeam: e.target.value }) : null)}
                    placeholder="Ví dụ: Argentina"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lá cờ nhà (Emoji)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingMatch.homeFlag}
                    onChange={(e) => setEditingMatch(prev => prev ? ({ ...prev, homeFlag: e.target.value }) : null)}
                    placeholder="🇦🇷"
                    required
                  />
                </div>
              </div>

              <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="form-label">Đội khách</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingMatch.awayTeam}
                    onChange={(e) => setEditingMatch(prev => prev ? ({ ...prev, awayTeam: e.target.value }) : null)}
                    placeholder="Ví dụ: Bồ Đào Nha"
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Lá cờ khách (Emoji)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingMatch.awayFlag}
                    onChange={(e) => setEditingMatch(prev => prev ? ({ ...prev, awayFlag: e.target.value }) : null)}
                    placeholder="🇵🇹"
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Thời gian trận đấu</label>
                <input
                  type="datetime-local"
                  className="form-input"
                  value={editingMatch.matchTime}
                  onChange={(e) => setEditingMatch(prev => prev ? ({ ...prev, matchTime: e.target.value }) : null)}
                  required
                />
              </div>

              <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Đội chấp kèo</label>
                  <select
                    className="form-input"
                    value={editingMatch.handicapTeam}
                    onChange={(e) => setEditingMatch(prev => prev ? ({ ...prev, handicapTeam: e.target.value as any }) : null)}
                  >
                    <option value="home">{editingMatch.homeFlag} {editingMatch.homeTeam || 'Sân nhà'} chấp</option>
                    <option value="away">{editingMatch.awayFlag} {editingMatch.awayTeam || 'Sân khách'} chấp</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Tỷ lệ chấp</label>
                  <select
                    className="form-input"
                    value={editingMatch.handicapValue}
                    onChange={(e) => setEditingMatch(prev => prev ? ({ ...prev, handicapValue: e.target.value }) : null)}
                  >
                    <option value="0.5">0.5 (Nửa trái)</option>
                    <option value="1.5">1.5 (Trái rưỡi)</option>
                    <option value="2.5">2.5 (Hai trái rưỡi)</option>
                    <option value="3.5">3.5 (Ba trái rưỡi)</option>
                    <option value="4.5">4.5 (Bốn trái rưỡi)</option>
                    <option value="5.5">5.5 (Năm trái rưỡi)</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ marginTop: '10px' }}>
                <label className="form-label">Trạng thái trận đấu</label>
                <select
                  className="form-input"
                  value={editingMatch.status}
                  onChange={(e) => setEditingMatch(prev => prev ? ({ ...prev, status: e.target.value as any }) : null)}
                >
                  <option value="pending">Chưa diễn ra</option>
                  <option value="live">Đang diễn ra</option>
                  <option value="finished">Đã kết thúc</option>
                </select>
              </div>

              {editingMatch.status !== 'pending' && (
                <div className="modal-form-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                  <div className="form-group">
                    <label className="form-label">Tỷ số Chủ nhà ({editingMatch.homeTeam})</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={editingMatch.homeScore}
                      onChange={(e) => setEditingMatch(prev => prev ? ({ ...prev, homeScore: e.target.value }) : null)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Tỷ số Khách ({editingMatch.awayTeam})</label>
                    <input
                      type="number"
                      min="0"
                      className="form-input"
                      value={editingMatch.awayScore}
                      onChange={(e) => setEditingMatch(prev => prev ? ({ ...prev, awayScore: e.target.value }) : null)}
                      required
                    />
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => { setShowEditModal(false); setEditingMatch(null); }}>
                  Hủy bỏ
                </button>
                <button type="submit" className="save-prediction-btn" style={{ width: 'auto' }} disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Lưu Thay Đổi'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
