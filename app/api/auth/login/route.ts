import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/supabaseClient';
import { encryptSession } from '@/app/cryptoHelper';

export async function POST(request: NextRequest) {
  try {
    const { loginId, loginPass } = await request.json();

    if (!loginId || !loginPass) {
      return NextResponse.json(
        { error: '아이디와 비밀번호를 모두 입력해주세요.' },
        { status: 400 }
      );
    }

    let loginUser: any = null;
    let loginType: 'teacher' | 'student' = 'teacher';

    // 1. 교사 테이블 조회
    const { data: teacher, error: teacherErr } = await supabase
      .from('teachers')
      .select('*')
      .eq('users', loginId)
      .single();

    if (teacher && teacher.pass === loginPass) {
      loginUser = teacher;
      loginType = 'teacher';
    } else {
      // 2. 학생 테이블 조회
      const { data: student, error: studentErr } = await supabase
        .from('students')
        .select('*')
        .eq('students', loginId)
        .single();

      if (student && student.pass === loginPass) {
        loginUser = student;
        loginType = 'student';
      }
    }

    if (!loginUser) {
      return NextResponse.json(
        { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
        { status: 401 }
      );
    }

    // 세션 및 쿠키 구성
    const sessionInfo = { id: loginId, email: loginId, type: loginType };
    const encryptedSession = await encryptSession(sessionInfo);

    const response = NextResponse.json({
      success: true,
      user: sessionInfo,
      profile: loginType === 'student'
        ? { ...loginUser, users: loginUser.students, role: 'student', pass: undefined }
        : { ...loginUser, pass: undefined } // 보안 상 패스워드는 클라이언트에 리턴하지 않음
    });

    response.cookies.set('gnflhs_session', encryptedSession, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login API error:', error);
    return NextResponse.json(
      { error: `로그인 처리 중 오류가 발생했습니다: ${error.message}` },
      { status: 500 }
    );
  }
}
