// 파일 경로: app/design/view.tsx
"use client";

import React, { useState } from 'react';
import { View, SchemaData, LayoutRow, Action, LayoutCell } from './types';
import { 
  Database, LayoutTemplate, Plus, Columns, Rows, ChevronLeft, 
  ChevronRight, X, MousePointerClick, Star, Filter, Search, Smartphone, Eye, Loader2, TableProperties, ArrowUpDown, FolderTree, Trash2, Minus, Wand2, Image as ImageIcon, Type, Sparkles, AlignLeft, AlignCenter, AlignRight, Lock, Zap, Settings2
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js'; 
import IconPicker, { IconMap } from './picker';
import { FORMULA_EXAMPLES } from './formulaExamples';

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
  const formulaRef = React.useRef<HTMLTextAreaElement>(null);

  const insertFormula = (snippet: string) => {
    if (!formulaRef.current) return;
    const textarea = formulaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = data.textExpression || '';
    const newVal = currentVal.substring(0, start) + snippet + currentVal.substring(end);
    
    setData({ ...data, textExpression: newVal });
    
    // 삽입 후 포커스 유지 및 커서 위치 조정
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 10);
  };

  return (
    <div className="fixed inset-0 z-[800] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl"><Wand2 size={20}/></div>
            <h3 className="text-xl font-black text-slate-800">데이터 꾸미기 옵션</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh] bg-slate-50/50">
          {data.contentType === 'action' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-sm space-y-8">
                <div className="flex items-center gap-2 text-indigo-700 mb-2">
                  <MousePointerClick size={20}/><h4 className="text-lg font-black tracking-tight">액션 버튼 프리미엄 스타일링</h4>
                </div>

                {/* 1. 버튼 모양 및 정렬 */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 pl-1 uppercase tracking-wider">버튼 모양 (Shape)</label>
                    <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                      {[
                        { id: 'square', label: '사각형' },
                        { id: 'rounded', label: '둥근 사각' },
                        { id: 'pill', label: '알약형' },
                        { id: 'none', label: '모양없음' }
                      ].map(s => (
                        <button 
                          key={s.id} 
                          onClick={() => setData({...data, buttonShape: s.id as any})}
                          className={`flex-1 py-2 text-[10px] font-black rounded-xl transition-all ${data.buttonShape === s.id || (!data.buttonShape && s.id === 'square') ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-slate-600'}`}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 pl-1 uppercase tracking-wider">버튼 정렬 (Align) & 구성</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={data.buttonAlign || 'full'} onChange={e => setData({...data, buttonAlign: e.target.value as any})} className="w-full p-2.5 text-xs rounded-xl border-2 border-slate-100 font-bold text-slate-700 outline-none focus:border-indigo-500">
                        <option value="full">꽉 채우기 (Full)</option><option value="left">왼쪽</option><option value="center">가운데</option><option value="right">오른쪽</option>
                      </select>
                      <select value={data.buttonStyle || 'both'} onChange={e => setData({...data, buttonStyle: e.target.value as any})} className="w-full p-2.5 text-xs rounded-xl border-2 border-slate-100 font-bold text-slate-700 outline-none focus:border-indigo-500">
                        <option value="both">아이콘+글자</option><option value="icon">아이콘만</option><option value="text">글자만</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. 최신 트렌드 스타일 (Variant) */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 pl-1 uppercase tracking-wider">최신 트렌드 스타일 (Variant)</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 'default', name: '기본형', icon: '✨' },
                      { id: 'raised', name: '돌출형', icon: '🔼' },
                      { id: 'inset', name: '움푹패인형', icon: '🔽' },
                      { id: 'outline', name: '테두리형', icon: '⬜' },
                      { id: '3d', name: '입체형(3D)', icon: '🧊' },
                      { id: 'shadow', name: '그림자형', icon: '🌫️' },
                      { id: 'glass', name: '유리광택(Glass)', icon: '💎' }
                    ].map(v => (
                      <button 
                        key={v.id}
                        onClick={() => setData({...data, buttonVariant: v.id as any})}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl border-2 transition-all ${data.buttonVariant === v.id || (!data.buttonVariant && v.id === 'default') ? 'border-indigo-600 bg-indigo-50 shadow-sm' : 'border-slate-100 bg-white hover:border-indigo-200'}`}
                      >
                        <span className="text-lg">{v.icon}</span>
                        <span className="text-[9px] font-black text-slate-600 whitespace-nowrap">{v.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. 버튼 컬러 (Color) */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 pl-1 uppercase tracking-wider">버튼 컬러 팔레트 (Color)</label>
                  <div className="flex flex-wrap gap-3">
                    {[
                      { id: 'slate', color: 'bg-slate-900' },
                      { id: 'indigo', color: 'bg-indigo-600' },
                      { id: 'blue', color: 'bg-blue-600' },
                      { id: 'emerald', color: 'bg-emerald-600' },
                      { id: 'rose', color: 'bg-rose-500' },
                      { id: 'amber', color: 'bg-amber-500' },
                      { id: 'violet', color: 'bg-violet-600' },
                      { id: 'cyan', color: 'bg-cyan-500' }
                    ].map(c => (
                      <button 
                        key={c.id}
                        onClick={() => setData({...data, buttonColor: c.id})}
                        className={`w-10 h-10 rounded-full ${c.color} transition-all relative ${data.buttonColor === c.id || (!data.buttonColor && c.id === 'slate') ? 'ring-4 ring-indigo-200 scale-110' : 'hover:scale-110'}`}
                      >
                        {(data.buttonColor === c.id || (!data.buttonColor && c.id === 'slate')) && <div className="absolute inset-0 flex items-center justify-center text-white text-[10px]">✓</div>}
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-400 px-1 italic">※ '배경 없음' 모양 선택 시 선택한 색상이 글자/아이콘 색상이 됩니다.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between p-5 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                <div className="flex items-center gap-3">
                  <ImageIcon className={data.isImage ? "text-indigo-600" : "text-slate-400"} />
                  <div>
                    <p className="font-black text-slate-800">이 데이터를 이미지로 표시할까요?</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">DB에 저장된 텍스트가 사진 URL일 경우 켜주세요.</p>
                  </div>
                </div>
                <button onClick={() => setData({ ...data, isImage: !data.isImage })} className={`w-14 h-8 rounded-full transition-colors relative ${data.isImage ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-md ${data.isImage ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {data.isImage ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <label className="text-xs font-black text-indigo-600 uppercase tracking-widest pl-1">이미지 모양 선택</label>
                  <div className="grid grid-cols-3 gap-4">
                    <button onClick={() => setData({...data, imageShape: 'square'})} className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${(!data.imageShape || data.imageShape === 'square') ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}><div className="w-12 h-12 bg-slate-300"></div><span className="text-xs font-black text-slate-700">기본 사각형</span></button>
                    <button onClick={() => setData({...data, imageShape: 'rounded'})} className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${data.imageShape === 'rounded' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}><div className="w-12 h-12 bg-slate-300 rounded-xl"></div><span className="text-xs font-black text-slate-700">둥근 사각형</span></button>
                    <button onClick={() => setData({...data, imageShape: 'circle'})} className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${data.imageShape === 'circle' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}><div className="w-12 h-12 bg-slate-300 rounded-full flex items-start justify-center overflow-hidden"><div className="w-6 h-6 bg-slate-400 rounded-full mt-1"></div></div><span className="text-xs font-black text-slate-700">증명사진 원형</span></button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold px-2 text-center">* 원형은 인물 사진을 고려하여 자동으로 '위쪽(Top)'을 기준으로 둥글게 잘라냅니다.</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2">
                  <div className="grid grid-cols-2 gap-4 pb-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 pl-1">글자 크기 (Size)</label>
                      <select value={data.textSize || ''} onChange={e => setData({...data, textSize: e.target.value})} className="w-full p-3 text-sm rounded-xl border-2 border-slate-100 font-bold text-slate-900 focus:border-indigo-500 outline-none cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                        <option value="">기본 (14px)</option><option value="text-[10px]">초소형 (10px)</option><option value="text-xs">아주 작게 (12px)</option><option value="text-sm">작게 (14px)</option><option value="text-base">보통 (16px)</option><option value="text-lg">크게 (18px)</option><option value="text-xl">매우 크게 (20px)</option><option value="text-2xl">특대 (24px)</option><option value="text-3xl">초특대 (30px)</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 pl-1">글자 굵기 (Weight)</label>
                      <select value={data.textWeight || ''} onChange={e => setData({...data, textWeight: e.target.value})} className="w-full p-3 text-sm rounded-xl border-2 border-slate-100 font-bold text-slate-900 focus:border-indigo-500 outline-none cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                        <option value="">기본 (Black)</option><option value="font-normal">얇게 (Normal)</option><option value="font-medium">중간 (Medium)</option><option value="font-bold">굵게 (Bold)</option><option value="font-black">매우 굵게 (Black)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 pl-1">글자 정렬 (Align)</label>
                      <div className="flex bg-white rounded-xl border-2 border-slate-100 p-1">
                        <button onClick={() => setData({...data, textAlign: 'left'})} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${(!data.textAlign || data.textAlign === 'left') ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}><AlignLeft size={18}/></button>
                        <button onClick={() => setData({...data, textAlign: 'center'})} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${data.textAlign === 'center' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}><AlignCenter size={18}/></button>
                        <button onClick={() => setData({...data, textAlign: 'right'})} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${data.textAlign === 'right' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:bg-slate-50'}`}><AlignRight size={18}/></button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 pl-1">글자 색상 (Color)</label>
                      <select value={data.textColor || ''} onChange={e => setData({...data, textColor: e.target.value})} className="w-full p-3 text-sm rounded-xl border-2 border-slate-100 font-bold text-slate-900 focus:border-indigo-500 outline-none cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                        <option value="">기본 색상</option>
                        <option value="text-slate-500">회색 (Slate)</option>
                        <option value="text-indigo-600">청보라 (Indigo)</option>
                        <option value="text-blue-600">파랑 (Blue)</option>
                        <option value="text-emerald-600">초록 (Emerald)</option>
                        <option value="text-rose-600">빨강 (Rose)</option>
                        <option value="text-amber-600">주황 (Amber)</option>
                        <option value="text-white">흰색 (White - 어두운 배경용)</option>
                      </select>
                    </div>
                  </div>

                  {/* ⚡ 데이터 가공 파이프라인 가이드 UI */}
                  <div className="py-6 flex flex-col items-center">
                    <div className="w-full h-px bg-slate-200 relative mb-8">
                       <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Data Transformation Pipeline</span>
                    </div>
                    
                    <div className="flex items-center justify-between w-full max-w-sm relative">
                      {/* 파이프라인 선 */}
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-indigo-100 -translate-y-1/2 -z-10"></div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-lg">1</div>
                        <span className="text-[10px] font-black text-indigo-600">수식 계산</span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black shadow-lg">2</div>
                        <span className="text-[10px] font-black text-blue-500">정규식 패턴</span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-lg">3</div>
                        <span className="text-[10px] font-black text-emerald-500">앞/뒷말 추가</span>
                      </div>
                    </div>
                    <p className="mt-6 text-[11px] font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 italic">
                      💡 위 순서대로 데이터가 차례대로 가공됩니다. (조합 가능!)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-600 pl-1 uppercase tracking-tighter flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">3</span> 데이터 앞글자 추가 (Prefix)</label>
                      <input value={data.textPrefix || ''} onChange={e => setData({...data, textPrefix: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 font-bold text-slate-900 focus:border-emerald-500 outline-none transition-colors" style={{ color: 'var(--text-primary)' }} placeholder="예: [ " />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-600 pl-1 uppercase tracking-tighter flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">3</span> 데이터 뒷글자 추가 (Suffix)</label>
                      <input value={data.textSuffix || ''} onChange={e => setData({...data, textSuffix: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 font-bold text-slate-900 focus:border-emerald-500 outline-none transition-colors" style={{ color: 'var(--text-primary)' }} placeholder="예: ] 원" />
                    </div>
                  </div>
                  
                  {/* 1단계: 마법의 수식 엔진 */}
                  <div className="p-6 bg-indigo-50/50 rounded-[2.5rem] border-2 border-indigo-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">1</span> 
                        <Sparkles size={16}/> 마법의 수식 라이브러리 (Formula)
                      </label>
                      <button onClick={() => setData({...data, textExpression: ''})} className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors">초기화</button>
                    </div>

                    <div className="space-y-5">
                      {FORMULA_EXAMPLES.filter(cat => cat.items.some(item => item.code.includes('val') || item.code.includes('row'))).map((cat, idx) => (
                        <div key={idx} className="space-y-3">
                          <h5 className="text-[10px] font-black text-slate-400 border-l-2 border-indigo-200 pl-2 ml-1">{cat.category}</h5>
                          <div className="flex flex-wrap gap-2">
                            {cat.items.map((ex, iIdx) => (
                              <button 
                                key={iIdx} 
                                onClick={() => insertFormula(ex.code)}
                                title={ex.desc}
                                className="text-[10px] font-black bg-white border border-indigo-100 text-indigo-600 px-3 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                              >
                                {ex.title}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-2 pt-2 border-t border-indigo-100">
                      <label className="text-[10px] font-black text-indigo-500 pl-1">수식 에디터 (Javascript)</label>
                      <textarea 
                        ref={formulaRef}
                        value={data.textExpression || ''} 
                        onChange={e => setData({...data, textExpression: e.target.value})}
                        rows={4}
                        className="w-full p-4 border-2 border-indigo-100 rounded-3xl font-mono text-xs text-slate-900 focus:border-indigo-500 outline-none bg-white leading-relaxed resize-none shadow-inner"
                        placeholder="예: val === 'Y' ? '완료' : '대기'"
                      />
                      <div className="flex justify-between items-center px-1">
                        <p className="text-[9px] text-slate-400 font-bold italic">* 사용 가능한 변수: val (현재값), row (행 전체 데이터)</p>
                      </div>
                    </div>
                  </div>

                  {/* 2단계: 마법의 정규식 */}
                  <div className="p-6 bg-blue-50/50 rounded-2xl border-2 border-blue-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">2</span>
                        <Sparkles size={16}/> 마법의 정규식 (Regex)
                      </label>
                      <button 
                        onClick={() => setData({...data, textRegexPattern: '', textRegexReplace: ''})} 
                        className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors"
                      >
                        초기화
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {REGEX_PRESETS.map((p, idx) => (
                        <button 
                          key={idx} 
                          onClick={() => setData({...data, textRegexPattern: p.pattern, textRegexReplace: p.replace})} 
                          className="text-[10px] font-black bg-white border border-blue-200 text-blue-600 px-3 py-1.5 rounded-full hover:bg-blue-600 hover:text-white transition-colors"
                        >
                          + {p.name}
                        </button>
                      ))}
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 pl-1">정규식 패턴 (Pattern)</label>
                        <input 
                          value={data.textRegexPattern || ''} 
                          onChange={e => setData({...data, textRegexPattern: e.target.value})} 
                          className="w-full p-3 text-sm rounded-xl border border-blue-200 font-mono text-slate-900 focus:border-blue-500 outline-none bg-white" 
                          style={{ color: 'var(--text-primary)' }} 
                          placeholder="예: ^(.{2}).*$" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 pl-1">변환 결과 (Replace)</label>
                        <input 
                          value={data.textRegexReplace || ''} 
                          onChange={e => setData({...data, textRegexReplace: e.target.value})} 
                          className="w-full p-3 text-sm rounded-xl border border-blue-200 font-mono text-slate-900 focus:border-blue-500 outline-none bg-white" 
                          style={{ color: 'var(--text-primary)' }} 
                          placeholder="예: $1..." 
                        />
                      </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="p-6 bg-white border-t flex gap-3">
        <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all">취소</button>
        <button onClick={() => onSave(data)} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">설정 완료</button>
      </div>
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
  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [tempKeyColumn, setTempKeyColumn] = useState<string>('');
  const [previewSortConfig, setPreviewSortConfig] = useState<{column: string, direction: 'asc'|'desc'} | null>(null);

  const fetchPreviewData = async () => {
    if (!view.tableName) return alert("먼저 테이블을 선택해주세요.");
    setIsPreviewModalOpen(true); setIsLoadingPreview(true);
    try {
      let query = supabase.from(view.tableName).select('*').limit(30000); 
      
      // 🧠 [신규] 노코딩 스타일 지능형 필터 동기화
      if (view.filterColumn && (view.filterValue || view.filterOperator?.includes('null'))) {
        const op = view.filterOperator || 'eq';
        const val = String(view.filterValue || '').trim();
        const col = view.filterColumn;

        // 로컬 타임존 기반 날짜 계산
        const now = new Date();
        const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        // 매직 키워드 분기
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
          // 일반 연산자 처리
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
            default: query = query.eq(col, val);
          }
        }
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
      <button onClick={() => mutate(rows => { const remove = (arr: LayoutRow[]) => { const idx = arr.findIndex(r => r.id === row.id); if (idx > -1) arr.splice(idx, 1); else arr.forEach(r => r.cells.forEach(c => { if(c.nestedRows) remove(c.nestedRows); })); }; remove(rows); })} className="absolute -right-3 -top-3 w-7 h-7 bg-slate-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 z-30 transition-all shadow-lg"><X size={14} strokeWidth={3} /></button>

      {row.cells.map(cell => (
        <div key={cell.id} className={`flex flex-col gap-2 border-2 ${cell.contentType === 'field' ? 'border-indigo-300' : cell.contentType === 'action' ? 'border-rose-300' : 'border-slate-200'} bg-white rounded-2xl p-4 min-h-[120px] shadow-sm relative transition-all shrink-0 ${cell.contentType === 'nested' ? 'w-fit' : 'w-[280px]'}`}>
          <div className="flex justify-between items-center bg-indigo-50 px-2 py-1 rounded-xl">
            <div className="flex items-center gap-1.5"><button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex = Math.max(1, c.flex - 1); if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-700 hover:scale-125 transition-transform p-1"><ChevronLeft size={16}/></button><span className="text-[11px] font-black text-indigo-700 tracking-tighter">가로:{cell.flex}</span><button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex += 1; if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-700 hover:scale-125 transition-transform p-1"><ChevronRight size={16}/></button></div>
            <div className="flex items-center gap-1">
              {/* 3단계 제한 로직: depth가 2 미만일 때만 중첩 버튼 노출 */}
              {depth < 2 && (
                <button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) { c.contentType = 'nested'; c.nestedRows = [{ id: `nr_${Date.now()}`, flex: 1, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }]; } else if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-400 hover:text-indigo-700 p-1" title="내부에 세로 레이아웃 추가"><Rows size={18}/></button>
              )}
              {row.cells.length > 1 && <button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => { const idx = r.cells.findIndex((c: any) => c.id === cell.id); if (idx > -1) r.cells.splice(idx, 1); else r.cells.forEach((c: any) => { if(c.nestedRows) f(c.nestedRows); }); }); f(rows); })} className="text-rose-300 hover:text-rose-600 p-1 transition-colors"><Trash2 size={16}/></button>}
            </div>
          </div>

          {cell.contentType === 'nested' ? (
            <div className="space-y-3 pt-2 h-full">
              {cell.nestedRows?.map(nr => <RenderRowEditor key={nr.id} row={nr} depth={depth + 1} />)}
              {/* 자식 Row 추가 시에도 3단계 검증 (이미 depth+1이 렌더링되므로 여기서도 depth 체크) */}
              {depth < 2 && (
                <button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.nestedRows?.push({ id: `nr_${Date.now()}`, flex: 1, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }); if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="w-full py-3 border-2 border-dashed border-slate-200 text-[10px] font-black text-slate-400 rounded-xl hover:bg-slate-50 transition-colors">+ 세로 분할 추가</button>
              )}
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
            <button onClick={() => onUpdate({ ...view, navPosition: 'both' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(!view.navPosition || view.navPosition === 'both') ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>🔸 모두 노출</button>
            <button onClick={() => onUpdate({ ...view, navPosition: 'bottom' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(view.navPosition === 'bottom') ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>🔹 하단/사이드만</button>
            <button onClick={() => onUpdate({ ...view, navPosition: 'menu' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(view.navPosition === 'menu') ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>🔹 우측 숨김버튼만</button>
            <button onClick={() => onUpdate({ ...view, navPosition: 'hidden' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(view.navPosition === 'hidden') ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>🚫 메뉴에서 숨김</button>
          </div>
          <p className="text-[11px] font-bold text-slate-400 px-3 mt-3 w-full max-w-[800px] whitespace-normal">※ 이 화면으로 진입할 수 있는 바로가기 메뉴가 어디에 표시될지 결정합니다. 다른 화면에서 이동 액션으로 연결하려면 '숨김'으로 설정하세요.</p>
        </div>
      </section>

      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-600 relative overflow-hidden">
        {view.isLocked && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-md flex flex-col items-center justify-center p-6 border-[3px] border-indigo-200 rounded-[2.5rem] animate-in zoom-in-95">
             <div className="bg-white px-8 py-6 rounded-3xl shadow-2xl flex flex-col items-center gap-3 border border-indigo-50">
               <div className="bg-indigo-100 p-4 rounded-full text-indigo-600 shadow-inner"><Lock size={32}/></div>
               <h3 className="font-black text-slate-800 text-xl">데이터가 수동으로 고정되었습니다 🔒</h3>
               <p className="text-sm font-bold text-slate-500 text-center leading-relaxed">
                 선택된 <span className="text-indigo-600 text-lg border-b-2 border-indigo-200 px-1">{view.lockedRecordKeys?.length}</span> 개의 데이터만 화면에 표시됩니다.<br/>
                 기준 스키마: <span className="text-slate-700 bg-slate-100 px-2 py-0.5 rounded-md font-mono">[{view.lockedKeyColumn}]</span>
               </p>
               <button onClick={() => onUpdate({...view, isLocked: false})} className="mt-4 px-6 py-3 bg-white border-2 border-slate-200 hover:border-slate-800 hover:bg-slate-800 hover:text-white rounded-2xl text-slate-700 font-black transition-all shadow-sm">잠금 해제 (수동 픽 유지)</button>
             </div>
          </div>
        )}
        <div className="flex items-center justify-between mb-8"><div className="flex items-center gap-4"><div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Database size={24}/></div><div><h2 className="text-xl font-black text-slate-900 whitespace-nowrap">1. 데이터 조회 규칙 설정</h2><p className="text-sm text-slate-500 font-bold whitespace-nowrap">어떤 데이터를 어떻게 보여줄지(필터링/정렬/그룹화) 설정하세요.</p></div></div>{view.tableName && <button onClick={fetchPreviewData} className="px-6 py-3 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-xl font-black text-sm flex items-center gap-2 transition-colors border border-indigo-200 whitespace-nowrap"><Eye size={18} /> 설정 확인 및 데이터 수동 픽(Pick)</button>}</div>
        <div className="grid grid-cols-2 gap-8 min-w-max w-full">
          <div className="space-y-4">
            <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1">연결 테이블</label><select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={view.tableName || ''} onChange={e => onUpdate({...view, tableName: e.target.value, filterColumn: null, sortColumn: null, groupByColumn: null, layoutRows: []})}><option value="">테이블 선택</option>{Object.keys(schemaData).map(t => <option key={t} value={t}>{t}</option>)}</select></div>
            <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5"><Filter size={14}/> 1단계 서버 필터 (선택사항)</label><select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-indigo-600 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={view.filterColumn || ''} onChange={e => onUpdate({...view, filterColumn: e.target.value || null})}><option value="">필터 없음 (전체 데이터 가져오기)</option>{availableColumns.map(col => <option key={col} value={col}>{col}</option>)}</select></div>
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
                        ].map(chip => (
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
        <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-slate-50 min-w-max w-full">
          <div className="space-y-6">
            <div className="bg-blue-50/50 p-5 rounded-2xl border border-blue-100"><label className="text-[10px] font-black text-blue-600 block mb-3 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"><FolderTree size={14}/> 데이터 묶어주기 (아코디언 형태)</label><select className="w-full p-3 rounded-xl bg-white border border-blue-200 font-black text-slate-800 cursor-pointer outline-none focus:border-blue-400" value={view.groupByColumn || ''} onChange={e => onUpdate({...view, groupByColumn: e.target.value || null})}><option value="">묶지 않음 (일반 리스트 형태)</option>{availableColumns.map(col => <option key={col} value={col}>{col} 칼럼 기준으로 묶기</option>)}</select></div>
            <div className="bg-indigo-50/50 p-5 rounded-2xl border border-indigo-50"><label className="text-[10px] font-black text-indigo-600 block mb-3 uppercase tracking-wider flex items-center gap-1.5 whitespace-nowrap"><ArrowUpDown size={14}/> 정렬 기준 칼럼</label><select className="w-full p-3 rounded-xl bg-white border border-indigo-100 font-black text-slate-800 cursor-pointer outline-none focus:border-indigo-400" value={view.sortColumn || ''} onChange={e => onUpdate({...view, sortColumn: e.target.value || null, sortDirection: view.sortDirection || 'desc'})}><option value="">기본 정렬 (DB 설정순)</option>{availableColumns.map(col => <option key={col} value={col}>{col}</option>)}</select>{view.sortColumn && (<div className="mt-3 animate-in fade-in slide-in-from-top-2"><select className="w-full p-3 rounded-xl bg-white border border-indigo-100 font-black text-slate-600 cursor-pointer outline-none focus:border-indigo-400" value={view.sortDirection || 'desc'} onChange={e => onUpdate({...view, sortDirection: e.target.value as any})}><option value="desc">내림차순 (가장 큰/최신 값부터)</option><option value="asc">오름차순 (가장 작은/과거 값부터)</option></select></div>)}</div>
          </div>
          <div className="space-y-4">
            <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 whitespace-nowrap">카드 가로 배치 (열 개수)</label><select className="w-full p-3 rounded-xl bg-white border-2 border-slate-100 font-black text-slate-800 cursor-pointer outline-none" value={view.columnCount || 1} onChange={e => onUpdate({...view, columnCount: Number(e.target.value)})}>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}열 {n === 1 ? '(리스트 형태)' : `(${n}단 격자 형태)`}</option>)}</select></div>
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5 whitespace-nowrap"><MousePointerClick size={14} className="text-indigo-500"/> 카드 클릭 액션</label>
              <select className="w-full p-3 rounded-xl bg-white border-2 border-slate-100 font-black text-slate-800 cursor-pointer outline-none" value={view.onClickActionId || ''} onChange={e => onUpdate({...view, onClickActionId: e.target.value || null})}>
                <option value="">(클릭 동작 없음)</option>
                {actions.map(act => <option key={act.id} value={act.id}>⚡ {act.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-rose-500 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5 whitespace-nowrap animate-pulse"><Zap size={14} /> 뷰 시작 시 자동 실행(Automation)</label>
              <select className="w-full p-3 rounded-xl bg-rose-50 border-2 border-rose-100 font-black text-rose-700 cursor-pointer outline-none focus:border-rose-300" value={view.onInitActionId || ''} onChange={e => onUpdate({...view, onInitActionId: e.target.value || null})}>
                <option value="">(자동 실행 없음 - 일반 모드)</option>
                {actions.map(act => <option key={act.id} value={act.id}>🚀 {act.name}</option>)}
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
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-mono text-xs font-bold text-slate-700 outline-none focus:border-amber-400 transition-all"
                    rows={3}
                    value={view.visibilityExpr || ''}
                    onChange={e => onUpdate({...view, visibilityExpr: e.target.value})}
                    placeholder="예: count('attendance_log', {date: 'today'}) > 0"
                  />
                  <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                      💡 **도움말**: 결과가 **true**(참)이면 아래 설정을 적용합니다.<br/>
                      - `count('테이블', {'{필터}'}) &gt; 0`: 기록이 있으면<br/>
                      - `currentUser().role === 'admin'`: 관리자면
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
        <div className="fixed inset-0 z-[700] bg-slate-900/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[2rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-4 border-b flex justify-between items-center bg-slate-50 shrink-0">
              <div className="flex items-center gap-3">
                <TableProperties className="text-indigo-600" size={24} />
                <div>
                  <h3 className="text-lg font-black text-slate-800">[{view.tableName}] 쿼리 시뮬레이션 및 데이터 잠금</h3>
                  <p className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-lg inline-block mt-0.5">총 {previewData.length}건 조회됨</p>
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
                    {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button 
                  onClick={() => {
                    if (!tempKeyColumn) return alert('화면을 특정 데이터로 고정하려면 고유 식별자(PK) 칼럼을 먼저 선택해야 합니다.\n(예: 학번, 전화번호 등 중복되지 않는 칼럼)');
                    if (selectedKeys.length === 0) return alert('아래 테이블에서 최소 1개의 데이터를 체크하여 선택하세요!');
                    if (window.confirm(`${selectedKeys.length}개의 데이터를 선택하여 현재 화면 기능을 잠금(고정)하시겠습니까?\n이후 쿼리 변경 및 신규 데이터 조회가 제한되며 오직 선택된 데이터만 로드됩니다.`)) {
                      onUpdate({ ...view, isLocked: true, lockedKeyColumn: tempKeyColumn, lockedRecordKeys: selectedKeys });
                      setIsPreviewModalOpen(false);
                    }
                  }}
                  className={`px-5 py-3 rounded-xl font-black shadow-md flex items-center gap-2 transition-all ${selectedKeys.length > 0 && tempKeyColumn ? 'bg-rose-500 hover:bg-rose-600 text-white hover:scale-105 active:scale-95 shadow-rose-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  <Lock size={18}/> {selectedKeys.length}개로 화면 잠금
                </button>
                <button onClick={() => setIsPreviewModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-500 hover:text-slate-800 transition-colors shrink-0 ml-2"><X size={20}/></button>
              </div>
            </div>
            {/* Modal Body & Table */}
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
                         <th className="p-4 w-12 text-center border-b border-slate-700 bg-slate-800 cursor-pointer hover:bg-slate-700 transition-colors" onClick={() => {
                             if (selectedKeys.length === previewData.length && previewData.length > 0) setSelectedKeys([]);
                             else {
                               const allKeys = previewData.map(r => String(r[tempKeyColumn])).filter(k => k && k !== 'null' && k !== 'undefined');
                               setSelectedKeys(allKeys);
                             }
                         }}>
                           <input type="checkbox" className="w-4 h-4 cursor-pointer accent-indigo-500 pointer-events-none" checked={selectedKeys.length === previewData.length && previewData.length > 0} readOnly />
                         </th>
                       )}
                       {availableColumns.map(col => (
                         <th key={col} 
                           className={`p-4 text-xs font-black uppercase tracking-wider border-b border-slate-700 whitespace-nowrap cursor-pointer hover:bg-slate-800 transition-colors ${col === tempKeyColumn ? 'bg-indigo-900 text-indigo-200' : ''}`}
                           onClick={() => {
                             let newDir: 'asc' | 'desc' = 'asc';
                             if (previewSortConfig?.column === col && previewSortConfig.direction === 'asc') newDir = 'desc';
                             setPreviewSortConfig({ column: col, direction: newDir });
                             
                             const sorted = [...previewData].sort((a, b) => {
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
                   <tbody>
                     {previewData.map((row, idx) => {
                       const rowKey = tempKeyColumn ? String(row[tempKeyColumn]) : null;
                       const isChecked = rowKey ? selectedKeys.includes(rowKey) : false;
                       return (
                         <tr key={idx} className={`border-b hover:bg-indigo-50/50 transition-colors cursor-pointer ${isChecked ? 'bg-indigo-50 border-indigo-100' : 'border-slate-100'}`} onClick={() => {
                           if (!tempKeyColumn || !rowKey || rowKey === 'null' || rowKey === 'undefined') {
                              if (!tempKeyColumn) alert('고유 식별자(PK) 칼럼을 우측 상단에서 먼저 선택해야 클릭이 가능합니다.');
                              return;
                           }
                           setSelectedKeys(prev => prev.includes(rowKey) ? prev.filter(k => k !== rowKey) : [...prev, rowKey]);
                         }}>
                           {tempKeyColumn && (
                             <td className="p-4 text-center border-r border-slate-50">
                               <input type="checkbox" className="w-4 h-4 cursor-pointer accent-indigo-500 pointer-events-none" checked={isChecked} readOnly />
                             </td>
                           )}
                           {availableColumns.map(col => <td key={col} className={`p-4 text-sm font-medium whitespace-nowrap max-w-[200px] truncate ${col === tempKeyColumn ? 'text-indigo-700 font-black bg-indigo-50/30' : 'text-slate-700'}`}>{row[col] !== null ? String(row[col]) : <span className="text-slate-300 italic">null</span>}</td>)}
                         </tr>
                       );
                     })}
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