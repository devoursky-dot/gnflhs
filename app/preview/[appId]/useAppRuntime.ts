// 파일 경로: app/preview/[appId]/useAppRuntime.ts
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/app/supabaseClient';
import { applyViewQuery, resolveVirtualData, applyClientFilters, getKSTHelpers, getSortedGroupKeys } from './utils';
import { EngineUtilsRegistry } from '../../engines/engineRegistry';

export function useAppRuntime(appId: string | string[] | undefined, userProfile: any) {
  const router = useRouter();

  // ── 앱 & 뷰 상태 ──
  const [loading, setLoading] = useState(true);
  const [appData, setAppData] = useState<any>(null);
  const [currentViewId, setCurrentViewId] = useState<string>('');
  const [tableData, setTableData] = useState<Record<string, any[]>>({});

  // ── UI 상태 ──
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // ── 자동화 및 어댑티브 상태 ──
  const [viewStates, setViewStates] = useState<Record<string, { hidden: boolean, disabled: boolean, label?: string }>>({});
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // ── 다중 선택(Multi-select) 및 Long Press 상태 ──
  const [isSelectionMode, setIsSelectionMode] = useState<boolean>(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const version = appData?.engine_version;
  const utils = useMemo(() => {
    const customUtils = version ? EngineUtilsRegistry[version as keyof typeof EngineUtilsRegistry] : null;
    return {
      applyViewQuery: customUtils?.applyViewQuery || applyViewQuery,
      resolveVirtualData: customUtils?.resolveVirtualData || resolveVirtualData,
      applyClientFilters: customUtils?.applyClientFilters || applyClientFilters,
      getKSTHelpers: customUtils?.getKSTHelpers || getKSTHelpers,
      getSortedGroupKeys: customUtils?.getSortedGroupKeys || getSortedGroupKeys,
    };
  }, [version]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 800);
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
  }, [appId, router, userProfile]);

  const resolveTableName = useCallback((tableId: string | null | undefined): string | null => {
    if (!tableId) return null;
    if (tableId.startsWith('vt_')) {
      const vt = appData?.app_config?.virtualTables?.find((v: any) => v.id === tableId);
      return vt ? vt.baseTableName : null;
    }
    return tableId;
  }, [appData]);

  const fetchTableData = useCallback(async (view: any) => {
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
  }, [appData, userProfile, utils]);

  const evaluateAllViewStates = useCallback(async () => {
    if (!appData?.app_config?.views) return;
    const newStates: Record<string, any> = {};

    const { today: isoToday, tomorrow: isoTomorrow } = utils.getKSTHelpers();

    const rowCountFn = async (t: string, f: Record<string, any> = {}) => {
      const resolvedT = resolveTableName(t) || t;
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
      } else {
        newStates[v.id] = { hidden: false, disabled: false };
      }
    }
    setViewStates(newStates);
  }, [appData, currentViewId, userProfile, utils, resolveTableName]);

  const currentView = useMemo(() => appData?.app_config?.views?.find((v: any) => v.id === currentViewId), [appData, currentViewId]);

  useEffect(() => {
    if (currentView) {
      fetchTableData(currentView);
      setExpandedGroups({});
    }
  }, [currentViewId, appData, userProfile, fetchTableData, currentView]);

  useEffect(() => {
    evaluateAllViewStates();
  }, [currentViewId, appData, tableData, evaluateAllViewStates]);

  return {
    loading, appData, currentViewId, setCurrentViewId, currentView,
    tableData, setTableData, fetchTableData,
    searchTerm, setSearchTerm, expandedGroups, setExpandedGroups,
    isMenuOpen, setIsMenuOpen, toast, setToast, viewStates, setViewStates,
    evaluateAllViewStates, resolveTableName, utils,
    isMobileSidebarOpen, setIsMobileSidebarOpen,
    isSelectionMode, setIsSelectionMode, selectedRowKeys, setSelectedRowKeys
  };
}
