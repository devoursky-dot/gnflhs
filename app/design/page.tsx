// 파일 경로: app/design/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppState, View, Action, SchemaData } from './types';
import ViewEditor from './view';
import ActionEditor from './action';
import { Plus, Send, Loader2, ExternalLink, Trash2, FolderOpen, X, Star, ArrowUp, ArrowDown, Copy, PanelLeftClose, PanelLeft, Database, AppWindow } from 'lucide-react';
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
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);

  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsSidebarOpen(false);
    }
  }, []);

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

  const moveView = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === appState.views.length - 1)) return;
    const newViews = [...appState.views];
    const temp = newViews[index];
    newViews[index] = newViews[index + (direction === 'up' ? -1 : 1)];
    newViews[index + (direction === 'up' ? -1 : 1)] = temp;
    setAppState({ ...appState, views: newViews });
  };

  const duplicateView = (id: string) => {
    const viewToCopy = appState.views.find(v => v.id === id);
    if (!viewToCopy) return;
    
    const duplicatedView = JSON.parse(JSON.stringify(viewToCopy));
    const newId = `v_${Date.now()}`;
    duplicatedView.id = newId;
    duplicatedView.name = `${viewToCopy.name} (복사본)`;
    
    const resetIds = (rows: any[]) => {
      rows.forEach(r => {
        r.id = `r_${Math.random().toString(36).substr(2, 9)}`;
        r.cells.forEach((c: any) => {
          c.id = `c_${Math.random().toString(36).substr(2, 9)}`;
          if (c.nestedRows) resetIds(c.nestedRows);
        });
      });
    };
    resetIds(duplicatedView.layoutRows);

    setAppState({ ...appState, views: [...appState.views, duplicatedView] });
    setActiveItem({ type: 'view', id: newId });
  };

  const deleteView = (id: string) => {
    if (appState.views.length <= 1) {
      alert('앱에는 최소 1개의 화면(View)이 필요합니다.');
      return;
    }
    if (window.confirm('정말로 이 화면을 삭제하시겠습니까?\n이 작업은 복구할 수 없습니다.')) {
      const newViews = appState.views.filter(v => v.id !== id);
      setAppState({ ...appState, views: newViews });
      if (activeItem.id === id) setActiveItem({ type: 'view', id: newViews[0].id });
    }
  };

  const moveAction = (index: number, direction: 'up' | 'down') => {
    if ((direction === 'up' && index === 0) || (direction === 'down' && index === appState.actions.length - 1)) return;
    const newActions = [...appState.actions];
    const temp = newActions[index];
    newActions[index] = newActions[index + (direction === 'up' ? -1 : 1)];
    newActions[index + (direction === 'up' ? -1 : 1)] = temp;
    setAppState({ ...appState, actions: newActions });
  };

  const duplicateAction = (id: string) => {
    const actToCopy = appState.actions.find(a => a.id === id);
    if (!actToCopy) return;
    const duplicatedAct = JSON.parse(JSON.stringify(actToCopy));
    const newId = `a_${Date.now()}`;
    duplicatedAct.id = newId;
    duplicatedAct.name = `${actToCopy.name} (복사본)`;
    if (duplicatedAct.insertMappings) {
      duplicatedAct.insertMappings.forEach((m: any) => m.id = `m_${Math.random().toString(36).substr(2, 9)}`);
    }
    if (duplicatedAct.updateMappings) {
      duplicatedAct.updateMappings.forEach((m: any) => m.id = `m_${Math.random().toString(36).substr(2, 9)}`);
    }
    setAppState({ ...appState, actions: [...appState.actions, duplicatedAct] });
    setActiveItem({ type: 'action', id: newId });
  };

  const deleteAction = (id: string) => {
    if (window.confirm('정말로 이 액션을 삭제하시겠습니까?')) {
      const newActions = appState.actions.filter(a => a.id !== id);
      setAppState({ ...appState, actions: newActions });
      if (activeItem.id === id) setActiveItem({ type: 'view', id: appState.views[0].id });
    }
  };

  const handlePreviewPopup = async (viewId: string) => {
    if (!appState.id) {
      alert('최초 1회는 우측 하단의 [🚀 저장 및 배포하기]를 진행하여 앱을 생성해주세요.');
      return;
    }
    setIsPreviewSaving(viewId);
    try {
      const draftPayload = { name: appState.name, draft_config: { views: appState.views, actions: appState.actions, icon: appState.icon } };
      const { error } = await supabase.from('apps').update(draftPayload).eq('id', appState.id);
      if (error) throw error;
      window.open(`/preview/${appState.id}?viewId=${viewId}&mode=draft`, 'LivePreviewWindow', 'width=420,height=850,resizable=yes,scrollbars=yes');
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
      const payload = { name: appState.name, app_config: config, draft_config: config };
      
      if (!appState.id) {
        const { data, error } = await supabase.from('apps').insert([payload]).select('id');
        if (error) throw error;
        if (data && data.length > 0) setAppState(prev => ({ ...prev, id: data[0].id }));
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
    } catch (error: any) {}
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

  const handleIconSelect = (iconName: string) => {
    if (activeItem.type === 'app') setAppState({ ...appState, icon: iconName });
    else if (activeItem.type === 'view') setAppState({ ...appState, views: appState.views.map(v => v.id === activeItem.id ? { ...v, icon: iconName } : v) });
    else if (activeItem.type === 'action') setAppState({ ...appState, actions: appState.actions.map(a => a.id === activeItem.id ? { ...a, icon: iconName } : a) });
  };

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

      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <aside className={`
        fixed lg:static top-0 left-0 z-50 h-screen bg-white shrink-0 shadow-2xl transition-all duration-300 ease-in-out border-r border-slate-200
        ${isSidebarOpen ? 'translate-x-0 w-[320px]' : '-translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden lg:border-none'}
      `}>
        <div className="w-[320px] flex flex-col h-full">
          <div className="p-6 bg-indigo-700 text-white border-b border-indigo-800 shrink-0 flex flex-col gap-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-black text-indigo-300 tracking-widest uppercase">My Workspace</span>
              <div className="flex items-center gap-1.5">
                <button onClick={() => window.open('/admin', 'TableManager', 'width=1400,height=900,resizable=yes')} className="p-2 bg-indigo-800 hover:bg-emerald-500 text-white rounded-xl transition-all" title="DB 관리 (새 창)"><Database size={16} /></button>
                <button onClick={handleCreateNewApp} className="p-2 bg-indigo-800 hover:bg-indigo-900 text-white rounded-xl transition-all" title="새 앱 만들기"><Plus size={16} /></button>
                <button onClick={openAppListModal} className="p-2 bg-indigo-800 hover:bg-indigo-900 text-white rounded-xl transition-all" title="기존 앱 열기"><FolderOpen size={16} /></button>
              </div>
            </div>
            
            <div className="flex items-center gap-3 mt-2">
              <button 
                onClick={() => { setActiveItem({ type: 'app', id: 'app' }); setIsIconPickerOpen(true); }}
                className="w-10 h-10 shrink-0 flex items-center justify-center bg-indigo-800 border border-indigo-500 rounded-xl hover:bg-indigo-900 hover:border-white transition-all"
              >
                {appState.icon && IconMap[appState.icon] ? React.createElement(IconMap[appState.icon], { className: "text-white", size: 20 }) : <Star className="text-indigo-300" size={20} />}
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
              <div className="flex justify-between items-center text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                <span>VIEWS</span>
                <button onClick={() => { 
                  const id=`v_${Date.now()}`;
                  setAppState({...appState, views:[...appState.views, {id, name:'새 뷰', tableName:null, cardHeight:120, columnCount: 1, layoutRows:[], onClickActionId: null}]});
                  setActiveItem({type:'view', id});
                }} className="p-1 hover:bg-slate-100 rounded-lg text-indigo-600 transition-colors"><Plus size={18}/></button>
              </div>
              <div className="space-y-3">
                {appState.views.map((v, index) => {
                  const ViewIcon = v.icon && IconMap[v.icon] ? IconMap[v.icon] : null;
                  const isActive = activeItem.id === v.id;
                  
                  return (
                    <div key={v.id} onClick={() => setActiveItem({type:'view', id:v.id})} className={`w-full flex flex-col px-4 py-3 rounded-2xl text-sm font-black transition-all group cursor-pointer border ${isActive ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl scale-[1.02]' : 'bg-white border-slate-200 hover:border-indigo-300 text-slate-600 hover:shadow-md'}`}>
                      <div className="flex items-center justify-between w-full">
                        <div className="flex-1 flex items-center gap-2 text-left truncate outline-none">
                          {ViewIcon ? <ViewIcon size={16} className={isActive ? "text-indigo-200" : "text-slate-400"} /> : <Star size={16} className={isActive ? "text-indigo-200" : "text-slate-400"} />}
                          <span className="truncate">{v.name}</span>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); handlePreviewPopup(v.id); }}
                          disabled={isPreviewSaving === v.id}
                          className={`p-1.5 ml-2 shrink-0 rounded-lg transition-all ${isActive ? 'text-indigo-200 hover:text-white hover:bg-indigo-500' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100'} disabled:opacity-50`}
                          title="미리보기 팝업 열기"
                        >
                          {isPreviewSaving === v.id ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                        </button>
                      </div>
                      
                      <div className={`flex items-center justify-end gap-1 overflow-hidden transition-all duration-300 ${isActive ? 'max-h-10 mt-3 opacity-100' : 'max-h-0 opacity-0 group-hover:max-h-10 group-hover:mt-3 group-hover:opacity-100'}`}>
                        <button onClick={(e) => { e.stopPropagation(); moveView(index, 'up'); }} disabled={index === 0} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-indigo-500 disabled:opacity-30' : 'hover:bg-slate-100 disabled:opacity-30'}`} title="순서 올리기"><ArrowUp size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); moveView(index, 'down'); }} disabled={index === appState.views.length - 1} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-indigo-500 disabled:opacity-30' : 'hover:bg-slate-100 disabled:opacity-30'}`} title="순서 내리기"><ArrowDown size={14}/></button>
                        <div className={`w-[1px] h-3 mx-1 ${isActive ? 'bg-indigo-400' : 'bg-slate-200'}`}></div>
                        <button onClick={(e) => { e.stopPropagation(); duplicateView(v.id); }} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-indigo-500' : 'hover:bg-slate-100'}`} title="화면 복사하기"><Copy size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteView(v.id); }} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-rose-500 hover:text-white text-rose-200' : 'hover:bg-rose-50 text-rose-400'}`} title="화면 삭제하기"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">
                <span>ACTIONS</span>
                <button onClick={() => { 
                  const id=`a_${Date.now()}`;
                  setAppState({...appState, actions:[...appState.actions, {id, name:'새 액션', type:'alert', targetViewId:null, message:null}]}); 
                  setActiveItem({type:'action', id});
                }} className="p-1 hover:bg-slate-100 rounded-lg text-rose-500 transition-colors"><Plus size={18}/></button>
              </div>
              <div className="space-y-3">
                {appState.actions.map((a, index) => {
                  const ActIcon = a.icon && IconMap[a.icon] ? IconMap[a.icon] : null;
                  const isActive = activeItem.id === a.id;

                  return (
                    <div key={a.id} onClick={() => setActiveItem({type:'action', id:a.id})} className={`w-full flex flex-col px-4 py-3 border-l-8 rounded-r-2xl text-sm font-black transition-all group cursor-pointer ${isActive ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-md scale-[1.02]' : 'bg-white border-transparent hover:bg-slate-100 text-slate-600 hover:shadow-sm'}`}>
                      <div className="flex items-center gap-2 text-left w-full">
                        {ActIcon ? <ActIcon size={16} className={isActive ? "text-rose-500" : "text-slate-400"} /> : <span className="opacity-70">⚡</span>}
                        <span className="truncate flex-1">{a.name}</span>
                      </div>
                      
                      <div className={`flex items-center justify-end gap-1 overflow-hidden transition-all duration-300 ${isActive ? 'max-h-10 mt-3 opacity-100' : 'max-h-0 opacity-0 group-hover:max-h-10 group-hover:mt-3 group-hover:opacity-100'}`}>
                        <button onClick={(e) => { e.stopPropagation(); moveAction(index, 'up'); }} disabled={index === 0} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-rose-200 disabled:opacity-30' : 'hover:bg-slate-200 disabled:opacity-30'}`} title="순서 올리기"><ArrowUp size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); moveAction(index, 'down'); }} disabled={index === appState.actions.length - 1} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-rose-200 disabled:opacity-30' : 'hover:bg-slate-200 disabled:opacity-30'}`} title="순서 내리기"><ArrowDown size={14}/></button>
                        <div className={`w-[1px] h-3 mx-1 ${isActive ? 'bg-rose-200' : 'bg-slate-200'}`}></div>
                        <button onClick={(e) => { e.stopPropagation(); duplicateAction(a.id); }} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-rose-200' : 'hover:bg-slate-200'}`} title="액션 복사하기"><Copy size={14}/></button>
                        <button onClick={(e) => { e.stopPropagation(); deleteAction(a.id); }} className={`p-1.5 rounded-lg transition-colors ${isActive ? 'hover:bg-rose-500 hover:text-white text-rose-500' : 'hover:bg-rose-50 text-rose-400'}`} title="액션 삭제하기"><Trash2 size={14}/></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="p-6 bg-slate-50 border-t border-slate-200 shrink-0 z-30">
            <button onClick={handleSaveAndDeploy} disabled={isSaving} className="w-full flex items-center justify-center gap-2 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-sm font-black shadow-xl hover:shadow-indigo-500/30 transition-all active:scale-95 disabled:opacity-70 disabled:pointer-events-none">
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
              {isSaving ? '배포 진행 중...' : '🚀 실제 유저에게 배포하기'}
            </button>
            {appState.id && (
              <div className="mt-3 flex items-center gap-2">
                <a href={`/preview/${appState.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-2xl text-sm font-bold transition-all shadow-sm"><ExternalLink size={16} /> 라이브 앱 확인</a>
                <button onClick={handleDeleteApp} className="p-3 bg-white border border-rose-200 text-rose-500 hover:bg-rose-50 hover:border-rose-300 rounded-2xl transition-all shadow-sm" title="현재 앱 완전 삭제"><Trash2 size={18} /></button>
              </div>
            )}
          </div>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative z-10 bg-slate-50 h-screen overflow-hidden">
        <header className="h-16 border-b bg-white px-6 flex items-center shadow-sm shrink-0 z-20">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
            className="mr-5 p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all shrink-0"
            title="사이드바 토글"
          >
            {isSidebarOpen ? <PanelLeftClose size={22} /> : <PanelLeft size={22} />}
          </button>
          <span className="text-xs font-black text-slate-400 uppercase tracking-widest hidden sm:inline">
            {activeItem.type} MODE
          </span>
          <span className="mx-4 text-slate-300 hidden sm:inline">|</span>
          <span className="text-lg font-black text-slate-900 truncate">
            {activeItem.type==='view' ? activeView?.name : activeAction?.name}
          </span>
        </header>
        
        {/* 🔥 [핵심 수정] 하위 개체들의 크기를 계산(min-w-max)하여 필요 시 가로 스크롤을 무조건 생성합니다. 절대 찌그러지지 않습니다. */}
        <div className="flex-1 overflow-auto bg-slate-50">
          <div className="min-w-max w-full p-6 lg:p-10">
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
                onDelete={deleteAction}
                onOpenIconPicker={() => setIsIconPickerOpen(true)}
              />
            )}
          </div>
        </div>
      </main>

      <IconPicker 
        isOpen={isIconPickerOpen} 
        onClose={() => setIsIconPickerOpen(false)}
        selectedIcon={getCurrentIcon()}
        onSelect={handleIconSelect}
      />
    </div>
  );
}