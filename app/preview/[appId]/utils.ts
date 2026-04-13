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
 * 스마트 수식 평가 엔진
 */
export const evaluateExpression = (expr: string, rowData: any): any => {
  if (!expr) return '';

  try {
    // {{컬럼명}} 패턴 치환
    let processedExpr = expr.replace(/\{\{(.*?)\}\}/g, (_, key) => {
      const k = key.trim();
      const val = rowData ? rowData[k] : undefined;
      if (typeof val === 'string') return `"${val.replace(/"/g, '\\"')}"`;
      if (typeof val === 'number') return String(val);
      if (val === null || val === undefined) return 'null';
      return JSON.stringify(val);
    });

    // 샌드박스화된 실행 (간단한 수식용)
    // context를 통해 rowData에 직접 접근도 가능하게 함
    const func = new Function('context', `
      with(context) {
        try {
          return ${processedExpr};
        } catch(e) {
          return "${processedExpr.replace(/"/g, '\\"')}";
        }
      }
    `);
    return func(rowData || {});
  } catch (err) {
    // 수식이 아니거나 평가 실패 시 원본 혹은 에러 메시지 반환
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
    q = q.order(view.sortColumn, { ascending: view.sortDirection !== 'desc' });
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
  const now = new Date();
  const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  if (v === 'today' || v === '오늘') {
    return q.gte(col, isoToday).lte(col, `${isoToday}T23:59:59`);
  } else if (v === 'yesterday' || v === '어제') {
    const yestDate = new Date();
    yestDate.setDate(now.getDate() - 1);
    const isoYesterday = `${yestDate.getFullYear()}-${String(yestDate.getMonth() + 1).padStart(2, '0')}-${String(yestDate.getDate()).padStart(2, '0')}`;
    return q.gte(col, isoYesterday).lte(col, `${isoYesterday}T23:59:59`);
  } else if (v === 'this_month' || v === '이번 달') {
    const firstDay = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
    const lastDayDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const lastDay = `${lastDayDate.getFullYear()}-${String(lastDayDate.getMonth() + 1).padStart(2, '0')}-${String(lastDayDate.getDate()).padStart(2, '0')}`;
    return q.gte(col, firstDay).lte(col, `${lastDay}T23:59:59`);
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
    case 'in': return q.in(col, String(v).split(',').map(s => s.trim()));
    case 'is_null': return q.is(col, null);
    case 'is_not_null': return q.not(col, 'is', null);
    case 'between':
      if (String(v).includes('..')) {
        const [start, end] = String(v).split('..').map(s => s.trim());
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
      const now = new Date();
      const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
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
      case 'in': return sv.split(',').map(s => s.trim()).includes(rv);
      case 'between':
        if (sv.includes('..')) {
          const [s, e] = sv.split('..').map(x => x.trim());
          return Number(rowVal) >= Number(s) && Number(rowVal) <= Number(e);
        }
        return true;
      default: return true;
    }
  };

  // 1. 단일 필터 적용
  if (view.filterColumn) {
    result = result.filter(r => check(r, view.filterColumn, view.filterOperator || 'eq', view.filterValue));
  }

  // 2. 복합 필터 리스트 적용
  if (view.filters && view.filters.length > 0) {
    view.filters.forEach((f: any) => {
      result = result.filter(r => check(r, f.column, f.operator, f.value));
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
    let resolvedData = [...baseData];
    const columns = virtualTable.columns || [];

    // 1단계: 조인(Join) 컬럼 처리
    const joinCols = columns.filter((c: any) => c.type === 'join' && c.joinConfig);
    
    for (const col of joinCols) {
      const { targetTable, localKey, foreignKey, sourceColumn, aggregationType, separator } = col.joinConfig;
      if (!targetTable || !localKey || !foreignKey || !sourceColumn) continue;

      const localValues = Array.from(new Set(resolvedData.map(row => row[localKey]).filter(val => val !== undefined && val !== null)));
      
      if (localValues.length > 0) {
        const { data: foreignData, error } = await (supabase as any)
          .from(targetTable)
          .select(`${foreignKey}, ${sourceColumn}`)
          .in(foreignKey, localValues);

        if (!error && foreignData) {
          // 일대다 데이터를 그룹화함
          const groupedForeign = new Map<string, any[]>();
          foreignData.forEach((fRow: any) => {
            const k = String(fRow[foreignKey]);
            if (!groupedForeign.has(k)) groupedForeign.set(k, []);
            groupedForeign.get(k)?.push(fRow[sourceColumn]);
          });

          resolvedData = resolvedData.map(row => {
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
                  processedVal = matchingValues.reduce((acc, v) => acc + (Number(v) || 0), 0); 
                  break;
                case 'avg': 
                  processedVal = matchingValues.reduce((acc, v) => acc + (Number(v) || 0), 0) / matchingValues.length; 
                  break;
                case 'min': 
                  processedVal = Math.min(...matchingValues.map(v => Number(v) || 0)); 
                  break;
                case 'max': 
                  processedVal = Math.max(...matchingValues.map(v => Number(v) || 0)); 
                  break;
              }
            }

            return { ...row, [col.name]: processedVal };
          });
        }
      } else {
        resolvedData = resolvedData.map(row => ({ ...row, [col.name]: null }));
      }
    }

    // 2단계: 수식(Formula) 컬럼 처리
    const formulaCols = columns.filter((c: any) => c.type === 'formula' && c.formulaConfig);
    
    for (const col of formulaCols) {
      const expr = col.formulaConfig.expression;
      if (!expr) continue;

      resolvedData = resolvedData.map(row => ({
        ...row,
        [col.name]: evaluateExpression(expr, row)
      }));
    }

    return resolvedData;
  } catch (err) {
    console.error("resolveVirtualData error:", err);
    return baseData;
  }
};
