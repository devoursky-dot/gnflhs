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
    <div className="fixed inset-0 z-[1500] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0">
      <div 
        style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text-main)' }}
        className="w-full max-w-md rounded-none shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        <div 
          style={{ borderBottomColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
          className="p-4 border-b flex justify-between items-center"
        >
          <h3 className="text-lg font-bold flex items-center gap-2">
            <CheckCircle2 style={{ color: 'var(--theme-primary)' }} size={18} /> 데이터 추가
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:opacity-70 transition-colors"><X size={20}/></button>
        </div>
        <div 
          style={{ backgroundColor: 'var(--theme-bg)' }}
          className="p-6 space-y-6 max-h-[60vh] overflow-y-auto"
        >
          {action?.insertMappings?.filter((m: any) => m.mappingType === 'prompt').map((mapping: any) => {
            const val = formData[mapping.targetColumn] ?? (mapping.valueType === 'number' ? (mapping.defaultNumberValue ?? 0) : '');
            const isNumber = mapping.valueType === 'number';
            const hasOptions = mapping.promptOptions && mapping.promptOptions.trim() !== '';
            const options = hasOptions ? mapping.promptOptions.split(',').map((o: string) => o.trim()) : [];
            
            return (
              <div 
                key={mapping.id} 
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                className="space-y-2 p-3 rounded-none border"
              >
                <label style={{ color: 'var(--theme-text-muted)' }} className="block text-[10px] font-bold uppercase tracking-widest pl-1">{mapping.sourceValue || mapping.targetColumn}</label>
                
                {isNumber ? (
                  <div 
                    style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}
                    className="flex items-center gap-2 p-1.5 rounded-none border"
                  >
                    <button 
                      onClick={() => setFormData({ ...formData, [mapping.targetColumn]: Number(val) - (mapping.numberStep || 1) })}
                      style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text-main)', borderColor: 'var(--theme-border)' }}
                      className="w-10 h-10 flex items-center justify-center rounded-none hover:opacity-80 active:scale-95 transition-all border"
                    >
                      <Minus size={20} />
                    </button>
                    <div className="flex-1 text-center">
                      <input 
                        type="number" 
                        value={val} 
                        onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: Number(e.target.value) })}
                        style={{ color: 'var(--theme-text-main)' }}
                        className="w-full bg-transparent text-center text-2xl font-black outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => setFormData({ ...formData, [mapping.targetColumn]: Number(val) + (mapping.numberStep || 1) })}
                      style={{ backgroundColor: 'var(--theme-primary)' }}
                      className="w-12 h-12 flex items-center justify-center rounded-xl shadow-md text-white hover:opacity-90 active:scale-90 transition-all"
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
                            const promptMappings = action?.insertMappings?.filter((m: any) => m.mappingType === 'prompt') || [];
                            const noCustom = !mapping.allowCustomPrompt;
                          }}
                          style={{ 
                            backgroundColor: val === opt ? 'var(--theme-primary)' : 'var(--theme-surface)',
                            borderColor: val === opt ? 'var(--theme-primary)' : 'var(--theme-border)',
                            color: val === opt ? '#fff' : 'var(--theme-text-main)'
                          }}
                          className="px-3 py-2 rounded-none text-xs font-bold transition-all border-2"
                        >
                          {opt}
                        </button>
                      ))}
                      {mapping.allowCustomPrompt && (
                        <button 
                          onClick={() => setFormData({ ...formData, [mapping.targetColumn]: options.includes(val) ? '' : val })}
                          style={{ 
                            backgroundColor: !options.includes(val) && val !== '' ? '#f43f5e' : 'var(--theme-surface)',
                            borderColor: !options.includes(val) && val !== '' ? '#f43f5e' : 'var(--theme-border)',
                            color: !options.includes(val) && val !== '' ? '#fff' : 'var(--theme-text-main)'
                          }}
                          className="px-3 py-2 rounded-none text-xs font-bold transition-all border-2"
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
                        style={{ 
                          backgroundColor: 'var(--theme-input-bg)', 
                          color: 'var(--theme-input-text)',
                          borderColor: 'var(--theme-border)'
                        }}
                        className="w-full p-3 rounded-none border outline-none font-bold text-sm transition-all focus:border-[var(--theme-primary)]" 
                        placeholder="내용을 직접 입력하세요..." 
                      />
                    )}
                  </div>
                ) : (
                     <input 
                      type="text" 
                      value={val} 
                      onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: e.target.value })} 
                      style={{ 
                        backgroundColor: 'var(--theme-input-bg)', 
                        color: 'var(--theme-input-text)',
                        borderColor: 'var(--theme-border)'
                      }}
                      className="w-full p-3 rounded-none border outline-none font-bold text-sm transition-all focus:border-[var(--theme-primary)]" 
                      placeholder="내용 입력..." 
                    />
                )}
              </div>
            );
          })}
          {action?.insertMappings?.filter((m: any) => m.mappingType !== 'prompt').length > 0 && <div className="pt-4 border-t border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase italic">* 나머지 설정된 데이터는 백그라운드에서 함께 저장됩니다.</p></div>}
        </div>
        <div 
          style={{ backgroundColor: 'var(--theme-surface)', borderTopColor: 'var(--theme-border)' }}
          className="p-4 border-t flex gap-2"
        >
          <button 
            onClick={onClose} 
            style={{ color: 'var(--theme-text-muted)', borderColor: 'var(--theme-border)' }}
            className="flex-1 py-3 font-bold rounded-none hover:opacity-70 transition-all border text-sm"
          >
            취소
          </button>
          <button 
            onClick={() => onSubmit()} 
            disabled={isSubmitting} 
            style={{ backgroundColor: 'var(--theme-primary)' }}
            className="flex-1 py-3 text-white font-bold rounded-none hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 text-sm"
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
  rowData?: any; // 🔥 데이터 원본 객체 (ID 및 참조용)
  formData: Record<string, any>;
  setFormData: (data: Record<string, any>) => void;
  onSubmit: (forcedData?: any) => void;
  isUpdating: boolean;
}

export function UpdateModal({ isOpen, onClose, action, rowData, formData, setFormData, onSubmit, isUpdating }: UpdateModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1500] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0">
      <div 
        style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text-main)' }}
        className="w-full max-w-md rounded-none shadow-xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300"
      >
        <div 
          style={{ borderBottomColor: 'var(--theme-border)', backgroundColor: 'var(--theme-surface)' }}
          className="p-4 border-b flex justify-between items-center"
        >
          <h3 className="text-lg font-bold flex items-center gap-2">
            <Zap style={{ color: 'var(--theme-primary)' }} size={18} /> 데이터 수정
          </h3>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:opacity-70 transition-colors"><X size={20}/></button>
        </div>
        <div 
          style={{ backgroundColor: 'var(--theme-bg)' }}
          className="p-6 space-y-6 max-h-[60vh] overflow-y-auto"
        >
          {action?.updateMappings?.filter((m: any) => m.mappingType === 'prompt').map((mapping: any) => {
            const val = formData[mapping.targetColumn] ?? (mapping.valueType === 'number' ? (mapping.defaultNumberValue ?? 0) : '');
            const isNumber = mapping.valueType === 'number';
            const hasOptions = mapping.promptOptions && mapping.promptOptions.trim() !== '';
            const options = hasOptions ? mapping.promptOptions.split(',').map((o: string) => o.trim()) : [];

            return (
              <div 
                key={mapping.id} 
                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                className="space-y-2 p-3 rounded-none border"
              >
                <label style={{ color: 'var(--theme-text-muted)' }} className="block text-[10px] font-bold uppercase tracking-widest pl-1">{mapping.sourceValue || mapping.targetColumn}</label>
                
                {isNumber ? (
                  <div 
                    style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }}
                    className="flex items-center gap-2 p-1.5 rounded-none border"
                  >
                    <button 
                      onClick={() => setFormData({ ...formData, [mapping.targetColumn]: Number(val) - (mapping.numberStep || 1) })}
                      style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text-main)', borderColor: 'var(--theme-border)' }}
                      className="w-10 h-10 flex items-center justify-center rounded-none hover:opacity-80 active:scale-95 transition-all border"
                    >
                      <Minus size={20} />
                    </button>
                    <div className="flex-1 text-center">
                      <input 
                        type="number" 
                        value={val} 
                        onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: Number(e.target.value) })}
                        style={{ color: 'var(--theme-text-main)' }}
                        className="w-full bg-transparent text-center text-2xl font-black outline-none"
                      />
                    </div>
                    <button 
                      onClick={() => setFormData({ ...formData, [mapping.targetColumn]: Number(val) + (mapping.numberStep || 1) })}
                      style={{ backgroundColor: 'var(--theme-primary)' }}
                      className="w-10 h-10 flex items-center justify-center rounded-none text-white hover:opacity-90 active:scale-95 transition-all"
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
                          style={{ 
                            backgroundColor: val === opt ? 'var(--theme-primary)' : 'var(--theme-surface)',
                            borderColor: val === opt ? 'var(--theme-primary)' : 'var(--theme-border)',
                            color: val === opt ? '#fff' : 'var(--theme-text-main)'
                          }}
                          className="px-3 py-2 rounded-none text-xs font-bold transition-all border-2"
                        >
                          {opt}
                        </button>
                      ))}
                      {mapping.allowCustomPrompt && (
                        <button 
                          onClick={() => setFormData({ ...formData, [mapping.targetColumn]: options.includes(val) ? '' : val })}
                          style={{ 
                            backgroundColor: !options.includes(val) && val !== '' ? '#f43f5e' : 'var(--theme-surface)',
                            borderColor: !options.includes(val) && val !== '' ? '#f43f5e' : 'var(--theme-border)',
                            color: !options.includes(val) && val !== '' ? '#fff' : 'var(--theme-text-main)'
                          }}
                          className="px-3 py-2 rounded-none text-xs font-bold transition-all border-2"
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
                        style={{ 
                          backgroundColor: 'var(--theme-input-bg)', 
                          color: 'var(--theme-input-text)',
                          borderColor: 'var(--theme-border)'
                        }}
                        className="w-full p-3 rounded-none border outline-none font-bold text-sm transition-all focus:border-[var(--theme-primary)]" 
                        placeholder="내용을 직접 입력하세요..." 
                      />
                    )}
                  </div>
                ) : (
                  <input 
                    type="text" 
                    value={val} 
                    onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: e.target.value })} 
                    style={{ 
                      backgroundColor: 'var(--theme-input-bg)', 
                      color: 'var(--theme-input-text)',
                      borderColor: 'var(--theme-border)'
                    }}
                    className="w-full p-3 rounded-none border outline-none font-bold text-sm transition-all focus:border-[var(--theme-primary)]" 
                    placeholder="수정할 내용을 입력하세요..." 
                  />
                )}
              </div>
            );
          })}
          {action?.updateMappings?.filter((m: any) => m.mappingType !== 'prompt').length > 0 && <div className="pt-4 border-t border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase italic">* 나머지 설정된 데이터는 백그라운드에서 함께 수정됩니다.</p></div>}
        </div>
        <div 
          style={{ backgroundColor: 'var(--theme-surface)', borderTopColor: 'var(--theme-border)' }}
          className="p-4 border-t flex gap-2"
        >
          <button 
            onClick={onClose} 
            style={{ color: 'var(--theme-text-muted)', borderColor: 'var(--theme-border)' }}
            className="flex-1 py-3 font-bold rounded-none hover:opacity-70 transition-all border text-sm"
          >
            취소
          </button>
          <button 
            onClick={() => onSubmit()} 
            disabled={isUpdating} 
            style={{ backgroundColor: 'var(--theme-primary)' }}
            className="flex-1 py-3 text-white font-bold rounded-none hover:opacity-90 active:scale-95 transition-all disabled:opacity-50 text-sm"
          >
            {isUpdating ? "중..." : "수정"}
          </button>
        </div>
      </div>
    </div>
  );
}
