import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Mic, MicOff, Volume2, Phone } from 'lucide-react';
import { SuperannuationBalance } from './SuperannuationBalance';
import { PersonalDetails } from './PersonalDetails';

// CFS brand colors
const colors = {
  red: "#D81421",
  blue: "#164A9A",
};

// Add TypeScript definitions for the Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
  interpretation: any;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message: string;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  isFinal: boolean;
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: SpeechRecognitionErrorEvent) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

// Use type assertion for the global window object
const getSpeechRecognition = () => {
  if (typeof window === 'undefined') return null;
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  return SpeechRecognition ? new SpeechRecognition() : null;
};

interface VoiceAgentProps {
  onUpdateAddress: (address: string) => void;
  onUpdateEmail: (email: string) => void;
  onRequestBalance: () => void;
  onRequestPersonalDetails: () => void;
}

export const VoiceAgent = ({
  onUpdateAddress,
  onUpdateEmail,
  onRequestBalance,
  onRequestPersonalDetails,
}: VoiceAgentProps) => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [conversationState, setConversationState] = useState<'idle' | 'waiting_for_address'>('idle');
  const [showBalance, setShowBalance] = useState(false);
  const [showPersonalDetails, setShowPersonalDetails] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const speakResponse = async (text: string) => {
    setIsSpeaking(true);
    try {
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate speech');
      }

      const { audioContent } = await response.json();
      
      if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.onended = () => {
          setIsSpeaking(false);
          // If we were waiting for an address, start listening again
          if (conversationState === 'waiting_for_address') {
            console.log('Starting to listen for address after speech');
            startListening();
          }
        };
      }

      audioRef.current.src = `data:audio/mp3;base64,${audioContent}`;
      await audioRef.current.play();
    } catch (error) {
      console.error('Error speaking response:', error);
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    const recognition = getSpeechRecognition();
    if (recognition) {
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        console.log('Speech recognition result:', transcript);
        setTranscript(transcript);
        processVoiceCommand(transcript);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
        if (conversationState === 'waiting_for_address') {
          console.log('Error while waiting for address, retrying...');
          setTimeout(() => {
            speakResponse("I didn't catch that. Could you please repeat your new address?");
          }, 1000);
        } else {
          speakResponse("I'm sorry, I didn't catch that. Could you please try again?");
        }
      };

      recognition.onend = () => {
        console.log('Speech recognition ended, current state:', conversationState);
        setIsListening(false);
        // If we were waiting for an address and the recognition ended without an error,
        // we should restart listening
        if (conversationState === 'waiting_for_address' && !isSpeaking) {
          console.log('Restarting listening for address');
          setTimeout(() => {
            startListening();
          }, 1000);
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, [conversationState, isSpeaking]);

  const startListening = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      try {
        console.log('Starting speech recognition');
        recognition.start();
        setIsListening(true);
        if (conversationState === 'idle') {
          speakResponse("I'm listening. How can I help you?");
        }
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        setIsListening(false);
      }
    }
  };

  const stopListening = () => {
    const recognition = recognitionRef.current;
    if (recognition) {
      console.log('Stopping speech recognition');
      recognition.stop();
      setIsListening(false);
    }
  };

  const processVoiceCommand = (text: string) => {
    const lowerText = text.toLowerCase();
    console.log('Processing command:', lowerText, 'Current state:', conversationState);
    
    if (conversationState === 'waiting_for_address') {
      console.log('Received address:', text);
      // Update the address
      setCurrentAddress(text);
      onUpdateAddress(text);
      // Show confirmation and personal details
      speakResponse("I've updated your address. Here are your personal details.");
      setConversationState('idle');
      setShowPersonalDetails(true);
      setShowBalance(false);
      onRequestPersonalDetails();
    } else if (
      lowerText.includes('update address') || 
      lowerText.includes('change address') || 
      lowerText.includes('new address') ||
      lowerText.includes('modify address') ||
      lowerText.includes('i want to update my address') ||
      lowerText.includes('i want to change address')
    ) {
      console.log('Starting address update flow');
      setConversationState('waiting_for_address');
      speakResponse("Sure, I can update your address. What is your new address?");
    } else if (
      lowerText.includes('update email') || 
      lowerText.includes('change email') || 
      lowerText.includes('new email')
    ) {
      const email = text.split(/update email|change email|new email/i)[1]?.trim();
      if (email) {
        onUpdateEmail(email);
        speakResponse(`I've updated your email to ${email}`);
        setShowPersonalDetails(true);
        setShowBalance(false);
        onRequestPersonalDetails();
      } else {
        speakResponse("I didn't catch the email address. Could you please repeat it?");
      }
    } else if (
      lowerText.includes('show balance') || 
      lowerText.includes('check balance') || 
      lowerText.includes('my balance')
    ) {
      setShowBalance(true);
      setShowPersonalDetails(false);
      onRequestBalance();
      speakResponse("I'm showing your superannuation balance now.");
    } else if (
      lowerText.includes('show personal details') || 
      lowerText.includes('my details') || 
      lowerText.includes('personal information')
    ) {
      setShowPersonalDetails(true);
      setShowBalance(false);
      onRequestPersonalDetails();
      speakResponse("I'm displaying your personal details now.");
    } else {
      console.log('Command not recognized:', lowerText);
      speakResponse("I'm sorry, I didn't understand that command. You can try saying 'update address', 'show balance', or 'show personal details'.");
    }
  };

  return (
    <div className="bg-black rounded-[2.5rem] p-2 shadow-2xl max-w-sm mx-auto">
      <div className="bg-white rounded-[2rem] h-[640px] flex flex-col overflow-hidden">
        {/* Status Bar */}
        <div className="flex justify-between items-center px-6 py-2 text-sm font-medium" style={{ backgroundColor: colors.red }}>
          <span className="text-white">9:41</span>
          <div className="flex items-center gap-1">
            <div className="w-4 h-2 bg-white rounded-sm"></div>
            <Phone className="w-4 h-4 text-white" />
          </div>
        </div>

        {/* Header */}
        <div className="text-white p-4 text-center flex items-center justify-between" style={{
          background: `linear-gradient(to bottom, ${colors.red} 0%, ${colors.red} 50%, ${colors.blue} 50%, ${colors.blue} 100%)`,
        }}>
          <div className="flex items-center gap-3">
            <Image src="/CFS-logo.svg" alt="CFS Logo" width={70} height={30} />
            <div>
              <h1 className="text-lg font-semibold">Voice Assistant</h1>
              <p className="text-white text-sm opacity-80">AI-powered helper</p>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold" style={{ color: colors.blue }}>Voice Assistant</h2>
            <button
              onClick={isListening ? stopListening : startListening}
              className={`w-12 h-12 rounded-full flex items-center justify-center ${
                isListening ? 'bg-red-500' : 'bg-blue-500'
              } text-white shadow-lg hover:opacity-90 transition-opacity`}
              style={{ backgroundColor: isListening ? colors.red : colors.blue }}
            >
              {isListening ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
            </button>
          </div>
          
          {transcript && (
            <div className="mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-center gap-2">
                <p className="text-sm text-gray-700">{transcript}</p>
                {isSpeaking && <Volume2 className="w-4 h-4 text-blue-500 animate-pulse" />}
              </div>
            </div>
          )}

          {!transcript && !isListening && (
            <div className="text-center text-gray-500 mt-8">
              <Mic className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-sm">Tap the microphone to start</p>
              <p className="text-xs text-gray-400 mt-2">Try saying: "I want to update my address"</p>
            </div>
          )}

          {isListening && (
            <div className="text-center mt-4">
              <div className="inline-block p-2 rounded-full bg-red-100">
                <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
              </div>
              <p className="text-sm text-red-500 mt-2">
                {conversationState === 'waiting_for_address' ? 'Waiting for your new address...' : 'Listening...'}
              </p>
            </div>
          )}

          {/* Superannuation Balance */}
          <SuperannuationBalance isVisible={showBalance} />

          {/* Personal Details */}
          <PersonalDetails 
            isVisible={showPersonalDetails} 
            newAddress={currentAddress}
          />
        </div>
      </div>
    </div>
  );
}; 