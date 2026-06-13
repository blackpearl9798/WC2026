import React, { useState } from 'react';
import groupsImage from '../assets/wc2026-groups.png';
import { LayoutGrid, Trophy } from 'lucide-react';
import { FlagIcon } from './FlagIcon';

interface StandingsViewProps {
  matches: any[];
}

interface TeamStats {
  name: string;
  flag: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export const StandingsView: React.FC<StandingsViewProps> = ({ matches }) => {
  const [subView, setSubView] = useState<'standings' | 'bracket'>('standings');
  
  // 1. Group matches by Group Letter (A - L)
  const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  
  const calculateStandings = (groupLetter: string): TeamStats[] => {
    // Only filter group stage matches (e.g. m.group === groupLetter)
    const groupMatches = matches.filter(m => m.group === groupLetter);
    const teamsData: { [name: string]: TeamStats } = {};

    // Helper to initialize team stats
    const initTeam = (name: string, flag: string) => {
      if (!teamsData[name]) {
        teamsData[name] = {
          name,
          flag,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0
        };
      }
    };

    // Collect all teams in this group and compute statistics
    groupMatches.forEach(match => {
      initTeam(match.homeTeam, match.homeFlag);
      initTeam(match.awayTeam, match.awayFlag);

      if (match.status === 'finished' && match.homeScore !== null && match.awayScore !== null) {
        const home = teamsData[match.homeTeam];
        const away = teamsData[match.awayTeam];
        const hScore = match.homeScore;
        const aScore = match.awayScore;

        home.played += 1;
        away.played += 1;
        
        home.goalsFor += hScore;
        home.goalsAgainst += aScore;
        away.goalsFor += aScore;
        away.goalsAgainst += hScore;

        if (hScore > aScore) {
          home.won += 1;
          home.points += 3;
          away.lost += 1;
        } else if (hScore < aScore) {
          away.won += 1;
          away.points += 3;
          home.lost += 1;
        } else {
          home.drawn += 1;
          away.drawn += 1;
          home.points += 1;
          away.points += 1;
        }
      }
    });

    // Compute goal difference and convert map to sorted array
    return Object.values(teamsData).map(team => {
      team.goalDifference = team.goalsFor - team.goalsAgainst;
      return team;
    }).sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.goalDifference !== a.goalDifference) {
        return b.goalDifference - a.goalDifference;
      }
      if (b.goalsFor !== a.goalsFor) {
        return b.goalsFor - a.goalsFor;
      }
      return a.name.localeCompare(b.name);
    });
  };

  // Calculate standings for all groups
  const allGroupStandings = groupsList.reduce((acc, group) => {
    acc[group] = calculateStandings(group);
    return acc;
  }, {} as { [key: string]: TeamStats[] });

  // Rank 3rd place teams across all groups
  const rankedThirds = groupsList
    .map(group => allGroupStandings[group][2])
    .filter(Boolean)
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
      if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
      return a.name.localeCompare(b.name);
    });

  // Check if all group stage matches are finished
  const isGroupStageFinished = matches
    .filter(m => m.group)
    .every(m => m.status === 'finished');

  // Resolve team name and flag for bracket nodes
  const resolveTeam = (node: any) => {
    if (!isGroupStageFinished) {
      if (node.type === 'winner') {
        return { name: `Nhất Bảng ${node.group}`, flag: '🏳️', isPlaceholder: true };
      }
      if (node.type === 'runner_up') {
        return { name: `Nhì Bảng ${node.group}`, flag: '🏳️', isPlaceholder: true };
      }
      if (node.type === 'third') {
        return { name: node.label || `Hạng 3 thứ ${node.rank + 1}`, flag: '🏳️', isPlaceholder: true };
      }
    }

    if (node.type === 'winner') {
      const g = allGroupStandings[node.group];
      if (g && g[0]) return { name: g[0].name, flag: g[0].flag };
      return { name: `Nhất Bảng ${node.group}`, flag: '🏳️', isPlaceholder: true };
    }
    if (node.type === 'runner_up') {
      const g = allGroupStandings[node.group];
      if (g && g[1]) return { name: g[1].name, flag: g[1].flag };
      return { name: `Nhì Bảng ${node.group}`, flag: '🏳️', isPlaceholder: true };
    }
    if (node.type === 'third') {
      const t = rankedThirds[node.rank];
      if (t) return { name: t.name, flag: t.flag };
      return { name: node.label || `Hạng 3 thứ ${node.rank + 1}`, flag: '🏳️', isPlaceholder: true };
    }
    return { name: 'TBD', flag: '🏳️', isPlaceholder: true };
  };

  const formatVietnamTime = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      const optionsStr = date.toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
      return optionsStr.replace(',', ' -').replace(/\s+/g, ' ');
    } catch (e) {
      return dateStr;
    }
  };

  const resolvedMatches: { [key: string]: any } = {};

  // Pairings for Round of 32
  const r32Matchups = [
    { id: '74', home: { type: 'winner', group: 'E' }, away: { type: 'third', rank: 0, label: 'Hạng 3 A/B/C/D/F' } },
    { id: '77', home: { type: 'winner', group: 'I' }, away: { type: 'third', rank: 1, label: 'Hạng 3 C/D/F/G/H' } },
    { id: '73', home: { type: 'runner_up', group: 'A' }, away: { type: 'runner_up', group: 'B' } },
    { id: '75', home: { type: 'winner', group: 'F' }, away: { type: 'runner_up', group: 'C' } },

    { id: '83', home: { type: 'runner_up', group: 'K' }, away: { type: 'runner_up', group: 'L' } },
    { id: '84', home: { type: 'winner', group: 'H' }, away: { type: 'runner_up', group: 'J' } },
    { id: '81', home: { type: 'winner', group: 'D' }, away: { type: 'third', rank: 4, label: 'Hạng 3 B/E/F/I/J' } },
    { id: '82', home: { type: 'winner', group: 'G' }, away: { type: 'third', rank: 5, label: 'Hạng 3 A/E/H/I/J' } },

    { id: '76', home: { type: 'winner', group: 'C' }, away: { type: 'runner_up', group: 'F' } },
    { id: '78', home: { type: 'runner_up', group: 'E' }, away: { type: 'runner_up', group: 'I' } },
    { id: '79', home: { type: 'winner', group: 'A' }, away: { type: 'third', rank: 2, label: 'Hạng 3 C/E/F/H/I' } },
    { id: '80', home: { type: 'winner', group: 'L' }, away: { type: 'third', rank: 3, label: 'Hạng 3 E/H/I/J/K' } },

    { id: '86', home: { type: 'winner', group: 'J' }, away: { type: 'runner_up', group: 'H' } },
    { id: '88', home: { type: 'runner_up', group: 'D' }, away: { type: 'runner_up', group: 'G' } },
    { id: '85', home: { type: 'winner', group: 'B' }, away: { type: 'third', rank: 6, label: 'Hạng 3 E/F/G/I/J' } },
    { id: '87', home: { type: 'winner', group: 'K' }, away: { type: 'third', rank: 7, label: 'Hạng 3 D/E/I/J/L' } },
  ];

  // 1. Round of 32 Matches
  const r32Matches = r32Matchups.map(m => {
    const dbMatch = matches.find(dm => dm.id === `match_${m.id}`);
    const useDBHome = dbMatch && dbMatch.homeFlag && dbMatch.homeFlag !== '🏳️';
    const useDBAway = dbMatch && dbMatch.awayFlag && dbMatch.awayFlag !== '🏳️';

    const home = useDBHome 
      ? { name: dbMatch.homeTeam, flag: dbMatch.homeFlag } 
      : resolveTeam(m.home);
    const away = useDBAway 
      ? { name: dbMatch.awayTeam, flag: dbMatch.awayFlag } 
      : resolveTeam(m.away);

    const winner = dbMatch && dbMatch.status === 'finished' && dbMatch.homeScore !== null && dbMatch.awayScore !== null
      ? (dbMatch.homeScore > dbMatch.awayScore ? home : away)
      : null;

    const res = { id: m.id, home, away, dbMatch, winner };
    resolvedMatches[`match_${m.id}`] = res;
    return res;
  });

  // 2. Round of 16 Matches
  const r16Matchups = [
    { id: '89', homeMatchId: 'match_74', awayMatchId: 'match_77' },
    { id: '90', homeMatchId: 'match_73', awayMatchId: 'match_75' },
    { id: '91', homeMatchId: 'match_76', awayMatchId: 'match_78' },
    { id: '92', homeMatchId: 'match_79', awayMatchId: 'match_80' },
    { id: '93', homeMatchId: 'match_83', awayMatchId: 'match_84' },
    { id: '94', homeMatchId: 'match_81', awayMatchId: 'match_82' },
    { id: '95', homeMatchId: 'match_86', awayMatchId: 'match_88' },
    { id: '96', homeMatchId: 'match_85', awayMatchId: 'match_87' },
  ];

  const r16Matches = r16Matchups.map(m => {
    const dbMatch = matches.find(dm => dm.id === `match_${m.id}`);
    const useDBHome = dbMatch && dbMatch.homeFlag && dbMatch.homeFlag !== '🏳️';
    const useDBAway = dbMatch && dbMatch.awayFlag && dbMatch.awayFlag !== '🏳️';

    const homeParent = resolvedMatches[m.homeMatchId];
    const awayParent = resolvedMatches[m.awayMatchId];

    const home = useDBHome
      ? { name: dbMatch.homeTeam, flag: dbMatch.homeFlag }
      : (homeParent && homeParent.winner 
          ? homeParent.winner 
          : { name: `Thắng Trận ${m.homeMatchId.replace('match_', '')}`, flag: '🏳️', isPlaceholder: true });

    const away = useDBAway
      ? { name: dbMatch.awayTeam, flag: dbMatch.awayFlag }
      : (awayParent && awayParent.winner 
          ? awayParent.winner 
          : { name: `Thắng Trận ${m.awayMatchId.replace('match_', '')}`, flag: '🏳️', isPlaceholder: true });

    const winner = dbMatch && dbMatch.status === 'finished' && dbMatch.homeScore !== null && dbMatch.awayScore !== null
      ? (dbMatch.homeScore > dbMatch.awayScore ? home : away)
      : null;

    const res = { id: m.id, home, away, dbMatch, winner };
    resolvedMatches[`match_${m.id}`] = res;
    return res;
  });

  // 3. Quarterfinals (Tứ Kết)
  const qfMatchups = [
    { id: '97', homeMatchId: 'match_89', awayMatchId: 'match_90' },
    { id: '98', homeMatchId: 'match_93', awayMatchId: 'match_94' },
    { id: '99', homeMatchId: 'match_91', awayMatchId: 'match_92' },
    { id: '100', homeMatchId: 'match_95', awayMatchId: 'match_96' },
  ];

  const qfMatches = qfMatchups.map(m => {
    const dbMatch = matches.find(dm => dm.id === `match_${m.id}`);
    const useDBHome = dbMatch && dbMatch.homeFlag && dbMatch.homeFlag !== '🏳️';
    const useDBAway = dbMatch && dbMatch.awayFlag && dbMatch.awayFlag !== '🏳️';

    const homeParent = resolvedMatches[m.homeMatchId];
    const awayParent = resolvedMatches[m.awayMatchId];

    const home = useDBHome
      ? { name: dbMatch.homeTeam, flag: dbMatch.homeFlag }
      : (homeParent && homeParent.winner 
          ? homeParent.winner 
          : { name: `Thắng Trận ${m.homeMatchId.replace('match_', '')}`, flag: '🏳️', isPlaceholder: true });

    const away = useDBAway
      ? { name: dbMatch.awayTeam, flag: dbMatch.awayFlag }
      : (awayParent && awayParent.winner 
          ? awayParent.winner 
          : { name: `Thắng Trận ${m.awayMatchId.replace('match_', '')}`, flag: '🏳️', isPlaceholder: true });

    const winner = dbMatch && dbMatch.status === 'finished' && dbMatch.homeScore !== null && dbMatch.awayScore !== null
      ? (dbMatch.homeScore > dbMatch.awayScore ? home : away)
      : null;

    const res = { id: m.id, home, away, dbMatch, winner };
    resolvedMatches[`match_${m.id}`] = res;
    return res;
  });

  // 4. Semifinals (Bán Kết)
  const sfMatchups = [
    { id: '101', homeMatchId: 'match_97', awayMatchId: 'match_98' },
    { id: '102', homeMatchId: 'match_99', awayMatchId: 'match_100' },
  ];

  const sfMatches = sfMatchups.map(m => {
    const dbMatch = matches.find(dm => dm.id === `match_${m.id}`);
    const useDBHome = dbMatch && dbMatch.homeFlag && dbMatch.homeFlag !== '🏳️';
    const useDBAway = dbMatch && dbMatch.awayFlag && dbMatch.awayFlag !== '🏳️';

    const homeParent = resolvedMatches[m.homeMatchId];
    const awayParent = resolvedMatches[m.awayMatchId];

    const home = useDBHome
      ? { name: dbMatch.homeTeam, flag: dbMatch.homeFlag }
      : (homeParent && homeParent.winner 
          ? homeParent.winner 
          : { name: `Thắng Trận ${m.homeMatchId.replace('match_', '')}`, flag: '🏳️', isPlaceholder: true });

    const away = useDBAway
      ? { name: dbMatch.awayTeam, flag: dbMatch.awayFlag }
      : (awayParent && awayParent.winner 
          ? awayParent.winner 
          : { name: `Thắng Trận ${m.awayMatchId.replace('match_', '')}`, flag: '🏳️', isPlaceholder: true });

    const winner = dbMatch && dbMatch.status === 'finished' && dbMatch.homeScore !== null && dbMatch.awayScore !== null
      ? (dbMatch.homeScore > dbMatch.awayScore ? home : away)
      : null;

    const res = { id: m.id, home, away, dbMatch, winner };
    resolvedMatches[`match_${m.id}`] = res;
    return res;
  });

  // 5. Final (Chung Kết)
  const finalMatchup = { id: '104', homeMatchId: 'match_101', awayMatchId: 'match_102' };

  const dbMatchFinal = matches.find(dm => dm.id === `match_${finalMatchup.id}`);
  const useDBHomeFinal = dbMatchFinal && dbMatchFinal.homeFlag && dbMatchFinal.homeFlag !== '🏳️';
  const useDBAwayFinal = dbMatchFinal && dbMatchFinal.awayFlag && dbMatchFinal.awayFlag !== '🏳️';

  const homeParentFinal = resolvedMatches[finalMatchup.homeMatchId];
  const awayParentFinal = resolvedMatches[finalMatchup.awayMatchId];

  const homeFinal = useDBHomeFinal
    ? { name: dbMatchFinal.homeTeam, flag: dbMatchFinal.homeFlag }
    : (homeParentFinal && homeParentFinal.winner 
        ? homeParentFinal.winner 
        : { name: `Thắng Trận ${finalMatchup.homeMatchId.replace('match_', '')}`, flag: '🏳️', isPlaceholder: true });

  const awayFinal = useDBAwayFinal
    ? { name: dbMatchFinal.awayTeam, flag: dbMatchFinal.awayFlag }
    : (awayParentFinal && awayParentFinal.winner 
        ? awayParentFinal.winner 
        : { name: `Thắng Trận ${finalMatchup.awayMatchId.replace('match_', '')}`, flag: '🏳️', isPlaceholder: true });

  const champion = dbMatchFinal && dbMatchFinal.status === 'finished' && dbMatchFinal.homeScore !== null && dbMatchFinal.awayScore !== null
    ? (dbMatchFinal.homeScore > dbMatchFinal.awayScore ? homeFinal : awayFinal)
    : null;

  const finalMatch = { id: finalMatchup.id, home: homeFinal, away: awayFinal, dbMatch: dbMatchFinal, winner: champion };

  // Render a match node in the bracket
  const renderMatchCard = (m: any) => {
    const dbMatch = m.dbMatch;
    const isFinished = dbMatch && dbMatch.status === 'finished';
    const isLive = dbMatch && dbMatch.status === 'live';
    
    const homeScore = dbMatch && (isFinished || isLive) ? dbMatch.homeScore : '-';
    const awayScore = dbMatch && (isFinished || isLive) ? dbMatch.awayScore : '-';
    
    const homeWon = isFinished && dbMatch.homeScore > dbMatch.awayScore;
    const awayWon = isFinished && dbMatch.awayScore > dbMatch.homeScore;

    return (
      <div className="bracket-match" key={m.id}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: 'var(--color-text-muted)', marginBottom: '6px', borderBottom: '1px solid rgba(255,255,255,0.03)', paddingBottom: '4px' }}>
          <span>Mã #{m.id}</span>
          {dbMatch && (
            <span style={{ color: isLive ? 'var(--color-danger)' : 'var(--color-primary)', fontWeight: 'bold' }}>
              {isLive ? '• LIVE' : isFinished ? 'DONE' : 'PENDING'}
            </span>
          )}
        </div>
        
        <div className={`bracket-team-row ${homeWon ? 'winner' : ''}`}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <FlagIcon flag={m.home.flag} style={{ width: '18px', height: '12px', marginRight: 0 }} />
            <span style={{ textDecoration: m.home.isPlaceholder ? 'italic' : 'none', opacity: m.home.isPlaceholder ? 0.5 : 1 }}>
              {m.home.name}
            </span>
          </span>
          <span style={{ fontWeight: 'bold' }}>{homeScore}</span>
        </div>

        <div className={`bracket-team-row ${awayWon ? 'winner' : ''}`}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <FlagIcon flag={m.away.flag} style={{ width: '18px', height: '12px', marginRight: 0 }} />
            <span style={{ textDecoration: m.away.isPlaceholder ? 'italic' : 'none', opacity: m.away.isPlaceholder ? 0.5 : 1 }}>
              {m.away.name}
            </span>
          </span>
          <span style={{ fontWeight: 'bold' }}>{awayScore}</span>
        </div>

        {dbMatch && (
          <div style={{ marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.03)', fontSize: '0.65rem', color: 'var(--color-text-muted)', lineHeight: '1.2' }}>
            <div style={{ fontWeight: '500', color: 'var(--color-secondary)' }}>
              🕒 {formatVietnamTime(dbMatch.matchTime)}
            </div>
            <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`${dbMatch.stadium}, ${dbMatch.city}`}>
              📍 {dbMatch.stadium}, {dbMatch.city}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div>
      <div className="admin-header-row" style={{ marginBottom: '24px' }}>
        <h2 style={{ fontFamily: 'var(--font-display)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <LayoutGrid style={{ color: 'var(--color-primary)' }} /> {subView === 'standings' ? 'Bảng Xếp Hạng Vòng Bảng' : 'Sơ Đồ Thi Đấu Knockout'}
        </h2>
      </div>

      {/* Sub-view selector tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          type="button"
          className={`btn-secondary ${subView === 'standings' ? 'active' : ''}`}
          style={{
            flex: 1,
            justifyContent: 'center',
            background: subView === 'standings' ? 'var(--color-primary)' : 'rgba(255,255,255,0.02)',
            color: subView === 'standings' ? 'var(--color-text-dark)' : 'var(--color-text-main)',
            borderColor: subView === 'standings' ? 'var(--color-primary)' : 'var(--border-color)',
            boxShadow: subView === 'standings' ? 'var(--glow-green)' : 'none'
          }}
          onClick={() => setSubView('standings')}
        >
          <LayoutGrid size={16} style={{ marginRight: '6px' }} /> Bảng Xếp Hạng Vòng Bảng
        </button>
        <button
          type="button"
          className={`btn-secondary ${subView === 'bracket' ? 'active' : ''}`}
          style={{
            flex: 1,
            justifyContent: 'center',
            background: subView === 'bracket' ? 'var(--color-primary)' : 'rgba(255,255,255,0.02)',
            color: subView === 'bracket' ? 'var(--color-text-dark)' : 'var(--color-text-main)',
            borderColor: subView === 'bracket' ? 'var(--color-primary)' : 'var(--border-color)',
            boxShadow: subView === 'bracket' ? 'var(--glow-green)' : 'none'
          }}
          onClick={() => setSubView('bracket')}
        >
          <Trophy size={16} style={{ marginRight: '6px' }} /> Sơ Đồ Thi Đấu Knockout
        </button>
      </div>

      {subView === 'standings' ? (
        <>
          {/* Grid of groups tables */}
          <div className="standings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '40px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
              {groupsList.map(group => {
                const standings = allGroupStandings[group];
                if (standings.length === 0) return null;

                return (
                  <div key={group} className="glass-card" style={{ padding: '16px', marginBottom: '0' }}>
                    <h3 style={{ fontFamily: 'var(--font-display)', color: 'var(--color-primary)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px', marginBottom: '10px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>BẢNG {group}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', fontWeight: 'normal' }}>Vòng bảng</span>
                    </h3>

                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ color: 'var(--color-text-muted)', borderBottom: '1px dashed rgba(255,255,255,0.05)' }}>
                          <th style={{ padding: '4px 0', width: '20px' }}>#</th>
                          <th style={{ padding: '4px 0' }}>Đội</th>
                          <th style={{ padding: '4px 4px', textAlign: 'center', width: '20px' }} title="Trận đã đá">Tr</th>
                          <th style={{ padding: '4px 4px', textAlign: 'center', width: '20px' }} title="Thắng/Hòa/Thua">T-H-B</th>
                          <th style={{ padding: '4px 4px', textAlign: 'center', width: '30px' }} title="Hiệu số bàn thắng bại">HS</th>
                          <th style={{ padding: '4px 0', textAlign: 'center', width: '24px', fontWeight: 'bold', color: 'var(--color-secondary)' }}>Đ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {standings.map((team, idx) => {
                          const isTop2 = idx < 2; // Top 2 advance to next round
                          return (
                            <tr key={team.name} style={{ borderBottom: '1px solid rgba(255,255,255,0.02)', background: isTop2 ? 'rgba(16, 185, 129, 0.01)' : 'transparent' }}>
                              <td style={{ padding: '8px 0', fontWeight: 'bold', color: isTop2 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                                {idx + 1}
                              </td>
                              <td style={{ padding: '8px 0', fontWeight: '500' }}>
                                <FlagIcon flag={team.flag} />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', maxWidth: '100px', verticalAlign: 'middle' }} title={team.name}>
                                  {team.name}
                                </span>
                              </td>
                              <td style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--color-text-muted)' }}>{team.played}</td>
                              <td style={{ padding: '8px 4px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}>
                                {team.won}-{team.drawn}-{team.lost}
                              </td>
                              <td style={{ padding: '8px 4px', textAlign: 'center', fontWeight: '500', color: team.goalDifference > 0 ? 'var(--color-primary)' : team.goalDifference < 0 ? 'var(--color-danger)' : 'var(--color-text-muted)' }}>
                                {team.goalDifference > 0 ? `+${team.goalDifference}` : team.goalDifference}
                              </td>
                              <td style={{ padding: '8px 0', textAlign: 'center', fontWeight: 'bold', color: 'var(--color-secondary)', fontSize: '0.85rem' }}>
                                {team.points}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Official Groups Poster */}
          <div className="glass-card" style={{ textAlign: 'center', padding: '24px' }}>
            <h3 style={{ fontFamily: 'var(--font-display)', marginBottom: '16px', color: 'var(--color-secondary)' }}>
              Poster Chia Bảng FIFA World Cup 2026
            </h3>
            <img 
              src={groupsImage} 
              alt="FIFA World Cup 2026 Groups Stage Poster" 
              className="groups-poster" 
            />
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginTop: '14px', fontStyle: 'italic' }}>
              * Sơ đồ chia bảng chính thức bao gồm 48 đội bóng chia thành 12 bảng đấu (A - L)
            </p>
          </div>
        </>
      ) : (
        <>
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '10px', fontStyle: 'italic', textAlign: 'center' }}>
            ➔ Gợi ý: Nhấn giữ và vuốt sang ngang để xem toàn bộ sơ đồ nhánh đấu từ Vòng 32 đến trận Chung Kết.
          </p>
          
          {/* Scrollable bracket container */}
          <div className="bracket-container">
            {/* Round of 32 */}
            <div className="bracket-round">
              <h3 className="bracket-round-title">Vòng 32 Đội</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-around' }}>
                {r32Matches.map(m => renderMatchCard(m))}
              </div>
            </div>

            {/* Round of 16 */}
            <div className="bracket-round">
              <h3 className="bracket-round-title">Vòng 16 Đội</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-around' }}>
                {r16Matches.map(m => renderMatchCard(m))}
              </div>
            </div>

            {/* Quarterfinals */}
            <div className="bracket-round">
              <h3 className="bracket-round-title">Tứ Kết</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-around' }}>
                {qfMatches.map(m => renderMatchCard(m))}
              </div>
            </div>

            {/* Semifinals */}
            <div className="bracket-round">
              <h3 className="bracket-round-title">Bán Kết</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-around' }}>
                {sfMatches.map(m => renderMatchCard(m))}
              </div>
            </div>

            {/* Final */}
            <div className="bracket-round">
              <h3 className="bracket-round-title">Chung Kết</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', height: '100%', justifyContent: 'space-around' }}>
                {renderMatchCard(finalMatch)}
              </div>
            </div>

            {/* Champion Card */}
            <div className="bracket-round">
              <h3 className="bracket-round-title">🏆 VÔ ĐỊCH</h3>
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                {champion ? (
                  <div className="glass-card" style={{ padding: '24px 16px', textAlign: 'center', border: '2px solid var(--color-secondary)', boxShadow: 'var(--glow-gold)', width: '100%' }}>
                    <div style={{ fontSize: '2.5rem', marginBottom: '8px', filter: 'drop-shadow(0 0 10px rgba(251,191,36,0.5))' }}>👑</div>
                    <FlagIcon flag={champion.flag} style={{ width: '48px', height: '32px', marginBottom: '8px', marginRight: 0 }} />
                    <h4 style={{ color: 'var(--color-secondary)', fontSize: '1.1rem', fontWeight: 800 }}>{champion.name}</h4>
                    <p style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)', marginTop: '4px', textTransform: 'uppercase', letterSpacing: '1px' }}>Nhà Vô Địch 2026</p>
                  </div>
                ) : (
                  <div className="glass-card" style={{ padding: '24px 16px', textAlign: 'center', opacity: 0.5, border: '1px dashed var(--border-color)', width: '100%' }}>
                    <div style={{ fontSize: '2rem', marginBottom: '8px', color: 'var(--color-text-muted)' }}>🏆</div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>Chờ Xác Định</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
