import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cho phép tùy chỉnh thư mục lưu database qua biến môi trường (phục vụ Persistent Disk trên Cloud)
const DB_DIR = process.env.DB_DIR || __dirname;
const DB_FILE = path.join(DB_DIR, 'db.json');

// Initial matches list for WC 2026
const INITIAL_MATCHES = [
  {
    id: 'match_1',
    homeTeam: 'Mỹ',
    awayTeam: 'Mexico',
    homeFlag: '🇺🇸',
    awayFlag: '🇲🇽',
    matchTime: '2026-06-11T18:00:00+07:00', // Giả định giờ Việt Nam
    handicap: { team: 'home', value: 0.25 }, // Mỹ chấp 0.25
    status: 'pending',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'match_2',
    homeTeam: 'Canada',
    awayTeam: 'Costa Rica',
    homeFlag: '🇨🇦',
    awayFlag: '🇨🇷',
    matchTime: '2026-06-12T20:00:00+07:00',
    handicap: { team: 'home', value: 0.5 }, // Canada chấp 0.5
    status: 'pending',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'match_3',
    homeTeam: 'Argentina',
    awayTeam: 'Bồ Đào Nha',
    homeFlag: '🇦🇷',
    awayFlag: '🇵🇹',
    matchTime: '2026-06-13T23:00:00+07:00',
    handicap: { team: 'home', value: 0.75 }, // Argentina chấp 0.75
    status: 'pending',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'match_4',
    homeTeam: 'Anh',
    awayTeam: 'Đức',
    homeFlag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    awayFlag: '🇩🇪',
    matchTime: '2026-06-14T02:00:00+07:00',
    handicap: { team: null, value: 0 }, // Đồng banh
    status: 'pending',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'match_5',
    homeTeam: 'Pháp',
    awayTeam: 'Ý',
    homeFlag: '🇫🇷',
    awayFlag: '🇮🇹',
    matchTime: '2026-06-15T02:00:00+07:00',
    handicap: { team: 'home', value: 0.5 }, // Pháp chấp 0.5
    status: 'pending',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'match_6',
    homeTeam: 'Brazil',
    awayTeam: 'Tây Ban Nha',
    homeFlag: '🇧🇷',
    awayFlag: '🇪🇸',
    matchTime: '2026-06-16T02:00:00+07:00',
    handicap: { team: 'home', value: 0.25 }, // Brazil chấp 0.25
    status: 'pending',
    homeScore: null,
    awayScore: null
  },
  {
    id: 'match_7',
    homeTeam: 'Nhật Bản',
    awayTeam: 'Hàn Quốc',
    homeFlag: '🇯🇵',
    awayFlag: '🇰🇷',
    matchTime: '2026-06-17T18:00:00+07:00',
    handicap: { team: 'home', value: 0.25 }, // Nhật chấp 0.25
    status: 'pending',
    homeScore: null,
    awayScore: null
  }
];

// Load database from file
export function readDB() {
  try {
    // Đảm bảo thư mục lưu trữ database tồn tại
    if (!fs.existsSync(DB_DIR)) {
      fs.mkdirSync(DB_DIR, { recursive: true });
    }

    if (!fs.existsSync(DB_FILE)) {
      // Nếu file DB trên ổ đĩa mount chưa tồn tại, sao chép file mặc định đi kèm code để giữ 72 trận đấu
      const defaultDB = path.join(__dirname, 'db.json');
      if (fs.existsSync(defaultDB) && defaultDB !== DB_FILE) {
        console.log(`Copying default database from ${defaultDB} to ${DB_FILE}`);
        fs.copyFileSync(defaultDB, DB_FILE);
      } else {
        const initialData = {
          users: [
            {
              id: 'admin_user',
              username: 'admin',
              fullName: 'Quản trị viên',
              password: '696969',
              isAdmin: true,
              token: 'admin-token-12345'
            }
          ],
          matches: INITIAL_MATCHES,
          predictions: []
        };
        writeDB(initialData);
      }
    }
    const data = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(data);

    // Tự động nâng cấp tài khoản admin nếu thiếu password/fullName
    const admin = db.users.find(u => u.username === 'admin');
    if (admin) {
      let upgraded = false;
      if (!admin.password) {
        admin.password = '696969';
        upgraded = true;
      }
      if (!admin.fullName) {
        admin.fullName = 'Quản trị viên';
        upgraded = true;
      }
      if (upgraded) {
        writeDB(db);
      }
    }

    return db;
  } catch (error) {
    console.error('Error reading database file:', error);
    return { users: [], matches: [], predictions: [] };
  }
}

// Write database to file
export function writeDB(data) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (error) {
    console.error('Error writing database file:', error);
    return false;
  }
}

// Calculate handicap result for a match
// Returns: 'home' | 'home-half' | 'draw' | 'away-half' | 'away'
export function calculateHandicapResult(homeScore, awayScore, handicap) {
  const { team, value } = handicap;
  if (team === null || value === 0) {
    // Level ball (Đồng banh)
    if (homeScore > awayScore) return 'home';
    if (homeScore < awayScore) return 'away';
    return 'draw';
  }

  const diff = homeScore - awayScore;

  if (team === 'home') {
    const net = diff - value;
    if (net >= 0.5) return 'home';
    if (net === 0.25) return 'home-half';
    if (net === 0) return 'draw';
    if (net === -0.25) return 'away-half';
    return 'away';
  } else {
    // team === 'away'
    // diff is home - away, so away's net is awayScore - homeScore - value, which is -diff - value
    const net = -diff - value;
    if (net >= 0.5) return 'away';
    if (net === 0.25) return 'away-half';
    if (net === 0) return 'draw';
    if (net === -0.25) return 'home-half';
    return 'home';
  }
}

export function calculatePoints(prediction, homeScore, awayScore, handicap) {
  // 1. Score Points (Removed, always 0)
  let pointsScore = 0;

  // 2. Handicap Points (1 point if correct, 0 if incorrect/draw)
  let pointsHandicap = 0;
  const predictedWinner = prediction.predictedHandicapWinner; // 'home' | 'away'
  const handicapResult = calculateHandicapResult(homeScore, awayScore, handicap);

  if (predictedWinner === 'home') {
    if (handicapResult === 'home' || handicapResult === 'home-half') {
      pointsHandicap = 1;
    } else {
      pointsHandicap = 0;
    }
  } else if (predictedWinner === 'away') {
    if (handicapResult === 'away' || handicapResult === 'away-half') {
      pointsHandicap = 1;
    } else {
      pointsHandicap = 0;
    }
  }

  return {
    pointsScore,
    pointsHandicap,
    pointsTotal: pointsHandicap
  };
}
