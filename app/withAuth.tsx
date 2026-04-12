"use client";

import React, { useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/supabaseClient';
import { Loader2 } from 'lucide-react';
import Cookies from 'js-cookie';

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
          // localStorage 대신 Cookies에서 세션 획득
          const session = Cookies.get('gnflhs_session');
          if (!session) {
            router.replace('/');
            return;
          }

          const sessionData = JSON.parse(session);
          const type = sessionData.type || 'teacher';
          const loginId = sessionData.id || sessionData.email;

          let profile;

          if (type === 'student') {
            const { data, error } = await supabase
              .from('students')
              .select('name')
              .eq('students', loginId)
              .single();
            if (error || !data) throw new Error('Unauthorized');
            profile = { name: data.name, role: 'student' };
          } else {
            const { data, error } = await supabase
              .from('teachers')
              .select('role, name')
              .eq('users', loginId)
              .single();
            if (error || !data) throw new Error('Unauthorized');
            profile = data;
          }

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

          setUserProfile({ email: loginId, id: loginId, name: profile.name, role: profile.role, type });
          setIsChecking(false);
        } catch (e) {
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