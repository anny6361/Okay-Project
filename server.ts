import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { adminDb } from "./src/lib/firebase-admin.ts";

dotenv.config();

// Robust detection of production mode in both ESM (tsx) and bundled CJS (dist/server.cjs) environments
const isProd = process.env.NODE_ENV === "production" || 
  (typeof __filename !== "undefined" && (__filename.includes("dist") || __filename.endsWith(".cjs")));

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// --- SYNC ENGINE (Production Database via Firestore + SSE Real-time) ---

// SSE Clients
const clients = new Set<express.Response>();

app.get('/api/events', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  
  // Send initial heartbeat
  res.write(': heartbeat\n\n');
  
  clients.add(res);
  req.on('close', () => clients.delete(res));
});

function notifyClients(collection: string, data: any) {
  const msg = JSON.stringify({ collection, data });
  for (const client of clients) {
    client.write(`data: ${msg}\n\n`);
  }
}

const COLLECTIONS = [
  'okey_db_users', 'okey_db_rules', 'okey_db_logs', 'okey_db_departments',
  'okey_db_refunds', 'okey_db_deductions', 'okey_db_journal_entries',
  'okey_db_accounting_docs', 'okey_db_company_data', 'okey_db_categories_master',
  'okey_db_expense_types', 'okey_db_approval_levels', 'okey_db_roles_master',
  'okey_db_pdf_templates', 'okey_db_enterprise_audit_logs', 'okey_db_replacement_policy',
  'okey_requests', 'okey_budgets'
];

app.get('/api/sync', async (req, res) => {
  try {
    const data: any = {};
    // Load all collections concurrently for speed
    const promises = COLLECTIONS.map(async (col) => {
      const doc = await adminDb.collection('okey_erp').doc(col).get();
      if (doc.exists) {
        data[col] = doc.data()?.items;
      } else {
        data[col] = null;
      }
    });
    await Promise.all(promises);
    res.json({ success: true, data });
  } catch (err: any) {
    console.error("Sync GET error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/sync', async (req, res) => {
  try {
    const { collection, data } = req.body;
    if (!collection || !data) {
      return res.status(400).json({ success: false, error: "Missing collection or data" });
    }
    
    // Save to Firestore (Production Database)
    await adminDb.collection('okey_erp').doc(collection).set({ items: data }, { merge: true });
    
    // Broadcast to other users in real-time
    notifyClients(collection, data);
    
    res.json({ success: true });
  } catch (err: any) {
    console.error("Sync POST error:", err);
    res.status(500).json({ success: false, error: err.message });
  }
});
// ------------------------------------------------------------------------

// Lazily get Gemini Client to prevent crash on startup if GEMINI_API_KEY is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// API endpoint for OCR scanning
app.post("/api/ocr", async (req, res) => {
  try {
    let { fileData, mimeType } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, error: "Missing fileData" });
    }

    // Handle remote HTTP/HTTPS/BLOB URLs if passed
    if (typeof fileData === 'string' && (fileData.startsWith('http://') || fileData.startsWith('https://') || fileData.startsWith('blob:'))) {
      try {
        const fetchRes = await fetch(fileData);
        if (fetchRes.ok) {
          const contentType = fetchRes.headers.get('content-type');
          if (contentType && (!mimeType || mimeType === 'application/octet-stream')) {
            mimeType = contentType.split(';')[0];
          }
          const arrayBuffer = await fetchRes.arrayBuffer();
          fileData = Buffer.from(arrayBuffer).toString("base64");
        }
      } catch (fetchErr) {
        console.warn("Failed to fetch remote image URL in /api/ocr:", fetchErr);
      }
    }

    if (typeof fileData === 'string') {
      if (fileData.includes(",")) {
        const parts = fileData.split(",");
        if (parts[0].includes(';base64') && parts[0].includes('data:')) {
          const matchedMime = parts[0].match(/data:(.*?);/);
          if (matchedMime && matchedMime[1]) {
            mimeType = matchedMime[1];
          }
        }
        fileData = parts[1];
      }
    }

    // Clean base64 string safely
    const cleanBase64 = typeof fileData === 'string'
      ? Buffer.from(fileData.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''), 'base64').toString('base64')
      : '';

    if (!cleanBase64) {
      return res.status(400).json({ success: false, error: "Invalid image or base64 file data" });
    }

    // Normalize MIME type to standard IANA values
    let cleanMime = (mimeType || 'image/jpeg').toLowerCase().trim();
    if (cleanMime === 'image/jpg' || cleanMime === 'pjpeg') cleanMime = 'image/jpeg';
    if (!cleanMime || cleanMime === 'application/octet-stream') {
      if (cleanBase64.startsWith('/9j/')) cleanMime = 'image/jpeg';
      else if (cleanBase64.startsWith('iVBORw')) cleanMime = 'image/png';
      else if (cleanBase64.startsWith('JVBER')) cleanMime = 'application/pdf';
      else if (cleanBase64.startsWith('R0lGOD')) cleanMime = 'image/gif';
      else if (cleanBase64.startsWith('UklGR')) cleanMime = 'image/webp';
      else cleanMime = 'image/jpeg';
    }

    const ai = getGeminiClient();

    const filePart = {
      inlineData: {
        mimeType: cleanMime,
        data: cleanBase64
      }
    };

    const promptText = `คุณเป็นระบบวิเคราะห์และดึงข้อมูลใบเสร็จรับเงินอัจฉริยะ (Receipt OCR AI)
ให้อ่านไฟล์ภาพหรือ PDF ของใบเสร็จนี้ และสกัดข้อมูลออกมาตอบกลับในรูปแบบ JSON เท่านั้น ดังนี้:
{
  "merchant": "ชื่อร้านค้า หรือผู้ให้บริการ (เช่น Grab, PTT, AWS, Starbucks, 7-Eleven, MK, เซเว่น)",
  "date": "วันที่ทำรายการ รูปแบบ YYYY-MM-DD (เช่น 2026-08-11)",
  "invoiceId": "เลขที่ใบเสร็จ หรือ เลขที่ใบกำกับภาษี / Receipt No. (ถ้ามี)",
  "taxId": "เลขประจำตัวผู้เสียภาษี 13 หลัก (ถ้ามี)",
  "amount": 0.00, // จำนวนเงินรวมสุทธิ Total Amount (ตัวเลขเท่านั้น)
  "hasVat": true, // true หากเป็นใบกำกับภาษี หรือมี VAT 7% หรือมี taxId
  "vat": 0.00, // ภาษีมูลค่าเพิ่ม VAT 7% (ถ้าไม่แยกยอดชัดเจน แต่มี VAT ให้คำนวณ = round(amount * 7 / 107, 2))
  "confidence": 95, // ความมั่นใจของ AI 0-100
  "items": [
    { "name": "ชื่อรายการสินค้าหรือบริการ", "price": 0.00 }
  ]
}
ข้อกำหนดเพิ่มเติม:
1. amount และ vat ต้องเป็นตัวเลขเท่านั้น (number)
2. หากเป็นใบกำกับภาษี/มี Tax ID หรือมี VAT 7% ให้กำหนด "hasVat": true และหากไม่มีแยกยอด vat ไว้ ให้คำนวณ vat = round(amount * 7 / 107, 2)
3. หากเป็นภาพใบเสร็จแต่หาข้อมูลไม่พบ ให้ประเมินชื่อร้านและยอดเงินจากตัวเลขรวมที่เด่นชัดที่สุดในภาพ
4. ตอบเฉพาะข้อความ JSON เท่านั้น ห้ามมีคำอธิบายอื่นนอกเหนือจาก JSON`;

    let response = null;
    const primaryModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
    let lastError: any = null;

    for (const modelName of primaryModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [filePart, promptText],
          config: {
            responseMimeType: "application/json"
          }
        });
        if (response && response.text) break;
      } catch (mErr: any) {
        lastError = mErr;
        console.warn(`Model ${modelName} failed for OCR:`, mErr?.message || mErr);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("Gemini AI ไม่สามารถประมวลผลข้อมูลจากรูปภาพนี้ได้");
    }

    const cleanJson = response.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanJson);

    return res.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error("OCR error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "เกิดข้อผิดพลาดในการประมวลผลข้อมูลจากใบเสร็จด้วย AI" 
    });
  }
});

// API endpoint for Thai ID Card OCR scanning
app.post("/api/idcard-ocr", async (req, res) => {
  try {
    let { fileData, mimeType } = req.body;
    if (!fileData) {
      return res.status(400).json({ success: false, error: "Missing fileData" });
    }

    if (typeof fileData === 'string') {
      if (fileData.includes(",")) {
        const parts = fileData.split(",");
        if (parts[0].includes(';base64') && parts[0].includes('data:')) {
          const matchedMime = parts[0].match(/data:(.*?);/);
          if (matchedMime && matchedMime[1]) {
            mimeType = matchedMime[1];
          }
        }
        fileData = parts[1];
      }
    }

    const cleanBase64 = typeof fileData === 'string'
      ? Buffer.from(fileData.replace(/-/g, '+').replace(/_/g, '/').replace(/\s/g, ''), 'base64').toString('base64')
      : '';

    if (!cleanBase64) {
      return res.status(400).json({ success: false, error: "Invalid image or base64 file data" });
    }

    let cleanMime = (mimeType || 'image/jpeg').toLowerCase().trim();
    if (cleanMime === 'image/jpg' || cleanMime === 'pjpeg') cleanMime = 'image/jpeg';
    if (!cleanMime || cleanMime === 'application/octet-stream') {
      if (cleanBase64.startsWith('/9j/')) cleanMime = 'image/jpeg';
      else if (cleanBase64.startsWith('iVBORw')) cleanMime = 'image/png';
      else cleanMime = 'image/jpeg';
    }

    const ai = getGeminiClient();

    const filePart = {
      inlineData: {
        mimeType: cleanMime,
        data: cleanBase64
      }
    };

    const promptText = `คุณเป็นระบบ AI อ่านและสกัดข้อมูลจากบัตรประจำตัวประชาชนไทย (Thai National ID Card Scanner)
ให้อ่านไฟล์ภาพบัตรประชาชนและส่งคืนผลลัพธ์เป็น JSON เท่านั้น ดังนี้:
{
  "idCard": "เลขประจำตัวประชาชน 13 หลัก (ตัวเลขล้วน)",
  "title": "คำนำหน้าชื่อ (นาย, นาง, นางสาว)",
  "firstName": "ชื่อจริงภาษาไทย",
  "lastName": "นามสกุลภาษาไทย",
  "birthDate": "วันเกิด ค.ศ. รูปแบบ YYYY-MM-DD (หากในบัตรเป็น พ.ศ. ให้แปลงเป็น ค.ศ. โดยลบ 543)",
  "gender": "male หรือ female",
  "address": "ที่อยู่ตามบัตรประชาชน"
}
ตอบเฉพาะข้อความ JSON เท่านั้น ห้ามมีคำอธิบายอื่น`;

    let response = null;
    const primaryModels = ["gemini-3.6-flash", "gemini-flash-latest", "gemini-3.1-pro-preview"];
    let lastError: any = null;

    for (const modelName of primaryModels) {
      try {
        response = await ai.models.generateContent({
          model: modelName,
          contents: [filePart, promptText],
          config: {
            responseMimeType: "application/json"
          }
        });
        if (response && response.text) break;
      } catch (mErr: any) {
        lastError = mErr;
        console.warn(`Model ${modelName} failed for ID card OCR:`, mErr?.message || mErr);
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("AI ไม่สามารถอ่านข้อมูลจากภาพบัตรประชาชนนี้ได้");
    }

    const cleanJson = response.text.replace(/```json/gi, "").replace(/```/g, "").trim();
    const parsedData = JSON.parse(cleanJson);
    return res.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error("ID Card OCR error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "เกิดข้อผิดพลาดในการอ่านบัตรประชาชนด้วย AI" 
    });
  }
});

// Setup Vite or static serving
async function initServer() {
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

initServer();
