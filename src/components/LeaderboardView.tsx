import React, { useState, useEffect } from 'react';
import { Award, Search } from 'lucide-react';

interface LeaderboardViewProps {
  onRefreshTrigger?: number;
}

export const LeaderboardView: React.FC<LeaderboardViewProps> = ({ onRefreshTrigger }) => {
  const [players, setPlayers] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rankingMode, setRankingMode] = useState<'du' | 'nhot'>('du');

  const fetchLeaderboard = async () => {
    try {
      const response = await fetch('/api/leaderboard');
      if (!response.ok) {
        throw new Error('Không thể tải bảng xếp hạng');
      }
      const data = await response.json();
      setPlayers(data);
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [onRefreshTrigger]);

  const filteredPlayers = players.filter(player => 
    (player.fullName || player.username).toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Sort list for Thánh Dự (Đoán đúng nhiều)
  const thanhDuList = [...players].sort((a, b) => {
    if (b.correctPredictions !== a.correctPredictions) {
      return b.correctPredictions - a.correctPredictions;
    }
    const aNhot = a.incorrectPredictions + a.unpredictedMatches;
    const bNhot = b.incorrectPredictions + b.unpredictedMatches;
    if (aNhot !== bNhot) {
      return aNhot - bNhot; // Ít nhọ hơn xếp trên
    }
    return (a.fullName || a.username).localeCompare(b.fullName || b.username);
  });

  // Sort list for Thánh Nhọ (Đoán sai + Không đoán nhiều)
  const thanhNhotList = [...players].sort((a, b) => {
    const aNhot = a.incorrectPredictions + a.unpredictedMatches;
    const bNhot = b.incorrectPredictions + b.unpredictedMatches;
    if (bNhot !== aNhot) {
      return bNhot - aNhot; // Nhọ nhiều hơn xếp trên
    }
    if (a.correctPredictions !== b.correctPredictions) {
      return a.correctPredictions - b.correctPredictions; // Ít đúng hơn xếp trên
    }
    return (a.fullName || a.username).localeCompare(b.fullName || b.username);
  });

  const topThreeDu = thanhDuList.slice(0, 3);
  const topThreeNhot = thanhNhotList.slice(0, 3);

  // Global sorted list by selected mode for ranking calculation
  const globalDuSorted = [...players].sort((a, b) => {
    if (b.correctPredictions !== a.correctPredictions) return b.correctPredictions - a.correctPredictions;
    const aNhot = a.incorrectPredictions + a.unpredictedMatches;
    const bNhot = b.incorrectPredictions + b.unpredictedMatches;
    if (aNhot !== bNhot) return aNhot - bNhot;
    return (a.fullName || a.username).localeCompare(b.fullName || b.username);
  });

  const globalNhotSorted = [...players].sort((a, b) => {
    const aNhot = a.incorrectPredictions + a.unpredictedMatches;
    const bNhot = b.incorrectPredictions + b.unpredictedMatches;
    if (bNhot !== aNhot) return bNhot - aNhot;
    if (a.correctPredictions !== b.correctPredictions) return a.correctPredictions - b.correctPredictions;
    return (a.fullName || a.username).localeCompare(b.fullName || b.username);
  });

  const getGlobalRank = (player: any) => {
    if (rankingMode === 'du') {
      return globalDuSorted.findIndex(p => p.userId === player.userId) + 1;
    } else {
      return globalNhotSorted.findIndex(p => p.userId === player.userId) + 1;
    }
  };

  const sortedFilteredPlayers = [...filteredPlayers].sort((a, b) => {
    if (rankingMode === 'du') {
      if (b.correctPredictions !== a.correctPredictions) {
        return b.correctPredictions - a.correctPredictions;
      }
      const aNhot = a.incorrectPredictions + a.unpredictedMatches;
      const bNhot = b.incorrectPredictions + b.unpredictedMatches;
      if (aNhot !== bNhot) {
        return aNhot - bNhot;
      }
      return (a.fullName || a.username).localeCompare(b.fullName || b.username);
    } else {
      const aNhot = a.incorrectPredictions + a.unpredictedMatches;
      const bNhot = b.incorrectPredictions + b.unpredictedMatches;
      if (bNhot !== aNhot) {
        return bNhot - aNhot;
      }
      if (a.correctPredictions !== b.correctPredictions) {
        return a.correctPredictions - b.correctPredictions;
      }
      return (a.fullName || a.username).localeCompare(b.fullName || b.username);
    }
  });

  const getAvatarInitials = (name: string) => {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length > 1) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Award style={{ color: 'var(--color-secondary)' }} /> Bảng Xếp Hạng Đồng Nghiệp
      </h2>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          Đang tải dữ liệu bảng xếp hạng...
        </div>
      ) : error ? (
        <div className="alert alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      ) : (
        <>
          {/* Dual Podiums for Thánh Dự and Thánh Nhọ */}
          <div className="podiums-wrapper">
            {/* THÁNH DỰ */}
            <div className="glass-card" style={{ padding: '24px 16px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(16, 185, 129, 0.15)' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '5rem', opacity: 0.03, pointerEvents: 'none' }}>🏆</div>
              <h3 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: '20px', color: 'var(--color-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1.1rem' }}>
                🏆 THÁNH DỰ <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>(Đoán Đúng Nhiều)</span>
              </h3>
              
              {topThreeDu.length > 0 ? (
                <div className="podium-container" style={{ marginBottom: 0, paddingTop: '10px' }}>
                  {/* Top 2 */}
                  {topThreeDu[1] && (
                    <div className="podium-card second">
                      <span className="podium-rank">2</span>
                      <div className="podium-avatar">
                        {getAvatarInitials(topThreeDu[1].fullName || topThreeDu[1].username)}
                      </div>
                      <div className="podium-name" title={topThreeDu[1].fullName || topThreeDu[1].username}>
                        {topThreeDu[1].fullName || topThreeDu[1].username}
                      </div>
                      <div className="podium-pts">{topThreeDu[1].correctPredictions}</div>
                      <div className="podium-pts-lbl">Trận Đúng</div>
                    </div>
                  )}

                  {/* Top 1 */}
                  {topThreeDu[0] && (
                    <div className="podium-card first">
                      <span className="podium-rank">👑</span>
                      <div className="podium-avatar">
                        {getAvatarInitials(topThreeDu[0].fullName || topThreeDu[0].username)}
                      </div>
                      <div className="podium-name" title={topThreeDu[0].fullName || topThreeDu[0].username}>
                        {topThreeDu[0].fullName || topThreeDu[0].username}
                      </div>
                      <div className="podium-pts">{topThreeDu[0].correctPredictions}</div>
                      <div className="podium-pts-lbl">Trận Đúng</div>
                    </div>
                  )}

                  {/* Top 3 */}
                  {topThreeDu[2] && (
                    <div className="podium-card third">
                      <span className="podium-rank">3</span>
                      <div className="podium-avatar">
                        {getAvatarInitials(topThreeDu[2].fullName || topThreeDu[2].username)}
                      </div>
                      <div className="podium-name" title={topThreeDu[2].fullName || topThreeDu[2].username}>
                        {topThreeDu[2].fullName || topThreeDu[2].username}
                      </div>
                      <div className="podium-pts">{topThreeDu[2].correctPredictions}</div>
                      <div className="podium-pts-lbl">Trận Đúng</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px' }}>Chưa có dữ liệu</div>
              )}
            </div>

            {/* THÁNH NHỌ */}
            <div className="glass-card" style={{ padding: '24px 16px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(239, 68, 68, 0.15)' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', fontSize: '5rem', opacity: 0.03, pointerEvents: 'none' }}>🤡</div>
              <h3 style={{ fontFamily: 'var(--font-display)', textAlign: 'center', marginBottom: '20px', color: 'var(--color-danger)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', fontSize: '1.1rem' }}>
                🤡 THÁNH NHỌ <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>(Đoán Sai + Không Đoán)</span>
              </h3>
              
              {topThreeNhot.length > 0 ? (
                <div className="podium-container" style={{ marginBottom: 0, paddingTop: '10px' }}>
                  {/* Top 2 */}
                  {topThreeNhot[1] && (
                    <div className="podium-card second" style={{ border: '1px solid rgba(239, 68, 68, 0.3)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.08) 0%, rgba(239, 68, 68, 0.01) 100%)' }}>
                      <span className="podium-rank" style={{ borderColor: 'rgba(239, 68, 68, 0.5)', color: 'rgba(239, 68, 68, 0.8)' }}>2</span>
                      <div className="podium-avatar" style={{ background: 'linear-gradient(135deg, #ef4444, #b91c1c)', borderColor: 'rgba(239, 68, 68, 0.4)' }}>
                        {getAvatarInitials(topThreeNhot[1].fullName || topThreeNhot[1].username)}
                      </div>
                      <div className="podium-name" title={topThreeNhot[1].fullName || topThreeNhot[1].username}>
                        {topThreeNhot[1].fullName || topThreeNhot[1].username}
                      </div>
                      <div className="podium-pts" style={{ color: 'var(--color-danger)' }}>
                        {topThreeNhot[1].incorrectPredictions + topThreeNhot[1].unpredictedMatches}
                      </div>
                      <div className="podium-pts-lbl">Tổng Nhọ</div>
                    </div>
                  )}

                  {/* Top 1 */}
                  {topThreeNhot[0] && (
                    <div className="podium-card first" style={{ border: '1px solid var(--color-danger)', boxShadow: '0 0 15px rgba(239, 68, 68, 0.25)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.15) 0%, rgba(239, 68, 68, 0.02) 100%)' }}>
                      <span className="podium-rank" style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}>💀</span>
                      <div className="podium-avatar" style={{ background: 'linear-gradient(135deg, #f87171, #991b1b)', borderColor: 'var(--color-danger)', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}>
                        {getAvatarInitials(topThreeNhot[0].fullName || topThreeNhot[0].username)}
                      </div>
                      <div className="podium-name" title={topThreeNhot[0].fullName || topThreeNhot[0].username}>
                        {topThreeNhot[0].fullName || topThreeNhot[0].username}
                      </div>
                      <div className="podium-pts" style={{ color: 'var(--color-danger)' }}>
                        {topThreeNhot[0].incorrectPredictions + topThreeNhot[0].unpredictedMatches}
                      </div>
                      <div className="podium-pts-lbl">Tổng Nhọ</div>
                    </div>
                  )}

                  {/* Top 3 */}
                  {topThreeNhot[2] && (
                    <div className="podium-card third" style={{ border: '1px solid rgba(239, 68, 68, 0.2)', background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.01) 100%)' }}>
                      <span className="podium-rank" style={{ borderColor: 'rgba(239, 68, 68, 0.4)', color: 'rgba(239, 68, 68, 0.7)' }}>3</span>
                      <div className="podium-avatar" style={{ background: 'linear-gradient(135deg, #dc2626, #7f1d1d)', borderColor: 'rgba(239, 68, 68, 0.3)' }}>
                        {getAvatarInitials(topThreeNhot[2].fullName || topThreeNhot[2].username)}
                      </div>
                      <div className="podium-name" title={topThreeNhot[2].fullName || topThreeNhot[2].username}>
                        {topThreeNhot[2].fullName || topThreeNhot[2].username}
                      </div>
                      <div className="podium-pts" style={{ color: 'var(--color-danger)' }}>
                        {topThreeNhot[2].incorrectPredictions + topThreeNhot[2].unpredictedMatches}
                      </div>
                      <div className="podium-pts-lbl">Tổng Nhọ</div>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '20px' }}>Chưa có dữ liệu</div>
              )}
            </div>
          </div>

          {/* Table Controls (Tab mode toggle & Search input) */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', background: 'rgba(0,0,0,0.2)', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
              <button
                onClick={() => setRankingMode('du')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: rankingMode === 'du' ? 'var(--color-primary)' : 'transparent',
                  color: rankingMode === 'du' ? '#06130d' : 'var(--color-text-muted)',
                  fontWeight: '700',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.85rem'
                }}
              >
                🏆 Bảng Thánh Dự
              </button>
              <button
                onClick={() => setRankingMode('nhot')}
                style={{
                  padding: '8px 16px',
                  border: 'none',
                  background: rankingMode === 'nhot' ? 'var(--color-danger)' : 'transparent',
                  color: rankingMode === 'nhot' ? 'white' : 'var(--color-text-muted)',
                  fontWeight: '700',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  fontSize: '0.85rem'
                }}
              >
                🤡 Bảng Thánh Nhọ
              </button>
            </div>

            <div className="search-input-wrapper" style={{ margin: 0, minWidth: '240px' }}>
              <Search size={16} className="search-icon-svg" />
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm đồng nghiệp..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Detailed Leaderboard Table */}
          <div className="leaderboard-table-container">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th style={{ width: '60px' }}>Hạng</th>
                  <th>Họ và Tên</th>
                  <th style={{ textAlign: 'center', width: '90px', background: rankingMode === 'du' ? 'rgba(16, 185, 129, 0.08)' : 'transparent', color: rankingMode === 'du' ? 'var(--color-secondary)' : 'inherit' }} title="Tổng số trận dự đoán chính xác (Thánh Dự)">Đúng</th>
                  <th style={{ textAlign: 'center', width: '100px', background: rankingMode === 'nhot' ? 'rgba(239, 68, 68, 0.08)' : 'transparent', color: rankingMode === 'nhot' ? 'var(--color-danger)' : 'inherit' }} title="Tổng số trận đoán sai + không dự đoán (Thánh Nhọ)">Nhọ (Sai+Ẩn)</th>
                  <th className="hide-mobile" style={{ textAlign: 'center', width: '110px' }} title="Tổng số trận đã dự đoán">Tổng Đoán</th>
                  <th className="hide-mobile" style={{ textAlign: 'center', width: '100px' }} title="Số trận dự đoán sai">Đoán Sai</th>
                  <th className="hide-mobile" style={{ textAlign: 'center', width: '110px' }} title="Số trận không dự đoán (trận đã kết thúc)">Không Đoán</th>
                </tr>
              </thead>
              <tbody>
                {sortedFilteredPlayers.length > 0 ? (
                  sortedFilteredPlayers.map((player) => {
                    const originalRank = getGlobalRank(player);
                    const isTop3 = originalRank <= 3;
                    const nhotScore = player.incorrectPredictions + player.unpredictedMatches;
                    return (
                      <tr key={player.userId}>
                        <td className={`rank-cell ${isTop3 ? 'top-3' : ''}`} style={{ fontWeight: 'bold' }}>
                          {rankingMode === 'du' ? (
                            originalRank === 1 ? '🥇' : originalRank === 2 ? '🥈' : originalRank === 3 ? '🥉' : `#${originalRank}`
                          ) : (
                            originalRank === 1 ? '💀' : originalRank === 2 ? '🤡' : originalRank === 3 ? '👎' : `#${originalRank}`
                          )}
                        </td>
                        <td className="player-name-cell">
                          <div className="player-avatar-small">
                            {getAvatarInitials(player.fullName || player.username)}
                          </div>
                          <span>
                            {player.fullName || player.username} {player.isAdmin && <span style={{ color: 'var(--color-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>(Admin)</span>}
                          </span>
                        </td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--color-primary)', background: rankingMode === 'du' ? 'rgba(16, 185, 129, 0.03)' : 'transparent' }}>{player.correctPredictions}</td>
                        <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--color-danger)', background: rankingMode === 'nhot' ? 'rgba(239, 68, 68, 0.03)' : 'transparent' }}>{nhotScore}</td>
                        <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{player.totalPredictions}</td>
                        <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--color-danger)' }}>{player.incorrectPredictions}</td>
                        <td className="hide-mobile" style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{player.unpredictedMatches}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                      Không tìm thấy đồng nghiệp phù hợp.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

