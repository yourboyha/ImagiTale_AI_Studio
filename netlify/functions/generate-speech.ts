// netlify/functions/generate-speech.ts

// --- DEBUGGING VERSION ---
// This version will help us confirm if the API Key is being loaded.

export const handler = async (event) => {
  // --- DEBUGGING STEP ---
  // We will log to the Netlify console to see if the API key is loaded.
  const API_KEY = process.env.API_KEY;
  console.log(`Function triggered. Attempting to use API Key. Is it loaded? ${API_KEY ? `Yes, starts with: ${API_KEY.substring(0, 4)}...` : 'No, it is UNDEFINED!'}`);
  // --- END DEBUGGING STEP ---

  // If the API Key is not found, return a specific error.
  if (!API_KEY) {
    console.error("CRITICAL: API_KEY environment variable is not set or not accessible in Netlify Functions.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Server configuration error: API key not found.' }),
    };
  }

  const { textToSpeak, language } = JSON.parse(event.body);

  if (!textToSpeak) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing textToSpeak parameter' }),
    };
  }

  const voiceConfig = language === 'th-TH'
    ? { languageCode: 'th-TH', name: 'th-TH-Standard-A' }
    : { languageCode: 'en-US', name: 'en-US-Studio-O' };

  try {
    const ttsApiUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;

    const response = await fetch(ttsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: { text: textToSpeak },
        voice: voiceConfig,
        audioConfig: { audioEncoding: 'MP3' },
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

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioContent: data.audioContent, mimeType: 'audio/mpeg' }),
    };

  } catch (error) {
    console.error('Error in generate-speech function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to generate speech' }),
    };
  }
};
