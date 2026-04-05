"use client";

import React, { useState, useEffect } from 'react';
import { Download, Monitor, Smartphone, CheckCircle2, AlertCircle } from 'lucide-react';

export default function PWAInstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [installStatus, setInstallStatus] = useState<'waiting' | 'ready' | 'installed' | 'error'>('waiting');
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const addLog = (msg: string) => {
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${msg}`]);
  };

  useEffect(() => {
    addLog("PWA 설치 감지 엔진 시작...");

    // 1. 이미 설치되어 있는지 확인
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    if (isStandalone) {
      setInstallStatus('installed');
      addLog("확인: 이미 앱으로 실행 중입니다.");
    }

    // 2. 브라우저의 설치 가능 이벤트 감지
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setInstallStatus('ready');
      addLog("✅ 성공: 브라우저가 설치 준비를 마쳤습니다.");
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // 3. 설치 완료 이벤트 감지
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setInstallStatus('installed');
      addLog("🎉 축하합니다! 앱 설치가 완료되었습니다.");
    });

    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      addLog("⚠️ 오류: 설치 프롬프트를 찾을 수 없습니다.");
      return;
    }
    
    addLog("설정창 띄우는 중...");
    deferredPrompt.prompt();
    
    const { outcome } = await deferredPrompt.userChoice;
    addLog(`사용자 선택: ${outcome}`);
    
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl p-8 text-center border border-slate-100">
        <div className="mb-6 flex justify-center">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Download size={40} strokeWidth={2.5} />
          </div>
        </div>

        <h1 className="text-2xl font-black text-slate-900 mb-2">지남외고 앱 설치</h1>
        <p className="text-slate-500 font-bold text-sm mb-8">
          브라우저를 거치지 않고<br />홈 화면에서 바로 실행하세요.
        </p>

        {/* 상태별 UI */}
        <div className="space-y-4">
          {installStatus === 'waiting' && (
            <div className="p-4 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
              <div className="animate-spin mb-2 flex justify-center">
                <div className="w-6 h-6 border-4 border-indigo-600 border-t-transparent rounded-full"></div>
              </div>
              <p className="text-xs font-black text-slate-400">브라우저 신호를 기다리는 중...</p>
            </div>
          )}

          {installStatus === 'ready' && (
            <button
              onClick={handleInstallClick}
              className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-xl shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-3"
            >
              <Smartphone size={24} />
              지금 앱으로 설치
            </button>
          )}

          {installStatus === 'installed' && (
            <div className="py-5 bg-emerald-50 text-emerald-600 rounded-2xl font-black flex items-center justify-center gap-2 border-2 border-emerald-100">
              <CheckCircle2 size={24} />
              앱 설치 완료
            </div>
          )}
        </div>

        {/* 도움말 섹션 */}
        <div className="mt-10 pt-8 border-t border-slate-100 text-left">
          <h2 className="text-xs font-black text-slate-400 mb-4 uppercase tracking-widest">설치 가이드</h2>
          <div className="space-y-3">
            <div className="flex gap-3 items-start">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Monitor size={16} /></div>
              <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                <span className="text-indigo-600">PC:</span> 주소창 오른쪽 끝의 [설치] 아이콘을 누르세요.
              </p>
            </div>
            <div className="flex gap-3 items-start">
              <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg"><Smartphone size={16} /></div>
              <p className="text-[11px] font-bold text-slate-600 leading-relaxed">
                <span className="text-indigo-600">모바일:</span> 하단 메뉴바의 [홈 화면에 추가]를 누르세요.
              </p>
            </div>
          </div>
        </div>

        {/* 🚀 디버깅 로그 창 (반응이 없을 때 원인 파악용) */}
        <div className="mt-8 bg-slate-900 rounded-xl p-4 text-left overflow-hidden">
          <p className="text-[9px] font-black text-indigo-400 mb-2 uppercase">System Log</p>
          <div className="max-h-24 overflow-y-auto space-y-1">
            {debugLog.map((log, i) => (
              <p key={i} className="text-[10px] text-slate-400 font-mono break-all">{log}</p>
            ))}
          </div>
        </div>
      </div>
      
      <p className="mt-8 text-[10px] font-black text-slate-300 uppercase tracking-widest">
        Gyeongnam Foreign Language High School Service
      </p>
    </div>
  );
}