import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Lock, Unlock, Users, ChevronDown, ChevronUp, Clock } from 'lucide-react';

interface MatchCenterProps {
  matches: any[];
  token: string;
  onRefresh: () => void;
}

// Subcomponent for the hero countdown match card
interface FeaturedMatchHeroProps {
  match: any;
  onRefresh: () => void;
  localPreds: any;
  handleHandicapChange: (matchId: string, winner: 'home' | 'away') => void;
  handleSave: (matchId: string, match: any) => Promise<void>;
  savingId: string | null;
  getHandicapText: (handicap: any, homeTeam: string, awayTeam: string) => string;
  getHandicapButtonLabel: (match: any, side: 'home' | 'away') => string;
  formatDate: (dateStr: string) => string;
}

const FeaturedMatchHero: React.FC<FeaturedMatchHeroProps> = ({
  match,
  onRefresh,
  localPreds,
  handleHandicapChange,
  handleSave,
  savingId,
  getHandicapText,
  getHandicapButtonLabel,
  formatDate
}) => {
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number } | null>(null);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(match.matchTime).getTime() - Date.now();
      if (difference <= 0) {
        setTimeLeft(null);
        onRefresh(); // Lock prediction once time starts
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference / (1000 * 60 * 60)) % 24);
      const minutes = Math.floor((difference / 1000 / 60) % 60);
      const seconds = Math.floor((difference / 1000) % 60);

      setTimeLeft({ days, hours, minutes, seconds });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [match.matchTime, onRefresh]);

  const myPred = match.myPrediction;
  const local = localPreds[match.id];
  const curWinner = local ? local.winner : (myPred ? myPred.predictedHandicapWinner : 'home');
  const hasSavedPrediction = !!myPred;

  return (
    <div className="featured-hero-card">
      <div className="hero-glow-overlay"></div>
      
      <div className="hero-header-badge">
        🔥 TRẬN CẦU TÂM ĐIỂM TIẾP THEO
      </div>

      <div className="hero-teams-row">
        <div className="hero-team-display">
          <span className="hero-team-flag">{match.homeFlag}</span>
          <span className="hero-team-name">{match.homeTeam}</span>
        </div>

        <div className="hero-vs-center">
          <span className="hero-vs-label">VS</span>
        </div>

        <div className="hero-team-display">
          <span className="hero-team-flag">{match.awayFlag}</span>
          <span className="hero-team-name">{match.awayTeam}</span>
        </div>
      </div>

      {/* Countdown Timer */}
      {timeLeft ? (
        <div className="countdown-container">
          <div className="countdown-segment">
            <span className="countdown-digit">{timeLeft.days.toString().padStart(2, '0')}</span>
            <span className="countdown-label">NGÀY</span>
          </div>
          <span className="countdown-colon">:</span>
          <div className="countdown-segment">
            <span className="countdown-digit">{timeLeft.hours.toString().padStart(2, '0')}</span>
            <span className="countdown-label">GIỜ</span>
          </div>
          <span className="countdown-colon">:</span>
          <div className="countdown-segment">
            <span className="countdown-digit">{timeLeft.minutes.toString().padStart(2, '0')}</span>
            <span className="countdown-label">PHÚT</span>
          </div>
          <span className="countdown-colon">:</span>
          <div className="countdown-segment">
            <span className="countdown-digit countdown-sec-neon">{timeLeft.seconds.toString().padStart(2, '0')}</span>
            <span className="countdown-label">GIÂY</span>
          </div>
        </div>
      ) : (
        <div className="countdown-locked">
          <Clock size={16} style={{ display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
          Trận đấu đã bắt đầu hoặc đang diễn ra!
        </div>
      )}

      <div className="hero-match-info-bar">
        🕒 Khai cuộc: {formatDate(match.matchTime)} | Handicap: <span style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>{getHandicapText(match.handicap, match.homeTeam, match.awayTeam)}</span>
      </div>

      {/* Prediction inputs inside Hero Card */}
      <div className="hero-prediction-box">
        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 600, textAlign: 'center' }}>
          DỰ ĐOÁN ĐỘI THẮNG KÈO HANDICAP:
        </div>
        <div className="handicap-predict-row" style={{ gap: '12px' }}>
          <button
            type="button"
            className={`handicap-opt-btn ${curWinner === 'home' ? 'active' : ''}`}
            onClick={() => handleHandicapChange(match.id, 'home')}
          >
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Sân nhà</span>
            <span style={{ fontWeight: 700 }}>{getHandicapButtonLabel(match, 'home')}</span>
          </button>
          <button
            type="button"
            className={`handicap-opt-btn ${curWinner === 'away' ? 'active' : ''}`}
            onClick={() => handleHandicapChange(match.id, 'away')}
          >
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Sân khách</span>
            <span style={{ fontWeight: 700 }}>{getHandicapButtonLabel(match, 'away')}</span>
          </button>
        </div>

        {hasSavedPrediction && (
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <span className="hero-saved-tag">
              Đã chọn: {myPred.predictedHandicapWinner === 'home' ? `${match.homeFlag} ${match.homeTeam}` : `${match.awayFlag} ${match.awayTeam}`}
            </span>
          </div>
        )}

        <button
          type="button"
          className="save-prediction-btn"
          style={{ marginTop: '20px', background: 'linear-gradient(135deg, var(--color-secondary), #d97706)', color: 'var(--color-text-dark)' }}
          disabled={savingId === match.id}
          onClick={() => handleSave(match.id, match)}
        >
          {savingId === match.id ? 'Đang gửi...' : hasSavedPrediction ? 'Cập Nhật Dự Đoán Của Bạn' : 'Gửi Dự Đoán Trận Cầu Tâm Điểm'}
        </button>
      </div>
    </div>
  );
};

export const MatchCenter: React.FC<MatchCenterProps> = ({ matches, token, onRefresh }) => {
  // Store local prediction states per match before submission
  const [localPreds, setLocalPreds] = useState<{ [matchId: string]: { winner: 'home' | 'away' } }>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);

  const handleHandicapChange = (matchId: string, winner: 'home' | 'away') => {
    setLocalPreds(prev => {
      const matchPred = prev[matchId] || { winner };
      return {
        ...prev,
        [matchId]: {
          ...matchPred,
          winner
        }
      };
    });
  };

  const handleSave = async (matchId: string, match: any) => {
    const local = localPreds[matchId];
    const winner = local?.winner || match.myPrediction?.predictedHandicapWinner || 'home';

    setSavingId(matchId);
    setMessage(null);

    try {
      const response = await fetch('/api/predictions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          matchId,
          predictedHandicapWinner: winner
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Lỗi khi lưu dự đoán');
      }

      setMessage({ type: 'success', text: `Đã lưu dự đoán cho trận ${match.homeTeam} vs ${match.awayTeam}!` });
      onRefresh();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Lỗi kết nối.' });
    } finally {
      setSavingId(null);
    }
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

  const getHandicapText = (handicap: any, homeTeam: string, awayTeam: string) => {
    const { team, value } = handicap;
    if (team === null || value === 0) {
      return 'Đồng banh (0)';
    }
    const teamName = team === 'home' ? homeTeam : awayTeam;
    return `${teamName} chấp ${value}`;
  };

  const getHandicapButtonLabel = (match: any, side: 'home' | 'away') => {
    const { handicap, homeTeam, awayTeam, homeFlag, awayFlag } = match;
    const isHome = side === 'home';
    const teamName = isHome ? homeTeam : awayTeam;
    const teamFlag = isHome ? homeFlag : awayFlag;

    if (handicap.team === null || handicap.value === 0) {
      return `${teamFlag} ${teamName} (0)`;
    }

    if (handicap.team === side) {
      return `${teamFlag} ${teamName} (-${handicap.value})`;
    } else {
      return `${teamFlag} ${teamName} (+${handicap.value})`;
    }
  };

  const toggleExpandMatch = (matchId: string) => {
    setExpandedMatchId(prev => (prev === matchId ? null : matchId));
  };

  // Find the closest upcoming match that has not started yet
  const upcomingMatches = matches
    .filter(m => m.status === 'pending' && !m.isLocked && new Date(m.matchTime).getTime() > Date.now())
    .sort((a, b) => new Date(a.matchTime).getTime() - new Date(b.matchTime).getTime());

  const featuredMatch = upcomingMatches.length > 0 ? upcomingMatches[0] : null;

  // Filter out the featured match from the grid of remaining matches
  const remainingMatches = featuredMatch 
    ? matches.filter(m => m.id !== featuredMatch.id)
    : matches;

  return (
    <div>
      {/* Featured Match Hero section */}
      {featuredMatch && (
        <div style={{ marginBottom: '32px' }}>
          <FeaturedMatchHero
            match={featuredMatch}
            onRefresh={onRefresh}
            localPreds={localPreds}
            handleHandicapChange={handleHandicapChange}
            handleSave={handleSave}
            savingId={savingId}
            getHandicapText={getHandicapText}
            getHandicapButtonLabel={getHandicapButtonLabel}
            formatDate={formatDate}
          />
        </div>
      )}

      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Trophy style={{ color: 'var(--color-primary)' }} /> Danh Sách Trận Đấu
      </h2>

      {message && (
        <div className={`alert ${message.type === 'success' ? 'alert-success' : 'alert-error'}`}>
          <span>{message.type === 'success' ? '✅' : '⚠️'}</span>
          <span>{message.text}</span>
        </div>
      )}

      {remainingMatches.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>
          Hiện chưa có trận đấu nào khác được thêm vào.
        </div>
      ) : (
        <div className="matches-grid">
          {remainingMatches.map((match) => {
            const locked = match.isLocked;
            const myPred = match.myPrediction;
            const local = localPreds[match.id];

            const curWinner = local ? local.winner : (myPred ? myPred.predictedHandicapWinner : 'home');

            const hasSavedPrediction = !!myPred;
            const isFinished = match.status === 'finished';

            return (
              <div key={match.id} className="glass-card match-card">
                <div>
                  {/* Match Header */}
                  <div className="match-header">
                    <span className="match-time">
                      <Calendar size={14} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
                      {formatDate(match.matchTime)}
                    </span>
                    
                    <span className={`match-status-badge ${match.status}`}>
                      {match.status === 'finished' ? 'Đã kết thúc' : match.status === 'live' ? 'Trực tiếp' : 'Chưa đá'}
                    </span>
                  </div>

                  {/* Score and Flag Area */}
                  <div className="match-teams-score">
                    <div className="team-display">
                      <span className="team-flag">{match.homeFlag}</span>
                      <span className="team-name" title={match.homeTeam}>{match.homeTeam}</span>
                    </div>

                    <div className="score-center">
                      {isFinished || match.status === 'live' ? (
                        <span className="actual-score-display">{match.homeScore} - {match.awayScore}</span>
                      ) : (
                        <span className="versus-label">VS</span>
                      )}
                    </div>

                    <div className="team-display">
                      <span className="team-flag">{match.awayFlag}</span>
                      <span className="team-name" title={match.awayTeam}>{match.awayTeam}</span>
                    </div>
                  </div>

                  {/* Handicap Odds display */}
                  <div className="handicap-banner">
                    Tỷ lệ Handicap: <span className="handicap-highlight">{getHandicapText(match.handicap, match.homeTeam, match.awayTeam)}</span>
                  </div>

                  {/* Prediction Form Section */}
                  <div className="prediction-section">
                    <p className="prediction-title">
                      {locked ? (
                        <span style={{ color: 'var(--color-danger)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Lock size={12} /> Dự đoán của bạn (Đã khóa)
                        </span>
                      ) : (
                        <span style={{ color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Unlock size={12} /> Nhập dự đoán của bạn
                        </span>
                      )}
                    </p>

                    {!locked ? (
                      /* Open prediction form */
                      <div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 600, textAlign: 'center' }}>
                          DỰ ĐOÁN ĐỘI THẮNG HANDICAP:
                        </div>
                        <div className="handicap-predict-row">
                          <button
                            type="button"
                            className={`handicap-opt-btn ${curWinner === 'home' ? 'active' : ''}`}
                            onClick={() => handleHandicapChange(match.id, 'home')}
                          >
                            <span>{getHandicapButtonLabel(match, 'home')}</span>
                          </button>
                          <button
                            type="button"
                            className={`handicap-opt-btn ${curWinner === 'away' ? 'active' : ''}`}
                            onClick={() => handleHandicapChange(match.id, 'away')}
                          >
                            <span>{getHandicapButtonLabel(match, 'away')}</span>
                          </button>
                        </div>

                        {hasSavedPrediction && (
                          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                            <span className="hero-saved-tag" style={{ animation: 'none' }}>
                              Đã chọn: {myPred.predictedHandicapWinner === 'home' ? `${match.homeFlag} ${match.homeTeam}` : `${match.awayFlag} ${match.awayTeam}`}
                            </span>
                          </div>
                        )}

                        <button
                          type="button"
                          className="save-prediction-btn"
                          disabled={savingId === match.id}
                          onClick={() => handleSave(match.id, match)}
                        >
                          {savingId === match.id ? 'Đang lưu...' : hasSavedPrediction ? 'Cập Nhật Dự Đoán' : 'Lưu Dự Đoán'}
                        </button>
                      </div>
                    ) : (
                      /* Locked prediction view */
                      <div className="saved-prediction-info">
                        {hasSavedPrediction ? (
                          <>
                            <div className="info-row">
                              <span className="info-label">Kèo Handicap đã chọn:</span>
                              <span className="info-val" style={{ color: 'var(--color-secondary)', fontWeight: 700 }}>
                                {myPred.predictedHandicapWinner === 'home' ? `${match.homeFlag} ${match.homeTeam}` : `${match.awayFlag} ${match.awayTeam}`}
                              </span>
                            </div>
                            
                            {isFinished && (
                              <div className="prediction-points-badge">
                                🏆 Kết quả: {myPred.pointsTotal > 0 ? `+${myPred.pointsTotal} điểm (Chính xác)` : '0 điểm (Không chính xác)'}
                              </div>
                            )}
                          </>
                        ) : (
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.9rem', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>
                            Bạn đã không tham gia dự đoán trận này.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Other users' predictions section (Only available when locked/started) */}
                {locked && (
                  <div className="other-predictions-section">
                    <button
                      type="button"
                      className="btn-secondary"
                      style={{ width: '100%', justifyContent: 'space-between', padding: '8px 12px', fontSize: '0.8rem' }}
                      onClick={() => toggleExpandMatch(match.id)}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Users size={14} /> Dự đoán của đồng nghiệp ({match.otherPredictions?.length || 0})
                      </span>
                      {expandedMatchId === match.id ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>

                    {expandedMatchId === match.id && (
                      <div style={{ marginTop: '10px' }}>
                        {match.otherPredictions && match.otherPredictions.length > 0 ? (
                          <div className="other-preds-list">
                            {match.otherPredictions.map((op: any, index: number) => (
                              <div key={index} className="other-pred-item">
                                <span className="other-pred-user">
                                  {op.username} <span className="other-pred-dept">({op.department})</span>
                                </span>
                                <span className="other-pred-detail">
                                  Chọn {op.predictedHandicapWinner === 'home' ? `${match.homeFlag} ${match.homeTeam}` : `${match.awayFlag} ${match.awayTeam}`}
                                  {isFinished && <span className="other-pred-pts"> (+{op.pointsTotal}đ)</span>}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.75rem', fontStyle: 'italic', textAlign: 'center', marginTop: '6px' }}>
                            Chưa có thành viên nào khác dự đoán.
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
