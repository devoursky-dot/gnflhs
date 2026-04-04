// 파일 경로: app/preview/[appId]/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';
import { X, CheckCircle2, ChevronLeft, RefreshCw, Layout } from 'lucide-react';
import { IconMap } from '../../design/picker'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "", 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const RenderPreviewLayout = ({ rows, rowData, actions, onExecuteAction }: any) => {
  const isImageUrl = (url: any) => {
    if (typeof url !== 'string') return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || (url.startsWith('http') && url.includes('/storage/v1/object/public/'));
  };

  return (
    <div className="flex flex-col gap-0 w-full h-full text-slate-900">
      {rows?.map((row: any) => (
        <div key={row.id} className="flex gap-0 w-full items-stretch">
          {row.cells?.map((cell: any) => {
            const cellValue = rowData[cell.contentValue || ''];
            const shouldShowImage = cell.isImage || isImageUrl(cellValue);
            return (
              <div key={cell.id} style={{ flex: cell.flex }} className="flex flex-col justify-center min-w-0 overflow-hidden relative">
                {cell.contentType === 'field' && shouldShowImage && (
                  <div className="w-full h-full overflow-hidden bg-slate-50">
                    <img src={String(cellValue)} alt="img" className="w-full h-full object-cover" />
                  </div>
                )}
                {cell.contentType === 'field' && !shouldShowImage && (
                  <div className="p-2 w-full h-full flex items-center">
                    <span className="text-[14px] font-black text-slate-900 break-words leading-tight">
                      {cellValue !== null && cellValue !== undefined && cellValue !== '' ? String(cellValue) : '-'}
                    </span>
                  </div>
                )}
                {cell.contentType === 'action' && (() => {
                  const act = actions?.find((a: any) => a.id === cell.contentValue);
                  return act ? (
                    <button onClick={(e) => { e.stopPropagation(); onExecuteAction(act, rowData); }} className="w-full h-full bg-slate-900 text-white text-[10px] font-black py-3 active:bg-indigo-600 transition-colors">
                      {act.name}
                    </button>
                  ) : null;
                })()}
                {cell.contentType === 'nested' && cell.nestedRows && (
                  <RenderPreviewLayout rows={cell.nestedRows} rowData={rowData} actions={actions} onExecuteAction={onExecuteAction} />
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

export default function LiveAppPreview() {
  const params = useParams();
  const appId = params?.appId;

  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState<any>(null);
  const [currentViewId, setCurrentViewId] = useState<string>('');
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [activeInsertAction, setActiveInsertAction] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!appId) return;
    async function fetchAppConfig() {
      try {
        const { data } = await supabase.from('apps').select('*').eq('id', appId).single();
        if (data) {
          const urlParams = new URLSearchParams(window.location.search);
          const mode = urlParams.get('mode');
          let activeConfig = mode === 'draft' ? (data.draft_config || data.app_config) : data.app_config;
          document.title = mode === 'draft' ? `[Draft] ${data.name}` : data.name;
          setAppData({ ...data, app_config: activeConfig });
          if (activeConfig?.views?.length > 0) {
            const vid = urlParams.get('viewId');
            setCurrentViewId(vid || activeConfig.views[0].id);
          }
        }
      } finally { setLoading(false); }
    }
    fetchAppConfig();
  }, [appId]);

  const fetchTableData = async (tableName: string) => {
    const { data } = await supabase.from(tableName).select("*").limit(1000);
    if (data) setTableData(prev => ({ ...prev, [tableName]: data }));
  };

  const currentView = appData?.app_config?.views?.find((v: any) => v.id === currentViewId);

  useEffect(() => {
    if (currentView?.tableName && !tableData[currentView.tableName]) fetchTableData(currentView.tableName);
  }, [currentViewId, currentView]);

  const handleAction = async (action: any, rowData: any) => {
    if (action.type === 'alert') {
      alert(action.message || '알림');
    } else if (action.type === 'navigate') {
      setCurrentViewId(action.targetViewId);
    } else if (action.type === 'insert_row') {
      setActiveInsertAction(action);
      const initialData: Record<string, any> = {};
      action.insertMappings?.forEach((m: any) => {
        if (m.mappingType === 'card_data') initialData[m.targetColumn] = rowData[m.sourceValue];
        else if (m.mappingType === 'static') initialData[m.targetColumn] = m.sourceValue;
        else initialData[m.targetColumn] = '';
      });
      setFormData(initialData);
      setIsInputModalOpen(true);
    }
  };

  const handleSubmitInsert = async () => {
    if (!activeInsertAction || isSubmitting) return;
    if (!window.confirm("입력하신 내용을 저장하시겠습니까?")) return;

    setIsSubmitting(true);
    try {
      const finalPayload = { ...formData };
      activeInsertAction.insertMappings?.forEach((m: any) => {
        if (m.valueType === 'number') {
          finalPayload[m.targetColumn] = Number(finalPayload[m.targetColumn]) || 0;
        }
      });
      const { error } = await supabase.from(activeInsertAction.insertTableName).insert([finalPayload]);
      if (error) throw error;
      
      alert("성공적으로 저장되었습니다.");
      setIsInputModalOpen(false);
      if (currentView?.tableName === activeInsertAction.insertTableName) {
        fetchTableData(currentView.tableName);
      }
    } catch (err: any) {
      alert(`저장 실패: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-black text-slate-400">LOADING...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans">
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col relative h-screen overflow-hidden">
        {/* 상단 헤더 */}
        <div className="pt-8 pb-4 px-6 text-center border-b bg-white sticky top-0 z-10 flex items-center justify-between">
          <div className="w-10">
            {currentViewId !== appData?.app_config?.views?.[0]?.id && (
              <button onClick={() => setCurrentViewId(appData.app_config.views[0].id)} className="p-2 text-slate-400"><ChevronLeft /></button>
            )}
          </div>
          <div className="font-black text-slate-900 text-xl truncate">{currentView?.name || appData.name}</div>
          <div className="w-10">
            {currentView?.tableName && (
              <button onClick={() => fetchTableData(currentView.tableName)} className="p-2 text-slate-400"><RefreshCw size={18} /></button>
            )}
          </div>
        </div>

        {/* 메인 콘텐츠 영역 (하단바 높이만큼 여백 확보) */}
        <div className="flex-1 overflow-y-auto bg-slate-50 pb-20">
          <div className={`grid gap-0 ${
            currentView?.columnCount === 2 ? 'grid-cols-2' : 
            currentView?.columnCount === 3 ? 'grid-cols-3' : 
            currentView?.columnCount === 4 ? 'grid-cols-4' : 'grid-cols-1'
          }`}>
            {tableData[currentView?.tableName || '']?.map((row, idx) => (
              <div key={idx} className="bg-white border-b border-r border-slate-100 overflow-hidden" style={{ minHeight: `${currentView?.cardHeight || 120}px` }} onClick={() => {
                const act = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId);
                if (act) handleAction(act, row);
              }}>
                <RenderPreviewLayout rows={currentView?.layoutRows || []} rowData={row} actions={appData.app_config.actions} onExecuteAction={handleAction} />
              </div>
            ))}
          </div>
        </div>

        {/* 고정 하단 탭 메뉴 */}
        <div className="h-20 bg-white border-t flex items-center justify-around px-2 absolute bottom-0 w-full z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          {appData?.app_config?.views?.slice(0, 5).map((v: any) => {
            const IconComp = v.icon && IconMap[v.icon] ? IconMap[v.icon] : Layout;
            const isActive = currentViewId === v.id;
            return (
              <button 
                key={v.id} 
                onClick={() => setCurrentViewId(v.id)}
                className={`flex-1 flex flex-col items-center gap-1 transition-all ${isActive ? 'text-indigo-600' : 'text-slate-300 hover:text-slate-500'}`}
              >
                <IconComp size={22} strokeWidth={isActive ? 3 : 2} />
                <span className={`text-[9px] font-black uppercase tracking-tighter truncate w-full text-center ${isActive ? 'opacity-100' : 'opacity-60'}`}>
                  {v.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 입력 모달 */}
      {isInputModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <CheckCircle2 className="text-indigo-600" /> 데이터 입력
              </h3>
              <button onClick={() => setIsInputModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full"><X /></button>
            </div>
            
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50">
              {activeInsertAction?.insertMappings?.filter((m: any) => m.mappingType === 'prompt').map((mapping: any) => (
                <div key={mapping.id} className="space-y-2">
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-wider">{mapping.sourceValue}</label>
                  <input
                    type={mapping.valueType === 'number' ? 'number' : 'text'}
                    value={formData[mapping.targetColumn] || ''}
                    onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: e.target.value })}
                    className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 transition-all shadow-sm"
                    placeholder="내용을 입력하세요..."
                  />
                </div>
              ))}
            </div>

            <div className="p-6 bg-white border-t flex gap-3">
              <button onClick={() => setIsInputModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all border border-slate-100">취소</button>
              <button 
                onClick={handleSubmitInsert} 
                disabled={isSubmitting}
                className="flex-1 py-4 bg-slate-900 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? "저장 중..." : "최종 저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}