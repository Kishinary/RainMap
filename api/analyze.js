import OpenAI from 'openai';
import multer from 'multer';

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 4 * 1024 * 1024 },
  fileFilter: (_req, file, callback) => {
    if (['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(null, true);
      return;
    }

    callback(new Error('Ảnh cần ở định dạng JPG, PNG hoặc WebP.'));
  },
});

function parseMultipart(req, res) {
  return new Promise((resolve, reject) => {
    upload.single('image')(req, res, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}

function clampLevel(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(3, Math.round(numeric)));
}

function clampConfidence(value) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0.5;
  return Math.max(0, Math.min(0.97, numeric));
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

function getFriendlyError(error) {
  if (error?.code === 'LIMIT_FILE_SIZE') {
    return { status: 413, message: 'Ảnh vượt quá dung lượng cho phép (4 MB).' };
  }

  if (error instanceof multer.MulterError) {
    return { status: 400, message: 'Không thể nhận ảnh này. Bạn hãy thử chọn ảnh khác.' };
  }
  if (error?.message?.startsWith('Ảnh cần ở định dạng')) {
    return { status: 400, message: error.message };
  }

  const status = Number(error?.status);
  if (error?.message === 'OPENAI_API_KEY is not configured.') {
    return { status: 503, message: 'Dịch vụ gửi báo cáo chưa được cấu hình.' };
  }
  if (status === 401 || status === 403) {
    return { status: 502, message: 'Dịch vụ phân tích đang gặp sự cố. Vui lòng thử lại sau.' };
  }
  if (status === 429) {
    return { status: 429, message: 'Hệ thống đang bận. Bạn vui lòng gửi lại sau ít phút.' };
  }
  if (status === 404) {
    return { status: 502, message: 'Dịch vụ phân tích chưa sẵn sàng. Vui lòng thử lại sau.' };
  }
  if (status >= 400 && status < 500) {
    return { status: 502, message: 'Chưa xử lý được báo cáo này. Bạn hãy thử lại với nội dung hoặc ảnh khác.' };
  }

  return { status: 500, message: 'Đã xảy ra lỗi khi gửi báo cáo. Vui lòng thử lại sau.' };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Phương thức gửi báo cáo không được hỗ trợ.' });
  }

  try {
    await parseMultipart(req, res);
  } catch (error) {
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }

  const message = String(req.body?.message || '').trim();
  if (!message) {
    return res.status(400).json({ error: 'Bạn hãy nhập mô tả tình hình trước khi gửi.' });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return res.status(503).json({ error: 'Dịch vụ gửi báo cáo chưa được cấu hình.' });
  }

  const model = process.env.OPENAI_MODEL?.trim() || 'gpt-4o-mini';

  try {
    const client = new OpenAI({ apiKey, timeout: 50_000, maxRetries: 0 });
    const content = [
      {
        type: 'text',
        text: `You analyse flood reports for Hanoi. If an image is attached, estimate water level relative to visible objects. If no photo is attached, use the message only.
Message: "${message}"
Return JSON with: objs (short string of reference objects), level (0-3: 0 dry/ankle, 1 under 15 cm, 2 about 15-35 cm, 3 over 35 cm), cm (estimated range as a string, or empty), conf (0-1), street (street name from message, or empty), tlevel (0-3 severity implied by message). Be conservative and lower confidence when evidence is weak.`,
      },
    ];

    if (req.file) {
      content.push({
        type: 'image_url',
        image_url: {
          url: `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`,
        },
      });
    }

    const completion = await client.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are a careful flood-report assistant for Hanoi. Respond in Vietnamese. Return only valid JSON matching the requested schema.',
        },
        { role: 'user', content },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'flood_report',
          strict: true,
          schema: {
            type: 'object',
            properties: {
              objs: { type: 'string' },
              level: { type: 'integer', minimum: 0, maximum: 3 },
              cm: { type: 'string' },
              conf: { type: 'number', minimum: 0, maximum: 1 },
              street: { type: 'string' },
              tlevel: { type: 'integer', minimum: 0, maximum: 3 },
            },
            required: ['objs', 'level', 'cm', 'conf', 'street', 'tlevel'],
            additionalProperties: false,
          },
        },
      },
      temperature: 0.2,
    });

    const rawResult = completion.choices?.[0]?.message?.content;
    if (!rawResult) throw new Error('Empty model response');

    const result = JSON.parse(rawResult);
    const level = clampLevel(result.level);
    const tlevel = clampLevel(result.tlevel);
    const consistent = Math.abs(level - tlevel) <= 1;
    const confidence = clampConfidence(result.conf);

    return res.status(200).json({
      objs: String(result.objs || 'Chưa nhận diện được').trim(),
      level,
      cm: String(result.cm || '').trim(),
      conf: consistent ? confidence : clampConfidence(confidence * 0.6),
      street: String(result.street || '').trim() || 'Chưa xác định',
      tlevel,
      consistent,
      motorbike: getMotorbikeVerdict(level),
      car: getCarVerdict(level),
    });
  } catch (error) {
    console.error('Flood report analysis failed', {
      status: Number.isFinite(Number(error?.status)) ? Number(error.status) : undefined,
      code: error?.code,
      type: error?.type,
    });
    const friendly = getFriendlyError(error);
    return res.status(friendly.status).json({ error: friendly.message });
  }
}
