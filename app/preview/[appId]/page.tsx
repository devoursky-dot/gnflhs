"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/supabaseClient';
import { X, CheckCircle2, ChevronLeft, Menu, Home, Layout, Search, ChevronDown, Folder, ChevronsUpDown, ChevronsUp, AlertCircle, Zap, Lock } from 'lucide-react';
import { IconMap } from '@/app/design/picker'; 
import withAuth from '@/app/withAuth';

// ── 모듈화된 유틸/컴포넌트 import ──
import { 
  evaluateExpression, processMappingValue, applyViewQuery, getSortedGroupKeys, resolveVirtualData, applyClientFilters,
  getKSTDate, getKSTHelpers
} from './utils';
import RenderPreviewLayout from './renderer';
import { InsertModal, UpdateModal } from './modals';
import { GroupAggregation } from '@/app/design/types';

// 🔥 [업데이트] 그룹 헤더 Sticky 스타일 계산 헬퍼 (사용자 요청: 2단계 Stacked Sticky 지원)
const getStickyStyles = (isSticky: boolean, showTopBar: boolean, level: number = 1, isParentSticky: boolean = false) => {
  if (!isSticky) return "";
  
  let topClass = "";
  let zIndex = level === 1 ? 'z-30' : 'z-20'; // 1단계가 2단계 위에 오도록 함
  
  if (level === 1) {
    topClass = 'top-0';
  } else {
    // 2단계: 1단계가 Sticky인 경우 1단계 헤더 높이(약 45px)만큼 내려서 고정
    if (isParentSticky) {
      topClass = 'top-[64px] md:top-[64px]';
    } else {
      topClass = 'top-0';
    }
  }
  
  return `sticky ${topClass} ${zIndex} shadow-sm border-b border-slate-100 bg-white`;
};

function LiveAppPreview({ userProfile }: { userProfile?: any }) {
  const params = useParams();
  const router = useRouter();
  const appId = params?.appId;

  // ── 앱 & 뷰 상태 ──
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState<any>(null);
  const [currentViewId, setCurrentViewId] = useState<string>('');
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  
  // ── 모달 상태 ──
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [activeInsertAction, setActiveInsertAction] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [activeUpdateAction, setActiveUpdateAction] = useState<any>(null);
  const [activeRowData, setActiveRowData] = useState<any>(null);
  const [updateFormData, setUpdateFormData] = useState<Record<string, any>>({});
  const [isUpdating, setIsUpdating] = useState(false);
  
  // ── UI 상태 ──
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // ── 자동화 및 어댑티브 상태 ──
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationProgress, setAutomationProgress] = useState(0);
  const [automationLog, setAutomationLog] = useState("");
  const [viewStates, setViewStates] = useState<Record<string, { hidden: boolean, disabled: boolean, label?: string }>>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [actionQueue, setActionQueue] = useState<any[]>([]); // 🔥 [신규] 다단계 동작 큐
  const [pendingRowData, setPendingRowData] = useState<any>(null); // 현재 동작의 기준 데이터

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
    
    try {
      const isVt = view.tableName.startsWith('vt_');
      const vt = isVt ? appData?.app_config?.virtualTables?.find((v: any) => v.id === view.tableName) : null;
      
      if (isVt && !vt) {
        if (appData) {
          console.error("Virtual table definition not found for:", view.tableName);
          setTableData(prev => ({ ...prev, [view.tableName]: [] }));
        }
        return;
      }

      const fetchTable = vt ? vt.baseTableName : view.tableName;
      if (!fetchTable) return;

      let query: any = supabase.from(fetchTable).select("*");
      query = applyViewQuery(query, view, userProfile);
      const { data, error } = await query.limit(3000); 
      
      if (error) throw error;

      let finalData = data || [];
      if (vt && finalData.length > 0) {
        finalData = await resolveVirtualData(finalData, vt);
      }

      finalData = applyClientFilters(finalData, view, userProfile);

      setTableData(prev => ({ ...prev, [view.tableName]: finalData }));
    } catch (err: any) {
      console.error("Error fetching table data:", err);
      setToast({ message: `데이터 로드 중 오류가 발생했습니다: ${err.message}`, type: 'error' });
      setTableData(prev => ({ ...prev, [view.tableName]: [] }));
    }
  };

  useEffect(() => {
    if (currentView) { 
      fetchTableData(currentView); 
      setExpandedGroups({}); 
      if (currentView.onInitActionId) {
        const initAct = appData?.app_config?.actions?.find((a: any) => a.id === currentView.onInitActionId);
        if (initAct) handleInitAutomation(initAct, currentView);
      }
    }
  }, [currentViewId, currentView, userProfile]);

  // 🔥 [중요] 데이터가 변경될 때마다 가시성 수식을 재평가하여 실시간 반응성 확보
  useEffect(() => {
    evaluateAllViewStates();
  }, [currentViewId, appData, tableData]);

  const buildPayloadFromMappings = (mappings: any[] | undefined, row: any): Record<string, any> => {
    const payload: Record<string, any> = {};
    mappings?.forEach((m: any) => {
      if (m.mappingType === 'card_data')       payload[m.targetColumn] = processMappingValue(m.sourceValue, row);
      else if (m.mappingType === 'static')     payload[m.targetColumn] = m.sourceValue;
      else if (m.mappingType === 'user_name')  payload[m.targetColumn] = userProfile?.name || '';
      else if (m.mappingType === 'user_email') payload[m.targetColumn] = userProfile?.email || '';
      else if (m.mappingType === 'prompt') {
        payload[m.targetColumn] = m.valueType === 'number' ? (m.defaultNumberValue ?? 0) : '';
      }
      if (m.valueType === 'number') payload[m.targetColumn] = Number(payload[m.targetColumn]) || 0;
    });
    return payload;
  };

  const resolveTableName = (tableId: string | null | undefined): string | null => {
    if (!tableId) return null;
    if (tableId.startsWith('vt_')) {
      const vt = appData?.app_config?.virtualTables?.find((v: any) => v.id === tableId);
      return vt ? vt.baseTableName : null;
    }
    return tableId;
  };

  const handleInitAutomation = async (action: any, view: any) => {
    setIsAutomating(true);
    setAutomationProgress(10);
    setAutomationLog(`${view.name} 자동화 확인 중...`);

    try {
      const steps = action.steps && action.steps.length > 0 ? action.steps : [action];

      const firstStep = steps[0]; 
      const isBatchMode = !!(firstStep.batchMode || action.batchMode);

      if (isBatchMode && view.tableName) {
        const isVt = view.tableName.startsWith('vt_');
        const vt = isVt ? appData?.app_config?.virtualTables?.find((v: any) => v.id === view.tableName) : null;
        const fetchTable = vt ? vt.baseTableName : view.tableName;

        let query: any = supabase.from(fetchTable).select("*");
        query = applyViewQuery(query, view, userProfile);
        const { data: rawRows, error: fetchErr } = await query.limit(500);
        if (fetchErr) throw fetchErr;

        let sourceRows = rawRows || [];

        if (vt && sourceRows.length > 0) {
          sourceRows = await resolveVirtualData(sourceRows, vt);
        }

        if (sourceRows.length > 0) {
          const stepType = firstStep.type; 
          if (stepType === 'insert_row') {
            const mappings = firstStep.insertMappings;        
            const targetTable = resolveTableName(firstStep.insertTableName); 
            if (targetTable && mappings && mappings.length > 0) {
              const payloads = sourceRows.map((row: any) => buildPayloadFromMappings(mappings, row));
              setAutomationLog(`학생 ${payloads.length}명 배치 중...`);
              
              const { error: insertErr } = await supabase.from(targetTable).insert(payloads);
              
              if (insertErr) {
                console.warn("Insert error during batch automation:", insertErr);
              }
            }
          }
        }

        // 1단계에 targetViewId가 있거나, 다음 단계가 있는 경우 처리
        if (steps.length > 1) {
          const remainingSteps = steps.slice(1);
          await processNextStep(remainingSteps, sourceRows?.[0] || {});
        } else if (firstStep.targetViewId) {
          setCurrentViewId(firstStep.targetViewId);
        }
      } else {
        setAutomationLog("시작 동작 실행 중...");
        await processNextStep(steps, {});
      }

      // 모든 자동화 단계 완료 후 즉시 상태 평가 (감독중... 표시 주역)
      await evaluateAllViewStates();
      setAutomationProgress(100);
      setAutomationLog("완료!");
      setTimeout(() => setIsAutomating(false), 500);

    } catch (err: any) {
      const errorMsg = err instanceof Error ? err.message : JSON.stringify(err);
      setToast({ message: `자동화 오류: ${errorMsg}`, type: 'error' });
      setIsAutomating(false);
    }
  };

  const evaluateAllViewStates = async () => {
    if (!appData?.app_config?.views) return;
    const newStates: Record<string, any> = {};
    
    const { today: isoToday, tomorrow: isoTomorrow } = getKSTHelpers();

    // 🔥 [수정] 참조 오류 방지를 위해 함수를 먼저 정의
    const rowCountFn = async (t: string, f: Record<string, any> = {}) => {
      const resolvedT = resolveTableName(t) || t; 
      let q = supabase.from(resolvedT).select("*", { count: "exact", head: true });
      let filterLog = "";
      Object.entries(f).forEach(([k, v]) => { 
        if (v === 'today' || v === isoToday || (typeof v === 'string' && v.includes(isoToday))) {
          q = q.gte(k, isoToday).lt(k, isoTomorrow); 
          filterLog += `${k} gte ${isoToday} lt ${isoTomorrow} `;
        } else {
          q = q.eq(k, v); 
          filterLog += `${k} eq ${v} `;
        }
      });
      const { count, error } = await q; 
      if (error) {
        console.error(`🔴 Error in rowCount (Table: ${resolvedT}):`, error);
      }
      return count || 0;
    };

    const helpers = {
      today: isoToday,
      tomorrow: isoTomorrow,
      rowCount: rowCountFn,
      count: rowCountFn,
      currentUser: () => userProfile,
      isToday: (d: any) => {
        if (!d) return false;
        // KST 기반의 안전한 날짜 체크 (문자열인 경우 prefix 비교, Date/ISO인 경우 KST 변환 후 비교)
        const dateStr = String(d);
        if (dateStr.startsWith(isoToday)) return true;
        try {
          const kst = new Date(new Date(d).getTime() + 9 * 60 * 60 * 1000).toISOString().split('T')[0];
          return kst === isoToday;
        } catch { return false; }
      }
    };
    for (const v of appData.app_config.views) {
      if (v.visibilityExpr) {
        try {
          let awaitedExpr = v.visibilityExpr
            .replace(/(?<!await\s+)\bcount\s*\(/gi, 'await count(')
            .replace(/(?<!await\s+)\browCount\s*\(/gi, 'await rowCount(');
            
          const asyncFunc = new Function('helpers', `
            const { count, rowCount, currentUser, isToday } = helpers;
            return (async () => {
              try {
                const res = await (${awaitedExpr});
                return res;
              } catch (e) {
                return false;
              }
            })();
          `);
          
          const isMet = await asyncFunc(helpers);
          if (v.id === currentViewId || v.name.includes("감독시작")) {
            console.log(`[상태평가] ${v.name}: ${isMet ? '조건일치(비활성화)' : '조건불일치(활성)'}`);
          }
          newStates[v.id] = isMet ? { 
            hidden: v.visibilityBehavior === 'hide', 
            disabled: v.visibilityBehavior === 'disable', 
            label: v.disabledLabel || '사용 불가'
          } : { hidden: false, disabled: false };
          
        } catch (err: any) {
          console.error(`🔴 가시성 수식 평가 오류 (${v.name}):`, err.message || err);
          newStates[v.id] = { hidden: false, disabled: false };
        }
      } else newStates[v.id] = { hidden: false, disabled: false };
    }
    setViewStates(newStates);
  };

  const handleSmsAction = async (action: any, rowData: any) => {
    try {
      let phone = '';
      if (action.smsPhoneColumn) phone = rowData[action.smsPhoneColumn];
      if (!phone) phone = rowData.phone || rowData.PHONE || rowData['연락처'] || rowData['전화번호'];
      if (!phone) {
        const studentIdentifier = rowData.name || rowData.NAME || rowData.students || rowData.STUDENTS || rowData.student_id || rowData.STUDENT_ID;
        if (studentIdentifier) {
          const { data: studentData } = await supabase.from('students').select('phone').or(`name.eq."${studentIdentifier}",student_id.eq."${studentIdentifier}"`).maybeSingle();
          if (studentData?.phone) phone = studentData.phone;
        }
      }
      let message = action.smsMessageTemplate || '';
      message = message.replace(/{{(.*?)}}/g, (_: string, col: string) => {
        const key = col.trim();
        const val = rowData[key];
        return val !== undefined && val !== null ? String(val) : '';
      });
      if (!phone) {
        const proceed = confirm('대상 학생의 전화번호를 찾을 수 없습니다. 메시지를 클립보드에 복사할까요?');
        if (!proceed) return;
      }
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      if (isMobile && phone) {
        const phoneClean = phone.replace(/[^0-9]/g, '');
        const smsUrl = isIOS ? `sms:${phoneClean}&body=${encodeURIComponent(message)}` : `sms:${phoneClean}?body=${encodeURIComponent(message)}`;
        window.location.href = smsUrl;
      } else {
        if (navigator.clipboard) {
          await navigator.clipboard.writeText(message);
          alert("메시지가 클립보드에 복사되었습니다.\n\n내용:\n" + message);
        } else {
          window.prompt("이 메시지를 복사하여 사용하세요:", message);
        }
      }
    } catch (err: any) {
      alert("문자 전송 처리 중 오류 발생: " + err.message);
    }
  };

  const processNextStep = async (queue: any[], rowData: any) => {
    if (!queue || queue.length === 0) {
      setActionQueue([]);
      setPendingRowData(null);
      return;
    }

    const [currentStep, ...remaining] = queue;
    setActionQueue(remaining);
    setPendingRowData(rowData);

    if (currentStep.type === 'alert') {
      alert(currentStep.message || '알림');
      await processNextStep(remaining, rowData);

    } else if (currentStep.type === 'navigate') {
      if (!currentStep.targetViewId) {
        await processNextStep(remaining, rowData);
        return;
      }
      setCurrentViewId(currentStep.targetViewId);
      setSearchTerm('');
      setExpandedGroups({});
      if (remaining.length > 0) {
        setTimeout(() => processNextStep(remaining, rowData), 100);
      } else {
        await processNextStep(remaining, rowData);
      }

    } else if (currentStep.type === 'insert_row') {
      setActiveInsertAction(currentStep);
      const init = buildPayloadFromMappings(currentStep.insertMappings, rowData);
      currentStep.insertMappings?.forEach((m: any) => {
        if (m.mappingType === 'prompt' && m.valueType !== 'number') {
          init[m.targetColumn] = '';
        }
      });
      setFormData(init);
      setIsInputModalOpen(true);

    } else if (currentStep.type === 'delete_row') {
      const targetTable = resolveTableName(currentStep.deleteTableName);
      if (targetTable && rowData.id) {
        if (window.confirm("삭제하시겠습니까?")) {
          await supabase.from(targetTable).delete().eq('id', rowData.id);
          fetchTableData(currentView);
        }
      }
      await processNextStep(remaining, rowData);

    } else if (currentStep.type === 'update_row') {
      if (currentStep.updateTableName && rowData.id) {
        setActiveUpdateAction(currentStep);
        setActiveRowData(rowData);
        const init = buildPayloadFromMappings(currentStep.updateMappings, rowData);
        currentStep.updateMappings?.forEach((m: any) => {
          if (!init[m.targetColumn] && init[m.targetColumn] !== 0) {
            init[m.targetColumn] = rowData[m.targetColumn] || '';
          }
        });
        setUpdateFormData(init);
        setIsUpdateModalOpen(true);
      } else {
        await processNextStep(remaining, rowData);
      }

    } else if (currentStep.type === 'send_sms') {
      await handleSmsAction(currentStep, rowData);
      await processNextStep(remaining, rowData);
    }
  };

  const handleAction = async (action: any, rowData: any) => {
    const steps = action.steps && action.steps.length > 0 ? action.steps : [action];
    processNextStep(steps, rowData);
  };

  const handleSubmitInsert = async (forced?: any) => {
    if (!activeInsertAction) return; 
    setIsSubmitting(true);
    try {
      const targetTableId = activeInsertAction.insertTableName;
      const targetVt = targetTableId.startsWith('vt_') ? appData?.app_config?.virtualTables?.find((v: any) => v.id === targetTableId) : null;
      const targetTable = targetVt ? targetVt.baseTableName : targetTableId;
      const { error } = await supabase.from(targetTable).insert([forced || formData]);
      if (error) throw error;
      setToast({ message: "성공적으로 저장되었습니다.", type: 'success' });
      setIsInputModalOpen(false); 
      fetchTableData(currentView);
      processNextStep(actionQueue, pendingRowData);
      evaluateAllViewStates();
    } catch (err: any) {
      setToast({ message: `저장 실패: ${err.message}`, type: 'error' });
    } finally { 
      setIsSubmitting(false); 
    }
  };

  const handleSubmitUpdate = async (forced?: any) => {
    if (!activeUpdateAction || !activeRowData) return; 
    setIsUpdating(true);
    try {
      const targetTableId = activeUpdateAction.updateTableName;
      const targetVt = targetTableId.startsWith('vt_') ? appData?.app_config?.virtualTables?.find((v: any) => v.id === targetTableId) : null;
      const targetTable = targetVt ? targetVt.baseTableName : targetTableId;
      const { error } = await supabase.from(targetTable).update(forced || updateFormData).eq('id', activeRowData.id);
      if (error) throw error;
      setToast({ message: "성공적으로 수정되었습니다.", type: 'success' });
      setIsUpdateModalOpen(false); 
      fetchTableData(currentView);
      processNextStep(actionQueue, pendingRowData);
      evaluateAllViewStates();
    } catch (err: any) {
      setToast({ message: `수정 실패: ${err.message}`, type: 'error' });
    } finally { 
      setIsUpdating(false); 
    }
  };

  const renderAggregations = (rows: any[], aggs?: GroupAggregation[]) => {
    if (!aggs || aggs.length === 0) return <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">{rows.length}건</span>;
    return (
      <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto scrollbar-hide max-w-full pb-0.5 whitespace-nowrap">
        {aggs.map((agg: GroupAggregation) => {
          let val: any = 0; if (agg.type === 'count') val = rows.length;
          else if (agg.column) {
            const processed = rows.map((r: any) => {
              if (!agg.conditionValue) return r[agg.column as string];
              try { return new Function('val', 'row', `return ${agg.conditionValue}`)(r[agg.column as string], r); } catch { return false; }
            });
            if (agg.type === 'sum') val = processed.reduce((acc, v) => acc + (Number(v) || 0), 0);
            else if (agg.type === 'avg') val = (processed.reduce((acc, v) => acc + (Number(v) || 0), 0) / (processed.length || 1)).toFixed(1);
            else if (agg.type === 'count_if') val = processed.filter((v: any) => !!v).length;
          }
          const fmt = !isNaN(Number(val)) ? Number(val).toLocaleString() : val;
          return <div key={agg.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${agg.displayStyle === 'text' ? 'text-slate-600' : (agg.color || 'bg-slate-100 text-slate-500 border-slate-200')}`}><span className="opacity-70">{agg.label}:</span><span>{fmt}</span></div>;
        })}
      </div>
    );
  };

  const displayData = (() => {
    const raw = tableData[currentView?.tableName || ''] || [];
    if (!searchTerm) return raw;
    return raw.filter((r: any) => Object.values(r).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase())));
  })();

  const groupedData: Record<string, any> = {};
  if (currentView?.groupByColumn) {
    const deduplicate = (list: any[]) => {
      const map = new Map();
      list.forEach((item: any) => { const uid = item.id || JSON.stringify(item); map.set(uid, item); });
      return Array.from(map.values());
    };
    displayData.forEach((r: any) => {
      const g1 = r[currentView.groupByColumn as string];
      const k1 = (g1 === null || g1 === undefined || g1 === '') ? '미분류' : String(g1);
      if (currentView.groupByColumn2) {
        if (!groupedData[k1]) groupedData[k1] = {};
        const g2 = r[currentView.groupByColumn2 as string];
        const k2 = (g2 === null || g2 === undefined || g2 === '') ? '미분류' : String(g2);
        if (!groupedData[k1][k2]) groupedData[k1][k2] = [];
        groupedData[k1][k2].push(r);
      } else {
        if (!groupedData[k1]) groupedData[k1] = [];
        groupedData[k1].push(r);
      }
    });
    Object.keys(groupedData).forEach((k1: string) => {
      if (currentView.groupByColumn2) {
        Object.keys(groupedData[k1]).forEach((k2: string) => { groupedData[k1][k2] = deduplicate(groupedData[k1][k2]); });
      } else {
        groupedData[k1] = deduplicate(groupedData[k1]);
      }
    });
  }

  const groupKeys = getSortedGroupKeys(groupedData, currentView?.groupSortDirection || 'asc');
  const isAllExpanded = groupKeys.length > 0 && groupKeys.every(k => expandedGroups[k]);
  const handleToggleGroups = () => {
    if (isAllExpanded) setExpandedGroups({});
    else {
      const next: any = {};
      groupKeys.forEach((k: string) => {
        next[k] = true;
        if (currentView?.groupByColumn2 && typeof groupedData[k] === 'object') {
          getSortedGroupKeys(groupedData[k], currentView.groupSortDirection2 || 'asc').forEach((sk: string) => next[`${k}|${sk}`] = true);
        }
      });
      setExpandedGroups(next);
    }
  };

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      if (currentView?.groupAccordionMode === 'single' && !prev[key]) {
        if (key.includes('|')) { const p = key.split('|')[0]; return { [p]: true, [key]: true }; }
        return { [key]: true };
      }
      return { ...prev, [key]: !prev[key] };
    });
  };

  const gridClass = ((c: number) => {
    if (c === 4) return 'grid-cols-4 lg:grid-cols-8';
    if (c === 3) return 'grid-cols-3 lg:grid-cols-6';
    if (c === 2) return 'grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-1 lg:grid-cols-2';
  })(currentView?.columnCount || 1);

  const allViews = (appData?.app_config?.views || []).filter((v: any) => !viewStates[v.id]?.hidden && v.navPosition !== 'hidden');
  const sidebarViews = allViews.filter((v: any) => !v.navPosition || v.navPosition === 'both' || v.navPosition === 'top' || v.navPosition === 'menu');
  const bottomBarViews = allViews.filter((v: any) => !v.navPosition || v.navPosition === 'both' || v.navPosition === 'bottom');

  const navPos = currentView?.navPosition || 'both';
  const showTopBar = sidebarViews.length > 0 && navPos !== 'hidden';
  const showBottomBar = bottomBarViews.length > 0 && navPos !== 'hidden';
  const bottomPb = showBottomBar ? 'pb-20' : 'pb-4';

  if (loading) return <div className="h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300">LOADING...</div>;

  return (
    <div className="h-screen bg-white flex overflow-hidden relative">

      {/* ─── Toast 알림 ─── */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[2000] px-4 py-2 bg-indigo-600 text-white rounded-none shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
           {toast.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
           <span className="font-bold text-xs">{toast.message}</span>
        </div>
      )}

      {/* ─── 데스크탑 전용 왼쪽 사이드바 ─── */}
      <div className="hidden md:flex md:w-72 lg:w-80 shrink-0 flex-col bg-white border-r pt-4 px-4">
        <div className="flex items-center justify-between mb-4">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{appData?.name}</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{currentView?.name}</h1>
           </div>
           <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
             <Menu size={24}/>
           </button>
        </div>
        <div className="relative mb-3">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
           <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="검색..." className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-none text-xs font-bold border-2 border-transparent focus:border-indigo-500 transition-all outline-none"/>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide pr-2">
           {sidebarViews.map((v: any) => {
              const Icon = IconMap[v.icon] || Layout;
              const isActive = currentViewId === v.id;
              const st = viewStates[v.id];
              return (
                <button key={v.id} disabled={st?.disabled}
                  onClick={() => { setCurrentViewId(v.id); setSearchTerm(''); }}
                  className={`w-full flex items-center justify-between p-3 rounded-none transition-all ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'} ${st?.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                   <div className="flex items-center gap-4"><Icon size={20}/> <span className="font-black text-[15px]">{st?.label || v.name}</span></div>
                   {st?.disabled && <Lock size={14}/>}
                </button>
              );
           })}
        </div>
      </div>

      {/* ─── 모바일 슬라이드 드로어 ─── */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileSidebarOpen(false)}/>
      )}
      <div className={`fixed inset-y-0 right-0 z-[1200] w-72 bg-white border-l flex flex-col pt-6 px-4 transition-transform duration-300 ease-in-out md:hidden
        ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block">{appData?.name}</span>
            <span className="text-lg font-black text-slate-800">전체 메뉴</span>
          </div>
          <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-xl"><X size={20}/></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
          {sidebarViews.map((v: any) => {
            const Icon = IconMap[v.icon] || Layout;
            const isActive = currentViewId === v.id;
            const st = viewStates[v.id];
            return (
              <button key={v.id} disabled={st?.disabled}
                onClick={() => { setCurrentViewId(v.id); setSearchTerm(''); setIsMobileSidebarOpen(false); }}
                className={`w-full flex items-center justify-between p-3 rounded-none transition-all ${isActive ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:bg-slate-50'} ${st?.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3"><Icon size={20}/><span className="font-black text-[15px]">{st?.label || v.name}</span></div>
                {st?.disabled && <Lock size={14}/>}
              </button>
            );
          })}
        </div>
        <div className="py-4 border-t border-slate-100">
          <button onClick={() => { router.push('/'); setIsMobileSidebarOpen(false); }} className="w-full flex items-center gap-3 p-3 text-slate-500 hover:bg-slate-50 rounded-none font-bold">
            <Home size={18}/> 대시보드로 이동
          </button>
        </div>
      </div>

      {/* ─── 메인 콘텐츠 ─── */}
      <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden min-w-0">

        {/* 모바일 상단 헤더바 */}
        {showTopBar && (
          <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-slate-100 shrink-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-base font-black text-slate-800 tracking-tight flex items-center gap-2 truncate">
                {appData.name} <span className="text-slate-300 font-thin mx-0.5">/</span> {viewStates[currentViewId]?.label || currentView.name}
              </h1>
            </div>
            <button onClick={() => setIsMobileSidebarOpen(true)} className="shrink-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
              <Menu size={20}/>
            </button>
          </div>
        )}

        {/* 검색바 + 레코드 수 + 그룹 접기/펼치기 */}
        <div className="flex items-center gap-2 px-3 py-2 shrink-0">
           <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14}/>
              <input 
                type="text" 
                placeholder={currentView?.groupByColumn ? "그룹에서 검색..." : "데이터 검색..."} 
                value={searchTerm} 
                onChange={(e) => { 
                   setSearchTerm(e.target.value); 
                   if (e.target.value !== '' && currentView?.groupByColumn) {
                     const allOpen: Record<string, boolean> = {}; 
                     groupKeys.forEach((k: string) => allOpen[k] = true); 
                     setExpandedGroups(allOpen); 
                   } 
                }} 
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-none text-xs font-bold outline-none focus:border-indigo-500 transition-all text-slate-800"
              />
           </div>
           {currentView?.groupByColumn && (
             <button onClick={handleToggleGroups} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-none text-[10px] font-bold hover:bg-indigo-100 transition-all flex items-center gap-1 border border-indigo-100 shrink-0">
               {isAllExpanded ? <ChevronsUp size={12}/> : <ChevronsUpDown size={12}/>} {isAllExpanded ? '접기' : '펼치기'}
             </button>
           )}
           <div className="px-3 py-1.5 bg-white border border-slate-200 rounded-none text-[10px] font-bold text-slate-400 shrink-0 uppercase tracking-tighter">{displayData.length} REC</div>
        </div>

        {/* 데이터 카드 목록 */}
        <div className={`flex-1 overflow-y-scroll px-1 md:px-6 ${bottomPb} scrollbar-hide`}>
           {currentView?.groupByColumn ? (
             <div className="space-y-4">
               {groupKeys.map((k: string) => {
                 const isExp = !!expandedGroups[k];
                 const stickyClass = getStickyStyles(currentView?.groupHeaderSticky, showTopBar, 1);
                 const subRows = currentView.groupByColumn2 ? groupedData[k] : {};
                 const sks = currentView.groupByColumn2 ? getSortedGroupKeys(subRows, currentView.groupSortDirection2 || 'asc') : [];
                 const allInG1 = currentView.groupByColumn2 ? Object.values(groupedData[k]).flat() as any[] : groupedData[k] as any[];
                 const Icon1 = IconMap[currentView.groupHeaderIcon] || Folder;
                 const lbl1 = currentView.groupHeaderExpression ? String(new Function('val','rowCount', `return ${currentView.groupHeaderExpression}`)(k, allInG1.length)) : k;

                 return (
                   <div key={k} className="bg-white rounded-none border border-slate-200 overflow-visible">
                     <button 
                        onClick={() => toggleGroup(k)} 
                        className={`w-full flex items-center justify-between py-2 px-3 min-h-[64px] hover:bg-slate-50 transition-all ${stickyClass}`}
                      >
                       <div className="flex items-start gap-3">
                         <Icon1 size={18} className={`mt-0.5 ${isExp ? 'text-indigo-600' : 'text-slate-300'}`}/>
                         <div className="flex flex-col items-start gap-1 min-w-0">
                           <span className={`text-[15px] font-bold text-left break-words ${isExp ? 'text-slate-900' : 'text-slate-600'}`}>{lbl1}</span>
                           {renderAggregations(allInG1, currentView.groupAggregations)}
                         </div>
                       </div>
                       <ChevronDown size={18} className={`text-slate-300 transition-all duration-300 shrink-0 mt-0.5 ${isExp ? 'rotate-180' : ''}`}/>
                     </button>
                     {isExp && (
                       <div className="bg-slate-50/50 border-t border-slate-100 p-2 overflow-visible">
                         {currentView.groupByColumn2 ? (
                           sks.map((sk: string) => {
                             const rs = subRows[sk]; const fk = `${k}|${sk}`; const isSkExp = !!expandedGroups[fk];
                             const Icon2 = IconMap[currentView.groupHeaderIcon2] || Folder;
                             const lbl2 = currentView.groupHeaderExpression2 ? String(new Function('val','rowCount', `return ${currentView.groupHeaderExpression2}`)(sk, rs.length)) : sk;
                             const stickyClass2 = getStickyStyles(currentView?.groupHeaderSticky2, showTopBar, 2, currentView?.groupHeaderSticky);
                             return (
                               <div key={fk} className="ml-1 md:ml-4 border-l-2 border-indigo-100 mb-2 last:mb-0 overflow-visible">
                                 <button 
                                    onClick={() => toggleGroup(fk)} 
                                    className={`w-full flex items-center justify-between py-1.5 px-4 hover:bg-white rounded-none transition-all ${stickyClass2}`}
                                 >
                                   <div className="flex items-start gap-3 text-left">
                                     <Icon2 size={16} className={`mt-0.5 shrink-0 ${isSkExp ? 'text-indigo-500' : 'text-slate-300'}`}/>
                                     <div className="flex flex-col items-start gap-1 min-w-0">
                                       <span className="text-sm font-black text-slate-600 break-words line-clamp-2 md:line-clamp-none">{lbl2}</span>
                                       {renderAggregations(rs, currentView.groupAggregations2)}
                                     </div>
                                   </div>
                                   <ChevronDown size={18} className={`text-slate-300 transition-all shrink-0 mt-0.5 ${isSkExp ? 'rotate-180' : ''}`}/>
                                 </button>
                                 {isSkExp && (
                                   <div className={`grid ${gridClass} gap-1 p-1`}>
                                     {rs.map((r: any) => (
                                       <div key={r.id} onClick={() => { const ac = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (ac) handleAction(ac, r); }} className="bg-white rounded-none border border-slate-100 overflow-hidden hover:border-indigo-300 transition-all cursor-pointer">
                                         <RenderPreviewLayout rows={currentView.layoutRows} rowData={r} actions={appData.app_config.actions} onExecuteAction={handleAction}/>
                                       </div>
                                     ))}
                                   </div>
                                 )}
                               </div>
                             );
                           })
                         ) : (
                           <div className={`grid ${gridClass} gap-1`}>
                             {groupedData[k].map((r: any) => (
                               <div key={r.id} onClick={() => { const ac = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (ac) handleAction(ac, r); }} className="bg-white rounded-none border border-slate-100 overflow-hidden hover:border-indigo-300 transition-all cursor-pointer">
                                 <RenderPreviewLayout rows={currentView.layoutRows} rowData={r} actions={appData.app_config.actions} onExecuteAction={handleAction}/>
                               </div>
                             ))}
                           </div>
                         )}
                       </div>
                     )}
                   </div>
                 );
               })}
             </div>
           ) : (
             <div className={`grid ${gridClass} gap-1`}>
               {displayData.map((r: any) => (
                 <div key={r.id} onClick={() => { const ac = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (ac) handleAction(ac, r); }} className="bg-white rounded-none border border-slate-100 overflow-hidden hover:border-indigo-300 transition-all cursor-pointer">
                   <RenderPreviewLayout rows={currentView.layoutRows} rowData={r} actions={appData.app_config.actions} onExecuteAction={handleAction}/>
                 </div>
               ))}
             </div>
           )}
        </div>

        {/* 하단 네비게이션 탭바 */}
        {showBottomBar && (
          <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-slate-100 flex items-center justify-around px-2 z-[1100] shadow-[0_-4px_10px_rgba(0,0,0,0.03)]">
            {bottomBarViews.slice(0, 5).map((v: any) => {
              const Icon = IconMap[v.icon] || Layout;
              const isActive = currentViewId === v.id;
              const st = viewStates[v.id];
              return (
                <button key={v.id} disabled={st?.disabled}
                  onClick={() => { setCurrentViewId(v.id); setSearchTerm(''); }}
                  className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'text-indigo-600 scale-110' : 'text-slate-400'} ${st?.disabled ? 'opacity-30' : ''}`}
                >
                  <Icon size={20} strokeWidth={isActive ? 3 : 2}/>
                  <span className="text-[9px] font-black uppercase tracking-tighter truncate w-16 text-center">{st?.label || v.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 입력/수정 모달 ─── */}
      <InsertModal 
        isOpen={isInputModalOpen} 
        onClose={() => { setIsInputModalOpen(false); setActionQueue([]); }} 
        action={activeInsertAction} 
        formData={formData} 
        setFormData={setFormData} 
        isSubmitting={isSubmitting} 
        onSubmit={handleSubmitInsert}
      />
      <UpdateModal 
        isOpen={isUpdateModalOpen} 
        onClose={() => { setIsUpdateModalOpen(false); setActionQueue([]); }} 
        action={activeUpdateAction} 
        rowData={activeRowData} 
        formData={updateFormData} 
        setFormData={setUpdateFormData} 
        isUpdating={isUpdating} 
        onSubmit={handleSubmitUpdate}
      />
    </div>
  );
}

export default withAuth(LiveAppPreview);
