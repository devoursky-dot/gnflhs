import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const enginesPath = path.join(process.cwd(), 'app', 'engines');
    
    // 폴더 목록 읽기 (v1, v2 등)
    const dirs = fs.readdirSync(enginesPath, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory() && dirent.name.startsWith('v'))
      .map(dirent => dirent.name)
      .sort((a, b) => b.localeCompare(a, undefined, { numeric: true })); // 최신순 정렬

    return NextResponse.json({ engines: dirs });
  } catch (error) {
    return NextResponse.json({ engines: ['v1'] }); // 에러 시 기본값
  }
}
