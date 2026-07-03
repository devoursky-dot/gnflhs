// 파일 경로: app/useAuth.ts
"use client";

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/app/supabaseClient';

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

  // ── 초기 세션 복원 ──
  const restoreSession = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated) {
          setUser(data.user);
          setProfile(data.profile);
        } else {
          setUser(null);
          setProfile(null);
        }
      } else {
        setUser(null);
        setProfile(null);
      }
    } catch (err) {
      console.error('Session restore failed:', err);
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  // ── 비밀번호 로그인 ──
  const handlePasswordLogin = useCallback(async (loginId: string, loginPass: string) => {
    setAuthError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loginId, loginPass })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || '로그인에 실패했습니다.');
      }

      setUser(data.user);
      setProfile(data.profile);
    } catch (error: any) {
      setAuthError(error.message);
    }
  }, []);

  // ── 로그아웃 ──
  const handleLogout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      window.location.reload();
    }
  }, []);

  // ── 비밀번호 변경 ──
  const handlePasswordChange = useCallback(async (
    currentPass: string,
    newPass: string,
    confirmPass: string
  ): Promise<{ success: boolean; error?: string }> => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPass, newPass, confirmPass })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || '비밀번호 변경에 실패했습니다.' };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: `오류 발생: ${err.message}` };
    }
  }, []);

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
    supabase,
  };
}
