// ?뚯씪 寃쎈줈: app/design/view.tsx
"use client";

import React, { useState } from 'react';
import { View, SchemaData, LayoutRow, Action, LayoutCell, VirtualTable } from './types';
import { 
  Database, LayoutTemplate, Plus, Columns, Rows, ChevronLeft, 
  ChevronRight, X, MousePointerClick, Star, Filter, Search, Smartphone, Eye, Loader2, TableProperties, ArrowUpDown, FolderTree, Trash2, Minus, Wand2, Image as ImageIcon, Type, Sparkles, AlignLeft, AlignCenter, AlignRight, Lock, Zap, Settings2
} from 'lucide-react';
import { supabase } from '@/app/supabaseClient';
import IconPicker, { IconMap } from './picker';
import { FORMULA_EXAMPLES } from './formulas';
import { resolveVirtualData } from '../preview/[appId]/utils';

const REGEX_PRESETS = [
  { name: '?꾪솕踰덊샇 ?섏씠??(-)', pattern: '(\\d{3})(\\d{3,4})(\\d{4})', replace: '$1-$2-$3' },
  { name: '泥쒕떒??肄ㅻ쭏 (??', pattern: '\\B(?=(\\d{3})+(?!\\d))', replace: ',' },
  { name: '??2湲???붿빟 (...)', pattern: '^(.{2}).*$', replace: '$1...' },
  { name: '?대쫫 留덉뒪??(源*??', pattern: '^(.)(.*)(.)$', replace: '$1*$3' },
  { name: '紐⑤뱺 ?レ옄 媛由ш린', pattern: '\\d', replace: '*' }
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
    
    // ?쎌엯 ???ъ빱???좎? 諛?而ㅼ꽌 ?꾩튂 議곗젙
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
            <h3 className="text-xl font-black text-slate-800">?곗씠??袁몃?湲??듭뀡</h3>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-8 space-y-8 overflow-y-auto max-h-[75vh] bg-slate-50/50">
          {/* ?? 怨듯넻 ?띿뒪???ㅽ??쇰쭅 (?≪뀡/?꾨뱶 怨듯넻) ?? */}
          <div className="bg-white p-6 rounded-3xl border-2 border-slate-100 shadow-sm space-y-6 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2 text-slate-800 mb-2 border-b border-slate-50 pb-3">
              <Type size={18}/><h4 className="text-sm font-black tracking-tight">湲瑗?諛??띿뒪???ㅽ???/h4>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider">湲???ш린 (Size)</label>
                <select value={data.textSize || ''} onChange={e => setData({...data, textSize: e.target.value})} className="w-full p-3 text-xs rounded-xl border-2 border-slate-50 font-black text-slate-800 focus:border-indigo-500 outline-none cursor-pointer bg-slate-50/50">
                  <option value="">湲곕낯 (14px)</option>
                  <option value="text-[10px]">珥덉냼??(10px)</option>
                  <option value="text-xs">?꾩＜ ?묎쾶 (12px)</option>
                  <option value="text-sm">?묎쾶 (14px)</option>
                  <option value="text-base">蹂댄넻 (16px)</option>
                  <option value="text-lg">?ш쾶 (18px)</option>
                  <option value="text-xl">留ㅼ슦 ?ш쾶 (20px)</option>
                  <option value="text-2xl">?밸? (24px)</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider">湲??援듦린 (Weight)</label>
                <select value={data.textWeight || ''} onChange={e => setData({...data, textWeight: e.target.value})} className="w-full p-3 text-xs rounded-xl border-2 border-slate-50 font-black text-slate-800 focus:border-indigo-500 outline-none cursor-pointer bg-slate-50/50">
                  <option value="">湲곕낯 (Black)</option>
                  <option value="font-normal">?뉕쾶 (Normal)</option>
                  <option value="font-medium">以묎컙 (Medium)</option>
                  <option value="font-bold">援듦쾶 (Bold)</option>
                  <option value="font-black">留ㅼ슦 援듦쾶 (Black)</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider">湲???뺣젹 (Align)</label>
                <div className="flex bg-slate-50 rounded-xl border-2 border-slate-50 p-1">
                  <button onClick={() => setData({...data, textAlign: 'left'})} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${(!data.textAlign || data.textAlign === 'left') ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}><AlignLeft size={16}/></button>
                  <button onClick={() => setData({...data, textAlign: 'center'})} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${data.textAlign === 'center' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}><AlignCenter size={16}/></button>
                  <button onClick={() => setData({...data, textAlign: 'right'})} className={`flex-1 flex items-center justify-center py-2 rounded-lg transition-all ${data.textAlign === 'right' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'}`}><AlignRight size={16}/></button>
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 pl-1 uppercase tracking-wider">而ㅼ뒪? ?됱긽 (Color)</label>
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
                  <MousePointerClick size={18}/><h4 className="text-sm font-black tracking-tight">?≪뀡 踰꾪듉 怨좉툒 ?ㅽ??쇰쭅</h4>
                </div>

                {/* 1. 踰꾪듉 紐⑥뼇 諛??뺣젹 */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <label className="text-[11px] font-black text-slate-500 pl-1 uppercase tracking-wider">踰꾪듉 紐⑥뼇 (Shape)</label>
                    <div className="flex bg-slate-50 p-1 rounded-2xl border border-slate-100">
                      {[
                        { id: 'square', label: '?ш컖?? },
                        { id: 'rounded', label: '?κ렐 ?ш컖' },
                        { id: 'pill', label: '?뚯빟?? },
                        { id: 'none', label: '紐⑥뼇?놁쓬' }
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
                    <label className="text-[11px] font-black text-slate-500 pl-1 uppercase tracking-wider">踰꾪듉 諛곗튂 (Align) & 援ъ꽦</label>
                    <div className="grid grid-cols-2 gap-2">
                      <select value={data.buttonAlign || 'full'} onChange={e => setData({...data, buttonAlign: e.target.value as any})} className="w-full p-2.5 text-xs rounded-xl border-2 border-slate-100 font-bold text-slate-700 outline-none focus:border-indigo-500">
                        <option value="full">苑?梨꾩슦湲?(Full)</option><option value="left">?쇱そ</option><option value="center">媛?대뜲</option><option value="right">?ㅻⅨ履?/option>
                      </select>
                      <select value={data.buttonStyle || 'both'} onChange={e => setData({...data, buttonStyle: e.target.value as any})} className="w-full p-2.5 text-xs rounded-xl border-2 border-slate-100 font-bold text-slate-700 outline-none focus:border-indigo-500">
                        <option value="both">?꾩씠肄?湲??/option><option value="icon">?꾩씠肄섎쭔</option><option value="text">湲?먮쭔</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 2. 理쒖떊 ?몃젋???ㅽ???(Variant) */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 pl-1 uppercase tracking-wider">理쒖떊 ?몃젋???ㅽ???(Variant)</label>
                  <div className="grid grid-cols-4 gap-3">
                    {[
                      { id: 'default', name: '湲곕낯??, icon: '?? },
                      { id: 'raised', name: '?뚯텧??, icon: '?뵾' },
                      { id: 'inset', name: '??뱁뙣?명삎', icon: '?뵿' },
                      { id: 'outline', name: '?뚮몢由ы삎', icon: '燧? },
                      { id: '3d', name: '?낆껜??3D)', icon: '?쭒' },
                      { id: 'shadow', name: '洹몃┝?먰삎', icon: '?뙧截? },
                      { id: 'glass', name: '?좊━愿묓깮(Glass)', icon: '?뭿' }
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

                {/* 3. 踰꾪듉 而щ윭 (Color) */}
                <div className="space-y-3">
                  <label className="text-[11px] font-black text-slate-500 pl-1 uppercase tracking-wider">踰꾪듉 而щ윭 ?붾젅??(Color)</label>
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
                        {(data.buttonColor === c.id || (!data.buttonColor && c.id === 'slate')) && <div className="absolute inset-0 flex items-center justify-center text-white text-[10px]">??/div>}
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
                    <p className="font-black text-slate-800">???곗씠?곕? ?대?吏濡??쒖떆?좉퉴??</p>
                    <p className="text-[11px] font-bold text-slate-400 mt-1">DB????λ맂 ?띿뒪?멸? ?ъ쭊 URL??寃쎌슦 耳쒖＜?몄슂.</p>
                  </div>
                </div>
                <button onClick={() => setData({ ...data, isImage: !data.isImage })} className={`w-14 h-8 rounded-full transition-colors relative ${data.isImage ? 'bg-indigo-600' : 'bg-slate-300'}`}>
                  <div className={`w-6 h-6 bg-white rounded-full absolute top-1 transition-all shadow-md ${data.isImage ? 'left-7' : 'left-1'}`} />
                </button>
              </div>

              {data.isImage ? (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                  <label className="text-xs font-black text-indigo-600 uppercase tracking-widest pl-1">?대?吏 紐⑥뼇 ?좏깮</label>
                  <div className="grid grid-cols-3 gap-4">
                    <button onClick={() => setData({...data, imageShape: 'square'})} className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${(!data.imageShape || data.imageShape === 'square') ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}><div className="w-12 h-12 bg-slate-300"></div><span className="text-xs font-black text-slate-700">湲곕낯 ?ш컖??/span></button>
                    <button onClick={() => setData({...data, imageShape: 'rounded'})} className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${data.imageShape === 'rounded' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}><div className="w-12 h-12 bg-slate-300 rounded-xl"></div><span className="text-xs font-black text-slate-700">?κ렐 ?ш컖??/span></button>
                    <button onClick={() => setData({...data, imageShape: 'circle'})} className={`flex flex-col items-center gap-3 p-5 rounded-2xl border-2 transition-all ${data.imageShape === 'circle' ? 'border-indigo-600 bg-indigo-50 shadow-md' : 'border-slate-200 bg-white hover:border-indigo-300'}`}><div className="w-12 h-12 bg-slate-300 rounded-full flex items-start justify-center overflow-hidden"><div className="w-6 h-6 bg-slate-400 rounded-full mt-1"></div></div><span className="text-xs font-black text-slate-700">利앸챸?ъ쭊 ?먰삎</span></button>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold px-2 text-center">* ?먰삎? ?몃Ъ ?ъ쭊??怨좊젮?섏뿬 ?먮룞?쇰줈 '?꾩そ(Top)'??湲곗??쇰줈 ?κ?寃??섎씪?낅땲??</p>
                </div>
              ) : (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 pt-2">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 pl-1">湲???됱긽 (Color)</label>
                    <select value={data.textColor || ''} onChange={e => setData({...data, textColor: e.target.value})} className="w-full p-3 text-sm rounded-xl border-2 border-slate-100 font-bold text-slate-900 focus:border-indigo-500 outline-none cursor-pointer" style={{ color: 'var(--text-primary)' }}>
                      <option value="">湲곕낯 ?됱긽</option>
                      <option value="text-slate-500">?뚯깋 (Slate)</option>
                      <option value="text-indigo-600">泥?낫??(Indigo)</option>
                      <option value="text-blue-600">?뚮옉 (Blue)</option>
                      <option value="text-emerald-600">珥덈줉 (Emerald)</option>
                      <option value="text-rose-600">鍮④컯 (Rose)</option>
                      <option value="text-amber-600">二쇳솴 (Amber)</option>
                      <option value="text-white">?곗깋 (White - ?대몢??諛곌꼍??</option>
                    </select>
                  </div>

                  {/* ???곗씠??媛怨??뚯씠?꾨씪??媛?대뱶 UI */}
                  <div className="py-6 flex flex-col items-center">
                    <div className="w-full h-px bg-slate-200 relative mb-8">
                       <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[11px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">Data Transformation Pipeline</span>
                    </div>
                    
                    <div className="flex items-center justify-between w-full max-w-sm relative">
                      {/* ?뚯씠?꾨씪????*/}
                      <div className="absolute top-1/2 left-0 w-full h-0.5 bg-indigo-100 -translate-y-1/2 -z-10"></div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center text-xs font-black shadow-lg">1</div>
                        <span className="text-[10px] font-black text-indigo-600">?섏떇 怨꾩궛</span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-black shadow-lg">2</div>
                        <span className="text-[10px] font-black text-blue-500">?뺢퇋???⑦꽩</span>
                      </div>
                      
                      <div className="flex flex-col items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shadow-lg">3</div>
                        <span className="text-[10px] font-black text-emerald-500">???룸쭚 異붽?</span>
                      </div>
                    </div>
                    <p className="mt-6 text-[11px] font-bold text-slate-400 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 italic">
                      ?뮕 ???쒖꽌?濡??곗씠?곌? 李⑤??濡?媛怨듬맗?덈떎. (議고빀 媛??)
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pb-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-600 pl-1 uppercase tracking-tighter flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">3</span> ?곗씠???욊???異붽? (Prefix)</label>
                      <input value={data.textPrefix || ''} onChange={e => setData({...data, textPrefix: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 font-bold text-slate-900 focus:border-emerald-500 outline-none transition-colors" style={{ color: 'var(--text-primary)' }} placeholder="?? [ " />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-emerald-600 pl-1 uppercase tracking-tighter flex items-center gap-1"><span className="w-4 h-4 rounded-full bg-emerald-100 flex items-center justify-center">3</span> ?곗씠???룰???異붽? (Suffix)</label>
                      <input value={data.textSuffix || ''} onChange={e => setData({...data, textSuffix: e.target.value})} className="w-full p-4 rounded-xl border-2 border-slate-100 font-bold text-slate-900 focus:border-emerald-500 outline-none transition-colors" style={{ color: 'var(--text-primary)' }} placeholder="?? ] ?? />
                    </div>
                  </div>
                  
                  {/* 1?④퀎: 留덈쾿???섏떇 ?붿쭊 */}
                  <div className="p-6 bg-indigo-50/50 rounded-[2.5rem] border-2 border-indigo-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-indigo-700 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px] font-black">1</span> 
                        <Sparkles size={16}/> 留덈쾿???섏떇 ?쇱씠釉뚮윭由?(Formula)
                      </label>
                      <button onClick={() => setData({...data, textExpression: ''})} className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors">珥덇린??/button>
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
                      <label className="text-[10px] font-black text-indigo-500 pl-1">?섏떇 ?먮뵒??(Javascript)</label>
                      <textarea 
                        ref={formulaRef}
                        value={data.textExpression || ''} 
                        onChange={e => setData({...data, textExpression: e.target.value})}
                        rows={4}
                        className="w-full p-4 border-2 border-indigo-100 rounded-3xl font-mono text-xs text-slate-900 focus:border-indigo-500 outline-none bg-white leading-relaxed resize-none shadow-inner"
                        placeholder="?? val === 'Y' ? '?꾨즺' : '?湲?"
                      />
                      <div className="flex justify-between items-center px-1">
                        <p className="text-[9px] text-slate-400 font-bold italic">* ?ъ슜 媛?ν븳 蹂?? val (?꾩옱媛?, row (???꾩껜 ?곗씠??</p>
                      </div>
                    </div>
                  </div>

                  {/* 2?④퀎: 留덈쾿???뺢퇋??*/}
                  <div className="p-6 bg-blue-50/50 rounded-2xl border-2 border-blue-100 space-y-6">
                    <div className="flex items-center justify-between">
                      <label className="text-[11px] font-black text-blue-700 uppercase tracking-widest flex items-center gap-1.5">
                        <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-[10px] font-black">2</span>
                        <Sparkles size={16}/> 留덈쾿???뺢퇋??(Regex)
                      </label>
                      <button 
                        onClick={() => setData({...data, textRegexPattern: '', textRegexReplace: ''})} 
                        className="text-[10px] font-black text-rose-500 bg-rose-50 px-2 py-1 rounded-lg hover:bg-rose-100 transition-colors"
                      >
                        珥덇린??                      </button>
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
                        <label className="text-[10px] font-black text-blue-500 pl-1">?뺢퇋???⑦꽩 (Pattern)</label>
                        <input 
                          value={data.textRegexPattern || ''} 
                          onChange={e => setData({...data, textRegexPattern: e.target.value})} 
                          className="w-full p-3 text-sm rounded-xl border border-blue-200 font-mono text-slate-900 focus:border-blue-500 outline-none bg-white" 
                          style={{ color: 'var(--text-primary)' }} 
                          placeholder="?? ^(.{2}).*$" 
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-blue-500 pl-1">蹂??寃곌낵 (Replace)</label>
                        <input 
                          value={data.textRegexReplace || ''} 
                          onChange={e => setData({...data, textRegexReplace: e.target.value})} 
                          className="w-full p-3 text-sm rounded-xl border border-blue-200 font-mono text-slate-900 focus:border-blue-500 outline-none bg-white" 
                          style={{ color: 'var(--text-primary)' }} 
                          placeholder="?? $1..." 
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
        <button onClick={onClose} className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all">痍⑥냼</button>
        <button onClick={() => onSave(data)} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all">?ㅼ젙 ?꾨즺</button>
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

// ?? [?좉퇋] ?뺣젹 ?ㅼ젙 ?쒕툕 而댄룷?뚰듃 (紐⑤뱢?? ??
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
      <option value="">{isSecondary ? '(2李??뺣젹 ?놁쓬)' : '湲곕낯 ?뺣젹 (DB ?ㅼ젙??'}</option>
      {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
    </select>
    {column && (
      <div className="mt-3 animate-in fade-in slide-in-from-top-2">
        <select 
          className="w-full p-3 rounded-xl bg-white border border-slate-200 font-black text-slate-600 cursor-pointer outline-none focus:border-indigo-400" 
          value={direction || 'desc'} 
          onChange={e => onDirectionChange(e.target.value as any)}
        >
          <option value="desc">?대┝李⑥닚 (媛????理쒖떊 媛믩???</option>
          <option value="asc">?ㅻ쫫李⑥닚 (媛???묒?/怨쇨굅 媛믩???</option>
        </select>
      </div>
    )}
  </div>
);

export default function ViewEditor({ view, schemaData, actions, virtualTables = [], onUpdate }: ViewEditorProps) {
  const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
  const [formatModalCell, setFormatModalCell] = useState<LayoutCell | null>(null);

  // --- [?좉퇋] 媛???뚯씠釉?諛?而щ읆 怨꾩궛 濡쒖쭅 ---
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

  const fetchPreviewData = async () => {
    if (!view.tableName) return alert("癒쇱? ?뚯씠釉붿쓣 ?좏깮?댁＜?몄슂.");
    
    // [?ㅻ쭏??湲곕낯媛? id媛 ?덉쑝硫??먮룞?쇰줈 ?좏깮, ?대? ??λ맂寃??덉쑝硫?洹멸쾬???곗꽑??    const defaultKey = view.lockedKeyColumn || (availableColumns.includes('id') ? 'id' : '');
    setTempKeyColumn(defaultKey);
    setSelectedKeys(view.lockedRecordKeys || []);

    setIsPreviewModalOpen(true); 
    setIsLoadingPreview(true);

    try {
      // 1. ?곗씠??媛?몄삤湲?(媛?곸씠硫?踰좎씠???뚯씠釉붿뿉??媛?몄샂)
      let query = supabase.from(baseTableName!).select('*').limit(30000); 
      
      // ?쭬 [?좉퇋] ?몄퐫???ㅽ???吏?ν삎 ?꾪꽣 ?숆린??      if (view.filterColumn && (view.filterValue || view.filterOperator?.includes('null'))) {
        const op = view.filterOperator || 'eq';
        const val = String(view.filterValue || '').trim();
        const col = view.filterColumn;

        // ?먮낯 ?뚯씠釉붿뿉 ?덈뒗 而щ읆??寃쎌슦?먮쭔 荑쇰━?⑥뿉???꾪꽣留?(媛??而щ읆 ?꾪꽣???섏쨷???대씪?댁뼵??泥섎━)
        if (schemaData[baseTableName!]?.includes(col)) {
          const now = new Date();
          const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

          if (val === 'today' || val === '?ㅻ뒛') {
            query = query.gte(col, isoToday).lte(col, `${isoToday}T23:59:59`);
          } else if (val === 'yesterday' || val === '?댁젣') {
            const yestDate = new Date();
            yestDate.setDate(now.getDate() - 1);
            const isoYesterday = `${yestDate.getFullYear()}-${String(yestDate.getMonth() + 1).padStart(2, '0')}-${String(yestDate.getDate()).padStart(2, '0')}`;
            query = query.gte(col, isoYesterday).lte(col, `${isoYesterday}T23:59:59`);
          } else if (val === 'this_month' || val === '?대쾲 ??) {
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

      // ?뺣젹 ?곸슜
      if (view.sortColumn && schemaData[baseTableName!]?.includes(view.sortColumn)) {
        query = query.order(view.sortColumn, { ascending: view.sortDirection === 'asc' });
      }

      const { data, error } = await query;
      if (error) throw error;

      // 2. 媛???곗씠??由ъ「鍮?(Join & Formula ?곸슜)
      let finalData = data || [];
      if (virtualTable) {
        finalData = await resolveVirtualData(finalData, virtualTable);
      }

      setPreviewData(finalData);
    } catch (err: any) { alert("?곗씠??濡쒕뱶 ?ㅽ뙣: " + err.message); } 
    finally { setIsLoadingPreview(false); }
  };

  const mutate = (callback: (rows: LayoutRow[]) => void) => {
    const next = JSON.parse(JSON.stringify(view.layoutRows));
    callback(next); onUpdate({ ...view, layoutRows: next });
  };

  const addRootRow = () => onUpdate({ ...view, layoutRows: [...view.layoutRows, { id: `r_${Date.now()}`, flex: 1, cells: [{ id: `c_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }] });

  const RenderRowEditor = ({ row, depth = 0 }: { row: LayoutRow, depth: number }) => {
    // 源딆씠???곕Ⅸ ?ㅽ???李⑤퀎??(遺紐⑥씪?섎줉 ???ш퀬 ?쒕졆?섍쾶)
    const rowPadding = depth === 0 ? 'p-6' : depth === 1 ? 'p-4' : 'p-2';
    const rowGap = depth === 0 ? 'gap-5' : 'gap-3';
    const bgColor = depth === 0 ? 'bg-slate-100/50' : depth === 1 ? 'bg-slate-50' : 'bg-white';
    const borderWeight = depth === 0 ? 'border-2' : 'border';

    return (
    <div className={`flex ${rowGap} ${rowPadding} rounded-[2rem] ${borderWeight} border-slate-300 ${bgColor} relative mb-4 group/row transition-all w-fit shadow-sm`}>
      <div className="absolute -left-3 -top-3 flex items-center bg-indigo-600 text-white rounded-full shadow-lg opacity-0 group-hover/row:opacity-100 z-40 overflow-hidden transition-all border-2 border-white">
        <button onClick={(e) => { e.stopPropagation(); mutate(rows => { const f = (arr: any[]) => { for (const r of arr) { if (r.id === row.id) { r.flex = Math.max(1, (r.flex || 1) - 1); return true; } for (const c of r.cells) if (c.nestedRows && f(c.nestedRows)) return true; } return false; }; f(rows); }); }} className="p-1 hover:bg-indigo-700"><Minus size={14} strokeWidth={3}/></button>
        <span className="text-[10px] font-black px-1 whitespace-nowrap">{depth + 1}痢??몃줈鍮꾩쑉 : {row.flex || 1}</span>
        <button onClick={(e) => { e.stopPropagation(); mutate(rows => { const f = (arr: any[]) => { for (const r of arr) { if (r.id === row.id) { r.flex = (r.flex || 1) + 1; return true; } for (const c of r.cells) if (c.nestedRows && f(c.nestedRows)) return true; } return false; }; f(rows); }); }} className="p-1 hover:bg-indigo-700"><Plus size={14} strokeWidth={3}/></button>
      </div>
      <button onClick={() => mutate(rows => { const remove = (arr: LayoutRow[]) => { const idx = arr.findIndex(r => r.id === row.id); if (idx > -1) arr.splice(idx, 1); else arr.forEach(r => r.cells.forEach(c => { if(c.nestedRows) remove(c.nestedRows); })); }; remove(rows); })} className="absolute -right-3 -top-3 w-7 h-7 bg-slate-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover/row:opacity-100 z-30 transition-all shadow-lg"><X size={14} strokeWidth={3} /></button>

      {row.cells.map(cell => (
        <div key={cell.id} className={`flex flex-col gap-2 border-2 ${cell.contentType === 'field' ? 'border-indigo-300' : cell.contentType === 'action' ? 'border-rose-300' : 'border-slate-200'} bg-white rounded-2xl p-4 min-h-[120px] shadow-sm relative transition-all shrink-0 ${cell.contentType === 'nested' ? 'w-fit' : 'w-[280px]'}`}>
          <div className="flex justify-between items-center bg-indigo-50 px-2 py-1 rounded-xl">
            <div className="flex items-center gap-1.5"><button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex = Math.max(1, c.flex - 1); if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-700 hover:scale-125 transition-transform p-1"><ChevronLeft size={16}/></button><span className="text-[11px] font-black text-indigo-700 tracking-tighter">媛濡?{cell.flex}</span><button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex += 1; if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-700 hover:scale-125 transition-transform p-1"><ChevronRight size={16}/></button></div>
            <div className="flex items-center gap-1">
              {/* 3?④퀎 ?쒗븳 濡쒖쭅: depth媛 2 誘몃쭔???뚮쭔 以묒꺽 踰꾪듉 ?몄텧 */}
              {depth < 2 && (
                <button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) { c.contentType = 'nested'; c.nestedRows = [{ id: `nr_${Date.now()}`, flex: 1, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }]; } else if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="text-indigo-400 hover:text-indigo-700 p-1" title="?대????몃줈 ?덉씠?꾩썐 異붽?"><Rows size={18}/></button>
              )}
              {row.cells.length > 1 && <button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => { const idx = r.cells.findIndex((c: any) => c.id === cell.id); if (idx > -1) r.cells.splice(idx, 1); else r.cells.forEach((c: any) => { if(c.nestedRows) f(c.nestedRows); }); }); f(rows); })} className="text-rose-300 hover:text-rose-600 p-1 transition-colors"><Trash2 size={16}/></button>}
            </div>
          </div>

          {cell.contentType === 'nested' ? (
            <div className="space-y-3 pt-2 h-full">
              {cell.nestedRows?.map(nr => <RenderRowEditor key={nr.id} row={nr} depth={depth + 1} />)}
              {/* ?먯떇 Row 異붽? ?쒖뿉??3?④퀎 寃利?(?대? depth+1???뚮뜑留곷릺誘濡??ш린?쒕룄 depth 泥댄겕) */}
              {depth < 2 && (
                <button onClick={() => mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) c.nestedRows?.push({ id: `nr_${Date.now()}`, flex: 1, cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }); if(c.nestedRows) f(c.nestedRows); })); f(rows); })} className="w-full py-3 border-2 border-dashed border-slate-200 text-[10px] font-black text-slate-400 rounded-xl hover:bg-slate-50 transition-colors">+ ?몃줈 遺꾪븷 異붽?</button>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2">
              <select className={`flex-1 p-3 text-xs font-black bg-slate-50 border-2 rounded-xl outline-none transition-all ${cell.contentType !== 'empty' ? 'text-indigo-700 border-indigo-200' : 'text-slate-500 border-slate-200 focus:border-indigo-500'}`} value={(cell.contentType === 'action' ? 'act_' : '') + (cell.contentValue || '')} onChange={e => { const val = e.target.value; mutate(rows => { const f = (arr: any[]) => arr.forEach(r => r.cells.forEach((c: any) => { if(c.id === cell.id) { if (val.startsWith('act_')) { c.contentType = 'action'; c.contentValue = val.replace('act_', ''); } else { c.contentType = val ? 'field' : 'empty'; c.contentValue = val; } } else if(c.nestedRows) f(c.nestedRows); })); f(rows); }); }}>
                <option value="">-- ?곗씠???≪뀡 ?좏깮 --</option>
                <optgroup label="?뚯씠釉?而щ읆">{availableColumns.map(col => <option key={col} value={col}>{col}</option>)}</optgroup>
                <optgroup label="?≪뀡(湲곕뒫)">{actions.map(a => <option key={a.id} value={`act_${a.id}`}>??{a.name}</option>)}</optgroup>
              </select>
              {(cell.contentType === 'field' || cell.contentType === 'action') && (
                <button onClick={() => setFormatModalCell(cell)} className={`w-11 h-11 shrink-0 rounded-xl flex items-center justify-center transition-all ${(cell.isImage || cell.textRegexPattern || cell.textSize || cell.buttonShape) ? 'bg-indigo-600 text-white shadow-md hover:bg-indigo-700' : 'bg-indigo-50 text-indigo-500 hover:bg-indigo-100 border border-indigo-100'}`} title="?곗씠??袁몃?湲?><Wand2 size={18} strokeWidth={2.5}/></button>
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
        <label className="text-[11px] font-black text-slate-400 block mb-4 uppercase tracking-widest px-2">?꾩옱 ?붾㈃(View) 湲곕낯 ?뺣낫</label>
        <div className="flex items-center gap-6">
          <button onClick={() => setIsIconPickerOpen(true)} className="w-16 h-16 shrink-0 bg-indigo-50 border-2 border-indigo-100 rounded-[1.5rem] flex items-center justify-center text-indigo-600 hover:border-indigo-400 hover:shadow-md transition-all group">
            {view.icon && IconMap[view.icon] ? React.createElement(IconMap[view.icon], { size: 32, className: "group-hover:scale-110 transition-transform" }) : <Star size={32} className="text-indigo-200 group-hover:text-indigo-400"/>}
          </button>
          <input className="flex-1 p-5 rounded-[1.5rem] border-2 border-slate-100 text-3xl font-black outline-none focus:border-indigo-500 transition-all text-slate-900 min-w-[300px]" value={view.name} onChange={e => onUpdate({...view, name: e.target.value})} placeholder="?붾㈃ ?대쫫???낅젰?섏꽭?? />
        </div>
        <div className="mt-8 pt-6 border-t border-slate-100 whitespace-normal">
          <label className="text-[12px] font-black text-slate-600 block px-2 mb-3 tracking-tight">硫붾돱 踰꾪듉 ?쒖떆 ?꾩튂 (Nav Position)</label>
          <div className="flex gap-3 px-2 flex-wrap min-w-[400px]">
            <button onClick={() => onUpdate({ ...view, navPosition: 'both' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(!view.navPosition || view.navPosition === 'both') ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>?뵺 紐⑤몢 ?몄텧</button>
            <button onClick={() => onUpdate({ ...view, navPosition: 'bottom' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(view.navPosition === 'bottom') ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>?뵻 ?섎떒/?ъ씠?쒕쭔</button>
            <button onClick={() => onUpdate({ ...view, navPosition: 'menu' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(view.navPosition === 'menu') ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>?뵻 ?곗륫 ?④?踰꾪듉留?/button>
            <button onClick={() => onUpdate({ ...view, navPosition: 'hidden' })} className={`flex-1 min-w-[140px] py-3 px-4 rounded-2xl text-[13px] font-bold border-2 transition-all ${(view.navPosition === 'hidden') ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-sm' : 'border-slate-100 bg-white text-slate-500 hover:border-indigo-200'}`}>?슟 硫붾돱?먯꽌 ?④?</button>
          </div>
          <p className="text-[11px] font-bold text-slate-400 px-3 mt-3 w-full max-w-[800px] whitespace-normal">?????붾㈃?쇰줈 吏꾩엯?????덈뒗 諛붾줈媛湲?硫붾돱媛 ?대뵒???쒖떆?좎? 寃곗젙?⑸땲?? ?ㅻⅨ ?붾㈃?먯꽌 ?대룞 ?≪뀡?쇰줈 ?곌껐?섎젮硫?'?④?'?쇰줈 ?ㅼ젙?섏꽭??</p>
        </div>
      </section>

      <section className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100 animate-in fade-in slide-in-from-bottom-8 duration-600 relative overflow-hidden">

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className={`p-3 text-white rounded-2xl shadow-lg transition-colors ${view.lockedRecordKeys?.length ? 'bg-rose-500' : 'bg-indigo-600'}`}>
              <Database size={24}/>
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 whitespace-nowrap">1. ?곗씠??議고쉶 洹쒖튃 ?ㅼ젙</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {view.lockedRecordKeys?.length ? (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2">
                    <span className="text-xs font-black text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-100 flex items-center gap-1.5 shadow-sm">
                      <Lock size={12}/> ?섎룞 ?좏깮 紐⑤뱶 ?쒖꽦??({view.lockedRecordKeys.length}媛?怨좎젙??
                    </span>
                    <button 
                      onClick={() => onUpdate({ ...view, lockedRecordKeys: [], lockedKeyColumn: undefined, isLocked: false })}
                      className="text-[10px] font-black text-slate-400 hover:text-rose-500 hover:bg-rose-50 px-2 py-1 rounded-lg transition-all border border-transparent hover:border-rose-100"
                    >
                      [?꾩껜 議고쉶濡?蹂듦뎄]
                    </button>
                  </div>
                ) : (
                  <p className="text-sm text-slate-500 font-bold whitespace-nowrap">?대뼡 ?곗씠?곕? ?대뼸寃?蹂댁뿬以꾩?(?꾪꽣留??뺣젹/洹몃９?? ?ㅼ젙?섏꽭??</p>
                )}
              </div>
            </div>
          </div>
          {view.tableName && (
            <button 
              onClick={fetchPreviewData} 
              className={`px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 transition-all border whitespace-nowrap ${view.lockedRecordKeys?.length ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100' : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'}`}
            >
              <Eye size={18} /> {view.lockedRecordKeys?.length ? '?섎룞 ?좏깮(Pick) ?섏젙?섍린' : '?ㅼ젙 ?뺤씤 諛??곗씠???섎룞 ??Pick)'}
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-8 min-w-max w-full">
          <div className="space-y-4">
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1">?곌껐 ?뚯씠釉?/label>
              <select 
                className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-slate-800 outline-none focus:border-indigo-500 transition-all cursor-pointer" 
                value={view.tableName || ''} 
                onChange={e => onUpdate({...view, tableName: e.target.value, filterColumn: null, sortColumn: null, groupByColumn: null, layoutRows: []})}
              >
                <option value="">?뚯씠釉??좏깮</option>
                <optgroup label="?곗씠?곕쿋?댁뒪 ?뚯씠釉?(Supabase)">
                  {Object.keys(schemaData).sort().map(t => <option key={t} value={t}>{t}</option>)}
                </optgroup>
                {virtualTables.length > 0 && (
                  <optgroup label="媛???뚯씠釉?(Virtual)">
                    {virtualTables.map(vt => <option key={vt.id} value={vt.id}>?뵎 {vt.name} (媛??</option>)}
                  </optgroup>
                )}
              </select>
            </div>
            <div><label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5"><Filter size={14}/> 1?④퀎 ?쒕쾭 ?꾪꽣 (?좏깮?ы빆)</label><select className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-indigo-600 outline-none focus:border-indigo-500 transition-all cursor-pointer" value={view.filterColumn || ''} onChange={e => onUpdate({...view, filterColumn: e.target.value || null})}><option value="">?꾪꽣 ?놁쓬 (?꾩껜 ?곗씠??媛?몄삤湲?</option>{availableColumns.map(col => <option key={col} value={col}>{col}</option>)}</select></div>
          </div>
          <div className="bg-slate-50/50 rounded-3xl p-6 border-2 border-dashed border-slate-200 flex flex-col justify-center">
            {view.filterColumn ? (
              <div className="space-y-5 animate-in zoom-in-95 duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex gap-2 items-center text-indigo-600 font-black text-sm whitespace-nowrap">
                    <Sparkles size={16} className="text-amber-500 animate-pulse"/> ?ㅻ쭏??議곌굔 鍮뚮뜑
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <select 
                    className="w-full p-3.5 rounded-xl border-2 border-indigo-100 font-bold text-sm text-slate-900 outline-none bg-white cursor-pointer transition-all focus:border-indigo-500" 
                    value={view.filterOperator || 'eq'} 
                    onChange={e => onUpdate({...view, filterOperator: e.target.value as any})}
                  >
                    <option value="eq">?쇱튂??(=)</option>
                    <option value="neq">?쇱튂?섏? ?딆쓬 (!=)</option>
                    <option value="contains">?ы븿??(Contains)</option>
                    <option value="starts">濡??쒖옉??/option>
                    <option value="ends">濡??앸궓</option>
                    <option value="gt">蹂대떎 ?댄썑/??(&gt;)</option>
                    <option value="lt">蹂대떎 ?댁쟾/?묒쓬 (&lt;)</option>
                    <option value="gte">?댄썑/?ш굅??媛숈쓬 (&gt;=)</option>
                    <option value="lte">?댁쟾/?묎굅??媛숈쓬 (&lt;=)</option>
                    <option value="in">紐⑸줉???ы븿 (A, B, C)</option>
                    <option value="between">踰붿쐞 ??(A..B)</option>
                    <option value="is_null">鍮꾩뼱 ?덉쓬</option>
                    <option value="is_not_null">媛믪씠 ?덉쓬</option>
                  </select>

                  {!view.filterOperator?.includes('null') && (
                    <div className="space-y-3">
                      <input 
                        className="w-full p-3.5 rounded-xl border-2 border-indigo-100 font-bold text-sm text-slate-900 outline-none bg-white focus:border-indigo-500 transition-all shadow-sm" 
                        value={view.filterValue || ''} 
                        onChange={e => onUpdate({...view, filterValue: e.target.value})} 
                        placeholder={view.filterOperator === 'between' ? "?? 10..50 ?먮뒗 2024-01-01..2024-01-31" : "鍮꾧탳??媛믪쓣 ?낅젰?섏꽭??.."} 
                      />
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {[
                          { id: 'today', label: '?ㅻ뒛', color: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                          { id: 'yesterday', label: '?댁젣', color: 'bg-slate-50 text-slate-600 border-slate-200' },
                          { id: 'this_month', label: '?대쾲 ??, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                          { id: 'me', label: '??蹂몄씤)', color: 'bg-indigo-50 text-indigo-600 border-indigo-100' }
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
<div className="text-center space-y-3"><Smartphone className="mx-auto text-slate-300" size={40}/><p className="text-xs text-slate-400 font-bold leading-relaxed whitespace-nowrap">?꾩슂??寃쎌슦 醫뚯륫?먯꽌 移쇰읆??br/>?좏깮???곗씠?곕? ?꾪꽣留곹븯?몄슂.</p></div>)}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-8 mt-8 pt-8 border-t border-slate-50 min-w-max w-full">
          <div className="space-y-6">
            <div className={`bg-blue-50/50 p-6 rounded-[2.5rem] border-2 border-blue-100 space-y-6 transition-all duration-500 ${!view.groupByColumn ? 'opacity-100' : 'bg-white shadow-xl border-blue-200 scale-105'}`}>
              <div className="flex items-center justify-between mb-2 px-1">
                <label className="text-[11px] font-black text-blue-600 block uppercase tracking-widest flex items-center gap-2">
                  <FolderTree size={16}/> 1李??곗씠??臾띠뼱二쇨린 (Primary Grouping)
                </label>
                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-blue-100 scale-90 origin-right">
                  <button onClick={() => onUpdate({...view, groupAccordionMode: 'multiple'})} className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${view.groupAccordionMode === 'multiple' || !view.groupAccordionMode ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>?ㅼ쨷 ?대┝</button>
                  <button onClick={() => onUpdate({...view, groupAccordionMode: 'single'})} className={`px-3 py-1 rounded-lg text-[9px] font-black transition-all ${view.groupAccordionMode === 'single' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-400'}`}>?섎굹留??대┝</button>
                </div>
              </div>
              <div className="flex gap-2">
                <select 
                  className="flex-1 p-4 rounded-2xl bg-white border-2 border-blue-200 font-black text-slate-800 cursor-pointer outline-none focus:border-blue-500 transition-all shadow-sm" 
                  value={view.groupByColumn || ''} 
                  onChange={e => onUpdate({...view, groupByColumn: e.target.value || null})}
                >
                  <option value="">臾띠? ?딆쓬 (?쇰컲 由ъ뒪???뺥깭)</option>
                  {availableColumns.map(col => <option key={col} value={col}>{col} 移쇰읆 湲곗??쇰줈 臾띔린</option>)}
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
                  {/* 洹몃９ 諛??붿옄??*/}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">?ㅻ뜑 ?붿옄??諛?媛怨?/label>
                      <button 
                        onClick={() => onUpdate({ ...view, groupHeaderIcon: 'Folder', groupHeaderAlign: 'left', groupHeaderColor: 'text-indigo-900', groupHeaderTextSize: 'text-[15px]', groupHeaderExpression: '' })}
                        className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        ?붿옄??珥덇린??                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">?ㅻ뜑 ?꾩씠肄?/label>
                        <select value={view.groupHeaderIcon || 'Folder'} onChange={e => onUpdate({...view, groupHeaderIcon: e.target.value})} className="w-full p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                          <option value="Folder">?대뜑</option><option value="Star">蹂?/option><option value="Tag">?쒓렇</option><option value="User">?ъ슜??/option><option value="Circle">?먰삎</option><option value="Hash">?댁떆(#)</option><option value="Info">?뺣낫</option><option value="AlertCircle">寃쎄퀬</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">?ㅻ뜑 ?됱긽</label>
                        <select value={view.groupHeaderColor || 'text-indigo-900'} onChange={e => onUpdate({...view, groupHeaderColor: e.target.value})} className="w-full p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                          <option value="text-indigo-900">?⑥깋 (湲곕낯)</option><option value="text-slate-700">吏꾪쉶??/option><option value="text-emerald-700">珥덈줉??/option><option value="text-blue-700">?뚮옉??/option><option value="text-rose-700">鍮④컯??/option><option value="text-amber-700">二쇳솴??/option><option value="text-violet-700">蹂대씪??/option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">湲???ш린 諛??뺣젹</label>
                        <div className="flex gap-1.5">
                          <select value={view.groupHeaderTextSize || 'text-[15px]'} onChange={e => onUpdate({...view, groupHeaderTextSize: e.target.value})} className="flex-1 p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                            <option value="text-xs">?묎쾶</option><option value="text-[14px]">蹂댄넻</option><option value="text-[15px]">議곌툑 ?ш쾶</option><option value="text-lg">?ш쾶</option><option value="text-xl">留ㅼ슦 ?ш쾶</option>
                          </select>
                          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                            {[
                              { id: 'left', icon: <AlignLeft size={14}/> },
                              { id: 'center', icon: <AlignCenter size={14}/> },
                              { id: 'right', icon: <AlignRight size={14}/> }
                            ].map(a => (
                              <button key={a.id} onClick={() => onUpdate({...view, groupHeaderAlign: a.id as any})} className={`p-2 rounded-lg transition-all ${view.groupHeaderAlign === a.id || (!view.groupHeaderAlign && a.id === 'left') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{a.icon}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">?듦퀎 ?쒖떆 ?꾩튂</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 h-[44px]">
                          <button 
                            onClick={() => onUpdate({...view, groupAggregationPosition: 'beside_label'})}
                            className={`flex-1 text-[9px] font-black rounded-lg transition-all ${view.groupAggregationPosition === 'beside_label' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                          >
                            ?대쫫 諛붾줈 ??                          </button>
                          <button 
                            onClick={() => onUpdate({...view, groupAggregationPosition: 'right_end'})}
                            className={`flex-1 text-[9px] font-black rounded-lg transition-all ${view.groupAggregationPosition === 'right_end' || !view.groupAggregationPosition ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                          >
                            ?ㅻⅨ履???                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-indigo-500 pl-1 flex items-center gap-1"><Sparkles size={12}/> ?ㅻ뜑 媛怨??섏떇 (Expression)</label>
                      <input 
                        className="w-full p-4 rounded-2xl bg-white border border-indigo-100 font-mono text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400 transition-all shadow-inner"
                        value={view.groupHeaderExpression || ''}
                        onChange={e => onUpdate({...view, groupHeaderExpression: e.target.value})}
                        placeholder="?? val + ' (' + rowCount + '紐?'"
                      />
                      <p className="text-[9px] font-bold text-slate-400 px-1 italic">??媛?⑺븳 蹂?? val (洹몃９媛?, rowCount (洹몃９ ?곗씠??媛쒖닔)</p>
                    </div>
                  </div>

                  {/* ?듦퀎 ?붿빟 ?붿쭊 */}
                  <div className="space-y-4 pt-4 border-t border-blue-100">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">洹몃９ ?붿빟 ?듦퀎 (Aggregations)</label>
                      <button 
                        onClick={() => onUpdate({ ...view, groupAggregations: [...(view.groupAggregations || []), { id: `agg_${Date.now()}`, type: 'count', label: '?⑷퀎', color: 'bg-indigo-50 text-indigo-600' }] })}
                        className="flex items-center gap-1 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-black hover:bg-indigo-100 transition-all border border-indigo-100"
                      >
                        <Plus size={12}/> ?듦퀎 異붽?
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(view.groupAggregations || []).map((agg, idx) => (
                        <div key={agg.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 animate-in slide-in-from-right-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black py-1 px-2.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">Summary #{idx+1}</span>
                            <button onClick={() => onUpdate({ ...view, groupAggregations: view.groupAggregations?.filter(a => a.id !== agg.id) })} className="text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">怨꾩궛 諛⑹떇</label>
                              <select 
                                value={agg.type} 
                                onChange={e => onUpdate({ ...view, groupAggregations: view.groupAggregations?.map(a => a.id === agg.id ? { ...a, type: e.target.value as any } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                              >
                                <option value="count">珥?媛쒖닔 (Count)</option>
                                <option value="sum">?⑷퀎 (Sum)</option>
                                <option value="avg">?됯퇏 (Avg)</option>
                                <option value="count_if">議곌굔遺 媛쒖닔 (Count If)</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">?쒖떆 ?쇰꺼</label>
                              <input 
                                value={agg.label} 
                                onChange={e => onUpdate({ ...view, groupAggregations: view.groupAggregations?.map(a => a.id === agg.id ? { ...a, label: e.target.value } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                                placeholder="?? 李몄뿬?몄썝"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">?쒖떆 ?뺥깭</label>
                              <select 
                                value={agg.displayStyle || 'button'} 
                                onChange={e => onUpdate({ ...view, groupAggregations: view.groupAggregations?.map(a => a.id === agg.id ? { ...a, displayStyle: e.target.value as any } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                              >
                                <option value="button">?뚯빟??(Button)</option>
                                <option value="text">湲?먮쭔 (Text)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">???而щ읆</label>
                              <select 
                                value={agg.column || ''} 
                                onChange={e => onUpdate({ ...view, groupAggregations: view.groupAggregations?.map(a => a.id === agg.id ? { ...a, column: e.target.value } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                              >
                                <option value="">而щ읆 ?좏깮</option>
                                {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            
                            {(agg.type === 'sum' || agg.type === 'avg' || agg.type === 'count_if') && (
                              <div className="space-y-1.5 animate-in fade-in">
                                <label className="text-[9px] font-black text-amber-600 pl-1 flex items-center gap-1">
                                  <Sparkles size={10}/> {agg.type === 'count_if' ? '議곌굔 ?섏떇 (JS)' : '媛怨??섏떇 (Target JS)'}
                                </label>
                                <input 
                                  value={agg.conditionValue || ''} 
                                  onChange={e => onUpdate({ ...view, groupAggregations: view.groupAggregations?.map(a => a.id === agg.id ? { ...a, conditionValue: e.target.value } : a) })}
                                  className="w-full p-2.5 text-[11px] rounded-xl border border-amber-200 font-mono font-bold bg-white outline-none focus:border-amber-400"
                                  placeholder={agg.type === 'count_if' ? "?? val === '?꾨즺'" : "?? val * 1.1"}
                                />
                                <p className="text-[8px] font-bold text-slate-400 px-1 leading-tight">
                                  {agg.type === 'count_if' ? '* val??true硫?移댁슫?? : '* 媛怨듬맂 媛믪쓣 ?뷀븿 (誘몄엯?????먮낯)'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      {(!view.groupAggregations || view.groupAggregations.length === 0) && (
                        <div className="py-6 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300 gap-2">
                          <p className="text-[10px] font-black">異붽????붿빟 ?듦퀎媛 ?놁뒿?덈떎.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={`bg-indigo-50/50 p-6 rounded-[2.5rem] border-2 border-indigo-100 space-y-6 transition-all duration-500 ${!view.groupByColumn ? 'opacity-30 pointer-events-none grayscale' : !view.groupByColumn2 ? 'opacity-100' : 'bg-white shadow-xl border-indigo-200 scale-105'}`}>
              <label className="text-[11px] font-black text-indigo-600 block uppercase tracking-widest flex items-center gap-2 px-1">
                <FolderTree size={16}/> 2李??곗씠??臾띠뼱二쇨린 (Sub Grouping)
              </label>
              <div className="flex gap-2">
                <select 
                  className="flex-1 p-4 rounded-2xl bg-white border-2 border-indigo-200 font-black text-slate-800 cursor-pointer outline-none focus:border-indigo-500 transition-all shadow-sm" 
                  value={view.groupByColumn2 || ''} 
                  onChange={e => onUpdate({...view, groupByColumn2: e.target.value || null})}
                >
                  <option value="">(2李?洹몃９ ?놁쓬)</option>
                  {availableColumns.filter(c => c !== view.groupByColumn).map(col => <option key={col} value={col}>{col} 移쇰읆 湲곗??쇰줈 ??踰???臾띔린</option>)}
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
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">2李??ㅻ뜑 ?붿옄??諛?媛怨?/label>
                      <button 
                        onClick={() => onUpdate({ ...view, groupHeaderIcon2: 'Folder', groupHeaderAlign2: 'left', groupHeaderColor2: 'text-violet-700', groupHeaderTextSize2: 'text-[14px]', groupHeaderExpression2: '' })}
                        className="text-[9px] font-black text-indigo-500 hover:text-indigo-700 transition-colors"
                      >
                        ?붿옄??珥덇린??                      </button>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">?ㅻ뜑 ?꾩씠肄?/label>
                        <select value={view.groupHeaderIcon2 || 'Folder'} onChange={e => onUpdate({...view, groupHeaderIcon2: e.target.value})} className="w-full p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                          <option value="Folder">?대뜑</option><option value="Star">蹂?/option><option value="Tag">?쒓렇</option><option value="User">?ъ슜??/option><option value="Circle">?먰삎</option><option value="Hash">?댁떆(#)</option><option value="Info">?뺣낫</option><option value="AlertCircle">寃쎄퀬</option>
                        </select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">?ㅻ뜑 ?됱긽</label>
                        <select value={view.groupHeaderColor2 || 'text-violet-700'} onChange={e => onUpdate({...view, groupHeaderColor2: e.target.value})} className="w-full p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                          <option value="text-violet-700">蹂대씪??(湲곕낯)</option><option value="text-indigo-900">?⑥깋</option><option value="text-slate-700">吏꾪쉶??/option><option value="text-emerald-700">珥덈줉??/option><option value="text-blue-700">?뚮옉??/option><option value="text-rose-700">鍮④컯??/option><option value="text-amber-700">二쇳솴??/option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">湲???ш린 諛??뺣젹</label>
                        <div className="flex gap-1.5">
                          <select value={view.groupHeaderTextSize2 || 'text-[14px]'} onChange={e => onUpdate({...view, groupHeaderTextSize2: e.target.value})} className="flex-1 p-3 text-xs rounded-xl border border-slate-200 font-bold bg-white text-slate-700 outline-none">
                            <option value="text-xs">?묎쾶</option><option value="text-[14px]">蹂댄넻</option><option value="text-[15px]">議곌툑 ?ш쾶</option><option value="text-lg">?ш쾶</option>
                          </select>
                          <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                            {[
                              { id: 'left', icon: <AlignLeft size={14}/> },
                              { id: 'center', icon: <AlignCenter size={14}/> },
                              { id: 'right', icon: <AlignRight size={14}/> }
                            ].map(a => (
                              <button key={a.id} onClick={() => onUpdate({...view, groupHeaderAlign2: a.id as any})} className={`p-2 rounded-lg transition-all ${view.groupHeaderAlign2 === a.id || (!view.groupHeaderAlign2 && a.id === 'left') ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}>{a.icon}</button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-400 pl-1">?듦퀎 ?쒖떆 ?꾩튂</label>
                        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 h-[44px]">
                          <button 
                            onClick={() => onUpdate({...view, groupAggregationPosition2: 'beside_label'})}
                            className={`flex-1 text-[9px] font-black rounded-lg transition-all ${view.groupAggregationPosition2 === 'beside_label' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                          >
                            ?대쫫 諛붾줈 ??                          </button>
                          <button 
                            onClick={() => onUpdate({...view, groupAggregationPosition2: 'right_end'})}
                            className={`flex-1 text-[9px] font-black rounded-lg transition-all ${view.groupAggregationPosition2 === 'right_end' || !view.groupAggregationPosition2 ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                          >
                            ?ㅻⅨ履???                          </button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-indigo-500 pl-1 flex items-center gap-1"><Sparkles size={12}/> 2李??ㅻ뜑 媛怨??섏떇 (Expression)</label>
                      <input 
                        className="w-full p-4 rounded-2xl bg-white border border-indigo-100 font-mono text-[11px] font-bold text-slate-800 outline-none focus:border-indigo-400 transition-all shadow-inner"
                        value={view.groupHeaderExpression2 || ''}
                        onChange={e => onUpdate({...view, groupHeaderExpression2: e.target.value})}
                        placeholder="?? val + ' (' + rowCount + '紐?'"
                      />
                    </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-indigo-200">
                    <div className="flex items-center justify-between px-1">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">2李?洹몃９ ?붿빟 ?듦퀎</label>
                      <button 
                        onClick={() => onUpdate({ ...view, groupAggregations2: [...(view.groupAggregations2 || []), { id: `agg2_${Date.now()}`, type: 'count', label: '?뚭퀎', color: 'bg-violet-50 text-violet-600', displayStyle: 'button' }] })}
                        className="flex items-center gap-1 px-3 py-1 bg-violet-50 text-violet-600 rounded-lg text-[10px] font-black hover:bg-violet-100 transition-all border border-violet-100"
                      >
                        <Plus size={12}/> ?듦퀎 異붽?
                      </button>
                    </div>

                    <div className="space-y-3">
                      {(view.groupAggregations2 || []).map((agg, idx) => (
                        <div key={agg.id} className="p-4 bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3 animate-in slide-in-from-right-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black py-1 px-2.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-widest">Sub-Summary #{idx+1}</span>
                            <button onClick={() => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.filter(a => a.id !== agg.id) })} className="text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={14}/></button>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">怨꾩궛 諛⑹떇</label>
                              <select 
                                value={agg.type} 
                                onChange={e => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.map(a => a.id === agg.id ? { ...a, type: e.target.value as any } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-slate-50 outline-none"
                              >
                                <option value="count">珥?媛쒖닔 (Count)</option>
                                <option value="sum">?⑷퀎 (Sum)</option>
                                <option value="avg">?됯퇏 (Avg)</option>
                                <option value="count_if">議곌굔遺 媛쒖닔 (Count If)</option>
                              </select>
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">?쒖떆 ?쇰꺼</label>
                              <input 
                                value={agg.label} 
                                onChange={e => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.map(a => a.id === agg.id ? { ...a, label: e.target.value } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                                placeholder="?? ?뚭퀎"
                              />
                            </div>
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">?쒖떆 ?뺥깭</label>
                              <select 
                                value={agg.displayStyle || 'button'} 
                                onChange={e => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.map(a => a.id === agg.id ? { ...a, displayStyle: e.target.value as any } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                              >
                                <option value="button">?뚯빟??(Button)</option>
                                <option value="text">湲?먮쭔 (Text)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                              <label className="text-[9px] font-black text-slate-400 pl-1">???而щ읆</label>
                              <select 
                                value={agg.column || ''} 
                                onChange={e => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.map(a => a.id === agg.id ? { ...a, column: e.target.value } : a) })}
                                className="w-full p-2.5 text-[11px] rounded-xl border border-slate-200 font-bold bg-white outline-none"
                              >
                                <option value="">而щ읆 ?좏깮</option>
                                {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                            {(agg.type === 'sum' || agg.type === 'avg' || agg.type === 'count_if') && (
                              <div className="space-y-1.5 animate-in fade-in">
                                <label className="text-[9px] font-black text-amber-600 pl-1 flex items-center gap-1">
                                  <Sparkles size={10}/> {agg.type === 'count_if' ? '議곌굔 ?섏떇 (JS)' : '媛怨??섏떇 (Target JS)'}
                                </label>
                                <input 
                                  value={agg.conditionValue || ''} 
                                  onChange={e => onUpdate({ ...view, groupAggregations2: view.groupAggregations2?.map(a => a.id === agg.id ? { ...a, conditionValue: e.target.value } : a) })}
                                  className="w-full p-2.5 text-[11px] rounded-xl border border-amber-200 font-mono font-bold bg-white outline-none focus:border-amber-400"
                                  placeholder={agg.type === 'count_if' ? "?? val === '?꾨즺'" : "?? val * 1.1"}
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
                label="1李??뺣젹 湲곗?"
                column={view.sortColumn}
                direction={view.sortDirection}
                availableColumns={availableColumns}
                onColumnChange={val => onUpdate({ ...view, sortColumn: val, sortDirection: view.sortDirection || 'desc' })}
                onDirectionChange={val => onUpdate({ ...view, sortDirection: val })}
              />
              {view.sortColumn && (
                <SortConfigSection 
                  label="2李??뺣젹 (1李?湲곗???媛숈쓣 ??"
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
              <label className="text-[10px] font-black text-slate-400 block px-1 uppercase tracking-wider whitespace-nowrap">移대뱶 媛濡?諛곗튂 (??媛쒖닔)</label>
              <select className="w-full p-3 rounded-xl bg-white border-2 border-slate-100 font-black text-slate-800 cursor-pointer outline-none focus:border-indigo-200" value={view.columnCount || 1} onChange={e => onUpdate({...view, columnCount: Number(e.target.value)})}>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}??{n === 1 ? '(由ъ뒪???뺥깭)' : `(${n}??寃⑹옄 ?뺥깭)`}</option>)}</select>
            </div>


            
            <div>
              <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5 whitespace-nowrap"><MousePointerClick size={14} className="text-indigo-500"/> 移대뱶 ?대┃ ?≪뀡</label>
              <select className="w-full p-3 rounded-xl bg-white border-2 border-slate-100 font-black text-slate-800 cursor-pointer outline-none" value={view.onClickActionId || ''} onChange={e => onUpdate({...view, onClickActionId: e.target.value || null})}>
                <option value="">(?대┃ ?숈옉 ?놁쓬)</option>
                {actions.map(act => <option key={act.id} value={act.id}>??{act.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-black text-rose-500 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5 whitespace-nowrap animate-pulse"><Zap size={14} /> 酉??쒖옉 ???먮룞 ?ㅽ뻾(Automation)</label>
              <select className="w-full p-3 rounded-xl bg-rose-50 border-2 border-rose-100 font-black text-rose-700 cursor-pointer outline-none focus:border-rose-300" value={view.onInitActionId || ''} onChange={e => onUpdate({...view, onInitActionId: e.target.value || null})}>
                <option value="">(?먮룞 ?ㅽ뻾 ?놁쓬 - ?쇰컲 紐⑤뱶)</option>
                {actions.map(act => <option key={act.id} value={act.id}>?? {act.name}</option>)}
              </select>
              <p className="text-[9px] font-bold text-rose-400 mt-1 px-1">* 酉곌? ?대━?먮쭏???꾪꽣留곷맂 ?곗씠?곗뿉 ??????≪뀡???섑뻾?⑸땲??</p>
            </div>
          </div>
        </div>
        
        {/* ?뵦 [?좉퇋] ?대뙌?곕툕 UI (議곌굔遺 ?몄텧/鍮꾪솢?깊솕) ?ㅼ젙 ?뱀뀡 */}
        <div className="mt-8 pt-8 border-t border-slate-100 min-w-max w-full">
           <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 bg-amber-500 text-white rounded-xl shadow-md"><Settings2 size={20}/></div>
              <div>
                <h3 className="text-lg font-black text-slate-800">?슗 硫붾돱 ?몄텧 諛?媛?⑹꽦 ?꾪꽣 (Adaptive UI)</h3>
                <p className="text-xs text-slate-500 font-bold">?뱀젙 議곌굔???곕씪 硫붾돱瑜??④린嫄곕굹 鍮꾪솢?깊솕(?좉툑)?⑸땲??</p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-8">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1 flex items-center gap-1.5"><Sparkles size={14} className="text-amber-500"/> ?쒖뼱 議곌굔 (JavaScript Expression)</label>
                  <textarea 
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-mono text-xs font-bold text-slate-700 outline-none focus:border-amber-400 transition-all"
                    rows={3}
                    value={view.visibilityExpr || ''}
                    onChange={e => onUpdate({...view, visibilityExpr: e.target.value})}
                    placeholder="?? count('attendance_log', {date: 'today'}) > 0"
                  />
                  <div className="mt-2 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-[10px] font-bold text-amber-700 leading-relaxed">
                      ?뮕 **?꾩?留?*: 寃곌낵媛 **true**(李??대㈃ ?꾨옒 ?ㅼ젙???곸슜?⑸땲??<br/>
                      - `count('?뚯씠釉?, {'{?꾪꽣}'}) &gt; 0`: 湲곕줉???덉쑝硫?br/>
                      - `currentUser().role === 'admin'`: 愿由ъ옄硫?                    </p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6">
                <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-slate-200">
                  <label className="text-[10px] font-black text-slate-500 block mb-4 uppercase tracking-wider px-1">議곌굔 留뚯” ??泥섎━ 諛⑹떇 (Behavior)</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => onUpdate({ ...view, visibilityBehavior: 'hide' })}
                      className={`flex-1 py-3 rounded-xl text-xs font-black border-2 transition-all ${view.visibilityBehavior === 'hide' ? 'bg-slate-800 border-slate-800 text-white shadow-lg scale-105' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      ?슟 硫붾돱?먯꽌 ?④?
                    </button>
                    <button 
                      onClick={() => onUpdate({ ...view, visibilityBehavior: 'disable' })}
                      className={`flex-1 py-3 rounded-xl text-xs font-black border-2 transition-all ${view.visibilityBehavior === 'disable' ? 'bg-amber-600 border-amber-600 text-white shadow-lg scale-105' : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'}`}
                    >
                      ?뵏 鍮꾪솢?깊솕 (蹂댁씠吏留?紐??꾨쫫)
                    </button>
                  </div>
                </div>

                {view.visibilityBehavior === 'disable' && (
                  <div className="animate-in slide-in-from-top-2 duration-300">
                    <label className="text-[10px] font-black text-slate-400 block mb-2 uppercase tracking-wider px-1">鍮꾪솢?깊솕 ???곹깭 臾멸뎄</label>
                    <input 
                      type="text"
                      className="w-full p-4 rounded-2xl bg-white border-2 border-amber-100 font-black text-amber-700 outline-none focus:border-amber-400 shadow-sm"
                      value={view.disabledLabel || ''}
                      onChange={e => onUpdate({...view, disabledLabel: e.target.value})}
                      placeholder="?? ?ㅻ뒛 媛먮룆 ?꾨즺"
                    />
                    <p className="text-[9px] font-bold text-amber-400 mt-2 px-1">* 硫붾돱 ?꾩씠肄???????띿뒪?멸? ?쒖떆?섏뼱 ?곹깭瑜??뚮젮以띾땲??</p>
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
              <h3 className="text-2xl font-black text-indigo-900 whitespace-nowrap">2. 移대뱶 ?덉씠?꾩썐 而ㅼ뒪? ?ㅺ퀎</h3>
              <p className="text-xs text-indigo-400 font-bold mt-1">移대뱶??蹂댁뿬以??곗씠?곗쓽 諛곗튂? ?믪씠瑜?寃곗젙?⑸땲??</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6 bg-slate-50/80 p-3 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter px-1 flex items-center gap-1"><ArrowUpDown size={12}/> 移대뱶 ?믪씠 紐⑤뱶</label>
              <div className="flex bg-slate-200/50 p-1 rounded-xl border border-slate-200">
                <button onClick={() => onUpdate({...view, cardHeightMode: 'auto'})} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${view.cardHeightMode === 'auto' ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>?먮룞 (Auto)</button>
                <button onClick={() => onUpdate({...view, cardHeightMode: 'fixed'})} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${view.cardHeightMode === 'fixed' || !view.cardHeightMode ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'}`}>怨좎젙 (Fixed)</button>
              </div>
            </div>

            {(!view.cardHeightMode || view.cardHeightMode === 'fixed') && (
              <div className="flex flex-col gap-2 min-w-[200px] animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between px-1">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">怨좎젙 ?믪씠: <span className="text-indigo-600">{view.cardHeight || 120}px</span></label>
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

            <button onClick={addRootRow} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-sm shadow-xl shadow-indigo-200 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"><Plus size={18}/> ??Row) 異붽?</button>
          </div>
        </div>
        <div className="space-y-4 overflow-visible w-full min-w-fit mt-10">
          {view.layoutRows.map(row => <RenderRowEditor key={row.id} row={row} depth={0} />)}
          {view.layoutRows.length === 0 && (<div className="py-24 border-4 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 gap-4 bg-slate-50/50"><Plus size={48} className="opacity-20"/><p className="font-black text-slate-400">?곗륫 ?곷떒??踰꾪듉???뚮윭 移대뱶 ?붿옄?몄쓣 ?쒖옉?섏꽭??/p></div>)}
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
                  <h3 className="text-lg font-black text-slate-800">[{view.tableName}] 荑쇰━ ?쒕??덉씠??諛??곗씠???좉툑</h3>
                  <p className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-lg inline-block mt-0.5">珥?{previewData.length}嫄?議고쉶??/p>
                </div>
              </div>
              <div className="flex items-center gap-6 border-l pl-6 border-slate-200">
                <div className="flex items-center gap-2">
                  <label className="text-[10px] uppercase font-black text-slate-500 leading-tight text-right mr-1">?좉툑 ???ъ슜??br/>?앸퀎??PK) 移쇰읆</label>
                  <select value={tempKeyColumn} onChange={e => {
                      const selectedColumn = e.target.value;
                      setTempKeyColumn(selectedColumn);
                      setSelectedKeys([]); 
                      
                      if (selectedColumn) {
                        const sortedData = [...previewData].sort((a, b) => {
                          const valA = a[selectedColumn];
                          const valB = b[selectedColumn];
                          // null, undefined???ㅻ줈 蹂대깂
                          if (valA === null || valA === undefined) return 1;
                          if (valB === null || valB === undefined) return -1;
                          // ?レ옄 ?ы븿 ?쒓?/?곷Ц ?뺣젹 (localeCompare ?쒖슜)
                          return String(valA).localeCompare(String(valB), 'ko', { numeric: true });
                        });
                        setPreviewData(sortedData);
                      }
                  }} className="p-2.5 text-sm border-2 border-indigo-100 bg-white rounded-xl font-bold outline-none cursor-pointer text-indigo-700 focus:border-indigo-400">
                    <option value="">-- 怨좎쑀 ?앸퀎???좏깮 ?꾩닔 --</option>
                    {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <button 
                  onClick={() => {
                    if (!tempKeyColumn) return alert('?붾㈃???뱀젙 ?곗씠?곕줈 怨좎젙?섎젮硫?怨좎쑀 ?앸퀎??PK) 移쇰읆??癒쇱? ?좏깮?댁빞 ?⑸땲??\n(?? ?숇쾲, ?꾪솕踰덊샇 ??以묐났?섏? ?딅뒗 移쇰읆)');
                    onUpdate({ ...view, isLocked: selectedKeys.length > 0, lockedKeyColumn: tempKeyColumn, lockedRecordKeys: selectedKeys });
                    setIsPreviewModalOpen(false);
                  }}
                  className={`px-8 py-3 rounded-xl font-black shadow-md flex items-center gap-2 transition-all ${tempKeyColumn ? 'bg-indigo-600 hover:bg-indigo-700 text-white hover:scale-105 active:scale-95 shadow-indigo-200' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                >
                  ?좏깮 ?꾨즺 諛??곸슜
                </button>
                <button onClick={() => setIsPreviewModalOpen(false)} className="w-10 h-10 flex items-center justify-center bg-slate-200 hover:bg-slate-300 rounded-full text-slate-500 hover:text-slate-800 transition-colors shrink-0 ml-2"><X size={20}/></button>
              </div>
            </div>
            {/* Modal Body & Table */}
            <div className="flex-1 overflow-auto p-0 relative bg-slate-100">
               {isLoadingPreview ? (
                 <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-indigo-600 bg-white/50"><Loader2 className="animate-spin" size={40} /><p className="font-bold">?곗씠?곕? 遺덈윭?ㅻ뒗 以?..</p></div>
               ) : previewData.length === 0 ? (
                 <div className="absolute inset-0 flex items-center justify-center text-slate-400 font-bold text-lg">議곌굔??留욌뒗 ?곗씠?곌? ?놁뒿?덈떎. 荑쇰━ ?ㅼ젙???뺤씤?댁＜?몄슂.</div>
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
                             {col === tempKeyColumn && <span className="text-yellow-400">?뵎</span>}
                             {previewSortConfig?.column === col && (
                               <span className="text-indigo-400 ml-1 text-[10px]">
                                 {previewSortConfig.direction === 'asc' ? '?? : '??}
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
                              if (!tempKeyColumn) alert('怨좎쑀 ?앸퀎??PK) 移쇰읆???곗륫 ?곷떒?먯꽌 癒쇱? ?좏깮?댁빞 ?대┃??媛?ν빀?덈떎.');
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
