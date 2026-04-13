// app/design/data.tsx
"use client";

import React, { useState } from 'react';
import { 
  Database, Plus, Trash2, Edit2, Link, Variable, 
  Trash, Save, X, ChevronRight, Info, AlertTriangle, Layers
} from 'lucide-react';
import { AppState, VirtualTable, VirtualColumn } from './types';

// --- 전역 가상 테이블 관리자 (Sidebar Section) ---
export function VirtualTableManager({ 
  appState, 
  setAppState, 
  onEdit 
}: { 
  appState: AppState, 
  setAppState: (s: AppState) => void,
  onEdit: (table: VirtualTable) => void
}) {
  const virtualTables = appState.virtualTables || [];

  const handleAddTable = () => {
    const newId = `vt_${Date.now()}`;
    const newTable: VirtualTable = {
      id: newId,
      name: '새 가상 테이블',
      baseTableName: '',
      columns: []
    };
    setAppState({
      ...appState,
      virtualTables: [...virtualTables, newTable]
    });
    onEdit(newTable);
  };

  const handleDeleteTable = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('이 가상 테이블을 삭제하시겠습니까? 이 테이블을 사용하는 뷰들이 오작동할 수 있습니다.')) return;
    setAppState({
      ...appState,
      virtualTables: virtualTables.filter(t => t.id !== id)
    });
  };

  return (
    <div className="mt-10">
      <div className="flex justify-between items-center text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 px-1">
        <div className="flex items-center gap-2">
          <Database size={14} className="text-emerald-500" />
          <span>DATABASES (가상)</span>
        </div>
        <button 
          onClick={handleAddTable} 
          className="p-1 hover:bg-slate-100 rounded-lg text-emerald-600 transition-colors"
        >
          <Plus size={18}/>
        </button>
      </div>

      <div className="space-y-3">
        {virtualTables.map((vt) => (
          <div 
            key={vt.id} 
            onClick={() => onEdit(vt)}
            className="group relative bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 cursor-pointer transition-all hover:shadow-md"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Layers size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-black text-slate-700">{vt.name}</h4>
                  <p className="text-[10px] font-bold text-slate-400 mt-0.5">
                    Source: <span className="text-slate-500">{vt.baseTableName || '(미설정)'}</span>
                  </p>
                </div>
              </div>
              <button 
                onClick={(e) => handleDeleteTable(vt.id, e)}
                className="opacity-0 group-hover:opacity-100 p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
        
        {virtualTables.length === 0 && (
          <div className="py-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-300 gap-2">
            <Database size={24} className="opacity-20" />
            <p className="text-[10px] font-bold text-slate-400 uppercase">가상 테이블이 없습니다</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- 가상 테이블 상세 에디터 (Modal) ---
export function VirtualTableEditor({
  table,
  isOpen,
  onClose,
  onSave,
  schemaData
}: {
  table: VirtualTable,
  isOpen: boolean,
  onClose: () => void,
  onSave: (updated: VirtualTable) => void,
  schemaData: Record<string, string[]>
}) {
  const [editingTable, setEditingTable] = useState<VirtualTable>({ ...table });
  const [activeTab, setActiveTab] = useState<'settings' | 'columns'>('settings');

  if (!isOpen) return null;

  const tableNames = Object.keys(schemaData).sort();
  const availableColumns = editingTable.baseTableName ? schemaData[editingTable.baseTableName] || [] : [];

  const handleAddColumn = (type: 'join' | 'formula') => {
    const newId = `vc_${Date.now()}`;
    const newCol: VirtualColumn = {
      id: newId,
      name: type === 'join' ? '새 조인 컬럼' : '새 수식 컬럼',
      type,
      joinConfig: type === 'join' ? { targetTable: '', localKey: '', foreignKey: '', sourceColumn: '' } : undefined,
      formulaConfig: type === 'formula' ? { expression: '' } : undefined
    };
    setEditingTable({
      ...editingTable,
      columns: [...editingTable.columns, newCol]
    });
  };

  const updateColumn = (id: string, updates: Partial<VirtualColumn>) => {
    setEditingTable({
      ...editingTable,
      columns: editingTable.columns.map(c => c.id === id ? { ...c, ...updates } : c)
    });
  };

  const deleteColumn = (id: string) => {
    setEditingTable({
      ...editingTable,
      columns: editingTable.columns.filter(c => c.id !== id)
    });
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 lg:p-10 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-5xl h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b bg-slate-50 flex justify-between items-center group">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-emerald-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-200">
              <Database size={32} />
            </div>
            <div>
              <input 
                value={editingTable.name}
                onChange={e => setEditingTable({...editingTable, name: e.target.value})}
                className="text-2xl font-black text-slate-800 bg-transparent outline-none focus:border-b-2 border-emerald-500 w-[300px]"
                placeholder="가상 테이블 이름"
              />
              <p className="text-xs font-bold text-slate-400 mt-1 flex items-center gap-1.5">
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-md">Virtual Table</span>
                ID: {editingTable.id}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onSave(editingTable)}
              className="px-8 py-3.5 bg-emerald-600 text-white rounded-2xl font-black shadow-xl shadow-emerald-100 hover:bg-emerald-700 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <Save size={20} /> 변경사항 저장
            </button>
            <button onClick={onClose} className="w-12 h-12 flex items-center justify-center bg-white border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-2xl transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex bg-white px-8 border-b">
          <button 
            onClick={() => setActiveTab('settings')}
            className={`px-6 py-4 text-sm font-black transition-all border-b-4 ${activeTab === 'settings' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            기본 설정
          </button>
          <button 
            onClick={() => setActiveTab('columns')}
            className={`px-6 py-4 text-sm font-black transition-all border-b-4 ${activeTab === 'columns' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
          >
            가상 컬럼 설계 ({editingTable.columns.length})
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/50 p-8">
          {activeTab === 'settings' ? (
            <div className="max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-2 duration-300">
              <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
                  <Info className="text-emerald-500" />
                  <h5 className="font-black text-slate-800">원본 데이터 테이블 연결</h5>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">베이스 테이블 선택</label>
                  <select 
                    value={editingTable.baseTableName}
                    onChange={e => setEditingTable({...editingTable, baseTableName: e.target.value})}
                    className="w-full p-4 rounded-2xl bg-slate-50 border-2 border-slate-100 font-black text-slate-800 focus:border-emerald-500 outline-none transition-all"
                  >
                    <option value="">-- 원본 테이블 선택 --</option>
                    {tableNames.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <p className="text-[10px] font-bold text-slate-400 px-1 mt-2">
                    * 이 테이블의 모든 데이터를 기반으로 가상 컬럼들이 추가됩니다.
                  </p>
                </div>
              </div>

              <div className="bg-amber-50 border-2 border-dashed border-amber-200 p-6 rounded-3xl">
                <div className="flex gap-4">
                  <AlertTriangle className="text-amber-500 shrink-0" size={24} />
                  <div>
                    <h6 className="font-black text-amber-800 text-sm">주의사항</h6>
                    <p className="text-xs font-bold text-amber-700/70 mt-1 leading-relaxed">
                      가상 테이블은 '조회'를 목적으로 설계되었습니다. 데이터를 저장하거나 수정하는 액션에서 사용할 경우, 가상 컬럼들은 DB에 저장되지 않으며 원본 테이블의 필드만 처리됩니다.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex justify-between items-center mb-4">
                <h5 className="font-black text-slate-800 flex items-center gap-2">
                  <Variable size={20} className="text-emerald-500" /> 가상 데이터 구조 정의
                </h5>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleAddColumn('join')}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl font-black text-xs hover:bg-indigo-100 transition-all border border-indigo-100"
                  >
                    <Link size={14} /> 조인(Join) 추가
                  </button>
                  <button 
                    onClick={() => handleAddColumn('formula')}
                    className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-xl font-black text-xs hover:bg-rose-100 transition-all border border-rose-100"
                  >
                    <Variable size={14} /> 수식(Formula) 추가
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {editingTable.columns.map((col, idx) => (
                  <div key={col.id} className="bg-white border-2 border-slate-100 rounded-3xl p-6 shadow-sm hover:border-emerald-200 transition-all relative group">
                    <div className="flex items-center gap-4 mb-6">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${col.type === 'join' ? 'bg-indigo-100 text-indigo-600' : 'bg-rose-100 text-rose-600'}`}>
                        {col.type === 'join' ? <Link size={18} /> : <Variable size={18} />}
                      </div>
                      <input 
                        value={col.name}
                        onChange={e => updateColumn(col.id, { name: e.target.value })}
                        className="flex-1 text-lg font-black text-slate-800 outline-none focus:border-b-2 border-emerald-400"
                        placeholder="컬럼 이름 입력"
                      />
                      <button 
                        onClick={() => deleteColumn(col.id)}
                        className="p-2 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash size={18} />
                      </button>
                    </div>

                    {col.type === 'join' ? (
                      <div className="grid grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl relative overflow-hidden">
                        <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] pointer-events-none">
                          <Link size={120} />
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block px-1">가져올 대상 테이블</label>
                            <select 
                              value={col.joinConfig?.targetTable}
                              onChange={e => updateColumn(col.id, { joinConfig: { ...col.joinConfig!, targetTable: e.target.value } })}
                              className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm outline-none focus:border-indigo-400"
                            >
                              <option value="">-- 테이블 선택 --</option>
                              {tableNames.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block px-1">가져올 컬럼 (값)</label>
                            <select 
                              value={col.joinConfig?.sourceColumn}
                              disabled={!col.joinConfig?.targetTable}
                              onChange={e => updateColumn(col.id, { joinConfig: { ...col.joinConfig!, sourceColumn: e.target.value } })}
                              className="w-full p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm outline-none focus:border-indigo-400 disabled:opacity-50"
                            >
                              <option value="">-- 컬럼 선택 --</option>
                              {col.joinConfig?.targetTable && schemaData[col.joinConfig.targetTable]?.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2 block px-1 flex items-center gap-2">매칭 기준 (현재 테이블 <ChevronRight size={10} /> 대상 테이블)</label>
                            <div className="flex items-center gap-2">
                              <select 
                                value={col.joinConfig?.localKey}
                                onChange={e => updateColumn(col.id, { joinConfig: { ...col.joinConfig!, localKey: e.target.value } })}
                                className="flex-1 p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm outline-none focus:border-indigo-400"
                              >
                                <option value="">기준 컬럼</option>
                                {availableColumns.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                              <span className="text-slate-300">=</span>
                              <select 
                                value={col.joinConfig?.foreignKey}
                                disabled={!col.joinConfig?.targetTable}
                                onChange={e => updateColumn(col.id, { joinConfig: { ...col.joinConfig!, foreignKey: e.target.value } })}
                                className="flex-1 p-3 rounded-xl bg-white border border-slate-200 font-bold text-sm outline-none focus:border-indigo-400 disabled:opacity-50"
                              >
                                <option value="">대상 PK</option>
                                {col.joinConfig?.targetTable && schemaData[col.joinConfig.targetTable]?.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-900 p-6 rounded-2xl relative">
                        <div className="absolute right-4 top-4">
                           <span className="text-[9px] font-black text-rose-500 uppercase px-2 py-1 bg-rose-500/10 rounded-md border border-rose-500/20">JavaScript Formula</span>
                        </div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 block">계산식 정의 (예: context['가격'] * 1.1)</label>
                        <textarea 
                          value={col.formulaConfig?.expression}
                          onChange={e => updateColumn(col.id, { formulaConfig: { expression: e.target.value } })}
                          className="w-full bg-transparent border-none outline-none font-mono text-emerald-400 text-sm h-24 p-0 resize-none"
                          placeholder="// 여기에 JS 수식을 입력하세요\n// 예: {{필드명1}} + {{필드명2}}"
                        />
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-[9px] font-bold text-slate-400 italic">* {"{{컬럼명}}"} 형식으로 다른 컬럼 값을 참조할 수 있습니다.</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {editingTable.columns.length === 0 && (
                  <div className="py-20 border-4 border-dashed border-slate-100 rounded-[3rem] flex flex-col items-center justify-center text-slate-300 gap-4 bg-slate-50/50">
                    <Variable size={48} className="opacity-20" />
                    <p className="font-black text-slate-400 text-lg">상단의 버튼을 눌러 첫 번째 가상 컬럼을 추가하세요</p>
                    <p className="text-sm font-bold text-slate-300">다른 테이블에서 데이터를 가져오거나(Join), 계산된 값(Formula)을 만들 수 있습니다.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex justify-center items-center text-[11px] font-bold text-slate-400 bg-pattern">
          <span>&copy; {new Date().getFullYear()} No-Code Virtual Database Engine &bull; Version 5.0 Stable</span>
        </div>
      </div>
    </div>
  );
}
