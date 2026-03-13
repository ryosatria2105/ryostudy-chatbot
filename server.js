import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import multer from "multer";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
app.use(express.static("./"));

if (!process.env.GEMINI_API_KEY) {
  console.error("GEMINI_API_KEY tidak ditemukan di .env");
  process.exit(1);
}

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("Server hidup");
});

app.post("/api/chat", upload.single("file"), async (req, res) => {
  try {
    const message = req.body.message || "";

    if (!message && !req.file) {
      return res.status(400).json({
        error: "Message atau file wajib diisi"
      });
    }

    const contents = [];

    // ── Prompt dasar / persona ──────────────────────────────────────────────
    const prompt = `
Kamu adalah RyoStudy AI, asisten belajar untuk mahasiswa.
Jawab dengan bahasa Indonesia yang santai, jelas, dan mudah dipahami.

ATURAN PENTING:
- Jawab SINGKAT dan PADAT. Maksimal 3-5 kalimat untuk pertanyaan sederhana.
- Jangan bertele-tele, langsung ke inti jawaban.
- Hanya panjang jika pertanyaannya memang kompleks atau meminta penjelasan detail.
- Jangan ulangi pertanyaan user di awal jawaban.
- Jangan pakai pembuka seperti "Tentu!", "Baik!", "Pertanyaan bagus!" dll.
- Jika ada file, analisis file tersebut lalu jawab berdasarkan isi file secara ringkas.

Pertanyaan user:
${message || "(tidak ada pertanyaan teks)"}
`;

    contents.push({ text: prompt });

    // Kalau ada file, kirim file ke Gemini
    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);
      contents.push({
        inlineData: {
          mimeType: req.file.mimetype,
          data: fileBuffer.toString("base64")
        }
      });
      // hapus file sementara setelah dibaca
      fs.unlinkSync(req.file.path);
    }

    console.log("Pesan masuk:", message);
    if (req.file) {
      console.log("File masuk:", req.file.originalname, req.file.mimetype);
    }
    console.log("Mengirim ke Gemini...");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents
    });

    console.log("Respons Gemini diterima");

    res.json({
      reply: response.text
    });

  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      error: "Terjadi kesalahan pada AI",
      detail: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
