"use client";

import React, { useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

interface AuthOptions {
  adminOnly?: boolean;
}

/**
 * 인증 및 권한(role) 체크를 수행하는 고차 컴포넌트(HOC)
 */
export default function withAuth<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  options: AuthOptions = { adminOnly: false }
) {
  return function AuthenticatedComponent(props: P) {
    const router = useRouter();
    const [isChecking, setIsChecking] = useState(true);
    const [userProfile, setUserProfile] = useState<any>(null);

    useLayoutEffect(() => {
      const verify = async () => {
        try {
          // 1. 서버 API 호출로 세션 및 프로필 조회
          const res = await fetch('/api/auth/me');
          if (!res.ok) {
            router.replace('/');
            return;
          }

          const data = await res.json();
          if (!data.authenticated || !data.user || !data.profile) {
            router.replace('/');
            return;
          }

          const { user, profile } = data;

          // 관리자 전용 페이지 체크
          if (options.adminOnly && profile.role !== 'admin') {
            router.replace('/');
            return;
          }

          // 전체 허용(admin, tch, student) 체크
          if (profile.role !== 'admin' && profile.role !== 'tch' && profile.role !== 'student') {
            router.replace('/');
            return;
          }

          setUserProfile({
            email: user.email || user.id,
            id: user.id,
            name: profile.name,
            role: profile.role,
            type: user.type
          });
          setIsChecking(false);
        } catch (e) {
          console.error('Auth check error in HOC:', e);
          router.replace('/');
        }
      };
      verify();
    }, [router]);

    if (isChecking) {
      return (
        <div className="h-screen w-full flex items-center justify-center bg-slate-50">
          <Loader2 className="animate-spin text-indigo-600" size={40} />
        </div>
      );
    }

    return <WrappedComponent {...props} userProfile={userProfile} />;
  };
}