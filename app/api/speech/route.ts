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
  text: string;
}

export async function POST(request: Request) {
  try {
    const { text } = await request.json() as SpeechRequest;

    // Configure the text-to-speech request
    const ttsRequest = {
      input: { text },
      // Using the latest neural voice (en-US-Neural2-J)
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

    // Perform the text-to-speech request
    const [response] = await client.synthesizeSpeech(ttsRequest);
    
    // Convert the audio content to base64
    const audioContent = Buffer.from(response.audioContent || '').toString('base64');

    return NextResponse.json({ audioContent });
  } catch (error) {
    console.error('Error in text-to-speech:', error);
    return NextResponse.json(
      { error: 'Failed to generate speech' },
      { status: 500 }
    );
  }
} 