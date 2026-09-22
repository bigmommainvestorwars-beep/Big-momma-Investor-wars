import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const app = express();
const PORT = 3000;

app.use(express.json());

// API: Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API: Gemini AI Market & Strategy Advisor for Big Momma: Investors' War
app.post("/api/gemini-advisor", async (req, res) => {
  try {
    const { prompt, matchContext } = req.body || {};
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.json({
        advice: "Gemini AI Advisor is currently running in offline strategic mode (API Key not configured). Recommendation: Maintain a cash buffer of at least 2,500 ƁM, diversify into high-yield commercial sectors, and watch out for Aggressive bots during auctions!"
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const systemInstruction = `You are Big Momma's Master Financial Strategist and AI Market Advisor for the board game 'Big Momma: Investors' War'. 
Provide sharp, punchy, tactical financial advice, sector investment tips, and bot behavior countermeasures. 
Keep responses under 4 sentences, highly actionable, professional, and engaging.`;

    const userPrompt = prompt || "Give me top tactical advice for dominating the 52-space circular board against bot opponents.";
    const contextStr = matchContext ? `\nMatch Context: ${JSON.stringify(matchContext)}` : "";

    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: [
        {
          role: "user",
          parts: [{ text: `${systemInstruction}\n\n${userPrompt}${contextStr}` }]
        }
      ]
    });

    const advice = response.text || "Secure high-tier industrial assets early, maintain strong liquidity reserves, and outsmart conservative opponents with calculated property monopolies.";

    res.json({ advice });
  } catch (error: any) {
    console.error("Gemini advisor error:", error);
    res.json({
      advice: "Market volatility detected. Recommendation: Accumulate cash reserves, bid conservatively in auctions, and leverage Strategy Points (SP) when landing on premium corporate sectors."
    });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Big Momma server running on http://localhost:${PORT}`);
  });
}

startServer();
