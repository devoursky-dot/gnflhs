// 파일 경로: app/design/action.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Action, View, SchemaData, InsertMapping, UpdateMapping, VirtualTable, ActionStep } from './types';
import { Trash2, Plus, DatabaseZap, HelpCircle, X, Code2, Layers, Settings2, Star, MessageSquare, Zap, Calculator, Navigation, Bell } from 'lucide-react';
import { IconMap } from './picker';
import { FORMULA_EXAMPLES } from './formulas';

// ── 내부 유틸: 자동 확장형 텍스트 영역 ──
function AutoExpandingTextarea({ value, onChange, placeholder, onFocus, className }: any) {
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [value]);

  return (
    <textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      onFocus={onFocus}
      placeholder={placeholder}
      rows={1}
      className={`${className} overflow-hidden resize-none transition-[height] duration-200`}
    />
  );
}

interface ActionEditorProps {
  action: Action;
  views: View[];
  schemaData: SchemaData;
  virtualTables?: VirtualTable[];
  onUpdate: (updated: Action) => void;
  onDelete: (id: string) => void;
  onOpenIconPicker: () => void;
}

export default function ActionEditor({ 
  action, 
  views,
  schemaData, 
  virtualTables = [],
  onUpdate, 
  onDelete,
  onOpenIconPicker 
}: ActionEditorProps) {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [lastFocusedExpr, setLastFocusedExpr] = useState<{ id: string; pos: number; type: 'insert' | 'update' } | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);

  // 🔥 [신규] 다단계 동작 초기화 및 레거시 데이터 마이그레이션
  useEffect(() => {
    if (!action.steps || action.steps.length === 0) {
      // 레거시 데이터를 기반으로 첫 번째 스텝 생성 (디자인 유지)
      const initialStep: ActionStep = {
        id: `step_${Date.now()}`,
        type: action.type,
        tableName: action.tableName,
        insertTableName: action.insertTableName,
        updateTableName: action.updateTableName,
        deleteTableName: action.deleteTableName,
        smsTableName: action.smsTableName,
        insertMappings: action.insertMappings,
        updateMappings: action.updateMappings,
        requireConfirmation: action.requireConfirmation,
        batchMode: action.batchMode,
        smsMessageTemplate: action.smsMessageTemplate,
        targetViewId: action.targetViewId,
        message: action.message,
      };
      onUpdate({ ...action, steps: [initialStep] });
      setSelectedStepId(initialStep.id);
    } else if (!selectedStepId && action.steps.length > 0) {
      setSelectedStepId(action.steps[0].id);
    }
  }, [action.id]);

  const currentStep: ActionStep = action.steps?.find((s: ActionStep) => s.id === selectedStepId) || (action.steps && action.steps.length > 0 ? action.steps[0] : (action as ActionStep));

  // 현재 선택된 스텝의 값을 업데이트하는 헬퍼
  const updateCurrentStep = (updates: Partial<ActionStep>) => {
    if (!selectedStepId) return;
    const newSteps = action.steps?.map(s => s.id === selectedStepId ? { ...s, ...updates } : s);
    onUpdate({ ...action, steps: newSteps });
  };

  // 🖱️ 커서 위치 추적 핸들러
  const handleInputInteraction = (mappingId: string, e: any, type: 'insert' | 'update') => {
    setLastFocusedExpr({ id: mappingId, pos: e.target.selectionStart, type });
  };

  // 🧪 수식 조각 삽입 함수
  const insertSnippet = (snippet: string) => {
    if (!lastFocusedExpr) {
      alert("수식을 삽입할 입력창을 먼저 클릭해주세요!");
      return;
    }
    const { id, pos, type } = lastFocusedExpr;
    const mappingListKey = type === 'insert' ? 'insertMappings' : 'updateMappings';
    const list = (currentStep as any)[mappingListKey] || [];
    
    const updatedList = list.map((m: InsertMapping | UpdateMapping) => {
      if (m.id === id) {
        const val = m.sourceValue || '';
        const newVal = val.slice(0, pos) + snippet + val.slice(pos);
        setLastFocusedExpr({ ...lastFocusedExpr, pos: pos + snippet.length });
        return { ...m, sourceValue: newVal };
      }
      return m;
    });

    updateCurrentStep({ [mappingListKey]: updatedList });
  };

  // 💡 가이드 모달 컴포넌트 (동적 처리)
  const FormulaHelpModal = () => (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-4 min-w-max animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden border border-slate-100">
        <div className="p-8 border-b flex justify-between items-center bg-slate-50 shrink-0">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-600 text-white rounded-2xl shadow-lg"><Code2 size={24}/></div>
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">스마트 수식 가이드 💡</h3>
              <p className="text-sm text-slate-500 font-bold mt-1">예시를 클릭하면 커서 위치에 바로 입력됩니다.</p>
            </div>
          </div>
          <button onClick={() => setIsHelpModalOpen(false)} className="w-12 h-12 flex items-center justify-center bg-white hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-800 transition-all border border-slate-100 shadow-sm"><X size={24}/></button>
        </div>
        <div className="flex-1 overflow-y-auto p-8 space-y-10 scrollbar-hide">
          
          {FORMULA_EXAMPLES.map((cat, cIdx) => (
            <section key={cIdx}>
              <h4 className={`flex items-center gap-2 text-lg font-black text-slate-800 mb-4 border-l-4 pl-3 ${
                cat.color === 'indigo' ? 'border-indigo-500' :
                cat.color === 'emerald' ? 'border-emerald-500' :
                cat.color === 'rose' ? 'border-rose-500' : 'border-slate-500'
              }`}>
                {cat.category}
              </h4>
              <div className={`p-6 rounded-2xl space-y-4 border ${
                cat.color === 'indigo' ? 'bg-indigo-50/30 border-indigo-100' :
                cat.color === 'emerald' ? 'bg-emerald-50/30 border-emerald-100' :
                cat.color === 'rose' ? 'bg-rose-50/30 border-rose-100' : 'bg-slate-100/50 border-slate-200'
              }`}>
                <div className="grid grid-cols-2 gap-4">
                  {cat.items.map((item, iIdx) => (
                    <button 
                      key={iIdx}
                      onClick={() => insertSnippet(item.code)}
                      className="group bg-white p-4 rounded-xl border border-transparent hover:border-indigo-400 hover:shadow-md transition-all text-left relative overflow-hidden"
                    >
                      <div className="absolute top-0 right-0 p-1 opacity-0 group-hover:opacity-100 transition-opacity bg-indigo-100 text-indigo-600 text-[8px] font-black uppercase">Click to Insert</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase mb-2 group-hover:text-indigo-500">{item.title}</div>
                      <code className="text-sm font-black text-slate-800 bg-slate-50 px-2 py-1 rounded block mb-2 font-mono">{item.code}</code>
                      <div className="text-xs text-slate-500 font-bold">{item.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ))}

        </div>
        <div className="p-8 bg-slate-50 border-t flex justify-end">
          <button onClick={() => setIsHelpModalOpen(false)} className="px-10 py-4 bg-slate-900 text-white font-black rounded-2xl hover:bg-indigo-600 transition-all shadow-xl">닫기</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full min-w-fit mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 relative p-8 lg:p-12">
      <div className="w-full mx-auto space-y-8">
        {isHelpModalOpen && <FormulaHelpModal />}
        
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 min-w-max">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 whitespace-nowrap">
              {action.icon && IconMap[action.icon] ? 
                React.createElement(IconMap[action.icon], { className: "text-rose-500", size: 28 }) : 
                <Settings2 className="text-rose-500" size={28} />
              }
              액션 설정: {action.name}
            </h2>
            <p className="text-sm text-slate-500 mt-1 whitespace-nowrap">이벤트를 정의하세요.</p>
          </div>
          <button onClick={() => onDelete(action.id)} className="p-2 text-slate-400 hover:text-rose-500 rounded-lg transition-colors">
            <Trash2 size={20} />
          </button>
        </div>

        <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200 min-w-max w-full">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 whitespace-nowrap">액션 아이콘 및 이름</label>
            <div className="flex items-center gap-3">
              <button 
                onClick={onOpenIconPicker} 
                className="w-12 h-12 shrink-0 flex items-center justify-center bg-white border border-slate-200 rounded-xl hover:border-rose-400 transition-all group"
              >
                {action.icon && IconMap[action.icon] ? 
                  React.createElement(IconMap[action.icon], { className: "text-rose-500", size: 24 }) : 
                  <Star className="text-slate-400" size={24} />
                }
              </button>
              <input
                type="text"
                value={action.name}
                onChange={(e) => onUpdate({ ...action, name: e.target.value })}
                className="flex-1 p-3 rounded-xl border border-slate-200 outline-none font-bold text-slate-900 min-w-[300px]"
              />
            </div>
          </div>

          {/* 🔥 [신규] 동작 시퀀스 관리 UI */}
          <div className="pt-4 border-t border-slate-200/50">
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-3">동작 시퀀스 (Sequential Steps)</label>
            <div className="flex flex-wrap gap-3 items-center">
              {(action.steps || []).map((step: ActionStep, idx: number) => (
                <div key={step.id} className="relative group">
                  <button
                    onClick={() => setSelectedStepId(step.id)}
                    className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 transition-all font-black text-sm ${
                      selectedStepId === step.id 
                        ? 'bg-rose-50 border-rose-500 text-rose-700 shadow-lg -translate-y-0.5' 
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[10px] ${selectedStepId === step.id ? 'bg-rose-500 text-white' : 'bg-slate-100 text-slate-400'}`}>
                      {idx + 1}
                    </span>
                    {step.type === 'navigate' ? '이동' : step.type === 'alert' ? '알림' : step.type === 'insert_row' ? '저장' : step.type === 'update_row' ? '수정' : step.type === 'delete_row' ? '삭제' : step.type === 'send_sms' ? '문자' : '동작'}
                  </button>
                  {action.steps!.length > 1 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const newSteps = action.steps!.filter((s: ActionStep) => s.id !== step.id);
                        onUpdate({ ...action, steps: newSteps });
                        if (selectedStepId === step.id) setSelectedStepId(newSteps[0]?.id || null);
                      }}
                      className="absolute -top-2 -right-2 bg-white text-rose-500 border border-rose-100 p-1 rounded-full opacity-0 group-hover:opacity-100 shadow-md transition-all hover:scale-110"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              <button
                onClick={() => {
                  const newStep: ActionStep = { id: `step_${Date.now()}`, type: 'alert', message: '새로운 동작' };
                  const newSteps = [...(action.steps || []), newStep];
                  onUpdate({ ...action, steps: newSteps });
                  setSelectedStepId(newStep.id);
                }}
                className="w-11 h-11 flex items-center justify-center bg-white text-slate-400 hover:bg-slate-50 hover:text-slate-600 rounded-2xl transition-all border-2 border-dashed border-slate-200"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>
          
          {/* 소스 테이블 선택: navigate나 alert 같은 단순 동작일 때는 숨겨서 복잡도 낮춤 */}
          {!(currentStep.type === 'navigate' || currentStep.type === 'alert') && (
            <div className="p-5 bg-indigo-50/50 border border-indigo-100 rounded-2xl">
              <label className="flex items-center gap-2 text-[11px] font-black text-indigo-700 mb-3 tracking-wider uppercase">
                <Layers size={14}/> 1. 소스 데이터 테이블 (카드 데이터의 출처)
              </label>
              <select
                value={currentStep.tableName || ''}
                onChange={(e) => updateCurrentStep({ tableName: e.target.value })}
                className="w-full p-3 rounded-xl border border-indigo-200 bg-white font-bold text-indigo-900 outline-none min-w-[300px]"
              >
                <option value="">데이터를 가져올 테이블을 선택하세요</option>
                <optgroup label="데이터베이스 테이블">
                  {Object.keys(schemaData).sort().map(table => <option key={table} value={table}>{table}</option>)}
                </optgroup>
                {virtualTables.length > 0 && (
                  <optgroup label="가상 테이블 (Virtual)">
                    {virtualTables.map(vt => <option key={vt.id} value={vt.id}>🔑 {vt.name} (가상)</option>)}
                  </optgroup>
                )}
              </select>
            </div>
          )}

          <div>
            <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">2. 동작 유형 설정</label>
            <select
              value={currentStep.type}
              onChange={(e) => updateCurrentStep({ type: e.target.value as Action['type'] })}
              className="w-full p-3 rounded-xl border border-slate-200 bg-white font-black text-rose-600 min-w-[300px]"
            >
              <option value="navigate">다른 뷰로 이동</option>
              <option value="alert">알림 메시지 (Alert)</option>
              <option value="insert_row">데이터 추가 (Insert Row)</option>
              <option value="update_row">데이터 수정 (Update Modal)</option>
              <option value="delete_row">선택한 데이터 삭제 (Delete)</option>
              <option value="send_sms">📱 문자 발송 (SMS 단축)</option>
            </select>
          </div>

          {/* 이동 (Navigate) UI */}
          {currentStep.type === 'navigate' && (
            <div className="space-y-4 border-t border-slate-200 pt-5 mt-5">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Navigation size={16} className="text-rose-500"/> 이동할 뷰(View) 선택
              </label>
              <select
                value={currentStep.targetViewId || ''}
                onChange={(e) => updateCurrentStep({ targetViewId: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none"
              >
                <option value="">뷰를 선택하세요</option>
                {views?.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
          )}

          {/* 알림 (Alert) UI */}
          {currentStep.type === 'alert' && (
            <div className="space-y-4 border-t border-slate-200 pt-5 mt-5">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Bell size={16} className="text-rose-500"/> 알림 메시지 입력
              </label>
              <input
                type="text"
                value={currentStep.message || ''}
                onChange={(e) => updateCurrentStep({ message: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none"
                placeholder="사용자에게 보여줄 메시지를 입력하세요"
              />
            </div>
          )}

          {/* 데이터 추가 (Insert) UI */}
          {currentStep.type === 'insert_row' && (
            <div className="space-y-5 border-t border-slate-200 pt-5 mt-5">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 whitespace-nowrap">
                <DatabaseZap size={16} className="text-rose-500"/> 추가할 대상 테이블
              </label>
              <select
                value={currentStep.insertTableName || ''}
                onChange={(e) => updateCurrentStep({ insertTableName: e.target.value, insertMappings: [] })}
                className="w-full p-3 rounded-xl border border-rose-200 bg-rose-50 font-bold text-rose-800 outline-none min-w-[300px]"
              >
                <option value="">테이블을 선택하세요</option>
                <optgroup label="데이터베이스 테이블">
                  {Object.keys(schemaData).sort().map(table => <option key={table} value={table}>{table}</option>)}
                </optgroup>
                {virtualTables.length > 0 && (
                  <optgroup label="가상 테이블 (원본에 저장)">
                    {virtualTables.map(vt => <option key={vt.id} value={vt.id}>💾 {vt.name} (가상)</option>)}
                  </optgroup>
                )}
              </select>

              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <input
                  type="checkbox"
                  id="quick-save-toggle"
                  checked={currentStep.requireConfirmation === false}
                  onChange={(e) => updateCurrentStep({ requireConfirmation: !e.target.checked })}
                  className="w-5 h-5 accent-amber-600"
                />
                <label htmlFor="quick-save-toggle" className="text-sm font-black text-amber-900 cursor-pointer flex items-center gap-2">
                  ⚡ 초고속 모드 (확인창 없이 즉시 저장) 
                  <span className="text-[10px] font-bold text-amber-600/70 ml-2">* 입력 항목이 하나뿐인 버튼형 폼은 클릭 즉시 저장됩니다.</span>
                </label>
              </div>

              <div className="flex items-center gap-3 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                <input
                  type="checkbox"
                  id="batch-mode-toggle"
                  checked={!!currentStep.batchMode}
                  onChange={(e) => updateCurrentStep({ batchMode: e.target.checked })}
                  className="w-5 h-5 accent-rose-600"
                />
                <label htmlFor="batch-mode-toggle" className="text-sm font-black text-rose-900 cursor-pointer flex flex-col">
                  <span className="flex items-center gap-2"><Zap size={16} className="text-rose-600 animate-pulse"/> 🚀 다중 데이터 자동 처리 (Batch Mode)</span>
                  <span className="text-[10px] font-bold text-rose-500 mt-1">* '뷰 시작 액션'으로 사용 시 필터링된 모든 데이터를 순회하며 자동 저장합니다.</span>
                </label>
              </div>

              {currentStep.insertTableName && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700 whitespace-nowrap">필드 매핑 및 타입 설정</label>
                    <button
                      onClick={() => {
                        const nm: InsertMapping = { id: `m_${Date.now()}`, targetColumn: '', mappingType: 'prompt', sourceValue: '', valueType: 'string' };
                        updateCurrentStep({ insertMappings: [...(currentStep.insertMappings || []), nm] });
                      }}
                      className="text-xs bg-slate-800 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Plus size={14} /> 매핑 추가
                    </button>
                  </div>

                  {(currentStep.insertMappings || []).map((mapping: InsertMapping, idx: number) => (
                    <div key={mapping.id} className="p-5 bg-white border-2 border-slate-100 rounded-2xl relative group shadow-sm">
                      <button
                        onClick={() => {
                          const newArr = currentStep.insertMappings!.filter((m: InsertMapping) => m.id !== mapping.id);
                          updateCurrentStep({ insertMappings: newArr });
                        }}
                        className="absolute -top-2 -right-2 bg-white text-rose-500 border border-rose-100 p-1.5 rounded-full opacity-0 group-hover:opacity-100 shadow-md transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                      
                      <div className="grid grid-cols-4 gap-4 w-full min-w-max">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">1. 저장할 컬럼</span>
                          <select
                            value={mapping.targetColumn}
                            onChange={(e) => {
                              const newArr = [...currentStep.insertMappings!];
                              newArr[idx].targetColumn = e.target.value;
                              updateCurrentStep({ insertMappings: newArr });
                            }}
                            className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-lg bg-slate-50 text-slate-900 min-w-[160px]"
                          >
                            <option value="">-- 컬럼 선택 --</option>
                            {(schemaData[currentStep.insertTableName!] || []).map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">2. 데이터 출처</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={mapping.mappingType}
                              onChange={(e) => {
                                const newArr = [...currentStep.insertMappings!];
                                newArr[idx].mappingType = e.target.value as any;
                                updateCurrentStep({ insertMappings: newArr });
                              }}
                              className="flex-1 p-2.5 text-sm font-bold border border-indigo-100 rounded-lg bg-indigo-50 text-indigo-700 min-w-[180px]"
                            >
                              <option value="prompt">💬 폼에서 직접 입력받기</option>
                              <option value="card_data">📄 현재 카드 데이터 재사용</option>
                              <option value="static">✍️ 직접 값 입력 (Static)</option>
                              <option value="user_name">👤 계정 사용자 이름</option>
                              <option value="user_email">📧 계정 사용자 이메일</option>
                            </select>
                            <div className="flex items-center gap-2 p-2 bg-white rounded-lg border border-indigo-100 shadow-sm">
                              <Calculator size={14} className="text-indigo-400" />
                              <span className="text-[10px] font-black text-indigo-600 uppercase">Smart Mapping</span>
                            </div>
                          </div>
                        </div>
                        <div className="col-span-2">
                           {(mapping.mappingType === 'card_data' || mapping.mappingType === 'static' || mapping.mappingType === 'prompt') && (
                             <div className="space-y-2">
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    {mapping.mappingType === 'prompt' ? '3+4. 입력 폼 레이블' : 
                                     mapping.mappingType === 'card_data' ? (mapping.isExpression ? '4. 스마트 수식 편집' : '3+4. 데이터 매핑 (컬럼명 또는 URL)') : 
                                     '3+4. 직접 입력값'}
                                  </span>
                                  {mapping.mappingType === 'card_data' && mapping.isExpression && (
                                    <button onClick={() => setIsHelpModalOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors"><HelpCircle size={12}/> [가이드 및 예시보기]</button>
                                  )}
                               </div>
                               <div className={`${mapping.mappingType === 'card_data' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'} p-3 rounded-xl border-2 space-y-3`}>
                                  {mapping.mappingType === 'card_data' && (
                                    <div className="flex flex-wrap gap-1.5 p-1 border-b border-indigo-100/50 pb-2 mb-1">
                                      <span className="text-[9px] font-black text-indigo-400 w-full mb-1">클릭하여 컬럼 삽입:</span>
                                      {(() => {
                                        const sourceTableId = currentStep.tableName || '';
                                        const isVt = sourceTableId.startsWith('vt_');
                                        const vt = isVt ? virtualTables.find(v => v.id === sourceTableId) : null;
                                        const baseName = vt ? vt.baseTableName : sourceTableId;
                                        const cols = baseName ? [
                                          ...(schemaData[baseName] || []),
                                          ...(vt ? vt.columns.map(c => c.name) : [])
                                        ] : [];

                                        if (cols.length === 0) return <div className="text-[10px] text-rose-500 font-bold py-1">⚠️ 상단에서 '소스 데이터 테이블'을 먼저 선택해야 컬럼 목록이 나타납니다.</div>;
                                        
                                        return cols.map(col => (
                                          <button key={col} onClick={() => {
                                            const newArr = [...currentStep.insertMappings!];
                                            newArr[idx].sourceValue = (newArr[idx].sourceValue || '') + `{{${col}}}`;
                                            updateCurrentStep({ insertMappings: newArr });
                                          }} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">
                                            {col}
                                          </button>
                                        ));
                                      })()}
                                    </div>
                                  )}
                                  
                                  {mapping.mappingType === 'card_data' ? (
                                    <AutoExpandingTextarea
                                      value={mapping.sourceValue || ''}
                                      onFocus={(e: any) => handleInputInteraction(mapping.id, e, 'insert')}
                                      onChange={(e: any) => {
                                        const newArr = [...currentStep.insertMappings!];
                                        newArr[idx].sourceValue = e.target.value;
                                        updateCurrentStep({ insertMappings: newArr });
                                        handleInputInteraction(mapping.id, e, 'insert');
                                      }}
                                      placeholder="컬럼을 클릭하거나 수식을 입력하세요 (예: {{성}} + {{이름}})"
                                      className="w-full p-3 text-sm font-bold bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400"
                                    />
                                  ) : (
                                    <div className="flex gap-3 items-center">
                                      <input
                                        type="text"
                                        value={mapping.sourceValue || ''}
                                        onChange={(e) => {
                                          const newArr = [...currentStep.insertMappings!];
                                          newArr[idx].sourceValue = e.target.value;
                                          updateCurrentStep({ insertMappings: newArr });
                                        }}
                                        placeholder="값을 입력하세요"
                                        className="flex-1 p-2.5 text-sm font-bold border border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-slate-900 bg-white"
                                      />
                                      <select
                                        value={mapping.valueType || 'string'}
                                        onChange={(e) => {
                                          const newArr = [...currentStep.insertMappings!];
                                          newArr[idx].valueType = e.target.value as 'string' | 'number';
                                          updateCurrentStep({ insertMappings: newArr });
                                        }}
                                        className="p-2.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 bg-white min-w-[100px]"
                                      >
                                        <option value="string">Text</option>
                                        <option value="number">Number</option>
                                      </select>
                                    </div>
                                  )}
                               </div>
                             </div>
                           )}
                           {(mapping.mappingType === 'user_name' || mapping.mappingType === 'user_email') && (
                             <div className="h-full flex items-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 italic">
                               로그인한 사용자의 {mapping.mappingType === 'user_name' ? '이름' : '이메일'}이 자동으로 저장됩니다.
                             </div>
                           )}
                        </div>
                      </div>

                      {/* 🔥 [신규] 프롬프트(Prompt) 전용 고도화 설정 */}
                      {mapping.mappingType === 'prompt' && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap gap-6 items-end">
                          {mapping.valueType === 'number' ? (
                            <>
                              <div className="flex-1 min-w-[120px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">입력 폼 기본값</label>
                                <input type="number" value={mapping.defaultNumberValue ?? 1} onChange={(e) => {
                                  const newArr = [...currentStep.insertMappings!];
                                  newArr[idx].defaultNumberValue = Number(e.target.value);
                                  updateCurrentStep({ insertMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                              <div className="flex-1 min-w-[120px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">증감폭 (+/- Step)</label>
                                <input type="number" value={mapping.numberStep ?? 1} onChange={(e) => {
                                  const newArr = [...currentStep.insertMappings!];
                                  newArr[idx].numberStep = Number(e.target.value);
                                  updateCurrentStep({ insertMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-[2] min-w-[240px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">버튼형 선택지 (콤마구분 ENUM)</label>
                                <input type="text" placeholder="예: 출석, 지각, 조퇴, 결석" value={mapping.promptOptions || ''} onChange={(e) => {
                                  const newArr = [...currentStep.insertMappings!];
                                  newArr[idx].promptOptions = e.target.value;
                                  updateCurrentStep({ insertMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                              <div className="flex items-center gap-2 pb-2">
                                <input type="checkbox" id={`custom-${mapping.id}`} checked={!!mapping.allowCustomPrompt} onChange={(e) => {
                                  const newArr = [...currentStep.insertMappings!];
                                  newArr[idx].allowCustomPrompt = e.target.checked;
                                  updateCurrentStep({ insertMappings: newArr });
                                }} className="w-4 h-4 accent-rose-500" />
                                <label htmlFor={`custom-${mapping.id}`} className="text-xs font-bold text-slate-600 cursor-pointer">기타 직접 입력 허용</label>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 데이터 수정 (Update) UI */}
          {currentStep.type === 'update_row' && (
            <div className="space-y-5 border-t border-slate-200 pt-5 mt-5">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 whitespace-nowrap">
                <DatabaseZap size={16} className="text-rose-500"/> 수정할 대상 테이블
              </label>
              <select
                value={currentStep.updateTableName || ''}
                onChange={(e) => updateCurrentStep({ updateTableName: e.target.value, updateMappings: [] })}
                className="w-full p-3 rounded-xl border border-rose-200 bg-rose-50 font-bold text-rose-800 outline-none min-w-[300px]"
              >
                <option value="">테이블을 선택하세요</option>
                {Object.keys(schemaData).map(table => <option key={table} value={table}>{table}</option>)}
              </select>
              <p className="text-xs text-slate-500 font-bold whitespace-nowrap">* 클릭한 카드의 고유 <strong>'id'</strong> 값을 기준으로 데이터가 수정됩니다.</p>

              {currentStep.updateTableName && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700 whitespace-nowrap">수정할 필드 매핑 및 타입 설정</label>
                    <button
                      onClick={() => {
                        const nm: UpdateMapping = { id: `m_${Date.now()}`, targetColumn: '', mappingType: 'prompt', sourceValue: '', valueType: 'string' };
                        updateCurrentStep({ updateMappings: [...(currentStep.updateMappings || []), nm] });
                      }}
                      className="text-xs bg-slate-800 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Plus size={14} /> 매핑 추가
                    </button>
                  </div>

                  {(currentStep.updateMappings || []).map((mapping: UpdateMapping, idx: number) => (
                    <div key={mapping.id} className="p-5 bg-white border-2 border-slate-100 rounded-2xl relative group shadow-sm">
                      <button
                        onClick={() => {
                          const newArr = currentStep.updateMappings!.filter((m: UpdateMapping) => m.id !== mapping.id);
                          updateCurrentStep({ updateMappings: newArr });
                        }}
                        className="absolute -top-2 -right-2 bg-white text-rose-500 border border-rose-100 p-1.5 rounded-full opacity-0 group-hover:opacity-100 shadow-md transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                      
                      <div className="grid grid-cols-4 gap-4 w-full min-w-max">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">1. 수정될 컬럼</span>
                          <select
                            value={mapping.targetColumn}
                            onChange={(e) => {
                              const newArr = [...currentStep.updateMappings!];
                              newArr[idx].targetColumn = e.target.value;
                              updateCurrentStep({ updateMappings: newArr });
                            }}
                            className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-lg bg-slate-50 text-slate-900 min-w-[160px]"
                          >
                            <option value="">-- 컬럼 선택 --</option>
                            {(schemaData[currentStep.updateTableName!] || []).map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">2. 데이터 출처</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={mapping.mappingType}
                              onChange={(e) => {
                                const newArr = [...currentStep.updateMappings!];
                                newArr[idx].mappingType = e.target.value as any;
                                updateCurrentStep({ updateMappings: newArr });
                              }}
                              className="flex-1 p-2.5 text-sm font-bold border border-indigo-100 rounded-lg bg-indigo-50 text-indigo-700 min-w-[180px]"
                            >
                              <option value="prompt">💬 모달폼 띄워서 입력받기</option>
                              <option value="card_data">📄 현재 카드의 다른 데이터 사용</option>
                              <option value="static">✍️ 백그라운드 직접 값 수정 (Static)</option>
                              <option value="user_name">👤 계정 사용자 이름</option>
                              <option value="user_email">📧 계정 사용자 이메일</option>
                            </select>
                          </div>
                        </div>
                        <div className="col-span-2">
                           {(mapping.mappingType === 'card_data' || mapping.mappingType === 'static' || mapping.mappingType === 'prompt') && (
                             <div className="space-y-2">
                               <div className="flex items-center justify-between">
                                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                                    {mapping.mappingType === 'prompt' ? '3+4. 수정 폼 레이블' : 
                                     mapping.mappingType === 'card_data' ? (mapping.isExpression ? '4. 스마트 수식 편집' : '3+4. 데이터 매핑 (컬럼명 또는 URL)') : 
                                     '3+4. 백그라운드 수정값'}
                                  </span>
                                  {mapping.mappingType === 'card_data' && mapping.isExpression && (
                                    <button onClick={() => setIsHelpModalOpen(true)} className="flex items-center gap-1 text-[10px] font-bold text-slate-400 hover:text-indigo-600 transition-colors"><HelpCircle size={12}/> [가이드 및 예시보기]</button>
                                  )}
                               </div>
                               <div className={`${mapping.mappingType === 'card_data' ? 'bg-indigo-50/50 border-indigo-100' : 'bg-slate-50 border-slate-100'} p-3 rounded-xl border-2 space-y-3`}>
                                  {mapping.mappingType === 'card_data' && (
                                    <div className="flex flex-wrap gap-1.5 p-1 border-b border-indigo-100/50 pb-2 mb-1">
                                      <span className="text-[9px] font-black text-indigo-400 w-full mb-1">클릭하여 컬럼 삽입:</span>
                                      {(schemaData[currentStep.tableName || ''] || []).length === 0 && (
                                        <div className="text-[10px] text-rose-500 font-bold py-1">⚠️ 상단에서 '소스 데이터 테이블'을 먼저 선택해야 컬럼 목록이 나타납니다.</div>
                                      )}
                                      {(schemaData[currentStep.tableName || ''] || []).map(col => (
                                        <button key={col} onClick={() => {
                                           const newArr = [...currentStep.updateMappings!];
                                           newArr[idx].sourceValue = (newArr[idx].sourceValue || '') + (mapping.isExpression ? `{{${col}}}` : `{{${col}}}`);
                                           updateCurrentStep({ updateMappings: newArr });
                                        }} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">
                                          {col}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {mapping.mappingType === 'card_data' ? (
                                    <AutoExpandingTextarea
                                      value={mapping.sourceValue || ''}
                                      onFocus={(e: any) => handleInputInteraction(mapping.id, e, 'update')}
                                      onChange={(e: any) => {
                                        const newArr = [...currentStep.updateMappings!];
                                        newArr[idx].sourceValue = e.target.value;
                                        updateCurrentStep({ updateMappings: newArr });
                                        handleInputInteraction(mapping.id, e, 'update');
                                      }}
                                      placeholder="컬럼을 클릭하거나 수식을 입력하세요 (예: {{성}} + {{이름}})"
                                      className="w-full p-3 text-sm font-bold bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400"
                                    />
                                  ) : (
                                    <div className="flex gap-3 items-center">
                                      <input
                                        type="text"
                                        value={mapping.sourceValue || ''}
                                        onChange={(e) => {
                                          const newArr = [...currentStep.updateMappings!];
                                          newArr[idx].sourceValue = e.target.value;
                                          updateCurrentStep({ updateMappings: newArr });
                                        }}
                                        placeholder="값을 입력하세요"
                                        className="flex-1 p-2.5 text-sm font-bold border border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-slate-900 bg-white"
                                      />
                                      <select
                                        value={mapping.valueType || 'string'}
                                        onChange={(e) => {
                                          const newArr = [...currentStep.updateMappings!];
                                          newArr[idx].valueType = e.target.value as 'string' | 'number';
                                          updateCurrentStep({ updateMappings: newArr });
                                        }}
                                        className="p-2.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 bg-white min-w-[100px]"
                                      >
                                        <option value="string">Text</option>
                                        <option value="number">Number</option>
                                      </select>
                                    </div>
                                  )}
                               </div>
                             </div>
                           )}
                           {(mapping.mappingType === 'user_name' || mapping.mappingType === 'user_email') && (
                             <div className="h-full flex items-center p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs font-bold text-slate-400 italic">
                               로그인한 사용자의 {mapping.mappingType === 'user_name' ? '이름' : '이메일'}이 자동으로 저장됩니다.
                             </div>
                           )}
                        </div>
                      </div>

                      {/* 🔥 [신규] 프롬프트(Prompt) 전용 고도화 설정 */}
                      {mapping.mappingType === 'prompt' && (
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100 flex flex-wrap gap-6 items-end">
                          {mapping.valueType === 'number' ? (
                            <>
                              <div className="flex-1 min-w-[120px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">입력 폼 기본값 (시작값)</label>
                                <input type="number" value={mapping.defaultNumberValue ?? 0} onChange={(e) => {
                                  const newArr = [...currentStep.updateMappings!];
                                  newArr[idx].defaultNumberValue = Number(e.target.value);
                                  updateCurrentStep({ updateMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                              <div className="flex-1 min-w-[120px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">증감폭 (+/- Step)</label>
                                <input type="number" value={mapping.numberStep ?? 1} onChange={(e) => {
                                  const newArr = [...currentStep.updateMappings!];
                                  newArr[idx].numberStep = Number(e.target.value);
                                  updateCurrentStep({ updateMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-[2] min-w-[240px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">버튼형 선택지 (콤마구분 ENUM)</label>
                                <input type="text" placeholder="예: 출석, 지각, 조퇴, 결석" value={mapping.promptOptions || ''} onChange={(e) => {
                                  const newArr = [...currentStep.updateMappings!];
                                  newArr[idx].promptOptions = e.target.value;
                                  updateCurrentStep({ updateMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                              <div className="flex items-center gap-2 pb-2">
                                <input type="checkbox" id={`update-custom-${mapping.id}`} checked={!!mapping.allowCustomPrompt} onChange={(e) => {
                                  const newArr = [...currentStep.updateMappings!];
                                  newArr[idx].allowCustomPrompt = e.target.checked;
                                  updateCurrentStep({ updateMappings: newArr });
                                }} className="w-4 h-4 accent-rose-500" />
                                <label htmlFor={`update-custom-${mapping.id}`} className="text-xs font-bold text-slate-600 cursor-pointer">기타 직접 입력 허용</label>
                              </div>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 선택 데이터 삭제 (Delete) UI */}
          {currentStep.type === 'delete_row' && (
            <div className="space-y-4 border-t border-slate-200 pt-5 mt-5">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <Trash2 size={16} className="text-rose-500"/> 삭제 대상 설정
              </label>
              <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl">
                 <p className="text-xs font-bold text-rose-800">
                   삭제 동작을 추가하면 해당 카드의 데이터를 즉시 삭제합니다. (삭제 전 재확인 팝업이 표시됩니다)
                 </p>
              </div>
            </div>
          )}

          {/* 문자 발송 (SMS) UI */}
          {currentStep.type === 'send_sms' && (
            <div className="space-y-5 border-t border-slate-200 pt-5 mt-5">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 whitespace-nowrap">
                <MessageSquare size={16} className="text-rose-500"/> SMS 발송 설정
              </label>
              
              <div className="space-y-4">
                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">1. 수신자 번호 (컬럼 선택)</label>
                   <select
                     value={currentStep.smsTargetColumn || ''}
                     onChange={(e) => updateCurrentStep({ smsTargetColumn: e.target.value })}
                     className="w-full p-3 rounded-xl border border-slate-200 bg-white font-bold text-slate-900 outline-none"
                   >
                     <option value="">번호가 담긴 컬럼을 선택하세요</option>
                     {(schemaData[currentStep.tableName || ''] || []).map(col => <option key={col} value={col}>{col}</option>)}
                   </select>
                 </div>

                 <div>
                   <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">2. 메시지 템플릿 (수식 지원)</label>
                   <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 space-y-4">
                      <div className="flex flex-wrap gap-1.5 p-1 border-b border-indigo-100/50 pb-2 mb-1">
                        <span className="text-[9px] font-black text-indigo-400 w-full mb-1">클릭하여 컬럼 삽입:</span>
                        {(schemaData[currentStep.tableName || ''] || []).map(col => (
                          <button key={col} onClick={() => {
                            const val = currentStep.smsMessageTemplate || '';
                            updateCurrentStep({ smsMessageTemplate: val + `{{${col}}}` });
                          }} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                            {col}
                          </button>
                        ))}
                      </div>
                      <AutoExpandingTextarea
                        value={currentStep.smsMessageTemplate || ''}
                        onChange={(e: any) => updateCurrentStep({ smsMessageTemplate: e.target.value })}
                        placeholder="메시지 내용을 입력하세요. {{이름}} 형태로 컬럼값을 넣을 수 있습니다."
                        className="w-full p-3 text-sm font-bold bg-slate-50 border border-slate-100 rounded-xl outline-none focus:border-indigo-400 min-h-[100px]"
                      />
                   </div>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
