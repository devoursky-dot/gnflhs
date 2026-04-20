// 파일 경로: app/admin/table.tsx
"use client";

import React, { useState, useEffect, memo } from "react";
import { Key, Columns, Settings, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

// ── 공유 타입 ──
export type ColumnInfo = { name: string; type: string; nullable: string; default: string; primary: boolean; isGenerated?: boolean; };
export type SchemaData = { [tableName: string]: ColumnInfo[]; };

// ── EditableCell (memo로 최적화) ──
export const EditableCell = memo(({ getValue, row: { index }, column: { id, columnDef }, table }: any) => {
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

// ── 칼럼 헤더 렌더러 ──
export function ColumnHeader({ col, column }: { col: ColumnInfo; column: any }) {
  return (
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
  );
}

// ── 컬러 테마 / 디자인 스타일 상수 ──
export const COLOR_THEMES: Record<string, any> = {
  linear: { name: "Linear (Trending)", primary: "#5e6ad2", primaryHover: "#4c55a5", primarySoft: "rgba(94, 106, 210, 0.1)", bgPage: "#000212", bgSurface: "#08091a", textPrimary: "#f7f8f8", textSecondary: "#b4b4b8", border: "#1f2033", accent: "#ffa500" },
  carbon: { name: "Vercel Carbon", primary: "#ffffff", primaryHover: "#e2e2e2", primarySoft: "#111111", bgPage: "#000000", bgSurface: "#0a0a0a", textPrimary: "#ffffff", textSecondary: "#888888", border: "#222222", accent: "#0070f3" },
  rosepine: { name: "Rose Pine", primary: "#ebbcba", primaryHover: "#e2a3a1", primarySoft: "#1f1d2e", bgPage: "#191724", bgSurface: "#1f1d2e", textPrimary: "#e0def4", textSecondary: "#908caa", border: "#26233a", accent: "#f6c177" },
  midnight: { name: "Midnight (Dark)", primary: "#6366f1", primaryHover: "#4f46e5", primarySoft: "#1e1b4b", bgPage: "#020617", bgSurface: "#0f172a", textPrimary: "#f1f5f9", textSecondary: "#94a3b8", border: "#1e293b", accent: "#fbbf24" },
  ocean: { name: "Ocean Blue", primary: "#3b82f6", primaryHover: "#2563eb", primarySoft: "#eff6ff", bgPage: "#f0f9ff", bgSurface: "#ffffff", textPrimary: "#0c4a6e", textSecondary: "#64748b", border: "#bae6fd", accent: "#ef4444" },
  nordic: { name: "Nordic Frost", primary: "#88c0d0", primaryHover: "#81a1c1", primarySoft: "#3b4252", bgPage: "#2e3440", bgSurface: "#3b4252", textPrimary: "#eceff4", textSecondary: "#d8dee9", border: "#434c5e", accent: "#ebcb8b" },
  forest: { name: "Deep Forest", primary: "#22c55e", primaryHover: "#16a34a", primarySoft: "#064e3b", bgPage: "#052e16", bgSurface: "#064e3b", textPrimary: "#ecfdf5", textSecondary: "#a7f3d0", border: "#065f46", accent: "#fcd34d" },
  clay: { name: "Warm Clay", primary: "#d97706", primaryHover: "#b45309", primarySoft: "#fef3c7", bgPage: "#fff7ed", bgSurface: "#fffcf2", textPrimary: "#451a03", textSecondary: "#92400e", border: "#fed7aa", accent: "#059669" }
};

export const DESIGN_STYLES: Record<string, any> = {
  modern: { name: "Modern Default", radius: "10px", shadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)", borderWidth: "1px" },
  sharp: { name: "Sharp & Flat", radius: "0px", shadow: "none", borderWidth: "1px" },
  soft: { name: "Soft & Rounded", radius: "20px", shadow: "0 10px 15px -3px rgba(0, 0, 0, 0.05)", borderWidth: "1px" },
  bold: { name: "Bold & 3D", radius: "12px", shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)", borderWidth: "2px" }
};
