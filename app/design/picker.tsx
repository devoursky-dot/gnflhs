// picker.tsx
import React, { useState, useMemo } from 'react';
import * as LucideIcons from 'lucide-react';
import { Search, X, Hash } from 'lucide-react';

// 1. Lucide의 모든 아이콘을 동적으로 추출하여 IconMap 생성 (수천 개 자동 맵핑)
export const IconMap = Object.entries(LucideIcons).reduce((acc, [name, component]) => {
  // 컴포넌트(함수/객체)이면서 유틸리티 함수가 아닌 것만 필터링
  if (
    (typeof component === 'object' || typeof component === 'function') && 
    name !== 'createLucideIcon' && 
    name !== 'default' &&
    name !== 'Icon'
  ) {
    acc[name] = component as React.ElementType;
  }
  return acc;
}, {} as Record<string, React.ElementType>);

const ALL_ICON_NAMES = Object.keys(IconMap);

// 2. 이름 기반 스마트 카테고리 자동 분류 알고리즘 매퍼
const CATEGORY_RULES: Record<string, string[]> = {
  '방향 & 화살표': ['Arrow', 'Chevron', 'Corner', 'Move', 'Align', 'Chevrons'],
  '파일 & 폴더': ['File', 'Folder', 'Archive', 'Clipboard', 'Copy', 'Book', 'Doc', 'Paper'],
  '인터페이스': ['Menu', 'Layout', 'Grid', 'Panel', 'Window', 'Maximize', 'Zoom', 'Cursor', 'Pointer'],
  '유저 & 계정': ['User', 'Person', 'Smile', 'Contact', 'Badge'],
  '메시지 & 알림': ['Mail', 'Message', 'Bell', 'Send', 'Inbox', 'Chat'],
  '미디어 & 장치': ['Camera', 'Video', 'Audio', 'Monitor', 'Phone', 'Tv', 'Speaker', 'Play', 'Pause', 'Image'],
  '도형 & 기호': ['Circle', 'Square', 'Triangle', 'Hexagon', 'Star', 'Heart', 'Check', 'X', 'Plus', 'Minus', 'Info', 'Alert'],
  '비즈니스 & 금융': ['Dollar', 'Coin', 'Credit', 'Wallet', 'Shopping', 'Cart', 'Bag', 'Percent', 'Tag'],
  '데이터 & 차트': ['Chart', 'Graph', 'Pie', 'Trending', 'Data', 'Activity'],
  '자연 & 날씨': ['Sun', 'Moon', 'Cloud', 'Zap', 'Flame', 'Wind', 'Drop', 'Leaf', 'Tree'],
  '설정 & 도구': ['Settings', 'Wrench', 'Tool', 'Cog', 'Slider', 'Key', 'Lock', 'Shield'],
};

interface IconPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  selectedIcon?: string | null;
}

export default function IconPicker({ isOpen, onClose, onSelect, selectedIcon }: IconPickerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('전체');

  // 3. 아이콘 분류 연산 (컴포넌트 마운트 시 1회만 연산되도록 최적화)
  const groupedIcons = useMemo(() => {
    const groups: Record<string, string[]> = { '전체': ALL_ICON_NAMES };
    Object.keys(CATEGORY_RULES).forEach(cat => groups[cat] = []);
    groups['기타 미분류'] = [];

    ALL_ICON_NAMES.forEach(iconName => {
      let isMatched = false;
      for (const [category, keywords] of Object.entries(CATEGORY_RULES)) {
        if (keywords.some(kw => iconName.includes(kw))) {
          groups[category].push(iconName);
          isMatched = true;
          break; // 첫 번째 일치하는 카테고리에 할당
        }
      }
      if (!isMatched) groups['기타 미분류'].push(iconName);
    });

    return groups;
  }, []);

  // 4. 화면에 렌더링할 아이콘 목록 결정 (검색 또는 카테고리 필터)
  const displayedIcons = useMemo(() => {
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      return ALL_ICON_NAMES.filter(name => name.toLowerCase().includes(lowerTerm));
    }
    return groupedIcons[activeCategory] || [];
  }, [searchTerm, activeCategory, groupedIcons]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10">
      {/* 모달 컨테이너 (좌측 사이드바 + 우측 그리드 구조) */}
      <div className="bg-white w-full max-w-6xl h-[85vh] rounded-3xl shadow-2xl flex overflow-hidden animate-in fade-in zoom-in-95 duration-200 border border-slate-200">
        
        {/* --- 좌측: 카테고리 사이드바 --- */}
        <div className="w-[240px] bg-slate-50 border-r border-slate-200 flex flex-col shrink-0">
          <div className="p-6 border-b border-slate-200 bg-slate-50">
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Star className="text-indigo-600" /> 아이콘 라이브러리
            </h2>
            <p className="text-xs text-slate-500 font-bold mt-1 tracking-tight">총 {ALL_ICON_NAMES.length.toLocaleString()}개의 아이콘</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-1">
            {Object.keys(groupedIcons).map(category => {
              const count = groupedIcons[category].length;
              if (count === 0 && category !== '전체') return null;
              
              return (
                <button
                  key={category}
                  onClick={() => {
                    setActiveCategory(category);
                    setSearchTerm(''); // 카테고리 이동 시 검색어 초기화
                  }}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeCategory === category && !searchTerm
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'text-slate-600 hover:bg-indigo-50 hover:text-indigo-700'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Hash size={14} className={activeCategory === category && !searchTerm ? 'text-indigo-300' : 'text-slate-400'}/>
                    {category}
                  </span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                    activeCategory === category && !searchTerm ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-500'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* --- 우측: 아이콘 검색 및 결과 그리드 --- */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          {/* 상단 검색바 및 닫기 버튼 */}
          <div className="p-6 border-b border-slate-100 flex items-center justify-between gap-4 sticky top-0 bg-white/80 backdrop-blur-md z-10">
            <div className="relative flex-1 max-w-lg">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-500" size={20} />
              <input 
                type="text" 
                placeholder="영문으로 아이콘 검색 (예: user, arrow, file)..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 bg-indigo-50/50 border border-indigo-100 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:border-indigo-500 focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all placeholder:text-indigo-300"
              />
            </div>
            
            <button onClick={onClose} className="p-3 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-2xl transition-all border border-transparent hover:border-rose-100">
              <X size={24} />
            </button>
          </div>

          {/* 아이콘 렌더링 영역 */}
          <div className="flex-1 overflow-y-auto p-8">
            <div className="mb-6 flex items-end justify-between">
              <h3 className="text-lg font-black text-slate-800">
                {searchTerm ? `"${searchTerm}" 검색 결과` : activeCategory}
              </h3>
              <span className="text-sm font-bold text-slate-400">{displayedIcons.length}개 렌더링 됨</span>
            </div>

            {displayedIcons.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-400 space-y-4">
                <Search size={48} className="opacity-20" />
                <p className="font-bold">검색어에 일치하는 아이콘이 없습니다.</p>
              </div>
            ) : (
              // [최적화 포인트] auto-fill을 사용하여 브라우저 너비에 맞게 유동적 배치
              <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-4">
                {displayedIcons.map(iconName => {
                  const IconComponent = IconMap[iconName];
                  if (!IconComponent) return null;
                  
                  const isSelected = selectedIcon === iconName;

                  return (
                    <button
                      key={iconName}
                      onClick={() => {
                        onSelect(iconName);
                        onClose();
                      }}
                      className={`group flex flex-col items-center justify-center p-4 gap-3 rounded-2xl transition-all duration-200 ${
                        isSelected 
                          ? 'bg-indigo-600 border-2 border-indigo-600 text-white shadow-lg scale-105 z-10' 
                          : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-400 hover:shadow-xl hover:text-indigo-600 hover:-translate-y-1'
                      }`}
                      title={iconName}
                    >
                      <IconComponent size={28} strokeWidth={isSelected ? 2.5 : 1.5} className="transition-transform group-hover:scale-110" />
                      <span className={`text-[9px] font-bold truncate w-full text-center ${isSelected ? 'text-indigo-100' : 'text-slate-400 group-hover:text-indigo-500'}`}>
                        {iconName}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}