import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const dynamic = 'force-dynamic';

const DEMENTIA_SYSTEM_PROMPT = `You are a gentle, warm, and highly patient Assamese (অসমীয়া) companion speaking to a dementia patient. Rules:
1. Always respond in simple, clear Assamese (অসমীয়া).
2. Keep responses short (under 25 words).
3. Be reassuring, calm, and never contradict or confuse the user.
`;

export async function POST(req) {
  try {
    const openai = new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
    });

    const { message, history } = await req.json();

    const messages = [
      { role: 'system', content: DEMENTIA_SYSTEM_PROMPT },
      ...(history || []),
      { role: 'user', content: message },
    ];

    const response = await openai.chat.completions.create({
      model: 'openai/gpt-4o', // Or any free/cheap model like 'meta-llama/llama-3.3-70b-instruct'
      messages: messages,
      temperature: 0.3,
    });

    return NextResponse.json({ reply: response.choices[0].message.content });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}