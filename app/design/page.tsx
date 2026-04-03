"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppState, View, Action, SchemaData, LayoutRow, LayoutCell } from './types';
import ViewEditor from './view';
import ActionEditor from './action';
import { Plus, RefreshCw, Send, Loader2, ExternalLink, Trash2, FolderOpen, X, Star } from 'lucide-react';
import IconPicker, { IconMap } from './picker'; // [신규] 앱 아이콘 설정용

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
      {rows.map((row: LayoutRow) => (
        <div key={row.id} className="flex gap-0 w-full items-stretch">
          {row.cells.map((cell: LayoutCell) => {
            const cellValue = rowData[cell.contentValue || ''];
            const shouldShowImage = cell.isImage || isImageUrl(cellValue);

            return (
              <div key={cell.id} style={{ flex: cell.flex }} className="flex flex-col justify-center min-w-0 overflow-hidden relative">
                {cell.contentType === 'field' && shouldShowImage && (
                  <div className="w-full h-full overflow-hidden bg-slate-50">
                    <img src={String(cellValue)} alt="img" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
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
                  const act = actions.find((a: Action) => a.id === cell.contentValue);
                  // [추가] 액션에 아이콘이 있으면 렌더링
                  const ActIcon = act?.icon && IconMap[act.icon] ? IconMap[act.icon] : null;

                  return act ? (
                    <button onClick={(e: React.MouseEvent) => { e.stopPropagation(); onExecuteAction(act, rowData); }} className="w-full h-full bg-slate-900 text-white flex flex-col items-center justify-center gap-1 text-[10px] font-black py-3 hover:bg-indigo-600 transition-colors">
                      {ActIcon && <ActIcon size={14} />}
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

export default function AppBuilder() {
  const [appState, setAppState] = useState<AppState>({
    id: null, 
    name: '새로운 앱',
    icon: null, // [신규] 초기 앱 아이콘 상태
    views: [{ id: 'v1', name: '메인 홈 (첫 화면)', tableName: null, cardHeight: 120, columnCount: 1, layoutRows: [], onClickActionId: null }],
    actions: []
  });
  
  const [schemaData, setSchemaData] = useState<SchemaData>({});
  const [activeItem, setActiveItem] = useState<{ type: 'view' | 'action', id: string }>({ type: 'view', id: 'v1' });
  const [previewData, setPreviewData] = useState<Record<string, any[]>>({});
  const [currentPreviewViewId, setCurrentPreviewViewId] = useState<string>('v1');
  const [isSaving, setIsSaving] = useState(false); 

  const [isAppListModalOpen, setIsAppListModalOpen] = useState(false);
  const [savedAppsList, setSavedAppsList] = useState<any[]>([]);
  const [isAppIconPickerOpen, setIsAppIconPickerOpen] = useState(false); // [신규] 앱 아이콘 픽커 상태

  useEffect(() => {
    async function fetchSchema() {
      const { data } = await supabase.rpc("get_schema_info");
      if (data) {
        const grouped = data.reduce((acc: any, row: any) => {
          if (!acc[row.table_name]) acc[row.table_name] = [];
          acc[row.table_name].push(row.column_name);
          return acc;
        }, {});
        setSchemaData(grouped);
      }
    }
    fetchSchema();
  }, []);

  const fetchTableData = async (tableName: string) => {
    const { data } = await supabase.from(tableName).select("*").limit(1000);
    if (data) {
      setPreviewData(prev => ({ ...prev, [tableName]: data }));
    }
  };

  useEffect(() => {
    const activeView = appState.views.find(v => v.id === currentPreviewViewId);
    if (activeView?.tableName && !previewData[activeView.tableName]) {
      fetchTableData(activeView.tableName);
    }
  }, [currentPreviewViewId, appState.views, previewData]);

  const handleAction = async (action: Action, rowData: any) => {
    if (action.type === 'alert') {
      alert(action.message || '알림');
    } else if (action.type === 'navigate' && action.targetViewId) {
      setCurrentPreviewViewId(action.targetViewId);
    } else if (action.type === 'insert_row' && action.insertTableName) {
      if (action.requireConfirmation) {
        const isConfirmed = window.confirm(action.confirmationMessage || '정말로 데이터를 추가하시겠습니까?');
        if (!isConfirmed) return; 
      }
      if (!action.insertMappings || action.insertMappings.length === 0) {
        alert('실패: 데이터 매핑이 설정되지 않았습니다.');
        return;
      }
      const payload: Record<string, any> = {};
      for (const mapping of action.insertMappings) {
        if (!mapping.targetColumn) continue;
        if (mapping.mappingType === 'card_data') {
          payload[mapping.targetColumn] = rowData[mapping.sourceValue];
        } else if (mapping.mappingType === 'prompt') {
          const userInput = window.prompt(mapping.sourceValue || `${mapping.targetColumn}에 저장할 값을 입력하세요:`);
          if (userInput === null) return;
          payload[mapping.targetColumn] = userInput;
        } else {
          payload[mapping.targetColumn] = mapping.sourceValue;
        }
      }
      try {
        const { error } = await supabase.from(action.insertTableName).insert([payload]);
        if (error) throw error;
        const currentView = appState.views.find(v => v.id === currentPreviewViewId);
        if (currentView?.tableName === action.insertTableName) {
          await fetchTableData(action.insertTableName);
        }
        alert(`성공: [${action.insertTableName}] 테이블에 데이터가 추가되었습니다.`);
      } catch (error: any) {
        alert(`데이터 추가 실패: ${error.message}`);
      }
    }
  };

  const handleSaveAndDeploy = async () => {
    setIsSaving(true);
    try {
      const payload = {
        name: appState.name,
        app_config: { views: appState.views, actions: appState.actions, icon: appState.icon }
      };

      if (!appState.id) {
        const { data, error } = await supabase.from('apps').insert([payload]).select('id');
        if (error) throw error;
        if (data && data.length > 0) { setAppState(prev => ({ ...prev, id: data[0].id })); }
        alert('성공적으로 저장 및 배포되었습니다!');
      } else {
        const { error } = await supabase.from('apps').update(payload).eq('id', appState.id);
        if (error) throw error;
        alert('성공적으로 업데이트 및 배포되었습니다!');
      }
    } catch (error: any) {
      alert(`배포 중 오류가 발생했습니다.\n\n${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!appState.id) return;
    if (!window.confirm('정말로 이 앱을 삭제하시겠습니까?')) return;
    try {
      const { error } = await supabase.from('apps').delete().eq('id', appState.id);
      if (error) throw error;
      alert('앱이 성공적으로 삭제되었습니다.');
      handleCreateNewApp();
    } catch (error: any) {
      alert(`앱 삭제 실패: ${error.message}`);
    }
  };

  const openAppListModal = async () => {
    setIsAppListModalOpen(true);
    const { data } = await supabase.from('apps').select('id, name, created_at').order('id', { ascending: false });
    if (data) setSavedAppsList(data);
  };

  const loadAppToBuilder = async (appId: number) => {
    try {
      const { data, error } = await supabase.from('apps').select('*').eq('id', appId).single();
      if (error) throw error;

      setAppState({
        id: data.id,
        name: data.name || '이름 없는 앱',
        icon: data.app_config?.icon || null,
        views: data.app_config?.views || [],
        actions: data.app_config?.actions || []
      });

      const firstViewId = data.app_config?.views?.[0]?.id || 'v1';
      setCurrentPreviewViewId(firstViewId);
      setActiveItem({ type: 'view', id: firstViewId });
      setIsAppListModalOpen(false);
    } catch (error: any) {
      alert(`앱을 불러오는 데 실패했습니다: ${error.message}`);
    }
  };

  const handleCreateNewApp = () => {
    const newViewId = `v_${Date.now()}`;
    setAppState({
      id: null, name: '새로운 앱', icon: null,
      views: [{ id: newViewId, name: '메인 홈 (첫 화면)', tableName: null, cardHeight: 120, columnCount: 1, layoutRows: [], onClickActionId: null }],
      actions: []
    });
    setCurrentPreviewViewId(newViewId);
    setActiveItem({ type: 'view', id: newViewId });
    setIsAppListModalOpen(false);
  };

  const activeView = appState.views.find(v => v.id === activeItem.id);
  const activeAction = appState.actions.find(a => a.id === activeItem.id);
  const previewView = appState.views.find(v => v.id === currentPreviewViewId) || appState.views[0];
  const PreviewViewIcon = previewView?.icon && IconMap[previewView.icon] ? IconMap[previewView.icon] : null;

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans overflow-hidden">
      
      {/* 팝업 모달 */}
      {isAppListModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <FolderOpen className="text-indigo-600" /> 내 앱 목록
              </h2>
              <button onClick={() => setIsAppListModalOpen(false)} className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 max-h-[400px] overflow-y-auto bg-slate-50 space-y-2">
              {savedAppsList.length === 0 ? (
                <div className="py-10 text-center text-slate-400 font-bold text-sm">저장된 앱이 없습니다.</div>
              ) : (
                savedAppsList.map(app => (
                  <button key={app.id} onClick={() => loadAppToBuilder(app.id)} className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all text-left group">
                    <div>
                      <h3 className="font-black text-slate-800 text-base group-hover:text-indigo-700">{app.name || '이름 없는 앱'}</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">ID: {app.id} • {new Date(app.created_at).toLocaleDateString()}</p>
                    </div>
                    <span className="text-sm font-black text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity">열기 &rarr;</span>
                  </button>
                ))
              )}
            </div>
            <div className="p-6 bg-white border-t border-slate-100">
              <button onClick={handleCreateNewApp} className="w-full py-4 border-2 border-dashed border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-2xl text-sm font-black transition-all flex items-center justify-center gap-2">
                <Plus size={18} /> 아예 새로운 앱 만들기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 사이드바 */}
      <aside className="w-[320px] border-r bg-white flex flex-col shrink-0 shadow-2xl z-50 relative">
        <div className="p-6 bg-indigo-700 text-white border-b border-indigo-800 shrink-0 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-indigo-300 tracking-widest uppercase">My Workspace</span>
            <div className="flex items-center gap-1.5">
              <button onClick={handleCreateNewApp} className="flex items-center gap-1 text-[11px] font-bold bg-indigo-800 hover:bg-indigo-900 px-2.5 py-1.5 rounded-full" title="새 앱"><Plus size={12} /> 새 앱</button>
              <button onClick={openAppListModal} className="flex items-center gap-1 text-[11px] font-bold bg-indigo-800 hover:bg-indigo-900 px-2.5 py-1.5 rounded-full" title="열기"><FolderOpen size={12} /> 열기</button>
            </div>
          </div>
          
          {/* [신규] 사이드바 앱 이름과 아이콘 결합 */}
          <div className="flex items-center gap-3 mt-2">
            <button 
              onClick={() => setIsAppIconPickerOpen(true)}
              className="w-10 h-10 shrink-0 flex items-center justify-center bg-indigo-800 border border-indigo-500 rounded-xl hover:bg-indigo-900 hover:border-white transition-all"
            >
              {appState.icon && IconMap[appState.icon] ? 
                React.createElement(IconMap[appState.icon], { className: "text-white", size: 20 }) : 
                <Star className="text-indigo-300" size={20} />
              }
            </button>
            <input 
              type="text" 
              value={appState.name} 
              onChange={(e) => setAppState({...appState, name: e.target.value})}
              className="bg-transparent text-white text-xl font-black outline-none w-full border-b-2 border-indigo-400 focus:border-white transition-all placeholder:text-indigo-300 pb-1"
            />
          </div>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto space-y-10">
          <div>
            <div className="flex justify-between text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
              <span>VIEWS</span>
              <button onClick={() => { 
                const id=`v_${Date.now()}`; 
                setAppState({...appState, views:[...appState.views, {id, name:'새 뷰', tableName:null, cardHeight:120, columnCount: 1, layoutRows:[], onClickActionId: null}]});
                setActiveItem({type:'view', id});
              }} className="p-1 hover:bg-slate-100 rounded-lg text-indigo-600"><Plus size={18}/></button>
            </div>
            <div className="space-y-2">
              {appState.views.map(v => {
                const ViewIcon = v.icon && IconMap[v.icon] ? IconMap[v.icon] : null;
                return (
                  <button 
                    key={v.id} 
                    onClick={() => setActiveItem({type:'view', id:v.id})}
                    className={`w-full flex items-center gap-2 text-left px-5 py-3 rounded-2xl text-sm font-black transition-all ${activeItem.id===v.id ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'hover:bg-slate-100 text-slate-600'}`}
                  >
                    {ViewIcon && <ViewIcon size={16} className={activeItem.id === v.id ? "text-indigo-200" : "text-slate-400"} />}
                    <span className="truncate">{v.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex justify-between text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
              <span>ACTIONS</span>
              <button onClick={() => { 
                const id=`a_${Date.now()}`;
                setAppState({...appState, actions:[...appState.actions, {id, name:'새 액션', type:'alert', targetViewId:null, message:null}]}); 
                setActiveItem({type:'action', id});
              }} className="p-1 hover:bg-slate-100 rounded-lg text-rose-500"><Plus size={18}/></button>
            </div>
            <div className="space-y-2">
              {appState.actions.map(a => {
                const ActIcon = a.icon && IconMap[a.icon] ? IconMap[a.icon] : null;
                return (
                  <button 
                    key={a.id} 
                    onClick={() => setActiveItem({type:'action', id:a.id})}
                    className={`w-full flex items-center gap-2 text-left px-5 py-3 border-l-8 rounded-r-2xl text-sm font-black transition-all ${activeItem.id===a.id ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm' : 'border-transparent hover:bg-slate-100 text-slate-600'}`}
                  >
                    {ActIcon ? <ActIcon size={16} className={activeItem.id === a.id ? "text-rose-500" : "text-slate-400"} /> : <span>⚡</span>}
                    <span className="truncate">{a.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0">
          <button onClick={handleSaveAndDeploy} disabled={isSaving} className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black shadow-xl hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none">
            {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
            {isSaving ? '배포 진행 중...' : '🚀 저장 및 배포하기'}
          </button>
          {appState.id && (
            <div className="mt-3 flex items-center gap-2">
              <a href={`/preview/${appState.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-2xl text-sm font-bold transition-all shadow-sm"><ExternalLink size={16} /> 라이브 앱 열기</a>
              <button onClick={handleDeleteApp} title="이 앱을 서버에서 삭제합니다" className="p-3 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 rounded-2xl transition-all shadow-sm"><Trash2 size={18} /></button>
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative z-10 bg-slate-50 h-screen overflow-y-auto">
        <header className="h-16 border-b bg-white px-10 flex items-center shadow-sm shrink-0 sticky top-0 z-20">
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest">{activeItem.type} MODE</span>
          <span className="mx-4 text-slate-300">|</span>
          <span className="text-lg font-black text-slate-900">{activeItem.type==='view' ? activeView?.name : activeAction?.name}</span>
        </header>
        
        <div className="flex-1">
          {activeItem.type==='view' && activeView && (
            <ViewEditor view={activeView} schemaData={schemaData} actions={appState.actions} onUpdate={(upd) => setAppState({...appState, views: appState.views.map(v => v.id===upd.id ? upd : v)})} />
          )}
          {activeItem.type==='action' && activeAction && (
            <ActionEditor action={activeAction} views={appState.views} schemaData={schemaData} onUpdate={(upd) => setAppState({...appState, actions: appState.actions.map(a => a.id===upd.id ? upd : a)})} onDelete={(id) => { setAppState({...appState, actions: appState.actions.filter(a => a.id !== id)}); setActiveItem({type:'view', id:'v1'}); }} />
          )}
        </div>
      </main>

      <aside className="w-[450px] bg-slate-900 flex flex-col items-center py-10 shrink-0 shadow-2xl z-30">
        <div className="w-[340px] h-[720px] bg-white rounded-[4rem] border-[10px] border-slate-800 shadow-2xl overflow-hidden flex flex-col relative">
          
          {/* [수정] 라이브 프리뷰 헤더에도 뷰 아이콘 노출 */}
          <div className="pt-14 pb-4 px-12 text-center border-b bg-white sticky top-0 z-10 flex items-center justify-center shadow-sm relative">
            <div className="font-black text-slate-900 text-xl tracking-tight truncate flex items-center justify-center gap-2">
              {PreviewViewIcon && <PreviewViewIcon size={20} className="text-indigo-500" />}
              {previewView?.name}
            </div>
            {previewView?.tableName && (
              <button onClick={(e) => { e.stopPropagation(); fetchTableData(previewView.tableName!); }} className="absolute right-4 bottom-3.5 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:scale-95" title="데이터 동기화">
                <RefreshCw size={18} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-900">
            <div className={`grid gap-0 ${previewView?.columnCount === 2 ? 'grid-cols-2' : previewView?.columnCount === 3 ? 'grid-cols-3' : previewView?.columnCount === 4 ? 'grid-cols-4' : 'grid-cols-1'}`}>
              {previewData[previewView?.tableName || '']?.map((row, idx) => {
                const clickAction = appState.actions.find(a => a.id === previewView?.onClickActionId);
                return (
                  <div key={idx} className={`bg-white border-b border-r border-slate-100 overflow-hidden transition-all ${clickAction ? 'cursor-pointer hover:bg-indigo-50/50 active:scale-[0.98]' : ''}`} style={{ minHeight: `${previewView?.cardHeight}px` }} onClick={() => { if (clickAction) handleAction(clickAction, row); }}>
                    <RenderPreviewLayout rows={previewView?.layoutRows || []} rowData={row} actions={appState.actions} onExecuteAction={handleAction} />
                  </div>
                );
              })}
            </div>
          </div>
          {currentPreviewViewId !== appState.views[0]?.id && (
            <div className="p-6 bg-white border-t border-slate-100">
              <button onClick={() => setCurrentPreviewViewId(appState.views[0].id)} className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-2xl hover:bg-indigo-700 transition-all">
                🏠 첫 화면으로 이동
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* 앱 설정 아이콘 피커 */}
      <IconPicker 
        isOpen={isAppIconPickerOpen} 
        onClose={() => setIsAppIconPickerOpen(false)}
        selectedIcon={appState.icon}
        onSelect={(iconName) => setAppState({ ...appState, icon: iconName })}
      />
    </div>
  );
}