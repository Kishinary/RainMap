function normalizeText(value) {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

export function getRoadAdvice(message, spots) {
  const question = normalizeText(message);
  const matchingSpots = spots.filter((spot) => {
    const road = normalizeText(spot.name);
    return road && question.includes(road);
  });

  if (!matchingSpots.length) {
    return 'Bạn cho mình biết tên đường hoặc khu vực cụ thể nhé. Mình chỉ tra được các tuyến đang hiển thị trên bản đồ; dữ liệu ở đây là minh hoạ, không phải tình hình giao thông/ngập theo thời gian thực.';
  }

  const road = matchingSpots.reduce((highest, spot) => (
    spot.level > highest.level ? spot : highest
  ));
  let recommendation;

  if (road.level >= 3) {
    recommendation = 'Nên tránh đoạn này và tuyệt đối không cố đi qua chỗ ngập.';
  } else if (road.level >= 2) {
    recommendation = 'Nên chọn tuyến khác nếu có thể; không đi qua chỗ nước sâu hoặc dòng chảy mạnh.';
  } else {
    recommendation = 'Bản đồ minh hoạ chưa cho thấy mức ngập cao, nhưng điều đó không xác nhận đường đang an toàn.';
  }

  return `Với ${road.name}, bản đồ minh hoạ đang ghi mức ${road.level}/3. ${recommendation} Dữ liệu không cập nhật theo thời gian thực—hãy kiểm tra tình hình tại chỗ và thông báo chính thức trước khi đi.`;
}
