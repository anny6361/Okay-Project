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
    const { fileData, mimeType } = req.body;
    if (!fileData || !mimeType) {
      return res.status(400).json({ success: false, error: "Missing fileData or mimeType" });
    }

    const ai = getGeminiClient();

    // Prepare file data inline representation
    const filePart = {
      inlineData: {
        mimeType,
        data: fileData
      }
    };

    const promptPart = {
      text: "คุณเป็นระบบวิเคราะห์และดึงข้อมูลใบเสร็จรับเงินอัจฉริยะ (Receipt OCR AI) ให้อ่านไฟล์ภาพหรือ PDF ของใบเสร็จนี้ และสกัดข้อมูลสำคัญตามโครงสร้าง JSON Schema ที่กำหนดอย่างเที่ยงตรงที่สุด หากฟิลด์ใดหาไม่เจอหรืออ่านไม่ได้ให้ข้ามไปหรือใช้ค่าเริ่มต้นที่เหมาะสม"
    };

    // Call Gemini
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: { parts: [filePart, promptPart] },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            merchant: { type: Type.STRING, description: "ชื่อร้านค้า เช่น Grab, AWS, Starbucks" },
            date: { type: Type.STRING, description: "วันที่ทำรายการ รูปแบบ YYYY-MM-DD เช่น 2026-07-02" },
            invoiceId: { type: Type.STRING, description: "เลขใบเสร็จ / เลขที่ใบกำกับภาษี" },
            taxId: { type: Type.STRING, description: "เลขประจำตัวผู้เสียภาษี (Tax ID)" },
            amount: { type: Type.NUMBER, description: "จำนวนเงินรวมสุทธิ (Total Amount)" },
            vat: { type: Type.NUMBER, description: "ภาษีมูลค่าเพิ่ม (VAT Amount ถ้ามี)" },
            confidence: { type: Type.NUMBER, description: "ความมั่นใจของ AI ในการสกัดข้อมูล (0-100)" },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING, description: "รายละเอียดรายการสินค้า/บริการ" },
                  price: { type: Type.NUMBER, description: "ราคา" }
                },
                required: ["name", "price"]
              },
              description: "รายละเอียดรายการแต่ละชิ้น"
            }
          },
          required: ["merchant", "amount"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("AI did not return any readable text from the receipt.");
    }

    const parsedData = JSON.parse(text);
    return res.json({ success: true, data: parsedData });

  } catch (error: any) {
    console.error("OCR error:", error);
    return res.status(500).json({ 
      success: false, 
      error: error.message || "เกิดข้อผิดพลาดในการประมวลผลข้อมูลจากใบเสร็จด้วย AI" 
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
