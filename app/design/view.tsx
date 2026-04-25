// 파일 경로: app/design/view.tsx
"use client";

import React, { useState } from 'react';
import { View, SchemaData, LayoutRow, Action, LayoutCell, VirtualTable, GroupAggregation } from './types';
import { 
  Database, LayoutTemplate, Plus, Columns, Rows, ChevronLeft, 
  ChevronRight, X, MousePointerClick, Star, Filter, Search, Smartphone, Eye, Loader2, TableProperties, ArrowUpDown, FolderTree, Trash2, Minus, Wand2, Image as ImageIcon, Type, Sparkles, AlignLeft, AlignCenter, AlignRight, Lock, Zap, Settings2, ArrowUpCircle
} from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import IconPicker, { IconMap } from './picker';
import { FORMULA_EXAMPLES, FormulaCategory, FormulaExample } from './formulas';
import { resolveVirtualData, evaluateExpression } from '../preview/[appId]/utils';
import FormatModal from './FormatModal';


// 🔥 [신규] 수식 예시 가이드 팝업 컴포넌트 (메뉴얼 수준 가이드)
const FormulaHelpModal = ({ onClose, onSelect }: { onClose: () => void, onSelect: (code: string) => void }) => {
  const [activeCategory, setActiveCategory] = useState(FORMULA_EXAMPLES[0].category);

  return (
    <div className="fixed inset-0 z-[2000] bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl h-[80vh] rounded-[3rem] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300 border-4 border-indigo-100">
        <div className="p-8 border-b flex justify-between items-center bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg ring-4 ring-indigo-100"><Sparkles size={24}/></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">수식 예시 대백과</h3>
              <p className="text-xs font-bold text-indigo-500">원하는 수식을 클릭하여 즉시 적용하세요.</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 text-slate-400 hover:bg-slate-100 rounded-full transition-all hover:rotate-90"><X size={24}/></button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* 사이드바 카테고리 */}
          <div className="w-64 bg-slate-50 border-r border-slate-100 p-6 space-y-2 overflow-y-auto">
            {FORMULA_EXAMPLES.map(cat => {
              const IconMap: Record<string, any> = {
                'database': Database,
                'math': ArrowUpDown,
                'branch': FolderTree,
                'terminal': Settings2,
                'sparkles': Sparkles,
                'link': Zap, // link 대신 Zap 사용
                'shield-check': Lock, // shield-check 대신 Lock 사용
              };
              const Icon = IconMap[cat.iconType as string] || Sparkles;
              return (
                <button 
                  key={cat.category}
                  onClick={() => setActiveCategory(cat.category)}
                  className={`w-full flex items-center gap-3 px-4 py-4 rounded-2xl text-[13px] font-black transition-all ${activeCategory === cat.category ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:bg-white hover:shadow-sm'}`}
                >
                  <Icon size={18} strokeWidth={3}/>
                  {cat.category.split('. ')[1] || cat.category}
                </button>
              );
            })}
          </div>

          {/* 메인 예시 리스트 */}
          <div className="flex-1 p-8 overflow-y-auto bg-white">
            <div className="grid grid-cols-1 gap-6">
              {FORMULA_EXAMPLES.find(c => c.category === activeCategory)?.items.map((item, i) => (
                <div key={i} className="group p-6 rounded-[2rem] border-2 border-slate-100 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all relative">
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="text-base font-black text-slate-800 group-hover:text-indigo-700 transition-colors">{item.title}</h4>
                    <button 
                      onClick={() => { onSelect(item.code); onClose(); }} 
                      className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black shadow-md hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      이 수식 사용하기
                    </button>
                  </div>
                  <div className="bg-slate-900 rounded-2xl p-4 font-mono text-[13px] text-emerald-400 mb-2 shadow-inner border border-slate-800">
                    {item.code}
                  </div>
                  <p className="text-xs font-bold text-slate-400 pl-1">💡 {item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

interface ViewEditorProps {
  view: View;
  schemaData: SchemaData;
  actions: Action[];
  virtualTables?: VirtualTable[];
  onUpdate: (updated: View) => void;
}

// ── [신규] 정렬 설정 서브 컴포넌트 (모듈화) ──
const SortConfigSection = ({ 
  label, 
  column, 
  direction, 
  availableColumns, 
  onColumnChange, 
  onDirectionChange,
  isSecondary = false
}: {
  label: string;
  column: string | null | undefined;
  direction: 'asc' | 'desc' | undefined;
  availableColumns: string[];
  onColumnChange: (val: string | null) => void;
  onDirectionChange: (val: 'asc' | 'desc') => void;
  isSecondary?: boolean;
}) => (
  <div className={`p-5 rounded-2xl border transition-all ${isSecondary ? 'bg-slate-50/80 border-slate-100 mt-3' : 'bg-indigo-50/50 border-indigo-50'}`}>
    <label className={`text-[10px] font-black block mb-3 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap ${isSecondary ? 'text-slate-400' : 'text-indigo-600'}`}>
      <ArrowUpDown size={14}/> {label}
    </label>
    <select 
      className="w-full p-3 rounded-xl bg-white border border-slate-200 font-black text-slate-800 cursor-pointer outline-none focus:border-indigo-400 transition-all" 
      value={column || ''} 
      onChange={e => onColumnChange(e.target.value || null)}
    >
      <option value="">{isSecondary ? '(2차 정렬 없음)' : '기본 정렬 (DB 설정순)'}</option>
      {availableColumns.map((col: string) => <option key={col} value={col}>{col}</option>)}
    </select>
    {column && (
      <div className="mt-3 animate-in fade-in slide-in-from-top-2">
        <select 
          className="w-full p-3 rounded-xl bg-white border border-slate-200 font-black text-slate-600 cursor-pointer outline-none focus:border-indigo-400" 
          value={direction || 'desc'} 
          onChange={e => onDirectionChange(e.target.value as any)}
        >
          <option value="desc">내림차순 (가장 큰/최신 값부터)</option>
          <option value="asc">오름차순 (가장 작은/과거 값부터)</option>
        </select>
      </div>
    )}
  </div>
);

export default function ViewEditor({ view, schemaData, actions, virtualTables = [], onUpdate }: ViewEditorProps) {
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [formatModalCell, setFormatModalCell] = useState<LayoutCell | null>(null);

  // --- [신규] 가상 테이블 및 컬럼 계산 로직 ---
  const isVirtual = view.tableName?.startsWith('vt_');
  const virtualTable = isVirtual ? virtualTables.find(vt => vt.id === view.tableName) : null;
  const baseTableName = virtualTable ? virtualTable.baseTableName : view.tableName;
  
  const availableColumns = baseTableName ? [
    ...(schemaData[baseTableName] || []),
    ...(virtualTable ? virtualTable.columns.map(c => c.name) : [])
  ] : [];
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [tempKeyColumn, setTempKeyColumn] = useState<string>('');
  const [previewSortConfig, setPreviewSortConfig] = useState<{column: string, direction: 'asc'|'desc'} | null>(null);
  const [isFormulaHelpOpen, setIsFormulaHelpOpen] = useState(false);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const fetchPreviewData = async (options: { ignoreFormulaFilter?: boolean } = { ignoreFormulaFilter: true }) => {
    if (!view.tableName) return alert("먼저 테이블을 선택해주세요.");
    
    // [스마트 기본값] id가 있으면 자동으로 선택, 이미 저장된게 있으면 그것을 우선함
    const defaultKey = view.lockedKeyColumn || (availableColumns.includes('id') ? 'id' : '');
    setTempKeyColumn(defaultKey);
    setSelectedKeys(view.lockedRecordKeys || []);

    setIsPreviewModalOpen(true); 
    setIsLoadingPreview(true);
    setPreviewData([]); 
    setLastSelectedIndex(null);
    setSearchTerm('');

    try {
      // 1. 데이터 가져오기 (가상이면 베이스 테이블에서 가져옴)
      if (isVirtual && !virtualTable) {
        throw new Error(`가상 테이블 정의를 찾을 수 없습니다: ${view.tableName}. 테이블 설정을 다시 확인해주세요.`);
      }
      if (!baseTableName) {
        throw new Error("연결된 테이블이 없습니다. 테이블 설정을 먼저 진행해주세요.");
      }
      
      // 가상 테이블은 Join/Formula 후처리가 무거우므로 디자인 프리뷰에서는 500건으로 제한
      const previewLimit = isVirtual ? 500 : 30000;
      let query = supabase.from(baseTableName!).select('*').limit(previewLimit); 
      
      // 🧠 [신규] 노코딩 스타일 지능형 필터 동기화
      if (view.filterColumn && view.filterValue !== undefined && view.filterValue !== null && view.filterValue !== '') {
        const op = view.filterOperator || 'eq';
        const val = String(view.filterValue || '').trim();
        const col = view.filterColumn;

        // 원본 테이블에 있는 컬럼인 경우에만 쿼리단에서 필터링
        if (schemaData[baseTableName!]?.includes(col)) {
          const now = new Date();
          const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

          if (val === 'today' || val === '오늘') {
            query = query.gte(col, isoToday).lte(col, `${isoToday}T23:59:59`);
          } else if (val === 'yesterday' || val === '어제') {
            const yestDate = new Date();
            yestDate.setDate(now.getDate() - 1);
            const isoYesterday = `${yestDate.getFullYear()}-${String(yestDate.getMonth() + 1).padStart(2, '0')}-${String(yestDate.getDate()).padStart(2, '0')}`;
            query = query.gte(col, isoYesterday).lte(col, `${isoYesterday}T23:59:59`);
          } else if (val === 'this_month' || val === '이번 달') {
            const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
            const lastDayDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            const lastDay = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
            query = query.gte(col, firstDay).lte(col, `${lastDay}T23:59:59`);
          } else {
            switch (op) {
              case 'eq': query = query.eq(col, val); break;
              case 'neq': query = query.neq(col, val); break;
              case 'contains':
              case 'like': query = query.ilike(col, `%${val}%`); break;
              case 'starts': query = query.ilike(col, `${val}%`); break;
              case 'ends': query = query.ilike(col, `%${val}`); break;
              case 'gt': query = query.gt(col, val); break;
              case 'lt': query = query.lt(col, val); break;
              case 'gte': query = query.gte(col, val); break;
              case 'lte': query = query.lte(col, val); break;
              case 'is_null': query = query.is(col, null); break;
              case 'is_not_null': query = query.not(col, 'is', null); break;
              case 'in': query = query.in(col, val.split(',').map(s => s.trim()).filter(s => s !== '')); break;
              case 'between':
                if (val.includes('..')) {
                  const [start, end] = val.split('..').map(s => s.trim());
                  query = query.gte(col, start).lte(col, end);
                }
                break;
            }
          }
        }
      }

      // 정렬 적용
      if (view.sortColumn && schemaData[baseTableName!]?.includes(view.sortColumn)) {
        query = query.order(view.sortColumn, { ascending: view.sortDirection === 'asc' });
      }

      const { data, error } = await query;
      if (error) throw error;

      // 2. 가상 데이터 리졸빙 (Join & Formula 적용)
      let finalData = data || [];
      if (virtualTable) {
        finalData = await resolveVirtualData(finalData, virtualTable);
      }

      // 🧠 [신규] 프리뷰에서도 수식 필터(filterExpr) 적용
      // ⚠️ 수동 선택(Data Lock) 모달 등 명시적으로 요청된 경우에는 무시함
      if (view.filterExpr && !options.ignoreFormulaFilter) {
        finalData = finalData.filter((row: any) => {
          try {
            return evaluateExpression(view.filterExpr || 'true', row);
          } catch(e) { return true; }
        });
      }

      // 🔥 [핵심 보완] 이미 선택된 데이터가 누락된 경우 강제 병합
      const defaultKeyInFetch = view.lockedKeyColumn || (availableColumns.includes('id') ? 'id' : '');
      if (view.lockedRecordKeys?.length && defaultKeyInFetch) {
          const currentKeys = new Set(finalData.map(r => String(r[defaultKeyInFetch])));
          const missingKeys = view.lockedRecordKeys.filter(k => !currentKeys.has(k));
          
          if (missingKeys.length > 0) {
              const { data: missingData, error: missingError } = await supabase
                  .from(baseTableName!)
                  .select('*')
                  .in(defaultKeyInFetch, missingKeys);
              
              if (!missingError && missingData) {
                  let resolvedMissing = missingData;
                  if (virtualTable) {
                    resolvedMissing = await resolveVirtualData(missingData, virtualTable);
                  }
                  finalData = [...resolvedMissing, ...finalData];
              }
          }
      }

      setPreviewData(finalData);
    } catch (err: any) { alert("데이터 로드 실패: " + err.message); } 
    finally { setIsLoadingPreview(false); }
  };

  const mutate = (callback: (rows: LayoutRow[]) => void) => {
    const next = JSON.parse(JSON.stringify(view.layoutRows));
    callback(next); onUpdate({ ...view, layoutRows: next });
  };

  const addRootRow = () => onUpdate({ ...view, layoutRows: [...view.layoutRows, { id: `r_${Date.now()}`, flex: 1, cells: [{ id: `c_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }] });

  const RenderRowEditor = ({ row, depth = 0 }: { row: LayoutRow, depth: number }) => {
    // 깊이에 따른 스타일 차별화 (부모일수록 더 크고 뚜렷하게)
    const rowPadding = depth === 0 ? 'p-6' : depth === 1 ? 'p-4' : 'p-2';
    const rowGap = depth === 0 ? 'gap-5' : 'gap-3';
    const bgColor = depth === 0 ? 'bg-slate-100/50' : depth === 1 ? 'bg-slate-50' : 'bg-white';
    const borderWeight = depth === 0 ? 'border-2' : 'border';

    return (
    <div className={`flex ${rowGap} ${rowPadding} rounded-[2rem] ${borderWeight} border-slate-300 ${bgColor} relative mb-4 group/row transition-all w-fit shadow-sm`}>
      <div className="absolute -left-3 -top-3 flex items-center bg-indigo-600 text-white rounded-full shadow-lg opacity-0 group-hover/row:opacity-100 z-40 overflow-hidden transition-all border-2 border-white">
        <button onClick={(e) => { e.stopPropagation(); mutate(rows => { const f = (arr: any[]) => { for (const r of arr) { if (r.id === row.id) { r.flex = Math.max(1, (r.flex || 1) - 1); return true; } for (const c of r.cells) if (c.nestedRows && f(c.nestedRows)) return true; } return false; }; f(rows); }); }} className="p-1 hover:bg-indigo-700"><Minus size={14} strokeWidth={3}/></button>
        <span className="text-[10px] font-black px-1 whitespace-nowrap">{depth + 1}층 세로비율 : {row.flex || 1}</span>
        <button onClick={(e) => { e.stopPropagation(); mutate(rows => { const f = (arr: any[]) => { for (const r of arr) { if (r.id === row.id) { r.flex = (r.flex || 1) + 1; return true; } for (const c of r.cells) if (c.nestedRows && f(c.nestedRows)) return true; } return false; }; f(rows); }); }} className="p-1 hover:bg-indigo-700"><Plus size={14} strokeWidth={3}/></button>
      </div>
      <button onClick={() => mutate((rows: LayoutRow[]) => { const remove = (arr: LayoutRow[]) => { const idx = arr.findIndex((r: LayoutRow) => r.id === row.id); if (idx > -1) arr.splice(idx, 1); else arr.forEach((r: LayoutRow) => r.cells.forEach((c: LayoutCell) => { if(c.nestedRows) remove(c.nestedRows); })); }; remove(rows); })} className="absolute -right-3 -top-3 w-7 h-7 bg-slate-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 z-30 transition-all shadow-lg"><X size={14} strokeWidth={3} /></button>

      {row.cells.map(cell => (
        <div key={cell.id} className={`flex flex-col gap-2 border-2 ${cell.contentType === 'field' ? 'border-indigo-300' : cell.contentType === 'action' ? 'border-rose-300' : 'border-slate-200'} bg-white rounded-2xl p-4 min-h-[120px] shadow-sm relative transition-all shrink-0 ${cell.contentType === 'nested' ? 'w-fit' : 'w-[280px]'}`}>
          <div className="flex justify-between items-center bg-indigo-50 px-2 py-1 rounded-xl">
            <div className="flex items-center gap-1.5"><button onClick={() => mutate((rows: LayoutRow[]) => { const f = (arr: LayoutRow[]) => arr.forEach((r: LayoutRow) => r.cells.forEach((c: LayoutCell) => { if(c.id === cell.id) c.flex = Math.max(1, (c.flex || 1) - 1); if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-700 hover:scale-125 transition-transform p-1"><ChevronLeft size={16}/></button><span className="text-[11px] font-black text-indigo-700 tracking-tighter">가로:{cell.flex}</span><button onClick={() => mutate((rows: LayoutRow[]) => { const f = (arr: LayoutRow[]) => arr.forEach((r: LayoutRow) => r.cells.forEach((c: LayoutCell) => { if(c.id === cell.id) c.flex = (c.flex || 1) + 1; if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-700 hover:scale-125 transition-transform p-1"><ChevronRight size={16}/></button></div>
            <div className="flex items-center gap-1">
              {/* 3단계 제한 로직: depth가 2 미만일 때만 중첩 버튼 노출 */}
              {depth < 2 && (
                <button onClick={() => mutate((rows: LayoutRow[]) => { const f = (arr: LayoutRow[]) => arr.forEach((r: LayoutRow) => r.cells.forEach((c: LayoutCell) => { if(c.id === cell.id) { c.contentType = 'nested'; c.nestedRows = [{ id: `nr_${Date.now()}`, flex: 1, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }]; } else if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-400 hover:text-indigo-700 p-1" title="내부에 세로 레이아웃 추가"><Rows size={18}/></button>
              )}
              {row.cells.length > 1 && <button onClick={() => mutate((rows: LayoutRow[]) => { const f = (arr: LayoutRow[]) => arr.forEach((r: LayoutRow) => { const idx = r.cells.findIndex((c: LayoutCell) => c.id === cell.id); if (idx > -1) r.cells.splice(idx, 1); else r.cells.forEach((c: LayoutCell) => { if(c.nestedRows) f(c.nestedRows); }); }); f(rows); })} className="text-rose-300 hover:text-rose-600 p-1 transition-colors"><Trash2 size={16}/></button>}
            </div>
          </div>

          {cell.contentType === 'nested' ? (
            <div className="space-y-3 pt-2 h-full">
              {cell.nestedRows?.map(nr => <RenderRowEditor key={nr.id} row={nr} depth={depth + 1} />)}
              {/* 자식 Row 추가 시에도 3단계 검증 (이미 depth+1이 렌더링되므로 여기서도 depth 체크) */}
              {depth < 2 && (
                <button onClick={() => mutate((rows: LayoutRow[]) => { const f = (arr: LayoutRow[]) => arr.forEach((r: LayoutRow) => r.cells.forEach((c: LayoutCell) => { if(c.id === cell.id) (c.nestedRows || (c.nestedRows = [])).push({ id: `nr_${Date.now()}`, flex: 1, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }); if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="w-full py-3 border-2 border-dashed border-slate-200 text-[10px] font-black text-slate-400 rounded-xl hover:bg-slate-50 transition-colors">+ 세로 분할 추가</button>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <select className={`flex-1 p-3 text-xs font-black bg-slate-50 border-2 rounded-xl outline-none transition-all ${cell.contentType !== 'empty' ? 'text-indigo-700 border-indigo-200' : 'text-slate-500 border-slate-200 focus:border-indigo-500'}`} value={(cell.contentType === 'action' ? 'act_' : '') + (cell.contentValue || '')} onChange={e => { const val = e.target.value; mutate((rows: LayoutRow[]) => { const f = (arr: LayoutRow[]) => arr.forEach((r: LayoutRow) => r.cells.forEach((c: LayoutCell) => { if(c.id === cell.id) { if (val.startsWith('act_')) { c.contentType = 'action'; c.contentValue = val.replace('act_', ''); } else { c.contentType = val ? 'field' : 'empty'; c.contentValue = val; } } else if(c.nestedRows) f(c.nestedRows); })); f(rows); }); }}>
                <option value="">-- 데이터/액션 선택 --</option>
                <optgroup label="테이블 컬럼">{availableColumns.map((col: string) => <option key={col} value={col}>{col}</option>)}</optgroup>
                <optgroup label="액션(기능)">{actions.map((a: Action) => <option key={a.id} value={`act_${a.id}`}>⚡ {a.name}</option>)}</optgroup>
              </select>
              {(cell.contentType === 'field' || cell.contentType === 'action') && (
                <button onClick={() => setFormatModalCell(cell)} className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all ${(cell.isImage || cell.textRegexPattern || cell.textSize || cell.buttonShape) ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100 border border-indigo-100'}`} title="데이터 꾸미기"><Wand2 size={18} strokeWidth={2.5}/></button>
              )}
            </div>
          )}
        </div>
      ))}
      <button onClick={() => mutate((rows: LayoutRow[]) => { const f = (arr: LayoutRow[]) => arr.forEach((r: LayoutRow) => { if(r.id === row.id) r.cells.push({ id: `c_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }); r.cells.forEach((c: LayoutCell) => { if(c.nestedRows) f(c.nestedRows); }); }); f(rows); })} className="w-12 shrink-0 flex items-center justify-center bg-indigo-600 text-white rounded-2xl shadow-md hover:bg-indigo-700 transition-colors hover:scale-105"><Columns size={20}/></button>
    </div>
    );
  };

  return (
    <div className="w-full min-w-fit mx-auto space-y-10 pb-32">
      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-4 duration-500 min-w-max">
        <label className="text-[11px] font-black text-slate-400 block mb-4 uppercase tracking-widest px-2">현재 화면(View) 기본 정보</label>
        <div className="flex items-center gap-6">
          <button onClick={() => setIsIconPickerOpen(true)} className="w-16 h-16 shrink-0 bg-indigo-50 border-2 border-indigo-100 rounded-[1.5rem] flex items-center justify-center text-indigo-600 hover:border-indigo-400 hover:shadow-md transition-all group">
            {view.icon && IconMap[view.icon] ? React.createElement(IconMap[view.icon], { size: 32, className: "group-hover:scale-110 transition-transform" }) : <Star size={32} className="text-indigo-200 group-hover:text-indigo-400"/>}
          </button>
          <input className="flex-1 p-5 rounded-[1.5rem] border-2 border-slate-100 text-3xl font-black outline-none focus:border-indigo-500 transition-all text-slate-900 min-w-[300px]" value={view.name} onChange={e => onUpdate({...view, name: e.target.value})} placeholder="화면 이름을 입력하세요" />
        </div>
        <div className="mt-8 pt-6 border-t border-slate-100 whitespace-normal">
          <label className="text-[12px] font-black text-slate-600 block px-2 mb-3 tracking-tight">메뉴 버튼 표시 위치 (Nav Position)</label>
          <div className="flex gap-3 px-2 flex-wrap min-w-[400px]">
            <button onClick={() => onUpdate({ ...view, navPosition: 'both' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(!view.navPosition || view.navPosition === 'both') ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>🔸 모두 노출 (상단/하단)</button>
            <button onClick={() => onUpdate({ ...view, navPosition: 'top' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(view.navPosition === 'top') ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>🔹 상단 숨김버튼 전용</button>
            <button onClick={() => onUpdate({ ...view, navPosition: 'bottom' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(view.navPosition === 'bottom') ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>🔹 하단 메뉴바 전용</button>
            <button onClick={() => onUpdate({ ...view, navPosition: 'hidden' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(view.navPosition === 'hidden') ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>🚫 모두 숨김</button>
          </div>
          <p className="text-[11px] font-bold text-slate-400 px-3 mt-3 w-full max-w-[800px] whitespace-normal">※ 이 화면으로 진입할 수 있는 바로가기 메뉴가 어디에 표시될지 결정합니다. 다른 화면에서 이동 액션으로 연결하려면 '숨김'으로 설정하세요.</p>
        </div>
      </section>

      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-600 relative overflow-hidden">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-3 text-white rounded-2xl shadow-lg transition-colors ${view.lockedRecordKeys?.length ? 'bg-rose-500' : 'bg-indigo-600'}`}>
              <Database size={24}/>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 whitespace-nowrap">1. 데이터 조회 규칙 설정</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {view.lockedRecordKeys?.length ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                    <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1.5 shadow-sm">
                      <Lock size={12}/> 수동 선택 모드 활성화 ({view.lockedRecordKeys.length}개 고정됨)
                    </span>
                    <button 
                      onClick={() => onUpdate({ ...view, lockedRecordKeys: [], lockedKeyColumn: undefined, isLocked: false })}
                      className="text-[10px] font-black text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg transition-all border border-transparent hover:border-rose-100"
                    >
                      [전체 조회로 복구]
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 font-bold whitespace-nowrap">어떤 데이터를 어떻게 보여줄지(필터링/정렬/그룹화) 설정하세요.</p>
                )}
              </div>
            </div>
          </div>
          {view.tableName && (
            <button 
              onClick={() => fetchPreviewData({ ignoreFormulaFilter: true })} 
              className={`px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all border whitespace-nowrap ${view.lockedRecordKeys?.length ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}
            >
              <Eye size={18} /> {view.lockedRecordKeys?.length ? '수동 선택(Pick) 수정하기' : '설정 확인 및 데이터 수동 픽(Pick)'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-8 min-w-max w-full">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1">연결 테이블</label>
              <select 
                className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" 
                value={view.tableName || ''} 
                onChange={e => onUpdate({...view, tableName: e.target.value, filterColumn: null, filterValue: null, filterExpr: '', sortColumn: null, groupByColumn: null, layoutRows: []})}
              >
                <option value="">테이블 선택</option>
                <optgroup label="데이터베이스 테이블 (Supabase)">
                  {Object.keys(schemaData).sort().map((t: string) => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                {virtualTables.length > 0 && (
                  <optgroup label="가상 테이블 (Virtual)">
                    {virtualTables.map((vt: VirtualTable) => <option key={vt.id} value={vt.id}>🔑 {vt.name} (가상)</option>)}
                  </optgroup>
                )}
              </select>
            </div>
            <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5"><Filter size={14}/> 1단계 서버 필터 (선택사항)</label><select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-indigo-600 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={view.filterColumn || ''} onChange={e => {
              const col = e.target.value || null;
              onUpdate({...view, filterColumn: col, filterValue: col ? view.filterValue : null, filterExpr: col ? view.filterExpr : ''});
            }}><option value="">필터 없음 (전체 데이터 가져오기)</option>{availableColumns.map((col: string) => <option key={col} value={col}>{col}</option>)}</select></div>
          </div>
          <div className="bg-slate-50/50 rounded-3xl p-6 border-2 border-dashed border-slate-200 flex flex-col justify-center">
            {view.filterColumn ? (
              <div className="space-y-5 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 items-center text-indigo-600 font-black text-sm whitespace-nowrap">
                    <Sparkles size={16} className="text-amber-500 animate-pulse"/> 스마트 조건 빌더
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <select 
                    className="w-full p-3.5 rounded-xl border-2 border-indigo-100 font-bold text-sm text-slate-900 outline-none bg-white cursor-pointer transition-all focus:border-indigo-500" 
                    value={view.filterOperator || 'eq'} 
                    onChange={e => onUpdate({...view, filterOperator: e.target.value as any})}
                  >
                    <option value="eq">일치함 (=)</option>
                    <option value="neq">일치하지 않음 (!=)</option>
                    <option value="contains">포함함 (Contains)</option>
                    <option value="starts">로 시작함</option>
                    <option value="ends">로 끝남</option>
                    <option value="gt">보다 이후/큼 (&gt;)</option>
                    <option value="lt">보다 이전/작음 (&lt;)</option>
                    <option value="gte">이후/크거나 같음 (&gt;=)</option>
                    <option value="lte">이전/작거나 같음 (&lt;=)</option>
                    <option value="in">목록에 포함 (A, B, C)</option>
                    <option value="between">범위 내 (A..B)</option>
                    <option value="is_null">비어 있음</option>
                    <option value="is_not_null">값이 있음</option>
                  </select>

                  {!view.filterOperator?.includes('null') && (
                    <div className="space-y-3">
                      <input 
                        className="w-full p-3.5 rounded-xl border-2 border-indigo-100 font-bold text-sm text-slate-900 outline-none bg-white focus:border-indigo-500 transition-all shadow-sm" 
                        value={view.filterValue || ''} 
                        onChange={e => onUpdate({...view, filterValue: e.target.value})} 
                        placeholder={view.filterOperator === 'between' ? "예: 10..50 또는 2024-01-01..2024-01-31" : "비교할 값을 입력하세요..."} 
                      />
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { id: 'today', label: '오늘', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                          { id: 'yesterday', label: '어제', color: 'bg-slate-50 text-slate-600 border-slate-200' },
                          { id: 'this_month', label: '이번 달', color: 'bg-blue-50 text-blue-600 border-blue-100' },
                          { id: 'me', label: '나(본인)', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' }
                        ].map((chip: {id: string, label: string, color: string}) => (
                          <button 
                            key={chip.id} type="button"
                            onClick={() => onUpdate({ ...view, filterValue: chip.id })}
                            className={`px-3 py-1.5 rounded-lg text-[10px] font-black border transition-all hover:scale-105 active:scale-95 ${view.filterValue === chip.id ? 'bg-indigo-600 text-white border-indigo-600 shadow-md' : chip.color}`}
                          >
                            + {chip.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
<div className="text-center space-y-3"><Smartphone className="mx-auto text-slate-300" size={40}/><p className="text-xs text-slate-400 font-bold leading-relaxed whitespace-nowrap">필요한 경우 좌측에서 칼럼을<br/>선택해 데이터를 필터링하세요.</p></div>)}
          </div>
        </div>

        {/* 🔥 [신규] 2단계 고급 데이터 필터 수식 (JS Expression) */}
        <div className="mt-8 pt-8 border-t border-slate-100 space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-indigo-500 text-white rounded-lg shadow-sm"><Sparkles size={16} className="animate-pulse"/></div>
              <div>
                <label className="text-sm font-black text-slate-900 tracking-tight">2단계 고급 수식 필터 (Advanced Logic)</label>
                <p className="text-[10px] font-bold text-slate-400">문자열과 날짜를 자유롭게 조합하여 정교한 필터링을 수행합니다.</p>
              </div>
            </div>
            <button 
              onClick={() => setIsFormulaHelpOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-[11px] font-black hover:bg-indigo-700 active:scale-95 transition-all shadow-md shadow-indigo-100 animate-bounce"
            >
              💡 수식 예시 가이드 확인
            </button>
          </div>
          
          <div className="relative group">
            <textarea 
              className="w-full p-6 rounded-[2rem] bg-indigo-50/20 border-2 border-indigo-100 font-mono text-xs font-bold text-slate-700 outline-none focus:border-indigo-500 h-32 shadow-inner transition-all placeholder:text-slate-400"
              value={view.filterExpr || ''}
              onChange={e => onUpdate({...view, filterExpr: e.target.value})}
              placeholder="예: isToday({{created_at}}) && {{status}} === '완료'"
            />
            <div className="absolute right-4 bottom-4 text-[9px] font-black text-indigo-400 bg-white/80 px-2 py-1 rounded-lg border border-indigo-50">
              JavaScript Expression Mode
            </div>
          </div>
          
          <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex gap-3 items-start">
            <div className="p-1.5 bg-amber-500 text-white rounded-lg"><Search size={14}/></div>
            <p className="text-[10px] font-bold text-amber-800 leading-relaxed">
              <span className="font-black">[안내]</span> 위 1단계 서버 필터(필요시 적용)가 먼저 실행된 후, 수식 필터가 최종적으로 데이터를 걸러냅니다.<br/>
              복합적인 논리(AND, OR)나 날짜 함수(`isToday` 등)를 자유롭게 활용하세요.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-slate-50 min-w-max w-full">
          <div className="space-y-6">
            <div className={`bg-blue-50/50 p-6 rounded-[2.5rem] border-2 border-blue-100 space-y-6 transition-all duration-500 ${!view.groupByColumn ? 'opacity-100' : 'bg-white shadow-xl border-blue-200 scale-105'}`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-[11px] font-black text-blue-600 block uppercase tracking-widest flex items-center gap-2">
                  <FolderTree size={16}/> 1차 데이터 묶어주기 (Primary Grouping)
                </label>
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-blue-100 scale-90 origin-right">
                  <button onClick={() => onUpdate({...view, groupAccordionMode: 'multiple'})} className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${view.groupAccordionMode === 'multiple' || !view.groupAccordionMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>다중 열림</button>
                  <button onClick={() => onUpdate({...view, groupAccordionMode: 'single'})} className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${view.groupAccordionMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>하나만 열림</button>
                </div>
              </div>
              <div className="flex gap-2">
                <select 
                  className="flex-1 p-4 rounded-2xl bg-white border-2 border-blue-200 font-black text-slate-800 cursor-pointer outline-none focus:border-blue-500 transition-all shadow-sm" 
                  value={view.groupByColumn || ''} 
                  onChange={e => onUpdate({...view, groupByColumn: e.target.value || null})}
                >
                  <option value="">묶지 않음 (일반 리스트 형태)</option>
                  {availableColumns.map((col: string) => <option key={col} value={col}>{col} 칼럼 기준으로 묶기</option>)}
                </select>
                {view.groupByColumn && (
                  <div className="flex bg-slate-100 p-1 rounded-2xl border-2 border-blue-200">
                    <button onClick={() => onUpdate({...view, groupSortDirection: 'asc'})} className={`px-3 rounded-xl text-[10px] font-black transition-all ${view.groupSortDirection === 'asc' || !view.groupSortDirection ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>ASC</button>
                    <button onClick={() => onUpdate({...view, groupSortDirection: 'desc'})} className={`px-3 rounded-xl text-[10px] font-black transition-all ${view.groupSortDirection === 'desc' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>DESC</button>
                  </div>
                )}
              </div>

              {view.groupByColumn && (
                <div className="space-y-6 pt-4 border-t border-blue-200 animate-in fade-in slide-in-from-top-4 duration-500">
                  {/* 그룹 바 디자인 */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">헤더 디자인 및 가공</label>
                      <button 
                        onClick={() => onUpdate({ ...view, groupHeaderIcon: 'Folder', groupHeaderAlign: 'left', groupHeaderColor: 'text-indigo-900', groupHeaderTextSize: 'text-[15px]', groupHeaderExpression: '' })}
                        className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        디자인 초기화
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">헤더 아이콘</label>
                        <select value={view.groupHeaderIcon || 'Folder'} onChange={e => onUpdate({...view, groupHeaderIcon: e.target.value})} className="w-full p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                          <option value="Folder">폴더</option><option value="Star">별</option><option value="Tag">태그</option><option value="User">사용자</option><option value="Circle">원형</option><option value="Hash">해시(#)</option><option value="Info">정보</option><option value="AlertCircle">경고</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">헤더 색상</label>
                        <select value={view.groupHeaderColor || 'text-indigo-900'} onChange={e => onUpdate({...view, groupHeaderColor: e.target.value})} className="w-full p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                          <option value="text-indigo-900">남색 (기본)</option><option value="text-slate-700">진회색</option><option value="text-emerald-700">초록색</option><option value="text-blue-700">파랑색</option><option value="text-rose-700">빨강색</option><option value="text-amber-700">주황색</option><option value="text-violet-700">보라색</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">글자 크기 및 정렬</label>
                        <div className="flex gap-1.5">
                          <select value={view.groupHeaderTextSize || 'text-[15px]'} onChange={e => onUpdate({...view, groupHeaderTextSize: e.target.value})} className="flex-1 p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                            <option value="text-xs">작게</option><option value="text-[14px]">보통</option><option value="text-[15px]">조금 크게</option><option value="text-lg">크게</option><option value="text-xl">매우 크게</option>
                          </select>
                          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                            {[
                              { id: 'left', icon: <AlignLeft size={14}/> },
                              { id: 'center', icon: <AlignCenter size={14}/> },
                              { id: 'right', icon: <AlignRight size={14}/> }
                            ].map((a: {id: string, icon: React.ReactNode}) => (
                              <button key={a.id} onClick={() => onUpdate({...view, groupHeaderAlign: a.id as any})} className={`p-2 rounded-lg transition-all ${view.groupHeaderAlign === a.id || (!view.groupHeaderAlign && a.id === 'left') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{a.icon}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">통계 표시 위치</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 h-[44px]">
                          <button 
                            onClick={() => onUpdate({...view, groupAggregationPosition: 'beside_label'})}
                            className={`flex-1 text-[9px] font-black rounded-lg transition-all ${view.groupAggregationPosition === 'beside_label' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                          >
                            이름 바로 옆
                          </button>
                          <button 
                            onClick={() => onUpdate({...view, groupAggregationPosition: 'right_end'})}
                            className={`flex-1 text-[9px] font-black rounded-lg transition-all ${view.groupAggregationPosition === 'right_end' || !view.groupAggregationPosition ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                          >
                            오른쪽 끝
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-indigo-500 pl-1 flex items-center gap-1"><Sparkles size={12}/> 헤더 가공 수식 (Expression)</label>
                      <input 
                        className="w-full p-4 rounded-2xl bg-white border border-indigo-100 font-mono text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400 transition-all shadow-inner"
                        value={view.groupHeaderExpression || ''}
                        onChange={e => onUpdate({...view, groupHeaderExpression: e.target.value})}
                        placeholder="예: val + ' (' + rowCount + '명)'"
                      />
                      <p className="text-[9px] font-bold text-slate-400 px-1 italic">※ 가용한 변수: val (그룹값), rowCount (그룹 데이터 개수)</p>
                    </div>
                  </div>

                  {/* 🔥 [신규] 상단 고정 옵션 (Sticky) */}
                  <div className="pt-4 border-t border-indigo-100">
                    <div className="flex items-center justify-between p-4 bg-slate-900 rounded-[1.5rem] border-2 border-amber-500 shadow-xl group hover:scale-[1.02] transition-all">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500 text-slate-900 rounded-lg shadow-inner"><ArrowUpCircle size={18}/></div>
                        <div>
                          <p className="text-xs font-black text-amber-400">그룹 헤더 상단 고정 (Sticky Mode)</p>
                          <p className="text-[9px] font-bold text-slate-400">스크롤을 내려도 묶음바가 상단에 달라붙습니다.</p>
                        </div>
                      </div>
                      <button 
                        onClick={() => onUpdate({...view, groupHeaderSticky: !view.groupHeaderSticky})}
                        className={`w-14 h-7 rounded-full p-1 flex items-center transition-all duration-300 ${view.groupHeaderSticky ? 'bg-amber-500' : 'bg-slate-700'}`}
                      >
                        <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${view.groupHeaderSticky ? 'translate-x-7' : 'translate-x-0'}`} />
                      </button>
                    </div>
                  </div>

                  {/* 통계 요약 엔진 */}
                  <div className="space-y-4 pt-4 border-t border-blue-100">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">그룹 요약 통계 (Aggregations)</label>
                      <button 
                        onClick={() => onUpdate({ ...view, groupAggregations: [...(view.groupAggregations || []), { id: `agg_${Date.now()}`, type: 'count', label: '합계', color: 'bg-indigo-50 text-indigo-600' }] })}
                        className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black hover:bg-indigo-100 transition-all border border-indigo-100"
                      >
                        <Plus size={12}/> 통계 추가
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(view.groupAggregations || []).map((agg: GroupAggregation, idx: number) => (
                        <div key={agg.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 animate-in slide-in-from-right-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black py-1 px-2.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">Summary #{idx+1}</span>
                            <button onClick={() => onUpdate({ ...view, groupAggregations: view.groupAggregations?.filter(a => a.id !== agg.id) })} className="text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">계산 방식</label>
                              <select 
                                value={agg.type} 
                                onChange={e => onUpdate({ ...view, groupAggregations: view.groupAggregations?.map(a => a.id === agg.id ? { ...a, type: e.target.value as any } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                              >
                                <option value="count">총 개수 (Count)</option>
                                <option value="sum">합계 (Sum)</option>
                                <option value="avg">평균 (Avg)</option>
                                <option value="count_if">조건부 개수 (Count If)</option>
                                <option value="unique_list">중복 제거 목록 (Unique List)</option>
                                <option value="list">전체 목록 (List)</option>
                                <option value="first">첫 번째 값 (First)</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">표시 라벨</label>
                              <input 
                                value={agg.label} 
                                onChange={e => onUpdate({ ...view, groupAggregations: view.groupAggregations?.map(a => a.id === agg.id ? { ...a, label: e.target.value } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                                placeholder="예: 참여인원"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">표시 형태</label>
                              <select 
                                value={agg.displayStyle || 'button'} 
                                onChange={e => onUpdate({ ...view, groupAggregations: view.groupAggregations?.map(a => a.id === agg.id ? { ...a, displayStyle: e.target.value as any } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                              >
                                <option value="button">알약형 (Button)</option>
                                <option value="text">글자만 (Text)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">대상 컬럼</label>
                              <select 
                                value={agg.column || ''} 
                                onChange={e => onUpdate({ ...view, groupAggregations: view.groupAggregations?.map(a => a.id === agg.id ? { ...a, column: e.target.value } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                              >
                                <option value="">컬럼 선택</option>
                                {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            
                            {(agg.type === 'sum' || agg.type === 'avg' || agg.type === 'count_if') && (
                              <div className="space-y-1.5 animate-in fade-in">
                                <label className="text-[9px] font-black text-amber-600 pl-1 flex items-center gap-1">
                                  <Sparkles size={10}/> {agg.type === 'count_if' ? '조건 수식 (JS)' : '가공 수식 (Target JS)'}
                                </label>
                                <input 
                                  value={agg.conditionValue || ''} 
                                  onChange={e => onUpdate({ ...view, groupAggregations: view.groupAggregations?.map(a => a.id === agg.id ? { ...a, conditionValue: e.target.value } : a) })}
                                  className="w-full p-2.5 text-[11px] rounded-xl border border-amber-200 font-mono font-bold bg-white outline-none focus:border-amber-400"
                                  placeholder={agg.type === 'count_if' ? "예: val === '완료'" : "예: val * 1.1"}
                                />
                                <p className="text-[8px] font-bold text-slate-400 px-1 leading-tight">
                                  {agg.type === 'count_if' ? '* val이 true면 카운트' : '* 가공된 값을 더함 (미입력 시 원본)'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!view.groupAggregations || view.groupAggregations.length === 0) && (
                        <div className="py-6 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300 gap-2">
                          <p className="text-[10px] font-black">추가된 요약 통계가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`bg-indigo-50/50 p-6 rounded-[2.5rem] border-2 border-indigo-100 space-y-6 transition-all duration-500 ${!view.groupByColumn ? 'opacity-30 pointer-events-none grayscale' : !view.groupByColumn2 ? 'opacity-100' : 'bg-white shadow-xl border-indigo-200 scale-105'}`}>
              <label className="text-[11px] font-black text-indigo-600 block uppercase tracking-widest flex items-center gap-2 px-1">
                <FolderTree size={16}/> 2차 데이터 묶어주기 (Sub Grouping)
              </label>
              <div className="flex gap-2">
                <select 
                  className="flex-1 p-4 rounded-2xl bg-white border-2 border-indigo-200 font-black text-slate-800 cursor-pointer outline-none focus:border-indigo-500 transition-all shadow-sm" 
                  value={view.groupByColumn2 || ''} 
                  onChange={e => onUpdate({...view, groupByColumn2: e.target.value || null})}
                >
                  <option value="">(2차 그룹 없음)</option>
                  {availableColumns.filter((c: string) => c !== view.groupByColumn).map((col: string) => <option key={col} value={col}>{col} 칼럼 기준으로 한 번 더 묶기</option>)}
                </select>
                {view.groupByColumn2 && (
                  <div className="flex bg-slate-100 p-1 rounded-2xl border-2 border-indigo-200">
                    <button onClick={() => onUpdate({...view, groupSortDirection2: 'asc'})} className={`px-3 rounded-xl text-[10px] font-black transition-all ${view.groupSortDirection2 === 'asc' || !view.groupSortDirection2 ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>ASC</button>
                    <button onClick={() => onUpdate({...view, groupSortDirection2: 'desc'})} className={`px-3 rounded-xl text-[10px] font-black transition-all ${view.groupSortDirection2 === 'desc' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>DESC</button>
                  </div>
                )}
              </div>

              {view.groupByColumn2 && (
                <div className="space-y-6 pt-4 border-t border-indigo-200 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">2차 헤더 디자인 및 가공</label>
                      <button 
                        onClick={() => onUpdate({ ...view, groupHeaderIcon2: 'Folder', groupHeaderAlign2: 'left', groupHeaderColor2: 'text-violet-700', groupHeaderTextSize2: 'text-[14px]', groupHeaderExpression2: '' })}
                        className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        디자인 초기화
                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">헤더 아이콘</label>
                        <select value={view.groupHeaderIcon2 || 'Folder'} onChange={e => onUpdate({...view, groupHeaderIcon2: e.target.value})} className="w-full p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                          <option value="Folder">폴더</option><option value="Star">별</option><option value="Tag">태그</option><option value="User">사용자</option><option value="Circle">원형</option><option value="Hash">해시(#)</option><option value="Info">정보</option><option value="AlertCircle">경고</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">헤더 색상</label>
                        <select value={view.groupHeaderColor2 || 'text-violet-700'} onChange={e => onUpdate({...view, groupHeaderColor2: e.target.value})} className="w-full p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                          <option value="text-violet-700">보라색 (기본)</option><option value="text-indigo-900">남색</option><option value="text-slate-700">진회색</option><option value="text-emerald-700">초록색</option><option value="text-blue-700">파랑색</option><option value="text-rose-700">빨강색</option><option value="text-amber-700">주황색</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">글자 크기 및 정렬</label>
                        <div className="flex gap-1.5">
                          <select value={view.groupHeaderTextSize2 || 'text-[14px]'} onChange={e => onUpdate({...view, groupHeaderTextSize2: e.target.value})} className="flex-1 p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                            <option value="text-xs">작게</option><option value="text-[14px]">보통</option><option value="text-[15px]">조금 크게</option><option value="text-lg">크게</option>
                          </select>
                          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                            {[
                              { id: 'left', icon: <AlignLeft size={14}/> },
                              { id: 'center', icon: <AlignCenter size={14}/> },
                              { id: 'right', icon: <AlignRight size={14}/> }
                            ].map((a: any) => (
                              <button key={a.id} onClick={() => onUpdate({...view, groupHeaderAlign2: a.id as any})} className={`p-2 rounded-lg transition-all ${view.groupHeaderAlign2 === a.id || (!view.groupHeaderAlign2 && a.id === 'left') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{a.icon}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">통계 표시 위치</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 h-[44px]">
                          <button 
                            onClick={() => onUpdate({...view, groupAggregationPosition2: 'beside_label'})}
                            className={`flex-1 text-[9px] font-black rounded-lg transition-all ${view.groupAggregationPosition2 === 'beside_label' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                          >
                            이름 바로 옆
                          </button>
                          <button 
                            onClick={() => onUpdate({...view, groupAggregationPosition2: 'right_end'})}
                            className={`flex-1 text-[9px] font-black rounded-lg transition-all ${view.groupAggregationPosition2 === 'right_end' || !view.groupAggregationPosition2 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                          >
                            오른쪽 끝
                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-indigo-500 pl-1 flex items-center gap-1"><Sparkles size={12}/> 2차 헤더 가공 수식 (Expression)</label>
                      <input 
                        className="w-full p-4 rounded-2xl bg-white border border-indigo-100 font-mono text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400 transition-all shadow-inner"
                        value={view.groupHeaderExpression2 || ''}
                        onChange={e => onUpdate({...view, groupHeaderExpression2: e.target.value})}
                        placeholder="예: val + ' (' + rowCount + '명)'"
                      />
                    </div>

                    {/* 🔥 2차 상단 고정 옵션 (Sticky) */}
                    <div className="pt-4 border-t border-indigo-100">
                      <div className="flex items-center justify-between p-4 bg-slate-900 rounded-[1.5rem] border-2 border-indigo-500 shadow-xl group hover:scale-[1.02] transition-all">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-indigo-500 text-slate-900 rounded-lg shadow-inner"><ArrowUpCircle size={18}/></div>
                          <div>
                            <p className="text-xs font-black text-amber-400">2차 그룹 헤더 상단 고정</p>
                            <p className="text-[9px] font-bold text-slate-400">1차 묶음바 아래에 2차 묶음바가 고정됩니다.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => onUpdate({...view, groupHeaderSticky2: !view.groupHeaderSticky2})}
                          className={`w-14 h-7 rounded-full p-1 flex items-center transition-all duration-300 ${view.groupHeaderSticky2 ? 'bg-amber-500' : 'bg-slate-700'}`}
                        >
                          <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${view.groupHeaderSticky2 ? 'translate-x-7' : 'translate-x-0'}`} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-indigo-200">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">2차 그룹 요약 통계</label>
                      <button 
                        onClick={() => onUpdate({ ...view, groupAggregations2: [...(view.groupAggregations2 || []), { id: `agg2_${Date.now()}`, type: 'count', label: '소계', color: 'bg-violet-50 text-violet-600', displayStyle: 'button' }] })}
                        className="flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-600 rounded-lg text-[10px] font-black hover:bg-violet-100 transition-all border border-violet-100"
                      >
                        <Plus size={12}/> 통계 추가
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(view.groupAggregations2 || []).map((agg: GroupAggregation, idx: number) => (
                        <div key={agg.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 animate-in slide-in-from-right-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black py-1 px-2.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">Sub-Summary #{idx+1}</span>
                            <button onClick={() => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.filter((a: GroupAggregation) => a.id !== agg.id) })} className="text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">계산 방식</label>
                              <select 
                                value={agg.type} 
                                onChange={e => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.map((a: GroupAggregation) => a.id === agg.id ? { ...a, type: e.target.value as any } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                              >
                                <option value="count">총 개수 (Count)</option>
                                <option value="sum">합계 (Sum)</option>
                                <option value="avg">평균 (Avg)</option>
                                <option value="count_if">조건부 개수 (Count If)</option>
                                <option value="unique_list">중복 제거 목록 (Unique List)</option>
                                <option value="list">전체 목록 (List)</option>
                                <option value="first">첫 번째 값 (First)</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">표시 라벨</label>
                              <input 
                                value={agg.label} 
                                onChange={e => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.map((a: GroupAggregation) => a.id === agg.id ? { ...a, label: e.target.value } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                                placeholder="예: 소계"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">표시 형태</label>
                              <select 
                                value={agg.displayStyle || 'button'} 
                                onChange={e => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.map((a: GroupAggregation) => a.id === agg.id ? { ...a, displayStyle: e.target.value as any } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                              >
                                <option value="button">알약형 (Button)</option>
                                <option value="text">글자만 (Text)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">대상 컬럼</label>
                              <select 
                                value={agg.column || ''} 
                                onChange={e => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.map((a: GroupAggregation) => a.id === agg.id ? { ...a, column: e.target.value } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                              >
                                <option value="">컬럼 선택</option>
                                {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            {(agg.type === 'sum' || agg.type === 'avg' || agg.type === 'count_if') && (
                              <div className="space-y-1.5 animate-in fade-in">
                                <label className="text-[9px] font-black text-amber-600 pl-1 flex items-center gap-1">
                                  <Sparkles size={10}/> {agg.type === 'count_if' ? '조건 수식 (JS)' : '가공 수식 (Target JS)'}
                                </label>
                                <input 
                                  value={agg.conditionValue || ''} 
                                  onChange={e => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.map((a: GroupAggregation) => a.id === agg.id ? { ...a, conditionValue: e.target.value } : a) })}
                                  className="w-full p-2.5 text-[11px] rounded-xl border border-amber-200 font-mono font-bold bg-white outline-none focus:border-amber-400"
                                  placeholder={agg.type === 'count_if' ? "예: val === '완료'" : "예: val * 1.1"}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-1">
              <SortConfigSection 
                label="1차 정렬 기준"
                column={view.sortColumn}
                direction={view.sortDirection}
                availableColumns={availableColumns}
                onColumnChange={val => onUpdate({ ...view, sortColumn: val, sortDirection: view.sortDirection || 'desc' })}
                onDirectionChange={val => onUpdate({ ...view, sortDirection: val })}
              />
              {view.sortColumn && (
                <SortConfigSection 
                  label="2차 정렬 (1차 기준이 같을 때)"
                  column={view.sortColumn2}
                  direction={view.sortDirection2}
                  availableColumns={availableColumns.filter(c => c !== view.sortColumn)}
                  onColumnChange={val => onUpdate({ ...view, sortColumn2: val, sortDirection2: view.sortDirection2 || 'desc' })}
                  onDirectionChange={val => onUpdate({ ...view, sortDirection2: val })}
                  isSecondary
                />
              )}
            </div>
          </div>
          <div className="space-y-6">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 block px-1 uppercase tracking-wider whitespace-nowrap">카드 가로 배치 (열 개수)</label>
              <select className="w-full p-3 rounded-xl bg-white border-2 border-slate-100 font-black text-slate-800 cursor-pointer outline-none focus:border-indigo-200" value={view.columnCount || 1} onChange={e => onUpdate({...view, columnCount: Number(e.target.value)})}>{[1, 2, 3, 4].map((n: number) => <option key={n} value={n}>{n}열 {n === 1 ? '(리스트 형태)' : `(${n}단 격자 형태)`}</option>)}</select>
            </div>


            
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5 whitespace-nowrap"><MousePointerClick size={14} className="text-indigo-500"/> 카드 클릭 액션</label>
              <select className="w-full p-3 rounded-xl bg-white border-2 border-slate-100 font-black text-slate-800 cursor-pointer outline-none" value={view.onClickActionId || ''} onChange={e => onUpdate({...view, onClickActionId: e.target.value || null})}>
                <option value="">(클릭 동작 없음)</option>
                {actions.map((act: Action) => <option key={act.id} value={act.id}>⚡ {act.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-rose-500 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5 whitespace-nowrap animate-pulse"><Zap size={14} /> 뷰 시작 시 자동 실행(Automation)</label>
              <select className="w-full p-3 rounded-xl bg-rose-50 border-2 border-rose-100 font-black text-rose-700 cursor-pointer outline-none focus:border-rose-300" value={view.onInitActionId || ''} onChange={e => onUpdate({...view, onInitActionId: e.target.value || null})}>
                <option value="">(자동 실행 없음 - 일반 모드)</option>
                {actions.map((act: Action) => <option key={act.id} value={act.id}>🚀 {act.name}</option>)}
              </select>
              <p className="text-[9px] font-bold text-rose-400 mt-1 px-1">* 뷰가 열리자마자 필터링된 데이터에 대해 위 액션을 수행합니다.</p>
            </div>
          </div>
        </div>
        
        {/* 🔥 [신규] 어댑티브 UI (조건부 노출/비활성화) 설정 섹션 */}
        <div className="mt-8 pt-8 border-t border-slate-100 min-w-max w-full">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md"><Settings2 size={20}/></div>
              <div>
                <h3 className="text-lg font-black text-slate-800">🚦 메뉴 노출 및 가용성 필터 (Adaptive UI)</h3>
                <p className="text-xs text-slate-500 font-bold">특정 조건에 따라 메뉴를 숨기거나 비활성화(잠금)합니다.</p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5"><Sparkles size={14} className="text-amber-500"/> 제어 조건 (JavaScript Expression)</label>
                  <textarea 
                    className="w-full p-4 rounded-2xl font-mono text-sm font-black outline-none transition-all shadow-lg border-4 border-slate-900 bg-white focus:ring-4 focus:ring-amber-500/20"
                    style={{ 
                      color: '#000000',
                      backgroundColor: '#ffffff',
                      minHeight: '120px'
                    }}
                    rows={4}
                    value={view.visibilityExpr || ''}
                    onChange={e => onUpdate({...view, visibilityExpr: e.target.value})}
                    placeholder="예: count('attendance_log', {date: 'today'}) > 0"
                  />
                  <div className="mt-3 p-4 bg-slate-900 rounded-2xl border-2 border-amber-500 shadow-xl">
                    <p className="text-[11px] font-black text-amber-400 leading-relaxed">
                      <Sparkles size={14} className="inline mr-1 mb-1"/> **수식 작성 가이드**: 결과가 **참(true)**일 때만 설정이 적용됩니다.<br/>
                      • `count('테이블', {'{조건}'}) &gt; 0`: 조건에 맞는 데이터가 존재할 때<br/>
                      • `currentUser().role === 'admin'`: 로그인한 사용자가 관리자일 때
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 block mb-4 uppercase tracking-wider px-1">조건 만족 시 처리 방식 (Behavior)</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onUpdate({ ...view, visibilityBehavior: 'hide' })}
                      className={`flex-1 py-3 rounded-xl text-xs font-black border-2 transition-all ${view.visibilityBehavior === 'hide' ? 'bg-slate-800 border-slate-800 text-white shadow-lg scale-105' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      🚫 메뉴에서 숨김
                    </button>
                    <button 
                      onClick={() => onUpdate({ ...view, visibilityBehavior: 'disable' })}
                      className={`flex-1 py-3 rounded-xl text-xs font-black border-2 transition-all ${view.visibilityBehavior === 'disable' ? 'bg-amber-600 border-amber-600 text-white shadow-lg scale-105' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      🔒 비활성화 (보이지만 못 누름)
                    </button>
                  </div>
                </div>

                {view.visibilityBehavior === 'disable' && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1">비활성화 시 상태 문구</label>
                    <input 
                      type="text"
                      className="w-full p-4 rounded-2xl bg-white border-2 border-amber-100 font-black text-amber-700 outline-none focus:border-amber-400 shadow-sm"
                      value={view.disabledLabel || ''}
                      onChange={e => onUpdate({...view, disabledLabel: e.target.value})}
                      placeholder="예: 오늘 감독 완료"
                    />
                    <p className="text-[9px] font-bold text-amber-400 mt-2 px-1">* 메뉴 아이콘 대신 이 텍스트가 표시되어 상태를 알려줍니다.</p>
                  </div>
                )}
              </div>
           </div>
        </div>
      </section>

      <section className={`bg-white p-10 rounded-[3.5rem] shadow-2xl border-2 border-indigo-50 relative transition-all duration-500 ${!view.tableName ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
        <div className="flex justify-between items-center mb-10 min-w-max border-b border-indigo-50 pb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl"><LayoutTemplate size={28}/></div>
            <div>
              <h3 className="text-2xl font-black text-indigo-900 whitespace-nowrap">2. 카드 레이아웃 커스텀 설계</h3>
              <p className="text-xs text-indigo-400 font-bold mt-1">카드에 보여줄 데이터의 배치와 높이를 결정합니다.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter px-1 flex items-center gap-1"><ArrowUpDown size={12}/> 카드 높이 모드</label>
              <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200">
                <button onClick={() => onUpdate({...view, cardHeightMode: 'auto'})} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${view.cardHeightMode === 'auto' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>자동 (Auto)</button>
                <button onClick={() => onUpdate({...view, cardHeightMode: 'fixed'})} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${view.cardHeightMode === 'fixed' || !view.cardHeightMode ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>고정 (Fixed)</button>
              </div>
            </div>

            {(!view.cardHeightMode || view.cardHeightMode === 'fixed') && (
              <div className="flex flex-col gap-2 min-w-[200px] animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">고정 높이: <span className="text-indigo-600">{view.cardHeight || 120}px</span></label>
                </div>
                <input 
                  type="range" min="40" max="400" step="5"
                  value={view.cardHeight || 120}
                  onChange={e => onUpdate({...view, cardHeight: Number(e.target.value)})}
                  className="w-full h-1.5 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                />
              </div>
            )}

            <div className="w-[1px] h-10 bg-slate-200 mx-1"></div>

            <button onClick={addRootRow} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"><Plus size={18}/> 행(Row) 추가</button>
          </div>
        </div>
        <div className="space-y-4 overflow-visible w-full min-w-fit mt-10">
          {view.layoutRows.map((row: LayoutRow) => <RenderRowEditor key={row.id} row={row} depth={0} />)}
          {view.layoutRows.length === 0 && (<div className="py-24 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 gap-4 bg-slate-50/50"><Plus size={48} className="opacity-20"/><p className="font-black text-slate-400">우측 상단의 버튼을 눌러 카드 디자인을 시작하세요</p></div>)}
        </div>
      </section>

      <IconPicker isOpen={isIconPickerOpen} onClose={() => setIsIconPickerOpen(false)} selectedIcon={view.icon} onSelect={(n: string) => onUpdate({...view, icon: n})} />
      
      {formatModalCell && (
        <FormatModal 
          cell={formatModalCell} 
          onClose={() => setFormatModalCell(null)} 
          availableColumns={availableColumns}
          onSave={(updatedData: LayoutCell) => { mutate((rows: LayoutRow[]) => { const f = (arr: LayoutRow[]) => arr.forEach((r: LayoutRow) => r.cells.forEach((c: LayoutCell) => { if(c.id === updatedData.id) Object.assign(c, updatedData); else if(c.nestedRows) f(c.nestedRows); })); f(rows); }); setFormatModalCell(null); }} 
        />
      )}

      {isFormulaHelpOpen && (
        <FormulaHelpModal 
          onClose={() => setIsFormulaHelpOpen(false)} 
          onSelect={(code) => onUpdate({...view, filterExpr: (view.filterExpr || '') + code})} 
        />
      )}

      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[700] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <TableProperties className="text-indigo-600" size={24} />
                <div>
                  <h3 className="text-lg font-black text-slate-800">[{view.tableName}] 쿼리 시뮬레이션 및 데이터 잠금</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-lg inline-block">총 {previewData.length}건 조회됨</p>
                    <p className="text-xs font-bold text-rose-600 bg-rose-100 px-2 py-0.5 rounded-lg inline-block">{selectedKeys.length}명 선택됨</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6 border-l pl-6 border-slate-200">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 leading-tight text-right mr-1">잠금 시 사용할<br/>식별자(PK) 칼럼</label>
                  <select value={tempKeyColumn} onChange={e => {
                      const selectedColumn = e.target.value;
                      setTempKeyColumn(selectedColumn);
                      setSelectedKeys([]); 
                      
                      if (selectedColumn) {
                        const sortedData = [...previewData].sort((a, b) => {
                          const valA = a[selectedColumn];
                          const valB = b[selectedColumn];
                          // null, undefined는 뒤로 보냄
                          if (valA === null || valA === undefined) return 1;
                          if (valB === null || valB === undefined) return -1;
                          // 숫자 포함 한글/영문 정렬 (localeCompare 활용)
                          return String(valA).localeCompare(String(valB), 'ko', { numeric: true });
                        });
                        setPreviewData(sortedData);
                      }
                  }} className="p-2.5 text-sm border-2 border-indigo-100 bg-white rounded-xl font-bold outline-none cursor-pointer text-indigo-700 focus:border-indigo-400">
                    <option value="">-- 고유 식별자 선택 필수 --</option>
                    {availableColumns.map((c: string) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button 
                  onClick={() => {
                    if (!tempKeyColumn) return alert('화면을 특정 데이터로 고정하려면 고유 식별자(PK) 칼럼을 먼저 선택해야 합니다.\n(예: 학번, 전화번호 등 중복되지 않는 칼럼)');
                    onUpdate({ ...view, isLocked: selectedKeys.length > 0, lockedKeyColumn: tempKeyColumn, lockedRecordKeys: selectedKeys });
                    setIsPreviewModalOpen(false);
                  }}
                  className={`px-8 py-3 rounded-xl font-black shadow-md flex items-center gap-2 transition-all ${tempKeyColumn ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95 shadow-indigo-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  선택 완료 및 적용
                </button>
                <button onClick={() => setIsPreviewModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-500 hover:text-slate-800 transition-colors shrink-0 ml-2"><X size={20}/></button>
              </div>
            </div>
            {/* Modal Body & Table Search Bar */}
            <div className="px-4 py-2.5 bg-slate-50 border-b flex items-center gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  placeholder="이름, 학번 등으로 학생 찾기..."
                  className="w-full pl-10 pr-4 py-2 bg-white border-2 border-slate-200 rounded-xl text-sm font-bold outline-none focus:border-indigo-500 transition-all shadow-sm"
                />
              </div>
              <div className="text-[10px] font-black text-slate-400 bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 uppercase tracking-tighter">
                * Shift + 클릭으로 범위 선택 가능
              </div>
            </div>
            <div className="flex-1 overflow-auto p-0 relative bg-slate-100">
               {isLoadingPreview ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-indigo-600 bg-white/50"><Loader2 className="animate-spin" size={40} /><p className="font-bold">데이터를 불러오는 중...</p></div>
               ) : previewData.length === 0 ? (
                 <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-lg">조건에 맞는 데이터가 없습니다. 쿼리 설정을 확인해주세요.</div>
               ) : (
                 <table className="w-full text-left border-separate border-spacing-0 bg-white">
                    <thead className="bg-slate-900 text-white sticky top-0 z-20 shadow-sm">
                      <tr>
                        {tempKeyColumn && (
                          <th className="p-4 w-12 text-center border-b border-slate-700 bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors group" onClick={() => {
                              // 선택된 항목 상단 정렬
                              const sortedBySelection = [...previewData].sort((a: any, b: any) => {
                                const isA = selectedKeys.includes(String(a[tempKeyColumn]));
                                const isB = selectedKeys.includes(String(b[tempKeyColumn]));
                                if (isA === isB) return 0;
                                return isA ? -1 : 1;
                              });
                              setPreviewData(sortedBySelection);
                              setLastSelectedIndex(null);
                          }}>
                            <div className="flex flex-col items-center gap-0.5">
                              <input type="checkbox" className="w-4 h-4 cursor-pointer accent-indigo-500 pointer-events-none" checked={selectedKeys.length === previewData.length && previewData.length > 0} readOnly />
                              <span className="text-[8px] font-black text-slate-500 group-hover:text-white uppercase leading-none">선택순</span>
                            </div>
                          </th>
                        )}
                        {availableColumns.map((col: string) => (
                          <th key={col} 
                            className={`p-4 text-xs font-black uppercase tracking-wider border-b border-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors ${col === tempKeyColumn ? 'bg-indigo-900 text-indigo-200' : ''}`}
                            onClick={() => {
                              let newDir: 'asc' | 'desc' = 'asc';
                              if (previewSortConfig?.column === col && previewSortConfig.direction === 'asc') newDir = 'desc';
                              setPreviewSortConfig({ column: col, direction: newDir });
                              
                              const sorted = [...previewData].sort((a: any, b: any) => {
                                const valA = a[col];
                                const valB = b[col];
                                if (valA === null || valA === undefined) return 1;
                                if (valB === null || valB === undefined) return -1;
                                const res = String(valA).localeCompare(String(valB), 'ko', { numeric: true });
                                return newDir === 'asc' ? res : -res;
                              });
                              setPreviewData(sorted);
                            }}
                          >
                            <div className="flex items-center gap-1">
                              {col} 
                              {col === tempKeyColumn && <span className="text-yellow-400">🔑</span>}
                              {previewSortConfig?.column === col && (
                                <span className="text-indigo-400 ml-1 text-[10px]">
                                  {previewSortConfig.direction === 'asc' ? '▲' : '▼'}
                                </span>
                              )}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {previewData
                        .filter((row: any) => {
                          if (!searchTerm) return true;
                          return Object.values(row).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()));
                        })
                        .slice(0, 500).map((row: any, idxInFiltered: number) => {
                        const rowKey = tempKeyColumn ? String(row[tempKeyColumn]) : null;
                        const isChecked = rowKey ? selectedKeys.includes(rowKey) : false;
                        return (
                          <tr key={idxInFiltered} className={`border-b hover:bg-indigo-50/50 transition-colors cursor-pointer select-none ${isChecked ? 'bg-indigo-50 border-indigo-100' : 'border-slate-100'}`} onClick={(e) => {
                            if (!tempKeyColumn || !rowKey || rowKey === 'null' || rowKey === 'undefined') {
                               if (!tempKeyColumn) alert('고유 식별자(PK) 칼럼을 우측 상단에서 먼저 선택해야 클릭이 가능합니다.');
                               return;
                            }
                            
                            if (e.shiftKey && lastSelectedIndex !== null) {
                              const visibleData = previewData.filter((r: any) => {
                                if (!searchTerm) return true;
                                return Object.values(r).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase()));
                              });
                              const start = Math.min(lastSelectedIndex, idxInFiltered);
                              const end = Math.max(lastSelectedIndex, idxInFiltered);
                              const rangeKeys = visibleData.slice(start, end + 1)
                                .map((r: any) => String(r[tempKeyColumn]))
                                .filter((k: string) => k && k !== 'null' && k !== 'undefined');
                              
                              setSelectedKeys(prev => {
                                const resultSet = new Set([...prev, ...rangeKeys]);
                                return Array.from(resultSet);
                              });
                            } else {
                              setSelectedKeys(prev => prev.includes(rowKey) ? prev.filter(k => k !== rowKey) : [...prev, rowKey]);
                            }
                            setLastSelectedIndex(idxInFiltered);
                          }}>
                            {tempKeyColumn && (
                              <td className="p-4 text-center border-r border-slate-50">
                                <input type="checkbox" className="w-4 h-4 cursor-pointer accent-indigo-500 pointer-events-none" checked={isChecked} readOnly />
                              </td>
                            )}
                            {availableColumns.map((col: string) => <td key={col} className={`p-4 text-sm font-medium whitespace-nowrap max-w-[200px] truncate ${col === tempKeyColumn ? 'text-indigo-700 font-black bg-indigo-50/30' : 'text-slate-700'}`}>{row[col] !== null ? String(row[col]) : <span className="text-slate-300 italic">null</span>}</td>)}
                          </tr>
                        );
                      })}
                    {previewData.length > 500 && ( <tr><td colSpan={availableColumns.length + 1} className='p-6 text-center text-sm font-bold text-slate-500 bg-slate-50 border-t-2 border-slate-200'>... 이 외에도 {previewData.length - 500}건의 데이터가 더 숨겨져 있습니다.<br/><span className='text-xs text-slate-400 font-normal'>더 보려면 헤더를 클릭해 정렬하세요.</span></td></tr> )}
                    </tbody>
                 </table>
               )}
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        input, select, textarea {
          color: var(--text-primary, #0f172a) !important;
        }
        input::placeholder {
          color: var(--text-secondary, #64748b) !important;
        }
      `}</style>
    </div>
  );
}