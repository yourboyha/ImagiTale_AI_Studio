// netlify/functions/gemini-handler.ts
import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";

// Redefine enums to be self-contained within the function
enum Language { TH = 'th-TH', EN = 'en-US' }
enum StoryTone {
  ADVENTURE = "Adventure", HEARTWARMING = "Heartwarming & Moral",
  FUNNY = "Funny & Humorous", DREAMY = "Dreamy & Imaginative",
  MYSTERY = "Mystery & Discovery", RELATIONSHIPS = "Relationships",
}
const STORY_TONE_THAI: Record<StoryTone, string> = {
  [StoryTone.ADVENTURE]: "ผจญภัย", [StoryTone.HEARTWARMING]: "อบอุ่นและให้ข้อคิด",
  [StoryTone.FUNNY]: "สนุกสนานและเฮฮา", [StoryTone.DREAMY]: "ความฝันและจินตนาการ",
  [StoryTone.MYSTERY]: "สืบสวนและไขปริศนา", [StoryTone.RELATIONSHIPS]: "ความสัมพันธ์และมิตรภาพ",
};

// Main handler for all Gemini tasks
export const handler = async (event) => {
  const API_KEY = process.env.API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'API_KEY not configured on server' }) };
  }
  
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  const { task, payload } = JSON.parse(event.body);

  try {
    switch (task) {
      // --- TASK: Generate Vocabulary List ---
      case 'generateVocabularyList': {
        const { category } = payload;
        const prompt = `Generate a list of 10 vocabulary words for a 4-7 year old child in the category "${category}". The words must be thematically coherent and suitable for creating a single children's story. Provide the output as a JSON array where each object has a "thai" key (the word in Thai) and an "english" key (the word in English). Example: [{"thai": "สุนัข", "english": "dog"}]`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', contents: prompt,
          config: { responseMimeType: "application/json", responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { thai: { type: Type.STRING }, english: { type: Type.STRING } }, required: ["thai", "english"] } } },
        });
        const result = JSON.parse(response.text.trim());
        return { statusCode: 200, body: JSON.stringify(result) };
      }

      // --- TASK: Generate Image (for Vocab and Story) ---
      case 'generateImage': {
        const { prompt, aspectRatio } = payload;
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001', prompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio },
        });
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        return { statusCode: 200, body: JSON.stringify({ imageUrl }) };
      }

      // --- TASK: Generate Story Scene (Initial, Next, Final) ---
      case 'generateStoryScene': {
        const { prompt, storyStylePrompt } = payload;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', contents: prompt,
          config: { systemInstruction: storyStylePrompt },
        });
        const result = response.text.trim();
        return { statusCode: 200, body: JSON.stringify({ storyText: result }) };
      }
      
      // --- TASK: Generate Story Title ---
      case 'generateStoryTitle': {
        const { prompt } = payload;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash', contents: prompt,
        });
        const title = response.text.trim().replace(/"/g, '');
        return { statusCode: 200, body: JSON.stringify({ title }) };
      }

      default:
        return { statusCode: 400, body: JSON.stringify({ error: `Invalid task: ${task}` }) };
    }
  } catch (error) {
    console.error(`Error in Gemini Handler task "${task}":`, error);
    return { statusCode: 500, body: JSON.stringify({ error: 'An internal server error occurred in Gemini Handler' }) };
  }
};
