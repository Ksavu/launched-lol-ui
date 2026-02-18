import { NextRequest, NextResponse } from 'next/server';
import * as fs from 'fs';
import * as path from 'path';

const COMMENTS_DIR = path.join(process.cwd(), 'data', 'comments');

// Ensure directory exists
if (!fs.existsSync(COMMENTS_DIR)) {
  fs.mkdirSync(COMMENTS_DIR, { recursive: true });
}

function getCommentsFilePath(mint: string): string {
  return path.join(COMMENTS_DIR, `${mint}.json`);
}

function loadComments(mint: string): Array<{
  id: string;
  user: string;
  message: string;
  timestamp: number;
}> {
  const filePath = getCommentsFilePath(mint);
  
  if (!fs.existsSync(filePath)) {
    return [];
  }
  
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error loading comments:', error);
    return [];
  }
}

function saveComments(mint: string, comments: Array<{
  id: string;
  user: string;
  message: string;
  timestamp: number;
}>) {
  const filePath = getCommentsFilePath(mint);
  fs.writeFileSync(filePath, JSON.stringify(comments, null, 2), 'utf8');
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ mint: string }> }
) {
  const { mint } = await params;
  
  const comments = loadComments(mint);
  
  return NextResponse.json({
    comments,
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
  
  const comments = loadComments(mint);
  comments.push(comment);
  saveComments(mint, comments);
  
  return NextResponse.json({ success: true, comment });
}