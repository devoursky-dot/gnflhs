// 파일 경로: app/design/action.tsx
"use client";

import React, { useState } from 'react';
import { Action, View, SchemaData, InsertMapping } from './types';
import { Trash2, Plus, DatabaseZap, HelpCircle, X, Code2, Layers, Settings2, Star, MessageSquare } from 'lucide-react';
import { IconMap } from './picker';
import { FORMULA_EXAMPLES } from './formulaExamples';

interface ActionEditorProps {
  action: Action;
  schemaData: SchemaData;
  onUpdate: (updated: Action) => void;
  onDelete: (id: string) => void;
  onOpenIconPicker: () => void;
}

export default function ActionEditor({ 
  action, 
  schemaData, 
  onUpdate, 
  onDelete,
  onOpenIconPicker 
}: ActionEditorProps) {
  const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
  const [lastFocusedExpr, setLastFocusedExpr] = useState<{ id: string; pos: number; type: 'insert' | 'update' } | null>(null);

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
    const list = (action as any)[mappingListKey] || [];
    
    const updatedList = list.map((m: any) => {
      if (m.id === id) {
        const val = m.sourceValue || '';
        const newVal = val.slice(0, pos) + snippet + val.slice(pos);
        // 삽입 후 커서 위치 조정
        setLastFocusedExpr({ ...lastFocusedExpr, pos: pos + snippet.length });
        return { ...m, sourceValue: newVal };
      }
      return m;
    });

    onUpdate({ ...action, [mappingListKey]: updatedList });
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
    // 🔥 [핵심 래퍼] min-w-fit 적용
    <div className="w-full min-w-fit mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 relative p-8 lg:p-12">
      <div className="w-full mx-auto space-y-8">
        
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
                style={{ color: 'var(--text-primary)' }}
              />
            </div>
          </div>
          
          <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl">
            <label className="flex items-center gap-2 text-sm font-bold text-indigo-700 mb-2 whitespace-nowrap">
              <Layers size={16}/> 소스 데이터 테이블 (현재 카드 데이터의 출처)
            </label>
            <select
              value={action.tableName || ''}
              onChange={(e) => onUpdate({ ...action, tableName: e.target.value })}
              className="w-full p-3 rounded-xl border border-indigo-200 bg-white font-bold text-indigo-900 outline-none min-w-[300px]"
            >
              <option value="">데이터를 가져올 테이블을 선택하세요</option>
              {Object.keys(schemaData).map(table => <option key={table} value={table}>{table}</option>)}
            </select>
            <p className="mt-2 text-[10px] text-indigo-400 font-bold whitespace-nowrap">* '현재 카드 데이터 재사용' 시 아래 선택한 테이블의 컬럼들이 목록에 나타납니다.</p>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2 whitespace-nowrap">동작 유형</label>
            <select
              value={action.type}
              onChange={(e) => onUpdate({ ...action, type: e.target.value as Action['type'] })}
              className="w-full p-3 rounded-xl border border-slate-200 bg-white font-black text-rose-600 min-w-[300px]"
            >
              <option value="navigate">다른 뷰로 이동</option>
              <option value="alert">알림 메시지</option>
              <option value="insert_row">데이터 추가 (Insert)</option>
              <option value="update_row">데이터 수정 (Update Modal)</option>
              <option value="delete_row">선택한 데이터 삭제 (Delete)</option>
              <option value="send_sms">📱 문자 발송 (SMS 단축)</option>
            </select>
          </div>

          {/* 데이터 추가 (Insert) UI */}
          {action.type === 'insert_row' && (
            <div className="space-y-5 border-t border-slate-200 pt-5 mt-5">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 whitespace-nowrap">
                <DatabaseZap size={16} className="text-rose-500"/> 추가할 대상 테이블
              </label>
              <select
                value={action.insertTableName || ''}
                onChange={(e) => onUpdate({ ...action, insertTableName: e.target.value, insertMappings: [] })}
                className="w-full p-3 rounded-xl border border-rose-200 bg-rose-50 font-bold text-rose-800 outline-none min-w-[300px]"
              >
                <option value="">테이블을 선택하세요</option>
                {Object.keys(schemaData).map(table => <option key={table} value={table}>{table}</option>)}
              </select>

              <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-100">
                <input
                  type="checkbox"
                  id="quick-save-toggle"
                  checked={action.requireConfirmation === false}
                  onChange={(e) => onUpdate({ ...action, requireConfirmation: !e.target.checked })}
                  className="w-5 h-5 accent-amber-600"
                />
                <label htmlFor="quick-save-toggle" className="text-sm font-black text-amber-900 cursor-pointer flex items-center gap-2">
                  ⚡ 초고속 모드 (확인창 없이 즉시 저장) 
                  <span className="text-[10px] font-bold text-amber-600/70 ml-2">* 입력 항목이 하나뿐인 버튼형 폼은 클릭 즉시 저장됩니다.</span>
                </label>
              </div>

              {action.insertTableName && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700 whitespace-nowrap">필드 매핑 및 타입 설정</label>
                    <button
                      onClick={() => {
                        const nm: InsertMapping = { id: `m_${Date.now()}`, targetColumn: '', mappingType: 'prompt', sourceValue: '', valueType: 'string' };
                        onUpdate({ ...action, insertMappings: [...(action.insertMappings || []), nm] });
                      }}
                      className="text-xs bg-slate-800 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Plus size={14} /> 매핑 추가
                    </button>
                  </div>

                  {(action.insertMappings || []).map((mapping, idx) => (
                    <div key={mapping.id} className="p-5 bg-white border-2 border-slate-100 rounded-2xl relative group shadow-sm">
                      <button
                        onClick={() => onUpdate({ ...action, insertMappings: action.insertMappings!.filter(m => m.id !== mapping.id) })}
                        className="absolute -top-2 -right-2 bg-white text-rose-500 border border-rose-100 p-1.5 rounded-full opacity-0 group-hover:opacity-100 shadow-md transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                      
                      {/* 🔥 4단 그리드가 축소되지 않도록 본연의 크기(min-w-max)를 계산하게 만듭니다. */}
                      <div className="grid grid-cols-4 gap-4 w-full min-w-max">
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">1. 저장할 컬럼</span>
                          <select
                            value={mapping.targetColumn}
                            onChange={(e) => {
                              const newArr = [...action.insertMappings!];
                              newArr[idx].targetColumn = e.target.value;
                              onUpdate({ ...action, insertMappings: newArr });
                            }}
                            className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-lg bg-slate-50 text-slate-900 min-w-[160px]"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <option value="">-- 컬럼 선택 --</option>
                            {(schemaData[action.insertTableName!] || []).map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">2. 데이터 출처</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={mapping.mappingType}
                              onChange={(e) => {
                                const newArr = [...action.insertMappings!];
                                newArr[idx].mappingType = e.target.value as any;
                                onUpdate({ ...action, insertMappings: newArr });
                              }}
                              className="flex-1 p-2.5 text-sm font-bold border border-indigo-100 rounded-lg bg-indigo-50 text-indigo-700 min-w-[180px]"
                            >
                              <option value="prompt">💬 폼에서 직접 입력받기</option>
                              <option value="card_data">📄 현재 카드 데이터 재사용</option>
                              <option value="static">✍️ 직접 값 입력 (Static)</option>
                              <option value="user_name">👤 계정 사용자 이름</option>
                              <option value="user_email">📧 계정 사용자 이메일</option>
                            </select>
                            {mapping.mappingType === 'card_data' && (
                              <button 
                                onClick={() => {
                                  const newArr = [...action.insertMappings!];
                                  newArr[idx].isExpression = !newArr[idx].isExpression;
                                  onUpdate({ ...action, insertMappings: newArr });
                                }}
                                className={`px-2 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${mapping.isExpression ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                                title="수식/조건문 모드 토글"
                              >
                                {mapping.isExpression ? 'Smart' : 'Basic'}
                              </button>
                            )}
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
                                      {(schemaData[action.tableName || ''] || []).length === 0 && (
                                        <div className="text-[10px] text-rose-500 font-bold py-1">⚠️ 상단에서 '소스 데이터 테이블'을 먼저 선택해야 컬럼 목록이 나타납니다.</div>
                                      )}
                                      {(schemaData[action.tableName || ''] || []).map(col => (
                                        <button key={col} onClick={() => {
                                           const newArr = [...action.insertMappings!];
                                           // Basic 모드여도 조합 가능한 {{}} 형태로 삽입
                                           newArr[idx].sourceValue = (newArr[idx].sourceValue || '') + (mapping.isExpression ? `{{${col}}}` : `{{${col}}}`);
                                           onUpdate({ ...action, insertMappings: newArr });
                                        }} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">
                                          {col}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {mapping.mappingType === 'card_data' && mapping.isExpression ? (
                                    <textarea
                                      value={mapping.sourceValue || ''}
                                      onFocus={(e) => handleInputInteraction(mapping.id, e, 'insert')}
                                      onClick={(e) => handleInputInteraction(mapping.id, e, 'insert')}
                                      onKeyUp={(e) => handleInputInteraction(mapping.id, e, 'insert')}
                                      onChange={(e) => {
                                        const newArr = [...action.insertMappings!];
                                        newArr[idx].sourceValue = e.target.value;
                                        onUpdate({ ...action, insertMappings: newArr });
                                        handleInputInteraction(mapping.id, e, 'insert');
                                      }}
                                      placeholder="{{컬럼1}} + {{컬럼2}}"
                                      rows={2}
                                      className="w-full p-3 text-sm font-mono font-bold bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400"
                                    />
                                  ) : (
                                    <div className="flex gap-3 items-center">
                                      <input
                                        type="text"
                                        value={mapping.sourceValue || ''}
                                        onChange={(e) => {
                                          const newArr = [...action.insertMappings!];
                                          newArr[idx].sourceValue = e.target.value;
                                          onUpdate({ ...action, insertMappings: newArr });
                                        }}
                                        placeholder={mapping.mappingType === 'card_data' ? "예: 학번 또는 https://.../{{학번}}.jpg" : "값을 입력하세요"}
                                        className="flex-1 p-2.5 text-sm font-bold border border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-slate-900 bg-white"
                                        style={{ color: 'var(--text-primary)' }}
                                      />
                                      {mapping.mappingType !== 'card_data' && (
                                        <select
                                          value={mapping.valueType || 'string'}
                                          onChange={(e) => {
                                            const newArr = [...action.insertMappings!];
                                            newArr[idx].valueType = e.target.value as 'string' | 'number';
                                            onUpdate({ ...action, insertMappings: newArr });
                                          }}
                                          className="p-2.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 bg-white min-w-[100px]"
                                        >
                                          <option value="string">Text</option>
                                          <option value="number">Number</option>
                                        </select>
                                      )}
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
                                  const newArr = [...action.insertMappings!];
                                  newArr[idx].defaultNumberValue = Number(e.target.value);
                                  onUpdate({ ...action, insertMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                              <div className="flex-1 min-w-[120px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">증감폭 (+/- Step)</label>
                                <input type="number" value={mapping.numberStep ?? 1} onChange={(e) => {
                                  const newArr = [...action.insertMappings!];
                                  newArr[idx].numberStep = Number(e.target.value);
                                  onUpdate({ ...action, insertMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-[2] min-w-[240px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">버튼형 선택지 (콤마구분 ENUM)</label>
                                <input type="text" placeholder="예: 출석, 지각, 조퇴, 결석" value={mapping.promptOptions || ''} onChange={(e) => {
                                  const newArr = [...action.insertMappings!];
                                  newArr[idx].promptOptions = e.target.value;
                                  onUpdate({ ...action, insertMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                              <div className="flex items-center gap-2 pb-2">
                                <input type="checkbox" id={`custom-${mapping.id}`} checked={!!mapping.allowCustomPrompt} onChange={(e) => {
                                  const newArr = [...action.insertMappings!];
                                  newArr[idx].allowCustomPrompt = e.target.checked;
                                  onUpdate({ ...action, insertMappings: newArr });
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
          {action.type === 'update_row' && (
            <div className="space-y-5 border-t border-slate-200 pt-5 mt-5">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 whitespace-nowrap">
                <DatabaseZap size={16} className="text-rose-500"/> 수정할 대상 테이블
              </label>
              <select
                value={action.updateTableName || ''}
                onChange={(e) => onUpdate({ ...action, updateTableName: e.target.value, updateMappings: [] })}
                className="w-full p-3 rounded-xl border border-rose-200 bg-rose-50 font-bold text-rose-800 outline-none min-w-[300px]"
              >
                <option value="">테이블을 선택하세요</option>
                {Object.keys(schemaData).map(table => <option key={table} value={table}>{table}</option>)}
              </select>
              <p className="text-xs text-slate-500 font-bold whitespace-nowrap">* 클릭한 카드의 고유 <strong>'id'</strong> 값을 기준으로 데이터가 수정됩니다.</p>

              {action.updateTableName && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-bold text-slate-700 whitespace-nowrap">수정할 필드 매핑 및 타입 설정</label>
                    <button
                      onClick={() => {
                        const nm: InsertMapping = { id: `m_${Date.now()}`, targetColumn: '', mappingType: 'prompt', sourceValue: '', valueType: 'string' };
                        onUpdate({ ...action, updateMappings: [...(action.updateMappings || []), nm] });
                      }}
                      className="text-xs bg-slate-800 text-white px-3 py-2 rounded-lg font-bold flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      <Plus size={14} /> 매핑 추가
                    </button>
                  </div>

                  {(action.updateMappings || []).map((mapping, idx) => (
                    <div key={mapping.id} className="p-5 bg-white border-2 border-slate-100 rounded-2xl relative group shadow-sm">
                      <button
                        onClick={() => onUpdate({ ...action, updateMappings: action.updateMappings!.filter(m => m.id !== mapping.id) })}
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
                              const newArr = [...action.updateMappings!];
                              newArr[idx].targetColumn = e.target.value;
                              onUpdate({ ...action, updateMappings: newArr });
                            }}
                            className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-lg bg-slate-50 text-slate-900 min-w-[160px]"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <option value="">-- 컬럼 선택 --</option>
                            {(schemaData[action.updateTableName!] || []).map(col => <option key={col} value={col}>{col}</option>)}
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">2. 데이터 출처</span>
                          <div className="flex items-center gap-2">
                            <select
                              value={mapping.mappingType}
                              onChange={(e) => {
                                const newArr = [...action.updateMappings!];
                                newArr[idx].mappingType = e.target.value as any;
                                onUpdate({ ...action, updateMappings: newArr });
                              }}
                              className="flex-1 p-2.5 text-sm font-bold border border-indigo-100 rounded-lg bg-indigo-50 text-indigo-700 min-w-[180px]"
                            >
                              <option value="prompt">💬 모달폼 띄워서 입력받기</option>
                              <option value="card_data">📄 현재 카드의 다른 데이터 사용</option>
                              <option value="static">✍️ 백그라운드 직접 값 수정 (Static)</option>
                              <option value="user_name">👤 계정 사용자 이름</option>
                              <option value="user_email">📧 계정 사용자 이메일</option>
                            </select>
                            {mapping.mappingType === 'card_data' && (
                              <button 
                                onClick={() => {
                                  const newArr = [...action.updateMappings!];
                                  newArr[idx].isExpression = !newArr[idx].isExpression;
                                  onUpdate({ ...action, updateMappings: newArr });
                                }}
                                className={`px-2 py-2.5 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${mapping.isExpression ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                                title="수식/조건문 모드 토글"
                              >
                                {mapping.isExpression ? 'Smart' : 'Basic'}
                              </button>
                            )}
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
                                      {(schemaData[action.tableName || ''] || []).length === 0 && (
                                        <div className="text-[10px] text-rose-500 font-bold py-1">⚠️ 상단에서 '소스 데이터 테이블'을 먼저 선택해야 컬럼 목록이 나타납니다.</div>
                                      )}
                                      {(schemaData[action.tableName || ''] || []).map(col => (
                                        <button key={col} onClick={() => {
                                           const newArr = [...action.updateMappings!];
                                           // Basic 모드여도 조합 가능한 {{}} 형태로 삽입
                                           newArr[idx].sourceValue = (newArr[idx].sourceValue || '') + (mapping.isExpression ? `{{${col}}}` : `{{${col}}}`);
                                           onUpdate({ ...action, updateMappings: newArr });
                                        }} className="px-2 py-1 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-indigo-600 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all shadow-sm">
                                          {col}
                                        </button>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {mapping.mappingType === 'card_data' && mapping.isExpression ? (
                                    <textarea
                                      value={mapping.sourceValue || ''}
                                      onFocus={(e) => handleInputInteraction(mapping.id, e, 'update')}
                                      onClick={(e) => handleInputInteraction(mapping.id, e, 'update')}
                                      onKeyUp={(e) => handleInputInteraction(mapping.id, e, 'update')}
                                      onChange={(e) => {
                                        const newArr = [...action.updateMappings!];
                                        newArr[idx].sourceValue = e.target.value;
                                        onUpdate({ ...action, updateMappings: newArr });
                                        handleInputInteraction(mapping.id, e, 'update');
                                      }}
                                      placeholder="{{컬럼1}} + {{컬럼2}}"
                                      rows={2}
                                      className="w-full p-3 text-sm font-mono font-bold bg-white border border-slate-200 rounded-lg outline-none focus:border-indigo-400"
                                    />
                                  ) : (
                                    <div className="flex gap-3 items-center">
                                      <input
                                        type="text"
                                        value={mapping.sourceValue || ''}
                                        onChange={(e) => {
                                          const newArr = [...action.updateMappings!];
                                          newArr[idx].sourceValue = e.target.value;
                                          onUpdate({ ...action, updateMappings: newArr });
                                        }}
                                        placeholder={mapping.mappingType === 'card_data' ? "예: 학번 또는 https://.../{{학번}}.jpg" : "값을 입력하세요"}
                                        className="flex-1 p-2.5 text-sm font-bold border border-slate-200 rounded-lg focus:border-indigo-500 outline-none text-slate-900 bg-white"
                                        style={{ color: 'var(--text-primary)' }}
                                      />
                                      {mapping.mappingType !== 'card_data' && (
                                        <select
                                          value={mapping.valueType || 'string'}
                                          onChange={(e) => {
                                            const newArr = [...action.updateMappings!];
                                            newArr[idx].valueType = e.target.value as 'string' | 'number';
                                            onUpdate({ ...action, updateMappings: newArr });
                                          }}
                                          className="p-2.5 text-xs font-bold border border-slate-200 rounded-lg text-slate-600 bg-white min-w-[100px]"
                                        >
                                          <option value="string">Text</option>
                                          <option value="number">Number</option>
                                        </select>
                                      )}
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
                                  const newArr = [...action.updateMappings!];
                                  newArr[idx].defaultNumberValue = Number(e.target.value);
                                  onUpdate({ ...action, updateMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                              <div className="flex-1 min-w-[120px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">증감폭 (+/- Step)</label>
                                <input type="number" value={mapping.numberStep ?? 1} onChange={(e) => {
                                  const newArr = [...action.updateMappings!];
                                  newArr[idx].numberStep = Number(e.target.value);
                                  onUpdate({ ...action, updateMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex-[2] min-w-[240px]">
                                <label className="text-[10px] font-black text-slate-500 uppercase block mb-1">버튼형 선택지 (콤마구분 ENUM)</label>
                                <input type="text" placeholder="예: 출석, 지각, 조퇴, 결석" value={mapping.promptOptions || ''} onChange={(e) => {
                                  const newArr = [...action.updateMappings!];
                                  newArr[idx].promptOptions = e.target.value;
                                  onUpdate({ ...action, updateMappings: newArr });
                                }} className="w-full p-2 text-sm font-bold border rounded-lg" />
                              </div>
                              <div className="flex items-center gap-2 pb-2">
                                <input type="checkbox" id={`update-custom-${mapping.id}`} checked={!!mapping.allowCustomPrompt} onChange={(e) => {
                                  const newArr = [...action.updateMappings!];
                                  newArr[idx].allowCustomPrompt = e.target.checked;
                                  onUpdate({ ...action, updateMappings: newArr });
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

          {/* 데이터 삭제 (Delete) UI */}
          {action.type === 'delete_row' && (
            <div className="space-y-5 border-t border-slate-200 pt-5 mt-5">
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 whitespace-nowrap">
                <DatabaseZap size={16} className="text-rose-500"/> 삭제할 대상 테이블
              </label>
              <select
                value={action.deleteTableName || ''}
                onChange={(e) => onUpdate({ ...action, deleteTableName: e.target.value })}
                className="w-full p-3 rounded-xl border border-rose-200 bg-rose-50 font-bold text-rose-800 outline-none min-w-[300px]"
              >
                <option value="">테이블을 선택하세요</option>
                {Object.keys(schemaData).map(table => <option key={table} value={table}>{table}</option>)}
              </select>
              <div className="p-4 bg-rose-50 text-rose-600 rounded-xl text-xs font-bold leading-relaxed border border-rose-100 whitespace-nowrap">
                * 사용자가 클릭한 카드의 고유 <strong>'id'</strong> 값을 기준으로 데이터가 즉시 삭제됩니다.<br/>
                * 연결된 테이블에 반드시 'id' 컬럼이 존재해야 안전하게 작동합니다.
              </div>
            </div>
          )}

          {/* 문자 발송 (SMS) UI */}
          {action.type === 'send_sms' && (
            <div className="space-y-5 border-t border-slate-200 pt-5 mt-5">
              <div className="p-4 bg-emerald-50 text-emerald-700 font-bold text-xs rounded-xl break-keep leading-relaxed border border-emerald-100 shadow-sm">
                💡 대상자의 전화번호는 <strong>students</strong> 테이블의 <strong>PHONE</strong> 컬럼에서 자동으로 찾아서 발송합니다! <br/>
                (이름, 학번, 또는 student_id 정보를 기준으로 자동 검색)
              </div>
              <label className="flex items-center gap-2 text-sm font-bold text-slate-700 whitespace-nowrap">
                <MessageSquare size={16} className="text-emerald-500"/> 문자 내용 구성 테이블 선택
              </label>
              <select
                value={action.smsTableName || ''}
                onChange={(e) => onUpdate({ ...action, smsTableName: e.target.value })}
                className="w-full p-3 rounded-xl border border-emerald-200 bg-white font-bold text-slate-800 outline-none min-w-[300px]"
              >
                <option value="">-- 컬럼 목록을 불러올 테이블 선택 --</option>
                {Object.keys(schemaData).map(table => <option key={table} value={table}>{table}</option>)}
              </select>

              {action.smsTableName && (
                <div className="space-y-5 mt-4 p-5 bg-white border-2 border-slate-100 rounded-2xl shadow-sm">
                  <div>
                    <label className="block text-sm font-black text-slate-700 mb-1">전송할 문자 메시지 (치환 템플릿)</label>
                    <p className="text-[11px] font-bold text-slate-400 mb-3 block break-keep">
                      아래 변수 버튼을 클릭하면 문구에 쏙 들어갑니다! 실제 발송 시 해당 데이터로 변경됩니다.
                    </p>
                    
                    <div className="flex flex-wrap gap-2 mb-4">
                      {(schemaData[action.smsTableName] || []).map(col => (
                        <button 
                          key={col} 
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-50 hover:border-emerald-200 border border-transparent text-slate-600 hover:text-emerald-600 text-[11px] font-black rounded-lg cursor-pointer transition-all shadow-sm active:scale-95"
                          onClick={() => {
                            const ta = document.getElementById('sms-textarea') as HTMLTextAreaElement;
                            const newText = action.smsMessageTemplate ? action.smsMessageTemplate + `{{${col}}}` : `{{${col}}}`;
                            onUpdate({ ...action, smsMessageTemplate: newText });
                          }}
                        >
                          {`{{${col}}}`}
                        </button>
                      ))}
                    </div>

                    <textarea
                      id="sms-textarea"
                      value={action.smsMessageTemplate || ''}
                      onChange={(e) => onUpdate({ ...action, smsMessageTemplate: e.target.value })}
                      className="w-full p-4 rounded-xl border-2 border-slate-200 focus:border-emerald-500 font-mono text-sm leading-relaxed text-slate-900 outline-none transition-colors"
                      rows={6}
                      placeholder={`[공지]\n{{NAME}}님, 안녕하세요.\n{{BUN}}반 생활 기록 안내입니다.`}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        <style jsx global>{`
          input, select, textarea {
            color: var(--text-primary, #0f172a) !important;
          }
          input::placeholder {
            color: var(--text-secondary, #64748b) !important;
          }
        `}</style>
      </div>
      {isHelpModalOpen && <FormulaHelpModal />}
    </div>
  );
}