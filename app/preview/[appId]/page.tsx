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
import DefaultRenderer from './renderer';
import { InsertModal, UpdateModal } from './modals';
import { GroupAggregation } from '@/app/design/types';
import dynamic from 'next/dynamic';
import { useAppRuntime } from './useAppRuntime';
import { useActionRunner } from './useActionRunner';
import { EngineComponentsRegistry } from '../../engines/engineRegistry';

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

  return `sticky ${topClass} ${zIndex} shadow-sm border-b border-[var(--theme-border)] bg-[var(--theme-surface)]`;
};

function LiveAppPreview({ userProfile }: { userProfile?: any }) {
  const params = useParams();
  const appId = params?.appId as string;
  const router = useRouter();

  const runtime = useAppRuntime(appId, userProfile);
  const actionRunner = useActionRunner(runtime, userProfile);

  const {
    loading, appData, currentViewId, setCurrentViewId, currentView,
    tableData, searchTerm, setSearchTerm, expandedGroups, setExpandedGroups,
    toast, viewStates, isMobileSidebarOpen, setIsMobileSidebarOpen,
    isSelectionMode, setIsSelectionMode, selectedRowKeys, setSelectedRowKeys, utils
  } = runtime;

  const {
    isInputModalOpen, setIsInputModalOpen, activeInsertAction, formData, setFormData, isSubmitting,
    isUpdateModalOpen, setIsUpdateModalOpen, activeUpdateAction, activeRowData, updateFormData, setUpdateFormData, isUpdating,
    isAutomating, automationProgress, automationLog,
    executeBatchAction, handleInitAutomation, handleAction, handleSubmitInsert, handleSubmitUpdate,
    setActionQueue, setBatchSourceRows
  } = actionRunner;

  useEffect(() => {
    if (currentView?.onInitActionId && appData?.app_config?.actions) {
      const initAct = appData.app_config.actions.find((a: any) => a.id === currentView.onInitActionId);
      if (initAct) {
        handleInitAutomation(initAct, currentView);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentView?.id, currentView?.onInitActionId, appData?.app_config?.actions]);

  const pressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const onCardPointerDown = (r: any) => {
    if (!currentView?.enableMultiSelect) return;
    pressTimerRef.current = setTimeout(() => {
      setIsSelectionMode(true);
      setSelectedRowKeys((prev: string[]) => prev.includes(r.id) ? prev : [...prev, r.id]);
    }, 500); 
  };

  const onCardPointerUp = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const onCardClick = (r: any) => {
    if (isSelectionMode) {
      setSelectedRowKeys((prev: string[]) => prev.includes(r.id) ? prev.filter((k: string) => k !== r.id) : [...prev, r.id]);
    } else {
      const ac = appData.app_config.actions?.find((a: any) => a.id === currentView.onClickActionId); 
      if (ac) handleAction(ac, r);
    }
  };

  const unitText = appData?.app_config?.unitText || '건';
  const unclassifiedText = appData?.app_config?.unclassifiedText || '미분류';

  const version = appData?.engine_version;
  const registryEntry = version ? EngineComponentsRegistry[version as keyof typeof EngineComponentsRegistry] : null;

  const CurrentRenderer = registryEntry?.Renderer || DefaultRenderer;
  const CurrentInsertModal = registryEntry?.InsertModal || InsertModal;
  const CurrentUpdateModal = registryEntry?.UpdateModal || UpdateModal;

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
  const isAllExpanded = groupKeys.length > 0 && groupKeys.every((k: string) => expandedGroups[k]);
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

  // 🔥 [신규] 실제로 화면에 '노출'되고 있는 카드들만 추출 (그룹 확장 상태 반영)
  const visibleRows = (() => {
    // 그룹화가 꺼져있거나 그룹 키가 없으면 검색 결과 전체 반환
    if (!currentView?.groupByColumn || !groupKeys || groupKeys.length === 0) return displayData;
    
    let visible: any[] = [];
    groupKeys.forEach((gk: string) => {
      // 1단계 그룹이 열려있는지 확인
      if (expandedGroups[gk]) {
        if (currentView.groupByColumn2) {
          // 2단계 그룹 처리
          const subData = groupedData[gk];
          const subKeys = utils.getSortedGroupKeys(subData, currentView.groupSortDirection2 || 'asc');
          subKeys.forEach((sk: string) => {
            const combinedKey = `${gk}|${sk}`;
            if (expandedGroups[combinedKey]) {
              visible = [...visible, ...(subData[sk] || [])];
            }
          });
        } else {
          // 1단계 그룹 데이터 추가
          visible = [...visible, ...(groupedData[gk] || [])];
        }
      }
    });
    return visible;
  })();

  // ─── 메뉴 노출 로직 (역할 분담) ───
  const allViews = (appData?.app_config?.views || []).filter((v: any) => !viewStates[v.id]?.hidden);
  const allActions = (appData?.app_config?.actions || []);

  let sidebarItems: any[] = [];
  let bottomBarItems: any[] = [];
  
  if (isSelectionMode) {
    const selActionsList = currentView?.multiSelectActionIds?.length > 0 
      ? allActions.filter((a: any) => currentView.multiSelectActionIds!.includes(a.id))
      : allActions.filter((a: any) => a.batchMode || a.showInSelectionModeOnly);
      
    const selItems = selActionsList.map((a: any) => ({...a, isAction: true, refItem: a}));
    selItems.push({ id: 'cancel_select', name: '선택 취소', icon: 'X', isAction: 'cancel' });
    selItems.push({ id: 'select_all', name: '표시된 카드 전체 선택', icon: 'CheckCircle2', isAction: 'select_all' });
    
    sidebarItems = selItems;
    bottomBarItems = selItems;
  } else {
    // [상단/햄버거 역할] top 또는 both 설정된 메뉴들
    const topViews = allViews.filter((v: any) => v.navPosition !== 'hidden' && (v.navPosition === 'top' || v.navPosition === 'both' || !v.navPosition)).map((v: any) => ({...v, isAction: false, refItem: v}));
    const topActions = allActions.filter((a: any) => (a.navPosition === 'top' || a.navPosition === 'both') && !a.showInSelectionModeOnly).map((a: any) => ({...a, isAction: true, refItem: a}));
    sidebarItems = [...topViews, ...topActions];

    // [하단/사이드바 역할] bottom 또는 both 설정된 메뉴들
    const botViews = allViews.filter((v: any) => v.navPosition !== 'hidden' && (v.navPosition === 'bottom' || v.navPosition === 'both' || !v.navPosition)).map((v: any) => ({...v, isAction: false, refItem: v}));
    const botActions = allActions.filter((a: any) => (a.navPosition === 'bottom' || a.navPosition === 'both') && !a.showInSelectionModeOnly).map((a: any) => ({...a, isAction: true, refItem: a}));
    bottomBarItems = [...botViews, ...botActions];
  }
  
  // legacy variables for specific use cases
  const bottomBarViews = bottomBarItems.filter(i => !i.isAction);

  const navPos = currentView?.navPosition || 'both';

  // 모바일 전용 바 노출 조건 (md:hidden에 의해 데스크탑에서는 숨겨짐)
  const showTopBar = navPos === 'both' || navPos === 'top';
  const showBottomBar = (navPos === 'both' || navPos === 'bottom') && (bottomBarViews.length > 0 || isSelectionMode);
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
          {bottomBarItems.map((item: any) => {
            const Icon = IconMap[item.icon] || (item.isAction ? Zap : Layout);
            const isActive = !item.isAction && currentViewId === item.id;
            const st = item.isAction ? null : viewStates[item.id];
            return (
              <button key={item.id} disabled={st?.disabled || (item.isAction && isSelectionMode && selectedRowKeys.length === 0)}
                onClick={() => { 
                  if (item.isAction === 'cancel') {
                    setIsSelectionMode(false); setSelectedRowKeys([]);
                  } else if (item.isAction === 'select_all') {
                    setSelectedRowKeys(visibleRows.map((r: any) => r.id));
                  } else if (item.isAction) {
                    if (isSelectionMode && selectedRowKeys.length > 0) {
                      // 🔥 [중요] 선택된 ID들이 실제로 '눈에 보이는(펼쳐진)' 데이터 내에 있는지 한 번 더 교차 검증
                      const fullData = visibleRows.filter((r:any) => selectedRowKeys.includes(r.id));
                      executeBatchAction(item.refItem, currentView, fullData);
                    } else {
                      handleAction(item.refItem, {});
                    }
                  } else {
                    setCurrentViewId(item.id); setSearchTerm(''); 
                  }
                }}
                style={{ 
                  backgroundColor: isActive ? 'var(--theme-primary)' : 'transparent',
                  color: isActive ? 'var(--theme-text-on-primary)' : 'var(--theme-text-main)'
                }}
                className={`w-full flex items-center justify-between p-3 rounded-none transition-all ${st?.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-4"><Icon size={20} /> <span className="font-black text-[15px]">{st?.label || item.name}</span></div>
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
          {sidebarItems.map((item: any) => {
            const Icon = IconMap[item.icon] || (item.isAction ? Zap : Layout);
            const isActive = !item.isAction && currentViewId === item.id;
            const st = item.isAction ? null : viewStates[item.id];
            return (
              <button key={item.id} disabled={st?.disabled || (item.isAction && isSelectionMode && selectedRowKeys.length === 0)}
                onClick={() => { 
                  if (item.isAction === 'cancel') {
                    setIsSelectionMode(false); setSelectedRowKeys([]);
                    setIsMobileSidebarOpen(false);
                  } else if (item.isAction === 'select_all') {
                    setSelectedRowKeys(visibleRows.map((r: any) => r.id));
                    setIsMobileSidebarOpen(false);
                  } else if (item.isAction) {
                    if (isSelectionMode && selectedRowKeys.length > 0) {
                      // 🔥 [중요] 선택된 ID들이 실제로 '눈에 보이는(펼쳐진)' 데이터 내에 있는지 한 번 더 교차 검증
                      const fullData = visibleRows.filter((r:any) => selectedRowKeys.includes(r.id));
                      executeBatchAction(item.refItem, currentView, fullData);
                    } else {
                      handleAction(item.refItem, {});
                    }
                    setIsMobileSidebarOpen(false);
                  } else {
                    setCurrentViewId(item.id); setSearchTerm(''); setIsMobileSidebarOpen(false); 
                  }
                }}
                style={{ 
                  backgroundColor: isActive ? 'var(--theme-primary)' : 'transparent',
                  color: isActive ? 'var(--theme-text-on-primary)' : 'var(--theme-text-main)'
                }}
                className={`w-full flex items-center justify-between p-3 rounded-none transition-all ${st?.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
              >
                <div className="flex items-center gap-3"><Icon size={20} /><span className="font-black text-[15px]">{st?.label || item.name}</span></div>
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
              style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)', color: 'var(--theme-input-text)' }}
              className="w-full pl-9 pr-3 py-1.5 border rounded-none text-xs font-bold outline-none focus:border-[var(--theme-primary)] transition-all"
            />
          </div>
          {currentView?.groupByColumn && (
            <button onClick={handleToggleGroups} 
              style={{ backgroundColor: 'var(--theme-bg-subtle)', color: 'var(--theme-primary)', borderColor: 'var(--theme-border)' }}
              className="px-3 py-1.5 rounded-none text-[10px] font-bold transition-all flex items-center gap-1 border shrink-0"
            >
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
                      <ChevronDown size={18} className="transition-all duration-300 shrink-0 mt-0.5" style={{ color: 'var(--theme-text-muted)', transform: isExp ? 'rotate(180deg)' : 'none' }} />
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
                                  <ChevronDown size={18} className="transition-all shrink-0 mt-0.5" style={{ color: 'var(--theme-text-muted)', transform: isSkExp ? 'rotate(180deg)' : 'none' }} />
                                </button>
                                {isSkExp && (
                                  <div className={`grid ${gridClass} gap-1 p-1`}>
                                    {rs.map((r: any) => (
                                      <div 
                                        key={r.id} 
                                        onClick={(e) => { e.preventDefault(); onCardClick(r); }}
                                        onPointerDown={() => onCardPointerDown(r)}
                                        onPointerUp={onCardPointerUp}
                                        onPointerLeave={onCardPointerUp}
                                        style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                                        className={`rounded-none border overflow-hidden hover:border-[var(--theme-primary)] transition-all cursor-pointer ${isSelectionMode ? (selectedRowKeys.includes(r.id) ? 'border-[3px] !border-[var(--theme-primary)] scale-[0.98]' : 'border-[3px] border-transparent opacity-60') : ''}`}
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
                                onClick={(e) => { e.preventDefault(); onCardClick(r); }}
                                onPointerDown={() => onCardPointerDown(r)}
                                onPointerUp={onCardPointerUp}
                                onPointerLeave={onCardPointerUp}
                                style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                                className={`rounded-none border overflow-hidden hover:border-[var(--theme-primary)] transition-all cursor-pointer ${isSelectionMode ? (selectedRowKeys.includes(r.id) ? 'border-[3px] !border-[var(--theme-primary)] scale-[0.98]' : 'border-[3px] border-transparent opacity-60') : ''}`}
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
                  onClick={(e) => { e.preventDefault(); onCardClick(r); }}
                  onPointerDown={() => onCardPointerDown(r)}
                  onPointerUp={onCardPointerUp}
                  onPointerLeave={onCardPointerUp}
                  style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
                  className={`rounded-none border overflow-hidden hover:border-[var(--theme-primary)] transition-all cursor-pointer ${isSelectionMode ? (selectedRowKeys.includes(r.id) ? 'border-[3px] !border-[var(--theme-primary)] scale-[0.98]' : 'border-[3px] border-transparent opacity-60') : ''}`}
                >
                  <CurrentRenderer rows={currentView.layoutRows} rowData={r} actions={appData.app_config.actions} onExecuteAction={handleAction} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 모바일 전용 하단 네비게이션 탭바 */}
        {showBottomBar && (
          <div 
            style={{ backgroundColor: 'var(--theme-surface)', borderColor: 'var(--theme-border)' }}
            className="md:hidden fixed bottom-0 left-0 right-0 h-16 border-t flex items-center justify-around px-2 z-[1100] shadow-[0_-4px_10px_rgba(0,0,0,0.03)]"
          >
            {(() => {
              const renderNavItems = isSelectionMode ? bottomBarItems : bottomBarItems.slice(0, 5);

              return renderNavItems.map((item: any) => {
                const Icon = IconMap[item.icon] || (item.isAction ? Zap : Layout);
                const isActive = !item.isAction && currentViewId === item.id;
                const st = item.isAction ? null : viewStates[item.id];
                const btnDisabled = st?.disabled || (item.isAction === true && selectedRowKeys.length === 0 && isSelectionMode);

                return (
                  <button key={item.id} disabled={btnDisabled}
                    onClick={() => { 
                      if (item.isAction === 'cancel') {
                        setIsSelectionMode(false); setSelectedRowKeys([]);
                      } else if (item.isAction === 'select_all') {
                        setSelectedRowKeys(visibleRows.map((r: any) => r.id));
                      } else if (item.isAction) {
                        if (isSelectionMode && selectedRowKeys.length > 0) {
                          // 🔥 [중요] 선택된 ID들이 실제로 '눈에 보이는(펼쳐진)' 데이터 내에 있는지 한 번 더 교차 검증
                          const fullData = visibleRows.filter((r:any) => selectedRowKeys.includes(r.id));
                          executeBatchAction(item.refItem, currentView, fullData);
                        } else {
                          handleAction(item.refItem, {});
                        }
                      } else {
                        setCurrentViewId(item.id); setSearchTerm(''); 
                      }
                    }}
                    style={{ color: isActive || (item.isAction && isSelectionMode) ? 'var(--theme-primary)' : 'var(--theme-text-muted)' }}
                    className={`flex flex-col items-center gap-1 transition-all ${isActive ? 'scale-110' : ''} ${btnDisabled ? 'opacity-30' : ''}`}
                  >
                    <Icon size={20} strokeWidth={isActive || isSelectionMode ? 3 : 2} />
                    <span className="text-[9px] font-black uppercase tracking-tighter truncate w-16 text-center">
                      {st?.label || item.name} {item.isAction && isSelectionMode ? `(${selectedRowKeys.length})` : ''}
                    </span>
                  </button>
                );
              });
            })()}
          </div>
        )}
      </div>

      {/* ─── 입력/수정 모달 ─── */}
      <CurrentInsertModal
        isOpen={isInputModalOpen}
        onClose={() => { setIsInputModalOpen(false); setActionQueue([]); setBatchSourceRows(null); }}
        action={activeInsertAction}
        formData={formData}
        setFormData={setFormData}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmitInsert}
      />
      <CurrentUpdateModal
        isOpen={isUpdateModalOpen}
        onClose={() => { setIsUpdateModalOpen(false); setActionQueue([]); setBatchSourceRows(null); }}
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
