import React, { useState, useEffect } from 'react';
import { Download, Users, Trophy, Lock, EyeOff } from 'lucide-react';
import { FlagIcon } from './FlagIcon';

interface AllPredictionsViewProps {
  matches: any[];
  token: string;
  currentUser: any;
}

export const AllPredictionsView: React.FC<AllPredictionsViewProps> = ({ matches, token, currentUser }) => {
  const [users, setUsers] = useState<any[]>([]);
  const [predictions, setPredictions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'match' | 'user'>('match');
  const [selectedMatchId, setSelectedMatchId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [exportError, setExportError] = useState('');

  // Fetch users and all predictions on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        // Fetch users
        const usersRes = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!usersRes.ok) throw new Error('Không thể tải danh sách thành viên');
        const usersData = await usersRes.json();
        setUsers(usersData);
        if (usersData.length > 0) {
          setSelectedUserId(usersData[0].id);
        }

        // Fetch predictions
        const predsRes = await fetch('/api/predictions/all', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!predsRes.ok) throw new Error('Không thể tải danh sách dự đoán');
        const predsData = await predsRes.json();
        setPredictions(predsData);

        // Set default selected match
        if (matches.length > 0) {
          // Default to the first pending match, or the first match if all finished
          const firstPending = matches.find(m => m.status === 'pending');
          setSelectedMatchId(firstPending ? firstPending.id : matches[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Lỗi kết nối.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [token, matches]);

  const handleExport = async (type: 'leaderboard' | 'details') => {
    setExportError('');
    try {
      const response = await fetch(`/api/admin/export-csv?type=${type}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Lỗi xuất file');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = type === 'leaderboard' ? 'bang_xep_hang_wc2026.csv' : 'chi_tiet_du_doan_wc2026.csv';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      setExportError(err.message || 'Lỗi khi tải file.');
    }
  };

  const selectedMatch = matches.find(m => m.id === selectedMatchId);
  const selectedUser = users.find(u => u.id === selectedUserId);

  const getHandicapText = (handicap: any, homeTeam: string, awayTeam: string) => {
    const { team, value } = handicap;
    if (team === null || value === 0) {
      return 'Đồng banh (0)';
    }
    const teamName = team === 'home' ? homeTeam : awayTeam;
    return `${teamName} chấp ${value}`;
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <div>
      <div className="admin-header-row" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Users style={{ color: 'var(--color-primary)' }} /> Tổng Hợp Dự Đoán Thành Viên
        </h2>
        {currentUser.isAdmin && (
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button type="button" className="btn-secondary" onClick={() => handleExport('leaderboard')} title="Tải bảng xếp hạng cá nhân">
              <Download size={14} /> BXH (CSV)
            </button>
            <button type="button" className="btn-secondary" onClick={() => handleExport('details')} title="Tải chi tiết dự đoán tất cả trận">
              <Download size={14} /> Chi Tiết (CSV)
            </button>
          </div>
        )}
      </div>

      {exportError && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{exportError}</span>
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          Đang tải dữ liệu tổng hợp...
        </div>
      ) : (
        <>
          {/* Sub-navigation tabs */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
            <button
              type="button"
              className={`btn-secondary ${viewMode === 'match' ? 'active' : ''}`}
              style={{
                flex: 1,
                justifyContent: 'center',
                background: viewMode === 'match' ? 'var(--color-primary)' : 'rgba(255,255,255,0.02)',
                color: viewMode === 'match' ? 'var(--color-text-dark)' : 'var(--color-text-main)',
                borderColor: viewMode === 'match' ? 'var(--color-primary)' : 'var(--border-color)',
                boxShadow: viewMode === 'match' ? 'var(--glow-green)' : 'none'
              }}
              onClick={() => setViewMode('match')}
            >
              <Trophy size={16} style={{ marginRight: '6px' }} /> Xem theo Trận Đấu
            </button>
            <button
              type="button"
              className={`btn-secondary ${viewMode === 'user' ? 'active' : ''}`}
              style={{
                flex: 1,
                justifyContent: 'center',
                background: viewMode === 'user' ? 'var(--color-primary)' : 'rgba(255,255,255,0.02)',
                color: viewMode === 'user' ? 'var(--color-text-dark)' : 'var(--color-text-main)',
                borderColor: viewMode === 'user' ? 'var(--color-primary)' : 'var(--border-color)',
                boxShadow: viewMode === 'user' ? 'var(--glow-green)' : 'none'
              }}
              onClick={() => setViewMode('user')}
            >
              <Users size={16} style={{ marginRight: '6px' }} /> Xem theo Thành Viên
            </button>
          </div>

          {/* VIEW MODE: BY MATCH */}
          {viewMode === 'match' && selectedMatch && (
            <div>
              {/* Selector */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Chọn trận đấu cần xem:</label>
                <select
                  className="form-input"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                  value={selectedMatchId}
                  onChange={(e) => setSelectedMatchId(e.target.value)}
                >
                  {matches.map(m => (
                    <option key={m.id} value={m.id}>
                      {m.homeFlag} {m.homeTeam} vs {m.awayFlag} {m.awayTeam} ({m.group ? `Bảng ${m.group}` : 'Vòng bảng'})
                    </option>
                  ))}
                </select>
              </div>

              {/* Match details card */}
              <div className="glass-card" style={{ marginBottom: '24px', background: 'linear-gradient(135deg, rgba(13, 35, 26, 0.95) 0%, rgba(6, 19, 13, 0.98) 100%)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: 'var(--color-text-muted)', borderBottom: '1px dashed rgba(16, 185, 129, 0.1)', paddingBottom: '10px', marginBottom: '16px' }}>
                  <span>{selectedMatch.group ? `BẢNG ${selectedMatch.group}` : 'VÒNG BẢNG'}</span>
                  <span>{formatDate(selectedMatch.matchTime)}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div style={{ width: '40%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <FlagIcon flag={selectedMatch.homeFlag} style={{ width: '36px', height: '24px', marginBottom: '8px', marginRight: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{selectedMatch.homeTeam}</span>
                  </div>
                  <div style={{ width: '20%', textAlign: 'center', fontSize: '1.4rem', fontWeight: 800, color: 'var(--color-secondary)' }}>
                    {selectedMatch.status === 'pending' ? 'VS' : `${selectedMatch.homeScore} - ${selectedMatch.awayScore}`}
                  </div>
                  <div style={{ width: '40%', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <FlagIcon flag={selectedMatch.awayFlag} style={{ width: '36px', height: '24px', marginBottom: '8px', marginRight: 0 }} />
                    <span style={{ fontWeight: 600, fontSize: '1rem' }}>{selectedMatch.awayTeam}</span>
                  </div>
                </div>

                <div className="handicap-banner" style={{ marginBottom: 0, padding: '10px' }}>
                  Kèo Handicap: <span className="handicap-highlight">{getHandicapText(selectedMatch.handicap, selectedMatch.homeTeam, selectedMatch.awayTeam)}</span>
                  {selectedMatch.status !== 'pending' && (
                    <span style={{ marginLeft: '12px', fontSize: '0.75rem', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px', color: 'var(--color-text-muted)' }}>
                      Trạng thái: {selectedMatch.status === 'finished' ? 'Đã kết thúc' : 'Đang diễn ra'}
                    </span>
                  )}
                </div>
              </div>

              {/* Predictions table for selected match */}
              <div className="leaderboard-table-container">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Thành Viên</th>
                      <th style={{ textAlign: 'center', width: '200px' }}>Lựa Chọn Kèo Chấp</th>
                      <th style={{ textAlign: 'center', width: '120px' }}>Điểm Nhận Được</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map(user => {
                      const pred = predictions.find(p => p.userId === user.id && p.matchId === selectedMatch.id);
                      const hasPred = !!pred;
                      const isHidden = pred && pred.predictedHandicapWinner === 'hidden';

                      let choiceText = <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Chưa dự đoán</span>;
                      let pointsText = '-';

                      if (hasPred) {
                        if (isHidden) {
                          choiceText = (
                            <span style={{ color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Lock size={12} /> Đang ẩn (Chờ khóa kèo)
                            </span>
                          );
                        } else {
                          const winnerSide = pred.predictedHandicapWinner;
                          const chosenFlag = winnerSide === 'home' ? selectedMatch.homeFlag : selectedMatch.awayFlag;
                          const chosenName = winnerSide === 'home' ? selectedMatch.homeTeam : selectedMatch.awayTeam;

                          choiceText = (
                            <span style={{ fontWeight: 600, color: 'var(--color-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <FlagIcon flag={chosenFlag} /> {chosenName}
                            </span>
                          );
                        }

                        if (selectedMatch.status === 'finished') {
                          pointsText = `${pred.pointsTotal}đ`;
                        } else {
                          pointsText = '0đ';
                        }
                      }

                      return (
                        <tr key={user.id}>
                          <td style={{ fontWeight: 600 }}>{user.fullName || user.username}</td>
                          <td style={{ textAlign: 'center' }}>{choiceText}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: pointsText.startsWith('1') ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{pointsText}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* VIEW MODE: BY MEMBER */}
          {viewMode === 'user' && selectedUser && (
            <div>
              {/* Selector */}
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label">Chọn thành viên cần xem:</label>
                <select
                  className="form-input"
                  style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)' }}
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                >
                  {users.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.fullName || u.username} ({u.username})
                    </option>
                  ))}
                </select>
              </div>

              {/* Predictions table for selected user */}
              <div className="leaderboard-table-container">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Trận Đấu</th>
                      <th className="hide-mobile" style={{ width: '180px' }}>Tỷ Lệ Handicap</th>
                      <th style={{ textAlign: 'center', width: '180px' }}>Lựa Chọn Của Thành Viên</th>
                      <th style={{ textAlign: 'center', width: '100px' }}>Điểm</th>
                    </tr>
                  </thead>
                  <tbody>
                    {matches.map(match => {
                      const pred = predictions.find(p => p.userId === selectedUser.id && p.matchId === match.id);
                      const hasPred = !!pred;
                      const isHidden = pred && pred.predictedHandicapWinner === 'hidden';

                      let choiceText = <span style={{ color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Chưa dự đoán</span>;
                      let pointsText = '-';

                      if (hasPred) {
                        if (isHidden) {
                          choiceText = (
                            <span style={{ color: 'var(--color-text-muted)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <EyeOff size={12} /> Đang ẩn (Chờ khóa)
                            </span>
                          );
                        } else {
                          const winnerSide = pred.predictedHandicapWinner;
                          const chosenFlag = winnerSide === 'home' ? match.homeFlag : match.awayFlag;
                          const chosenName = winnerSide === 'home' ? match.homeTeam : match.awayTeam;

                          choiceText = (
                            <span style={{ fontWeight: 600, color: 'var(--color-secondary)', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <FlagIcon flag={chosenFlag} /> {chosenName}
                            </span>
                          );
                        }

                        if (match.status === 'finished') {
                          pointsText = `${pred.pointsTotal}đ`;
                        } else {
                          pointsText = '0đ';
                        }
                      }

                      return (
                        <tr key={match.id}>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{match.id.replace('match_', '#')}</span>
                              <span style={{ fontWeight: 600 }}>{match.homeTeam} vs {match.awayTeam}</span>
                              {match.status !== 'pending' && (
                                <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: 'bold' }}>
                                  ({match.homeScore} - {match.awayScore})
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="hide-mobile" style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>
                            {getHandicapText(match.handicap, match.homeTeam, match.awayTeam)}
                          </td>
                          <td style={{ textAlign: 'center' }}>{choiceText}</td>
                          <td style={{ textAlign: 'center', fontWeight: 'bold', color: pointsText.startsWith('1') ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>{pointsText}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
