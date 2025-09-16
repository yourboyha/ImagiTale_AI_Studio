import { Word, WordCategory, Language, StoryTone, StoryScene } from '../types';

// This is our new single point of contact with our secure backend.
const API_ENDPOINT = '/.netlify/functions/generate-speech';

/**
 * A generic helper function to call our backend.
 * It sends a task name and a payload, and our backend decides what to do.
 */
async function callApi<T>(task: string, payload: any): Promise<T> {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task, payload }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error(`API Error for task "${task}":`, errorBody);
      throw new Error(`Server returned an error: ${errorBody.message || 'Unknown error'}`);
    }
    return response.json();
  } catch (error) {
    console.error(`Failed to fetch from API for task "${task}":`, error);
    // Rethrow to be caught by the calling function's own error handling
    throw error;
  }
}

// --- Vocabulary Generation ---

export const generateVocabularyList = async (category: WordCategory): Promise<Word[]> => {
  try {
    return await callApi<Word[]>('generateVocabularyList', { category });
  } catch (error) {
    console.error("Fallback for generateVocabularyList:", error);
    return [{ thai: "ข้อผิดพลาด", english: "error" }];
  }
};

export const generateVocabImage = async (word: string): Promise<string> => {
  try {
    const prompt = `A simple, cute, and colorful illustration of a "${word}" for a children's book. The style should be minimalist, with a plain white background, clear outlines, and friendly features. The object should be the main focus.`;
    const result = await callApi<{ imageUrl: string }>('generateImage', { prompt, aspectRatio: '1:1' });
    return result.imageUrl;
  } catch (error) {
    console.error(`Fallback for generateVocabImage for "${word}":`, error);
    return `https://loremflickr.com/400/300/${word},illustration,simple?lock=${word.replace(/\s/g, '')}`;
  }
};

// --- Story Generation ---

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
Your response must be a single JSON object with the specified schema. Do not include any other text or markdown formatting.
${langInstructions}
`;

    if (sceneType === 'initial') {
        return `${basePrompt}This is the very first scene. Introduce a character and a setting. Create a gentle, inviting start to the story. Provide 2 simple, distinct choices for the child.`;
    }

    if (sceneType === 'final') {
        return `${basePrompt}This is the FINAL scene. Write a concluding paragraph that provides a happy and satisfying resolution. Do not introduce new problems. The story should feel complete. Do NOT provide any choices. The "choices" array in the JSON should be empty. Story so far: """${storySoFar}"""`;
    }

    // 'next' scene
    return `${basePrompt}Continue the story from where it left off. Provide 2 simple, distinct choices. Story so far: """${storySoFar}""". The child chose: "${userChoice}". Now, write the next scene based on their choice.`;
};

const generateScene = async (prompt: string, isImageGenerationEnabled: boolean): Promise<StoryScene> => {
    try {
        return await callApi<StoryScene>('generateFullStoryScene', { prompt, isImageGenerationEnabled });
    } catch (error) {
        console.error("Fallback for generateScene:", error);
        return {
            text: "Oh no! The storyteller got a little lost. Let's try again.",
            imageUrl: `https://loremflickr.com/1280/720/error,sad,robot`,
            choices: ["Start over"],
        };
    }
};

export const generateInitialStoryScene = (words: string[], language: Language, storyTone: StoryTone, isImageGenerationEnabled: boolean): Promise<StoryScene> => {
    const prompt = getStoryScenePrompt(language, storyTone, words, null, null, 'initial');
    return generateScene(prompt, isImageGenerationEnabled);
};

export const generateNextStoryScene = (storySoFar: string, userChoice: string, language: Language, storyTone: StoryTone, words: string[], isImageGenerationEnabled: boolean): Promise<StoryScene> => {
    const prompt = getStoryScenePrompt(language, storyTone, words, storySoFar, userChoice, 'next');
    return generateScene(prompt, isImageGenerationEnabled);
};

export const generateFinalStoryScene = (storySoFar: string, language: Language, storyTone: StoryTone, words: string[], isImageGenerationEnabled: boolean): Promise<StoryScene> => {
    const prompt = getStoryScenePrompt(language, storyTone, words, storySoFar, null, 'final');
    return generateScene(prompt, isImageGenerationEnabled);
};

export const generateStoryTitle = async (fullStory: string, language: Language): Promise<string> => {
    try {
        const prompt = `Based on the following children's story, create a short, magical, and fitting title. The title should be in ${language === Language.TH ? "Thai" : "English"}. Respond with only the title text, nothing else. Story: """${fullStory}""" Title:`;
        const result = await callApi<{ title: string }>('generateStoryTitle', { prompt });
        return result.title;
    } catch (error) {
        console.error("Fallback for generateStoryTitle:", error);
        return language === Language.TH ? "นิทานมหัศจรรย์" : "A Wonderful Story";
    }
};
