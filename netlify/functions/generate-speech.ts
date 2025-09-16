
import type { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";
import { GoogleGenAI, Type } from "@google/genai";

// Initialize the Google Gemini API client
// The API key is securely stored as an environment variable on Netlify
if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper function to create a JSON response ---
const jsonResponse = (statusCode: number, body: any) => {
  return {
    statusCode,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
};

// --- Task: Generate Vocabulary List ---
const generateVocabularyList = async (payload: any) => {
  const { category } = payload;
  const prompt = `Generate a list of 10 simple, common, and distinct vocabulary words for a 3-6 year old child related to the category "${category}". Provide the words in both Thai and English. Respond with ONLY a single JSON array of objects. Each object should have two keys: "thai" and "english". Do not include any other text, explanations, or markdown formatting.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            thai: { type: Type.STRING },
            english: { type: Type.STRING },
          },
          required: ["thai", "english"],
        },
      },
    },
  });

  const vocabList = JSON.parse(response.text);
  return jsonResponse(200, vocabList);
};

// --- Task: Generate Image (for Vocab and Story) ---
const generateImage = async (payload: any) => {
  const { prompt, aspectRatio = '1:1' } = payload;
  
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio,
    },
  });

  const base64ImageBytes = response.generatedImages[0].image.imageBytes;
  const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
  return jsonResponse(200, { imageUrl });
};

// --- Task: Generate Full Story Scene (Text + Image) ---
const generateFullStoryScene = async (payload: any) => {
  const { prompt, isImageGenerationEnabled } = payload;

  // 1. Generate story text and choices
  const textResponse = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          text: { type: Type.STRING, description: "One or two paragraphs of the story scene, written in simple language for a child." },
          choices: {
            type: Type.ARRAY,
            description: "An array of 2 simple choices for the user. Should be an empty array for the final scene.",
            items: { type: Type.STRING }
          },
        },
        required: ["text", "choices"],
      },
    },
  });

  const storyData = JSON.parse(textResponse.text);
  let imageUrl: string;

  // 2. Generate image for the scene (if enabled)
  if (isImageGenerationEnabled) {
    const imagePrompt = `A cute and whimsical, colorful children's storybook illustration. Minimalist style with soft, friendly characters and a simple background. The scene depicts: "${storyData.text}".`;
    const imageGenResponse = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: imagePrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: '16:9',
        },
    });
    const base64ImageBytes = imageGenResponse.generatedImages[0].image.imageBytes;
    imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
  } else {
    // Fallback placeholder image
    imageUrl = `https://loremflickr.com/1280/720/kids,story,illustration,${storyData.text.split(' ')[0] || 'scene'}`;
  }

  const finalScene = { ...storyData, imageUrl };
  return jsonResponse(200, finalScene);
};

// --- Task: Generate Story Title ---
const generateStoryTitle = async (payload: any) => {
    const { prompt } = payload;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return jsonResponse(200, { title: response.text.trim().replace(/"/g, '') });
};


// --- Main Netlify Function Handler ---
const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { message: 'Method Not Allowed' });
  }

  try {
    const { task, payload } = JSON.parse(event.body || '{}');

    switch (task) {
      case 'generateVocabularyList':
        return await generateVocabularyList(payload);
      case 'generateImage':
        return await generateImage(payload);
      case 'generateFullStoryScene':
        return await generateFullStoryScene(payload);
      case 'generateStoryTitle':
        return await generateStoryTitle(payload);
      default:
        return jsonResponse(400, { message: 'Invalid task specified' });
    }
  } catch (error) {
    console.error('Error in Netlify function:', error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return jsonResponse(500, { message: 'Internal Server Error', error: errorMessage });
  }
};

export { handler };
