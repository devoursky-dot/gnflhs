// 파일 경로: app/design/page.tsx

"use client";

import React, { useState, useEffect } from 'react'; 
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/supabaseClient';
import { AppState, View, Action, SchemaData } from './types';
import ViewEditor from './view';
import ActionEditor from './action';
import { Plus, Send, Loader2, ExternalLink, Trash2, FolderOpen, X, Star, ArrowUp, ArrowDown, Copy, PanelLeftClose, PanelLeft, Database } from 'lucide-react';
import IconPicker, { IconMap } from './picker'; 
import withAuth from '../withAuth';

function AppBuilder() { 
  const router = useRouter();

  const [appState, setAppState] = useState<AppState>({
    id: null, 
    name: '새로운 앱',
    icon: null, 
    views: [{ id: 'v1', name: '메인 홈 (첫 화면)', tableName: null, cardHeight: 120, columnCount: 1, layoutRows: [], onClickActionId: null }],
    actions: []
  });
  // 기존 AppBuilder 상태들 및 함수들은 그대로 유지
  const [schemaData, setSchemaData] = useState<SchemaData>({});
  const [activeItem, setActiveItem] = useState<{ type: 'view' | 'action' | 'app', id: string }>({ type: 'view', id: 'v1' });
  const [isSaving, setIsSaving] = useState(false);
  const [isPreviewSaving, setIsPreviewSaving] = useState<string | null>(null);
  const [isAppListModalOpen, setIsAppListModalOpen] = useState(false);
  const [savedAppsList, setSavedAppsList] = useState<any[]>([]);
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // --- [앱 복제 관련 상태] ---
  const [isCloneModalOpen, setIsCloneModalOpen] = useState(false);
  const [cloningApp, setCloningApp] = useState<any>(null);
  const [tableMappings, setTableMappings] = useState<Record<string, { action: 'reuse' | 'clone', newName: string }>>({});
  const [isCloning, setIsCloning] = useState(false);


  // 나머지 useEffect 및 핸들러 함수들은 기존대로 유지
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

  /**
   * 앱 복제 시작: 앱 내에서 사용 중인 테이블을 모두 추출하여 매핑 상태 초기화
   */
  const startCloneApp = async (appId: number) => {
    try {
      const { data, error } = await supabase.from('apps').select('*').eq('id', appId).single();
      if (error) throw error;
      
      const config = data.app_config || data.draft_config || { views: [], actions: [] };
      const tables = extractTablesFromApp(config);
      
      const initialMappings: Record<string, { action: 'reuse' | 'clone', newName: string }> = {};
      tables.forEach(t => {
        initialMappings[t] = { action: 'reuse', newName: `${t}_copy` };
      });
      
      setCloningApp(data);
      setTableMappings(initialMappings);
      setIsCloneModalOpen(true);
    } catch (error: any) {
      alert(`복제 준비 실패: ${error.message}`);
    }
  };

  /**
   * 앱 설정 내에서 사용 중인 테이블 목록 추출 (Views, Actions)
   */
  const extractTablesFromApp = (config: any) => {
    const tables = new Set<string>();
    
    // 뷰에서 테이블 추출
    config.views?.forEach((v: any) => {
      if (v.tableName) tables.add(v.tableName);
    });
    
    // 액션에서 테이블 추출
    config.actions?.forEach((a: any) => {
      if (a.insertTableName) tables.add(a.insertTableName);
      if (a.updateTableName) tables.add(a.updateTableName);
      if (a.deleteTableName) tables.add(a.deleteTableName);
    });

    return Array.from(tables);
  };

  /**
   * 앱 및 테이블 복제 실행 공통 로직
   */
  const handleCloneAppWithTables = async () => {
    if (!cloningApp) return;
    setIsCloning(true);
    try {
      const config = JSON.parse(JSON.stringify(cloningApp.app_config || cloningApp.draft_config || { views: [], actions: [] }));
      let configStr = JSON.stringify(config);

      // 1단계: 테이블 복제 실행
      for (const [oldName, mapping] of Object.entries(tableMappings)) {
        if (mapping.action === 'clone') {
          // SQL RPC 호출 (clone_table 함수 필요)
          const { error: rpcErr } = await supabase.rpc('clone_table', {
            source_table: oldName,
            target_table: mapping.newName,
            copy_data: true
          });
          if (rpcErr) throw new Error(`[${oldName}] 테이블 복제 실패: ${rpcErr.message}`);
          
          // 2단계: 앱 설정 내 테이블명 치환
          // 단순 문자열 치환은 위험할 수 있으므로, 키워드 형태로 치환하거나 정규식 사용
          // 여기서는 테이블명이 유니크하다고 가정하고 전역 치환 (따옴표 포함 등 안전장치)
          const oldNameRegex = new RegExp(`"${oldName}"`, 'g');
          configStr = configStr.replace(oldNameRegex, `"${mapping.newName}"`);
        }
      }

      const newConfig = JSON.parse(configStr);
      
      // 3단계: 새 앱 레코드 삽입
      const { data: newApp, error: insErr } = await supabase.from('apps').insert([{
        name: `${cloningApp.name} (복제본)`,
        app_config: newConfig,
        draft_config: newConfig
      }]).select('*').single();

      if (insErr) throw insErr;

      alert('앱 복제가 완료되었습니다!');
      setIsCloneModalOpen(false);
      openAppListModal(); // 목록 새로고침
      
      // 복제된 앱 로드
      if (newApp) loadAppToBuilder(newApp.id);

    } catch (error: any) {
      alert(`복제 실패: ${error.message}`);
    } finally {
      setIsCloning(false);
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
      {/* --- [기존 앱 열기 모달] --- */}
      {isAppListModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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
                  <div key={app.id} className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all text-left group">
                    <button onClick={() => loadAppToBuilder(app.id)} className="flex-1">
                      <h3 className="font-black text-slate-800 text-base group-hover:text-indigo-700">{app.name || '이름 없는 앱'}</h3>
                      <p className="text-xs text-slate-400 font-bold mt-1">ID: {app.id} • {new Date(app.created_at).toLocaleDateString()}</p>
                    </button>
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={(e) => { e.stopPropagation(); startCloneApp(app.id); }}
                        className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all flex items-center gap-1.5 font-bold text-xs"
                      >
                        <Copy size={16} /> 복사
                      </button>
                      <button onClick={() => loadAppToBuilder(app.id)} className="p-2.5 text-indigo-500 hover:bg-indigo-50 rounded-xl transition-all font-black text-sm">
                        열기 &rarr;
                      </button>
                    </div>
                  </div>
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

      {/* --- [앱 복제 상세 설정 모달] --- */}
      {isCloneModalOpen && (
        <div className="fixed inset-0 z-[120] bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300">
            <div className="px-10 py-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200"><Copy size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tight">앱 및 테이블 복제하기</h2>
                  <p className="text-sm text-slate-400 font-bold mt-1">"{cloningApp?.name}" 앱을 복사합니다.</p>
                </div>
              </div>
              <button 
                disabled={isCloning}
                onClick={() => setIsCloneModalOpen(false)} 
                className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all disabled:opacity-30"
              >
                <X size={24} />
              </button>
            </div>
            
            <div className="p-10 max-h-[60vh] overflow-y-auto space-y-8">
              <div className="bg-indigo-50/50 p-6 rounded-[2rem] border-2 border-indigo-100 flex items-start gap-4 animate-in slide-in-from-top-2">
                <div className="w-10 h-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-black shrink-0 shadow-md">?</div>
                <div>
                  <p className="text-[15px] font-black text-slate-800 leading-snug">이 앱에서 사용하는 테이블들을 어떻게 처리할까요?</p>
                  <p className="text-xs text-slate-500 font-bold mt-2">새 테이블로 복제하면 기존 데이터와 독립적인 구조를 가지게 됩니다.</p>
                </div>
              </div>

              <div className="space-y-4">
                {Object.keys(tableMappings).length === 0 ? (
                  <div className="py-10 text-center text-slate-400 font-bold bg-slate-50 rounded-3xl border border-dashed italic">이 앱은 사용 중인 테이블이 없습니다.</div>
                ) : (
                  Object.entries(tableMappings).map(([oldName, mapping]) => (
                    <div key={oldName} className={`p-6 rounded-[2rem] border-2 transition-all duration-300 ${mapping.action === 'clone' ? 'border-indigo-500 bg-white shadow-xl' : 'border-slate-100 bg-slate-50/30'}`}>
                      <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-3">
                          <Database size={18} className={mapping.action === 'clone' ? 'text-indigo-600' : 'text-slate-400'} />
                          <span className="font-extrabold text-slate-700">{oldName}</span>
                        </div>
                        <div className="flex bg-slate-100 p-1 rounded-xl">
                          <button 
                            disabled={isCloning}
                            onClick={() => setTableMappings(prev => ({ ...prev, [oldName]: { ...prev[oldName], action: 'reuse' } }))}
                            className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${mapping.action === 'reuse' ? 'bg-white text-slate-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                          >
                            기존 테이블 유지
                          </button>
                          <button 
                            disabled={isCloning}
                            onClick={() => setTableMappings(prev => ({ ...prev, [oldName]: { ...prev[oldName], action: 'clone' } }))}
                            className={`px-4 py-1.5 text-[11px] font-black rounded-lg transition-all ${mapping.action === 'clone' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-indigo-600'}`}
                          >
                            새 테이블로 복제
                          </button>
                        </div>
                      </div>

                      {mapping.action === 'clone' && (
                        <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                          <label className="text-[10px] font-black text-indigo-500 pl-1 uppercase tracking-widest">새로운 테이블 이름</label>
                          <input 
                            disabled={isCloning}
                            value={mapping.newName}
                            onChange={(e) => setTableMappings(prev => ({ ...prev, [oldName]: { ...prev[oldName], newName: e.target.value } }))}
                            placeholder="복제될 테이블 이름을 입력하세요..."
                            className="w-full p-4 bg-white border-2 border-indigo-100 focus:border-indigo-600 outline-none rounded-2xl font-black text-sm text-slate-800 transition-all shadow-inner"
                          />
                          <p className="text-[10px] font-bold text-slate-400 px-1 italic">※ 데이터와 인덱스가 모두 포함되어 복제됩니다.</p>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="p-8 bg-white border-t border-slate-100 flex gap-4">
              <button 
                disabled={isCloning}
                onClick={() => setIsCloneModalOpen(false)} 
                className="flex-1 py-4 text-slate-400 font-extrabold rounded-2xl hover:bg-slate-100 transition-all disabled:opacity-50"
              >
                취소
              </button>
              <button 
                disabled={isCloning}
                onClick={handleCloneAppWithTables}
                className="flex-[2] py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {isCloning ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    잠시만 기다려주세요...
                  </>
                ) : (
                  <>복제 프로세스 시작</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ✅ [전문가 제안] withAuth HOC를 사용하여 관리자(adminOnly) 전용 페이지로 보호합니다.
export default withAuth(AppBuilder, { adminOnly: true });