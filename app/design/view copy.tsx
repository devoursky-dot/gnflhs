// view.tsx
import React from 'react';
import { View, SchemaData, LayoutRow, Action } from './types';
import { Database, LayoutTemplate, Plus, Trash2, Columns, Settings } from 'lucide-react';

interface ViewEditorProps {
  view: View;
  schemaData: SchemaData;
  actions: Action[];
  onUpdate: (updated: View) => void;
}

export default function ViewEditor({ view, schemaData, actions, onUpdate }: ViewEditorProps) {
  const availableColumns = view.tableName ? schemaData[view.tableName] || [] : [];

  // 로우(행) 추가
  const addRow = () => {
    const newRow: LayoutRow = { id: `row_${Date.now()}`, cells: [{ id: `cell_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] };
    onUpdate({ ...view, layoutRows: [...view.layoutRows, newRow] });
  };

  // 특정 로우 삭제
  const removeRow = (rowId: string) => {
    onUpdate({ ...view, layoutRows: view.layoutRows.filter(r => r.id !== rowId) });
  };

  // 특정 로우에 셀(열) 추가 (구간 나누기)
  const addCellToRow = (rowId: string) => {
    const updatedRows = view.layoutRows.map(row => {
      if (row.id === rowId) {
        return { ...row, cells: [...row.cells, { id: `cell_${Date.now()}`, flex: 1, contentType: 'empty' as const, contentValue: null }] };
      }
      return row;
    });
    onUpdate({ ...view, layoutRows: updatedRows });
  };

  // 셀 내용 변경
  const updateCellContent = (rowId: string, cellId: string, type: 'empty' | 'field' | 'action', value: string) => {
    const updatedRows = view.layoutRows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          cells: row.cells.map(cell => cell.id === cellId ? { ...cell, contentType: type, contentValue: value } : cell)
        };
      }
      return row;
    });
    onUpdate({ ...view, layoutRows: updatedRows });
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 lg:p-12 bg-[#F8FAFC]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* --- 데이터베이스 연결 --- */}
        <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl"><Database size={24} /></div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">데이터소스 연결</h2>
              <p className="text-xs text-slate-500 mt-1">이 뷰에서 렌더링할 Supabase 테이블을 선택하세요.</p>
            </div>
          </div>
          <select
            value={view.tableName || ''}
            onChange={(e) => onUpdate({ ...view, tableName: e.target.value, layoutRows: [] })} // 테이블 변경 시 레이아웃 초기화
            className="w-full p-3 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none focus:border-indigo-500"
          >
            <option value="">테이블 선택 안 됨</option>
            {Object.keys(schemaData).map(table => (
              <option key={table} value={table}>{table}</option>
            ))}
          </select>
        </section>

        {/* --- 카드 레이아웃 빌더 --- */}
        <section className={`transition-opacity duration-300 ${!view.tableName ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <LayoutTemplate className="text-indigo-600"/> 카드 구간 편집기
            </h2>
            <div className="flex items-center gap-2 bg-white px-4 py-2 border border-slate-200 rounded-xl shadow-sm">
              <span className="text-sm font-bold text-slate-600">카드 높이(px):</span>
              <input 
                type="number" 
                value={view.cardHeight} 
                onChange={(e) => onUpdate({ ...view, cardHeight: Number(e.target.value) })}
                className="w-20 outline-none text-indigo-600 font-black text-center"
              />
            </div>
          </div>

          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 space-y-4">
            {view.layoutRows.map((row, rowIndex) => (
              <div key={row.id} className="relative group border-2 border-dashed border-slate-200 rounded-xl p-3 flex gap-3 bg-slate-50">
                {/* 로우 삭제 버튼 (Hover 시 보임) */}
                <button onClick={() => removeRow(row.id)} className="absolute -left-3 -top-3 p-1.5 bg-rose-100 text-rose-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <Trash2 size={14} />
                </button>

                {row.cells.map(cell => (
                  <div key={cell.id} className="flex-1 bg-white border border-slate-200 rounded-lg p-3 shadow-sm relative">
                    <select
                      value={cell.contentValue || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('action_')) updateCellContent(row.id, cell.id, 'action', val.replace('action_', ''));
                        else updateCellContent(row.id, cell.id, 'field', val);
                      }}
                      className="w-full text-sm font-bold text-slate-700 bg-slate-50 border border-slate-100 rounded-lg p-2 outline-none focus:border-indigo-500"
                    >
                      <option value="">-- 표시할 내용 선택 --</option>
                      <optgroup label="데이터 칼럼">
                        {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                      </optgroup>
                      <optgroup label="액션 버튼">
                        {actions.map(act => <option key={`action_${act.id}`} value={`action_${act.id}`}>⚡ {act.name}</option>)}
                      </optgroup>
                    </select>
                  </div>
                ))}
                
                {/* 열(칸) 분할 버튼 */}
                <button onClick={() => addCellToRow(row.id)} className="w-10 flex items-center justify-center bg-indigo-50 text-indigo-500 border border-indigo-200 rounded-lg hover:bg-indigo-100 hover:text-indigo-600 transition-colors tooltip" title="이 줄에 칸 추가">
                  <Columns size={18} />
                </button>
              </div>
            ))}

            <button onClick={addRow} className="w-full py-4 border-2 border-dashed border-indigo-200 text-indigo-500 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50 transition-colors">
              <Plus size={20} /> 새로운 가로 줄(Row) 추가
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}