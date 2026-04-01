"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Database, Save, Plus, Trash2, Table as TableIcon, Layers } from 'lucide-react';

export default function DatabaseStudio() {
  const [tables, setTables] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [columns, setColumns] = useState<string[]>(['학번', '이름', '비고']);
  const [rows, setRows] = useState<any[]>([]);

  const refresh = useCallback(async () => {
    const res = await fetch('/api/spreadsheet');
    const data = await res.json();
    setTables(data);
    if (data.length > 0 && activeId === null) setActiveId(data[0].id);
  }, [activeId]);

  useEffect(() => { refresh(); }, [refresh]);

  useEffect(() => {
    if (activeId) {
      fetch(`/api/spreadsheet?id=${activeId}`)
        .then(res => res.json())
        .then(data => {
          if (data) {
            setColumns(JSON.parse(data.columns));
            setRows(JSON.parse(data.rows));
          }
        });
    }
  }, [activeId]);

  const handleAddTable = async () => {
    const title = prompt("새 테이블 이름을 입력하세요:");
    if (!title) return;
    const res = await fetch('/api/spreadsheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, columns: ['학번', '이름', '비고'], rows: [] })
    });
    if (res.ok) {
      alert("✅ 테이블 생성 성공!");
      refresh();
    }
  };

  const handleSave = async () => {
    if (!activeId) return;
    const current = tables.find(t => t.id === activeId);
    await fetch('/api/spreadsheet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: activeId, title: current.title, columns, rows }),
    });
    alert("✅ DB 최종 저장 완료!");
  };

  return (
    <div className="h-screen bg-slate-50 flex flex-col" onPaste={(e) => {
      const d = e.clipboardData.getData('text').split('\n').filter(l => l.trim());
      const nr = d.map((l, i) => ({ id: Date.now() + i, ...Object.fromEntries(columns.map((c, j) => [c, l.split('\t')[j] || ''])) }));
      setRows([...rows, ...nr]);
    }}>
      <header className="p-6 bg-[#0F172A] text-white flex justify-between items-center shadow-xl">
        <div className="flex items-center gap-4"><Database className="text-blue-500" size={30} /><h1 className="text-2xl font-black italic">STUDIO MANAGER</h1></div>
        <button onClick={handleSave} className="bg-blue-600 px-10 py-3.5 rounded-2xl font-black hover:bg-blue-500 shadow-xl transition-all active:scale-95 flex items-center gap-2"><Save size={20} /> DB 최종 박제</button>
      </header>

      <nav className="px-8 py-4 bg-white border-b flex items-center gap-4 shadow-sm overflow-x-auto no-scrollbar">
        <div className="px-3 py-2 bg-slate-100 rounded text-[10px] font-black text-slate-500 uppercase tracking-widest mr-2"><Layers size={14} className="inline mr-1" /> Tables</div>
        {tables.map(t => (
          <button key={t.id} onClick={() => setActiveId(t.id)} className={`px-6 py-2.5 rounded-full text-sm font-bold transition-all whitespace-nowrap ${activeId === t.id ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:bg-slate-100'}`}>
            <TableIcon size={14} className="inline mr-2" /> {t.title}
          </button>
        ))}
        <button onClick={handleAddTable} className="p-3 bg-emerald-50 text-emerald-600 rounded-full hover:bg-emerald-100 transition-all active:scale-90 shadow-sm border border-emerald-100"><Plus size={24} strokeWidth={3} /></button>
      </nav>

      <main className="flex-1 p-8 overflow-hidden flex flex-col">
        <div className="flex-1 bg-white border rounded-[3rem] shadow-2xl overflow-auto border-slate-200">
          <table className="w-full text-sm border-collapse font-bold">
            <thead className="sticky top-0 bg-slate-50 border-b-2 z-10 font-black text-slate-800 uppercase">
              <tr>
                <th className="w-20 py-6 border-r text-slate-300">No</th>
                {columns.map(c => <th key={c} className="min-w-[200px] px-8 py-6 text-left border-r text-[13px] tracking-wider">{c}</th>)}
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody className="divide-y text-slate-700">
              {rows.length === 0 ? (
                <tr><td colSpan={columns.length + 2} className="py-60 text-center text-slate-200 font-black italic text-4xl opacity-10 tracking-tighter uppercase">Ctrl+V To Paste Data</td></tr>
              ) : (
                rows.map((r, i) => (
                  <tr key={r.id || i} className="group hover:bg-blue-50/50 transition-all border-b">
                    <td className="text-center text-slate-300 border-r font-mono text-xs bg-slate-50/10 font-normal">{i + 1}</td>
                    {columns.map(c => (
                      <td key={c} className="p-0 border-r focus-within:ring-4 focus-within:ring-blue-100 transition-all">
                        <input type="text" value={r[c] || ''} onChange={e => { const nr = [...rows]; nr[i][c] = e.target.value; setRows(nr); }} className="w-full h-full px-8 py-5 outline-none font-bold text-[16px] bg-transparent" />
                      </td>
                    ))}
                    <td className="text-center pr-4">
                      <button onClick={() => setRows(rows.filter((_, j) => i !== j))} className="p-2 text-slate-200 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all font-normal"><Trash2 size={22} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}