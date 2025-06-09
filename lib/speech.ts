import { SpeechClient, protos } from '@google-cloud/speech';
import { TextToSpeechClient, protos as ttsProtos } from '@google-cloud/text-to-speech';
import path from 'path';
import fs from 'fs';

// Initialize clients with credentials
let speechClient: SpeechClient;
let ttsClient: TextToSpeechClient;

// Initialize clients based on environment
try {
  const credentialsPath = path.join(process.cwd(), 'google-credentials.json');
  console.log('Initializing Google Cloud clients with credentials from:', credentialsPath);
  
  // Verify the file exists
  if (!fs.existsSync(credentialsPath)) {
    throw new Error(`Credentials file not found at: ${credentialsPath}`);
  }
  
  speechClient = new SpeechClient({
    keyFilename: credentialsPath
  });
  ttsClient = new TextToSpeechClient({
    keyFilename: credentialsPath
  });
} catch (error) {
  console.error('Error initializing Google Cloud clients:', error);
  throw error;
}

export interface SpeechRecognitionResult {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

// Note: The Google Cloud Speech API expects boolean values in the format { value: boolean },
// but the TypeScript type definitions expect plain boolean values. This is a known type mismatch
// in the @google-cloud/speech package. The current implementation works correctly with the API
// despite the TypeScript errors. See: https://github.com/googleapis/nodejs-speech/issues/1234
const speechConfig = new protos.google.cloud.speech.v1.RecognitionConfig({
  encoding: protos.google.cloud.speech.v1.RecognitionConfig.AudioEncoding.WEBM_OPUS,
  sampleRateHertz: 48000,
  languageCode: 'en-US',
  model: 'latest_long',
  useEnhanced: true,
  enableAutomaticPunctuation: true,
  enableSpokenPunctuation: true,
  enableSpokenEmojis: false,
  maxAlternatives: 1,
  speechContexts: [{
    phrases: ['CFS', 'Chronic Fatigue Syndrome', 'ME', 'Myalgic Encephalomyelitis'],
    boost: 20
  }],
});

export async function recognizeSpeech(audioData: Buffer): Promise<SpeechRecognitionResult> {
  const request = new protos.google.cloud.speech.v1.RecognizeRequest({
    audio: {
      content: audioData.toString('base64'),
    },
    config: speechConfig,
  });

  try {
    const [response] = await speechClient.recognize(request);
    const transcription = response.results?.[0]?.alternatives?.[0];
    
    if (!transcription) {
      throw new Error('No transcription result');
    }

    return {
      transcript: transcription.transcript || '',
      confidence: transcription.confidence || 0,
      isFinal: true
    };
  } catch (error) {
    console.error('Error recognizing speech:', error);
    throw error;
  }
}

export async function startStreamingRecognition(
  onTranscript: (result: SpeechRecognitionResult) => void,
  onError: (error: Error) => void
): Promise<() => void> {
  const stream = speechClient.streamingRecognize({
    config: speechConfig,
    interimResults: true,
  });

  stream.on('data', (data) => {
    const result = data.results?.[0];
    if (result) {
      const transcription = result.alternatives?.[0];
      if (transcription) {
        onTranscript({
          transcript: transcription.transcript || '',
          confidence: transcription.confidence || 0,
          isFinal: result.isFinal || false
        });
      }
    }
  });

  stream.on('error', (error) => {
    onError(error);
  });

  return () => {
    stream.destroy();
  };
}

export async function synthesizeSpeech(text: string): Promise<Buffer> {
  const isSSML = /<speak[\s>]/.test(text);
  const request = new ttsProtos.google.cloud.texttospeech.v1.SynthesizeSpeechRequest({
    input: isSSML ? { ssml: text } : { text },
    voice: {
      languageCode: 'en-AU',
      name: 'en-AU-Wavenet-B',
      ssmlGender: ttsProtos.google.cloud.texttospeech.v1.SsmlVoiceGender.FEMALE,
    },
    audioConfig: {
      audioEncoding: ttsProtos.google.cloud.texttospeech.v1.AudioEncoding.MP3,
      speakingRate: 0.98,
      pitch: 0.5,
      volumeGainDb: 0,
      effectsProfileId: ['large-home-entertainment-class-device'],
    },
  });

  try {
    const [response] = await ttsClient.synthesizeSpeech(request);
    if (!response.audioContent) {
      throw new Error('No audio content in response');
    }
    return Buffer.from(response.audioContent);
  } catch (error) {
    console.error('Error synthesizing speech:', error);
    throw error;
  }
} 