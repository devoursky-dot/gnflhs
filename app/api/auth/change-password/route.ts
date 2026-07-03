import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/supabaseClient';
import { decryptSession } from '@/app/cryptoHelper';

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('gnflhs_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ error: '인증 세션이 유효하지 않습니다.' }, { status: 401 });
    }

    const sessionData = await decryptSession(sessionCookie.value);

    if (!sessionData) {
      return NextResponse.json({ error: '인증 세션이 유효하지 않습니다.' }, { status: 401 });
    }

    const { currentPass, newPass, confirmPass } = await request.json();

    if (!currentPass || !newPass || !confirmPass) {
      return NextResponse.json({ error: '모든 비밀번호 필드를 입력해주세요.' }, { status: 400 });
    }

    if (newPass !== confirmPass) {
      return NextResponse.json({ error: '새 비밀번호가 일치하지 않습니다.' }, { status: 400 });
    }

    const loginId = sessionData.id || sessionData.email;
    const type = sessionData.type || 'teacher';

    const table = type === 'student' ? 'students' : 'teachers';
    const column = type === 'student' ? 'students' : 'users';

    // 1. 기존 비밀번호 확인을 위한 조회
    const { data: user, error: fetchErr } = await supabase
      .from(table)
      .select('*')
      .eq(column, loginId)
      .single();

    if (fetchErr || !user) {
      return NextResponse.json({ error: '사용자를 찾을 수 없습니다.' }, { status: 404 });
    }

    if (user.pass !== currentPass) {
      return NextResponse.json({ error: '현재 비밀번호가 올바르지 않습니다.' }, { status: 400 });
    }

    // 2. 새 비밀번호로 업데이트
    const { error: updateErr } = await supabase
      .from(table)
      .update({ pass: newPass })
      .eq(column, loginId);

    if (updateErr) {
      throw updateErr;
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Password change API error:', error);
    return NextResponse.json(
      { error: `비밀번호 변경 처리 중 오류가 발생했습니다: ${error.message}` },
      { status: 500 }
    );
  }
}
