"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Database, Save, RefreshCw, Table as TableIcon, AlertCircle } from 'lucide-react';

export default function IntegratedDatabaseManager() {
  // 1. 상태 관리
  const [columns, setColumns] = useState<string[]>(['이름', '국어', '수학', '총점']);
  const [rows, setRows] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSaved, setLastSaved] = useState<string>('');

  // 2. 초기 데이터 불러오기 (DB에서 읽어옴)
  const fetchDbData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/spreadsheet');
      const data = await res.json();
      if (data && data.columns && data.rows) {
        setColumns(JSON.parse(data.columns));
        setRows(JSON.parse(data.rows));
        setLastSaved(new Date(data.updatedAt).toLocaleString());
      }
    } catch (e) {
      console.error("데이터 로딩 실패:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchDbData(); }, []);

  // 3. DB에 저장하기 (파일로 박제)
  const saveToDb = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: "생활관지도일지",
          columns: columns,
          rows: rows,
        }),
      });
      if (res.ok) {
        const result = await res.json();
        setLastSaved(new Date(result.updatedAt).toLocaleString());
        alert("✅ dev.db 파일에 성공적으로 저장되었습니다!");
      }
    } catch (e) {
      alert("❌ 저장 실패: API 경로를 확인해주세요.");
    } finally {
      setIsLoading(false);
    }
  };

  // 4. 셀 수정 로직
  const updateCell = (index: number, col: string, value: string) => {
    const newRows = [...rows];
    newRows[index] = { ...newRows[index], [col]: value };
    setRows(newRows);
  };

  return (
    <div className="flex flex-col h-screen bg-slate-50 font-sans">
      {/* 상단 헤더: DB 상태 표시 */}
      <header className="flex justify-between items-center p-4 bg-white border-b border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-600 text-white rounded-lg">
            <Database size={20} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-800">생활관 내장 DB 관리자</h1>
            <p className="text-xs text-slate-500">
              {lastSaved ? `마지막 저장: ${lastSaved}` : '저장된 데이터가 없습니다.'}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <button onClick={fetchDbData} className="px-4 py-2 text-sm bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2">
            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} /> 새로고침
          </button>
          <button onClick={saveToDb} className="px-4 py-2 text-sm bg-indigo-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-md">
            <Save size={16} /> DB 파일에 저장
          </button>
        </div>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        {/* --- DB 내부 구조 시각화 (선생님이 원하신 기능) --- */}
        <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <h2 className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-2">
            <TableIcon size={16} /> 현재 DB 테이블 구조 (Prisma Schema)
          </h2>
          <div className="grid grid-cols-4 gap-4 text-xs font-mono bg-white p-3 rounded-lg border border-amber-100">
            <div className="flex flex-col border-r pr-2">
              <span className="text-slate-400">ID (PK)</span>
              <span className="font-bold">Int (자동증가)</span>
            </div>
            <div className="flex flex-col border-r pr-2">
              <span className="text-slate-400">TITLE</span>
              <span className="font-bold">String</span>
            </div>
            <div className="flex flex-col border-r pr-2">
              <span className="text-slate-400">COLUMNS</span>
              <span className="font-bold text-blue-600">JSON String</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-400">ROWS</span>
              <span className="font-bold text-blue-600">JSON String</span>
            </div>
          </div>
        </div>

        {/* --- 실시간 데이터 에디터 --- */}
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 w-12 border-r border-slate-200 text-center">#</th>
                {columns.map(col => (
                  <th key={col} className="px-4 py-3 font-bold border-r border-slate-200">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="py-20 text-center text-slate-400">
                    <AlertCircle size={40} className="mx-auto mb-2 opacity-20" />
                    엑셀 데이터를 붙여넣거나 행을 추가해주세요.
                  </td>
                </tr>
              ) : (
                rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-indigo-50/30">
                    <td className="px-4 py-2 bg-slate-50 border-r border-slate-200 text-center text-slate-400">{idx + 1}</td>
                    {columns.map(col => (
                      <td key={col} className="p-0 border-r border-slate-200">
                        <input 
                          type="text" 
                          value={row[col] || ''} 
                          onChange={(e) => updateCell(idx, col, e.target.value)}
                          className="w-full h-full px-4 py-2 outline-none focus:bg-white focus:ring-2 focus:ring-inset focus:ring-indigo-500"
                        />
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          <div className="p-3 bg-slate-50 border-t border-slate-200">
            <button 
              onClick={() => setRows([...rows, columns.reduce((a, c) => ({...a, [c]: ''}), {})])}
              className="w-full py-2 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-600 hover:bg-slate-100 transition"
            >
              + 빈 데이터 행 추가
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}