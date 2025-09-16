// netlify/functions/generate-speech.ts

// นี่คือโค้ดฝั่ง Server ที่จะเรียก Gemini API จริงๆ
// สังเกตว่าเรา import @google/genai ได้ตามปกติเพราะนี่คือสภาพแวดล้อม Node.js

import { GoogleGenAI, Modality } from "@google/genai";

// Handler ของ Netlify Function
// มันจะถูกเรียกทุกครั้งที่มี request มาที่ /.netlify/functions/generate-speech
export const handler = async (event) => {
  // รับข้อความที่ต้องการแปลงเป็นเสียงจาก request body
  const { textToSpeak } = JSON.parse(event.body);

  if (!textToSpeak) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: "Missing textToSpeak parameter" }),
    };
  }

  try {
    // ใช้ API KEY จาก Environment Variable ที่ตั้งค่าไว้ใน Netlify
    // นี่เป็นวิธีที่ปลอดภัยที่สุด ห้ามใส่ Key ไว้ในโค้ดเด็ดขาด!
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

    const config = {
      responseModalities: [Modality.AUDIO], // ขอผลลัพธ์เป็นเสียง
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            // เราสามารถเปลี่ยนเสียงตรงนี้ได้ หรือจะส่งชื่อเสียงมาจาก Client ก็ได้
            voiceName: "Charon",
          },
        },
      },
    };

    // ใช้โมเดลที่รองรับ Text-to-Speech (TTS)
    // หมายเหตุ: ชื่อโมเดลอาจมีการเปลี่ยนแปลงในอนาคต
    const model = "gemini-2.5-pro-preview-tts";

    const contents = [
      {
        role: "user",
        parts: [{ text: textToSpeak }],
      },
    ];

    // เรียก API แบบ Stream เพื่อรับข้อมูลเสียง
    const response = await ai.models.generateContentStream({
      model,
      config,
      contents,
    });

    let audioBase64 = "";
    // วนลูปเพื่อรวบรวมข้อมูลเสียงที่ถูกส่งมาเป็นชิ้นๆ (chunks)
    for await (const chunk of response) {
      if (chunk.candidates?.[0]?.content?.parts?.[0]?.inlineData) {
        audioBase64 += chunk.candidates[0].content.parts[0].inlineData.data;
      }
    }

    if (!audioBase64) {
      throw new Error("Audio generation failed, no data received.");
    }

    // ส่งข้อมูลเสียงที่เข้ารหัสเป็น Base64 กลับไปให้ Client
    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        audioContent: audioBase64,
        mimeType: "audio/wav",
      }),
    };
  } catch (error) {
    console.error("Error generating speech:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: "Failed to generate speech" }),
    };
  }
};
