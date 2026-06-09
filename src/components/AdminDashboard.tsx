import React, { useState, useEffect } from 'react';
import { Plus, Trash2, Edit3, Save, X, Settings, Users } from 'lucide-react';

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
    handicapTeam: 'home' as 'home' | 'away' | 'none',
    handicapValue: '0.5'
  });

  // Edit states
  const [editingMatchId, setEditingMatchId] = useState<string | null>(null);
  const [editScore, setEditScore] = useState<{ [matchId: string]: { homeScore: string; awayScore: string; status: 'pending' | 'live' | 'finished' } }>({});

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
        team: newMatch.handicapTeam === 'none' ? null : newMatch.handicapTeam,
        value: newMatch.handicapTeam === 'none' ? 0 : parseFloat(newMatch.handicapValue)
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

  const handleUpdateScore = async (matchId: string) => {
    const edit = editScore[matchId];
    if (!edit) return;

    setError('');
    setSuccess('');
    
    try {
      const response = await fetch(`/api/admin/matches/${matchId}/score`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          homeScore: edit.homeScore,
          awayScore: edit.awayScore,
          status: edit.status
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Lỗi cập nhật tỷ số');

      setSuccess('Cập nhật kết quả trận đấu thành công!');
      setEditingMatchId(null);
      fetchData();
      onRefresh();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối.');
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

  const startEditScore = (match: any) => {
    setEditingMatchId(match.id);
    setEditScore(prev => ({
      ...prev,
      [match.id]: {
        homeScore: match.homeScore !== null ? match.homeScore.toString() : '0',
        awayScore: match.awayScore !== null ? match.awayScore.toString() : '0',
        status: match.status
      }
    }));
  };

  const handleEditScoreChange = (matchId: string, side: 'home' | 'away', value: string) => {
    if (value !== '' && !/^\d+$/.test(value)) return;
    setEditScore(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        [side === 'home' ? 'homeScore' : 'awayScore']: value
      }
    }));
  };

  const handleEditStatusChange = (matchId: string, value: 'pending' | 'live' | 'finished') => {
    setEditScore(prev => ({
      ...prev,
      [matchId]: {
        ...prev[matchId],
        status: value
      }
    }));
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
                    const isEditing = editingMatchId === match.id;
                    const edit = editScore[match.id];

                    return (
                      <tr key={match.id}>
                        <td>
                          <div className="match-teams-display">
                            <span>{match.homeFlag}</span>
                            <span>{match.homeTeam}</span>
                            <span style={{ color: 'var(--color-text-muted)', fontSize: '0.8rem' }}>vs</span>
                            <span>{match.awayTeam}</span>
                            <span>{match.awayFlag}</span>
                          </div>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.8rem' }}>
                            {new Date(match.matchTime).toLocaleString('vi-VN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                            {match.handicap.team === null || match.handicap.value === 0 
                              ? 'Đồng banh (0)' 
                              : `${match.handicap.team === 'home' ? 'Nhà' : 'Khách'} chấp ${match.handicap.value}`}
                          </span>
                        </td>
                        <td>
                          {isEditing ? (
                            <div className="admin-score-update-form">
                              <input
                                type="text"
                                className="admin-score-input"
                                value={edit.homeScore}
                                onChange={(e) => handleEditScoreChange(match.id, 'home', e.target.value)}
                              />
                              <span>-</span>
                              <input
                                type="text"
                                className="admin-score-input"
                                value={edit.awayScore}
                                onChange={(e) => handleEditScoreChange(match.id, 'away', e.target.value)}
                              />
                              <select
                                className="form-input"
                                style={{ width: '110px', height: '32px', padding: '2px 8px', fontSize: '0.8rem' }}
                                value={edit.status}
                                onChange={(e) => handleEditStatusChange(match.id, e.target.value as any)}
                              >
                                <option value="pending">Chưa đá</option>
                                <option value="live">Đang đá</option>
                                <option value="finished">Đã kết thúc</option>
                              </select>
                            </div>
                          ) : (
                            <span style={{ fontWeight: 700, color: 'var(--color-secondary)' }}>
                              {match.status === 'pending' ? 'Chưa diễn ra' : `${match.homeScore} - ${match.awayScore} (${match.status === 'live' ? 'Đang đá' : 'Xong'})`}
                            </span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                            {isEditing ? (
                              <>
                                <button type="button" className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => handleUpdateScore(match.id)}>
                                  <Save size={14} />
                                </button>
                                <button type="button" className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => setEditingMatchId(null)}>
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" className="btn-secondary" style={{ padding: '4px 8px' }} onClick={() => startEditScore(match)}>
                                  <Edit3 size={14} />
                                </button>
                                {match.status === 'pending' && (
                                  <button type="button" className="btn-danger-outline" style={{ padding: '4px 8px' }} onClick={() => handleDeleteMatch(match.id)}>
                                    <Trash2 size={14} />
                                  </button>
                                )}
                              </>
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
                      {user.username} {user.isAdmin && <span style={{ color: 'var(--color-secondary)' }}>(Admin)</span>}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                      {user.department} | {user.email}
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
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '10px' }}>
                <div className="form-group">
                  <label className="form-label">Đội chấp kèo</label>
                  <select
                    className="form-input"
                    value={newMatch.handicapTeam}
                    onChange={(e) => setNewMatch(prev => ({ ...prev, handicapTeam: e.target.value as any }))}
                  >
                    <option value="home">Sân nhà chấp</option>
                    <option value="away">Sân khách chấp</option>
                    <option value="none">Đồng banh (Không chấp)</option>
                  </select>
                </div>
                {newMatch.handicapTeam !== 'none' && (
                  <div className="form-group">
                    <label className="form-label">Tỷ lệ chấp</label>
                    <select
                      className="form-input"
                      value={newMatch.handicapValue}
                      onChange={(e) => setNewMatch(prev => ({ ...prev, handicapValue: e.target.value }))}
                    >
                      <option value="0.25">0.25 (Đồng nửa)</option>
                      <option value="0.5">0.5 (Nửa trái)</option>
                      <option value="0.75">0.75 (Nửa một)</option>
                      <option value="1.0">1.0 (Một hòa)</option>
                      <option value="1.25">1.25 (Một thua nửa)</option>
                      <option value="1.5">1.5 (Trái rưỡi)</option>
                      <option value="1.75">1.75 (Trái rưỡi hai)</option>
                      <option value="2.0">2.0 (Hai hòa)</option>
                    </select>
                  </div>
                )}
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
    </div>
  );
};
