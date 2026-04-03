"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppState, View, Action, SchemaData, LayoutRow, LayoutCell } from './types';
import ViewEditor from './view';
import ActionEditor from './action';
import { Plus } from 'lucide-react';

// Supabase 클라이언트 설정
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "", 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// --- 프리뷰 렌더러 ---
const RenderPreviewLayout = ({ rows, rowData, actions, onNavigate }: any) => {
  const isImageUrl = (url: any) => {
    if (typeof url !== 'string') return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || (url.startsWith('http') && url.includes('/storage/v1/object/public/'));
  };

  return (
    <div className="flex flex-col gap-0 w-full h-full">
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
                      {String(cellValue || '-')}
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
                        act.type === 'alert' ? alert(act.message) : onNavigate(act.targetViewId);
                      }}
                      className="w-full h-full bg-slate-900 text-white text-[10px] font-black py-3 hover:bg-indigo-600 transition-colors"
                    >
                      {act.name}
                    </button>
                  ) : null;
                })()}

                {/* 중첩 레이아웃 */}
                {cell.contentType === 'nested' && cell.nestedRows && (
                  <RenderPreviewLayout rows={cell.nestedRows} rowData={rowData} actions={actions} onNavigate={onNavigate} />
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

  useEffect(() => {
    const activeView = appState.views.find(v => v.id === currentPreviewViewId);
    if (activeView?.tableName && !previewData[activeView.tableName]) {
      supabase.from(activeView.tableName).select("*").limit(1000).then(({ data }) => {
        if (data) setPreviewData(prev => ({ ...prev, [activeView.tableName as string]: data }));
      });
    }
  }, [currentPreviewViewId, appState.views, previewData]);

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
            className="bg-transparent text-xl font-black outline-none w-full border-b-2 border-indigo-400 focus:border-white transition-all"
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
          <span className="text-xs font-black text-slate-300 uppercase tracking-widest">{activeItem.type} MODE</span>
          <span className="mx-4 text-slate-200">|</span>
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
          <div className="pt-16 pb-6 text-center border-b font-black text-slate-900 text-xl tracking-tight bg-white sticky top-0 z-10">{previewView?.name}</div>
          <div className="flex-1 overflow-y-auto bg-slate-50">
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
                        clickAction.type === 'alert' 
                          ? alert(clickAction.message || '') 
                          : setCurrentPreviewViewId(clickAction.targetViewId || '');
                      }
                    }}
                  >
                    <RenderPreviewLayout 
                      rows={previewView.layoutRows} 
                      rowData={row} 
                      actions={appState.actions} 
                      onNavigate={(id:string) => setCurrentPreviewViewId(id)}
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