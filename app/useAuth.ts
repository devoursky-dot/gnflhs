// 파일 경로: app/useAuth.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import Cookies from 'js-cookie';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const SESSION_KEY = 'gnflhs_session';

export type UserSession = { id: string; email: string; type: 'teacher' | 'student' };
export type UserProfile = {
  users: string;
  name: string;
  role?: string;
  pass?: string;
};

export function useAuth() {
  const [user, setUser] = useState<UserSession | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState('');

  // ── 프로필 패칭 ──
  const fetchUserProfile = useCallback(async (id: string, type: string) => {
    if (!id) return;

    if (type === 'student') {
      const { data } = await supabase
        .from('students')
        .select('students, name, pass')
        .eq('students', id)
        .single();
      if (data) {
        setProfile({ ...data, users: data.students, role: 'student' } as any);
      }
    } else {
      const { data } = await supabase
        .from('teachers')
        .select('users, name, role, pass')
        .eq('users', id)
        .single();
      if (data) {
        setProfile(data as any);
      }
    }
  }, []);

  // ── 초기 세션 복원 ──
  useEffect(() => {
    const savedSession = Cookies.get(SESSION_KEY);
    if (savedSession) {
      try {
        const sessionData = JSON.parse(savedSession);
        const sid = sessionData.id || sessionData.email;
        setUser(sessionData);
        fetchUserProfile(sid, sessionData.type || 'teacher').finally(() => setLoading(false));
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }

    // Supabase Auth 리스너 (Google 등 외부 인증 대비)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async () => {});
    return () => subscription.unsubscribe();
  }, [fetchUserProfile]);

  // ── 비밀번호 로그인 ──
  const handlePasswordLogin = useCallback(async (loginId: string, loginPass: string) => {
    setAuthError('');
    try {
      // 1. 교사 테이블 조회
      const { data: teacher } = await supabase
        .from('teachers')
        .select('*')
        .eq('users', loginId)
        .single();

      let loginUser: any = null;
      let loginType: 'teacher' | 'student' = 'teacher';

      if (teacher && teacher.pass === loginPass) {
        loginUser = teacher;
        loginType = 'teacher';
      } else {
        // 2. 학생 테이블 조회
        const { data: student } = await supabase
          .from('students')
          .select('*')
          .eq('students', loginId)
          .single();

        if (student && student.pass === loginPass) {
          loginUser = student;
          loginType = 'student';
        } else {
          throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
        }
      }

      // 세션 쿠키 저장
      const sessionInfo: UserSession = { id: loginId, email: loginId, type: loginType };
      Cookies.set(SESSION_KEY, JSON.stringify(sessionInfo), {
        expires: 7,
        path: '/',
        sameSite: 'lax'
      });

      setUser(sessionInfo);
      setProfile(
        loginType === 'student'
          ? { ...loginUser, users: loginUser.students, role: 'student' }
          : loginUser
      );
    } catch (error: any) {
      setAuthError(error.message);
    }
  }, []);

  // ── 로그아웃 ──
  const handleLogout = useCallback(() => {
    Cookies.remove(SESSION_KEY, { path: '/' });
    window.location.reload();
  }, []);

  // ── 비밀번호 변경 ──
  const handlePasswordChange = useCallback(async (
    currentPass: string,
    newPass: string,
    confirmPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (newPass !== confirmPass) {
      return { success: false, error: '새 비밀번호가 일치하지 않습니다.' };
    }
    if (currentPass !== profile?.pass) {
      return { success: false, error: '현재 비밀번호가 올바르지 않습니다.' };
    }

    try {
      const table = user?.type === 'student' ? 'students' : 'teachers';
      const column = user?.type === 'student' ? 'students' : 'users';
      const sid = user?.id || user?.email;

      const { error } = await supabase
        .from(table)
        .update({ pass: newPass })
        .eq(column, sid);

      if (error) throw error;

      setProfile(prev => prev ? { ...prev, pass: newPass } : prev);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: `오류 발생: ${err.message}` };
    }
  }, [user, profile]);

  // ── 권한 판별 ──
  const isAuthorized = profile?.role === 'admin' || profile?.role === 'tch' || profile?.role === 'student';
  const isAdmin = profile?.role === 'admin';

  return {
    user,
    profile,
    loading,
    authError,
    isAuthorized,
    isAdmin,
    handlePasswordLogin,
    handleLogout,
    handlePasswordChange,
    fetchUserProfile,
    supabase,
  };
}
