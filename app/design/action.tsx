// 파일 경로: app/design/action.tsx
"use client";

import React from 'react';
import { Action, View, SchemaData, InsertMapping } from './types';
import { Settings2, Trash2, Plus, DatabaseZap, Star, MessageSquare } from 'lucide-react';
import { IconMap } from './picker';

interface ActionEditorProps {
  action: Action;
  views: View[];
  schemaData: SchemaData;
  onUpdate: (updated: Action) => void;
  onDelete: (id: string) => void;
  onOpenIconPicker: () => void;
}

export default function ActionEditor({ 
  action, 
  views, 
  schemaData, 
  onUpdate, 
  onDelete,
  onOpenIconPicker 
}: ActionEditorProps) {
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
                          <select
                            value={mapping.mappingType}
                            onChange={(e) => {
                              const newArr = [...action.insertMappings!];
                              newArr[idx].mappingType = e.target.value as any;
                              onUpdate({ ...action, insertMappings: newArr });
                            }}
                            className="w-full p-2.5 text-sm font-bold border border-indigo-100 rounded-lg bg-indigo-50 text-indigo-700 min-w-[180px]"
                          >
                            <option value="prompt">💬 폼에서 직접 입력받기</option>
                            <option value="card_data">📄 현재 카드 데이터 재사용</option>
                            <option value="static">✍️ 고정 값 입력</option>
                            <option value="user_name">👤 계정 사용자 이름</option>
                            <option value="user_email">📧 계정 사용자 이메일</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">3. 데이터 형식</span>
                          <select
                            value={mapping.valueType || 'string'}
                            onChange={(e) => {
                              const newArr = [...action.insertMappings!];
                              newArr[idx].valueType = e.target.value as 'string' | 'number';
                              onUpdate({ ...action, insertMappings: newArr });
                            }}
                            className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-lg text-slate-900 min-w-[160px]"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <option value="string">Text (문자열)</option>
                            <option value="number">Number (숫자)</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">
                            4. {mapping.mappingType === 'prompt' ? '입력 폼 레이블' : mapping.mappingType === 'card_data' ? '원본 컬럼명' : mapping.mappingType === 'static' ? '고정값' : '설정 불필요'}
                          </span>
                          <input
                            type="text"
                            value={mapping.mappingType === 'user_name' || mapping.mappingType === 'user_email' ? '(자동 적용)' : mapping.sourceValue}
                            disabled={mapping.mappingType === 'user_name' || mapping.mappingType === 'user_email'}
                            onChange={(e) => {
                              const newArr = [...action.insertMappings!];
                              newArr[idx].sourceValue = e.target.value;
                              onUpdate({ ...action, insertMappings: newArr });
                            }}
                            placeholder="설정값을 입력하세요"
                            className="w-full p-2.5 text-sm font-bold border border-rose-200 rounded-lg focus:border-rose-500 outline-none text-slate-900 min-w-[200px] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                            style={{ color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
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
                          <select
                            value={mapping.mappingType}
                            onChange={(e) => {
                              const newArr = [...action.updateMappings!];
                              newArr[idx].mappingType = e.target.value as any;
                              onUpdate({ ...action, updateMappings: newArr });
                            }}
                            className="w-full p-2.5 text-sm font-bold border border-indigo-100 rounded-lg bg-indigo-50 text-indigo-700 min-w-[180px]"
                          >
                            <option value="prompt">💬 모달폼 띄워서 입력받기</option>
                            <option value="card_data">📄 현재 카드의 다른 데이터 사용</option>
                            <option value="static">✍️ 백그라운 고정 값 일괄수정</option>
                            <option value="user_name">👤 계정 사용자 이름</option>
                            <option value="user_email">📧 계정 사용자 이메일</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">3. 데이터 형식</span>
                          <select
                            value={mapping.valueType || 'string'}
                            onChange={(e) => {
                              const newArr = [...action.updateMappings!];
                              newArr[idx].valueType = e.target.value as 'string' | 'number';
                              onUpdate({ ...action, updateMappings: newArr });
                            }}
                            className="w-full p-2.5 text-sm font-bold border border-slate-200 rounded-lg text-slate-900 min-w-[160px]"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            <option value="string">Text (문자열)</option>
                            <option value="number">Number (숫자)</option>
                          </select>
                        </div>
                        <div>
                          <span className="text-[10px] font-black text-slate-400 uppercase mb-1 block tracking-wider whitespace-nowrap">
                            4. {mapping.mappingType === 'prompt' ? '수정 폼 레이블' : mapping.mappingType === 'card_data' ? '원본 컬럼명' : mapping.mappingType === 'static' ? '고정값' : '설정 불필요'}
                          </span>
                          <input
                            type="text"
                            value={mapping.mappingType === 'user_name' || mapping.mappingType === 'user_email' ? '(자동 적용)' : mapping.sourceValue}
                            disabled={mapping.mappingType === 'user_name' || mapping.mappingType === 'user_email'}
                            onChange={(e) => {
                              const newArr = [...action.updateMappings!];
                              newArr[idx].sourceValue = e.target.value;
                              onUpdate({ ...action, updateMappings: newArr });
                            }}
                            placeholder="설정값을 입력하세요"
                            className="w-full p-2.5 text-sm font-bold border border-rose-200 rounded-lg focus:border-rose-500 outline-none text-slate-900 min-w-[200px] disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed"
                            style={{ color: 'var(--text-primary)' }}
                          />
                        </div>
                      </div>
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
    </div>
  );
}