import { GoogleGenAI } from "@google/genai";

const SYSTEM_INSTRUCTION_EN = `You are AURA (Autonomous Ubiquitous Research Assistant), a specialized scientific AI guide. Your purpose is to help users understand the 'Climate Change Skeleton,' a data sculpture representing global temperature anomalies from 1880-2024. 
- Your answers must be informative, concise, and directly related to climate change, historical data, or the sculpture itself.
- You are currently assisting a user who is analyzing a specific historical period. Use the provided context to tailor your response.
- Do not go off-topic. Decline to answer questions unrelated to climate science, data analysis, or history.
- Keep your personality professional, helpful, and scientific.`;

const SYSTEM_INSTRUCTION_ES = `Eres AURA (Asistente de Investigación Ubicua y Autónoma), una IA científica especializada. Tu propósito es ayudar a los usuarios a comprender 'El Esqueleto del Cambio Climático', una escultura de datos que representa las anomalías de la temperatura global de 1880-2024.
- Tus respuestas deben ser informativas, concisas y directamente relacionadas con el cambio climático, los datos históricos o la propia escultura.
- Actualmente estás ayudando a un usuario que analiza un período histórico específico. Utiliza el contexto proporcionado para adaptar tu respuesta.
- No te desvíes del tema. Niégate a responder preguntas no relacionadas con la ciencia del clima, el análisis de datos o la historia.
- Mantén una personalidad profesional, servicial y científica.`;

let ai: GoogleGenAI;

try {
  ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
} catch (error) {
  console.error("Failed to initialize Gemini AI Service:", error);
}


export const sendMessageToAura = async (message: string, context: string, language: 'en' | 'es'): Promise<string> => {
  if (!ai) {
    console.error("Gemini AI Service is not initialized.");
    return language === 'es' 
      ? "Lo siento, el servicio de IA no está disponible en este momento." 
      : "I'm sorry, the AI service is not available at this time.";
  }
  
  const systemInstruction = language === 'es' ? SYSTEM_INSTRUCTION_ES : SYSTEM_INSTRUCTION_EN;
  const fullPrompt = `Context: The user is currently analyzing the following topic: "${context}". User's question: "${message}"`;

  try {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: fullPrompt,
        config: {
            systemInstruction: systemInstruction,
        },
    });
    return response.text;
  } catch (error) {
    console.error("Error sending message to Gemini:", error);
    return language === 'es' ? "Lo siento, no puedo procesar tu solicitud en este momento." : "I'm sorry, I'm unable to process your request at this time.";
  }
};