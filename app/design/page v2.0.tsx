"use client";

import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '@supabase/supabase-js';
import * as LucideIcons from 'lucide-react';
import { 
  Trash2, LayoutTemplate, Database, 
  Loader2, CheckCircle2, Table as TableIcon,
  Save, Rocket, Smartphone, Copy, Plus, FolderKanban, Check, X
} from 'lucide-react';

// ==========================================
// 🔧 Supabase 설정
// ==========================================
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const ICON_GALLERY = ['User', 'Calendar', 'FileText', 'MapPin', 'Bell', 'MessageSquare', 'Check', 'AlertTriangle', 'Home', 'Settings', 'Star', 'Heart', 'Image'];

// 안전한 아이콘 렌더러
const DynamicIcon = ({ name, size = 18, className = "" }: { name: string, size?: number, className?: string }) => {
  const formattedName = name.charAt(0).toUpperCase() + name.slice(1);
  const IconComponent = (LucideIcons as any)[formattedName] || LucideIcons.HelpCircle;
  return <IconComponent size={size} className={className} />;
};

// 이미지 URL 판별 헬퍼
const isImageUrl = (value: any) => {
  if (typeof value !== 'string') return false;
  return value.match(/\.(jpeg|jpg|gif|png|webp|svg)(\?.*)?$/i) != null || value.startsWith('http');
};

export default function NoCodeStudio() {
  // --- [상태 관리 1] 프로젝트 및 앱 관리 ---
  const [savedApps, setSavedApps] = useState<any[]>([]);
  const [currentAppId, setCurrentAppId] = useState<string>(`app_${Date.now()}`);
  const [appName, setAppName] = useState('나만의 첫 번째 앱');
  
  // --- [상태 관리 2] Supabase 데이터 ---
  const [schemaData, setSchemaData] = useState<Record<string, string[]>>({});
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
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

  // --- [상태 관리 4] 배포 모달 ---
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [deployUrl, setDeployUrl] = useState('');
  const [isCopied, setIsCopied] = useState(false);

  // ==========================================
  // 🚀 초기 로드: 로컬스토리지 앱 로드 & 스키마 조회
  // ==========================================
  useEffect(() => {
    // 1. 저장된 앱 불러오기
    const stored = localStorage.getItem('noCodeSavedApps');
    if (stored) {
      setSavedApps(JSON.parse(stored));
    }

    // 2. Supabase 스키마 불러오기
    async function fetchSchema() {
      try {
        const { data, error } = await supabase.rpc("get_schema_info");
        if (error) throw error;
        if (data) {
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
  // 🚀 기능: 테이블 선택 및 데이터 패칭
  // ==========================================
  const handleSelectTable = async (tableName: string) => {
    setSelectedTable(tableName);
    setIsLoadingData(true);
    
    try {
      const tableColumns = schemaData[tableName] || [];
      setColumns(tableColumns);

      const { data, error } = await supabase.from(tableName).select("*").limit(50);
      if (error) throw error;
      
      setRows(data || []);
      
      // 테이블 변경 시 기본 설정 세팅 (새로운 앱일 경우에만 덮어쓰기)
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

  // ==========================================
  // 🚀 기능: 프로젝트(앱) 관리
  // ==========================================
  const handleSaveApp = () => {
    const newApp = {
      id: currentAppId,
      name: appName,
      selectedTable,
      appConfig,
      updatedAt: new Date().toISOString()
    };
    
    const updatedApps = savedApps.filter(app => app.id !== currentAppId).concat(newApp);
    setSavedApps(updatedApps);
    localStorage.setItem('noCodeSavedApps', JSON.stringify(updatedApps));
    alert('앱 프로젝트가 성공적으로 저장되었습니다.');
  };

  const handleLoadApp = (app: any) => {
    setCurrentAppId(app.id);
    setAppName(app.name);
    setAppConfig(app.appConfig);
    if (app.selectedTable) {
      handleSelectTable(app.selectedTable);
    } else {
      setSelectedTable(null);
      setRows([]);
      setColumns([]);
    }
  };

  const handleCreateNewApp = () => {
    setCurrentAppId(`app_${Date.now()}`);
    setAppName('새로운 프로젝트');
    setSelectedTable(null);
    setRows([]);
    setColumns([]);
    setAppConfig({
      header: { title: '모바일 앱 프리뷰', color: 'bg-indigo-600', textColor: 'text-white' },
      cardLayout: [],
      bottomNav: [{ id: 'n1', label: '홈', icon: 'Home' }],
      actions: { inline: { label: '상세보기', icon: 'Star', color: 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100' } }
    });
  };

  const handleDeploy = () => {
    // 실제 환경에서는 백엔드에 배포 데이터를 전송하고 고유 ID를 받음
    // 여기서는 클라이언트 측 시뮬레이션
    handleSaveApp();
    const generatedUrl = `${window.location.origin}/preview/${currentAppId}`;
    setDeployUrl(generatedUrl);
    setIsDeployModalOpen(true);
    setIsCopied(false);
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(deployUrl);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
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
    <div className="flex flex-col h-screen w-full bg-[#F8FAFC] overflow-hidden font-sans text-slate-800 antialiased">
      
      {/* ==================== [상단] 워크스페이스 헤더 ==================== */}
      <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shrink-0 shadow-sm z-20">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 text-indigo-600 font-black text-xl tracking-tighter">
            <Smartphone size={24} /> NoCode<span className="text-slate-800">Studio</span>
          </div>
          
          <div className="h-6 w-px bg-slate-200" />
          
          {/* 프로젝트 리스트 드롭다운 시뮬레이션 (단순화) */}
          <div className="flex items-center gap-3">
            <select 
              className="text-sm font-bold bg-slate-50 border border-slate-200 text-slate-700 py-1.5 px-3 rounded-lg outline-none focus:border-indigo-500"
              value={currentAppId}
              onChange={(e) => {
                if (e.target.value === 'new') handleCreateNewApp();
                else {
                  const targetApp = savedApps.find(a => a.id === e.target.value);
                  if (targetApp) handleLoadApp(targetApp);
                }
              }}
            >
              <option value="new">✨ 새 프로젝트 만들기...</option>
              {savedApps.map(app => (
                <option key={app.id} value={app.id}>📁 {app.name}</option>
              ))}
            </select>
            
            {/* 앱 이름 수정 */}
            <input 
              type="text" 
              value={appName}
              onChange={(e) => setAppName(e.target.value)}
              className="text-sm font-semibold bg-transparent border-b border-dashed border-slate-300 px-1 py-1 w-48 focus:border-indigo-500 outline-none transition-colors"
              placeholder="앱 이름 입력"
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button onClick={handleSaveApp} className="flex items-center gap-2 text-sm font-bold text-slate-600 bg-white border border-slate-200 px-4 py-2 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-all shadow-sm">
            <Save size={16} /> 저장
          </button>
          <button onClick={handleDeploy} className="flex items-center gap-2 text-sm font-bold text-white bg-indigo-600 px-5 py-2 rounded-xl hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">
            <Rocket size={16} /> 배포하기
          </button>
        </div>
      </header>

      {/* ==================== [메인 컨텐츠 영역] 3단 레이아웃 ==================== */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* === [좌측] 데이터 소스 패널 === */}
        <aside className="w-[360px] bg-white border-r border-slate-200 flex flex-col z-10 relative shrink-0">
          <div className="p-6 border-b border-slate-100 bg-white">
            <h2 className="text-base font-extrabold flex items-center gap-2 text-slate-900 tracking-tight">
              <Database size={20} className="text-indigo-600" /> 데이터베이스 연결
            </h2>
            <p className="text-xs text-slate-500 mt-2 font-medium">Supabase에서 렌더링할 테이블을 선택하세요.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            {/* 테이블 목록 */}
            <div>
              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">연결된 테이블</h3>
              {isLoadingSchema ? (
                <div className="flex items-center gap-2 text-sm font-medium text-slate-500 p-4 bg-slate-50 rounded-xl">
                  <Loader2 size={16} className="animate-spin text-indigo-500" /> 로딩 중...
                </div>
              ) : Object.keys(schemaData).length === 0 ? (
                <div className="text-sm text-rose-500 p-4 bg-rose-50 rounded-xl font-medium">테이블을 찾을 수 없습니다.</div>
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

            {/* 컬럼 목록 */}
            {selectedTable && (
              <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">사용 가능한 데이터 필드</h3>
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
                          <button onClick={() => addCardField(col)} className="text-xs font-bold bg-white border border-slate-200 px-3 py-1.5 rounded-lg text-indigo-600 hover:bg-indigo-50 transition-colors shadow-sm">
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

        {/* === [중앙] 디자인 빌더 === */}
        <main className="flex-1 flex flex-col bg-[#F8FAFC] border-r border-slate-200 z-10 relative">
          <header className="flex bg-white border-b border-slate-200 px-6 pt-5 gap-6 shrink-0">
            <button className="flex items-center gap-2 pb-4 text-sm font-extrabold border-b-2 border-indigo-600 text-indigo-600 transition-all tracking-tight">
              <LayoutTemplate size={18} /> 화면 레이아웃 구성
            </button>
          </header>

          <div className="flex-1 overflow-y-auto p-8 lg:p-12">
            {selectedTable ? (
              <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 max-w-2xl mx-auto">
                <h2 className="text-lg font-extrabold mb-6 text-slate-900 tracking-tight">카드 리스트 맵핑</h2>
                <p className="text-sm text-slate-500 mb-6 font-medium">프리뷰 화면에 보여질 데이터의 아이콘과 노출 항목을 설정하세요.</p>
                
                <div className="space-y-3">
                  {appConfig.cardLayout.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 p-3.5 bg-white border hover:border-indigo-300 border-slate-200 rounded-2xl transition-all group shadow-sm">
                      <button onClick={() => setSelectedIconTarget({type: 'card', id: item.id})} className="p-3 bg-slate-50 border border-slate-200 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 transition-all cursor-pointer">
                        <DynamicIcon name={item.icon} size={20} />
                      </button>
                      <div className="flex-1 font-bold text-slate-700">{item.field}</div>
                      <button onClick={() => removeCardField(item.id)} className="text-slate-300 hover:text-rose-500 p-2 transition-colors">
                        <Trash2 size={18}/>
                      </button>
                    </div>
                  ))}
                  
                  {appConfig.cardLayout.length === 0 && (
                     <div className="text-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 text-sm font-medium flex flex-col items-center gap-2 bg-slate-50">
                       <Plus size={24} className="opacity-50" />
                       좌측 패널에서 데이터를 추가해주세요.
                     </div>
                  )}
                </div>

                {selectedIconTarget?.type === 'card' && (
                  <div className="mt-8 p-6 bg-slate-50 rounded-2xl border border-slate-200 animate-in fade-in slide-in-from-bottom-2 duration-200">
                    <p className="text-sm font-bold text-slate-700 mb-4 flex items-center gap-2"><LayoutTemplate size={16}/> 아이콘 변경</p>
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
                <FolderKanban size={48} className="mb-4 opacity-20" />
                <p className="text-base font-bold text-slate-500">데이터베이스에서 디자인할 테이블을 먼저 선택해주세요</p>
              </div>
            )}
          </div>
        </main>

        {/* === [우측] 실시간 기기 프리뷰 === */}
        <aside className="w-[480px] bg-[#F1F5F9] flex flex-col items-center py-8 overflow-y-auto relative shadow-inner shrink-0">
          <div className="mb-4 px-4 py-1.5 bg-slate-200 rounded-full text-xs font-bold text-slate-500 tracking-wider flex items-center gap-2">
            <Smartphone size={14}/> LIVE PREVIEW
          </div>
          
          <div className="bg-[#1e293b] p-3 rounded-[3.5rem] shadow-2xl border-4 border-slate-300 w-[340px] h-[720px] relative">
            <div className="bg-slate-50 w-full h-full rounded-[2.5rem] overflow-hidden flex flex-col relative">
              
              {/* 모바일 앱 헤더 */}
              <header className={`${appConfig.header.color} ${appConfig.header.textColor} px-6 py-5 shadow-sm flex items-center justify-center shrink-0`}>
                <h1 className="font-extrabold text-lg tracking-tight">{appName || appConfig.header.title}</h1>
              </header>

              {/* 데이터 리스트 렌더링 영역 */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 scrollbar-hide">
                {rows.map((row) => (
                  <div key={row.id || Math.random()} className="bg-white p-5 rounded-3xl shadow-[0_4px_16px_rgba(0,0,0,0.04)] border border-slate-100">
                    <div className="space-y-4">
                      {appConfig.cardLayout.map(field => {
                        const isImage = isImageUrl(row[field.field]) || field.field.includes('사진') || field.field.includes('이미지');
                        
                        return (
                          <div key={field.id} className="flex items-start gap-3.5">
                            <div className="text-slate-400 mt-0.5 bg-slate-50 p-1.5 rounded-lg border border-slate-100">
                              <DynamicIcon name={field.icon} size={16}/>
                            </div>
                            <div className="flex flex-col flex-1 w-full min-w-0">
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">{field.field}</span>
                              
                              {/* 이미지 렌더링 최적화 */}
                              {isImage && row[field.field] ? (
                                <div className="w-full h-40 bg-slate-100 rounded-xl overflow-hidden mt-1 border border-slate-100">
                                  <img 
                                    src={row[field.field]} 
                                    alt="첨부 이미지" 
                                    className="w-full h-full object-cover" 
                                    onError={(e) => { e.currentTarget.style.display = 'none'; }} 
                                  />
                                </div>
                              ) : (
                                <span className="text-sm font-bold text-slate-800 break-words whitespace-pre-wrap leading-relaxed">
                                  {row[field.field] !== null && row[field.field] !== undefined ? String(row[field.field]) : '-'}
                                </span>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                    
                    {appConfig.cardLayout.length > 0 && (
                      <button className={`mt-5 w-full py-3 rounded-xl text-sm font-extrabold flex items-center justify-center gap-1.5 transition-colors ${appConfig.actions.inline.color}`}>
                        <DynamicIcon name={appConfig.actions.inline.icon} size={16}/> {appConfig.actions.inline.label}
                      </button>
                    )}
                  </div>
                ))}
                
                {(!rows || rows.length === 0) && selectedTable && (
                  <div className="flex flex-col items-center justify-center h-40 text-slate-400 bg-white rounded-3xl border border-dashed border-slate-200">
                    <Database size={24} className="mb-2 opacity-30" />
                    <p className="text-xs font-bold">표시할 데이터가 없습니다.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ==================== 배포 완료 모달 ==================== */}
      {isDeployModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 max-w-md w-full p-8 relative animate-in zoom-in-95 duration-200">
            <button onClick={() => setIsDeployModalOpen(false)} className="absolute top-5 right-5 text-slate-400 hover:text-slate-600">
              <X size={20} />
            </button>
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6">
              <Rocket size={24} />
            </div>
            <h2 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">앱 배포 준비 완료!</h2>
            <p className="text-sm font-medium text-slate-500 mb-6 leading-relaxed">
              성공적으로 웹앱 구조가 생성되었습니다. 아래 고유 링크를 통해 스마트폰 브라우저에서 직접 확인해보세요.
            </p>
            
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <input 
                  type="text" 
                  readOnly 
                  value={deployUrl} 
                  className="bg-transparent flex-1 text-sm text-slate-600 font-medium outline-none truncate"
                />
                <button 
                  onClick={copyToClipboard}
                  className={`p-2 rounded-lg transition-all ${isCopied ? 'bg-emerald-50 text-emerald-600' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'}`}
                >
                  {isCopied ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <button 
                onClick={() => window.open(deployUrl, '_blank')}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
              >
                새 탭에서 열기
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}