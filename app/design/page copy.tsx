"use client";

import React, { useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { 
  Smartphone, Tablet, Plus, Trash2, Settings, 
  LayoutTemplate, Navigation, Zap, Type, 
  CheckCircle2, AlertCircle, Database, GripVertical
} from 'lucide-react';

// ==========================================
// 1. 유틸리티 및 초기 데이터
// ==========================================
const ICON_GALLERY = ['User', 'Calendar', 'FileText', 'MapPin', 'Bell', 'MessageSquare', 'Check', 'AlertTriangle', 'Home', 'Settings', 'Star', 'Heart'];

const DynamicIcon = ({ name, size = 18, className = "" }: { name: string, size?: number, className?: string }) => {
  const IconComponent = (LucideIcons as any)[name] || LucideIcons.HelpCircle;
  return <IconComponent size={size} className={className} />;
};

// ==========================================
// 2. 메인 스튜디오 컴포넌트
// ==========================================

interface DataRow {
  id: number;
  [key: string]: any; // 어떤 문자열 키로도 접근 가능하게 허용
}

export default function NoCodeStudio() {
  // --- [상태 관리 1] 데이터 소스 (좌측 패널용) ---
  const [columns, setColumns] = useState(['이름', '상태', '점수']);
  const [rows, setRows] = useState<DataRow[]>([
    { id: 1, 이름: '김철수', 상태: '출석', 점수: '10' },
    { id: 2, 이름: '이영희', 상태: '지각', 점수: '-2' },
  ]);

  // --- [상태 관리 2] 앱 디자인 설정 (중앙 패널용) ---
  const [appConfig, setAppConfig] = useState({
    header: { title: '우리반 출석부', color: 'bg-indigo-600', textColor: 'text-white' },
    cardLayout: [
      { id: 'c1', field: '이름', icon: 'User' },
      { id: 'c2', field: '상태', icon: 'Check' }
    ],
    bottomNav: [
      { id: 'n1', label: '홈', icon: 'Home' },
      { id: 'n2', label: '설정', icon: 'Settings' }
    ],
    actions: {
      inline: { label: '벌점주기', icon: 'AlertTriangle', color: 'bg-rose-100 text-rose-600' },
      bulk: { label: '일괄 출석처리', icon: 'CheckCircle2' }
    }
  });

  // --- [상태 관리 3] UI 제어 ---
  const [activeTab, setActiveTab] = useState<'header' | 'card' | 'nav' | 'action'>('card');
  const [device, setDevice] = useState<'mobile' | 'tablet'>('mobile');
  const [checkedItems, setCheckedItems] = useState<number[]>([]);
  const [selectedIconTarget, setSelectedIconTarget] = useState<{type: string, id: string} | null>(null);

  // --- 데이터 제어 함수 ---
  const addRow = () => {
    const newId = Date.now();
    const newRow: any = { id: newId };
    columns.forEach(col => newRow[col] = '새 데이터');
    setRows([...rows, newRow]);
  };
  const deleteRow = (id: number) => setRows(rows.filter(r => r.id !== id));
  
  const addColumn = () => {
    const newColName = prompt("새로운 데이터 항목(컬럼) 이름을 입력하세요:");
    if (newColName && !columns.includes(newColName)) {
      setColumns([...columns, newColName]);
      setRows(rows.map(row => ({ ...row, [newColName]: '-' })));
    }
  };

  // --- 디자인 제어 함수 ---
  const updateHeader = (key: string, value: string) => setAppConfig({ ...appConfig, header: { ...appConfig.header, [key]: value } });
  
  const addCardField = (field: string) => {
    if (appConfig.cardLayout.find(c => c.field === field)) return;
    setAppConfig({ ...appConfig, cardLayout: [...appConfig.cardLayout, { id: `c_${Date.now()}`, field, icon: 'FileText' }] });
  };
  const removeCardField = (id: string) => setAppConfig({ ...appConfig, cardLayout: appConfig.cardLayout.filter(c => c.id !== id) });

  const updateIcon = (iconName: string) => {
    if (!selectedIconTarget) return;
    const { type, id } = selectedIconTarget;
    if (type === 'card') {
      setAppConfig({ ...appConfig, cardLayout: appConfig.cardLayout.map(c => c.id === id ? { ...c, icon: iconName } : c) });
    } else if (type === 'nav') {
      setAppConfig({ ...appConfig, bottomNav: appConfig.bottomNav.map(n => n.id === id ? { ...n, icon: iconName } : n) });
    }
    setSelectedIconTarget(null);
  };

  return (
    <div className="flex h-screen w-full bg-slate-100 overflow-hidden font-sans text-slate-800">
      
      {/* ==========================================
          [좌측] 데이터 소스 관리 패널
          ========================================== */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-10">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center">
          <h2 className="text-sm font-bold flex items-center gap-2"><Database size={16} className="text-blue-600"/> 데이터 소스</h2>
          <button onClick={addColumn} className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded">+ 컬럼 추가</button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* 컬럼 리스트 (드래그 소스 역할) */}
          <div>
            <h3 className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider">Available Columns</h3>
            <div className="space-y-2">
              {columns.map(col => (
                <div key={col} className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                  <span className="text-sm font-medium">{col}</span>
                  <button 
                    onClick={() => addCardField(col)}
                    className="text-xs bg-white border shadow-sm px-2 py-1 rounded text-blue-600 hover:bg-blue-50"
                  >
                    카드에 추가
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 실제 데이터 표 (간이 엑셀) */}
          <div>
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Mock Data</h3>
              <button onClick={addRow} className="text-xs text-blue-600 hover:underline">+ 행 추가</button>
            </div>
            <div className="space-y-3">
              {rows.map((row, idx) => (
                <div key={row.id} className="p-3 bg-white border border-slate-200 rounded-xl relative group">
                  <button onClick={() => deleteRow(row.id)} className="absolute -top-2 -right-2 bg-rose-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"><Trash2 size={12}/></button>
                  {columns.map(col => (
                    <div key={col} className="flex justify-between text-xs mb-1 border-b border-slate-50 pb-1 last:border-0">
                      <span className="text-slate-400">{col}</span>
                      <span className="font-medium truncate max-w-[120px]">{row[col]}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* ==========================================
          [중앙] 디자인 빌더 탭 패널
          ========================================== */}
      <main className="flex-1 flex flex-col bg-slate-50 border-r border-slate-200 z-10">
        {/* 상단 탭 메뉴 */}
        <header className="flex bg-white border-b border-slate-200 px-4 pt-4 gap-2">
          {[
            { id: 'header', icon: Type, label: '상단 타이틀' },
            { id: 'card', icon: LayoutTemplate, label: '카드 구성' },
            { id: 'action', icon: Zap, label: '액션 설정' },
            { id: 'nav', icon: Navigation, label: '하단 메뉴' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === tab.id ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
            >
              <tab.icon size={16} /> {tab.label}
            </button>
          ))}
        </header>

        {/* 탭 내용 영역 */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 max-w-2xl mx-auto">
            
            {/* 탭 1: 상단 타이틀 */}
            {activeTab === 'header' && (
              <div className="space-y-4 animate-in fade-in">
                <h2 className="text-lg font-bold mb-4">앱 상단(Header) 설정</h2>
                <div>
                  <label className="text-xs font-bold text-slate-500">앱 제목</label>
                  <input 
                    type="text" value={appConfig.header.title} 
                    onChange={e => updateHeader('title', e.target.value)}
                    className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg mt-1 outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-500">테마 색상</label>
                  <div className="flex gap-2 mt-2">
                    {['bg-indigo-600', 'bg-slate-900', 'bg-emerald-600', 'bg-rose-500'].map(color => (
                      <button 
                        key={color} onClick={() => updateHeader('color', color)}
                        className={`w-10 h-10 rounded-full ${color} ${appConfig.header.color === color ? 'ring-4 ring-offset-2 ring-blue-300' : ''}`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 탭 2: 카드 구성 */}
            {activeTab === 'card' && (
              <div className="animate-in fade-in">
                <h2 className="text-lg font-bold mb-4">카드 내 데이터 배치</h2>
                <p className="text-xs text-slate-500 mb-4">좌측 데이터 소스에서 컬럼을 추가한 뒤, 아래에서 아이콘을 클릭해 변경하세요.</p>
                
                <div className="space-y-3">
                  {appConfig.cardLayout.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 border-2 border-dashed rounded-xl">카드가 비어있습니다.</div>
                  ) : (
                    appConfig.cardLayout.map((item) => (
                      <div key={item.id} className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                        <button 
                          onClick={() => setSelectedIconTarget({type: 'card', id: item.id})}
                          className="p-3 bg-white border border-slate-200 rounded-lg hover:border-indigo-500 hover:text-indigo-600 transition"
                          title="아이콘 변경"
                        >
                          <DynamicIcon name={item.icon} />
                        </button>
                        <div className="flex-1 font-bold">{item.field}</div>
                        <button onClick={() => removeCardField(item.id)} className="text-rose-400 hover:text-rose-600 p-2"><Trash2 size={16}/></button>
                      </div>
                    ))
                  )}
                </div>

                {/* 시각적 아이콘 피커 (조건부 노출) */}
                {selectedIconTarget?.type === 'card' && (
                  <div className="mt-6 p-4 bg-indigo-50 rounded-xl border border-indigo-100 animate-in slide-in-from-top-2">
                    <p className="text-xs font-bold text-indigo-800 mb-3">적용할 아이콘을 선택하세요:</p>
                    <div className="grid grid-cols-6 gap-2">
                      {ICON_GALLERY.map(icon => (
                        <button 
                          key={icon} onClick={() => updateIcon(icon)}
                          className="p-2 bg-white rounded-lg border border-indigo-100 hover:bg-indigo-600 hover:text-white transition flex justify-center"
                        >
                          <DynamicIcon name={icon} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 탭 3: 하단 메뉴 */}
            {activeTab === 'nav' && (
              <div className="animate-in fade-in space-y-4">
                <h2 className="text-lg font-bold mb-4">하단 네비게이션(GNB) 설정</h2>
                {appConfig.bottomNav.map(nav => (
                  <div key={nav.id} className="flex items-center gap-3 p-3 border rounded-xl">
                    <button 
                      onClick={() => setSelectedIconTarget({type: 'nav', id: nav.id})}
                      className="p-3 bg-slate-100 rounded-lg hover:bg-slate-200"
                    >
                      <DynamicIcon name={nav.icon} />
                    </button>
                    <input 
                      type="text" value={nav.label}
                      onChange={e => setAppConfig({ ...appConfig, bottomNav: appConfig.bottomNav.map(n => n.id === nav.id ? { ...n, label: e.target.value } : n) })}
                      className="flex-1 p-2 outline-none font-bold bg-transparent"
                    />
                  </div>
                ))}
                
                {selectedIconTarget?.type === 'nav' && (
                  <div className="mt-4 p-4 bg-slate-100 rounded-xl grid grid-cols-6 gap-2">
                    {ICON_GALLERY.map(icon => (
                      <button key={icon} onClick={() => updateIcon(icon)} className="p-2 bg-white rounded hover:bg-indigo-500 hover:text-white flex justify-center"><DynamicIcon name={icon}/></button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 탭 4: 액션 설정 */}
            {activeTab === 'action' && (
               <div className="animate-in fade-in space-y-6">
                <div>
                  <h3 className="text-sm font-bold mb-2">1. 개별 액션 (카드 내부 버튼)</h3>
                  <div className="flex gap-2">
                    <input 
                      value={appConfig.actions.inline.label}
                      onChange={e => setAppConfig({...appConfig, actions: {...appConfig.actions, inline: {...appConfig.actions.inline, label: e.target.value}}})}
                      className="flex-1 p-3 bg-slate-50 border rounded-lg outline-none" placeholder="버튼 이름 (예: 벌점주기)"
                    />
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <h3 className="text-sm font-bold mb-2">2. 다중 선택 액션 (플로팅 버튼)</h3>
                  <div className="flex gap-2">
                    <input 
                      value={appConfig.actions.bulk.label}
                      onChange={e => setAppConfig({...appConfig, actions: {...appConfig.actions, bulk: {...appConfig.actions.bulk, label: e.target.value}}})}
                      className="flex-1 p-3 bg-slate-50 border rounded-lg outline-none" placeholder="버튼 이름 (예: 일괄 출석처리)"
                    />
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>

      {/* ==========================================
          [우측] 실시간 기기 프리뷰 (Real-time Preview)
          ========================================== */}
      <aside className="w-[450px] bg-slate-200/50 flex flex-col items-center py-8 overflow-y-auto">
        
        {/* 기기 전환 토글 */}
        <div className="bg-white p-1 rounded-full flex gap-1 shadow-sm mb-6">
          <button onClick={() => setDevice('mobile')} className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition ${device === 'mobile' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Smartphone size={16}/> Mobile</button>
          <button onClick={() => setDevice('tablet')} className={`px-4 py-2 rounded-full flex items-center gap-2 text-sm font-bold transition ${device === 'tablet' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}><Tablet size={16}/> Tablet</button>
        </div>

        {/* 목업 디바이스 껍데기 */}
        <div className={`bg-black p-3 rounded-[3rem] shadow-2xl border-4 border-slate-300 transition-all duration-500 ease-in-out relative ${device === 'mobile' ? 'w-[320px] h-[650px]' : 'w-[420px] h-[700px]'}`}>
          
          {/* 실제 구동되는 앱 화면 (스크린) */}
          <div className="bg-slate-50 w-full h-full rounded-[2.2rem] overflow-hidden flex flex-col relative">
            
            {/* 앱 1: Header (상단 탭과 연동) */}
            <header className={`${appConfig.header.color} ${appConfig.header.textColor} p-5 shadow-md flex items-center justify-center shrink-0`}>
              <h1 className="font-bold text-lg truncate">{appConfig.header.title}</h1>
            </header>

            {/* 앱 2: Body (카드 탭 + 데이터 패널 연동) */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
              {rows.map((row) => (
                <div 
                  key={row.id} 
                  onClick={() => setCheckedItems(prev => prev.includes(row.id) ? prev.filter(i => i !== row.id) : [...prev, row.id])}
                  className={`bg-white p-4 rounded-2xl shadow-sm border-2 transition-all cursor-pointer ${checkedItems.includes(row.id) ? 'border-indigo-500 bg-indigo-50/20' : 'border-transparent'}`}
                >
                  {/* 카드 내용 렌더링 */}
                  <div className="space-y-3">
                    {appConfig.cardLayout.map(field => (
                      <div key={field.id} className="flex items-center gap-3">
                        <div className="text-slate-400"><DynamicIcon name={field.icon} size={16}/></div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-slate-400 uppercase">{field.field}</span>
                          <span className="text-sm font-bold text-slate-700">{row[field.field]}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* 개별 액션 버튼 (액션 탭 연동) */}
                  <button className={`mt-4 w-full py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition ${appConfig.actions.inline.color}`}>
                    <DynamicIcon name={appConfig.actions.inline.icon} size={14}/> {appConfig.actions.inline.label}
                  </button>
                </div>
              ))}
            </div>

            {/* 앱 3: FAB 다중 액션 (액션 탭 연동) */}
            {checkedItems.length > 0 && (
              <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-20 w-max">
                <button className="bg-slate-900 text-white px-5 py-3 rounded-full shadow-xl flex items-center gap-2 text-sm font-bold animate-in slide-in-from-bottom-5">
                  <DynamicIcon name={appConfig.actions.bulk.icon} size={16}/>
                  {checkedItems.length}건 {appConfig.actions.bulk.label}
                </button>
              </div>
            )}

            {/* 앱 4: Bottom Navigation (하단 메뉴 탭 연동) */}
            <nav className="bg-white border-t border-slate-200 h-16 flex justify-around items-center shrink-0 px-2 absolute bottom-0 w-full z-10">
              {appConfig.bottomNav.map((nav, idx) => (
                <div key={nav.id} className={`flex flex-col items-center gap-1 ${idx === 0 ? 'text-indigo-600' : 'text-slate-400'}`}>
                  <DynamicIcon name={nav.icon} size={20}/>
                  <span className="text-[10px] font-bold">{nav.label}</span>
                </div>
              ))}
            </nav>

          </div>
        </div>
      </aside>

    </div>
  );
}