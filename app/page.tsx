// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Search, Plus, LayoutGrid, Star, ArrowRight, LogIn, LogOut, Mail, Lock, ShieldCheck, User as UserIcon } from 'lucide-react';
import Cookies from 'js-cookie';
// 🔥 앞서 만든 picker.tsx에서 IconMap을 가져와 앱의 고유 아이콘을 표시합니다.
import { IconMap } from './design/picker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "", 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function MainAppLauncher() {
  const [apps, setApps] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  
  // --- 인증 상태 관리 ---
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [authError, setAuthError] = useState('');

  useEffect(() => {
    // 1. 쿠키에서 세션 확인 (로그인 유지)
    const savedSession = Cookies.get('gnflhs_session');
    if (savedSession) {
      const sessionData = JSON.parse(savedSession);
      setUser({ email: sessionData.email });
      fetchUserProfile(sessionData.email).then(() => {
        setLoading(false);
      });
    } else {
      setLoading(false);
    }

    // 2. 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      // 구글 로그인 등 외부 인증 사용 시를 대비해 유지하되, 현재는 비워둡니다.
    });
    return () => subscription.unsubscribe();
  }, []);

  // teachers 테이블에서 사용자 정보(이름, 역할) 가져오기
  const fetchUserProfile = async (email: string | undefined) => {
    if (!email) return;
    const { data, error } = await supabase
      .from('teachers')
      .select('users, name, role, pass')
      .eq('users', email)
      .single();
    
    if (data) {
      setProfile(data);
      fetchApps(); 
    } else {
      console.error("User not found in teachers table:", error);
    }
  };

  async function fetchApps() {
    try {
      const { data, error } = await supabase
        .from('apps')
        .select('id, name, created_at, app_config')
        .order('id', { ascending: false });
      
      if (error) throw error;
      if (data) setApps(data);
    } catch (error) {
      console.error('앱 목록 로드 실패:', error);
    }
  }

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    try {
      // teachers 테이블에서 직접 유저와 비밀번호 확인
      const { data: teacher, error } = await supabase
        .from('teachers')
        .select('*')
        .eq('users', loginEmail)
        .single();

      if (!teacher || teacher.pass !== loginPass) {
        throw new Error('이메일 또는 비밀번호가 올바르지 않습니다.');
      }

      // 로그인 성공 처리
      const sessionInfo = { email: loginEmail };
      // 기존 localStorage 대신 쿠키에 저장 (7일 유지, 모든 경로 허용)
      Cookies.set('gnflhs_session', JSON.stringify(sessionInfo), { 
        expires: 7, 
        path: '/',
        sameSite: 'lax'
      });
      
      setUser(sessionInfo);
      setProfile(teacher);
      fetchApps();
    } catch (error: any) {
      setAuthError(error.message);
    }
  };

  const handleLogout = async () => {
    // 쿠키 삭제 시에도 path를 명시해야 정확하게 삭제됩니다.
    Cookies.remove('gnflhs_session', { path: '/' });
    window.location.reload();
  };

  // 검색어에 따른 앱 필터링 로직
  const filteredApps = apps.filter(app => 
    app.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 권한 확인 로직 ---
  const isAuthorized = profile?.role === 'admin' || profile?.role === 'tch';

  // 1. 세션이 없거나 프로필이 없는 경우 (로그인 폼)
  if (!user || !profile || !isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 p-10 animate-in fade-in zoom-in-95 duration-500">
          <div className="flex flex-col items-center text-center mb-10">
            <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center shadow-xl shadow-indigo-200 mb-6">
              <ShieldCheck className="text-white" size={40} />
            </div>
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">경남외고 통합 관리</h1>
            <p className="text-slate-500 font-bold mt-2 italic">Teacher Access Only</p>
          </div>

          {/* 로그인은 되었으나 권한이 없는 경우 (그외) */}
          {user && profile && !isAuthorized ? (
            <div className="text-center space-y-6">
              <div className="p-4 bg-amber-50 border border-amber-100 text-amber-700 text-sm font-bold rounded-2xl">
                '{profile.name}'님은 등록된 교사/관리자 계정이 아닙니다. 접근 권한이 없습니다.
              </div>
              <button 
                onClick={handleLogout}
                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black flex items-center justify-center gap-2"
              >
                <LogOut size={18} /> 다른 계정으로 로그인
              </button>
            </div>
          ) : (
            // 일반 로그인 폼
            <>
              {authError && <div className="mb-6 p-4 bg-rose-50 border border-rose-100 text-rose-600 text-sm font-bold rounded-2xl">{authError}</div>}
              <form onSubmit={handlePasswordLogin} className="space-y-4">
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="email" placeholder="이메일 계정" value={loginEmail} onChange={(e)=>setLoginEmail(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-slate-900" style={{ color: '#0f172a' }} required />
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input type="password" placeholder="비밀번호" value={loginPass} onChange={(e)=>setLoginPass(e.target.value)} className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl font-bold outline-none focus:ring-4 focus:ring-indigo-50 transition-all text-slate-900" style={{ color: '#0f172a' }} required />
                </div>
                <button type="submit" className="w-full py-4 bg-slate-900 hover:bg-indigo-600 text-white rounded-2xl font-black shadow-lg transition-all active:scale-95">로그인</button>
              </form>
            </>
          )}
        </div>
      </div>
    );
  }

  // --- 로그인 완료된 상태의 UI ---
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* --- 헤더 영역 (고정) --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <LayoutGrid className="text-white" size={20} />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">App Launcher</h1>
              {/* 로그인 상태 표시 */}
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${profile?.role === 'admin' ? 'text-indigo-600 bg-indigo-50' : 'text-emerald-600 bg-emerald-50'}`}>
                  <UserIcon size={10} /> {profile?.role === 'admin' ? 'Super Admin' : 'Teacher'}
                </span>
                <span className="text-[11px] font-bold text-slate-400">{profile?.name} ({user?.email})</span>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* 로그아웃 버튼 */}
            <button 
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-black transition-all"
              title="로그아웃"
            >
              <LogOut size={18} /> <span className="hidden sm:inline">로그아웃</span>
            </button>

            {/* 빌더 버튼 (Admin인 경우만 활성화) */}
            <Link 
              href="/design" 
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95 
                ${profile?.role === 'admin' 
                  ? 'bg-slate-900 hover:bg-indigo-600 text-white opacity-100' 
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed grayscale'}`}
              onClick={(e) => profile?.role !== 'admin' && e.preventDefault()}
            >
              <Plus size={18} /> 빌더 열기
            </Link>
          </div>
        </div>
      </header>

      {/* --- 메인 컨텐츠 영역 --- */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-6 py-10 flex flex-col gap-8 h-[calc(100vh-80px)]">
        
        {/* 상단 검색바 */}
        <div className="relative shrink-0 z-10">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={22} />
          <input
            type="text"
            placeholder="실행할 앱 이름을 검색하세요..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl text-lg font-bold text-slate-800 shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 outline-none transition-all placeholder:text-slate-300"
          />
        </div>

        {/* 앱 목록 (데이터가 많아지면 내부에서 스크롤 됨) */}
        <div className="flex-1 overflow-y-auto pb-10 scrollbar-hide">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 font-bold space-y-4">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p>앱 목록을 불러오는 중입니다...</p>
            </div>
          ) : filteredApps.length === 0 ? (
            <div className="h-full min-h-[400px] flex flex-col items-center justify-center text-slate-400 space-y-4 bg-white rounded-3xl border-2 border-dashed border-slate-200">
              <Search size={48} className="text-slate-200" />
              <p className="font-bold text-lg text-slate-500">
                {searchQuery ? '검색된 앱이 없습니다.' : '아직 생성된 앱이 없습니다.'}
              </p>
              {!searchQuery && (
                <Link href="/design" className="text-indigo-500 font-bold hover:underline">
                  우측 상단 버튼을 눌러 첫 번째 앱을 만들어보세요!
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredApps.map((app) => {
                // 앱 설정에서 저장된 아이콘 추출 (없으면 Star를 기본값으로 사용)
                const iconName = app.app_config?.icon;
                const AppIcon = iconName && IconMap && IconMap[iconName] ? IconMap[iconName] : Star;

                return (
                  <Link 
                    key={app.id} 
                    href={`/preview/${app.id}`}
                    className="group bg-white border border-slate-200 rounded-3xl p-6 hover:border-indigo-400 hover:shadow-xl hover:shadow-indigo-100 transition-all duration-300 flex flex-col cursor-pointer hover:-translate-y-1 relative overflow-hidden"
                  >
                    {/* 카드 호버 시 나타나는 배경 이펙트 */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full -mr-10 -mt-10 transition-transform group-hover:scale-[2] duration-500 ease-out z-0"></div>
                    
                    <div className="relative z-10 flex items-start gap-4 mb-8">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-100 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors duration-300 shadow-sm shrink-0">
                        <AppIcon size={28} strokeWidth={2.5} />
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-slate-800 group-hover:text-indigo-900 transition-colors line-clamp-2">
                          {app.name}
                        </h3>
                        <p className="text-[11px] font-bold text-slate-400 mt-1 uppercase tracking-wider">
                          App ID: {app.id}
                        </p>
                      </div>
                    </div>

                    <div className="relative z-10 mt-auto flex items-center justify-between pt-4 border-t border-slate-100 group-hover:border-indigo-100 transition-colors">
                      <span className="text-xs font-bold text-slate-400 group-hover:text-indigo-500">
                        {new Date(app.created_at).toLocaleDateString()} 생성됨
                      </span>
                      <span className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                        <ArrowRight size={16} strokeWidth={3} />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}