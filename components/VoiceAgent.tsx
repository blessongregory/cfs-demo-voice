import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Mic, MicOff, Volume2, Phone, MessageSquare, User, MapPin, Mail } from 'lucide-react';
import { SuperannuationBalance } from './SuperannuationBalance';
import { PersonalDetails } from './PersonalDetails';
import { SuperAccountCard, PersonalDetailsCard } from './InfoCards';
import { SuperannuationCard } from './SuperannuationCard';
import { EmailKeypadModal } from './EmailKeypadModal';

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
  const [showSuperCard, setShowSuperCard] = useState(false);
  const [superBalance, setSuperBalance] = useState(82394.10);
  const [superReturns, setSuperReturns] = useState(15112.30);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // --- New state for update flow ---
  const [updateStep, setUpdateStep] = useState<'idle'|'ask_new'|'waiting_otp'|'verified'>('idle');
  const [updateType, setUpdateType] = useState<'address'|'email'|null>(null);
  const [newValue, setNewValue] = useState('');
  const [otp, setOtp] = useState('');
  const [otpInput, setOtpInput] = useState('');
  const [showOtpPopup, setShowOtpPopup] = useState(false);
  const [personalInfo, setPersonalInfo] = useState({
    name: 'John Doe',
    email: 'john.doe@email.com',
    address: '123 Main St, Sydney NSW 2000',
    memberId: 'CFS123456',
    superannuationBalance: {
      currentBalance: 82394.10,
      lastUpdated: 'Mar 2025',
      growthRate: 0.12,
    },
  });

  // Add state to control card visibility
  const [showSuperAccountCard, setShowSuperAccountCard] = useState(false);
  const [showPersonalDetailsCard, setShowPersonalDetailsCard] = useState(false);

  // Live transcript history
  const [transcriptHistory, setTranscriptHistory] = useState<{ sender: 'user' | 'bot'; text: string; revealedWords?: number }[]>([]);
  const [revealTimer, setRevealTimer] = useState<NodeJS.Timeout | null>(null);

  // 1. Add new state for adviser appointment flow
  const [adviserStep, setAdviserStep] = useState<'idle'|'confirm'|'pick_slot'|'confirmed'>('idle');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [showCalendarCard, setShowCalendarCard] = useState(false);
  const [showAdviserCard, setShowAdviserCard] = useState(false);
  const [adviserProfile, setAdviserProfile] = useState<{
    name: string,
    title: string,
    company: string,
    avatarUrl?: string,
    specializations: string[],
    address: string,
    experience: string,
    clients: string,
    rating: number,
    phone: string,
    email: string,
    mapUrl?: string,
  } | null>(null);
  const adviserSlots = [
    'Monday 10:00am',
    'Tuesday 2:00pm',
    'Friday 11:00am',
  ];

  // 4. State for Choice of Fund form
  const [showChoiceOfFundForm, setShowChoiceOfFundForm] = useState(false);
  const [choiceOfFundStep, setChoiceOfFundStep] = useState<'idle'|'offer'|'confirm'|'done'>('idle');

  // State to track if job change was mentioned
  const [jobChangeMentioned, setJobChangeMentioned] = useState(false);

  // Add state for email keypad modal
  const [showEmailKeypadModal, setShowEmailKeypadModal] = useState(false);

  // Helper to reveal bot message word by word
  const revealBotMessage = (fullText: string, onDone?: () => void) => {
    // Split into words
    const words = fullText.split(' ');
    setTranscriptHistory((prev) => [
      ...prev,
      { sender: 'bot', text: fullText, revealedWords: 1 },
    ]);
    let currentWord = 1;
    if (revealTimer) clearInterval(revealTimer);
    const timer = setInterval(() => {
      currentWord++;
      setTranscriptHistory((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.sender === 'bot' && last.text === fullText) {
          return [
            ...prev.slice(0, -1),
            { ...last, revealedWords: Math.min(currentWord, words.length) },
          ];
        }
        return prev;
      });
      if (currentWord >= words.length) {
        clearInterval(timer);
        setRevealTimer(null);
        if (onDone) onDone();
      }
    }, 220); // ~220ms per word
    setRevealTimer(timer);
  };

  // Clean up timer on unmount
  useEffect(() => () => { if (revealTimer) clearInterval(revealTimer); }, [revealTimer]);

  const speakResponse = async (text: string) => {
    revealBotMessage(text);
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
          if (conversationState === 'waiting_for_address') {
            startListening();
          }
        };
      }
      audioRef.current.src = `data:audio/mp3;base64,${audioContent}`;
      await audioRef.current.play();
    } catch (error) {
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

  // Helper to clear all cards and adviser flow state
  function clearAllCards() {
    setShowSuperCard(false);
    setShowSuperAccountCard(false);
    setShowPersonalDetailsCard(false);
    setShowCalendarCard(false);
    setShowAdviserCard(false);
    setAdviserStep('idle');
    setSelectedSlot(null);
    setAdviserProfile(null);
  }

  // Helper to detect job change phrases
  function isJobChangeMessage(text: string) {
    return /changed jobs|new employer|started a new job|moved jobs|moved to a new employer/i.test(text);
  }

  // Helper for email validation
  function isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  const processVoiceCommand = async (text: string) => {
    // At the very start, check for job change mention
    if (isJobChangeMessage(text)) {
      setJobChangeMentioned(true);
    }

    // Add user message to transcript
    setTranscriptHistory((prev) => [...prev, { sender: 'user', text }]);
    // Adviser appointment flow
    if (adviserStep === 'confirm') {
      if (/yes|sure|ok|proceed|go ahead|book/i.test(text)) {
        setAdviserStep('pick_slot');
        setShowCalendarCard(true);
        setShowAdviserCard(false);
        setTranscriptHistory([]);
        speakResponse('Great! Here are some available times. Please pick a slot.');
        return;
      } else if (/no|not now|cancel/i.test(text)) {
        setAdviserStep('idle');
        setShowCalendarCard(false);
        setShowAdviserCard(false);
        speakResponse('No problem. Let me know if you need anything else.');
        return;
      }
    }
    if (adviserStep === 'pick_slot') {
      const slot = adviserSlots.find(s => text.toLowerCase().includes(s.split(' ')[0].toLowerCase()));
      if (slot) {
        setSelectedSlot(slot);
        setAdviserStep('confirmed');
        setShowCalendarCard(false);
        setShowAdviserCard(true);
        setTranscriptHistory([]);
        // Sample adviser profile
        setAdviserProfile({
          name: 'Sarah Lee',
          title: 'Senior CFS Adviser',
          company: 'CFS Financial Services',
          avatarUrl: '/adviser-photo.jpg',
          specializations: ['Retirement Planning', 'Investment Management'],
          address: '123 Main St, Sydney NSW 2000',
          experience: '10 years',
          clients: '500+',
          rating: 4.7,
          phone: '+61 412 345 678',
          email: 'sarah.lee@cfs.com.au',
          mapUrl: 'https://maps.google.com/?q=123+Main+St,+Sydney+NSW+2000',
        });
        speakResponse(`Your appointment with Sarah Lee is confirmed for ${slot}. You'll receive a confirmation email shortly.`);
        return;
      } else {
        speakResponse('Please pick one of the available time slots.');
        return;
      }
    }
    // --- If in update flow, handle steps ---
    if (updateStep === 'ask_new') {
      if (updateType === 'email') {
        setShowEmailKeypadModal(true);
        speakResponse('Can you please confirm your email address by typing it in, to make sure that I have captured it correctly?');
        return;
      }
      // Use Azure OpenAI slot filling for address
      const slotType = 'address';
      try {
        const res = await fetch('/api/slotfill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: text, slotType }),
        });
        const data = await res.json();
        const extractedValue = data.value || text;
        setNewValue(extractedValue);
        // Generate OTP
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setOtp(generatedOtp);
        setShowOtpPopup(true);
        setUpdateStep('waiting_otp');
        speakResponse(`I have sent a 6-digit code to your registered mobile number. Please tell me the code to confirm your identity.`);
      } catch (err) {
        setNewValue(text);
        // fallback to old flow if slot filling fails
        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        setOtp(generatedOtp);
        setShowOtpPopup(true);
        setUpdateStep('waiting_otp');
        speakResponse(`I have sent a 6-digit code to your registered mobile number. Please tell me the code to confirm your identity.`);
      }
      return;
    }
    if (updateStep === 'waiting_otp') {
      // Remove spaces and non-digits
      const spokenOtp = text.replace(/\D/g, '');
      setOtpInput(spokenOtp);
      if (spokenOtp === otp) {
        setUpdateStep('verified');
        setShowOtpPopup(false);
        // Update personal info
        if (updateType === 'address') {
          setPersonalInfo((info) => ({ ...info, address: newValue }));
        } else if (updateType === 'email') {
          setPersonalInfo((info) => ({ ...info, email: newValue }));
        }
        setShowPersonalDetailsCard(true);
        setTranscriptHistory([]); // Clear transcript when showing card
        speakResponse(`Your ${updateType} has been updated successfully. Here are your updated personal details.`);
      } else {
        speakResponse('The code you provided is incorrect. Please try again.');
      }
      return;
    }
    // Choice of Fund form flow
    if (choiceOfFundStep === 'offer') {
      if (/yes|confirm|ok|please|sure|go ahead/i.test(text)) {
        setChoiceOfFundStep('confirm');
        setShowChoiceOfFundForm(true);
        setTranscriptHistory([]);
        speakResponse('Here is your pre-filled Choice of Fund form. A copy has been sent to your email.');
        return;
      } else if (/no|not now|cancel/i.test(text)) {
        setChoiceOfFundStep('idle');
        setShowChoiceOfFundForm(false);
        speakResponse('No problem. Let me know if you need anything else.');
        return;
      }
    }
    // --- Normal LLM intent detection ---
    console.log('Processing voice command with LLM:', text);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: text }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to get LLM response');
      }
      const data = await res.json();
      const llmResponse = data.response;
      const intent = data.intent;
      console.log('Received LLM response:', llmResponse, 'Intent:', intent);
      if (intent === 'superannuation_balance_query') {
        clearAllCards();
        setShowSuperCard(true);
        setShowSuperAccountCard(true);
        setShowPersonalDetailsCard(false);
        setTranscriptHistory([]); // Clear transcript when showing card
        speakResponse(`Your superannuation balance is $82,394.10, which has grown by $15,112.30 since you joined.`);
      } else if (intent === 'update_address' || intent === 'update_email') {
        clearAllCards();
        setUpdateType(intent === 'update_address' ? 'address' : 'email');
        setUpdateStep('ask_new');
        setTranscriptHistory([]); // Clear transcript when showing card
        speakResponse(`What is your new ${intent === 'update_address' ? 'address' : 'email'}?`);
      } else if (intent === 'personal_details_query') {
        clearAllCards();
        setShowPersonalDetailsCard(true);
        setShowSuperAccountCard(false);
        setShowSuperCard(false);
        setTranscriptHistory([]); // Clear transcript when showing card
        speakResponse('Here are your personal details.');
      } else if (intent === 'adviser_appointment') {
        clearAllCards();
        setAdviserStep('confirm');
        setShowCalendarCard(false);
        setShowAdviserCard(false);
        setTranscriptHistory([]);
        speakResponse('I can help you set up an appointment with a CFS Adviser. Would you like to proceed?');
        return;
      } else if (intent === 'choice_of_fund_form') {
        clearAllCards();
        setChoiceOfFundStep('offer');
        setShowChoiceOfFundForm(false);
        setTranscriptHistory([]);
        speakResponse('I see you have changed jobs. Would you like me to pre-fill a Choice of Fund form for your new employer?');
        return;
      } else {
        clearAllCards();
        setUpdateStep('idle');
        if (llmResponse) {
          speakResponse(llmResponse);
        } else {
          speakResponse("I'm sorry, I couldn't get a response from the AI.");
        }
      }
    } catch (error) {
      console.error('Error processing voice command with LLM:', error);
      speakResponse("I'm sorry, there was an error processing your command.");
    }

    // After any intent flow completes (e.g., after showing a card or confirmation), check jobChangeMentioned
    maybeTriggerChoiceOfFund();
  };

  // Helper to check if the app is idle (no multi-step flow, no card except transcript)
  function isAppIdle() {
    return (
      updateStep === 'idle' &&
      adviserStep === 'idle' &&
      choiceOfFundStep === 'idle' &&
      !showSuperCard &&
      !showSuperAccountCard &&
      !showPersonalDetailsCard &&
      !showCalendarCard &&
      !showAdviserCard &&
      !showChoiceOfFundForm
    );
  }

  // Only call maybeTriggerChoiceOfFund() when isAppIdle() and jobChangeMentioned are true
  function maybeTriggerChoiceOfFund() {
    if (isAppIdle() && jobChangeMentioned) {
      setJobChangeMentioned(false);
      setTimeout(() => {
        setChoiceOfFundStep('offer');
        setShowChoiceOfFundForm(false);
        setTranscriptHistory([]);
        speakResponse('I see you have changed jobs. Would you like me to pre-fill a Choice of Fund form for your new employer?');
      }, 5000);
    }
  }

  // Sample super account data
  const superAccount = {
    accountName: 'FirstChoice Wholesale Personal Super',
    accountNumber: '0110 0775 1234',
    abn: '26 458 298 557',
    usi: 'FSY94949',
    logoUrl: '/cfs-logo.png',
  };

  // Improved CalendarCard component
  const CalendarCard = ({ onConfirm }: { onConfirm: (day: string, time: string) => void }) => {
    // Sample week and times
    const week = [
      { day: 'Mon', date: 2 },
      { day: 'Tue', date: 3 },
      { day: 'Wed', date: 4 },
      { day: 'Thu', date: 5 },
      { day: 'Fri', date: 6 },
      { day: 'Sat', date: 7 },
      { day: 'Sun', date: 8 },
    ];
    const availableTimes: Record<string, string[]> = {
      'Sat': ['09:00', '10:00', '11:00'],
      'Sun': [],
      'Mon': ['09:00', '10:00'],
      'Tue': ['10:00', '13:00'],
      'Wed': ['09:00', '11:00'],
      'Thu': ['09:00', '12:00'],
      'Fri': ['10:00', '13:00'],
    };
    const [selectedDay, setSelectedDay] = useState('Sat');
    const [selectedTime, setSelectedTime] = useState<string | null>(null);
    const times = availableTimes[selectedDay] || [];
    return (
      <div className="bg-white rounded-xl shadow-md p-6 my-4 max-w-md mx-auto border border-blue-100">
        <div className="font-semibold text-blue-900 mb-2 text-lg">Select Date & Time</div>
        {/* Week row */}
        <div className="flex justify-between items-center mb-4">
          <button className="text-gray-400 px-2 py-1" disabled>{'<'}</button>
          <div className="flex gap-2 flex-1 justify-between">
            {week.map(({ day, date }) => (
              <button
                key={day}
                className={`flex flex-col items-center px-2 py-1 rounded-lg transition-all
                  ${selectedDay === day ? 'bg-blue-600 text-white' : 'bg-gray-50 text-gray-700 hover:bg-blue-100'}`}
                onClick={() => { setSelectedDay(day); setSelectedTime(null); }}
              >
                <span className="text-xs font-medium">{day}</span>
                <span className="text-sm font-bold">{date}</span>
              </button>
            ))}
          </div>
          <button className="text-gray-400 px-2 py-1" disabled>{'>'}</button>
        </div>
        {/* Times */}
        <div className="mb-4">
          <div className="text-sm text-gray-700 mb-2">Available Times for {selectedDay}, June {week.find(w => w.day === selectedDay)?.date}</div>
          <div className="flex gap-2 flex-wrap">
            {['09:00', '10:00', '11:00', '12:00', '13:00'].map(time => (
              <button
                key={time}
                disabled={!times.includes(time)}
                className={`px-4 py-2 rounded-lg font-semibold text-sm border transition-all
                  ${selectedTime === time ? 'bg-blue-600 text-white border-blue-600' : times.includes(time) ? 'bg-blue-50 text-blue-900 border-blue-200 hover:bg-blue-100' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                onClick={() => setSelectedTime(time)}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
        <button
          className={`w-full py-2 rounded-lg font-semibold text-white transition-all
            ${selectedTime ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}
          disabled={!selectedTime}
          onClick={() => selectedTime && onConfirm(selectedDay, selectedTime)}
        >
          Confirm Appointment
        </button>
      </div>
    );
  };

  // Helper to parse slot string into date/time for the appointment card
  function parseSlot(slot: string): { date: string, time: string } {
    // Example slot: 'Sat 10:00'
    const [day, time] = slot.split(' ');
    // For demo, use a fixed date for each day
    const dayToDate: Record<string, string> = {
      Mon: 'June 2, 2024',
      Tue: 'June 3, 2024',
      Wed: 'June 4, 2024',
      Thu: 'June 5, 2024',
      Fri: 'June 6, 2024',
      Sat: 'June 7, 2024',
      Sun: 'June 8, 2024',
    };
    return { date: dayToDate[day] || 'June 2024', time: time || '' };
  }

  // 3. AdviserProfileCard component (redesigned)
  const AdviserProfileCard = ({ adviser, slot, appointment }: {
    adviser: {
      name: string,
      title: string,
      company: string,
      avatarUrl?: string,
      specializations: string[],
      address: string,
      experience: string,
      clients: string,
      rating: number,
      phone: string,
      email: string,
      mapUrl?: string,
    },
    slot: string,
    appointment: { date: string, time: string, purpose: string }
  }) => (
    <div className="bg-white rounded-xl shadow-md p-0 my-4 overflow-hidden border border-blue-100 max-w-md mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 bg-blue-50 px-6 py-4 relative">
        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center border-2 border-blue-200">
          {adviser.avatarUrl ? (
            <img src={adviser.avatarUrl} alt="Adviser" className="w-14 h-14 rounded-full object-cover" />
          ) : (
            <User className="w-8 h-8 text-blue-400" />
          )}
        </div>
        <div>
          <div className="text-lg font-bold text-gray-900">{adviser.name}</div>
          <div className="text-xs text-blue-700 font-semibold">{adviser.title}</div>
          <div className="text-xs text-gray-500">{adviser.company}</div>
        </div>
      </div>
      {/* Specializations */}
      <div className="flex flex-wrap gap-2 px-6 py-3">
        {adviser.specializations.map((spec, i) => (
          <span key={i} className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">{spec}</span>
        ))}
      </div>
      {/* Address */}
      <div className="flex items-center gap-2 px-6 text-sm text-gray-700 mb-2">
        <MapPin className="w-4 h-4 text-blue-400" />
        <span>{adviser.address}</span>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 px-6 py-2">
        <div className="bg-blue-50 rounded-lg flex flex-col items-center py-2">
          <span className="text-xs text-gray-500">Experience</span>
          <span className="font-semibold text-blue-900 text-sm">{adviser.experience}</span>
        </div>
        <div className="bg-blue-50 rounded-lg flex flex-col items-center py-2">
          <span className="text-xs text-gray-500">Clients</span>
          <span className="font-semibold text-blue-900 text-sm">{adviser.clients}</span>
        </div>
        <div className="bg-blue-50 rounded-lg flex flex-col items-center py-2">
          <span className="text-xs text-gray-500">Rating</span>
          <span className="font-semibold text-yellow-500 text-sm flex items-center gap-1">{'★'.repeat(Math.round(adviser.rating))}<span className="text-blue-900">{adviser.rating.toFixed(1)}</span></span>
        </div>
      </div>
      {/* Contact */}
      <div className="px-6 py-2 flex flex-col gap-2 text-sm">
        <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-blue-400" /> <span>{adviser.phone}</span> <span className="ml-auto text-blue-700 font-semibold cursor-pointer">Call</span></div>
        <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-blue-400" /> <span>{adviser.email}</span> <span className="ml-auto text-blue-700 font-semibold cursor-pointer">Send</span></div>
        <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-blue-400" /> <span>View Location</span> <span className="ml-auto text-blue-700 font-semibold cursor-pointer">Map</span></div>
      </div>
      {/* Appointment Confirmation */}
      <div className="bg-blue-50 border-l-4 border-blue-600 mx-6 my-4 p-4 rounded-lg">
        <div className="font-semibold text-blue-900 mb-1 flex items-center gap-2"><span className="inline-block w-2 h-2 bg-blue-600 rounded-full"></span>Scheduled Appointment</div>
        <div className="text-sm text-blue-900"><span className="font-medium">Date:</span> {appointment.date}</div>
        <div className="text-sm text-blue-900"><span className="font-medium">Time:</span> {appointment.time}</div>
        <div className="text-sm text-blue-900"><span className="font-medium">Purpose:</span> {appointment.purpose}</div>
      </div>
    </div>
  );

  // 5. ChoiceOfFundFormCard component
  const ChoiceOfFundFormCard = ({ member, fund, onClose }: { member: any, fund: any, onClose: () => void }) => (
    <div className="bg-white rounded-xl shadow-md p-6 my-4 max-w-md mx-auto border border-blue-100 relative">
      <button
        className="absolute top-3 right-3 text-blue-400 hover:text-blue-700 text-xl font-bold focus:outline-none"
        onClick={onClose}
        aria-label="Close"
      >
        ×
      </button>
      <div className="font-semibold text-blue-900 text-lg mb-2">Choice of Fund Form</div>
      <div className="mb-4 text-gray-700 text-sm">This form is pre-filled for you. You can submit it to your new employer.</div>
      <div className="mb-2"><span className="font-medium text-gray-800">Member Name:</span> {member.name}</div>
      <div className="mb-2"><span className="font-medium text-gray-800">Member ID:</span> {member.memberId}</div>
      <div className="mb-2"><span className="font-medium text-gray-800">Email:</span> {member.email}</div>
      <div className="mb-2"><span className="font-medium text-gray-800">Address:</span> {member.address}</div>
      <div className="mb-2"><span className="font-medium text-gray-800">Fund Name:</span> {fund.name}</div>
      <div className="mb-2"><span className="font-medium text-gray-800">Fund ABN:</span> {fund.abn}</div>
      <div className="mb-2"><span className="font-medium text-gray-800">Fund USI:</span> {fund.usi}</div>
      <div className="mb-2"><span className="font-medium text-gray-800">Fund Address:</span> {fund.address}</div>
      <div className="mt-4 bg-blue-50 border-l-4 border-blue-600 p-3 rounded">
        <div className="text-blue-900 font-semibold">A copy of this form has been sent to your email.</div>
      </div>
    </div>
  );

  // Add useEffect to proactively trigger Choice of Fund when app becomes idle and jobChangeMentioned is true
  useEffect(() => {
    if (isAppIdle() && jobChangeMentioned) {
      maybeTriggerChoiceOfFund();
    }
  }, [
    updateStep,
    adviserStep,
    choiceOfFundStep,
    showSuperCard,
    showSuperAccountCard,
    showPersonalDetailsCard,
    showCalendarCard,
    showAdviserCard,
    showChoiceOfFundForm,
    jobChangeMentioned
  ]);

  // SuperAccountCard with close button
  const SuperAccountCardWithClose = ({ account, onClose }: { account: any, onClose: () => void }) => (
    <div className="relative">
      <button className="absolute top-2 right-2 text-blue-400 hover:text-blue-700 text-xl font-bold focus:outline-none z-10" onClick={onClose} aria-label="Close">×</button>
      <SuperAccountCard account={account} />
    </div>
  );
  // PersonalDetailsCard with close button
  const PersonalDetailsCardWithClose = ({ details, onClose }: { details: any, onClose: () => void }) => (
    <div className="relative">
      <button className="absolute top-2 right-2 text-blue-400 hover:text-blue-700 text-xl font-bold focus:outline-none z-10" onClick={onClose} aria-label="Close">×</button>
      <PersonalDetailsCard details={details} />
    </div>
  );
  // SuperannuationCard with close button
  const SuperannuationCardWithClose = ({ balance, returns, accountNumber, onClose }: { balance: number, returns: number, accountNumber: string, onClose: () => void }) => (
    <div className="relative">
      <button className="absolute top-2 right-2 text-blue-400 hover:text-blue-700 text-xl font-bold focus:outline-none z-10" onClick={onClose} aria-label="Close">×</button>
      <SuperannuationCard balance={balance} returns={returns} accountNumber={accountNumber} />
    </div>
  );
  // AdviserProfileCard with close button
  const AdviserProfileCardWithClose = ({ adviser, slot, appointment, onClose }: any) => (
    <div className="relative">
      <button className="absolute top-2 right-2 text-blue-400 hover:text-blue-700 text-xl font-bold focus:outline-none z-10" onClick={onClose} aria-label="Close">×</button>
      <AdviserProfileCard adviser={adviser} slot={slot} appointment={appointment} />
    </div>
  );
  // CalendarCard with close button
  const CalendarCardWithClose = ({ onConfirm, onClose }: { onConfirm: (day: string, time: string) => void, onClose: () => void }) => (
    <div className="relative">
      <button className="absolute top-2 right-2 text-blue-400 hover:text-blue-700 text-xl font-bold focus:outline-none z-10" onClick={onClose} aria-label="Close">×</button>
      <CalendarCard onConfirm={onConfirm} />
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="relative bg-black rounded-[2.5rem] shadow-2xl overflow-hidden" style={{ width: 375, height: 812 }}>
        {/* Notch */}
        <div className="absolute top-3 left-1/2 transform -translate-x-1/2 bg-black rounded-full w-24 h-5 z-30 shadow-inner border border-gray-800" />
        {/* OTP Popup as SMS notification INSIDE the mobile mock-up */}
        {showOtpPopup && (
          <div className="absolute top-12 left-1/2 transform -translate-x-1/2 z-40 w-[90%] animate-slidein">
            <div className="flex items-center bg-white border border-gray-300 shadow-lg rounded-2xl px-4 py-3">
              <div className="mr-3 text-blue-600">
                <MessageSquare size={28} />
              </div>
              <div className="flex-1">
                <div className="text-xs text-gray-500 font-semibold mb-1">New Message</div>
                <div className="text-sm text-gray-800">Your OTP code is <span className="font-bold tracking-widest text-blue-700">{otp}</span></div>
                <div className="text-xs text-gray-400 mt-1">From: CFS Security</div>
              </div>
            </div>
          </div>
        )}
        {/* Phone screen (white, slightly inset) */}
        <div className="absolute inset-2 bg-white rounded-[2rem] flex flex-col overflow-hidden z-10" style={{height: 'calc(100% - 16px)'}}>
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

          {/* Main content area: flex-col, allow cards to fill space */}
          <div className="flex-1 flex flex-col px-2 pb-24 overflow-y-auto relative"> {/* pb-24 for mic space */}
            {/* Live transcript - only show if no cards are visible */}
            {!(showSuperAccountCard || showPersonalDetailsCard || showSuperCard) && transcriptHistory.length > 0 && (
              <div className="my-4">
                {transcriptHistory.map((msg, idx) => (
                  <div key={idx} className={`mb-2 flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`px-3 py-2 rounded-lg text-sm max-w-[80%] ${msg.sender === 'user' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100 text-gray-800'}`}>
                      {msg.sender === 'bot' && typeof msg.revealedWords === 'number'
                        ? msg.text.split(' ').slice(0, msg.revealedWords).join(' ') + (msg.revealedWords < msg.text.split(' ').length ? '...' : '')
                        : msg.text}
                    </div>
                  </div>
                ))}
              </div>
            )}
            {/* Calendar Card - only show if relevant */}
            {showCalendarCard && <CalendarCardWithClose onConfirm={(day, time) => processVoiceCommand(`${day} ${time}`)} onClose={() => { setShowCalendarCard(false); setAdviserStep('idle'); }} />}
            {/* Adviser Profile Card - only show if relevant */}
            {showAdviserCard && adviserProfile && selectedSlot && (
              <AdviserProfileCardWithClose
                adviser={adviserProfile}
                slot={selectedSlot}
                appointment={{
                  ...parseSlot(selectedSlot),
                  purpose: 'Initial Consultation',
                }}
                onClose={() => { setShowAdviserCard(false); setAdviserStep('idle'); }}
              />
            )}
            {/* Super Account Card - only show if relevant */}
            {showSuperAccountCard && <SuperAccountCardWithClose account={superAccount} onClose={() => { setShowSuperAccountCard(false); setShowSuperCard(false); }} />}
            {/* Personal Details Card - only show if relevant */}
            {showPersonalDetailsCard && <PersonalDetailsCardWithClose details={personalInfo} onClose={() => { setShowPersonalDetailsCard(false); }} />}
            {showSuperCard && <SuperannuationCardWithClose balance={superBalance} returns={superReturns} accountNumber={superAccount.accountNumber} onClose={() => { setShowSuperCard(false); }} />}
            {/* Choice of Fund Form Card - only show if relevant */}
            {showChoiceOfFundForm && <ChoiceOfFundFormCard member={personalInfo} fund={{ name: 'Colonial First State Superannuation', abn: '26 458 298 557', usi: 'FSY94949', address: 'GPO Box 3956, Sydney NSW 2001' }} onClose={() => { setShowChoiceOfFundForm(false); setChoiceOfFundStep('idle'); }} />}
          </div>
          {/* Mic button fixed at bottom center */}
          <div className="absolute left-0 right-0 bottom-6 flex justify-center pointer-events-none z-20">
            <button
              onClick={isListening ? stopListening : startListening}
              className={`rounded-full p-5 shadow-lg transition-all duration-200 pointer-events-auto
                ${isListening ? 'bg-red-600 pulse-red scale-110' : 'bg-blue-600'} text-white`}
              aria-label={isListening ? 'Stop listening' : 'Start listening'}
            >
              <Mic size={32} />
            </button>
          </div>
          {/* Email Keypad Modal strictly inside the phone screen */}
          {showEmailKeypadModal && (
            <div className="absolute left-0 right-0 bottom-0 z-50 pb-3" style={{maxWidth: '100%'}}>
              <EmailKeypadModal
                onComplete={(email: string) => {
                  setNewValue(email);
                  setShowEmailKeypadModal(false);
                  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
                  setOtp(generatedOtp);
                  setShowOtpPopup(true);
                  setUpdateStep('waiting_otp');
                  speakResponse(`I have sent a 6-digit code to your registered mobile number. Please tell me the code to confirm your identity.`);
                }}
                onCancel={() => setShowEmailKeypadModal(false)}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 