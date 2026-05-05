import { NextResponse } from 'next/server';
import { getTeamForUser } from '@/lib/db/queries';
import { checkRoutePermission } from '@/lib/auth/permissions-guard';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';
import { z } from 'zod';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

export async function POST(request: Request) {
  try {
    const { error: permError } = await checkRoutePermission('automation');
    if (permError) return permError;

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file');

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: 'No valid file uploaded' }, { status: 400 });
    }

    // Forensic Check: File Size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File size exceeds limit (10MB)' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Sanitize extension: only allow safe automation formats (json, yaml, yml)
    const rawExt = file.name.split('.').pop()?.toLowerCase() || 'json';
    const allowedExtensions = ['json', 'yaml', 'yml'];
    const extension = allowedExtensions.includes(rawExt) ? rawExt : 'json';

    const uniqueId = uuidv4();
    const filename = `${uniqueId}.${extension}`;
    
    const relativeDirPath = path.join('uploads', 'automation');
    const absoluteDirPath = path.join(process.cwd(), 'public', relativeDirPath);
    const absoluteFilePath = path.join(absoluteDirPath, filename);

    await fs.mkdir(absoluteDirPath, { recursive: true });
    await fs.writeFile(absoluteFilePath, buffer);

    const publicUrl = `/${relativeDirPath}/${filename}`;

    await logger.info('Automation file uploaded', {
      teamId: team.id,
      filename: file.name,
      storedName: filename,
      size: file.size,
      mimetype: file.type
    });

    return NextResponse.json({ 
      url: publicUrl, 
      filename: file.name, 
      mimetype: file.type 
    });

  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}