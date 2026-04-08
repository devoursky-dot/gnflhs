"use client";

import React, { useState, useLayoutEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

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

    useLayoutEffect(() => {
      const verify = async () => {
        try {
          const session = localStorage.getItem('gnflhs_session');
          if (!session) {
            router.replace('/');
            return;
          }

          const { email } = JSON.parse(session);
          const { data: profile, error } = await supabase
            .from('teachers')
            .select('role')
            .eq('users', email)
            .single();

          if (error || !profile) throw new Error('Unauthorized');

          // 관리자 전용 페이지 체크
          if (options.adminOnly && profile.role !== 'admin') {
            router.replace('/');
            return;
          }

          // 전체 허용(admin, tch) 체크
          if (profile.role !== 'admin' && profile.role !== 'tch') {
            router.replace('/');
            return;
          }

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

    return <WrappedComponent {...props} />;
  };
}