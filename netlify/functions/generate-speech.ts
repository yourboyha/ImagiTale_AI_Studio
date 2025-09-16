import type { Handler, HandlerEvent } from "@netlify/functions";
import { GoogleGenAI, Type, Modality } from "@google/genai";

// --- INITIALIZE CLIENT ---
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });


// --- WAV CONVERSION HELPERS ---
// These functions convert the raw audio data from Gemini TTS into a
// browser-playable WAV file format.

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function parseMimeType(mimeType: string): WavConversionOptions {
  const defaultOptions = { numChannels: 1, sampleRate: 24000, bitsPerSample: 16 };
  if (!mimeType) return defaultOptions;
  
  try {
    const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
    const [_, format] = fileType.split('/');

    const options: Partial<WavConversionOptions> = {};

    if (format && format.toLowerCase().startsWith('l')) {
        const bits = parseInt(format.slice(1), 10);
        if (!isNaN(bits)) options.bitsPerSample = bits;
    }

    for (const param of params) {
        const [key, value] = param.split('=').map(s => s.trim());
        if (key === 'rate' && !isNaN(parseInt(value, 10))) {
            options.sampleRate = parseInt(value, 10);
        }
    }
    return { ...defaultOptions, ...options };
  } catch(e) {
    console.error("Error parsing MIME type, using defaults:", e);
    return defaultOptions;
  }
}

function createWavHeader(dataLength: number, options: WavConversionOptions): Buffer {
  const { numChannels, sampleRate, bitsPerSample } = options;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const buffer = Buffer.alloc(44);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + dataLength, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // PCM
  buffer.writeUInt16LE(1, 20); // AudioFormat 1 = PCM
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(dataLength, 40);

  return buffer;
}


// --- HANDLER FOR GEMINI SPEECH ---
const handleGenerateGeminiSpeech = async (payload: { text: string; voice: string; language: string }) => {
    const { text, voice } = payload;
    
    // Using the Gemini TTS model as requested
    const model = 'gemini-2.5-pro-preview-tts';
    const contents = [{ role: 'user', parts: [{ text }] }];
    const config = {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
            voiceConfig: {
                prebuiltVoiceConfig: { voiceName: voice }
            }
        },
    };

    const response = await ai.models.generateContentStream({ model, config, contents });

    let audioBase64 = '';
    let mimeType = '';
    for await (const chunk of response) {
        if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
            const inlineData = chunk.candidates[0].content.parts[0].inlineData;
            audioBase64 += inlineData.data;
            if (!mimeType) mimeType = inlineData.mimeType;
        }
    }

    if (!audioBase64) throw new Error("Audio generation failed, no data received.");
    
    // Convert raw audio to browser-playable WAV format
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const wavOptions = parseMimeType(mimeType);
    const wavHeader = createWavHeader(audioBuffer.length, wavOptions);
    const wavBuffer = Buffer.concat([wavHeader, audioBuffer]);

    return { audioContent: wavBuffer.toString('base64'), mimeType: 'audio/wav' };
};

// --- HANDLER FOR VOCABULARY LIST ---
const handleGenerateVocabulary = async (payload: { category: string }) => {
    const { category } = payload;
    const prompt = `Generate a list of 5 simple vocabulary words for a 3-6 year old child related to the category "${category}". For each word, provide both the Thai and English translation.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    words: {
                        type: Type.ARRAY,
                        description: "An array of 5 vocabulary words.",
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                thai: { type: Type.STRING, description: "The Thai word." },
                                english: { type: Type.STRING, description: "The English word." },
                            },
                            required: ['thai', 'english'],
                        },
                    },
                },
                required: ['words'],
            },
        },
    });

    const jsonResponse = JSON.parse(response.text);
    return jsonResponse.words;
};

// --- HANDLER FOR IMAGE GENERATION ---
const handleGenerateImage = async (payload: { prompt: string, aspectRatio: string }) => {
    const { prompt, aspectRatio } = payload;
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/jpeg',
            aspectRatio: aspectRatio as "1:1" | "16:9" | "9:16" | "4:3" | "3:4",
        },
    });

    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    const imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
    return { imageUrl };
};

// --- HANDLER FOR STORY SCENE GENERATION ---
const handleGenerateFullStoryScene = async (payload: { prompt: string, isImageGenerationEnabled: boolean }) => {
    const { prompt, isImageGenerationEnabled } = payload;
    
    const textResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    text: { type: Type.STRING, description: "The paragraph for this scene of the story. Should be simple and for a young child." },
                    choices: {
                        type: Type.ARRAY,
                        description: "A list of 2 simple, distinct choices for the child to continue the story. This array should be empty for the final scene.",
                        items: { type: Type.STRING },
                    },
                },
                required: ['text', 'choices'],
            },
        },
    });
    
    const sceneContent = JSON.parse(textResponse.text);
    const { text, choices } = sceneContent;

    let imageUrl = `https://loremflickr.com/1280/720/storybook,illustration,${text.split(' ').slice(0, 3).join(',')}`;
    if (isImageGenerationEnabled) {
        const imagePrompt = `A beautiful and simple illustration for a children's storybook, in a whimsical and colorful style, with soft lighting. The scene is: "${text}"`;
        try {
            const imageResponse = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt: imagePrompt,
                config: {
                    numberOfImages: 1,
                    outputMimeType: 'image/jpeg',
                    aspectRatio: '16:9',
                },
            });
            const base64ImageBytes = imageResponse.generatedImages[0].image.imageBytes;
            imageUrl = `data:image/jpeg;base64,${base64ImageBytes}`;
        } catch (imgError) {
            console.error("Image generation failed, using fallback:", imgError);
        }
    }

    return { text, choices, imageUrl };
};

// --- HANDLER FOR STORY TITLE ---
const handleGenerateStoryTitle = async (payload: { prompt: string }) => {
    const { prompt } = payload;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    return { title: response.text.trim().replace(/"/g, '') };
};

// --- MAIN NETLIFY FUNCTION HANDLER ---
const handler: Handler = async (event: HandlerEvent) => {
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ message: 'Method Not Allowed' }) };
    }

    try {
        const { task, payload } = JSON.parse(event.body || '{}');

        let result;
        switch (task) {
            case 'generateGeminiSpeech':
                result = await handleGenerateGeminiSpeech(payload);
                break;
            case 'generateVocabularyList':
                result = await handleGenerateVocabulary(payload);
                break;
            case 'generateImage':
                result = await handleGenerateImage(payload);
                break;
            case 'generateFullStoryScene':
                result = await handleGenerateFullStoryScene(payload);
                break;
            case 'generateStoryTitle':
                result = await handleGenerateStoryTitle(payload);
                break;
            default:
                return { statusCode: 400, body: JSON.stringify({ message: `Unknown task: ${task}` }) };
        }
        
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
        };

    } catch (error) {
        console.error(`Error processing task:`, error);
        // Attempt to parse Gemini API errors for clearer client-side messages
        let errorMessage = (error as Error).message;
        try {
            const nestedError = JSON.parse(errorMessage);
            if (nestedError.error && nestedError.error.message) {
                errorMessage = nestedError.error.message;
            }
        } catch (e) { /* Not a JSON error, use original message */ }

        return { 
            statusCode: 500, 
            body: JSON.stringify({ 
                message: "An error occurred on the server.",
                error: errorMessage
            }) 
        };
    }
};

export { handler };