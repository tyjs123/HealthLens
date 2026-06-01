import { NextResponse } from 'next/server';

export const runtime = 'edge';

export async function GET() {
  const key = process.env.MOONSHOT_API_KEY || process.env.DEEPSEEK_API_KEY || '';
  const provider = process.env.MOONSHOT_API_KEY ? 'moonshot' : process.env.DEEPSEEK_API_KEY ? 'deepseek' : '';
  return NextResponse.json({ apiKey: key, provider });
}
