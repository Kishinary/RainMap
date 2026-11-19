import { useMemo, useState } from 'react';
import { divIcon } from 'leaflet';
import { MapContainer, TileLayer, CircleMarker, Marker, Popup, Tooltip, ZoomControl, useMap, useMapEvents } from 'react-leaflet';
import { normalizeDepthRange } from '../shared/flood-analysis.js';
import { getRoadAdvice } from '../shared/road-advice.js';

const HANOI_BOUNDS = [
  [20.55, 105.28],
  [21.45, 106.02],
];
const HANOI_CENTER = [21.026, 105.82];
const MIN_MAP_ZOOM = 9;
const MAX_MAP_ZOOM = 17;

const seedSpots = [
  {
    id: 'thai-ha',
    name: 'Thái Hà',
    coords: [21.0224, 105.8239],
    level: 2,
    confidence: 0.72,
    reportCount: 4,
    lastUpdated: 8,
    reports: [
      'Ngập nửa bánh xe, xe máy khó đi',
      'Nước lên tới bánh xe',
      'Cả 2 chiều đường ngập',
    ],
  },
  {
    id: 'to-huu',
    name: 'Tô Hữu',
    coords: [21.0008, 105.8014],
    level: 1,
    confidence: 0.66,
    reportCount: 2,
    lastUpdated: 17,
    reports: ['Vỉa hè ngập thấp, vẫn đi được'],
  },
  {
    id: 'nguyen-xien',
    name: 'Nguyễn Xiển',
    coords: [20.9979, 105.8528],
    level: 3,
    confidence: 0.84,
    reportCount: 3,
    lastUpdated: 12,
    reports: ['Nước ngập bánh xe, ô tô không đi qua'],
  },
  {
    id: 'tay-mo',
    name: 'Tây Mỗ',
    coords: [20.9825, 105.7404],
    level: 0,
    confidence: 0.58,
    reportCount: 1,
    lastUpdated: 32,
    reports: ['Nước rút, còn vài vũng'],
  },
  {
    id: 'tran-duy-hung',
    name: 'Trần Duy Hưng',
    coords: [21.0092, 105.7965],
    level: 2,
    confidence: 0.7,
    reportCount: 2,
    lastUpdated: 22,
    reports: ['Đường bị ngập, xe máy đi chậm'],
  },
];

const centralRoadLocations = [
  { id: 'hoan-kiem', name: 'Đinh Tiên Hoàng', coords: [21.0288, 105.8524] },
  { id: 'le-thai-to', name: 'Lê Thái Tổ', coords: [21.0299, 105.8504] },
  { id: 'hang-khay', name: 'Hàng Khay', coords: [21.0268, 105.8515] },
  { id: 'trang-tien', name: 'Tràng Tiền', coords: [21.0245, 105.855] },
  { id: 'hang-bai', name: 'Hàng Bài', coords: [21.0225, 105.8522] },
  { id: 'ba-trieu', name: 'Bà Triệu', coords: [21.0197, 105.8494] },
  { id: 'pho-hue', name: 'Phố Huế', coords: [21.0146, 105.8506] },
  { id: 'hang-bong', name: 'Hàng Bông', coords: [21.0298, 105.846] },
  { id: 'hang-gai', name: 'Hàng Gai', coords: [21.032, 105.8506] },
  { id: 'hang-dao', name: 'Hàng Đào', coords: [21.0343, 105.8508] },
  { id: 'hang-ngang', name: 'Hàng Ngang', coords: [21.0342, 105.8488] },
  { id: 'hang-duong', name: 'Hàng Đường', coords: [21.0356, 105.8485] },
  { id: 'hang-ma', name: 'Hàng Mã', coords: [21.038, 105.8468] },
  { id: 'hang-chieu', name: 'Hàng Chiếu', coords: [21.0387, 105.8501] },
  { id: 'hang-buom', name: 'Hàng Buồm', coords: [21.0367, 105.8522] },
  { id: 'ma-may', name: 'Mã Mây', coords: [21.0344, 105.8537] },
  { id: 'luong-van-can', name: 'Lương Văn Can', coords: [21.0326, 105.8517] },
  { id: 'cau-go', name: 'Cầu Gỗ', coords: [21.0313, 105.8515] },
  { id: 'hang-trong', name: 'Hàng Trống', coords: [21.0302, 105.8488] },
  { id: 'nha-tho', name: 'Nhà Thờ', coords: [21.0283, 105.8494] },
  { id: 'ly-thuong-kiet', name: 'Lý Thường Kiệt', coords: [21.0221, 105.8464] },
  { id: 'tran-hung-dao', name: 'Trần Hưng Đạo', coords: [21.0188, 105.8466] },
  { id: 'nguyen-du', name: 'Nguyễn Du', coords: [21.016, 105.8429] },
  { id: 'hai-ba-trung', name: 'Hai Bà Trưng', coords: [21.0231, 105.8478] },
  { id: 'tran-binh-trong', name: 'Trần Bình Trọng', coords: [21.0189, 105.8412] },
  { id: 'quang-trung', name: 'Quang Trung', coords: [21.0187, 105.8492] },
  { id: 'yet-kieu', name: 'Yết Kiêu', coords: [21.0177, 105.8407] },
  { id: 'le-duan', name: 'Lê Duẩn', coords: [21.0148, 105.8418] },
  { id: 'phan-boi-chau', name: 'Phan Bội Châu', coords: [21.0253, 105.8414] },
  { id: 'ly-nam-de', name: 'Lý Nam Đế', coords: [21.0358, 105.8398] },
  { id: 'phan-dinh-phung', name: 'Phan Đình Phùng', coords: [21.039, 105.8392] },
  { id: 'hoang-dieu', name: 'Hoàng Diệu', coords: [21.0374, 105.8372] },
  { id: 'dien-bien-phu', name: 'Điện Biên Phủ', coords: [21.031, 105.8384] },
  { id: 'hung-vuong', name: 'Hùng Vương', coords: [21.0351, 105.8343] },
  { id: 'thanh-nien', name: 'Thanh Niên', coords: [21.0487, 105.8368] },
  { id: 'truc-bach', name: 'Trúc Bạch', coords: [21.045, 105.8406] },
  { id: 'pho-duc-chinh', name: 'Phó Đức Chính', coords: [21.0431, 105.8448] },
  { id: 'yen-phu', name: 'Yên Phụ', coords: [21.0475, 105.8438] },
  { id: 'kim-ma', name: 'Kim Mã', coords: [21.0316, 105.8198] },
  { id: 'lieu-giai', name: 'Liễu Giai', coords: [21.0343, 105.8148] },
  { id: 'doi-can', name: 'Đội Cấn', coords: [21.0337, 105.8236] },
  { id: 'giang-vo', name: 'Giảng Võ', coords: [21.0276, 105.8235] },
  { id: 'cat-linh', name: 'Cát Linh', coords: [21.0302, 105.8297] },
  { id: 'ton-duc-thang', name: 'Tôn Đức Thắng', coords: [21.0282, 105.8319] },
  { id: 'nguyen-thai-hoc', name: 'Nguyễn Thái Học', coords: [21.027, 105.8367] },
  { id: 'van-mieu', name: 'Văn Miếu', coords: [21.0262, 105.8352] },
  { id: 'xa-dan', name: 'Xã Đàn', coords: [21.0148, 105.8341] },
  { id: 'giai-phong', name: 'Giải Phóng', coords: [21.0068, 105.8418] },
  { id: 'dai-co-viet', name: 'Đại Cồ Việt', coords: [21.0094, 105.8478] },
  { id: 'bach-mai', name: 'Bạch Mai', coords: [21.0048, 105.849] },
  { id: 'minh-khai', name: 'Minh Khai', coords: [21.0024, 105.8615] },
  { id: 'kim-nguu', name: 'Kim Ngưu', coords: [21.0053, 105.8617] },
  { id: 'lo-duc', name: 'Lò Đúc', coords: [21.0127, 105.856] },
  { id: 'tran-khat-chan', name: 'Trần Khát Chân', coords: [21.0069, 105.8552] },
  { id: 'nguyen-khoai', name: 'Nguyễn Khoái', coords: [21.0043, 105.8638] },
  { id: 'nguyen-trai', name: 'Nguyễn Trãi', coords: [20.9991, 105.8154] },
  { id: 'khuat-duy-tien', name: 'Khuất Duy Tiến', coords: [20.999, 105.7985] },
  { id: 'lang-ha', name: 'Láng Hạ', coords: [21.0135, 105.8182] },
  { id: 'huynh-thuc-khang', name: 'Huỳnh Thúc Kháng', coords: [21.0149, 105.8101] },
  { id: 'thai-thinh', name: 'Thái Thịnh', coords: [21.0128, 105.8185] },
  { id: 'tay-son', name: 'Tây Sơn', coords: [21.0099, 105.8242] },
  { id: 'chua-boc', name: 'Chùa Bộc', coords: [21.0081, 105.8274] },
  { id: 'nguyen-luong-bang', name: 'Nguyễn Lương Bằng', coords: [21.0144, 105.8291] },
  { id: 'hoang-cau', name: 'Hoàng Cầu', coords: [21.0188, 105.8233] },
  { id: 'yen-lang', name: 'Yên Lãng', coords: [21.0162, 105.8147] },
  { id: 'duong-lang', name: 'Đường Láng', coords: [21.0203, 105.8096] },
  { id: 'cau-giay', name: 'Cầu Giấy', coords: [21.0295, 105.7992] },
  { id: 'xuan-thuy', name: 'Xuân Thủy', coords: [21.0368, 105.7824] },
  { id: 'nguyen-chi-thanh', name: 'Nguyễn Chí Thanh', coords: [21.0235, 105.8094] },
  { id: 'tran-duy-hung-road', name: 'Trần Duy Hưng', coords: [21.0085, 105.7972] },
  { id: 'to-huu-road', name: 'Tố Hữu', coords: [20.999, 105.789] },
  { id: 'le-van-luong', name: 'Lê Văn Lương', coords: [21.0057, 105.8018] },
  { id: 'hoang-dao-thuy', name: 'Hoàng Đạo Thúy', coords: [21.0082, 105.8049] },
  { id: 'hoang-minh-giam', name: 'Hoàng Minh Giám', coords: [21.0076, 105.7958] },
  { id: 'nguyen-tuan', name: 'Nguyễn Tuân', coords: [20.9996, 105.8039] },
];

const initialSpots = [
  ...seedSpots,
  ...centralRoadLocations.map((road, index) => ({
    ...road,
    level: (index * 3 + 1) % 4,
    confidence: 0.55 + (index % 5) * 0.08,
    reportCount: (index % 3) + 1,
    lastUpdated: 5 + (index % 40),
    reports: ['Điểm minh hoạ — không phải ghi nhận thực tế.'],
  })),
];

const levelColors = ['#2f9e44', '#f2c94c', '#f2994a', '#eb5757'];

function normalizeStreet(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim();
}

function getColor(level) {
  return levelColors[Math.max(0, Math.min(3, Number(level) || 0))];
}

function getMotorbikeVerdict(level) {
  if (level >= 3) return 'Không nên đi qua';
  if (level >= 2) return 'Nguy hiểm · dễ chết máy';
  return 'Có thể đi qua';
}

function getCarVerdict(level) {
  if (level >= 3) return 'Không nên đi qua';
  if (level >= 2) return 'Đi chậm, thận trọng';
  return 'Có thể đi qua';
}

function makeFallbackAnalysis(overrides = {}) {
  return {
    objs: 'bánh xe máy, người đi bộ',
    level: 2,
    cm: '20-30',
    conf: 0.8,
    street: 'Thái Hà',
    tlevel: 2,
    consistent: true,
    message: 'Kết quả mẫu ngoại tuyến',
    ...overrides,
  };
}

async function prepareImage(file) {
  const imageBitmap = await createImageBitmap(file);
  const scale = Math.min(1, 1024 / Math.max(imageBitmap.width, imageBitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(imageBitmap.width * scale));
  canvas.height = Math.max(1, Math.round(imageBitmap.height * scale));
  canvas.getContext('2d').drawImage(imageBitmap, 0, 0, canvas.width, canvas.height);
  imageBitmap.close();

  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob((result) => {
      if (result) resolve(result);
      else reject(new Error('Không thể xử lý ảnh này. Vui lòng chọn ảnh khác.'));
    }, 'image/jpeg', 0.86);
  });

  return new File([blob], 'flood-report.jpg', { type: 'image/jpeg' });
}

function RoadMarkers({ spots }) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    zoomend() {
      setZoom(map.getZoom());
    },
  });

  const zoomToGroup = (coords) => {
    const nextZoom = Math.min(MAX_MAP_ZOOM, map.getZoom() + 2);
    map.setView(coords, nextZoom, { animate: false });
    setZoom(nextZoom);
  };

  const markers = useMemo(() => {
    const buckets = new Map();
    const gridSize = 72;

    for (const spot of spots) {
      const point = map.project(spot.coords, zoom);
      const bucketKey = `${Math.floor(point.x / gridSize)}:${Math.floor(point.y / gridSize)}`;
      const bucket = buckets.get(bucketKey) || [];
      bucket.push(spot);
      buckets.set(bucketKey, bucket);
    }

    return [...buckets.values()].map((bucket) => {
      if (bucket.length === 1) return bucket[0];

      return {
        id: bucket.map(({ id }) => id).join(':'),
        isCluster: true,
        coords: [
          bucket.reduce((sum, spot) => sum + spot.coords[0], 0) / bucket.length,
          bucket.reduce((sum, spot) => sum + spot.coords[1], 0) / bucket.length,
        ],
        spots: bucket,
      };
    });
  }, [map, spots, zoom]);

  return markers.map((marker) => {
    if (marker.isCluster) {
      const count = marker.spots.length;
      const icon = divIcon({
        className: 'road-cluster-icon',
        html: `<span>${count}</span>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      return (
        <Marker
          key={marker.id}
          position={marker.coords}
          icon={icon}
          eventHandlers={{
            click: () => zoomToGroup(marker.coords),
          }}
        >
          <Tooltip>{`${count} grouped sample locations · click to zoom in`}</Tooltip>
          <Popup>
            <div className="popup-card">
              <h4>{count} grouped sample locations</h4>
              <p>Zoom in to separate these illustrative map pins.</p>
              <button
                className="cluster-zoom-button"
                onClick={() => zoomToGroup(marker.coords)}
                type="button"
              >
                Zoom in to separate
              </button>
              <ul>
                {marker.spots.map((spot) => (
                  <li key={spot.id}>{spot.name} · Level {spot.level}</li>
                ))}
              </ul>
            </div>
          </Popup>
        </Marker>
      );
    }

    return (
      <CircleMarker
        key={marker.id}
        center={marker.coords}
        radius={Math.max(7, marker.confidence * 11 + 3)}
        pathOptions={{
          color: 'white',
          fillColor: getColor(marker.level),
          fillOpacity: 0.8,
          weight: 2,
        }}
      >
        <Tooltip direction="top" permanent={false}>
          {marker.name} · Level {marker.level}
        </Tooltip>
        <Popup>
          <div className="popup-card">
            <h4>{marker.name}</h4>
            <p>Level: {marker.level}</p>
            <p>Motorbike verdict: {getMotorbikeVerdict(marker.level)}</p>
            <p>Car verdict: {getCarVerdict(marker.level)}</p>
            <p>Confidence: {marker.confidence.toFixed(2)}</p>
            <p>Reports: {marker.reportCount}</p>
            <p>Last update: {marker.lastUpdated} min ago</p>
            <ul>
              {marker.reports.map((report, index) => (
                <li key={`${marker.id}-${index}`}>{report}</li>
              ))}
            </ul>
          </div>
        </Popup>
      </CircleMarker>
    );
  });
}

function MapHomeControl() {
  const map = useMap();

  return (
    <button
      className="map-home-button"
      onClick={() => map.flyTo(HANOI_CENTER, 12, { duration: 0.6 })}
      type="button"
    >
      <span aria-hidden="true">⌖</span>
      Về trung tâm
    </button>
  );
}

export default function App() {
  const [spots, setSpots] = useState(initialSpots);
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: 'Xin chào! Hãy hỏi về một tuyến đường ở Hà Nội, ví dụ: “Có nên đi qua Thái Hà không?”',
    },
  ]);
  const [chatMessage, setChatMessage] = useState('');
  const [message, setMessage] = useState('Đường Thái Hà ngập gần nửa bánh xe, xe máy khó đi');
  const [image, setImage] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [status, setStatus] = useState('Bản đồ đang hiển thị các điểm minh hoạ.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const mapCenter = useMemo(() => HANOI_CENTER, []);
  const depthEstimate = normalizeDepthRange(analysis?.cm);
  const todayLabel = useMemo(
    () => new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date()),
    [],
  );

  const handleChatSubmit = (event) => {
    event.preventDefault();
    const question = chatMessage.trim();
    if (!question) return;

    setChatMessages((messages) => [
      ...messages,
      { role: 'user', text: question },
      { role: 'assistant', text: getRoadAdvice(question, spots) },
    ]);
    setChatMessage('');
  };

  const handleAnalyze = async () => {
    if (!message.trim()) {
      setStatus('Bạn hãy mô tả tình hình trước khi gửi nhé.');
      return;
    }

    setIsSubmitting(true);
    setStatus('Đang gửi báo cáo…');

    try {
      const payload = new FormData();
      payload.append('message', message.trim());
      if (image) payload.append('image', await prepareImage(image));

      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: payload,
      });

      const data = await response.json();
      if (!response.ok) {
        const errorMessage = response.status === 413
          ? 'Ảnh hơi nặng. Bạn hãy chọn ảnh nhỏ hơn 4 MB nhé.'
          : response.status === 429
            ? 'Hệ thống đang bận. Bạn thử gửi lại sau ít phút nhé.'
            : response.status === 502 || response.status === 503
              ? 'Dịch vụ gửi báo cáo tạm thời chưa dùng được. Bạn thử lại sau nhé.'
              : 'Chưa gửi được báo cáo. Bạn kiểm tra lại nội dung rồi thử lại nhé.';
        throw new Error(errorMessage);
      }

      setAnalysis(data);
      setStatus(data?.consistent === false
        ? 'Báo cáo đã xử lý · ảnh và mô tả chưa khớp'
        : 'Đã xử lý báo cáo');
    } catch (error) {
      setStatus(error instanceof TypeError
        ? 'Không kết nối được để gửi báo cáo. Bạn kiểm tra mạng rồi thử lại nhé.'
        : error?.message || 'Chưa gửi được báo cáo. Bạn thử lại nhé.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLoadSample = () => {
    const sample = makeFallbackAnalysis({
      objs: 'bánh xe máy, người đi bộ',
      level: 2,
      cm: '20-30',
      conf: 0.82,
      street: 'Thái Hà',
      tlevel: 2,
      consistent: true,
      message: 'Kết quả mẫu ngoại tuyến',
    });
    setAnalysis(sample);
    setStatus('Đang xem báo cáo minh hoạ');
  };

  const handleAddToMap = () => {
    if (!analysis?.street) return;

    const streetName = analysis.street.trim() || 'Unknown street';
    const points = [...spots];
    const index = points.findIndex((spot) => normalizeStreet(spot.name) === normalizeStreet(streetName));

    if (index < 0) {
      setStatus(`Chưa tìm thấy ${streetName} trong danh sách đường minh hoạ.`);
      return;
    }

    const nextSpot = {
      id: streetName.toLowerCase().replace(/\s+/g, '-'),
      name: streetName,
      coords: points[index].coords,
      level: Number(analysis.level) || 0,
      confidence: Number(analysis.conf) || 0,
      reportCount: points[index].reportCount + 1,
      lastUpdated: 1,
      reports: [analysis.message || 'Ghi nhận cộng đồng', ...points[index].reports],
    };

    points[index] = nextSpot;
    setSpots(points);

    setStatus(`Đã cập nhật điểm minh hoạ ở ${streetName}.`);
  };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 42 42" role="presentation">
              <path d="M21 5C16.2 12.2 10 18.3 10 25.1a11 11 0 0 0 22 0C32 18.3 25.8 12.2 21 5Z" />
              <path d="M15.5 26.5c.3 3.2 2.2 5.2 5.4 5.7" />
            </svg>
          </div>
          <div>
            <p className="eyebrow">THÔNG TIN MƯA NGẬP · HÀ NỘI</p>
            <h1>Bản đồ mưa <span>Hà Nội</span></h1>
          </div>
        </div>
        <div className="header-status">
          <div className="date-stamp">{todayLabel}</div>
        </div>
      </header>

      <main className="layout">
        <section className="panel form-panel">
          <div className="section-kicker"><span>01</span> CHIA SẺ TÌNH HÌNH</div>
          <h2>Báo đường đang ngập</h2>
          <p className="section-intro">Gửi thông tin về đoạn đường ngập để mọi người tham khảo trước khi ra đường.</p>
          <label className="label" htmlFor="flood-message">Đường ngập ở đâu, tình hình thế nào?</label>
          <textarea
            id="flood-message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={4}
            placeholder="Ví dụ: Phố Thái Hà ngập gần nửa bánh xe, xe máy đi khó."
          />

          <label className="label" htmlFor="flood-photo">Ảnh chụp tại chỗ <span className="optional-label">nếu có</span></label>
          <input
            id="flood-photo"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={(event) => setImage(event.target.files?.[0] || null)}
          />
          <p className="privacy-note">Nếu ảnh có mặt người hoặc biển số, vui lòng che trước khi gửi.</p>

          <div className="actions-row">
            <button className="primary" onClick={handleAnalyze} disabled={isSubmitting}>
              {isSubmitting ? 'Đang gửi báo cáo…' : 'Gửi báo cáo'}
            </button>
            <button className="secondary" onClick={handleLoadSample} type="button">
              Xem báo cáo minh hoạ
            </button>
          </div>

          <div className="disclaimer-box">
            <span className="disclaimer-icon" aria-hidden="true">!</span>
            <div><strong>Lưu ý về dữ liệu</strong>Đây là bản thử nghiệm. Các điểm trên bản đồ được dựng để minh hoạ, không phải tình hình ngập thực tế.</div>
          </div>

          {analysis && (
            <div className="result-card">
              <div className="result-header">
                <h3>Thông tin báo cáo</h3>
                <span className={`confidence-badge ${analysis.conf >= 0.7 ? 'good' : 'warn'}`}>
                  Độ tin cậy {Math.round(Number(analysis.conf || 0) * 100)}%
                </span>
              </div>

              <div className="meta-grid">
                <div><span>Đường</span><strong>{analysis.street || 'Chưa xác định'}</strong></div>
                <div><span>Mực nước ước tính</span><strong>{depthEstimate ? `${depthEstimate} cm` : 'Chưa rõ'}</strong></div>
                <div><span>Nhận định từ ảnh</span><strong>{analysis.level}/3</strong></div>
                <div><span>Nhận định từ mô tả</span><strong>{analysis.tlevel}/3</strong></div>
              </div>

              <p><strong>Chi tiết nhận diện:</strong> {analysis.objs || 'Chưa nhận diện được'}</p>
              <p><strong>Xe máy:</strong> {getMotorbikeVerdict(Number(analysis.level) || 0)}</p>
              <p><strong>Ô tô:</strong> {getCarVerdict(Number(analysis.level) || 0)}</p>

              {analysis.consistent === false && (
                <div className="warning-box">
                  Thông tin trong ảnh và phần mô tả chưa trùng khớp. Bạn nên kiểm tra lại báo cáo này.
                </div>
              )}

              <button className="primary add-button" onClick={handleAddToMap}>
                Cập nhật điểm minh hoạ
              </button>
            </div>
          )}
        </section>

        <section className="panel map-panel">
          <div className="map-header">
            <div className="map-title-group">
              <div className="section-kicker"><span>02</span> THEO DÕI KHU VỰC</div>
              <h2>Các tuyến đường Hà Nội</h2>
              <span className="road-count">{spots.length} điểm minh hoạ · phóng to để xem chi tiết</span>
            </div>
            <span className="sample-tag"><span /> ĐIỂM MINH HOẠ</span>
          </div>

          <div className="map-frame">
            <MapContainer
              center={mapCenter}
              zoom={12}
              minZoom={MIN_MAP_ZOOM}
              maxZoom={MAX_MAP_ZOOM}
              maxBounds={HANOI_BOUNDS}
              maxBoundsViscosity={1}
              zoomControl={false}
              scrollWheelZoom
              className="map-container"
            >
              <TileLayer
                attribution='&copy; OpenStreetMap contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <ZoomControl position="topleft" zoomInTitle="Phóng to" zoomOutTitle="Thu nhỏ" />
              <RoadMarkers spots={spots} />
              <MapHomeControl />
            </MapContainer>
            <div className="map-coordinates" aria-hidden="true">21°01′ N<br />105°49′ E</div>
          </div>
          <div className="map-footer">
            <div className="legend">
              <span><i className="legend-dot level-0" /> Thấp</span>
              <span><i className="legend-dot level-1" /> Vừa</span>
              <span><i className="legend-dot level-2" /> Cao</span>
              <span><i className="legend-dot level-3" /> Rất cao</span>
            </div>
            <span className="map-boundary-note">Giới hạn bản đồ: Hà Nội</span>
          </div>
          <div className="map-status-line"><span /> {status}</div>

          <section className="chat-assistant" aria-labelledby="chat-title">
            <div className="chat-heading">
              <div>
                <div className="section-kicker"><span>03</span> HỎI ĐÁP ĐƯỜNG ĐI</div>
                <h3 id="chat-title">Trợ lý đi đường</h3>
              </div>
              <span className="chat-mode">Tư vấn từ bản đồ</span>
            </div>
            <p className="chat-note">Hỏi về một tuyến đường để xem mức ngập đang hiển thị và gợi ý thận trọng.</p>
            <div className="chat-transcript" aria-live="polite" aria-label="Tin nhắn với trợ lý">
              {chatMessages.map((chat, index) => (
                <div className={`chat-message ${chat.role}`} key={`${chat.role}-${index}`}>
                  {chat.text}
                </div>
              ))}
            </div>
            <form className="chat-form" onSubmit={handleChatSubmit}>
              <label className="visually-hidden" htmlFor="road-question">Hỏi về tuyến đường</label>
              <input
                id="road-question"
                value={chatMessage}
                onChange={(event) => setChatMessage(event.target.value)}
                placeholder="Ví dụ: Có nên đi qua Nguyễn Xiển?"
                autoComplete="off"
              />
              <button className="primary" type="submit" disabled={!chatMessage.trim()}>Gửi</button>
            </form>
            <p className="chat-disclaimer">Các điểm và mức ngập đều là dữ liệu minh hoạ, không phải thông tin thời gian thực. Không coi câu trả lời là xác nhận đường an toàn; hãy theo dõi cảnh báo chính thức và tránh đi vào vùng ngập.</p>
          </section>
        </section>
      </main>
      <footer className="page-footer">
        <span>BẢN ĐỒ MƯA HÀ NỘI</span>
        <span>Thông tin tham khảo · Không thay thế cảnh báo chính thức</span>
      </footer>
    </div>
  );
}
