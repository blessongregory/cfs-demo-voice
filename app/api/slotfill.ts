import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { NextResponse } from 'next/server';

const requiredEnvVars = {
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
};

const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

let client: OpenAIClient | null = null;
if (!missingEnvVars.length) {
  client = new OpenAIClient(
    process.env.AZURE_OPENAI_ENDPOINT!,
    new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY!)
  );
}

function normalizeEmail(text: string): string {
  let email = text
    .replace(/\s+at\s+/gi, '@')
    .replace(/\s+dot\s+/gi, '.')
    .replace(/\s*\(at\)\s*/gi, '@')
    .replace(/\s*\(dot\)\s*/gi, '.')
    .replace(/\s+/g, '')
    .replace(/\[at\]/gi, '@')
    .replace(/\[dot\]/gi, '.')
    .toLowerCase();
  // Remove trailing punctuation
  email = email.replace(/[.,;:!?]+$/, '');
  return email;
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function extractEmailWithRegex(text: string): string | null {
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  const matches = text.match(emailRegex);
  return matches ? matches[0] : null;
}

function reconstructEmailFromWords(text: string): string | null {
  // Try to match patterns like 'john doe abc com' or 'jane smith gmail com'
  const words = text.trim().toLowerCase().split(/\s+/);
  if (words.length >= 3) {
    // Assume last two words are domain and tld
    const tld = words.pop();
    const domain = words.pop();
    const local = words.join('');
    if (local && domain && tld) {
      return `${local}@${domain}.${tld}`;
    }
  }
  return null;
}

export async function POST(req: Request) {
  try {
    if (missingEnvVars.length > 0) {
      return NextResponse.json(
        { error: `Missing required environment variables: ${missingEnvVars.join(', ')}` },
        { status: 500 }
      );
    }
    if (!client) {
      return NextResponse.json(
        { error: 'Azure OpenAI client not initialized' },
        { status: 500 }
      );
    }
    const { message, slotType } = await req.json();
    if (!message || !slotType) {
      return NextResponse.json(
        { error: 'Both message and slotType are required' },
        { status: 400 }
      );
    }
    let systemPrompt = '';
    if (slotType === 'address') {
      systemPrompt = `Extract only the address from the following user message. Return only the address as plain text, nothing else.`;
    } else if (slotType === 'email') {
      systemPrompt = `Extract only the email address from the following user message. If the email is spoken (e.g., 'john dot doe at gmail dot com'), convert it to a valid email address (e.g., 'john.doe@gmail.com'). Return only the email address as plain text, nothing else.`;
    } else {
      return NextResponse.json(
        { error: 'Invalid slotType. Must be "address" or "email".' },
        { status: 400 }
      );
    }
    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const response = await client.getChatCompletions(deploymentName!, [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ], {
      temperature: 0.2,
      maxTokens: 60,
    });
    let raw = response.choices[0]?.message?.content || '';
    raw = raw.trim().replace(/^"|"$/g, ''); // Remove surrounding quotes
    let value = raw;
    if (slotType === 'email') {
      // Aggressively normalize and reconstruct from ASR output
      let regexRawMsg = extractEmailWithRegex(message);
      let regexRawLLM = extractEmailWithRegex(raw);
      let finalValue = '';
      if (regexRawMsg && isValidEmail(regexRawMsg)) {
        finalValue = regexRawMsg;
      } else if (regexRawLLM && isValidEmail(regexRawLLM)) {
        finalValue = regexRawLLM;
      } else {
        // Normalize and regex-extract from LLM output
        let normalizedLLM = normalizeEmail(raw);
        let regexEmailLLM = extractEmailWithRegex(normalizedLLM);
        // Normalize and regex-extract from original message
        let normalizedMsg = normalizeEmail(message);
        let regexEmailMsg = extractEmailWithRegex(normalizedMsg);
        if (isValidEmail(normalizedLLM)) {
          finalValue = normalizedLLM;
        } else if (regexEmailLLM && isValidEmail(regexEmailLLM)) {
          finalValue = regexEmailLLM;
        } else if (isValidEmail(normalizedMsg)) {
          finalValue = normalizedMsg;
        } else if (regexEmailMsg && isValidEmail(regexEmailMsg)) {
          finalValue = regexEmailMsg;
        } else {
          // Try to reconstruct from words (spoken email with no at/dot)
          let reconstructed = reconstructEmailFromWords(raw);
          if (!reconstructed || !isValidEmail(reconstructed)) {
            reconstructed = reconstructEmailFromWords(message);
          }
          if (reconstructed && isValidEmail(reconstructed)) {
            finalValue = reconstructed;
          } else {
            // Try to aggressively join all words and insert @ and . if possible
            const words = message.trim().toLowerCase().split(/\s+/);
            if (words.length >= 3) {
              const tld = words[words.length - 1];
              const domain = words[words.length - 2];
              const local = words.slice(0, -2).join('');
              const guess = `${local}@${domain}.${tld}`;
              if (isValidEmail(guess)) {
                finalValue = guess;
              } else {
                finalValue = '';
              }
            } else {
              finalValue = '';
            }
          }
        }
      }
      // Log for debugging
      console.log('LLM output:', raw, '| RegexRawMsg:', regexRawMsg, '| RegexRawLLM:', regexRawLLM, '| Final:', finalValue);
      if (!finalValue) {
        return NextResponse.json({ value: '', error: 'Sorry, I could not extract a valid email address. Please say your email in the format john dot doe at gmail dot com, for example: jane dot smith at outlook dot com.' });
      }
      value = finalValue;
    } else if (slotType === 'address') {
      // Log for debugging
      console.log('LLM address output:', raw);
      value = raw;
    }
    return NextResponse.json({ value });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to extract slot value.' },
      { status: 500 }
    );
  }
} 