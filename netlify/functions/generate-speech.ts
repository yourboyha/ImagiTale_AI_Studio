
import { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI, Type, Modality } from "@google/genai";

// Redefine types to avoid path issues in serverless environment
enum WordCategory {
  ANIMALS_NATURE = "animals_nature",
  FAMILY_PEOPLE = "family_people",
  FOOD_DRINK = "food_drink",
  THINGS_TOYS = "things_toys",
  PLACES_ENVIRONMENT = "places_environment",
  ACTIONS_EMOTIONS = "actions_emotions",
}

interface Word {
  thai: string;
  english: string;
}

interface StoryScene {
  text: string;
  imageUrl: string;
  choices: string[];
}


if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const JSON_HEADER = { 'Content-Type': 'application/json' };

const vocabListSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      english: { type: Type.STRING },
      thai: { type: Type.STRING },
    },
    required: ["english", "thai"],
  },
};

const storySceneSchema = {
  type: Type.OBJECT,
  properties: {
    text: {
      type: Type.STRING,
      description: "A paragraph of the story, 2-4 sentences long. It should be simple and engaging for a 3-6 year old child.",
    },
    choices: {
      type: Type.ARRAY,
      description: "An array of 2 simple, distinct choices for the child to continue the story. For the final scene, this should be an empty array.",
      items: { type: Type.STRING },
    },
  },
  required: ["text", "choices"],
};

const generateVocabulary = async (category: WordCategory): Promise<Word[]> => {
  const prompt = `Generate a list of 20 simple, common, one-word nouns for a 3-6 year old child related to the category "${category}". Provide both English and Thai translations for each word. Ensure the words are easily recognizable and appropriate for early learners.`;
  
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: vocabListSchema,
    },
  });

  const jsonText = response.text.trim();
  return JSON.parse(jsonText) as Word[];
};

const generateImage = async (prompt: string, aspectRatio: '1:1' | '16:9'): Promise<string> => {
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: aspectRatio,
    },
  });

  const base64ImageBytes = response.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
};


const generateFullStoryScene = async (prompt: string, isImageGenerationEnabled: boolean): Promise<StoryScene> => {
    const textResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: storySceneSchema,
        },
    });
    
    const jsonText = textResponse.text.trim();
    const sceneContent = JSON.parse(jsonText) as Omit<StoryScene, 'imageUrl'>;
    
    let imageUrl = `https://loremflickr.com/1280/720/children,story,${sceneContent.text.split(" ")[0]}`;

    if (isImageGenerationEnabled && sceneContent.text) {
        const imagePrompt = `A beautiful, vibrant, and simple illustration for a children's storybook. The style should be like a gentle crayon and watercolor drawing with soft colors and clear outlines. The scene is: "${sceneContent.text}"`;
        imageUrl = await generateImage(imagePrompt, '16:9');
    }

    return { ...sceneContent, imageUrl };
};

const generateTitle = async (prompt: string): Promise<{title: string}> => {
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
    });
    return { title: response.text.trim().replace(/"/g, '') };
}

const generateGeminiSpeech = async (text: string, voice: string, language: string) => {
    const ttsModel = 'gemini-2.5-pro-preview-tts';
    // A simple heuristic to add breaks for Thai to improve naturalness.
    const processedText = language === 'th-TH' ? text.replace(/ค่ะ|ครับ/g, '$&<break time="250ms"/>') : text;

    const response = await ai.models.generateContentStream({
        model: ttsModel,
        contents: [{ role: 'user', parts: [{ text: processedText }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: voice }
                }
            }
        }
    });

    let audioBase64 = '';
    let mimeType = 'audio/mpeg'; // Default MIME type
    for await (const chunk of response) {
        const part = chunk.candidates?.[0]?.content?.parts?.[0];
        if (part?.inlineData) {
            audioBase64 += part.inlineData.data;
            if (part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
        }
    }
    return { audioContent: audioBase64, mimeType };
}

export const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
  }

  try {
    const { task, payload } = JSON.parse(event.body || '{}');
    if (!task || !payload) {
      return { statusCode: 400, body: JSON.stringify({ message: 'Missing task or payload' }) };
    }

    let result: any;

    switch (task) {
      case 'generateVocabularyList':
        result = await generateVocabulary(payload.category);
        break;
      
      case 'generateImage':
        const { prompt, aspectRatio } = payload;
        const imageUrl = await generateImage(prompt, aspectRatio);
        result = { imageUrl };
        break;

      case 'generateFullStoryScene':
        result = await generateFullStoryScene(payload.prompt, payload.isImageGenerationEnabled);
        break;

      case 'generateStoryTitle':
        result = await generateTitle(payload.prompt);
        break;
      
      case 'generateGeminiSpeech':
        result = await generateGeminiSpeech(payload.text, payload.voice, payload.language);
        break;

      default:
        return { statusCode: 400, body: JSON.stringify({ message: `Unknown task: ${task}` }) };
    }

    return {
      statusCode: 200,
      headers: JSON_HEADER,
      body: JSON.stringify(result),
    };

  } catch (error) {
    console.error(`Error in Netlify function task "${(JSON.parse(event.body || '{}')).task}":`, error);
    let errorMessage = "An unknown error occurred.";
    if (error instanceof Error) {
        // Attempt to parse nested Gemini API errors for better client-side feedback
        try {
            const nestedError = JSON.parse(error.message.replace('_ApiError: ', ''));
            errorMessage = nestedError?.error?.message || error.message;
        } catch (e) {
            errorMessage = error.message;
        }
    }
    return { 
        statusCode: 500, 
        headers: JSON_HEADER,
        body: JSON.stringify({ message: 'Internal Server Error', error: errorMessage }) 
    };
  }
};