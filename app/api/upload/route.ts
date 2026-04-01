import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { auth } from '@/auth';

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    if (buffer.length === 0) {
      return NextResponse.json({ error: 'Uploaded file is empty (0 bytes)' }, { status: 400 });
    }

    // Create unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const originalExt = path.extname(file.name) || '.webm'; // default to webm for audio
    const filename = `${uniqueSuffix}${originalExt}`;
    
    // Save to an external persistent volume or fallback to public/uploads/audio/[user_id]
    const userId = session.user.id as string || 'guest';
    const baseUploadDir = process.env.UPLOAD_DIR 
      ? path.resolve(process.env.UPLOAD_DIR)
      : path.join(process.cwd(), 'public', 'uploads', 'audio');
    const uploadDir = path.join(baseUploadDir, userId);
    
    // Ensure directory exists
    await fs.mkdir(uploadDir, { recursive: true });
    
    const filepath = path.join(uploadDir, filename);
    await fs.writeFile(filepath, buffer);

    // The public URL path
    const url = `/uploads/audio/${userId}/${filename}`;
    console.log(`[API Upload] Successfully saved recording to ${filepath}. Public URL: ${url}`)

    return NextResponse.json({ url, filename });
  } catch (error: any) {
    console.error('Error uploading file:', error);
    return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 });
  }
}
