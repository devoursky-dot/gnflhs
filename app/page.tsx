"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { createClient } from "@supabase/supabase-js";
import { Database, Table, Columns, Key, Settings, Search, Loader2, Save, RefreshCw, ClipboardPaste, Trash2 } from "lucide-react";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  ColumnDef,
} from "@tanstack/react-table";
import Papa from "papaparse"; // 복사/붙여넣기 파싱용

// 1. Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// --- 타입 정의 ---
type ColumnInfo = {
  name: string;
  type: string;
  nullable: string;
  default: string;
  primary: boolean;
};

type SchemaData = {
  [tableName: string]: ColumnInfo[];
};

// --- [핵심 컴포넌트 1] 편집 가능한 셀 (스프레드시트 스타일) ---
const EditableCell = memo(({ getValue, row: { index }, column: { id }, table }: any) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);

  // 외부에서 데이터가 변경되었을 때(예: 붙여넣기) 로컬 상태 업데이트
  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  // 포커스 아웃 시에만 상위 데이터 업데이트 (성능 최적화)
  const onBlur = () => {
    table.options.meta?.updateData(index, id, value);
  };

  // 구글 시트 느낌의 스타일링 (노보더, 포커스 시 그린 보더)
  return (
    <input
      value={value as string || ""}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      className="w-full h-full px-3 py-2 bg-transparent outline-none focus:ring-2 focus:ring-emerald-500 rounded-sm font-mono text-xs text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
      placeholder="NULL"
    />
  );
});
EditableCell.displayName = "EditableCell";

// --- [핵심 컴포넌트 2] 메인 대시보드 ---
export default function AdminDashboardPage() {
  // 상태 관리
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [schemaData, setSchemaData] = useState<SchemaData>({});
  const [records, setRecords] = useState<any[]>([]); // 실제 테이블 데이터
  const [originalRecords, setOriginalRecords] = useState<any[]>([]); // 변경 감지용 원본 데이터
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 복사/붙여넣기 상태 (성능을 위해 ref 사용)
  const gridRef = useRef<HTMLDivElement>(null);

  // 1. 스키마 로딩 (최초 1회)
  useEffect(() => {
    async function fetchSchema() {
      if (!supabaseUrl || !supabaseKey) return;
      setIsLoadingSchema(true);
      const { data, error } = await supabase.rpc("get_schema_info");
      if (error) console.error("Error:", error);
      if (data) {
        const grouped = data.reduce((acc: SchemaData, row: any) => {
          if (!acc[row.table_name]) acc[row.table_name] = [];
          acc[row.table_name].push({
            name: row.column_name, type: row.data_type, nullable: row.is_nullable, default: row.column_default, primary: row.is_primary,
          });
          return acc;
        }, {});
        setSchemaData(grouped);
        const tables = Object.keys(grouped);
        if (tables.length > 0) setSelectedTable(tables[0]);
      }
      setIsLoadingSchema(false);
    }
    fetchSchema();
  }, []);

  // 2. 테이블 데이터 로딩 (테이블 선택 시)
  const fetchTableData = useCallback(async (tableName: string) => {
    setIsLoadingData(true);
    const { data, error } = await supabase.from(tableName).select("*").limit(500); // 안전을 위해 500개 제한
    if (error) {
      console.error("Data fetch error:", error);
      setRecords([]);
      setOriginalRecords([]);
    } else {
      setRecords(data || []);
      setOriginalRecords(JSON.parse(JSON.stringify(data || []))); // 깊은 복사
    }
    setIsLoadingData(false);
  }, []);

  useEffect(() => {
    if (selectedTable) {
      fetchTableData(selectedTable);
    }
  }, [selectedTable, fetchTableData]);

  // 3. 변경사항 계산 (Save 버튼 활성화용)
  const isDirty = useMemo(() => {
    return JSON.stringify(records) !== JSON.stringify(originalRecords);
  }, [records, originalRecords]);

  // 4. [핵심] 스프레드시트 컬럼 정의 (TanStack Table)
  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (!selectedTable || !schemaData[selectedTable]) return [];

    return schemaData[selectedTable].map((col) => ({
      accessorKey: col.name,
      // 헤더 디자인 (PK 아이콘 표시)
      header: () => (
        <div className="flex items-center gap-1.5 truncate">
          {col.primary ? <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : <Columns className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span className="font-mono text-zinc-700 dark:text-zinc-300">{col.name}</span>
          <span className="text-xxs text-zinc-400 font-normal">{col.type}</span>
        </div>
      ),
      cell: EditableCell, // 모든 셀을 편집 가능하게 설정
      size: col.type.includes('text') || col.type.includes('varchar') ? 250 : 120, // 타입별 기본 너비
    }));
  }, [selectedTable, schemaData]);

  // 5. [핵심] 데이터 업데이트 및 대량 붙여넣기 로직
  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange", // 컬럼 너비 조절 가능
    meta: {
      // 단일 셀 업데이트
      updateData: (rowIndex: number, columnId: string, value: any) => {
        setRecords(old => old.map((row, index) => index === rowIndex ? { ...old[rowIndex], [columnId]: value } : row));
      },
      // [스프레드시트 기능] 대량 붙여넣기 처리
      handlePaste: (pastedData: any[][], startRowIndex: number, startColIndex: number) => {
        setRecords(old => {
          const newData = [...old];
          const allColumns = table.getAllLeafColumns();

          pastedData.forEach((pastedRow, i) => {
            const rowIndex = startRowIndex + i;
            // 필요시 새 행 추가 (구글 시트처럼)
            if (rowIndex >= newData.length) newData.push({});

            pastedRow.forEach((pastedValue, j) => {
              const colIndex = startColIndex + j;
              if (colIndex < allColumns.length) {
                const columnId = allColumns[colIndex].id;
                // PK 컬럼은 붙여넣기에서 제외하는 것이 안전 (필요시 주석 해제)
                // if (schemaData[selectedTable!]?.find(c => c.name === columnId)?.primary) return; 
                newData[rowIndex] = { ...newData[rowIndex], [columnId]: pastedValue === "" ? null : pastedValue };
              }
            });
          });
          return newData;
        });
      },
    },
  });

  // 6. [핵심] 브라우저 붙여넣기 이벤트 핸들러
  useEffect(() => {
    const handlePasteEvent = (event: ClipboardEvent) => {
      // 포커스가 그리드 내부에 있을 때만 작동
      if (!gridRef.current?.contains(document.activeElement)) return;

      const paste = event.clipboardData?.getData("text/plain");
      if (!paste) return;

      // PapaParse를 이용해 TSV(구글 시트/엑셀 기본 형식) 파싱
      const result = Papa.parse(paste, { delimiter: "\t", header: false });
      const pastedData = result.data as any[][];

      if (pastedData.length === 0) return;

      // 현재 포커스된 셀의 위치 찾기 (매우 중요)
      const activeElement = document.activeElement as HTMLInputElement;
      if (activeElement.tagName !== 'INPUT') return;

      // DOM 인덱스를 사용하여 O(1) 속도로 위치 계산
      const td = activeElement.closest('td');
      const tr = activeElement.closest('tr');
      if (!td || !tr) return;

      const colIdx = (td as HTMLTableCellElement).cellIndex - 1; // # (행번호) 열 제외
      const rowIdx = (tr as HTMLTableRowElement).rowIndex - 1;   // 헤더 제외

      if (rowIdx >= 0 && colIdx !== -1) {
        event.preventDefault();
        (table.options.meta as any).handlePaste(pastedData, rowIdx, colIdx);
      }
    };

    document.addEventListener("paste", handlePasteEvent);
    return () => document.removeEventListener("paste", handlePasteEvent);
  }, [table, records]);

  // 7. [핵심] 변경사항 Supabase에 저장 (2단계에서 만든 RPC 사용)
  const handleSave = async () => {
    if (!selectedTable || isSaving) return;
    setIsSaving(true);

    // 간단한 구현을 위해 전체 데이터를 upsert rpc로 전송
    // PK(id) 기반으로 작동하므로 신규 행은 id가 없어야 insert, 있으면 update됨
    const { error } = await supabase.rpc("upsert_data", {
      table_name: selectedTable,
      json_data: records
    });

    if (error) {
      alert(`Save failed: ${error.message}`);
      console.error(error);
    } else {
      await fetchTableData(selectedTable); // 원본 데이터 갱신
      alert("Changes saved successfully!");
    }
    setIsSaving(false);
  };

  // 사이드바 테이블 검색 필터링
  const filteredTables = Object.keys(schemaData).filter(t => t.toLowerCase().includes(searchTerm.toLowerCase()));
  const currentColumns = selectedTable ? schemaData[selectedTable] : [];

  return (
    <div className="flex h-screen w-full bg-zinc-50 font-sans dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
      {/* --- Sidebar (기존 디자인 유지, 검색 기능 추가) --- */}
      <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col shrink-0">
        <div className="p-5 flex items-center gap-2 border-b border-zinc-200 dark:border-zinc-800">
          <Database className="w-5 h-5 text-emerald-500" />
          <span className="font-bold tracking-tight text-lg">DB Manager</span>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
            <input 
              placeholder="Search tables..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-900 border-none focus:ring-1 focus:ring-emerald-500 outline-none"
            />
          </div>
          
          {isLoadingSchema ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-emerald-500" /></div>
          ) : (
            <nav className="space-y-1">
              {filteredTables.map((table) => (
                <button key={table} onClick={() => setSelectedTable(table)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors truncate ${selectedTable === table ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-900"}`}
                >
                  <Table className="w-4 h-4 shrink-0" />{table}
                </button>
              ))}
              {filteredTables.length === 0 && <p className="text-sm text-zinc-500 text-center py-4">No tables found.</p>}
            </nav>
          )}
        </div>
      </aside>

      {/* --- Main Content --- */}
      <main className="flex-1 overflow-hidden flex flex-col bg-zinc-100 dark:bg-zinc-900/50">
        {selectedTable ? (
          <>
            {/* 상단 헤더 (기존 유지 + 버튼 추가) */}
            <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold text-zinc-950 dark:text-white">{selectedTable}</h2>
                <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-500">public</span>
              </div>
              <div className="flex gap-2.5">
                <button onClick={() => fetchTableData(selectedTable)} className="p-2.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors">
                  <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={handleSave} disabled={!isDirty || isSaving}
                  className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </header>

            {/* 데이터 그리드 영역 (스프레드시트) */}
            <div className="flex-1 p-6 overflow-hidden flex flex-col" ref={gridRef}>
              
              {/* [기존] 스키마 구조 표 (상단에 작게 유지) */}
              <details className="mb-6 bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm" open={false}>
                <summary className="px-5 py-3 cursor-pointer text-sm font-medium text-zinc-600 dark:text-zinc-400 select-none">Schema Structure ({currentColumns.length} columns)</summary>
                <div className="px-5 pb-5 pt-1 border-t border-zinc-200 dark:border-zinc-800">
                    <div className="flex flex-wrap gap-2 pt-2">
                        {currentColumns.map(col => (
                            <div key={col.name} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900 rounded-lg text-xs font-mono border border-zinc-200 dark:border-zinc-800">
                                {col.primary ? <Key className="w-3.5 h-3.5 text-amber-500" /> : <Columns className="w-3.5 h-3.5 text-zinc-400" />}
                                <span className="font-medium text-zinc-900 dark:text-zinc-100">{col.name}</span>
                                <span className="text-zinc-500">{col.type}</span>
                            </div>
                        ))}
                    </div>
                </div>
              </details>

              {/* [신규] 실제 데이터 그리드 (TanStack Table + 스프레드시트 스타일) */}
              <div className="flex-1 bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-hidden flex flex-col">
                {isLoadingData ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    Loading data...
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto relative input-grid-container">
                    <table className="w-full text-left text-xs table-fixed border-separate border-spacing-0" style={{ width: table.getTotalSize() }}>
                      {/* 고정 헤더 */}
                      <thead className="sticky top-0 z-20 bg-zinc-50 dark:bg-zinc-950/80 backdrop-blur-sm shadow-sm">
                        {table.getHeaderGroups().map(headerGroup => (
                          <tr key={headerGroup.id}>
                            {/* 행 번호 컬럼 */}
                            <th className="w-10 px-2 py-3 border-b border-r border-zinc-200 dark:border-zinc-800 text-center text-zinc-400 font-normal">#</th>
                            {headerGroup.headers.map(header => (
                              <th key={header.id} colSpan={header.colSpan} className="relative px-3 py-3 border-b border-r border-zinc-200 dark:border-zinc-800 truncate group" style={{ width: header.getSize() }}>
                                {flexRender(header.column.columnDef.header, header.getContext())}
                                {/* 컬럼 크기 조절 핸들 */}
                                <div onMouseDown={header.getResizeHandler()} onTouchStart={header.getResizeHandler()}
                                  className={`absolute right-0 top-0 h-full w-1 bg-zinc-300 dark:bg-zinc-700 cursor-col-resize opacity-0 group-hover:opacity-100 ${header.column.getIsResizing() ? "bg-emerald-500 opacity-100" : ""}`}
                                />
                              </th>
                            ))}
                          </tr>
                        ))}
                      </thead>
                      {/* 데이터 바디 */}
                      <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                        {table.getRowModel().rows.map((row, rIdx) => (
                          <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-950/30">
                            {/* 행 번호 */}
                            <td className="px-2 py-2 border-r border-zinc-200 dark:border-zinc-800 text-center text-zinc-400 select-none sticky left-0 bg-white dark:bg-black z-10">{rIdx + 1}</td>
                            {row.getVisibleCells().map(cell => (
                              <td key={cell.id} className="p-0 border-r border-zinc-200 dark:border-zinc-800 overflow-hidden" style={{ width: cell.column.getSize() }}>
                                {flexRender(cell.column.columnDef.cell, cell.getContext())}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    
                    {/* 데이터가 없을 때 팁 표시 */}
                    {records.length === 0 && (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center text-zinc-500 gap-4 border-t border-zinc-200 dark:border-zinc-800">
                           <ClipboardPaste className="w-10 h-10 text-zinc-300 dark:text-zinc-700" />
                           <div>
                            <p className="font-medium text-zinc-700 dark:text-zinc-300">No data in this table yet.</p>
                            <p className="text-sm">Copy rows from Google Sheets (Ctrl+C) and<br/>paste them here (Ctrl+V) starting from the first cell.</p>
                           </div>
                           <button onClick={() => setRecords([{}, {}, {}])} className="mt-2 text-xs text-emerald-600 hover:text-emerald-500 font-medium">Add empty rows to start pasting</button>
                        </div>
                    )}
                  </div>
                )}
                {/* 하단 바 (데이터 개수 및 팁) */}
                <footer className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 text-xs text-zinc-500 flex justify-between items-center select-none">
                  <div>Showing {records.length} records. <span className="text-emerald-600 dark:text-emerald-400 font-medium">* Only Primary Key(id) based tables supported for saving.</span></div>
                  <div className="flex items-center gap-1.5"><kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 font-mono">V</kbd> to paste bulk data.</div>
                </footer>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 gap-4 bg-white dark:bg-black">
            <Database className="w-12 h-12 text-zinc-200 dark:text-zinc-800" />
            {isLoadingSchema ? "Loading database schema..." : "Select a table from the sidebar to view and edit data."}
          </div>
        )}
      </main>

      {/* 대량 붙여넣기를 위한 전역 CSS 스타일 (Tailwind로 처리 힘든 부분) */}
      <style jsx global>{`
        .input-grid-container table { border-collapse: separate; }
        .input-grid-container td, .input-grid-container th { border-right-width: 1px; border-bottom-width: 1px; }
        .text-xxs { font-size: 0.65rem; }
      `}</style>
    </div>
  );
}