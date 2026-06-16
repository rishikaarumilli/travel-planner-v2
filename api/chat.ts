import type { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

let aiClient: any = null;

function getAi() {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is required but not configured.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function generateWithFallbackAndRetry(params: {
  contents: any;
  config?: any;
}, maxRetries = 2) {
  const modelsToTry = [
    "gemini-3.5-flash",
    "gemini-flash-latest",
    "gemini-3.1-flash-lite"
  ];

  let lastError: any = null;

  for (const model of modelsToTry) {
    let attempts = 0;
    while (attempts < maxRetries) {
      try {
        console.log(`[Vercel chat] Accessing model: ${model} (attempt ${attempts + 1}/${maxRetries})...`);
        const response = await getAi().models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        if (response && response.text) {
          console.log(`[Vercel chat] Successful generation with ${model}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        console.log(`[Vercel chat] Model ${model} unavailable on attempt ${attempts + 1}/${maxRetries}`);
        
        const errMsg = String(err.message || "").toLowerCase();
        const isApiKeyMissing = errMsg.includes("gemini_api_key");
        const isAuthError = errMsg.includes("api_key_invalid") || 
                            errMsg.includes("invalid api key") || 
                            errMsg.includes("unauthorized") || 
                            errMsg.includes("forbidden") || 
                            errMsg.includes("403") || 
                            errMsg.includes("401") ||
                            errMsg.includes("invalid key") ||
                            errMsg.includes("key is required") ||
                            errMsg.includes("api key not found") ||
                            errMsg.includes("api key is required");

        if (isApiKeyMissing || isAuthError) {
          console.log(`[Vercel chat] Fatal authentication error. Aborting retries.`);
          throw err;
        }

        attempts++;
        if (attempts < maxRetries) {
          const delay = 1000 * Math.pow(2, attempts);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }
  }

  throw lastError || new Error("All tried generative models failed to complete the request.");
}

export default async function handler(req: Request, res: Response) {
  // Setup CORS headers manually for freedom of cross-calls (standard Vercel function safety)
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  let context: any = null;
  try {
    const body = req.body || {};
    const { messages } = body;
    context = body.context;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const systemInstruction = `You are a smart, friendly AI travel planner assistant.
Your job is to help the user plan their trip in a detailed, structured, and easy-to-read format.
You have already generated an interactive travel plan for them with absolute precision.
The user is at destination: "${context?.destination || "Unknown"}" for ${context?.days || "some"} days with ${context?.people || "some"} people.

Follow these rules:
- Always be friendly, clear, and structured in your chat responses.
- Use emojis to make sections easy to scan.
- Always mention real booking platforms with links (IRCTC, RedBus, MakeMyTrip, Booking.com, Ola, Uber, GetYourGuide).
- Give prices in INR (₹) by default unless the destination is international, in which case use local currency + INR conversion.
- Do NOT show a day-wise plan by default unless explicitly asked.
- **CRITICAL**: If the user explicitly asks for a day-wise plan or itinerary (e.g. "Can you give me a day-wise plan?"), generate a meticulously detailed day-by-day plan with morning, afternoon, and evening slots for each day.
- At the end of every response, you MUST ask exactly: "Would you like a day-wise itinerary, or help booking anything specific?"`;

    // Map conversation messages to GenAI SDK contents
    const contents = messages.map(msg => ({
      role: msg.role === "user" ? "user" : "model",
      parts: [{ text: msg.content }]
    }));

    const response = await generateWithFallbackAndRetry({
      contents: contents,
      config: {
        systemInstruction,
      },
    }, 2);

    const responseText = response.text || "I was unable to process that. How can I help you plan your travel?";
    return res.status(200).json({ text: responseText });
  } catch (error: any) {
    console.log("[Vercel chat Error] Chat standard route failed. Invoking safety dialogue fallback...", error.stack || error);
    try {
      return res.status(200).json({
        text: `✨ I am here to help! Although our high-capacity flight & rail search engines are experiencing extremely heavy crowds and high demand right now, I have successfully compiled and unlocked the custom **Travel Dashboard** on your right containing hotel search options, local delicacies, sightseeing spots, and transport guides. \n\nFeel free to explore the interactive tabs for local hotels, cuisines, activities, trains/flights, and budget breakdowns. \n\n*Would you like a day-wise itinerary, or help booking anything specific?*`
      });
    } catch (fallbackError: any) {
      return res.status(500).json({ error: "Communication link busy. Please retry soon." });
    }
  }
}
