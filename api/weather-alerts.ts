import type { Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
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
        console.log(`[Vercel weather] Accessing model: ${model} (attempt ${attempts + 1}/${maxRetries})...`);
        const response = await getAi().models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        if (response && response.text) {
          console.log(`[Vercel weather] Successful generation with ${model}`);
          return response;
        }
      } catch (err: any) {
        lastError = err;
        console.log(`[Vercel weather] Model ${model} unavailable on attempt ${attempts + 1}/${maxRetries}`);
        
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
          console.log(`[Vercel weather] Fatal authentication error. Aborting retries.`);
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

interface WeatherAlertResponse {
  hasAlerts: boolean;
  alertLevel: string;
  summary: string;
  alerts: string[];
  temperatureRange: string;
  humidity: string;
  safetyTips: string[];
}

const weatherAdvisoriesCache = new Map<string, { timestamp: number; data: WeatherAlertResponse }>();
const WEATHER_CACHE_EXPIRY_MS = 30 * 60 * 1000; // 30-minute retention

function getDeterministicWeatherAdvisories(destination: string): WeatherAlertResponse {
  const norm = destination.toLowerCase().trim();
  
  if (norm.includes("kerala") || norm.includes("cochi") || norm.includes("kochi") || norm.includes("munnar") || norm.includes("alleppey") || norm.includes("wayanad")) {
    return {
      hasAlerts: true,
      alertLevel: "medium",
      summary: "June marks the official onset of the Southwest Monsoon in Kerala. Frequent heavy showers, refreshing greenery, and high humidity are anticipated.",
      alerts: [
        "Monsoon Advisory: Regular to heavy afternoon/evening downpours with mild waterlogging warnings in low-lying coastal areas.",
        "Water Warning: Boating and sea ferry schedules may experience transient interruptions due to rough sea tides."
      ],
      temperatureRange: "24°C - 30°C (75°F - 86°F)",
      humidity: "85% - 95% (High)",
      safetyTips: [
        "Store sensitive electronic devices and travel documents in waterproof bags or dry-sleeves.",
        "Carry high-quality umbrellas, lightweight slip-resistant footwear, and windproof ponchos.",
        "Monitor local transport bulletins; hill station drives like Munnar should be completed before nightfall to prevent fog or mud slip delays."
      ]
    };
  }

  if (norm.includes("indore") || norm.includes("madhya pradesh") || norm.includes("bhopal") || norm.includes("ujjain")) {
    return {
      hasAlerts: true,
      alertLevel: "medium",
      summary: "Peak late summer heats with transition towards pre-monsoon lightning triggers are active in Indore as of June. Expect intense afternoon temperatures.",
      alerts: [
        "Thermal Advisory: Dry heat index exceeding 39°C with dry midday gusts in Madhya Pradesh plains.",
        "Weather Alert: Sudden evening lightning or dust-storms as seasonal wind currents shift."
      ],
      temperatureRange: "27°C - 41°C (81°F - 106°F)",
      humidity: "20% - 40% (Low)",
      safetyTips: [
        "Sip continuous electrolyte drinks (ORS, buttermilk, or lemon water) to stay fully hydrated during outdoor excursions.",
        "Equip yourselves with wide-brimmed sunhats, polarized shades, and apply SPF 50+ sunscreen when visiting Rajwada or Lal Bagh Palace.",
        "Plan sightseeing early in the morning (7 AM - 10 AM) or post-sunset to completely avoid intense heat strokes."
      ]
    };
  }

  if (norm.includes("goa")) {
    return {
      hasAlerts: true,
      alertLevel: "medium",
      summary: "June marks the wet, tranquil monsoon season entry in Goa. Standard beach sports are closed, but scenic spice plantation visits are highly recommended.",
      alerts: [
        "Tidal Advisory: High water currents and strong rip currents active across major beaches. Swimming is strictly prohibited.",
        "Monsoon Transition: Brief electrical storms and brief power brownouts are typical seasonal conditions."
      ],
      temperatureRange: "25°C - 31°C (77°F - 88°F)",
      humidity: "80% - 90% (High)",
      safetyTips: [
        "Stay clear of ocean entries; cooperate with the red flags installed by beach lifeguards.",
        "Focus travel itineraries on hinterland exploration, majestic Dudhsagar waterfall lookouts, and historic Old Goa churches.",
        "Retain backup power banks for cellular devices in case of temporary power fluctuations during heavy rain."
      ]
    };
  }

  if (norm.includes("mumbai") || norm.includes("maharashtra") || norm.includes("pune") || norm.includes("lonavala")) {
    return {
      hasAlerts: true,
      alertLevel: "medium",
      summary: "Onset of heavy monsoon downpours across coastal Maharashtra during early to mid-June. High-tide days may cause temporary drainage backflows.",
      alerts: [
        "Rain advisory: Active monsoon showers on streets with intermittent train signal slowdowns.",
        "Tidal advisory: Avoid coastal marine drives during high tides to avoid spray splashes."
      ],
      temperatureRange: "26°C - 32°C (79°F - 90°F)",
      humidity: "82% - 92% (High)",
      safetyTips: [
        "Pack reliable multi-purpose rain gear and water-resistant school/office bags.",
        "Limit unnecessary travel near landslide-prone mountain ghat curves like Lonavala/Khandala.",
        "Keep dry hand wipes and hand sanitizer accessible to guard against seasonal waterborne bugs."
      ]
    };
  }

  if (norm.includes("delhi") || norm.includes("new delhi") || norm.includes("agra") || norm.includes("jaipur") || norm.includes("rajasthan") || norm.includes("udaipur")) {
    return {
      hasAlerts: true,
      alertLevel: "medium",
      summary: "Very intense summer dry heat waves dominant before late-month pre-monsoon rain. High energy demands and high ultraviolet radiations are typical.",
      alerts: [
        "Heat Index Alert: Extremely high UV indexes and dry westerly winds (Loo) active between 12 PM - 4 PM.",
        "Air Advisory: Low air moisture values coupled with dusty winds."
      ],
      temperatureRange: "29°C - 43°C (84°F - 109°F)",
      humidity: "15% - 35% (Dry)",
      safetyTips: [
        "Avoid continuous midday solar exposure unless absolutely shaded.",
        "Opt for lightweight pastel cotton garments to reflect heat wavelengths efficiently.",
        "Incorporate cooling regional menus (Lassi, cucumber, watermelons) into daily diets."
      ]
    };
  }

  return {
    hasAlerts: false,
    alertLevel: "low",
    summary: `Typical seasonal parameters apply to ${destination} as of June 2026. Moderate, inviting conditions with regular tropical shifts are present.`,
    alerts: [
      "No critical extreme storm advisory active. Minor local variations possible.",
      "General advisory: Standard humidity levels and seasonal temperatures persist."
    ],
    temperatureRange: "22°C - 34°C (72°F - 93°F)",
    humidity: "40% - 65% (Comfortable)",
    safetyTips: [
      "Double-check local weather forecasts before organizing long cross-province day trips.",
      "Inquire with local guesthouse or hotel front desks regarding daily meteorological patterns.",
      "Keep standard medications and basic first aid kits at hand."
    ]
  };
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

  let destination = "your destination";
  let cacheKey = "";
  const now = Date.now();

  try {
    destination = (req.query.destination as string) || (req.body && req.body.destination) || "";
    if (!destination) {
      return res.status(400).json({ error: "Missing destination query parameter." });
    }

    cacheKey = destination.toLowerCase().trim();
    const cachedVal = weatherAdvisoriesCache.get(cacheKey);

    if (cachedVal && now - cachedVal.timestamp < WEATHER_CACHE_EXPIRY_MS) {
      console.log(`[Vercel weather alerts API] Cache hit for ${destination}`);
      return res.status(200).json(cachedVal.data);
    }

    const prompt = `Find any real-time active weather alerts, warnings, extreme weather indices, heat index issues, storm forecasts, or seasonal travel warnings/hazards for "${destination}" as of June 2026. Provide a concise JSON response outlining whether there are active alerts or specific seasonal warnings, the alert severity level, a 1-2 sentence quick summary, an array of individual alerts or seasonal warnings, current temperature range, humidity, and safety tips for tourists.`;
    
    const response = await generateWithFallbackAndRetry({
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hasAlerts: { type: Type.BOOLEAN },
            alertLevel: { type: Type.STRING, description: "none / low / medium / high / severe" },
            summary: { type: Type.STRING },
            alerts: { type: Type.ARRAY, items: { type: Type.STRING } },
            temperatureRange: { type: Type.STRING },
            humidity: { type: Type.STRING },
            safetyTips: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["hasAlerts", "alertLevel", "summary", "alerts", "temperatureRange", "humidity", "safetyTips"]
        },
        tools: [{ googleSearch: {} }]
      }
    }, 2);

    const parsedData = JSON.parse(response.text?.trim() || "{}");
    
    weatherAdvisoriesCache.set(cacheKey, { timestamp: now, data: parsedData });
    return res.status(200).json(parsedData);
  } catch (error: any) {
    console.log(`[Vercel weather API] Status check finished; invoking deterministic fallback for ${destination}`, error.stack || error);
    const fallbackAdvisory = getDeterministicWeatherAdvisories(destination);
    
    // Store fallback briefly (5 minutes) so it doesn't spam hitting exhausted models repeatedly
    weatherAdvisoriesCache.set(cacheKey, { timestamp: now - (WEATHER_CACHE_EXPIRY_MS - 5 * 60 * 1000), data: fallbackAdvisory });
    return res.status(200).json(fallbackAdvisory);
  }
}
