import { NextResponse } from 'next/server';

export async function GET() {
  const envVars = {
    AZURE_OPENAI_API_KEY: process.env.AZURE_OPENAI_API_KEY ? 'Set (hidden)' : 'Not set',
    AZURE_OPENAI_ENDPOINT: process.env.AZURE_OPENAI_ENDPOINT || 'Not set',
    AZURE_OPENAI_DEPLOYMENT_NAME: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'Not set',
  };

  return NextResponse.json(envVars);
} 