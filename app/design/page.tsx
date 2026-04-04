// 파일 경로: C:/react-projects/gnflhs/app/design/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppState, View, Action, SchemaData } from './types';
import ViewEditor from './view';
import ActionEditor from './action';
import { Plus, Send, Loader2, ExternalLink, Trash2, FolderOpen, X, Star } from 'lucide-react';
import IconPicker, { IconMap } from './picker'; 

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "", 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

export default function AppBuilder() {
  const [appState, setAppState] = useState<AppState>({
    id: null, 
    name: '새로운 앱',
    icon: null, 
    views: [{ id: 'v1', name: '메인 홈 (첫 화면)', tableName: null, cardHeight: 120, columnCount: 1, layoutRows: [], onClickActionId: null }],
    actions: []
  });
  const [schemaData, setSchemaData] = useState<SchemaData>({});
  const [activeItem, setActiveItem] = useState<{ type: 'view' | 'action' | 'app', id: string }>({ type: 'view', id: 'v1' });
  const [isSaving, setIsSaving] = useState(false); 
  const [isPreviewSaving, setIsPreviewSaving] = useState<string | null>(null);

  const [isAppListModalOpen, setIsAppListModalOpen] = useState(false);
  const [savedAppsList, setSavedAppsList] = useState<any[]>([]);
  
  // [수정] 통합 아이콘 피커 상태
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

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

  const handlePreviewPopup = async (viewId: string) => {
    if (!appState.id) {
      alert('최초 1회는 우측 하단의 [🚀 저장 및 배포하기]를 진행하여 앱을 생성해주세요.');
      return;
    }
    setIsPreviewSaving(viewId);
    try {
      const draftPayload = {
        name: appState.name,
        draft_config: { views: appState.views, actions: appState.actions, icon: appState.icon }
      };
      const { error } = await supabase.from('apps').update(draftPayload).eq('id', appState.id);
      if (error) throw error;
      window.open(
        `/preview/${appState.id}?viewId=${viewId}&mode=draft`, 
        'LivePreviewWindow', 
        'width=420,height=850,resizable=yes,scrollbars=yes'
      );
    } catch (error: any) {
      alert(`미리보기 동기화 실패: ${error.message}`);
    } finally {
      setIsPreviewSaving(null);
    }
  };

  const handleSaveAndDeploy = async () => {
    setIsSaving(true);
    try {
      const config = { views: appState.views, actions: appState.actions, icon: appState.icon };
      const payload = {
        name: appState.name,
        app_config: config,
        draft_config: config
      };
      if (!appState.id) {
        const { data, error } = await supabase.from('apps').insert([payload]).select('id');
        if (error) throw error;
        if (data && data.length > 0) { setAppState(prev => ({ ...prev, id: data[0].id })); }
        alert('성공적으로 저장 및 최초 배포되었습니다!');
      } else {
        const { error } = await supabase.from('apps').update(payload).eq('id', appState.id);
        if (error) throw error;
        alert('실제 사용자들에게 배포되었습니다!');
      }
    } catch (error: any) {
      alert(`배포 중 오류가 발생했습니다.\n\n${error.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteApp = async () => {
    if (!appState.id) return;
    if (!window.confirm('정말로 이 앱을 삭제하시겠습니까? 복구할 수 없습니다.')) return;
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
      const configToLoad = data.draft_config || data.app_config || { views: [], actions: [] };
      setAppState({
        id: data.id,
        name: data.name || '이름 없는 앱',
        icon: configToLoad.icon || null,
        views: configToLoad.views || [],
        actions: configToLoad.actions || []
      });
      const firstViewId = configToLoad.views?.[0]?.id || 'v1';
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
    setActiveItem({ type: 'view', id: newViewId });
    setIsAppListModalOpen(false);
  };

  // [수정] 아이콘 선택 시 대상에 따라 상태 업데이트
  const handleIconSelect = (iconName: string) => {
    if (activeItem.type === 'app') {
      setAppState({ ...appState, icon: iconName });
    } else if (activeItem.type === 'view') {
      setAppState({ ...appState, views: appState.views.map(v => v.id === activeItem.id ? { ...v, icon: iconName } : v) });
    } else if (activeItem.type === 'action') {
      setAppState({ ...appState, actions: appState.actions.map(a => a.id === activeItem.id ? { ...a, icon: iconName } : a) });
    }
  };

  // [수정] 현재 피커에 표시될 아이콘 값 계산
  const getCurrentIcon = () => {
    if (activeItem.type === 'app') return appState.icon;
    if (activeItem.type === 'view') return appState.views.find(v => v.id === activeItem.id)?.icon;
    if (activeItem.type === 'action') return appState.actions.find(a => a.id === activeItem.id)?.icon;
    return null;
  };

  const activeView = appState.views.find(v => v.id === activeItem.id);
  const activeAction = appState.actions.find(a => a.id === activeItem.id);

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans overflow-hidden">
      
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

      <aside className="w-[320px] border-r bg-white flex flex-col shrink-0 shadow-2xl z-50 relative">
        <div className="p-6 bg-indigo-700 text-white border-b border-indigo-800 shrink-0 flex flex-col gap-4">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-black text-indigo-300 tracking-widest uppercase">My Workspace</span>
            <div className="flex items-center gap-1.5">
              <button onClick={handleCreateNewApp} className="flex items-center gap-1 text-[11px] font-bold bg-indigo-800 hover:bg-indigo-900 px-2.5 py-1.5 rounded-full" title="새 앱"><Plus size={12} /> 새 앱</button>
              <button onClick={openAppListModal} className="flex items-center gap-1 text-[11px] font-bold bg-indigo-800 hover:bg-indigo-900 px-2.5 py-1.5 rounded-full" title="열기"><FolderOpen size={12} /> 열기</button>
            </div>
          </div>
          
          <div className="flex items-center gap-3 mt-2">
            <button 
              onClick={() => { setActiveItem({ type: 'app', id: 'app' }); setIsIconPickerOpen(true); }}
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
                  <div key={v.id} className={`w-full flex items-center justify-between px-5 py-3 rounded-2xl text-sm font-black transition-all ${activeItem.id === v.id ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'hover:bg-slate-100 text-slate-600'}`}>
                    <button onClick={() => setActiveItem({type:'view', id:v.id})} className="flex-1 flex items-center gap-2 text-left truncate outline-none">
                      {ViewIcon && <ViewIcon size={16} className={activeItem.id === v.id ? "text-indigo-200" : "text-slate-400"} />}
                      <span className="truncate">{v.name}</span>
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreviewPopup(v.id); }}
                      disabled={isPreviewSaving === v.id}
                      className={`p-1.5 ml-2 shrink-0 rounded-lg transition-all ${activeItem.id === v.id ? 'text-indigo-200 hover:text-white hover:bg-indigo-500' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-200'} disabled:opacity-50`}
                    >
                      {isPreviewSaving === v.id ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                    </button>
                  </div>
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
                  <button key={a.id} onClick={() => setActiveItem({type:'action', id:a.id})} className={`w-full flex items-center gap-2 text-left px-5 py-3 border-l-8 rounded-r-2xl text-sm font-black transition-all ${activeItem.id===a.id ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm' : 'border-transparent hover:bg-slate-100 text-slate-600'}`}>
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
            {isSaving ? '배포 진행 중...' : '🚀 실제 유저에게 배포하기'}
          </button>
          {appState.id && (
            <div className="mt-3 flex items-center gap-2">
              <a href={`/preview/${appState.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-2xl text-sm font-bold transition-all shadow-sm"><ExternalLink size={16} /> 라이브 앱 확인</a>
              <button onClick={handleDeleteApp} className="p-3 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 rounded-2xl transition-all shadow-sm"><Trash2 size={18} /></button>
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
        
        <div className="flex-1 flex justify-center">
          <div className="w-full max-w-4xl p-6">
            {activeItem.type==='view' && activeView && (
              <ViewEditor 
                view={activeView} 
                schemaData={schemaData} 
                actions={appState.actions} 
                onUpdate={(upd) => setAppState({...appState, views: appState.views.map(v => v.id===upd.id ? upd : v)})} 
              />
            )}
            {activeItem.type==='action' && activeAction && (
              <ActionEditor 
                action={activeAction} 
                views={appState.views} 
                schemaData={schemaData} 
                onUpdate={(upd) => setAppState({...appState, actions: appState.actions.map(a => a.id===upd.id ? upd : a)})} 
                onDelete={(id) => { setAppState({...appState, actions: appState.actions.filter(a => a.id !== id)}); setActiveItem({type:'view', id:'v1'}); }}
                // [수정] 액션에서 피커를 열도록 전달
                onOpenIconPicker={() => setIsIconPickerOpen(true)}
              />
            )}
          </div>
        </div>
      </main>

      {/* [수정] 통합 아이콘 피커 - main과 aside 밖 최상위에 위치하여 가려짐 방지 */}
      <IconPicker 
        isOpen={isIconPickerOpen} 
        onClose={() => setIsIconPickerOpen(false)}
        selectedIcon={getCurrentIcon()}
        onSelect={handleIconSelect}
      />
    </div>
  );
}