"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Mic, MicOff, MapPin, Phone, AlertCircle, Volume2, VolumeX } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import Image from "next/image"
import { VoiceAgent } from '../components/VoiceAgent'
import { PersonalDetailsCard } from '../components/InfoCards'

interface Message {
  id: number
  text: string
  sender: "user" | "bot"
  timestamp: Date
}

const botResponses = [
  "Sure, what is your new address?",
  "Alright, I have updated the address. Can I help you in any other way?",
]

// CFS brand colors from the logo
const colors = {
  red: "#D81421",
  blue: "#164A9A",
}

interface CustomerData {
  name: string
  email: string
  address: string
  memberId: string
  superannuationBalance: {
    currentBalance: number
    lastUpdated: string
    growthRate: number
  }
}

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentStep, setCurrentStep] = useState(0)
  const [isListening, setIsListening] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [showAddressCard, setShowAddressCard] = useState(false)
  const [conversationStarted, setConversationStarted] = useState(false)
  const [userAddress, setUserAddress] = useState("")
  const [error, setError] = useState("")
  const [buttonClicked, setButtonClicked] = useState(false)
  const [customerData, setCustomerData] = useState<CustomerData | null>(null)
  const [showPersonalDetails, setShowPersonalDetails] = useState(false)
  const [showBalance, setShowBalance] = useState(false)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const audioChunksRef = useRef<Blob[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages are added
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages, showAddressCard, isTyping])

  const speakText = async (text: string) => {
    console.log('Text received by speakText (raw):', text);
    const processedText = text.trim(); // Trim whitespace
    console.log('Text received by speakText (processed):', processedText);

    // Only proceed if the processed text is not empty
    if (!processedText) {
      console.warn('speakText received empty or whitespace-only text, skipping synthesis.');
      return;
    }

    try {
      setIsSpeaking(true)
      const response = await fetch('/api/speech', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: 'synthesize',
          data: processedText, // Send the processed text
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to synthesize speech')
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)
      const audio = new Audio(audioUrl)
      
      await new Promise((resolve, reject) => {
        audio.onended = resolve
        audio.onerror = reject
        audio.play()
      })
    } catch (error) {
      console.error('Error speaking text:', error)
      setError('Failed to speak text')
    } finally {
      setIsSpeaking(false)
    }
  }

  const addMessage = (text: string, sender: "user" | "bot") => {
    const newMessage: Message = {
      id: Date.now(),
      text,
      sender,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, newMessage])
  }

  const simulateTyping = (duration = 1000) => {
    setIsTyping(true)
    return new Promise((resolve) => {
      setTimeout(() => {
        setIsTyping(false)
        resolve(void 0)
      }, duration)
    })
  }

  const handleSpeechResult = async (transcript: string) => {
    console.log("Handling speech result:", transcript, "at step:", currentStep)
    setError("")
    addMessage(transcript, "user")

    if (currentStep === 0) {
      // User said they want to update address
      console.log("Step 0: User wants to update address")
      await simulateTyping(1000)
      const botResponse = botResponses[0]
      addMessage(botResponse, "bot")

      // Speak the bot response
      await speakText(botResponse)

      setCurrentStep(1)
    } else if (currentStep === 1) {
      // User provided address
      console.log("Step 1: User provided address:", transcript)
      setUserAddress(transcript)
      await simulateTyping(1000)
      const botResponse = botResponses[1]
      addMessage(botResponse, "bot")

      // Speak the bot response
      await speakText(botResponse)

      setCurrentStep(2)

      // Show address card
      setTimeout(() => {
        setShowAddressCard(true)
      }, 500)
    } else if (currentStep === 2) {
      // User said goodbye
      console.log("Step 2: User said goodbye")
      const farewell = "Thank you! Your address has been successfully updated. Have a great day!"
      addMessage(farewell, "bot")

      // Speak the farewell message
      await speakText(farewell)

      setCurrentStep(3)
    }
  }

  const handleMicrophoneClick = () => {
    console.log("Microphone button clicked! Current step:", currentStep)
    setButtonClicked(true)

    if (isListening) {
      stopListening()
    } else {
      startListening()
    }
  }

  const startListening = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm',
      })
      mediaRecorderRef.current = mediaRecorder
      audioChunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data)
        }
      }

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' })
        const reader = new FileReader()
        
        reader.onload = async () => {
          const base64Audio = (reader.result as string).split(',')[1]
          
          try {
            const response = await fetch('/api/speech', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                type: 'recognize',
                data: base64Audio,
              }),
            })

            if (!response.ok) {
              throw new Error('Failed to recognize speech')
            }

            const result = await response.json()
            if (result.transcript) {
              handleSpeechResult(result.transcript)
            } else {
              setError('No speech detected')
            }
          } catch (error) {
            console.error('Error recognizing speech:', error)
            setError('Failed to recognize speech')
          }
        }

        reader.readAsDataURL(audioBlob)
      }

      // Start recording and set a timeout to stop after 5 seconds
      mediaRecorder.start()
      setIsListening(true)
      setError("")
      
      // Stop recording after 5 seconds
      setTimeout(() => {
        if (mediaRecorderRef.current && isListening) {
          stopListening()
        }
      }, 5000)
    } catch (error) {
      console.error('Error starting recording:', error)
      setError('Failed to access microphone')
    }
  }

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      try {
        mediaRecorderRef.current.stop()
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop())
      } catch (error) {
        console.error('Error stopping recording:', error)
      } finally {
        setIsListening(false)
      }
    }
  }

  const startConversation = () => {
    console.log("Starting conversation")
    setConversationStarted(true)
    setCurrentStep(0)
    setMessages([])
    setShowAddressCard(false)
    setUserAddress("")
    setError("")
    setButtonClicked(false)
    setIsSpeaking(false)
  }

  const resetConversation = () => {
    console.log("Resetting conversation")
    stopListening()
    setConversationStarted(false)
    setCurrentStep(0)
    setMessages([])
    setShowAddressCard(false)
    setUserAddress("")
    setIsListening(false)
    setIsTyping(false)
    setIsSpeaking(false)
    setError("")
    setButtonClicked(false)
  }

  // Simple logic: microphone is active for steps 0, 1, and 2 when not typing and not speaking
  const canUseMicrophone = conversationStarted && currentStep <= 2 && !isTyping && !isSpeaking

  useEffect(() => {
    fetchCustomerData()
  }, [])

  const fetchCustomerData = async () => {
    try {
      const response = await fetch('/api/customer')
      const data = await response.json()
      setCustomerData(data)
    } catch (error) {
      console.error('Error fetching customer data:', error)
    }
  }

  const handleUpdateAddress = async (address: string) => {
    try {
      const response = await fetch('/api/customer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ address }),
      })
      const data = await response.json()
      setCustomerData(data.data)
      setShowPersonalDetails(true)
    } catch (error) {
      console.error('Error updating address:', error)
    }
  }

  const handleUpdateEmail = async (email: string) => {
    try {
      const response = await fetch('/api/customer', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      })
      const data = await response.json()
      setCustomerData(data.data)
      setShowPersonalDetails(true)
    } catch (error) {
      console.error('Error updating email:', error)
    }
  }

  const handleRequestBalance = () => {
    setShowBalance(true)
  }

  const handleRequestPersonalDetails = () => {
    setShowPersonalDetails(true)
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <Card className="mb-8">
              <CardContent className="p-6">
                <VoiceAgent
                  onUpdateAddress={handleUpdateAddress}
                  onUpdateEmail={handleUpdateEmail}
                  onRequestBalance={handleRequestBalance}
                  onRequestPersonalDetails={handleRequestPersonalDetails}
                />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </main>
  )
}
