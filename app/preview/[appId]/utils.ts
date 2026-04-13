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
  // 단순 문자열(예: "서울")은 evaluateExpression에서 그대로 반환됨
  return evaluateExpression(strVal, rowData);
};

/**
 * 스마트 수식 평가 엔진
 */
export const evaluateExpression = (expr: string, rowData: any): any => {
  if (!expr) return '';
  try {
    // {{컬럼}} 패턴을 context['컬럼']으로 변환
    const jsExpr = expr.replace(/{{(.*?)}}/g, (_match, col) => {
      return `(context['${col.trim()}'] === undefined ? '' : context['${col.trim()}'])`;
    });

    const d = new Date();
    const today = d.toLocaleDateString('sv-SE'); // YYYY-MM-DD
    const month = today.substring(0, 7);           // YYYY-MM
    const year = today.substring(0, 4);            // YYYY
    const time = d.toLocaleTimeString('sv-SE', { hour12: false }); // HH:mm:ss
    const now = `${today} ${time}`;                // YYYY-MM-DD HH:mm:ss

    const func = new Function('context', 'today', 'month', 'year', 'time', 'now', `
      try {
        return ${jsExpr};
      } catch (e) {
        return undefined;
      }
    `);
    
    let result = func(rowData || {}, today, month, year, time, now);
    
    if (result === undefined) {
      console.warn("Expression evaluation fallback to template:", expr);
      return resolveTemplateValue(expr, rowData);
    }

    return result === null ? '' : result;
  } catch (err) {
    console.error("Expression parse error:", err, expr);
    return resolveTemplateValue(expr, rowData);
  }
};

/**
 * {{컬럼}} 패턴 치환 헬퍼
 */
export const resolveTemplateValue = (template: string, rowData: any): string => {
  if (!template) return '';
  if (!template.includes('{{')) return template;
  return template.replace(/{{(.*?)}}/g, (_: string, col: string) => {
    const val = rowData[col.trim()];
    return val !== undefined && val !== null ? String(val) : '';
  });
};

/**
 * 노코딩 스타일 지능형 필터 적용 엔진
 * 매직 키워드(today, 어제, me 등) 및 고급 연산자 지원
 */
export const applyAdvancedFilter = (query: any, column: string, operator: string, value: string, userProfile?: any) => {
  if (!column || !operator) return query;
  const op = operator;
  const val = String(value || '').trim();
  
  // 1단계: 매직 키워드 처리
  let finalVal: any = val;
  const now = new Date();
  const isoToday = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
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
