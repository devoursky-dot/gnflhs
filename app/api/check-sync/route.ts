import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const previewDir = path.join(process.cwd(), 'app', 'preview', '[appId]');
    const engineDir = path.join(process.cwd(), 'app', 'engines', 'v1');

    const files = ['utils.ts', 'renderer.tsx', 'modals.tsx'];
    const results = files.map(file => {
      const previewPath = path.join(previewDir, file);
      const enginePath = path.join(engineDir, file);

      if (!fs.existsSync(previewPath) || !fs.existsSync(enginePath)) {
        return { file, synced: false, error: 'File not found' };
      }

      const previewContent = fs.readFileSync(previewPath, 'utf-8').replace(/\s/g, '');
      const engineContent = fs.readFileSync(enginePath, 'utf-8').replace(/\s/g, '');

      return {
        file,
        synced: previewContent === engineContent
      };
    });

    const allSynced = results.every(r => r.synced);

    return NextResponse.json({
      allSynced,
      details: results
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
