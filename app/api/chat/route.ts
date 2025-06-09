import { OpenAIClient, AzureKeyCredential } from '@azure/openai';
import { NextResponse } from 'next/server';

// Debug environment variables
console.log('Environment variables check:');
console.log('AZURE_OPENAI_API_KEY exists:', !!process.env.AZURE_OPENAI_API_KEY);
console.log('AZURE_OPENAI_ENDPOINT exists:', !!process.env.AZURE_OPENAI_ENDPOINT);
console.log('AZURE_OPENAI_DEPLOYMENT_NAME exists:', !!process.env.AZURE_OPENAI_DEPLOYMENT_NAME);

// Validate environment variables
const requiredEnvVars = {
  AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY,
  AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT,
  AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME,
};

// Check for missing environment variables
const missingEnvVars = Object.entries(requiredEnvVars)
  .filter(([_, value]) => !value)
  .map(([key]) => key);

if (missingEnvVars.length > 0) {
  console.error('Missing required environment variables:', missingEnvVars);
}

// Initialize Azure OpenAI client only if all required variables are present
let client: OpenAIClient | null = null;
if (!missingEnvVars.length) {
  try {
    client = new OpenAIClient(
      process.env.AZURE_OPENAI_ENDPOINT!,
      new AzureKeyCredential(process.env.AZURE_OPENAI_API_KEY!)
    );
    console.log('Azure OpenAI client initialized successfully');
  } catch (error) {
    console.error('Error initializing Azure OpenAI client:', error);
  }
}

export async function POST(req: Request) {
  try {
    // Check for missing environment variables
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

    const { message } = await req.json();

    if (!message) {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const deploymentName = process.env.AZURE_OPENAI_DEPLOYMENT_NAME;
    const systemPrompt = `You are a helpful assistant for Colonial First State. For every user message, respond in JSON with two fields:\n- intent: a short string describing the user's intent (e.g., 'superannuation_balance_query', 'update_address', 'update_email', 'adviser_appointment', 'choice_of_fund_form', 'general_question', etc.)\n- response: your natural language reply to the user.\n\nIntent rules:\n- If the user asks about their superannuation fund balance, set intent to 'superannuation_balance_query'.\n- If the user wants to update or change their address, set intent to 'update_address'.\n- If the user wants to update or change their email, set intent to 'update_email'.\n- If the user wants to optimize, grow, or get advice about their fund, or asks about better investment options, set intent to 'adviser_appointment'.\n- If the user mentions changing jobs, starting a new job, or moving to another employer, set intent to 'choice_of_fund_form'.\n\nFor 'adviser_appointment' intent:\n- Guide the user through setting up an appointment with a CFS Adviser.\n- First, confirm if they want to proceed.\n- If yes, offer a few available time slots (e.g., 'Monday 10am', 'Tuesday 2pm', 'Friday 11am').\n- Wait for the user to pick a slot.\n- Once a slot is chosen, confirm the appointment and provide a summary (adviser name, date, time).\n- Use natural, conversational language.\n\nFor 'choice_of_fund_form' intent:\n- ONLY trigger this intent if the user mentions changing jobs, starting a new job, or moving to another employer.\n- Proactively offer to pre-fill a Choice of Fund form for the user to submit to their new employer.\n- If the user confirms (e.g., says yes, ok, please, confirm, sure, go ahead) after you have offered the form, reply with the same intent and a confirmation message (e.g., 'Here is your pre-filled Choice of Fund form. A copy has been sent to your email.').\n- If the user declines, do not show the form.\n- Use natural, conversational language.\n- Always respond in JSON with 'intent' and 'response'.`;
    const response = await client.getChatCompletions(deploymentName!, [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: message
      }
    ], {
      temperature: 0.7,
      maxTokens: 300,
    });
    let raw = response.choices[0]?.message?.content || '';
    // --- Strip code block markers if present ---
    raw = raw.trim();
    if (raw.startsWith('```')) {
      raw = raw.replace(/^```[a-zA-Z]*\n?/, '').replace(/```$/, '').trim();
    }
    let intent = 'general_question';
    let llmResponse = raw;
    try {
      const parsed = JSON.parse(raw);
      intent = parsed.intent || 'general_question';
      llmResponse = parsed.response || raw;
    } catch (e) {
      // fallback: not JSON, treat as generic
    }
    return NextResponse.json({ intent, response: llmResponse });
  } catch (error) {
    console.error('Error in chat API:', error);
    
    // Handle specific error types
    if (error instanceof Error) {
      if (error.message.includes('authentication')) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check your Azure OpenAI API credentials.' },
          { status: 401 }
        );
      }
      if (error.message.includes('deployment')) {
        return NextResponse.json(
          { error: 'Invalid deployment name. Please check your Azure OpenAI deployment configuration.' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to process the request. Please try again later.' },
      { status: 500 }
    );
  }
} 