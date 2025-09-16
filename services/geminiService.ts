import { GoogleGenAI, Type } from "@google/genai";
import { Word, WordCategory, Language, StoryTone, StoryScene } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- Helper Functions ---

/**
 * A utility to safely parse JSON from the model, which might be wrapped in markdown.
 */
const safeJsonParse = <T>(jsonString: string): T | null => {
  const cleanedString = jsonString.replace(/^```json\s*|```\s*$/g, '').trim();
  try {
    return JSON.parse(cleanedString) as T;
  } catch (error) {
    console.error("Failed to parse JSON:", error);
    console.error("Original string:", jsonString);
    return null;
  }
};


// --- Vocabulary Generation ---

/**
 * Generates a list of vocabulary words for a given category.
 */
export const generateVocabularyList = async (category: WordCategory): Promise<Word[]> => {
  try {
    const prompt = `Generate a list of 5 unique, simple, and common vocabulary words for a young child (age 3-6) related to the category "${category}". The words should be suitable for building a simple story. Provide the response as a JSON array of objects, where each object has a "thai" and "english" key.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              thai: { type: Type.STRING },
              english: { type: Type.STRING },
            },
            required: ['thai', 'english'],
          },
        },
      },
    });

    const result = safeJsonParse<Word[]>(response.text);
    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error("Failed to generate or parse vocabulary list.");
    }
    return result.slice(0, 5); // Ensure we only return 5 words
  } catch (error) {
    console.error("Error generating vocabulary list:", error);
    // Fallback to a default word from the category as an example
    return [{ thai: "ข้อผิดพลาด", english: "error" }];
  }
};

/**
 * Generates an image for a single vocabulary word.
 */
export const generateVocabImage = async (word: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `A simple, cute, and colorful illustration of a "${word}" for a children's book. The style should be minimalist, with a plain white background, clear outlines, and friendly features. The object should be the main focus.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1',
      },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/png;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error(`Error generating image for "${word}":`, error);
    // Fallback image
    return `https://loremflickr.com/400/300/${word},illustration,simple?lock=${word.replace(/\s/g, '')}`;
  }
};


// --- Story Generation ---

const generateImageForScene = async (sceneText: string): Promise<string> => {
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `Children's book illustration, simple and cute, vibrant colors, clear outlines, friendly characters. Scene: ${sceneText}`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/jpeg',
        aspectRatio: '16:9',
      },
    });
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  } catch (error) {
    console.error(`Error generating image for scene: "${sceneText}"`, error);
    return `https://loremflickr.com/1280/720/story,illustration,cute?lock=${sceneText.substring(0, 20).replace(/\s/g, '')}`;
  }
};

const getStoryScenePrompt = (
    language: Language,
    storyTone: StoryTone,
    words: string[],
    storySoFar: string | null,
    userChoice: string | null,
    sceneType: 'initial' | 'next' | 'final'
): string => {
    const langInstructions = language === Language.TH
        ? "The story must be in Thai. The choices must be in Thai. Respond ONLY with the JSON object."
        : "The story must be in English. The choices must be in English. Respond ONLY with the JSON object.";
    
    const basePrompt = `
You are a creative storyteller for children aged 3-6. Your task is to generate a scene for a short, interactive story.
The story should be very simple, positive, and easy for a young child to understand.
The overall tone of the story should be: ${storyTone}.
The story must incorporate some of these vocabulary words: ${words.join(', ')}.

Instructions:
1.  Generate a single paragraph for the story scene (2-4 simple sentences).
2.  The language must be ${language === Language.TH ? "Thai" : "English"}.
3.  Based on the scene, provide creative choices for the child to decide what happens next.
4.  Your response must be a single JSON object with the specified schema. Do not include any other text or markdown formatting.

${langInstructions}
`;

    if (sceneType === 'initial') {
        return `
${basePrompt}
This is the very first scene. Introduce a character and a setting. Create a gentle, inviting start to the story.
Provide 2 simple, distinct choices for the child.
`;
    }

    if (sceneType === 'final') {
        return `
${basePrompt}
This is the FINAL scene of the story. Write a concluding paragraph that provides a happy and satisfying resolution. Do not introduce new problems. The story should feel complete.
Do NOT provide any choices. The "choices" array in the JSON should be empty.

Here is the story so far:
"""
${storySoFar}
"""
`;
    }

    // 'next' scene
    return `
${basePrompt}
Continue the story from where it left off.
Provide 2 simple, distinct choices for the child that logically follow the new scene.

Here is the story so far:
"""
${storySoFar}
"""

The child chose to: "${userChoice}"

Now, write the next scene based on their choice.
`;
};

const generateSceneFromPrompt = async (prompt: string, isImageGenerationEnabled: boolean): Promise<StoryScene> => {
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        text: { type: Type.STRING, description: "The paragraph for the current story scene." },
                        choices: {
                            type: Type.ARRAY,
                            items: { type: Type.STRING },
                            description: "A list of 2 choices for the user, or an empty array for the final scene."
                        }
                    },
                    required: ['text', 'choices'],
                }
            }
        });

        const result = safeJsonParse<{ text: string; choices?: string[] }>(response.text);
        
        if (!result || !result.text) {
            throw new Error("Invalid scene format received from AI.");
        }

        const imageUrl = isImageGenerationEnabled
            ? await generateImageForScene(result.text)
            : `https://loremflickr.com/1280/720/story,illustration,cute,${result.text.substring(0, 10).replace(/\s/g, '')}?lock=${Date.now()}`;
            
        return { text: result.text, choices: result.choices || [], imageUrl };

    } catch (error) {
        console.error("Error generating story scene:", error);
        return {
            text: "Oh no! The storyteller got a little lost. Let's try again.",
            imageUrl: `https://loremflickr.com/1280/720/error,sad,robot`,
            choices: ["Start over"],
        };
    }
};


export const generateInitialStoryScene = async (words: string[], language: Language, storyTone: StoryTone, isImageGenerationEnabled: boolean): Promise<StoryScene> => {
    const prompt = getStoryScenePrompt(language, storyTone, words, null, null, 'initial');
    return generateSceneFromPrompt(prompt, isImageGenerationEnabled);
};

export const generateNextStoryScene = async (storySoFar: string, userChoice: string, language: Language, storyTone: StoryTone, words: string[], isImageGenerationEnabled: boolean, sceneCount: number): Promise<StoryScene> => {
    const prompt = getStoryScenePrompt(language, storyTone, words, storySoFar, userChoice, 'next');
    return generateSceneFromPrompt(prompt, isImageGenerationEnabled);
};

export const generateFinalStoryScene = async (storySoFar: string, language: Language, storyTone: StoryTone, words: string[], isImageGenerationEnabled: boolean): Promise<StoryScene> => {
    const prompt = getStoryScenePrompt(language, storyTone, words, storySoFar, null, 'final');
    return generateSceneFromPrompt(prompt, isImageGenerationEnabled);
};

export const generateStoryTitle = async (fullStory: string, language: Language): Promise<string> => {
    try {
        const prompt = `Based on the following children's story, create a short, magical, and fitting title. The title should be in ${language === Language.TH ? "Thai" : "English"}. Respond with only the title text, nothing else.

Story:
"""
${fullStory}
"""

Title:`;
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
        });

        return response.text.trim();
    } catch (error) {
        console.error("Error generating story title:", error);
        return language === Language.TH ? "นิทานมหัศจรรย์" : "A Wonderful Story";
    }
};
