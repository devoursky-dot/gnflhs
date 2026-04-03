"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppState, View, Action, SchemaData, LayoutRow, LayoutCell } from './types';
import ViewEditor from './view';
import ActionEditor from './action';
import { Plus, RefreshCw } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "", 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// --- 프리뷰 렌더러 ---
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
                
                {/* 이미지 렌더링 */}
                {cell.contentType === 'field' && shouldShowImage && (
                  <div className="w-full h-full overflow-hidden bg-slate-50">
                    <img 
                      src={String(cellValue)} 
                      alt="img" 
                      className="w-full h-full object-cover" 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                )}
                
                {/* 텍스트 출력 */}
                {cell.contentType === 'field' && !shouldShowImage && (
                  <div className="p-2 w-full h-full flex items-center">
                    <span className="text-[14px] font-black text-slate-900 break-words leading-tight">
                      {cellValue !== null && cellValue !== undefined && cellValue !== '' ? String(cellValue) : '-'}
                    </span>
                  </div>
                )}

                {/* 개별 액션 버튼 */}
                {cell.contentType === 'action' && (() => {
                  const act = actions.find((a: Action) => a.id === cell.contentValue);
                  return act ? (
                    <button 
                      onClick={(e: React.MouseEvent) => {
                        e.stopPropagation(); 
                        onExecuteAction(act, rowData); 
                      }}
                      className="w-full h-full bg-slate-900 text-white text-[10px] font-black py-3 hover:bg-indigo-600 transition-colors"
                    >
                      {act.name}
                    </button>
                  ) : null;
                })()}

                {/* 중첩 레이아웃 */}
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
    name: '경남외고 학사 시스템',
    views: [{ 
      id: 'v1', 
      name: '메인 홈 (첫 화면)', 
      tableName: null, 
      cardHeight: 120, 
      columnCount: 1, 
      layoutRows: [], 
      onClickActionId: null 
    }],
    actions: []
  });
  const [schemaData, setSchemaData] = useState<SchemaData>({});
  const [activeItem, setActiveItem] = useState<{ type: 'view' | 'action', id: string }>({ type: 'view', id: 'v1' });
  const [previewData, setPreviewData] = useState<Record<string, any[]>>({});
  const [currentPreviewViewId, setCurrentPreviewViewId] = useState<string>('v1');

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
          
          if (userInput === null) {
            alert('입력이 취소되어 작업이 중단되었습니다.');
            return; 
          }
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
        console.error("Insert Error: ", error);
        alert(`데이터 추가 실패: ${error.message}`);
      }
    }
  };

  const activeView = appState.views.find(v => v.id === activeItem.id);
  const activeAction = appState.actions.find(a => a.id === activeItem.id);
  const previewView = appState.views.find(v => v.id === currentPreviewViewId) || appState.views[0];

  return (
    <div className="flex h-screen w-full bg-slate-100 font-sans overflow-hidden">
      <aside className="w-[320px] border-r bg-white flex flex-col shrink-0 shadow-2xl z-50">
        <div className="p-8 bg-indigo-700 text-white border-b border-indigo-800 shrink-0">
          <input 
            type="text" 
            value={appState.name} 
            onChange={(e) => setAppState({...appState, name: e.target.value})}
            className="bg-transparent text-white text-xl font-black outline-none w-full border-b-2 border-indigo-400 focus:border-white transition-all placeholder:text-indigo-300"
          />
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
              {appState.views.map(v => (
                <button 
                  key={v.id} 
                  onClick={() => setActiveItem({type:'view', id:v.id})}
                  className={`w-full text-left px-5 py-3 rounded-2xl text-sm font-black transition-all ${activeItem.id===v.id ? 'bg-indigo-600 text-white shadow-xl scale-105' : 'hover:bg-slate-100 text-slate-600'}`}
                >
                  {v.name}
                </button>
              ))}
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
              {appState.actions.map(a => (
                <button 
                  key={a.id} 
                  onClick={() => setActiveItem({type:'action', id:a.id})}
                  className={`w-full text-left px-5 py-3 border-l-8 rounded-r-2xl text-sm font-black transition-all ${activeItem.id===a.id ? 'bg-rose-50 border-rose-500 text-rose-800 shadow-sm' : 'border-transparent hover:bg-slate-100 text-slate-600'}`}
                >
                  ⚡ {a.name}
                </button>
              ))}
            </div>
          </div>
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
              onDelete={(id) => { 
                setAppState({...appState, actions: appState.actions.filter(a => a.id !== id)}); 
                setActiveItem({type:'view', id:'v1'}); 
              }}
            />
          )}
        </div>
      </main>

      <aside className="w-[450px] bg-slate-900 flex flex-col items-center py-10 shrink-0 shadow-2xl z-30">
        <div className="w-[340px] h-[720px] bg-white rounded-[4rem] border-[10px] border-slate-800 shadow-2xl overflow-hidden flex flex-col relative">
          
          {/* [수정] 모바일 친화적 헤더 레이아웃: 아이콘 버튼을 우측에 앱 네비게이션바처럼 배치 */}
          <div className="pt-14 pb-4 px-12 text-center border-b bg-white sticky top-0 z-10 flex items-center justify-center shadow-sm relative">
            <div className="font-black text-slate-900 text-xl tracking-tight truncate">
              {previewView?.name}
            </div>
            {previewView?.tableName && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  fetchTableData(previewView.tableName!);
                }}
                className="absolute right-4 bottom-3.5 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:scale-95"
                title="데이터 동기화"
              >
                <RefreshCw size={18} />
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto bg-slate-50 text-slate-900">
            <div className={`grid gap-0 ${
              previewView.columnCount === 2 ? 'grid-cols-2' : 
              previewView.columnCount === 3 ? 'grid-cols-3' : 
              previewView.columnCount === 4 ? 'grid-cols-4' : 'grid-cols-1'
            }`}>
              {previewData[previewView?.tableName || '']?.map((row, idx) => {
                const clickAction = appState.actions.find(a => a.id === previewView.onClickActionId);

                return (
                  <div 
                    key={idx} 
                    className={`bg-white border-b border-r border-slate-100 overflow-hidden transition-all ${
                      clickAction ? 'cursor-pointer hover:bg-indigo-50/50 active:scale-[0.98]' : ''
                    }`} 
                    style={{ minHeight: `${previewView.cardHeight}px` }}
                    onClick={() => {
                      if (clickAction) {
                        handleAction(clickAction, row); 
                      }
                    }}
                  >
                    <RenderPreviewLayout 
                      rows={previewView.layoutRows} 
                      rowData={row} 
                      actions={appState.actions} 
                      onExecuteAction={handleAction} 
                    />
                  </div>
                );
              })}
            </div>
          </div>
          {currentPreviewViewId !== appState.views[0]?.id && (
            <div className="p-6 bg-white border-t border-slate-100">
              <button 
                onClick={() => setCurrentPreviewViewId(appState.views[0].id)} 
                className="w-full py-4 bg-slate-900 text-white rounded-2xl text-sm font-black shadow-2xl hover:bg-indigo-700 transition-all"
              >
                🏠 첫 화면으로 이동
              </button>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}