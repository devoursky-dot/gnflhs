"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/supabaseClient';
import { X, CheckCircle2, ChevronLeft, Menu, Home, Layout, Search, ChevronDown, Folder, ChevronsUpDown, ChevronsUp, AlertCircle, Zap, Lock } from 'lucide-react';
import { IconMap } from '@/app/design/picker';
import withAuth from '@/app/withAuth';

// ── 모듈화된 유틸/컴포넌트 import ──
import { THEMES } from './themes';
import {
  evaluateExpression, processMappingValue, applyViewQuery, getSortedGroupKeys, resolveVirtualData, applyClientFilters,
  getKSTDate, getKSTHelpers
} from './utils';
import * as UtilsV1 from '../../engines/v1/utils';
import DefaultRenderer from './renderer';
import { InsertModal, UpdateModal } from './modals';
import { GroupAggregation } from '@/app/design/types';
import dynamic from 'next/dynamic';

// --- 버전별 엔진 컴포넌트 동적 로드 ---
const RenderV1 = dynamic(() => import('../../engines/v1/renderer'));
const InsertModalV1 = dynamic(() => import('../../engines/v1/modals').then(m => m.InsertModal));
const UpdateModalV1 = dynamic(() => import('../../engines/v1/modals').then(m => m.UpdateModal));

// 🔥 [업데이트] 그룹 헤더 Sticky 스타일 계산 헬퍼 (사용자 요청: 2단계 Stacked Sticky 지원)
const getStickyStyles = (isSticky: boolean, showTopBar: boolean, level: number = 1, isParentSticky: boolean = false, headerHeight: number = 64) => {
  if (!isSticky) return "";

  let topClass = "";
  let zIndex = level === 1 ? 'z-30' : 'z-20';

  if (level === 1) {
    topClass = 'top-0';
  } else {
    if (isParentSticky) {
      topClass = `top-[${headerHeight}px]`;
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
      const timer = setTimeout(() => setToast(null), 800); // 🔥 1500 -> 800ms로 단축 (경쾌한 반응성)
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
          setAppData({ ...data, app_config: activeConfig, engine_version: activeConfig?.engine_version || null });
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

  // --- 버전별 엔진 선택 ---
  const CurrentRenderer = appData?.engine_version === 'v1' ? RenderV1 : DefaultRenderer;
  const CurrentInsertModal = appData?.engine_version === 'v1' ? InsertModalV1 : InsertModal;
  const CurrentUpdateModal = appData?.engine_version === 'v1' ? UpdateModalV1 : UpdateModal;

  // --- 🔥 버전별 유틸리티 함수 선택 (독립 실행 핵심) ---
  const isV1 = appData?.engine_version === 'v1';
  const utils = {
    applyViewQuery: isV1 ? UtilsV1.applyViewQuery : applyViewQuery,
    resolveVirtualData: isV1 ? UtilsV1.resolveVirtualData : resolveVirtualData,
    applyClientFilters: isV1 ? UtilsV1.applyClientFilters : applyClientFilters,
    processMappingValue: isV1 ? UtilsV1.processMappingValue : processMappingValue,
    evaluateExpression: isV1 ? UtilsV1.evaluateExpression : evaluateExpression,
    getKSTHelpers: isV1 ? UtilsV1.getKSTHelpers : getKSTHelpers,
    getSortedGroupKeys: isV1 ? UtilsV1.getSortedGroupKeys : getSortedGroupKeys,
  };

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

      let allData: any[] = [];
      let from = 0;
      let step = 1000;
      let hasMore = true;

      while (hasMore) {
        let query: any = supabase.from(fetchTable).select("*");
        query = utils.applyViewQuery(query, view, userProfile);
        const { data, error } = await query.range(from, from + step - 1);
        
        if (error) throw error;
        if (!data || data.length === 0) {
          hasMore = false;
        } else {
          allData = [...allData, ...data];
          if (data.length < step) {
            hasMore = false;
          } else {
            from += step;
          }
        }
      }

      let finalData = allData;
      if (vt && finalData.length > 0) {
        finalData = await utils.resolveVirtualData(finalData, vt);
      }

      finalData = utils.applyClientFilters(finalData, view, userProfile);

      setTableData(prev => ({ ...prev, [view.id]: finalData }));
    } catch (err: any) {
      console.error("Error fetching table data:", err);
      setToast({ message: `데이터 로드 중 오류가 발생했습니다: ${err.message}`, type: 'error' });
      setTableData(prev => ({ ...prev, [view.id]: [] }));
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
      if (m.mappingType === 'card_data') payload[m.targetColumn] = utils.processMappingValue(m.sourceValue, row);
      else if (m.mappingType === 'static') payload[m.targetColumn] = m.sourceValue;
      else if (m.mappingType === 'user_name') payload[m.targetColumn] = userProfile?.name || '';
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
        query = utils.applyViewQuery(query, view, userProfile);
        const { data: rawRows, error: fetchErr } = await query.limit(1000000000000); 
        if (fetchErr) throw fetchErr;

        let sourceRows = rawRows || [];

        if (vt && sourceRows.length > 0) {
          sourceRows = await utils.resolveVirtualData(sourceRows, vt);
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

    const { today: isoToday, tomorrow: isoTomorrow } = utils.getKSTHelpers();

    // 🔥 [수정] 참조 오류 방지를 위해 함수를 먼저 정의
    const rowCountFn = async (t: string, f: Record<string, any> = {}) => {
      const resolvedT = resolveTableName(t) || t;
      
      // 1. 서버에 직접 쿼리 (가장 정확한 최신 데이터 보장)
      try {
        let q = supabase.from(resolvedT).select("*", { count: "exact", head: true });
        Object.entries(f).forEach(([k, v]) => {
          if (v === 'today' || v === isoToday || (typeof v === 'string' && v.includes(isoToday))) {
            q = q.gte(k, isoToday).lt(k, isoTomorrow);
          } else {
            q = q.eq(k, v);
          }
        });
        const { count, error } = await q;
        if (error) {
          console.warn(`⚠️ rowCount Server Query Warning (${resolvedT}):`, error.message || error);
          return 0;
        }
        return count || 0;
      } catch (err) {
        return 0;
      }
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
          if (v.id === currentViewId) {
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
      if (action.smsTargetColumn) phone = rowData[action.smsTargetColumn];
      else if (action.smsPhoneColumn) phone = rowData[action.smsPhoneColumn];
      if (!phone) phone = rowData.phone || rowData.PHONE || rowData['연락처'] || rowData['전화번호'];
      if (!phone) {
        const studentIdentifier = rowData.name || rowData.NAME || rowData.students || rowData.STUDENTS || rowData.student_id || rowData.STUDENT_ID;
        if (studentIdentifier) {
          // 'students' 테이블에서 학생 정보를 찾을 때도 범용적인 식별자 사용
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

      // 🔥 [초고속 모드] 프롬프트가 없고 instantSave가 켜져있으면 모달 없이 즉시 저장
      const hasPrompt = currentStep.insertMappings?.some((m: any) => m.mappingType === 'prompt');
      const isInstant = !!(currentStep.instantSave || currentStep.batchMode);

      if (isInstant && !hasPrompt) {
        setFormData(init);
        (async () => {
          setIsSubmitting(true);
          try {
            const targetTable = resolveTableName(currentStep.insertTableName);
            if (!targetTable) throw new Error("대상 테이블이 없습니다.");
            const { error } = await supabase.from(targetTable).insert([init]);
            if (error) throw error;
            setToast({ message: "즉시 저장 완료", type: 'success' });
            fetchTableData(currentView);
            processNextStep(remaining, rowData);
            evaluateAllViewStates();
          } catch (err: any) {
            setToast({ message: `저장 실패: ${err.message}`, type: 'error' });
          } finally {
            setIsSubmitting(false);
          }
        })();
      } else {
        setFormData(init);
        setIsInputModalOpen(true);
      }

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
      setActiveUpdateAction(currentStep);
      setActiveRowData(rowData);
      const init = buildPayloadFromMappings(currentStep.updateMappings, rowData);

      // 기존 데이터 유지 보강
      currentStep.updateMappings?.forEach((m: any) => {
        if (!init[m.targetColumn] && init[m.targetColumn] !== 0) {
          init[m.targetColumn] = rowData[m.targetColumn] || '';
        }
      });

      const hasPrompt = currentStep.updateMappings?.some((m: any) => m.mappingType === 'prompt');
      const isInstant = !!(currentStep.instantSave || currentStep.batchMode);

      if (isInstant && !hasPrompt) {
        setUpdateFormData(init);
        (async () => {
          setIsUpdating(true);
          try {
            const targetTable = resolveTableName(currentStep.updateTableName);
            if (!targetTable || !rowData.id) throw new Error("대상 데이터가 없습니다.");
            const { error } = await supabase.from(targetTable).update(init).eq('id', rowData.id);
            if (error) throw error;
            setToast({ message: "즉시 수정 완료", type: 'success' });
            fetchTableData(currentView);
            processNextStep(remaining, rowData);
            evaluateAllViewStates();
          } catch (err: any) {
            setToast({ message: `수정 실패: ${err.message}`, type: 'error' });
          } finally {
            setIsUpdating(false);
          }
        })();
      } else {
        setUpdateFormData(init);
        setIsUpdateModalOpen(true);
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
    if (!aggs || aggs.length === 0) return (
      <span 
        style={{ backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-text-muted)' }}
        className="text-[10px] font-black px-2 py-0.5 rounded-full"
      >
        {rows.length}{unitText}
      </span>
    );
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
            else if (agg.type === 'list') val = processed.filter(v => v !== null && v !== undefined).join(', ');
            else if (agg.type === 'unique_list') val = Array.from(new Set(processed.filter(v => v !== null && v !== undefined))).join(', ');
            else if (agg.type === 'first') val = processed[0] || '-';
          }
          const fmt = !isNaN(Number(val)) ? Number(val).toLocaleString() : val;
          return (
            <div 
              key={agg.id} 
              style={{ backgroundColor: 'var(--theme-bg-subtle)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-main)' }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border"
            >
              <span style={{ color: 'var(--theme-text-muted)' }}>{agg.label}:</span>
              <span style={{ color: 'var(--theme-primary)' }}>{fmt}</span>
            </div>
          );
        })}
      </div>
    );
  };

  const displayData = (() => {
    const raw = tableData[currentView?.id || ''] || [];
    if (!searchTerm) return raw;
    return raw.filter((r: any) => Object.values(r).some(v => String(v).toLowerCase().includes(searchTerm.toLowerCase())));
  })();

  const groupedData: Record<string, any> = {};
  if (currentView?.groupByColumn) {
    displayData.forEach((r: any) => {
      const g1 = r[currentView.groupByColumn as string];
      const k1 = (g1 === null || g1 === undefined || g1 === '') ? unclassifiedText : String(g1);
      if (currentView.groupByColumn2) {
        if (!groupedData[k1]) groupedData[k1] = {};
        const g2 = r[currentView.groupByColumn2 as string];
        const k2 = (g2 === null || g2 === undefined || g2 === '') ? unclassifiedText : String(g2);
        if (!groupedData[k1][k2]) groupedData[k1][k2] = [];
        groupedData[k1][k2].push(r);
      } else {
        if (!groupedData[k1]) groupedData[k1] = [];
        groupedData[k1].push(r);
      }
    });
  }

  const groupKeys = utils.getSortedGroupKeys(groupedData, currentView?.groupSortDirection || 'asc');
  const isAllExpanded = groupKeys.length > 0 && groupKeys.every(k => expandedGroups[k]);
  const handleToggleGroups = () => {
    if (isAllExpanded) setExpandedGroups({});
    else {
      const next: any = {};
      groupKeys.forEach((k: string) => {
        next[k] = true;
        if (currentView?.groupByColumn2 && typeof groupedData[k] === 'object') {
          utils.getSortedGroupKeys(groupedData[k], currentView.groupSortDirection2 || 'asc').forEach((sk: string) => next[`${k}|${sk}`] = true);
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

  // ─── 메뉴 노출 로직 (역할 분담) ───
  const allViews = (appData?.app_config?.views || []).filter((v: any) => !viewStates[v.id]?.hidden);

  // [상단/햄버거 역할] top 또는 both 설정된 메뉴들
  const sidebarViews = allViews.filter((v: any) => v.navPosition !== 'hidden' && (v.navPosition === 'top' || v.navPosition === 'both' || !v.navPosition));

  // [하단/사이드바 역할] bottom 또는 both 설정된 메뉴들
  const bottomBarViews = allViews.filter((v: any) => v.navPosition !== 'hidden' && (v.navPosition === 'bottom' || v.navPosition === 'both' || !v.navPosition));

  const navPos = currentView?.navPosition || 'both';

  // 모바일 전용 바 노출 조건 (md:hidden에 의해 데스크탑에서는 숨겨짐)
  const showTopBar = navPos === 'both' || navPos === 'top';
  const showBottomBar = (navPos === 'both' || navPos === 'bottom') && bottomBarViews.length > 0;
  const bottomPb = showBottomBar ? 'pb-20 md:pb-4' : 'pb-4';

  // ─── 테마 엔진 (DB 설정 + 사용자 선택 로컬 스토리지) ───
  const [userThemeId, setUserThemeId] = useState<string | null>(null);
  
  useEffect(() => {
    // 로컬 스토리지에서 사용자 테마 불러오기
    const saved = localStorage.getItem(`theme_${appId}`);
    if (saved) setUserThemeId(saved);
  }, [appId]);

  const activeThemeId = userThemeId || appData?.app_config?.themeId || 'vercel_lite';
  const theme = THEMES[activeThemeId] || THEMES['vercel_lite'];
  
  // CSS 변수 실시간 주입 (완전 자동화된 시멘틱 파이프라인)
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--theme-primary', theme.primary);
    root.style.setProperty('--theme-bg', theme.bg);
    root.style.setProperty('--theme-bg-subtle', theme.bgSubtle);
    root.style.setProperty('--theme-surface', theme.surface);
    root.style.setProperty('--theme-border', theme.border);
    root.style.setProperty('--theme-border-strong', theme.borderStrong);
    root.style.setProperty('--theme-text-main', theme.textMain);
    root.style.setProperty('--theme-text-muted', theme.textMuted);
    root.style.setProperty('--theme-text-on-primary', theme.textOnPrimary);
    root.style.setProperty('--theme-input-bg', theme.inputBg);
    root.style.setProperty('--theme-input-text', theme.inputText);
    root.style.setProperty('--theme-input-placeholder', theme.placeholder);
  }, [theme]);

  const themeColor = theme.primary; 
  const loadingText = appData?.app_config?.loadingText || 'LOADING...';
  const unitText = appData?.app_config?.unitText || '건';
  const unclassifiedText = appData?.app_config?.unclassifiedText || '미분류';

  if (loading) return (
    <div className="h-screen bg-slate-50 flex flex-col items-center justify-center font-black text-slate-300">
      <div className="animate-bounce mb-4">
        <Zap size={48} style={{ color: themeColor }} />
      </div>
      {loadingText}
    </div>
  );

  return (
    <div 
      className="h-screen flex overflow-hidden relative"
      style={{ 
        backgroundColor: 'var(--theme-bg)',
        color: 'var(--theme-text-main)',
        '--primary-color': theme.primary,
        '--bg-color': theme.bg,
        '--surface-color': theme.surface,
        '--border-color': theme.border,
        '--text-main': theme.textMain,
        '--text-muted': theme.textMuted,
        '--input-bg': theme.inputBg,
        '--input-text': theme.inputText,
        '--input-placeholder': theme.placeholder,
      } as any}
    >

      {/* ─── Toast 알림 ─── */}
      {toast && (
        <div 
          style={{ backgroundColor: appData?.app_config?.themeColor || '#4f46e5' }}
          className="fixed top-10 left-1/2 -translate-x-1/2 z-[2000] px-4 py-2 text-white rounded-none shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4"
        >
          {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span className="font-bold text-xs">{toast.message}</span>
        </div>
      )}

      {/* ─── 데스크탑 전용 왼쪽 사이드바 ─── */}
      <div 
        style={{ 
          backgroundColor: 'var(--theme-surface)', 
          borderColor: 'var(--theme-border)',
          color: 'var(--theme-text-main)'
        }}
        className="hidden md:flex md:w-72 lg:w-80 shrink-0 flex-col border-r pt-4 px-4"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex flex-col">
            <span 
              style={{ color: 'var(--theme-primary)' }}
              className="text-[10px] font-black uppercase tracking-widest truncate"
            >
              {appData?.name}
            </span>
            <h1 
              style={{ color: 'var(--theme-text-main)' }}
              className="text-2xl font-black tracking-tighter truncate"
            >
              {currentView?.name}
            </h1>
          </div>
          <button onClick={() => setIsMobileSidebarOpen(true)} className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all">
            <Menu size={24} />
          </button>
        </div>
        <div className="relative mb-3">
          <Search style={{ color: 'var(--theme-text-muted)' }} className="absolute left-3 top-1/2 -translate-y-1/2" size={16} />
          <input 
            value={searchTerm} 
            onChange={e => setSearchTerm(e.target.value)} 
            placeholder="검색..." 
            style={{ 
              backgroundColor: 'var(--theme-input-bg)', 
              color: 'var(--theme-input-text)',
              borderColor: 'transparent'
            }}
            className="w-full pl-9 pr-3 py-2 rounded-none text-xs font-bold border-2 focus:border-[var(--theme-primary)] transition-all outline-none" 
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide pr-2">
          {bottomBarViews.map((v: any) => {
            const Icon = IconMap[v.icon] || Layout;
            const isActive = currentViewId === v.id;
            const st = viewStates[v.id];
            return (
              <button key={v.id} disabled={st?.disabled}
                onClick={() => { setCurrentViewId(v.id); setSearchTerm(''); }}
                style={{ 
                  backgroundColor: isActive ? 'var(--theme-primary)' : 'transparent',
                  color: isActive ? '#fff' : 'var(--theme-text-main)'
                }}
                className={`w-full flex items-center justify-between p-3 rounded-none transition-all ${st?.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-4"><Icon size={20} /> <span className="font-black text-[15px]">{st?.label || v.name}</span></div>
                {st?.disabled && <Lock size={14} />}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── 모바일 슬라이드 드로어 ─── */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={() => setIsMobileSidebarOpen(false)} />
      )}
      <div 
        style={{ backgroundColor: 'var(--theme-surface)', color: 'var(--theme-text-main)', borderColor: 'var(--theme-border)' }}
        className={`fixed inset-y-0 right-0 z-[1200] w-72 border-l flex flex-col pt-6 px-4 transition-transform duration-300 ease-in-out
        ${isMobileSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between mb-5">
          <div>
            <span style={{ color: 'var(--theme-primary)' }} className="text-[10px] font-black uppercase tracking-widest block">{appData?.name}</span>
            <span style={{ color: 'var(--theme-text-main)' }} className="text-lg font-black">전체 메뉴</span>
          </div>
          <button onClick={() => setIsMobileSidebarOpen(false)} style={{ color: 'var(--theme-text-muted)' }} className="p-2 hover:bg-[var(--theme-bg-subtle)] rounded-xl"><X size={20} /></button>
        </div>
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
          {sidebarViews.map((v: any) => {
            const Icon = IconMap[v.icon] || Layout;
            const isActive = currentViewId === v.id;
            const st = viewStates[v.id];
            return (
              <button key={v.id} disabled={st?.disabled}
                onClick={() => { setCurrentViewId(v.id); setSearchTerm(''); setIsMobileSidebarOpen(false); }}
                style={{ 
                  backgroundColor: isActive ? 'var(--theme-primary)' : 'transparent',
                  color: isActive ? 'var(--theme-text-on-primary)' : 'var(--theme-text-main)'
                }}
                className={`w-full flex items-center justify-between p-3 rounded-none transition-all ${st?.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3"><Icon size={20} /><span className="font-black text-[15px]">{st?.label || v.name}</span></div>
                {st?.disabled && <Lock size={14} />}
              </button>
            );
          })}
        </div>

          {/* 테마 설정 섹션 (드로어 하단) */}
          <div style={{ backgroundColor: 'var(--theme-bg-subtle)', borderTopColor: 'var(--theme-border)' }} className="mt-auto py-6 border-t">
            <div className="px-4 mb-4 flex items-center justify-between">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">앱 스타일 커스텀</span>
              <button 
                onClick={() => { localStorage.removeItem(`theme_${appId}`); setUserThemeId(null); }}
                className="text-[10px] text-indigo-500 font-bold hover:underline"
              >
                초기화
              </button>
            </div>
            
            <div className="px-4 space-y-6">
              {/* 라이트 모드 그룹 */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap size={10} className="text-amber-400" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Light Themes</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {Object.values(THEMES).filter(t => t.mode === 'light').map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { localStorage.setItem(`theme_${appId}`, t.id); setUserThemeId(t.id); }}
                      className={`group relative flex flex-col items-center gap-1.5 transition-all ${activeThemeId === t.id ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <div className={`w-10 h-10 rounded-full border-2 overflow-hidden shadow-sm transition-all flex ${activeThemeId === t.id ? 'border-slate-800' : 'border-white'}`}>
                        <div style={{ backgroundColor: t.bg }} className="w-1/2 h-full" />
                        <div style={{ backgroundColor: t.primary }} className="w-1/2 h-full" />
                      </div>
                      <span className={`text-[8px] font-bold truncate w-full text-center ${activeThemeId === t.id ? 'text-slate-900' : 'text-slate-400'}`}>
                        {t.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 다크 모드 그룹 */}
              <div>
                <div className="flex items-center gap-1.5 mb-3">
                  <Zap size={10} className="text-indigo-400" />
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-tight">Dark Themes</span>
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {Object.values(THEMES).filter(t => t.mode === 'dark').map((t) => (
                    <button
                      key={t.id}
                      onClick={() => { localStorage.setItem(`theme_${appId}`, t.id); setUserThemeId(t.id); }}
                      className={`group relative flex flex-col items-center gap-1.5 transition-all ${activeThemeId === t.id ? 'scale-110' : 'opacity-60 hover:opacity-100'}`}
                    >
                      <div className={`w-10 h-10 rounded-full border-2 overflow-hidden shadow-sm transition-all flex ${activeThemeId === t.id ? 'border-slate-800' : 'border-white'}`}>
                        <div style={{ backgroundColor: t.bg }} className="w-1/2 h-full" />
                        <div style={{ backgroundColor: t.primary }} className="w-1/2 h-full" />
                      </div>
                      <span className={`text-[8px] font-bold truncate w-full text-center ${activeThemeId === t.id ? 'text-slate-900' : 'text-slate-400'}`}>
                        {t.name.split(' ')[0]}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="py-4 border-t border-slate-100">
          <button 
            onClick={() => { router.push('/'); setIsMobileSidebarOpen(false); }} 
            style={{ color: 'var(--theme-text-muted)' }}
            className="w-full flex items-center gap-3 p-3 hover:bg-[var(--theme-bg-subtle)] rounded-none font-bold transition-colors"
          >
            <Home size={18} /> 대시보드로 이동
          </button>
        </div>
      </div>

      {/* ─── 메인 콘텐츠 ─── */}
      <div 
        style={{ backgroundColor: 'var(--theme-bg)', color: 'var(--theme-text-main)' }}
        className="flex-1 flex flex-col relative overflow-hidden min-w-0"
      >

        {/* 모바일 전용 상단 헤더바 */}
        {showTopBar && (
          <div 
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            className="md:hidden flex items-center justify-between px-4 py-3 border-b shrink-0"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <h1 className="text-base font-black tracking-tight flex items-center gap-2 truncate">
                {appData.name} <span className="text-slate-300 font-thin mx-0.5">/</span> {viewStates[currentViewId]?.label || currentView.name}
              </h1>
            </div>
            <button onClick={() => setIsMobileSidebarOpen(true)} className="shrink-0 p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
              <Menu size={20} />
            </button>
          </div>
        )}

        {/* 검색바 + 레코드 수 + 그룹 접기/펼치기 */}
        <div className="flex items-center gap-2 px-3 py-2 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
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
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
              className="w-full pl-9 pr-3 py-1.5 border rounded-none text-xs font-bold outline-none focus:border-[var(--theme-primary)] transition-all text-slate-800"
            />
          </div>
          {currentView?.groupByColumn && (
            <button onClick={handleToggleGroups} className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-none text-[10px] font-bold hover:bg-indigo-100 transition-all flex items-center gap-1 border border-indigo-100 shrink-0">
              {isAllExpanded ? <ChevronsUp size={12} /> : <ChevronsUpDown size={12} />} {isAllExpanded ? '접기' : '펼치기'}
            </button>
          )}
          <div 
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-text-muted)' }} 
            className="px-3 py-1.5 border rounded-none text-[10px] font-bold shrink-0 uppercase tracking-tighter"
          >
            {displayData.length} REC
          </div>
        </div>

        {/* 데이터 카드 목록 */}
        <div className={`flex-1 overflow-y-scroll px-1 md:px-6 ${bottomPb} scrollbar-hide`}>
          {currentView?.groupByColumn ? (
            <div className="space-y-4">
              {groupKeys.map((k: string) => {
                const isExp = !!expandedGroups[k];
                const stickyClass = getStickyStyles(currentView?.groupHeaderSticky, showTopBar, 1);
                const subRows = currentView.groupByColumn2 ? groupedData[k] : {};
                const sks = currentView.groupByColumn2 ? utils.getSortedGroupKeys(subRows, currentView.groupSortDirection2 || 'asc') : [];
                const allInG1 = currentView.groupByColumn2 ? Object.values(groupedData[k]).flat() as any[] : groupedData[k] as any[];
                const Icon1 = IconMap[currentView.groupHeaderIcon] || Folder;
                const lbl1 = currentView.groupHeaderExpression
                  ? String(new Function('val', 'rowCount', 'row', 'rows', `try { return ${currentView.groupHeaderExpression}; } catch(e) { return val; }`)(k, allInG1.length, allInG1[0], allInG1))
                  : k;

                return (
                  <div 
                    key={k} 
                    style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                    className="rounded-none border overflow-visible"
                  >
                    <button
                      onClick={() => toggleGroup(k)}
                      style={{ backgroundColor: 'var(--theme-surface)' }}
                      className={`w-full flex items-center justify-between py-2 px-3 min-h-[64px] hover:opacity-80 transition-all ${stickyClass}`}
                    >
                      <div className="flex items-start gap-3">
                        <Icon1 size={18} style={{ color: isExp ? 'var(--theme-primary)' : 'var(--theme-text-muted)' }} className="mt-0.5" />
                        <div className="flex flex-col items-start gap-1 min-w-0">
                          <span style={{ color: 'var(--theme-text-main)' }} className="text-[15px] font-bold text-left break-words">{lbl1}</span>
                          {renderAggregations(allInG1, currentView.groupAggregations)}
                        </div>
                      </div>
                      <ChevronDown size={18} className="text-slate-300 transition-all duration-300 shrink-0 mt-0.5" style={{ transform: isExp ? 'rotate(180deg)' : 'none' }} />
                    </button>
                    {isExp && (
                      <div style={{ backgroundColor: 'var(--theme-bg)', borderColor: 'var(--theme-border)' }} className="border-t p-2 overflow-visible">
                        {currentView.groupByColumn2 ? (
                          sks.map((sk: string) => {
                            const rs = subRows[sk]; const fk = `${k}|${sk}`; const isSkExp = !!expandedGroups[fk];
                            const Icon2 = IconMap[currentView.groupHeaderIcon2] || Folder;
                            const lbl2 = currentView.groupHeaderExpression2
                              ? String(new Function('val', 'rowCount', 'row', 'rows', `try { return ${currentView.groupHeaderExpression2}; } catch(e) { return val; }`)(sk, rs.length, rs[0], rs))
                              : sk;
                            const stickyClass2 = getStickyStyles(currentView?.groupHeaderSticky2, showTopBar, 2, currentView?.groupHeaderSticky);
                            return (
                              <div key={fk} style={{ borderColor: 'var(--theme-primary)' }} className="ml-1 md:ml-4 border-l-2 mb-2 last:mb-0 overflow-visible">
                                <button
                                  onClick={() => toggleGroup(fk)}
                                  style={{ backgroundColor: 'var(--theme-surface)' }}
                                  className={`w-full flex items-center justify-between py-1.5 px-4 hover:opacity-90 rounded-none transition-all ${stickyClass2}`}
                                >
                                  <div className="flex items-start gap-3 text-left">
                                    <Icon2 size={16} style={{ color: isSkExp ? 'var(--theme-primary)' : 'var(--theme-text-muted)' }} className="mt-0.5 shrink-0" />
                                    <div className="flex flex-col items-start gap-1 min-w-0">
                                      <span style={{ color: 'var(--theme-text-main)' }} className="text-sm font-black break-words line-clamp-2 md:line-clamp-none">{lbl2}</span>
                                      {renderAggregations(rs, currentView.groupAggregations2)}
                                    </div>
                                  </div>
                                  <ChevronDown size={18} className="text-slate-300 transition-all shrink-0 mt-0.5" style={{ transform: isSkExp ? 'rotate(180deg)' : 'none' }} />
                                </button>
                                {isSkExp && (
                                  <div className={`grid ${gridClass} gap-1 p-1`}>
                                    {rs.map((r: any) => (
                                      <div 
                                        key={r.id} 
                                        onClick={() => { const ac = appData.app_config.actions.find((a: any) => a.id === currentView.onClickActionId); if (ac) handleAction(ac, r); }} 
                                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                                        className="rounded-none border overflow-hidden hover:border-[var(--theme-primary)] transition-all cursor-pointer"
                                      >
                                        <CurrentRenderer rows={currentView.layoutRows} rowData={r} actions={appData.app_config.actions} onExecuteAction={handleAction} />
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
                              <div 
                                key={r.id} 
                                onClick={() => { const ac = appData.app_config.actions.find((a: any) => a.id === currentView.onClickActionId); if (ac) handleAction(ac, r); }} 
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                                className="rounded-none border overflow-hidden hover:border-[var(--theme-primary)] transition-all cursor-pointer"
                              >
                                <CurrentRenderer rows={currentView.layoutRows} rowData={r} actions={appData.app_config.actions} onExecuteAction={handleAction} />
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
                <div 
                  key={r.id} 
                  onClick={() => { const ac = appData.app_config.actions.find((a: any) => a.id === currentView.onClickActionId); if (ac) handleAction(ac, r); }} 
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  className="rounded-none border overflow-hidden hover:border-[var(--theme-primary)] transition-all cursor-pointer"
                >
                  <CurrentRenderer rows={currentView.layoutRows} rowData={r} actions={appData.app_config.actions} onExecuteAction={handleAction} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 모바일 전용 하단 네비게이션 탭바 */}
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
                  <Icon size={20} strokeWidth={isActive ? 3 : 2} />
                  <span className="text-[9px] font-black uppercase tracking-tighter truncate w-16 text-center">{st?.label || v.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ─── 입력/수정 모달 ─── */}
      <CurrentInsertModal
        isOpen={isInputModalOpen}
        onClose={() => { setIsInputModalOpen(false); setActionQueue([]); }}
        action={activeInsertAction}
        formData={formData}
        setFormData={setFormData}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmitInsert}
      />
      <CurrentUpdateModal
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
