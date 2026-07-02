import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/supabaseClient';
import { decryptSession } from '@/app/cryptoHelper';

export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('gnflhs_session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ authenticated: false, user: null, profile: null });
    }

    const sessionData = await decryptSession(sessionCookie.value);

    if (!sessionData) {
      return NextResponse.json({ authenticated: false, user: null, profile: null });
    }

    const loginId = sessionData.id || sessionData.email;
    const type = sessionData.type || 'teacher';

    let profile: any = null;

    if (type === 'student') {
      const { data, error } = await supabase
        .from('students')
        .select('students, name') // pass는 의도적으로 제외하여 클라이언트에 보내지 않음
        .eq('students', loginId)
        .single();

      if (data && !error) {
        profile = { ...data, users: data.students, role: 'student' };
      }
    } else {
      const { data, error } = await supabase
        .from('teachers')
        .select('users, name, role') // pass는 의도적으로 제외하여 클라이언트에 보내지 않음
        .eq('users', loginId)
        .single();

      if (data && !error) {
        profile = data;
      }
    }

    if (!profile) {
      return NextResponse.json({ authenticated: false, user: null, profile: null });
    }

    return NextResponse.json({
      authenticated: true,
      user: sessionData,
      profile
    });
  } catch (error: any) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { error: '세션 확인 중 오류가 발생했습니다.' },
      { status: 500 }
    );
  }
}
