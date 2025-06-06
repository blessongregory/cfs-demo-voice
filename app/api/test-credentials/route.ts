import { NextResponse } from 'next/server';
import { SpeechClient } from '@google-cloud/speech';
import path from 'path';
import fs from 'fs';

export async function GET() {
  try {
    const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
    console.log('Current working directory:', process.cwd());
    console.log('Credentials path:', credentialsPath);
    
    // Verify the file exists
    if (!fs.existsSync(credentialsPath)) {
      throw new Error(`Credentials file not found at: ${credentialsPath}`);
    }
    
    const speechClient = new SpeechClient({
      keyFilename: credentialsPath
    });
    
    // Try to make a simple request to verify credentials
    const [response] = await speechClient.recognize({
      audio: {
        content: Buffer.from('test').toString('base64')
      },
      config: {
        encoding: 'LINEAR16',
        sampleRateHertz: 16000,
        languageCode: 'en-US'
      }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Credentials are working correctly',
      credentialsPath
    });
  } catch (error) {
    console.error('Error testing credentials:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      credentialsPath: path.join(process.cwd(), 'google-credentials.json')
    }, { status: 500 });
  }
} 