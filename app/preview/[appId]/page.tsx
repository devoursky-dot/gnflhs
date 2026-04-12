// 파일 경로: app/preview/[appId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/supabaseClient';
import { X, CheckCircle2, ChevronLeft, Menu, Home, Layout, Search, ChevronDown, Folder, ChevronsUpDown, ChevronsUp, MousePointerClick, Plus, Minus, AlertCircle, Zap, Lock } from 'lucide-react';
import { IconMap } from '@/app/design/picker'; 
import withAuth from '@/app/withAuth';

// ── 모듈화된 유틸/컴포넌트 import ──
import { processMappingValue, applyAdvancedFilter } from './utils';
import RenderPreviewLayout from './renderer';
import { InsertModal, UpdateModal } from './modals';
import { GroupAggregation } from '@/app/design/types';

function LiveAppPreview({ userProfile }: { userProfile?: any }) {
  const params = useParams();
  const router = useRouter();
  const appId = params?.appId;

  // ── 앱 & 뷰 상태 ──
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState<any>(null);
  const [currentViewId, setCurrentViewId] = useState<string>('');
  const [tableData, setTableData] = useState<Record<string, any[]>>({});
  
  // ── Insert 모달 상태 ──
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [activeInsertAction, setActiveInsertAction] = useState<any>(null);
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Update 모달 상태 ──
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
  
  // ── 자동화 상태 ──
  const [isAutomating, setIsAutomating] = useState(false);
  const [automationProgress, setAutomationProgress] = useState(0);
  const [automationLog, setAutomationLog] = useState("");

  // ── 어댑티브 UI 상태 ──
  const [viewStates, setViewStates] = useState<Record<string, { hidden: boolean, disabled: boolean, label?: string }>>({});

  // ── Toast 자동 닫기 ──
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 1500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // ══════════════════════════════════════════════════
  //  앱 설정 로드
  // ══════════════════════════════════════════════════
  useEffect(() => {
    if (!appId) return;
    async function fetchAppConfig() {
      try {
        const { data } = await supabase.from('apps').select('*').eq('id', appId).single();
        if (data) {
          const urlParams = new URLSearchParams(window.location.search);
          const mode = urlParams.get('mode');
          let activeConfig = mode === 'draft' ? (data.draft_config || data.app_config) : data.app_config;
          
          // 권한 검사
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

  // ══════════════════════════════════════════════════
  //  데이터 패칭
  // ══════════════════════════════════════════════════
  const fetchTableData = async (view: any) => {
    if (!view || !view.tableName) return;
    let query: any = supabase.from(view.tableName).select("*");
    
    if (view.lockedKeyColumn && view.lockedRecordKeys?.length > 0) {
      query = query.in(view.lockedKeyColumn, view.lockedRecordKeys);
    } else if (view.filterColumn && (view.filterValue || view.filterOperator?.includes('null'))) {
      query = applyAdvancedFilter(query, view.filterColumn, view.filterOperator || 'eq', view.filterValue || '', userProfile);
    }
    
    if (view.sortColumn) query = query.order(view.sortColumn as string, { ascending: view.sortDirection === 'asc' });
    const { data } = await query.limit(3000); 
    if (data) setTableData(prev => ({ ...prev, [view.tableName]: data }));
  };

  useEffect(() => {
    if (currentView) { 
      fetchTableData(currentView); 
      setExpandedGroups({}); 
      evaluateAllViewStates();
      
      // 뷰 시작 자동화(OnInitAction) 트리거
      if (currentView.onInitActionId) {
        const initAct = appData?.app_config?.actions?.find((a: any) => a.id === currentView.onInitActionId);
        if (initAct) handleInitAutomation(initAct, currentView);
      }
    }
  }, [currentViewId, currentView]);

  // ══════════════════════════════════════════════════
  //  자동화 엔진
  // ══════════════════════════════════════════════════
  const handleInitAutomation = async (action: any, view: any) => {
    if (!view.tableName) return;
    setIsAutomating(true);
    setAutomationProgress(10);
    setAutomationLog(`${view.name} 자동화 시작 중...`);

    try {
      let query: any = supabase.from(view.tableName).select("*");
      
      if (view.lockedKeyColumn && (view.lockedRecordKeys || []).length > 0) {
        query = query.in(view.lockedKeyColumn, view.lockedRecordKeys);
      } else if (view.filterColumn && (view.filterValue || view.filterOperator?.includes('null'))) {
        query = applyAdvancedFilter(query, view.filterColumn, view.filterOperator || 'eq', view.filterValue || '', userProfile);
      }
      
      const { data: filterRows, error: fetchErr } = await query.limit(500);
      if (fetchErr) throw fetchErr;

      setAutomationProgress(40);
      setAutomationLog(`${filterRows?.length || 0}개의 데이터를 분석 중입니다...`);

      if (!filterRows || filterRows.length === 0) {
        setAutomationLog("실행할 대상 데이터가 없습니다.");
        setTimeout(() => { setIsAutomating(false); }, 1000);
        return;
      }

      if (action.batchMode && (action.type === 'insert_row' || action.type === 'update_row')) {
        const payloads = filterRows.map((row: any) => {
          const mapping = action.type === 'insert_row' ? action.insertMappings : action.updateMappings;
          const payload: any = {};
          mapping?.forEach((m: any) => {
            if (m.mappingType === 'card_data') {
               payload[m.targetColumn] = processMappingValue(m.sourceValue, row);
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
           const { error: updErr } = await supabase.from(action.updateTableName).upsert(
             payloads.map((p: any, i: number) => ({ ...p, id: filterRows[i].id }))
           );
           if (updErr) throw updErr;
        }
      } else {
        await handleAction(action, filterRows[0]);
      }

      setAutomationProgress(100);
      setAutomationLog("완료되었습니다! 이동 중...");
      
      setTimeout(() => {
        setIsAutomating(false);
        if (action.targetViewId) setCurrentViewId(action.targetViewId);
        evaluateAllViewStates();
      }, 800);

    } catch (err: any) {
      setToast({ message: `자동화 실패: ${err.message}`, type: 'error' });
      setIsAutomating(false);
    }
  };

  // ══════════════════════════════════════════════════
  //  어댑티브 UI 상태 계산 엔진
  // ══════════════════════════════════════════════════
  const evaluateAllViewStates = async () => {
    if (!appData?.app_config?.views) return;
    const newStates: Record<string, any> = {};
    
    const now = new Date();
    const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const helpers = {
      rowCount: async (table: string, filter: Record<string, any> = {}) => {
        let q = supabase.from(table).select("*", { count: "exact", head: true });
        Object.entries(filter).forEach(([k, v]) => {
          if (v === 'today') q = q.gte(k, isoToday).lte(k, `${isoToday}T23:59:59`);
          else q = q.eq(k, v);
        });
        const { count } = await q;
        return count || 0;
      },
      currentUser: () => userProfile,
      isToday: (dateStr: string) => new Date(dateStr).toDateString() === new Date().toDateString()
    };
    (helpers as any).count = helpers.rowCount;

    for (const v of appData.app_config.views) {
      if (v.visibilityExpr) {
        try {
          const isMet = await (async () => {
            try {
              const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
              const processedExpr = `${v.visibilityExpr}`.replace(/(?<!await\s+)(count|rowCount)\s*\(/g, 'await $1(');
              const fn = new AsyncFunction('helpers', `
                const { rowCount, count, currentUser, isToday } = helpers;
                try { return ${processedExpr}; } catch { return false; }
              `);
              return await fn(helpers);
            } catch (e) {
              console.error(`Visibility Eval Error [${v.id}]:`, e);
              return false;
            }
          })();
          
          if (isMet) {
            newStates[v.id] = { hidden: v.visibilityBehavior === 'hide', disabled: v.visibilityBehavior === 'disable', label: v.disabledLabel };
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

  // ══════════════════════════════════════════════════
  //  액션 핸들러
  // ══════════════════════════════════════════════════
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
          initialData[m.targetColumn] = processMappingValue(m.sourceValue, rowData);
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
          initialData[m.targetColumn] = processMappingValue(m.sourceValue, rowData);
        }
        else if (m.mappingType === 'static') initialData[m.targetColumn] = m.sourceValue;
        else if (m.mappingType === 'user_name') initialData[m.targetColumn] = userProfile?.name || '';
        else if (m.mappingType === 'user_email') initialData[m.targetColumn] = userProfile?.email || '';
        else if (m.mappingType === 'prompt' && m.valueType === 'number') {
          initialData[m.targetColumn] = rowData[m.targetColumn] !== undefined && rowData[m.targetColumn] !== null 
            ? Number(rowData[m.targetColumn]) 
            : (m.defaultNumberValue ?? 0);
        }
        else if (m.mappingType === 'prompt') initialData[m.targetColumn] = rowData[m.targetColumn] !== undefined && rowData[m.targetColumn] !== null ? rowData[m.targetColumn] : '';
      });
      setUpdateFormData(initialData); setIsUpdateModalOpen(true);
    } else if (action.type === 'send_sms') {
      let phone = rowData.phone || rowData.PHONE;
      
      if (!phone) {
        let findQuery = supabase.from('students').select('phone');
        let canSearch = false;
        const stu = rowData.students || rowData.STUDENTS;
        const stuId = rowData.student_id || rowData.STUDENT_ID;
        const stuName = rowData.name || rowData.NAME;
        if (stu) { findQuery = findQuery.eq('students', stu); canSearch = true; }
        else if (stuId) { findQuery = findQuery.eq('id', stuId); canSearch = true; }
        else if (stuName) { findQuery = findQuery.eq('name', stuName); canSearch = true; }
        if (canSearch) {
          const { data, error } = await findQuery.single();
          if (!error && data && data.phone) phone = data.phone;
        }
      }

      let message = action.smsMessageTemplate || '';
      message = message.replace(/\{\{\s*(.*?)\s*\}\}/g, (_match: string, p1: string) => {
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

  // ══════════════════════════════════════════════════
  //  수동 픽 & 잠금
  // ══════════════════════════════════════════════════


  // ══════════════════════════════════════════════════
  //  폼 제출
  // ══════════════════════════════════════════════════
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

  // ══════════════════════════════════════════════════
  //  데이터 필터/그룹
  // ══════════════════════════════════════════════════
  const getFilteredData = () => {
    const rawData = tableData[currentView?.tableName || ''] || [];
    if (!searchTerm) return rawData; 
    return rawData.filter((row: any) => Object.values(row).some(val => String(val).toLowerCase().includes(searchTerm.toLowerCase())));
  };

  const displayData = getFilteredData();
  let groupedData: Record<string, any> = {};
  if (currentView?.groupByColumn) {
    displayData.forEach(row => {
      const g1 = row[currentView.groupByColumn as string];
      const k1 = (g1 === null || g1 === undefined || g1 === '') ? '미분류' : String(g1);
      
      if (currentView.groupByColumn2) {
        if (!groupedData[k1]) groupedData[k1] = {};
        const g2 = row[currentView.groupByColumn2 as string];
        const k2 = (g2 === null || g2 === undefined || g2 === '') ? '미분류' : String(g2);
        if (!groupedData[k1][k2]) groupedData[k1][k2] = [];
        groupedData[k1][k2].push(row);
      } else {
        if (!groupedData[k1]) groupedData[k1] = [];
        groupedData[k1].push(row);
      }
    });
  }

  const toggleGroup = (key: string) => {
    setExpandedGroups(prev => {
      const isOpening = !prev[key];
      if (currentView?.groupAccordionMode === 'single' && isOpening) {
        if (key.includes('|')) {
          // 2차 그룹을 열 때: 부모 1차 그룹은 유지하고, 2차 그룹은 하나만 남김
          const [parentKey] = key.split('|');
          return { [parentKey]: true, [key]: true };
        } else {
          // 1차 그룹을 열 때: 다른 모든 그룹(1차/2차 가리지 않고) 닫기
          return { [key]: true };
        }
      }
      return { ...prev, [key]: !prev[key] };
    });
  };
  const groupKeys = Object.keys(groupedData);
  const isAllExpanded = groupKeys.length > 0 && groupKeys.every(k => expandedGroups[k]);
  const handleToggleAllGroups = () => {
    if (isAllExpanded) setExpandedGroups({}); 
    else { 
      const allOpen: Record<string, boolean> = {}; 
      groupKeys.forEach(k => {
        allOpen[k] = true;
        if (currentView?.groupByColumn2 && typeof groupedData[k] === 'object') {
          Object.keys(groupedData[k]).forEach(subK => {
            allOpen[`${k}|${subK}`] = true;
          });
        }
      }); 
      setExpandedGroups(allOpen); 
    }
  };

  const getGridColsClass = (cols: number) => {
    if (cols === 4) return 'grid-cols-4 lg:grid-cols-8';
    if (cols === 3) return 'grid-cols-3 lg:grid-cols-6';
    if (cols === 2) return 'grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-1 lg:grid-cols-2';
  };
  const gridColsClass = getGridColsClass(currentView?.columnCount || 1);

  // ── 로딩 ──
  if (loading) return <div className="flex h-screen w-full items-center justify-center bg-slate-50 font-black text-slate-400">LOADING...</div>;

  // ══════════════════════════════════════════════════
  //  렌더링
  // ══════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-slate-100 flex justify-center font-sans">
      <div className="w-full bg-slate-50 flex flex-col md:flex-row relative h-screen overflow-hidden">
        
        {/* Toast */}
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
        
        {/* Header / Sidebar */}
        <div className="pt-6 pb-4 px-5 border-b md:border-r md:border-b-0 bg-white relative z-10 shadow-[0_2px_15px_rgba(0,0,0,0.03)] flex flex-col shrink-0 md:w-80 lg:w-96 md:h-screen">
          <div className="flex flex-col mb-5">
            <div className="flex items-center justify-between relative pt-5">
              {/* App Title (Left Aligned Top) */}
              <div className="absolute top-0 left-0 px-2">
                <span className="text-[10px] font-black text-indigo-500/70 uppercase tracking-[0.2em] whitespace-nowrap">
                  {appData?.name || 'GNFLHS App'}
                </span>
              </div>

              {/* Back Button (Left) */}
              <div className="w-10 flex-shrink-0">
                {currentViewId !== appData?.app_config?.views?.[0]?.id && (
                  <button onClick={() => { setCurrentViewId(appData.app_config.views[0].id); setSearchTerm(''); setExpandedGroups({}); }} className="p-2 sm:p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all">
                    <ChevronLeft size={22} />
                  </button>
                )}
              </div>

              {/* View Title (Center Aligned) */}
              <div className="flex-1 min-w-0 text-center px-2">
                <h1 className="text-xl sm:text-2xl font-black text-slate-900 truncate tracking-tighter leading-tight">
                  {currentView?.name || 'Main View'}
                </h1>
              </div>

              {/* Menu Button (Right) */}
              <div className="w-10 text-right relative flex-shrink-0">
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
                  {Object.entries(groupedData)
                    .sort(([a], [b]) => {
                      const dir = currentView.groupSortDirection || 'asc';
                      return dir === 'asc' ? a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) : b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
                    })
                    .map(([groupKey, data]) => {
                      const isLevel2 = currentView.groupByColumn2;
                      const isExpanded = !!expandedGroups[groupKey];
                      const rows = isLevel2 ? Object.values(data).flat() as any[] : data as any[];
                    
                    // 🧠 그룹 헤더 가공 및 디자인 로직 (Level 1)
                    const displayLabel = (() => {
                      if (currentView.groupHeaderExpression) {
                        try {
                          const fn = new Function('val', 'rowCount', `return ${currentView.groupHeaderExpression}`);
                          return String(fn(groupKey, rows.length));
                        } catch (e) {
                          console.error("Group Expression Error:", e);
                          return groupKey;
                        }
                      }
                      return groupKey;
                    })();

                    const IconComp = currentView.groupHeaderIcon && IconMap[currentView.groupHeaderIcon] ? IconMap[currentView.groupHeaderIcon] : Folder;
                    const textAlignClass = currentView.groupHeaderAlign === 'center' ? 'justify-center' : currentView.groupHeaderAlign === 'right' ? 'justify-end' : 'justify-start';
                    const textColorClass = currentView.groupHeaderColor || 'text-indigo-900';
                    const textSizeClass = currentView.groupHeaderTextSize || 'text-[15px]';

                    // 🧠 통계 데이터 렌더러
                    const renderAggregations = (aggRows: any[], aggs?: GroupAggregation[]) => {
                      if (!aggs || aggs.length === 0) {
                        return <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">{aggRows.length}건</span>;
                      }
                      
                      return (
                        <div className="flex items-center gap-2 flex-wrap">
                          {aggs.map((agg: GroupAggregation) => {
                            let value: any = 0;
                            if (agg.type === 'count') {
                              value = aggRows.length;
                            } else if (agg.column) {
                              const rawValues = aggRows.map(r => r[agg.column as string]);
                              const processedValues = rawValues.map((val, idx) => {
                                if (!agg.conditionValue) return val;
                                try {
                                  const fn = new Function('val', 'row', `try { return ${agg.conditionValue}; } catch { return false; }`);
                                  return fn(val, aggRows[idx]);
                                } catch (e) {
                                  return val === agg.conditionValue || String(val) === agg.conditionValue;
                                }
                              });

                              if (agg.type === 'sum') {
                                value = processedValues.reduce((acc, v) => acc + (Number(v) || 0), 0);
                              } else if (agg.type === 'avg') {
                                const sum = processedValues.reduce((acc, v) => acc + (Number(v) || 0), 0);
                                value = processedValues.length ? (sum / processedValues.length).toFixed(1) : 0;
                              } else if (agg.type === 'count_if') {
                                value = processedValues.filter(v => !!v).length;
                              }
                            }
                            
                            const formattedValue = !isNaN(Number(value)) ? Number(value).toLocaleString() : value;

                            if (agg.displayStyle === 'text') {
                              return (
                                <div key={agg.id} className="flex items-center gap-1 text-[11px] font-black mr-1">
                                  <span className="text-slate-400 font-bold">{agg.label}:</span>
                                  <span className={agg.color?.replace('bg-', 'text-').split(' ')[1] || 'text-slate-600'}>{formattedValue}</span>
                                </div>
                              );
                            }

                            return (
                              <div key={agg.id} className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black border ${agg.color || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                                <span className="opacity-70">{agg.label}:</span>
                                <span>{formattedValue}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    };

                    return (
                      <div key={groupKey} className="mb-0">
                        {/* 1차 그룹 헤더 */}
                        <button 
                          onClick={() => toggleGroup(groupKey)} 
                          className={`w-full flex items-center justify-between px-5 py-4 bg-white border-b border-slate-200 hover:bg-slate-50 transition-colors ${currentView.groupHeaderAlign === 'center' ? 'flex-col gap-2' : ''}`}
                        >
                          <div className={`flex items-center gap-3 flex-1 ${textAlignClass}`}>
                            <IconComp className={isExpanded ? "text-indigo-500" : "text-slate-400"} size={18} />
                            <div className={`flex items-center gap-3 ${currentView.groupAggregationPosition === 'beside_label' ? 'flex-wrap' : ''}`}>
                              <span className={`${textSizeClass} font-black ${isExpanded ? textColorClass : 'text-slate-700'}`}>
                                {displayLabel}
                              </span>
                              {currentView.groupAggregationPosition === 'beside_label' && renderAggregations(rows, currentView.groupAggregations)}
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {(currentView.groupAggregationPosition === 'right_end' || !currentView.groupAggregationPosition) && renderAggregations(rows, currentView.groupAggregations)}
                            <div className={`transition-transform duration-300 ${isExpanded ? 'rotate-180' : 'rotate-0'}`}>
                              <ChevronDown className={isExpanded ? "text-indigo-500" : "text-slate-300"} size={20} />
                            </div>
                          </div>
                        </button>

                        {/* 확장된 내용 */}
                        {isExpanded && (
                          <div className="bg-slate-50/30">
                            {isLevel2 ? (
                              // 2차 그룹 렌더링
                                Object.entries(data as Record<string, any[]>)
                                  .sort(([a], [b]) => {
                                    const dir = currentView.groupSortDirection2 || 'asc';
                                    return dir === 'asc' ? a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }) : b.localeCompare(a, undefined, { numeric: true, sensitivity: 'base' });
                                  })
                                  .map(([subKey, subRows]) => {
                                const compositeKey = `${groupKey}|${subKey}`;
                                const isSubExpanded = !!expandedGroups[compositeKey];

                                // 🧠 그룹 헤더 가공 및 디자인 로직 (Level 2)
                                const subDisplayLabel = (() => {
                                  if (currentView.groupHeaderExpression2) {
                                    try {
                                      const fn = new Function('val', 'rowCount', `return ${currentView.groupHeaderExpression2}`);
                                      return String(fn(subKey, subRows.length));
                                    } catch (e) {
                                      return subKey;
                                    }
                                  }
                                  return subKey;
                                })();

                                const SubIconComp = currentView.groupHeaderIcon2 && IconMap[currentView.groupHeaderIcon2] ? IconMap[currentView.groupHeaderIcon2] : Folder;
                                const subAlignClass = currentView.groupHeaderAlign2 === 'center' ? 'justify-center' : currentView.groupHeaderAlign2 === 'right' ? 'justify-end' : 'justify-start';

                                return (
                                  <div key={subKey} className="border-b border-slate-100">
                                    <button 
                                      onClick={() => toggleGroup(compositeKey)} 
                                      className={`w-full flex items-center justify-between pl-10 pr-5 py-3 bg-slate-50/50 hover:bg-white transition-colors border-b border-slate-100/50 ${currentView.groupHeaderAlign2 === 'center' ? 'flex-col gap-1' : ''}`}
                                    >
                                      <div className={`flex items-center gap-2 flex-1 ${subAlignClass}`}>
                                        <SubIconComp className={isSubExpanded ? (currentView.groupHeaderColor2 || "text-violet-600") : "text-slate-400"} size={14} />
                                        <div className={`flex items-center gap-3 ${currentView.groupAggregationPosition2 === 'beside_label' ? 'flex-wrap' : ''}`}>
                                          <span className={`${currentView.groupHeaderTextSize2 || 'text-[13px]'} font-black ${isSubExpanded ? (currentView.groupHeaderColor2 || 'text-violet-900') : 'text-slate-600'}`}>
                                            {subDisplayLabel}
                                          </span>
                                          {currentView.groupAggregationPosition2 === 'beside_label' && renderAggregations(subRows, currentView.groupAggregations2)}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        {(currentView.groupAggregationPosition2 === 'right_end' || !currentView.groupAggregationPosition2) && renderAggregations(subRows, currentView.groupAggregations2)}
                                        <div className={`transition-transform duration-300 ${isSubExpanded ? 'rotate-180' : 'rotate-0'}`}>
                                          <ChevronDown className="text-slate-300" size={16} />
                                        </div>
                                      </div>
                                    </button>
                                    
                                    {isSubExpanded && (
                                      <div className={`grid gap-0 bg-white border-b border-slate-100 shadow-inner p-1 ${gridColsClass}`}>
                                        {subRows.map((row, idx) => (
                                          <div key={idx} className="flex flex-col bg-white border border-slate-50 rounded-lg overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors relative group/card shadow-sm m-1" style={{ height: currentView.cardHeightMode === 'auto' ? 'auto' : undefined, minHeight: currentView.cardHeightMode === 'auto' ? 'fit-content' : `${currentView?.cardHeight || 120}px` }} onClick={() => { const act = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (act) handleAction(act, row); }}>
                                            <RenderPreviewLayout rows={currentView?.layoutRows || []} rowData={row} actions={appData.app_config.actions} onExecuteAction={handleAction} />
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })
                            ) : (
                              // 1차 그룹 직속 데이터 렌더링
                              <div className={`grid gap-0 bg-slate-50/50 border-b border-slate-200 shadow-inner ${gridColsClass}`}>
                                {rows.map((row, idx) => (
                                  <div key={idx} className="flex flex-col bg-white border-b border-r border-slate-100 overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors relative group/card" style={{ height: currentView.cardHeightMode === 'auto' ? 'auto' : undefined, minHeight: currentView.cardHeightMode === 'auto' ? 'fit-content' : `${currentView?.cardHeight || 120}px` }} onClick={() => { const act = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (act) handleAction(act, row); }}>
                                    <RenderPreviewLayout rows={currentView?.layoutRows || []} rowData={row} actions={appData.app_config.actions} onExecuteAction={handleAction} />
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
                <div className={`grid gap-0 flex-1 content-start ${gridColsClass}`}>
                  {displayData.map((row, idx) => {
                    return (
                      <div key={idx} className="flex flex-col bg-white border-b border-r border-slate-100 overflow-hidden cursor-pointer hover:bg-slate-50 transition-colors relative group/card" style={{ height: currentView.cardHeightMode === 'auto' ? 'auto' : undefined, minHeight: currentView.cardHeightMode === 'auto' ? 'fit-content' : `${currentView?.cardHeight || 120}px` }} onClick={() => { const act = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (act) handleAction(act, row); }}>
                        <RenderPreviewLayout rows={currentView?.layoutRows || []} rowData={row} actions={appData.app_config.actions} onExecuteAction={handleAction} />
                      </div>
                    );
                  })}
                </div>
              )}
              {displayData.length === 0 && <div className="p-20 text-center flex flex-col items-center gap-3 text-slate-400 mt-10"><Search size={40} className="opacity-20" /><p className="font-bold">조건에 맞는 데이터가 없습니다.</p></div>}
            </div>
          </div>
          
          {/* Mobile Bottom Tab Bar (deprecated, replaced by bottom nav) */}
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

      {/* Insert & Update 모달 */}
      <InsertModal
        isOpen={isInputModalOpen}
        onClose={() => setIsInputModalOpen(false)}
        action={activeInsertAction}
        formData={formData}
        setFormData={setFormData}
        onSubmit={handleSubmitInsert}
        isSubmitting={isSubmitting}
      />

      <UpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => setIsUpdateModalOpen(false)}
        action={activeUpdateAction}
        formData={updateFormData}
        setFormData={setUpdateFormData}
        onSubmit={handleSubmitUpdate}
        isUpdating={isUpdating}
      />

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

export default withAuth(LiveAppPreview);
