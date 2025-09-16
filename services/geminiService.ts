

import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { StoryScene, Language, Word, WordCategory, StoryTone } from '../types';
import { VOCABULARY, STORY_TONE_THAI } from '../constants';


const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export const generateVocabularyList = async (category: WordCategory): Promise<Word[]> => {
  const prompt = `Generate a list of 10 vocabulary words for a 4-7 year old child in the category "${category}". 
The words must be thematically coherent and suitable for creating a single children's story. 
Provide the output as a JSON array where each object has a "thai" key (the word in Thai) and an "english" key (the word in English).
Example: [{"thai": "สุนัข", "english": "dog"}]`;

  try {
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
            required: ["thai", "english"],
          },
        },
      },
    });

    const jsonString = (response.text ?? '').trim();
    if (!jsonString) {
      throw new Error("API returned empty vocabulary list.");
    }
    const wordList = JSON.parse(jsonString);

    if (Array.isArray(wordList) && wordList.length > 0) {
      return wordList;
    }
    throw new Error("Parsed JSON is not a valid word list.");

  } catch (error) {
    console.error(`Error generating vocabulary list for category "${category}":`, error);
    // Fallback to the hardcoded list
    return [...VOCABULARY[category]];
  }
};


export const generateVocabImage = async (word: string): Promise<string> => {
  try {
    const prompt = `A very simple, child-friendly illustration of ONLY: "${word}". White background. Style: simple shapes, vibrant colors, centered object. CRITICAL COMMAND: This image must contain ABSOLUTELY NO text, NO letters, NO words, and NO writing of any kind. The output must be a pure, text-free picture.`;
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '4:3',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    throw new Error('Image generation failed: No images returned.');
  } catch (error) {
    console.error(`Error generating vocab image for "${word}":`, error);
    const errorMessage = (error as any)?.error?.message || (error as any)?.message || JSON.stringify(error);
    if (errorMessage.includes('quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        alert("โควต้าสร้างภาพสำหรับวันนี้หมดแล้ว!\n\nคุณสามารถเล่นต่อโดยใช้ภาพสำรองได้ โดยไปที่ 'ตั้งค่า' และปิด 'สร้างภาพคำศัพท์ AI' และ 'สร้างภาพนิทาน AI' ชั่วคราวนะคะ");
    }
    return `https://loremflickr.com/400/300/${word},illustration,simple?lock=${word.replace(/\s/g, '')}`; // Fallback image
  }
};

const generateImage = async (prompt: string, words: string[], isImageGenerationEnabled: boolean): Promise<string> => {
  if (!isImageGenerationEnabled) {
    return "https://loremflickr.com/1280/720/storybook,magic,adventure?lock=story"; // Return fallback immediately for debug mode
  }
  try {
    const focusPrompt = `A vibrant, whimsical, child-friendly storybook illustration. Scene: ${prompt}. The main elements should be clear: ${words.join(', ')}. Style: simple, colorful storybook art. CRITICAL COMMAND: The image must contain ABSOLUTELY NO text, NO letters, NO words, and NO writing of any kind. The final output must be a pure, text-free picture.`;
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: focusPrompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '16:9',
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/jpeg;base64,${base64ImageBytes}`;
    }
    throw new Error('Image generation failed: No images returned.');
  } catch (error) {
    console.error("Error generating image:", error);
    const errorMessage = (error as any)?.error?.message || (error as any)?.message || JSON.stringify(error);
    if (errorMessage.includes('quota exceeded') || errorMessage.includes('RESOURCE_EXHAUSTED')) {
        alert("โควต้าสร้างภาพสำหรับวันนี้หมดแล้ว!\n\nคุณสามารถเล่นต่อโดยใช้ภาพสำรองได้ โดยไปที่ 'ตั้งค่า' และปิด 'สร้างภาพนิทาน AI' ชั่วคราวนะคะ");
    }
    return "https://loremflickr.com/1280/720/storybook,magic,adventure?lock=story"; // Fallback image
  }
};

export const generateInitialStoryScene = async (words: string[], language: Language, storyTone: StoryTone, isImageGenerationEnabled: boolean): Promise<StoryScene> => {
  const wordList = words.join(', ');
  const toneDescription = language === Language.TH ? STORY_TONE_THAI[storyTone] : storyTone;
  const storyStylePrompt = language === Language.TH
    ? "สมมติตัวเองเป็นพ่อ/แม่ที่กำลังเล่านิทานให้ลูกฟังด้วยน้ำเสียงที่อบอุ่นและเป็นกันเอง"
    : "Act as a warm, friendly parent telling a story to a young child.";
  
  const prompt = language === Language.TH
    ? `สร้างฉากแรกของนิทานเด็ก 5 ตอนในโทนเรื่อง "${toneDescription}" สำหรับเด็กอายุ 4-7 ปีเป็นภาษาไทย เขียนด้วยภาษาที่เรียบง่าย ประโยคสั้นๆ และเข้าใจง่ายเหมือนเล่าให้เด็กเล็กฟังจริงๆ เรื่องราวนี้จะมีโครงสร้าง 5 ส่วน: เริ่มต้น -> ผจญภัย -> อุปสรรค -> แก้ปัญหา -> จบ สำหรับฉากแรกนี้ ให้เขียนเฉพาะเนื้อเรื่องในส่วน "เริ่มต้น" โดยแนะนำฉากและตัวละครหลักอย่างเป็นธรรมชาติโดยใช้คำศัพท์เหล่านี้: ${wordList} เรื่องราวต้องเชื่อมโยงกัน มีเหตุมีผล และน่าติดตาม (ความยาว 2-4 ประโยค) คำสั่งสำคัญ: ผลลัพธ์ที่ได้จะต้องเป็นเนื้อเรื่องล้วนๆ และต้องขึ้นต้นด้วยเนื้อเรื่องทันที ห้ามมีคำอธิบาย, ป้ายกำกับ (เช่น 'ฉากหลัง:'), หรือเครื่องหมาย Markdown (เช่น **) ใดๆ ทั้งสิ้น จากนั้น ให้สร้าง "คำใบ้" 3 ตัวเลือกที่น่าสนใจและแตกต่างกันสำหรับฉากต่อไปให้เด็ก โดยต้องอยู่ในรูปแบบนี้เท่านั้น: [คำใบ้ที่ 1 | คำใบ้ที่ 2 | คำใบ้ที่ 3] โดยห้ามมีข้อความอื่นใดนอกวงเล็บนี้`
    : `Create the first scene of a 5-part story with a "${storyTone}" tone for a 4-7 year old child. CRITICAL: Write in extremely simple, short sentences, as if speaking to a very young child. The story will follow a 5-part structure: Beginning -> Adventure -> Obstacle -> Solution -> Conclusion. For this first scene, write only the narrative for the "Beginning". Naturally introduce the setting and main characters using these vocabulary words: ${wordList}. The story must be logical, coherent, and engaging (2-4 sentences long). CRITICAL: The output must begin *directly* with the story narrative, with no preamble. The output must be ONLY the narrative text. Do not include any labels (like 'Background:'), descriptive tags, or markdown formatting (like **). After the narrative, create three distinct and engaging "hint" choices for the next scene for the child. The choices MUST be in this exact format and nothing else: [Hint 1 | Hint 2 | Hint 3]`;
  
  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: storyStylePrompt,
      },
    });
    
    let storyText = (response.text ?? '').trim();
    if (!storyText) {
      throw new Error("API returned empty story text for initial scene.");
    }
    
    let choices: string[] | undefined;
    const choiceRegex = /\[(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/;
    const match = storyText.match(choiceRegex);

    if (match) {
      storyText = storyText.replace(choiceRegex, '').trim();
      choices = [match[1].trim(), match[2].trim(), match[3].trim()];
    }

    const imageUrl = await generateImage(storyText, words, isImageGenerationEnabled);

    return { text: storyText, imageUrl, choices };
  } catch (error) {
    console.error("Error generating initial story scene:", error);
    const fallbackText = language === Language.TH
      ? `กาลครั้งหนึ่งนานมาแล้ว ในดินแดนมหัศจรรย์ มี ${words[0]} ที่เป็นมิตรและ ${words[1]} ที่ชาญฉลาดกำลังจะเริ่มการผจญภัยครั้งยิ่งใหญ่!`
      : `Once upon a time, in a magical land, a friendly ${words[0]} and a wise ${words[1]} were about to start a great adventure!`;
    const fallbackChoices = language === Language.TH ? ["สำรวจป่า", "ข้ามสะพาน", "คุยกับนก"] : ["Explore the forest", "Cross the bridge", "Talk to a bird"];
    return {
      text: fallbackText,
      imageUrl: "https://loremflickr.com/1280/720/adventure,magical,start?lock=scene1",
      choices: fallbackChoices,
    };
  }
};

export const generateNextStoryScene = async (storyHistory: string, userChoice: string, language: Language, storyTone: StoryTone, words: string[], isImageGenerationEnabled: boolean, sceneIndex: number): Promise<StoryScene> => {
  const storyConcepts: Record<string, string[]> = {
    th: ["การผจญภัย", "อุปสรรค", "การแก้ปัญหา"],
    en: ["Adventure", "Obstacle", "Solution"]
  };
  const langKey = language === Language.TH ? 'th' : 'en';
  const currentConcept = storyConcepts[langKey][sceneIndex - 1];
  const toneDescription = language === Language.TH ? STORY_TONE_THAI[storyTone] : storyTone;
  const storyStylePrompt = language === Language.TH
    ? "สมมติตัวเองเป็นพ่อ/แม่ที่กำลังเล่านิทานให้ลูกฟังด้วยน้ำเสียงที่อบอุ่นและเป็นกันเอง"
    : "Act as a warm, friendly parent telling a story to a young child.";


  const prompt = language === Language.TH
    ? `นี่คือนิทานสำหรับเด็กอายุ 4-7 ปีในโทนเรื่อง "${toneDescription}" และมีโครงสร้าง 5 ส่วน (เริ่มต้น -> ผจญภัย -> อุปสรรค -> แก้ปัญหา -> จบ) เนื้อเรื่องจนถึงตอนนี้คือ: "${storyHistory}" เด็กได้เลือกที่จะทำสิ่งนี้ต่อไป: "${userChoice}" โปรดแต่งเรื่องราวฉากต่อไปซึ่งเป็นส่วนของ "${currentConcept}" เป็นภาษาไทย โดยต้องต่อเนื่องจากเรื่องราวก่อนหน้าอย่างสมเหตุสมผล ใช้ภาษาที่เรียบง่าย ประโยคสั้นๆ และเข้าใจง่ายเหมือนเล่าให้เด็กเล็กฟังจริงๆ ทำให้เรื่องสนุกและน่าติดตาม (ความยาว 2-4 ประโยค) คำสั่งสำคัญ: ผลลัพธ์ที่ได้จะต้องเป็นเนื้อเรื่องล้วนๆ และต้องขึ้นต้นด้วยเนื้อเรื่องทันที ห้ามมีคำอธิบาย, ป้ายกำกับ, หรือเครื่องหมาย Markdown ใดๆ ทั้งสิ้น จากนั้น ให้สร้าง "คำใบ้" 3 ตัวเลือกที่น่าสนใจและแตกต่างกันสำหรับฉากต่อไป โดยต้องอยู่ในรูปแบบนี้เท่านั้น: [คำใบ้ที่ 1 | คำใบ้ที่ 2 | คำใบ้ที่ 3] โดยห้ามมีข้อความอื่นใดนอกวงเล็บนี้`
    : `This is a 5-part story for a 4-7 year old child with a "${storyTone}" tone (Beginning -> Adventure -> Obstacle -> Solution -> Conclusion). The story so far is: "${storyHistory}". The child chose to do this next: "${userChoice}". Please write the next scene, which is the "${currentConcept}" part of the story. CRITICAL: It must logically continue from the previous scene. Use extremely simple, short sentences, as if speaking to a very young child. Keep it fun and engaging (2-4 sentences long). CRITICAL: The output must begin *directly* with the story narrative, with no preamble. The output must be ONLY the narrative text. Do not include any labels, descriptive tags, or markdown formatting. After the narrative, create three new distinct and engaging "hint" choices for the next scene. The choices MUST be in this exact format and nothing else: [Hint 1 | Hint 2 | Hint 3]`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: {
        systemInstruction: storyStylePrompt,
      },
    });

    let storyText = (response.text ?? '').trim();
    if (!storyText) {
      throw new Error("API returned empty story text for next scene.");
    }
    
    let choices: string[] | undefined;

    const choiceRegex = /\[(.*?)\s*\|\s*(.*?)\s*\|\s*(.*?)\]/;
    const match = storyText.match(choiceRegex);

    if (match) {
      storyText = storyText.replace(choiceRegex, '').trim();
      choices = [match[1].trim(), match[2].trim(), match[3].trim()];
    }

    const imageUrl = await generateImage(storyText, words, isImageGenerationEnabled);
    return { text: storyText, imageUrl, choices };

  } catch (error) {
    console.error("Error generating next story scene:", error);
     const fallbackText = language === Language.TH
      ? "และแล้วการผจญภัยก็ดำเนินต่อไปในแบบที่คาดไม่ถึง!"
      : "And so, the adventure continued in an unexpected way!";
    const fallbackChoices = language === Language.TH
      ? ["เดินทางเข้าป่า", "ไปที่ปราสาท", "ซ่อนตัวในถ้ำ"]
      : ["Go into the forest", "Go to the castle", "Hide in a cave"];
    return {
      text: fallbackText,
      imageUrl: "https://loremflickr.com/1280/720/adventure,magical,journey?lock=scene2",
      choices: fallbackChoices,
    };
  }
};

export const generateFinalStoryScene = async (storyHistory: string, language: Language, storyTone: StoryTone, words: string[], isImageGenerationEnabled: boolean): Promise<StoryScene> => {
    const toneDescription = language === Language.TH ? STORY_TONE_THAI[storyTone] : storyTone;
    const storyStylePrompt = language === Language.TH
      ? "สมมติตัวเองเป็นพ่อ/แม่ที่กำลังเล่านิทานให้ลูกฟังด้วยน้ำเสียงที่อบอุ่นและเป็นกันเอง"
      : "Act as a warm, friendly parent telling a story to a young child.";
    const prompt = language === Language.TH
      ? `นี่คือนิทานสำหรับเด็กอายุ 4-7 ปีในโทนเรื่อง "${toneDescription}" เนื้อเรื่องจนถึงตอนนี้คือ: "${storyHistory}" โปรดสร้างฉาก "จบ" เพื่อสรุปเรื่องราวนี้เป็นภาษาไทย ใช้ภาษาที่เรียบง่าย ประโยคสั้นๆ และเข้าใจง่ายเหมือนเล่าให้เด็กเล็กฟังจริงๆ สรุปเรื่องราวทั้งหมดให้สมบูรณ์ โดยให้มีตอนจบที่มีความสุขและให้ข้อคิดเชิงบวกที่เข้าใจง่ายซึ่งสอดคล้องกับโทนเรื่อง (ความยาว 2-4 ประโยค) คำสั่งสำคัญ: ผลลัพธ์ที่ได้จะต้องเป็นเนื้อเรื่องล้วนๆ และต้องขึ้นต้นด้วยเนื้อเรื่องทันที ห้ามมีคำอธิบาย, ป้ายกำกับ, หรือเครื่องหมาย Markdown (เช่น **) ใดๆ ทั้งสิ้น`
      : `This is a story for a 4-7 year old child with a "${storyTone}" tone. The story so far is: "${storyHistory}". Please create the final "Conclusion" scene to wrap up this story. CRITICAL: Use extremely simple, short sentences, as if speaking to a very young child. Conclude the entire story logically. Give it a happy ending and a simple, positive moral that fits the tone (2-4 sentences long). CRITICAL: The output must begin *directly* with the story narrative, with no preamble. The output must be ONLY the narrative text. Do not include any labels, descriptive tags, or markdown formatting.`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
              systemInstruction: storyStylePrompt,
            },
        });

        const storyText = (response.text ?? '').trim();
        if (!storyText) {
          throw new Error("API returned empty story text for final scene.");
        }
        const imageUrl = await generateImage(storyText, words, isImageGenerationEnabled);

        return { text: storyText, imageUrl };
    } catch (error) {
        console.error("Error generating final story scene:", error);
        const fallbackText = language === Language.TH
          ? "และแล้วทุกคนก็ได้อยู่ด้วยกันอย่างมีความสุข หลังจากได้เรียนรู้บทเรียนล้ำค่าเกี่ยวกับมิตรภาพ"
          : "And they all lived happily ever after, having learned a valuable lesson about friendship.";
        return {
            text: fallbackText,
            imageUrl: "https://loremflickr.com/1280/720/happy,ending,friends?lock=scene_final",
        };
    }
};

export const generateStoryTitle = async (storyHistory: string, language: Language): Promise<string> => {
  const prompt = language === Language.TH
    ? `จากนิทานสำหรับเด็กเรื่องนี้ ให้อ่านและตั้งชื่อเรื่องที่สั้น กระชับ และน่ารัก เหมาะสำหรับเด็กอายุ 4-7 ปี เป็นภาษาไทย เนื้อเรื่อง: '${storyHistory}' ผลลัพธ์ที่ได้จะต้องเป็นชื่อเรื่องเท่านั้น ห้ามมีข้อความอื่นใดๆ`
    : `Based on this short children's story, create a very short, simple, and sweet title in English suitable for a 4-7 year old. The story is: '${storyHistory}'. The output MUST be ONLY the title text, nothing else.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const title = (response.text ?? '').trim().replace(/"/g, ''); // Remove quotes
    if (!title) {
      throw new Error("API returned empty title.");
    }
    return title;
  } catch (error) {
    console.error("Error generating story title:", error);
    return language === Language.TH ? "นิทานของฉัน" : "My Story";
  }
};
