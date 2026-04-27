// 파일 경로: app/preview/[appId]/renderer.tsx
"use client";

import React from 'react';
import { MousePointerClick } from 'lucide-react';
import { IconMap } from '@/app/design/picker';
// import { LayoutCell, Action, LayoutRow } from './types'; 

// 버튼 컬러 테마 설정
const COLOR_THEMES: any = {
  slate: { bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-800', hover: 'hover:bg-slate-800', light: 'bg-slate-50', textCol: 'text-slate-900', shadow: '' },
  indigo: { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-700', hover: 'hover:bg-indigo-700', light: 'bg-indigo-50', textCol: 'text-indigo-600', shadow: '' },
  blue: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', hover: 'hover:bg-blue-700', light: 'bg-blue-50', textCol: 'text-blue-600', shadow: '' },
  emerald: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700', hover: 'hover:bg-emerald-700', light: 'bg-emerald-50', textCol: 'text-emerald-600', shadow: '' },
  rose: { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-600', hover: 'hover:bg-rose-600', light: 'bg-rose-50', textCol: 'text-rose-500', shadow: '' },
  amber: { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600', hover: 'hover:bg-amber-600', light: 'bg-amber-50', textCol: 'text-amber-500', shadow: '' },
  violet: { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-700', hover: 'hover:bg-violet-700', light: 'bg-violet-50', textCol: 'text-violet-600', shadow: '' },
  cyan: { bg: 'bg-cyan-500', text: 'text-white', border: 'border-cyan-600', hover: 'hover:bg-cyan-600', light: 'bg-cyan-50', textCol: 'text-cyan-500', shadow: '' },
};

// 이미지 URL 판별
const isImageUrl = (url: any) => {
  if (typeof url !== 'string') return false;
  return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || (url.startsWith('http') && url.includes('/storage/v1/object/public/'));
};

export default function RenderPreviewLayout({ rows, rowData, actions, onExecuteAction }: any) {
  return (
    <div 
      style={{ color: 'var(--theme-text-main)' }}
      className="flex flex-col gap-0 w-full h-full flex-1"
    >
      {rows?.map((row: any) => (
        <div key={row.id} style={{ flex: row.flex || 1 }} className="flex gap-0 w-full items-stretch">
          {row.cells?.map((cell: any) => {
            const cellValue = rowData[cell.contentValue || ''];
            const shouldShowImage = cell.isImage || isImageUrl(cellValue);
            
            // ── 이미지 필드 ──
            if (cell.contentType === 'field' && shouldShowImage) {
              const shapeClass = cell.imageShape === 'rounded' ? 'rounded-2xl' : cell.imageShape === 'circle' ? 'rounded-full aspect-square' : 'rounded-none';
              const imgClass = `object-cover w-full h-full ${shapeClass}`;
              const paddingClass = cell.imagePadding || 'p-0';
              return (
                <div key={cell.id} style={{ flex: cell.flex }} className={`flex flex-col justify-center items-center min-w-0 overflow-hidden relative border-slate-100/50 bg-slate-50/30 ${paddingClass}`}>
                  <img src={String(cellValue)} alt="img" className={imgClass} />
                  
                  {/* 🔥 [신규] 이미지 지능형 오버레이 레이어 */}
                  {(() => {
                    let overlayText = "";
                    if (cell.imageOverlayExpression) {
                      try {
                        const evaluator = new Function('val', 'row', `try { return ${cell.imageOverlayExpression}; } catch(e) { return ""; }`);
                        overlayText = String(evaluator(cellValue, rowData));
                      } catch (err) {}
                    }

                    let showBadge = false;
                    if (cell.imageBadgeExpression) {
                      try {
                        const bEvaluator = new Function('val', 'row', `try { return !!(${cell.imageBadgeExpression}); } catch(e) { return false; }`);
                        showBadge = bEvaluator(cellValue, rowData);
                      } catch (err) {}
                    }

                    const BadgeIcon = cell.imageBadgeIcon && IconMap[cell.imageBadgeIcon] ? IconMap[cell.imageBadgeIcon] : null;

                    return (
                      <>
                        {/* 하단 텍스트 오버레이 (텍스트 전용 + 강력한 섀도우) */}
                        {overlayText && (
                          <div className="absolute bottom-1.5 left-0 right-0 flex justify-center px-2 pointer-events-none">
                            <span 
                              className="font-black drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)] drop-shadow-[0_0_1px_rgba(0,0,0,1)] line-clamp-1 max-w-full text-center leading-tight transition-all"
                              style={{ 
                                fontSize: `${cell.imageOverlaySize || 10}px`, 
                                color: cell.imageOverlayColor || '#ffffff' 
                              }}
                            >
                              {overlayText}
                            </span>
                          </div>
                        )}

                        {/* 우측 상단 상태 배지 */}
                        {showBadge && (
                          <div className={`absolute top-2 right-2 ${cell.imageBadgeColor || 'bg-rose-500'} text-white p-1.5 rounded-lg shadow-lg animate-in zoom-in-50 duration-300 border border-white/20`}>
                            {BadgeIcon ? <BadgeIcon size={12} strokeWidth={3} /> : <div className="w-2 h-2 bg-white rounded-full" />}
                          </div>
                        )}
                      </>
                    );
                  })()}
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
              
              // 2단계: 정규식 적용 (디자인 보호를 위해 안전한 방식으로 원복 및 보강)
              if (displayText !== '-' && cell.textRegexPattern) {
                try { 
                  let pattern = cell.textRegexPattern;
                  // 단순 문자열 패턴인 경우 g 플래그 기본 적용
                  const regex = new RegExp(pattern, 'g'); 
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
              
              const isHexColor = cell.textColor?.startsWith('#');
              const isTailwindColor = cell.textColor?.startsWith('text-');
              const isThemePrimary = cell.textColor === 'theme-primary';
              
              const textInlineStyle: React.CSSProperties = isHexColor 
                ? { color: cell.textColor } 
                : (isThemePrimary ? { color: 'var(--theme-primary)' } : (isTailwindColor ? {} : { color: 'var(--theme-text-main)' }));

              return (
                <div key={cell.id} style={{ flex: cell.flex }} className={`flex flex-col justify-center min-w-0 overflow-hidden relative border-slate-100/50 p-0.5 ${alignItemClass}`}>
                  <span 
                    className={`${textSizeClass} ${textWeightClass} ${isTailwindColor ? cell.textColor : ''} break-words leading-tight w-full`}
                    style={textInlineStyle}
                  >
                    {displayText}
                  </span>
                </div>
              );
            }

            // ── 액션 버튼 / 중첩 레이아웃 ──
            return (
              <div key={cell.id} style={{ flex: cell.flex }} className="flex flex-col justify-center min-w-0 overflow-hidden relative border-slate-100/50">
                {cell.contentType === 'action' && (() => {
                  const act = actions?.find((a: any) => a.id === cell.contentValue);
                  if (!act) return null;
                  const shapeClass = 'rounded-none';
                  const btnAlign = cell.buttonAlign || 'full';
                  const wrapperAlignClass = btnAlign === 'left' ? 'justify-start' : btnAlign === 'right' ? 'justify-end' : btnAlign === 'center' ? 'justify-center' : 'justify-stretch';
                  const btnWidthClass = btnAlign === 'full' ? 'w-full h-full' : 'px-3 py-1.5';
                  const bStyle = cell.buttonStyle || 'both';
                  const variant = cell.buttonVariant || 'default';
                  const colorKey = cell.buttonColor || 'slate';
                  const ActIcon = act.icon && IconMap[act.icon] ? IconMap[act.icon] : MousePointerClick;
                  
                  // 디자인 토큰 기반의 동적 버튼 스타일 계산
                  const isOutline = variant === 'outline';
                  const isGhost = shapeClass === 'rounded-none';
                  
                  const btnStyle: React.CSSProperties = {
                    backgroundColor: (isOutline || isGhost) ? 'transparent' : 'var(--theme-primary)',
                    color: (isOutline || isGhost) ? 'var(--theme-primary)' : 'var(--theme-text-on-primary)',
                    borderColor: isOutline ? 'var(--theme-primary)' : 'transparent',
                  };

                  const textColorIsHex = cell.textColor?.startsWith('#');
                  const btnInlineStyle = textColorIsHex ? { color: cell.textColor } : {};

                  return (
                    <div className={`w-full h-full flex items-center p-0.5 ${wrapperAlignClass}`}>
                      <button 
                         onClick={(e) => { e.stopPropagation(); onExecuteAction(act, rowData); }} 
                         className={`${cell.textSize || 'text-[10px]'} ${cell.textWeight || 'font-bold'} flex items-center justify-center gap-1 overflow-hidden transition-all active:scale-95 ${shapeClass} ${btnWidthClass} ${isGhost ? 'hover:bg-[var(--theme-bg-subtle)]' : 'hover:opacity-90'} ${isOutline ? 'border-2' : ''}`}
                         style={{ ...btnStyle, ...btnInlineStyle }}
                      >
                         {(bStyle === 'icon' || bStyle === 'both') && <ActIcon size={cell.textSize?.includes('lg') || cell.textSize?.includes('xl') ? 16 : 12} className="shrink-0" />}
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
