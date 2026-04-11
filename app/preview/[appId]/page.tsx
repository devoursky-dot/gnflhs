// 파일 경로: app/preview/[appId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation'; // useRouter 추가
import { createClient } from '@supabase/supabase-js';
import { X, CheckCircle2, ChevronLeft, Menu, Home, Layout, Search, ChevronDown, Folder, ChevronsUpDown, ChevronsUp, MousePointerClick, Plus, Minus, AlertCircle, Zap, Lock, Star } from 'lucide-react';
import { IconMap } from '@/app/design/picker'; 
import withAuth from '@/app/withAuth'; // 🔥 인증 HOC 임포트 (경로 확인 필요)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || "", 
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ""
);

// 레이아웃 렌더링 컴포넌트 (기존과 동일)
const RenderPreviewLayout = ({ rows, rowData, actions, onExecuteAction }: any) => {
  const isImageUrl = (url: any) => {
    if (typeof url !== 'string') return false;
    return /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(url) || (url.startsWith('http') && url.includes('/storage/v1/object/public/'));
  };

  return (
    <div className="flex flex-col gap-0 w-full h-full flex-1 text-slate-900">
      {rows?.map((row: any) => (
        <div key={row.id} style={{ flex: row.flex || 1 }} className="flex gap-0 w-full items-stretch">
          {row.cells?.map((cell: any) => {
            const cellValue = rowData[cell.contentValue || ''];
            const shouldShowImage = cell.isImage || isImageUrl(cellValue);
            
            if (cell.contentType === 'field' && shouldShowImage) {
              const shapeClass = cell.imageShape === 'circle' ? 'rounded-full aspect-square object-top shadow-sm mx-auto' : cell.imageShape === 'rounded' ? 'rounded-2xl shadow-sm' : 'rounded-none';
              const paddingClass = cell.imageShape === 'circle' ? 'p-3' : cell.imageShape === 'rounded' ? 'p-1.5' : 'p-0';
              return (
                <div key={cell.id} style={{ flex: cell.flex }} className={`flex flex-col justify-center min-w-0 overflow-hidden relative border-slate-100/50 bg-slate-50/30 ${paddingClass}`}>
                  <img src={String(cellValue)} alt="img" className={`object-cover w-full h-full max-h-full ${shapeClass}`} />
                </div>
              );
            }

            if (cell.contentType === 'field' && !shouldShowImage) {
              let displayText = cellValue !== null && cellValue !== undefined && cellValue !== '' ? String(cellValue) : '-';
              
               // 🔥 [개선] 데이터 변환 파이프라인 (수식 -> 정규식 -> 접두사/접미사 순환 적용)
              
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
              
              // 2단계: 정규식 적용 (이미 수식이 적용된 결과물에도 체이닝 가능)
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

                  // 컬러 테마 설정
                  const colorThemes: any = {
                    slate: { bg: 'bg-slate-900', text: 'text-white', border: 'border-slate-800', hover: 'hover:bg-slate-800', light: 'bg-slate-50', textCol: 'text-slate-900', shadow: 'shadow-slate-200' },
                    indigo: { bg: 'bg-indigo-600', text: 'text-white', border: 'border-indigo-700', hover: 'hover:bg-indigo-700', light: 'bg-indigo-50', textCol: 'text-indigo-600', shadow: 'shadow-indigo-200' },
                    blue: { bg: 'bg-blue-600', text: 'text-white', border: 'border-blue-700', hover: 'hover:bg-blue-700', light: 'bg-blue-50', textCol: 'text-blue-600', shadow: 'shadow-blue-200' },
                    emerald: { bg: 'bg-emerald-600', text: 'text-white', border: 'border-emerald-700', hover: 'hover:bg-emerald-700', light: 'bg-emerald-50', textCol: 'text-emerald-600', shadow: 'shadow-emerald-200' },
                    rose: { bg: 'bg-rose-500', text: 'text-white', border: 'border-rose-600', hover: 'hover:bg-rose-600', light: 'bg-rose-50', textCol: 'text-rose-500', shadow: 'shadow-rose-200' },
                    amber: { bg: 'bg-amber-500', text: 'text-white', border: 'border-amber-600', hover: 'hover:bg-amber-600', light: 'bg-amber-50', textCol: 'text-amber-500', shadow: 'shadow-amber-200' },
                    violet: { bg: 'bg-violet-600', text: 'text-white', border: 'border-violet-700', hover: 'hover:bg-violet-700', light: 'bg-violet-50', textCol: 'text-violet-600', shadow: 'shadow-violet-200' },
                    cyan: { bg: 'bg-cyan-500', text: 'text-white', border: 'border-cyan-600', hover: 'hover:bg-cyan-600', light: 'bg-cyan-50', textCol: 'text-cyan-500', shadow: 'shadow-cyan-200' },
                  };

                  const theme = colorThemes[colorKey] || colorThemes.slate;
                  
                  // 스타일 조합 로직
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
};

// 메인 컴포넌트: export default 제거 후 withAuth로 감쌈
function LiveAppPreview({ userProfile }: { userProfile?: any }) {
  const params = useParams();
  const router = useRouter(); // router 추가
  const appId = params?.appId;

  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState<any>(null);
  const [currentViewId, setCurrentViewId] = useState<string>('');
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [activeInsertAction, setActiveInsertAction] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [activeUpdateAction, setActiveUpdateAction] = useState<any>(null);
  const [activeRowData, setActiveRowData] = useState<any>(null);
  const [updateFormData, setUpdateFormData] = useState<Record<string, any>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // 🔥 [신규] 자동화 전용 상태
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationProgress, setAutomationProgress] = useState(0);
  const [automationLog, setAutomationLog] = useState("");

  // 🔥 [신규] 어댑티브 UI 뷰 상태 관리 (노출/비활성화)
  const [viewStates, setViewStates] = useState<Record<string, { hidden: boolean, disabled: boolean, label?: string }>>({});

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  useEffect(() => {
    if (!appId) return;
    async function fetchAppConfig() {
      try {
        const { data } = await supabase.from('apps').select('*').eq('id', appId).single();
        if (data) {
          const urlParams = new URLSearchParams(window.location.search);
          const mode = urlParams.get('mode');
          let activeConfig = mode === 'draft' ? (data.draft_config || data.app_config) : data.app_config;
          
          // 권한 검사 (어드민이 아니고, 퍼블릭이 아니며, 허용된 유저 목록에 없을 때)
          const config = activeConfig || {};
          const isPublic = config.isPublic !== false;
          if (userProfile?.role !== 'admin' && !isPublic) {
            if (!config.allowedUsers || !config.allowedUsers.includes(userProfile?.email)) {
              alert("이 앱에 접근할 권한이 없습니다.");
              router.push('/');
              return;
            }
          }
          
          document.title = mode === 'draft' ? `[Draft] ${data.name}` : data.name;
          setAppData({ ...data, app_config: activeConfig });
          if (activeConfig?.views?.length > 0) {
            const vid = urlParams.get('viewId');
            setCurrentViewId(vid || activeConfig.views[0].id);
          }
        }
      } finally { setLoading(false); }
    }
    fetchAppConfig();
  }, [appId]);

  const currentView = appData?.app_config?.views?.find((v: any) => v.id === currentViewId);

  const fetchTableData = async (view: any) => {
    if (!view || !view.tableName) return;
    let query: any = supabase.from(view.tableName).select("*");
    
    if (view.isLocked && view.lockedKeyColumn && view.lockedRecordKeys?.length > 0) {
      // 🔥 수동 픽 데이터 모드 (고정된 식별자 키 목록으로 조회)
      query = query.in(view.lockedKeyColumn, view.lockedRecordKeys);
    } else if (view.filterColumn && (view.filterValue || view.filterOperator?.includes('null'))) {
      query = applyAdvancedFilter(query, view.filterColumn, view.filterOperator || 'eq', view.filterValue || '');
    }
    
    if (view.sortColumn) query = query.order(view.sortColumn as string, { ascending: view.sortDirection === 'asc' });
    const { data } = await query.limit(3000); 
    if (data) setTableData(prev => ({ ...prev, [view.tableName]: data }));
  };

  useEffect(() => {
    if (currentView) { 
      fetchTableData(currentView); 
      setExpandedGroups({}); 
      evaluateAllViewStates(); // 메뉴 상태 리프레시
      
      // 🔥 [핵심] 뷰 시작 자동화(OnInitAction) 트리거
      if (currentView.onInitActionId) {
        const initAct = appData?.app_config?.actions?.find((a: any) => a.id === currentView.onInitActionId);
        if (initAct) {
           // 이미 자동화 실행 중이거나 무한 루프 방지
           handleInitAutomation(initAct, currentView);
        }
      }
    }
  }, [currentViewId, currentView]);

  const handleInitAutomation = async (action: any, view: any) => {
    // 1. 필요한 데이터 먼저 호출
    if (!view.tableName) return;
    setIsAutomating(true);
    setAutomationProgress(10);
    setAutomationLog(`${view.name} 자동화 시작 중...`);

    try {
      // 뷰 필터링된 데이터 가져오기 (이미 fetchTableData가 있더라도 일관성을 위해 직접 수행)
      let query: any = supabase.from(view.tableName).select("*");
      
      if (view.isLocked && view.lockedKeyColumn && (view.lockedRecordKeys || []).length > 0) {
        // 🔥 [추가] 수동 픽 데이터 모드인 경우 해당 데이터만 처리 대상으로 선정
        query = query.in(view.lockedKeyColumn, view.lockedRecordKeys);
      } else if (view.filterColumn && (view.filterValue || view.filterOperator?.includes('null'))) {
        query = applyAdvancedFilter(query, view.filterColumn, view.filterOperator || 'eq', view.filterValue || '');
      }
      
      const { data: filterRows, error: fetchErr } = await query.limit(500); // 일괄 처리 제한
      if (fetchErr) throw fetchErr;

      setAutomationProgress(40);
      setAutomationLog(`${filterRows?.length || 0}개의 데이터를 분석 중입니다...`);

      if (!filterRows || filterRows.length === 0) {
        setAutomationLog("실행할 대상 데이터가 없습니다.");
        setTimeout(() => { setIsAutomating(false); }, 1000);
        return;
      }

      // 일괄 처리 수행
      if (action.batchMode && (action.type === 'insert_row' || action.type === 'update_row')) {
        const payloads = filterRows.map((row: any) => {
          const mapping = action.type === 'insert_row' ? action.insertMappings : action.updateMappings;
          const payload: any = {};
          mapping?.forEach((m: any) => {
            if (m.mappingType === 'card_data') {
               if (m.isExpression) payload[m.targetColumn] = evaluateExpression(m.sourceValue, row);
               else {
                 const val = m.sourceValue || '';
                 if (val.includes('{{')) payload[m.targetColumn] = val.replace(/{{(.*?)}}/g, (_:string, col:string) => String(row[col.trim()] || ''));
                 else payload[m.targetColumn] = row[val];
               }
            }
            else if (m.mappingType === 'static') payload[m.targetColumn] = m.sourceValue;
            else if (m.mappingType === 'user_name') payload[m.targetColumn] = userProfile?.name || '';
            else if (m.mappingType === 'user_email') payload[m.targetColumn] = userProfile?.email || '';
            
            if (m.valueType === 'number') payload[m.targetColumn] = Number(payload[m.targetColumn]) || 0;
          });
          return payload;
        });

        setAutomationProgress(70);
        setAutomationLog(`데이터 ${payloads.length}건 저장 중...`);

        if (action.type === 'insert_row') {
           const { error: insErr } = await supabase.from(action.insertTableName).insert(payloads);
           if (insErr) throw insErr;
        } else if (action.type === 'update_row') {
           // 업데이트는 ID 기반이므로 upsert를 활용하거나 루프를 돔 (단심화를 위해 upsert 권장하지만 여기선 ID 매칭 필요)
           // 여기서는 row.id가 있는 경우만 지원
           const { error: updErr } = await supabase.from(action.updateTableName).upsert(
             payloads.map((p: any, i: number) => ({ ...p, id: filterRows[i].id }))
           );
           if (updErr) throw updErr;
        }
      } else {
        // 단일 액션인 경우 (Navigate, Alert 등)
        await handleAction(action, filterRows[0]);
      }

      setAutomationProgress(100);
      setAutomationLog("완료되었습니다! 이동 중...");
      
      // 자동화 종료 후 다음 화면 이동 처리
      setTimeout(() => {
        setIsAutomating(false);
        if (action.targetViewId) {
          setCurrentViewId(action.targetViewId);
        }
        evaluateAllViewStates(); // 데이터 변경 후 상태 재계산
      }, 800);

    } catch (err: any) {
      setToast({ message: `자동화 실패: ${err.message}`, type: 'error' });
      setIsAutomating(false);
    }
  };

  // 🧠 [신규] 어댑티브 UI 상태 계산 엔진
  const evaluateAllViewStates = async () => {
    if (!appData?.app_config?.views) return;
    const newStates: Record<string, any> = {};
    
    // 헬퍼 함수 정의
    const now = new Date();
    const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const helpers = {
      rowCount: async (table: string, filter: Record<string, any> = {}) => {
        let q = supabase.from(table).select("*", { count: "exact", head: true });
        Object.entries(filter).forEach(([k, v]) => {
          if (v === 'today') {
            q = q.gte(k, isoToday).lte(k, `${isoToday}T23:59:59`);
          } else {
            q = q.eq(k, v);
          }
        });
        const { count } = await q;
        return count || 0;
      },
      currentUser: () => userProfile,
      isToday: (dateStr: string) => new Date(dateStr).toDateString() === new Date().toDateString()
    };

    // 별칭 추가 (count 사용 가능하게)
    (helpers as any).count = helpers.rowCount;

    for (const v of appData.app_config.views) {
      if (v.visibilityExpr) {
        try {
          // 🧠 비동기 함수 전용 생성기를 사용하여 await가 포함된 수식을 안전하게 실행
          const isMet = await (async () => {
            try {
              const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
              
              // 노코딩 사용자를 위해 count/rowCount 앞에 자동으로 await 추가
              const processedExpr = `${v.visibilityExpr}`.replace(/(?<!await\s+)(count|rowCount)\s*\(/g, 'await $1(');
              
              const fn = new AsyncFunction('helpers', `
                const { rowCount, count, currentUser, isToday } = helpers;
                try {
                  return ${processedExpr};
                } catch {
                  return false;
                }
              `);
              return await fn(helpers);
            } catch (e) {
              console.error(`Visibility Eval Error [${v.id}]:`, e);
              return false;
            }
          })();
          
          if (isMet) {
            newStates[v.id] = {
              hidden: v.visibilityBehavior === 'hide',
              disabled: v.visibilityBehavior === 'disable',
              label: v.disabledLabel
            };
          } else {
            newStates[v.id] = { hidden: false, disabled: false };
          }
        } catch (e) {
          console.error(`Failed to evaluate visibility for view ${v.id}:`, e);
        }
      } else {
        newStates[v.id] = { hidden: false, disabled: false };
      }
    }
    setViewStates(newStates);
  };

  // 🧠 스마트 수식 평가 엔진
  const evaluateExpression = (expr: string, rowData: any) => {
    if (!expr) return '';
    try {
      // 1. {{컬럼명}} 패턴을 context['컬럼명'] 형식으로 변환
      const jsExpr = expr.replace(/{{(.*?)}}/g, (match, col) => {
        const val = rowData[col.trim()];
        // 문자열인 경우 따옴표 처리가 필요할 수 있지만, context 참조 방식으로 넘기면 안전함
        return `context['${col.trim()}']`;
      });

      // 2. Function 생성자를 이용해 샌드박스 실행 (context 주입)
      // rowData에 없는 컬럼 참조 시 undefined 처리되도록 함
      const func = new Function('context', `
        try {
          return ${jsExpr};
        } catch (e) {
          console.error('Expression Eval Error:', e);
          return 'Error: ' + e.message;
        }
      `);
      
      const result = func(rowData || {});
      return result === undefined || result === null ? '' : result;
    } catch (err) {
      console.error('Expression Parse Error:', err);
      return expr; // 파싱 실패 시 원본 반환
    }
  };

  const handleAction = async (action: any, rowData: any) => {
    if (action.type === 'alert') {
      alert(action.message || '알림');
    } else if (action.type === 'navigate') {
      setCurrentViewId(action.targetViewId);
      setSearchTerm(''); setExpandedGroups({});
    } else if (action.type === 'insert_row') {
      setActiveInsertAction(action);
      const initialData: Record<string, any> = {};
      action.insertMappings?.forEach((m: any) => {
        if (m.mappingType === 'card_data') {
          if (m.isExpression) {
            initialData[m.targetColumn] = evaluateExpression(m.sourceValue, rowData);
          } else {
            // 🔥 [개선] 베이직 모드에서도 {{컬럼}} 패턴이 있으면 치환, 없으면 단일 컬럼값으로 처리
            const val = m.sourceValue || '';
            if (val.includes('{{')) {
              initialData[m.targetColumn] = val.replace(/{{(.*?)}}/g, (_: string, col: string) => {
                const rowVal = rowData[col.trim()];
                return rowVal !== undefined && rowVal !== null ? String(rowVal) : '';
              });
            } else {
              initialData[m.targetColumn] = rowData[val];
            }
          }
        }
        else if (m.mappingType === 'static') initialData[m.targetColumn] = m.sourceValue;
        else if (m.mappingType === 'user_name') initialData[m.targetColumn] = userProfile?.name || '';
        else if (m.mappingType === 'user_email') initialData[m.targetColumn] = userProfile?.email || '';
        else if (m.mappingType === 'prompt' && m.valueType === 'number') initialData[m.targetColumn] = m.defaultNumberValue ?? 0;
        else initialData[m.targetColumn] = '';
      });
      setFormData(initialData); setIsInputModalOpen(true);
    } else if (action.type === 'delete_row') {
      if (!action.deleteTableName || !rowData.id) return alert("테이블 설정 또는 대상의 고유 ID가 누락되었습니다.");
      if (!window.confirm("정말로 이 데이터를 영구 삭제하시겠습니까?")) return;
      try {
        const { error } = await supabase.from(action.deleteTableName).delete().eq('id', rowData.id);
        if (error) throw error;
        setToast({ message: "성공적으로 삭제되었습니다.", type: 'success' });
        if (currentView?.tableName === action.deleteTableName) fetchTableData(currentView);
      } catch (err: any) { 
        setToast({ message: `삭제 실패: ${err.message}`, type: 'error' });
      }
    } else if (action.type === 'update_row') {
      if (!action.updateTableName || !rowData.id) return alert("테이블 설정 또는 대상의 고유 ID가 누락되었습니다.");
      setActiveUpdateAction(action); setActiveRowData(rowData);
      const initialData: Record<string, any> = {};
      action.updateMappings?.forEach((m: any) => {
        if (m.mappingType === 'card_data') {
          if (m.isExpression) {
            initialData[m.targetColumn] = evaluateExpression(m.sourceValue, rowData);
          } else {
            // 🔥 [개선] 베이직 모드에서도 {{컬럼}} 패턴이 있으면 치환, 없으면 단일 컬럼값으로 처리
            const val = m.sourceValue || '';
            if (val.includes('{{')) {
              initialData[m.targetColumn] = val.replace(/{{(.*?)}}/g, (_: string, col: string) => {
                const rowVal = rowData[col.trim()];
                return rowVal !== undefined && rowVal !== null ? String(rowVal) : '';
              });
            } else {
              initialData[m.targetColumn] = rowData[val];
            }
          }
        }
        else if (m.mappingType === 'static') initialData[m.targetColumn] = m.sourceValue;
        else if (m.mappingType === 'user_name') initialData[m.targetColumn] = userProfile?.name || '';
        else if (m.mappingType === 'user_email') initialData[m.targetColumn] = userProfile?.email || '';
        else if (m.mappingType === 'prompt' && m.valueType === 'number') initialData[m.targetColumn] = m.defaultNumberValue ?? 0;
        else if (m.mappingType === 'prompt') initialData[m.targetColumn] = rowData[m.targetColumn] !== undefined && rowData[m.targetColumn] !== null ? rowData[m.targetColumn] : '';
      });
      setUpdateFormData(initialData); setIsUpdateModalOpen(true);
    } else if (action.type === 'send_sms') {
      let phone = rowData.phone || rowData.PHONE;
      
      // 전화번호가 현재 테이블에 없을 경우 students 테이블에서 자동 검색
      if (!phone) {
        let findQuery = supabase.from('students').select('phone');
        let canSearch = false;

        const stu = rowData.students || rowData.STUDENTS;
        const stuId = rowData.student_id || rowData.STUDENT_ID;
        const stuName = rowData.name || rowData.NAME;

        if (stu) {
          findQuery = findQuery.eq('students', stu);
          canSearch = true;
        } else if (stuId) {
          findQuery = findQuery.eq('id', stuId);
          canSearch = true;
        } else if (stuName) {
          findQuery = findQuery.eq('name', stuName);
          canSearch = true;
        }

        if (canSearch) {
          const { data, error } = await findQuery.single();
          if (!error && data && data.phone) {
            phone = data.phone;
          }
        }
      }

      let message = action.smsMessageTemplate || '';
      // {{컬럼명}} 템플릿 치환
      message = message.replace(/\{\{\s*(.*?)\s*\}\}/g, (match: string, p1: string) => {
        const val = rowData[p1.trim()];
        return val !== undefined && val !== null ? String(val) : '';
      });

      const targetName = rowData.name || rowData.NAME || rowData.students || rowData.STUDENTS || "대상자";
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      
      const safePhone = phone || "";

      if (isMobile) {
        const confirmMessage = safePhone 
          ? `[${targetName}] 학생의 전화번호(${safePhone})로 문자를 보내시겠습니까?`
          : `[${targetName}] 학생의 전화번호를 찾지 못했습니다.\n문자 앱을 열어 내용만 자동으로 입력하시겠습니까? (수신자는 직접 입력)`;
          
        if (window.confirm(confirmMessage)) {
          const isIOS = navigator.userAgent.match(/iPad|iPhone|iPod/i) != null;
          const separator = isIOS ? '&' : '?';
          window.location.href = `sms:${safePhone}${separator}body=${encodeURIComponent(message)}`;
        }
      } else {
        const confirmMessage = safePhone 
          ? `[PC 환경] [${targetName}] 학생(${safePhone})에게 보낼 문자 내용입니다.\n\n크로샷 등에 사용하기 위해 클립보드에 바로 복사할까요?\n\n─────────────────\n${message}\n─────────────────`
          : `[PC 환경] [${targetName}] 학생의 전화번호를 찾지 못했습니다.\n\n연락처 부분을 비워두고 문자 내용만 클립보드에 복사할까요?\n\n─────────────────\n${message}\n─────────────────`;
          
        if (window.confirm(confirmMessage)) {
          const clipText = safePhone ? `${safePhone}\n\n${message}` : `\n\n${message}`;
          navigator.clipboard.writeText(clipText).catch(() => {
            alert("복사 권한이 없어 실패했습니다. 브라우저 설정을 확인해주세요.");
          });
        }
      }
    }
  };

  // 🧠 [신규] 수동 픽(Manual Pick) 및 잠금 제어 로직
  const toggleRecordPick = (record: any) => {
    if (!currentView) return;
    
    // 식별자 컬럼 결정 (고정 컬럼이 없으면 'id' 사용)
    const keyCol = currentView.lockedKeyColumn || 'id';
    const recordId = String(record[keyCol]);
    
    if (!recordId) {
      setToast({ message: "고유 식별자(ID)가 없는 데이터는 픽할 수 없습니다.", type: 'error' });
      return;
    }

    const currentKeys = currentView.lockedRecordKeys || [];
    const isPicked = currentKeys.includes(recordId);
    let newKeys = [];

    if (isPicked) {
      newKeys = currentKeys.filter((k: string) => k !== recordId);
    } else {
      newKeys = [...currentKeys, recordId];
    }

    // appData 상태 업데이트 (전체 뷰 목록 중 현재 뷰만 수정)
    const updatedViews = appData.app_config.views.map((v: any) => 
      v.id === currentViewId ? { ...v, lockedRecordKeys: newKeys, lockedKeyColumn: keyCol } : v
    );

    setAppData({
      ...appData,
      app_config: { ...appData.app_config, views: updatedViews }
    });
  };

  const toggleViewLock = () => {
    if (!currentView) return;
    
    const isNowLocked = !currentView.isLocked;
    
    if (isNowLocked && (!currentView.lockedRecordKeys || currentView.lockedRecordKeys.length === 0)) {
      setToast({ message: "선택된 데이터가 없습니다. 먼저 별표를 눌러 데이터를 선택하세요.", type: 'error' });
      return;
    }

    const updatedViews = appData.app_config.views.map((v: any) => 
      v.id === currentViewId ? { ...v, isLocked: isNowLocked } : v
    );

    setAppData({
      ...appData,
      app_config: { ...appData.app_config, views: updatedViews }
    });

    setToast({ 
      message: isNowLocked ? "데이터가 고정되었습니다." : "잠금이 해제되었습니다 (전체 데이터 조회).", 
      type: 'success' 
    });
    
    // 잠금 상태 변경 후 데이터 재조회
    setTimeout(() => {
      fetchTableData({ ...currentView, isLocked: isNowLocked });
    }, 100);
  };

  // 🧠 [신규] 노코딩 스타일 지능형 필터 적용 엔진
  const applyAdvancedFilter = (query: any, column: string, operator: string, value: string) => {
    if (!column || !operator) return query;
    const op = operator;
    const val = String(value || '').trim();
    
    // 1단계: 매직 키워드(Semantic Keywords) 처리 - 사용자의 로컬 타임존 반영
    let finalVal: any = val;
    const now = new Date();
    const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    // 날짜 키워드 처리
    if (val === 'today' || val === '오늘') {
      return query.gte(column, isoToday).lte(column, `${isoToday}T23:59:59`);
    }
    if (val === 'yesterday' || val === '어제') {
      const yesterdayDate = new Date();
      yesterdayDate.setDate(now.getDate() - 1);
      const isoYesterday = `${yesterdayDate.getFullYear()}-${String(yesterdayDate.getMonth() + 1).padStart(2, '0')}-${String(yesterdayDate.getDate()).padStart(2, '0')}`;
      return query.gte(column, isoYesterday).lte(column, `${isoYesterday}T23:59:59`);
    }
    if (val === 'this_month' || val === '이번 달') {
      const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
      const lastDayDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const lastDay = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
      return query.gte(column, firstDay).lte(column, `${lastDay}T23:59:59`);
    }
    if (val === 'me' || val === '나') {
      finalVal = userProfile?.email || userProfile?.name || '';
    }

    // 2단계: 연산자별 쿼리 변환
    switch (op) {
      case 'eq': return query.eq(column, finalVal);
      case 'neq': return query.neq(column, finalVal);
      case 'like': 
      case 'contains': return query.ilike(column, `%${finalVal}%`);
      case 'starts': return query.ilike(column, `${finalVal}%`);
      case 'ends': return query.ilike(column, `%${finalVal}`);
      case 'gt': return query.gt(column, finalVal);
      case 'lt': return query.lt(column, finalVal);
      case 'gte': return query.gte(column, finalVal);
      case 'lte': return query.lte(column, finalVal);
      case 'is_null': return query.is(column, null);
      case 'is_not_null': return query.not(column, 'is', null);
      case 'in': 
        const list = finalVal.split(',').map((s: string) => s.trim()).filter((s: string) => s !== '');
        return query.in(column, list);
      case 'between':
        if (finalVal.includes('..')) {
          const [start, end] = finalVal.split('..').map((s: string) => s.trim());
          return query.gte(column, start).lte(column, end);
        }
        return query;
      default: return query.eq(column, finalVal);
    }
  };

  const handleSubmitInsert = async (forcedData?: any) => {
    if (!activeInsertAction || isSubmitting) return;
    
    const needsConfirm = activeInsertAction.requireConfirmation !== false;
    if (needsConfirm && !window.confirm("입력하신 내용을 저장하시겠습니까?")) return;
    
    setIsSubmitting(true);
    try {
      const dataToSave = forcedData || formData;
      const finalPayload = { ...dataToSave };
      activeInsertAction.insertMappings?.forEach((m: any) => { 
        if (m.valueType === 'number') finalPayload[m.targetColumn] = Number(finalPayload[m.targetColumn]) || 0; 
      });
      const { error } = await supabase.from(activeInsertAction.insertTableName).insert([finalPayload]);
      if (error) throw error;
      setToast({ message: "성공적으로 저장되었습니다.", type: 'success' });
      setIsInputModalOpen(false);
      if (currentView?.tableName === activeInsertAction.insertTableName) {
        await fetchTableData(currentView);
        await evaluateAllViewStates();
      }
    } catch (err: any) { 
      setToast({ message: `저장 실패: ${err.message}`, type: 'error' });
    } 
    finally { setIsSubmitting(false); }
  };

  const handleSubmitUpdate = async (forcedData?: any) => {
    if (!activeUpdateAction || isUpdating || !activeRowData) return;
    if (!window.confirm("수정하신 내용을 최종 반영하시겠습니까?")) return;
    setIsUpdating(true);
    try {
      const dataToSave = forcedData || updateFormData;
      const finalPayload = { ...dataToSave };
      activeUpdateAction.updateMappings?.forEach((m: any) => { 
        if (m.valueType === 'number') finalPayload[m.targetColumn] = Number(finalPayload[m.targetColumn]) || 0; 
      });
      const { error } = await supabase.from(activeUpdateAction.updateTableName).update(finalPayload).eq('id', activeRowData.id);
      if (error) throw error;
      setToast({ message: "성공적으로 데이터가 수정되었습니다.", type: 'success' });
      setIsUpdateModalOpen(false);
      if (currentView?.tableName === activeUpdateAction.updateTableName) {
        await fetchTableData(currentView);
        await evaluateAllViewStates();
      }
    } catch (err: any) { 
      setToast({ message: `수정 처리 실패: ${err.message}`, type: 'error' });
    } 
    finally { setIsUpdating(false); }
  };

  const getFilteredData = () => {
    const rawData = tableData[currentView?.tableName || ''] || [];
    if (!searchTerm) return rawData; 
    return rawData.filter((row: any) => Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())));
  };

  const displayData = getFilteredData();
  let groupedData: Record<string, any[]> = {};
  if (currentView?.groupByColumn) {
    displayData.forEach(row => {
      const groupKey = row[currentView.groupByColumn as string];
      const key = (groupKey === null || groupKey === undefined || groupKey === '') ? '미분류' : String(groupKey);
      if (!groupedData[key]) groupedData[key] = [];
      groupedData[key].push(row);
    });
  }

  const toggleGroup = (key: string) => setExpandedGroups(prev => prev[key] ? {} : { [key]: true });
  const groupKeys = Object.keys(groupedData);
  const isAllExpanded = groupKeys.length > 0 && groupKeys.every(k => expandedGroups[k]);
  const handleToggleAllGroups = () => {
    if (isAllExpanded) setExpandedGroups({}); 
    else { const allOpen: Record<string, boolean> = {}; groupKeys.forEach(k => allOpen[k] = true); setExpandedGroups(allOpen); }
  };

  const getGridColsClass = (cols: number) => {
    if (cols === 4) return 'grid-cols-4 lg:grid-cols-8';
    if (cols === 3) return 'grid-cols-3 lg:grid-cols-6';
    if (cols === 2) return 'grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-1 lg:grid-cols-2';
  };
  const gridColsClass = getGridColsClass(currentView?.columnCount || 1);

  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-black text-slate-400">LOADING...</div>;

  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans">
      <div className="w-full bg-slate-50 flex flex-col md:flex-row relative h-screen overflow-hidden">
        
        {/* Toast 메시지 레이어 */}
        {toast && (
          <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[2000] animate-in fade-in slide-in-from-top-4 duration-300">
            <div className={`px-6 py-4 rounded-[1.5rem] shadow-2xl flex items-center gap-3 border backdrop-blur-md ${
              toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400 text-white' : 'bg-rose-500/90 border-rose-400 text-white'
            }`}>
              {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
              <span className="font-black text-sm tracking-tight">{toast.message}</span>
            </div>
          </div>
        )}
        
        {/* Header / Sidebar Area */}
        <div className="pt-6 pb-4 px-5 border-b md:border-r md:border-b-0 bg-white relative z-10 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col shrink-0 md:w-80 lg:w-96 md:h-screen">
          <div className="flex items-center justify-between mb-5">
            <div className="w-10">
              {currentViewId !== appData?.app_config?.views?.[0]?.id && (
                <button onClick={() => { setCurrentViewId(appData.app_config.views[0].id); setSearchTerm(''); setExpandedGroups({}); }} className="p-2 sm:p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"><ChevronLeft size={22} /></button>
              )}
            </div>
            <div className="font-extrabold text-slate-900 text-xl sm:text-2xl truncate flex-1 text-center tracking-tight flex items-center justify-center gap-2">
              {currentView?.name || appData.name}
              {currentView?.tableName && (
                <button 
                  onClick={(e) => { e.stopPropagation(); toggleViewLock(); }} 
                  className={`p-1.5 rounded-lg transition-all ${currentView.isLocked ? 'bg-rose-500 text-white shadow-md shadow-rose-200' : 'bg-slate-100 text-slate-400 hover:text-slate-600'}`}
                  title={currentView.isLocked ? "잠금 해제" : "데이터 고정 (수동 픽)"}
                >
                  <Lock size={16} strokeWidth={currentView.isLocked ? 3 : 2} />
                </button>
              )}
            </div>
            <div className="w-10 text-right relative">
              <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2 sm:p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
                <Menu size={22} />
              </button>
              
              {isMenuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsMenuOpen(false)}></div>
                  <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 z-50 overflow-hidden flex flex-col py-2 animate-in fade-in slide-in-from-top-2">
                    <button 
                      onClick={() => { router.push('/'); setIsMenuOpen(false); }}
                      className="w-full px-4 py-3 text-left flex items-center gap-3 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-bold transition-colors border-b border-slate-100"
                    >
                      <Home size={18} /> 홈으로 이동
                    </button>
                    <div className="px-4 py-2 mt-1 text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">
                      App Views
                    </div>
                    {(appData?.app_config?.views || [])
                      .filter((v: any) => (!v.navPosition || v.navPosition === 'both' || v.navPosition === 'menu') && !viewStates[v.id]?.hidden)
                      .map((v: any) => {
                      const IconComp = v.icon && IconMap[v.icon] ? IconMap[v.icon] : Layout;
                      const isActive = currentViewId === v.id;
                      const state = viewStates[v.id];
                      
                      return (
                        <button 
                          key={`menu-${v.id}`} 
                          disabled={state?.disabled}
                          onClick={() => { setCurrentViewId(v.id); setSearchTerm(''); setExpandedGroups({}); setIsMenuOpen(false); }} 
                          className={`w-full px-4 py-3 text-left flex items-center justify-between font-bold transition-colors ${isActive ? 'text-indigo-600 bg-indigo-50/50' : 'text-slate-600 hover:bg-slate-50'} ${state?.disabled ? 'opacity-50 grayscale cursor-not-allowed italic' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <IconComp size={18} /> <span className="truncate">{v.name}</span>
                          </div>
                          {state?.disabled && state.label && (
                            <span className="text-[9px] font-black bg-slate-200 text-slate-500 px-2 py-1 rounded-lg uppercase tracking-tighter shrink-0">{state.label}</span>
                          )}
                          {state?.disabled && !state.label && <Lock size={12} className="text-slate-300"/>}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
          
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="text" placeholder={currentView?.groupByColumn ? "그룹에서 검색..." : "데이터 검색..."} value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); if (e.target.value !== '' && currentView?.groupByColumn) { const allOpen: Record<string, boolean> = {}; Object.keys(groupedData).forEach(k => allOpen[k] = true); setExpandedGroups(allOpen); } }} className="w-full pl-12 pr-4 py-3 bg-slate-100/80 hover:bg-slate-100 rounded-2xl text-[15px] font-bold outline-none focus:bg-white focus:ring-4 focus:ring-indigo-50 transition-all text-slate-800" />
            </div>
            {currentView?.groupByColumn && groupKeys.length > 0 && (
              <button onClick={handleToggleAllGroups} className="flex items-center justify-center gap-1.5 px-3.5 bg-white border-2 border-slate-100 text-slate-600 rounded-2xl font-black text-xs hover:border-indigo-200 hover:text-indigo-600 hover:bg-indigo-50 transition-all shrink-0">
                {isAllExpanded ? <ChevronsUp size={16} /> : <ChevronsUpDown size={16} />}{isAllExpanded ? '접기' : '펼치기'}
              </button>
            )}
          </div>
          
          {/* Desktop Sidebar Navigation */}
          <div className="hidden md:flex flex-col gap-2 mt-8 flex-1 overflow-y-auto pr-2 pb-8 scrollbar-hide">
            <h3 className="text-[11px] font-black text-slate-300 uppercase tracking-widest pl-3 mb-2 flex items-center gap-2"><Layout size={14}/> App Views</h3>
            {(appData?.app_config?.views || [])
              .filter((v: any) => (!v.navPosition || v.navPosition === 'both' || v.navPosition === 'bottom') && !viewStates[v.id]?.hidden)
              .map((v: any) => {
              const IconComp = v.icon && IconMap[v.icon] ? IconMap[v.icon] : Layout;
              const isActive = currentViewId === v.id;
              const state = viewStates[v.id];
              
              return (
                <button 
                  key={`desktop-${v.id}`} 
                  disabled={state?.disabled}
                  onClick={() => { setCurrentViewId(v.id); setSearchTerm(''); setExpandedGroups({}); }} 
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl transition-all border ${isActive ? 'bg-indigo-50 border-indigo-100 text-indigo-700 font-black shadow-sm' : 'border-transparent text-slate-500 hover:bg-slate-50 font-bold hover:border-slate-200'} ${state?.disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
                >
                  <div className="relative">
                    <IconComp size={22} strokeWidth={isActive ? 3 : 2} className={isActive ? 'text-indigo-600' : 'text-slate-400'} />
                    {state?.disabled && (
                      <div className="absolute -right-1 -top-1 bg-white rounded-full"><Lock size={10} className="text-slate-400"/></div>
                    )}
                  </div>
                  <span className="truncate flex-1 text-left text-[15px]">{v.name}</span>
                  {state?.disabled && state.label && (
                    <span className="text-[10px] font-black bg-slate-100 text-slate-400 px-2 py-1 rounded-lg">{state.label}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 flex flex-col relative overflow-hidden bg-slate-50">
          <div className="flex-1 flex flex-col overflow-hidden pb-24 md:pb-0">
            <div className="w-full flex-1 overflow-y-auto scrollbar-hide flex flex-col">
              {currentView?.groupByColumn ? (
                <div className="flex flex-col pt-0 flex-1">
                  {Object.entries(groupedData).map(([groupKey, rows]) => {
                    const isExpanded = !!expandedGroups[groupKey];
                    return (
                      <div key={groupKey} className="mb-0">
                        <button onClick={() => toggleGroup(groupKey)} className="w-full flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 hover:bg-indigo-50/50 transition-colors">
                          <div className="flex items-center gap-3"><Folder className={isExpanded ? "text-indigo-500" : "text-slate-400"} size={18} /><span className={`text-[15px] font-black ${isExpanded ? 'text-indigo-900' : 'text-slate-700'}`}>{groupKey}</span><span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">{rows.length}건</span></div>
                          <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}><ChevronDown className={isExpanded ? "text-indigo-500" : "text-slate-300"} size={20} /></div>
                        </button>
                        {isExpanded && (
                          <div className={`grid gap-0 bg-slate-50/50 border-b border-slate-200 shadow-inner ${gridColsClass}`}>
                            {rows.map((row, idx) => {
                              const keyCol = currentView.lockedKeyColumn || 'id';
                              const isPicked = currentView.lockedRecordKeys?.includes(String(row[keyCol]));
                              return (
                                <div key={idx} className={`flex flex-col bg-white border-b border-r border-slate-100 overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors relative group/card`} style={{ minHeight: `${currentView?.cardHeight || 120}px` }} onClick={() => { const act = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (act) handleAction(act, row); }}>
                                  <RenderPreviewLayout rows={currentView?.layoutRows || []} rowData={row} actions={appData.app_config.actions} onExecuteAction={handleAction} />
                                  
                                  {/* 수동 픽 별표 버튼 */}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); toggleRecordPick(row); }}
                                    className={`absolute top-2 right-2 p-2 rounded-xl border transition-all z-10 ${isPicked ? 'bg-amber-400 border-amber-300 text-white shadow-md scale-110' : 'bg-white/80 backdrop-blur-sm border-slate-100 text-slate-300 opacity-0 group-hover/card:opacity-100 hover:text-amber-400'}`}
                                  >
                                    <Star size={16} fill={isPicked ? "currentColor" : "none"} strokeWidth={3} />
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={`grid gap-0 flex-1 content-start ${gridColsClass}`}>
                  {displayData.map((row, idx) => {
                    const keyCol = currentView?.lockedKeyColumn || 'id';
                    const isPicked = currentView?.lockedRecordKeys?.includes(String(row[keyCol]));
                    return (
                      <div key={idx} className={`flex flex-col bg-white border-b border-r border-slate-100 overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors relative group/card`} style={{ minHeight: `${currentView?.cardHeight || 120}px` }} onClick={() => { const act = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (act) handleAction(act, row); }}>
                        <RenderPreviewLayout rows={currentView?.layoutRows || []} rowData={row} actions={appData.app_config.actions} onExecuteAction={handleAction} />
                        
                        {/* 수동 픽 별표 버튼 */}
                        <button 
                          onClick={(e) => { e.stopPropagation(); toggleRecordPick(row); }}
                          className={`absolute top-2 right-2 p-2 rounded-xl border transition-all z-10 ${isPicked ? 'bg-amber-400 border-amber-300 text-white shadow-md scale-110' : 'bg-white/80 backdrop-blur-sm border-slate-100 text-slate-300 opacity-0 group-hover/card:opacity-100 hover:text-amber-400'}`}
                        >
                          <Star size={16} fill={isPicked ? "currentColor" : "none"} strokeWidth={3} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
              {displayData.length === 0 && <div className="p-20 text-center flex flex-col items-center gap-3 text-slate-400 mt-10"><Search size={40} className="opacity-20" /><p className="font-bold">조건에 맞는 데이터가 없습니다.</p></div>}
            </div>
          </div>
          
          {/* Mobile Bottom Tab Bar */}
          <div className="h-20 bg-white border-t flex items-center justify-around px-2 absolute bottom-0 w-full z-20 md:hidden shadow-[0_-5px_15px_rgba(0,0,0,0.05)]">
            {(appData?.app_config?.views || [])
              .filter((v: any) => !v.navPosition || v.navPosition === 'both' || v.navPosition === 'bottom')
              .slice(0, 5).map((v: any) => {
              const IconComp = v.icon && IconMap[v.icon] ? IconMap[v.icon] : Layout;
              const isActive = currentViewId === v.id;
              return (
                <button key={`mobile-${v.id}`} onClick={() => { setCurrentViewId(v.id); setSearchTerm(''); setExpandedGroups({}); }} className={`flex-1 flex flex-col items-center gap-1.5 transition-all ${isActive ? 'text-indigo-600 scale-105' : 'text-slate-300 hover:text-slate-500'}`}>
                  <IconComp size={22} strokeWidth={isActive ? 3 : 2} /><span className={`text-[10px] font-black uppercase tracking-tighter truncate w-16 text-center ${isActive ? 'opacity-100' : 'opacity-60'}`}>{v.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 모달 등 나머지 UI (기존과 동일) */}
      {isInputModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><CheckCircle2 className="text-indigo-600" /> 데이터 추가</h3>
              <button onClick={() => setIsInputModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50">
              {activeInsertAction?.insertMappings?.filter((m: any) => m.mappingType === 'prompt').map((mapping: any) => {
                const val = formData[mapping.targetColumn] ?? (mapping.valueType === 'number' ? (mapping.defaultNumberValue ?? 0) : '');
                const isNumber = mapping.valueType === 'number';
                const hasOptions = mapping.promptOptions && mapping.promptOptions.trim() !== '';
                const options = hasOptions ? mapping.promptOptions.split(',').map((o: string) => o.trim()) : [];
                
                return (
                  <div key={mapping.id} className="space-y-3 p-4 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">{mapping.sourceValue || mapping.targetColumn}</label>
                    
                    {isNumber ? (
                      <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <button 
                          onClick={() => setFormData({ ...formData, [mapping.targetColumn]: Number(val) - (mapping.numberStep || 1) })}
                          className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:text-indigo-600 active:scale-90 transition-all border border-slate-100"
                        >
                          <Minus size={20} />
                        </button>
                        <div className="flex-1 text-center">
                          <input 
                            type="number" 
                            value={val} 
                            onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: Number(e.target.value) })}
                            className="w-full bg-transparent text-center text-2xl font-black text-slate-900 outline-none"
                          />
                        </div>
                        <button 
                          onClick={() => setFormData({ ...formData, [mapping.targetColumn]: Number(val) + (mapping.numberStep || 1) })}
                          className="w-12 h-12 flex items-center justify-center bg-indigo-600 rounded-xl shadow-md text-white hover:bg-indigo-700 active:scale-90 transition-all"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    ) : hasOptions ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {options.map((opt: string) => (
                            <button 
                              key={opt}
                              onClick={() => {
                                const updatedData = { ...formData, [mapping.targetColumn]: opt };
                                setFormData(updatedData);
                                
                                // 🔥 [복구] 초고속 모드: 조건 충족 시 즉시 저장
                                const promptMappings = activeInsertAction?.insertMappings?.filter((m: any) => m.mappingType === 'prompt') || [];
                                const isOnlyPrompt = promptMappings.length === 1;
                                const noCustom = !mapping.allowCustomPrompt;
                                if (activeInsertAction?.requireConfirmation === false && isOnlyPrompt && noCustom) {
                                  handleSubmitInsert(updatedData);
                                }
                              }}
                              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${val === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}
                            >
                              {opt}
                            </button>
                          ))}
                          {mapping.allowCustomPrompt && (
                            <button 
                              onClick={() => setFormData({ ...formData, [mapping.targetColumn]: options.includes(val) ? '' : val })}
                              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${!options.includes(val) && val !== '' ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-600 hover:border-rose-200'}`}
                            >
                              기타(직접)
                            </button>
                          )}
                        </div>
                        {(mapping.allowCustomPrompt && (!options.includes(val) || val === '')) && (
                          <input 
                            type="text" 
                            value={options.includes(val) ? '' : val} 
                            onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: e.target.value })}
                            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 transition-all shadow-sm animate-in slide-in-from-top-1" 
                            placeholder="내용을 직접 입력하세요..." 
                          />
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        value={val} 
                        onChange={(e) => setFormData({ ...formData, [mapping.targetColumn]: e.target.value })} 
                        className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 transition-all shadow-sm" 
                        placeholder="내용을 입력하세요..." 
                      />
                    )}
                  </div>
                );
              })}
              {activeInsertAction?.insertMappings?.filter((m: any) => m.mappingType !== 'prompt').length > 0 && <div className="pt-4 border-t border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase italic">* 나머지 설정된 데이터는 백그라운드에서 함께 저장됩니다.</p></div>}
            </div>
            <div className="p-6 bg-white border-t flex gap-3">
              <button onClick={() => setIsInputModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all border border-slate-100">취소</button>
              <button 
                onClick={() => handleSubmitInsert()} 
                disabled={isSubmitting} 
                className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50"
              >
                {isSubmitting ? "저장 중..." : "저장 완료"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isUpdateModalOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-[2rem] shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-300">
            <div className="p-6 border-b flex justify-between items-center bg-white">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-2"><Zap className="text-rose-500" /> 데이터 수정</h3>
              <button onClick={() => setIsUpdateModalOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X /></button>
            </div>
            <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto bg-slate-50">
              {activeUpdateAction?.updateMappings?.filter((m: any) => m.mappingType === 'prompt').map((mapping: any) => {
                const val = updateFormData[mapping.targetColumn] ?? (mapping.valueType === 'number' ? (mapping.defaultNumberValue ?? 0) : '');
                const isNumber = mapping.valueType === 'number';
                const hasOptions = mapping.promptOptions && mapping.promptOptions.trim() !== '';
                const options = hasOptions ? mapping.promptOptions.split(',').map((o: string) => o.trim()) : [];

                return (
                  <div key={mapping.id} className="space-y-3 p-4 bg-white rounded-[1.5rem] border border-slate-100 shadow-sm">
                    <label className="block text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">{mapping.sourceValue || mapping.targetColumn}</label>
                    
                    {isNumber ? (
                      <div className="flex items-center gap-4 bg-slate-50 p-2 rounded-2xl border border-slate-100">
                        <button 
                          onClick={() => setUpdateFormData({ ...updateFormData, [mapping.targetColumn]: Number(val) - (mapping.numberStep || 1) })}
                          className="w-12 h-12 flex items-center justify-center bg-white rounded-xl shadow-sm text-slate-600 hover:text-indigo-600 active:scale-90 transition-all border border-slate-100"
                        >
                          <Minus size={20} />
                        </button>
                        <div className="flex-1 text-center">
                          <input 
                            type="number" 
                            value={val} 
                            onChange={(e) => setUpdateFormData({ ...updateFormData, [mapping.targetColumn]: Number(e.target.value) })}
                            className="w-full bg-transparent text-center text-2xl font-black text-slate-900 outline-none"
                          />
                        </div>
                        <button 
                          onClick={() => setUpdateFormData({ ...updateFormData, [mapping.targetColumn]: Number(val) + (mapping.numberStep || 1) })}
                          className="w-12 h-12 flex items-center justify-center bg-indigo-600 rounded-xl shadow-md text-white hover:bg-indigo-700 active:scale-90 transition-all"
                        >
                          <Plus size={20} />
                        </button>
                      </div>
                    ) : hasOptions ? (
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {options.map((opt: string) => (
                            <button 
                              key={opt}
                              onClick={() => setUpdateFormData({ ...updateFormData, [mapping.targetColumn]: opt })}
                              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${val === opt ? 'bg-indigo-600 border-indigo-600 text-white shadow-md' : 'bg-white border-slate-100 text-slate-600 hover:border-indigo-200'}`}
                            >
                              {opt}
                            </button>
                          ))}
                          {mapping.allowCustomPrompt && (
                            <button 
                              onClick={() => setUpdateFormData({ ...updateFormData, [mapping.targetColumn]: options.includes(val) ? '' : val })}
                              className={`px-4 py-2.5 rounded-xl text-sm font-bold transition-all border-2 ${!options.includes(val) && val !== '' ? 'bg-rose-500 border-rose-500 text-white shadow-md' : 'bg-white border-slate-100 text-slate-600 hover:border-rose-200'}`}
                            >
                              기타(직접)
                            </button>
                          )}
                        </div>
                        {(mapping.allowCustomPrompt && (!options.includes(val) || val === '')) && (
                          <input 
                            type="text" 
                            value={options.includes(val) ? '' : val} 
                            onChange={(e) => setUpdateFormData({ ...updateFormData, [mapping.targetColumn]: e.target.value })}
                            className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 transition-all shadow-sm animate-in slide-in-from-top-1" 
                            placeholder="내용을 직접 입력하세요..." 
                          />
                        )}
                      </div>
                    ) : (
                      <input 
                        type="text" 
                        value={val} 
                        onChange={(e) => setUpdateFormData({ ...updateFormData, [mapping.targetColumn]: e.target.value })} 
                        className="w-full p-4 rounded-2xl border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold text-slate-900 transition-all shadow-sm" 
                        placeholder="수정할 내용을 입력하세요..." 
                      />
                    )}
                  </div>
                );
              })}
              {activeUpdateAction?.updateMappings?.filter((m: any) => m.mappingType !== 'prompt').length > 0 && <div className="pt-4 border-t border-slate-200"><p className="text-[10px] font-bold text-slate-400 uppercase italic">* 나머지 설정된 데이터는 백그라운드에서 함께 수정됩니다.</p></div>}
            </div>
            <div className="p-6 bg-white border-t flex gap-3">
              <button onClick={() => setIsUpdateModalOpen(false)} className="flex-1 py-4 text-slate-500 font-black rounded-2xl hover:bg-slate-100 transition-all border border-slate-100">취소</button>
              <button onClick={() => handleSubmitUpdate()} disabled={isUpdating} className="flex-1 py-4 bg-indigo-600 text-white font-black rounded-2xl shadow-xl hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50">
                {isUpdating ? "수정 중..." : "수정 완료"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden flex justify-center pb-safe bg-white border-t border-slate-100 z-40 fixed bottom-0 left-0 right-0">
        <div className="max-w-md w-full bg-white px-2 pt-2 flex justify-around items-center">
          {(appData?.app_config?.views || [])
            .filter((v: any) => (!v.navPosition || v.navPosition === 'both' || v.navPosition === 'bottom') && !viewStates[v.id]?.hidden)
            .map((v: any) => {
            const IconComp = v.icon && IconMap[v.icon] ? IconMap[v.icon] : Layout;
            const isActive = currentViewId === v.id;
            const state = viewStates[v.id];
            
            return (
              <button 
                key={`nav-${v.id}`} 
                disabled={state?.disabled}
                onClick={() => { setCurrentViewId(v.id); setSearchTerm(''); setExpandedGroups({}); }} 
                className={`flex flex-col items-center gap-1.5 py-2 px-3 rounded-2xl transition-all relative ${isActive ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'} ${state?.disabled ? 'opacity-40 grayscale cursor-not-allowed' : ''}`}
              >
                <div className="relative">
                  <IconComp size={24} strokeWidth={isActive ? 3 : 2} className={isActive ? 'scale-110' : ''} />
                  {state?.disabled && (
                    <div className="absolute -right-1 -top-1 bg-white rounded-full p-0.5 shadow-sm"><Lock size={8} className="text-slate-500"/></div>
                  )}
                </div>
                <span className={`text-[10px] ${isActive ? 'font-black' : 'font-bold'}`}>
                  {state?.disabled && state.label ? state.label : v.name}
                </span>
                {isActive && <div className="absolute -bottom-1 w-1 h-1 bg-indigo-600 rounded-full"></div>}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// 🔥 중요: withAuth로 감싸서 내보내야 차단이 작동합니다.
export default withAuth(LiveAppPreview);
