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

  // Resolve team name and flag for bracket nodes
  const resolveTeam = (node: any) => {
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
      return { name: `Hạng 3 thứ ${node.rank + 1}`, flag: '🏳️', isPlaceholder: true };
    }
    return { name: 'TBD', flag: '🏳️', isPlaceholder: true };
  };

  // Find a knockout match in the database between two teams
  const findKnockoutMatch = (teamA: any, teamB: any) => {
    if (!teamA || !teamB || teamA.isPlaceholder || teamB.isPlaceholder) return null;
    return matches.find(m => 
      // Knockout matches don't have m.group or group is null
      !m.group &&
      (
        (m.homeTeam === teamA.name && m.awayTeam === teamB.name) ||
        (m.homeTeam === teamB.name && m.awayTeam === teamA.name)
      )
    );
  };

  // Get the winner of a knockout match
  const getMatchWinner = (teamA: any, teamB: any) => {
    const match = findKnockoutMatch(teamA, teamB);
    if (match && match.status === 'finished' && match.homeScore !== null && match.awayScore !== null) {
      if (match.homeTeam === teamA.name) {
        return match.homeScore > match.awayScore ? teamA : teamB;
      } else {
        return match.awayScore > match.homeScore ? teamA : teamB;
      }
    }
    return null;
  };

  // Pairings for Round of 32
  const r32Matchups = [
    { id: '1', home: { type: 'winner', group: 'A' }, away: { type: 'third', rank: 0 } },
    { id: '2', home: { type: 'runner_up', group: 'A' }, away: { type: 'runner_up', group: 'B' } },
    { id: '3', home: { type: 'winner', group: 'B' }, away: { type: 'third', rank: 1 } },
    { id: '4', home: { type: 'winner', group: 'C' }, away: { type: 'third', rank: 2 } },
    { id: '5', home: { type: 'runner_up', group: 'C' }, away: { type: 'runner_up', group: 'D' } },
    { id: '6', home: { type: 'winner', group: 'D' }, away: { type: 'third', rank: 3 } },
    { id: '7', home: { type: 'winner', group: 'E' }, away: { type: 'runner_up', group: 'F' } },
    { id: '8', home: { type: 'winner', group: 'F' }, away: { type: 'runner_up', group: 'E' } },
    { id: '9', home: { type: 'winner', group: 'G' }, away: { type: 'third', rank: 4 } },
    { id: '10', home: { type: 'runner_up', group: 'G' }, away: { type: 'runner_up', group: 'H' } },
    { id: '11', home: { type: 'winner', group: 'H' }, away: { type: 'third', rank: 5 } },
    { id: '12', home: { type: 'winner', group: 'I' }, away: { type: 'runner_up', group: 'J' } },
    { id: '13', home: { type: 'winner', group: 'J' }, away: { type: 'runner_up', group: 'I' } },
    { id: '14', home: { type: 'winner', group: 'K' }, away: { type: 'third', rank: 6 } },
    { id: '15', home: { type: 'runner_up', group: 'K' }, away: { type: 'runner_up', group: 'L' } },
    { id: '16', home: { type: 'winner', group: 'L' }, away: { type: 'third', rank: 7 } },
  ];

  // 1. Round of 32 Matches
  const r32Matches = r32Matchups.map(m => {
    const home = resolveTeam(m.home);
    const away = resolveTeam(m.away);
    const dbMatch = findKnockoutMatch(home, away);
    const winner = getMatchWinner(home, away);
    return { id: m.id, home, away, dbMatch, winner };
  });
  const r32Winners = r32Matches.map(m => m.winner);

  // 2. Round of 16 Matches
  const r16Matches = [];
  for (let i = 0; i < 8; i++) {
    const home = r32Winners[2 * i] || { name: `Thắng Trận ${2 * i + 1}`, flag: '🏳️', isPlaceholder: true };
    const away = r32Winners[2 * i + 1] || { name: `Thắng Trận ${2 * i + 2}`, flag: '🏳️', isPlaceholder: true };
    const dbMatch = findKnockoutMatch(home, away);
    const winner = getMatchWinner(home, away);
    r16Matches.push({ id: `${i + 1}`, home, away, dbMatch, winner });
  }
  const r16Winners = r16Matches.map(m => m.winner);

  // 3. Quarterfinals (Tứ Kết)
  const qfMatches = [];
  for (let i = 0; i < 4; i++) {
    const home = r16Winners[2 * i] || { name: `Thắng Vòng 16 Trận ${2 * i + 1}`, flag: '🏳️', isPlaceholder: true };
    const away = r16Winners[2 * i + 1] || { name: `Thắng Vòng 16 Trận ${2 * i + 2}`, flag: '🏳️', isPlaceholder: true };
    const dbMatch = findKnockoutMatch(home, away);
    const winner = getMatchWinner(home, away);
    qfMatches.push({ id: `${i + 1}`, home, away, dbMatch, winner });
  }
  const qfWinners = qfMatches.map(m => m.winner);

  // 4. Semifinals (Bán Kết)
  const sfMatches = [];
  for (let i = 0; i < 2; i++) {
    const home = qfWinners[2 * i] || { name: `Thắng Tứ Kết ${2 * i + 1}`, flag: '🏳️', isPlaceholder: true };
    const away = qfWinners[2 * i + 1] || { name: `Thắng Tứ Kết ${2 * i + 2}`, flag: '🏳️', isPlaceholder: true };
    const dbMatch = findKnockoutMatch(home, away);
    const winner = getMatchWinner(home, away);
    sfMatches.push({ id: `${i + 1}`, home, away, dbMatch, winner });
  }
  const sfWinners = sfMatches.map(m => m.winner);

  // 5. Final (Chung Kết)
  const homeFinal = sfWinners[0] || { name: 'Thắng Bán Kết 1', flag: '🏳️', isPlaceholder: true };
  const awayFinal = sfWinners[1] || { name: 'Thắng Bán Kết 2', flag: '🏳️', isPlaceholder: true };
  const finalMatchDB = findKnockoutMatch(homeFinal, awayFinal);
  const champion = getMatchWinner(homeFinal, awayFinal);
  const finalMatch = { id: 'Chung Kết', home: homeFinal, away: awayFinal, dbMatch: finalMatchDB, winner: champion };

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
