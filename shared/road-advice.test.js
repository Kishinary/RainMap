import assert from 'node:assert/strict';
import test from 'node:test';
import { getRoadAdvice } from './road-advice.js';

const spots = [
  { name: 'Thái Hà', level: 2 },
  { name: 'Nguyễn Xiển', level: 3 },
  { name: 'Tây Mỗ', level: 0 },
];

test('advises avoiding a road with a high illustrative flood level', () => {
  const advice = getRoadAdvice('Đường Nguyễn Xiển thế nào?', spots);

  assert.match(advice, /Nguyễn Xiển/);
  assert.match(advice, /mức 3\/3/);
  assert.match(advice, /Nên tránh/);
  assert.match(advice, /không cập nhật theo thời gian thực/);
});

test('does not describe a low illustrative level as confirmation of safety', () => {
  const advice = getRoadAdvice('Tây Mỗ có nên đi không?', spots);

  assert.match(advice, /không xác nhận đường đang an toàn/);
});

test('asks for a specific road when no displayed road matches', () => {
  const advice = getRoadAdvice('Tôi có nên ra ngoài?', spots);

  assert.match(advice, /tên đường hoặc khu vực cụ thể/);
  assert.match(advice, /không phải tình hình giao thông\/ngập theo thời gian thực/);
});
