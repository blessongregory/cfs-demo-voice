import { NextRequest, NextResponse } from 'next/server';
import { TextToSpeechClient } from '@google-cloud/text-to-speech';
import path from 'path';
import fs from 'fs';

// Debug: Log the current working directory and check if credentials file exists
const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
console.log('Current working directory:', process.cwd());
console.log('Looking for credentials at:', credentialsPath);
console.log('Credentials file exists:', fs.existsSync(credentialsPath));

// Initialize the Text-to-Speech client with credentials
const client = new TextToSpeechClient({
  keyFilename: credentialsPath,
});

interface SpeechRequest {
  type?: 'synthesize' | 'recognize'; // Make type optional and specify possible values
  data?: string; // Make data optional
  text?: string; // Add optional text field for backward compatibility
}

export async function POST(request: Request) {
  try {
    const requestBody = await request.json();
    console.log('Received speech request body:', requestBody);

    const { type, data, text: oldText } = requestBody as SpeechRequest;
    console.log('Extracted type:', type, 'Extracted data:', data, 'Extracted oldText:', oldText);

    // Handle synthesize request
    if (type === 'synthesize' || type === undefined) { // Treat undefined type as synthesize (for old VoiceAgent calls)
      const textToSynthesize = data || oldText; // Prefer data, fallback to oldText

      if (!textToSynthesize) {
        console.error('Synthesize request received empty text data.');
        return NextResponse.json(
          { error: 'Text for synthesis is required' },
          { status: 400 }
        );
      }
      console.log('Text being sent to Google TTS for synthesis:', textToSynthesize);

      const ttsRequest = {
        input: { text: textToSynthesize },
        voice: {
          languageCode: 'en-US',
          name: 'en-US-Neural2-J',
          ssmlGender: 'MALE' as const,
        },
        audioConfig: {
          audioEncoding: 'MP3' as const,
          speakingRate: 1.0,
          pitch: 0,
        },
      };

      const [response] = await client.synthesizeSpeech(ttsRequest);
      const audioContent = Buffer.from(response.audioContent || '').toString('base64');
      return NextResponse.json({ audioContent });

    } else if (type === 'recognize') {
      // Handle recognize request
      const audioData = data; // Audio data is expected in the 'data' field

      if (!audioData) {
          console.error('Recognize request received empty audio data.');
           return NextResponse.json(
              { error: 'Audio data for recognition is required' },
              { status: 400 }
           );
      }
       console.log('Audio data received for recognition (first 50 chars):', audioData.substring(0, 50));

      // TODO: Implement Google Speech-to-Text recognition here
      // This part of the original API was not fully implemented in the provided code.
      // You would typically decode the base64 audioData and send it to the
      // Google Speech-to-Text API client.

       return NextResponse.json({
         transcript: 'Speech recognition is not fully implemented yet.', // Placeholder response
       });

    } else {
        console.error('Received unknown request type:', type);
         return NextResponse.json(
            { error: 'Unknown request type' },
            { status: 400 }
         );
    }

  } catch (error) {
    console.error('Error in speech API route:', error);
    return NextResponse.json(
      { error: 'Failed to process speech request' },
      { status: 500 }
    );
  }
} 