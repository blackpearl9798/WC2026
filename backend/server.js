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

const TEAM_NAME_VI = {
  'Mexico': 'Mexico',
  'South Africa': 'Nam Phi',
  'South Korea': 'Hàn Quốc',
  'Korea Republic': 'Hàn Quốc',
  'Czech Republic': 'CH Séc',
  'Canada': 'Canada',
  'Bosnia and Herzegovina': 'Bosnia & Her.',
  'Bosnia & Herzegovina': 'Bosnia & Her.',
  'United States': 'Mỹ',
  'USA': 'Mỹ',
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
  'Côte d\'Ivoire': 'Bờ Biển Ngà',
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
  'DR Congo': 'CHDC Congo',
  'Congo DR': 'CHDC Congo',
  'England': 'Anh',
  'Croatia': 'Croatia',
  'Uzbekistan': 'Uzbekistan',
  'Colombia': 'Colombia',
  'Ghana': 'Ghana',
  'Panama': 'Panama'
};

async function syncMatchesFromFreeAPI() {
  const db = readDB();
  const now = new Date();
  
  // 1. Tìm các trận chưa kết thúc trong DB cục bộ nhưng thời gian bắt đầu đã trôi qua hơn 130 phút (2 tiếng 10 phút)
  const elapsedMatches = db.matches.filter(m => {
    if (m.status === 'finished') return false;
    const matchTime = new Date(m.matchTime);
    const timeDiffMinutes = (now - matchTime) / (1000 * 60);
    return timeDiffMinutes >= 130;
  });

  if (elapsedMatches.length === 0) {
    // Không có trận nào kết thúc cần cập nhật.
    return;
  }

  console.log(`⏳ [Free API] Phát hiện ${elapsedMatches.length} trận đấu đã hết giờ trên DB. Bắt đầu gọi Free API (worldcup26.ir) để kiểm tra kết quả...`);
  try {
    const response = await fetch('https://worldcup26.ir/get/games');
    if (!response.ok) {
      throw new Error(`Free API error: ${response.statusText}`);
    }
    const data = await response.json();
    if (!data || !data.games || !Array.isArray(data.games)) {
      throw new Error('Dữ liệu Free API không đúng định dạng');
    }

    const freeGames = data.games;
    let updatedCount = 0;
    let finishedMatchesCount = 0;
    let dbChanged = false;

    elapsedMatches.forEach(localMatch => {
      const matchingGame = freeGames.find(game => {
        const homeEng = game.home_team_name_en;
        const awayEng = game.away_team_name_en;
        
        const homeVi = TEAM_NAME_VI[homeEng] || homeEng;
        const awayVi = TEAM_NAME_VI[awayEng] || awayEng;

        return (homeVi === localMatch.homeTeam && awayVi === localMatch.awayTeam);
      });

      if (matchingGame) {
        const isFinished = matchingGame.finished === 'TRUE' || matchingGame.time_elapsed === 'finished';

        if (isFinished) {
          const apiHomeScore = parseInt(matchingGame.home_score);
          const apiAwayScore = parseInt(matchingGame.away_score);

          if (!isNaN(apiHomeScore) && !isNaN(apiAwayScore)) {
            // Cập nhật CSDL
            localMatch.homeScore = apiHomeScore;
            localMatch.awayScore = apiAwayScore;
            localMatch.status = 'finished';
            dbChanged = true;
            updatedCount++;

            // Tự động tính toán điểm số cho các dự đoán tương ứng
            db.predictions = db.predictions.map(pred => {
              if (pred.matchId === localMatch.id) {
                const points = calculatePoints(pred, apiHomeScore, apiAwayScore, localMatch.handicap);
                return {
                  ...pred,
                  ...points
                };
              }
              return pred;
            });
            finishedMatchesCount++;
          }
        }
      }
    });

    if (dbChanged) {
      writeDB(db);
      console.log(`✅ [Free API] Đồng bộ thành công: Cập nhật kết quả ${updatedCount} trận. Tính điểm xong cho ${finishedMatchesCount} dự đoán.`);
    } else {
      console.log('ℹ️ [Free API] Đã kiểm tra API nhưng chưa có kết quả trận đấu mới nào kết thúc hoàn toàn.');
    }
  } catch (error) {
    console.error('❌ [Free API] Lỗi đồng bộ kết quả từ Free API:', error.message);
  }
}

// Đồng bộ khi khởi chạy máy chủ
syncMatchesFromFreeAPI();

// Chu kỳ kiểm tra định kỳ mỗi 10 phút một lần
setInterval(syncMatchesFromFreeAPI, 10 * 60 * 1000);

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
    user: { 
      id: newUser.id, 
      username: newUser.username, 
      fullName: newUser.fullName, 
      isAdmin: newUser.isAdmin,
      avatarColor: '',
      avatarIcon: ''
    },
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
    user: { 
      id: user.id, 
      username: user.username, 
      fullName: user.fullName, 
      isAdmin: user.isAdmin,
      avatarColor: user.avatarColor || '',
      avatarIcon: user.avatarIcon || ''
    },
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
      isAdmin: req.user.isAdmin,
      avatarColor: req.user.avatarColor || '',
      avatarIcon: req.user.avatarIcon || ''
    }
  });
});

// 3.5 Cập nhật thông tin cá nhân (Profile: fullName, password, avatarColor, avatarIcon)
app.put('/api/user/profile', authenticate, (req, res) => {
  const { fullName, password, avatarColor, avatarIcon } = req.body;

  if (!fullName || fullName.trim() === '') {
    return res.status(400).json({ error: 'Họ và tên không được để trống' });
  }

  if (password && password.trim().length < 6) {
    return res.status(400).json({ error: 'Mật khẩu mới phải có độ dài từ 6 ký tự trở lên' });
  }

  const db = readDB();
  const user = db.users.find(u => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ error: 'Không tìm thấy người dùng' });
  }

  user.fullName = fullName.trim();
  user.avatarColor = avatarColor || '';
  user.avatarIcon = avatarIcon || '';

  if (password && password.trim() !== '') {
    user.password = password.trim();
  }

  writeDB(db);

  res.json({
    message: 'Cập nhật tài khoản thành công',
    user: {
      id: user.id,
      username: user.username,
      fullName: user.fullName,
      isAdmin: user.isAdmin,
      avatarColor: user.avatarColor || '',
      avatarIcon: user.avatarIcon || ''
    }
  });
});

// Helper check match locked (started)
const isMatchLocked = (match) => {
  if (match.status === 'live' || match.status === 'finished') return true;
  const matchDate = new Date(match.matchTime);
  const now = new Date();
  return now.getTime() >= matchDate.getTime();
};

// 4. Lấy danh sách trận đấu và dự đoán của bản thân
app.get('/api/matches', authenticate, (req, res) => {
  const db = readDB();
  const userId = req.user.id;

  const matchesWithPredictions = db.matches.map(match => {
    // Dự đoán của chính user đang gọi API
    const myPrediction = db.predictions.find(p => p.userId === userId && p.matchId === match.id);
    const locked = isMatchLocked(match);

    // Tính tổng số lượng dự đoán của mỗi đội bóng để phục vụ Prediction Ratio Bar
    const allPreds = db.predictions.filter(p => p.matchId === match.id);
    const homeCount = allPreds.filter(p => p.predictedHandicapWinner === 'home').length;
    const awayCount = allPreds.filter(p => p.predictedHandicapWinner === 'away').length;

    // Thu thập dự đoán của người khác
    let otherPredictions = [];
    if (locked) {
      // Nếu trận đã khóa, trả về dự đoán của mọi người để công khai
      otherPredictions = db.predictions
        .filter(p => p.matchId === match.id && p.userId !== userId)
        .map(p => {
          const user = db.users.find(u => u.id === p.userId);
          return {
            username: user ? (user.fullName || user.username) : 'Người dùng ẩn',
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
      otherPredictions,
      predictionStats: {
        homeCount,
        awayCount,
        total: homeCount + awayCount
      }
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
  const finishedMatches = db.matches.filter(m => m.status === 'finished');
  const finishedMatchesCount = finishedMatches.length;
  
  // Tính toán kết quả dự đoán cho từng user
  const leaderboard = db.users.map(user => {
    const userPredictions = db.predictions.filter(p => p.userId === user.id);
    
    let correctPredictions = 0;
    let incorrectPredictions = 0;
    let predictedFinishedCount = 0;

    userPredictions.forEach(p => {
      const match = finishedMatches.find(m => m.id === p.matchId);
      if (match) {
        predictedFinishedCount++;
        const points = calculatePoints(p, match.homeScore, match.awayScore, match.handicap);
        if (points.pointsHandicap === 0) {
          correctPredictions++;
        } else {
          incorrectPredictions++;
        }
      }
    });

    const unpredictedMatches = finishedMatchesCount - predictedFinishedCount;

    return {
      userId: user.id,
      username: user.username,
      fullName: user.fullName || user.username,
      isAdmin: user.isAdmin,
      correctPredictions,
      incorrectPredictions,
      unpredictedMatches,
      totalPredictions: userPredictions.length,
      avatarColor: user.avatarColor || '',
      avatarIcon: user.avatarIcon || ''
    };
  });

  // Mặc định sắp xếp theo Số trận đúng (Thánh Dự) giảm dần
  leaderboard.sort((a, b) => {
    if (b.correctPredictions !== a.correctPredictions) {
      return b.correctPredictions - a.correctPredictions;
    }
    const aNhot = a.incorrectPredictions + a.unpredictedMatches;
    const bNhot = b.incorrectPredictions + b.unpredictedMatches;
    if (aNhot !== bNhot) {
      return aNhot - bNhot; // Ít nhọ hơn xếp trên (nhọ ít hơn)
    }
    return a.fullName.localeCompare(b.fullName);
  });

  res.json(leaderboard);
});


// 6.5 Lấy danh sách tin nhắn chat (Ánh xạ động Họ tên và Avatar mới nhất)
app.get('/api/chat', authenticate, (req, res) => {
  const db = readDB();
  if (!db.chat) {
    db.chat = [];
  }

  const mappedChat = db.chat.map(msg => {
    const user = db.users.find(u => u.id === msg.userId);
    return {
      ...msg,
      username: user ? (user.fullName || user.username) : msg.username,
      avatarColor: user ? (user.avatarColor || '') : '',
      avatarIcon: user ? (user.avatarIcon || '') : ''
    };
  });

  res.json(mappedChat.slice(-50));
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

  // Xác thực handicap
  if (!['home', 'away'].includes(handicap.team)) {
    return res.status(400).json({ error: 'Đội chấp handicap phải là home hoặc away (không được đồng banh)' });
  }

  const validHandicaps = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
  const handicapValue = parseFloat(handicap.value);
  if (!validHandicaps.includes(handicapValue)) {
    return res.status(400).json({ error: 'Tỷ lệ chấp handicap chỉ được chấp nhận là: 0.5, 1.5, 2.5, 3.5, 4.5, 5.5' });
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
      team: handicap.team,
      value: handicapValue
    },
    status: 'pending',
    homeScore: null,
    awayScore: null
  };

  db.matches.push(newMatch);
  writeDB(db);

  res.status(201).json({ message: 'Tạo trận đấu thành công', match: newMatch });
});

// 8. Chỉnh sửa trận đấu (Hỗ trợ chỉnh sửa toàn diện cả Tỷ số & Trạng thái thủ công)
app.put('/api/admin/matches/:id', authenticate, requireAdmin, (req, res) => {
  const { id } = req.params;
  const { homeTeam, awayTeam, homeFlag, awayFlag, matchTime, handicap, status, homeScore, awayScore } = req.body;

  const db = readDB();
  const matchIndex = db.matches.findIndex(m => m.id === id);

  if (matchIndex === -1) {
    return res.status(404).json({ error: 'Không tìm thấy trận đấu' });
  }

  const match = db.matches[matchIndex];

  // Xác thực handicap nếu thay đổi
  let newHandicap = match.handicap;
  if (handicap) {
    if (!['home', 'away'].includes(handicap.team)) {
      return res.status(400).json({ error: 'Đội chấp handicap phải là home hoặc away (không được đồng banh)' });
    }
    const validHandicaps = [0.5, 1.5, 2.5, 3.5, 4.5, 5.5];
    const handicapValue = parseFloat(handicap.value);
    if (!validHandicaps.includes(handicapValue)) {
      return res.status(400).json({ error: 'Tỷ lệ chấp handicap chỉ được chấp nhận là: 0.5, 1.5, 2.5, 3.5, 4.5, 5.5' });
    }
    newHandicap = {
      team: handicap.team,
      value: handicapValue
    };
  }

  let newStatus = status || match.status;
  let parsedHome = homeScore !== undefined ? parseInt(homeScore) : match.homeScore;
  let parsedAway = awayScore !== undefined ? parseInt(awayScore) : match.awayScore;

  if (newStatus === 'live' || newStatus === 'finished') {
    if (parsedHome === null || isNaN(parsedHome)) parsedHome = 0;
    if (parsedAway === null || isNaN(parsedAway)) parsedAway = 0;
  } else {
    parsedHome = null;
    parsedAway = null;
  }

  db.matches[matchIndex] = {
    ...match,
    homeTeam: homeTeam || match.homeTeam,
    awayTeam: awayTeam || match.awayTeam,
    homeFlag: homeFlag || match.homeFlag,
    awayFlag: awayFlag || match.awayFlag,
    matchTime: matchTime || match.matchTime,
    handicap: newHandicap,
    status: newStatus,
    homeScore: parsedHome,
    awayScore: parsedAway
  };

  // Nếu trận đấu kết thúc, tính/tính lại điểm cho tất cả người dự đoán trận này
  if (newStatus === 'finished') {
    db.predictions = db.predictions.map(pred => {
      if (pred.matchId === id) {
        const points = calculatePoints(pred, parsedHome, parsedAway, newHandicap);
        return {
          ...pred,
          ...points
        };
      }
      return pred;
    });
  }

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

// 13. Danh sách người dùng công khai (Dành cho tab Tổng hợp hiển thị tên)
app.get('/api/users', authenticate, (req, res) => {
  const db = readDB();
  const userList = db.users.map(u => ({
    id: u.id,
    username: u.username,
    fullName: u.fullName || u.username
  }));
  res.json(userList);
});

// 14. Danh sách tất cả các dự đoán (Bảo mật: Ẩn dự đoán của người khác ở trận chưa khóa)
app.get('/api/predictions/all', authenticate, (req, res) => {
  const db = readDB();
  const isAdmin = req.user.isAdmin;
  const currentUserId = req.user.id;
  
  const processedPredictions = db.predictions.map(p => {
    const match = db.matches.find(m => m.id === p.matchId);
    const isOwn = p.userId === currentUserId;
    const locked = match ? isMatchLocked(match) : true;
    
    // Ẩn lựa chọn nếu: không phải admin AND không phải dự đoán của chính mình AND trận đấu chưa bị khóa
    const shouldMask = !isAdmin && !isOwn && !locked;
    
    return {
      id: p.id,
      userId: p.userId,
      matchId: p.matchId,
      predictedHandicapWinner: shouldMask ? 'hidden' : p.predictedHandicapWinner,
      pointsTotal: p.pointsTotal
    };
  });
  
  res.json(processedPredictions);
});

// 15. Xuất dữ liệu ra file CSV (Yêu cầu quyền Admin)
app.get('/api/admin/export-csv', authenticate, requireAdmin, (req, res) => {
  const { type } = req.query;
  const db = readDB();
  const csvRows = [];

  if (type === 'leaderboard') {
    const finishedMatches = db.matches.filter(m => m.status === 'finished');
    const finishedMatchesCount = finishedMatches.length;

    // Tính toán số liệu cho mọi user
    const playersData = db.users.map(user => {
      const userPredictions = db.predictions.filter(p => p.userId === user.id);
      
      let correct = 0;
      let incorrect = 0;
      let predictedFinishedCount = 0;

      userPredictions.forEach(p => {
        const match = finishedMatches.find(m => m.id === p.matchId);
        if (match) {
          predictedFinishedCount++;
          const points = calculatePoints(p, match.homeScore, match.awayScore, match.handicap);
          if (points.pointsHandicap === 0) {
            correct++;
          } else {
            incorrect++;
          }
        }
      });

      const unpredicted = finishedMatchesCount - predictedFinishedCount;
      const nhotScore = incorrect + unpredicted;

      return {
        userId: user.id,
        fullName: user.fullName || user.username,
        username: user.username,
        correct,
        incorrect,
        unpredicted,
        nhotScore,
        total: userPredictions.length
      };
    });

    // Tạo bảng xếp hạng Thánh Dự để lấy Hạng Thánh Dự cho mỗi người
    const duRanked = [...playersData].sort((a, b) => {
      if (b.correct !== a.correct) return b.correct - a.correct;
      const aNhot = a.incorrect + a.unpredicted;
      const bNhot = b.incorrect + b.unpredicted;
      if (aNhot !== bNhot) return aNhot - bNhot;
      return a.fullName.localeCompare(b.fullName);
    });

    // Tạo bảng xếp hạng Thánh Nhọ để lấy Hạng Thánh Nhọ cho mỗi người
    const nhotRanked = [...playersData].sort((a, b) => {
      if (b.nhotScore !== a.nhotScore) return b.nhotScore - a.nhotScore;
      if (a.correct !== b.correct) return a.correct - b.correct;
      return a.fullName.localeCompare(b.fullName);
    });

    // Tiêu đề cột
    csvRows.push([
      'Họ và Tên',
      'Tên đăng nhập',
      'Hạng Thánh Dự',
      'Số trận đúng',
      'Hạng Thánh Nhọ',
      'Số trận sai',
      'Số trận không dự đoán',
      'Tổng Nhọ (Sai + Không Đoán)',
      'Tổng số dự đoán'
    ].map(val => `"${val.replace(/"/g, '""')}"`).join(','));

    // Xuất dữ liệu
    playersData.forEach(player => {
      const duRank = duRanked.findIndex(p => p.userId === player.userId) + 1;
      const nhotRank = nhotRanked.findIndex(p => p.userId === player.userId) + 1;

      csvRows.push([
        player.fullName,
        player.username,
        `#${duRank}`,
        player.correct,
        `#${nhotRank}`,
        player.incorrect,
        player.unpredicted,
        player.nhotScore,
        player.total
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
    });

    const csvContent = '\ufeff' + csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bang_xep_hang_wc2026.csv"');
    return res.status(200).send(csvContent);
  } else {
    // Xuất chi tiết tất cả dự đoán (Mặc định)
    csvRows.push([
      'Họ và Tên',
      'Tên đăng nhập',
      'Trận đấu',
      'Thời gian thi đấu',
      'Tỷ lệ handicap',
      'Lựa chọn dự đoán',
      'Tỷ số thực tế',
      'Trạng thái trận',
      'Điểm đạt được'
    ].map(val => `"${val.replace(/"/g, '""')}"`).join(','));

    db.matches.forEach(match => {
      const matchTimeStr = new Date(match.matchTime).toLocaleString('vi-VN');
      const handicapText = match.handicap.team === null || match.handicap.value === 0 
        ? 'Đồng banh (0)' 
        : `${match.handicap.team === 'home' ? match.homeTeam : match.awayTeam} chấp ${match.handicap.value}`;
      const scoreText = match.status === 'pending' ? 'Chưa đá' : `${match.homeScore} - ${match.awayScore}`;
      const statusText = match.status === 'finished' ? 'Đã kết thúc' : match.status === 'live' ? 'Đang đá' : 'Chưa diễn ra';

      db.users.forEach(user => {
        const pred = db.predictions.find(p => p.userId === user.id && p.matchId === match.id);
        const predictionText = pred 
          ? (pred.predictedHandicapWinner === 'home' ? match.homeTeam : match.awayTeam)
          : 'Chưa dự đoán';
        const pointsText = pred 
          ? (match.status === 'finished' ? pred.pointsTotal : 0)
          : 0;

        csvRows.push([
          user.fullName || user.username,
          user.username,
          `${match.homeTeam} vs ${match.awayTeam}`,
          matchTimeStr,
          handicapText,
          predictionText,
          scoreText,
          statusText,
          pointsText
        ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(','));
      });
    });

    const csvContent = '\ufeff' + csvRows.join('\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="chi_tiet_du_doan_wc2026.csv"');
    return res.status(200).send(csvContent);
  }
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
