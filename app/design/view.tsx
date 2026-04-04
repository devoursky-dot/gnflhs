// 파일 경로: app/design/view.tsx
"use client";

import React, { useState, useMemo } from 'react';
import { View, SchemaData, LayoutRow, Action } from './types';
import * as LucideIcons from 'lucide-react';
import { 
  Database, LayoutTemplate, Plus, Columns, Rows, ChevronLeft, 
  ChevronRight, X, MousePointerClick, Star, Filter, Search, Smartphone, Eye, Loader2, TableProperties
} from 'lucide-react';
import IconPicker, { IconMap } from './picker'; 
import { createClient } from '@supabase/supabase-js'; // 🔥 Supabase 클라이언트 추가

// Supabase 인스턴스 생성 (데이터 미리보기용)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "", 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

interface ViewEditorProps {
  view: View;
  schemaData: SchemaData;
  actions: Action[];
  onUpdate: (updated: View) => void;
}

export default function ViewEditor({ view, schemaData, actions, onUpdate }: ViewEditorProps) {
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const availableColumns = view.tableName ? schemaData[view.tableName] || [] : [];

  // 🔥 데이터 미리보기 모달 상태 관리
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  // 🔥 데이터 미리보기 실행 함수
  const fetchPreviewData = async () => {
    if (!view.tableName) return alert("먼저 테이블을 선택해주세요.");
    
    setIsPreviewModalOpen(true);
    setIsLoadingPreview(true);
    
    try {
      let query = supabase.from(view.tableName).select('*').limit(1000); // 상위 1000개만 확인
      
      // 현재 설정된 필터 조건 적용
      if (view.filterColumn && view.filterValue) {
        if (view.filterOperator === 'like') query = query.ilike(view.filterColumn, `%${view.filterValue}%`);
        else if (view.filterOperator === 'gt') query = query.gt(view.filterColumn, view.filterValue);
        else if (view.filterOperator === 'lt') query = query.lt(view.filterColumn, view.filterValue);
        else query = query.eq(view.filterColumn, view.filterValue);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      setPreviewData(data || []);
    } catch (err: any) {
      alert("데이터를 불러오지 못했습니다: " + err.message);
    } finally {
      setIsLoadingPreview(false);
    }
  };

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

  const RenderRowEditor = ({ row, depth = 0 }: { row: LayoutRow, depth: number }) => (
    <div className={`flex gap-3 p-3 rounded-2xl border-2 border-slate-200 ${depth % 2 === 0 ? 'bg-slate-50' : 'bg-white'} relative mb-3 group/row transition-all`}>
      <button onClick={() => mutate(rows => {
        const remove = (arr: LayoutRow[]) => {
          const idx = arr.findIndex(r => r.id === row.id);
          if (idx > -1) arr.splice(idx, 1);
          else arr.forEach(r => r.cells.forEach(c => { if(c.nestedRows) remove(c.nestedRows); }));
        };
        remove(rows);
      })} className="absolute -right-3 -top-3 w-7 h-7 bg-slate-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 z-30 transition-all shadow-lg">
        <X size={14} strokeWidth={3} />
      </button>

      {row.cells.map(cell => (
        <div key={cell.id} style={{ flex: cell.flex }} className="flex flex-col gap-2 border-2 border-indigo-200 bg-white rounded-2xl p-4 min-h-[120px] shadow-sm relative transition-all">
          <div className="flex justify-between items-center bg-indigo-50 px-2 py-1 rounded-xl">
            <div className="flex items-center gap-1.5">
              <button onClick={() => mutate(rows => {
                const find = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex = Math.max(1, c.flex - 1); if(c.nestedRows) find(c.nestedRows); }));
                find(rows);
              })} className="text-indigo-700 hover:scale-125 transition-transform p-1"><ChevronLeft size={16}/></button>
              <span className="text-[11px] font-black text-indigo-700 tracking-tighter">비율:{cell.flex}</span>
              <button onClick={() => mutate(rows => {
                const find = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex += 1; if(c.nestedRows) find(c.nestedRows); }));
                find(rows);
              })} className="text-indigo-700 hover:scale-125 transition-transform p-1"><ChevronRight size={16}/></button>
            </div>
            <button onClick={() => mutate(rows => {
              const find = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => {
                if(c.id === cell.id) {
                  c.contentType = 'nested';
                  c.nestedRows = [{ id: `nr_${Date.now()}`, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }];
                } else if(c.nestedRows) find(c.nestedRows);
              }));
              find(rows);
            })} className="text-indigo-400 hover:text-indigo-700 p-1" title="세로 분할"><Rows size={18}/></button>
          </div>

          {cell.contentType === 'nested' ? (
            <div className="space-y-3 pt-2 h-full">
              {cell.nestedRows?.map(nr => <RenderRowEditor key={nr.id} row={nr} depth={depth + 1} />)}
              <button onClick={() => mutate(rows => {
                const find = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.nestedRows?.push({ id: `nr_${Date.now()}`, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }); if(c.nestedRows) find(c.nestedRows); }));
                find(rows);
              })} className="w-full py-3 border-2 border-dashed border-slate-200 text-[10px] font-black text-slate-400 rounded-xl hover:bg-slate-50 transition-colors">+ 세로 분할 추가</button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col justify-center gap-2">
              <select 
                className="w-full p-2.5 text-xs font-black text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-xl outline-none focus:border-indigo-500 transition-all" 
                value={(cell.contentType === 'action' ? 'act_' : '') + (cell.contentValue || '')} 
                onChange={e => {
                  const val = e.target.value;
                  mutate(rows => {
                    const find = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => {
                      if(c.id === cell.id) {
                        if (val.startsWith('act_')) { c.contentType = 'action'; c.contentValue = val.replace('act_', ''); }
                        else { c.contentType = val ? 'field' : 'empty'; c.contentValue = val; }
                      } else if(c.nestedRows) find(c.nestedRows);
                    }));
                    find(rows);
                  });
                }}
              >
                <option value="">-- 데이터 선택 --</option>
                <optgroup label="테이블 컬럼">
                  {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </optgroup>
                <optgroup label="액션(기능)">
                  {actions.map(a => <option key={a.id} value={`act_${a.id}`}>⚡ {a.name}</option>)}
                </optgroup>
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
      })} className="w-12 flex items-center justify-center bg-indigo-600 text-white rounded-2xl shadow-md hover:bg-indigo-700 transition-colors hover:scale-105" title="옆으로 분할"><Columns size={20}/></button>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-10 pb-32">
      {/* 1. 뷰 기본 정보 섹션 */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <label className="text-[11px] font-black text-slate-400 block mb-4 uppercase tracking-widest px-2">현재 화면(View) 기본 정보</label>
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setIsIconPickerOpen(true)} 
            className="w-16 h-16 shrink-0 bg-indigo-50 border-2 border-indigo-100 rounded-[1.5rem] flex items-center justify-center text-indigo-600 hover:border-indigo-400 hover:shadow-md transition-all group"
          >
            {view.icon && IconMap[view.icon] ? 
              React.createElement(IconMap[view.icon], { size: 32, className: "group-hover:scale-110 transition-transform" }) : 
              <Star size={32} className="text-indigo-200 group-hover:text-indigo-400"/>
            }
          </button>
          <input 
            className="flex-1 p-5 rounded-[1.5rem] border-2 border-slate-100 text-3xl font-black outline-none focus:border-indigo-500 transition-all text-slate-900" 
            value={view.name} 
            onChange={e => onUpdate({...view, name: e.target.value})} 
            placeholder="화면 이름을 입력하세요" 
          />
        </div>
      </section>

      {/* 2. 데이터 연결 및 서버 필터링 설정 섹션 */}
      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-600 relative overflow-hidden">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Database size={24}/></div>
            <div>
              <h2 className="text-xl font-black text-slate-900">1. 데이터 연결 및 서버 필터링</h2>
              <p className="text-sm text-slate-500 font-bold">테이블을 선택하고 필터링 조건을 설정하세요.</p>
            </div>
          </div>
          
          {/* 🔥 데이터 확인 버튼 추가 */}
          {view.tableName && (
            <button 
              onClick={fetchPreviewData} 
              className="px-6 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-black text-sm flex items-center gap-2 transition-colors border border-indigo-200"
            >
              <Eye size={18} /> 설정된 데이터 미리보기
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1">연결 테이블</label>
              <select 
                className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" 
                value={view.tableName || ''} 
                onChange={e => onUpdate({...view, tableName: e.target.value, filterColumn: null, layoutRows: []})}
              >
                <option value="">테이블 선택</option>
                {Object.keys(schemaData).map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5"><Filter size={14}/> 필터 기준 칼럼 (학년/반/상태 등)</label>
              <select 
                className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-indigo-600 outline-none focus:border-indigo-500 transition-all cursor-pointer" 
                value={view.filterColumn || ''} 
                onChange={e => onUpdate({...view, filterColumn: e.target.value || null})}
              >
                <option value="">필터 없음 (전체 데이터 가져오기)</option>
                {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
              </select>
            </div>
          </div>

          <div className="bg-slate-50/50 rounded-3xl p-6 border-2 border-dashed border-slate-200 flex flex-col justify-center">
            {view.filterColumn ? (
              <div className="space-y-4 animate-in zoom-in-95 duration-300">
                <div className="flex gap-2 items-center text-indigo-600 font-black mb-2 text-sm"><Filter size={16}/> 상세 조건 설정</div>
                <div className="flex gap-3">
                  <select 
                    className="flex-1 p-3 rounded-xl border-2 border-indigo-100 font-bold text-sm outline-none bg-white cursor-pointer" 
                    value={view.filterOperator || 'eq'} 
                    onChange={e => onUpdate({...view, filterOperator: e.target.value as any})}
                  >
                    <option value="eq">일치 (=)</option>
                    <option value="like">포함 (Contains)</option>
                    <option value="gt">큼 (&gt;)</option>
                    <option value="lt">작음 (&lt;)</option>
                  </select>
                  <input 
                    className="flex-[2] p-3 rounded-xl border-2 border-indigo-100 font-bold text-sm outline-none bg-white focus:border-indigo-500" 
                    value={view.filterValue || ''} 
                    onChange={e => onUpdate({...view, filterValue: e.target.value})} 
                    placeholder="예: 1, 완료" 
                  />
                </div>
              </div>
            ) : (
              <div className="text-center space-y-3">
                <Smartphone className="mx-auto text-slate-300" size={40}/>
                <p className="text-xs text-slate-400 font-bold leading-relaxed">좌측에서 칼럼을 선택하면<br/>서버 필터를 설정할 수 있습니다.</p>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-slate-50">
          <div>
            <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1">카드 가로 배치 (열 개수)</label>
            <select 
              className="w-full p-4 rounded-2xl bg-white border-2 border-slate-100 font-black text-slate-800 cursor-pointer outline-none focus:border-indigo-500" 
              value={view.columnCount || 1} 
              onChange={e => onUpdate({...view, columnCount: Number(e.target.value)})}
            >
              {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}열 {n === 1 ? '(리스트 형태)' : `(${n}단 격자 형태)`}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5"><MousePointerClick size={14} className="text-indigo-500"/> 카드 클릭 액션</label>
            <select 
              className="w-full p-4 rounded-2xl bg-indigo-50/30 border-2 border-indigo-100 font-black text-slate-800 focus:border-indigo-600 outline-none cursor-pointer" 
              value={view.onClickActionId || ''} 
              onChange={e => onUpdate({...view, onClickActionId: e.target.value || null})}
            >
              <option value="">(클릭 동작 없음)</option>
              {actions.map(act => <option key={act.id} value={act.id}>⚡ {act.name}</option>)}
            </select>
          </div>
        </div>
      </section>

      {/* 3. 카드 레이아웃 설계 섹션 */}
      <section className={`bg-white p-10 rounded-[3.5rem] shadow-2xl border-2 border-indigo-50 relative overflow-hidden transition-all duration-500 ${!view.tableName ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
        <div className="absolute top-0 left-0 w-3 h-full bg-indigo-600"></div>
        <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl"><LayoutTemplate size={28}/></div>
            <h3 className="text-2xl font-black text-indigo-900">2. 카드 레이아웃 커스텀 설계</h3>
          </div>
          <button onClick={addRootRow} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"><Plus size={18}/> 행(Row) 추가하기</button>
        </div>
        
        <div className="space-y-4">
          {view.layoutRows.map(row => <RenderRowEditor key={row.id} row={row} depth={0} />)}
          {view.layoutRows.length === 0 && (
            <div className="py-24 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 gap-4 bg-slate-50/50">
              <Plus size={48} className="opacity-20"/>
              <p className="font-black text-slate-400">우측 상단의 버튼을 눌러 카드 디자인을 시작하세요</p>
            </div>
          )}
        </div>
      </section>

      {/* 아이콘 피커 모달 */}
      <IconPicker 
        isOpen={isIconPickerOpen} 
        onClose={() => setIsIconPickerOpen(false)} 
        selectedIcon={view.icon} 
        onSelect={(n: string) => onUpdate({...view, icon: n})} 
      />

      {/* 🔥 데이터 미리보기 모달 (추가됨) */}
      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[700] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-6 border-b flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <TableProperties className="text-indigo-600" size={24} />
                <h3 className="text-xl font-black text-slate-800">
                  [{view.tableName}] 테이블 미리보기 
                  <span className="text-sm text-indigo-600 ml-3 bg-indigo-100 px-3 py-1 rounded-full">
                    {previewData.length}건 검색됨
                  </span>
                </h3>
              </div>
              <button onClick={() => setIsPreviewModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X /></button>
            </div>
            
            <div className="flex-1 overflow-auto p-0 relative bg-slate-100">
              {isLoadingPreview ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-indigo-600 bg-white/50">
                  <Loader2 className="animate-spin" size={40} />
                  <p className="font-bold">데이터를 불러오는 중...</p>
                </div>
              ) : previewData.length === 0 ? (
                <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-lg">
                  조건에 맞는 데이터가 없습니다. 필터 설정을 확인해주세요.
                </div>
              ) : (
                <table className="w-full text-left border-collapse bg-white">
                  <thead className="bg-slate-900 text-white sticky top-0 z-10">
                    <tr>
                      {availableColumns.map(col => (
                        <th key={col} className="p-4 text-xs font-black uppercase tracking-wider border-b border-slate-700 whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.map((row, idx) => (
                      <tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/50 transition-colors">
                        {availableColumns.map(col => (
                          <td key={col} className="p-4 text-sm font-medium text-slate-700 whitespace-nowrap max-w-[200px] truncate">
                            {row[col] !== null ? String(row[col]) : <span className="text-slate-300 italic">null</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}