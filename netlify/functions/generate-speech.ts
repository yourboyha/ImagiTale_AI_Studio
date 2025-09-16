// netlify/functions/generate-speech.ts

// นี่คือโค้ดเวอร์ชันแก้ไข ที่เรียกใช้ Google Cloud Text-to-Speech API โดยตรง
// ซึ่งเป็นวิธีที่ถูกต้องและเสถียรที่สุด

// Handler ของ Netlify Function
export const handler = async (event) => {
  const { textToSpeak, language } = JSON.parse(event.body);

  if (!textToSpeak) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing textToSpeak parameter' }),
    };
  }

  // กำหนดค่าเสียงตามภาษาที่ส่งมาจาก Client
  const voiceConfig = language === 'th-TH'
    ? { languageCode: 'th-TH', name: 'th-TH-Standard-A' } // เสียงผู้หญิงไทยที่เป็นธรรมชาติ
    : { languageCode: 'en-US', name: 'en-US-Studio-O' }; // เสียงผู้หญิงคุณภาพสตูดิโอ (เสียงนุ่มนวล)

  try {
    const API_KEY = process.env.API_KEY;
    const ttsApiUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

    const response = await fetch(ttsApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          text: textToSpeak,
        },
        voice: voiceConfig,
        audioConfig: {
          audioEncoding: 'MP3', // ใช้ MP3 เพื่อคุณภาพที่ดีและขนาดไฟล์ที่เล็ก
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error('Google TTS API Error:', errorBody);
      throw new Error(`Google TTS API responded with status: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.audioContent) {
        throw new Error("Audio generation failed, no audioContent in response from Google TTS API.");
    }

    // ส่งข้อมูลเสียงที่เข้ารหัสเป็น Base64 กลับไปให้ Client
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioContent: data.audioContent, mimeType: 'audio/mpeg' }), // mimeType สำหรับ MP3
    };

  } catch (error) {
    console.error('Error in generate-speech function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate speech' }),
    };
  }
};
