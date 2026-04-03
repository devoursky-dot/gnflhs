"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { AppState, View, Action, SchemaData, LayoutRow, LayoutCell } from './types';
import ViewEditor from './view';
import ActionEditor from './action';
import { Layout, Zap, Plus, ArrowUp, ArrowDown, Smartphone, Database } from 'lucide-react';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL || "", process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

/**
 * [업그레이드] 정밀 레이아웃 렌더러
 * - gap 설정을 통해 셀 분할을 시각적으로 명확히 함
 * - isImage 속성이 활성화된 경우 이미지를 자동 크기로 렌더링
 */
const RenderPreviewLayout = ({ rows, rowData, actions, onNavigate }: any) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {rows.map((row: LayoutRow) => (
        <div key={row.id} className="flex gap-1.5 w-full items-stretch">
          {row.cells.map((cell: LayoutCell) => (
            <div key={cell.id} style={{ flex: cell.flex }} className="flex flex-col min-w-0">
              {/* 이미지 필드 처리 */}
              {cell.contentType === 'field' && cell.isImage && (
                <div className="w-full rounded-lg overflow-hidden border border-slate-100 bg-slate-50">
                  {rowData[cell.contentValue || ''] ? (
                    <img 
                      src={rowData[cell.contentValue || '']} 
                      alt="img" 
                      className="w-full h-auto object-cover max-h-[200px]"
                    />
                  ) : (
                    <div className="h-20 flex items-center justify-center text-slate-300"><Database size={20}/></div>
                  )}
                </div>
              )}
              
              {/* 일반 텍스트 처리 */}
              {cell.contentType === 'field' && !cell.isImage && (
                <span className="text-[13px] font-bold text-slate-700 break-words leading-tight p-0.5">
                  {rowData[cell.contentValue || ''] || '-'}
                </span>
              )}
              
              {/* 액션 버튼 처리 */}
              {cell.contentType === 'action' && (() => {
                const act = actions.find((a: any) => a.id === cell.contentValue);
                return act ? (
                  <button 
                    onClick={() => act.type === 'alert' ? alert(act.message) : onNavigate(act.targetViewId)}
                    className="w-full bg-slate-900 text-white text-[10px] font-black py-1.5 rounded-lg shadow-sm"
                  >
                    {act.name}
                  </button>
                ) : null;
              })()}

              {/* 중첩 레이아웃 처리 (재귀) */}
              {cell.contentType === 'nested' && cell.nestedRows && (
                <RenderPreviewLayout rows={cell.nestedRows} rowData={rowData} actions={actions} onNavigate={onNavigate} />
              )}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export default function AppBuilder() {
  const [appState, setAppState] = useState<AppState>({
    id: null,
    name: '경남외고 인프라 앱',
    views: [{ id: 'v1', name: '메인 홈 (첫 화면)', tableName: null, layoutRows: [] }],
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
      supabase.from(activeView.tableName).select("*").limit(10).then(({ data }) => {
        if (data) setPreviewData(prev => ({ ...prev, [activeView.tableName as string]: data }));
      });
    }
  }, [currentPreviewViewId, appState.views]);

  const activeView = appState.views.find(v => v.id === activeItem.id);
  const activeAction = appState.actions.find(a => a.id === activeItem.id);
  const previewView = appState.views.find(v => v.id === currentPreviewViewId) || appState.views[0];

  return (
    <div className="flex h-screen w-full bg-slate-50 font-sans overflow-hidden">
      {/* 사이드바 */}
      <aside className="w-[280px] border-r bg-white flex flex-col shrink-0 shadow-lg z-50">
        <div className="p-6 border-b bg-indigo-600">
          <input 
            type="text" value={appState.name}
            onChange={(e) => setAppState({ ...appState, name: e.target.value })}
            className="w-full text-lg font-black text-white bg-transparent border-b border-indigo-400 outline-none focus:border-white"
          />
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-black text-slate-400 uppercase tracking-widest">
              <span>Views</span>
              <button onClick={() => {
                const id = `v_${Date.now()}`;
                setAppState({...appState, views: [...appState.views, {id, name:'새 뷰', tableName:null, layoutRows:[]}]});
                setActiveItem({type:'view', id});
              }}><Plus size={14}/></button>
            </div>
            {appState.views.map(v => (
              <button 
                key={v.id} onClick={() => setActiveItem({type:'view', id:v.id})}
                className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeItem.id === v.id ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      </aside>

      {/* 편집 영역 */}
      <main className="flex-1 flex flex-col bg-slate-50">
        <header className="h-14 border-b bg-white flex items-center px-8 shadow-sm">
          <span className="text-sm font-black text-slate-800">
            {activeItem.type === 'view' ? 'DESIGN' : 'ACTION'} / {activeItem.type === 'view' ? activeView?.name : activeAction?.name}
          </span>
        </header>
        <div className="flex-1 overflow-hidden">
          {activeItem.type === 'view' && activeView && (
            <ViewEditor 
              view={activeView} schemaData={schemaData} actions={appState.actions}
              onUpdate={(upd) => setAppState({...appState, views: appState.views.map(v => v.id === upd.id ? upd : v)})} 
            />
          )}
          {activeItem.type === 'action' && activeAction && (
            <ActionEditor 
              action={activeAction} views={appState.views}
              onUpdate={(upd) => setAppState({...appState, actions: appState.actions.map(a => a.id === upd.id ? upd : a)})}
              onDelete={(id) => {
                setAppState({...appState, actions: appState.actions.filter(a => a.id !== id)});
                setActiveItem({type:'view', id:'v1'});
              }}
            />
          )}
        </div>
      </main>

      {/* 프리뷰 */}
      <aside className="w-[400px] bg-slate-900 flex flex-col items-center py-8 shrink-0 shadow-2xl">
        <div className="w-[320px] h-[680px] bg-white rounded-[3rem] border-[8px] border-slate-800 shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-white pt-12 pb-4 px-6 border-b text-center shrink-0">
            <h3 className="font-black text-slate-900">{previewView?.name}</h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
            {previewData[previewView?.tableName || '']?.map((row, idx) => (
              <div key={idx} className="bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
                <RenderPreviewLayout 
                  rows={previewView.layoutRows} rowData={row} actions={appState.actions}
                  onNavigate={(id:string) => setCurrentPreviewViewId(id)}
                />
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}