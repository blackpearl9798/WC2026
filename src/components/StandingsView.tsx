import React from 'react';
import groupsImage from '../assets/wc2026-groups.png';
import { LayoutGrid } from 'lucide-react';
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
  // 1. Group matches by Group Letter (A - L)
  const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  
  const calculateStandings = (groupLetter: string) => {
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

  return (
    <div>
      <h2 style={{ fontFamily: 'var(--font-display)', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <LayoutGrid style={{ color: 'var(--color-primary)' }} /> Bảng Xếp Hạng Vòng Bảng
      </h2>

      {/* Grid of groups tables */}
      <div className="standings-grid" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px', marginBottom: '40px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {groupsList.map(group => {
            const standings = calculateStandings(group);
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
    </div>
  );
};
