"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as LucideIcons from 'lucide-react';
import { 
  Trash2, LayoutTemplate, Database, 
  Loader2, CheckCircle2, Table as TableIcon 
} from 'lucide-react';

// ==========================================
// 🔧 Supabase 설정 (기존 AdminDashboardPage 환경변수 방식 적용)
// ==========================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const ICON_GALLERY = ['User', 'Calendar', 'FileText', 'MapPin', 'Bell', 'MessageSquare', 'Check', 'AlertTriangle', 'Home', 'Settings', 'Star', 'Heart', 'Image'];

const DynamicIcon = ({ name, size = 18, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent size={size} className={className} />;
};

export default function NoCodeStudio() {
  // --- [상태 관리 1] Supabase 테이블 및 스키마 데이터 ---
  const [schemaData, setSchemaData] = useState<Record<string, string[]>>({});
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);

  // --- [상태 관리 2] 에디터 데이터 ---
  const [columns, setColumns] = useState<string[]>([]);
  const [rows, setRows] = useState<any[]>([]);

  // --- [상태 관리 3] 앱 디자인 설정 ---
  const [appConfig, setAppConfig] = useState({
    header: { title: '모바일 앱 프리뷰', color: 'bg-indigo-600', textColor: 'text-white' },
    cardLayout: [] as { id: string, field: string, icon: string }[],
    bottomNav: [{ id: 'n1', label: '홈', icon: 'Home' }],
    actions: { inline: { label: '상세보기', icon: 'Star', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' } }
  });

  const [selectedIconTarget, setSelectedIconTarget] = useState<{type: string, id: string} | null>(null);

  // ==========================================
  // 🚀 기능 1: Supabase 전체 테이블 및 스키마 불러오기 (기존 코드 적용)
  // ==========================================
  useEffect(() => {
    async function fetchSchema() {
      try {
        const { data, error } = await supabase.rpc("get_schema_info");
        if (error) throw error;

        if (data) {
          // 테이블별로 컬럼명만 배열로 그룹화
          const grouped = data.reduce((acc: any, row: any) => {
            if (!acc[row.table_name]) acc[row.table_name] = [];
            acc[row.table_name].push(row.column_name);
            return acc;
          }, {});
          
          setSchemaData(grouped);
        }
      } catch (err: any) {
        console.error("스키마 로딩 실패:", err.message);
      } finally {
        setIsLoadingSchema(false);
      }
    }
    fetchSchema();
  }, []);

  // ==========================================
  // 🚀 기능 2: 선택한 테이블의 데이터 불러오기
  // ==========================================
  const handleSelectTable = async (tableName: string) => {
    setSelectedTable(tableName);
    setIsLoadingData(true);
    
    try {
      // 1. 선택한 테이블의 컬럼 목록 설정
      const tableColumns = schemaData[tableName] || [];
      setColumns(tableColumns);

      // 2. 실제 데이터 50개만 프리뷰용으로 호출
      const { data, error } = await supabase.from(tableName).select("*").limit(50);
      if (error) throw error;
      
      setRows(data || []);
      
      // 3. 앱 헤더 이름을 테이블명으로 변경 및 카드 레이아웃 자동 초기화 (최대 3개)
      setAppConfig(prev => ({
        ...prev,
        header: { ...prev.header, title: tableName.toUpperCase() },
        cardLayout: tableColumns.slice(0, 3).map((col, idx) => ({
          id: `c_${Date.now()}_${idx}`, 
          field: col, 
          icon: col.includes('사진') || col.includes('이미지') || col.includes('image') || col.includes('photo') ? 'Image' : (idx === 0 ? 'User' : 'FileText')
        }))
      }));

    } catch (err: any) {
      alert(`데이터를 불러오는데 실패했습니다: ${err.message}`);
    } finally {
      setIsLoadingData(false);
    }
  };

  // --- UI 상호작용 함수 ---
  const addCardField = (field: string) => {
    if (appConfig.cardLayout.find(c => c.field === field)) return;
    setAppConfig({ ...appConfig, cardLayout: [...appConfig.cardLayout, { id: `c_${Date.now()}`, field, icon: 'FileText' }] });
  };
  const removeCardField = (id: string) => setAppConfig({ ...appConfig, cardLayout: appConfig.cardLayout.filter(c => c.id !== id) });
  const updateIcon = (iconName: string) => {
    if (!selectedIconTarget) return;
    setAppConfig({ ...appConfig, cardLayout: appConfig.cardLayout.map(c => c.id === selectedIconTarget.id ? { ...c, icon: iconName } : c) });
    setSelectedIconTarget(null);
  };

  return (
    <div className="flex h-screen w-full bg-[#F8FAFC] overflow-hidden font-sans text-slate-800 antialiased">
      
      {/* ==================== [좌측] 데이터 소스 패널 ==================== */}
      <aside className="w-[360px] bg-white border-r border-slate-200 flex flex-col shadow-[4px_0_24px_rgba(0,0,0,0.02)] z-10 relative shrink-0">
        <div className="p-6 border-b border-slate-100 bg-white">
          <h2 className="text-base font-extrabold flex items-center gap-2 text-slate-900 tracking-tight">
            <Database size={20} className="text-indigo-600" /> Supabase 테이블 연결
          </h2>
          <p className="text-xs text-slate-500 mt-2 font-medium">데이터베이스에서 디자인할 테이블을 선택하세요.</p>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* 테이블 목록 영역 */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">연결된 테이블</h3>
            {isLoadingSchema ? (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-500 p-4 bg-slate-50 rounded-xl">
                <Loader2 size={16} className="animate-spin text-indigo-500" /> 스키마 불러오는 중...
              </div>
            ) : Object.keys(schemaData).length === 0 ? (
              <div className="text-sm text-rose-500 p-4 bg-rose-50 rounded-xl font-medium">
                테이블을 찾을 수 없습니다. DB 연결 상태를 확인하세요.
              </div>
            ) : (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-left-2 duration-300">
                {Object.keys(schemaData).map(tableName => (
                  <button 
                    key={tableName} 
                    onClick={() => handleSelectTable(tableName)}
                    className={`w-full text-left px-4 py-3 rounded-xl text-sm font-bold flex items-center justify-between transition-all ${
                      selectedTable === tableName 
                        ? 'bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200 shadow-sm' 
                        : 'bg-white border border-slate-100 text-slate-600 hover:bg-slate-50 hover:border-slate-200'
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <TableIcon size={16} className={selectedTable === tableName ? 'text-indigo-600' : 'text-slate-400'} />
                      {tableName}
                    </span>
                    {isLoadingData && selectedTable === tableName && <Loader2 size={14} className="animate-spin" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {selectedTable && <div className="h-px w-full bg-slate-200"></div>}

          {/* 컬럼 리스트 영역 */}
          {selectedTable && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">사용 가능한 컬럼</h3>
                <span className="text-[10px] font-bold bg-slate-100 text-slate-500 px-2 py-1 rounded-full">{columns.length}개</span>
              </div>
              <div className="space-y-2.5">
                {columns.map(col => {
                  const isUsed = appConfig.cardLayout.some(c => c.field === col);
                  return (
                    <div key={col} className={`flex items-center justify-between p-3 border rounded-xl transition-all ${isUsed ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-50 border-slate-200 border-dashed opacity-80'}`}>
                      <span className={`text-sm font-semibold flex items-center gap-2 ${isUsed ? 'text-slate-800' : 'text-slate-500'}`}>
                        {isUsed && <CheckCircle2 size={14} className="text-emerald-500" />} {col}
                      </span>
                      {!isUsed && (
                        <button onClick={() => addCardField(col)} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors">
                          추가
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* ==================== [중앙] 디자인 빌더 탭 ==================== */}
      <main className="flex-1 flex flex-col bg-[#F8FAFC] border-r border-slate-200 z-10 relative">
        <header className="flex bg-white border-b border-slate-200 px-6 pt-5 gap-6">
          <button className="flex items-center gap-2 pb-4 text-sm font-extrabold border-b-2 border-indigo-600 text-indigo-600 transition-all tracking-tight">
            <LayoutTemplate size={18} /> 카드 디자인 구성
          </button>
        </header>

        <div className="flex-1 overflow-y-auto p-8 lg:p-12">
          {selectedTable ? (
            <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 max-w-2xl mx-auto">
              <h2 className="text-lg font-extrabold mb-6 text-slate-900 tracking-tight">카드 데이터 맵핑</h2>
              <p className="text-sm text-slate-500 mb-6 font-medium">프리뷰 화면에 보여질 데이터의 아이콘과 순서를 설정하세요.</p>
              
              <div className="space-y-3">
                {appConfig.cardLayout.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3.5 bg-white border hover:border-indigo-300 border-slate-200 rounded-2xl transition-all group shadow-sm">
                    <button onClick={() => setSelectedIconTarget({type: 'card', id: item.id})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all">
                      <DynamicIcon name={item.icon} size={20} />
                    </button>
                    <div className="flex-1 font-bold text-slate-700">{item.field}</div>
                    <button onClick={() => removeCardField(item.id)} className="text-slate-300 hover:text-rose-500 p-2 transition-colors">
                      <Trash2 size={18}/>
                    </button>
                  </div>
                ))}
                
                {appConfig.cardLayout.length === 0 && (
                   <div className="text-center p-6 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-medium">
                     좌측 패널에서 컬럼을 추가해주세요.
                   </div>
                )}
              </div>

              {selectedIconTarget?.type === 'card' && (
                <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <p className="text-sm font-bold text-slate-700 mb-4">아이콘 선택:</p>
                  <div className="grid grid-cols-6 lg:grid-cols-8 gap-3">
                    {ICON_GALLERY.map(icon => (
                      <button key={icon} onClick={() => updateIcon(icon)} className="p-3 bg-white rounded-xl border border-slate-200 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 flex justify-center transition-all shadow-sm">
                        <DynamicIcon name={icon} size={20} />
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Database size={48} className="mb-4 opacity-20" />
              <p className="text-base font-bold text-slate-500">좌측 패널에서 디자인할 테이블을 선택해주세요</p>
            </div>
          )}
        </div>
      </main>

      {/* ==================== [우측] 실시간 기기 프리뷰 ==================== */}
      <aside className="w-[480px] bg-slate-100 flex flex-col items-center py-10 overflow-y-auto relative shadow-inner shrink-0">
        
        {/* 디바이스 목업 디자인 */}
        <div className="bg-[#1e293b] p-3 rounded-[3.5rem] shadow-2xl border-4 border-slate-300 w-[340px] h-[700px] relative">
          <div className="bg-slate-50 w-full h-full rounded-[2.5rem] overflow-hidden flex flex-col relative">
            
            {/* 앱 헤더 */}
            <header className={`${appConfig.header.color} ${appConfig.header.textColor} p-6 shadow-sm flex items-center justify-center shrink-0`}>
              <h1 className="font-extrabold text-lg tracking-tight">{appConfig.header.title}</h1>
            </header>

            {/* 데이터 리스트 렌더링 영역 */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 scrollbar-hide">
              {rows.map((row) => (
                <div key={row.id || Math.random()} className="bg-white p-5 rounded-3xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] border border-slate-100">
                  <div className="space-y-4">
                    {appConfig.cardLayout.map(field => {
                      const isImageField = field.field.includes('사진') || field.field.includes('이미지') || field.field.includes('photo') || (typeof row[field.field] === 'string' && row[field.field].startsWith('http'));
                      
                      return (
                        <div key={field.id} className="flex items-start gap-3.5">
                          <div className="text-slate-400 mt-0.5"><DynamicIcon name={field.icon} size={18}/></div>
                          <div className="flex flex-col flex-1 w-full min-w-0">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{field.field}</span>
                            
                            {/* 🌟 사진/이미지 자동 렌더링 */}
                            {isImageField && row[field.field] ? (
                              <div className="w-full h-40 bg-slate-100 rounded-xl overflow-hidden mt-1 border border-slate-100">
                                <img src={row[field.field]} alt="첨부 이미지" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                              </div>
                            ) : (
                              <span className="text-sm font-bold text-slate-800 break-words whitespace-pre-wrap">{row[field.field] !== null ? String(row[field.field]) : '-'}</span>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* 액션 버튼 */}
                  {appConfig.cardLayout.length > 0 && (
                    <button className={`mt-5 w-full py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors ${appConfig.actions.inline.color}`}>
                      <DynamicIcon name={appConfig.actions.inline.icon} size={16}/> {appConfig.actions.inline.label}
                    </button>
                  )}
                </div>
              ))}
              
              {(!rows || rows.length === 0) && (
                <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                  <Database size={32} className="mb-2 opacity-50" />
                  <p className="text-sm font-medium">표시할 데이터가 없습니다.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </aside>

    </div>
  );
}