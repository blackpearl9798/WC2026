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

  // Top 3 players for the Podium
  const topThree = players.slice(0, 3);
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
        <Award style={{ color: 'var(--color-secondary)' }} /> Bảng Xếp Hạng Công Ty
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
          {/* Visual Podium for Top 3 */}
          {topThree.length > 0 && (
            <div className="podium-container">
              {/* Top 2 */}
              {topThree[1] && (
                <div className="podium-card second">
                  <span className="podium-rank">2</span>
                  <div className="podium-avatar">
                    {getAvatarInitials(topThree[1].fullName || topThree[1].username)}
                  </div>
                  <div className="podium-name" title={topThree[1].fullName || topThree[1].username}>
                    {topThree[1].fullName || topThree[1].username}
                  </div>
                  <div className="podium-pts">{topThree[1].totalPoints}</div>
                  <div className="podium-pts-lbl">Điểm</div>
                </div>
              )}

              {/* Top 1 */}
              {topThree[0] && (
                <div className="podium-card first">
                  <span className="podium-rank">👑</span>
                  <div className="podium-avatar">
                    {getAvatarInitials(topThree[0].fullName || topThree[0].username)}
                  </div>
                  <div className="podium-name" title={topThree[0].fullName || topThree[0].username}>
                    {topThree[0].fullName || topThree[0].username}
                  </div>
                  <div className="podium-pts">{topThree[0].totalPoints}</div>
                  <div className="podium-pts-lbl">Điểm</div>
                </div>
              )}

              {/* Top 3 */}
              {topThree[2] && (
                <div className="podium-card third">
                  <span className="podium-rank">3</span>
                  <div className="podium-avatar">
                    {getAvatarInitials(topThree[2].fullName || topThree[2].username)}
                  </div>
                  <div className="podium-name" title={topThree[2].fullName || topThree[2].username}>
                    {topThree[2].fullName || topThree[2].username}
                  </div>
                  <div className="podium-pts">{topThree[2].totalPoints}</div>
                  <div className="podium-pts-lbl">Điểm</div>
                </div>
              )}
            </div>
          )}

          {/* Search Bar */}
          <div className="table-actions">
            <div className="search-input-wrapper">
              <Search size={16} className="search-icon-svg" />
              <input
                type="text"
                className="search-input"
                placeholder="Tìm kiếm nhân viên..."
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
                  <th style={{ width: '80px' }}>Hạng</th>
                  <th>Họ và Tên</th>
                  <th style={{ textAlign: 'center', width: '100px' }}>Điểm</th>
                  <th style={{ textAlign: 'center', width: '150px' }} title="Số trận dự đoán thắng Handicap chính xác">Số Trận Đúng</th>
                  <th style={{ textAlign: 'center', width: '150px' }} title="Số trận dự đoán Handicap không chính xác">Số Trận Sai</th>
                  <th style={{ textAlign: 'center', width: '130px' }} title="Tổng số trận đã dự đoán">Tổng Đoán</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlayers.length > 0 ? (
                  filteredPlayers.map((player) => {
                    const originalRank = players.findIndex(p => p.userId === player.userId) + 1;
                    const isTop3 = originalRank <= 3;
                    return (
                      <tr key={player.userId}>
                        <td className={`rank-cell ${isTop3 ? 'top-3' : ''}`}>
                          {originalRank === 1 ? '🥇' : originalRank === 2 ? '🥈' : originalRank === 3 ? '🥉' : `#${originalRank}`}
                        </td>
                        <td className="player-name-cell">
                          <div className="player-avatar-small">
                            {getAvatarInitials(player.fullName || player.username)}
                          </div>
                          <span>
                            {player.fullName || player.username} {player.isAdmin && <span style={{ color: 'var(--color-secondary)', fontSize: '0.75rem', fontWeight: 600 }}>(Admin)</span>}
                          </span>
                        </td>
                        <td className="pts-cell" style={{ textAlign: 'center' }}>{player.totalPoints}</td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-primary)' }}>{player.correctPredictions}</td>
                        <td style={{ textAlign: 'center', fontWeight: '700', color: 'var(--color-danger)' }}>{player.incorrectPredictions}</td>
                        <td style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>{player.totalPredictions}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>
                      Không tìm thấy nhân viên phù hợp.
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
