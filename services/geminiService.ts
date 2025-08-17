import { GoogleGenAI, Type } from "@google/genai";
import type { StoryHistoryItem, GeminiStoryResponse, Language } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const storySchema = {
  type: Type.OBJECT,
  properties: {
    sceneDescription: {
      type: Type.STRING,
      description: "A detailed description of the part of the sculpture being analyzed. Explain what the data from this period shows in a didactic, slightly mysterious tone. Should be 2-4 sentences. This text will be shown to the player."
    },
    imagePrompt: {
      type: Type.STRING,
      description: "A concise, descriptive prompt for an image generation AI. The style should be 'photorealistic render of a skeletal sculpture in a minimalist museum'. The prompt must focus on the part of the sculpture being described. For example, highlight a specific year range with a colored glow."
    },
    choices: {
      type: Type.ARRAY,
      description: "An array of 2-4 distinct analytical actions or questions the player can pose. These should be about interpreting the data or exploring another part of the sculpture. If the analysis has concluded, this should be an empty array.",
      items: {
        type: Type.STRING
      }
    }
  },
  required: ["sceneDescription", "imagePrompt", "choices"]
};

const getSystemInstruction = (language: Language): string => {
    const langInstruction = language === 'es' 
        ? "Responde siempre en español." 
        : "Always respond in English.";

    return `You are a scientific AI guide in a text-based game. The game is called 'The Climate Change Skeleton'.
The player is a scientist from the future exploring a sculpture that represents global temperature anomalies from 1880 to the present day.
The sculpture is a giant skeleton, where each vertebra is a year. The shape and color of the vertebrae represent the temperature data.
Your role is to act as a narrator, guide, and data analyst. Your tone must be didactic, respectful, reflective, and accessible, with a touch of mystery and scientific urgency.
You must not be political or controversial. Keep the content safe for an audience of around 15 years old.
Based on the player's choice, describe the relevant part of the sculpture and the climate data it represents.
Then, provide 2-4 new choices for the player to continue their analysis.
The image prompt you generate should always be about the skeleton sculpture, focusing on the specific data period being discussed.
Your entire response must be in JSON format, adhering to the provided schema.
${langInstruction}`;
}

export const generateAdventureStep = async (
  language: Language,
  history?: StoryHistoryItem[],
  playerChoice?: string
): Promise<GeminiStoryResponse | null> => {
  let userPrompt;
  const systemInstruction = getSystemInstruction(language);

  if (!history || history.length === 0) {
    // Initial scene generation
    userPrompt = `This is the beginning of the analysis. Describe the first impression of the climate change skeleton sculpture. Provide an overview of what it represents and give the player initial choices to start their investigation.`;
  } else {
    // Subsequent scene generation
    const historyString = history.map(item => `Analysis: ${item.scene}\nPlayer Action: ${item.choice}`).join('\n\n');
    userPrompt = `Here is the analysis so far:\n${historyString}\n\nThe player has just chosen to: "${playerChoice}". Generate the next step of the analysis that results from this action. Provide a new description, a new image prompt, and 2-4 new choices. If the analysis has reached a natural conclusion, make the scene description reflect this and provide an empty array for the choices.`;
  }
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: userPrompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: storySchema,
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
      }
    });
    
    let jsonString = response.text;
    if (!jsonString) {
        console.error("Gemini response text is empty.");
        return null;
    }
    
    // Clean the string to handle potential markdown formatting from the model
    const cleanedJsonString = jsonString
      .replace(/^```json\s*/, '')
      .replace(/\s*```$/, '')
      .trim();

    return JSON.parse(cleanedJsonString) as GeminiStoryResponse;
  } catch (error) {
    console.error("Error generating adventure step:", error);
    throw new Error("Failed to get a valid story step from the AI.");
  }
};

export const generateImage = async (prompt: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
        model: 'imagen-3.0-generate-002',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
        return `data:image/jpeg;base64,${base64ImageBytes}`;
    } else {
        throw new Error("No image was generated.");
    }
  } catch (error) {
    console.error("Error generating image:", error);
    // Return a placeholder or throw an error
    throw new Error("Failed to generate an image for the scene.");
  }
};