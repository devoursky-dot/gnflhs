"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import * as LucideIcons from 'lucide-react';
import { Loader2, Database } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const DynamicIcon = ({ name, size = 18, className = "" }: { name: string, size?: number, className?: string }) => {
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
  const IconComponent = (LucideIcons as any)[formattedName] || LucideIcons.HelpCircle;
  return <IconComponent size={size} className={className} />;
};

const isImageUrl = (value: any) => {
  if (typeof value !== 'string') return false;
  return value.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) != null || value.startsWith('http');
};

export default function PreviewPage() {
  const params = useParams();
  const appId = params?.appId as string;
  
  const [appData, setAppData] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAppAndData() {
      try {
        // 1. Supabase apps 테이블에서 해당 앱 정보 가져오기
        const { data: targetApp, error: appError } = await supabase
          .from('apps')
          .select('*')
          .eq('id', appId)
          .single();

        if (appError || !targetApp) {
          throw new Error('존재하지 않거나 삭제된 앱입니다.');
        }

        setAppData(targetApp);

        // 2. 앱에 연결된 테이블에서 실제 데이터 가져오기
        if (targetApp.selected_table) {
          const { data: tableData, error: tableError } = await supabase
            .from(targetApp.selected_table)
            .select("*")
            .limit(100);

          if (tableError) throw new Error('연결된 테이블 데이터를 불러오는데 실패했습니다.');
          setRows(tableData || []);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || '데이터를 불러오는데 실패했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    if (appId) fetchAppAndData();
  }, [appId]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="animate-spin text-indigo-600 mb-4" size={32} />
      </div>
    );
  }

  if (error || !appData) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-50 text-slate-500">
        <Database size={48} className="mb-4 opacity-30" />
        <h2 className="text-xl font-bold text-slate-700 mb-2">앗, 문제가 발생했어요</h2>
        <p>{error}</p>
      </div>
    );
  }

  // Supabase 컬럼명을 카멜케이스로 꺼내서 사용합니다.
  const appConfig = appData.app_config;
  const name = appData.name;

  return (
    <div className="min-h-screen w-full bg-slate-100 flex justify-center sm:py-8">
      <main className="w-full sm:w-[400px] h-[100dvh] sm:h-[800px] bg-slate-50 sm:rounded-[2.5rem] sm:shadow-2xl sm:border-[8px] sm:border-slate-800 overflow-hidden flex flex-col relative">
        
        <header className={`${appConfig.header.color} ${appConfig.header.textColor} px-6 py-5 shadow-sm flex items-center justify-center shrink-0 z-10`}>
          <h1 className="font-extrabold text-lg tracking-tight truncate">{name || appConfig.header.title}</h1>
        </header>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 bg-slate-50">
          {rows.map((row) => (
            <div key={row.id || Math.random()} className="bg-white p-5 rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-slate-100">
              <div className="space-y-4">
                {appConfig.cardLayout.map((field: any) => {
                  const isImage = isImageUrl(row[field.field]) || field.field.includes('사진') || field.field.includes('이미지');
                  
                  return (
                    <div key={field.id} className="flex items-start gap-3.5">
                      <div className="text-slate-400 mt-0.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                        <DynamicIcon name={field.icon} size={16}/>
                      </div>
                      <div className="flex flex-col flex-1 w-full min-w-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{field.field}</span>
                        
                        {isImage && row[field.field] ? (
                          <div className="w-full h-48 bg-slate-100 rounded-xl overflow-hidden mt-1 border border-slate-100">
                            <img 
                              src={row[field.field]} 
                              alt="첨부 이미지" 
                              className="w-full h-full object-cover" 
                              onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                            />
                          </div>
                        ) : (
                          <span className="text-sm font-bold text-slate-800 break-words whitespace-pre-wrap leading-relaxed">
                            {row[field.field] !== null && row[field.field] !== undefined ? String(row[field.field]) : '-'}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
              
              {appConfig.cardLayout.length > 0 && (
                <button className={`mt-5 w-full py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors ${appConfig.actions.inline.color}`}>
                  <DynamicIcon name={appConfig.actions.inline.icon} size={16}/> {appConfig.actions.inline.label}
                </button>
              )}
            </div>
          ))}
          
          {(!rows || rows.length === 0) && (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 mt-20">
              <Database size={32} className="mb-3 opacity-30" />
              <p className="text-sm font-bold text-slate-500">표시할 데이터가 없습니다.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}