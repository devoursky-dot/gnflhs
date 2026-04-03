// view.tsx
import React, { useState } from 'react';
import { View, SchemaData, LayoutRow, LayoutCell, Action } from './types';
import { Database, LayoutTemplate, Plus, Columns, Rows, ChevronLeft, ChevronRight, X, MousePointerClick, Star } from 'lucide-react';
import IconPicker, { IconMap } from './picker'; // [신규] 피커 임포트

interface ViewEditorProps {
  view: View;
  schemaData: SchemaData;
  actions: Action[];
  onUpdate: (updated: View) => void;
}

export default function ViewEditor({ view, schemaData, actions, onUpdate }: ViewEditorProps) {
  // 🔥 아이콘 피커 모달 상태 관리
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const availableColumns = view.tableName ? schemaData[view.tableName] || [] : [];

  const mutate = (callback: (rows: LayoutRow[]) => void) => {
    const next = JSON.parse(JSON.stringify(view.layoutRows));
    callback(next);
    onUpdate({ ...view, layoutRows: next });
  };

  const addRootRow = () => {
    onUpdate({ 
      ...view, 
      layoutRows: [...view.layoutRows, { id: `r_${Date.now()}`, cells: [{ id: `c_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }] 
    });
  };

  const RenderRow = ({ row, depth = 0 }: { row: LayoutRow, depth: number, parentRows: LayoutRow[] }) => (
    <div className={`group/row flex gap-2 p-3 rounded-xl border-2 border-slate-200 ${depth % 2 === 0 ? 'bg-slate-100/80' : 'bg-white'} relative mb-2`}>
      <button 
        onClick={() => mutate(rows => {
          const remove = (arr: LayoutRow[]) => {
            const idx = arr.findIndex(r => r.id === row.id);
            if (idx > -1) arr.splice(idx, 1);
            else arr.forEach(r => r.cells.forEach(c => { if(c.nestedRows) remove(c.nestedRows); }));
          };
          remove(rows);
        })}
        className="absolute -right-2 -top-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg opacity-0 group-hover/row:opacity-100 z-30 transition-opacity"
      >
        <X size={14} strokeWidth={3}/>
      </button>

      {row.cells.map(cell => (
        <div key={cell.id} style={{ flex: cell.flex }} className="flex flex-col gap-2 border-2 border-indigo-200 bg-white rounded-xl p-3 min-h-[100px] shadow-sm relative group/cell">
          <div className="flex justify-between items-center bg-indigo-50 px-2 py-1 rounded-lg">
            <div className="flex items-center gap-1.5">
              <button onClick={() => mutate(rows => {
                const find = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex = Math.max(1, c.flex - 1); if(c.nestedRows) find(c.nestedRows); }));
                find(rows);
              })} className="p-1 hover:bg-indigo-200 rounded text-indigo-700"><ChevronLeft size={14}/></button>
              <span className="text-[11px] font-black text-indigo-700 tracking-tighter">비율:{cell.flex}</span>
              <button onClick={() => mutate(rows => {
                const find = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex += 1; if(c.nestedRows) find(c.nestedRows); }));
                find(rows);
              })} className="p-1 hover:bg-indigo-200 rounded text-indigo-700"><ChevronRight size={14}/></button>
            </div>
            <div className="flex gap-2">
              <button onClick={() => mutate(rows => {
                const find = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => {
                  if(c.id === cell.id) {
                    c.contentType = 'nested';
                    c.nestedRows = [{ id: `nr_${Date.now()}`, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }];
                  } else if(c.nestedRows) find(c.nestedRows);
                }));
                find(rows);
              })} className="text-indigo-400 hover:text-indigo-700" title="세로 분할"><Rows size={16}/></button>
            </div>
          </div>

          {cell.contentType === 'nested' ? (
            <div className="space-y-3 h-full">
              {cell.nestedRows?.map(nr => <RenderRow key={nr.id} row={nr} depth={depth + 1} parentRows={cell.nestedRows!} />)}
              <button onClick={() => mutate(rows => {
                const find = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.nestedRows?.push({ id: `nr_${Date.now()}`, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }); if(c.nestedRows) find(c.nestedRows); }));
                find(rows);
              })} className="w-full py-2 border-2 border-dashed border-slate-200 text-xs font-bold text-slate-400 rounded-lg hover:bg-slate-50">+ 세로 칸 추가</button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center">
              <select
                value={(cell.contentType === 'action' ? 'action_' : '') + (cell.contentValue || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  mutate(rows => {
                    const find = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => {
                      if(c.id === cell.id) {
                        if (val.startsWith('action_')) { c.contentType = 'action'; c.contentValue = val.replace('action_', ''); }
                        else { c.contentType = val ? 'field' : 'empty'; c.contentValue = val; }
                      } else if(c.nestedRows) find(c.nestedRows);
                    }));
                    find(rows);
                  });
                }}
                className="w-full p-2 text-sm font-black text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-lg outline-none focus:border-indigo-500"
              >
                <option value="">-- 표시 데이터 선택 --</option>
                <optgroup label="DB 컬럼명">{availableColumns.map(col => <option key={col} value={col}>{col}</option>)}</optgroup>
                <optgroup label="연결된 액션">{actions.map(act => <option key={act.id} value={`action_${act.id}`}>⚡ {act.name}</option>)}</optgroup>
              </select>
            </div>
          )}
        </div>
      ))}
      <button onClick={() => mutate(rows => {
        const find = (arr: any[]) => arr.forEach(r => {
          if(r.id === row.id) r.cells.push({ id: `c_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null });
          r.cells.forEach((c: any) => { if(c.nestedRows) find(c.nestedRows); });
        });
        find(rows);
      })} className="w-10 flex items-center justify-center bg-indigo-600 text-white rounded-xl shadow-md hover:bg-indigo-700" title="옆으로 분할"><Columns size={20}/></button>
    </div>
  );

  return (
    <div className="min-h-full p-10 bg-[#F1F5F9] pb-32 text-slate-900 relative"> 
      <div className="max-w-5xl mx-auto space-y-10">
        
        {/* 🔥 핵심 해결: 뷰 이름 및 아이콘 설정 영역 추가 */}
        <section className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <label className="block text-xs font-black text-slate-400 mb-3 uppercase">현재 뷰(View)의 아이콘과 이름</label>
          <div className="flex items-center gap-4">
            
            {/* 아이콘 피커 트리거 버튼 */}
            <button 
              onClick={() => setIsIconPickerOpen(true)}
              className="w-16 h-16 shrink-0 flex items-center justify-center bg-indigo-50 border-2 border-indigo-100 rounded-2xl hover:border-indigo-400 hover:shadow-md transition-all group"
            >
              {view.icon && IconMap[view.icon] ? 
                React.createElement(IconMap[view.icon], { className: "text-indigo-600 group-hover:scale-110 transition-transform", size: 32 }) : 
                <Star className="text-indigo-300 group-hover:text-indigo-600 transition-colors" size={32} />
              }
            </button>

            {/* 뷰 이름 수정 텍스트 입력창 */}
            <input
              type="text"
              value={view.name}
              onChange={(e) => onUpdate({ ...view, name: e.target.value })}
              placeholder="화면 이름을 입력하세요"
              className="flex-1 p-4 rounded-2xl border-2 border-slate-200 text-2xl font-black text-slate-900 focus:border-indigo-600 outline-none transition-all"
            />
          </div>
        </section>

        <section className="bg-white p-8 rounded-3xl shadow-xl border border-slate-200">
          <div className="flex items-center gap-4 mb-6 text-slate-900">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Database size={28}/></div>
            <div>
              <h2 className="text-xl font-black">1. 화면 설정 및 데이터 연결</h2>
              <p className="text-sm text-slate-500 font-bold">테이블과 카드 배치 방식을 결정하세요.</p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase">연결 테이블</label>
              <select value={view.tableName || ''} onChange={(e) => onUpdate({ ...view, tableName: e.target.value, layoutRows: [] })} className="w-full p-4 rounded-2xl border-2 border-slate-200 font-black text-slate-800 focus:border-indigo-600 outline-none bg-white">
                <option value="">테이블 선택</option>
                {Object.keys(schemaData).map(table => <option key={table} value={table}>{table}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black text-slate-400 mb-2 uppercase">카드 가로 배치 (열)</label>
              <select 
                value={view.columnCount || 1} 
                onChange={(e) => onUpdate({ ...view, columnCount: Number(e.target.value) })}
                className="w-full p-4 rounded-2xl border-2 border-slate-200 font-black text-indigo-600 focus:border-indigo-600 outline-none bg-white"
              >
                <option value={1}>1열 (기본 목록형)</option>
                <option value={2}>2열 (갤러리형)</option>
                <option value={3}>3열 (그리드형)</option>
                <option value={4}>4열 (요약형)</option>
              </select>
            </div>
            <div className="col-span-2 mt-2">
              <label className="flex items-center gap-2 text-xs font-black text-slate-400 mb-2 uppercase">
                <MousePointerClick size={14} className="text-indigo-500"/> 카드 클릭 시 실행될 액션
              </label>
              <select 
                value={view.onClickActionId || ''} 
                onChange={(e) => onUpdate({ ...view, onClickActionId: e.target.value || null })}
                className="w-full p-4 rounded-2xl border-2 border-indigo-100 font-black text-slate-800 focus:border-indigo-600 outline-none bg-indigo-50/30"
              >
                <option value="">(없음) 클릭 시 아무 동작 안 함</option>
                {actions.map(act => (
                  <option key={act.id} value={act.id}>⚡ {act.name}</option>
                ))}
              </select>
            </div>
          </div>
        </section>

        <section className={`${!view.tableName ? 'opacity-30 pointer-events-none' : ''}`}>
          <div className="mb-6 flex justify-between items-center">
            <h2 className="text-xl font-black text-slate-900 flex items-center gap-3"><LayoutTemplate size={28} className="text-indigo-600"/> 2. 카드 칸 나누기 설계</h2>
          </div>
          <div className="bg-white p-8 rounded-3xl shadow-2xl border-2 border-slate-200 space-y-6">
            {view.layoutRows.map(row => <RenderRow key={row.id} row={row} depth={0} parentRows={view.layoutRows} />)}
            <button onClick={addRootRow} className="w-full py-6 border-4 border-dashed border-indigo-100 text-indigo-500 rounded-3xl font-black text-lg flex items-center justify-center gap-3 hover:bg-indigo-50 transition-all"><Plus size={24} /> 새로운 큰 칸(Row) 추가하기</button>
          </div>
        </section>
      </div>

      {/* 🔥 모달 렌더링 영역 */}
      <IconPicker 
        isOpen={isIconPickerOpen} 
        onClose={() => setIsIconPickerOpen(false)}
        selectedIcon={view.icon}
        onSelect={(iconName) => onUpdate({ ...view, icon: iconName })}
      />
    </div>
  );
}