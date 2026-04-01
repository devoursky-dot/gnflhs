"use client";

import React, { useState, useCallback, useMemo } from 'react';
import { Database, Save, TableProperties } from 'lucide-react';

// 그리드 기본 설정 (A~F열, 1~12행)
const COLUMNS = ['A', 'B', 'C', 'D', 'E', 'F'];
const ROWS = Array.from({ length: 12 }, (_, i) => i + 1);

type CellData = { [key: string]: string }; // 예: { 'A1': '김철수', 'B1': '=10+20' }
type Selection = { start: string | null; end: string | null; isDragging: boolean };

export default function WebSpreadsheetDB() {
  const [cells, setCells] = useState<CellData>({
    'A1': '이름', 'B1': '국어', 'C1': '수학', 'D1': '총점',
    'A2': '김철수', 'B2': '85', 'C2': '90', 'D2': '=B2+C2',
    'A3': '이영희', 'B3': '92', 'C3': '88', 'D3': '=B3+C3',
  });
  
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>({ start: null, end: null, isDragging: false });

  // 💡 핵심 1: 수식 계산 엔진 (예: "=B2+C2" -> 175 변환)
  const evaluatedCells = useMemo(() => {
    const result: CellData = {};
    const evaluate = (raw: string): string => {
      if (!raw?.startsWith('=')) return raw; // 수식이 아니면 원본 반환
      
      let formula = raw.substring(1).toUpperCase();
      // 수식 안의 셀 주소(예: B2)를 찾아 실제 값으로 치환
      formula = formula.replace(/[A-Z]\d+/g, (match) => {
        const refValue = cells[match] || '0';
        return isNaN(Number(refValue)) ? '0' : refValue; // 숫자가 아니면 0 처리
      });

      try {
        // 안전한 계산 (실무에서는 eval 대신 mathjs 라이브러리 사용 권장)
        return new Function('return ' + formula)().toString();
      } catch {
        return '#ERROR!';
      }
    };

    Object.keys(cells).forEach(key => {
      result[key] = evaluate(cells[key]);
    });
    return result;
  }, [cells]);

  // --- 셀 값 수정 핸들러 ---
  const handleCellChange = (id: string, value: string) => {
    setCells(prev => ({ ...prev, [id]: value }));
  };

  // 💡 핵심 2: 마우스 드래그 다중 선택 로직
  const getColIndex = (id: string) => COLUMNS.indexOf(id.charAt(0));
  const getRowIndex = (id: string) => parseInt(id.slice(1)) - 1;

  const isSelected = (id: string) => {
    if (!selection.start || !selection.end) return false;
    
    const startCol = getColIndex(selection.start);
    const endCol = getColIndex(selection.end);
    const startRow = getRowIndex(selection.start);
    const endRow = getRowIndex(selection.end);

    const colIdx = getColIndex(id);
    const rowIdx = getRowIndex(id);

    return (
      colIdx >= Math.min(startCol, endCol) && colIdx <= Math.max(startCol, endCol) &&
      rowIdx >= Math.min(startRow, endRow) && rowIdx <= Math.max(startRow, endRow)
    );
  };

  const handleMouseDown = (id: string) => {
    setEditingCell(null);
    setSelection({ start: id, end: id, isDragging: true });
  };

  const handleMouseEnter = (id: string) => {
    if (selection.isDragging) {
      setSelection(prev => ({ ...prev, end: id }));
    }
  };

  const handleMouseUp = () => {
    setSelection(prev => ({ ...prev, isDragging: false }));
  };

  // --- DB 저장 시뮬레이션 ---
  const handleSave = () => {
    console.log("DB 저장용 JSON 데이터:", cells);
    alert("내장 DB(SQLite)에 현재 시트 상태가 저장되었습니다!");
  };

  return (
    <div className="flex flex-col h-screen bg-slate-100 font-sans" onMouseUp={handleMouseUp}>
      {/* 상단 툴바 */}
      <header className="flex justify-between items-center p-4 bg-white border-b border-slate-200 shadow-sm z-10">
        <div className="flex items-center gap-2">
          <TableProperties size={20} className="text-emerald-600" />
          <h1 className="font-bold text-slate-800">생활관 DB (Spreadsheet Mode)</h1>
        </div>
        <button onClick={handleSave} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 hover:bg-emerald-700 transition shadow-sm">
          <Database size={16} /> Prisma DB 동기화
        </button>
      </header>

      {/* 수식 입력줄 (Formula Bar) */}
      <div className="flex items-center gap-3 p-2 bg-white border-b border-slate-200">
        <div className="font-mono text-sm font-bold text-slate-400 w-10 text-center border-r">
          fx
        </div>
        <input 
          type="text" 
          disabled
          value={selection.start && selection.start === selection.end ? (cells[selection.start] || '') : '다중 선택됨'}
          className="flex-1 text-sm outline-none text-slate-700 bg-transparent"
          placeholder="셀을 선택하면 수식이나 원본 값이 표시됩니다."
        />
      </div>

      {/* 스프레드시트 그리드 */}
      <main className="flex-1 overflow-auto p-4 flex justify-center">
        <div className="bg-white shadow-xl border border-slate-300 select-none max-w-max">
          <table className="border-collapse w-full table-fixed">
            {/* 열 헤더 (A, B, C...) */}
            <thead>
              <tr>
                <th className="w-10 bg-slate-100 border border-slate-300 p-1"></th>
                {COLUMNS.map(col => (
                  <th key={col} className="w-28 bg-slate-100 border border-slate-300 text-slate-600 font-normal text-xs py-1">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            {/* 행 및 셀 (1, 2, 3...) */}
            <tbody>
              {ROWS.map(row => (
                <tr key={row}>
                  {/* 행 번호 */}
                  <td className="bg-slate-100 border border-slate-300 text-center text-slate-500 text-xs py-1">
                    {row}
                  </td>
                  
                  {/* 실제 데이터 셀 */}
                  {COLUMNS.map(col => {
                    const cellId = `${col}${row}`;
                    const isCellSelected = isSelected(cellId);
                    const isEditing = editingCell === cellId;

                    return (
                      <td 
                        key={cellId}
                        className={`border border-slate-200 relative overflow-hidden transition-colors ${isCellSelected ? 'bg-blue-100/50' : 'bg-white'}`}
                        onMouseDown={() => handleMouseDown(cellId)}
                        onMouseEnter={() => handleMouseEnter(cellId)}
                        onDoubleClick={() => setEditingCell(cellId)}
                      >
                        {isCellSelected && <div className="absolute inset-0 border-2 border-blue-500 pointer-events-none z-10" />}
                        
                        {isEditing ? (
                          <input
                            autoFocus
                            type="text"
                            value={cells[cellId] || ''}
                            onChange={(e) => handleCellChange(cellId, e.target.value)}
                            onBlur={() => setEditingCell(null)}
                            onKeyDown={(e) => e.key === 'Enter' && setEditingCell(null)}
                            className="w-full h-full absolute inset-0 px-2 py-1 text-sm outline-none ring-2 ring-blue-500 z-20"
                          />
                        ) : (
                          <div className="px-2 py-1 text-sm text-slate-700 min-h-[28px] truncate cursor-cell">
                            {/* 보여줄 때는 계산된 결과값(evaluatedCells)을 보여줌 */}
                            {evaluatedCells[cellId] || ''}
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}