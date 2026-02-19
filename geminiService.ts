
import { GoogleGenAI } from "@google/genai";

// Fix: Strictly follow Gemini API guidelines for key acquisition and model selection
export const validateLocationSafety = async (locationName: string, userLocation?: { latitude: number, longitude: number }) => {
  // Use process.env.API_KEY string directly as per guidelines
  const apiKey = process.env.API_KEY;
  
  if (!apiKey) {
    return { text: "Security Analysis Offline: Gemini API Key not configured in environment.", grounding: [] };
  }

  // Use new GoogleGenAI({ apiKey }) as per guidelines
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash", // Maps grounding is only supported in Gemini 2.5 series models
      contents: `Analyze the safety and legitimacy of this location for a financial geofence: "${locationName}". Is it a recognized secure area, public space, or residential zone? Provide a concise safety score out of 10.`,
      config: {
        tools: [{ googleMaps: {} }],
        toolConfig: {
          retrievalConfig: {
            latLng: userLocation ? {
              latitude: userLocation.latitude,
              longitude: userLocation.longitude
            } : undefined
          }
        }
      },
    });

    // Access .text property directly as per guidelines
    return {
      text: response.text,
      grounding: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
    };
  } catch (error) {
    console.error("Gemini Location Validation Error:", error);
    return { text: "Location validation currently unavailable or restricted by API limitations.", grounding: [] };
  }
};
