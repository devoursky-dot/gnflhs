// app/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { Search, Plus, LayoutGrid, Star, ArrowRight } from 'lucide-react';
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

  useEffect(() => {
    async function fetchApps() {
      try {
        const { data, error } = await supabase
          .from('apps')
          .select('id, name, created_at, app_config')
          .order('id', { ascending: false }); // 최신순 정렬
        
        if (error) throw error;
        if (data) setApps(data);
      } catch (error) {
        console.error('앱 목록을 불러오는 중 오류 발생:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchApps();
  }, []);

  // 검색어에 따른 앱 필터링 로직
  const filteredApps = apps.filter(app => 
    app.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans overflow-hidden">
      
      {/* --- 헤더 영역 (고정) --- */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shrink-0">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200">
              <LayoutGrid className="text-white" size={20} />
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">App Launcher</h1>
          </div>
          
          <Link 
            href="/design" 
            className="flex items-center gap-2 bg-slate-900 hover:bg-indigo-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-md active:scale-95"
          >
            <Plus size={18} /> 빌더 열기 (새 앱 만들기)
          </Link>
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