import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

// Interface for the incoming request body
interface SpeechRequestBody {
  textToSpeak: string;
  language: string; // e.g., 'th-TH', 'en-US'
}

// Google Cloud Text-to-Speech API endpoint
const TTS_API_URL = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.API_KEY}`;

const handler: Handler = async (event: HandlerEvent, context: HandlerContext) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    };
  }

  try {
    const { textToSpeak, language } = JSON.parse(event.body || '{}') as SpeechRequestBody;

    if (!textToSpeak || !language) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing textToSpeak or language in request body' }),
      };
    }

    // Determine voice settings based on language
    // These are standard, high-quality WaveNet voices from Google Cloud TTS.
    const voiceConfig = language.startsWith('th')
      ? { languageCode: 'th-TH', name: 'th-TH-Wavenet-A', ssmlGender: 'FEMALE' }
      : { languageCode: 'en-US', name: 'en-US-Wavenet-D', ssmlGender: 'MALE' };

    const requestBody = {
      input: {
        text: textToSpeak,
      },
      voice: voiceConfig,
      audioConfig: {
        audioEncoding: 'MP3', // MP3 is widely supported
      },
    };

    const ttsResponse = await fetch(TTS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!ttsResponse.ok) {
      const errorBody = await ttsResponse.text();
      console.error('Google TTS API Error:', errorBody);
      throw new Error(`Google TTS API failed with status: ${ttsResponse.status}`);
    }

    const responseData = await ttsResponse.json();
    const audioContent = responseData.audioContent; // This is a base64 encoded string

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        audioContent: audioContent,
        mimeType: 'audio/mpeg', // Corresponds to MP3 encoding
      }),
    };
  } catch (error) {
    console.error('Error in generate-speech function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ message: 'Internal Server Error', error: error.message }),
    };
  }
};

export { handler };
