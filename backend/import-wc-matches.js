import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { readDB, writeDB } from './data-store.js';

// Map team English names to Flags
const FLAG_MAP = {
  'Mexico': '🇲🇽',
  'South Africa': '🇿🇦',
  'South Korea': '🇰🇷',
  'Czech Republic': '🇨🇿',
  'Canada': '🇨🇦',
  'Bosnia and Herzegovina': '🇧🇦',
  'United States': '🇺🇸',
  'Paraguay': '🇵🇾',
  'Haiti': '🇭🇹',
  'Scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'Australia': '🇦🇺',
  'Turkey': '🇹🇷',
  'Brazil': '🇧🇷',
  'Morocco': '🇲🇦',
  'Qatar': '🇶🇦',
  'Switzerland': '🇨🇭',
  'Ivory Coast': '🇨🇮',
  'Ecuador': '🇪🇨',
  'Germany': '🇩🇪',
  'Curaçao': '🇨🇼',
  'Netherlands': '🇳🇱',
  'Japan': '🇯🇵',
  'Sweden': '🇸🇪',
  'Tunisia': '🇹🇳',
  'Iran': '🇮🇷',
  'New Zealand': '🇳🇿',
  'Spain': '🇪🇸',
  'Cape Verde': '🇨🇻',
  'Belgium': '🇧🇪',
  'Egypt': '🇪🇬',
  'Saudi Arabia': '🇸🇦',
  'Uruguay': '🇺🇾',
  'France': '🇫🇷',
  'Senegal': '🇸🇳',
  'Iraq': '🇮🇶',
  'Norway': '🇳🇴',
  'Argentina': '🇦🇷',
  'Algeria': '🇩🇿',
  'Austria': '🇦🇹',
  'Jordan': '🇯🇴',
  'Portugal': '🇵🇹',
  'Democratic Republic of the Congo': '🇨🇩',
  'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Croatia': '🇭🇷',
  'Uzbekistan': '🇺🇿',
  'Colombia': '🇨🇴',
  'Ghana': '🇬🇭',
  'Panama': '🇵🇦',
};

// Map team English names to Vietnamese
const TEAM_NAME_VI = {
  'Mexico': 'Mexico',
  'South Africa': 'Nam Phi',
  'South Korea': 'Hàn Quốc',
  'Czech Republic': 'CH Séc',
  'Canada': 'Canada',
  'Bosnia and Herzegovina': 'Bosnia & Her.',
  'United States': 'Mỹ',
  'Paraguay': 'Paraguay',
  'Haiti': 'Haiti',
  'Scotland': 'Scotland',
  'Australia': 'Úc',
  'Turkey': 'Thổ Nhĩ Kỳ',
  'Brazil': 'Brazil',
  'Morocco': 'Ma-rốc',
  'Qatar': 'Qatar',
  'Switzerland': 'Thụy Sĩ',
  'Ivory Coast': 'Bờ Biển Ngà',
  'Ecuador': 'Ecuador',
  'Germany': 'Đức',
  'Curaçao': 'Curaçao',
  'Netherlands': 'Hà Lan',
  'Japan': 'Nhật Bản',
  'Sweden': 'Thụy Điển',
  'Tunisia': 'Tunisia',
  'Iran': 'Iran',
  'New Zealand': 'New Zealand',
  'Spain': 'Tây Ban Nha',
  'Cape Verde': 'Cape Verde',
  'Belgium': 'Bỉ',
  'Egypt': 'Ai Cập',
  'Saudi Arabia': 'Ả Rập Xê Út',
  'Uruguay': 'Uruguay',
  'France': 'Pháp',
  'Senegal': 'Senegal',
  'Iraq': 'Iraq',
  'Norway': 'Na Uy',
  'Argentina': 'Argentina',
  'Algeria': 'Algeria',
  'Austria': 'Áo',
  'Jordan': 'Jordan',
  'Portugal': 'Bồ Đào Nha',
  'Democratic Republic of the Congo': 'CHDC Congo',
  'England': 'Anh',
  'Croatia': 'Croatia',
  'Uzbekistan': 'Uzbekistan',
  'Colombia': 'Colombia',
  'Ghana': 'Ghana',
  'Panama': 'Panama'
};

// Offsets mapping for World Cup 2026 stadium IDs
const STADIUM_OFFSETS = {
  '1': 6,  // Azteca, Mexico City: UTC-6
  '2': 6,  // Monterrey: UTC-6
  '3': 6,  // Guadalajara: UTC-6
  '4': 7,  // BC Place, Vancouver: PDT (UTC-7)
  '5': 4,  // BMO Field, Toronto: EDT (UTC-4)
  '6': 4,  // MetLife, East Jersey: EDT (UTC-4)
  '7': 7,  // SoFi, Los Angeles: PDT (UTC-7)
  '8': 5,  // AT&T, Dallas: CDT (UTC-5)
  '9': 5,  // Arrowhead, Kansas City: CDT (UTC-5)
  '10': 4, // Mercedes-Benz, Atlanta: EDT (UTC-4)
  '11': 4, // Hard Rock, Miami: EDT (UTC-4)
  '12': 4, // Gillette, Boston: EDT (UTC-4)
  '13': 4, // Lincoln Financial, Philadelphia: EDT (UTC-4)
  '14': 5, // NRG, Houston: CDT (UTC-5)
  '15': 7, // Levi's, Santa Clara: PDT (UTC-7)
  '16': 7  // Lumen Field, Seattle: PDT (UTC-7)
};

// Parse date string like "06/11/2026 13:00" and convert to ISO String
function parseMatchDate(dateStr, stadiumId) {
  const [datePart, timePart] = dateStr.split(' ');
  const [m, d, y] = datePart.split('/');
  const [hr, min] = timePart.split(':');
  
  // Get timezone offset of stadium, default to 5
  const offset = STADIUM_OFFSETS[stadiumId.toString()] || 5;
  
  // Convert to UTC ISO string
  const dateObj = new Date(Date.UTC(
    parseInt(y), 
    parseInt(m) - 1, 
    parseInt(d), 
    parseInt(hr) + offset, 
    parseInt(min)
  ));
  
  return dateObj.toISOString();
}

async function run() {
  console.log('🔄 Đang kết nối tới API lịch thi đấu World Cup 2026...');
  
  try {
    const response = await fetch('https://worldcup26.ir/get/games');
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    
    const data = await response.json();
    if (!data || !data.games || !Array.isArray(data.games)) {
      throw new Error('Dữ liệu API không đúng định dạng');
    }
    
    console.log(`✅ Đã tải về ${data.games.length} trận đấu từ API.`);
    
    // Đọc database hiện tại
    const db = readDB();
    
    // Lọc lấy các trận vòng bảng (games 1 đến 72)
    const groupStageGames = data.games.filter(g => g.type === 'group' && parseInt(g.id) <= 72);
    console.log(`➡️ Lọc được ${groupStageGames.length} trận đấu Vòng bảng.`);

    let importedCount = 0;
    
    groupStageGames.forEach(game => {
      const homeEng = game.home_team_name_en;
      const awayEng = game.away_team_name_en;
      
      const homeVi = TEAM_NAME_VI[homeEng] || homeEng;
      const awayVi = TEAM_NAME_VI[awayEng] || awayEng;
      
      const homeFlag = FLAG_MAP[homeEng] || '🏳️';
      const awayFlag = FLAG_MAP[awayEng] || '🏳️';
      
      const matchTime = parseMatchDate(game.local_date, game.stadium_id);
      const matchId = `match_${game.id}`;
      
      // Kiểm tra xem trận đấu đã có trong db chưa
      const existingMatchIndex = db.matches.findIndex(m => m.id === matchId);
      
      const newMatchData = {
        id: matchId,
        homeTeam: homeVi,
        awayTeam: awayVi,
        homeFlag,
        awayFlag,
        matchTime,
        group: game.group, // Lưu thông tin bảng đấu (A-L)
        handicap: { team: null, value: 0 }, 
        status: 'pending',
        homeScore: null,
        awayScore: null
      };
      
      if (existingMatchIndex >= 0) {
        const existing = db.matches[existingMatchIndex];
        newMatchData.status = existing.status;
        newMatchData.homeScore = existing.homeScore;
        newMatchData.awayScore = existing.awayScore;
        newMatchData.handicap = existing.handicap;
        
        db.matches[existingMatchIndex] = newMatchData;
      } else {
        db.matches.push(newMatchData);
      }
      
      importedCount++;
    });
    
    // Ghi đè vào db.json
    writeDB(db);
    
    console.log(`\n🎉 THÀNH CÔNG! Đã nhập/cập nhật ${importedCount} trận vòng bảng World Cup 2026 vào CSDL.`);
    console.log(`Đã đồng bộ thời gian chuẩn GMT+7 Việt Nam và nạp thông tin Bảng đấu (Group A - L).`);
    
  } catch (error) {
    console.error('❌ Lỗi khi nhập lịch thi đấu:', error);
  }
}

run();
