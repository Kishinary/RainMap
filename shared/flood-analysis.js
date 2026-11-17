export function clampLevel(value, fallback = 0) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(0, Math.min(3, Math.round(numeric)));
}

export function clampConfidence(value, fallback = 0.5) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  const clamped = Math.max(0, Math.min(0.97, numeric));
  return Math.round(clamped * 100) / 100;
}

export function normalizeDepthRange(value) {
  const rawValue = String(value ?? '').trim();
  if (/^-\s*\d/.test(rawValue)) return '';

  const matches = rawValue.match(/\d+(?:[.,]\d+)?/g);
  if (!matches?.length) return '';

  const values = matches
    .slice(0, 2)
    .map((match) => Math.round(Number(match.replace(',', '.'))))
    .filter((number) => Number.isFinite(number) && number >= 0 && number <= 500);

  if (!values.length) return '';
  if (values.length === 1) return String(values[0]);

  const [minimum, maximum] = values.sort((left, right) => left - right);
  return minimum === maximum ? String(minimum) : `${minimum}-${maximum}`;
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

export function normalizeFloodAnalysis(result = {}) {
  const level = clampLevel(result.level);
  const tlevel = clampLevel(result.tlevel, level);
  const consistent = Math.abs(level - tlevel) <= 1;
  const confidence = clampConfidence(result.conf);

  return {
    objs: String(result.objs || 'Chưa nhận diện được').trim(),
    level,
    cm: normalizeDepthRange(result.cm),
    conf: consistent ? confidence : clampConfidence(confidence * 0.6),
    street: String(result.street || '').trim() || 'Chưa xác định',
    tlevel,
    consistent,
    motorbike: getMotorbikeVerdict(level),
    car: getCarVerdict(level),
  };
}
