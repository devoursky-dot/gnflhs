"use client";

import React, { useState, useCallback } from 'react';
import { 
  Plus, Trash2, FileSpreadsheet, Download, 
  Save, LayoutGrid, AlertCircle
} from 'lucide-react';

export default function DatabaseManager() {
  // 1. 상태 관리: 동적 컬럼과 데이터 행(Rows)
  const [columns, setColumns] = useState<string[]>(['학번', '이름', '상태', '벌점', '비고']);
  const [rows, setRows] = useState<any[]>([
    { id: 1, 학번: '10101', 이름: '김철수', 상태: '기숙사', 벌점: '0', 비고: '' },
    { id: 2, 학번: '10102', 이름: '이영희', 상태: '외박', 벌점: '2', 비고: '무단 지각' },
  ]);

  // 2. 엑셀 복사/붙여넣기 파싱 로직 (가장 강력한 기능)
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    const pastedText = e.clipboardData.getData('text');
    if (!pastedText) return;

    // 엑셀 데이터는 탭(\t)과 엔터(\n)로 구분됩니다.
    const rawRows = pastedText.split('\n').filter(row => row.trim() !== '');
    if (rawRows.length < 2) {
      alert("헤더(제목 줄)를 포함하여 최소 2줄 이상의 엑셀 데이터를 붙여넣어 주세요.");
      return;
    }

    const parsedData = rawRows.map(row => row.split('\t'));
    const newColumns = parsedData[0].map(col => col.trim()); // 첫 줄을 컬럼으로
    
    const newRows = parsedData.slice(1).map((rowArray, index) => {
      let rowObj: any = { id: Date.now() + index }; // 고유 ID
      newColumns.forEach((colName, colIndex) => {
        rowObj[colName] = rowArray[colIndex] ? rowArray[colIndex].trim() : "";
      });
      return rowObj;
    });

    if (confirm(`엑셀에서 ${newRows.length}개의 데이터를 인식했습니다. 기존 데이터를 덮어쓰시겠습니까?`)) {
      setColumns(newColumns);
      setRows(newRows);
    }
  }, []);

  // 3. 데이터 셀(Cell) 수정 함수
  const updateCell = (id: number, column: string, value: string) => {
    setRows(prevRows => prevRows.map(row => 
      row.id === id ? { ...row, [column]: value } : row
    ));
  };

  // 4. 컬럼(Column) 및 행(Row) 조작 함수
  const addColumn = () => {
    const newColName = prompt("새로 추가할 항목(컬럼)의 이름을 입력하세요:");
    if (newColName && !columns.includes(newColName)) {
      setColumns([...columns, newColName]);
      setRows(rows.map(row => ({ ...row, [newColName]: '' })));
    }
  };

  const removeColumn = (colToRemove: string) => {
    if (confirm(`'${colToRemove}' 항목을 정말 삭제하시겠습니까? (복구 불가)`)) {
      setColumns(columns.filter(col => col !== colToRemove));
      setRows(rows.map(row => {
        const newRow = { ...row };
        delete newRow[colToRemove];
        return newRow;
      }));
    }
  };

  const addRow = () => {
    const newRow: any = { id: Date.now() };
    columns.forEach(col => newRow[col] = '');
    setRows([...rows, newRow]);
  };

  const removeRow = (id: number) => {
    setRows(rows.filter(row => row.id !== id));
  };

  // 5. [추후 연동용] 실제 DB 저장 함수 (예: Prisma/Supabase)
  const saveToDatabase = () => {
    alert("데이터가 내장 데이터베이스(SQLite/JSON)에 성공적으로 저장되었습니다!");
    console.log("저장될 데이터 형태:", { columns, rows });
    // 실제 서버 전송 로직이 들어갈 자리입니다.
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-800 font-sans">
      
      {/* --- 상단 툴바 --- */}
      <header className="flex justify-between items-center p-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 text-indigo-700 rounded-lg">
            <LayoutGrid size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold">생활관지도일지 - 내장 DB 관리자</h1>
            <p className="text-xs text-slate-500">엑셀 데이터를 <b>Ctrl+V</b>로 이 화면 어디든 붙여넣으세요.</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={addColumn} className="px-3 py-2 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-1 transition">
            <Plus size={16} /> 열(Column) 추가
          </button>
          <button onClick={saveToDatabase} className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg flex items-center gap-2 shadow-md transition">
            <Save size={16} /> DB에 저장
          </button>
        </div>
      </header>

      {/* --- 메인 스프레드시트 영역 --- */}
      <main 
        className="flex-1 overflow-auto p-6 outline-none" 
        onPaste={handlePaste}
        tabIndex={0} // paste 이벤트를 받기 위해 포커스 가능하게 설정
      >
        <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden">
          
          <table className="w-full text-sm text-left whitespace-nowrap">
            {/* 테이블 헤더 (컬럼 이름) */}
            <thead className="text-xs text-slate-700 bg-slate-100 uppercase sticky top-0 z-10">
              <tr>
                <th className="w-12 px-4 py-3 border-b border-r border-slate-300 text-center text-slate-400">#</th>
                {columns.map(col => (
                  <th key={col} className="px-4 py-3 border-b border-r border-slate-300 group relative">
                    <div className="flex items-center justify-between">
                      <span className="font-bold tracking-wider">{col}</span>
                      <button 
                        onClick={() => removeColumn(col)}
                        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition"
                        title="열 삭제"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </th>
                ))}
                <th className="px-4 py-3 border-b border-slate-300 w-16 text-center">작업</th>
              </tr>
            </thead>
            
            {/* 테이블 바디 (데이터 행) */}
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-6 py-12 text-center text-slate-400">
                    <FileSpreadsheet size={48} className="mx-auto mb-3 opacity-20" />
                    <p>데이터가 없습니다. 엑셀에서 표를 복사해서 붙여넣어 보세요.</p>
                  </td>
                </tr>
              ) : (
                rows.map((row, index) => (
                  <tr key={row.id} className="border-b border-slate-200 hover:bg-indigo-50/50 transition-colors">
                    {/* 줄 번호 */}
                    <td className="px-4 py-2 border-r border-slate-200 text-center text-slate-400 font-mono bg-slate-50">
                      {index + 1}
                    </td>
                    
                    {/* 개별 데이터 셀 (Input으로 구현하여 즉시 수정 가능) */}
                    {columns.map(col => (
                      <td key={`${row.id}-${col}`} className="border-r border-slate-200 p-0 relative">
                        <input
                          type="text"
                          value={row[col] || ''}
                          onChange={(e) => updateCell(row.id, col, e.target.value)}
                          className="w-full h-full min-h-[40px] px-4 py-2 bg-transparent outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-all"
                          placeholder="-"
                        />
                      </td>
                    ))}

                    {/* 행 삭제 버튼 */}
                    <td className="px-4 py-2 text-center bg-slate-50">
                      <button 
                        onClick={() => removeRow(row.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* 하단 행 추가 버튼 */}
          <div className="p-2 bg-slate-50 border-t border-slate-200">
            <button 
              onClick={addRow}
              className="w-full py-2 text-sm font-bold text-indigo-600 hover:bg-indigo-100 rounded-lg flex items-center justify-center gap-2 transition border border-dashed border-indigo-300"
            >
              <Plus size={16} /> 새 행(Row) 추가하기
            </button>
          </div>

        </div>
      </main>
    </div>
  );
}