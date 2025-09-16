import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

// A utility to safely parse JSON from the model, which might be wrapped in markdown.
const safeJsonParse = <T>(jsonString: string): T | null => {
  const cleanedString = jsonString.replace(/^```json\s*|```\s*$/g, '').trim();
  try {
    return JSON.parse(cleanedString) as T;
  } catch (error) {
    console.error("Failed to parse JSON:", cleanedString);
    return null;
  }
};

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  const { task, payload } = JSON.parse(event.body || '{}');
  const API_KEY = process.env.API_KEY;

  if (!API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ message: 'API_KEY is not configured on the server.' }) };
  }
  
  // --- Task: Google Cloud Text-to-Speech ---
  if (task === 'generate-speech') {
    try {
      const { textToSpeak, language } = payload;
      const TTS_API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
      const voiceConfig = language.startsWith('th')
        ? { languageCode: 'th-TH', name: 'th-TH-Wavenet-A' }
        : { languageCode: 'en-US', name: 'en-US-Wavenet-D' };

      const ttsResponse = await fetch(TTS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: textToSpeak },
          voice: voiceConfig,
          audioConfig: { audioEncoding: 'MP3' },
        }),
      });

      if (!ttsResponse.ok) throw new Error(`Google TTS API failed with status: ${ttsResponse.status}`);

      const responseData = await ttsResponse.json();
      return { statusCode: 200, body: JSON.stringify({ audioContent: responseData.audioContent, mimeType: 'audio/mpeg' }) };
    } catch (error) {
      console.error(`Error in task "${task}":`, error);
      return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) };
    }
  }

  // --- All other tasks use Gemini API ---
  const ai = new GoogleGenAI({ apiKey: API_KEY });
  try {
    switch (task) {
      case 'generateVocabularyList': {
        const { category } = payload;
        const prompt = `Generate a list of 5 unique, simple, and common vocabulary words for a young child (age 3-6) related to the category "${category}". Provide the response as a JSON array of objects, where each object has a "thai" and "english" key.`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { thai: { type: Type.STRING }, english: { type: Type.STRING } }, required: ['thai', 'english'] } },
          },
        });
        const result = JSON.parse(response.text.trim());
        return { statusCode: 200, body: JSON.stringify(result) };
      }

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
      
      case 'generateFullStoryScene': {
        const { prompt, isImageGenerationEnabled } = payload;
        const textResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash', contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { text: { type: Type.STRING }, choices: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ['text', 'choices'],
                }
            }
        });
        const sceneContent = safeJsonParse<{ text: string; choices?: string[] }>(textResponse.text);
        if (!sceneContent || !sceneContent.text) throw new Error("Invalid scene format from AI.");

        let imageUrl: string;
        if (isImageGenerationEnabled) {
          const imagePrompt = `Children's book illustration, simple and cute, vibrant colors, clear outlines, friendly characters. Scene: ${sceneContent.text}`;
          const imageResponse = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001', prompt: imagePrompt,
            config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '16:9' },
          });
          imageUrl = `data:image/jpeg;base64,${imageResponse.generatedImages[0].image.imageBytes}`;
        } else {
          imageUrl = `https://loremflickr.com/1280/720/story,illustration,cute?lock=${sceneContent.text.substring(0, 10)}`;
        }

        const fullScene = { text: sceneContent.text, choices: sceneContent.choices || [], imageUrl };
        return { statusCode: 200, body: JSON.stringify(fullScene) };
      }

      case 'generateStoryTitle': {
        const { prompt } = payload;
        const response = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
        const title = response.text.trim().replace(/"/g, '');
        return { statusCode: 200, body: JSON.stringify({ title }) };
      }

      default:
        return { statusCode: 400, body: JSON.stringify({ message: `Unknown task: ${task}` }) };
    }
  } catch (error) {
    console.error(`Error in task "${task}":`, error);
    return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error', error: error.message }) };
  }
};

export { handler };
