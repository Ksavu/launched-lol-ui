import { NextRequest, NextResponse } from 'next/server';

// In-memory storage (replace with database in production)
const comments: Record<string, Array<{
  id: string;
  user: string;
  message: string;
  timestamp: number;
}>> = {};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;
  
  return NextResponse.json({
    comments: comments[mint] || [],
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;
  const { user, message } = await request.json();
  
  if (!user || !message) {
    return NextResponse.json({ error: 'Missing user or message' }, { status: 400 });
  }
  
  if (message.length > 500) {
    return NextResponse.json({ error: 'Message too long (max 500 chars)' }, { status: 400 });
  }
  
  const comment = {
    id: Date.now().toString(),
    user,
    message,
    timestamp: Date.now(),
  };
  
  if (!comments[mint]) {
    comments[mint] = [];
  }
  
  comments[mint].push(comment);
  
  return NextResponse.json({ success: true, comment });
}