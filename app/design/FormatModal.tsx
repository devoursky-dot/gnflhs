// 파일 경로: app/design/FormatModal.tsx
"use client";

import React, { useState, useRef } from 'react';
import { LayoutCell } from './types';
import { 
  X, MousePointerClick, Wand2, Image as ImageIcon, Type, Sparkles, AlignLeft, AlignCenter, AlignRight
} from 'lucide-react';
import IconPicker, { IconMap } from './picker';
import { FORMULA_EXAMPLES, FormulaCategory, FormulaExample } from './formulas';

export const REGEX_PRESETS = [
  { name: '전화번호 하이픈 (-)', pattern: '(\\d{3})(\\d{3,4})(\\d{4})', replace: '$1-$2-$3' },
  { name: '천단위 콤마 (₩)', pattern: '\\B(?=(\\d{3})+(?!\\d))', replace: ',' },
  { name: '앞 2글자 요약 (...)', pattern: '^(.{2}).*$', replace: '$1...' },
  { name: '이름 마스킹 (김*수)', pattern: '^(.)(.*)(.)$', replace: '$1*$3' },
  { name: '모든 숫자 가리기', pattern: '\\d', replace: '*' }
];

interface FormatModalProps {
  cell: LayoutCell;
  onClose: () => void;
  onSave: (data: LayoutCell) => void;
  availableColumns: string[];
}

const FormatModal = ({ cell, onClose, onSave, availableColumns }: FormatModalProps) => {
  const [data, setData] = useState<LayoutCell>({ ...cell });
  const [activePicker, setActivePicker] = useState<boolean>(false);
  const formulaRef = useRef<HTMLTextAreaElement>(null);

  const insertFormula = (snippet: string) => {
    if (!formulaRef.current) return;
    const textarea = formulaRef.current;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentVal = data.textExpression || '';
    const newVal = currentVal.substring(0, start) + snippet + currentVal.substring(end);
    
    setData({ ...data, textExpression: newVal });
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + snippet.length, start + snippet.length);
    }, 10);
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] flex flex-col overflow-hidden shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl"><Wand2 size={20}/></div>
            <h3 className="text-xl font-black text-slate-800">데이터 꾸미기 옵션</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh] bg-slate-50/50">
          {/* ── 공통 텍스트 스타일링 (액션/필드 공통) ── */}
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-slate-800 mb-2 border-b border-slate-50 pb-3">
              <Type size={18}/><h4 className="text-sm font-black tracking-tight">글꼴 및 텍스트 스타일</h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider">글자 크기 (Size)</label>
                <select value={data.textSize || ''} onChange={e => setData({...data, textSize: e.target.value})} className="w-full p-3 text-xs rounded-xl border-2 border-slate-50 font-black text-slate-800 focus:border-indigo-500 outline-none cursor-pointer bg-slate-50/50">
                  <option value="">기본 (14px)</option>
                  <option value="text-[10px]">초소형 (10px)</option>
                  <option value="text-xs">아주 작게 (12px)</option>
                  <option value="text-sm">작게 (14px)</option>
                  <option value="text-base">보통 (16px)</option>
                  <option value="text-lg">크게 (18px)</option>
                  <option value="text-xl">매우 크게 (20px)</option>
                  <option value="text-2xl">특대 (24px)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider">글자 굵기 (Weight)</label>
                <select value={data.textWeight || ''} onChange={e => setData({...data, textWeight: e.target.value})} className="w-full p-3 text-xs rounded-xl border-2 border-slate-50 font-black text-slate-800 focus:border-indigo-500 outline-none cursor-pointer bg-slate-50/50">
                  <option value="">기본 (Black)</option>
                  <option value="font-normal">얇게 (Normal)</option>
                  <option value="font-medium">중간 (Medium)</option>
                  <option value="font-bold">굵게 (Bold)</option>
                  <option value="font-black">매우 굵게 (Black)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider">글자 정렬 (Align)</label>
                <div className="flex bg-slate-50 rounded-xl border-2 border-slate-50 p-1">
                  <button onClick={() => setData({...data, textAlign: 'left'})} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${(!data.textAlign || data.textAlign === 'left') ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}><AlignLeft size={16}/></button>
                  <button onClick={() => setData({...data, textAlign: 'center'})} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${data.textAlign === 'center' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}><AlignCenter size={16}/></button>
                  <button onClick={() => setData({...data, textAlign: 'right'})} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${data.textAlign === 'right' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}><AlignRight size={16}/></button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider">커스텀 색상 (Color)</label>
                <input 
                  type="color" 
                  value={data.textColor || '#1e293b'} 
                  onChange={e => setData({...data, textColor: e.target.value})}
                  className="w-full h-[46px] rounded-xl border-2 border-slate-50 p-1 bg-slate-50/50 cursor-pointer"
                />
              </div>
            </div>
          </div>

          {data.contentType === 'action' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-white p-6 rounded-3xl border-2 border-indigo-100 shadow-sm space-y-8">
                <div className="flex items-center gap-2 text-indigo-700 mb-2 border-b border-indigo-50 pb-3">
                  <MousePointerClick size={18}/><h4 className="text-sm font-black tracking-tight">액션 버튼 고급 스타일링</h4>
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
                    <label className="text-[11px] font-black text-slate-500 pl-1 uppercase tracking-wider">버튼 배치 (Align) & 구성</label>
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

                  <div className="pt-6 border-t border-slate-200 space-y-6">
                    <div className="flex items-center gap-2 text-indigo-600 mb-2">
                       <Sparkles size={16}/><h4 className="text-sm font-black tracking-tight">지능형 이미지 오버레이 (Advanced)</h4>
                    </div>
                    
                    <div className="space-y-3">
                      <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider flex items-center justify-between">
                        이미지 위 표시 텍스트 (수식)
                        <span className="text-indigo-400 text-[9px] font-bold lowercase italic text-right leading-tight">val: 원본 데이터 / row: 전체 레코드</span>
                      </label>
                      <textarea 
                        value={data.imageOverlayExpression || ''} 
                        onChange={e => setData({...data, imageOverlayExpression: e.target.value})}
                        className="w-full p-4 rounded-2xl bg-indigo-50/30 border-2 border-indigo-100 font-mono text-[11px] font-black text-indigo-800 outline-none focus:border-indigo-400 transition-all"
                        rows={2}
                        placeholder="예: row.name + '(' + row.student_id + ')'"
                      />
                      
                      <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider">글자 크기 (8~20px)</label>
                          <select 
                            value={data.imageOverlaySize || '10'} 
                            onChange={e => setData({...data, imageOverlaySize: e.target.value})}
                            className="w-full p-3 text-xs rounded-xl border-2 border-slate-100 font-black text-slate-800 outline-none bg-white focus:border-indigo-400"
                          >
                            {[8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36, 40].map(size => (
                              <option key={size} value={size}>{size}px</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider text-right block w-full">글자 색상 (직접선택)</label>
                          <input 
                            type="color" 
                            value={data.imageOverlayColor || '#ffffff'} 
                            onChange={e => setData({...data, imageOverlayColor: e.target.value})}
                            className="w-full h-[42px] rounded-xl border-2 border-slate-100 p-1 bg-white cursor-pointer"
                          />
                        </div>
                      </div>

                      <div className="space-y-2 pt-2 animate-in fade-in slide-in-from-bottom-1">
                        <label className="text-[10px] font-black text-slate-400 pl-1 uppercase tracking-wider">추천 색상 팔레트 (10종)</label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { name: '흰색', color: '#ffffff' },
                            { name: '검정', color: '#000000' },
                            { name: '빨강', color: '#ef4444' },
                            { name: '노랑', color: '#facc15' },
                            { name: '초록', color: '#22c55e' },
                            { name: '파랑', color: '#3b82f6' },
                            { name: '보라', color: '#a855f7' },
                            { name: '분홍', color: '#ec4899' },
                            { name: '오렌지', color: '#f97316' },
                            { name: '청록', color: '#06b6d4' }
                          ].map(c => (
                            <button 
                              key={c.color}
                              title={c.name}
                              onClick={() => setData({...data, imageOverlayColor: c.color})}
                              className={`w-7 h-7 rounded-lg border-2 transition-all ${data.imageOverlayColor === c.color ? 'border-indigo-600 scale-110 shadow-md' : 'border-white shadow-sm hover:scale-110'}`}
                              style={{ backgroundColor: c.color }}
                            />
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-5 bg-white rounded-3xl border-2 border-slate-100 shadow-sm space-y-5">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black text-rose-500 pl-1 uppercase tracking-wider flex items-center gap-1">
                          <ImageIcon size={14}/> 조건부 상태 배지 (Badge)
                        </label>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[9px] font-black text-slate-400 pl-1">배지 노출 조건 (참일 때만 표시)</label>
                        <input 
                          value={data.imageBadgeExpression || ''} 
                          onChange={e => setData({...data, imageBadgeExpression: e.target.value})}
                          className="w-full p-3 text-[11px] rounded-xl border border-slate-200 font-mono font-bold bg-slate-50 outline-none focus:border-rose-300"
                          placeholder="예: row.score >= 90"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 pl-1">배지 아이콘</label>
                          <button 
                            onClick={() => setActivePicker(true)}
                            className="w-full p-3 rounded-xl border border-slate-200 bg-white flex items-center justify-center gap-2 hover:bg-slate-50 transition-all font-bold text-slate-700"
                          >
                            {data.imageBadgeIcon && IconMap[data.imageBadgeIcon] ? 
                              React.createElement(IconMap[data.imageBadgeIcon], { size: 16 }) : <ImageIcon size={16}/>}
                            <span className="text-xs">{data.imageBadgeIcon || '아이콘 선택'}</span>
                          </button>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-400 pl-1">배지 색상 테마</label>
                          <select 
                            value={data.imageBadgeColor || 'bg-rose-500'} 
                            onChange={e => setData({...data, imageBadgeColor: e.target.value})}
                            className="w-full p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none"
                          >
                            <option value="bg-rose-500">빨강색 (기본)</option>
                            <option value="bg-emerald-500">초록색</option>
                            <option value="bg-indigo-600">남색</option>
                            <option value="bg-amber-500">주황색</option>
                            <option value="bg-blue-500">파랑색</option>
                            <option value="bg-slate-900">검정색</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {activePicker && (
                    <IconPicker 
                      isOpen={activePicker} 
                      onClose={() => setActivePicker(false)} 
                      selectedIcon={data.imageBadgeIcon} 
                      onSelect={(n: string) => { setData({...data, imageBadgeIcon: n}); setActivePicker(false); }} 
                    />
                  )}
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 pt-2">
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
                      {FORMULA_EXAMPLES.filter((cat: FormulaCategory) => cat.items.some((item: FormulaExample) => item.code.includes('val') || item.code.includes('row'))).map((cat: FormulaCategory, idx: number) => (
                        <div key={idx} className="space-y-3">
                          <h5 className="text-[10px] font-black text-slate-400 border-l-2 border-indigo-200 pl-2 ml-1">{cat.category}</h5>
                          <div className="flex flex-wrap gap-2">
                            {cat.items.map((ex: FormulaExample, iIdx: number) => (
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
                        className="w-full p-4 border-4 border-slate-900 rounded-3xl font-mono text-sm text-white focus:border-indigo-500 outline-none bg-slate-900 leading-relaxed resize-none shadow-2xl"
                        placeholder="예: val === 'Y' ? '완료' : '대기'"
                        style={{ color: '#ffffff', backgroundColor: '#0f172a' }}
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
                      {REGEX_PRESETS.map((p: {name: string, pattern: string, replace: string}, idx: number) => (
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
                          className="w-full p-3 text-sm rounded-xl border-2 border-slate-900 font-mono text-white focus:border-blue-500 outline-none bg-slate-800 shadow-inner" 
                          style={{ color: '#ffffff', backgroundColor: '#1e293b' }} 
                          placeholder="예: ^(.{2}).*$" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 pl-1">변환 결과 (Replace)</label>
                        <input 
                          value={data.textRegexReplace || ''} 
                          onChange={e => setData({...data, textRegexReplace: e.target.value})} 
                          className="w-full p-3 text-sm rounded-xl border-2 border-slate-900 font-mono text-white focus:border-blue-500 outline-none bg-slate-800 shadow-inner" 
                          style={{ color: '#ffffff', backgroundColor: '#1e293b' }} 
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

export default FormatModal;
