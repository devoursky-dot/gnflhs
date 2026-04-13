// 파일 경로: app/preview/[appId]/modals.tsx
"use client";

import React from 'react';
import { X, CheckCircle2, Zap, Plus, Minus } from 'lucide-react';

// ── Insert 모달 ──
interface InsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: any;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  onSubmit: (forcedData?: any) => void;
  isSubmitting: boolean;
}

export function InsertModal({ isOpen, onClose, action, formData, setFormData, onSubmit, isSubmitting }: InsertModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0">
      <div className="bg-white w-full max-w-md rounded-none shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="p-4 border-b flex justify-between items-center bg-white">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-indigo-600" size={18} /> 데이터 추가</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-none transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50">
          {action?.insertMappings?.filter((m: any) => m.mappingType === 'prompt').map((mapping: any) => {
            const val = formData[mapping.targetColumn] ?? (mapping.valueType === 'number' ? (mapping.defaultNumberValue ?? 0) : '');
            const isNumber = mapping.valueType === 'number';
            const hasOptions = mapping.promptOptions && mapping.promptOptions.trim() !== '';
            const options = hasOptions ? mapping.promptOptions.split(',').map((o: string) => o.trim()) : [];
            
            return (
              <div key={mapping.id} className="space-y-2 p-3 bg-white rounded-none border border-slate-100">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{mapping.sourceValue || mapping.targetColumn}</label>
                
                {isNumber ? (
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-none border border-slate-100">
                    <button 
                      onClick={() => setFormData({ ...formData, [mapping.targetColumn]: Number(val) - (mapping.numberStep || 1) })}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-none text-slate-600 hover:text-indigo-600 active:scale-95 transition-all border border-slate-100"
                    >
                      <Minus size={20} />
                    </button>
                    <div className="flex-1 text-center">
                      <input 
                        type="number" 
                        value={val} 
                        onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: Number(e.target.value) })}
                        className="w-full bg-transparent text-center text-2xl font-black text-slate-900 outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => setFormData({ ...formData, [mapping.targetColumn]: Number(val) + (mapping.numberStep || 1) })}
                      className="w-12 h-12 flex items-center justify-center bg-indigo-600 rounded-xl shadow-md text-white hover:bg-indigo-700 active:scale-90 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                ) : hasOptions ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                       {options.map((opt: string) => (
                        <button 
                          key={opt}
                          onClick={() => {
                            const updatedData = { ...formData, [mapping.targetColumn]: opt };
                            setFormData(updatedData);
                            // 초고속 모드: 조건 충족 시 즉시 저장
                            const promptMappings = action?.insertMappings?.filter((m: any) => m.mappingType === 'prompt') || [];
                            const isOnlyPrompt = promptMappings.length === 1;
                            const noCustom = !mapping.allowCustomPrompt;
                            if (action?.requireConfirmation === false && isOnlyPrompt && noCustom) {
                              onSubmit(updatedData);
                            }
                          }}
                          className={`px-3 py-2 rounded-none text-xs font-bold transition-all border-2 ${val === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}
                        >
                          {opt}
                        </button>
                      ))}
                      {mapping.allowCustomPrompt && (
                        <button 
                          onClick={() => setFormData({ ...formData, [mapping.targetColumn]: options.includes(val) ? '' : val })}
                          className={`px-3 py-2 rounded-none text-xs font-bold transition-all border-2 ${!options.includes(val) && val !== '' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-rose-200'}`}
                        >
                          기타(직접)
                        </button>
                      )}
                    </div>
                    {(mapping.allowCustomPrompt && (!options.includes(val) || val === '')) && (
                      <input 
                        type="text" 
                        value={options.includes(val) ? '' : val} 
                        onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: e.target.value })}
                        className="w-full p-3 rounded-none border border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 text-sm transition-all" 
                        placeholder="내용을 직접 입력하세요..." 
                      />
                    )}
                  </div>
                ) : (
                     <input 
                      type="text" 
                      value={val} 
                      onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: e.target.value })} 
                      className="w-full p-3 rounded-none border border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 text-sm transition-all" 
                      placeholder="내용 입력..." 
                    />
                )}
              </div>
            );
          })}
          {action?.insertMappings?.filter((m: any) => m.mappingType !== 'prompt').length > 0 && <div className="pt-4 border-t border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase italic">* 나머지 설정된 데이터는 백그라운드에서 함께 저장됩니다.</p></div>}
        </div>
        <div className="p-4 bg-white border-t flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold rounded-none hover:bg-slate-100 transition-all border border-slate-100 text-sm">취소</button>
          <button 
            onClick={() => onSubmit()} 
            disabled={isSubmitting} 
            className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-none hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 text-sm"
          >
            {isSubmitting ? "중..." : "저장"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Update 모달 ──
interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  action: any;
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  onSubmit: (forcedData?: any) => void;
  isUpdating: boolean;
}

export function UpdateModal({ isOpen, onClose, action, formData, setFormData, onSubmit, isUpdating }: UpdateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0">
      <div className="bg-white w-full max-w-md rounded-none shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
        <div className="p-4 border-b flex justify-between items-center bg-white">
          <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2"><Zap className="text-rose-500" size={18} /> 데이터 수정</h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:bg-slate-100 rounded-none transition-colors"><X size={20}/></button>
        </div>
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50">
          {action?.updateMappings?.filter((m: any) => m.mappingType === 'prompt').map((mapping: any) => {
            const val = formData[mapping.targetColumn] ?? (mapping.valueType === 'number' ? (mapping.defaultNumberValue ?? 0) : '');
            const isNumber = mapping.valueType === 'number';
            const hasOptions = mapping.promptOptions && mapping.promptOptions.trim() !== '';
            const options = hasOptions ? mapping.promptOptions.split(',').map((o: string) => o.trim()) : [];

            return (
              <div key={mapping.id} className="space-y-2 p-3 bg-white rounded-none border border-slate-100">
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest pl-1">{mapping.sourceValue || mapping.targetColumn}</label>
                
                {isNumber ? (
                  <div className="flex items-center gap-2 bg-slate-50 p-1.5 rounded-none border border-slate-100">
                    <button 
                      onClick={() => setFormData({ ...formData, [mapping.targetColumn]: Number(val) - (mapping.numberStep || 1) })}
                      className="w-10 h-10 flex items-center justify-center bg-white rounded-none text-slate-600 hover:text-indigo-600 active:scale-95 transition-all border border-slate-100"
                    >
                      <Minus size={20} />
                    </button>
                    <div className="flex-1 text-center">
                      <input 
                        type="number" 
                        value={val} 
                        onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: Number(e.target.value) })}
                        className="w-full bg-transparent text-center text-2xl font-black text-slate-900 outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => setFormData({ ...formData, [mapping.targetColumn]: Number(val) + (mapping.numberStep || 1) })}
                      className="w-10 h-10 flex items-center justify-center bg-indigo-600 rounded-none text-white hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                ) : hasOptions ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {options.map((opt: string) => (
                        <button 
                          key={opt}
                          onClick={() => setFormData({ ...formData, [mapping.targetColumn]: opt })}
                          className={`px-3 py-2 rounded-none text-xs font-bold transition-all border-2 ${val === opt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}
                        >
                          {opt}
                        </button>
                      ))}
                      {mapping.allowCustomPrompt && (
                        <button 
                          onClick={() => setFormData({ ...formData, [mapping.targetColumn]: options.includes(val) ? '' : val })}
                          className={`px-3 py-2 rounded-none text-xs font-bold transition-all border-2 ${!options.includes(val) && val !== '' ? 'bg-rose-500 border-rose-500 text-white' : 'bg-white border-slate-100 text-slate-600 hover:border-rose-200'}`}
                        >
                          기타(직접)
                        </button>
                      )}
                    </div>
                    {(mapping.allowCustomPrompt && (!options.includes(val) || val === '')) && (
                      <input 
                        type="text" 
                        value={options.includes(val) ? '' : val} 
                        onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: e.target.value })}
                        className="w-full p-3 rounded-none border border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 text-sm transition-all" 
                        placeholder="내용을 직접 입력하세요..." 
                      />
                    )}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={val} 
                    onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: e.target.value })} 
                    className="w-full p-3 rounded-none border border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 text-sm transition-all" 
                    placeholder="수정할 내용을 입력하세요..." 
                  />
                )}
              </div>
            );
          })}
          {action?.updateMappings?.filter((m: any) => m.mappingType !== 'prompt').length > 0 && <div className="pt-4 border-t border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase italic">* 나머지 설정된 데이터는 백그라운드에서 함께 수정됩니다.</p></div>}
        </div>
        <div className="p-4 bg-white border-t flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 text-slate-500 font-bold rounded-none hover:bg-slate-100 transition-all border border-slate-100 text-sm">취소</button>
          <button onClick={() => onSubmit()} disabled={isUpdating} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-none hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 text-sm">
            {isUpdating ? "중..." : "수정"}
          </button>
        </div>
      </div>
    </div>
  );
}
