import { calculatePoints } from './data-store.js';

console.log('=== CHẠY KIỂM THỬ TÍNH ĐIỂM DỰ ĐOÁN HANDICAP ===');

const testCases = [
  // 1. Kiểm thử Handicap chấp 0.5 (Chấp nửa trái)
  {
    name: 'Chấp 0.5 - Chọn cửa trên và cửa trên thắng (1-0) -> Thắng kèo -> 1 điểm',
    pred: { predictedHandicapWinner: 'home' },
    homeScore: 1,
    awayScore: 0,
    handicap: { team: 'home', value: 0.5 },
    expectedHandicapPoints: 1
  },
  {
    name: 'Chấp 0.5 - Chọn cửa trên và hòa (1-1) -> Thua kèo -> 0 điểm',
    pred: { predictedHandicapWinner: 'home' },
    homeScore: 1,
    awayScore: 1,
    handicap: { team: 'home', value: 0.5 },
    expectedHandicapPoints: 0
  },
  {
    name: 'Chấp 0.5 - Chọn cửa dưới và hòa (1-1) -> Thắng kèo -> 1 điểm',
    pred: { predictedHandicapWinner: 'away' },
    homeScore: 1,
    awayScore: 1,
    handicap: { team: 'home', value: 0.5 },
    expectedHandicapPoints: 1
  },

  // 2. Kiểm thử Handicap chấp 0.25 (Đồng nửa)
  {
    name: 'Chấp 0.25 - Chọn cửa trên và cửa trên thắng (1-0) -> Thắng kèo full -> 1 điểm',
    pred: { predictedHandicapWinner: 'home' },
    homeScore: 1,
    awayScore: 0,
    handicap: { team: 'home', value: 0.25 },
    expectedHandicapPoints: 1
  },
  {
    name: 'Chấp 0.25 - Chọn cửa trên và hòa (0-0) -> Thua nửa kèo -> 0 điểm',
    pred: { predictedHandicapWinner: 'home' },
    homeScore: 0,
    awayScore: 0,
    handicap: { team: 'home', value: 0.25 },
    expectedHandicapPoints: 0
  },
  {
    name: 'Chấp 0.25 - Chọn cửa dưới và hòa (0-0) -> Ăn nửa tiền (thắng nửa kèo) -> 1 điểm',
    pred: { predictedHandicapWinner: 'away' },
    homeScore: 0,
    awayScore: 0,
    handicap: { team: 'home', value: 0.25 },
    expectedHandicapPoints: 1
  },

  // 3. Kiểm thử Handicap chấp 0.75 (Nửa một)
  {
    name: 'Chấp 0.75 - Chọn cửa trên và cửa trên thắng 1 bàn (1-0) -> Ăn nửa kèo -> 1 điểm',
    pred: { predictedHandicapWinner: 'home' },
    homeScore: 1,
    awayScore: 0,
    handicap: { team: 'home', value: 0.75 },
    expectedHandicapPoints: 1
  },
  {
    name: 'Chấp 0.75 - Chọn cửa trên và cửa trên thắng 2 bàn (2-0) -> Thắng kèo full -> 1 điểm',
    pred: { predictedHandicapWinner: 'home' },
    homeScore: 2,
    awayScore: 0,
    handicap: { team: 'home', value: 0.75 },
    expectedHandicapPoints: 1
  },
  {
    name: 'Chấp 0.75 - Chọn cửa dưới và cửa trên thắng 1 bàn (1-0) -> Thua nửa kèo -> 0 điểm',
    pred: { predictedHandicapWinner: 'away' },
    homeScore: 1,
    awayScore: 0,
    handicap: { team: 'home', value: 0.75 },
    expectedHandicapPoints: 0
  },

  // 4. Kiểm thử Handicap chấp 1.0 (Chấp 1 trái)
  {
    name: 'Chấp 1.0 - Chọn cửa trên và cửa trên thắng 1 bàn (2-1) -> Hòa kèo -> 0 điểm',
    pred: { predictedHandicapWinner: 'home' },
    homeScore: 2,
    awayScore: 1,
    handicap: { team: 'home', value: 1.0 },
    expectedHandicapPoints: 0
  },
  {
    name: 'Chấp 1.0 - Chọn cửa trên và cửa trên thắng 2 bàn (2-0) -> Thắng kèo full -> 1 điểm',
    pred: { predictedHandicapWinner: 'home' },
    homeScore: 2,
    awayScore: 0,
    handicap: { team: 'home', value: 1.0 },
    expectedHandicapPoints: 1
  }
];

let successCount = 0;

testCases.forEach((tc, index) => {
  const result = calculatePoints(tc.pred, tc.homeScore, tc.awayScore, tc.handicap);
  let failed = false;

  if (result.pointsTotal !== tc.expectedHandicapPoints) {
    console.error(`❌ Thất bại [Trận ${index + 1} - ${tc.name}]: Điểm Handicap mong muốn là ${tc.expectedHandicapPoints}, thực tế là ${result.pointsTotal}`);
    failed = true;
  }

  if (!failed) {
    console.log(`✅ Thành công [Trận ${index + 1} - ${tc.name}]: Điểm nhận được = ${result.pointsTotal}`);
    successCount++;
  }
});

console.log(`\n=== KẾT QUẢ KIỂM THỬ: Đã vượt qua ${successCount}/${testCases.length} trường hợp ===`);
if (successCount === testCases.length) {
  console.log('🎉 TOÀN BỘ LOGIC TÍNH ĐIỂM HOẠT ĐỘNG CHÍNH XÁC!');
} else {
  process.exit(1);
}
