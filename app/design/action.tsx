// action.tsx
import React from 'react';
import { Action, View, SchemaData, InsertMapping } from './types';
import { Settings2, Trash2, Plus, DatabaseZap } from 'lucide-react';

interface ActionEditorProps {
  action: Action;
  views: View[];
  schemaData: SchemaData;
  onUpdate: (updated: Action) => void;
  onDelete: (id: string) => void;
}

export default function ActionEditor({ action, views, schemaData, onUpdate, onDelete }: ActionEditorProps) {
  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-white rounded-tl-3xl shadow-sm border-l border-t border-slate-200">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
              <Settings2 className="text-rose-500" /> 액션 설정: {action.name}
            </h2>
            <p className="text-sm text-slate-500 mt-1">카드 내 버튼 클릭 시 실행될 이벤트를 정의하세요.</p>
          </div>
          <button 
            onClick={() => onDelete(action.id)}
            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <Trash2 size={20} />
          </button>
        </div>

        <div className="space-y-6 bg-slate-50 p-6 rounded-2xl border border-slate-200">
          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">액션 이름</label>
            {/* [수정] 입력 필드에 text-slate-900 bg-white 명시적 추가 */}
            <input
              type="text"
              value={action.name}
              onChange={(e) => onUpdate({ ...action, name: e.target.value })}
              className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-2">동작 유형</label>
            <select
              value={action.type}
              onChange={(e) => onUpdate({ ...action, type: e.target.value as Action['type'] })}
              className="w-full p-3 rounded-xl border border-slate-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none bg-white font-black text-rose-600"
            >
              <option value="navigate">다른 뷰로 이동 (화면 전환)</option>
              <option value="alert">알림 메시지 띄우기</option>
              <option value="insert_row">새로운 데이터 추가하기 (Insert)</option>
            </select>
          </div>

          {action.type === 'navigate' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">이동할 타겟 뷰</label>
              <select
                value={action.targetViewId || ''}
                onChange={(e) => onUpdate({ ...action, targetViewId: e.target.value })}
                className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none bg-white"
              >
                <option value="">뷰를 선택하세요</option>
                {views.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            </div>
          )}

          {action.type === 'alert' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <label className="block text-sm font-bold text-slate-700 mb-2">알림 메시지 내용</label>
              {/* [수정] text-slate-900 추가 */}
              <input
                type="text"
                value={action.message || ''}
                onChange={(e) => onUpdate({ ...action, message: e.target.value })}
                placeholder="예: 처리되었습니다."
                className="w-full p-3 rounded-xl border border-slate-200 text-slate-900 bg-white focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none"
              />
            </div>
          )}

          {action.type === 'insert_row' && (
            <div className="animate-in fade-in slide-in-from-top-2 space-y-5 border-t border-slate-200 pt-5 mt-5">
              <div>
                <label className="flex items-center gap-2 text-sm font-bold text-slate-700 mb-2">
                  <DatabaseZap size={16} className="text-rose-500"/> 대상 테이블 (Target Table)
                </label>
                <select
                  value={action.insertTableName || ''}
                  onChange={(e) => onUpdate({ ...action, insertTableName: e.target.value, insertMappings: [] })}
                  className="w-full p-3 rounded-xl border border-rose-200 bg-rose-50 focus:border-rose-500 outline-none font-bold text-rose-800"
                >
                  <option value="">테이블을 선택하세요</option>
                  {Object.keys(schemaData).map(table => (
                    <option key={table} value={table}>{table}</option>
                  ))}
                </select>
              </div>

              {action.insertTableName && (
                <div className="space-y-4">
                  <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex flex-col gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={action.requireConfirmation || false}
                        onChange={(e) => onUpdate({ ...action, requireConfirmation: e.target.checked })}
                        className="w-4 h-4 text-rose-600 focus:ring-rose-500 rounded cursor-pointer"
                      />
                      <span className="text-sm font-bold text-slate-700">액션 실행 전 확인창 띄우기 (Confirm)</span>
                    </label>
                    {action.requireConfirmation && (
                      <div className="ml-6">
                        {/* [수정] text-slate-900 추가 */}
                        <input
                          type="text"
                          value={action.confirmationMessage || ''}
                          onChange={(e) => onUpdate({ ...action, confirmationMessage: e.target.value })}
                          placeholder="예: 정말로 데이터를 추가하시겠습니까?"
                          className="w-full p-2 text-sm font-bold rounded-lg border border-rose-200 outline-none bg-white text-slate-900 focus:border-rose-500"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <label className="block text-sm font-bold text-slate-700">데이터 필드 매핑</label>
                    <button
                      onClick={() => {
                        const newMapping: InsertMapping = { id: `m_${Date.now()}`, targetColumn: '', mappingType: 'card_data', sourceValue: '' };
                        onUpdate({ ...action, insertMappings: [...(action.insertMappings || []), newMapping] });
                      }}
                      className="text-xs flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white px-3 py-2 rounded-lg font-bold transition-all shadow-sm"
                    >
                      <Plus size={14} /> 매핑 추가
                    </button>
                  </div>

                  {(action.insertMappings || []).length === 0 && (
                    <div className="text-center p-8 bg-white border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm font-bold">
                      매핑된 필드가 없습니다. 우측 상단의 버튼을 눌러 추가하세요.
                    </div>
                  )}

                  <div className="space-y-3">
                    {(action.insertMappings || []).map((mapping, idx) => (
                      <div key={mapping.id} className="flex flex-col gap-2 p-4 bg-white border-2 border-slate-100 rounded-2xl shadow-sm relative group">
                        <button
                          onClick={() => {
                            onUpdate({ ...action, insertMappings: action.insertMappings!.filter(m => m.id !== mapping.id) });
                          }}
                          className="absolute -top-3 -right-3 bg-white border border-rose-100 text-rose-500 p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500 hover:text-white shadow-md z-10"
                        >
                          <Trash2 size={14} />
                        </button>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">1. 저장할 필드 (대상)</span>
                            <select
                              value={mapping.targetColumn}
                              onChange={(e) => {
                                const newArr = [...action.insertMappings!];
                                newArr[idx].targetColumn = e.target.value;
                                onUpdate({ ...action, insertMappings: newArr });
                              }}
                              className="w-full p-2.5 text-sm font-bold text-slate-700 rounded-lg border border-slate-200 outline-none bg-slate-50 focus:border-rose-400"
                            >
                              <option value="">-- 컬럼 선택 --</option>
                              {(schemaData[action.insertTableName!] || []).map(col => (
                                <option key={col} value={col}>{col}</option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">2. 입력 데이터 출처</span>
                            <select
                              value={mapping.mappingType}
                              onChange={(e) => {
                                const newArr = [...action.insertMappings!];
                                newArr[idx].mappingType = e.target.value as any;
                                newArr[idx].sourceValue = ''; 
                                onUpdate({ ...action, insertMappings: newArr });
                              }}
                              className="w-full p-2.5 text-sm font-bold text-indigo-700 rounded-lg border border-indigo-200 outline-none bg-indigo-50 focus:border-indigo-400"
                            >
                              <option value="card_data">📄 현재 카드 데이터 재사용</option>
                              <option value="static">✍️ 직접 입력 (고정 텍스트)</option>
                              <option value="prompt">💬 팝업으로 사용자에게 묻기</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1 block">
                              3. {mapping.mappingType === 'card_data' ? '가져올 원본 컬럼명' : mapping.mappingType === 'prompt' ? '팝업 창에 띄울 질문 내용' : '입력할 고정값'}
                            </span>
                            {/* [수정] text-slate-900 추가 */}
                            <input
                              type="text"
                              value={mapping.sourceValue}
                              onChange={(e) => {
                                const newArr = [...action.insertMappings!];
                                newArr[idx].sourceValue = e.target.value;
                                onUpdate({ ...action, insertMappings: newArr });
                              }}
                              placeholder={
                                mapping.mappingType === 'card_data' ? "예: id, name 등" : 
                                mapping.mappingType === 'prompt' ? "예: 결석 사유를 입력하세요" : 
                                "직접 입력"
                              }
                              className={`w-full p-2.5 text-sm font-bold text-slate-900 rounded-lg border outline-none bg-white ${
                                mapping.mappingType === 'card_data' 
                                  ? 'border-slate-200 focus:border-rose-400' 
                                  : 'border-rose-200 focus:border-rose-500'
                              }`}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}