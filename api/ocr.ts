interface VercelRequestLike {
  method?: string;
  body?: any;
}

interface VercelResponseLike {
  setHeader(name: string, value: string): void;
  status(code: number): VercelResponseLike;
  json(value: any): VercelResponseLike;
}

const PROMPT = `คุณเป็นระบบวิเคราะห์และดึงข้อมูลใบเสร็จรับเงินอัจฉริยะ (Receipt OCR AI)
ให้อ่านไฟล์ภาพหรือ PDF ของใบเสร็จนี้ และสกัดข้อมูลออกมาตอบกลับเป็น JSON เท่านั้น:
{
  "merchant": "ชื่อร้านค้า หรือผู้ให้บริการ",
  "date": "วันที่ทำรายการ รูปแบบ YYYY-MM-DD",
  "invoiceId": "เลขที่ใบเสร็จ หรือเลขที่ใบกำกับภาษี (ถ้ามี)",
  "taxId": "เลขประจำตัวผู้เสียภาษี 13 หลัก (ถ้ามี)",
  "amount": 0.00,
  "hasVat": true,
  "vat": 0.00,
  "confidence": 95,
  "items": [{ "name": "ชื่อรายการสินค้าหรือบริการ", "price": 0.00 }]
}
ข้อกำหนด:
1. amount และ vat เป็น number เท่านั้น
2. หากมี VAT/ภาษีมูลค่าเพิ่ม/Tax ID/ใบกำกับภาษี ให้ hasVat=true และถ้าไม่มียอด VAT แยก ให้คำนวณ round(amount*7/107,2)
3. หากเป็นภาพใบเสร็จแต่ข้อมูลบางส่วนอ่านไม่พบ ให้ใช้ข้อมูลที่มองเห็นได้และอย่าแต่งข้อมูลที่ไม่มีหลักฐาน
4. ตอบเฉพาะ JSON เท่านั้น`;

function normalizeMime(value: unknown, data: string): string {
  let mime = typeof value === 'string' ? value.toLowerCase().trim() : '';
  if (mime === 'image/jpg' || mime === 'pjpeg') mime = 'image/jpeg';
  if (!mime || mime === 'application/octet-stream') {
    if (data.startsWith('JVBER')) return 'application/pdf';
    if (data.startsWith('/9j/')) return 'image/jpeg';
    if (data.startsWith('iVBORw')) return 'image/png';
    if (data.startsWith('R0lGOD')) return 'image/gif';
    if (data.startsWith('UklGR')) return 'image/webp';
    return 'image/jpeg';
  }
  return mime;
}

function stripDataUrl(value: string): string {
  const comma = value.indexOf(',');
  if (comma >= 0 && value.slice(0, comma).includes(';base64')) {
    return value.slice(comma + 1);
  }
  return value.replace(/\s/g, '');
}

export default async function handler(req: VercelRequestLike, res: VercelResponseLike) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        success: false,
        error: 'GEMINI_API_KEY is not configured on Vercel.'
      });
    }

    let { fileData, mimeType } = req.body || {};
    if (typeof fileData !== 'string' || !fileData.trim()) {
      return res.status(400).json({ success: false, error: 'Missing fileData' });
    }

    // The browser normally sends a base64 data URL. Keep this endpoint
    // self-contained so it works on Vercel without the Express server.ts.
    if (/^(https?|blob):\/\//i.test(fileData)) {
      const fetched = await fetch(fileData);
      if (!fetched.ok) {
        return res.status(400).json({ success: false, error: `Cannot read uploaded file (${fetched.status}).` });
      }
      mimeType = fetched.headers.get('content-type') || mimeType;
      const buffer = Buffer.from(await fetched.arrayBuffer());
      fileData = buffer.toString('base64');
    }

    const base64Data = stripDataUrl(fileData);
    const cleanMime = normalizeMime(mimeType, base64Data);

    if (!base64Data) {
      return res.status(400).json({ success: false, error: 'Invalid file data' });
    }

    // Gemini 2.0 Flash is no longer available for this project. Use the
    // current Gemini 3.6 Flash model for multimodal OCR.
    const models = ['gemini-3.6-flash'];
    let lastError = 'Gemini AI ไม่สามารถประมวลผลเอกสารได้';

    for (const model of models) {
      try {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{
                parts: [
                  { inline_data: { mime_type: cleanMime, data: base64Data } },
                  { text: PROMPT }
                ]
              }],
              generationConfig: { responseMimeType: 'application/json' }
            })
          }
        );

        const bodyText = await response.text();
        let body: any = null;
        try { body = bodyText ? JSON.parse(bodyText) : null; } catch { body = null; }

        if (!response.ok) {
          lastError = body?.error?.message || `Gemini returned ${response.status}`;
          continue;
        }

        const text = body?.candidates?.[0]?.content?.parts
          ?.map((part: any) => part?.text || '')
          .join('')
          .trim();

        if (!text) {
          lastError = 'Gemini ไม่ส่งข้อมูล OCR กลับมา';
          continue;
        }

        const cleaned = text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        let parsed: any;
        try {
          parsed = JSON.parse(cleaned);
        } catch {
          lastError = 'Gemini ส่งผลลัพธ์ที่ไม่ใช่ JSON';
          continue;
        }

        return res.status(200).json({ success: true, data: parsed });
      } catch (error: any) {
        lastError = error?.message || lastError;
      }
    }

    return res.status(502).json({ success: false, error: lastError });
  } catch (error: any) {
    console.error('Vercel OCR error:', error);
    return res.status(500).json({
      success: false,
      error: error?.message || 'เกิดข้อผิดพลาดในการประมวลผล OCR'
    });
  }
}
