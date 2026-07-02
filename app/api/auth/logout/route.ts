import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });

  // HttpOnly 쿠키의 Max-Age를 0으로 설정하여 만료시킵니다.
  response.cookies.set('gnflhs_session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0
  });

  return response;
}
