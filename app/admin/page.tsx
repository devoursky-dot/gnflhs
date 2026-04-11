"use client";

import React, { useState, useEffect, useMemo, useRef, useCallback, memo } from "react";
import { createClient } from "@supabase/supabase-js";
import { 
  Database, Table, Columns, Key, Settings, Search, Loader2, Save, FilterX,
  RefreshCw, ClipboardPaste, Trash2, Plus, Image as ImageIcon, Copy, Check, X, FolderOpen, Undo, ArrowUpDown, ArrowUp, ArrowDown, Menu, Link
} from "lucide-react";
import { flexRender, getCoreRowModel, getSortedRowModel, useReactTable, ColumnDef, SortingState } from "@tanstack/react-table";
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
type ColumnInfo = { name: string; type: string; nullable: string; default: string; primary: boolean; isGenerated?: boolean; };
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

const EditableCell = memo(({ getValue, row: { index }, column: { id, columnDef }, table }: any) => {
  const initialValue = getValue();
  const [value, setValue] = useState(initialValue);
  const isGenerated = (columnDef.meta as any)?.isGenerated;

  useEffect(() => { setValue(initialValue); }, [initialValue]);
  const onBlur = () => { if (!isGenerated) table.options.meta?.updateData(index, id, value); };

  if (isGenerated) {
    return (
      <div 
        className="w-full h-full px-3 py-2 bg-zinc-100 dark:bg-zinc-900/50 text-zinc-400 dark:text-zinc-600 font-mono text-xs italic cursor-not-allowed flex items-center"
        title="가상 칼럼(Generated)은 수정할 수 없습니다."
      >
        {value === null || value === undefined ? "NULL" : String(value)}
      </div>
    );
  }

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

const RelationSyncModal = ({ isOpen, onClose, schemaData, currentTable, onApplySync }: any) => {
  const [targetColumn, setTargetColumn] = useState('');
  const [refTable, setRefTable] = useState('');
  const [refTargetColumn, setRefTargetColumn] = useState('');
  const [matchCurrentColumn, setMatchCurrentColumn] = useState('');
  const [matchRefColumn, setMatchRefColumn] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const curCols = schemaData[currentTable] || [];
      if (curCols.length > 0) {
        setTargetColumn(curCols[0]?.name || '');
        setMatchCurrentColumn(curCols[0]?.name || '');
      }
      const tables = Object.keys(schemaData).filter(t => t !== currentTable);
      if (tables.length > 0) setRefTable(tables[0]);
    }
  }, [isOpen, currentTable, schemaData]);

  useEffect(() => {
    if (refTable && schemaData[refTable]) {
       const refCols = schemaData[refTable] || [];
       if (refCols.length > 0) {
         setRefTargetColumn(refCols[0]?.name || '');
         setMatchRefColumn(refCols[0]?.name || '');
       }
    }
  }, [refTable, schemaData]);

  const runSync = async () => {
    if (!targetColumn || !refTable || !refTargetColumn || !matchCurrentColumn || !matchRefColumn) {
      return alert('모든 항목을 선택해주세요.');
    }
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.from(refTable).select(`"${matchRefColumn}", "${refTargetColumn}"`).not(matchRefColumn, 'is', null);
      if (error) throw error;
      
      const safeData = data || [];
      const map = new Map();
      safeData.forEach(row => {
         if (row[matchRefColumn] != null) {
           map.set(String(row[matchRefColumn]), row[refTargetColumn]);
         }
      });
      
      onApplySync(targetColumn, matchCurrentColumn, map);
      onClose();
      alert(`총 ${safeData.length}개의 참조 데이터를 가져와 빈칸에 일치하는 값을 채웠습니다.\n(※ 아직 DB에 반영되지 않았으니 시각적으로 확인 후 우측 상단의 'Save Changes' 버튼을 눌러 확정 기록하세요.)`);
    } catch (err: any) {
      alert(`복사 중 오류 발생: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
     <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-zinc-900 w-full max-w-[600px] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col">
        <div className="p-5 border-b dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-950/50 rounded-t-2xl">
          <div className="flex flex-col">
            <h3 className="font-bold text-lg flex items-center gap-2"><Link className="w-5 h-5 text-indigo-500" /> 다른 테이블 데이터 동기화 (VLOOKUP)</h3>
            <p className="text-[11px] text-zinc-500 mt-1">기준값이 일치할 때 참조 테이블의 값을 현재 테이블로 일괄 복사해옵니다.</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="p-6 space-y-5">
           <div className="grid grid-cols-2 gap-4 bg-zinc-50 dark:bg-zinc-800/30 p-4 rounded-xl border dark:border-zinc-800 relative">
             <div className="absolute left-1/2 top-1/2 -ml-[14px] -mt-[14px] w-[28px] h-[28px] bg-white dark:bg-black border border-zinc-200 dark:border-zinc-700 rounded-full flex items-center justify-center text-zinc-400 font-bold text-xs shadow-sm z-10">
               =
             </div>
             
             <div className="pr-2 space-y-4">
               <div>
                 <label className="text-[10.5px] font-bold text-zinc-400 mb-1 block uppercase tracking-wider">현재 테이블 ({currentTable})</label>
                 <select value={matchCurrentColumn} onChange={e=>setMatchCurrentColumn(e.target.value)} className="w-full text-sm p-2 rounded-lg bg-white dark:bg-zinc-950 border dark:border-zinc-700 outline-none focus:border-indigo-500">
                   {schemaData[currentTable]?.map((c:any) => <option key={`mc-${c.name}`} value={c.name}>{c.name}</option>)}
                 </select>
                 <p className="text-[9px] text-zinc-500 mt-1">기준 (이 값이 같을 때)</p>
               </div>
               
               <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                 <label className="text-[10.5px] font-bold text-zinc-400 mb-1 block uppercase tracking-wider">데이터를 채울 칼럼 (도착지)</label>
                 <select value={targetColumn} onChange={e=>setTargetColumn(e.target.value)} className="w-full text-sm p-2 rounded-lg bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 font-bold outline-none">
                   {schemaData[currentTable]?.map((c:any) => <option key={`tc-${c.name}`} value={c.name}>{c.name}</option>)}
                 </select>
               </div>
             </div>
             
             <div className="pl-2 space-y-4">
               <div>
                 <label className="text-[10.5px] font-bold text-zinc-400 mb-1 block uppercase tracking-wider flex items-center justify-between">
                   <span>참조 테이블</span>
                 </label>
                 <select value={refTable} onChange={e=>{setRefTable(e.target.value);}} className="w-full text-[13px] font-semibold py-2 px-2 rounded-lg bg-zinc-200/50 dark:bg-zinc-900 border dark:border-zinc-700 outline-none">
                   {Object.keys(schemaData).filter(t => t !== currentTable).map(t => <option key={`rt-${t}`} value={t}>{t}</option>)}
                 </select>
               </div>
               
               <div>
                 <select value={matchRefColumn} onChange={e=>setMatchRefColumn(e.target.value)} className="w-full text-sm p-2 rounded-lg bg-white dark:bg-zinc-950 border dark:border-zinc-700 outline-none focus:border-indigo-500 mt-1">
                   {schemaData[refTable]?.map((c:any) => <option key={`mr-${c.name}`} value={c.name}>{c.name}</option>)}
                 </select>
                 <p className="text-[9px] text-zinc-500 mt-1">기준 (이 값이 같을 때)</p>
               </div>
               
               <div className="pt-2 border-t border-dashed border-zinc-200 dark:border-zinc-800">
                 <label className="text-[10.5px] font-bold text-zinc-400 mb-1 block uppercase tracking-wider">복사해올 값 (출발지)</label>
                 <select value={refTargetColumn} onChange={e=>setRefTargetColumn(e.target.value)} className="w-full text-sm p-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 font-bold outline-none">
                   {schemaData[refTable]?.map((c:any) => <option key={`rtc-${c.name}`} value={c.name}>{c.name}</option>)}
                 </select>
               </div>
             </div>
           </div>
        </div>
        
        <div className="p-5 border-t dark:border-zinc-800 flex justify-end gap-3 bg-zinc-50 dark:bg-zinc-950/50 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 rounded-lg text-sm font-semibold text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">취소</button>
          <button onClick={runSync} disabled={isProcessing} className="px-5 py-2 rounded-lg text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-md">
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Link className="w-4 h-4" />} VLOOKUP 동기화 실행
          </button>
        </div>
      </div>
     </div>
  );
};

export default function AdminDashboardPage() {
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
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
  const [sorting, setSorting] = useState<SortingState>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isRelationSyncOpen, setIsRelationSyncOpen] = useState(false);
  const [lastDeleted, setLastDeleted] = useState<{ index: number, record: any } | null>(null);

  const [excludedColumns, setExcludedColumns] = useState<string[]>(['year', 'month', 'YEAR', 'MONTH', '_year', '_month']);
  const [isExcludeSettingsOpen, setIsExcludeSettingsOpen] = useState(false);

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

  const handleApplyRelationSync = useCallback((targetCol: string, matchCol: string, map: Map<string, any>) => {
    setRecords(old => old.map(row => {
      const keyStr = String(row[matchCol]);
      if (map.has(keyStr)) {
        return { ...row, [targetCol]: map.get(keyStr) };
      }
      return row;
    }));
  }, []);

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
          acc[row.table_name].push({ 
            name: row.column_name, 
            type: row.data_type, 
            primary: row.is_primary,
            isGenerated: row.is_generated 
          });
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

  useEffect(() => { 
    if (selectedTable) {
      const saved = localStorage.getItem(`excluded-cols-${selectedTable}`);
      if (saved) setExcludedColumns(JSON.parse(saved));
      else setExcludedColumns(['year', 'month', 'YEAR', 'MONTH', '_year', '_month']);
      fetchTableData(selectedTable);
    }
  }, [selectedTable, fetchTableData]);

  const toggleExcludedColumn = (colName: string) => {
    setExcludedColumns(prev => {
      const next = prev.includes(colName) ? prev.filter(c => c !== colName) : [...prev, colName];
      if (selectedTable) localStorage.setItem(`excluded-cols-${selectedTable}`, JSON.stringify(next));
      return next;
    });
  };

  // 한국 날짜 문자열 등을 Postgres 타임스탬프로 노멀라이즈
  const normalizeForPostgres = (val: any) => {
    if (typeof val !== 'string') return val;
    // 예: "2026. 3. 3 오후 3:31:21" 또는 "2026. 3. 3. 오전 10:30"
    const match = val.match(/(\d{4})\.\s*(\d{1,2})\.\s*(\d{1,2})\.?\s+(오전|오후)\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
    if (match) {
      let [, y, m, d, ampm, h, min, s] = match;
      let hour = parseInt(h, 10);
      if (ampm === "오후" && hour < 12) hour += 12;
      if (ampm === "오전" && hour === 12) hour = 0;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${min.padStart(2, '0')}:${(s || '00').padStart(2, '0')}`;
    }
    return val;
  };

  const handleSave = async () => {
    if (!selectedTable || isSaving) return;
    setIsSaving(true);
    
    try {
      const pks = schemaData[selectedTable]?.filter(c => c.primary).map(c => c.name);
      if (!pks || pks.length === 0) {
        alert("기본 키(Primary Key)가 없는 테이블은 업데이트할 수 없습니다.");
        setIsSaving(false);
        return;
      }

      let hasError = false;
      let errorMsg = "";

      const updatePromises = [];
      const insertRecords = [];

      for (let i = 0; i < records.length; i++) {
        const currentRecord = records[i];
        
        // 새로 추가된 행인지 확인 (originalRecords에 없음)
        // PK 기반으로 원본 찾기 (타입이 다를 수 있으므로 == 사용: 예 숫자가 문자열로 붙여넣기된 경우)
        const isNewRow = !pks.every(pk => currentRecord[pk]); 
        const originalRecord = originalRecords.find(r => pks.every(pk => r[pk] == currentRecord[pk]));

        // 자동으로 제외할 칼럼 목록 (사용자 설정 + DB 가상 칼럼)
        const dbGeneratedCols = schemaData[selectedTable]?.filter(c => c.isGenerated).map(c => c.name) || [];
        const generatedCols = [...new Set([...excludedColumns, ...dbGeneratedCols])];

        if (!originalRecord) {
          // 새로 추가된 행
          if (Object.keys(currentRecord).length > 0) {
            const cleanRecord: any = {};
            for (const key of Object.keys(currentRecord)) {
              if (generatedCols.includes(key)) continue;
              cleanRecord[key] = normalizeForPostgres(currentRecord[key]);
            }
            if (Object.keys(cleanRecord).length > 0) {
              insertRecords.push(cleanRecord);
            }
          }
        } else {
          // 기존 행 변경 사항 감지
          const updates: any = {};
          for (const key of Object.keys(currentRecord)) {
            if (generatedCols.includes(key)) continue; // 가상 칼럼은 업데이트 제외
            const normVal = normalizeForPostgres(currentRecord[key]);
            if (normVal != originalRecord[key] && currentRecord[key] != originalRecord[key]) {
              updates[key] = normVal;
            }
          }
          
          if (Object.keys(updates).length > 0) {
            let query = supabase.from(selectedTable).update(updates);
            pks.forEach(pk => { query = query.eq(pk, originalRecord[pk]); });
            updatePromises.push(query);
          }
        }
      }

      // 동시에 업데이트 실행
      if (updatePromises.length > 0) {
        const results = await Promise.all(updatePromises);
        const failed = results.find(r => r.error);
        if (failed) {
          hasError = true;
          errorMsg = failed.error!.message;
        }
      }

      // 새로 추가된 행 삽입 실행
      if (insertRecords.length > 0 && !hasError) {
        const { error } = await supabase.from(selectedTable).insert(insertRecords);
        if (error) {
          hasError = true;
          errorMsg = error.message;
        }
      }

      if (hasError) {
        alert(`저장 실패: ${errorMsg}`);
      } else {
        await fetchTableData(selectedTable);
        alert("성공적으로 저장되었습니다.");
      }
    } catch (err: any) {
      alert(`저장 중 오류 발생: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
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
    const sortedColumns = [...schemaData[selectedTable]].sort((a, b) => {
      // 1. Primary Key가 항상 최상단(좌측)
      if (a.primary && !b.primary) return -1;
      if (!a.primary && b.primary) return 1;
      // 2. IsGenerated(가상 칼럼)가 항상 최하단(우측)
      if (a.isGenerated && !b.isGenerated) return 1;
      if (!a.isGenerated && b.isGenerated) return -1;
      return 0;
    });

    return sortedColumns.map((col) => ({
      accessorKey: col.name,
      meta: { isGenerated: col.isGenerated },
      header: ({ column }) => (
        <div 
          className={`flex items-center gap-1.5 truncate group cursor-pointer hover:text-emerald-600 transition-colors select-none ${col.isGenerated ? 'opacity-60' : ''}`}
          onClick={column.getToggleSortingHandler()}
        >
          {col.primary ? <Key className="w-3.5 h-3.5 text-amber-500 shrink-0" /> : col.isGenerated ? <Settings className="w-3.5 h-3.5 text-zinc-400 shrink-0" /> : <Columns className="w-3.5 h-3.5 text-zinc-400 shrink-0" />}
          <span className={`font-mono ${col.isGenerated ? 'italic' : ''}`}>{col.name}</span>
          <span className="text-[10px] opacity-50 ml-1">{col.type}</span>
          
          <div className="ml-auto flex items-center">
            {{
              asc: <ArrowUp className="w-3.5 h-3.5 text-emerald-500" />,
              desc: <ArrowDown className="w-3.5 h-3.5 text-emerald-500" />,
            }[column.getIsSorted() as string] ?? (
              <ArrowUpDown className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 text-zinc-400 transition-opacity" />
            )}
          </div>
        </div>
      ),
      cell: EditableCell,
      size: 180,
    }));
  }, [selectedTable, schemaData]);

  const table = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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

  // 🔥 [수정] 현재 테이블에 실제로 존재하는 칼럼 중에서만 제외 숫자 계산
  const currentTableCols = selectedTable ? (schemaData[selectedTable]?.map(c => c.name) || []) : [];
  const dbGeneratedCols = selectedTable ? (schemaData[selectedTable]?.filter(c => c.isGenerated).map(c => c.name) || []) : [];
  const totalExcludedCount = [...new Set([...excludedColumns, ...dbGeneratedCols])]
    .filter(name => currentTableCols.includes(name)).length;

  return (
    <div className="flex h-screen w-full bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden relative">
      <ImageUploadModal isOpen={isImageModalOpen} onClose={() => setIsImageModalOpen(false)} />

      {/* 모바일 오버레이 */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <aside className={`fixed md:relative inset-y-0 left-0 w-64 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0 transition-transform duration-300 ease-in-out border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black flex flex-col shrink-0 z-40 shadow-2xl md:shadow-none`}>
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
              <button key={t} onClick={() => { setSelectedTable(t); setIsSidebarOpen(false); }} className={`w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium truncate ${selectedTable === t ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400" : "text-zinc-600 hover:bg-zinc-100 dark:text-zinc-400"}`}>
                {t}
              </button>
            ))}
          </nav>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden flex flex-col min-w-0 w-full">
        {selectedTable && (
          <>
            <RelationSyncModal 
              isOpen={isRelationSyncOpen} 
              onClose={() => setIsRelationSyncOpen(false)} 
              schemaData={schemaData} 
              currentTable={selectedTable} 
              onApplySync={handleApplyRelationSync} 
            />
            
            <header className="h-16 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-black px-4 md:px-6 flex items-center justify-between shrink-0 shadow-sm z-10 gap-2 md:gap-4">
              <div className="flex items-center gap-2 md:gap-4 min-w-0">
                <button 
                  className="md:hidden p-2 -ml-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg flex-shrink-0"
                  onClick={() => setIsSidebarOpen(true)}
                >
                  <Menu className="w-5 h-5" />
                </button>
                <h2 className="text-lg md:text-xl font-semibold truncate max-w-[120px] sm:max-w-[200px] md:max-w-none">{selectedTable}</h2>
                <button onClick={handleCreateTable} disabled={isCreatingTable} className="p-1.5 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hidden sm:block flex-shrink-0">
                  {isCreatingTable ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </button>
                <button onClick={handleAddRow} className="flex flex-shrink-0 items-center gap-1.5 px-2 md:px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg text-xs font-bold transition-all border border-zinc-200 dark:border-zinc-700">
                  <Plus className="w-3 h-3" />
                  <span className="hidden sm:inline">행 추가</span>
                </button>
                <div className="w-px h-6 bg-zinc-200 dark:bg-zinc-700 mx-1 hidden sm:block"></div>
                <button onClick={() => setIsRelationSyncOpen(true)} title="다른 테이블에서 데이터 당겨오기 (VLOOKUP)" className="flex flex-shrink-0 items-center gap-1.5 px-2 md:px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-800/50 text-indigo-600 dark:text-indigo-400 rounded-lg text-xs font-bold transition-all border border-indigo-100 dark:border-indigo-800/50">
                  <Link className="w-3 h-3" />
                  <span className="hidden sm:inline">관계 연결</span>
                </button>
              </div>
              <div className="flex items-center gap-2">
                <div className="hidden lg:flex bg-zinc-100 dark:bg-zinc-800 p-1 rounded-xl items-center gap-1 border border-zinc-200 dark:border-zinc-700">
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
                <button onClick={() => fetchTableData(selectedTable)} className="p-2 md:p-2.5 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors flex-shrink-0">
                  <RefreshCw className={`w-4 h-4 ${isLoadingData ? 'animate-spin' : ''}`} />
                </button>
                
                {/* 제외 칼럼 설정 버튼 */}
                <div className="relative">
                  <button onClick={() => setIsExcludeSettingsOpen(!isExcludeSettingsOpen)} className={`p-2 md:p-2.5 rounded-lg transition-colors flex-shrink-0 group relative ${(excludedColumns.length > 0 || dbGeneratedCols.length > 0) ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/30' : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800'}`}>
                    <FilterX className="w-4 h-4" />
                    {totalExcludedCount > 0 && <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-500 text-white text-[9px] font-black rounded-full flex items-center justify-center">{totalExcludedCount}</span>}
                  </button>
                  {isExcludeSettingsOpen && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setIsExcludeSettingsOpen(false)}></div>
                      <div className="absolute top-full mt-2 right-0 w-64 md:w-72 bg-white dark:bg-black border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-xl z-50 p-4 animate-in fade-in cursor-default" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-2 pb-2 border-b dark:border-zinc-800">
                          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5"><FilterX className="w-3.5 h-3.5 text-amber-500" /> 데이터저장 제외 칼럼</h4>
                          <button onClick={() => setIsExcludeSettingsOpen(false)} className="text-zinc-400 hover:text-zinc-600"><X className="w-3.5 h-3.5" /></button>
                        </div>
                        <p className="text-[10.5px] text-zinc-500 mb-3 leading-tight font-medium">체크된 칼럼은 데이터베이스 저장 시 값을 전송하지 않습니다. (자동 생성 가상칼럼 에러 방지용)</p>
                        <div className="max-h-60 overflow-y-auto space-y-1">
                          {schemaData[selectedTable]?.map(col => {
                            const isAutoGenerated = col.isGenerated;
                            const isChecked = isAutoGenerated || excludedColumns.includes(col.name);
                            
                            return (
                              <label key={col.name} className={`flex items-center gap-2 p-1.5 rounded transition-all ${isAutoGenerated ? 'opacity-50 cursor-not-allowed bg-zinc-100/50 dark:bg-zinc-900/30' : 'hover:bg-zinc-50 dark:hover:bg-zinc-900 cursor-pointer'}`}>
                                <input 
                                  type="checkbox" 
                                  checked={isChecked}
                                  onChange={() => !isAutoGenerated && toggleExcludedColumn(col.name)}
                                  disabled={isAutoGenerated}
                                  className={`w-3.5 h-3.5 rounded ${isAutoGenerated ? 'text-zinc-400 opacity-50' : 'text-amber-500 focus:ring-amber-500 cursor-pointer'}`}
                                />
                                <div className="flex flex-col">
                                  <span className={`text-xs font-mono ${isChecked ? 'text-amber-600 dark:text-amber-500 font-bold' : 'text-zinc-700 dark:text-zinc-300'}`}>
                                    {col.name}
                                  </span>
                                  {isAutoGenerated && <span className="text-[9px] text-zinc-400 font-bold uppercase tracking-tighter">System Auto-Excluded</span>}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                <button onClick={handleSave} disabled={!isDirty || isSaving} className="px-3 md:px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex flex-shrink-0 items-center gap-1.5 md:gap-2 shadow-sm">
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  <span className="hidden sm:inline">Save Changes</span>
                  <span className="sm:hidden">Save</span>
                </button>
              </div>
            </header>

            <div className="flex-1 p-2 sm:p-4 md:p-6 overflow-hidden flex flex-col" ref={gridRef}>
              <div className="flex-1 bg-white dark:bg-black rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm overflow-auto scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800">
                <table className="w-full min-w-max text-left text-xs border-separate border-spacing-0">
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