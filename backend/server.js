import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { readDB, writeDB, calculatePoints } from './data-store.js';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Khởi tạo database ngay khi khởi chạy server
readDB();

// --- TỰ ĐỘNG ĐỒNG BỘ REAL-TIME TỪ API ---
const STADIUM_OFFSETS = {
  '1': 6, '2': 6, '3': 6, '4': 7, '5': 4, '6': 4, '7': 7, '8': 5,
  '9': 5, '10': 4, '11': 4, '12': 4, '13': 4, '14': 5, '15': 7, '16': 7
};

function parseMatchDate(dateStr, stadiumId) {
  try {
    const [datePart, timePart] = dateStr.split(' ');
    const [m, d, y] = datePart.split('/');
    const [hr, min] = timePart.split(':');
    const offset = STADIUM_OFFSETS[stadiumId.toString()] || 5;
    const dateObj = new Date(Date.UTC(
      parseInt(y), 
      parseInt(m) - 1, 
      parseInt(d), 
      parseInt(hr) + offset, 
      parseInt(min)
    ));
    return dateObj.toISOString();
  } catch (e) {
    return null;
  }
}

async function syncMatchesFromAPI() {
  console.log('⏳ [Cron] Khởi chạy đồng bộ kết quả từ API...');
  try {
    const response = await fetch('https://worldcup26.ir/get/games');
    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data || !data.games || !Array.isArray(data.games)) {
      throw new Error('Dữ liệu API không đúng định dạng');
    }

    const db = readDB();
    let updatedCount = 0;
    let finishedMatchesCount = 0;

    // Lọc lấy các trận vòng bảng (games 1 đến 72)
    const groupStageGames = data.games.filter(g => g.type === 'group' && parseInt(g.id) <= 72);

    groupStageGames.forEach(game => {
      const matchId = `match_${game.id}`;
      const existingMatch = db.matches.find(m => m.id === matchId);

      if (existingMatch) {
        let changed = false;

        // 1. Xác định trạng thái mới của trận đấu
        let apiStatus = 'pending';
        if (game.finished === 'TRUE') {
          apiStatus = 'finished';
        } else if (game.time_elapsed !== 'notstarted') {
          apiStatus = 'live';
        }

        // 2. Xác định tỷ số mới (chỉ lấy tỷ số khi trận đấu đang diễn ra hoặc đã kết thúc)
        let apiHomeScore = null;
        let apiAwayScore = null;

        if (apiStatus === 'live' || apiStatus === 'finished') {
          apiHomeScore = game.home_score !== 'null' ? parseInt(game.home_score) : 0;
          apiAwayScore = game.away_score !== 'null' ? parseInt(game.away_score) : 0;
        }

        // 3. Đồng bộ thời gian thi đấu (nếu có thay đổi lịch)
        const apiMatchTime = parseMatchDate(game.local_date, game.stadium_id);

        // Kiểm tra xem có thay đổi so với database hiện tại không
        if (existingMatch.status !== apiStatus) {
          // Nếu chuyển sang trạng thái đã kết thúc, tính điểm cho tất cả người dự đoán
          if (apiStatus === 'finished' && existingMatch.status !== 'finished') {
            db.predictions = db.predictions.map(pred => {
              if (pred.matchId === matchId) {
                const points = calculatePoints(pred, apiHomeScore, apiAwayScore, existingMatch.handicap);
                return {
                  ...pred,
                  ...points
                };
              }
              return pred;
            });
            finishedMatchesCount++;
          }
          existingMatch.status = apiStatus;
          changed = true;
        }

        if (existingMatch.homeScore !== apiHomeScore) {
          existingMatch.homeScore = apiHomeScore;
          changed = true;
        }

        if (existingMatch.awayScore !== apiAwayScore) {
          existingMatch.awayScore = apiAwayScore;
          changed = true;
        }

        if (apiMatchTime && existingMatch.matchTime !== apiMatchTime) {
          existingMatch.matchTime = apiMatchTime;
          changed = true;
        }

        if (changed) {
          updatedCount++;
        }
      }
    });

    if (updatedCount > 0) {
      writeDB(db);
      console.log(`✅ [Cron] Đồng bộ thành công: Cập nhật ${updatedCount} trận. Tính điểm xong cho ${finishedMatchesCount} trận đã kết thúc.`);
    } else {
      console.log('ℹ️ [Cron] Không có trận đấu nào thay đổi kết quả.');
    }
  } catch (error) {
    console.error('❌ [Cron] Lỗi đồng bộ dữ liệu từ API:', error.message);
  }
}

// Đồng bộ lần đầu khi server khởi chạy (Đã tắt theo yêu cầu)
// syncMatchesFromAPI();

// Chu kỳ đồng bộ: Lặp lại mỗi 5 phút một lần (Đã tắt theo yêu cầu)
// setInterval(syncMatchesFromAPI, 5 * 60 * 1000);

// Authentication Middleware
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Không tìm thấy token xác thực' });
  }

  const token = authHeader.split(' ')[1];
  const db = readDB();
  const user = db.users.find(u => u.token === token);

  if (!user) {
    return res.status(401).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
  }

  req.user = user;
  next();
}

// Admin Middleware
function requireAdmin(req, res, next) {
  if (!req.user || !req.user.isAdmin) {
    return res.status(403).json({ error: 'Bạn không có quyền quản trị' });
  }
  next();
}

// --- API ENDPOINTS ---

// 1. Đăng ký tài khoản mới
app.post('/api/auth/register', (req, res) => {
  const { username, fullName, password } = req.body;

  if (!username || !fullName || !password) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin: Tên đăng nhập, Họ và tên, và Mật khẩu' });
  }

  const db = readDB();

  // Kiểm tra trùng lặp
  const exists = db.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  if (exists) {
    return res.status(400).json({ error: 'Tên đăng nhập đã được sử dụng' });
  }

  const token = `token-${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`;
  const newUser = {
    id: `user_${Date.now()}`,
    username,
    fullName,
    password,
    isAdmin: false,
    token
  };

  db.users.push(newUser);
  writeDB(db);

  res.status(201).json({
    message: 'Đăng ký thành công',
    user: { id: newUser.id, username: newUser.username, fullName: newUser.fullName, isAdmin: newUser.isAdmin },
    token
  });
});

// 2. Đăng nhập
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Vui lòng nhập Tên đăng nhập và Mật khẩu' });
  }

  const db = readDB();
  const user = db.users.find(u => 
    u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    return res.status(404).json({ error: 'Tài khoản không tồn tại. Vui lòng đăng ký trước!' });
  }

  // Kiểm tra mật khẩu
  if (user.password !== password) {
    return res.status(400).json({ error: 'Mật khẩu không chính xác' });
  }

  // Cập nhật token mới khi đăng nhập
  const token = `token-${Math.random().toString(36).substr(2, 9)}-${Date.now().toString(36)}`;
  user.token = token;
  writeDB(db);

  res.json({
    message: 'Đăng nhập thành công',
    user: { id: user.id, username: user.username, fullName: user.fullName, isAdmin: user.isAdmin },
    token
  });
});

// 3. Lấy thông tin cá nhân hiện tại
app.get('/api/auth/me', authenticate, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      fullName: req.user.fullName,
      isAdmin: req.user.isAdmin
    }
  });
});

// Helper check match locked (started)
const isMatchLocked = (match) => {
  if (match.status === 'live' || match.status === 'finished') return true;
  const matchDate = new Date(match.matchTime);
  const now = new Date();
  // Khóa trước 5 phút
  return now.getTime() >= matchDate.getTime() - 5 * 60 * 1000;
};

// 4. Lấy danh sách trận đấu và dự đoán của bản thân
app.get('/api/matches', authenticate, (req, res) => {
  const db = readDB();
  const userId = req.user.id;

  const matchesWithPredictions = db.matches.map(match => {
    // Dự đoán của chính user đang gọi API
    const myPrediction = db.predictions.find(p => p.userId === userId && p.matchId === match.id);
    const locked = isMatchLocked(match);

    // Thu thập dự đoán của người khác
    let otherPredictions = [];
    if (locked) {
      // Nếu trận đã khóa, trả về dự đoán của mọi người để công khai
      otherPredictions = db.predictions
        .filter(p => p.matchId === match.id && p.userId !== userId)
        .map(p => {
          const user = db.users.find(u => u.id === p.userId);
          return {
            username: user ? user.username : 'Người dùng ẩn',
            department: user ? user.department : '',
            predictedHandicapWinner: p.predictedHandicapWinner,
            pointsTotal: p.pointsTotal
          };
        });
    }

    return {
      ...match,
      isLocked: locked,
      myPrediction: myPrediction ? {
        predictedHandicapWinner: myPrediction.predictedHandicapWinner,
        pointsScore: myPrediction.pointsScore,
        pointsHandicap: myPrediction.pointsHandicap,
        pointsTotal: myPrediction.pointsTotal
      } : null,
      otherPredictions
    };
  });

  res.json(matchesWithPredictions);
});

// 5. Lưu hoặc cập nhật dự đoán
app.post('/api/predictions', authenticate, (req, res) => {
  const { matchId, predictedHandicapWinner } = req.body;

  if (!predictedHandicapWinner) {
    return res.status(400).json({ error: 'Dữ liệu dự đoán không đầy đủ (thiếu đội thắng kèo)' });
  }

  const db = readDB();
  const match = db.matches.find(m => m.id === matchId);

  if (!match) {
    return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
  }

  // Kiểm tra trận đấu đã khóa chưa
  if (isMatchLocked(match)) {
    return res.status(400).json({ error: 'Trận đấu đã bắt đầu hoặc đã bị khóa dự đoán!' });
  }

  const userId = req.user.id;
  let predictionIndex = db.predictions.findIndex(p => p.userId === userId && p.matchId === matchId);

  const predictionData = {
    userId,
    matchId,
    predictedHandicapWinner,
    pointsScore: 0,
    pointsHandicap: 0,
    pointsTotal: 0
  };

  if (predictionIndex >= 0) {
    // Cập nhật dự đoán cũ
    db.predictions[predictionIndex] = {
      ...db.predictions[predictionIndex],
      ...predictionData
    };
  } else {
    // Tạo dự đoán mới
    predictionData.id = `pred_${Date.now()}`;
    db.predictions.push(predictionData);
  }

  writeDB(db);
  res.json({ message: 'Lưu dự đoán thành công', prediction: predictionData });
});

// 6. Lấy bảng xếp hạng (Leaderboard)
app.get('/api/leaderboard', (req, res) => {
  const db = readDB();
  
  // Tính điểm cho từng user
  const leaderboard = db.users.map(user => {
    const userPredictions = db.predictions.filter(p => p.userId === user.id);
    
    let correctPredictions = 0;
    let incorrectPredictions = 0;
    let totalPredictions = userPredictions.length;

    userPredictions.forEach(p => {
      const match = db.matches.find(m => m.id === p.matchId);
      if (match && match.status === 'finished') {
        if (p.pointsTotal === 1) {
          correctPredictions++;
        } else {
          incorrectPredictions++;
        }
      }
    });

    const totalPoints = correctPredictions; // 1 point per correct match

    return {
      userId: user.id,
      username: user.username,
      fullName: user.fullName || user.username,
      isAdmin: user.isAdmin,
      totalPoints,
      correctPredictions,
      incorrectPredictions,
      totalPredictions
    };
  });

  // Sắp xếp: Điểm cao nhất -> Số trận sai ít nhất -> Tên chữ cái
  leaderboard.sort((a, b) => {
    if (b.totalPoints !== a.totalPoints) {
      return b.totalPoints - a.totalPoints;
    }
    if (a.incorrectPredictions !== b.incorrectPredictions) {
      return a.incorrectPredictions - b.incorrectPredictions; // Ít trận sai hơn xếp trên
    }
    return a.fullName.localeCompare(b.fullName);
  });

  res.json(leaderboard);
});

// 6.5 Lấy danh sách tin nhắn chat
app.get('/api/chat', authenticate, (req, res) => {
  const db = readDB();
  if (!db.chat) {
    db.chat = [];
  }
  res.json(db.chat.slice(-50));
});

// 6.6 Gửi tin nhắn chat mới
app.post('/api/chat', authenticate, (req, res) => {
  const { message } = req.body;
  if (!message || message.trim() === '') {
    return res.status(400).json({ error: 'Nội dung tin nhắn không được để trống' });
  }

  const db = readDB();
  if (!db.chat) {
    db.chat = [];
  }

  const newMsg = {
    id: `msg_${Date.now()}`,
    userId: req.user.id,
    username: req.user.fullName || req.user.username,
    department: req.user.department || '',
    message: message.trim(),
    timestamp: new Date().toISOString()
  };

  db.chat.push(newMsg);
  if (db.chat.length > 200) {
    db.chat = db.chat.slice(-200);
  }

  writeDB(db);
  res.status(201).json(newMsg);
});


// --- ADMIN API ENDPOINTS (Yêu cầu quyền Admin) ---

// 7. Thêm trận đấu mới
app.post('/api/admin/matches', authenticate, requireAdmin, (req, res) => {
  const { homeTeam, awayTeam, homeFlag, awayFlag, matchTime, handicap } = req.body;

  if (!homeTeam || !awayTeam || !homeFlag || !awayFlag || !matchTime || !handicap) {
    return res.status(400).json({ error: 'Vui lòng cung cấp đầy đủ thông tin trận đấu' });
  }

  const db = readDB();
  const newMatch = {
    id: `match_${Date.now()}`,
    homeTeam,
    awayTeam,
    homeFlag,
    awayFlag,
    matchTime,
    handicap: {
      team: handicap.team, // 'home' | 'away' | null
      value: parseFloat(handicap.value) || 0
    },
    status: 'pending',
    homeScore: null,
    awayScore: null
  };

  db.matches.push(newMatch);
  writeDB(db);

  res.status(201).json({ message: 'Tạo trận đấu thành công', match: newMatch });
});

// 8. Chỉnh sửa trận đấu
app.put('/api/admin/matches/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { homeTeam, awayTeam, homeFlag, awayFlag, matchTime, handicap } = req.body;

  const db = readDB();
  const matchIndex = db.matches.findIndex(m => m.id === id);

  if (matchIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
  }

  const match = db.matches[matchIndex];
  if (match.status !== 'pending') {
    return res.status(400).json({ error: 'Không thể sửa trận đấu đã bắt đầu hoặc đã kết thúc' });
  }

  db.matches[matchIndex] = {
    ...match,
    homeTeam: homeTeam || match.homeTeam,
    awayTeam: awayTeam || match.awayTeam,
    homeFlag: homeFlag || match.homeFlag,
    awayFlag: awayFlag || match.awayFlag,
    matchTime: matchTime || match.matchTime,
    handicap: handicap ? {
      team: handicap.team,
      value: parseFloat(handicap.value) || 0
    } : match.handicap
  };

  writeDB(db);
  res.json({ message: 'Cập nhật trận đấu thành công', match: db.matches[matchIndex] });
});

// 9. Cập nhật tỷ số trận đấu và tính điểm dự đoán
app.post('/api/admin/matches/:id/score', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { homeScore, awayScore, status } = req.body; // status: 'live' | 'finished'

  if (homeScore === undefined || awayScore === undefined || !status) {
    return res.status(400).json({ error: 'Thiếu tỷ số hoặc trạng thái trận đấu' });
  }

  const db = readDB();
  const matchIndex = db.matches.findIndex(m => m.id === id);

  if (matchIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
  }

  const match = db.matches[matchIndex];
  const parsedHome = parseInt(homeScore);
  const parsedAway = parseInt(awayScore);

  if (isNaN(parsedHome) || isNaN(parsedAway) || parsedHome < 0 || parsedAway < 0) {
    return res.status(400).json({ error: 'Tỷ số phải là số nguyên không âm' });
  }

  // Cập nhật thông tin trận đấu
  match.homeScore = parsedHome;
  match.awayScore = parsedAway;
  match.status = status;

  // Nếu trận đấu kết thúc, tính điểm cho tất cả người dự đoán trận này
  if (status === 'finished') {
    db.predictions = db.predictions.map(pred => {
      if (pred.matchId === id) {
        const points = calculatePoints(pred, parsedHome, parsedAway, match.handicap);
        return {
          ...pred,
          ...points
        };
      }
      return pred;
    });
  }

  writeDB(db);
  res.json({ message: 'Cập nhật kết quả và tính điểm thành công', match });
});

// 10. Xóa trận đấu (chỉ cho phép xóa trận chưa đá)
app.delete('/api/admin/matches/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  const match = db.matches.find(m => m.id === id);

  if (!match) {
    return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
  }

  if (match.status !== 'pending') {
    return res.status(400).json({ error: 'Chỉ có thể xóa trận đấu chưa diễn ra' });
  }

  db.matches = db.matches.filter(m => m.id !== id);
  db.predictions = db.predictions.filter(p => p.matchId !== id); // Xóa các dự đoán đi kèm
  writeDB(db);

  res.json({ message: 'Xóa trận đấu thành công' });
});

// 11. Danh sách người dùng (Cho Admin quản lý)
app.get('/api/admin/users', authenticate, requireAdmin, (req, res) => {
  const db = readDB();
  const userList = db.users.map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName || u.username,
    isAdmin: u.isAdmin
  }));
  res.json(userList);
});

// 12. Xóa người dùng và các dự đoán của họ
app.delete('/api/admin/users/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const db = readDB();
  
  if (id === 'admin_user') {
    return res.status(400).json({ error: 'Không thể xóa tài khoản admin mặc định' });
  }

  const userExists = db.users.some(u => u.id === id);
  if (!userExists) {
    return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  }

  db.users = db.users.filter(u => u.id !== id);
  db.predictions = db.predictions.filter(p => p.userId !== id);
  writeDB(db);

  res.json({ message: 'Xóa người dùng và các dự đoán liên quan thành công' });
});

// Phục vụ các file tĩnh của Frontend (khi chạy ở môi trường production sau khi build)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPath = path.join(__dirname, '../dist');

console.log(`[Static] Checking frontend dist path: ${distPath}`);
const distExists = fs.existsSync(distPath);
console.log(`[Static] Dist path exists: ${distExists}`);

if (distExists) {
  try {
    const files = fs.readdirSync(distPath);
    console.log(`[Static] Found ${files.length} items in dist folder:`, files);
  } catch (err) {
    console.error(`[Static] Error reading dist folder:`, err.message);
  }

  app.use(express.static(distPath));
  
  // Trả về index.html cho các route của React (SPA) ngoại trừ /api
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api')) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
} else {
  try {
    const parentDir = path.join(__dirname, '..');
    const files = fs.readdirSync(parentDir);
    console.log(`[Static] Parent directory (${parentDir}) contents:`, files);
  } catch (err) {
    console.error(`[Static] Error reading parent folder:`, err.message);
  }
}

// Khởi chạy server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
