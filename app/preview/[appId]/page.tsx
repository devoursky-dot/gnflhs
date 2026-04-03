// 파일 경로: C:/react-projects/gnflhs/app/preview/[appId]/page.tsx

"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

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
                  const act = actions?.find((a: any) => a.id === cell.contentValue);
                  return act ? (
                    <button 
                      onClick={(e: React.MouseEvent) => { e.stopPropagation(); onExecuteAction(act, rowData); }}
                      className="w-full h-full bg-slate-900 text-white text-[10px] font-black py-3 hover:bg-indigo-600 transition-colors"
                    >
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

  useEffect(() => {
    if (!appId) return;

    async function fetchAppConfig() {
      try {
        const { data, error } = await supabase
          .from('apps')
          .select('*')
          .eq('id', appId)
          .single();

        if (error) throw error;

        const urlParams = new URLSearchParams(window.location.search);
        const mode = urlParams.get('mode');
        
        let activeConfig = data.app_config; 
        
        // --- [수정] UI 배너 대신 브라우저 탭 제목으로 모드 구분 ---
        if (mode === 'draft') {
          activeConfig = data.draft_config || data.app_config; 
          document.title = `[Draft] ${data.name || '미리보기'}`;
        } else {
          document.title = data.name || '앱 실행';
        }

        const normalizedData = { ...data, app_config: activeConfig || { views: [], actions: [] } };
        setAppData(normalizedData);
        
        if (normalizedData.app_config?.views?.length > 0) {
          const initialViewId = urlParams.get('viewId');
          const targetView = initialViewId ? normalizedData.app_config.views.find((v: any) => v.id === initialViewId) : null;
          setCurrentViewId(targetView ? targetView.id : normalizedData.app_config.views[0].id);
        }
      } catch (error) {
        console.error("Failed to load app config:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchAppConfig();
  }, [appId]);

  const fetchTableData = async (tableName: string) => {
    try {
      const { data, error } = await supabase.from(tableName).select("*").limit(1000);
      if (error) throw error;
      if (data) {
        setTableData(prev => ({ ...prev, [tableName]: data }));
      }
    } catch (error) {
      console.error("Failed to fetch table data:", error);
    }
  };

  const currentView = appData?.app_config?.views?.find((v: any) => v.id === currentViewId);
  const actions = appData?.app_config?.actions || [];

  useEffect(() => {
    if (currentView?.tableName && !tableData[currentView.tableName]) {
      fetchTableData(currentView.tableName);
    }
  }, [currentViewId, currentView?.tableName, tableData]);

  const handleAction = async (action: any, rowData: any) => {
    if (action.type === 'alert') {
      alert(action.message || '알림');
    } else if (action.type === 'navigate' && action.targetViewId) {
      setCurrentViewId(action.targetViewId);
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
        
        if (currentView?.tableName === action.insertTableName) {
          await fetchTableData(action.insertTableName);
        }
        alert(`성공: [${action.insertTableName}] 테이블에 데이터가 추가되었습니다.`);
      } catch (error: any) {
        alert(`데이터 추가 실패: ${error.message}`);
      }
    }
  };

  if (loading) {
    return <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-slate-500 font-bold">앱을 불러오는 중입니다...</div>;
  }

  if (!appData || !appData.app_config?.views?.length) {
    return <div className="flex h-screen w-full items-center justify-center bg-slate-50 text-rose-500 font-bold">표시할 화면이 없거나 설정이 비어있습니다.</div>;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans">
      <div className="w-full max-w-md bg-white shadow-2xl flex flex-col relative">
        
        {/* 상단 네비게이션 헤더 (배너 제거 후 top-0 고정) */}
        <div className="pt-8 pb-4 px-6 text-center border-b bg-white sticky top-0 z-10 flex items-center justify-center shadow-sm relative">
          {currentViewId !== appData.app_config.views[0]?.id && (
            <button 
              onClick={() => setCurrentViewId(appData.app_config.views[0].id)}
              className="absolute left-4 bottom-3.5 p-2 text-slate-400 hover:text-indigo-600 rounded-full active:bg-slate-100"
            >
              ◀ 홈
            </button>
          )}
          
          <div className="font-black text-slate-900 text-xl tracking-tight truncate px-8">
            {currentView?.name || appData.name}
          </div>
          
          {currentView?.tableName && (
            <button
              onClick={() => fetchTableData(currentView.tableName)}
              className="absolute right-4 bottom-3.5 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all active:scale-95"
              title="데이터 동기화"
            >
              🔄
            </button>
          )}
        </div>

        {/* 데이터 리스트 영역 */}
        <div className="flex-1 overflow-y-auto bg-slate-50">
          <div className={`grid gap-0 ${
            currentView?.columnCount === 2 ? 'grid-cols-2' : 
            currentView?.columnCount === 3 ? 'grid-cols-3' : 
            currentView?.columnCount === 4 ? 'grid-cols-4' : 'grid-cols-1'
          }`}>
            {tableData[currentView?.tableName || '']?.map((row, idx) => {
              const clickAction = actions.find((a: any) => a.id === currentView?.onClickActionId);

              return (
                <div 
                  key={idx} 
                  className={`bg-white border-b border-r border-slate-100 overflow-hidden transition-all ${
                    clickAction ? 'cursor-pointer hover:bg-indigo-50/50 active:scale-[0.98]' : ''
                  }`} 
                  style={{ minHeight: `${currentView?.cardHeight || 120}px` }}
                  onClick={() => {
                    if (clickAction) {
                      handleAction(clickAction, row); 
                    }
                  }}
                >
                  <RenderPreviewLayout 
                    rows={currentView?.layoutRows || []} 
                    rowData={row} 
                    actions={actions} 
                    onExecuteAction={handleAction} 
                  />
                </div>
              );
            })}
          </div>
          
          {(!tableData[currentView?.tableName || ''] || tableData[currentView?.tableName || ''].length === 0) && currentView?.tableName && (
            <div className="p-10 text-center text-slate-400 font-bold text-sm">
              데이터가 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}