import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

// Robust detection of production mode in both ESM (tsx) and bundled CJS (dist/server.cjs) environments
const isProd = process.env.NODE_ENV === "production" || 
  (typeof __filename !== "undefined" && (__filename.includes("dist") || __filename.endsWith(".cjs")));

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

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
