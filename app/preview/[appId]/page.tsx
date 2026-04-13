// 파일 경로: app/preview/[appId]/page.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/app/supabaseClient';
import { X, CheckCircle2, ChevronLeft, Menu, Home, Layout, Search, ChevronDown, Folder, ChevronsUpDown, ChevronsUp, AlertCircle, Zap, Lock } from 'lucide-react';
import { IconMap } from '@/app/design/picker'; 
import withAuth from '@/app/withAuth';

// ── 모듈화된 유틸/컴포넌트 import ──
import { 
  evaluateExpression, processMappingValue, applyViewQuery, getSortedGroupKeys, resolveVirtualData, applyClientFilters 
} from './utils';
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
      
      // 가상 테이블인데 정의를 못 찾은 경우 (삭제됨 등) 처리
      if (isVt && !vt) {
        // appData가 있을 때만 에러로 간주 (null일 때는 아직 로딩 중인 상태일 수 있음)
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

      // 🔥 클라이언트 사이드 최종 필터 적용 (가상 컬럼 지원)
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
      evaluateAllViewStates();
      if (currentView.onInitActionId) {
        const initAct = appData?.app_config?.actions?.find((a: any) => a.id === currentView.onInitActionId);
        if (initAct) handleInitAutomation(initAct, currentView);
      }
    }
  }, [currentViewId, currentView]);

  const handleInitAutomation = async (action: any, view: any) => {
    if (!view.tableName) return;
    setIsAutomating(true); setAutomationProgress(10); setAutomationLog(`${view.name} 자동화 시작...`);
    try {
      const isVt = view.tableName.startsWith('vt_');
      const vt = isVt ? appData?.app_config?.virtualTables?.find((v: any) => v.id === view.tableName) : null;
      const fetchTable = vt ? vt.baseTableName : view.tableName;

      let query: any = supabase.from(fetchTable).select("*");
      query = applyViewQuery(query, view, userProfile);
      const { data: rawRows, error: fetchErr } = await query.limit(500);
      if (fetchErr) throw fetchErr;
      
      let filterRows = rawRows || [];
      if (vt && filterRows.length > 0) {
        filterRows = await resolveVirtualData(filterRows, vt);
      }

      if (!filterRows || filterRows.length === 0) { setIsAutomating(false); return; }
      if (action.batchMode && (action.type === 'insert_row' || action.type === 'update_row')) {
        const payloads = filterRows.map((row: any) => {
          const mapping = action.type === 'insert_row' ? action.insertMappings : action.updateMappings;
          const payload: any = {};
          mapping?.forEach((m: any) => {
            if (m.mappingType === 'card_data') payload[m.targetColumn] = processMappingValue(m.sourceValue, row);
            else if (m.mappingType === 'static') payload[m.targetColumn] = m.sourceValue;
            else if (m.mappingType === 'user_name') payload[m.targetColumn] = userProfile?.name || '';
            else if (m.mappingType === 'user_email') payload[m.targetColumn] = userProfile?.email || '';
            else if (m.mappingType === 'prompt') {
              if (m.valueType === 'number') payload[m.targetColumn] = m.defaultNumberValue ?? 0;
              else payload[m.targetColumn] = '';
            }
            if (m.valueType === 'number') payload[m.targetColumn] = Number(payload[m.targetColumn]) || 0;
          });
          return payload;
        });
        if (action.type === 'insert_row') {
           const targetTableId = action.insertTableName?.trim();
           if (!targetTableId) throw new Error("대상 테이블(insertTableName)이 설정되지 않았습니다.");
           
           const targetVt = targetTableId.startsWith('vt_') ? appData?.app_config?.virtualTables?.find((v: any) => v.id === targetTableId) : null;
           const targetTable = targetVt ? targetVt.baseTableName : targetTableId;
           setAutomationLog(`데이터 ${payloads.length}건 저장 중...`);
           const { error: insErr } = await supabase.from(targetTable).insert(payloads);
           if (insErr && insErr.code === '23505') {
             setAutomationLog(`중복 제외 및 개별 저장 중...`);
             for (const p of payloads) { try { await supabase.from(targetTable).insert(p); } catch {} }
           } else if (insErr) throw insErr;
        } else if (action.type === 'update_row') {
           const targetTableId = action.updateTableName?.trim();
           if (!targetTableId) throw new Error("대상 테이블(updateTableName)이 설정되지 않았습니다.");

           const targetVt = targetTableId.startsWith('vt_') ? appData?.app_config?.virtualTables?.find((v: any) => v.id === targetTableId) : null;
           const targetTable = targetVt ? targetVt.baseTableName : targetTableId;
           setAutomationLog(`데이터 ${payloads.length}건 수정 중...`);
           await supabase.from(targetTable).upsert(payloads.map((p: any, i: number) => ({ ...p, id: filterRows[i].id })));
        }
      } else {
        setAutomationProgress(70);
        await handleAction(action, filterRows[0]);
      }
      setAutomationProgress(100); 
      setAutomationLog("모든 자동화 작업이 완료되었습니다!"); 
      setToast({ message: `${action.name} 완료`, type: 'success' });
      setTimeout(() => setIsAutomating(false), 800);
    } catch (err: any) { setToast({ message: `실패: ${err.message}`, type: 'error' }); setIsAutomating(false); }
  };

  const evaluateAllViewStates = async () => {
    if (!appData?.app_config?.views) return;
    const newStates: Record<string, any> = {};
    const now = new Date();
    const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const helpers = {
      rowCount: async (t: string, f: Record<string, any> = {}) => {
        let q = supabase.from(t).select("*", { count: "exact", head: true });
        Object.entries(f).forEach(([k, v]) => { if (v === 'today') q = q.gte(k, isoToday).lte(k, `${isoToday}T23:59:59`); else q = q.eq(k, v); });
        const { count } = await q; return count || 0;
      },
      count: (t: string, f: Record<string, any>) => helpers.rowCount(t, f),
      currentUser: () => userProfile,
      isToday: (d: string) => new Date(d).toDateString() === new Date().toDateString()
    };
    for (const v of appData.app_config.views) {
      if (v.visibilityExpr) {
        const isMet = await evaluateExpression(v.visibilityExpr, helpers);
        newStates[v.id] = isMet ? { hidden: v.visibilityBehavior === 'hide', disabled: v.visibilityBehavior === 'disable', label: v.disabledLabel } : { hidden: false, disabled: false };
      } else newStates[v.id] = { hidden: false, disabled: false };
    }
    setViewStates(newStates);
  };

  const handleAction = async (action: any, rowData: any) => {
    console.log("handleAction called with:", action.type, action);
    // alert("액션 실행: " + action.type); // 디버깅용 (필요시 주석 해제)
    
    if (action.type === 'alert') alert(action.message || '알림');
    else if (action.type === 'navigate') { setCurrentViewId(action.targetViewId); setSearchTerm(''); setExpandedGroups({}); }
    else if (action.type === 'insert_row') {
      setActiveInsertAction(action); const init: any = {};
      action.insertMappings?.forEach((m: any) => {
        if (m.mappingType === 'card_data') init[m.targetColumn] = processMappingValue(m.sourceValue, rowData);
        else if (m.mappingType === 'static') init[m.targetColumn] = m.sourceValue;
        else if (m.mappingType === 'user_name') init[m.targetColumn] = userProfile?.name || '';
        else if (m.mappingType === 'user_email') init[m.targetColumn] = userProfile?.email || '';
        else init[m.targetColumn] = '';
      });
      setFormData(init); setIsInputModalOpen(true);
    } else if (action.type === 'delete_row') {
      const targetTableId = action.deleteTableName;
      if (!targetTableId || !rowData.id) return;
      if (!window.confirm("삭제하시겠습니까?")) return;

      const targetVt = targetTableId.startsWith('vt_') ? appData?.app_config?.virtualTables?.find((v: any) => v.id === targetTableId) : null;
      const targetTable = targetVt ? targetVt.baseTableName : targetTableId;

      await supabase.from(targetTable).delete().eq('id', rowData.id);
      fetchTableData(currentView);
    } else if (action.type === 'update_row') {
      if (!action.updateTableName || !rowData.id) return;
      setActiveUpdateAction(action); setActiveRowData(rowData);
      const init: any = {};
      action.updateMappings?.forEach((m: any) => {
        if (m.mappingType === 'card_data') init[m.targetColumn] = processMappingValue(m.sourceValue, rowData);
        else if (m.mappingType === 'static') init[m.targetColumn] = m.sourceValue;
        else if (m.mappingType === 'user_name') init[m.targetColumn] = userProfile?.name || '';
        else if (m.mappingType === 'user_email') init[m.targetColumn] = userProfile?.email || '';
        else init[m.targetColumn] = rowData[m.targetColumn] || '';
      });
      setUpdateFormData(init); setIsUpdateModalOpen(true);
    } else if (action.type === 'send_sms') {
      try {
        console.log("🚀 SMS Action Triggered - searching for phone/message...");
        let phone = '';
        
        // 1. 직접 지정된 컬럼에서 찾기
        if (action.smsPhoneColumn) phone = rowData[action.smsPhoneColumn];
        
        // 2. 기본 컬럼명에서 추측 (phone, PHONE, 연락처)
        if (!phone) phone = rowData.phone || rowData.PHONE || rowData['연락처'] || rowData['전화번호'];
        
        // 3. 없을 경우 Students 테이블에서 실시간 조회 (이름 또는 학번 기준)
        if (!phone) {
          const studentIdentifier = rowData.name || rowData.NAME || rowData.students || rowData.STUDENTS || rowData.student_id || rowData.STUDENT_ID;
          console.log("🔍 Phone not found in current row, looking up Student:", studentIdentifier);
          if (studentIdentifier) {
            const { data: studentData, error: stuErr } = await supabase
              .from('students')
              .select('phone')
              .or(`name.eq."${studentIdentifier}",student_id.eq."${studentIdentifier}"`)
              .maybeSingle();
            
            if (stuErr) console.warn("❌ Student lookup error:", stuErr);
            if (studentData?.phone) {
              phone = studentData.phone;
              console.log("✅ Found phone in DB:", phone);
            }
          }
        }

        // 메시지 템플릿 치환
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

        // 기기 체크 및 실행
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
        console.log("📱 Device Check - IsMobile:", isMobile, "IsIOS:", isIOS, "Phone:", phone);

        if (isMobile && phone) {
          // 모바일: 문자 앱으로 연결
          // iOS는 &body= 또는 ;body= 를 사용하며, 안드로이드는 ?body= 를 주로 사용함
          const phoneClean = phone.replace(/[^0-9]/g, '');
          const smsUrl = isIOS 
            ? `sms:${phoneClean}&body=${encodeURIComponent(message)}` 
            : `sms:${phoneClean}?body=${encodeURIComponent(message)}`;
          
          console.log("📡 Triggering SMS URL:", smsUrl);
          
          // window.location.href 대신 window.open을 사용하거나 직접 클릭 이벤트를 시뮬레이션
          window.location.href = smsUrl;
          
          // 2초 후에도 페이지가 떠나지 않았다면 클립보드 복사 안내
          setTimeout(() => {
              if (confirm("문자 앱이 열리지 않았나요? 메시지를 클립보드에 복사해 드릴까요?")) {
                  navigator.clipboard.writeText(message);
                  setToast({ message: "메시지가 복사되었습니다.", type: 'success' });
              }
          }, 2500);
        } else {
          // PC 또는 전화번호 부재: 클립보드 복사
          console.log("💻 Desktop/No-Phone mode: Copying to clipboard");
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(message);
            alert("메시지가 클립보드에 복사되었습니다.\n\n내용:\n" + message);
            setToast({ message: "메시지가 클립보드에 복사되었습니다.", type: 'success' });
          } else {
            window.prompt("이 메시지를 복사하여 사용하세요:", message);
          }
        }
      } catch (err: any) {
        console.error("💥 SMS Action Error:", err);
        alert("문자 전송 처리 중 오류가 발생했습니다: " + err.message);
      }
    }
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
    } catch (err: any) {
      setToast({ message: `수정 실패: ${err.message}`, type: 'error' });
    } finally { 
      setIsUpdating(false); 
    }
  };

  const renderAggregations = (rows: any[], aggs?: GroupAggregation[]) => {
    if (!aggs || aggs.length === 0) return <span className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-0.5 rounded-full">{rows.length}건</span>;
    return (
      <div className="flex items-center gap-2 flex-wrap">
        {aggs.map(agg => {
          let val: any = 0; if (agg.type === 'count') val = rows.length;
          else if (agg.column) {
            const processed = rows.map(r => {
              if (!agg.conditionValue) return r[agg.column as string];
              try { return new Function('val', 'row', `return ${agg.conditionValue}`)(r[agg.column as string], r); } catch { return false; }
            });
            if (agg.type === 'sum') val = processed.reduce((acc, v) => acc + (Number(v) || 0), 0);
            else if (agg.type === 'avg') val = (processed.reduce((acc, v) => acc + (Number(v) || 0), 0) / (processed.length || 1)).toFixed(1);
            else if (agg.type === 'count_if') val = processed.filter(v => !!v).length;
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
    displayData.forEach(r => {
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
  }

  const groupKeys = getSortedGroupKeys(groupedData, currentView?.groupSortDirection || 'asc');
  const isAllExpanded = groupKeys.length > 0 && groupKeys.every(k => expandedGroups[k]);
  const handleToggleGroups = () => {
    if (isAllExpanded) setExpandedGroups({});
    else {
      const next: any = {};
      groupKeys.forEach(k => {
        next[k] = true;
        if (currentView?.groupByColumn2 && typeof groupedData[k] === 'object') {
          getSortedGroupKeys(groupedData[k], currentView.groupSortDirection2 || 'asc').forEach(sk => next[`${k}|${sk}`] = true);
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
    if (c === 4) return 'grid-cols-4 lg:grid-cols-8'; if (c === 3) return 'grid-cols-3 lg:grid-cols-6'; if (c === 2) return 'grid-cols-2 lg:grid-cols-4';
    return 'grid-cols-1 lg:grid-cols-2';
  })(currentView?.columnCount || 1);

  if (loading) return <div className="h-screen bg-slate-50 flex items-center justify-center font-black text-slate-300">LOADING...</div>;

  return (
    <div className="h-screen bg-white flex overflow-hidden relative">
      {/* Toast */}
      {toast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-[2000] px-4 py-2 bg-indigo-600 text-white rounded-none shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
           {toast.type === 'success' ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}
           <span className="font-bold text-xs">{toast.message}</span>
        </div>
      )}

      {/* Sidebar (Responsive Drawer) */}
      <div 
        className={`fixed inset-y-0 left-0 z-[1000] w-72 bg-white border-r flex flex-col pt-4 px-4 transition-transform duration-300 ease-in-out md:relative md:translate-x-0 md:w-72 lg:w-80 shrink-0 ${
          isMobileSidebarOpen ? 'translate-x-0 shadow-xl' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="flex items-center justify-between mb-4">
           <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">{appData?.name}</span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tighter">{currentView?.name}</h1>
           </div>
           <button 
             onClick={() => { setIsMenuOpen(!isMenuOpen); setIsMobileSidebarOpen(false); }} 
             className="p-2.5 text-slate-400 hover:bg-slate-50 rounded-xl transition-all"
           >
             <Menu size={24}/>
           </button>
        </div>
        
        <div className="relative mb-3">
           <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16}/>
           <input value={searchTerm} onChange={e => setSearchTerm(e.target.value)} placeholder="검색..." className="w-full pl-9 pr-3 py-2 bg-slate-50 rounded-none text-xs font-bold border-2 border-transparent focus:border-indigo-500 transition-all outline-none" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide pr-2">
           {(appData?.app_config?.views || []).filter((v: any) => !viewStates[v.id]?.hidden).map((v: any) => {
              const Icon = IconMap[v.icon] || Layout;
              const isActive = currentViewId === v.id;
              const st = viewStates[v.id];
              return (
                <button 
                  key={v.id} 
                  disabled={st?.disabled} 
                  onClick={() => { 
                    setCurrentViewId(v.id); 
                    setSearchTerm(''); 
                    if (typeof window !== 'undefined' && window.innerWidth < 768) setIsMobileSidebarOpen(false); 
                  }} 
                  className={`w-full flex items-center justify-between p-3 rounded-none transition-all ${isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'} ${st?.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                >
                   <div className="flex items-center gap-4"><Icon size={20}/> <span className="font-black text-[15px]">{st?.label || v.name}</span></div>
                   {st?.disabled && <Lock size={14}/>}
                </button>
              );
           })}
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="fixed inset-0 z-[999] bg-slate-900/40 backdrop-blur-sm md:hidden animate-in fade-in duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-slate-50 relative overflow-hidden">
        {/* Mobile Navbar */}
        <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 shrink-0">
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setIsMobileSidebarOpen(true)}
               className="p-2 text-slate-500 hover:bg-slate-50 rounded-xl"
             >
               <Menu size={24}/>
             </button>
             <h2 className="text-lg font-black text-slate-800 tracking-tight truncate max-w-[200px]">{currentView?.name || "App"}</h2>
          </div>
          <button 
            onClick={() => setIsMenuOpen(true)}
            className="p-2 text-slate-400"
          >
            <Home size={22}/>
          </button>
        </div>
        <div className="flex items-center justify-between p-3 shrink-0">
           <div className="px-3 py-1 bg-white border border-slate-200 rounded-none text-[10px] font-bold text-slate-400">{displayData.length} RECORDS</div>
           {currentView?.groupByColumn && (
             <button onClick={handleToggleGroups} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-none text-[10px] font-bold hover:bg-indigo-100 transition-all flex items-center gap-1">
               {isAllExpanded ? <ChevronsUp size={12}/> : <ChevronsUpDown size={12}/>} {isAllExpanded ? '접기' : '펼치기'}
             </button>
           )}
        </div>

        <div className="flex-1 overflow-y-scroll px-1 md:px-6 pb-20 scrollbar-hide">
           {currentView?.groupByColumn ? (
             <div className="space-y-4">
               {groupKeys.map(k => {
                 const isExp = !!expandedGroups[k];
                 const subRows = currentView.groupByColumn2 ? groupedData[k] : { [k]: groupedData[k] };
                 const sks = getSortedGroupKeys(subRows, currentView.groupSortDirection2 || 'asc');
                 const allInG1 = currentView.groupByColumn2 ? Object.values(groupedData[k]).flat() as any[] : groupedData[k] as any[];
                 const Icon1 = IconMap[currentView.groupHeaderIcon] || Folder;
                 const lbl1 = currentView.groupHeaderExpression ? String(new Function('val','rowCount', `return ${currentView.groupHeaderExpression}`)(k, allInG1.length)) : k;

                 return (
                   <div key={k} className="bg-white rounded-none border border-slate-200 overflow-hidden">
                     <button onClick={() => toggleGroup(k)} className="w-full flex items-center justify-between p-3 hover:bg-slate-50 transition-all">
                       <div className="flex items-center gap-3">
                         <Icon1 size={18} className={isExp ? 'text-indigo-600' : 'text-slate-300'}/>
                         <span className={`text-[15px] font-bold ${isExp ? 'text-slate-900' : 'text-slate-600'}`}>{lbl1}</span>
                         {renderAggregations(allInG1, currentView.groupAggregations)}
                       </div>
                       <ChevronDown size={18} className={`text-slate-300 transition-all duration-300 ${isExp ? 'rotate-180' : ''}`}/>
                     </button>
                     {isExp && (
                       <div className="bg-slate-50/50 border-t border-slate-100 p-2">
                         {sks.map(sk => {
                           const rs = subRows[sk]; const fk = `${k}|${sk}`; const isSkExp = !!expandedGroups[fk];
                           const Icon2 = IconMap[currentView.groupHeaderIcon2] || Folder;
                           const lbl2 = currentView.groupHeaderExpression2 ? String(new Function('val','rowCount', `return ${currentView.groupHeaderExpression2}`)(sk, rs.length)) : sk;
                           return (
                             <div key={fk} className="ml-1 md:ml-4 border-l-2 border-indigo-100">
                               {currentView.groupByColumn2 ? (
                                 <>
                                   <button onClick={() => toggleGroup(fk)} className="w-full flex items-center justify-between p-4 hover:bg-white rounded-2xl transition-all">
                                     <div className="flex items-center gap-3">
                                       <Icon2 size={16} className={isSkExp ? 'text-indigo-500' : 'text-slate-300'}/>
                                       <span className="text-sm font-black text-slate-600">{lbl2}</span>
                                       {renderAggregations(rs, currentView.groupAggregations2)}
                                     </div>
                                     <ChevronDown size={18} className={`text-slate-300 transition-all ${isSkExp ? 'rotate-180' : ''}`}/>
                                   </button>
                                   {isSkExp && <div className={`grid ${gridClass} gap-1 p-1`}>{rs.map((r: any) => <div key={r.id} onClick={() => { const ac = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (ac) handleAction(ac, r); }} className="bg-white rounded-none border border-slate-100 overflow-hidden hover:border-indigo-300 transition-all cursor-pointer"><RenderPreviewLayout rows={currentView.layoutRows} rowData={r} actions={appData.app_config.actions} onExecuteAction={handleAction}/></div>)}</div>}
                                 </>
                               ) : (
                                 <div className={`grid ${gridClass} gap-1 p-1`}>{rs.map((r: any) => <div key={r.id} onClick={() => { const ac = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (ac) handleAction(ac, r); }} className="bg-white rounded-none border border-slate-100 overflow-hidden hover:border-indigo-300 transition-all cursor-pointer"><RenderPreviewLayout rows={currentView.layoutRows} rowData={r} actions={appData.app_config.actions} onExecuteAction={handleAction}/></div>)}</div>
                               )}
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
             <div className={`grid ${gridClass} gap-2`}>
               {displayData.map((r: any) => <div key={r.id} onClick={() => { const ac = appData.app_config.actions.find((a:any) => a.id === currentView.onClickActionId); if (ac) handleAction(ac, r); }} className="bg-white rounded-none border border-slate-200 overflow-hidden transition-all cursor-pointer"><RenderPreviewLayout rows={currentView?.layoutRows || []} rowData={r} actions={appData?.app_config?.actions} onExecuteAction={handleAction}/></div>)}
             </div>
           )}
        </div>
      </div>
      
      {/* Modals */}
      <InsertModal isOpen={isInputModalOpen} onClose={() => setIsInputModalOpen(false)} action={activeInsertAction} formData={formData} setFormData={setFormData} onSubmit={handleSubmitInsert} isSubmitting={isSubmitting} />
      <UpdateModal 
        isOpen={isUpdateModalOpen} 
        onClose={() => setIsUpdateModalOpen(false)} 
        action={activeUpdateAction} 
        formData={updateFormData} 
        setFormData={setUpdateFormData} 
        onSubmit={handleSubmitUpdate} 
        isUpdating={isUpdating} 
      />
      
      {/* Menu Modal Overlay */}
      {isMenuOpen && (
        <div className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-sm bg-white rounded-none shadow-2xl overflow-hidden p-6 animate-in zoom-in-95 duration-300">
             <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">메뉴</h2>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 bg-slate-100 text-slate-400 rounded-none hover:bg-slate-200 transition-all"><X size={18}/></button>
             </div>
             <div className="space-y-2">
                <button onClick={() => { router.push('/'); setIsMenuOpen(false); }} className="w-full flex items-center gap-3 p-4 bg-slate-50 text-slate-700 rounded-none font-bold hover:bg-indigo-50 hover:text-indigo-600 transition-all"><Home size={20}/> 대시보드</button>
                <div className="h-px bg-slate-100 my-1"></div>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest pl-1">Views</p>
                <div className="max-h-60 overflow-y-auto space-y-1 pr-1 scrollbar-hide">
                   {(appData?.app_config?.views || []).map((v: any) => {
                      const Icon = IconMap[v.icon] || Layout;
                      const active = currentViewId === v.id;
                      return <button key={v.id} onClick={() => { setCurrentViewId(v.id); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 p-3 rounded-none font-bold transition-all ${active ? 'bg-indigo-50 text-indigo-600' : 'text-slate-500 hover:bg-slate-50'}`}><Icon size={16}/> {v.name}</button>;
                   })}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default withAuth(LiveAppPreview);
