'use client';

import { useState, useRef, useCallback } from 'react';
import { Button } from './ui/button';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { recognizeSpeech, startStreamingRecognition, synthesizeSpeech } from '@/lib/speech';

export function VoiceAssistant() {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const stopStreamingRef = useRef<(() => void) | null>(null);

  const startListening = useCallback(async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunks.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        if (audioChunks.length === 0) return;

        setIsProcessing(true);
        try {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm;codecs=opus' });
          const audioBuffer = await audioBlob.arrayBuffer();
          const result = await recognizeSpeech(Buffer.from(audioBuffer));
          setTranscript(result.transcript);
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Failed to process audio');
        } finally {
          setIsProcessing(false);
        }
      };

      // Start streaming recognition
      const stopStreaming = await startStreamingRecognition(
        (result) => {
          setTranscript(result.transcript);
          if (result.isFinal) {
            setIsProcessing(false);
          }
        },
        (err) => {
          setError(err.message);
          setIsProcessing(false);
        }
      );
      stopStreamingRef.current = stopStreaming;

      mediaRecorder.start(100); // Collect data every 100ms
      setIsListening(true);
      setIsProcessing(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
    }
  }, []);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    if (stopStreamingRef.current) {
      stopStreamingRef.current();
      stopStreamingRef.current = null;
    }
    setIsListening(false);
  }, []);

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="flex items-center gap-2">
        <Button
          onClick={isListening ? stopListening : startListening}
          disabled={isProcessing}
          className="w-12 h-12 rounded-full"
        >
          {isProcessing ? (
            <Loader2 className="w-6 h-6 animate-spin" />
          ) : isListening ? (
            <MicOff className="w-6 h-6" />
          ) : (
            <Mic className="w-6 h-6" />
          )}
        </Button>
        <span className="text-sm text-muted-foreground">
          {isListening ? 'Listening...' : isProcessing ? 'Processing...' : 'Click to speak'}
        </span>
      </div>
      
      {transcript && (
        <div className="w-full max-w-md p-4 bg-muted rounded-lg">
          <p className="text-sm">{transcript}</p>
        </div>
      )}
      
      {error && (
        <div className="w-full max-w-md p-4 bg-destructive/10 text-destructive rounded-lg">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
} 