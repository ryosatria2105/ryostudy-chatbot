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

// Pastikan folder uploads ada
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}

const upload = multer({ dest: "uploads/" });

app.get("/", (req, res) => {
  res.send("Server hidup");
});

app.post("/api/chat", upload.single("file"), async (req, res) => {
  let tempFilePath = null;

  try {
    const message = req.body.message || "";

    if (!message && !req.file) {
      return res.status(400).json({
        error: "Message atau file wajib diisi"
      });
    }

    const contents = [];

    // Simpan path file sementara kalau ada
    if (req.file) {
      tempFilePath = req.file.path;
    }

    // Isi pesan user
    contents.push({
      role: "user",
      parts: [
        {
          text: message || "Tolong analisis file ini."
        }
      ]
    });

    // Kalau ada file, kirim file ke Gemini
    if (req.file) {
      const fileBuffer = fs.readFileSync(req.file.path);

      contents[0].parts.push({
        inlineData: {
          mimeType: req.file.mimetype,
          data: fileBuffer.toString("base64")
        }
      });
    }

    console.log("Pesan masuk:", message);
    if (req.file) {
      console.log("File masuk:", req.file.originalname, req.file.mimetype);
    }
    console.log("Mengirim ke Gemini...");

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: {
        systemInstruction: `
Kamu adalah RyoStudy AI, asisten AI untuk mahasiswa.

GAYA KOMUNIKASI:
- Gunakan bahasa Indonesia yang natural, santai, cerdas, dan enak dibaca.
- Jawaban harus terasa seperti ngobrol dengan asisten modern yang pintar, bukan bot kaku.
- Ramah tapi tidak lebay.
- Jangan gunakan pembuka klise seperti "Tentu!", "Baik!", "Pertanyaan bagus!", dan sejenisnya.
- Jangan mengulang pertanyaan user di awal jawaban.
- Langsung masuk ke inti.

ATURAN JAWABAN:
- Untuk pertanyaan sederhana, jawab singkat, padat, dan jelas.
- Untuk pertanyaan yang kompleks, jawab lebih rinci, bertahap, dan tetap mudah dipahami.
- Jangan bertele-tele kalau tidak perlu.
- Jika user salah paham, luruskan dengan halus tapi tegas.
- Jika user meminta opini, perbandingan, atau saran, beri jawaban yang seimbang dan kasih alasan.
- Jika pertanyaan agak kurang lengkap, tetap bantu dengan asumsi yang paling masuk akal.
- Kalau ada file, analisis file itu dulu lalu jawab berdasarkan isinya dengan relevan.
- Kalau user minta rangkuman, buat ringkas tapi tetap informatif.
- Kalau user minta penjelasan, utamakan kejelasan daripada istilah rumit.

FORMAT:
- Gunakan paragraf biasa secara default.
- Gunakan poin-poin hanya kalau memang membantu.
- Hindari jawaban kosong, terlalu pendek, atau terasa nanggung.
        `,
        maxOutputTokens: 2048,
        temperature: 0.8
      }
    });

    console.log("Respons Gemini diterima");

    const reply =
      response.text ||
      response.candidates?.[0]?.content?.parts
        ?.map((part) => part.text || "")
        .join("")
        .trim() ||
      "AI tidak mengembalikan jawaban.";

    res.json({
      reply
    });
  } catch (error) {
    console.error("ERROR:", error);
    res.status(500).json({
      error: "Terjadi kesalahan pada AI",
      detail: error.message
    });
  } finally {
    // Hapus file sementara kalau ada
    if (tempFilePath && fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch (err) {
        console.error("Gagal menghapus file sementara:", err.message);
      }
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});