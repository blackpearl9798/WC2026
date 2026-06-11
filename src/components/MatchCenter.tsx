import React, { useState, useEffect } from 'react';
import { Calendar, Trophy, Lock, Unlock, Users, ChevronDown, ChevronUp, Clock } from 'lucide-react';
import { FlagIcon } from './FlagIcon';

const TEAM_RATINGS: { [key: string]: number } = {
  'Algeria': 6.5, 'Argentina': 10.0, 'Úc': 6.5, 'Áo': 7.5, 'Bỉ': 8.5,
  'Bosnia & Her.': 6.0, 'Brazil': 9.5, 'Canada': 6.5, 'Cape Verde': 5.5,
  'Colombia': 8.0, 'Croatia': 8.5, 'Curaçao': 4.5, 'CH Séc': 7.0,
  'CHDC Congo': 5.5, 'Ecuador': 7.0, 'Ai Cập': 6.5, 'Anh': 9.5,
  'Pháp': 10.0, 'Đức': 8.5, 'Ghana': 6.0, 'Haiti': 4.5, 'Iran': 7.0,
  'Iraq': 5.5, 'Bờ Biển Ngà': 6.5, 'Nhật Bản': 8.0, 'Jordan': 5.5,
  'Mexico': 6.5, 'Ma-rốc': 8.0, 'Hà Lan': 9.0, 'New Zealand': 4.0,
  'Na Uy': 7.0, 'Panama': 5.0, 'Paraguay': 6.5, 'Bồ Đào Nha': 9.0,
  'Qatar': 5.0, 'Ả Rập Xê Út': 6.0, 'Scotland': 6.5, 'Senegal': 7.5,
  'Nam Phi': 5.5, 'Hàn Quốc': 7.5, 'Tây Ban Nha': 9.5, 'Thụy Điển': 7.5,
  'Thụy Sĩ': 7.5, 'Tunisia': 6.5, 'Thổ Nhĩ Kỳ': 7.0, 'Mỹ': 7.5,
  'Uruguay': 8.5, 'Uzbekistan': 6.0
};

const seededRandom = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(31, h) + seed.charCodeAt(i) | 0;
  }
  return () => {
    let t = h += 0x6D2B79F5;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const getTeamForm = (teamName: string): ('W' | 'D' | 'L')[] => {
  const rating = TEAM_RATINGS[teamName] || 6.0;
  const rng = seededRandom(teamName + "form2026_v2");
  const form: ('W' | 'D' | 'L')[] = [];
  
  for (let i = 0; i < 5; i++) {
    const val = rng();
    const winProb = 0.1 + (rating - 4) * 0.1; // 0.1 to 0.7
    const drawProb = 0.35 - (rating - 7) * 0.03; // 0.2 to 0.4
    
    if (val < winProb) {
      form.push('W');
    } else if (val < winProb + drawProb) {
      form.push('D');
    } else {
      form.push('L');
    }
  }
  return form;
};

const getH2HStats = (home: string, away: string) => {
  const homeRating = TEAM_RATINGS[home] || 6.0;
  const awayRating = TEAM_RATINGS[away] || 6.0;
  
  const seed = [home, away].sort().join("-") + "h2h2026_v2";
  const rng = seededRandom(seed);
  
  const totalMatches = 5;
  let homeWins = 0;
  let awayWins = 0;
  let draws = 0;
  
  const diff = homeRating - awayRating;
  const homeWinProb = 0.35 + diff * 0.08;
  const drawProb = 0.3 - Math.abs(diff) * 0.03;
  
  for (let i = 0; i < totalMatches; i++) {
    const val = rng();
    if (val < homeWinProb) {
      homeWins++;
    } else if (val < homeWinProb + drawProb) {
      draws++;
    } else {
      awayWins++;
    }
  }
  
  return { homeWins, awayWins, draws };
};

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

  const homeForm = getTeamForm(match.homeTeam);
  const awayForm = getTeamForm(match.awayTeam);
  const h2h = getH2HStats(match.homeTeam, match.awayTeam);

  return (
    <div className="featured-hero-card">
      <div className="hero-glow-overlay"></div>
      
      <div className="hero-header-badge">
        🔥 TRẬN CẦU TÂM ĐIỂM TIẾP THEO
      </div>

      <div className="hero-teams-row">
        <div className="hero-team-display">
          <FlagIcon flag={match.homeFlag} style={{ width: '36px', height: '24px', marginRight: '0' }} />
          <span className="hero-team-name">{match.homeTeam}</span>
        </div>

        <div className="hero-vs-center">
          <span className="hero-vs-label">VS</span>
        </div>

        <div className="hero-team-display">
          <FlagIcon flag={match.awayFlag} style={{ width: '36px', height: '24px', marginRight: '0' }} />
          <span className="hero-team-name">{match.awayTeam}</span>
        </div>
      </div>

      {/* Seeded stats summary for Hero Card */}
      <div className="hero-stats-row" style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '10px 16px',
        background: 'rgba(0, 0, 0, 0.2)',
        borderRadius: '8px',
        marginTop: '16px',
        marginBottom: '16px',
        fontSize: '0.8rem',
        border: '1px solid rgba(255, 255, 255, 0.05)',
        gap: '12px',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>Phong độ {match.homeTeam}:</span>
          <div style={{ display: 'flex', gap: '4px' }}>
            {homeForm.map((res, i) => (
              <span key={i} style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                color: '#fff',
                background: res === 'W' ? 'var(--color-primary, #10b981)' : res === 'D' ? 'var(--color-secondary, #f59e0b)' : 'var(--color-danger, #ef4444)',
                boxShadow: '0 0 5px ' + (res === 'W' ? 'rgba(16, 185, 129, 0.3)' : res === 'D' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)')
              }}>{res}</span>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: '0.75rem', color: 'rgba(255,255,255,0.7)', background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '6px', fontWeight: 600 }}>
          Đối đầu: <span style={{ color: 'var(--color-secondary)', fontWeight: 800 }}>{h2h.homeWins} T - {h2h.draws} H - {h2h.awayWins} B</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ display: 'flex', gap: '4px' }}>
            {awayForm.map((res, i) => (
              <span key={i} style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '18px',
                height: '18px',
                borderRadius: '50%',
                fontSize: '0.7rem',
                fontWeight: 'bold',
                color: '#fff',
                background: res === 'W' ? 'var(--color-primary, #10b981)' : res === 'D' ? 'var(--color-secondary, #f59e0b)' : 'var(--color-danger, #ef4444)',
                boxShadow: '0 0 5px ' + (res === 'W' ? 'rgba(16, 185, 129, 0.3)' : res === 'D' ? 'rgba(245, 158, 11, 0.3)' : 'rgba(239, 68, 68, 0.3)')
              }}>{res}</span>
            ))}
          </div>
          <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.75rem' }}>Phong độ {match.awayTeam}</span>
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

      {/* Prediction Ratio Bar */}
      {(() => {
        const stats = match.predictionStats || { homeCount: 0, awayCount: 0, total: 0 };
        const total = stats.total;
        const homePercent = total > 0 ? Math.round((stats.homeCount / total) * 100) : 50;
        const awayPercent = total > 0 ? Math.round((stats.awayCount / total) * 100) : 50;
        return (
          <div className="prediction-ratio-container" style={{ margin: '14px auto', maxWidth: '440px', width: '100%' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '6px', fontWeight: 600 }}>
              <span style={{ color: homePercent >= awayPercent ? 'var(--color-primary)' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <FlagIcon flag={match.homeFlag} style={{ width: '16px', height: '10px' }} /> {match.homeTeam}: {homePercent}%
              </span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem', fontWeight: 'normal' }}>
                {total > 0 ? `Đã có ${total} người dự đoán` : 'Chưa có dự đoán nào'}
              </span>
              <span style={{ color: awayPercent >= homePercent ? 'var(--color-secondary)' : 'inherit', display: 'flex', alignItems: 'center', gap: '4px' }}>
                {awayPercent}% : {match.awayTeam} <FlagIcon flag={match.awayFlag} style={{ width: '16px', height: '10px' }} />
              </span>
            </div>
            <div style={{ 
              height: '6px', 
              width: '100%', 
              background: 'rgba(0,0,0,0.4)', 
              borderRadius: '3px', 
              overflow: 'hidden', 
              display: 'flex',
              border: '1px solid rgba(255,255,255,0.03)'
            }}>
              <div style={{ 
                width: `${homePercent}%`, 
                background: 'linear-gradient(90deg, #10b981, #059669)', 
                transition: 'width 0.5s ease-in-out'
              }} />
              <div style={{ 
                width: `${awayPercent}%`, 
                background: 'linear-gradient(90deg, #fbbf24, #d97706)', 
                transition: 'width 0.5s ease-in-out'
              }} />
            </div>
          </div>
        );
      })()}

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
            <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <FlagIcon flag={match.homeFlag} />
              {getHandicapButtonLabel(match, 'home')}
            </span>
          </button>
          <button
            type="button"
            className={`handicap-opt-btn ${curWinner === 'away' ? 'active' : ''}`}
            onClick={() => handleHandicapChange(match.id, 'away')}
          >
            <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Sân khách</span>
            <span style={{ fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              <FlagIcon flag={match.awayFlag} />
              {getHandicapButtonLabel(match, 'away')}
            </span>
          </button>
        </div>

        {hasSavedPrediction && (
          <div style={{ textAlign: 'center', marginTop: '12px' }}>
            <span className="hero-saved-tag" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
              Đã chọn: <FlagIcon flag={myPred.predictedHandicapWinner === 'home' ? match.homeFlag : match.awayFlag} /> {myPred.predictedHandicapWinner === 'home' ? match.homeTeam : match.awayTeam}
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
    const { handicap, homeTeam, awayTeam } = match;
    const isHome = side === 'home';
    const teamName = isHome ? homeTeam : awayTeam;

    if (handicap.team === null || handicap.value === 0) {
      return `${teamName} (0)`;
    }

    if (handicap.team === side) {
      return `${teamName} (-${handicap.value})`;
    } else {
      return `${teamName} (+${handicap.value})`;
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

            const homeForm = getTeamForm(match.homeTeam);
            const awayForm = getTeamForm(match.awayTeam);
            const h2h = getH2HStats(match.homeTeam, match.awayTeam);

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
                      <FlagIcon flag={match.homeFlag} style={{ width: '28px', height: '18px', marginRight: '0' }} />
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
                      <FlagIcon flag={match.awayFlag} style={{ width: '28px', height: '18px', marginRight: '0' }} />
                      <span className="team-name" title={match.awayTeam}>{match.awayTeam}</span>
                    </div>
                  </div>

                  {/* Handicap Odds display */}
                  <div className="handicap-banner">
                    Tỷ lệ Handicap: <span className="handicap-highlight">{getHandicapText(match.handicap, match.homeTeam, match.awayTeam)}</span>
                  </div>

                  {/* Prediction Ratio Bar */}
                  {(() => {
                    const stats = match.predictionStats || { homeCount: 0, awayCount: 0, total: 0 };
                    const total = stats.total;
                    const homePercent = total > 0 ? Math.round((stats.homeCount / total) * 100) : 50;
                    const awayPercent = total > 0 ? Math.round((stats.awayCount / total) * 100) : 50;
                    return (
                      <div className="prediction-ratio-container" style={{ margin: '12px 0 10px 0' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '4px', fontWeight: 600 }}>
                          <span style={{ color: homePercent >= awayPercent ? 'var(--color-primary)' : 'inherit' }}>
                            {match.homeTeam}: {homePercent}%
                          </span>
                          <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem', fontWeight: 'normal' }}>
                            {total > 0 ? `Đã có ${total} người dự đoán` : 'Chưa có dự đoán'}
                          </span>
                          <span style={{ color: awayPercent >= homePercent ? 'var(--color-secondary)' : 'inherit' }}>
                            {awayPercent}% : {match.awayTeam}
                          </span>
                        </div>
                        <div style={{ 
                          height: '6px', 
                          width: '100%', 
                          background: 'rgba(255,255,255,0.05)', 
                          borderRadius: '3px', 
                          overflow: 'hidden', 
                          display: 'flex',
                          border: '1px solid rgba(255,255,255,0.03)'
                         }}>
                          <div style={{ 
                            width: `${homePercent}%`, 
                            background: 'linear-gradient(90deg, #10b981, #059669)', 
                            transition: 'width 0.5s ease-in-out'
                          }} />
                          <div style={{ 
                            width: `${awayPercent}%`, 
                            background: 'linear-gradient(90deg, #fbbf24, #d97706)', 
                            transition: 'width 0.5s ease-in-out'
                          }} />
                        </div>
                      </div>
                    );
                  })()}

                  {/* Seeded stats summary for Match Card */}
                  <div className="match-stats-summary" style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '6px 12px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '8px',
                    marginTop: '8px',
                    marginBottom: '12px',
                    fontSize: '0.75rem',
                    border: '1px solid rgba(255, 255, 255, 0.03)',
                    gap: '4px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>P.Độ:</span>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {homeForm.map((res, i) => (
                          <span key={i} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                            color: '#fff',
                            background: res === 'W' ? 'var(--color-primary, #10b981)' : res === 'D' ? 'var(--color-secondary, #f59e0b)' : 'var(--color-danger, #ef4444)'
                          }}>{res}</span>
                        ))}
                      </div>
                    </div>

                    <div style={{ textAlign: 'center', fontSize: '0.65rem', color: 'var(--color-text-muted)', background: 'rgba(255,255,255,0.02)', padding: '2px 6px', borderRadius: '4px' }}>
                      H2H: <span style={{ fontWeight: 'bold', color: 'var(--color-secondary)' }}>{h2h.homeWins}T - {h2h.draws}H - {h2h.awayWins}B</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <div style={{ display: 'flex', gap: '2px' }}>
                        {awayForm.map((res, i) => (
                          <span key={i} style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '14px',
                            height: '14px',
                            borderRadius: '50%',
                            fontSize: '0.6rem',
                            fontWeight: 'bold',
                            color: '#fff',
                            background: res === 'W' ? 'var(--color-primary, #10b981)' : res === 'D' ? 'var(--color-secondary, #f59e0b)' : 'var(--color-danger, #ef4444)'
                          }}>{res}</span>
                        ))}
                      </div>
                    <span style={{ color: 'var(--color-text-muted)', fontSize: '0.65rem' }}>P.Độ</span>
                  </div>
                </div>

                {/* Ticket Divider with punches */}
                <div className="match-card-divider" />

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
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                              <FlagIcon flag={match.homeFlag} />
                              {getHandicapButtonLabel(match, 'home')}
                            </span>
                          </button>
                          <button
                            type="button"
                            className={`handicap-opt-btn ${curWinner === 'away' ? 'active' : ''}`}
                            onClick={() => handleHandicapChange(match.id, 'away')}
                          >
                            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                              <FlagIcon flag={match.awayFlag} />
                              {getHandicapButtonLabel(match, 'away')}
                            </span>
                          </button>
                        </div>

                        {hasSavedPrediction && (
                          <div style={{ textAlign: 'center', marginBottom: '12px' }}>
                            <span className="hero-saved-tag" style={{ animation: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'center' }}>
                              Đã chọn: <FlagIcon flag={myPred.predictedHandicapWinner === 'home' ? match.homeFlag : match.awayFlag} /> {myPred.predictedHandicapWinner === 'home' ? match.homeTeam : match.awayTeam}
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
                              <span className="info-val" style={{ color: 'var(--color-secondary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                <FlagIcon flag={myPred.predictedHandicapWinner === 'home' ? match.homeFlag : match.awayFlag} />
                                {myPred.predictedHandicapWinner === 'home' ? match.homeTeam : match.awayTeam}
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
                                <span className="other-pred-detail" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                                  Chọn <FlagIcon flag={op.predictedHandicapWinner === 'home' ? match.homeFlag : match.awayFlag} /> {op.predictedHandicapWinner === 'home' ? match.homeTeam : match.awayTeam}
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
