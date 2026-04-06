"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Database, Table, Columns, Key, Settings, Search, Loader2, Save, 
  RefreshCw, ClipboardPaste, Trash2, Plus, Image as ImageIcon, Copy, Check, X, FolderOpen, Undo 
} from "lucide-react";
import { flexRender, getCoreRowModel, useReactTable, ColumnDef } from "@tanstack/react-table";
import Papa from "papaparse";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// 업로드 상태 타입 정의
type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';
interface UploadQueueItem {
  id: string;
  file: File;
  status: UploadStatus;
  url?: string;
  error?: string;
}

// --- [신규] 이미지 업로드 및 팝업 컴포넌트 ---
const ImageUploadModal = ({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) => {
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [isAllCopied, setIsAllCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const handleSelection = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadQueueItem[] = Array.from(files).map(file => ({
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      file,
      status: 'pending'
    }));

    setQueue(prev => [...newItems, ...prev]);
  };

  const copyAllToClipboard = () => {
    const successfulItems = queue.filter(item => item.status === 'success' && item.url);
    const tsvContent = successfulItems.map(item => `${item.file.name}\t${item.url}`).join('\n');
    
    navigator.clipboard.writeText(tsvContent);
    setIsAllCopied(true);
    setTimeout(() => setIsAllCopied(false), 2000);
  };

  useEffect(() => {
    const processQueue = async () => {
      if (isProcessing) return;
      const nextItem = queue.find(item => item.status === 'pending');
      if (!nextItem) return;

      setIsProcessing(true);
      
      setQueue(prev => prev.map(item => item.id === nextItem.id ? { ...item, status: 'uploading' } : item));

      const file = nextItem.file;
      
      // 🌟 [완벽 수정] 한글, 영문, 숫자, 마침표(.), 하이픈(-), 언더바(_)만 허용하고 괄호 등 모든 특수문자 제거
      const safeOriginalName = file.name.replace(/[^a-zA-Z0-9가-힣._-]/g, ''); 
      const fileName = `${Date.now()}_${safeOriginalName}`; 

      try {
        const { data, error } = await supabase.storage.from('photos').upload(fileName, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('photos').getPublicUrl(fileName);
        
        setQueue(prev => prev.map(item => 
          item.id === nextItem.id ? { ...item, status: 'success', url: publicUrl } : item
        ));
      } catch (err: any) {
        setQueue(prev => prev.map(item => 
          item.id === nextItem.id ? { ...item, status: 'error', error: err.message } : item
        ));
      } finally {
        setIsProcessing(false);
      }
    };

    processQueue();
  }, [queue, isProcessing]);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-2xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col max-h-[80vh]">
        <div className="p-5 border-b dark:border-zinc-800 flex justify-between items-center">
          <div className="flex flex-col">
            <h3 className="font-bold text-lg flex items-center gap-2"><ImageIcon className="w-5 h-5 text-emerald-500" /> 이미지 대량 업로드</h3>
            <p className="text-xs text-zinc-500">업로드 완료 후 '전체 복사'를 눌러 시트에 붙여넣으세요.</p>
          </div>
          <div className="flex items-center gap-2">
            {queue.some(i => i.status === 'success') && (
              <button 
                onClick={copyAllToClipboard}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${isAllCopied ? 'bg-emerald-500 text-white' : 'bg-zinc-900 text-white hover:bg-zinc-800'}`}
              >
                {isAllCopied ? <Check className="w-3.5 h-3.5" /> : <ClipboardPaste className="w-3.5 h-3.5" />}
                {isAllCopied ? '복사됨!' : '전체 복사 (시트용)'}
              </button>
            )}
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full"><X className="w-5 h-5" /></button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-emerald-500/20 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/10 transition-all group"
            >
              <ImageIcon className="w-8 h-8 text-emerald-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">파일 개별 선택</span>
              <input type="file" ref={fileInputRef} className="hidden" multiple onChange={(e) => { handleSelection(e.target.files); e.target.value = ""; }} accept="image/*" />
            </button>

            <button 
              onClick={() => folderInputRef.current?.click()}
              disabled={isProcessing}
              className="flex flex-col items-center justify-center py-8 border-2 border-dashed border-blue-500/20 rounded-xl hover:bg-blue-50 dark:hover:bg-blue-950/10 transition-all group"
            >
              <FolderOpen className="w-8 h-8 text-blue-500 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-bold text-zinc-700 dark:text-zinc-300">폴더 통째로 선택</span>
              {/* @ts-ignore */}
              <input type="file" ref={folderInputRef} className="hidden" webkitdirectory="" directory="" onChange={(e) => { handleSelection(e.target.files); e.target.value = ""; }} />
            </button>
          </div>

          {isProcessing && (
            <div className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-lg animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-500" />
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400">파일을 순차적으로 처리하고 있습니다...</span>
            </div>
          )}

          <div className="space-y-2">
            {queue.map((item, idx) => (
              <div key={item.id} className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${item.status === 'uploading' ? 'bg-emerald-50/50 border-emerald-200 animate-pulse' : 'bg-zinc-50 dark:bg-zinc-800/50 dark:border-zinc-700'}`}>
                <div className="w-12 h-12 rounded bg-zinc-200 dark:bg-zinc-700 overflow-hidden flex-shrink-0 border dark:border-zinc-600">
                  {item.url ? (
                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-zinc-400">
                      {item.status === 'uploading' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-bold truncate dark:text-zinc-200">{item.file.name}</p>
                    {item.status === 'success' && <Check className="w-3 h-3 text-emerald-500" />}
                    {/* 🌟 실패 시 마우스를 올리면 정확한 에러 원인을 툴팁으로 볼 수 있도록 title 추가 */}
                    {item.status === 'error' && <span className="text-[10px] text-red-500 font-bold" title={item.error}>실패</span>}
                  </div>
                  <p className="text-[10px] text-zinc-500 truncate font-mono mt-0.5">
                    {item.url || (item.status === 'uploading' ? '업로드 중...' : '대기 중')}
                  </p>
                </div>
                {item.url && (
                  <button 
                    onClick={() => copyToClipboard(item.url!, idx)}
                    className="px-3 py-1.5 hover:bg-emerald-500 hover:text-white dark:hover:bg-emerald-600 rounded-md border border-emerald-200 dark:border-emerald-900/50 transition-all flex items-center gap-1.5 text-[11px] font-bold text-emerald-600"
                  >
                    {copiedIndex === idx ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    주소 복사
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- 기존 타입 및 스타일 유지 ---
type ColumnInfo = { name: string; type: string; nullable: string; default: string; primary: boolean; };
type SchemaData = { [tableName: string]: ColumnInfo[]; };

const COLOR_THEMES: Record<string, any> = {
  linear: { name: "Linear (Trending)", primary: "#5e6ad2", primaryHover: "#4c55a5", primarySoft: "rgba(94, 106, 210, 0.1)", bgPage: "#000212", bgSurface: "#08091a", textPrimary: "#f7f8f8", textSecondary: "#b4b4b8", border: "#1f2033", accent: "#ffa500" },
  carbon: { name: "Vercel Carbon", primary: "#ffffff", primaryHover: "#e2e2e2", primarySoft: "#111111", bgPage: "#000000", bgSurface: "#0a0a0a", textPrimary: "#ffffff", textSecondary: "#888888", border: "#222222", accent: "#0070f3" },
  rosepine: { name: "Rose Pine", primary: "#ebbcba", primaryHover: "#e2a3a1", primarySoft: "#1f1d2e", bgPage: "#191724", bgSurface: "#1f1d2e", textPrimary: "#e0def4", textSecondary: "#908caa", border: "#26233a", accent: "#f6c177" },
  midnight: { name: "Midnight (Dark)", primary: "#6366f1", primaryHover: "#4f46e5", primarySoft: "#1e1b4b", bgPage: "#020617", bgSurface: "#0f172a", textPrimary: "#f1f5f9", textSecondary: "#94a3b8", border: "#1e293b", accent: "#fbbf24" },
  ocean: { name: "Ocean Blue", primary: "#3b82f6", primaryHover: "#2563eb", primarySoft: "#eff6ff", bgPage: "#f0f9ff", bgSurface: "#ffffff", textPrimary: "#0c4a6e", textSecondary: "#64748b", border: "#bae6fd", accent: "#ef4444" },
  nordic: { name: "Nordic Frost", primary: "#88c0d0", primaryHover: "#81a1c1", primarySoft: "#3b4252", bgPage: "#2e3440", bgSurface: "#3b4252", textPrimary: "#eceff4", textSecondary: "#d8dee9", border: "#434c5e", accent: "#ebcb8b" },
  forest: { name: "Deep Forest", primary: "#22c55e", primaryHover: "#16a34a", primarySoft: "#064e3b", bgPage: "#052e16", bgSurface: "#064e3b", textPrimary: "#ecfdf5", textSecondary: "#a7f3d0", border: "#065f46", accent: "#fcd34d" },
  clay: { name: "Warm Clay", primary: "#d97706", primaryHover: "#b45309", primarySoft: "#fef3c7", bgPage: "#fff7ed", bgSurface: "#fffcf2", textPrimary: "#451a03", textSecondary: "#92400e", border: "#fed7aa", accent: "#059669" }
};
const DESIGN_STYLES: Record<string, any> = {
  modern: { name: "Modern Default", radius: "10px", shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", borderWidth: "1px" },
  sharp: { name: "Sharp & Flat", radius: "0px", shadow: "none", borderWidth: "1px" },
  soft: { name: "Soft & Rounded", radius: "20px", shadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", borderWidth: "1px" },
  bold: { name: "Bold & 3D", radius: "12px", shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)", borderWidth: "2px" }
};

const EditableCell = memo(({ getValue, row: { index }, column: { id }, table }: any) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  useEffect(() => { setValue(initialValue); }, [initialValue]);
  const onBlur = () => { table.options.meta?.updateData(index, id, value); };
  return (
    <input
      value={value as string || ""}
      onChange={e => setValue(e.target.value)}
      onBlur={onBlur}
      className="w-full h-full px-3 py-2 bg-transparent outline-none focus:ring-2 focus:ring-emerald-500 rounded-sm font-mono text-xs placeholder:text-zinc-400"
      style={{ color: 'var(--text-primary)' }}
      placeholder="NULL"
    />
  );
});
EditableCell.displayName = "EditableCell";

export default function DataEditor({ tableName, isEmbedded }: { tableName?: string | null, isEmbedded?: boolean }) {
  const [selectedTable, setSelectedTable] = useState<string | null>(tableName || null);

  useEffect(() => {
    if (tableName) {
      setSelectedTable(tableName);
    }
  }, [tableName]);
  const [schemaData, setSchemaData] = useState<SchemaData>({});
  const [records, setRecords] = useState<any[]>([]);
  const [originalRecords, setOriginalRecords] = useState<any[]>([]);
  const [isLoadingSchema, setIsLoadingSchema] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [themeKey, setThemeKey] = useState<string>("linear");
  const [styleKey, setStyleKey] = useState<string>("modern");
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<{ index: number, record: any } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);

  const handleCreateTable = async () => {
    const tableName = prompt("생성할 새 테이블 이름을 입력하세요 (영문):");
    if (!tableName) return;
    setIsCreatingTable(true);
    const { error } = await supabase.rpc("create_new_table", { table_name: tableName });
    if (error) alert(`테이블 생성 실패: ${error.message}`);
    else {
      alert(`'${tableName}' 테이블이 성공적으로 생성되었습니다.`);
      window.location.reload(); 
    }
    setIsCreatingTable(false);
  };

  const handleAddColumn = async () => {
    if (!selectedTable) return;
    const colName = prompt("새로 추가할 컬럼 이름을 입력하세요 (영문 권장):");
    if (!colName) return;
    const colType = prompt("데이터 타입을 입력하세요 (text, integer, boolean 등):", "text");
    if (!colType) return;
    
    const { error } = await supabase.rpc("add_column_to_table", {
      table_name: selectedTable,
      column_name: colName,
      data_type: colType
    });
    if (error) alert(`컬럼 추가 실패: ${error.message}`);
    else {
      alert(`'${colName}' 컬럼이 성공적으로 추가되었습니다.`);
      window.location.reload(); 
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("dashboard-theme");
    const savedStyle = localStorage.getItem("dashboard-style");
    if (savedTheme && COLOR_THEMES[savedTheme]) setThemeKey(savedTheme);
    if (savedStyle && DESIGN_STYLES[savedStyle]) setStyleKey(savedStyle);
  }, []);

  useEffect(() => {
    localStorage.setItem("dashboard-theme", themeKey);
    localStorage.setItem("dashboard-style", styleKey);
  }, [themeKey, styleKey]);

  useEffect(() => {
    async function fetchSchema() {
      const { data } = await supabase.rpc("get_schema_info");
      if (data) {
        const grouped = data.reduce((acc: any, row: any) => {
          if (!acc[row.table_name]) acc[row.table_name] = [];
          acc[row.table_name].push({ name: row.column_name, type: row.data_type, primary: row.is_primary });
          return acc;
        }, {});
        setSchemaData(grouped);
        if (!selectedTable && Object.keys(grouped).length > 0) setSelectedTable(Object.keys(grouped)[0]);
      }
      setIsLoadingSchema(false);
    }
    fetchSchema();
  }, []);

  const fetchTableData = useCallback(async (tableName: string) => {
    setIsLoadingData(true);
    const { data } = await supabase.from(tableName).select("*").limit(2000);
    setRecords(data || []);
    setOriginalRecords(JSON.parse(JSON.stringify(data || [])));
    setIsLoadingData(false);
  }, []);

  useEffect(() => { if (selectedTable) fetchTableData(selectedTable); }, [selectedTable, fetchTableData]);

  const handleSave = async () => {
    if (!selectedTable || isSaving) return;
    setIsSaving(true);
    const { error } = await supabase.rpc("upsert_data", { table_name: selectedTable, json_data: records });
    if (error) alert(`Save failed: ${error.message}`);
    else { await fetchTableData(selectedTable); alert("성공적으로 저장되었습니다."); }
    setIsSaving(false);
  };

  const handleAddRow = useCallback(() => {
    setRecords(prev => [...prev, {}]);
  }, []);

  const handleDeleteRow = useCallback((indexToDelete: number) => {
    if (window.confirm("정말로 이 행을 삭제하시겠습니까?\n(삭제 후 우측 하단에서 5초 내에 되돌릴 수 있습니다)")) {
      setRecords(prev => {
        const recordToDelete = prev[indexToDelete];
        setLastDeleted({ index: indexToDelete, record: recordToDelete });
        return prev.filter((_, index) => index !== indexToDelete);
      });
    }
  }, []);

  const handleUndoDelete = useCallback(() => {
    if (!lastDeleted) return;
    setRecords(prev => {
      const newRecords = [...prev];
      newRecords.splice(lastDeleted.index, 0, lastDeleted.record);
      return newRecords;
    });
    setLastDeleted(null);
  }, [lastDeleted]);

  useEffect(() => {
    if (lastDeleted) {
      const timer = setTimeout(() => {
        setLastDeleted(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [lastDeleted]);

  const isDirty = useMemo(() => JSON.stringify(records) !== JSON.stringify(originalRecords), [records, originalRecords]);

  const columns = useMemo<ColumnDef<any>[]>(() => {
    if (!selectedTable || !schemaData[selectedTable]) return [];
    return schemaData[selectedTable].map((col) => ({
      accessorKey: col.name,
      header: () => (
        <div className="flex items-center gap-1.5 truncate">
          {col.primary ? <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : <Columns className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span className="font-mono">{col.name}</span>
          <span className="text-[10px] opacity-50 ml-1">{col.type}</span>
        </div>
      ),
      cell: EditableCell,
      size: 180,
    }));
  }, [selectedTable, schemaData]);

  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
    columnResizeMode: "onChange",
    meta: {
      updateData: (rowIndex: number, colId: string, val: any) => {
        setRecords(old => old.map((row, i) => i === rowIndex ? { ...row, [colId]: val } : row));
      },
      handlePaste: (pastedData: any[][], startRowIndex: number, startColIndex: number) => {
        setRecords(old => {
          const newData = [...old];
          const allColumns = table.getAllLeafColumns();

          pastedData.forEach((pastedRow, i) => {
            const rowIndex = startRowIndex + i;
            if (rowIndex >= newData.length) newData.push({});

            pastedRow.forEach((pastedValue, j) => {
              const colIndex = startColIndex + j;
              if (colIndex < allColumns.length) {
                const columnId = allColumns[colIndex].id;
                newData[rowIndex] = { ...newData[rowIndex], [columnId]: pastedValue === "" ? null : pastedValue };
              }
            });
          });
          return newData;
        });
      },
    }
  });

  useEffect(() => {
    const handlePasteEvent = (event: ClipboardEvent) => {
      if (!gridRef.current?.contains(document.activeElement)) return;

      const paste = event.clipboardData?.getData("text/plain");
      if (!paste) return;

      const result = Papa.parse(paste, { delimiter: "\t", header: false });
      const pastedData = result.data as any[][];
      if (pastedData.length === 0) return;

      const activeElement = document.activeElement as HTMLInputElement;
      if (activeElement.tagName !== 'INPUT') return;

      const td = activeElement.closest('td');
      const tr = activeElement.closest('tr');
      if (!td || !tr) return;

      const colIdx = (td as HTMLTableCellElement).cellIndex - 1;
      const rowIdx = (tr as HTMLTableRowElement).rowIndex - 1;

      if (rowIdx >= 0 && colIdx !== -1) {
        event.preventDefault();
        (table.options.meta as any).handlePaste(pastedData, rowIdx, colIdx);
      }
    };

    document.addEventListener("paste", handlePasteEvent);
    return () => document.removeEventListener("paste", handlePasteEvent);
  }, [table]);

  const currentTheme = COLOR_THEMES[themeKey] || COLOR_THEMES.linear;
  const currentStyle = DESIGN_STYLES[styleKey] || DESIGN_STYLES.modern;

  return (
    <div className={`flex ${isEmbedded ? 'h-full' : 'h-screen'} w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden relative`}>
      <ImageUploadModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} />

      {/* tableName이 없을 때(단독 페이지 모드)만 사이드바 표시 */}
      {!tableName && (
        <aside className="w-64 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col shrink-0 z-10">
          <div className="p-5 flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-emerald-500" />
              <span className="font-bold tracking-tight text-lg">DB Manager</span>
            </div>
            <button onClick={() => setIsImageModalOpen(true)} className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-lg hover:bg-emerald-100 transition-all" title="이미지 업로드">
              <ImageIcon className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 overflow-y-auto flex-1">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <input placeholder="Search tables..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-900 outline-none" />
            </div>
            <nav className="space-y-1">
              {Object.keys(schemaData).filter(t => t.includes(searchTerm)).map(t => (
                <button key={t} onClick={() => setSelectedTable(t)} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium truncate ${selectedTable === t ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400"}`}>
                  {t}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      )}

      <main className="flex-1 overflow-hidden flex flex-col">
        {selectedTable && (
          <>
            <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-6 flex items-center justify-between shrink-0 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-semibold">{selectedTable}</h2>
                <button onClick={handleCreateTable} disabled={isCreatingTable} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500">
                  {isCreatingTable ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
                <button onClick={handleAddRow} className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-700">
                  <Plus className="w-3 h-3" />
                  행 추가
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl items-center gap-1 border border-zinc-200 dark:border-zinc-700">
                  <select value={themeKey} onChange={(e) => setThemeKey(e.target.value)} className="px-2 py-1.5 text-[11px] rounded-lg bg-transparent border-none outline-none cursor-pointer font-bold text-zinc-600 dark:text-zinc-300">
                    {Object.entries(COLOR_THEMES).map(([key, t]: any) => (
                      <option key={key} value={key}>🎨 {t.name}</option>
                    ))}
                  </select>
                  <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-600 mx-1" />
                  <select value={styleKey} onChange={(e) => setStyleKey(e.target.value)} className="px-2 py-1.5 text-[11px] rounded-lg bg-transparent border-none outline-none cursor-pointer font-bold text-zinc-600 dark:text-zinc-300">
                    {Object.entries(DESIGN_STYLES).map(([key, s]: any) => (
                      <option key={key} value={key}>📐 {s.name}</option>
                    ))}
                  </select>
                </div>
                <button onClick={() => fetchTableData(selectedTable)} className="p-2.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                  <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                </button>
                <button onClick={handleSave} disabled={!isDirty || isSaving} className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save Changes
                </button>
              </div>
            </header>

            <div className="flex-1 p-6 overflow-hidden flex flex-col" ref={gridRef}>
              <div className="flex-1 bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-auto">
                <table className="w-full text-left text-xs border-separate border-spacing-0">
                  <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-950 z-20 shadow-sm">
                    {table.getHeaderGroups().map(hg => (
                      <tr key={hg.id}>
                        <th className="w-10 p-3 border-b border-r dark:border-zinc-800 text-center text-zinc-400 font-normal">#</th>
                        {hg.headers.map(h => (
                          <th key={h.id} className="p-3 border-b border-r dark:border-zinc-800 font-semibold uppercase tracking-wider">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, i) => (
                      <tr key={row.id} className="hover:bg-zinc-50/50 dark:hover:bg-zinc-900/30">
                        <td className="group/row-no relative p-2 border-r dark:border-zinc-800 text-center text-zinc-400 w-10">
                          <span className="group-hover/row-no:opacity-0 transition-opacity">{i + 1}</span>
                          <button 
                            onClick={() => handleDeleteRow(i)}
                            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/row-no:opacity-100 text-rose-500 hover:text-rose-600 transition-all bg-white dark:bg-zinc-900"
                            title="행 삭제"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                        {row.getVisibleCells().map(c => (
                          <td key={c.id} className="border-r border-b dark:border-zinc-800 p-0">
                            {flexRender(c.column.columnDef.cell, c.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </main>

      {lastDeleted && (
        <div className="fixed bottom-8 right-8 bg-zinc-800 dark:bg-zinc-200 text-white dark:text-zinc-900 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <span className="text-sm font-semibold tracking-wide">행이 삭제되었습니다.</span>
          <div className="w-px h-4 bg-zinc-600 dark:bg-zinc-400"></div>
          <button 
            onClick={handleUndoDelete} 
            className="flex items-center gap-1.5 text-emerald-400 dark:text-emerald-600 font-extrabold text-sm hover:opacity-80 transition-opacity"
          >
            <Undo className="w-4 h-4" />
            되돌리기
          </button>
          <button onClick={() => setLastDeleted(null)} className="ml-2 text-zinc-400 dark:text-zinc-500 hover:text-white dark:hover:text-black">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <style jsx global>{`
        :root {
          --brand-primary: ${currentTheme.primary};
          --brand-hover: ${currentTheme.primaryHover};
          --brand-soft: ${currentTheme.primarySoft};
          --bg-page: ${currentTheme.bgPage};
          --bg-surface: ${currentTheme.bgSurface};
          --text-primary: ${currentTheme.textPrimary};
          --text-secondary: ${currentTheme.textSecondary};
          --border-color: ${currentTheme.border};
          --ui-radius: ${currentStyle.radius};
          --ui-shadow: ${currentStyle.shadow};
          --ui-border-width: ${currentStyle.borderWidth};
        }

        input, select, textarea {
          color: var(--text-primary) !important;
        }

        input::placeholder {
          color: var(--text-secondary) !important;
        }

        .bg-zinc-50, .dark\\:bg-zinc-950, .bg-zinc-100, .dark\\:bg-zinc-900 { background-color: var(--bg-page) !important; }
        .bg-white, .dark\\:bg-black { background-color: var(--bg-surface) !important; }
        .bg-emerald-50, .dark\\:bg-emerald-950\\/40 { background-color: var(--brand-soft) !important; }
        .bg-emerald-600 { background-color: var(--brand-primary) !important; }
        .hover\\:bg-emerald-700:hover { background-color: var(--brand-hover) !important; }

        .text-zinc-900, .dark\\:text-zinc-100, .text-zinc-950, .dark\\:text-white, .text-zinc-700, .dark\\:text-zinc-300 { color: var(--text-primary) !important; }
        .text-zinc-500, .text-zinc-400, .text-zinc-600, .dark\\:text-zinc-400 { color: var(--text-secondary) !important; }
        .text-emerald-500, .text-emerald-600 { color: var(--brand-primary) !important; }
        .text-amber-500 { color: ${currentTheme.accent} !important; }
        
        .border-zinc-200, .dark\\:border-zinc-800, .border-r, .border-b, .border { border-color: var(--border-color) !important; }
        .rounded-lg, .rounded-xl, .rounded-full { border-radius: var(--ui-radius) !important; }
        .shadow-sm, .shadow-md, .shadow-lg, .shadow-xl { box-shadow: var(--ui-shadow) !important; }
        .border, .border-b, .border-r { border-width: var(--ui-border-width) !important; }

        .input-grid-container table { border-collapse: separate; }
        .input-grid-container td, .input-grid-container th { border-right-width: 1px; border-bottom-width: 1px; }
      `}</style>
    </div>
  );
}