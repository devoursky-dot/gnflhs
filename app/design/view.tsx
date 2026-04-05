// 파일 경로: app/design/view.tsx
"use client";

import React, { useState } from 'react';
import { View, SchemaData, LayoutRow, Action, LayoutCell } from './types';
import { 
  Database, LayoutTemplate, Plus, Columns, Rows, ChevronLeft, 
  ChevronRight, X, MousePointerClick, Star, Filter, Search, Smartphone, Eye, Loader2, TableProperties, ArrowUpDown, FolderTree, Trash2, Minus, Wand2, Image as ImageIcon, Type, Sparkles, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js'; 
import IconPicker, { IconMap } from './picker';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "", 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

const REGEX_PRESETS = [
  { name: '전화번호 하이픈 (-)', pattern: '(\\d{3})(\\d{3,4})(\\d{4})', replace: '$1-$2-$3' },
  { name: '천단위 콤마 (₩)', pattern: '\\B(?=(\\d{3})+(?!\\d))', replace: ',' },
  { name: '앞 2글자 요약 (...)', pattern: '^(.{2}).*$', replace: '$1...' },
  { name: '이름 마스킹 (김*수)', pattern: '^(.)(.*)(.)$', replace: '$1*$3' },
  { name: '모든 숫자 가리기', pattern: '\\d', replace: '*' }
];

const FormatModal = ({ cell, onClose, onSave }: { cell: LayoutCell, onClose: () => void, onSave: (data: LayoutCell) => void }) => {
  const [data, setData] = useState<LayoutCell>({ ...cell });

  return (
    <div className="fixed inset-0 z-[800] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50"><div className="flex items-center gap-3"><div className="p-2 bg-indigo-600 text-white rounded-xl"><Wand2 size={20}/></div><h3 className="text-xl font-black text-slate-800">데이터 꾸미기 옵션</h3></div><button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button></div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh] bg-slate-50/50">
          
          {data.contentType === 'action' ? (
            // 🔥 [신규] 액션 버튼 전용 꾸미기 패널
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white p-6 rounded-2xl border-2 border-indigo-100 shadow-sm space-y-6">
                <div className="flex items-center gap-2 text-indigo-700 mb-2"><MousePointerClick size={18}/><h4 className="font-black">액션 버튼 스타일링</h4></div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 pl-1">버튼 모양 (Shape)</label><select value={data.buttonShape || 'square'} onChange={e => setData({...data, buttonShape: e.target.value as any})} className="w-full p-3 text-sm rounded-xl border-2 border-indigo-50 font-bold text-indigo-900 bg-indigo-50/50 focus:border-indigo-500 outline-none cursor-pointer"><option value="square">사각형</option><option value="rounded">둥근 사각형</option><option value="pill">완전 라운드 (Pill)</option></select></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 pl-1">버튼 정렬 (Align)</label><select value={data.buttonAlign || 'full'} onChange={e => setData({...data, buttonAlign: e.target.value as any})} className="w-full p-3 text-sm rounded-xl border-2 border-indigo-50 font-bold text-indigo-900 bg-indigo-50/50 focus:border-indigo-500 outline-none cursor-pointer"><option value="full">꽉 채우기 (Full)</option><option value="left">왼쪽 정렬</option><option value="center">가운데 정렬</option><option value="right">오른쪽 정렬</option></select></div>
                  <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 pl-1">버튼 내용 (Content)</label><select value={data.buttonStyle || 'both'} onChange={e => setData({...data, buttonStyle: e.target.value as any})} className="w-full p-3 text-sm rounded-xl border-2 border-indigo-50 font-bold text-indigo-900 bg-indigo-50/50 focus:border-indigo-500 outline-none cursor-pointer"><option value="both">아이콘 + 글자</option><option value="icon">아이콘만</option><option value="text">글자만</option></select></div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 px-1">* '꽉 채우기'를 선택하면 버튼이 셀 가로 폭을 모두 채웁니다.</p>
              </div>
            </div>
          ) : (
            // 기존 텍스트/이미지 꾸미기 패널
            <>
              <div className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-2xl shadow-sm"><div className="flex items-center gap-3"><ImageIcon className={data.isImage ? "text-indigo-600" : "text-slate-400"} /><div><p className="font-black text-slate-800">이 데이터를 이미지로 표시할까요?</p><p className="text-[11px] font-bold text-slate-400 mt-1">DB에 저장된 텍스트가 사진 URL일 경우 켜주세요.</p></div></div><button onClick={() => setData({ ...data, isImage: !data.isImage })} className={`w-14 h-8 rounded-full transition-colors relative ${data.isImage ? 'bg-indigo-600' : 'bg-slate-300'}`}><div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-md ${data.isImage ? 'left-7' : 'left-1'}`} /></button></div>
              {data.isImage ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2"><label className="text-xs font-black text-indigo-600 uppercase tracking-widest pl-1">이미지 모양 선택</label><div className="grid grid-cols-3 gap-4"><button onClick={() => setData({...data, imageShape: 'square'})} className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${(!data.imageShape || data.imageShape === 'square') ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}><div className="w-12 h-12 bg-slate-300"></div><span className="text-xs font-black text-slate-700">기본 사각형</span></button><button onClick={() => setData({...data, imageShape: 'rounded'})} className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${data.imageShape === 'rounded' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}><div className="w-12 h-12 bg-slate-300 rounded-xl"></div><span className="text-xs font-black text-slate-700">둥근 사각형</span></button><button onClick={() => setData({...data, imageShape: 'circle'})} className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${data.imageShape === 'circle' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}><div className="w-12 h-12 bg-slate-300 rounded-full flex items-start justify-center overflow-hidden"><div className="w-6 h-6 bg-slate-400 rounded-full mt-1"></div></div><span className="text-xs font-black text-slate-700">증명사진 원형</span></button></div><p className="text-[10px] text-slate-400 font-bold px-2 text-center">* 원형은 인물 사진을 고려하여 자동으로 '위쪽(Top)'을 기준으로 둥글게 잘라냅니다.</p></div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-3 gap-4 pb-2 border-b border-slate-200">
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 pl-1">글자 크기 (Size)</label><select value={data.textSize || ''} onChange={e => setData({...data, textSize: e.target.value})} className="w-full p-3 text-sm rounded-xl border-2 border-slate-100 font-bold focus:border-indigo-500 outline-none cursor-pointer"><option value="">기본 (14px)</option><option value="text-[10px]">초소형 (10px)</option><option value="text-xs">아주 작게 (12px)</option><option value="text-sm">작게 (14px)</option><option value="text-base">보통 (16px)</option><option value="text-lg">크게 (18px)</option><option value="text-xl">매우 크게 (20px)</option><option value="text-2xl">특대 (24px)</option><option value="text-3xl">초특대 (30px)</option></select></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 pl-1">글자 굵기 (Weight)</label><select value={data.textWeight || ''} onChange={e => setData({...data, textWeight: e.target.value})} className="w-full p-3 text-sm rounded-xl border-2 border-slate-100 font-bold focus:border-indigo-500 outline-none cursor-pointer"><option value="">기본 (Black)</option><option value="font-normal">얇게 (Normal)</option><option value="font-medium">중간 (Medium)</option><option value="font-bold">굵게 (Bold)</option><option value="font-black">매우 굵게 (Black)</option></select></div>
                    <div className="space-y-2"><label className="text-[10px] font-black text-slate-500 pl-1">정렬 (Align)</label><div className="flex bg-slate-100 rounded-xl p-1 h-[48px]"><button onClick={() => setData({...data, textAlign: 'left'})} className={`flex-1 flex justify-center items-center rounded-lg transition-all ${(!data.textAlign || data.textAlign === 'left') ? 'bg-white shadow-sm text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'}`}><AlignLeft size={18}/></button><button onClick={() => setData({...data, textAlign: 'center'})} className={`flex-1 flex justify-center items-center rounded-lg transition-all ${(data.textAlign === 'center') ? 'bg-white shadow-sm text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'}`}><AlignCenter size={18}/></button><button onClick={() => setData({...data, textAlign: 'right'})} className={`flex-1 flex justify-center items-center rounded-lg transition-all ${(data.textAlign === 'right') ? 'bg-white shadow-sm text-indigo-600 font-black' : 'text-slate-400 hover:text-slate-600'}`}><AlignRight size={18}/></button></div></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><label className="text-[10px] font-black text-slate-500 pl-1">데이터 앞글자 추가 (Prefix)</label><input value={data.textPrefix || ''} onChange={e => setData({...data, textPrefix: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 font-bold focus:border-indigo-500 outline-none" placeholder="예: [ " /></div><div className="space-y-2"><label className="text-[10px] font-black text-slate-500 pl-1">데이터 뒷글자 추가 (Suffix)</label><input value={data.textSuffix || ''} onChange={e => setData({...data, textSuffix: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 font-bold focus:border-indigo-500 outline-none" placeholder="예: ] 원" /></div></div>
                  <div className="p-6 bg-blue-50/50 rounded-2xl border-2 border-blue-100 space-y-6"><div className="flex items-center justify-between"><label className="text-[11px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5"><Sparkles size={16}/> 마법의 정규식 (Regex)</label><button onClick={() => setData({...data, textRegexPattern: '', textRegexReplace: ''})} className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg">초기화</button></div><div className="flex flex-wrap gap-2">{REGEX_PRESETS.map((p, idx) => (<button key={idx} onClick={() => setData({...data, textRegexPattern: p.pattern, textRegexReplace: p.replace})} className="text-[10px] font-black bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-600 hover:text-white transition-colors">+ {p.name}</button>))}</div><div className="grid grid-cols-2 gap-4 pt-2"><div className="space-y-2"><label className="text-[10px] font-black text-blue-500 pl-1">정규식 패턴 (Pattern)</label><input value={data.textRegexPattern || ''} onChange={e => setData({...data, textRegexPattern: e.target.value})} className="w-full p-3 text-sm rounded-xl border border-blue-200 font-mono focus:border-blue-500 outline-none bg-white" placeholder="예: ^(.{2}).*$" /></div><div className="space-y-2"><label className="text-[10px] font-black text-blue-500 pl-1">변환 결과 (Replace)</label><input value={data.textRegexReplace || ''} onChange={e => setData({...data, textRegexReplace: e.target.value})} className="w-full p-3 text-sm rounded-xl border border-blue-200 font-mono focus:border-blue-500 outline-none bg-white" placeholder="예: $1..." /></div></div></div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 bg-white border-t flex gap-3"><button onClick={onClose} className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all">취소</button><button onClick={() => onSave(data)} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">설정 완료</button></div>
      </div>
    </div>
  );
};

interface ViewEditorProps {
  view: View;
  schemaData: SchemaData;
  actions: Action[];
  onUpdate: (updated: View) => void;
}

export default function ViewEditor({ view, schemaData, actions, onUpdate }: ViewEditorProps) {
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [formatModalCell, setFormatModalCell] = useState<LayoutCell | null>(null);
  const availableColumns = view.tableName ? schemaData[view.tableName] || [] : [];
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);

  const fetchPreviewData = async () => {
    if (!view.tableName) return alert("먼저 테이블을 선택해주세요.");
    setIsPreviewModalOpen(true); setIsLoadingPreview(true);
    try {
      let query = supabase.from(view.tableName).select('*').limit(30000); 
      if (view.filterColumn && view.filterValue) {
        if (view.filterOperator === 'like') query = query.ilike(view.filterColumn, `%${view.filterValue}%`);
        else if (view.filterOperator === 'gt') query = query.gt(view.filterColumn, view.filterValue);
        else if (view.filterOperator === 'lt') query = query.lt(view.filterColumn, view.filterValue);
        else query = query.eq(view.filterColumn, view.filterValue);
      }
      if (view.sortColumn) query = query.order(view.sortColumn, { ascending: view.sortDirection === 'asc' });
      const { data, error } = await query;
      if (error) throw error;
      setPreviewData(data || []);
    } catch (err: any) { alert("데이터를 불러오지 못했습니다: " + err.message); } 
    finally { setIsLoadingPreview(false); }
  };

  const mutate = (callback: (rows: LayoutRow[]) => void) => {
    const next = JSON.parse(JSON.stringify(view.layoutRows));
    callback(next); onUpdate({ ...view, layoutRows: next });
  };

  const addRootRow = () => onUpdate({ ...view, layoutRows: [...view.layoutRows, { id: `r_${Date.now()}`, flex: 1, cells: [{ id: `c_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }] });

  const RenderRowEditor = ({ row, depth = 0 }: { row: LayoutRow, depth: number }) => (
    <div className={`flex gap-3 p-3 rounded-2xl border-2 border-slate-200 ${depth % 2 === 0 ? 'bg-slate-50' : 'bg-white'} relative mb-3 group/row transition-all min-w-max w-full`}>
      <div className="absolute -left-3 -top-3 flex items-center bg-indigo-600 text-white rounded-full shadow-lg opacity-0 group-hover/row:opacity-100 z-40 overflow-hidden transition-all border-2 border-white">
        <button onClick={(e) => { e.stopPropagation(); mutate(rows => { const f = (arr: any[]) => { for (const r of arr) { if (r.id === row.id) { r.flex = Math.max(1, (r.flex || 1) - 1); return true; } for (const c of r.cells) if (c.nestedRows && f(c.nestedRows)) return true; } return false; }; f(rows); }); }} className="p-1 hover:bg-indigo-700"><Minus size={14} strokeWidth={3}/></button>
        <span className="text-[10px] font-black px-1 whitespace-nowrap">세로 비율 : {row.flex || 1}</span>
        <button onClick={(e) => { e.stopPropagation(); mutate(rows => { const f = (arr: any[]) => { for (const r of arr) { if (r.id === row.id) { r.flex = (r.flex || 1) + 1; return true; } for (const c of r.cells) if (c.nestedRows && f(c.nestedRows)) return true; } return false; }; f(rows); }); }} className="p-1 hover:bg-indigo-700"><Plus size={14} strokeWidth={3}/></button>
      </div>
      <button onClick={() => mutate(rows => { const remove = (arr: LayoutRow[]) => { const idx = arr.findIndex(r => r.id === row.id); if (idx > -1) arr.splice(idx, 1); else arr.forEach(r => r.cells.forEach(c => { if(c.nestedRows) remove(c.nestedRows); })); }; remove(rows); })} className="absolute -right-3 -top-3 w-7 h-7 bg-slate-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 z-30 transition-all shadow-lg"><X size={14} strokeWidth={3} /></button>

      {row.cells.map(cell => (
        <div key={cell.id} style={{ flex: cell.flex }} className={`flex flex-col gap-2 border-2 ${cell.contentType === 'field' ? 'border-indigo-300' : cell.contentType === 'action' ? 'border-rose-300' : 'border-slate-200'} bg-white rounded-2xl p-4 min-h-[120px] shadow-sm relative transition-all min-w-[200px]`}>
          <div className="flex justify-between items-center bg-indigo-50 px-2 py-1 rounded-xl">
            <div className="flex items-center gap-1.5"><button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex = Math.max(1, c.flex - 1); if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-700 hover:scale-125 transition-transform p-1"><ChevronLeft size={16}/></button><span className="text-[11px] font-black text-indigo-700 tracking-tighter">가로비율:{cell.flex}</span><button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex += 1; if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-700 hover:scale-125 transition-transform p-1"><ChevronRight size={16}/></button></div>
            <div className="flex items-center gap-1"><button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) { c.contentType = 'nested'; c.nestedRows = [{ id: `nr_${Date.now()}`, flex: 1, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }]; } else if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-400 hover:text-indigo-700 p-1"><Rows size={18}/></button>{row.cells.length > 1 && <button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => { const idx = r.cells.findIndex((c: any) => c.id === cell.id); if (idx > -1) r.cells.splice(idx, 1); else r.cells.forEach((c: any) => { if(c.nestedRows) f(c.nestedRows); }); }); f(rows); })} className="text-rose-300 hover:text-rose-600 p-1 transition-colors"><Trash2 size={16}/></button>}</div>
          </div>

          {cell.contentType === 'nested' ? (
            <div className="space-y-3 pt-2 h-full">
              {cell.nestedRows?.map(nr => <RenderRowEditor key={nr.id} row={nr} depth={depth + 1} />)}
              <button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.nestedRows?.push({ id: `nr_${Date.now()}`, flex: 1, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }); if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="w-full py-3 border-2 border-dashed border-slate-200 text-[10px] font-black text-slate-400 rounded-xl hover:bg-slate-50 transition-colors">+ 세로 분할 추가</button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <select className={`flex-1 p-3 text-xs font-black bg-slate-50 border-2 rounded-xl outline-none transition-all ${cell.contentType !== 'empty' ? 'text-indigo-700 border-indigo-200' : 'text-slate-500 border-slate-200 focus:border-indigo-500'}`} value={(cell.contentType === 'action' ? 'act_' : '') + (cell.contentValue || '')} onChange={e => { const val = e.target.value; mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) { if (val.startsWith('act_')) { c.contentType = 'action'; c.contentValue = val.replace('act_', ''); } else { c.contentType = val ? 'field' : 'empty'; c.contentValue = val; } } else if(c.nestedRows) f(c.nestedRows); })); f(rows); }); }}>
                <option value="">-- 데이터/액션 선택 --</option>
                <optgroup label="테이블 컬럼">{availableColumns.map(col => <option key={col} value={col}>{col}</option>)}</optgroup>
                <optgroup label="액션(기능)">{actions.map(a => <option key={a.id} value={`act_${a.id}`}>⚡ {a.name}</option>)}</optgroup>
              </select>
              {(cell.contentType === 'field' || cell.contentType === 'action') && (
                <button onClick={() => setFormatModalCell(cell)} className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all ${(cell.isImage || cell.textRegexPattern || cell.textSize || cell.buttonShape) ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100 border border-indigo-100'}`} title="데이터 꾸미기"><Wand2 size={18} strokeWidth={2.5}/></button>
              )}
            </div>
          )}
        </div>
      ))}
      <button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => { if(r.id === row.id) r.cells.push({ id: `c_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }); r.cells.forEach((c: any) => { if(c.nestedRows) f(c.nestedRows); }); }); f(rows); })} className="w-12 shrink-0 flex items-center justify-center bg-indigo-600 text-white rounded-2xl shadow-md hover:bg-indigo-700 transition-colors hover:scale-105"><Columns size={20}/></button>
    </div>
  );

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
      </section>

      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-600 relative overflow-hidden">
        <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-4"><div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Database size={24}/></div><div><h2 className="text-xl font-black text-slate-900 whitespace-nowrap">1. 데이터 조회 규칙 설정</h2><p className="text-sm text-slate-500 font-bold whitespace-nowrap">어떤 데이터를 어떻게 보여줄지(필터링/정렬/그룹화) 설정하세요.</p></div></div>{view.tableName && <button onClick={fetchPreviewData} className="px-6 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-black text-sm flex items-center gap-2 transition-colors border border-indigo-200 whitespace-nowrap"><Eye size={18} /> 데이터 미리보기</button>}</div>
        <div className="grid grid-cols-2 gap-8 min-w-max w-full">
          <div className="space-y-4">
            <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1">연결 테이블</label><select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={view.tableName || ''} onChange={e => onUpdate({...view, tableName: e.target.value, filterColumn: null, sortColumn: null, groupByColumn: null, layoutRows: []})}><option value="">테이블 선택</option>{Object.keys(schemaData).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5"><Filter size={14}/> 1단계 서버 필터 (선택사항)</label><select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-indigo-600 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={view.filterColumn || ''} onChange={e => onUpdate({...view, filterColumn: e.target.value || null})}><option value="">필터 없음 (전체 데이터 가져오기)</option>{availableColumns.map(col => <option key={col} value={col}>{col}</option>)}</select></div>
          </div>
          <div className="bg-slate-50/50 rounded-3xl p-6 border-2 border-dashed border-slate-200 flex flex-col justify-center">
            {view.filterColumn ? (
              <div className="space-y-4 animate-in zoom-in-95 duration-300"><div className="flex gap-2 items-center text-indigo-600 font-black mb-2 text-sm whitespace-nowrap"><Filter size={16}/> 상세 필터 조건</div><div className="flex gap-3"><select className="flex-1 p-3 rounded-xl border-2 border-indigo-100 font-bold text-sm outline-none bg-white cursor-pointer min-w-[150px]" value={view.filterOperator || 'eq'} onChange={e => onUpdate({...view, filterOperator: e.target.value as any})}><option value="eq">일치 (=)</option><option value="like">포함 (Contains)</option><option value="gt">큼 (&gt;)</option><option value="lt">작음 (&lt;)</option></select><input className="flex-[2] p-3 rounded-xl border-2 border-indigo-100 font-bold text-sm outline-none bg-white focus:border-indigo-500 min-w-[200px]" value={view.filterValue || ''} onChange={e => onUpdate({...view, filterValue: e.target.value})} placeholder="예: 1, 완료" /></div></div>
            ) : (<div className="text-center space-y-3"><Smartphone className="mx-auto text-slate-300" size={40}/><p className="text-xs text-slate-400 font-bold leading-relaxed whitespace-nowrap">필요한 경우 좌측에서 칼럼을<br/>선택해 데이터를 필터링하세요.</p></div>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-slate-50 min-w-max w-full">
          <div className="space-y-6">
            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100"><label className="text-[10px] font-black text-blue-600 block mb-3 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"><FolderTree size={14}/> 데이터 묶어주기 (아코디언 형태)</label><select className="w-full p-3 rounded-xl bg-white border border-blue-200 font-black text-slate-800 cursor-pointer outline-none focus:border-blue-400" value={view.groupByColumn || ''} onChange={e => onUpdate({...view, groupByColumn: e.target.value || null})}><option value="">묶지 않음 (일반 리스트 형태)</option>{availableColumns.map(col => <option key={col} value={col}>{col} 칼럼 기준으로 묶기</option>)}</select></div>
            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-50"><label className="text-[10px] font-black text-indigo-600 block mb-3 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"><ArrowUpDown size={14}/> 정렬 기준 칼럼</label><select className="w-full p-3 rounded-xl bg-white border border-indigo-100 font-black text-slate-800 cursor-pointer outline-none focus:border-indigo-400" value={view.sortColumn || ''} onChange={e => onUpdate({...view, sortColumn: e.target.value || null, sortDirection: view.sortDirection || 'desc'})}><option value="">기본 정렬 (DB 설정순)</option>{availableColumns.map(col => <option key={col} value={col}>{col}</option>)}</select>{view.sortColumn && (<div className="mt-3 animate-in fade-in slide-in-from-top-2"><select className="w-full p-3 rounded-xl bg-white border border-indigo-100 font-black text-slate-600 cursor-pointer outline-none focus:border-indigo-400" value={view.sortDirection || 'desc'} onChange={e => onUpdate({...view, sortDirection: e.target.value as any})}><option value="desc">내림차순 (가장 큰/최신 값부터)</option><option value="asc">오름차순 (가장 작은/과거 값부터)</option></select></div>)}</div>
          </div>
          <div className="space-y-4">
            <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 whitespace-nowrap">카드 가로 배치 (열 개수)</label><select className="w-full p-3 rounded-xl bg-white border-2 border-slate-100 font-black text-slate-800 cursor-pointer outline-none" value={view.columnCount || 1} onChange={e => onUpdate({...view, columnCount: Number(e.target.value)})}>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}열 {n === 1 ? '(리스트 형태)' : `(${n}단 격자 형태)`}</option>)}</select></div>
            <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5 whitespace-nowrap"><MousePointerClick size={14} className="text-indigo-500"/> 카드 클릭 액션</label><select className="w-full p-3 rounded-xl bg-white border-2 border-slate-100 font-black text-slate-800 cursor-pointer outline-none" value={view.onClickActionId || ''} onChange={e => onUpdate({...view, onClickActionId: e.target.value || null})}><option value="">(클릭 동작 없음)</option>{actions.map(act => <option key={act.id} value={act.id}>⚡ {act.name}</option>)}</select></div>
          </div>
        </div>
      </section>

      <section className={`bg-white p-10 rounded-[3.5rem] shadow-2xl border-2 border-indigo-50 relative transition-all duration-500 ${!view.tableName ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
        <div className="flex justify-between items-center mb-10 min-w-max"><div className="flex items-center gap-4"><div className="p-3 bg-indigo-100 text-indigo-700 rounded-2xl"><LayoutTemplate size={28}/></div><h3 className="text-2xl font-black text-indigo-900 whitespace-nowrap">2. 카드 레이아웃 커스텀 설계</h3></div><button onClick={addRootRow} className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"><Plus size={18}/> 행(Row) 추가하기</button></div>
        <div className="space-y-4 overflow-visible w-full min-w-fit mt-10">
          {view.layoutRows.map(row => <RenderRowEditor key={row.id} row={row} depth={0} />)}
          {view.layoutRows.length === 0 && (<div className="py-24 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 gap-4 bg-slate-50/50"><Plus size={48} className="opacity-20"/><p className="font-black text-slate-400">우측 상단의 버튼을 눌러 카드 디자인을 시작하세요</p></div>)}
        </div>
      </section>

      <IconPicker isOpen={isIconPickerOpen} onClose={() => setIsIconPickerOpen(false)} selectedIcon={view.icon} onSelect={(n: string) => onUpdate({...view, icon: n})} />
      
      {formatModalCell && (
        <FormatModal 
          cell={formatModalCell} onClose={() => setFormatModalCell(null)} 
          onSave={(updatedData) => { mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === updatedData.id) Object.assign(c, updatedData); else if(c.nestedRows) f(c.nestedRows); })); f(rows); }); setFormatModalCell(null); }} 
        />
      )}

      {isPreviewModalOpen && (
        <div className="fixed inset-0 z-[700] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200"><div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden"><div className="p-6 border-b flex justify-between items-center bg-slate-50"><div className="flex items-center gap-3"><TableProperties className="text-indigo-600" size={24} /><h3 className="text-xl font-black text-slate-800">[{view.tableName}] 테이블 미리보기 <span className="text-sm text-indigo-600 ml-3 bg-indigo-100 px-3 py-1 rounded-full">{previewData.length}건 조회됨</span></h3></div><button onClick={() => setIsPreviewModalOpen(false)} className="p-2 hover:bg-slate-200 rounded-full text-slate-500"><X /></button></div><div className="flex-1 overflow-auto p-0 relative bg-slate-100">{isLoadingPreview ? (<div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-indigo-600 bg-white/50"><Loader2 className="animate-spin" size={40} /><p className="font-bold">데이터를 불러오는 중...</p></div>) : previewData.length === 0 ? (<div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-lg">조건에 맞는 데이터가 없습니다. 필터 설정을 확인해주세요.</div>) : (<table className="w-full text-left border-collapse bg-white"><thead className="bg-slate-900 text-white sticky top-0 z-10"><tr>{availableColumns.map(col => <th key={col} className="p-4 text-xs font-black uppercase tracking-wider border-b border-slate-700 whitespace-nowrap">{col}</th>)}</tr></thead><tbody>{previewData.map((row, idx) => (<tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/50 transition-colors">{availableColumns.map(col => <td key={col} className="p-4 text-sm font-medium text-slate-700 whitespace-nowrap max-w-[200px] truncate">{row[col] !== null ? String(row[col]) : <span className="text-slate-300 italic">null</span>}</td>)}</tr>))}</tbody></table>)}</div></div></div>
      )}
    </div>
  );
}