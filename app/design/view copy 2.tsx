// view.tsx
import React from 'react';
import { View, SchemaData, LayoutRow, LayoutCell, Action } from './types';
import { Database, LayoutTemplate, Plus, Trash2, Columns, Rows, ChevronLeft, ChevronRight, Image as ImageIcon } from 'lucide-react';

interface ViewEditorProps {
  view: View;
  schemaData: SchemaData;
  actions: Action[];
  onUpdate: (updated: View) => void;
}

export default function ViewEditor({ view, schemaData, actions, onUpdate }: ViewEditorProps) {
  const availableColumns = view.tableName ? schemaData[view.tableName] || [] : [];

  const updateLayout = (updatedRows: LayoutRow[]) => {
    onUpdate({ ...view, layoutRows: updatedRows });
  };

  const addRootRow = () => {
    const newRow: LayoutRow = { 
      id: `row_${Date.now()}`, 
      type: 'row', 
      cells: [{ id: `cell_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] 
    };
    updateLayout([...view.layoutRows, newRow]);
  };

  // --- 재귀적 편집 컴포넌트 ---
  const RenderRow = ({ row, depth = 0 }: { row: LayoutRow, depth: number }) => {
    
    // 파일 추가/분할/크기조절 로직 (기존 기능 100% 유지)
    const mutate = (callback: (items: LayoutRow[]) => void) => {
      const newRows = JSON.parse(JSON.stringify(view.layoutRows));
      callback(newRows);
      updateLayout(newRows);
    };

    return (
      /* [업그레이드] 깊이(depth)에 따라 배경색을 다르게 하여 분할을 시각적으로 명확하게 표시 */
      <div className={`flex gap-2 p-2 rounded-xl border border-slate-300 shadow-sm ${depth % 2 === 0 ? 'bg-slate-50' : 'bg-white'} relative`}>
        {row.cells.map(cell => (
          <div key={cell.id} style={{ flex: cell.flex }} className="group/cell flex flex-col gap-1 border border-indigo-100 bg-white rounded-lg p-2 min-h-[50px] shadow-inner">
            <div className="flex justify-between items-center bg-indigo-50/50 px-1 rounded">
              <div className="flex items-center gap-1">
                <button onClick={() => mutate(items => {
                  const find = (arr: any[]) => arr.forEach(r => {
                    r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex = Math.max(1, c.flex - 1); if(c.nestedRows) find(c.nestedRows); });
                  });
                  find(items);
                })} className="hover:bg-indigo-200 rounded"><ChevronLeft size={12}/></button>
                <span className="text-[9px] font-black text-indigo-600">FLEX:{cell.flex}</span>
                <button onClick={() => mutate(items => {
                  const find = (arr: any[]) => arr.forEach(r => {
                    r.cells.forEach((c: any) => { if(c.id === cell.id) c.flex += 1; if(c.nestedRows) find(c.nestedRows); });
                  });
                  find(items);
                })} className="hover:bg-indigo-200 rounded"><ChevronRight size={12}/></button>
              </div>
              <div className="flex gap-1">
                {/* [업그레이드] 이미지 모드 토글 버튼 추가 */}
                <button 
                  onClick={() => mutate(items => {
                    const find = (arr: any[]) => arr.forEach(r => {
                      r.cells.forEach((c: any) => { if(c.id === cell.id) c.isImage = !c.isImage; if(c.nestedRows) find(c.nestedRows); });
                    });
                    find(items);
                  })}
                  className={`p-1 rounded ${cell.isImage ? 'text-rose-500 bg-rose-100' : 'text-slate-400'}`}
                  title="이미지로 표시"
                ><ImageIcon size={12}/></button>
                <button onClick={() => mutate(items => {
                  const find = (arr: any[]) => arr.forEach(r => {
                    r.cells.forEach((c: any) => {
                      if(c.id === cell.id) {
                        c.contentType = 'nested';
                        c.nestedRows = [{ id: `nr_${Date.now()}`, type: 'row', cells: [{ id: `nc_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null }] }];
                      } else if(c.nestedRows) find(c.nestedRows);
                    });
                  });
                  find(items);
                })} className="text-slate-400 hover:text-indigo-600"><Rows size={12}/></button>
              </div>
            </div>

            {cell.contentType === 'nested' ? (
              <div className="space-y-1 mt-1">
                {cell.nestedRows?.map(nr => <RenderRow key={nr.id} row={nr} depth={depth + 1} />)}
              </div>
            ) : (
              <select
                value={(cell.contentType === 'action' ? 'action_' : '') + (cell.contentValue || '')}
                onChange={(e) => {
                  const val = e.target.value;
                  mutate(items => {
                    const find = (arr: any[]) => arr.forEach(r => {
                      r.cells.forEach((c: any) => {
                        if(c.id === cell.id) {
                          if (val.startsWith('action_')) { c.contentType = 'action'; c.contentValue = val.replace('action_', ''); }
                          else { c.contentType = val ? 'field' : 'empty'; c.contentValue = val; }
                        } else if(c.nestedRows) find(c.nestedRows);
                      });
                    });
                    find(items);
                  });
                }}
                className="w-full text-[11px] font-bold text-slate-600 outline-none bg-transparent"
              >
                <option value="">데이터 선택</option>
                <optgroup label="컬럼">
                  {availableColumns.map(col => <option key={col} value={col}>{col}</option>)}
                </optgroup>
                <optgroup label="액션">
                  {actions.map(act => <option key={act.id} value={`action_${act.id}`}>⚡ {act.name}</option>)}
                </optgroup>
              </select>
            )}
          </div>
        ))}
        <button onClick={() => mutate(items => {
          const find = (arr: any[]) => arr.forEach(r => {
            if(r.id === row.id) r.cells.push({ id: `c_${Date.now()}`, flex: 1, contentType: 'empty', contentValue: null });
            r.cells.forEach((c: any) => { if(c.nestedRows) find(c.nestedRows); });
          });
          find(items);
        })} className="w-6 flex items-center justify-center bg-indigo-50 text-indigo-400 rounded hover:bg-indigo-100"><Columns size={12}/></button>
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto p-8 bg-[#F8FAFC]">
      <div className="max-w-4xl mx-auto space-y-6">
        <section className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4">
            <Database size={20} className="text-indigo-600" />
            <h2 className="font-black text-slate-800">데이터소스</h2>
          </div>
          <select
            value={view.tableName || ''}
            onChange={(e) => onUpdate({ ...view, tableName: e.target.value, layoutRows: [] })}
            className="w-full p-2.5 rounded-xl border border-slate-200 font-bold text-slate-700 outline-none"
          >
            <option value="">테이블 선택</option>
            {Object.keys(schemaData).map(table => <option key={table} value={table}>{table}</option>)}
          </select>
        </section>

        <section className={`${!view.tableName ? 'opacity-40 pointer-events-none' : ''}`}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-black text-slate-800 flex items-center gap-2"><LayoutTemplate size={20} className="text-indigo-600"/> 카드 분할 빌더</h2>
          </div>
          <div className="bg-white p-5 rounded-2xl shadow-md border border-slate-200 space-y-3">
            {view.layoutRows.map(row => <RenderRow key={row.id} row={row} depth={0} />)}
            <button onClick={addRootRow} className="w-full py-3 border-2 border-dashed border-indigo-100 text-indigo-400 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-50">
              <Plus size={18} /> 새 가로 줄 추가
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}