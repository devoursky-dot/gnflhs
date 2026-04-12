// 파일 경로: app/preview/[appId]/renderer.tsx
"use client";

import React from 'react';
import { MousePointerClick } from 'lucide-react';
import { IconMap } from '@/app/design/picker';

// 버튼 컬러 테마 설정
const COLOR_THEMES: any = {
  slate: { bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-800', hover: 'hover:bg-slate-800', light: 'bg-slate-50', textCol: 'text-slate-900', shadow: 'shadow-slate-200' },
  indigo: { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-700', hover: 'hover:bg-indigo-700', light: 'bg-indigo-50', textCol: 'text-indigo-600', shadow: 'shadow-indigo-200' },
  blue: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', hover: 'hover:bg-blue-700', light: 'bg-blue-50', textCol: 'text-blue-600', shadow: 'shadow-blue-200' },
  emerald: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700', hover: 'hover:bg-emerald-700', light: 'bg-emerald-50', textCol: 'text-emerald-600', shadow: 'shadow-emerald-200' },
  rose: { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-600', hover: 'hover:bg-rose-600', light: 'bg-rose-50', textCol: 'text-rose-500', shadow: 'shadow-rose-200' },
  amber: { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600', hover: 'hover:bg-amber-600', light: 'bg-amber-50', textCol: 'text-amber-500', shadow: 'shadow-amber-200' },
  violet: { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-700', hover: 'hover:bg-violet-700', light: 'bg-violet-50', textCol: 'text-violet-600', shadow: 'shadow-violet-200' },
  cyan: { bg: 'bg-cyan-500', text: 'text-white', border: 'border-cyan-600', hover: 'hover:bg-cyan-600', light: 'bg-cyan-50', textCol: 'text-cyan-500', shadow: 'shadow-cyan-200' },
};

// 이미지 URL 판별
const isImageUrl = (url: any) => {
  if (typeof url !== 'string') return false;
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || (url.startsWith('http') && url.includes('/storage/v1/object/public/'));
};

export default function RenderPreviewLayout({ rows, rowData, actions, onExecuteAction }: any) {
  return (
    <div className="flex flex-col gap-0 w-full h-full flex-1 text-slate-900">
      {rows?.map((row: any) => (
        <div key={row.id} style={{ flex: row.flex || 1 }} className="flex gap-0 w-full items-stretch">
          {row.cells?.map((cell: any) => {
            const cellValue = rowData[cell.contentValue || ''];
            const shouldShowImage = cell.isImage || isImageUrl(cellValue);
            
            // ── 이미지 필드 ──
            if (cell.contentType === 'field' && shouldShowImage) {
              const shapeClass = cell.imageShape === 'circle' ? 'rounded-full aspect-square object-top shadow-sm mx-auto' : cell.imageShape === 'rounded' ? 'rounded-2xl shadow-sm' : 'rounded-none';
              const paddingClass = cell.imageShape === 'circle' ? 'p-3' : cell.imageShape === 'rounded' ? 'p-1.5' : 'p-0';
              return (
                <div key={cell.id} style={{ flex: cell.flex }} className={`flex flex-col justify-center min-w-0 overflow-hidden relative border-slate-100/50 bg-slate-50/30 ${paddingClass}`}>
                  <img src={String(cellValue)} alt="img" className={`object-cover w-full h-full max-h-full ${shapeClass}`} />
                </div>
              );
            }

            // ── 텍스트 필드 (데이터 변환 파이프라인) ──
            if (cell.contentType === 'field' && !shouldShowImage) {
              let displayText = cellValue !== null && cellValue !== undefined && cellValue !== '' ? String(cellValue) : '-';
              
              // 1단계: 마법의 수식 엔진 적용
              if (cell.textExpression) {
                try {
                  const evaluator = new Function('val', 'row', `try { return ${cell.textExpression}; } catch(e) { return val; }`);
                  const result = evaluator(cellValue, rowData);
                  displayText = result !== null && result !== undefined ? String(result) : '-';
                } catch (err) {
                  console.error("Formula Error:", err);
                }
              } 
              
              // 2단계: 정규식 적용
              if (displayText !== '-' && cell.textRegexPattern) {
                try { 
                  const regex = new RegExp(cell.textRegexPattern, 'g'); 
                  displayText = displayText.replace(regex, cell.textRegexReplace || ''); 
                } catch (err) { }
              }

              // 3단계: 접두사/접미사 적용
              if (displayText !== '-') {
                displayText = `${cell.textPrefix || ''}${displayText}${cell.textSuffix || ''}`;
              }

              const alignItemClass = cell.textAlign === 'center' ? 'items-center text-center' : cell.textAlign === 'right' ? 'items-end text-right' : 'items-start text-left';
              const textSizeClass = cell.textSize || 'text-[14px]';
              const textWeightClass = cell.textWeight || 'font-black';
              const textColorClass = cell.textColor || 'text-slate-800';

              return (
                <div key={cell.id} style={{ flex: cell.flex }} className={`flex flex-col justify-center min-w-0 overflow-hidden relative border-slate-100/50 p-2.5 ${alignItemClass}`}>
                  <span className={`${textSizeClass} ${textWeightClass} ${textColorClass} break-words leading-snug w-full`}>{displayText}</span>
                </div>
              );
            }

            // ── 액션 버튼 / 중첩 레이아웃 ──
            return (
              <div key={cell.id} style={{ flex: cell.flex }} className="flex flex-col justify-center min-w-0 overflow-hidden relative border-slate-100/50">
                {cell.contentType === 'action' && (() => {
                  const act = actions?.find((a: any) => a.id === cell.contentValue);
                  if (!act) return null;
                  const btnShape = cell.buttonShape || 'square';
                  const shapeClass = btnShape === 'pill' ? 'rounded-full' : btnShape === 'rounded' ? 'rounded-xl' : btnShape === 'none' ? 'rounded-none' : 'rounded-none';
                  const btnAlign = cell.buttonAlign || 'full';
                  const wrapperAlignClass = btnAlign === 'left' ? 'justify-start' : btnAlign === 'right' ? 'justify-end' : btnAlign === 'center' ? 'justify-center' : 'justify-stretch';
                  const btnWidthClass = btnAlign === 'full' ? 'w-full h-full' : 'px-5 py-3';
                  const bStyle = cell.buttonStyle || 'both';
                  const variant = cell.buttonVariant || 'default';
                  const colorKey = cell.buttonColor || 'slate';
                  const ActIcon = act.icon && IconMap[act.icon] ? IconMap[act.icon] : MousePointerClick;

                  const theme = COLOR_THEMES[colorKey] || COLOR_THEMES.slate;
                  
                  let styleClasses = '';
                  let inlineStyles: any = {};

                  if (btnShape === 'none') {
                    styleClasses = `bg-transparent ${theme.textCol} hover:bg-slate-100/50 shadow-none`;
                  } else {
                    switch (variant) {
                      case 'raised':
                        styleClasses = `${theme.bg} ${theme.text} shadow-xl ${theme.shadow} -translate-y-0.5 hover:-translate-y-1 active:translate-y-0 active:shadow-md transition-all`;
                        break;
                      case 'inset':
                        styleClasses = `${theme.bg} ${theme.text} shadow-[inset_0_2px_10px_rgba(0,0,0,0.3)] hover:opacity-90 active:opacity-100 transition-all`;
                        break;
                      case 'outline':
                        styleClasses = `bg-transparent border-2 ${theme.textCol.replace('text-', 'border-')} ${theme.textCol} hover:${theme.bg} hover:text-white transition-all`;
                        break;
                      case '3d':
                        styleClasses = `${theme.bg} ${theme.text} border-b-[4px] ${theme.border} active:border-b-0 active:translate-y-[4px] transition-all`;
                        break;
                      case 'shadow':
                        styleClasses = `${theme.bg} ${theme.text} shadow-2xl ${theme.shadow.replace('shadow-', 'shadow-')} shadow-opacity-40 hover:scale-105 active:scale-95 transition-all`;
                        break;
                      case 'glass':
                        styleClasses = `bg-white/20 backdrop-blur-md border border-white/30 ${theme.textCol} shadow-xl hover:bg-white/30 transition-all`;
                        break;
                      default:
                        styleClasses = `${theme.bg} ${theme.text} shadow-md ${theme.shadow} hover:opacity-90 active:scale-95 transition-all`;
                    }
                  }

                  return (
                    <div className={`w-full h-full flex items-center p-1.5 ${wrapperAlignClass}`}>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onExecuteAction(act, rowData); }} 
                        className={`text-[11px] font-black flex items-center justify-center gap-2 overflow-hidden ${shapeClass} ${btnWidthClass} ${styleClasses}`}
                        style={inlineStyles}
                      >
                        {(bStyle === 'icon' || bStyle === 'both') && <ActIcon size={14} className="shrink-0" />}
                        {(bStyle === 'text' || bStyle === 'both') && <span className="truncate">{act.name}</span>}
                      </button>
                    </div>
                  );
                })()}
                {cell.contentType === 'nested' && cell.nestedRows && <RenderPreviewLayout rows={cell.nestedRows} rowData={rowData} actions={actions} onExecuteAction={onExecuteAction} />}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
