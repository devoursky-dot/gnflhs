// 파일 경로: app/preview/[appId]/utils.ts

import { supabase } from '@/app/supabaseClient';

/**
 * 통합 매핑 프로세서
 * 1. {{ }} 없이 컬럼명만 적은 경우 (자동 인식)
 * 2. {{ }} 가 포함된 템플릿
 * 3. JS 수식
 */
export const processMappingValue = (value: string, rowData: any): any => {
  if (value === undefined || value === null || value === '') return '';
  
  const strVal = String(value).trim();
  
  // 1단계: {{ }}가 없고, rowData의 키와 정확히 일치하는 경우 (자동 컬럼 인식)
  if (!strVal.includes('{{') && rowData && Object.prototype.hasOwnProperty.call(rowData, strVal)) {
    return rowData[strVal];
  }
  
  // 2단계: {{ }}가 포함되어 있거나 수식 기호가 있는 경우 스마트 엔진 실행
  return evaluateExpression(strVal, rowData);
};

/**
 * 서울 시간(KST, UTC+9) 기준으로 Date 객체를 반환합니다.
 */
export const getKSTDate = (): Date => {
  const curr = new Date();
  const utc = curr.getTime() + (curr.getTimezoneOffset() * 60 * 1000);
  const KR_TIME_DIFF = 9 * 60 * 60 * 1000;
  return new Date(utc + KR_TIME_DIFF);
};

/**
 * 서울 시간 기준의 날짜/시간 헬퍼 객체를 반환합니다.
 */
export const getKSTHelpers = () => {
  const d = getKSTDate();
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const DD = String(d.getDate()).padStart(2, '0');
  const HH = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');

  const dateStr = `${Y}-${M}-${DD}`;
  const timeStr = `${HH}:${mm}:${ss}`;

  // 내일 날짜 계산 (범위 쿼리용)
  const tm = new Date(d.getTime() + 24 * 60 * 60 * 1000);
  const tomorrowStr = `${tm.getFullYear()}-${String(tm.getMonth() + 1).padStart(2, '0')}-${String(tm.getDate()).padStart(2, '0')}`;

  return {
    now: `${dateStr} ${timeStr}`,
    today: dateStr,
    tomorrow: tomorrowStr,
    year: String(Y),
    month: `${Y}-${M}`,
    date: dateStr,
    day: DD,
    time: timeStr,
  };
};

const expressionCache = new Map<string, { type: 'js' | 'string', func?: Function }>();

/**
 * 스마트 수식 평가 엔진
 */
export const evaluateExpression = (expr: string, rowData: any): any => {
  if (!expr) return '';

  try {
    const dateHelpers = getKSTHelpers();
    const context = { ...(rowData || {}), ...dateHelpers };

    let cached = expressionCache.get(expr);

    // 🚀 [성능 패치] 매 row당 new Function()을 생성하여 브라우저가 정지되는 심각한 성능 저하 버그(무한 로딩)를 해결하기 위해 Memoization 도입
    if (!cached) {
      try {
        const jsExpr = expr.replace(/\{\{(.*?)\}\}/g, (_, key) => `(context[${JSON.stringify(key.trim())}] ?? null)`);
        const func = new Function('context', `
          with(context) {
            return (${jsExpr});
          }
        `);
        cached = { type: 'js', func };
      } catch (e) {
        // JS 문법이 아닌 단순 문자열(예: URL 보간)인 경우 컴파일 실패
        cached = { type: 'string' };
      }
      expressionCache.set(expr, cached);
    }

    if (cached.type === 'js' && cached.func) {
      try {
        const result = cached.func(context);
        return result;
      } catch (e) {
        // 실행 중 에러가 나면 하단 문자열 치환으로 Fallback
      }
    }

    // Fallback: 단순 문자열 보간 모드 (String Interpolation)
    return expr.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const val = context[key.trim()];
      return val !== undefined && val !== null ? String(val) : '';
    });
  } catch (err) {
    return expr;
  }
};

/**
 * 뷰 쿼리 적용 (필터/정렬)
 * 물리적 DB 컬럼에 대한 쿼리만 담당합니다. (가상 컬럼 제외)
 */
export const applyViewQuery = (query: any, view: any, userProfile?: any) => {
  let q = query;

  // 1. [스마트 필터] 단일 조건 처리 (에디터 호환)
  if (view.filterColumn && (view.filterValue || view.filterOperator?.includes('null'))) {
    const col = view.filterColumn;
    const op = view.filterOperator || 'eq';
    let val = view.filterValue;
    
    // 이 시점에서는 물리 컬럼인지 가상 컬럼인지 확실히 알 수 없으므로 우선 적용 시도
    // (보통 fetchTableData에서 물리 컬럼인 경우에만 이 함수를 호출하게 가공함)
    q = applySingleFilter(q, col, op, val, userProfile);
  }

  // 2. [기존] 복합 필터 리스트 처리 (필요시)
  if (view.filters && view.filters.length > 0) {
    view.filters.forEach((f: any) => {
      if (!f.column || !f.operator) return;
      q = applySingleFilter(q, f.column, f.operator, f.value, userProfile);
    });
  }

  // 3. 정렬 적용 (물리 컬럼인 경우만)
  if (view.sortColumn) {
    // 🔥 [수정] 가상 테이블인 경우, 정렬 컬럼이 실제 컬럼이 아닐 확률이 높으므로 
    // 여기서는 실제 컬럼인 경우에만 쿼리에 포함시키도록 처리해야 하지만, 
    // 우선 가상 테이블이 아닐 때만 서버 정렬을 수행하게 하여 에러를 방지합니다.
    const isVt = view.tableName?.startsWith('vt_');
    if (!isVt) {
      q = q.order(view.sortColumn, { ascending: view.sortDirection !== 'desc' });
    }
  }

  // 🔥 [신규] 수동 선택(Lock) 유효성 검사 - 선택된 키들만 쿼리하도록 강제
  if (view.isLocked && view.lockedKeyColumn && view.lockedRecordKeys?.length > 0) {
    q = q.in(view.lockedKeyColumn, view.lockedRecordKeys);
  }

  return q;
};

/**
 * 단일 필터 조건을 Supabase 쿼리에 적용하는 내부 유틸
 */
const applySingleFilter = (q: any, col: string, op: string, val: any, userProfile: any) => {
  let v = val;
  if (v === '{{currentUser.email}}' || v === 'me') v = userProfile?.email;
  if (v === '{{currentUser.name}}') v = userProfile?.name;

  // 오늘/어제 등 특수 상구 처리
  const { today: isoToday, tomorrow: isoTomorrow } = getKSTHelpers();
  
  if (v === 'today' || v === '오늘') {
    return q.gte(col, isoToday).lt(col, isoTomorrow);
  } else if (v === 'yesterday' || v === '어제') {
    const yestDate = getKSTDate();
    yestDate.setDate(yestDate.getDate() - 1);
    const isoYesterday = `${yestDate.getFullYear()}-${String(yestDate.getMonth() + 1).padStart(2, '0')}-${String(yestDate.getDate()).padStart(2, '0')}`;
    return q.gte(col, isoYesterday).lt(col, isoToday);
  } else if (v === 'this_month' || v === '이번 달') {
    const now = getKSTDate();
    const isoMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const firstDay = `${isoMonth}-01`;
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const nextMonth = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-01`;
    return q.gte(col, firstDay).lt(col, nextMonth);
  }

  switch (op) {
    case 'eq': return q.eq(col, v);
    case 'neq': return q.neq(col, v);
    case 'gt': return q.gt(col, v);
    case 'gte': return q.gte(col, v);
    case 'lt': return q.lt(col, v);
    case 'lte': return q.lte(col, v);
    case 'contains':
    case 'like': return q.ilike(col, `%${v}%`);
    case 'starts': return q.ilike(col, `${v}%`);
    case 'ends': return q.ilike(col, `%${v}`);
    case 'in': return q.in(col, String(v).split(',').map((s: string) => s.trim()));
    case 'is_null': return q.is(col, null);
    case 'is_not_null': return q.not(col, 'is', null);
    case 'between':
      if (String(v).includes('..')) {
        const [start, end] = String(v).split('..').map((s: string) => s.trim());
        return q.gte(col, start).lte(col, end);
      }
      return q;
    default: return q;
  }
};

/**
 * 🔥 클라이언트 사이드 필터 엔진
 * 가상 컬럼을 포함한 모든 필터를 자바스크립트 레벨에서 최종 적용합니다.
 */
export const applyClientFilters = (data: any[], view: any, userProfile?: any): any[] => {
  if (!data || !data.length) return [];
  let result = [...data];

  const check = (row: any, col: string, op: string, val: any): boolean => {
    let rowVal = row[col];
    let v = val;
    if (v === '{{currentUser.email}}' || v === 'me') v = userProfile?.email;
    if (v === '{{currentUser.name}}') v = userProfile?.name;

    // 날짜 특수처리
    if (v === 'today' || v === '오늘') {
      const { today: isoToday } = getKSTHelpers();
      return String(rowVal).startsWith(isoToday);
    }
    // ... 어제/이번달 생략 가능 (필요시 추가)

    const rv = rowVal === null || rowVal === undefined ? '' : String(rowVal);
    const sv = v === null || v === undefined ? '' : String(v);

    switch (op) {
      case 'eq': return String(rowVal) === String(v);
      case 'neq': return String(rowVal) !== String(v);
      case 'gt': return Number(rowVal) > Number(v);
      case 'gte': return Number(rowVal) >= Number(v);
      case 'lt': return Number(rowVal) < Number(v);
      case 'lte': return Number(rowVal) <= Number(v);
      case 'contains':
      case 'like': return rv.toLowerCase().includes(sv.toLowerCase());
      case 'starts': return rv.toLowerCase().startsWith(sv.toLowerCase());
      case 'ends': return rv.toLowerCase().endsWith(sv.toLowerCase());
      case 'is_null': return rowVal === null || rowVal === undefined || rowVal === '';
      case 'is_not_null': return rowVal !== null && rowVal !== undefined && rowVal !== '';
      case 'in': return sv.split(',').map((s: string) => s.trim()).includes(rv);
      case 'between':
        if (sv.includes('..')) {
          const [s, e] = sv.split('..').map((x: string) => x.trim());
          return Number(rowVal) >= Number(s) && Number(rowVal) <= Number(e);
        }
        return true;
      default: return true;
    }
  };

  // 1. 단일 필터 적용
  if (view.filterColumn) {
    result = result.filter((r: any) => check(r, view.filterColumn, view.filterOperator || 'eq', view.filterValue));
  }

  // 2. 복합 필터 리스트 적용
  if (view.filters && view.filters.length > 0) {
    view.filters.forEach((f: any) => {
      result = result.filter((r: any) => check(r, f.column, f.operator, f.value));
    });
  }

  // 🔥 [신규] 수동 선택(Lock) 유효성 검사 - 선택된 키들만 최종 리스트에 남김
  if (view.isLocked && view.lockedKeyColumn && view.lockedRecordKeys?.length > 0) {
    const keys = view.lockedRecordKeys.map((k: any) => String(k));
    const pk = view.lockedKeyColumn;
    result = result.filter((r: any) => {
      const val = r[pk];
      if (val === null || val === undefined) return false;
      return keys.includes(String(val));
    });
  }

  // ✨ [신규] 2단계 고급 수식 필터 (JS Expression) 적용
  if (view.filterExpr) {
    result = result.filter((row: any) => {
      try {
        // evaluateExpression은 utils.ts 내부에 정의되어 있으므로 바로 호출 가능
        return !!evaluateExpression(view.filterExpr!, row);
      } catch (e) {
        console.error("Filter Expression Error:", e);
        return true; // 오류 시 데이터 유실 방지를 위해 통과시킴
      }
    });
  }

  // ✨ [신규] 클라이언트 사이드 정렬 (가상 컬럼 지원)
  if (view.sortColumn) {
    const col = view.sortColumn;
    const isAsc = view.sortDirection !== 'desc';
    
    result.sort((a, b) => {
      const valA = a[col];
      const valB = b[col];
      
      if (valA === valB) return 0;
      if (valA === null || valA === undefined) return 1;
      if (valB === null || valB === undefined) return -1;
      
      const comparison = typeof valA === 'number' && typeof valB === 'number'
        ? valA - valB
        : String(valA).localeCompare(String(valB), undefined, { numeric: true });
        
      return isAsc ? comparison : -comparison;
    });
  }

  return result;
};

/**
 * 그룹 키 정렬 유틸
 */
export const getSortedGroupKeys = (groupedData: Record<string, any>, direction: 'asc' | 'desc') => {
  return Object.keys(groupedData).sort((a, b) => {
    if (a === '미분류') return 1;
    if (b === '미분류') return -1;
    return direction === 'asc' 
      ? a.localeCompare(b, undefined, { numeric: true })
      : b.localeCompare(a, undefined, { numeric: true });
  });
};

/**
 * 🔥 가상 데이터 프로세싱 엔진
 * 실제 DB 데이터에 Join 및 Formula 컬럼을 입혀서 반환합니다.
 */
export const resolveVirtualData = async (baseData: any[], virtualTable: any): Promise<any[]> => {
  if (!virtualTable || !baseData.length) return baseData;

  try {
    // in-place mutation으로 처리 (배열 전체 복사를 피하여 성능 대폭 개선)
    const resolvedData = baseData.map((row: any) => ({ ...row })); // 최초 1회만 shallow copy
    const columns = virtualTable.columns || [];

    // 1단계: 조인(Join) 컬럼 처리
    const joinCols = columns.filter((c: any) => c.type === 'join' && c.joinConfig);
    
    for (const col of joinCols) {
      const { targetTable, localKey, foreignKey, sourceColumn, aggregationType, separator } = col.joinConfig;
      if (!targetTable || !localKey || !foreignKey || !sourceColumn) continue;

      const localValues = Array.from(new Set(resolvedData.map((row: any) => row[localKey]).filter((val: any) => val !== undefined && val !== null)));
      
      if (localValues.length > 0) {
        // 한국어 등 멀티바이트 값의 URL 인코딩 길이를 고려하여 chunk를 작게 설정
        const chunkSize = 50;
        const chunks: any[][] = [];
        
        for (let i = 0; i < localValues.length; i += chunkSize) {
          chunks.push(localValues.slice(i, i + chunkSize));
        }

        // 동시 요청 수를 제한하여 안정적으로 처리 (5개씩 병렬)
        const concurrency = 5;
        let allForeignData: any[] = [];
        
        for (let batch = 0; batch < chunks.length; batch += concurrency) {
          const batchChunks = chunks.slice(batch, batch + concurrency);
          const batchPromises = batchChunks.map(chunk =>
            (supabase as any)
              .from(targetTable)
              .select(`${foreignKey}, ${sourceColumn}`)
              .in(foreignKey, chunk)
          );
          
          const batchResults = await Promise.all(batchPromises);
          for (const res of batchResults) {
            if (!res.error && res.data) {
              allForeignData = allForeignData.concat(res.data);
            }
          }
        }

        // 일대다 데이터를 그룹화함
        const groupedForeign = new Map<string, any[]>();
        allForeignData.forEach((fRow: any) => {
          const k = String(fRow[foreignKey]);
          if (!groupedForeign.has(k)) groupedForeign.set(k, []);
          groupedForeign.get(k)?.push(fRow[sourceColumn]);
        });

        // in-place로 값 할당 (새 배열 생성 회피)
        for (let i = 0; i < resolvedData.length; i++) {
          const row = resolvedData[i];
          const matchingValues = groupedForeign.get(String(row[localKey])) || [];
          let processedVal: any = null;

          if (matchingValues.length > 0) {
            const agg = aggregationType || 'none';
            const sep = separator || ', ';

            switch (agg) {
              case 'none': 
                processedVal = matchingValues[matchingValues.length - 1]; 
                break;
              case 'list': 
                processedVal = matchingValues.join(sep); 
                break;
              case 'unique_list': 
                processedVal = Array.from(new Set(matchingValues)).join(sep); 
                break;
              case 'count': 
                processedVal = matchingValues.length; 
                break;
              case 'unique_count': 
                processedVal = new Set(matchingValues).size; 
                break;
              case 'sum': 
                processedVal = matchingValues.reduce((acc: number, v: any) => acc + (Number(v) || 0), 0); 
                break;
              case 'avg': 
                processedVal = matchingValues.reduce((acc: number, v: any) => acc + (Number(v) || 0), 0) / matchingValues.length; 
                break;
              case 'min': 
                processedVal = Math.min(...matchingValues.map((v: any) => Number(v) || 0)); 
                break;
              case 'max': 
                processedVal = Math.max(...matchingValues.map((v: any) => Number(v) || 0)); 
                break;
            }
          }

          row[col.name] = processedVal;
        }
      } else {
        for (let i = 0; i < resolvedData.length; i++) {
          resolvedData[i][col.name] = null;
        }
      }
    }

    // 2단계: 수식(Formula) 컬럼 처리 (in-place)
    const formulaCols = columns.filter((c: any) => c.type === 'formula' && c.formulaConfig);
    
    for (const col of formulaCols) {
      const expr = col.formulaConfig.expression;
      if (!expr) continue;

      for (let i = 0; i < resolvedData.length; i++) {
        resolvedData[i][col.name] = evaluateExpression(expr, resolvedData[i]);
      }
    }

    return resolvedData;
  } catch (err) {
    console.error("resolveVirtualData error:", err);
    return baseData;
  }
};

