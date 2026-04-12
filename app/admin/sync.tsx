// 파일 경로: app/admin/sync.tsx
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from '@/app/supabaseClient';
import { Loader2, X, Link } from "lucide-react";

interface RelationSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  schemaData: Record<string, any[]>;
  currentTable: string;
  onApplySync: (targetCol: string, matchCol: string, map: Map<string, any>) => void;
}

export default function RelationSyncModal({ isOpen, onClose, schemaData, currentTable, onApplySync }: RelationSyncModalProps) {
  const [targetColumn, setTargetColumn] = useState('');
  const [refTable, setRefTable] = useState('');
  const [refTargetColumn, setRefTargetColumn] = useState('');
  const [matchCurrentColumn, setMatchCurrentColumn] = useState('');
  const [matchRefColumn, setMatchRefColumn] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const curCols = schemaData[currentTable] || [];
      if (curCols.length > 0) {
        setTargetColumn(curCols[0]?.name || '');
        setMatchCurrentColumn(curCols[0]?.name || '');
      }
      const tables = Object.keys(schemaData).filter(t => t !== currentTable);
      if (tables.length > 0) setRefTable(tables[0]);
    }
  }, [isOpen, currentTable, schemaData]);

  useEffect(() => {
    if (refTable && schemaData[refTable]) {
       const refCols = schemaData[refTable] || [];
       if (refCols.length > 0) {
         setRefTargetColumn(refCols[0]?.name || '');
         setMatchRefColumn(refCols[0]?.name || '');
       }
    }
  }, [refTable, schemaData]);

  const runSync = async () => {
    if (!targetColumn || !refTable || !refTargetColumn || !matchCurrentColumn || !matchRefColumn) {
      return alert('모든 항목을 선택해주세요.');
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.from(refTable).select(`"${matchRefColumn}", "${refTargetColumn}"`).not(matchRefColumn, 'is', null);
      if (error) throw error;
      
      const safeData = data || [];
      const map = new Map();
      safeData.forEach(row => {
         if (row[matchRefColumn] != null) {
           map.set(String(row[matchRefColumn]), row[refTargetColumn]);
         }
      });
      
      onApplySync(targetColumn, matchCurrentColumn, map);
      onClose();
      alert(`총 ${safeData.length}개의 참조 데이터를 가져와 빈칸에 일치하는 값을 채웠습니다.\n(※ 아직 DB에 반영되지 않았으니 시각적으로 확인 후 우측 상단의 'Save Changes' 버튼을 눌러 확정 기록하세요.)`);
    } catch (err: any) {
      alert(`복사 중 오류 발생: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-[600px] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="p-5 border-b dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50 rounded-t-2xl">
          <div className="flex flex-col">
            <h3 className="font-bold text-lg flex items-center gap-2"><Link className="w-5 h-5 text-indigo-500" /> 다른 테이블 데이터 동기화 (VLOOKUP)</h3>
            <p className="text-[11px] text-zinc-500 mt-1">기준값이 일치할 때 참조 테이블의 값을 현재 테이블로 일괄 복사해옵니다.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 space-y-5">
           <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-xl border dark:border-zinc-800 relative">
             <div className="absolute left-1/2 top-1/2 -ml-[14px] -mt-[14px] w-[28px] h-[28px] bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 font-bold text-xs shadow-sm z-10">
               =
             </div>
             
             <div className="pr-2 space-y-4">
               <div>
                 <label className="text-[10.5px] font-bold text-zinc-400 mb-1 block uppercase tracking-wider">현재 테이블 ({currentTable})</label>
                 <select value={matchCurrentColumn} onChange={e=>setMatchCurrentColumn(e.target.value)} className="w-full text-sm p-2 rounded-lg bg-white dark:bg-zinc-950 border dark:border-zinc-700 outline-none focus:border-indigo-500">
                   {schemaData[currentTable]?.map((c:any) => <option key={`mc-${c.name}`} value={c.name}>{c.name}</option>)}
                 </select>
                 <p className="text-[9px] text-zinc-500 mt-1">기준 (이 값이 같을 때)</p>
               </div>
               
               <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                 <label className="text-[10.5px] font-bold text-zinc-400 mb-1 block uppercase tracking-wider">데이터를 채울 칼럼 (도착지)</label>
                 <select value={targetColumn} onChange={e=>setTargetColumn(e.target.value)} className="w-full text-sm p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-bold outline-none">
                   {schemaData[currentTable]?.map((c:any) => <option key={`tc-${c.name}`} value={c.name}>{c.name}</option>)}
                 </select>
               </div>
             </div>
             
             <div className="pl-2 space-y-4">
               <div>
                 <label className="text-[10.5px] font-bold text-zinc-400 mb-1 block uppercase tracking-wider flex items-center justify-between">
                   <span>참조 테이블</span>
                 </label>
                 <select value={refTable} onChange={e=>{setRefTable(e.target.value);}} className="w-full text-[13px] font-semibold py-2 px-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-900 border dark:border-zinc-700 outline-none">
                   {Object.keys(schemaData).filter(t => t !== currentTable).map(t => <option key={`rt-${t}`} value={t}>{t}</option>)}
                 </select>
               </div>
               
               <div>
                 <select value={matchRefColumn} onChange={e=>setMatchRefColumn(e.target.value)} className="w-full text-sm p-2 rounded-lg bg-white dark:bg-zinc-950 border dark:border-zinc-700 outline-none focus:border-indigo-500 mt-1">
                   {schemaData[refTable]?.map((c:any) => <option key={`mr-${c.name}`} value={c.name}>{c.name}</option>)}
                 </select>
                 <p className="text-[9px] text-zinc-500 mt-1">기준 (이 값이 같을 때)</p>
               </div>
               
               <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                 <label className="text-[10.5px] font-bold text-zinc-400 mb-1 block uppercase tracking-wider">복사해올 값 (출발지)</label>
                 <select value={refTargetColumn} onChange={e=>setRefTargetColumn(e.target.value)} className="w-full text-sm p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold outline-none">
                   {schemaData[refTable]?.map((c:any) => <option key={`rtc-${c.name}`} value={c.name}>{c.name}</option>)}
                 </select>
               </div>
             </div>
           </div>
        </div>
        
        <div className="p-5 border-t dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">취소</button>
          <button onClick={runSync} disabled={isProcessing} className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />} VLOOKUP 동기화 실행
          </button>
        </div>
      </div>
     </div>
  );
}
