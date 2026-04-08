// 파일 경로: app/preview/[appId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation'; // useRouter 추가
import { createClient } from '@supabase/supabase-js';
import { X, CheckCircle2, ChevronLeft, RefreshCw, Layout, Search, ChevronDown, Folder, ChevronsUpDown, ChevronsUp, MousePointerClick } from 'lucide-react';
import { IconMap } from '@/app/design/picker'; 
import withAuth from '@/app/withAuth'; // 🔥 인증 HOC 임포트 (경로 확인 필요)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "", 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// 레이아웃 렌더링 컴포넌트 (기존과 동일)
const RenderPreviewLayout = ({ rows, rowData, actions, onExecuteAction }: any) => {
  const isImageUrl = (url: any) => {
    if (typeof url !== 'string') return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || (url.startsWith('http') && url.includes('/storage/v1/object/public/'));
  };

  return (
    <div className="flex flex-col gap-0 w-full h-full flex-1 text-slate-900">
      {rows?.map((row: any) => (
        <div key={row.id} style={{ flex: row.flex || 1 }} className="flex gap-0 w-full items-stretch">
          {row.cells?.map((cell: any) => {
            const cellValue = rowData[cell.contentValue || ''];
            const shouldShowImage = cell.isImage || isImageUrl(cellValue);
            
            if (cell.contentType === 'field' && shouldShowImage) {
              const shapeClass = cell.imageShape === 'circle' ? 'rounded-full aspect-square object-top shadow-sm mx-auto' : cell.imageShape === 'rounded' ? 'rounded-2xl shadow-sm' : 'rounded-none';
              const paddingClass = cell.imageShape === 'circle' ? 'p-3' : cell.imageShape === 'rounded' ? 'p-1.5' : 'p-0';
              return (
                <div key={cell.id} style={{ flex: cell.flex }} className={`flex flex-col justify-center min-w-0 overflow-hidden relative border-slate-100/50 bg-slate-50/30 ${paddingClass}`}>
                  <img src={String(cellValue)} alt="img" className={`object-cover w-full h-full max-h-full ${shapeClass}`} />
                </div>
              );
            }

            if (cell.contentType === 'field' && !shouldShowImage) {
              let displayText = cellValue !== null && cellValue !== undefined && cellValue !== '' ? String(cellValue) : '-';
              if (displayText !== '-' && cell.textRegexPattern) {
                try { const regex = new RegExp(cell.textRegexPattern, 'g'); displayText = displayText.replace(regex, cell.textRegexReplace || ''); } catch (err) { }
              }
              if (displayText !== '-') displayText = `${cell.textPrefix || ''}${displayText}${cell.textSuffix || ''}`;

              const alignItemClass = cell.textAlign === 'center' ? 'items-center text-center' : cell.textAlign === 'right' ? 'items-end text-right' : 'items-start text-left';
              const textSizeClass = cell.textSize || 'text-[14px]';
              const textWeightClass = cell.textWeight || 'font-black';

              return (
                <div key={cell.id} style={{ flex: cell.flex }} className={`flex flex-col justify-center min-w-0 overflow-hidden relative border-slate-100/50 p-2.5 ${alignItemClass}`}>
                  <span className={`${textSizeClass} ${textWeightClass} text-slate-800 break-words leading-snug w-full`}>{displayText}</span>
                </div>
              );
            }

            return (
              <div key={cell.id} style={{ flex: cell.flex }} className="flex flex-col justify-center min-w-0 overflow-hidden relative border-slate-100/50">
                {cell.contentType === 'action' && (() => {
                  const act = actions?.find((a: any) => a.id === cell.contentValue);
                  if (!act) return null;
                  const btnShape = cell.buttonShape || 'square';
                  const shapeClass = btnShape === 'pill' ? 'rounded-full' : btnShape === 'rounded' ? 'rounded-xl' : 'rounded-none';
                  const btnAlign = cell.buttonAlign || 'full';
                  const wrapperAlignClass = btnAlign === 'left' ? 'justify-start' : btnAlign === 'right' ? 'justify-end' : btnAlign === 'center' ? 'justify-center' : 'justify-stretch';
                  const btnWidthClass = btnAlign === 'full' ? 'w-full h-full' : 'px-5 py-3';
                  const bStyle = cell.buttonStyle || 'both';
                  const ActIcon = act.icon && IconMap[act.icon] ? IconMap[act.icon] : MousePointerClick;

                  return (
                    <div className={`w-full h-full flex items-center p-1.5 ${wrapperAlignClass}`}>
                      <button onClick={(e) => { e.stopPropagation(); onExecuteAction(act, rowData); }} className={`bg-slate-900 text-white text-[11px] font-black active:scale-95 hover:bg-indigo-600 transition-all shadow-md flex items-center justify-center gap-2 overflow-hidden ${shapeClass} ${btnWidthClass}`}>
                        {(bStyle === 'icon' || bStyle === 'both') && <ActIcon size={14} className="shrink-0" />}
                        {(bStyle === 'text' || bStyle === 'both') && <span className="truncate">{act.name}</span>}
                      </button>
                    </div>
                  );
                })()}
                {cell.contentType === 'nested' && cell.nestedRows && <RenderPreviewLayout rows={cell.nestedRows} rowData={rowData} actions={actions} onExecuteAction={onExecuteAction} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// 메인 컴포넌트: export default 제거 후 withAuth로 감쌈
function LiveAppPreview() {
  const params = useParams();
  const router = useRouter(); // router 추가
  const appId = params?.appId;

  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState<any>(null);
  const [currentViewId, setCurrentViewId] = useState<string>('');
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [activeInsertAction, setActiveInsertAction] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [activeUpdateAction, setActiveUpdateAction] = useState<any>(null);
  const [activeRowData, setActiveRowData] = useState<any>(null);
  const [updateFormData, setUpdateFormData] = useState<Record<string, any>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

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

  const currentView = appData?.app_config?.views?.find((v: any) => v.id === currentViewId);

  const fetchTableData = async (view: any) => {
    if (!view || !view.tableName) return;
    let query: any = supabase.from(view.tableName).select("*");
    if (view.filterColumn && view.filterValue) {
      const op = view.filterOperator || 'eq';
      const col = view.filterColumn as string;
      const val = view.filterValue;
      if (op === 'like') query = query.ilike(col, `%${val}%`);
      else if (op === 'gt') query = query.gt(col, val);
      else if (op === 'lt') query = query.lt(col, val);
      else query = query.eq(col, val); 
    }
    if (view.sortColumn) query = query.order(view.sortColumn as string, { ascending: view.sortDirection === 'asc' });
    const { data } = await query.limit(3000); 
    if (data) setTableData(prev => ({ ...prev, [view.tableName]: data }));
  };

  useEffect(() => {
    if (currentView) { fetchTableData(currentView); setExpandedGroups({}); }
  }, [currentViewId, currentView]);

  const handleAction = async (action: any, rowData: any) => {
    if (action.type === 'alert') {
      alert(action.message || '알림');
    } else if (action.type === 'navigate') {
      setCurrentViewId(action.targetViewId);
      setSearchTerm(''); setExpandedGroups({});
    } else if (action.type === 'insert_row') {
      setActiveInsertAction(action);
      const initialData: Record<string, any> = {};
      action.insertMappings?.forEach((m: any) => {
        if (m.mappingType === 'card_data') initialData[m.targetColumn] = rowData[m.sourceValue];
        else if (m.mappingType === 'static') initialData[m.targetColumn] = m.sourceValue;
        else initialData[m.targetColumn] = '';
      });
      setFormData(initialData); setIsInputModalOpen(true);
    } else if (action.type === 'delete_row') {
      if (!action.deleteTableName || !rowData.id) return alert("테이블 설정 또는 대상의 고유 ID가 누락되었습니다.");
      if (!window.confirm("정말로 이 데이터를 영구 삭제하시겠습니까?")) return;
      try {
        const { error } = await supabase.from(action.deleteTableName).delete().eq('id', rowData.id);
        if (error) throw error;
        alert("성공적으로 삭제되었습니다.");
        if (currentView?.tableName === action.deleteTableName) fetchTableData(currentView);
      } catch (err: any) { alert(`삭제 실패: ${err.message}`); }
    } else if (action.type === 'update_row') {
      if (!action.updateTableName || !rowData.id) return alert("테이블 설정 또는 대상의 고유 ID가 누락되었습니다.");
      setActiveUpdateAction(action); setActiveRowData(rowData);
      const initialData: Record<string, any> = {};
      action.updateMappings?.forEach((m: any) => {
        if (m.mappingType === 'card_data') initialData[m.targetColumn] = rowData[m.sourceValue];
        else if (m.mappingType === 'static') initialData[m.targetColumn] = m.sourceValue;
        else if (m.mappingType === 'prompt') initialData[m.targetColumn] = rowData[m.targetColumn] !== undefined && rowData[m.targetColumn] !== null ? rowData[m.targetColumn] : '';
      });
      setUpdateFormData(initialData); setIsUpdateModalOpen(true);
    }
  };

  const handleSubmitInsert = async () => {
    if (!activeInsertAction || isSubmitting) return;
    if (!window.confirm("입력하신 내용을 저장하시겠습니까?")) return;
    setIsSubmitting(true);
    try {
      const finalPayload = { ...formData };
      activeInsertAction.insertMappings?.forEach((m: any) => { if (m.valueType === 'number') finalPayload[m.targetColumn] = Number(finalPayload[m.targetColumn]) || 0; });
      const { error } = await supabase.from(activeInsertAction.insertTableName).insert([finalPayload]);
      if (error) throw error;
      alert("성공적으로 저장되었습니다.");
      setIsInputModalOpen(false);
      if (currentView?.tableName === activeInsertAction.insertTableName) fetchTableData(currentView);
    } catch (err: any) { alert(`저장 실패: ${err.message}`); } 
    finally { setIsSubmitting(false); }
  };

  const handleSubmitUpdate = async () => {
    if (!activeUpdateAction || isUpdating || !activeRowData) return;
    if (!window.confirm("수정하신 내용을 최종 반영하시겠습니까?")) return;
    setIsUpdating(true);
    try {
      const finalPayload = { ...updateFormData };
      activeUpdateAction.updateMappings?.forEach((m: any) => { if (m.valueType === 'number') finalPayload[m.targetColumn] = Number(finalPayload[m.targetColumn]) || 0; });
      const { error } = await supabase.from(activeUpdateAction.updateTableName).update(finalPayload).eq('id', activeRowData.id);
      if (error) throw error;
      alert("성공적으로 데이터가 수정되었습니다.");
      setIsUpdateModalOpen(false);
      if (currentView?.tableName === activeUpdateAction.updateTableName) fetchTableData(currentView);
    } catch (err: any) { alert(`수정 처리 실패: ${err.message}`); } 
    finally { setIsUpdating(false); }
  };

  const getFilteredData = () => {
    const rawData = tableData[currentView?.tableName || ''] || [];
    if (!searchTerm) return rawData; 
    return rawData.filter((row: any) => Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())));
  };

  const displayData = getFilteredData();
  let groupedData: Record<string, any[]> = {};
  if (currentView?.groupByColumn) {
    displayData.forEach(row => {
      const groupKey = row[currentView.groupByColumn as string];
      const key = (groupKey === null || groupKey === undefined || groupKey === '') ? '미분류' : String(groupKey);
      if (!groupedData[key]) groupedData[key] = [];
      groupedData[key].push(row);
    });
  }

  const toggleGroup = (key: string) => setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  const groupKeys = Object.keys(groupedData);
  const isAllExpanded = groupKeys.length > 0 && groupKeys.every(k => expandedGroups[k]);
  const handleToggleAllGroups = () => {
    if (isAllExpanded) setExpandedGroups({}); 
    else { const allOpen: Record<string, boolean> = {}; groupKeys.forEach(k => allOpen[k] = true); setExpandedGroups(allOpen); }
  };

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-black text-slate-400">LOADING...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans">
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col relative h-screen overflow-hidden">
        
        <div className="pt-8 pb-3 px-6 border-b bg-white sticky top-0 z-10 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-10">
              {currentViewId !== appData?.app_config?.views?.[0]?.id && (
                <button onClick={() => { setCurrentViewId(appData.app_config.views[0].id); setSearchTerm(''); setExpandedGroups({}); }} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><ChevronLeft /></button>
              )}
            </div>
            <div className="font-black text-slate-900 text-xl truncate">{currentView?.name || appData.name}</div>
            <div className="w-10 text-right">
              {currentView?.tableName && <button onClick={() => fetchTableData(currentView)} className="p-2 text-slate-400 hover:text-indigo-600 transition-colors"><RefreshCw size={18} /></button>}
            </div>
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder={currentView?.groupByColumn ? "전체 그룹에서 검색..." : "데이터 검색..."} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value !== '' && currentView?.groupByColumn) { const allOpen: Record<string, boolean> = {}; Object.keys(groupedData).forEach(k => allOpen[k] = true); setExpandedGroups(allOpen); } }} className="w-full pl-10 pr-4 py-2.5 bg-slate-100 rounded-2xl text-sm font-bold outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700" />
            </div>
            {currentView?.groupByColumn && groupKeys.length > 0 && (
              <button onClick={handleToggleAllGroups} className="flex items-center justify-center gap-1.5 px-3.5 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-[11px] hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50/50 transition-all shrink-0">
                {isAllExpanded ? <ChevronsUp size={16} /> : <ChevronsUpDown size={16} />}{isAllExpanded ? '접기' : '펼치기'}
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-slate-50 pb-20">
          {currentView?.groupByColumn ? (
            <div className="flex flex-col pt-1">
              {Object.entries(groupedData).map(([groupKey, rows]) => {
                const isExpanded = !!expandedGroups[groupKey];
                return (
                  <div key={groupKey} className="mb-1">
                    <button onClick={() => toggleGroup(groupKey)} className="w-full flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 hover:bg-indigo-50/50 transition-colors">
                      <div className="flex items-center gap-3"><Folder className={isExpanded ? "text-indigo-500" : "text-slate-400"} size={18} /><span className={`text-[15px] font-black ${isExpanded ? 'text-indigo-900' : 'text-slate-700'}`}>{groupKey}</span><span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">{rows.length}건</span></div>
                      <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}><ChevronDown className={isExpanded ? "text-indigo-500" : "text-slate-300"} size={20} /></div>
                    </button>
                    {isExpanded && (
                      <div className={`grid gap-0 bg-slate-50 border-b border-slate-200 shadow-inner ${currentView?.columnCount === 2 ? 'grid-cols-2' : currentView?.columnCount === 3 ? 'grid-cols-3' : currentView?.columnCount === 4 ? 'grid-cols-4' : 'grid-cols-1'}`}>
                        {rows.map((row, idx) => (
                          <div key={idx} className="flex flex-col bg-white border-b border-r border-slate-100 overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors" style={{ minHeight: `${currentView?.cardHeight || 120}px` }} onClick={() => { const act = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (act) handleAction(act, row); }}>
                            <RenderPreviewLayout rows={currentView?.layoutRows || []} rowData={row} actions={appData.app_config.actions} onExecuteAction={handleAction} />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={`grid gap-0 ${currentView?.columnCount === 2 ? 'grid-cols-2' : currentView?.columnCount === 3 ? 'grid-cols-3' : currentView?.columnCount === 4 ? 'grid-cols-4' : 'grid-cols-1'}`}>
              {displayData.map((row, idx) => (
                <div key={idx} className="flex flex-col bg-white border-b border-r border-slate-100 overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors" style={{ minHeight: `${currentView?.cardHeight || 120}px` }} onClick={() => { const act = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (act) handleAction(act, row); }}>
                  <RenderPreviewLayout rows={currentView?.layoutRows || []} rowData={row} actions={appData.app_config.actions} onExecuteAction={handleAction} />
                </div>
              ))}
            </div>
          )}
          {displayData.length === 0 && <div className="p-20 text-center flex flex-col items-center gap-3 text-slate-400 mt-10"><Search size={40} className="opacity-20" /><p className="font-bold">조건에 맞는 데이터가 없습니다.</p></div>}
        </div>

        <div className="h-20 bg-white border-t flex items-center justify-around px-2 absolute bottom-0 w-full z-20 shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
          {appData?.app_config?.views?.slice(0, 5).map((v: any) => {
            const IconComp = v.icon && IconMap[v.icon] ? IconMap[v.icon] : Layout;
            const isActive = currentViewId === v.id;
            return (
              <button key={v.id} onClick={() => { setCurrentViewId(v.id); setSearchTerm(''); setExpandedGroups({}); }} className={`flex-1 flex flex-col items-center gap-1.5 transition-all ${isActive ? 'text-indigo-600 scale-105' : 'text-slate-300 hover:text-slate-500'}`}>
                <IconComp size={22} strokeWidth={isActive ? 3 : 2} /><span className={`text-[10px] font-black uppercase tracking-tighter truncate w-16 text-center ${isActive ? 'opacity-100' : 'opacity-60'}`}>{v.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 모달 등 나머지 UI (기존과 동일) */}
      {isInputModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-indigo-600" /> 데이터 추가</h3>
              <button onClick={() => setIsInputModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50">
              {activeInsertAction?.insertMappings?.filter((m: any) => m.mappingType === 'prompt').map((mapping: any) => (
                <div key={mapping.id} className="space-y-2"><label className="block text-xs font-black text-slate-400 uppercase tracking-wider pl-1">{mapping.sourceValue}</label><input type={mapping.valueType === 'number' ? 'number' : 'text'} value={formData[mapping.targetColumn] || ''} onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 transition-all shadow-sm" placeholder="내용을 입력하세요..." /></div>
              ))}
              {activeInsertAction?.insertMappings?.filter((m: any) => m.mappingType !== 'prompt').length > 0 && <div className="pt-4 border-t border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase italic">* 나머지 설정된 데이터는 백그라운드에서 함께 저장됩니다.</p></div>}
            </div>
            <div className="p-6 bg-white border-t flex gap-3">
              <button onClick={() => setIsInputModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all border border-slate-100">취소</button>
              <button onClick={handleSubmitInsert} disabled={isSubmitting} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">{isSubmitting ? "저장 중..." : "최종 저장"}</button>
            </div>
          </div>
        </div>
      )}

      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-indigo-600" /> 데이터 정보 수정</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50">
              {activeUpdateAction?.updateMappings?.filter((m: any) => m.mappingType === 'prompt').map((mapping: any) => (
                <div key={mapping.id} className="space-y-2"><label className="block text-xs font-black text-slate-400 uppercase tracking-wider pl-1">{mapping.sourceValue}</label><input type={mapping.valueType === 'number' ? 'number' : 'text'} value={updateFormData[mapping.targetColumn] || ''} onChange={(e) => setUpdateFormData({ ...updateFormData, [mapping.targetColumn]: e.target.value })} className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 transition-all shadow-sm" placeholder="수정할 내용을 입력하세요..." /></div>
              ))}
              {activeUpdateAction?.updateMappings?.filter((m: any) => m.mappingType !== 'prompt').length > 0 && <div className="pt-4 border-t border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase italic">* 나머지 설정된 데이터는 백그라운드에서 함께 수정됩니다.</p></div>}
            </div>
            <div className="p-6 bg-white border-t flex gap-3">
              <button onClick={() => setIsUpdateModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all border border-slate-100">취소</button>
              <button onClick={handleSubmitUpdate} disabled={isUpdating} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">{isUpdating ? "수정 중..." : "수정 완료"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 🔥 중요: withAuth로 감싸서 내보내야 차단이 작동합니다.
export default withAuth(LiveAppPreview);