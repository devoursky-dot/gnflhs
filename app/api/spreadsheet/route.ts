import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  try {
    if (id) {
      // 특정 ID의 상세 데이터(컬럼, 로우 포함) 가져오기
      const item = await prisma.spreadsheet.findUnique({
        where: { id: Number(id) }
      });
      return NextResponse.json(item);
    }

    // 전체 목록 가져오기 (ID와 제목만)
    const list = await prisma.spreadsheet.findMany({ 
      select: { id: true, title: true },
      orderBy: { id: 'asc' } 
    });
    return NextResponse.json(list || []);
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, title, columns, rows } = body;

    const now = new Date();
    // ID가 없으면 0을 넣어 새로운 레코드 생성을 유도 (Int 타입 대응)
    const upsertId = id ? Number(id) : 0;

    const result = await prisma.spreadsheet.upsert({
      where: { id: upsertId },
      update: { 
        title: title, 
        columns: JSON.stringify(columns || []), 
        rows: JSON.stringify(rows || []),
        updatedAt: now // 수정 시간 주입
      },
      create: { 
        title: title || "새 테이블", 
        columns: JSON.stringify(columns || []), 
        rows: JSON.stringify(rows || []),
        createdAt: now, // 생성 시간 주입
        updatedAt: now 
      },
    });
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("DB 작업 에러 상세:", error);
    // 실제 에러 메시지를 포함하여 반환함으로써 디버깅을 돕습니다.
    return NextResponse.json({ 
      error: "데이터 저장 실패", 
      details: error.message 
    }, { status: 500 });
  }
}